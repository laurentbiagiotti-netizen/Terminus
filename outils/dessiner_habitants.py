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
from dessiner_panne import pixels, sol_traits  # noqa: E402
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
    # la gestionnaire du parc : un chignon, un crayon sur l'oreille, le gilet fluo à bandes ; elle coche son classeur,
    # le bout de la langue sorti, tant elle s'applique
    pixels(r, 20, 16, r"""
................####
...............######
..............########
...............######.....o
..............##########.o
............##############
...........################
..........#####ooooooooo####
..........###oooooooooooooo##
.........###ooooooooooooooooo
.........##oooo####oooo####ooo
.........##oooooooooooooooooooo
........###ooo::oooooooo::ooooo
........###ooo::oooooooo::oooooo
.......o##oooooooooooooooooo:ooo
......o:o#oooooooooooooooooo:ooooo
.......o##oooooooooooooooo:::ooooo
.........#ooooooooooooooooooooooo
..........ooooooo::::::::oooooo
...........oooooooo##oooooooo
............oooooooooooooo
...............oooooooo
..........#####.oooooo.######
........##########....##########
.......#ooo########..#####ooo#####
......##ooo########oo#####ooo######
......###########.#oo#.###########.##
.....############.#oo#.############.##
.....#oooooooooo##.#oo#.##oooooooooo.##
.....#oooooooooo##.#oo#.##oooooooooo..##
....##oooooooooo##.#oo#.##oooooooooo..###
....###########.##..::..##############.###
....###########.###....###############..###..o
...####.....###.###....####...............##o.
...###......###.###....####.....ooooooooo#o..
...###......###.###....####.....o::ooo::o#o..
..oooo......###########.####....o::::::::#...
..ooooo.....##oooooooooo#####...ooooooooooo..
..ooo:o::::::#oooooooooo######..o:o:o:oo#oo..
...o::::::::##oooooooooo#####...ooooooo#oooo.
.....:......##############..o...o:o:oo#oooo..
...........####.#######.###.....oooooooooo...
...........####.######..###.....o:o:o:o:oo...
............###.####....##......ooooooooo....
............###.####......o.....o:o:oo:oo....
............####.###............ooooooooo....
.............###.###.........................
.............###.###
.............###.###
.............###.####
...........ooooo.oooooo
..........oooooo.ooooooo
..........::::::.:::::::
""")
    sol_traits(r, 68)


def appariteur_dessin(r):
    # l'appariteur : carré d'épaules, cheveux en brosse, menton en galoche, blouse grise ; il parle fort dans son
    # talkie-walkie, l'autre poing sur la hanche, le trousseau qui pend
    pixels(r, 16, 16, r"""
......................................o
...................#.#.#.#.#.........o.o
..................#############.....o...o
.................###############.......
................####ooooooooooooo....ooo
................##oooooooooooooooo...o:o
................#ooooo###ooooo##oo..o:o
................#oooooooo##oooo##..o:o
...............ooooo:::oooooo::oo..o:o
...............ooooo:o:oooooo:o:oo.ooooo
..............o:oooo:::oooooo::oooooooooo
..............o::ooooooooo:ooooooooooooooo
...............o:oooooooooo:oooooo#o:o:oo
................ooooooooo:::ooooo#oo:o:oo
................oooooooooooooooo#ooooooo
................ooooooo:::::::::o#ooooooo
.................oooooo:#####::oo#oo:::oo
.................oooooo:::::::oo##oooooo
.................ooooooooooooooo##oooooo
..................oooooooooooooo##..
.........##########oooooooooo###.##
.......########################.###
......oooooooooooooooooooooooooo.###
.....ooooooooooooooooooooooooooo.###
....oooooooo::ooooooo:oooooooooo.###
...ooooooooo::ooooooo:ooooo::ooo.##
...oooooooooooooooooooooooooooooo.
...oooo.ooooooooooooo:oooooooooooo
..oooo..oooooooooooooooooooooooooo
..oooo..ooooo::::oooo:ooooooooooooo
..oooo..ooooo:oo:oooooooooooooooooo.
..oooo..ooooo::::oooo:oooooooooooooo
...oooo.ooooooooooooooooooooooooooooo
....oooooooooooooooo:oooooooooooo.ooo
.....ooo::oooooooooooooooooooooo.ooooo
......oo:ooooooooo#o#o#o#oooooo.oo:oo
.......o.oooooooooooooooooooooo.o::oo
.......o.oooooooooooooooooooooo..ooo
......ooo.oooooooooo:oooooooooo
.....o:o:o.ooooooooo:oooooooooo
.....oo.oo.ooooooooo:oooooooooo
......oo.o.ooooooooo:ooooooooo
...........#########.#########
...........#########.#########
...........########...########
...........########...########
...........########...########
...........########...########
...........########...########
...........########...########
.........ooooooooo.....ooooooooo
........oooooooooo.....oooooooooo
........::::::::::.....::::::::::
""")
    sol_traits(r, 68)


