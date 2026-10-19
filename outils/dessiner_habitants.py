"""Dessine les habitants des quêtes annexes des chapitres 2 à 5, dans le style des personnages du jeu
(dessiner_panne.py, dessiner_machines.py) : gros pixels, tête carrée, yeux carrés, sol en tirets, trois couleurs.

Chaque habitant porte l'objet de son métier : le classeur de la Gestionnaire, le talkie de l'Appariteur...
Sortie : Web/static/img/item_<habitant>.gif.   python3 outils/dessiner_habitants.py [item_x.gif ...]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import N, V, B  # noqa: E402
from dessiner_academie import robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle  # noqa: E402
from dessiner_machines import for_lignes  # noqa: E402
from decor_arcanes import robe_plis, manches, ceinture, perso_fini  # noqa: E402
from dessiner_panne import yeux  # noqa: E402
import math  # noqa: E402


def gilet(r, c=V, fond=B):
    r(35, 33, 52, 54, fond); r(35, 33, 39, 54, c); r(48, 33, 52, 54, c)


def robe_eclairee(r, haut=33, bas=64, x0=35, x1=52, plis=True):
    """La lumière vient de la gauche : un liseré blanc sur le bord gauche d'une robe de mage (robe_mage),
    deux plis noirs dans le bas, un ourlet."""
    for k, y in enumerate(range(haut, bas + 1)):
        e = k // 6
        r(x0 - e, y, x0 - e, y, B)
    if plis:
        r(40, bas - 12, 40, bas, N); r(47, bas - 10, 47, bas, N)
    r(x0 - (bas - haut) // 6, bas, x1 + (bas - haut) // 6, bas, N)


def buste_eclaire(r, x0=35, x1=52, y0=33, y1=54):
    """Le liseré blanc à gauche d'un buste, et l'ombre d'un pli à droite."""
    r(x0, y0, x0, y1, B); r(x1, y0 + 4, x1, y1, N)


def chaussures(r, c=B):
    """Des chaussures à semelle sous des jambes (jambes de dessiner_academie)."""
    r(36, 66, 42, 66, c); r(45, 66, 51, 66, c)


# --- chapitre 2 : le campus ---

def gestionnaire_dessin(r):
    # la gestionnaire du parc : chignon, gilet fluo à bandes réfléchissantes, badge, un classeur sous le bras, un stylo
    r(40, 7, 47, 11, V); r(42, 5, 45, 7, V)
    tete(r, 12, V)
    r(35, 33, 52, 54, V); r(35, 40, 52, 41, B); r(35, 47, 52, 48, B); buste_eclaire(r)
    r(42, 33, 45, 54, N); r(43, 34, 44, 54, B)
    r(47, 35, 50, 38, B); r(48, 36, 49, 37, N)                      # le badge
    bras(r, True, True, 36)
    r(16, 38, 30, 56, B); r(17, 39, 29, 55, N); r(18, 40, 19, 54, V); for_lignes(r, 21, 42, 28, 54, B)
    r(17, 44, 18, 45, B); r(17, 50, 18, 51, B)                       # les anneaux du classeur
    r(58, 40, 59, 50, V); r(58, 50, 59, 51, B); r(58, 39, 59, 39, B)
    jambes(r); chaussures(r); sol_tirets(r, 68)


def appariteur_dessin(r):
    # l'appariteur : cheveux ras, blouse grise boutonnée à poche de poitrine, un talkie-walkie à antenne, un trousseau
    tete(r, 12, B); r(37, 12, 50, 12, N)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 54, N); r(43, 36, 44, 37, V); r(43, 42, 44, 43, V); r(43, 48, 44, 49, V)
    r(37, 36, 41, 39, N); r(38, 37, 40, 37, B)                       # la poche et son stylo
    r(48, 46, 50, 48, V)
    r(40, 54, 40, 64, N); r(47, 52, 47, 64, N)
    bras(r, True, True, 36)
    r(57, 38, 63, 52, V); r(58, 40, 62, 44, N); r(59, 46, 61, 50, N); r(61, 28, 62, 38, V); r(61, 27, 62, 27, B)
    r(57, 38, 57, 52, B); r(59, 41, 59, 41, V)
    pieds_robe(r); sol_tirets(r, 68)


def documentaliste_dessin(r):
    # la documentaliste : lunettes relevées sur la tête, un collier, un carnet hérissé de post-it
    tete(r, 12, V); r(37, 10, 51, 11, N); r(38, 9, 43, 9, B); r(45, 9, 50, 9, B)
    r(36, 13, 37, 24, V); r(50, 13, 51, 24, V)                       # les cheveux mi-longs
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(39, 33, 48, 34, N); r(40, 35, 47, 35, B); r(43, 36, 44, 37, B)  # le col et le collier
    bras(r, True, True, 36)
    r(16, 40, 30, 56, B); r(17, 41, 29, 55, N); for_lignes(r, 19, 43, 27, 54, B)
    for k in range(4): r(30, 41 + k * 4, 33, 42 + k * 4, V if k % 2 else B)
    r(16, 40, 16, 56, V)
    pieds_robe(r); sol_tirets(r, 68)


