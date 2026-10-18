# Solution complète (à ne pas montrer aux joueurs)

Ce document déroule la partie dans un ordre direct, quêtes secondaires comprises. Chaque bloc peut être copié dans le jeu. Le test `tests/solution.js` rejoue exactement ces blocs et vérifie qu'ils mènent au bout.

Trois repères utiles en salle :

- un joueur bloqué tape `quetes` : le journal donne l'étape en cours et un indice ;
- un joueur qui veut savoir où il en est tape `xp` (niveau, note sur 20, ce qui reste à gagner) ou `bulletin` (relevé par blocs de compétences) ;
- un joueur perdu tape `cd` pour rentrer à la Maison, puis `cd -` pour revenir d'où il vient ;
- un joueur bloqué tape `indice` : deux paliers payants par étape (30 puis 60 XP retirés de la note, pas du niveau), et des remarques gratuites quand quelque chose coince (rouages creux, alias qui masque un sort, clé SSH grillée ou effacée).

Au premier lancement, le jeu affiche `terminus login:` : le prénom devient l'identifiant sur le système et le nom sur le diplôme, puis le joueur choisit un mot de passe qui lui permet de retrouver sa partie après un `logout`. Le jeu propose ensuite six enveloppes : la convocation à l'épreuve de première année (chapitre 1, la solution ci-dessous), le ticket d'incident du réseau (chapitre 2 directement, voir la partie 7), l'ordre de mission de la WarRoom (chapitre 3 directement, voir la partie 14), le pli de l'Académie (chapitre 4 directement, voir la partie 23), la lettre de l'Inspection (chapitre 5 directement, voir la partie 33) ou la Lanterne de Lumen (chapitre 6 directement, voir la partie 49).

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
- [Changer de chapitre, et l'aide des commandes du jeu](#changer-de-chapitre-et-laide-des-commandes-du-jeu)
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
  - [Les quêtes annexes du chapitre 2 : l'Ami du campus](#les-quêtes-annexes-du-chapitre-2--lami-du-campus)
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
  - [Les quêtes annexes du chapitre 3 : l'Ami de la Crypte](#les-quêtes-annexes-du-chapitre-3--lami-de-la-crypte)
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
  - [Les quêtes annexes du chapitre 4 : l'Ami de l'Académie](#les-quêtes-annexes-du-chapitre-4--lami-de-lacadémie)
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
  - [Les quêtes annexes du chapitre 5 : l'Ami du Bastion](#les-quêtes-annexes-du-chapitre-5--lami-du-bastion)
- [Chapitre 6 : Lumen, la cité qui s'éteint](#chapitre-6--lumen-la-cité-qui-séteint-exploitation-linux)
  49. [Lumen, les gardiens et le Phare](#49-lumen-les-gardiens-et-le-phare)
  50. [Les Docks et les Archives (Seymour, Kathleen)](#50-les-docks-et-les-archives-seymour-kathleen)
  51. [La Gazette et les Forges (Ida, Gordon)](#51-la-gazette-et-les-forges-ida-gordon)
  52. [La Tour de l'Horloge et les Citernes (Niklaus, Sophie)](#52-la-tour-de-lhorloge-et-les-citernes-niklaus-sophie)
  53. [La Porte du Matin et les Ateliers (Lynn, Mary)](#53-la-porte-du-matin-et-les-ateliers-lynn-mary)
  54. [La Crypte des mémoires et l'Observatoire (Betty, Donald)](#54-la-crypte-des-mémoires-et-lobservatoire-betty-donald)
  55. [Le Puits et les Thermes (Dorothy, Ruth)](#55-le-puits-et-les-thermes-dorothy-ruth)
  56. [Le Grand Marché et le Labyrinthe (Charles, John)](#56-le-grand-marché-et-le-labyrinthe-charles-john)
  57. [La Bibliothèque des limites et le Guetteur (Kay, Klara)](#57-la-bibliothèque-des-limites-et-le-guetteur-kay-klara)
  58. [La Longue Nuit](#58-la-longue-nuit)
  59. [Le rapport de remise en service](#59-le-rapport-de-remise-en-service)
  60. [Les défis des gardiens, quartier par quartier](#60-les-défis-des-gardiens-quartier-par-quartier)
  61. [Les quêtes annexes : l'Ami de Lumen](#61-les-quêtes-annexes--lami-de-lumen)
- [Chapitre 7 : Port-Aube, la cité à bâtir](#chapitre-7--port-aube-la-cité-à-bâtir-services-réseau-linux)
  62. [Le quai de Port-Aube, Laurent et le plan de la cité](#62-le-quai-de-port-aube-laurent-et-le-plan-de-la-cité)
  63. [La Maison des Noms et le Phare-Relais (Badis, Maeva)](#63-la-maison-des-noms-et-le-phare-relais-badis-maeva)
  64. [La Poste et le Bureau des Lettres (Younes, Syrine)](#64-la-poste-et-le-bureau-des-lettres-younes-syrine)
  65. [Le Grand Registre et les Greniers (Kamal, Noam)](#65-le-grand-registre-et-les-greniers-kamal-noam)
  66. [Les Portes de la cité et la Halle (Lamia, Zélia)](#66-les-portes-de-la-cité-et-la-halle-lamia-zélia)
  67. [La Forge des Sceaux et l'Arche (Miguel, Amina)](#67-la-forge-des-sceaux-et-larche-miguel-amina)
  68. [Tenir la Tempête](#68-tenir-la-tempête)
  69. [La Marée et le Premier Pas](#69-la-marée-et-le-premier-pas)
  70. [Le rapport de mise en service](#70-le-rapport-de-mise-en-service)
  71. [Après la fête : ce que personne n'a écrit](#71-après-la-fête--ce-que-personne-na-écrit)
  72. [Les défis des maîtres, maison par maison](#72-les-défis-des-maîtres-maison-par-maison)
  73. [Les quêtes annexes : l'Ami de Port-Aube](#73-les-quêtes-annexes--lami-de-port-aube)
- [Chapitre 8 : la Flotte noire, le Grand Port](#chapitre-8--la-flotte-noire-le-grand-port-conteneurs-de-zéro-à-héros)
  74. [Le Grand Port, Laurent et l'Ordre d'embarquement](#74-le-grand-port-laurent-et-lordre-dembarquement)
  75. [Acte I, le Mousse : les Premiers Pas, la Capitainerie, l'Entrepôt des plans (Kylian, Julien, Grégoire)](#75-acte-i-le-mousse--les-premiers-pas-la-capitainerie-lentrepôt-des-plans-kylian-julien-grégoire)
  76. [Épreuve de rang I : la caisse qui ne démarre pas (Matelot)](#76-épreuve-de-rang-i--la-caisse-qui-ne-démarre-pas-matelot)
  77. [Acte II, le Matelot : les Soutes et les Chenaux (Chahla, Adonis)](#77-acte-ii-le-matelot--les-soutes-et-les-chenaux-chahla-adonis)
  78. [Épreuve de rang II : le convoi muet (Quartier-maître)](#78-épreuve-de-rang-ii--le-convoi-muet-quartier-maître)
  79. [Acte III, le Quartier-maître : le Chantier naval, les Cales, le Chantier des maîtres, le Registre du port (Eden, Megane, Jahmal, Déborah)](#79-acte-iii-le-quartier-maître--le-chantier-naval-les-cales-le-chantier-des-maîtres-le-registre-du-port-eden-megane-jahmal-déborah)
  80. [Épreuve de rang III : le plan trop lourd (Second)](#80-épreuve-de-rang-iii--le-plan-trop-lourd-second)
  81. [Acte IV, le Second : la Feuille de route et la Vigie (Elias, Remi)](#81-acte-iv-le-second--la-feuille-de-route-et-la-vigie-elias-remi)
  82. [Épreuve de rang IV : la tempête dans le convoi (Capitaine)](#82-épreuve-de-rang-iv--la-tempête-dans-le-convoi-capitaine)
  83. [Acte V, le Capitaine : l'Armurerie et la Douane (Ian, Soufiane)](#83-acte-v-le-capitaine--larmurerie-et-la-douane-ian-soufiane)
  84. [Épreuve de rang V : le cheval de bois (Amiral)](#84-épreuve-de-rang-v--le-cheval-de-bois-amiral)
  85. [Acte VI, l'Amiral : l'Escadre (Arnaud)](#85-acte-vi-lamiral--lescadre-arnaud)
  86. [La bataille de l'aube](#86-la-bataille-de-laube)
  87. [Le rapport de bataille](#87-le-rapport-de-bataille)
  88. [Après la victoire : la signature](#88-après-la-victoire--la-signature)
  89. [Les défis des maîtres, quai par quai](#89-les-défis-des-maîtres-quai-par-quai)
  90. [Les quêtes annexes : l'Ami du Grand Port](#90-les-quêtes-annexes--lami-du-grand-port)
- [L'épreuve finale : la Forteresse](#lépreuve-finale--la-forteresse-mission-spéciale)

## Le barème

| Action | XP |
| --- | --- |
| Étape de la quête principale (13) | 100 chacune, 300 pour la victoire finale |
| Quête secondaire (29, dont 2 secrètes) | 50 |
| Sort appris (43 : 52 sorts, dont 9 connus au départ, `cat` compris) | 10 |
| Première utilisation d'un sort (52) | 5 |
| Lieu découvert (44) | 5 |

Le total possible est de 3860 XP au chapitre 1. Les autres chapitres ont chacun leur barème, sur le même principe, et leur note sur 20 à part : 5790 XP pour la panne (22 étapes, 50 quêtes secondaires, 50 sorts, 28 lieux), 5625 XP pour la Crypte (22 étapes, 45 quêtes secondaires dont 14 autour de vim, 49 sorts, 48 lieux), 5175 XP pour le chapitre 4, l'Académie des Arcanes (20 étapes, 50 défis des maîtres, 23 sorts avancés, 26 lieux), noté sur le CertificatAvance, et 7500 XP pour le chapitre 5, le Bastion (29 étapes dont le rapport final à 300 XP, 74 défis, 42 sorts de durcissement, 14 lieux), noté sur le CertificatBastion, et 8795 XP pour le chapitre 6, Lumen (37 étapes dont le rapport final à 300 XP, 82 défis, 47 sorts d'exploitation, 18 lieux), noté sur le CertificatLumen, 6120 XP pour le chapitre 7, Port-Aube (27 étapes dont le rapport final à 300 XP, 53 défis, 31 sorts de services réseau, 21 lieux), noté sur le CertificatPortAube, et 9215 XP pour le chapitre 8, le Grand Port (44 étapes dont le rapport de bataille à 300 XP, 89 défis, 4 sorts et toutes les manœuvres de docker, 21 lieux), noté sur le CertificatGrandPort ; les quêtes annexes, de Lumen au Grand Port, sont hors barème. La note sur 20 est proportionnelle à l'XP, au demi-point près. Elle s'affiche en permanence au-dessus de l'image, et figure sur le diplôme final avec la mention.

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

Le chapitre 6 (Lumen) s'ouvre enfin sous le Bastion : une cité souterraine, éclairée par une seule machine que personne n'entretient depuis des années, s'éteint quartier après quartier. En une journée, avant la Longue Nuit de 14 h, la recrue rallume seize quartiers (le disque, les inodes, les journaux, la mémoire, les processus, LVM, fstab, les unités systemd, la sauvegarde, les mesures, le RAID et SMART, fsck, apt et dpkg, le démarrage, les limites, strace et tmux), tient la Nuit en surveillant en direct, puis rend un rapport de remise en service qui dit aussi ce qui cassera ensuite. Ici, pas d'ennemi : l'usure, l'oubli et le manque d'entretien.

Au chapitre 7, l'école fonde Port-Aube sur une île, et la recrue bâtit la cité en une journée, avant la marée. Au chapitre 8 (la Flotte noire), une flotte ennemie se rassemble derrière le phare noir, et ses navires portent des conteneurs : au Grand Port de Port-Aube, la recrue arrive Mousse, sans avoir jamais touché un conteneur, et doit, en trois jours, tenir quatorze quais (de la première caisse à l'escadre Swarm), gagner ses galons d'épreuve en épreuve jusqu'à Amiral, puis tenir la bataille de l'aube : un navire sombre, une mise à jour piégée arrive, et on la refuse en lisant son empreinte. Après la victoire, les Labels de l'image de l'éclaireur portent l'empreinte d'une clé de chez nous : quelqu'un, à Cybersup, construit leurs navires. Tout est défensif : l'image de l'éclaireur est inerte (un fichier-témoin, une phrase, des Labels), et ne se lance jamais.

Hormis Laurent, tous les personnages sont inventés. Ils portent des prénoms de pionniers de l'informatique (Ada, Grace, Hedy, Dennis, Linus, Margaret, Radia, Vint, Evi, Ken, Barbara, Tim, Annie, Alan ; au Bastion, Fernando, Butler, Tatu, Jean, Evelyn, Edsger, Joan, Robert, Katherine, Ralph, Adele ; à Lumen, Seymour, Kathleen, Ida, Gordon, Niklaus, Sophie, Lynn, Mary, Betty, Donald, Dorothy, Ruth, Charles, John, Kay, Klara). Les six habitants des quêtes annexes de Lumen ne portent que leur métier (la Logeuse, l'Allumeur, la Veilleuse, l'Horloger, l'Imprimeur, la Postière). Au Grand Port, les quatorze maîtres du port s'appellent Kylian, Julien, Grégoire, Chahla, Adonis, Eden, Megane, Jahmal, Déborah, Elias, Remi, Ian, Soufiane et Arnaud, et ses six habitants Anissa, Edson, Mina, Ronan, Idrissa et Neil.

## Changer de chapitre, et l'aide des commandes du jeu

Ces commandes du jeu ne font partie d'aucune étape : la solution ci-dessous suit l'ordre de l'histoire et ne s'en sert pas.

- `chapitres` (ou `chapitre` sans numéro) : les huit chapitres, leur état (en cours, ouvert, terminé, fermé, non joué), la note de chacun, le chapitre où l'on est et comment s'y rendre.
- `aller N` : pour un chapitre ouvert, emmène à son lieu d'entrée (les connexions `ssh` en cours sont fermées ; pour la Crypte, une connexion à citadelle est ouverte, comme avec `ssh citadelle`), en fait le chapitre en cours et affiche son étape. Pour un chapitre 4 à 8 pas encore ouvert, propose de l'ouvrir en renfort (réponse `oui`) : les autres chapitres gardent leur progression et leur note, les chapitres sautés restent non joués, les sorts des chapitres d'avant sont prêtés et rapportent leurs XP s'ils sont ensuite appris pour de vrai dans leur chapitre. Le chapitre en cours suit ensuite le joueur (une étape franchie, l'entrée de l'Académie, du Bastion, de Lumen, de Port-Aube ou du Grand Port passée), et seule son horloge avance : les autres attendent.
- Refus : pendant l'épreuve finale ; un chapitre 1, 2 ou 3 fermé (ils s'ouvrent dans l'ordre de l'histoire) ; un chapitre 4 à 8 avant d'avoir battu le Sorcier Noir. Au tout début d'une partie neuve, `aller N` fait un départ direct, comme `chapitre N`.
- `help COMMANDE`, `COMMANDE --help` et `man COMMANDE` : la page d'une commande du jeu, avec toutes ses sous-commandes (`help badges` : `badges N`, `badges reseau`, `badges dns`...). `help SORT` montre la page d'un sort déjà appris.

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

### Les quêtes annexes du chapitre 2 : l'Ami du campus

Six habitants du bâtiment B ont chacun un service à demander. Comme à Lumen, ces quêtes annexes sont facultatives et hors note : elles ne comptent ni dans l'XP du chapitre ni dans la note, et donnent un bonus d'XP à part (50 par annexe), un souvenir déposé dans `~/Souvenirs`, une lumière de plus sur le plan (`schema`), puis, toutes finies, le badge « Ami du campus ». Elles s'ouvrent dès l'ouverture du chapitre (départ direct compris) : une annexe se propose quand on lit son habitant, ses étapes se font dans l'ordre, et `quetes annexes` en donne l'avancée. Elles n'enseignent que des notions jamais vues ailleurs dans le jeu : l'inventaire du matériel (`lscpu`, `lspci`, `lsusb`, `dmidecode`), `nc` en écoute (`nc -l`) pour se parler et se passer un fichier d'une machine à l'autre, le carnet d'adresses de ssh (`~/.ssh/config` : `Host`, `HostName`, `User`, `Port`, `IdentityFile`), le rebond par une passerelle (`ssh -J`, `ProxyJump`), le tunnel ssh (`ssh -f -N -L`) et la recherche dans le manuel (`apropos`, `whatis`, les sections de `man`).

La Gestionnaire du parc veut la fiche matérielle du Poste de l'accueil ; l'Appariteur parle à la Gardienne de nuit, sur la machine `loge`, avec `nc` ; la Documentaliste glisse la clé du dépôt de cours (port 2222, compte `cours`) dans la Maison ; le Coursier doit lire un colis sur `labo-lille`, qu'on n'atteint que par `passerelle-lille` ; la Bibliothécaire veut le catalogue de l'intranet de Lille, qui ne répond qu'aux machines de Lille ; la Tutrice cherche la page du fichier `/etc/passwd`, et pas celle de la commande. Deux repères changent d'une partie à l'autre : `<code-loge>`, le code que la Gardienne donne au premier `nc -l 5555`, et `<pid-tunnel>`, le PID du tunnel, que montre `ps`.

```
cd ~/Cybersup/BatimentB
cat Gestionnaire
cat Appariteur
cat Documentaliste
cat Coursier
cat Bibliothecaire
cat Tutrice
quetes annexes
cd Poste
lscpu
lspci
lsusb
sudo dmidecode -s system-serial-number
echo "Poste de l'accueil : CYB-B20-4471" > ~/inventaire.txt
cd ~/Cybersup/BatimentB
nc -l 5555
echo "<code-loge>" | nc loge 6666
nc loge 6666 < planning-gardes.txt
nc -l 5555 > ~/plan-des-rondes.txt
cat ~/plan-des-rondes.txt
mkdir -p ~/.ssh
mv ~/depot_ed25519 ~/.ssh/
chmod 600 ~/.ssh/depot_ed25519
cat >> ~/.ssh/config <<'FIN'
Host depot
    HostName 10.0.97.77
    User cours
    Port 2222
    IdentityFile ~/.ssh/depot_ed25519
FIN
ssh depot
cat LISEZMOI
exit
ssh -J passerelle-lille labo-lille
exit
cat >> ~/.ssh/config <<'FIN'
Host labo-lille
    ProxyJump passerelle-lille
FIN
ssh labo-lille
cat /srv/colis/a-remettre.txt
exit
ssh -f -N -L 8080:intranet-lille:80 passerelle-lille
curl http://localhost:8080/
curl -o ~/catalogue.txt http://localhost:8080/catalogue.txt
ps
kill <pid-tunnel>
apropos comptes
whatis passwd
man 5 passwd
echo 7 > ~/notice.txt
quetes annexes
```

Le code de la Gardienne est à renvoyer tel quel ; le planning part par une redirection d'entrée (`<`) ; le plan des rondes arrive par une redirection de sortie (`>`). Le tunnel tourne en arrière-plan sans session (`-f -N`) : on le referme avec `kill`, une fois le catalogue rapporté. Le champ du shell est le septième de `/etc/passwd` (`man 5 passwd`).

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

### Les quêtes annexes du chapitre 3 : l'Ami de la Crypte

Six habitants de la Crypte ont chacun un service à demander : l'Enlumineur, le Passeur et le Serrurier dans la Crypte, le Fossoyeur, le Sonneur et le Sacristain dans le Caveau. Facultatives et hors note, elles donnent chacune 50 XP en bonus, un souvenir dans `~/Souvenirs`, une lumière de plus sur le tableau de chasse (`traque`), et toutes finies, le badge « Ami de la Crypte ». Leurs lieux sont sous la Crypte, dans les Catacombes (les Galeries, l'Ossuaire, le Clocher). Les notions sont nouvelles : les nombres magiques d'un fichier (`hexdump -C`), les chaînes de liens (`readlink -f`, `realpath`), les liens durs et les inodes (`ln` sans `-s`, `ls -i`), le suivi d'un journal qui tourne (`tail -f`, `tail -F`, `grep --line-buffered`), la durée maximale d'un programme (`timeout`, `-s KILL`, les codes 124 et 137), l'agent ssh (`ssh-agent`, `ssh-add`) et la fabrication de mots de passe (`pwgen`, `openssl rand`, `openssl passwd -6` et le sel).

La phrase de la clé du Passeur est dans son texte (« trois cloches sous la lune ») : `ssh-add` la demande une seule fois. Pour la grille du Serrurier, on recalcule l'empreinte de chacun des trois candidats avec le même sel : `<mot-grille>` est celui dont l'empreinte est identique à celle que donne le Serrurier (il change d'une partie à l'autre).

```
ssh citadelle
cd Crypte
cat Enlumineur
cat Passeur
cat Serrurier
cd Caveau
cat Fossoyeur
cat Sonneur
cat Sacristain
quetes annexes
cd ../Catacombes
hexdump -C -n 16 enluminure.txt
mv enluminure.txt enluminure.png
hexdump -C -n 16 copie-du-registre.txt
mv copie-du-registre.txt copie-du-registre.pdf
hexdump -C -n 16 sceau.txt
mv sceau.txt sceau.gz
ls -l
readlink passage-nord
readlink -f passage-nord
realpath Galeries/../Galeries/escalier
ls -li Galeries Ossuaire
ln Ossuaire/testament.txt Galeries/
rm Ossuaire/testament.txt
ls -li Galeries
cd Clocher
tail -f ronde.log
tail -f ronde.log
ls -l
tail -F ronde.log
tail -F ronde.log | grep --line-buffered ALERTE > ~/alertes.txt
cat ~/alertes.txt
cd ..
timeout 5 ./ombre-errante
echo $? > ~/sablier.txt
timeout 5 ./ombre-tetue
timeout -s KILL 5 ./ombre-tetue
echo $? >> ~/sablier.txt
cat ~/sablier.txt
chmod 600 ~/cle-du-passeur
eval "$(ssh-agent -s)"
ssh-add ~/cle-du-passeur
ssh-add -l
ssh passeur@beffroi
cat LISEZMOI
exit
ssh passeur@beffroi
exit
ssh-add -D
pwgen 12 5
pwgen -s 16 3
openssl rand -base64 24
openssl passwd -6 rouille
openssl passwd -6 rouille
openssl passwd -6 -salt Gr1ll3Cav porte-de-chene
openssl passwd -6 -salt Gr1ll3Cav herse-de-fer
openssl passwd -6 -salt Gr1ll3Cav grille-rouillee
echo <mot-grille> > ~/serrure.txt
exit
quetes annexes
```

Le premier `tail -f` voit le journal grandir ; au second, le journal a tourné (`ls -l` montre `ronde.log.1`) et `tail -f`, qui suit le fichier, ne voit plus rien : `tail -F` suit le nom. Sans `--line-buffered`, `grep` garde ses lignes en mémoire quand il écrit dans un fichier, et `~/alertes.txt` resterait vide. `timeout` rend 124 quand il a dû arrêter le programme, et 137 (128 + 9) quand il a fallu `SIGKILL`.

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

### Les quêtes annexes du chapitre 4 : l'Ami de l'Académie

Six habitants de l'Académie, un par aile (le Copiste aux Grimoires, la Secrétaire aux Archives, le Trésorier à l'Alchimie, l'Apprentie à l'Invocation, la Messagère à la Chronomancie, la Surveillante à la Divination), ont chacun un service à demander. Facultatives et hors note, elles donnent chacune 50 XP en bonus, un souvenir dans `~/Souvenirs`, une lumière de plus sur le tableau des écoles (`grimoire`), et toutes finies, le badge « Ami de l'Académie ». Les notions sont nouvelles : les encodages et les fins de ligne (`cat -A`, `iconv`, `dos2unix`, un script en CRLF qui ne se lance plus), les variables d'environnement dans un modèle (`export`, `printenv`, `envsubst`), les tailles lisibles et les calculs à virgule (`numfmt`, `bc`), les options d'un script (`getopts`, `OPTARG`) avec une fonction, les tubes nommés (`mkfifo`) et une base SQLite (`sqlite3`).

```
cd ~/Cybersup/SalleServeurs/Academie/Grimoires
cat Copiste
cd ../Archives
cat Secretaire
cd ../Alchimie
cat Tresorier
cd ../Invocation
cat Apprentie
cd ../Chronomancie
cat Messagere
cd ../Divination
cat Surveillante
quetes annexes
cd ../Grimoires
file grimoire-ancien.txt
cat -A grimoire-ancien.txt
iconv -f ISO-8859-1 -t UTF-8 grimoire-ancien.txt > ~/grimoire.txt
dos2unix ~/grimoire.txt
cat ~/grimoire.txt
./incantation.sh
dos2unix incantation.sh
./incantation.sh
cd ../Archives
export ELEVE="Ambre Morel"
export MAISON="Divination"
export DATE_EPREUVE="12 novembre"
printenv ELEVE MAISON DATE_EPREUVE
envsubst < modele-convocation.txt > ~/convocation.txt
cat ~/convocation.txt
envsubst '$ELEVE $MAISON' < modele-affiche.txt > ~/affiche.txt
cat ~/affiche.txt
cd ../Alchimie
numfmt --to=iec --field=2 < reserves.txt
numfmt --from=iec 750M
cat depenses.txt
echo "scale=2; (12.50 + 7.25 + 30.00 + 4.75 + 18.40 + 9.90 + 22.15) / 7" | bc
echo 14.99 > ~/balance.txt
cat > ~/sortilege.sh <<'FIN'
#!/bin/bash
benir() {
    echo "Que la lumière soit sur $1 !"
}
nom="inconnu"
while getopts "n:" opt; do
    case $opt in
        n) nom="$OPTARG" ;;
        *) echo "Utilisation : $0 -n NOM" >&2; exit 2 ;;
    esac
done
benir "$nom"
FIN
chmod +x ~/sortilege.sh
~/sortilege.sh -n Ambre
~/sortilege.sh -z
echo $?
mkfifo ~/question
ls -l ~/question
echo "La Nuée reviendra-t-elle ?" > ~/question
mkfifo ~/reponse
cat ~/reponse
cd ../Divination
sqlite3 registre.db ".tables"
sqlite3 registre.db ".schema eleves"
sqlite3 -header -column registre.db "SELECT nom, moyenne FROM eleves WHERE maison = 'Divination' ORDER BY moyenne DESC;"
sqlite3 registre.db "SELECT COUNT(*) FROM eleves WHERE maison = 'Alchimie' AND moyenne > 12;"
sqlite3 registre.db "SELECT COUNT(*) FROM eleves WHERE maison = 'Alchimie' AND moyenne > 12;" > ~/registre.txt
quetes annexes
```

`cat -A` montre les `^M` (les `\r` des fins de ligne CRLF) et les octets non UTF-8 (`M-...`). `envsubst` sans liste remplace toutes les variables qu'il trouve ; avec une liste (`'$ELEVE $MAISON'`), il ne touche qu'à celles-là, et `$PRIX` reste tel quel. `$(( ))` ne calcule qu'en entiers : `bc`, avec `scale=2`, garde deux décimales (14.99). L'Oracle lit le tube `question` et répond dans le tube `reponse` : rien n'est écrit sur le disque.

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

### Les quêtes annexes du chapitre 5 : l'Ami du Bastion

Six habitants du Bastion ont chacun un service à demander : le Colporteur au Pont-levis, le Sergent à la Herse, la Sentinelle à la Tour de Guet, le Greffier au Sceau du Roi, la Cantinière dans la Salle des Coffres et le Héraut à la Bannière. Facultatives et hors note, elles donnent chacune 50 XP en bonus, un souvenir dans `~/Souvenirs`, une lumière de plus sur le plan des tours (`rempart`), et toutes finies, le badge « Ami du Bastion ». Elles restent défensives, comme tout le chapitre, et n'enseignent que des notions jamais vues : une clé de serveur qui change (`ssh-keygen -F`, `ssh-keyscan`, `ssh-keygen -R`), la qualité des mots de passe (`pam_pwquality`, `pwscore`), une unité systemd `.path` qui surveille un fichier, l'enregistrement des sessions sudo (`Defaults log_output`, `sudoreplay`), le chiffrement d'un fichier (`openssl enc -aes-256-cbc -pbkdf2`) vérifié avec `cmp`, et les certificats SSH (une autorité, `ssh-keygen -s`, `TrustedUserCAKeys`).

La Cantinière choisit sa phrase de passe : `openssl enc` la demande (deux fois pour chiffrer, une fois pour déchiffrer). Au premier `ssh relais`, ssh refuse : la clé du relais a changé. On compare l'empreinte que montre ssh à celle que Vint a dictée au Colporteur, avant de répondre `yes`. La première session sudo enregistrée porte le numéro `000001` (`sudo sudoreplay -l` le montre). La clé de l'autorité est forgée ici sans phrase (`-N ""`), pour l'exercice : dans la vraie vie, elle dort hors du serveur, sur une machine coupée du réseau.

```
cd ~/Cybersup/SalleServeurs/Academie/Bastion
cd PontLevis
cat Colporteur
cd ../Herse
cat Sergent
cd ../Guet
cat Sentinelle
cd ../Sceau
cat Greffier
cd ../Coffres
cat Cantiniere
cd ../Banniere
cat Heraut
quetes annexes
cd ../PontLevis
ssh relais
ssh-keygen -F relais
ssh-keyscan relais
ssh-keygen -R relais
ssh relais
cat LISEZMOI
exit
cd ../Coffres
openssl enc -aes-256-cbc -pbkdf2 -salt -in recette.txt -out ~/recette.enc
file ~/recette.enc
openssl enc -d -aes-256-cbc -pbkdf2 -in ~/recette.enc -out ~/recette-dechiffree.txt
cmp recette.txt ~/recette-dechiffree.txt
echo $?
cd ..
ssh bastion
sudo apt install libpam-pwquality libpwquality-tools
printf 'minlen = 12\nminclass = 3\n' | sudo tee -a /etc/security/pwquality.conf
echo "bastion1" | pwscore
echo "Trois-Tours-Gardent-L-Aube-42" | pwscore
printf '[Unit]\nDescription=Guetteur du fichier des comptes\n\n[Path]\nPathChanged=/etc/passwd\n\n[Install]\nWantedBy=multi-user.target\n' | sudo tee /etc/systemd/system/guet-passwd.path
printf '[Unit]\nDescription=Alerte du guetteur\n\n[Service]\nType=oneshot\nExecStart=/usr/bin/logger -t guetteur "le fichier des comptes a change"\n' | sudo tee /etc/systemd/system/guet-passwd.service
sudo systemctl daemon-reload
sudo systemctl enable --now guet-passwd.path
systemctl list-units --type=path
sudo useradd essai-guet
sudo journalctl -t guetteur
sudo userdel essai-guet
sudo visudo -f /etc/sudoers.d/greffier
sudo visudo -c
sudo systemctl status ssh
sudo sudoreplay -l
sudo sudoreplay 000001
sudo ssh-keygen -t ed25519 -f /etc/ssh/ca_inspection -N "" -C "autorite de l'Inspection"
cat /srv/inspection/LISEZMOI
sudo ssh-keygen -s /etc/ssh/ca_inspection -I heraut -n heraut -V +52w /srv/inspection/heraut.pub
sudo ssh-keygen -L -f /srv/inspection/heraut-cert.pub
echo 'TrustedUserCAKeys /etc/ssh/ca_inspection.pub' | sudo tee /etc/ssh/sshd_config.d/60-inspection.conf
sudo sshd -t
sudo systemctl reload ssh
exit
quetes annexes
```

`pwscore` refuse un mot trop court ou trop simple et donne une note au mot accepté. Le compte d'essai `essai-guet` sert seulement à faire sonner le guetteur : on le supprime aussitôt l'alerte lue. Dans `visudo -f /etc/sudoers.d/greffier`, une seule ligne : `Defaults log_output`. Comme pour Tatu, `TrustedUserCAKeys` va dans un fichier à soi de `sshd_config.d`, et `sshd -t` passe avant le `reload`.

## Chapitre 6 : Lumen, la cité qui s'éteint (exploitation Linux)

Numéro interne 7, affiché 6. Le chapitre s'ouvre à la fin du Bastion (le rapport d'inspection contresigné) : au fond du hall du Bastion, une grille s'ouvre sur un escalier qui descend vers Lumen (`cd Lumen`). On peut aussi y partir directement (la sixième enveloppe, « La Lanterne de Lumen », ou `chapitre 6` en début de partie) : les sorts des chapitres 1 à 5 sont alors acquis, et Lumen est au fond de la SalleServeurs.

Lumen est une cité souterraine dont toute la lumière vient d'une seule machine, le Cœur de Lumen (le serveur `lumen`). Elle tourne depuis des années sans que personne ne l'entretienne, et ce matin, quartier après quartier, elle s'éteint. La Longue Nuit tombe à 14 h : il est 6 h à l'arrivée, chaque commande avance de 2 minutes (`cat Horloge`, la barre d'état et la radio de Grace donnent l'heure). Seize quartiers, seize gardiens (des prénoms de pionniers) : Seymour (les Docks, le disque plein), Kathleen (les Archives, les inodes), Ida (la Gazette, les journaux), Gordon (les Forges, la mémoire), Niklaus (la Tour de l'Horloge, les processus), Sophie (les Citernes, LVM), Lynn (la Porte du Matin, fstab et les montages), Mary (les Ateliers des automates, les unités systemd), Betty (la Crypte des mémoires, la sauvegarde), Donald (l'Observatoire, les mesures), Dorothy (le Puits aux deux sources, le RAID et SMART), Ruth (les Thermes, fsck et tune2fs), Charles (le Grand Marché, apt et dpkg), John (le Labyrinthe, le démarrage), Kay (la Bibliothèque des limites, ulimit et les groupes de contrôle) et Klara (le Guetteur, strace et tmux). Chaque gardien est vivant comme au Bastion : il explique son quartier par une image et le vrai mot du métier, donne la syntaxe, confie la mission sans dicter la commande, réagit aux erreurs fréquentes, puis raconte une anecdote du métier et coche ses cinq défis. `lanterne` (une commande du jeu) montre le Phare de Lumen : le plan des seize quartiers (rouge éteint, vert rallumé), l'heure, la lumière de la cité sur 100 (25 au départ) et les avaries de la Nuit.

Tout est validé sur l'état réel de la machine `lumen`, pas sur la commande tapée : une commande écrite dans un `echo` ne compte pas, un raccourci est refusé (tuer l'export sans sa boucle, qui le relance ; supprimer toutes les sessions, y compris celles des habitants connectés ; lancer l'allumeur à la main avec `nohup` au lieu d'en faire un service ; recopier une mesure de latence inventée dans le carnet ; lancer la longue recopie dans la session ssh, qui meurt avec elle...), et les variantes légitimes sont acceptées (`systemctl edit`, `tee` ou `nano` pour un drop-in, `lvextend -r` ou `resize2fs`, `nohup` ou `tmux` pour la recopie, un délai ou la désactivation pour le service qui fait attendre le démarrage...). La Longue Nuit tombe à 14 h, ou plus tôt quand les seize quartiers sont rallumés : sur chaque quartier encore éteint, elle laisse une avarie (un vidage mémoire de 3 Go, douze mille sessions, l'export relancé, une ligne fausse dans fstab, la gazette en échec...), et sur la place une surprise (le journal des connexions qui explose). Ce n'est pas une défaite : on surveille en direct (`uptime`, `free -h`, `top -b -n 1`, `journalctl -f` ou `-u`), on répare, et le Phare doit dépasser 90.

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<latence-avant>` | le temps de réponse mesuré par Donald avant les réparations (dans le carnet de l'Observatoire et le journal de lumen-web : 4,91 s) |
| `<latence-apres>` | ta propre mesure, après les réparations (`curl -o /dev/null -s -w '%{time_total}\n' http://lumen/`, notée dans `~/carnet.txt` sur lumen) |

Les 82 défis de Lumen (quêtes secondaires `s_m6_*`, 50 XP chacun) : cinq par quartier, révélés en lisant le gardien, réussis sur lumen ; et deux défis d'honneur, révélés par Laurent : les seize quartiers rallumés avant midi, et le rapport remis sans avoir acheté d'indice. La solution ci-dessous rallume d'abord les seize quartiers (avant midi), tient la Nuit, rend le rapport, puis fait les défis, quartier par quartier, et enfin les quêtes annexes.

### 49. Lumen, les gardiens et le Phare

On descend à Lumen, on écoute Laurent, on lit l'ordre de mission, la radio, l'horloge et le bestiaire, on consulte le Phare (c'est la lumière de départ), puis on fait le tour des seize quartiers pour apprendre les sorts et découvrir les défis.

```
cd ~/Cybersup/SalleServeurs/Academie/Bastion/Lumen
cat Laurent
cat Mission
cat Radio
cat Horloge
cat Bestiaire
lanterne
cd Docks
cat Seymour
cd ../Archives
cat Kathleen
cd ../Gazette
cat Ida
cd ../Forges
cat Gordon
cd ../TourHorloge
cat Niklaus
cd ../Citernes
cat Sophie
cd ../PorteDuMatin
cat Lynn
cd ../Ateliers
cat Mary
cd ../CrypteMemoires
cat Betty
cd ../Observatoire
cat Donald
cd ../Puits
cat Dorothy
cd ../Thermes
cat Ruth
cd ../GrandMarche
cat Charles
cd ../Labyrinthe
cat John
cd ../BibliothequeLimites
cat Kay
cd ../Guetteur
cat Klara
cd ..
```

La deuxième étape (`m6_lanterne`) demande Laurent et l'ordre de mission lus, puis `lanterne` : sa lumière est retenue comme lumière de départ. Toute la suite se fait sur `lumen`, dans une seule session ssh.

### 50. Les Docks et les Archives (Seymour, Kathleen)

`/var` est plein : le coupable est une vieille archive oubliée dans `/var/backups`. Même effacé, un fichier de débogage reste tenu ouvert par lumen-web (`lsof +L1`) : relancer le service rend la place. Puis les Archives n'ont plus une fiche libre (les inodes) : on retire les sessions de plus d'une heure, pas celles des habitants connectés, et une règle `systemd-tmpfiles` fait ensuite le ménage seule.

```
ssh lumen
df -h
sudo du -sh /var/* | sort -h
sudo rm /var/backups/lumen-2024.tar.gz
sudo lsof +L1
sudo systemctl restart lumen-web
df -i
sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete
echo 'd /var/lib/lumen/sessions 1733 root root 1h' | sudo tee /etc/tmpfiles.d/lumen-sessions.conf
sudo systemd-tmpfiles --clean
```

### 51. La Gazette et les Forges (Ida, Gordon)

Le journal de la cité grossit sans fin : une règle `logrotate` (éprouvée à blanc avec `-d`, puis forcée avec `-f`), et le journal de systemd borné pour de bon (`SystemMaxUse`, pas seulement un `--vacuum-size`). Aux Forges, la mémoire est saturée et l'OOM killer a frappé : le cache qui fuit passe sous une limite (`MemoryMax`, dans un drop-in), puis un fichier d'échange de secours (en `600`, gravé dans fstab) et la swappiness à 10.

```
printf '/var/log/lumen/*.log {\n\tdaily\n\trotate 7\n\tcompress\n\tmissingok\n\tnotifempty\n\tmaxsize 100M\n}\n' | sudo tee /etc/logrotate.d/lumen
sudo logrotate -d /etc/logrotate.d/lumen
sudo logrotate -f /etc/logrotate.d/lumen
journalctl --disk-usage
sudo journalctl --vacuum-size=200M
sudo sed -i 's/^#SystemMaxUse=/SystemMaxUse=200M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
free -h
sudo dmesg -T | grep -i oom
sudo mkdir -p /etc/systemd/system/cache-rapports.service.d
printf '[Service]\nMemoryMax=1G\n' | sudo tee /etc/systemd/system/cache-rapports.service.d/memoire.conf
sudo systemctl daemon-reload
sudo systemctl restart cache-rapports
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/99-swap.conf
sudo sysctl --system
```

### 52. La Tour de l'Horloge et les Citernes (Niklaus, Sophie)

Un export tourne à 100 % depuis hier soir : on le calme d'abord (`renice`), puis on regarde son parent, une boucle qui le relance ; tuer l'enfant seul ne sert à rien, on arrête la boucle, puis l'export. Les trois spectres (des zombies) ne se tuent pas : on relance leur parent, lumen-veilleur. Aux Citernes, la base est à l'étroit : on agrandit le volume logique à chaud (`lvextend`, puis `resize2fs`), et on s'entraîne à l'instantané qu'on prendrait avant une opération risquée (créé, vu, retiré).

```
sudo renice +19 -p $(pgrep -x export-registre)
ps -o ppid= -p $(pgrep -x export-registre)
pstree -p $(pgrep -f export-boucle)
sudo kill $(pgrep -f export-boucle)
sudo killall export-registre
sudo systemctl restart lumen-veilleur
sudo vgs
sudo lvextend -L +20G /dev/vg_lumen/lv_donnees
sudo resize2fs /dev/mapper/vg_lumen-lv_donnees
sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees
sudo lvs
sudo lvremove -y /dev/vg_lumen/avant_maj
```

### 53. La Porte du Matin et les Ateliers (Lynn, Mary)

Le fstab de lumen ne laisserait pas la cité se réveiller : `/boot` désigné par un UUID faux, et un disque de sauvegarde amovible sans `nofail`. `findmnt --verify` les trouve, `blkid` donne le vrai UUID, puis `mount -a` doit tout monter sans un mot. Aux Ateliers, l'allumeur des réverbères tourne lancé à la main : il tient le port 8080 et mourra avec la session de l'opérateur. On l'arrête, on écrit son unité systemd, on l'active, puis on l'éprouve (`kill -s KILL`) : il revient seul (`Restart=on-failure`), et le journal le dit.

```
sudo findmnt --verify
sudo blkid /dev/sda1
sudo sed -i 's/4c2e8a1f-7d3b-4e5a-9c61-0b8f2d3e4a57/b81f3c7e-52a9-4d10-a6e4-91c0d2f7e358/' /etc/fstab
sudo sed -i 's#/mnt/sauvegarde       ext4    defaults#/mnt/sauvegarde       ext4    defaults,nofail#' /etc/fstab
sudo systemctl daemon-reload
sudo mount -a
sudo pkill -x allumeur
printf '[Unit]\nDescription=L allumeur des reverberes\nAfter=network-online.target\n\n[Service]\nUser=allumeur\nExecStart=/opt/lumen/allumeur --port 8080\nRestart=on-failure\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n' | sudo tee /etc/systemd/system/allumeur.service
sudo systemctl daemon-reload
sudo systemctl enable --now allumeur
sudo systemctl kill -s KILL allumeur
sudo journalctl -u allumeur
```

### 54. La Crypte des mémoires et l'Observatoire (Betty, Donald)

Une sauvegarde qu'on n'a jamais restaurée n'existe pas. Un service `oneshot` qui la fabrique, un timer qui la lance chaque nuit (`Persistent=true`), un premier lancement à la main, puis une vraie restauration dans `/tmp/restauration`, comparée à l'original (`diff -r`). À l'Observatoire, on mesure : la charge face au nombre de cœurs, l'occupation des disques, l'histoire de la machine (`sar`), les connexions ; puis le temps de réponse de la cité, noté dans le carnet. Les Docks réparés et l'export arrêté, il passe sous la demi-seconde.

```
printf '[Unit]\nDescription=Sauvegarde de la cite\n\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/sauvegarde.sh\n' | sudo tee /etc/systemd/system/sauvegarde.service
printf '[Unit]\nDescription=Sauvegarde chaque nuit\n\n[Timer]\nOnCalendar=*-*-* 02:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n' | sudo tee /etc/systemd/system/sauvegarde.timer
sudo systemctl daemon-reload
sudo systemctl enable --now sauvegarde.timer
systemctl list-timers
sudo systemctl start sauvegarde
mkdir /tmp/restauration
sudo tar xzf /srv/sauvegardes/lumen-*.tar.gz -C /tmp/restauration
diff -r /srv/archives/registres /tmp/restauration/srv/archives/registres
uptime
nproc
iostat -x
sar -q
ss -s
curl -o /dev/null -s -w '%{time_total}\n' http://lumen/ >> ~/carnet.txt
cat ~/carnet.txt
```

### 55. Le Puits et les Thermes (Dorothy, Ruth)

Le miroir des archives est dégradé (`[_U]` dans `/proc/mdstat`) : on retire la source tarie (`--fail`, `--remove`) et on ajoute le disque neuf, puis on lit la santé des disques : sdb est mort, sdc perd des secteurs (à écrire dans le rapport). Aux Thermes, une erreur a remonté les archives en lecture seule : on arrête ce qui les utilise, on démonte, `e2fsck`, on remonte ; puis `tune2fs` règle les vérifications et la réserve.

```
cat /proc/mdstat
sudo mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1
sudo mdadm /dev/md0 --add /dev/sdd1
sudo smartctl -H /dev/sdb
sudo smartctl -a /dev/sdc
mount | grep archives
sudo systemctl stop lumen-archiviste
sudo umount /srv/archives
sudo e2fsck -f -y /dev/md0
sudo fsck -n /dev/md0
sudo mount /srv/archives
sudo systemctl start lumen-archiviste
sudo tune2fs -l /dev/md0
sudo tune2fs -c 30 /dev/md0
sudo tune2fs -m 1 /dev/md0
cat /proc/mdstat
```

### 56. Le Grand Marché et le Labyrinthe (Charles, John)

Une mise à jour s'est coupée en plein milieu : dpkg refuse tout tant qu'on ne l'a pas finie. On la finit, on répare les dépendances, on met à jour la liste ; puis on épingle la base (`apt-mark hold`) et on relance les services qui tournent encore sur de vieilles bibliothèques (`needrestart`). Le noyau neuf attendra un redémarrage : à écrire dans le rapport. Au Labyrinthe, la gazette est en échec : elle exige (`Requires=`) une unité qui n'existe pas. On corrige sa copie dans `/etc/systemd/system`, puis on regarde le démarrage : un service attend un réseau disparu pendant 90 secondes, on le désactive.

```
sudo dpkg --configure -a
sudo apt --fix-broken install
sudo apt update
apt list --upgradable
sudo apt-mark hold lumen-base
apt-mark showhold
cat /var/run/reboot-required
sudo needrestart -r l
sudo systemctl restart lumen-web lumen-messager
systemctl --failed
sudo journalctl -b -p err
sudo cp /lib/systemd/system/lumen-gazette.service /etc/systemd/system/
sudo sed -i 's/lumen-db/lumen-base/' /etc/systemd/system/lumen-gazette.service
sudo systemctl daemon-reload
sudo systemctl start lumen-gazette
sudo systemctl reset-failed
systemd-analyze blame
systemd-analyze critical-chain
sudo systemctl disable lumen-attente-reseau
```

### 57. La Bibliothèque des limites et le Guetteur (Kay, Klara)

Le catalogue étouffe : « Too many open files ». Sa limite (`/proc/PID/limits`) face à ce qu'il tient ouvert (`/proc/PID/fd`), puis `LimitNOFILE` dans un drop-in. L'indexeur mange toute la lumière : `systemd-cgtop`, puis une part fixe (`set-property CPUQuota= MemoryMax=`). Au Guetteur, le messager ne répond plus : `strace` montre qu'il attend un `connect` vers un registre éteint ; on corrige son adresse. Enfin, la longue recopie des archives (plusieurs dizaines de minutes) se lance dans `tmux`, et survit à la déconnexion : on se déconnecte, on revient, on rattache, elle a continué.

```
cat /proc/$(pidof lumen-catalogue)/limits
sudo ls /proc/$(pidof lumen-catalogue)/fd | wc -l
sudo mkdir -p /etc/systemd/system/lumen-catalogue.service.d
printf '[Service]\nLimitNOFILE=65536\n' | sudo tee /etc/systemd/system/lumen-catalogue.service.d/limites.conf
sudo systemctl daemon-reload
sudo systemctl restart lumen-catalogue
systemd-cgtop
sudo systemctl set-property lumen-indexeur CPUQuota=50% MemoryMax=2G
systemctl show -p CPUQuotaPerSecUSec,MemoryMax lumen-indexeur
sudo strace -p $(pidof lumen-messager)
getent hosts registre-ancien
sudo sed -i 's/^base = registre-ancien:5432/base = 127.0.0.1:5432/' /etc/lumen/messager.conf
sudo systemctl restart lumen-messager
tmux new -s copie
/usr/local/bin/recopier-archives
tmux detach
exit
ssh lumen
tmux attach -t copie
tmux detach
```

Les seize quartiers sont rallumés avant midi (le défi d'honneur `s_m6_avant_midi`) : la Longue Nuit tombe aussitôt, en avance.

### 58. La Longue Nuit

Quand la Nuit tombe, les quartiers rallumés tiennent ; les autres reçoivent chacun une avarie, et la place reçoit la surprise : le journal des connexions explose (2,5 Go en une heure). L'étape demande de surveiller en direct (`uptime`, `free -h`, `top -b -n 1`, un `journalctl -u` ou `-f` après la tombée de la Nuit), de réparer chaque avarie (la surprise se règle avec la rotation : `connexions.log` est dans `/var/log/lumen/`), puis le Phare doit dépasser 90 (`lanterne`). Ici, tout était rallumé : il ne reste que la surprise. On attend aussi la fin de la recopie.

```
tmux attach -t copie
tmux detach
lanterne
watch -n 2 cat /proc/mdstat
tmux attach -t copie
tmux detach
uptime
free -h
top -b -n 1 | head -15
sudo journalctl -u lumen-web -n 5
sudo logrotate -f /etc/logrotate.d/lumen
lanterne
exit
```

### 59. Le rapport de remise en service

Le rapport porte cinq rubriques (avaries, causes, réparations, mesures, ce qui reste), les vraies latences (avant, celle de Donald ; après, la tienne) et le disque à remplacer bientôt (sdc). Laurent ne le contresigne que si la Nuit est passée et le Phare au-dessus de 90 : déposé trop tôt, il le garde et dit ce qui reste ; sans les vraies mesures, il les demande.

```
mkdir -p ~/lumen
cat > ~/lumen/rapport.txt <<'FIN'
RAPPORT DE REMISE EN SERVICE - LUMEN
Avaries : /var plein, fichier efface encore ouvert, inodes epuises, journaux geants, memoire saturee et OOM, export fou et zombies, base a l'etroit, fstab faux, allumeur lance a la main, sauvegarde jamais testee, miroir degrade, archives en lecture seule, apt bloque, gazette en echec, catalogue a court de fichiers, messager bloque.
Causes : aucune rotation ni nettoyage, une fuite memoire sans limite, une boucle oubliee, un disque mort, une mise a jour coupee, une faute dans Requires, une limite trop basse, une adresse perimee.
Reparations : seize quartiers rallumes, la Longue Nuit tenue.
Mesures : latence avant <latence-avant> s, latence apres <latence-apres> s.
Ce qui reste : remplacer le disque sdc, qui perd des secteurs ; redemarrer sur le noyau 6.1.0-27.
FIN
cp ~/lumen/rapport.txt BoiteDeLaurent
```

Laurent contresigne : « Lumen brille. Pas parce que rien ne cassera plus : parce que tu sais ce qui cassera ensuite, et que c'est écrit. » Le CertificatLumen, posé dans la Maison (`cat ~/CertificatLumen`), porte la note du chapitre 6 et son code de vérification ; le quiz du chapitre (`quiz 6`) s'ouvre, et `badges lumen` relit les vingt leçons (une par quartier, la Lanterne, la Nuit, le Rapport, midi) et le platine.

### 60. Les défis des gardiens, quartier par quartier

Les 80 défis des quartiers, dans l'ordre des gardiens (la solution les fait après le rapport). Les Docks : `du --max-depth`, `df -hT`, `ncdu`, ce qui dort depuis un mois, les liens cassés. Les Archives : `ls -f`, le numéro d'inode, le nombre d'inodes du volume, `rm sess_*` qui ne passe pas (Argument list too long), `systemd-tmpfiles --cat-config`. La Gazette : `journalctl --since`, `-u`, `-f`, `--vacuum-time`, `-o short-iso`. Les Forges : `vmstat`, les plus gros mangeurs, la base protégée de l'OOM killer, `pmap`, `MemAvailable`. La Tour : `pgrep -a`, `pidof`, `nice`, `kill -l`, `top -b`. Les Citernes : un disque neuf préparé (`pvcreate`) puis relié à la réserve (`vgextend`), `blkid`, `lsblk`, `vgdisplay`. La Porte : `findmnt /`, l'UUID seul, `/proc/mounts`, `lsblk -o`, `df -h /boot`. Les Ateliers : `systemd-analyze verify`, `systemctl cat`, `is-enabled`, `systemd-run`, `show -p Restart`. La Crypte : `tar tzf`, `systemd-analyze calendar`, `rsync -an` puis `rsync -a` vers le disque de sauvegarde, le journal de la sauvegarde. L'Observatoire : `uptime -p`, `sar -q`, `sar -r`, le code de réponse seul, `iostat -x sdc`. Le Puits : `mdadm --examine`, `lsblk -f`, `mdadm --detail --scan`, un test SMART court et son résultat, `smartctl -i`. Les Thermes : `dmesg -T`, `fuser -vm`, `lsof +D`, `mount -o remount,rw`, `tune2fs -i`. Le Marché : `dpkg -l`, `apt policy`, `apt-cache depends`, `uname -r`, `dpkg --audit`. Le Labyrinthe : `list-dependencies`, `journalctl -k`, `systemd-analyze`, `--list-boots`, `-b -1`. La Bibliothèque : `ulimit -n`, `ulimit -a`, `lsof -p`, `/proc/PID/status`, `show -p LimitNOFILE`. Le Guetteur : `hostnamectl`, le fuseau de la cité, `screen -ls`, `getent hosts`, `watch`. Au passage, quelques sorts du chapitre servent une fois (`swapoff`, `swapon --show`, `nohup`).

```
ssh lumen
sudo du -h --max-depth=1 /var
df -hT
ncdu /var
sudo find /var -mtime +30
sudo find /var/www -xtype l
sudo rm /var/www/lumen/ancien-plan.html
sudo ls -f /var/lib/lumen/sessions | head -3
sudo stat -c %i /etc/fstab
sudo tune2fs -l /dev/mapper/vg_lumen-lv_sessions
sudo rm /var/lib/lumen/sessions/sess_*
systemd-tmpfiles --cat-config
journalctl --since "1 hour ago"
journalctl -u lumen-web
journalctl -f
sudo journalctl --vacuum-time=7d
journalctl -o short-iso -n 3
vmstat 1 5
ps aux --sort=-%mem | head -5
echo -500 | sudo tee /proc/$(pidof lumen-base)/oom_score_adj
sudo pmap $(pidof lumen-base)
grep MemAvailable /proc/meminfo
pgrep -a lumen
pidof lumen-web
nice -n 10 tar czf /tmp/etc.tar.gz /etc/lumen
kill -l
top -b -n 1
sudo pvcreate /dev/sde
sudo pvs
sudo vgextend vg_lumen /dev/sde
sudo blkid
lsblk
sudo vgdisplay
findmnt /
sudo blkid -s UUID -o value /dev/sda1
cat /proc/mounts
lsblk -o NAME,UUID,MOUNTPOINT
df -h /boot
systemd-analyze verify /etc/systemd/system/allumeur.service
systemctl cat allumeur
systemctl is-enabled allumeur
sudo systemd-run --on-active=30min /usr/local/bin/sauvegarde.sh
systemctl show -p Restart allumeur
tar tzf /srv/sauvegardes/lumen-*.tar.gz
systemd-analyze calendar '*-*-* 02:00'
rsync -an /srv/archives/ /mnt/sauvegarde/archives/
sudo rsync -a /srv/archives/ /mnt/sauvegarde/archives/
sudo journalctl -u sauvegarde
uptime -p
sar -q
sar -r
curl -o /dev/null -s -w '%{http_code}\n' http://lumen/
iostat -x sdc
sudo mdadm --examine /dev/sdc1
lsblk -f
sudo mdadm --detail --scan
sudo smartctl -t short /dev/sdc
sudo smartctl -l selftest /dev/sdc
sudo smartctl -i /dev/sdc
sudo dmesg -T | grep EXT4
sudo fuser -vm /srv/archives
sudo lsof +D /srv/archives
sudo mount -o remount,rw /srv/archives
sudo tune2fs -i 6m /dev/md0
dpkg -l | grep lumen
apt policy lumen-base
apt-cache depends lumen-web
uname -r
sudo dpkg --audit
systemctl list-dependencies lumen-gazette
sudo journalctl -k
systemd-analyze
sudo journalctl --list-boots
sudo journalctl -b -1
ulimit -n
ulimit -a
sudo lsof -p $(pidof lumen-catalogue)
cat /proc/$(pidof lumen-catalogue)/status
systemctl show -p LimitNOFILE lumen-catalogue
hostnamectl
sudo timedatectl set-timezone Europe/Paris
screen -ls
getent hosts registre-ancien
watch -n 2 uptime
sudo swapoff /swapfile
sudo swapon -a
swapon --show
nohup /usr/local/bin/recopier-archives &
exit
```

Le chapitre est alors à 20 sur 20, le platine gagné (`badges lumen`).

### 61. Les quêtes annexes : l'Ami de Lumen

Six habitants de Lumen ont chacun un service à demander. Ces quêtes annexes sont facultatives et hors note : elles ne comptent ni dans l'XP du chapitre ni dans la note, et donnent un bonus d'XP à part, un souvenir déposé dans `~/Souvenirs`, puis, toutes finies, le badge « Ami de Lumen ». Elles n'enseignent que des notions jamais vues dans les chapitres 1 à 6 (les quotas, le bit setgid d'un dossier et `newgrp`, les tâches de fond et leurs signaux, les journaux compressés et `last -x`, l'horloge matérielle et `cal`, les compressions `bzip2`, `xz` et `zstd`, les dates de fichiers posées avec `touch -d` et `touch -r` et `find -newermt`). Une annexe s'ouvre en lisant son habitant ; ses étapes se font dans l'ordre ; `quetes annexes` en donne l'avancée. L'Allumeur est sur la place, la Logeuse aux Ateliers, la Veilleuse à l'Observatoire, l'Horloger à la Tour de l'Horloge, l'Imprimeur à la Gazette, la Postière aux Archives. Pour le Chat errant de l'Allumeur, le programme se lance au premier plan, puis on le suspend avec Ctrl+Z (deux fois dans la solution : la ligne `Ctrl-Z` du bloc ci-dessous désigne cette touche, pas une commande à taper).

```
cat Allumeur
cd Ateliers
cat Logeuse
cd ../Observatoire
cat Veilleuse
cd ../TourHorloge
cat Horloger
cd ../Gazette
cat Imprimeur
cd ../Archives
cat Postiere
quetes annexes
ssh lumen
sudo setquota -u ninon 900M 1G 0 0 /home
sudo setquota -u basile 900M 1G 0 0 /home
quota -u ninon
sudo repquota -a
sudo chgrp habitants /home/commun
sudo chmod g+s /home/commun
touch /home/commun/bienvenue.txt
ls -l /home/commun
newgrp habitants
id
chat-errant
Ctrl-Z
jobs
bg %1
fg %1
Ctrl-Z
kill -STOP $(pgrep chat-errant)
kill -CONT $(pgrep chat-errant)
disown %1
exit
ssh lumen
pgrep -a chat-errant
zgrep chant /var/log/lumen/coeur.log.*.gz
zless /var/log/lumen/coeur.log.3.gz
last -x
echo "quand la ville dort, je veille" > ~/chant.txt
echo "quand la ville a froid, je brule" >> ~/chant.txt
echo "quand la ville a peur, je chante l'aube" >> ~/chant.txt
sudo hwclock --show
sudo hwclock --systohc
cal
date +%s >> ~/horloge.txt
cd /srv/gazette
bzip2 -k rouleau-1880.txt
xz -k rouleau-1880.txt
xz -l rouleau-1880.txt.xz
zstd rouleau-1880.txt
ls -l
echo xz > ~/rouleaux.txt
cd
touch -d "$(date +%F) 00:00" ~/repere
find /srv/courrier -newermt "$(date +%F) 00:00"
cat /srv/courrier/lettre-de-la-maire.txt
cp /srv/courrier/lettre-de-la-maire.txt ~/
touch -r /srv/courrier/lettre-de-la-maire.txt ~/lettre-de-la-maire.txt
exit
```

L'Imprimeur demande quel format garde le rouleau le plus petit : `ls -l` le montre (ici `xz`). Les six annexes finies, les habitants viennent saluer la recrue sur la place, et le badge « Ami de Lumen » s'ajoute à `badges lumen`.

## Chapitre 7 : Port-Aube, la cité à bâtir (services réseau Linux)

Numéro interne 8, affiché 7. Le chapitre s'ouvre à la fin de Lumen (le rapport de remise en service contresigné) : Laurent donne rendez-vous à l'aube, et un traversier allume son fanal au bout de la jetée du campus, l'Embarcadère (`cd ~/Cybersup/Embarcadere`). On peut aussi y partir directement (la septième enveloppe, « Le Billet de traversée », ou `chapitre 7` en début de partie) : les sorts des chapitres 1 à 6 sont alors acquis, et la partie commence sur le quai de Port-Aube. Une cinématique ouvre le chapitre dans les deux cas (`cinematique 7` la rejoue).

Au large du continent, l'école a fondé un campus sur une île : Port-Aube. Les bâtisseurs ont monté les maisons, des serveurs Debian neufs, installés, câblés, mais vides. Il est 7 h. À 14 h, une tempête ; à 19 h, la marée haute, et le premier navire accoste avec cinq cents étudiants. Chaque commande avance l'horloge de 3 minutes (`cat Horloge`, la barre d'état et la radio de Grace donnent l'heure ; une ligne qui enchaîne plusieurs commandes avec `;` ne compte qu'une fois). Dix maisons, dix maîtres bâtisseurs : Badis (la Maison des Noms, le DNS primaire, machine `noms`), Maeva (le Phare-Relais, le DNS secondaire, la zone inverse et nsupdate, machine `phare`), Younes (la Poste, Postfix, machine `poste`), Syrine (le Bureau des Lettres, Dovecot, SPF, DKIM et DMARC, machine `poste`), Noam (les Greniers, NFS, machine `greniers`), Zélia (la Halle d'échange, Samba, machine `halle`), Kamal (le Grand Registre, LDAP, machine `registre`), Lamia (les Portes de la cité, sssd et autofs, machine `quai`), Miguel (la Forge des Sceaux, l'autorité de certification interne et TLS, machine `forge`) et Amina (l'Arche, borg et les sauvegardes, machines `greniers` et `arche`). Chaque maître est vivant comme à Lumen : il explique sa maison par une image et le vrai mot du métier, donne la syntaxe, confie la mission sans dicter la commande, réagit aux erreurs fréquentes, puis raconte une anecdote du métier et coche ses cinq défis. `chantier` (une commande du jeu) montre le plan de la cité : les dix maisons (rouge en friche, vert bâtie), l'heure, la marée, la Tempête, et la note de la cité sur 100 (10 au départ), lue sur l'état réel des machines.

Tout est validé sur l'état réel des machines, pas sur la commande tapée : une zone écrite dans un `echo` ne compte pas tant que named ne la sert pas, un relais ouvert à tous ne passe pas, un export sans `root_squash` non plus, une clé de l'autorité copiée hors de la Forge annule la Forge, un faux dossier « restauré » ne prouve rien, et les variantes légitimes sont acceptées (`nano`, `tee` ou `sed` pour écrire un fichier, une zone inverse sur noms et sa copie sur phare, `-ZZ` ou `ldaps`, un fichier `.service` ou `avahi-publish`...). Les maisons se bâtissent dans l'ordre qu'on veut : celles qui dépendent d'une autre (les Portes lisent le Registre, la Halle aussi, l'Arche sauve les Greniers) le disent par la voix de leur maître. La Tempête tombe à 14 h, ou plus tôt dès que six maisons sont debout : sur chaque maison déjà bâtie, elle laisse un incident (un MX sans point final, un phare en retard d'une série, un relais rouvert à tous, une boîte qui appartient à root, `no_root_squash` remis, Zélia sortie de la promo, un cache sssd périmé, Dovecot revenu à son sceau de pacotille, un verrou sur le dépôt de l'Arche). La marée arrive à 19 h, ou plus tôt quand les dix maisons sont bâties et la Tempête tenue : le navire accoste, et sur chaque maison inachevée la cité le paie ; le capitaine, lui, inscrit son navire dans la zone à la main, sans changer la série. Le Premier Pas : le premier étudiant (Aron, ou le prénom qu'on lui choisit) se connecte depuis le quai, et ses six portes doivent s'ouvrir : son compte dans le Registre, sa maison montée depuis les Greniers, une lettre dans sa boîte, la Halle ouverte à la promo, le sceau de la Poste reconnu, sa maison déjà dans l'Arche.

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<archive>` | le nom de la dernière archive de l'Arche (`sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers`, sur greniers, par exemple greniers-2026-10-18T11:21:00) |

Les mots de passe et phrases de cette solution (les choisir soi-même est permis, à condition de garder les mêmes partout) : le sceau du Registre (le mot de passe de `cn=admin`, demandé par `slappasswd`, `ldapadd -W`, `ldapmodify -W`, `ldapdelete -W`) est `Sceau-de-Port-Aube` ; Zélia, pour la Halle, `Halle-de-Zelia` ; Aron, dans le Registre et à la Halle, `Premier-pas-sur-l-ile` ; la phrase du dépôt de l'Arche (demandée par `borg init`, deux fois, puis par chaque `borg list`, `check`, `info`, `prune`, `extract`) est `La-cite-ne-perd-rien`, et `borg init` demande aussi s'il faut l'afficher : `N`. Le compte `depot` de la Halle a pour mot de passe « Rendus du soir 7 » (Fama le donne).

Les 53 défis de Port-Aube (quêtes secondaires `s_p7_*`, 50 XP chacun) : cinq par maison, révélés en lisant le maître, et trois défis d'honneur, révélés par Laurent : les dix maisons bâties avant 14 h, le rapport remis sans avoir acheté d'indice, et, après la fête, l'inconnu consigné dans le rapport. La solution ci-dessous bâtit les dix maisons d'une traite (avant midi), tient la Tempête, accueille la Marée et le premier étudiant, rend le rapport, regarde la nuit tomber, puis fait les défis, maison par maison, et enfin les quêtes annexes.

### 62. Le quai de Port-Aube, Laurent et le plan de la cité

On prend le traversier, on écoute Laurent, on lit l'ordre de mission, la radio, l'horloge et le bestiaire, et on consulte le plan de la cité (c'est la note de départ).

```
cd ~/Cybersup/Embarcadere
cat Traversier
cd PortAube
cat Laurent; cat Mission
cat Radio; cat Horloge; cat Bestiaire
chantier
```

La deuxième étape (`p7_chantier`) demande Laurent et l'ordre de mission lus, puis `chantier` : sa note est retenue comme note de départ. Ensuite, on entre dans chaque maison (`cd`), on lit son maître (il enseigne ses sorts), et on se connecte à sa machine (`ssh`) ; `exit` ramène sur le quai, dans la maison d'où l'on est parti.

### 63. La Maison des Noms et le Phare-Relais (Badis, Maeva)

Le brouillon de zone de Badis a deux fautes, que `named-checkzone` dit : une adresse impossible (10.0.70.380) et un nom qui est à la fois un alias et une adresse (imap : CNAME et A). On garde l'alias. Puis on déclare la zone (et seul le phare peut la copier), on la charge, on ajoute l'imprimerie et la bibliothèque, et la série monte. Au phare, la copie secondaire ; une autre machine que le phare se fait refuser le transfert. Puis la zone inverse : sur noms, avec une clé TSIG qui l'ouvre aux ajouts signés ; sa copie sur phare ; et le PTR de la capitainerie, ajouté à chaud par `nsupdate`, sans toucher au fichier.

```
cd MaisonDesNoms; cat Badis; ssh noms
sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan
sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap\t\tIN\tA/d' /etc/bind/zones/db.port-aube.lan
printf 'zone "port-aube.lan" {\n\ttype primary;\n\tfile "/etc/bind/zones/db.port-aube.lan";\n\tallow-transfer { 10.0.70.54; };\n\talso-notify { 10.0.70.54; };\n};\n' | sudo tee -a /etc/bind/named.conf.local
sudo named-checkconf -z && sudo rndc reload
dig @noms poste.port-aube.lan +short
printf 'imprimerie\tIN\tA\t10.0.70.31\nbibliotheque\tIN\tA\t10.0.70.73\n' | sudo tee -a /etc/bind/zones/db.port-aube.lan; sudo sed -i 's/2026101701/2026101702/' /etc/bind/zones/db.port-aube.lan
sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan && sudo rndc reload
dig @noms port-aube.lan SOA +short
exit; cd ../PhareRelais; cat Maeva; ssh phare
printf 'zone "port-aube.lan" {\n\ttype secondary;\n\tprimaries { 10.0.70.53; };\n\tfile "/var/cache/bind/db.port-aube.lan";\n};\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload
dig @phare port-aube.lan SOA +short
exit; ssh noms
dig @noms port-aube.lan AXFR
tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key
printf '$TTL\t3600\n@\tIN\tSOA\tnoms.port-aube.lan. hostmaster.port-aube.lan. (\n\t2026101701 3600 900 604800 300 )\n@\tIN\tNS\tnoms.port-aube.lan.\n@\tIN\tNS\tphare.port-aube.lan.\n53\tIN\tPTR\tnoms.port-aube.lan.\n54\tIN\tPTR\tphare.port-aube.lan.\n25\tIN\tPTR\tposte.port-aube.lan.\n20\tIN\tPTR\tgreniers.port-aube.lan.\n45\tIN\tPTR\thalle.port-aube.lan.\n38\tIN\tPTR\tregistre.port-aube.lan.\n100\tIN\tPTR\tquai.port-aube.lan.\n43\tIN\tPTR\tforge.port-aube.lan.\n22\tIN\tPTR\tarche.port-aube.lan.\n' | sudo tee /var/lib/bind/db.10.0.70
printf 'include "/etc/bind/cle-phare.key";\nzone "70.0.10.in-addr.arpa" {\n\ttype primary;\n\tfile "/var/lib/bind/db.10.0.70";\n\tallow-update { key cle-phare; };\n\tallow-transfer { 10.0.70.54; };\n\talso-notify { 10.0.70.54; };\n};\n' | sudo tee -a /etc/bind/named.conf.local
sudo named-checkconf -z && sudo rndc reload
exit; ssh phare
printf 'zone "70.0.10.in-addr.arpa" {\n\ttype secondary;\n\tprimaries { 10.0.70.53; };\n\tfile "/var/cache/bind/db.10.0.70";\n};\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload
exit; ssh noms
printf 'server 10.0.70.53\nzone 70.0.10.in-addr.arpa\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\nsend\n' | sudo nsupdate -k /etc/bind/cle-phare.key
dig -x 10.0.70.60 @noms +short; dig -x 10.0.70.25 @phare
```

Le transfert demandé depuis noms lui-même est refusé (`Transfer failed`) : seul le phare (10.0.70.54) a le droit de copier la zone. Une zone dynamique ne s'édite plus à la main : pour y toucher, `rndc freeze`, puis le fichier, puis `rndc thaw`.

### 64. La Poste et le Bureau des Lettres (Younes, Syrine)

Depuis l'aube, quatre lettres des bâtisseurs attendent dans la file (`mailq` dit pourquoi : le relais du continent ne répond pas). `postconf -n` dit le reste : une coquille (`mydomian`, inutilisée), un `mydestination` en double (le second écrase le premier), un relais injoignable, et un relais ouvert au monde entier. On corrige, on vérifie, on recharge, la file part, et une lettre arrive pour de bon (`status=sent` dans le journal). Au Bureau des Lettres, Dovecot cherche les boîtes au mauvais endroit : on lui donne celui de Postfix (des Maildir dans `/var/mail/NOM`). Puis on fabrique la clé DKIM de la Poste et on publie, dans la zone, SPF, DKIM et DMARC (la série monte encore).

```
exit; cd ../Poste; cat Younes; ssh poste
mailq; postconf -n
sudo sed -i '/^mydomian/d; $d' /etc/postfix/main.cf
sudo postconf -e 'myhostname = poste.port-aube.lan' 'mydomain = port-aube.lan' 'mydestination = $myhostname, $mydomain, localhost' 'relayhost =' 'mynetworks = 127.0.0.0/8 10.0.70.0/24'
sudo postfix check && sudo postfix reload
sudo postqueue -f; mailq
echo 'La Poste est ouverte.' | mail -s 'Premier courrier' $(whoami); sudo tail -3 /var/log/mail.log
exit; cd ../BureauDesLettres; cat Syrine; ssh poste
doveadm user $(whoami)
sudo sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/%u|' /etc/dovecot/conf.d/10-mail.conf; sudo systemctl reload dovecot
doveadm mailbox status messages INBOX; doveadm fetch 'hdr.subject' all
sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys; sudo cat /etc/opendkim/keys/aube.txt > /tmp/aube.txt; scp /tmp/aube.txt noms:/tmp/
exit; ssh noms
printf '@\tIN\tTXT\t"v=spf1 mx -all"\n_dmarc\tIN\tTXT\t"v=DMARC1; p=quarantine; rua=mailto:postmaster@port-aube.lan"\n' | sudo tee -a /etc/bind/zones/db.port-aube.lan; cat /tmp/aube.txt | sudo tee -a /etc/bind/zones/db.port-aube.lan
sudo sed -i 's/2026101702/2026101703/' /etc/bind/zones/db.port-aube.lan; sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan && sudo rndc reload
dig @noms port-aube.lan TXT +short; dig @noms aube._domainkey.port-aube.lan TXT +short; dig @noms _dmarc.port-aube.lan TXT +short
```

`sed '$d'` retire la dernière ligne de `main.cf`, le `mydestination` en double. La clé privée DKIM reste sur la Poste ; seule la ligne publique (`aube.txt`) voyage jusqu'à la zone.

### 65. Le Grand Registre et les Greniers (Kamal, Noam)

Le sceau du Registre (le mot de passe de `cn=admin`) s'est perdu : on en forge un neuf avec `slappasswd`, et on le pose dans la configuration de slapd par la porte de root (`ldapi:///`, `-Y EXTERNAL`). Puis les branches `people` et `groups`, les deux groupes (batisseurs, 10000 ; promo, 10100), et les dix bâtisseurs : `ldapadd -c` dit les deux fautes du LDIF (Noam sans `uidNumber`, Lamia avec un `gidNumber` écrit en lettres), on les corrige et on relance (les huit déjà inscrits répondent `Already exists`). Enfin les membres, avec `ldapmodify`. Chaque `-W` demande le sceau.

Aux Greniers, `/srv/homes` est publié à l'île seulement, en `root_squash` ; depuis le quai, on le voit, on le monte, et root du quai se fait refuser l'écriture (il y devient nobody). Le sixième toit posé, la Tempête arrive en avance : elle frappe les six maisons debout. La plus urgente, ici, est au Registre (Zélia n'est plus dans la promo, et la Halle en a besoin) : on la remet tout de suite.

```
exit; cd ../GrandRegistre; cat Kamal; ssh registre
cd; printf 'dn: olcDatabase={1}mdb,cn=config\nchangetype: modify\nreplace: olcRootPW\nolcRootPW: %s\n' "$(slappasswd -s Sceau-de-Port-Aube)" > rootpw.ldif; sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f rootpw.ldif
printf 'dn: ou=people,dc=port-aube,dc=lan\nobjectClass: organizationalUnit\nou: people\n\ndn: ou=groups,dc=port-aube,dc=lan\nobjectClass: organizationalUnit\nou: groups\n\ndn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\nobjectClass: posixGroup\ncn: batisseurs\ngidNumber: 10000\n\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\nobjectClass: posixGroup\ncn: promo\ngidNumber: 10100\n' > branches.ldif; sudo cp /root/batisseurs.ldif .; sudo chown $(whoami) batisseurs.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f branches.ldif
ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f batisseurs.ldif
sed -i 's/^gidNumber: dix-mille/gidNumber: 10000/; s/^uid: noam$/uid: noam\nuidNumber: 10005/' batisseurs.ldif; ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f batisseurs.ldif
printf 'dn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\nchangetype: modify\nadd: memberUid\nmemberUid: badis\nmemberUid: maeva\nmemberUid: younes\nmemberUid: syrine\nmemberUid: noam\nmemberUid: zelia\nmemberUid: kamal\nmemberUid: lamia\nmemberUid: miguel\nmemberUid: amina\n\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\nchangetype: modify\nadd: memberUid\nmemberUid: zelia\n' > membres.ldif; ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f membres.ldif
ldapsearch -x -LLL '(uid=badis)'
exit; cd ../Greniers; cat Noam; ssh greniers
echo '/srv/homes 10.0.70.0/24(rw,sync,no_subtree_check,root_squash)' | sudo tee -a /etc/exports; sudo exportfs -ra; sudo exportfs -v
exit; ssh quai
showmount -e greniers; sudo mount -t nfs greniers:/srv/homes /mnt; ls -ln /mnt
sudo touch /mnt/essai-de-root; sudo umount /mnt
exit; ssh registre
ldapsearch -x -LLL '(cn=promo)'
cd; printf 'dn: cn=promo,ou=groups,dc=port-aube,dc=lan\nchangetype: modify\nadd: memberUid\nmemberUid: zelia\n' > zelia.ldif; ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f zelia.ldif
```

`slappasswd -s` hache la phrase sans la demander ; tapé seul, `slappasswd` la demande deux fois. Sur les Greniers, les dossiers n'ont que des numéros (`ls -ln`) : les noms viendront du Registre.

### 66. Les Portes de la cité et la Halle (Lamia, Zélia)

Sur le quai, sssd branche les comptes du Registre (son fichier lisible par root seul, sinon il refuse de démarrer), nsswitch le consulte après les fichiers, et `getent`, `id` reconnaissent les bâtisseurs ; autofs monte chaque maison depuis les Greniers à l'instant où l'on y entre (`&` prend le nom demandé). À la Halle, on décommente le partage de la promo (préparé par les bâtisseurs), on crée son dossier pour le groupe promo, on vérifie, on recharge, puis Zélia reçoit un mot de passe Samba (demandé deux fois), voit les partages et dépose le plan de la fête.

```
exit; cd ../PortesDeLaCite; cat Lamia; ssh quai
printf '[sssd]\nservices = nss, pam\ndomains = port-aube\n\n[domain/port-aube]\nid_provider = ldap\nauth_provider = ldap\nldap_uri = ldap://registre.port-aube.lan\nldap_search_base = dc=port-aube,dc=lan\ncache_credentials = True\n' | sudo tee /etc/sssd/sssd.conf; sudo chmod 600 /etc/sssd/sssd.conf
sudo sed -i 's/^\(passwd\|group\|shadow\):\( *\)files/&  sss/' /etc/nsswitch.conf; sudo systemctl enable --now sssd
getent passwd badis; id badis
echo '/home /etc/auto.home' | sudo tee /etc/auto.master.d/home.autofs; echo '* greniers:/srv/homes/&' | sudo tee /etc/auto.home; sudo systemctl reload autofs
ls -ld /home/badis
exit; cd ../Halle; cat Zélia; ssh halle
id zelia; sudo sed -i 's/^;\(\[promo\]\)/\1/; s/^;\(   \)/\1/' /etc/samba/smb.conf; sudo mkdir /srv/promo; sudo chown root:promo /srv/promo; sudo chmod 2770 /srv/promo; testparm -s
sudo systemctl reload smbd; sudo smbpasswd -a zelia
sudo pdbedit -L; smbclient -L halle -U zelia
cd; echo 'Le plan de la fête du port' > plan.txt; smbclient //halle/promo -U zelia -c 'put plan.txt; ls'
```

Chaque `smbclient -U zelia` demande le mot de passe Samba de Zélia. Si la Halle a gardé en cache une promo sans Zélia (en passant ici avant d'avoir réparé le Registre), `sudo sss_cache -E` lui fait oublier sa vieille page.

### 67. La Forge des Sceaux et l'Arche (Miguel, Amina)

À la Forge, l'autorité de la cité : une clé (que root seul lit, dans un dossier fermé, et qui ne sortira jamais de la forge) et son certificat autosigné. La Poste demande un sceau (une requête, avec son nom et celui d'imap), la Forge le signe, Dovecot le sert, et le quai apprend à faire confiance à la Forge : `s_client` finit sur `Verify return code: 0 (ok)`. Pour l'Arche, les Greniers fabriquent une clé ssh qui ne sert qu'à ça ; sur l'Arche, elle est enfermée (`command="borg serve --restrict-to-path ..."`, `restrict`). Puis le dépôt chiffré (la phrase, deux fois, puis `N`), la phrase gardée par root pour le service, une première sauvegarde par le service `sauvegarde-borg` (déjà écrit par les bâtisseurs), son timer de chaque nuit, et la preuve : on vérifie le dépôt, on restaure un dossier dans un coin vide et on le compare à l'original (`diff` ne dit rien : identique). Chaque `borg` demande la phrase du dépôt.

```
exit; cd ../ForgeDesSceaux; cat Miguel; ssh forge
sudo openssl genrsa -out /srv/forge/forge.key 4096; sudo openssl req -x509 -new -key /srv/forge/forge.key -days 3650 -subj '/CN=Forge des Sceaux de Port-Aube' -out /srv/forge/forge.crt; sudo cp /srv/forge/forge.crt /srv/demandes/
exit; ssh poste
sudo openssl genrsa -out /etc/dovecot/private/poste.key 2048; sudo openssl req -new -key /etc/dovecot/private/poste.key -subj '/CN=poste.port-aube.lan' -addext 'subjectAltName=DNS:poste.port-aube.lan,DNS:imap.port-aube.lan' -out /tmp/poste.csr; scp /tmp/poste.csr forge:/srv/demandes/
exit; ssh forge
sudo openssl x509 -req -in /srv/demandes/poste.csr -CA /srv/forge/forge.crt -CAkey /srv/forge/forge.key -CAcreateserial -days 825 -copy_extensions copy -out /srv/demandes/poste.crt
exit; ssh poste
scp forge:/srv/demandes/poste.crt /tmp/; sudo cp /tmp/poste.crt /etc/dovecot/private/poste.pem
sudo sed -i 's|^ssl_cert = .*|ssl_cert = </etc/dovecot/private/poste.pem|; s|^ssl_key = .*|ssl_key = </etc/dovecot/private/poste.key|' /etc/dovecot/conf.d/10-ssl.conf; sudo systemctl reload dovecot
exit; ssh quai
scp forge:/srv/demandes/forge.crt /tmp/; sudo cp /tmp/forge.crt /usr/local/share/ca-certificates/; sudo update-ca-certificates
openssl s_client -connect poste.port-aube.lan:993 -verify_return_error
exit; cd ../Arche; cat Amina; ssh greniers
sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''; sudo cp /root/.ssh/arche.pub /tmp/; scp /tmp/arche.pub arche:/tmp/
exit; ssh arche
sed 's|^|command="borg serve --restrict-to-path /srv/borg/greniers",restrict |' /tmp/arche.pub | sudo tee /home/borg/.ssh/authorized_keys
exit; ssh greniers
sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
echo 'La-cite-ne-perd-rien' | sudo tee /root/.borg-phrase; sudo chmod 600 /root/.borg-phrase; sudo systemctl start sauvegarde-borg
printf '[Unit]\nDescription=La sauvegarde de chaque nuit\n\n[Timer]\nOnCalendar=*-*-* 02:30\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n' | sudo tee /etc/systemd/system/sauvegarde-borg.timer; sudo systemctl daemon-reload; sudo systemctl enable --now sauvegarde-borg.timer
sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
sudo borg check --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
sudo mkdir /tmp/retour; cd /tmp/retour; sudo borg extract --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::<archive> srv/homes/badis
sudo diff -r /srv/homes/badis /tmp/retour/srv/homes/badis
```

La dixième maison bâtie avant 14 h, le défi d'honneur de Laurent est réussi.

### 68. Tenir la Tempête

`chantier` dit ce que la Tempête a frappé (le regarder pendant la Tempête est demandé). On lit avant d'agir, et on répare une chose à la fois : le MX a perdu son point final (on le lui rend, et la série monte : le phare, qui avait gardé une vieille série, reçoit la nouvelle et rattrape son retard), la Poste est rouverte à tous les vents, ta boîte appartient à root, et `no_root_squash` est revenu sur les Greniers (Zélia est déjà revenue dans la promo). La Tempête tenue et les dix maisons debout, la marée monte en avance.

```
exit
chantier
ssh noms
dig @noms port-aube.lan MX +short; dig @phare port-aube.lan SOA +short; dig @noms port-aube.lan SOA +short
sudo sed -i 's/\(MX\t10 poste.port-aube.lan\)$/\1./; s/2026101705/2026101706/' /etc/bind/zones/db.port-aube.lan; sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan && sudo rndc reload
dig @noms port-aube.lan MX +short; dig @phare port-aube.lan SOA +short
exit; ssh poste
postconf mynetworks; sudo postconf -e 'mynetworks = 127.0.0.0/8 10.0.70.0/24'; sudo postfix reload
ls -ld /var/mail/$(whoami); sudo chown -R $(whoami) /var/mail/$(whoami); doveadm mailbox status messages INBOX
exit; ssh greniers
sudo exportfs -v; sudo sed -i 's/no_root_squash/root_squash/' /etc/exports; sudo exportfs -ra; sudo exportfs -v
exit
```

La Tempête a fait monter la série deux fois (2026101705) : la nouvelle est 2026101706.

### 69. La Marée et le Premier Pas

Le navire est là. Le capitaine a inscrit son navire dans la zone, à la main, sans changer la série : la Maison des Noms le connaît, le phare non. On monte la série. Puis le premier étudiant, Aron : son compte dans le Registre (dans la promo, avec son mot de passe), sa maison sur les Greniers (à son numéro), une lettre de bienvenue, son compte Samba (son mot de passe, deux fois), et une sauvegarde fraîche qui le contient. Alors il se connecte depuis le quai (son mot de passe est demandé) : les six portes s'ouvrent.

```
ssh noms
dig @phare navire.port-aube.lan +short; dig @noms navire.port-aube.lan +short; tail -3 /etc/bind/zones/db.port-aube.lan
sudo sed -i 's/2026101706/2026101707/' /etc/bind/zones/db.port-aube.lan; sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan && sudo rndc reload; dig @phare navire.port-aube.lan +short
exit; ssh registre
cd; printf 'dn: uid=aron,ou=people,dc=port-aube,dc=lan\nobjectClass: inetOrgPerson\nobjectClass: posixAccount\nobjectClass: shadowAccount\nuid: aron\ncn: Aron\nsn: Aron\nuidNumber: 10011\ngidNumber: 10100\nhomeDirectory: /home/aron\nloginShell: /bin/bash\nmail: aron@port-aube.lan\nuserPassword: %s\n\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\nchangetype: modify\nadd: memberUid\nmemberUid: aron\n' "$(slappasswd -s Premier-pas-sur-l-ile)" > aron.ldif; ldapmodify -a -x -D cn=admin,dc=port-aube,dc=lan -W -f aron.ldif
exit; ssh greniers
sudo mkdir /srv/homes/aron; sudo chown 10011:10100 /srv/homes/aron; sudo chmod 700 /srv/homes/aron
exit; ssh poste
echo 'Bienvenue à Port-Aube, Aron. Ta maison est prête.' | mail -s 'Bienvenue' aron
exit; ssh halle
sudo smbpasswd -a aron
exit; ssh greniers
sudo systemctl start sauvegarde-borg
exit
ssh aron@quai
chantier
```

`ldapmodify -a` ajoute les entrées sans `changetype` et applique les modifications : un seul fichier pour le compte et son entrée dans la promo. `chantier` après la Marée, au-dessus de 90 (ici 100), est retenu comme note finale.

### 70. Le rapport de mise en service

Le rapport porte cinq rubriques (les maisons, la tempête, la marée, le premier pas, ce qui reste), le prénom du premier étudiant et la vraie note du chantier après la Marée. Laurent ne le contresigne que si la Tempête est tenue, la Marée accueillie, le premier étudiant entré et le chantier au-dessus de 90 : déposé trop tôt, il le garde et dit ce qui reste ; sans le prénom ou la note, il les demande.

```
mkdir -p ~/port-aube
cat > ~/port-aube/rapport.txt <<'FIN'
RAPPORT DE MISE EN SERVICE - PORT-AUBE
Les maisons : les dix maisons sont bâties (noms, phare, poste, lettres, greniers, halle, registre, portes, forge, arche).
La tempête : MX sans point final, phare en retard de série, relais ouvert, boîte à root, no_root_squash, Zélia sortie de la promo. Tout est réparé.
La marée : le navire inscrit à la main sans changer la série ; série montée, le phare le connaît.
Le premier pas : aron est entré dans la cité, ses six portes ouvertes. Chantier : 100 sur 100.
Ce qui reste : surveiller les sauvegardes de la nuit, et renouveler les sceaux avant leur expiration.
FIN
cp ~/port-aube/rapport.txt ~/Cybersup/Embarcadere/PortAube/BoiteDeLaurent
cat ~/CertificatPortAube
```

Laurent contresigne : « Il y a des gens qui réparent les cités. Toi, tu viens d'en bâtir une. Port-Aube a un Architecte. » Le CertificatPortAube, posé dans la Maison, porte la note du chapitre 7 et son code de vérification ; le quiz du chapitre (`quiz 7`) s'ouvre, et `badges port-aube` relit les seize leçons (une par maison, la Tempête, la Marée, le Premier Pas, le Rapport, le chantier et les dix maisons avant 14 h) et le platine.

### 71. Après la fête : ce que personne n'a écrit

La nuit tombe, on danse sur le quai. Tard, une lettre de plus arrive dans ta boîte, signée d'une plume grise, que la file de la Poste n'a jamais vue ; un nom que personne n'a écrit répond dans la zone (`phare-noir`, vers une adresse hors de l'île), sans être dans aucun fichier ; et le Registre compte un passager inscrit à 03:12 la nuit dernière, avant que la cité n'existe. Tout se constate, rien n'est à réparer : on le consigne dans le rapport (le troisième défi d'honneur). La radio de Grace : « ... Ça, ce n'est pas nous. » À suivre.

```
ssh poste
doveadm fetch 'hdr.from hdr.subject' all; mailq
exit; ssh noms
dig @noms phare-noir.port-aube.lan +short; grep -c phare-noir /etc/bind/zones/db.port-aube.lan
exit; ssh registre
ldapsearch -x -LLL '(uid=passager)'
exit
echo "Apres la fete : phare-noir.port-aube.lan repond 203.0.113.66 sans etre dans la zone ; un compte passager inscrit a 03:12 ; une lettre deposee sans passer par la file. Ce n'est pas nous." >> ~/port-aube/rapport.txt; cp ~/port-aube/rapport.txt ~/Cybersup/Embarcadere/PortAube/BoiteDeLaurent
```

### 72. Les défis des maîtres, maison par maison

Les 50 défis des maisons, dans l'ordre des maîtres (la solution les fait après le rapport). La Maison des Noms : la série en une ligne, `named-checkconf -z`, `rndc status`, `dig NS`, un alias suivi jusqu'au bout. Le Phare-Relais : `rndc zonestatus`, le transfert permis depuis le phare, `tsig-keygen`, un nom retiré à chaud (puis remis), `dig -x 10.0.70.53`. La Poste : `postconf -d`, une lettre en attente ouverte avec `postcat -q` (une lettre pour le continent, qui ne part pas, puis supprimée avec `postsuper -d`), `sendmail -t`, `status=sent` dans le journal, `postqueue -p`. Le Bureau des Lettres : `doveconf -n`, `doveadm fetch`, `doveadm search`, la clé DKIM lue par `dig`, un SPF en `-all`. Les Greniers : `exportfs -s`, `showmount` depuis le quai, `mount -t nfs4`, `umount`, `ls -ln`. La Halle : `testparm -s`, `smbclient -c ls`, `get`, un invité refusé, `pdbedit -L -v`. Le Grand Registre : `slapcat`, `ldapwhoami`, un filtre à deux conditions, `cn=config` relu par la porte de root, `ldappasswd -S` (le nouveau mot de passe deux fois, puis le sceau). Les Portes : `getent group promo`, `id` d'un bâtisseur, `sss_cache -E`, le journal de sssd, des noms et plus des numéros. La Forge : `x509 -text` (CA:TRUE), `verify -CAfile`, la clé et le sceau qui vont ensemble (`-modulus`), le Registre lui aussi derrière un sceau de la Forge (`ldapsearch -ZZ` depuis le quai), la clé de l'autorité gardée. L'Arche : `borg info`, `borg prune --list --dry-run`, `borg check -v`, `systemctl list-timers`, le contenu d'une archive. Au passage, `ldapdelete` retire une branche de brouillon.

```
ssh noms
sudo rndc status; dig NS port-aube.lan @noms; dig @noms imap.port-aube.lan
exit; ssh phare
sudo rndc zonestatus port-aube.lan; dig AXFR port-aube.lan @noms | head -5; dig -x 10.0.70.53 @phare +short
exit; ssh noms
printf 'server 10.0.70.53\nzone 70.0.10.in-addr.arpa\nupdate delete 60.70.0.10.in-addr.arpa. PTR\nsend\n' | sudo nsupdate -k /etc/bind/cle-phare.key
printf 'server 10.0.70.53\nzone 70.0.10.in-addr.arpa\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\nsend\n' | sudo nsupdate -k /etc/bind/cle-phare.key
exit; ssh poste
postconf -d mynetworks; sudo postqueue -p
echo 'Port-Aube est debout.' | mail -s 'Nouvelles de l ile' laurent@ancien-campus.lan; mailq
sudo postcat -q $(mailq | awk 'NR==2 {print $1}') | head -12
sudo postsuper -d ALL; mailq
printf 'To: badis@port-aube.lan\nSubject: Les noms tiennent\n\nLa zone a tenu la tempete.\n' | sendmail -t; sudo tail -2 /var/log/mail.log
sudo doveconf -n | head -8; doveadm search mailbox INBOX subject Premier
exit; ssh greniers
sudo exportfs -s; sudo ls -ln /srv/homes; sudo systemctl list-timers
sudo borg info --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
sudo borg prune --list --dry-run --keep-daily 7 --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
sudo borg check -v --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers
sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::<archive>
exit; ssh quai
sudo mount -t nfs4 greniers:/srv/homes /mnt; mount -t nfs4; sudo umount /mnt
getent group promo; sudo sss_cache -E; sudo journalctl -u sssd | tail -3
exit; ssh halle
smbclient //halle/promo -U zelia -c 'ls; get plan.txt /tmp/plan-repris.txt'
smbclient //halle/promo -N -c ls
sudo pdbedit -L -v | head -6
exit; ssh registre
sudo slapcat | head -12; ldapwhoami -x
ldapsearch -x -LLL '(&(objectClass=posixAccount)(gidNumber=10100))' uid
sudo ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=config '(olcRootDN=*)' olcRootDN
ldappasswd -x -D cn=admin,dc=port-aube,dc=lan -W -S uid=aron,ou=people,dc=port-aube,dc=lan
cd; printf 'dn: ou=brouillons,dc=port-aube,dc=lan\nobjectClass: organizationalUnit\nou: brouillons\n' > brouillons.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f brouillons.ldif
ldapdelete -x -D cn=admin,dc=port-aube,dc=lan -W ou=brouillons,dc=port-aube,dc=lan
sudo openssl genrsa -out /etc/ldap/registre.key 2048; sudo chown openldap /etc/ldap/registre.key; sudo openssl req -new -key /etc/ldap/registre.key -subj '/CN=registre.port-aube.lan' -addext 'subjectAltName=DNS:registre.port-aube.lan' -out /tmp/registre.csr; scp /tmp/registre.csr forge:/srv/demandes/
exit; ssh forge
sudo openssl x509 -in /srv/forge/forge.crt -noout -text | head -20
sudo openssl verify -CAfile /srv/forge/forge.crt /srv/demandes/poste.crt
sudo openssl x509 -noout -modulus -in /srv/forge/forge.crt; sudo openssl rsa -noout -modulus -in /srv/forge/forge.key
sudo openssl x509 -req -in /srv/demandes/registre.csr -CA /srv/forge/forge.crt -CAkey /srv/forge/forge.key -CAcreateserial -days 825 -copy_extensions copy -out /srv/demandes/registre.crt
exit; ssh registre
scp forge:/srv/demandes/registre.crt /tmp/; sudo cp /tmp/registre.crt /etc/ldap/registre.crt
cd; printf 'dn: cn=config\nchangetype: modify\nreplace: olcTLSCertificateFile\nolcTLSCertificateFile: /etc/ldap/registre.crt\n-\nreplace: olcTLSCertificateKeyFile\nolcTLSCertificateKeyFile: /etc/ldap/registre.key\n' > tls.ldif; sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f tls.ldif
exit; ssh quai
ldapsearch -x -ZZ -H ldap://registre.port-aube.lan -b dc=port-aube,dc=lan '(uid=badis)' uid
exit
```

La clé du Registre appartient à openldap : slapd doit pouvoir la lire. Le quai fait déjà confiance à la Forge (`update-ca-certificates`), donc au sceau du Registre.

### 73. Les quêtes annexes : l'Ami de Port-Aube

Six habitants de Port-Aube ont chacun un service à demander. Ces quêtes annexes sont facultatives et hors note : elles ne comptent ni dans l'XP du chapitre ni dans la note, et donnent un bonus d'XP à part, un souvenir déposé dans `~/Souvenirs`, puis, toutes finies, le badge « Ami de Port-Aube ». Elles n'enseignent que des notions jamais vues dans les chapitres 1 à 7 (l'impression avec CUPS, le tri du courrier par un filtre Sieve, la découverte de services en `.local` avec avahi, un tunnel WireGuard, le démon rsync et ses modules, un compte enfermé dans sftp par `Match Group` et `ChrootDirectory`). Une annexe s'ouvre en lisant son habitant ; ses étapes se font dans l'ordre ; `quetes annexes` en donne l'avancée. Ilyès est sur le quai, Clara à la Poste, Mehdi à la Halle, Sara au Phare-Relais, Rayan au Grand Registre, Fama aux Portes de la cité.

Pour le dépôt des devoirs, `sftp depot@halle` demande le mot de passe du compte (« Rendus du soir 7 »), puis on tape, à l'invite `sftp>` : `pwd` (la prison se voit comme `/`), `put devoir.txt rendus/`, `ls rendus`, `bye`. `ssh depot@halle` (même mot de passe) est ensuite refusé : « This service allows sftp connections only. » Pour le pont sous la mer, chaque bout publie sa clé publique dans `/tmp` pour que l'autre la recopie (`/etc/wireguard` est fermé à tous sauf root).

```
cd ~/Cybersup/Embarcadere/PortAube
cat Ilyes; cat Poste/Clara; cat Halle/Mehdi; cat PhareRelais/Sara; cat GrandRegistre/Rayan; cat PortesDeLaCite/Fama
quetes annexes
ssh imprimerie
lpstat -t
cancel 1; lpadmin -p gazette -v ipp://presse.port-aube.lan/ipp/print -m everywhere; lpadmin -d gazette
cupsenable gazette; cupsaccept gazette; lp -d gazette /srv/gazette/gazette-du-port.txt; lpstat -W completed -o
exit; ssh poste
printf 'require ["fileinto", "vacation"];\nif header :contains "subject" "horaire" {\n  fileinto "Horaires";\n}\nvacation :days 1 :subject "Le capitaine est en mer" "Le capitaine est en mer, sans reseau. Il vous lira au retour.";\n' | sudo tee /home/capitaine/sieve/repondeur.sieve
sudo sievec /home/capitaine/sieve/repondeur.sieve; sudo doveadm sieve activate -u capitaine repondeur
sudo sed -i 's/^  #mail_plugins = $mail_plugins$/  mail_plugins = $mail_plugins sieve/' /etc/dovecot/conf.d/15-lda.conf; sudo systemctl reload dovecot
sudo postconf -e 'mailbox_command = /usr/lib/dovecot/dovecot-lda -f "$SENDER" -a "$RECIPIENT"'; sudo postfix reload
echo 'A quelle heure part le navire ?' | mail -s 'Question sur les horaires' capitaine; sudo doveadm mailbox list -u capitaine
doveadm fetch 'hdr.subject' mailbox INBOX
exit; ssh quai
avahi-browse -a -t; avahi-resolve -n halle.local
printf '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE service-group SYSTEM "avahi-service.dtd">\n<service-group>\n  <name>La fete du port</name>\n  <service>\n    <type>_http._tcp</type>\n    <port>8080</port>\n  </service>\n</service-group>\n' | sudo tee /etc/avahi/services/fete.service
avahi-browse -t _http._tcp
exit; ssh phare
wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey; sudo chmod 600 /etc/wireguard/privatekey; sudo cp /etc/wireguard/publickey /tmp/phare.pub
exit; ssh rive
sudo cp /etc/wireguard/publickey /tmp/rive.pub; scp phare:/tmp/phare.pub /tmp/; sudo sed -i "s|A_REMPLACER|$(cat /tmp/phare.pub)|" /etc/wireguard/wg0.conf; sudo wg-quick up wg0
exit; ssh phare
scp rive:/tmp/rive.pub /tmp/; printf '[Interface]\nPrivateKey = %s\nAddress = 10.99.0.1/24\nListenPort = 51820\n\n[Peer]\nPublicKey = %s\nEndpoint = rive.ancien-campus.lan:51820\nAllowedIPs = 10.99.0.2/32\n' "$(sudo cat /etc/wireguard/privatekey)" "$(cat /tmp/rive.pub)" | sudo tee /etc/wireguard/wg0.conf; sudo chmod 600 /etc/wireguard/wg0.conf
sudo wg-quick up wg0; ping -c 2 10.99.0.2; sudo wg show
exit; ssh bibliotheque
printf '[archives]\n\tpath = /srv/bibliotheque/archives\n\tcomment = Les archives de la traversee\n\tread only = yes\n\thosts allow = 10.0.70.0/24\n' | sudo tee /etc/rsyncd.conf; sudo systemctl start rsync
exit; ssh quai
rsync rsync://bibliotheque/; rsync -av rsync://bibliotheque/archives/ /tmp/miroir/
exit; ssh halle
sudo groupadd devoirs; sudo usermod -aG devoirs depot; sudo mkdir -p /srv/devoirs/rendus; sudo chown depot /srv/devoirs/rendus
printf '\nMatch Group devoirs\n\tChrootDirectory /srv/devoirs\n\tForceCommand internal-sftp\n' | sudo tee -a /etc/ssh/sshd_config; sudo sshd -t && sudo systemctl reload ssh
exit; ssh quai
cd; echo 'Mon devoir sur le DNS' > devoir.txt; sftp depot@halle
ssh depot@halle
exit
quetes annexes
```

Les six annexes finies, les habitants viennent saluer l'Architecte sur le quai, et le badge « Ami de Port-Aube » s'ajoute à `badges port-aube`.

## Chapitre 8 : la Flotte noire, le Grand Port (conteneurs, de zéro à héros)

Numéro interne 9, affiché 8. Le chapitre s'ouvre à la fin de Port-Aube (le rapport de mise en service contresigné) : Laurent écrit qu'une flotte noire se rassemble derrière le phare, et le Grand Port de Port-Aube s'ouvre au bout de la cité (`cd ~/Cybersup/Embarcadere/PortAube/GrandPort`). On peut aussi y partir directement (la huitième enveloppe, « L'Ordre d'embarquement », ou `chapitre 8` en début de partie) : les sorts des chapitres 1 à 7 sont alors acquis, et la partie commence au Grand Port, qui est alors à `~/Cybersup/Embarcadere/GrandPort`. Une cinématique ouvre le chapitre dans les deux cas (`cinematique 8` la rejoue).

On arrive Mousse, sans jamais avoir touché un conteneur ; on repart Amiral. Il est J1, 6 h. La flotte noire attaque à l'aube du J4. Chaque commande avance l'horloge de 5 minutes (chaque commande compte, même enchaînée avec `;`, jusqu'à huit par ligne ; les lignes d'un here-document ne comptent pas) ; à 22 h, c'est le bivouac, et l'on se lève à 6 h (`cat Horloge`, la barre d'état et la radio de Grace donnent l'heure, le rang et le compte à rebours). Une journée de port fait donc 192 commandes : il faut prévoir son budget de temps. Quatorze quais, quatorze maîtres du port, en six actes : Kylian (le Quai des Premiers Pas, le démon et la première caisse), Julien (la Capitainerie, la vie d'une caisse), Grégoire (l'Entrepôt des plans, les images et leurs couches), Chahla (les Soutes, les volumes), Adonis (les Chenaux, les réseaux), Eden (le Chantier naval, le Dockerfile), Megane (les Cales, le cache et les couches), Jahmal (le Chantier des maîtres, les étapes multiples et la santé), Déborah (le Registre du port, un registre privé gardé, sur `entrepot`), Elias (la Feuille de route, Compose), Remi (la Vigie, les redémarrages, les journaux, le démon), Ian (l'Armurerie, le durcissement des conteneurs et les secrets), Soufiane (la Douane, l'analyse d'une image suspecte, sur `douane`, sans jamais la lancer) et Arnaud (l'Escadre, Swarm, sur `docks` et `navire1` à `navire3`). Chaque maître explique son quai par une image et le vrai mot du métier, donne la syntaxe, confie la mission, réagit aux erreurs fréquentes, puis raconte une histoire du métier ; il enseigne ses manœuvres (les sous-commandes de `docker`), mais seulement à qui porte les galons de son quai. Chaque acte se termine par une épreuve de rang, qui donne le galon suivant : Matelot, Quartier-maître, Second, Capitaine, Amiral (`galons`, ou `rang`, dit ce qu'il manque). `port` (une commande du jeu) déploie le plan du Grand Port : les quatorze quais, les épreuves, l'heure, le rang, la flotte ennemie, et la puissance de la flotte sur 100 (5 au départ), lue sur l'état réel des machines.

Tout est validé sur l'état réel des machines, pas sur la commande tapée : un conteneur qui tourne mais ne répond pas ne compte pas, un mot de passe en clair dans l'environnement non plus, un registre ouvert à tous non plus, une image « réparée » qui pèse toujours un gigaoctet non plus, une étape faite avant d'avoir les galons de son quai non plus. Les variantes légitimes sont acceptées (`printf`, `cat <<'FIN'`, `nano` ou `sed` pour écrire un fichier ; `docker container ls` ou `docker ps` ; une sauvegarde par `tar` ou par `cp`...). Après le dernier galon et le déploiement de la pile de l'école sur l'escadre (ou, en cas de retard, à l'aube du J4), la flotte noire attaque : un navire sombre, une mise à jour piégée arrive par un automate oublié, et chaque quai laissé en friche coûte à la flotte. Si l'aube du J4 arrive avant que l'escadre soit prête, l'assaut frappe le port : le registre tombe, et il faut le relever avant de pouvoir finir.

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<moi>` | ton nom de compte (`whoami`) |
| `<digest-ecole>` | l'empreinte du plan de l'école poussé à l'entrepôt (la ligne `digest: sha256:...` du `docker push`, ou `docker images --digests`, sur docks) |
| `<digest-nginx>` | l'empreinte de l'ancienne nginx:1.27-alpine, celle que le web de l'école utilise (`docker images --digests` ou `docker compose images`, sur docks, à l'épreuve V) |
| `<jeton-swarm>` | le jeton des navires, donné par `docker swarm init` (ou `docker swarm join-token worker`), sur docks |
| `<digest-piege>` | l'empreinte de l'image piégée ecole:1.1 (`docker service ps --no-trunc ecole_app`, sur docks, pendant la bataille) |
| `<puissance>` | la puissance de la flotte après la bataille (`port`) |
| `<signature>` | l'empreinte de clé gravée dans les Labels de l'image de l'éclaireur (sur douane), la même que celle du Bastion dans le carnet des clés de docks (`ssh-keygen -lf /etc/ssh/ssh_known_hosts`) |
| `<pid-conteneur:vigie>` | le PID de la vigie vu du quai (`docker inspect -f '{{.State.Pid}}' vigie`, sur docks) |

Les mots de passe de cette solution (les choisir soi-même est permis, à condition de garder les mêmes partout) : le douanier de l'entrepôt (le compte du registre) a pour mot de passe `Sel-de-l-Entrepot` ; la base du convoi du matin, `Convoi-du-Matin` (la note de l'ancien équipage le donne).

Les 89 défis du Grand Port (quêtes secondaires `s_n8_*`, 50 XP chacun) : six par maître, révélés en lisant le maître (il les coche quand ils sont faits), et cinq défis d'honneur de Laurent : Matelot avant la première nuit (J1 22:00), Capitaine avant la fin du J2, la bataille avant l'aube du J4, le rapport remis sans avoir acheté d'indice, et, après la victoire, l'empreinte du constructeur consignée dans le rapport avec la machine qui la porte. La solution ci-dessous tient les quatorze quais acte par acte (Matelot vers 11 h le premier jour, Capitaine à 7 h le J2), gagne la bataille le J2 en début d'après-midi, rend le rapport, regarde la nuit tomber, puis fait les défis, quai par quai, et enfin les quêtes annexes.

### 74. Le Grand Port, Laurent et l'Ordre d'embarquement

On entre au Grand Port, on écoute Laurent, on lit l'Ordre d'embarquement, la radio, l'horloge, la carte et le bestiaire, et on déploie le plan du port (c'est la puissance de départ).

```
cd ~/Cybersup/Embarcadere/PortAube/GrandPort
cat Laurent; cat Ordre
cat Radio; cat Horloge; cat Carte; cat Bestiaire
port
```

La deuxième étape (`n8_port`) demande Laurent et l'Ordre lus, puis `port`. Ensuite, on entre dans chaque quai (`cd`), on lit son maître (il enseigne ses manœuvres), et on se connecte à sa machine (`ssh`) ; `exit` ramène au quai d'où l'on est parti.

### 75. Acte I, le Mousse : les Premiers Pas, la Capitainerie, l'Entrepôt des plans (Kylian, Julien, Grégoire)

Le démon tourne, mais `docker ps` est refusé : le socket appartient à root et au groupe docker. On entre dans l'équipage (le groupe se lit à la connexion : `exit`, puis `ssh docks`), la première caisse parle (`hello-world`), et un shell jetable s'ouvre dans une alpine (`--rm`), puis se referme. À la Capitainerie, la vigie du port (une nginx en fond, publiée sur 8080) : on la lit, on l'arrête, on la relance, on y entre, on l'inspecte de l'extérieur ; une variable passe à une caisse jetable, et le quai est nettoyé. À l'Entrepôt des plans, un plan reçoit un second nom, puis le perd ; les empreintes, les couches, la place prise, et les plans sans nom balayés.

```
cd QuaiDesPremiersPas; cat Kylian
ssh docks
systemctl status docker
docker ps
sudo usermod -aG docker <moi>
exit
ssh docks
docker info
docker run hello-world
docker run -it --rm alpine:3.20 sh
cat /etc/os-release
exit
docker ps -a
exit
cd ../Capitainerie; cat Julien
ssh docks
docker run -d --name vigie -p 8080:80 nginx:1.27-alpine
curl -s localhost:8080
docker logs vigie
docker stop vigie; docker start vigie
docker exec vigie ls /usr/share/nginx/html
docker inspect -f '{{.State.Status}}' vigie
docker top vigie
docker run --rm -e QUAI=8 alpine:3.20 printenv QUAI
docker container prune -f
exit
cd ../EntrepotDesPlans; cat Gregoire
ssh docks
docker tag alpine:3.20 alpine:quai-8
docker images
docker rmi alpine:quai-8
docker images --digests
docker history nginx:1.27-alpine
docker system df
docker image prune -f
```

### 76. Épreuve de rang I : la caisse qui ne démarre pas (Matelot)

Les sept étapes de l'acte faites, l'épreuve s'ouvre : `cargaison` ne démarre pas. Son code de sortie et son erreur le disent : le port 8081 est déjà pris, par une caisse oubliée (`squatteur`). On la retire ; la caisse démarre, mais meurt aussitôt : son plan lance un programme qui n'existe pas, et la note de l'ancien équipage dit lequel lancer, et qu'il lui faut la variable QUAI. On la recrée, avec la bonne commande et la variable, et elle répond « Caisse ouverte ».

```
docker ps -a
docker inspect -f '{{.State.ExitCode}} {{.State.Error}}' cargaison
docker rm -f squatteur
docker start cargaison
cat ~/caisse/Dockerfile ~/caisse/NOTE.txt
docker rm cargaison
docker run -d --name cargaison -p 8081:8081 cargaison:1.0 python serveur.py
docker logs cargaison
docker rm -f cargaison
docker run -d --name cargaison -p 8081:8081 -e QUAI=8 cargaison:1.0 python serveur.py
curl -s localhost:8081
exit
galons
```

Kylian coud le premier galon : Matelot (avant la première nuit, c'est un défi d'honneur).

### 77. Acte II, le Matelot : les Soutes et les Chenaux (Chahla, Adonis)

Une soute nommée (un volume) survit à la caisse qui l'a écrite ; un dossier du quai monté en lecture seule dans une nginx (une caisse ne peut plus y écrire) ; la soute mise en caisse, dans une archive, sur le quai. Aux Chenaux, un réseau à soi, où les caisses se trouvent par leur nom ; une caisse sans réseau du tout ; un port publié seulement sur 127.0.0.1, que l'entrepôt ne peut pas joindre.

```
cd ../Soutes; cat Chahla
ssh docks
docker volume create cales
docker run --rm -v cales:/cales alpine:3.20 sh -c 'echo "12 caisses de cordages, quai 8" > /cales/manifeste.txt'
docker run --rm -v cales:/cales alpine:3.20 cat /cales/manifeste.txt
mkdir -p ~/vitrine ~/sauvegardes; echo '<h1>Le Grand Port</h1>' > ~/vitrine/index.html
docker run -d --name vitrine -p 8083:80 -v ~/vitrine:/usr/share/nginx/html:ro nginx:1.27-alpine
curl -s localhost:8083
docker exec vitrine touch /usr/share/nginx/html/x
docker run --rm -v cales:/cales -v ~/sauvegardes:/sauve alpine:3.20 tar czf /sauve/cales.tgz -C /cales .
tar -tzf ~/sauvegardes/cales.tgz
exit
cd ../Chenaux; cat Adonis
ssh docks
docker network create chenal
docker run -d --name phare-nord --network chenal nginx:1.27-alpine
docker run -d --name phare-sud --network chenal alpine:3.20 sleep infinity
docker exec phare-sud wget -qO- phare-nord
docker network inspect chenal
docker run --rm --network none alpine:3.20 ip a
docker run -d --name guichet -p 127.0.0.1:8084:80 nginx:1.27-alpine
curl -s localhost:8084
exit
ssh entrepot
curl -s -m 2 docks:8084
exit
```

### 78. Épreuve de rang II : le convoi muet (Quartier-maître)

Le convoi du matin crie dans le vide : `convoi-app` cherche sa base par son nom, mais les deux caisses sont sur le réseau par défaut, où les noms ne passent pas ; et la base n'a rien en mémoire (pas de soute, pas de registre initial). La note de l'ancien équipage donne le mot de passe et le registre `init.sql`. On recrée les deux caisses sur un réseau à elles, la base avec une soute et son registre initial, et l'appli répond « 12 cargaisons ».

```
ssh docks
docker ps -a
curl -s localhost:8082
docker logs convoi-app
cat ~/convoi/NOTE.txt
docker network create convoi
docker rm -f convoi-app convoi-base
docker run -d --name convoi-base --network convoi -v convoi-donnees:/var/lib/postgresql/data -v ~/convoi/init.sql:/docker-entrypoint-initdb.d/init.sql:ro -e POSTGRES_USER=convoi -e POSTGRES_PASSWORD=Convoi-du-Matin -e POSTGRES_DB=convoi postgres:16-alpine
docker run -d --name convoi-app --network convoi -p 8082:8000 -e DB_HOST=convoi-base -e DB_USER=convoi -e DB_PASSWORD=Convoi-du-Matin -e DB_NAME=convoi convoi-app:1.0
curl -s localhost:8082
exit
```

### 79. Acte III, le Quartier-maître : le Chantier naval, les Cales, le Chantier des maîtres, le Registre du port (Eden, Megane, Jahmal, Déborah)

Le brouillon de Dockerfile de l'école est mauvais : une image complète, tout le dossier copié (le `.git`, les secrets, les données : `du -sh .` le pèse), pip réinstallé à chaque ligne changée, root, aucun port dit, aucune santé. On écrit un `.dockerignore` et un vrai plan : une image fine, un argument de construction, curl installé et les listes d'apt nettoyées dans le même RUN, les dépendances avant le code (pour le cache), un utilisateur qui n'est pas root, EXPOSE, HEALTHCHECK, LABEL. Aux Cales, une ligne de code changée : pip reste en cache. Au Chantier des maîtres, le phare se construit en deux étapes (une Debian pour compiler, rien du tout pour naviguer) et pèse moins de 30 Mo. Au Registre du port, sur `entrepot`, un registre privé gardé par un mot de passe (htpasswd au bcrypt) ; docks lui fait confiance (`daemon.json`, puis le démon relancé), se connecte, pousse le plan de l'école ; navire1 le tire, et le lance par son empreinte.

```
cd ../ChantierNaval; cat Eden
ssh docks
cd ~/ecole
cat Dockerfile
du -sh .
printf '.git\nsecrets\ndata\n*.md\n' > .dockerignore
printf 'FROM python:3.12-slim\nARG VERSION=1.0\nENV VERSION=$VERSION\nRUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nUSER 1000\nEXPOSE 8000\nHEALTHCHECK --interval=10s CMD curl -fs localhost:8000/ || exit 1\nLABEL org.opencontainers.image.title=ecole\nCMD ["python", "app.py"]\n' > Dockerfile
docker build --build-arg VERSION=1.0 -t ecole:1.0 .
docker run -d --name ecole-essai -p 8000:8000 ecole:1.0
curl -s localhost:8000/
exit
cd ../Cales; cat Megane
ssh docks
cd ~/ecole
echo '# une retouche du soir' >> app.py
docker build --build-arg VERSION=1.0 -t ecole:1.0 .
docker history ecole:1.0
exit
cd ../ChantierDesMaitres; cat Jahmal
ssh docks
cd ~/phare
printf 'FROM debian:12 AS build\nRUN apt-get update && apt-get install -y gcc make libc6-dev\nWORKDIR /src\nCOPY . .\nRUN make\n\nFROM scratch\nCOPY --from=build /src/phare /phare\nEXPOSE 8080\nCMD ["/phare"]\n' > Dockerfile
docker build -t phare:1.0 .
docker images phare
docker run -d --name phare -p 8085:8080 phare:1.0
curl -s localhost:8085
docker inspect -f '{{.State.Health.Status}}' ecole-essai
exit
cd ../RegistreDuPort; cat Deborah
ssh entrepot
sudo usermod -aG docker <moi>
exit
ssh entrepot
htpasswd -Bbn douanier Sel-de-l-Entrepot | sudo tee /srv/registre/auth/htpasswd
docker run -d --name registre --restart always -p 5000:5000 -v registre-donnees:/var/lib/registry -v /srv/registre/auth:/auth:ro -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=entrepot -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2
curl -s -o /dev/null -w '%{http_code}\n' localhost:5000/v2/
exit
ssh docks
echo '{"insecure-registries": ["entrepot.port-aube.lan:5000"], "log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
echo Sel-de-l-Entrepot | docker login entrepot.port-aube.lan:5000 -u douanier --password-stdin
docker tag ecole:1.0 entrepot.port-aube.lan:5000/ecole:1.0
docker push entrepot.port-aube.lan:5000/ecole:1.0
exit
ssh navire1
sudo usermod -aG docker <moi>
exit
ssh navire1
echo Sel-de-l-Entrepot | docker login entrepot.port-aube.lan:5000 -u douanier --password-stdin
docker pull entrepot.port-aube.lan:5000/ecole:1.0
docker run -d --name ecole-navire -p 8000:8000 entrepot.port-aube.lan:5000/ecole@<digest-ecole>
docker logout entrepot.port-aube.lan:5000
exit
```

Le registre répond 401 sans mot de passe : il est gardé. La ligne `log-opts` de `daemon.json` prépare déjà la Vigie (des journaux qui tournent).

### 80. Épreuve de rang III : le plan trop lourd (Second)

La carte des courants pèse plus d'un gigaoctet : une image complète, tout le dossier copié (dont un dossier de données énorme), et les dépendances installées après le code. On écrit un `.dockerignore`, un plan sur une image fine, les dépendances d'abord ; elle tombe sous 250 Mo, et une retouche de `carto.py` ne réinstalle plus rien (le second build reprend pip du cache).

```
ssh docks
cd ~/carto
docker images carto
printf 'donnees\n.git\n' > .dockerignore
printf 'FROM python:3.12-slim\nWORKDIR /carto\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY carto.py .\nEXPOSE 8090\nCMD ["python", "carto.py"]\n' > Dockerfile
docker build -t carto:1.1 .
echo '# la maree du soir' >> carto.py
docker build -t carto:1.2 .
docker images carto
exit
```

### 81. Acte IV, le Second : la Feuille de route et la Vigie (Elias, Remi)

La pile de l'école en convoi, dans `~/ecole/compose.yaml` : web (nginx, le seul publié), app (construite, durcie, son mot de passe en secret), base (postgres, sa santé, sa soute) et cache (redis). L'appli attend la santé de la base ; deux répliques de l'appli ; une inscription survit à `down` puis `up` (la soute tient). À la Vigie, le démon relancé : le convoi se relève seul (`restart: unless-stopped`) ; les vivres de chaque caisse, les événements de la dernière heure, le grand ménage (`system prune`) qui ne touche pas aux soutes nommées.

```
cd ../FeuilleDeRoute; cat Elias
ssh docks
cd ~/ecole
docker rm -f ecole-essai
cat > compose.yaml <<'FIN'
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./web/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
  app:
    build: .
    image: ecole:1.0
    env_file: config/app.env
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    depends_on:
      base:
        condition: service_healthy
      cache:
        condition: service_started
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 256m
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
  base:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ecole
      POSTGRES_DB: ecole
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - donnees:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecole"]
      interval: 10s
      retries: 5
    restart: unless-stopped
  cache:
    image: redis:7-alpine
    restart: unless-stopped
volumes:
  donnees:
secrets:
  db_password:
    file: ./secrets/db_password.txt
FIN
docker compose config
docker compose up -d
curl -s localhost/sante
docker compose up -d --scale app=2
docker compose logs app
curl -s -X POST -d prenom=aron localhost/inscriptions
docker compose down
docker compose up -d
curl -s localhost/inscriptions
exit
cd ../Vigie; cat Remi
ssh docks
sudo systemctl restart docker
docker compose -f ~/ecole/compose.yaml ps
docker stats --no-stream
docker events --since 1h --until 0s --filter type=container
docker system prune -f
docker volume ls
```

La relance du démon arrête les caisses qui n'ont pas de politique de redémarrage (la vigie, le phare, les caisses des chenaux) : le grand ménage les emporte, avec les réseaux devenus inutiles. Le convoi de l'école, lui, se relève seul, et ses soutes restent.

### 82. Épreuve de rang IV : la tempête dans le convoi (Capitaine)

La pile de `~/tempete`, montée à la hâte, tombe en boucle : la base publie un port déjà pris (5433), l'appli n'a que 8 Mo de vivres, et elle démarre sans attendre la santé de sa base. On corrige les trois fautes, et les quatre services tiennent debout, la base et l'appli en bonne santé.

```
cd ~/tempete
docker compose up -d
docker compose ps
sed -i 's/ -p 5433//' compose.yaml
sed -i 's/mem_limit: 8m/mem_limit: 256m/' compose.yaml
sed -i 's/      - base$/      base:\n        condition: service_healthy/; s/      - cache$/      cache:\n        condition: service_started/' compose.yaml
cat compose.yaml
docker compose up -d
docker compose ps
exit
```

Elias et Remi cousent le quatrième galon : Capitaine (avant la fin du J2, c'est un défi d'honneur ; la solution y est au matin du J2).

### 83. Acte V, le Capitaine : l'Armurerie et la Douane (Ian, Soufiane)

À l'Armurerie, l'appli de l'école est déjà blindée par la feuille de route (pas root, système de fichiers en lecture seule, aucune capacité, pas de nouveaux privilèges, des vivres comptés) : on le vérifie, de l'intérieur et de l'extérieur. Aucun mot de passe ne traîne dans l'environnement ni dans les montages ; un sonar de l'ancien équipage écoute le socket du démon (qui vaut root) : on le désarme. À la Douane, sur `douane` (aucune route vers le large), l'image de l'éclaireur pris par la flotte se lit sans jamais la lancer : ses métadonnées, son histoire entière, puis son autopsie, couche par couche (`docker save`, `tar`, le manifeste), et une caisse créée mais jamais démarrée, dont on sort le fichier-témoin. Le témoin n'est qu'une phrase ; le reste de l'image ne fait rien, sinon dire qui l'a construite.

```
cd ../Armurerie; cat Ian
ssh docks
cd ~/ecole
docker compose exec app touch /app/x
docker inspect -f '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}' ecole-app-1
docker ps --format '{{.Names}} {{.Mounts}}'
docker rm -f sonar
exit
cd ../Douane; cat Soufiane
ssh douane
sudo usermod -aG docker <moi>
exit
ssh douane
docker images
docker image inspect eclaireur:prise
docker history --no-trunc eclaireur:prise
printf 'Le fichier ajouté : /usr/local/share/flotte/temoin.txt\nCe qu elle lancerait : /bin/sh /etc/profile.d/flotte.sh\nLe constructeur : P.G.\n' > ~/douane/indices.txt
docker save -o eclaireur.tar eclaireur:prise
mkdir autopsie; tar xf eclaireur.tar -C autopsie
ls autopsie
jq '.[0].Layers' autopsie/manifest.json
tar -tf autopsie/blobs/sha256/9cf2840992f0bf789785b745aeb9a54c58fbb594b6dea07fad73b34634e5113c
docker create --name autopsie eclaireur:prise
docker cp autopsie:/usr/local/share/flotte/temoin.txt .
cat temoin.txt
sha256sum temoin.txt
docker diff autopsie
docker image inspect --format '{{json .Config.Labels}}' eclaireur:prise
exit
```

La couche du témoin est la dernière de la liste de `jq '.[0].Layers'` (son nom de fichier est son empreinte). Les indices de la Douane (`~/douane/indices.txt`) disent ce que l'image ajoute, ce qu'elle lancerait, et qui l'a construite.

### 84. Épreuve de rang V : le cheval de bois (Amiral)

Pendant la nuit, la vigie automatique de l'ancien équipage a tiré la « dernière » nginx:1.27-alpine : même nom, autre empreinte. Le web de l'école tourne encore sur l'ancienne. On compare les empreintes (l'ancienne est devenue un plan sans nom), on épingle l'ancienne par son empreinte dans `compose.yaml`, on relance le convoi, et on retire l'intruse.

```
ssh docks
cd ~/ecole
docker images --digests
docker compose images
sed -i 's|image: nginx:1.27-alpine|image: nginx:1.27-alpine@<digest-nginx>|' compose.yaml
docker compose up -d
docker rmi nginx:1.27-alpine
docker compose ps
exit
```

Le cinquième galon : Amiral. Arnaud ouvre l'Escadre.

### 85. Acte VI, l'Amiral : l'Escadre (Arnaud)

docks prend le commandement (`swarm init`), et les trois navires le rejoignent avec son jeton (chacun entre d'abord dans l'équipage docker). Un service réparti sur la flotte, agrandi, mis à jour un navire à la fois, puis ramené en arrière, et retiré. Puis la pile de l'école, en mer : un secret de l'escadre, et `pile.yaml`, avec web épinglé par son empreinte, trois répliques de l'appli, la base posée sur navire1. Le déploiement lance la bataille.

```
cd ../Escadre; cat Arnaud
ssh docks
docker swarm init --advertise-addr 10.0.80.10
exit
ssh navire1
docker swarm join --token <jeton-swarm> docks:2377
exit
ssh navire2
sudo usermod -aG docker <moi>
exit
ssh navire2
docker swarm join --token <jeton-swarm> docks:2377
exit
ssh navire3
sudo usermod -aG docker <moi>
exit
ssh navire3
docker swarm join --token <jeton-swarm> docks:2377
exit
ssh docks
docker node ls
docker service create --name app --replicas 3 --with-registry-auth -p 8000:8000 entrepot.port-aube.lan:5000/ecole:1.0
docker service scale app=4
docker service ps app
docker service update --env-add VERSION=1.0.1 --update-parallelism 1 --update-delay 10s app
docker service rollback app
docker service rm app
mkdir -p ~/escadre; cd ~/escadre
docker secret create db_password ~/ecole/secrets/db_password.txt
cat > pile.yaml <<'FIN'
services:
  web:
    image: nginx:1.27-alpine@<digest-nginx>
    ports:
      - "8088:80"
    deploy:
      replicas: 2
  app:
    image: entrepot.port-aube.lan:5000/ecole:1.0
    environment:
      DB_HOST: base
      CACHE_HOST: cache
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
  base:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ecole
      POSTGRES_DB: ecole
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    deploy:
      placement:
        constraints: [node.hostname == navire1]
  cache:
    image: redis:7-alpine
secrets:
  db_password:
    external: true
FIN
docker stack deploy -c pile.yaml --with-registry-auth ecole
docker stack services ecole
```

`--with-registry-auth` donne aux navires la clé de l'entrepôt (docks est connecté). Le gestionnaire résout `ecole:1.0` en son empreinte au déploiement : l'escadre tourne sur un plan approuvé.

### 86. La bataille de l'aube

La flotte noire attaque (le J2 en début d'après-midi dans cette solution, bien avant l'aube du J4) : navire2 sombre. On le sort de l'escadre (`drain`), et ses tâches reprennent ailleurs. Puis une mise à jour arrive sur `ecole_app`, que personne n'a lancée : ecole:1.1, poussée par un automate oublié. On lit son empreinte avant tout : ce n'est pas la nôtre (et c'est la couche-témoin de l'éclaireur qu'elle porte). Retour arrière. `port` relit la flotte : 100 sur 100 (il faut au moins 90).

```
port
docker node ls
docker node update --availability drain navire2
docker service ls
docker service ps --no-trunc ecole_app
docker service inspect --pretty ecole_app
docker service rollback ecole_app
docker service ps ecole_app
port
exit
```

### 87. Le rapport de bataille

Le rapport pour Laurent, dans la boîte du Grand Port : les quais, la flotte (sa puissance après la bataille), l'escadre, le piège (avec son empreinte, au moins ses douze premiers caractères) et ce qui reste à faire.

```
mkdir -p ~/grand-port
cat > ~/grand-port/rapport.txt <<'FIN'
Rapport de bataille du Grand Port, pour Laurent.
Quais : les quatorze quais sont tenus, cinq épreuves de rang passées.
Flotte : puissance <puissance> sur 100 après la bataille.
Escadre : docks et trois navires ; navire2 a sombré, drainé, ses tâches reprises par les autres.
Piège : ecole:1.1 refusée, empreinte <digest-piege>, retour arrière sur ecole:1.0.
Reste : retrouver qui a construit l'image piégée, et relever navire2.
FIN
cd ..
cp ~/grand-port/rapport.txt BoiteDeLaurent
cat ~/CertificatGrandPort
```

La flotte noire vire de bord. Laurent contresigne : « Amiral. Le Grand Port est à toi. » Le CertificatGrandPort, posé dans la Maison, porte la note du chapitre 8 et son code de vérification ; le quiz du chapitre (`quiz 8`) s'ouvre, et `badges port` relit les leçons (une par quai, une par galon, le port, la flotte, le piège, le rapport, l'escadre avant l'aube) et le platine.

### 88. Après la victoire : la signature

La nuit tombe sur la baie illuminée. Sur la Douane, les Labels de l'image de l'éclaireur portent des initiales (P.G.) et une empreinte de clé SSH ; sur docks, le carnet des clés de l'école porte la même, à la ligne d'une machine de chez nous : le Bastion. Tout se constate, rien n'est à réparer : on le consigne dans le rapport (un défi d'honneur). La radio de Grace : « ... Quelqu'un, à Cybersup, construit leurs navires. » À suivre.

```
cd Douane; ssh douane
docker image inspect --format '{{json .Config.Labels}}' eclaireur:prise
exit; ssh docks
ssh-keygen -lf /etc/ssh/ssh_known_hosts
exit; cd ..
echo "Signature : l'empreinte du constructeur est <signature>, celle de la clé du Bastion, dans le carnet des clés de docks." >> ~/grand-port/rapport.txt; cp ~/grand-port/rapport.txt BoiteDeLaurent
```

### 89. Les défis des maîtres, quai par quai

Les 84 défis des quais, dans l'ordre des maîtres (la solution les fait après le rapport, au J2 et au J3 ; la relance du démon à la Vigie a emporté la vigie, le phare et le chenal : on les remonte). Les Premiers Pas : la version du démon seule, le socket, le nombre de caisses, la cale du dessous (`ctr`), la carte d'identité d'une caisse jetable, `ps -q`. La Capitainerie : `logs --tail`, `restart`, `docker port`, une caisse qui finit son quart (`wait`) puis rebaptisée, l'adresse sur le pont par défaut. L'Entrepôt des plans : un plan tiré par son empreinte, les plans sans nom, `history --no-trunc`, la plateforme, `system df -v`, un plan retiré par son identifiant court. Les Soutes : le point de montage, `--mount`, une soute sans nom laissée par un VOLUME d'image, `volume prune`, l'écoutille de root, la sauvegarde rouverte dans une soute neuve. Les Chenaux : `connect` et `disconnect`, `network prune`, un surnom sur le chenal, le pont par défaut où les noms ne passent pas, `network inspect --format`. Le Chantier naval : `build -f`, ENTRYPOINT et CMD (les arguments par défaut remplacés), WORKDIR vu de l'intérieur, `-P`, une instruction inconnue, un ARG sans défaut. Les Cales : `--no-cache`, `--progress=plain`, une cale de 0B, la cale des listes d'apt laissée par un RUN à part, la coque complète contre la coque fine, `builder prune`. Le Chantier des maîtres : `--target`, un navire sans shell. Le Registre du port : la clé rangée en clair dans `~/.docker/config.json`, un pull refusé sans clé, le catalogue et les versions d'un plan. La Feuille de route : `config --services`, `ps --format`, `top`, un secret lu là où il est monté, un convoi d'essai dont l'image vient du fichier `.env`, coulé avec ses soutes. La Vigie : `stats --format`, `update --memory`, une caisse relancée trois fois au plus, `dockerd --validate`, le journal du démon. L'Armurerie : `chown` refusé sans capacités, les verrous d'une caisse, pas de pleins pouvoirs, `--pids-limit`, et sur navire3, `userns-remap` (le root des caisses n'y est plus root du navire). L'Escadre : le jeton redemandé, une étiquette sur un navire, le journal d'un service, les secrets sans leur contenu. La Douane : l'Entrypoint lu sans lancer, les empreintes des plans en quarantaine, la caisse d'autopsie retirée, l'archive rechargée.

```
cd QuaiDesPremiersPas; ssh docks
docker version --format '{{.Server.Version}}'; ls -l /var/run/docker.sock; docker info --format '{{.Containers}}'
sudo ctr -n moby containers ls
docker run --rm alpine:3.20 cat /etc/os-release
docker ps -q
docker run -d --name vigie -p 8080:80 nginx:1.27-alpine@<digest-nginx>
docker logs --tail 3 vigie; docker restart vigie; docker port vigie
docker inspect --format '{{.NetworkSettings.IPAddress}}' vigie
docker run -d --name quart alpine:3.20 sleep 2; docker wait quart; docker rename quart quart-fini
docker pull alpine@sha256:4d1f62d84b1346c5ba1ef21f47ab18dfd2226d8cc33ad3a6d7205148492d6a8a
docker images --filter dangling=true; docker history --no-trunc alpine:3.20
docker image inspect --format '{{.Os}}/{{.Architecture}}' alpine:3.20
docker system df -v
docker rmi 4671
docker volume inspect --format '{{.Mountpoint}}' cales; sudo ls /var/lib/docker/volumes/cales/_data
docker run --rm --mount type=volume,source=cales,target=/cales alpine:3.20 ls /cales
docker volume create cales-neuve; docker run --rm -v cales-neuve:/cales -v ~/sauvegardes:/sauve alpine:3.20 tar xzf /sauve/cales.tgz -C /cales
docker create --name soute-anonyme redis:7-alpine; docker volume ls
docker rm -v soute-anonyme; docker volume prune -f
docker network create quai-essai; docker network connect quai-essai vigie; docker network disconnect quai-essai vigie; docker network prune -f
docker network create chenal; docker run -d --name balise --network chenal --network-alias feu alpine:3.20 sleep infinity
docker run -d --name guetteur --network chenal alpine:3.20 sleep infinity; docker exec guetteur ping -c 1 feu
docker run --rm alpine:3.20 ping -c 1 vigie
docker network inspect --format '{{range .Containers}}{{.Name}} {{end}}' chenal
mkdir -p ~/essais; cd ~/essais
printf 'FROM alpine:3.20\nWORKDIR /quai\nENTRYPOINT ["echo"]\nCMD ["bonjour"]\nEXPOSE 9000\n' > Dockerfile.essai
docker build -f Dockerfile.essai -t essai:1.0 .
docker run --rm essai:1.0 au revoir
docker exec ecole-app-1 pwd
docker run -d -P --name pavillon phare:1.0; docker port pavillon
printf 'FROM alpine:3.20\nCOPIE . .\n' > Dockerfile.faux; docker build -f Dockerfile.faux .
printf 'FROM alpine:3.20\nARG QUAI\nRUN echo $QUAI > /quai.txt\n' > Dockerfile.arg; docker build -f Dockerfile.arg --build-arg QUAI=8 -t quai:8 .
docker build --no-cache -f Dockerfile.essai -t essai:1.1 .
docker build --progress=plain -f Dockerfile.essai -t essai:1.2 .
printf 'FROM debian:12\nRUN apt-get update\nRUN apt-get install -y curl\n' > Dockerfile.apt; docker build -f Dockerfile.apt -t apt-lourd:1.0 .; docker history apt-lourd:1.0
docker pull python:3.12; docker images python
docker builder prune -f
cd ~/phare; docker build --target build -t phare-build:1.0 .
docker run -d --name phare -p 8085:8080 phare:1.0; docker exec phare sh
cat ~/.docker/config.json
cd ~/ecole; docker compose config --services; docker compose ps --format '{{.Service}} {{.State}}'; docker compose top
docker compose exec app cat /run/secrets/db_password
mkdir -p ~/essai-convoi; cd ~/essai-convoi
printf 'QUAI_IMAGE=alpine:3.20\n' > .env; printf 'services:\n  canot:\n    image: ${QUAI_IMAGE}\n    command: sleep infinity\n    volumes:\n      - lest:/lest\nvolumes:\n  lest:\n' > compose.yaml
docker compose config
docker compose up -d; docker compose top; docker compose down -v
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'
docker update --memory 128m vigie
docker run -d --name feu-follet --restart on-failure:3 alpine:3.20 sh -c 'sleep 1; exit 1'
docker ps -a --filter name=feu-follet
sudo dockerd --validate --config-file /etc/docker/daemon.json; sudo journalctl -u docker | tail -3
docker run --rm --cap-drop ALL alpine:3.20 chown nobody /tmp
docker inspect --format '{{.HostConfig.SecurityOpt}}' ecole-app-1; docker inspect --format '{{.HostConfig.Privileged}}' vigie
docker run --rm --pids-limit 100 alpine:3.20 true
docker swarm join-token worker; docker node update --label-add zone=nord navire1; docker service logs ecole_app | tail -3; docker secret ls
exit
ssh navire3
echo '{"userns-remap": "default"}' | sudo tee /etc/docker/daemon.json; sudo systemctl restart docker
docker info | grep -A8 'Security Options'
exit
ssh navire1
docker pull entrepot.port-aube.lan:5000/ecole:1.0
exit
ssh entrepot
curl -s -u douanier:Sel-de-l-Entrepot localhost:5000/v2/_catalog; curl -s -u douanier:Sel-de-l-Entrepot localhost:5000/v2/ecole/tags/list
exit
ssh douane
docker image inspect --format '{{.Config.Entrypoint}}' eclaireur:prise
docker image ls --digests
docker rm autopsie
docker load -i eclaireur.tar
exit
```

Sur navire1, la clé de l'entrepôt a été rendue (`docker logout`) : le pull est refusé (`no basic auth credentials`). `docker rmi 4671` retire hello-world par le début de son identifiant (sa caisse a été balayée à la Capitainerie). Les défis notés pendant le parcours principal (la cale de 0B, `COPY --from`, la santé, le témoin lu, le tag versionné...) sont déjà cochés.

### 90. Les quêtes annexes : l'Ami du Grand Port

Six habitants du Grand Port ont chacun une petite histoire. Ces quêtes annexes sont facultatives et hors note : elles ne comptent ni dans l'XP du chapitre ni dans la note, et donnent un bonus d'XP à part, un souvenir déposé dans `~/Souvenirs`, puis, toutes finies, le badge « Ami du Grand Port ». Elles n'enseignent que des notions jamais vues dans les chapitres 1 à 8 : podman (des conteneurs sans démon et sans root), les espaces de noms à la main (`unshare`, `lsns`, `nsenter`, `ip netns`), skopeo (lire et copier une image de registre à registre sans démon), une image pour deux plateformes (`docker buildx`, `docker manifest`), la relecture d'un Dockerfile avec hadolint, et systemd-nspawn avec machinectl. Une annexe s'ouvre en lisant son habitant ; ses étapes se font dans l'ordre ; `quetes annexes` en donne l'avancée. Anissa et Ronan sont au Grand Port, Edson au Quai des Premiers Pas, Mina au Registre du port, Idrissa au Chantier naval, Neil à la Capitainerie.

Dans le shell ouvert par `unshare` (puis par `systemd-nspawn` et `machinectl shell`), on tape les commandes suivantes, puis `exit`. Le PID de la vigie se lit avec `docker inspect` juste avant `nsenter`.

```
cd ~/Cybersup/Embarcadere/PortAube/GrandPort
cat Anissa; cat Ronan; cat QuaiDesPremiersPas/Edson; cat RegistreDuPort/Mina; cat ChantierNaval/Idrissa; cat Capitainerie/Neil
quetes annexes
ssh chaloupe
podman run -d --name canot alpine:3.20 sleep 3600
podman ps; podman images
ps aux | grep sleep
exit
ssh docks
sudo unshare --pid --fork --mount-proc bash
ps
exit
sudo lsns
docker inspect -f '{{.State.Pid}}' vigie
sudo nsenter -t <pid-conteneur:vigie> -n ip a
sudo ip netns add essai; ip netns list; sudo ip netns exec essai ip a
skopeo inspect docker://continent.lan/library/alpine:3.20
skopeo list-tags docker://continent.lan/library/nginx
skopeo copy --dest-tls-verify=false --dest-creds douanier:Sel-de-l-Entrepot docker://continent.lan/library/busybox:1.36 docker://entrepot.port-aube.lan:5000/busybox:1.36
skopeo list-tags --tls-verify=false --creds douanier:Sel-de-l-Entrepot docker://entrepot.port-aube.lan:5000/busybox
cd ~/ecole; docker buildx ls; docker buildx create --name continents --use
docker buildx build --platform linux/amd64,linux/arm64 -t entrepot.port-aube.lan:5000/ecole:multi --push .
docker manifest inspect --insecure entrepot.port-aube.lan:5000/ecole:multi
cd ~/relecture; hadolint ~/relecture/Dockerfile
printf 'FROM debian:12\nRUN apt-get update && apt-get install -y --no-install-recommends curl=7.88.1-10 && rm -rf /var/lib/apt/lists/*\nCMD ["curl", "-s", "http://phare.port-aube.lan:8080/"]\n' > Dockerfile
hadolint ~/relecture/Dockerfile
exit
ssh cabine
sudo systemd-nspawn -D /var/lib/machines/cabine-ancienne
hostname; cat /etc/os-release
exit
sudo machinectl start cabine-ancienne; machinectl list
sudo machinectl shell cabine-ancienne
exit
sudo machinectl poweroff cabine-ancienne
exit
quetes annexes
```

Les six annexes finies, les habitants viennent saluer l'Amiral sur la jetée, et le badge « Ami du Grand Port » s'ajoute à `badges port`.

## L'épreuve finale : la Forteresse (mission spéciale)

Une partie à part, ouverte avec `examen` et un code d'accès que le formateur donne le jour de l'épreuve. Quarante épreuves sur les trois chapitres, en huit sceaux (dont le Sceau du Grimoire : `man`, `top`, `bash` ; et le Sceau du Réseau : `ip a`, `ip r`, `dig`, `curl`, `iptables`), notées sur 20 (bonus si tout est fini tôt, petit malus au-delà de 30 fausses manœuvres, indices à -0,25), dont le quiz de Steve dans `/dev/random` (chaque bonne réponse compte, même si la copie est rendue avant la troisième question). La note finale compte aussi le parcours : 80 % la note de l'épreuve, 20 % les badges de compétence gagnés dans la partie normale (chapitres 2 et 3, 42 badges platines compris), relevés à l'entrée dans l'épreuve ; `verifier` liste les badges gagnés et ceux qui manquent, avec les notes des chapitres 2 et 3, le temps de jeu et le nombre de commandes de la partie normale (relevés eux aussi à l'entrée), pour juger si les badges sont plausibles. Il termine par des contrôles de vraisemblance : copie rendue après 3 h, horloge du poste reculée pendant l'épreuve, épreuves faites trop vite ou avec trop peu de commandes, badges sans la note de chapitre qui va avec, épreuves cochées que la Forteresse démentait au scellement. Ce sont des signaux à vérifier avec l'étudiant, pas des preuves. La partie est gardée dans le navigateur : l'épreuve se passe sur le poste et le navigateur où l'on a joué, sinon le jeu prévient qu'il ne trouve aucun badge. `kamikaze` rend la copie à tout moment. Dans les quartiers de la recrue, Florimond, le barde de la Taverne du chapitre 1, raconte l'histoire de l'épreuve (`cat Barde`), jamais deux fois de suite de la même façon ; Manon (`/`), Wissam (`/home`), Jean-Baptiste (`/etc`), Gabriel et Cheb Timour (`/opt/atelier`), Laurana (`/var/www`), David (`/tmp`) et Steve (`/dev/random`) parlent aussi avec `cat`.

**Le corrigé de l'épreuve finale n'est pas dans ce dépôt public**, pas plus que le code d'accès ni le mot de passe du formateur : seul le formateur les a.

Pour le formateur :

- changer le code d'accès : `node outils/code_examen.js NOUVEAU-CODE`
- changer le mot de passe du formateur : `node outils/mot_de_passe_formateur.js "MOT DE PASSE"` (12 caractères au moins)
- puis `python3 outils/version_cache.py`, et publier

À la fin, le formateur tape `sceller` sur le poste de l'étudiant. Avant de demander le mot de passe, `sceller` affiche ce qui va être signé (note, temps, heure de début selon le poste, contrôles de vraisemblance) et rejoue chaque épreuve cochée contre l'état réel de la Forteresse : une épreuve cochée à la main dans la console du navigateur s'y voit. Avec le mot de passe (Entrée seule pour renoncer), le code du diplôme porte alors un sceau que personne ne peut fabriquer sans ce mot de passe, même en lisant tout le code du jeu. `verifier CODE` affiche la note, son détail et chaque épreuve ; pour un code scellé, il demande le mot de passe et dit si le sceau est authentique ou faux.