def documentaliste_dessin(r):
    # la documentaliste : de longs cheveux, les lunettes relevées sur la tête, un collier de perles ; ravie, elle brandit
    # son carnet hérissé de post-it
    pixels(r, 16, 21, r"""
.....................................ooooooo
...............#######..............o#o#o#ooo
............#############..........oooooooooo
..........#################........#ooooooooo#
.........###################.......#oooooooo#o
........#####################....oo#ooooooooo#o
........##.ooooo###ooooo.####....oo#oooooooo#o
.......###o:::::o#o:::::o.###....oo#ooooooooo#
.......####ooooo###ooooo.####.....#oooooooo#oo
.......####.#.#.#.#.#.#.#.###.....#ooooooooo#
.......##oooo###ooooo###oooo##....##########o
.......##ooooooooooooooooooo##...#..oooo.oo
.......##ooo::oooooooo::oooo##...#..oooo
.......##ooo::oooooooo::oooo##...#..oooo
.......##ooooooooo:oooooooooo##..##.oooo
.......##oooooooo::ooooooooo##...##.oooo
.......###ooooooooooooooooo###...###oooo
.......###oooo:::::::::oooo###...###ooo
.......####oooo:ooooo:oooo####...###oo
.......####ooooo:::::ooooo####...###oo
.......####:ooooooooooooo:####...##.oo
.......####::ooooooooooo::####...#.##
........###:::oooooooo::::###....##.##
...............oooooo............#.###
...........######oooo#######.....#.###
.........####o#o#o#o#o#o######....###
........######o#o#o#o#o#######...###
......##########################.##
......###.######################.#
.....###..#####################.
.....###..#####################
.....###..####################
.....###..####################
.....oooo.####################
......ooo.####################
..........#####################
..........######################
.........########################
.........#########################
........##########################
........######:#######:#######:####
.......#######:#######:#######:#####
.......######:#######:#######:######
......#######:#######:#######:######
......######:#######:#######:#######
.............ooooo.......ooooo
............oooooo.......oooooo
............::::::.......::::::
""")
    sol_traits(r, 68)


def coursier_dessin(r):
    # le coursier : lancé au pas de course, penché en avant, la casquette à l'envers, le gros sac de livraison sur
    # le dos, le casque de vélo au bout du bras, le cuissard ; des traits de vitesse derrière lui
    pixels(r, 8, 30, r"""
...............ooooooooooooooooo
...............o:::::::::::::::o
...............o:ooooooooooooo:o
...............o:o:o:o:o:o:o:o:o.......#########
...............o:ooooooooooooo:o.....############
...............o:o:o:o:o:o:o:o:o.....#################
...............o:ooooooooooooo:o.....####ooooooo
...............o:::::::::::::::o....##oooooooooooooo
...............o:ooooooooooooo:o...o#ooooo###oooo####
...............o:ooooooooooooo:o...o#oooooooooooooooo
...............o:::::::::::::::o...oooooooo::ooooo::oo
...............ooooooooooooooooo..oooooooo:oooooo:ooo
...................#############..ooooooooooooooooooooo
.................################.ooooooooooooooo:ooooo
................####################ooooooooooo::::oo
..oooooooooo.....######################ooooooooooooo
................###############.######ooo::::::::ooo
.oooooooooooooo.###########.##.#####.##oooooooooooo
................##########.##.#####..#####oooooo
...oooooooooo....##########.#######...######...ooooo
.................##########.#######....#####..o#####o
.................#################.......#####o#ooo#oo
..................###################.......o#o#o#o#
..................#######################...o#######o
...................#######################...ooooooo
....................#######.###########
.....................######...##########
.....................#####......#########
....................######........#######
...................######...........######
..................######..............######
.................######.................######
................######....................#####
...............######.....................#####
..............######.......................####
............oooooooo......................#####
..........oooooooooo......................ooooooo
..........::::::::::.....................ooooooooo
.........................................:::::::::
""")
    sol_traits(r, 68)