def coursier_dessin(r):
    # le coursier : casquette retournée, le gros sac de livraison sur le ventre, un casque de vélo à la main, un cuissard
    tete(r, 12, B); r(35, 10, 52, 13, V); r(33, 12, 37, 13, V)
    r(35, 33, 52, 54, V); buste_eclaire(r)
    r(38, 36, 49, 52, N); r(40, 38, 47, 50, B); r(43, 38, 44, 50, N); r(40, 44, 47, 44, N)
    r(36, 33, 37, 40, N); r(50, 33, 51, 40, N)                       # les bretelles du sac
    bras(r, True, True, 36)
    r(56, 46, 68, 52, B); r(57, 47, 67, 49, V); r(58, 50, 60, 52, N); r(64, 50, 66, 52, N); r(60, 45, 64, 46, B)
    jambes(r, B); r(38, 55, 41, 58, V); r(46, 55, 49, 58, V); chaussures(r, V); sol_tirets(r, 68)


def bibliothecaire_dessin(r):
    # la bibliothécaire : un chignon et sa pique, des lunettes, un châle, un tampon dateur, une pile de livres
    r(41, 4, 46, 10, B); r(47, 3, 49, 6, V); tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(35, 33, 52, 38, B); r(37, 38, 50, 39, B); r(40, 40, 47, 40, B); r(43, 41, 44, 42, B)   # le châle
    bras(r, True, True, 36)
    for k in range(4):
        r(15, 54 - k * 4, 29 - (k % 2) * 3, 57 - k * 4, B if k % 2 else V)
        r(15, 57 - k * 4, 29 - (k % 2) * 3, 57 - k * 4, N)
    r(58, 40, 61, 48, B); r(56, 48, 63, 51, V); r(56, 51, 63, 51, N); r(59, 38, 60, 39, V)
    pieds_robe(r); sol_tirets(r, 68)


def tutrice_dessin(r):
    # la tutrice : queue de cheval et son élastique, une écharpe, un cahier ouvert, un crayon
    tete(r, 12, V); r(51, 12, 54, 14, V); r(53, 14, 55, 26, V); r(53, 15, 55, 15, B)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V); r(38, 35, 38, 54, B)
    r(37, 32, 50, 34, V); r(46, 34, 48, 42, V)                       # l'écharpe
    bras(r, True, True, 36)
    r(14, 42, 30, 54, B); r(22, 42, 22, 54, N); for_lignes(r, 16, 44, 20, 53, N); for_lignes(r, 24, 44, 28, 53, N)
    r(14, 54, 30, 55, V)
    r(58, 34, 59, 46, V); r(58, 46, 59, 47, B); r(58, 33, 59, 33, B)
    jambes(r); chaussures(r); sol_tirets(r, 68)


# --- chapitre 3 : la Crypte ---

def enlumineur_dessin(r):
    # l'enlumineur : une tonsure, une bure à capuchon et cordelière, une plume, une page enluminée
    tete(r, 12, B); r(36, 12, 38, 18, V); r(49, 12, 51, 18, V); r(40, 12, 47, 12, V)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r); r(37, 44, 50, 45, N)
    r(36, 31, 51, 34, V); r(36, 31, 51, 31, B)                       # le capuchon rabattu
    r(48, 45, 49, 56, B); r(47, 56, 50, 57, B)                       # la cordelière
    bras(r, True, True, 36)
    r(14, 38, 30, 58, B); r(16, 40, 28, 56, N); r(18, 42, 26, 50, V); r(20, 44, 24, 48, B); r(21, 45, 23, 47, V)
    for k in range(2): r(18, 52 + k * 2, 26, 52 + k * 2, B)
    r(60, 26, 61, 46, B); r(61, 26, 64, 34, V); r(62, 27, 63, 32, B)
    pieds_robe(r); sol_tirets(r, 68)


def fossoyeur_dessin(r):
    # le fossoyeur : un chapeau mou, un tablier de cuir, une pelle
    r(33, 9, 54, 11, V); r(37, 4, 50, 9, V); r(37, 8, 50, 8, N); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 50, 50, 51, V)
    r(38, 38, 49, 60, V); r(38, 38, 49, 38, N); r(39, 33, 40, 38, V); r(47, 33, 48, 38, V)   # le tablier
    r(40, 56, 40, 60, N); r(47, 54, 47, 60, N)
    bras(r, True, True, 36)
    r(62, 8, 63, 54, B); r(59, 54, 66, 64, V); r(60, 56, 65, 62, N); r(60, 6, 65, 8, B); r(62, 30, 63, 30, N)
    r(59, 64, 66, 64, B)
    pieds_robe(r); sol_tirets(r, 68)


def sonneur_dessin(r):
    # le sonneur : bonnet de laine, la corde de la grande cloche qui descend du ciel, une petite cloche à la main
    r(37, 8, 50, 12, V); r(42, 6, 45, 8, B); tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(35, 46, 52, 47, N)
    bras(r, True, True, 36)
    r(20, 0, 21, 44, B); r(20, 6, 21, 6, N); r(20, 14, 21, 14, N); r(20, 22, 21, 22, N); r(18, 44, 23, 47, V); r(18, 47, 23, 47, B)
    r(58, 42, 66, 44, V); r(57, 44, 67, 52, V); r(59, 46, 65, 50, N); r(61, 52, 63, 54, B); r(57, 44, 57, 52, B)
    r(69, 44, 70, 44, B); r(70, 48, 71, 48, B); r(69, 52, 70, 52, B)    # la cloche qui tinte
    pieds_robe(r); sol_tirets(r, 68)


