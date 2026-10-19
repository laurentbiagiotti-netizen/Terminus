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

def copiste_dessin(r):
    # le copiste : lunettes, robe verte aux manches tachées d'encre, un grimoire ouvert, un encrier et sa plume
    tete(r, 12, B, lunettes=True); r(37, 10, 50, 12, V)
    robe_plis(r, 33, 64, V, 35, 52)
    manches(r, V, 34, True, True, B, 10)
    r(29, 42, 31, 43, N); r(56, 40, 57, 42, N)                               # les taches d'encre
    r(12, 40, 31, 55, B); r(13, 41, 21, 54, N); r(23, 41, 30, 54, N); r(22, 40, 22, 55, V)   # le grimoire
    for y in range(43, 53, 3): r(14, y, 20, y, B); r(24, y, 29 - (y % 2), y, V)
    r(12, 55, 31, 56, V)
    r(59, 50, 66, 57, B); r(60, 52, 65, 56, N); r(60, 51, 65, 51, V)          # l'encrier
    r(64, 36, 65, 50, B); r(65, 34, 67, 40, V)                                # la plume
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def secretaire_dessin(r):
    # la secrétaire : chignon, chemisier à col vert, un tampon dans chaque main, une pile de formulaires
    r(39, 5, 48, 10, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(40, 33, 47, 38, V); r(43, 38, 44, 54, N)
    for y in (42, 47, 52): r(42, y, 42, y, V)
    bras(r, True, True, 36)
    for x in (23, 59):                                                       # les deux tampons
        r(x + 2, 40, x + 3, 44, B); r(x + 1, 38, x + 4, 40, V); r(x, 45, x + 5, 48, V); r(x, 48, x + 5, 49, B)
    for k in range(4):                                                       # la pile de formulaires
        r(12 + k % 2, 60 - k * 3, 28 + k % 2, 62 - k * 3, B); r(14 + k % 2, 61 - k * 3, 24, 61 - k * 3, N)
    r(16, 48, 24, 49, V)
    jambes(r); sol_tirets(r, 68)


def tresorier_dessin(r):
    # le trésorier : rond, lunettes au bout du nez, gilet à boutons ; une balance à plateaux, une pile de pièces
    tete(r, 12, B, lunettes=True); r(37, 10, 50, 12, V)
    r(32, 33, 55, 55, V); r(36, 35, 51, 53, B); r(43, 35, 44, 53, N)
    for y in (39, 44, 49): r(41, y, 41, y, V); r(46, y, 46, y, V)
    r(37, 46, 41, 46, V); r(40, 46, 40, 49, V)                                # la chaîne de montre
    bras(r, True, True, 36)
    r(63, 30, 64, 56, B); r(60, 56, 67, 58, B); r(62, 28, 65, 30, V)          # la balance
    r(54, 32, 73, 33, B)
    r(54, 34, 54, 38, B); r(73, 34, 73, 36, B)
    r(50, 39, 58, 41, V); r(51, 41, 57, 42, B); r(69, 37, 77, 39, V); r(70, 39, 76, 40, B)
    for k in range(5):                                                       # la pile de pièces
        r(15 + (k % 2), 60 - k * 3, 27 + (k % 2), 62 - k * 3, B if k % 2 else V)
        r(15 + (k % 2), 62 - k * 3, 27 + (k % 2), 62 - k * 3, N)
    jambes(r); sol_tirets(r, 68)


def apprentie_dessin(r):
    # l'apprentie : un chapeau pointu bien trop grand qui lui tombe sur les yeux, une robe blanche,
    # une baguette à étoile qui crépite
    for k in range(13): r(43 - k * 2 // 3, 0 + k, 44 + k * 2 // 3, 0 + k, V)
    r(47, 2, 49, 4, V); r(49, 4, 50, 5, V)
    r(28, 13, 59, 15, V); r(30, 15, 57, 15, B)
    r(37, 16, 50, 31, B); yeux(r, 38, 45, 18); r(37, 16, 50, 17, V)
    r(43, 24, 44, 25, N); r(42, 28, 45, 28, N)
    robe_plis(r, 34, 64, B, 34, 53, N)
    r(34, 34, 53, 36, V)
    manches(r, B, 35, True, True, B, 10)
    r(60, 22, 61, 46, B)                                                     # la baguette et son étoile
    r(60, 16, 61, 21, V); r(57, 18, 64, 19, V); r(58, 17, 63, 20, V); r(60, 17, 61, 20, B)
    for (x, y) in ((55, 13), (66, 14), (66, 23), (55, 24)): r(x, y, x, y, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def messagere_dessin(r):
    # la messagère : un bandeau, une cape de voyage, un pigeon voyageur perché sur l'épaule, un tube à message
    tete(r, 12, V); r(37, 14, 50, 15, B)
    robe_plis(r, 33, 64, V, 35, 52)
    r(35, 40, 52, 41, B); r(41, 39, 46, 42, N); r(42, 40, 45, 41, V)
    manches(r, V, 34, True, True, B, 10)
    r(53, 24, 62, 31, B); r(52, 26, 53, 30, B); r(60, 21, 64, 25, B)          # le pigeon
    r(62, 22, 62, 22, N); r(64, 23, 66, 24, V); r(54, 27, 59, 29, V); r(55, 32, 55, 33, V); r(58, 32, 58, 33, V)
    r(12, 43, 30, 49, B); r(14, 44, 28, 48, N); r(15, 45, 27, 47, B)          # le tube à message et ses bouchons
    r(10, 42, 12, 50, V); r(30, 42, 32, 50, V); r(20, 45, 22, 47, V)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def surveillante_dessin(r):
    # la surveillante : cheveux tirés, robe sévère à ceinture, un trousseau de clés, un registre épais à fermoir
    r(37, 8, 50, 12, B); r(41, 5, 46, 8, B); tete(r, 12, B); r(37, 11, 50, 11, N); r(40, 8, 47, 8, N)
    robe_plis(r, 33, 64, V, 35, 52)
    r(35, 46, 52, 47, B)
    manches(r, V, 34, True, True, B, 10)
    cle(r, 43, 48, B); cle(r, 48, 49, V)
    r(12, 37, 31, 59, B); r(13, 38, 30, 58, V); r(14, 39, 29, 57, N)           # le registre et son fermoir
    r(15, 40, 28, 56, V); r(15, 47, 28, 49, N); r(28, 46, 32, 50, B); r(29, 47, 30, 49, N)
    r(16, 41, 17, 55, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


# --- chapitre 5 : le Bastion ---

def colporteur_dessin(r):
    # le colporteur : chapeau cabossé, barbe, poussiéreux, une besace de lettres en bandoulière, un bâton de marche
    r(33, 9, 54, 11, B); r(37, 4, 50, 9, B); r(37, 7, 50, 8, V); tete(r, 12, B, barbe=True)
    r(35, 37, 52, 56, V); r(36, 24, 51, 36, B); r(40, 25, 47, 25, N)
    for k in range(9): r(36 + k * 2, 36 + k * 3, 38 + k * 2, 37 + k * 3, B)   # la bandoulière
    bras(r, True, True, 37)
    r(48, 52, 66, 64, B); r(49, 53, 65, 63, N); r(49, 53, 65, 55, B)          # la besace et ses lettres
    r(52, 48, 58, 53, B); r(53, 49, 57, 52, N); r(54, 50, 56, 50, V)
    r(59, 49, 64, 53, V); r(60, 50, 63, 50, N)
    r(26, 20, 27, 67, V); r(25, 18, 28, 20, B)                                # le bâton
    jambes(r); sol_tirets(r, 68)


def sergent_dessin(r):
    # le sergent : casque à nasal, galons sur la manche, tunique ceinturée ; un clairon levé
    r(36, 6, 51, 13, V); r(37, 6, 50, 7, B); r(43, 13, 44, 20, V); r(35, 12, 52, 13, B); tete(r, 13, V)
    r(35, 34, 52, 54, B); r(35, 34, 52, 36, V); r(42, 37, 45, 54, V)
    ceinture(r, 46, 35, 52, N, V)
    bras(r, True, True, 37)
    r(30, 40, 31, 41, V); r(30, 43, 31, 44, V)                                # les galons
    r(56, 40, 66, 41, V); r(57, 42, 59, 43, V); r(61, 42, 63, 43, V)          # le clairon et son pavillon
    for k in range(7): r(65 + k, 40 - k, 65 + k, 41 + k, V)
    r(72, 33, 72, 48, B)
    r(56, 39, 57, 42, B)
    jambes(r); sol_tirets(r, 68)


def sentinelle_dessin(r):
    # la sentinelle : un camail, une cotte de mailles, une longue lance, les yeux cernés d'avoir veillé
    r(35, 9, 52, 32, V); r(37, 12, 50, 30, N); tete(r, 12, B)
    r(38, 21, 43, 21, V); r(45, 21, 50, 21, V)
    r(35, 33, 52, 54, V)
    for y in range(35, 54, 2):
        for x in range(36 + (y // 2) % 2, 52, 2): r(x, y, x, y, N)
    ceinture(r, 47, 35, 52, B, V)
    bras(r, True, True, 36)
    r(62, 4, 63, 66, B); r(63, 4, 63, 66, V)                                  # la lance et son fanion
    r(61, 0, 64, 4, B); r(62, 0, 63, 0, V)
    r(64, 6, 71, 9, V); r(64, 10, 68, 11, V)
    jambes(r); sol_tirets(r, 68)


def greffier_dessin(r):
    # le greffier : lunettes, une plume derrière l'oreille, robe noire à rabat ; un long registre déroulé
    tete(r, 12, V, lunettes=True); r(51, 5, 52, 18, B); r(52, 4, 54, 9, V)
    robe_plis(r, 33, 64, N, 35, 52, V)
    for k, y in enumerate(range(33, 65)):
        e = k // 6
        r(35 - e, y, 35 - e, y, B); r(52 + e, y, 52 + e, y, B)
    r(41, 33, 46, 40, B); r(43, 40, 44, 40, B)                                # le rabat
    manches(r, N, 34, True, True, B, 10)
    r(31, 34, 31, 43, B); r(56, 34, 56, 43, B)
    r(12, 34, 29, 37, V); r(14, 37, 27, 63, B); r(12, 63, 29, 66, V)           # le registre déroulé
    for y in range(40, 61, 3): r(16, y, 25 - (y % 2) * 2, y, N)
    r(16, 49, 22, 49, V)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def cantiniere_dessin(r):
    # la cantinière : un foulard, un grand tablier taché, une louche levée, une marmite fumante
    r(36, 8, 51, 12, V); r(51, 10, 54, 14, V); tete(r, 12, B)
    r(33, 33, 54, 56, V); r(36, 35, 51, 59, B); r(36, 35, 51, 36, N)
    r(40, 44, 41, 45, V); r(46, 50, 48, 51, V); r(43, 54, 44, 55, V)
    bras(r, True, True, 36)
    r(60, 26, 61, 46, B); r(57, 22, 64, 26, B); r(58, 23, 63, 25, V)          # la louche
    r(12, 48, 32, 61, B); r(13, 52, 31, 60, N); r(13, 49, 31, 51, V)           # la marmite
    r(10, 50, 12, 53, B); r(32, 50, 34, 53, B); r(14, 61, 30, 62, V)
    for (x, y) in ((16, 44), (21, 40), (26, 44), (18, 36)): r(x, y, x + 1, y, B)
    jambes(r); sol_tirets(r, 68)


def heraut_dessin(r):
    # le héraut : un chapeau à plume, un tabard frappé d'un sceau ; une trompette ornée d'une bannière
    r(36, 7, 51, 12, V); r(48, 2, 50, 7, B); r(49, 1, 52, 3, B); tete(r, 12, V)
    r(35, 33, 52, 56, B); r(38, 35, 49, 56, V); r(38, 55, 49, 56, B)
    r(41, 40, 46, 47, B); r(42, 41, 45, 46, N); r(43, 42, 44, 45, V)
    bras(r, True, True, 36)
    r(56, 38, 70, 39, V); r(70, 33, 75, 44, V); r(72, 35, 75, 42, N); r(73, 37, 75, 40, B)   # la trompette
    r(59, 40, 68, 50, B); r(60, 41, 67, 49, N); r(62, 43, 65, 47, V)          # sa bannière
    for x in (59, 63, 67): r(x, 51, x + 1, 52, B)
    jambes(r); sol_tirets(r, 68)


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

# Les habitants des chapitres 4 et 5, redessinés avec la finition du chapitre 8 (decor_arcanes.perso_fini).
FINIS = {"item_copiste.gif", "item_secretaire.gif", "item_tresorier.gif", "item_apprentie.gif", "item_messagere.gif",
         "item_surveillante.gif", "item_colporteur.gif", "item_sergent.gif", "item_sentinelle.gif", "item_greffier.gif",
         "item_cantiniere.gif", "item_heraut.gif"}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    n = 0
    for nom in noms:
        if nom in PORTRAITS:
            (perso_fini if nom in FINIS else perso)(nom, PORTRAITS[nom]); n += 1
    print(n, "portraits")