def bibliothecaire_dessin(r):
    # la bibliothécaire : petite et ronde, un chignon piqué d'une épingle, des lunettes qui dépassent tout juste d'une
    # pile de livres bien trop haute ; le tampon dateur posé sur le dessus
    pixels(r, 20, 23, r"""
.................ooo
................o:::o
.................ooo.o
...............###o###
..............#########
.............###########
...........###ooooooooo###
..........##ooooooooooooo##
.........##oo###ooooo###oo##
.........#oooooooooooooooooo#
.........#o##o##ooooo##o##oo#
........o#o#::#ooooo#::#ooo#o
.........#o####ooooo####ooo#
...........ooooooooooooooooooooo
...........o:::::::::::::::::::o
...........ooooooooooooooooooooo
.........#######################
.........#o#o################o#o#
.........#######################
.......ooooooooooooooooooooooooo
.......o:::::::::::::::::::::::o
.......ooooooooooooooooooooooooo
.........##########################
.........##o#o##################o#o#
.........##########################
......oooooooooooooooooooooooooo
......o::::::::::::::::::::::::o
......oooooooooooooooooooooooooo
....#############################
....#o#o###################o#o###
..ooo########################ooo#
.ooooooooooooooooooooooooooooooooo
.oo:::::::::::::::::::::::::::::oo
..oooooooooooooooooooooooooooooooo
.......########################
........######################
........###o#o#o#o#o#o#o#o####
........######################
.........####################
.........####################
.........####################
.........###################
..........##################
..........ooooo......ooooo
.........oooooo......oooooo
.........::::::......::::::
""")
    sol_traits(r, 68)


def tutrice_dessin(r):
    # la tutrice : une queue de cheval qui balance, une écharpe ; elle lève son crayon comme pour dire « écoute bien »,
    # son cahier ouvert dans l'autre main
    pixels(r, 18, 17, r"""
.............................................o
............................................o#o
............................................o#o
.............#.#.#.#.......................o#o
...........###########.....................o#o
..........#############..................ooooo
.........###oooooooo####................oo##oo
.........##oooooooooooo##o.........oooooooooo
........##ooooooooooooooo:o#.......ooooooo
........#oooo###ooo###ooo:o###.....oooooo
........#oooooooooooooooo:oo####....ooooo
........#ooo::ooooo::ooooo.ooo####...####
.......o#ooo::ooooo::oooooo..o#####..####
.......o:ooooooooooooooooooo....#####.####
........ooooooooooo::ooooooo.....######.###
........ooooooooooooooooooo.......######.##
.........oooooo:::::::oooo.........####..#
.........ooooooo:ooooo:ooo........#######
..........oooooo:::::::oo........######
...........ooooooooooooo.........#####
............###########......#######
.........#####################.#####
.......########################.###
......#oo###oo#######oo###oo####.#
.....######.##.#######.#######.##
.....######.##.#######.##########
.....#####..##.#######.#########
.....#####..##.#######.########
....#####...###.#####.#########
....#####...###.##.##.#########
...#####....###.##.##.#########
...#####....###########.#######
..oooooo...################
.oooooooooooooooo#########
ooo:ooooooooo:oooo########
oo:oooo:ooooo:oooooo######
oooo:oooooooo:oooooo######
ooooo:ooo:ooo:oo:ooo######
.oooooooooooo:ooooo.######
..........ooooooooo########
............##############
............####.#########
............####.#########
............####..########
............####..########
............####...#######
............####...#######
...........####.....######
...........####.....######
..........ooooo.....ooooooo
..........oooooo....oooooooo
..........::::::....::::::::
""")
    sol_traits(r, 68)


# --- chapitre 3 : la Crypte ---