def sacristain_dessin(r):
    # le sacristain : une barbe, une chasuble à galon, un sablier, un cierge allumé
    tete(r, 12, V, barbe=True)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, N); r(43, 33, 44, 64, V)
    r(35, 40, 52, 40, N)
    bras(r, True, True, 36)
    r(15, 40, 29, 42, V); r(15, 56, 29, 58, V); r(17, 42, 27, 48, B); r(21, 48, 23, 50, B); r(17, 50, 27, 56, B); r(19, 52, 25, 55, V)
    r(20, 44, 24, 46, V); r(22, 47, 22, 51, V)
    r(59, 34, 62, 50, B); r(62, 34, 62, 50, V); r(60, 30, 61, 33, V); r(60, 28, 61, 29, B)
    pieds_robe(r); sol_tirets(r, 68)


def passeur_dessin(r):
    # le passeur : une cape de pluie à capuche, une lanterne allumée, une clé
    r(33, 8, 54, 34, V); r(31, 12, 56, 30, V); r(31, 12, 31, 30, B); r(33, 8, 36, 8, B); tete(r, 13, V)
    r(53, 14, 54, 30, N)
    robe_mage(r, 33, 64, V, 34, 53); robe_eclairee(r, x0=34)
    r(43, 33, 44, 64, N)
    bras(r, True, True, 36)
    r(14, 36, 26, 38, B); r(15, 38, 25, 52, B); r(17, 40, 23, 50, N); r(19, 42, 21, 48, V); r(19, 32, 21, 36, B)
    r(20, 44, 20, 46, B); r(14, 52, 26, 53, B)
    cle(r, 58, 44, B)
    pieds_robe(r); sol_tirets(r, 68)


def serrurier_dessin(r):
    # le serrurier : trapu, des lunettes de protection sur le front, un tablier à poche, une lime et un cadenas
    tete(r, 12, B); r(37, 13, 50, 15, V); r(39, 13, 42, 15, N); r(45, 13, 48, 15, N)
    r(33, 33, 54, 54, B); r(36, 35, 51, 56, V); r(36, 35, 36, 56, B); r(33, 33, 33, 54, B)
    r(40, 44, 47, 49, N); r(41, 45, 46, 45, V)
    bras(r, True, True, 36)
    r(60, 30, 61, 50, B); for_lignes(r, 59, 31, 62, 48, N); r(59, 50, 62, 54, V)
    r(16, 44, 28, 56, B); r(18, 46, 26, 54, N); r(20, 38, 24, 44, B); r(21, 39, 23, 44, N); r(21, 48, 23, 51, V)
    r(16, 44, 16, 56, V)
    jambes(r); chaussures(r); sol_tirets(r, 68)


# --- chapitre 4 : l'Académie ---
# Les habitants des chapitres 4 et 5 sont dessinés au pixel près (dessiner_academie.pixels), dans le caractère
# des personnages d'origine du chapitre 1 : silhouettes variées, visages caricaturaux, objet de métier lisible.
from dessiner_academie import pixels  # noqa: E402

def copiste_dessin(r):
    # le Copiste, moine tonsuré et rondouillard, les manches tachées d'encre : il a le nez collé dans le vieux grimoire
    # qu'il n'arrive plus à lire, la plume et l'encrier à côté
    pixels(r, 34, 33, """
        .......#######
        .....###########
        ....oo#########oo
        ...ooo#########ooo
        ...oo###########oo
        ...o##::::###::::#o
        ...###:#::###:#:###
        ...#################
        ....######:#######
        ....#####::#######
        """)
    pixels(r, 28, 41, """
        ..#####################
        ..#:::::::::#::::::::::#
        ..#:o:o:oo::#:oo:o:o:::#
        ..#:::::::::#::::::::::#
        ..#:oo:o:o::#:o:oo:::::#
        ..#:::::::::#::::::::::#
        ..#:o:oo::::#:oo:o:o:::#
        ..#:::::::::#::::::::::#
        ..#:oo:o:o::#:o:oo:o:::#
        ..#:::::::::#::::::::::#
        ..######################
        .#oo#.................#oo#
        .#ooo#...............#ooo#
        """)
    pixels(r, 24, 53, """
        .......ooooooooooooooooooooo
        .....oooooooooooooooooooooooooo
        ....oooooo#oooooooooooooo#oooooo
        ...ooooooo#oooooooooooooo#ooooooo
        ...ooooooo#oooooooooooooo#ooooooo
        ..oooooooo##oooooooooooo##oooooooo
        ..ooooooooo#oooooooooooo#ooooooooo
        ..oooooooooo############oooooooooo
        ..ooooooooooo#:#:##:#:#ooooooooooo
        ..oooooooooooooooo#ooooooooooooooo
        ..ooooooooooooooooo#oooooooooooooo
        ...ooooooooooooooo#.oooooooooooooo
        ...oooooooooooooo#..ooooooooooooo
        ....oooooooooooooo#.ooooooooooooo
        ....ooooooooooooooo#oooooooooooo
        .....ooooooooooooooooooooooooooo
        ......oooooooooooooooooooooooo
        .......#####.......######
        ......######.......#######
        """)
    pixels(r, 55, 55, """
        o
        .o
        ..o
        """)
    pixels(r, 24, 71, """
        .....#######.###################.######
        .
        ........##########......############
        .
        .....................######
        """)
    pixels(r, 58, 59, """
        ...#
        ..##
        .###
        .###
        #####
        #ooo#
        #ooo#
        #####
        """)


def secretaire_dessin(r):
    # la Secrétaire, débordée : un tampon dans chaque main, les bras en l'air, la mèche qui s'échappe du chignon,
    # une pile de formulaires à trous à côté d'elle
    pixels(r, 23, 24, """
        ..##.........................o.....##
        .#::#.....###............o.........#::#
        .####....#:::#.....................####
        .#oo#....#:o:#..........o..........#oo#
        .####....#:::#.....................####
        ..##......###.......................##
        ..##........................#####...##
        ..##.......................#:::::#..##
        ..##.......................#:o:o:#..##
        .####......................#:::::#.####
        .####.......................#####..####
        """)
    pixels(r, 38, 30, """
        .........oooo..o
        .......oooooooo.o
        .....ooooooooooo
        ....ooo#########o
        ....oo##########oo
        ...ooo###:::##:::oo
        ...oo#o###o#o###o#o
        ...oo#o#:#o#o#:#o#o
        ...oo#o###o#o###o#o
        ...ooo###########oo
        ...ooo######::###oo
        ....oo###########o
        ....oo####:::::##o
        .....o###:###:###
        ......#########
        ........#####
        """)
    pixels(r, 24, 35, """
        #
        ##
        ###
        .###
        ..###
        ...###
        ....###
        .....###
        ......#####
        """)
    pixels(r, 59, 35, """
        ....#
        ...##
        ..###
        .###
        ###
        """)
    pixels(r, 33, 45, """
        .........#########
        .......####:###:####
        ......###:#######:###
        .....###:#########:####
        ....####:#########:#####
        ....###.:#########:.####
        ...####.:##:###:##:..###
        ........:#########:
        ........:##:###:##:
        .......:###########:
        .......:############:
        ......:#############:
        ......:##############:
        .....:################:
        .....##################
        ........ooo......ooo
        ........ooo......ooo
        ........ooo......ooo
        ........ooo.......ooo
        ........ooo........ooo
        .......#####........####
        ......######.......#####
        """)
    pixels(r, 23, 54, """
        ..#############
        ..#:::::::::::#
        ..#:ooooooo:::#
        ..#:::::::::::#
        ...#############
        ...#:::::::::::#
        ...#:oooooo::::#
        ...#:::::::::::#
        ..#############
        ..#:::::::::::#
        ..#:ooooo:::::#
        ..#:::::::::::#
        ..#############
        ..#:::::::::::#
        ..#:oooooooo::#
        ..#:::::::::::#
        ..#############
        """)
    pixels(r, 23, 71, """
        ........#######.###################.######
        .
        ...........#########......##########
        .
        .......................######
        """)


def tresorier_dessin(r):
    # le Trésorier, petit et rond, lunettes au bout du nez : il soupèse sa balance d'un œil inquiet, entre deux piles
    # de pièces
    pixels(r, 34, 38, """
        ......########
        ....############
        ...######oo######
        ..#:###oo#oo###:#
        ..oo##########oooo
        ..o#############oo
        ..###::::##::::###
        ..###:o::##:o:####
        ..##::::#####::::#
        ..#######::#######
        ..######::::######
        ..######::::######
        ..##############.#
        ...###:::::::###
        ....###########
        ......######
        """)
    pixels(r, 30, 54, """
        .........######
        .....##############
        ...#####oooooooo#####
        ..####ooooooooooooo####
        .####oooooooooooooooo####
        .###:ooooooo:oooooooo:###
        ###.:oooooooooooooooo:.###
        ##..oooooooo:ooooooooo..##
        ##..ooooooooooooooooooo.##
        .#..oooooooo:ooooooooo..#
        ....#####################
        .....ooooooooooooooooooo
        .....oooooooooooooooooo
        ......oooooooooooooooo
        ........oooooooooooo
        .........###....###
        ........####....####
        """)
    pixels(r, 20, 40, """
        ...........#
        ..........###
        ...........#
        ...........#
        ###########################
        #.........................#
        .#.......................#
        ..#.....................#
        #####.................#####
        #ooo#.................#ooo#
        .###...................###
        """)
    pixels(r, 54, 57, """
        .....##
        ....##
        ...##
        ..##
        """)
    pixels(r, 24, 51, """
        .........##
        .........##
        .........##
        ........###
        .......####
        """)
    pixels(r, 20, 61, """
        .......###.....................................###
        ......#ooo#..................................#ooo#
        ......#####..................................#####
        ......#ooo#..................................#ooo#
        ......#####...................................####
        ......#ooo#..................................#ooo#
        ......#####..................................#####
        """)
    pixels(r, 20, 71, """
        ....#######.####################.#######
        .
        ........##########......##########
        .
        .....................######
        """)