def enlumineur_dessin(r):
    # l'enlumineur : un moine tout rond et content, la tonsure, la bure et sa cordelière ; il tient une plume plus
    # grande que lui et montre sa page enluminée
    pixels(r, 14, 8, r"""
.......................................o
......................................o#o
.....................................o##o
....................................o#:#o
...................................o##:#o
..................................o#:##o
..................................o##:#o
.................................o#:##o
.................................o##:o
................................o#:#o
..............ooooooo...........o##o
............ooooooooooo.........o#o
...........ooooooooooooo........oo
..........##ooooooooooo##......oo
.........###ooooooooooo###.....o
.........##ooooooooooooo##....oo
.........#ooo###ooo###oooo#...o
.........oooooooooooooooooo..oo
........ooo::oooooooo::ooooo.o
........oo:oo:oooooo:oo:oooooo
........ooooooooooooooooooooooo
.........oooooooo:ooooooooooo
.........ooooooooo::oooooooo
.........ooo:::::::::::oooo
..........ooo:ooooooo:oooo
...........ooo:::::::oooo
.........##################
.......####################o
.....#########################
....#######..###########..#####
...#######....#########....######
...######.....#########....######
..#######.....#########.....#####
oooooooooooooooo#######......####
o::::::::::::::o#######......####
o:##########:::o########.....####
o:#oo##oo##o:::o########....oooo
o:#o#o#o#o#::::o#########...oooo
o:##o#o#o##o:::o#########....##
o:#o#o#o#o#::::o#########....##
o:##########:::o######oooooo.##
o::::::::::::::o####oo#######
o:::::::::oooooo###ooo#######
o:::::::::oooooo##oo#.#######
o::::::::::::::o###o#.#######
o::::::::::::::o###o#.########
oooooooooooooooo###oo.#########
.........##########oo.#########
.........##########.o.##########
........###########.oo##########
........###########..o##########
.......###########...o###########
.......###########..ooo##########
......###########...ooo###########
......###########..........#######
.....############.##########.######
.....###########.##############.####
....###########.##################.##
....oooooooo#######......ooooooooo#
...ooooooooo.................ooooooooo
...:::::::::.................:::::::::
""")
    sol_traits(r, 68)


def fossoyeur_dessin(r):
    # le fossoyeur : long et voûté, un chapeau mou, une barbe de trois jours, l'air las ; il s'appuie des deux mains
    # sur sa pelle, le menton posé dessus
    pixels(r, 18, 14, r"""
...............########...................
.............############.................
............###.##########................
...........#######.########...............
..........##########.#######..............
........#######################...........
.......#############################......
..........ooooooooooooooooooooo...........
..........oo###oooooooooo####oo...........
..........ooooo###oooo####ooooo...........
.........oooooooooooooooooooooo...........
.........ooooo:::oooooo:::ooooo...........
.........oooo::ooooooooo::oooooo..........
.........oooooooooooooooooooooo:o.........
.........oooooooooooooo:oooooooo:o........
.........oooooooooooooo:oooooooooo........
..........ooo#o#o#oo::::oo#o#o#oo.........
..........oo#o#o#o#ooooo#o#o#o#oo.........
..........ooo#o#o#::::::#o#o#o#o..........
...........oo#o#o#o#o#o#o#o#ooo...........
............oo#o#o#o#o#o#oooo....oooo.....
.............ooooooooooooooooo..oo##oo....
.............#####oooooo#######.o####o....
...........##########oo##########oooo#....
.........#############oo###########oooooo.
........#####o########oo###############oo.
.......######oo#######oo#########.###ooo..
.......#####.oo#######oo#######...ooooo...
......######..o#######oo######.....o#o....
......######..o#######oo######.....o#o....
......######..o#######oo######.....o#o....
.....######...o#######oo######.....o#o....
.....######...o###############.....o#o....
.....oooooo...o###############.....o#o....
.....ooooooo..o###############.....o#o....
..............o###############.....o#o....
..............o###############.....o#o....
..............o###############.....o#o....
..............o###############.....o#o....
..............oooooooooooooooo.....o#o....
...............######.######.......o#o....
...............######.######.......o#o....
...............######.######.......o#o....
...............######.######.......o#o....
...............######.######.......o#o....
...............######.######.....ooooooo..
...............######.######.....o#####o..
...............######.######.....o#####o..
...............######.######.....o#####o..
...............######.######.....o#####o..
...............######.######.....o#####o..
..............#######.#######.....o###o...
............oooooooo...oooooooo....ooo....
...........ooooooooo...ooooooooo....o.....
...........:::::::::...:::::::::..........
""")
    sol_traits(r, 68)