def apprentie_dessin(r):
    # l'Apprentie, perdue dans une robe trop grande, le chapeau pointu qui lui tombe sur les yeux : sa baguette ne
    # fait que des étincelles, son script gribouillé à la main
    pixels(r, 26, 29, """
        .......................o
        .....................oo
        ...................ooo
        ..................oooo
        .................ooooo
        ................oooooo
        ...............ooo#ooo
        ..............ooooooooo
        .............ooooo#oooo
        ............ooooooooooooo
        ...........ooooooooooo#ooo
        ..........oooo#ooooooooooooo
        .........oooooooooooooooooooo
        .......ooooooooooooooooooooooooo
        .....oooooooooooooooooooooooooooooo
        ....##########################
        ..........######::######
        ..........#####::::#####
        ...........############
        ............###:::::##
        .............########
        """)
    pixels(r, 30, 50, """
        ...........#######
        .........###########
        ........####o####o###
        .......####oo####oo###
        ......####ooo####ooo###
        .....####oooo####oooo###
        ....####ooooo####ooooo###
        ...#####ooooo####ooooo####
        ..######oooooo##oooooo#####
        .######oooooo####oooooo#####
        .#####ooooooo#####ooooooo####
        ######oooooooo###oooooooo#####
        .####oooooooo#####ooooooo####
        ..###ooooooo######oooooooo###
        ..###oooooooo####ooooooooo###
        .####ooooooo#####oooooooo####
        .####oooooooo###oooooooo#####
        #####oooooooo####ooooooo######
        ##########################
        """)
    pixels(r, 56, 49, """
        ....o.....o
        ......o.o
        ....o..#..o
        .....o.#.o
        .......#
        .......#
        .......#
        ......##
        .....##
        ....###
        """)
    pixels(r, 22, 61, """
        #############
        #:::::::::::#
        #:o:oo:o::::#
        #::o:o:oo:o:#
        #:o:::::o:o:#
        #:::o:oo::::#
        #############
        .......#
        ......##
        .....###
        """)
    pixels(r, 22, 71, """
        ..........#######.###################.######
        .
        ..............#########......##########
        .
        .........................######
        """)


def messagere_dessin(r):
    # la Messagère, le regard au loin : le tube à messages sous le bras, son pigeon voyageur tout près de l'épaule
    pixels(r, 38, 32, """
        ......oooooo
        ....oooooooooo
        ...oooooooooooo
        ..oooo########oo
        ..ooo##########o
        ..oo####::#####o
        ..oo###:o:#####o
        ..oo####::####o
        ..ooo#########
        ..oooo######:#
        ..oooo#####::#
        ..ooooo#######
        ...oooo######
        ....oooo#####
        ....ooo...##
        """)
    pixels(r, 53, 40, """
        .......###
        ......##:##o
        ......#####
        .....#####
        .##########
        ############
        .##o#o#o###
        ....#..#
        """)
    pixels(r, 30, 47, """
        ..........#####
        ........#########
        .......###ooooo###
        ......###ooooooooo##
        .....###oooooooooo##
        .....###oooooo:oooo#####
        .....##oooooooo:oooo#####
        ....###ooooooooo:ooo::##
        ....##oooooooooooo:o::##
        ....##oooooooooooooo:::#
        ...###ooooooooooooooo##
        ...##ooooooooooooooooo
        ..###ooooooooooooooooo
        ..##oooooooooooooooooo
        .###ooooooooooooooooooo
        .##ooooooooooooooooooooo
        ###oooooooooooooooooooooo
        .......ooo.......ooo
        .......ooo.......ooo
        .......ooo.......ooo
        .......ooo.......ooo
        ......####.......####
        .....#####.......#####
        """)
    pixels(r, 24, 54, """
        ...#############
        ...#:::::::::::#
        ###:::::o:::::::###
        #:#:::::::::::::#:#
        ###:::::o:::::::###
        ...#:::::::::::#
        ...#############
        """)
    pixels(r, 24, 71, """
        ........#######.##################.######
        .
        ............#########......#########
        .
        .........................######
        """)


def surveillante_dessin(r):
    # la Surveillante, grande et sévère, chignon serré, sourcils froncés derrière ses lunettes : elle serre contre elle
    # le registre fermé à clé, le trousseau pendu à la ceinture
    pixels(r, 30, 26, """
        ......######
        .....########
        ......######
        ....############
        ...##############
        ..ooo##########ooo
        ..o#::::####::::#o
        ..o##:##o##o##:###o
        ..o###oooo##oooo##o
        ..o##o#:#o#o#:#o##o
        ..o###oooo##oooo##o
        ..o######:#######o
        ..o#####::#######o
        ..o######:#######o
        ...o####::::::##o
        ....#############
        ....###########
        ........###
        """)
    pixels(r, 22, 44, """
        ............######
        ........##############
        ......#####oooooooo#####
        .....####oooooooooooo####
        ....####oooooooooooooo####
        ....###:oooooooooooooo:###
        ...###.:oooooooooooooo:.###
        ...###.:oooooooooooooo:.###
        ...###.:oooooooooooooo:..###
        .....##################..###
        ......#oo#oo#oo#oo#oo#..#
        .......ooooooooooooooo
        .......ooooooooooooooo
        ......oooooooooooooooo
        ......ooooooooooooooooo
        .....oooooooooooooooooo
        .....ooooooooooooooooooo
        ....oooooooooooooooooooo
        ....ooooooooooooooooooooo
        ...oooooooooooooooooooooo
        ...ooooooooooooooooooooooo
        ..oooooooooooooooooooooooo
        ..ooooooooooooooooooooooooo
        .oooooooooooooooooooooooooo
        .oooooooooooooooooooooooooo
        oooooooooooooooooooooooooooo
        .....#####........#####
        """)
    pixels(r, 25, 52, """
        ..##############
        ..#:::::::#::::#
        ..#:o:oo::#:o::#
        ..#:::::::#::::#
        ..#:::####:::::#
        ..#:::#oo#:::::#
        ..#:::#oo#:::::#
        ..#:::####:::::#
        ..##############
        """)
    pixels(r, 24, 61, """
        .....o#o#o
        ....o#.#.#o
        ....o#####o
        .....o#.#o
        ......o#o
        .......#
        ......###
        .....#.#.#
        .....#.#.#
        """)
    pixels(r, 16, 71, """
        ......#######.#####################.#######
        .
        ..........##########......############
        .
        .......................#######
        """)


# --- chapitre 5 : le Bastion ---

def colporteur_dessin(r):
    # le Colporteur, couvert de poussière, plié sous une énorme besace de lettres : il avance à grands pas, appuyé
    # sur son bâton, la poussière vole derrière lui
    pixels(r, 16, 42, """
        ..........##########
        ........##::########
        .......##:#:#:#:#:####
        ......##:#:::#:::#:#####
        .....##:##########::#####
        .....#:#:#:::::::##:#####
        ....##:##::####:::##:#####
        ....#:#:#::#::#:::#:#:####
        ....#:#:#::####:::#:#:####
        ....#:#:#:::::::::##:#####
        ....##:#:#:::::::##:#####
        .....##:#########:######
        ......###:#:#:#:#######
        .......##############
        """)
    pixels(r, 40, 39, """
        .......oo
        .....oooooooo
        ...oooooooooooo
        oooooooooooooooooooo
        .....###########
        ....##::###::####
        ....###:####:####
        ....#######:#####
        .....#####::::####
        .....######::#####
        ......##::::::##
        .......########
        """)
    pixels(r, 30, 52, """
        ........ooo##
        ......oooooo#####
        ....ooooooooo#:####
        ...oooooooooo#:#####
        ..oooooooooo:###:###
        ..ooooooooo:oo###:###
        ..oooooooo:ooooo##:###
        ..ooooooo:oooooo.#####
        ...ooooo:oooooooo.####
        ....ooo:oooooooooo.###
        .....o:ooooooooooooo##
        ......ooooooo.oooooo
        ......ooooooo..ooooo
        .....ooooooo....ooooo
        ....ooooooo......oooo
        ....oooooo........oooo
        ...######..........#####
        ..#######..........######
        """)
    pixels(r, 50, 57, """
        ###
        .####
        ...####
        ......#####
        .........####
        """)
    pixels(r, 64, 44, """
        ...#
        ...#
        ...#
        ...#
        ..##
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        ..#
        .###
        """)
    pixels(r, 20, 65, """
        o.o.......o...o
        .o.o.o..o...o..o
        o.......o.o
        """)
    pixels(r, 16, 71, """
        ....#######.####################.#########
        .
        ........##########......############
        .
        .....................#######
        """)


def sergent_dessin(r):
    # le Sergent, le torse bombé et la moustache en balai sous son morion : la liste des mots de passe d'une main, le
    # clairon de l'autre
    pixels(r, 22, 32, """
        .......ooooo
        .......oo#oo
        .......ooooo
        ........###
        ..##############
        .####################
        #######################
        .......#########
        .......###::::##
        .......##:#:##:#
        .......#########
        ......#####::####
        .....######:#####
        .......#######:###
        ....oooooo:ooooooo
        ..oooooo#####ooooooo
        .ooo..o#######o..oooo
        oo.....#:::::#.....ooo
        .......#######
        """)
    pixels(r, 16, 50, """
        ...............########
        ...........################
        .........#####oooooooo#######
        .......#####oooooooooooo#####
        ......####:ooooooooooooooo:####
        .....####::oooo:ooooo:oooo::####
        .....###..:ooooooooooooooo:..###
        ....####..:oooo:ooooo:oooo:...###
        ....###...:ooooooooooooooo:....##
        ....###....:oooooooooooooo:.....##
        ....###....:oooooooooooooo:.....###
        ....###.....##############......###
        ....###.....#oooo####oooo#......###
        ...#####.....oooooooooooo......#####
        ...#####.....ooooo..ooooo......#####
        .............ooooo..ooooo
        .............ooooo..ooooo
        .............ooooo..ooooo
        .............ooooo..ooooo
        ............######..######
        ...........#######..#######
        """)
    pixels(r, 49, 59, """
        ..........#
        .........##
        .###....#o#
        #:::####oo#
        .###....#o#
        .........##
        ..........#
        """)
    pixels(r, 16, 67, """
        ...#############
        ...#:::::::::::#
        ...#:o:oo:ooo::#
        ...#:::::::::::#
        ...#:oo:o:oo:::#
        ...#:::::::::::#
        ...#:ooo:oo:o::#
        ...#:::::::::::#
        ...#############
        """)
    pixels(r, 16, 71, """
        .....#######.##################.########
        .
        .........##########......##########
        .
        .....................#######
        """)