def sonneur_dessin(r):
    # le sonneur : bonnet de laine, il se pend de tout son poids à la corde de la grande cloche, qui descend du ciel ;
    # la bouche grande ouverte (DONG !), une petite cloche à la ceinture
    pixels(r, 12, 17, r"""
..............................#.#..............
..............................#.#..............
....o..o......................#.#.........o..o.
...o..o.......................#.#........o..o..
..o..o........................#.#.......o..o...
..............................#.#..............
..............................#.#..............
..............................#.#..............
............................ooooooo............
............................o:o:o:o............
............................ooooooo............
...........................###.#.#.............
..........................###..#.#.............
.........................###...#.#.............
........................###..ooooooo...........
.......................###...o:o:o:o...........
......................###....ooooooo###........
.....................###.......#.#...###.......
....................###.....#.#.#.#....###.....
...................###....###########...###....
..................###....#############...###...
..................###...##.#.#.#.#.#.##...###..
..................###...ooooooooooooooo...###..
.................###...oo###ooooooo###oo...###.
.................###...ooooooooooooooooo...###.
.................###...ooo::ooooooo::ooo...###.
.................###...ooooooooooooooooo...###.
.................###...oooooooo::oooooooo..###.
.................###...ooo:::::::::::ooo...###.
.................###...ooo::ooooooo::ooo...###.
.................####..ooo:::::::::::ooo..####.
.................#####..ooooooooooooooo..#####.
..................######..ooooooooooo..######..
...................############################
....................##########################.
.....................######################....
.....................####.###########.####.....
.....................####.###########.####.....
.....................####.#.#.#.#.#.#.####.....
.....................oooooooooo#oooooooooo.....
.....................#####.####o#####.####.....
.....................#####.###ooo####.####.....
.....................####.####ooo####..###.....
......................####...ooooo...####......
.....................####.....o:o.....####.....
....................####...............####....
...................####.................####...
..................####...................####..
.................####.....................####.
................######....................######
...............oooooooo..................oooooooo
...............::::::::..................::::::::
""")
    r(42, 0, 42, 16, V); r(44, 0, 44, 16, V)                       # la corde, qui descend du clocher
    sol_traits(r, 68)


def sacristain_dessin(r):
    # le sacristain : chauve, des sourcils en broussaille, une barbe blanche jusqu'au ventre, la chasuble à galon ; il
    # lève son sablier d'une main et tient un cierge allumé de l'autre
    pixels(r, 16, 14, r"""
.....................................ooooooooo
.....................................o:::::::o
......................................o:ooo:o.
.......................................o:o:o..
........................................o:o...
........................................o:o...
.......................................o:o:o..
......................................o:###:o.
.....................................o:#####:o
.....................................ooooooooo
..............ooooooooo.................oo....
............ooooooooooooo...............oo....
...........ooooooooooooooo..............oo....
..........ooooooooooooooooo.............oo....
.........####oooooooooo####.............oo....
.........#######ooooo#######...........####...
.........oooooooooooooooooooo..........####...
.........ooo::ooooooooo::ooooo.........####...
.........ooo::ooooooooo::ooooo........#####...
..........ooooooooo:oooooooooo.......######...
..........ooooooooo::ooooooooo......######....
...........ooooooo::::::oooooo.....######.....
...........oooooooooooooooooooo...######......
..........oooooooooooooooooooooo.#####........
.........oooooo::::::::::oooooooo####.........
.........oooooooooooooooooooooooo###..........
.........ooo:oooooo:ooooooo:ooooo###..........
........######oooooooooooooooo######..........
.......########oooo:oooooo:ooo######..........
......#########ooooooooooooooo######..........
.....##########oo:ooooo:oooooo#####...........
....######.####ooooooooooooooo####............
....#####..#####ooooo:ooooooo#####............
...#####...#####ooooooooooooo#####............
...#####...######oooooooooo#######............
..#####....##########oooo##########...........
..o#o#.....#############o#o#########..........
..#o##.....#########oooooooo########..........
.:o##o:....########ooooooooooo######..........
.:#oo#:....########ooooooooooo#######.........
.:oooo:....########ooooooooooo#######.........
.:oooo:...#########ooooooooooo########........
.:oooo:...#########ooooooooooo########........
oooooooo..#########ooooooooooo#########.......
oooooooo..##########oooooooooo#########.......
.oooooo...##########ooooooooooo#########......
..::::....##########ooooooooooo#########......
..........##########ooooooooooo##########.....
..........##########ooooooooooo##########.....
..........##########ooooooooooo###########....
..........##########ooooooooooo###########....
..........##########ooooooooooo############...
.......:::::::ooooo:::::::::::::ooooo:::::....
.............oooooo.............oooooo........
.............::::::.............::::::........
""")
    sol_traits(r, 68)