def sentinelle_dessin(r):
    # la Sentinelle, en cotte de mailles, les yeux cernés grands ouverts : elle fixe son registre sans ciller,
    # la lance plantée à côté d'elle
    pixels(r, 61, 19, """
        ....#
        ...###
        ..#####
        ...###
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ...###
        """)
    pixels(r, 37, 23, """
        .....#######
        ....#########
        ...###########
        ..#############
        ..#:#:#:#:#:#:#
        ..o###########o
        ..o##########ooo
        .oo#:::###:::#ooo
        .oo##.:##..:##ooo
        .oo##..##...##ooo
        .ooo#::###:::#ooo
        .oo#o:o###o:o#oooo
        .oo####:######ooo
        .ooo###:######oooo
        .oooo##::#####ooooo
        .oooo#########oooooo
        .ooooo#:###:##ooooooo
        ..oooo#######ooooooo
        ...oooo#####ooooooo
        ....ooo......oooo
        """)
    pixels(r, 33, 42, """
        .......#############
        .....##:#:#:#:#:#:###
        ....##:#:#:#:#:#:#:###
        ...###:#:#:#:#:#:#:#:###
        ...##:#:#:#:#:#:#:#:#:##
        ..###:#:#:#:#:#:#:#:#:###
        ..##:#:#:#:#:#:#:#:#:#.##
        .###:#:#:#:#:#:#:#:#:#.###
        .##.:#:#:#:#:#:#:#:#:#..##
        .##.:#:#:#:#:#:#:#:#:#..##
        .##.##################..##
        .##.ooooooooooooooooo...##
        .##.ooooooooooooooooo
        ....ooooooooooooooooo
        ....ooooooooooooooooo
        ....oooooooo.oooooooo
        .....oooooo...oooooo
        .....oooooo...oooooo
        .....oooooo...oooooo
        .....oooooo...oooooo
        .....oooooo...oooooo
        ....#######...#######
        ...########...########
        """)
    pixels(r, 21, 51, """
        ###############
        #:::::::::::::#
        #:oo:o:ooo:o::#
        #:::::::::::::#
        #:o:ooo:o:oo::#
        #:::::::::::::#
        #:ooo:o:o:ooo:#
        #:::::::::::::#
        ###############
        """)
    pixels(r, 21, 71, """
        ......#######.#####################.#######
        .
        ..........##########......############
        .
        .......................#######
        """)


def greffier_dessin(r):
    # le Greffier, vieil homme tout voûté, une plume d'oie derrière l'oreille : il recopie au pupitre tout ce que root
    # a vu, dans le registre du roi
    pixels(r, 27, 37, """
        .........#######..........o
        .......###########.......oo
        ......#############.....ooo
        ...#.##############....ooo
        ..#.##::::###::::###..ooo#
        ...###############.##ooo#
        ....###:######:####:#oo#
        ....##############:######
        ....##############::::###
        .....###::::::#########
        ......##:##:##:##:##
        .......##:##:##:##
        ........###:###
        .........##.#
        """)
    pixels(r, 21, 50, """
        ...........oooooooooo
        ........oooooooooooooooo
        ......ooooooooooooooooooo
        .....oooooooooooooooooooooo
        ....oooooooooooo:ooooooooooo####
        ...oooooooooooo:oooooooooo#######
        ..ooooooooooooo:ooooooooo####
        ..oooooooooooo:oooooooooo###
        ..oooooooooooo:oooooooooooo
        .ooooooooooooo:ooooooooooooo
        .oooooooooooo:oooooooooooooo
        .oooooooooooo:ooooooooooooooo
        .oooooooooooo:ooooooooooooooo
        ..ooooooooooo:oooooooooooooooo
        ..oooooooooooo:ooooooooooooooo
        ...ooooooooooo:oooooooooooooooo
        ....ooooooooooo:ooooooooooooooo
        .....oooooooooooooooooooooooooo
        .......#####.........######
        ......######.........#######
        """)
    pixels(r, 41, 55, """
        ....#
        ...###
        ..###
        .###
        ###
        """)
    pixels(r, 45, 51, """
        .....................#
        .....................#
        .....###################
        ....#:::::::::::::::::#
        ...#:o:oo:o:ooo:oo::#
        ..#:o:o:ooo:oo:o:::#
        .#:::::::::::::::::#
        ###################
        .#:::::::::::::::#
        ..#ooo:oo:o:oo:#
        ...#:::::::::::#
        ....###########
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        .....#
        ....###
        ...#####
        """)
    pixels(r, 15, 69, """
        .....#######.####################.#######
        .
        .........##########......###########
        .
        ......................#######
        """)


def cantiniere_dessin(r):
    # la Cantinière, forte et souriante, tablier taché de sauce et recette serrée sur le cœur : elle touille de sa
    # louche la marmite qui fume
    pixels(r, 24, 34, """
        .........oooooooo
        .......oooooooooooo
        ......ooo#########o
        .....oo############o
        .....o##::::###::::#
        .....o###:##o##:##o#
        .....o###########o#
        .....o#####:::#####
        .....oo####:::#####
        .....ooo###########
        ......oo##::::::###
        .......##:######:#
        ........##::::::#
        .........#######
        """)
    pixels(r, 16, 48, """
        .................#####
        ...........##################
        .........#######oooooooo#######
        ........######oooooooooooo######
        .......#####oooooooooooooooo#####
        ......#####oooooooooooooooooo#####
        .....#####ooooo:ooooo:oooooooo#####
        .....####:ooooooooooooooooooooo:####
        .....####:ooooooooooooooooooooo:#####
        ......###:ooooo#######oooooooo:.####
        .........:ooooo#:::::#oooooooo:
        .........:ooooo#:o:o:#oooooooo:
        ........:oooooo#:::::#ooooooooo:
        ........:oooooo#######ooooooooo:
        ........:oooooooooo#ooooooooooo:
        .......:oooooo##oooooooooooooooo:
        .......:ooooooooooooo##ooooooooo:
        .......:ooooooooooooooooooooooooo:
        ......:ooooooooooooooooooooooooooo:
        ......:ooooooooooooooooooooooooooo:
        ......#############################
        ............######......######
        ...........#######......#######
        """)
    pixels(r, 47, 55, """
        ....#
        ....##
        .....##
        ......##
        .......##
        ........#
        ........#
        ........#
        .......###
        ......#ooo#
        .......###
        """)
    pixels(r, 60, 61, """
        .....o...o
        ...o...o...o
        .....o...o
        """)
    pixels(r, 57, 65, """
        .##################
        ###################
        #oooooooooooooooo#
        #ooo###oooooooooo#
        #oooooooooooooooo#
        .#oooooooooooooo#
        ..##############
        """)
    pixels(r, 10, 71, """
        ......#######.#####################.#######
        .
        ..........##########......############
        .
        .......................#######
        """)


def heraut_dessin(r):
    # le Héraut de l'Inspection, plumet au chapeau et tabard en damier : il sonne de la trompette, d'où pend la
    # bannière de l'Inspection
    pixels(r, 34, 32, """
        .......o
        ......oo.o
        .....oooo
        ....ooooo
        ..ooooooooo
        .###########
        .oooooooooooo
        """)
    pixels(r, 34, 38, """
        ....###########
        ...#############
        ...#############
        ...###:::###::##
        ...####:#####:####
        ...###########::::######
        ...#########:####:#######
        ...########:::##::######
        ...#############::####
        ....###########:::##
        .....#######
        """)
    pixels(r, 50, 41, """
        ............##
        .......########
        ...#############
        #############:##
        .......#####:###
        ...........##.#
        ..........#.#.#
        .........#o#o#o#
        .........#o#o#o#
        .........#o#o#o#
        .........#o#o#o#
        ..........#o#o#
        ...........#o#
        """)
    pixels(r, 28, 49, """
        ..........########
        ........###oooo##o####
        ......#####o##o##o#####
        .....####:o##o##o##o:#####
        ....####::##o##o##o#:####
        ....###..:o##o##o##o:..#####
        ....###..:##o##o##o#:...#####
        ....###..:o##o##o##o:....####
        ....###..:##o##o##o#:
        ....###..:o##o##o##o:
        ....###..:##o##o##o#:
        .........:##########:
        .........oooooooooooo
        .........ooooo..ooooo
        .........ooooo..ooooo
        .........ooooo..ooooo
        .........ooooo..ooooo
        .........ooooo..ooooo
        ........######..######
        .......#######..#######
        """)
    pixels(r, 20, 71, """
        ....#######.####################.#########
        .
        ........##########......############
        .
        .....................#######
        """)


PORTRAITS = {
    "item_gestionnaire.gif": gestionnaire_dessin, "item_appariteur.gif": appariteur_dessin,
    "item_documentaliste.gif": documentaliste_dessin, "item_coursier.gif": coursier_dessin,
    "item_bibliothecaire.gif": bibliothecaire_dessin, "item_tutrice.gif": tutrice_dessin,
    "item_enlumineur.gif": enlumineur_dessin, "item_fossoyeur.gif": fossoyeur_dessin,
    "item_sonneur.gif": sonneur_dessin, "item_sacristain.gif": sacristain_dessin,
    "item_passeur.gif": passeur_dessin, "item_serrurier.gif": serrurier_dessin,
    "item_copiste.gif": copiste_dessin, "item_secretaire.gif": secretaire_dessin,
    "item_tresorier.gif": tresorier_dessin, "item_apprentie.gif": apprentie_dessin,
    "item_messagere.gif": messagere_dessin, "item_surveillante.gif": surveillante_dessin,
    "item_colporteur.gif": colporteur_dessin, "item_sergent.gif": sergent_dessin,
    "item_sentinelle.gif": sentinelle_dessin, "item_greffier.gif": greffier_dessin,
    "item_cantiniere.gif": cantiniere_dessin, "item_heraut.gif": heraut_dessin,
}

# Les portraits qui passent par la finition du chapitre 8 (decor_arcanes.perso_fini). Les habitants des
# chapitres 4 et 5, dessinés au pixel près, n'en ont plus besoin : ils passent par dessiner_panne.perso.
FINIS = set()

if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    n = 0
    for nom in noms:
        if nom in PORTRAITS:
            (perso_fini if nom in FINIS else perso)(nom, PORTRAITS[nom]); n += 1
    print(n, "portraits")