def passeur_dessin(r):
    # le passeur : grand et maigre sous sa cape de pluie à capuche, on ne voit que son long nez et deux yeux qui
    # brillent ; il tend sa lanterne allumée, une clé pend à son cou au bout d'une ficelle
    pixels(r, 12, 16, r"""
.....................####
...................#######
..................##########
.................#############
................################
...............###################
..............#####################
.............######::::::::::#######
.............#####:::::::::::::######
............#####:::::::::::::::######
............####::::::::::::::::::#####
............####::::oo:::::oo::::::####
............####:::oooo:::oooo::::::###
............####::::oo:::::oo:::::::###
............####::::::::oo:::::::::####
............####:::::::::oo::::::::####
............####:::::::::ooo::::::#####
............#####:::::::::oooo:::#####
............######::::::::oooooo#####
.............######:::::::oo..oo####
..............#######:::::::::######
...............######o######.########
..............#######o###############
.............#######.o.###############...........oooo
............########.o.################.........o::::o
...........#########..o.###############.#......o:oooo:o
..........##########.ooo.###############.###...o:o##o:o
.........###########.o:o.################.#######oooooo
.........###########.ooo.#################.######ooooooo
........#############.o.###################..###o#o#o#o#o
........#######################################..o#o#oo#o
.......################.#######################..o#####o#o
.......################.#####################.....o#o#o#o
......################..####################.......o#o#o
......################..###################.........ooooo
.....################...##################...........ooo
.....################...####.#############
....#################...####.##############
....################....####.###############
....################....####.###############
...#################....####..###############
...################.....####..###############
...################.....####..################
..#################.....####...###############
..################......####...################
..################......####...################
.#################......####....################
.#################......####....################
.#################......####....################
.ooooooooooooooooooooo..####....ooooooooooooooooo
.......................ooooooo.........................
......................oooooooo.........................
......................::::::::.........................
""")
    sol_traits(r, 68)


def serrurier_dessin(r):
    # le serrurier : trapu, large d'épaules, les lunettes de protection relevées sur le front, un grand sourire ; il
    # lime un cadenas énorme, son tablier plein d'outils
    pixels(r, 14, 24, r"""
...............###########
.............###############
............#################
...........###################
...........#oooooo###oooooo###
..........##o::::o###o::::o####
..........##o::::o###o::::o####
..........###oooooo#oooooo#####
..........ooooooooooooooooooooo
.........oooo####ooooo####oooooo
.........ooooooooooooooooooooooo
........oooo::oooooooooo::ooooooo
........oooo::oooooooooo::ooooooo
........o:oooooooooo:oooooooooo:o
........o:ooooooooooo:ooooooooo:o
.........oooooooooo::::oooooooooo
.........ooo::::::::::::::::oooo
.........ooo:o:o:o:o:o:o:o:::ooo
..........ooo::::::::::::::oooo
...........ooo#o#o#o#o#o#oooo
............ooooooooooooooo
....###########ooooooooo#############
..#######################################
.##########################################.......ooooooo
.######..####oooooooooooooooooo####..######.....oo:::::oo
#######..####oooooooooooooooooo####..#######....o:o...o:o
######...####oo:oo:oo:oo:oo:ooo####...######....o:o...o:o
######...####oooooooooooooooooo####...######...ooooooooooo
######...####ooooooooooooooooooo###...#######..o#########o
######...####ooo::::::::::::ooo####....####oooooo##ooo####o
######...####ooo:oo#o#oo#oo:ooo####....####ooooo##o:o###o
oooooo...####ooo:oo#o#oo#oo:ooo####.....###oooooo##ooo###o
oooooo...####ooo:oo#o#oo#oo:ooo####.....###.o#####o#####o
oooooo...####ooo::::::::::::ooo####.........o##########o
.oooo....####oooooooooooooooooo####..........ooooooooooo
.........####oooooooooooooooooo####
.........######################
.........##########..##########
.........#########....#########
.........#########....#########
.........#########....#########
.........#########....#########
.......oooooooooo......oooooooooo
......ooooooooooo......ooooooooooo
......:::::::::::......:::::::::::
""")
    sol_traits(r, 68)


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
