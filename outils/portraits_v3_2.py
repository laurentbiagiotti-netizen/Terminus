"""Portraits v3 du lot 2 : les quatorze habitants des quêtes annexes (chapitres 2 à 5), redessinés sur la grille
fine de 2 px (portrait_v3), au niveau de l'essai validé (le coursier de dessiner_habitants.py est le modèle).

Chaque fonction garde le personnage, le rôle et l'objet de métier de l'ancienne fonction <nom>_dessin de
dessiner_habitants.py, et le met mieux en scène.

    python3 outils/portraits_v3_2.py                 (régénère les quatorze GIF du lot)
    python3 outils/portraits_v3_2.py item_heraut.gif (un seul)
"""
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import N, V, B, finir  # noqa: E402
from portrait_v3 import Toile, texte  # noqa: E402


# ------------------------------------------------------------------ petites aides communes

def poing(t, x0, y0, x1, y1, doigts=3, sens=1):
    """Un poing fermé : ellipse blanche à liseré, des traits de doigts."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    h = (y1 - y0) / (doigts + 1)
    for k in range(1, doigts + 1):
        y = round(y0 + k * h)
        if sens > 0:
            t.peindre(t.trait([(x0 + 2, y), (x0 + (x1 - x0) // 2, y)]), N)
        else:
            t.peindre(t.trait([(x1 - (x1 - x0) // 2, y), (x1 - 2, y)]), N)
    return m


def chaussure(t, x0, x1, y0=150, y1=160, pointe=1):
    """Une chaussure verte tramée, reflet blanc, semelle blanche ; pointe = 1 vers la droite, -1 vers la gauche."""
    if pointe > 0:
        m = t.poly([(x0, y0), (x1 - 6, y0), (x1, y0 + 5), (x1, y1), (x0, y1)])
    else:
        m = t.poly([(x0 + 6, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0 + 5)])
    t.piece(m, V, ombre=0)
    t.damier(m & t.rect(0, y0 + 1, 176, y0 + 3), N)
    t.peindre(t.rect(x0, y1 - 1, x1, y1 - 1), B)
    t.peindre(t.rect(x0, y1, x1, y1), N)
    return m


def oreille(t, x0, y0, x1, y1, gauche=True):
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    cx = (x0 + x1) // 2
    if gauche:
        t.peindre(t.courbe([(cx + 1, y0 + 3), (cx - 2, (y0 + y1) // 2), (cx + 1, y1 - 3)]), N)
    else:
        t.peindre(t.courbe([(cx - 1, y0 + 3), (cx + 2, (y0 + y1) // 2), (cx - 1, y1 - 3)]), N)
    return m


def eroder_m(t, m, ep):
    from portrait_v3 import eroder
    return eroder(m, ep)


def nez(t, pts, narines=()):
    m = t.poly(pts)
    t.piece(m, B, ombre=0)
    t.damier(t.bord(m, 1, 0, 2) | t.bord(m, 0, 1, 1), V)
    for (x, y) in narines:
        t.point(x, y, N)
    return m


# ------------------------------------------------------------------ l'Appariteur

def appariteur_v3():
    """L'appariteur : carré d'épaules, cheveux en brosse, menton en galoche, blouse grise ; il parle fort dans son
    talkie-walkie, l'autre poing sur la hanche, le trousseau qui pend."""
    t = Toile()
    # les jambes et les chaussures
    for x in (72, 94):
        j = t.poly([(x, 126), (x + 18, 126), (x + 17, 152), (x + 1, 152)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 9, 130), (x + 9, 151)]), N)
    chaussure(t, 66, 91, pointe=-1)
    chaussure(t, 94, 119, pointe=1)
    # le bras droit (à l'écran) : le poing sur la hanche
    haut = t.fuseau([(118, 84), (134, 96), (138, 108)], 14, 12)
    t.piece(haut, B, ombre=3)
    avant = t.fuseau([(138, 106), (132, 116), (120, 120)], 12, 10)
    t.piece(avant, B, ombre=3)
    t.peindre(t.courbe([(128, 92), (132, 100), (130, 104)]), N)
    # la blouse grise (blanche tramée de vert), carrée d'épaules
    blouse = t.poly([(62, 76), (122, 76), (128, 90), (122, 140), (62, 140), (56, 90)])
    t.piece(blouse, B, ombre=4)
    t.trame(blouse & ~t.bord(blouse, -1, -1, 2), V, 0.12)
    t.peindre(t.trait([(92, 84), (92, 140)]), N)
    for y in (96, 110, 124):
        t.piece(t.ell(95, y - 2, 99, y + 2), B, ombre=0)
        t.point(97, y, N)
    # les poches, le stylo, le badge
    for (x0, y0, x1, y1) in [(66, 112, 84, 128), (100, 112, 118, 128)]:
        t.peindre(t.rect(x0, y0, x1, y0), N)
        t.peindre(t.rect(x0, y0 + 1, x1, y0 + 1), V)
        t.peindre(t.trait([(x0, y0), (x0, y1)]) | t.trait([(x1, y0), (x1, y1)]), N)
    t.piece(t.rect(104, 84, 118, 94), V, ombre=0)
    t.peindre(t.rect(106, 87, 116, 87) | t.rect(106, 90, 113, 90), N)
    t.piece(t.rect(70, 84, 72, 94), V, ombre=0, lumiere=False)
    t.peindre(t.rect(70, 82, 72, 84), B)
    t.peindre(t.courbe([(64, 134), (78, 136), (90, 134)]) | t.courbe([(96, 134), (110, 136), (120, 134)]), N)
    # le col de chemise vert et la cravate
    t.piece(t.poly([(78, 74), (106, 74), (100, 86), (92, 82), (84, 86)]), V, ombre=0)
    crav = t.poly([(90, 82), (94, 82), (96, 98), (92, 102), (88, 98)])
    t.piece(crav, V, bord=B, ombre=0, lumiere=False)
    t.hachures(crav, N, 3)
    # le trousseau de clés qui pend à la ceinture
    t.peindre(t.trait([(124, 120), (126, 130)], 2), V)
    t.peindre(t.ell(120, 128, 132, 140) & ~t.ell(122, 130, 130, 138), B)
    for (x0, y0, x1, y1) in [(116, 138, 121, 152), (124, 140, 129, 156), (131, 137, 136, 150)]:
        t.piece(t.rect(x0 + 1, y0 + 5, x1 - 1, y1), B, ombre=0)
        t.piece(t.ell(x0, y0, x1, y0 + 6) & ~t.ell(x0 + 2, y0 + 2, x1 - 2, y0 + 4), B, ombre=0)
        t.peindre(t.rect(x1, y1 - 4, x1 + 1, y1 - 3) | t.rect(x1, y1 - 1, x1 + 1, y1), V)
    # le poing sur la hanche
    poing(t, 112, 112, 126, 126, sens=-1)
    # le bras gauche levé, le talkie collé à la bouche
    haut2 = t.fuseau([(68, 82), (54, 94), (44, 104)], 14, 12)
    t.piece(haut2, B, ombre=3)
    bras = t.fuseau([(42, 104), (42, 92), (46, 80)], 12, 11)
    t.piece(bras, B, ombre=3)
    t.peindre(t.courbe([(47, 100), (44, 96), (46, 92)]), N)
    manch = t.poly([(38, 76), (54, 76), (54, 82), (38, 82)])
    t.piece(manch, V, ombre=0)
    # le talkie-walkie : boîtier, grille, antenne, voyant
    talk = t.poly([(42, 36), (62, 36), (62, 70), (42, 70)])
    t.piece(talk, V, ombre=2)
    t.piece(t.rect(45, 40, 59, 52), B, ombre=0)
    for y in range(42, 52, 2):
        t.peindre(t.rect(47, y, 57, y), N)
    t.piece(t.rect(46, 56, 58, 62), N, bord=B, ombre=0)
    texte(t, 47, 57, "ch2", V)
    t.piece(t.rect(50, 14, 53, 36), V, ombre=0)
    t.piece(t.ell(49, 10, 54, 15), B, ombre=0)
    t.piece(t.rect(56, 30, 60, 35), N, bord=B, ombre=0)
    t.point(58, 32, V)
    poing(t, 38, 60, 54, 76, sens=1)
    # les ondes qui sortent du talkie
    for (r, k) in ((10, 0), (16, 1), (22, 2)):
        arc = t.ell(50 - r, 44 - r, 50 + r, 44 + r) & ~t.ell(50 - r + 2, 44 - r + 2, 50 + r - 2, 44 + r - 2)
        t.peindre(arc & t.rect(0, 0, 41, 176) & t.rect(0, 30 - k * 4, 176, 58 + k * 4), B)
    # la tête carrée, le menton en galoche
    oreille(t, 68, 46, 78, 62, gauche=True)
    oreille(t, 108, 46, 118, 62, gauche=False)
    tete = t.poly([(74, 28), (112, 28), (114, 50), (112, 64), (108, 72), (102, 80), (84, 80), (76, 70), (72, 54)])
    t.piece(tete, B, ombre=0)
    t.peindre(t.courbe([(88, 78), (93, 80), (98, 78)]), N)
    t.trame(t.poly([(80, 70), (106, 70), (102, 79), (84, 79)]) & ~t.bord(tete, 0, 1, 1), V, 0.25)
    # les cheveux en brosse
    brosse = t.poly([(72, 36), (72, 22), (76, 24), (78, 18), (82, 22), (85, 16), (88, 21), (92, 15), (95, 20),
                     (99, 15), (102, 21), (106, 16), (108, 22), (112, 18), (114, 24), (114, 36), (110, 32),
                     (76, 32)])
    t.piece(brosse, V, ombre=2)
    for x in range(78, 112, 4):
        t.peindre(t.trait([(x, 24), (x, 30)]), N)
    # sourcils froncés, il crie
    t.piece(t.fuseau([(78, 40), (84, 39), (91, 43)], 3, 5), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(96, 43), (102, 39), (109, 40)], 5, 3), V, ombre=0, lumiere=False)
    t.oeil(79, 45, l=11, h=8, regard=(-2, 0))
    t.oeil(97, 45, l=11, h=8, regard=(-2, 0))
    t.pixels(89, 51, """
....:...
....:o..
...:oo#.
...:oo#.
..:ooo#:
.:ooooo#:
.:o:oo:#:
..:::::::
""")
    # la bouche grande ouverte : il crie dans le talkie
    t.pixels(82, 63, """
...:::::::::::::::...
..:ooooooooooooooo:..
.:::o:o:o:o:o:o::::.
.:::::::::::::::::::.
.:::::::::::::::::::.
..::::#########::::..
...::###########::...
....:::::::::::::....
""")
    t.peindre(t.courbe([(81, 63), (82, 65), (82, 68)]) | t.courbe([(105, 63), (104, 65), (104, 68)]), N)
    t.sol(160, cx=92)
    return t.image()


# ------------------------------------------------------------------ la Bibliothécaire

def bibliothecaire_v3():
    """La bibliothécaire : petite et ronde, un chignon piqué d'une épingle, des lunettes ; elle porte une pile de
    livres bien trop haute, qui penche, le tampon dateur posé sur le dessus. Elle passe la tête sur le côté pour
    voir où elle va."""
    t = Toile()
    # les petits pieds
    chaussure(t, 74, 94, y0=150, pointe=-1)
    chaussure(t, 100, 120, y0=150, pointe=1)
    for x in (80, 104):
        t.piece(t.rect(x, 142, x + 10, 150), B, ombre=2)
    # la robe ronde, à pois, et son col
    robe = t.ell(58, 76, 136, 156) & t.rect(0, 0, 176, 146)
    t.piece(robe, V, ombre=4)
    for (x, y) in [(70, 100), (84, 92), (120, 96), (112, 110), (126, 124), (72, 126), (98, 134), (116, 138)]:
        t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2), B)
        t.point(x + 1, y + 1, V)
    t.piece(t.rect(62, 138, 132, 145) & robe, B, ombre=0)
    for x in range(64, 132, 6):
        t.peindre(t.poly([(x, 139), (x + 3, 142), (x, 145)]), V)
    # le gilet de laine sur les épaules
    gilet = t.poly([(94, 74), (124, 78), (134, 96), (130, 118), (116, 108), (112, 90), (102, 84)])
    t.piece(gilet, B, ombre=3)
    t.rayures(gilet & ~t.bord(gilet, -1, -1, 1), V, 4, 1, vertical=False)
    # la pile de livres, qui penche
    livres = [(36, 98, 10, V), (40, 92, 8, B), (34, 96, 12, V), (42, 100, 8, B), (38, 92, 10, V),
              (44, 98, 9, B), (40, 94, 8, V), (46, 98, 10, B), (42, 92, 8, V), (48, 96, 9, B)]
    y = 136
    for k, (x0, x1, h, c) in enumerate(livres):
        d = (k * k) // 6
        m = t.rect(x0 + d, y - h, x1 + d, y)
        t.piece(m, c, ombre=2)
        cc = B if c == V else V
        t.peindre(t.rect(x0 + d + 4, y - h + 2, x0 + d + 5, y - 2), cc)
        t.peindre(t.rect(x1 + d - 6, y - h + 2, x1 + d - 5, y - 2), cc)
        t.peindre(t.rect(x0 + d + 10, y - h // 2, x0 + d + 10 + (x1 - x0) // 3, y - h // 2), N)
        if k % 3 == 0:
            t.peindre(t.rect(x0 + d + 14 + (x1 - x0) // 3, y - h // 2, x0 + d + 18 + (x1 - x0) // 3, y - h // 2), N)
        y -= h + 2
    # le tampon dateur posé sur le dessus
    tx = 66
    t.piece(t.rect(tx - 10, y - 6, tx + 12, y), V, ombre=0)
    t.peindre(t.rect(tx - 8, y - 3, tx + 10, y - 3) & (((t.xx) % 3) != 0), N)
    t.piece(t.rect(tx - 2, y - 14, tx + 3, y - 6), B, ombre=0)
    t.piece(t.ell(tx - 6, y - 24, tx + 7, y - 13), V, ombre=0)
    # les traits qui disent que ça penche
    for (a, b) in [((106, y + 2), (112, y - 2)), ((108, y + 10), (116, y + 8)), ((24, y + 14), (18, y + 10))]:
        t.peindre(t.trait([a, b], 2), B)
    # les mains qui tiennent la pile : l'une dessous, l'autre sur le côté
    poing(t, 28, 126, 44, 140, sens=1)
    t.piece(t.fuseau([(126, 88), (124, 104), (110, 112)], 11, 9), V, ombre=2)
    t.piece(t.rect(104, 106, 110, 116), B, ombre=0)
    poing(t, 94, 104, 108, 120, sens=-1)
    # le chignon et son épingle (un crayon)
    t.piece(t.trait([(142, 10), (118, 30)], 3), B, ombre=0)
    t.piece(t.poly([(143, 8), (146, 6), (145, 11)]), V, ombre=0)
    chignon = t.ell(108, 14, 132, 36)
    t.piece(chignon, V, ombre=2)
    t.peindre(t.courbe([(112, 26), (118, 18), (126, 22), (122, 30)]), N)
    t.peindre(t.courbe([(114, 30), (120, 34), (128, 28)]), N)
    t.piece(t.trait([(110, 30), (130, 20)], 2), B, ombre=0)
    # la tête ronde qui se penche pour voir
    tete = t.ell(92, 30, 136, 76)
    t.piece(tete, B, ombre=0)
    oreille(t, 130, 50, 140, 64, gauche=False)
    cheveux = t.ell(90, 27, 138, 56) & ~t.ell(97, 34, 131, 76) & t.rect(0, 0, 176, 54)
    t.piece(cheveux, V, ombre=0)
    t.peindre(t.courbe([(96, 36), (106, 30), (116, 31)]) | t.courbe([(118, 31), (128, 33), (134, 42)]), N)
    # les lunettes rondes
    for (x0, x1) in ((98, 112), (115, 129)):
        t.peindre(t.ell(x0, 44, x1, 58) & ~t.ell(x0 + 1, 45, x1 - 1, 57), N)
    t.oeil(100, 47, l=11, h=8, regard=(-3, -1), cils=-1)
    t.oeil(117, 47, l=10, h=8, regard=(-3, -1))
    for (x0, x1) in ((98, 112), (115, 129)):
        t.peindre(t.ell(x0, 44, x1, 58) & ~t.ell(x0 + 1, 45, x1 - 1, 57), N)
        t.peindre(t.trait([(x1 - 4, 54), (x1 - 3, 53)]), V)
    t.peindre(t.courbe([(112, 49), (113, 48), (115, 49)]), N)
    t.peindre(t.trait([(129, 49), (134, 48)]), N)
    t.peindre(t.courbe([(101, 42), (105, 39), (110, 41)], 2), N)
    t.peindre(t.courbe([(118, 41), (123, 39), (127, 41)], 2), N)
    # le petit nez rond, les pommettes, la bouche en « o » appliquée
    t.pixels(110, 58, """
..:::..
.:ooo:.
:ooo#o:
.:o:#:.
..:::..
""")
    t.damier(t.ell(98, 60, 105, 65), V)
    t.damier(t.ell(124, 60, 131, 65), V)
    t.pixels(108, 66, """
:........:
.::::::::.
.:##o###:.
..::::::..
""")
    t.sol(160, cx=88)
    return t.image()


# ------------------------------------------------------------------ la Documentaliste

def documentaliste_v3():
    """La documentaliste : de longs cheveux, les lunettes relevées sur la tête, un collier de perles ; ravie, elle
    brandit son carnet hérissé de post-it."""
    t = Toile()
    # la longue chevelure, derrière
    dos = t.poly([(62, 40), (104, 38), (112, 70), (114, 108), (104, 116), (96, 104), (72, 104), (64, 116),
                  (54, 108), (56, 70)])
    t.piece(dos, V, ombre=3)
    for pts in ([(62, 60), (60, 88), (58, 108)], [(108, 62), (110, 88), (108, 108)], [(66, 80), (66, 100), (64, 112)]):
        t.peindre(t.courbe(pts), N)
    # les jambes et les chaussures
    for x in (74, 88):
        t.piece(t.rect(x, 140, x + 8, 151), B, ombre=2)
    chaussure(t, 68, 84, y0=150, pointe=-1)
    chaussure(t, 88, 104, y0=150, pointe=1)
    # la longue jupe évasée, blanche, frise de losanges
    jupe = t.poly([(72, 108), (100, 108), (114, 144), (58, 144)])
    t.piece(jupe, B, ombre=4)
    t.peindre(t.courbe([(80, 112), (76, 128), (70, 143)]) | t.courbe([(92, 112), (96, 128), (100, 143)]), N)
    t.piece(t.rect(58, 136, 114, 143) & jupe, V, ombre=0, lumiere=False)
    for x in range(60, 114, 6):
        t.pixels(x, 137, """
..o..
.o:o.
o:::o
.o:o.
..o..
""")
    # le chemisier blanc à fines rayures, cintré, ceinture
    buste = t.poly([(70, 74), (100, 74), (106, 84), (102, 110), (70, 110), (66, 84)])
    t.piece(buste, B, ombre=3)
    t.rayures(buste & ~t.bord(buste, 1, 0, 3), V, 5, 1)
    t.peindre(t.rect(68, 104, 104, 108) & buste, N)
    t.piece(t.rect(82, 103, 90, 109), B, ombre=0)
    t.peindre(t.rect(84, 105, 88, 107), N)
    t.peindre(t.courbe([(76, 90), (78, 100), (76, 104)]) | t.courbe([(96, 88), (94, 98), (96, 104)]), N)
    # le col blanc et le collier de perles
    t.piece(t.poly([(74, 72), (96, 72), (92, 82), (85, 88), (78, 82)]), V, ombre=0)
    t.peindre(t.poly([(80, 73), (90, 73), (85, 82)]), B)
    for k in range(9):
        a = math.pi * (0.15 + 0.7 * k / 8)
        x, y = 85 + 15 * math.cos(a), 78 + 10 * math.sin(a)
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(round(x) - 1, round(y) - 1, V)
    # le bras gauche replié, la main sur le cœur
    t.piece(t.fuseau([(70, 80), (58, 96), (66, 104)], 11, 9), V, ombre=2)
    t.piece(t.rect(64, 96, 69, 104), B, ombre=0)
    poing(t, 66, 92, 80, 106, sens=-1)
    # le bras droit levé, qui brandit le carnet
    bras = t.fuseau([(98, 80), (118, 72), (124, 52)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(114, 68), (120, 60)]), N)
    # le carnet à spirale, hérissé de post-it
    for (pts, c) in [([(118, 0), (124, 0), (124, 14), (118, 14)], V), ([(128, -2), (134, -2), (134, 12), (128, 12)], B),
                     ([(148, 12), (164, 12), (164, 18), (148, 18)], V), ([(148, 22), (166, 22), (166, 28), (148, 28)], B),
                     ([(148, 32), (162, 32), (162, 38), (148, 38)], V), ([(138, 0), (144, 0), (144, 12), (138, 12)], V)]:
        t.piece(t.poly(pts), c, ombre=0)
    carnet = t.rect(108, 8, 152, 44)
    t.piece(carnet, B, ombre=3)
    t.piece(t.rect(108, 8, 113, 44), V, ombre=0)
    for y in range(12, 44, 5):
        t.peindre(t.ell(111, y, 116, y + 3) & ~t.ell(112, y + 1, 115, y + 2), N)
    for (y, l) in [(16, 30), (21, 24), (26, 28), (31, 18)]:
        t.peindre(t.rect(120, y, 120 + l, y), V)
    texte(t, 126, 35, "man", N)
    poing(t, 116, 38, 130, 52, sens=1)
    for (x, y) in [(102, 6), (166, 4), (168, 40), (100, 26)]:
        t.etincelle(x, y)
    # la tête, ravie
    tete = t.ell(64, 30, 106, 76)
    t.piece(tete, B, ombre=0)
    frange = t.ell(60, 24, 110, 54) & ~t.ell(68, 38, 104, 80) & t.rect(0, 0, 176, 52)
    t.piece(frange, V, ombre=0)
    t.peindre(t.courbe([(68, 34), (80, 28), (94, 30)]) | t.courbe([(96, 31), (102, 34), (106, 42)]), N)
    t.piece(t.fuseau([(66, 42), (62, 54), (62, 68)], 6, 2), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(104, 42), (108, 54), (108, 68)], 6, 2), V, ombre=0, lumiere=False)
    # les lunettes relevées sur la tête (monture blanche sur les cheveux)
    for (x0, x1) in ((70, 82), (86, 98)):
        t.peindre(t.ell(x0, 24, x1, 34), N)
        t.peindre(t.ell(x0 + 1, 25, x1 - 1, 33) & ~t.ell(x0 + 2, 26, x1 - 2, 32), B)
        t.peindre(t.trait([(x0 + 4, 28), (x0 + 6, 27)]), V)
    t.peindre(t.trait([(82, 28), (86, 28)]), B)
    # sourcils relevés, yeux rieurs tournés vers le carnet
    t.peindre(t.courbe([(70, 43), (75, 40), (80, 42)], 2), N)
    t.peindre(t.courbe([(88, 42), (93, 39), (98, 41)], 2), N)
    t.oeil(69, 46, l=11, h=8, regard=(2, -1), cils=-1)
    t.oeil(87, 46, l=11, h=8, regard=(2, -1), cils=1)
    t.peindre(t.courbe([(70, 55), (75, 56), (79, 55)]) | t.courbe([(88, 55), (93, 56), (97, 55)]), N)
    t.pixels(82, 54, """
..:.
..o:
.oo:
:oo#
.::.
""")
    t.damier(t.ell(66, 58, 73, 63), V)
    t.damier(t.ell(96, 58, 103, 63), V)
    # le grand sourire
    t.pixels(74, 62, """
:................:
.::::::::::::::::.
.:oooooooooooooo:.
..:oooooooooooo:..
...::########::...
.....::::::::.....
""")
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ l'Enlumineur

def enlumineur_v3():
    """L'enlumineur : un moine tout rond et content, la tonsure, la bure et sa cordelière ; il tient une plume plus
    grande que lui et montre sa page enluminée."""
    t = Toile()
    # les sandales
    for (x0, x1) in ((64, 84), (98, 118)):
        m = t.rect(x0, 152, x1, 159)
        t.piece(m, B, ombre=0)
        t.peindre(t.rect(x0, 156, x1, 157), V)
        t.peindre(t.trait([(x0 + 4, 152), (x0 + 4, 155)]) | t.trait([(x0 + 10, 152), (x0 + 10, 155)])
                  | t.trait([(x0 + 16, 152), (x0 + 16, 155)]), N)
    # la bure toute ronde
    bure = t.ell(50, 66, 134, 170) & t.rect(0, 0, 176, 153)
    t.piece(bure, V, ombre=4)
    for pts in ([(72, 112), (68, 132), (66, 152)], [(92, 114), (92, 134), (94, 152)], [(110, 112), (114, 132), (116, 150)]):
        t.peindre(t.courbe(pts), N)
    t.piece(t.rect(54, 146, 130, 152) & bure, B, ombre=0)
    for x in range(56, 130, 5):
        t.peindre(t.rect(x, 148, x + 2, 150), V)
    # le capuchon rabattu dans le dos et le col
    capu = t.poly([(60, 64), (120, 64), (128, 80), (96, 92), (54, 80)])
    t.piece(capu, B, ombre=3)
    t.peindre(t.courbe([(64, 76), (90, 86), (122, 76)]), N)
    t.peindre(t.courbe([(70, 70), (90, 78), (114, 70)]), V)
    # la cordelière à nœuds
    t.peindre(t.courbe([(54, 108), (92, 116), (130, 106)], 3), B)
    t.peindre(t.courbe([(54, 108), (92, 116), (130, 106)]) & (((t.xx) % 4) == 0), N)
    for (x0, l) in ((84, 30), (94, 22)):
        corde = t.trait([(x0, 116), (x0 + 2, 116 + l)], 3)
        t.piece(corde, B, ombre=0)
        for k in range(1, l // 8 + 1):
            t.piece(t.ell(x0 - 2, 114 + k * 8, x0 + 4, 119 + k * 8), B, ombre=0)
            t.point(x0 + 1, 116 + k * 8, N)
        t.peindre(t.trait([(x0 - 1, 117 + l), (x0 + 4, 117 + l)]), B)
    # la page enluminée, montrée de la main droite
    t.piece(t.fuseau([(118, 84), (134, 94), (134, 104)], 13, 11), V, ombre=2)
    page = t.poly([(118, 46), (162, 42), (166, 102), (122, 106)])
    t.piece(page, B, ombre=2)
    t.peindre(t.poly([(124, 52), (146, 50), (148, 72), (126, 74)]), V)
    t.peindre(t.poly([(126, 54), (144, 52), (146, 70), (128, 72)]), N)
    lettre = t.poly([(135, 54), (143, 69), (139, 69), (137, 64), (133, 64), (131, 69), (127, 69)])
    t.peindre(lettre & ~t.poly([(135, 58), (137, 62), (133, 62)]), B)
    t.peindre(t.rect(126, 69, 132, 70) | t.rect(138, 69, 144, 70), B)
    t.peindre(t.courbe([(128, 56), (131, 53), (133, 57)]) | t.courbe([(141, 62), (144, 58), (142, 55)]), V)
    t.etoile(130, 59, V, 1)
    for k, y in enumerate(range(54, 74, 4)):
        t.peindre(t.trait([(150, y), (160 - k % 2 * 3, y - 1)]), N)
    for k, y in enumerate(range(78, 100, 4)):
        t.peindre(t.trait([(126, y + 1), (160 - (k % 3) * 4, y - 1)]), N)
    t.peindre(t.courbe([(120, 48), (122, 76), (124, 104)]) & (((t.yy) % 3) == 0), V)
    poing(t, 128, 94, 144, 108, sens=-1)
    # la tête ronde, la tonsure
    oreille(t, 64, 46, 74, 60, gauche=True)
    oreille(t, 108, 46, 118, 60, gauche=False)
    tete = t.ell(68, 24, 114, 72)
    t.piece(tete, B, ombre=0)
    couronne = t.ell(65, 24, 117, 64) & ~t.ell(71, 14, 111, 38) & t.rect(0, 0, 176, 60) \
        & (t.rect(0, 0, 176, 43) | ~t.rect(73, 0, 109, 176))
    t.piece(couronne, V, ombre=0)
    for x in range(66, 118, 4):
        t.peindre(t.trait([(x, 38), (x + 1, 43)]) & couronne & ~t.bord(couronne, 0, -1, 1), N)
    t.peindre(t.courbe([(80, 28), (86, 26), (92, 27)], 2), V)
    # sourcils joyeux, yeux rieurs vers la page
    t.peindre(t.courbe([(76, 50), (81, 47), (87, 49)], 2), N)
    t.peindre(t.courbe([(95, 49), (101, 47), (106, 50)], 2), N)
    t.oeil(76, 52, l=11, h=8, regard=(2, 0))
    t.oeil(95, 52, l=11, h=8, regard=(2, 0))
    t.peindre(t.trait([(73, 55), (74, 57)]) | t.trait([(108, 55), (107, 57)]), N)
    t.pixels(87, 58, """
..:::..
.:ooo:.
:oooo#:
:o:o:#:
.:::::.
""")
    t.damier(t.ell(72, 62, 80, 67), V)
    t.damier(t.ell(103, 62, 111, 67), V)
    t.pixels(82, 64, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..:::######:::..
....::::::::....
""")
    t.peindre(t.courbe([(86, 71), (91, 73), (96, 71)]), N)
    # la plume géante, tenue de la main gauche
    t.piece(t.fuseau([(68, 82), (54, 90), (52, 98)], 14, 12), V, ombre=2)
    t.piece(t.poly([(44, 92), (62, 92), (64, 100), (46, 102)]), B, ombre=0)
    vane = t.fuseau([(22, 0), (26, 26), (40, 50)], 2, 22) | t.fuseau([(40, 50), (50, 70), (54, 92)], 22, 4)
    t.piece(vane, V, ombre=3)
    t.peindre(t.courbe([(22, 0), (30, 36), (54, 94)], 2), B)
    for k in range(10):
        y = 10 + k * 8
        x = 24 + k * 3
        t.peindre(t.trait([(x - 10, y + 7), (x + 1, y)]) & vane, N)
        t.peindre(t.trait([(x + 3, y + 1), (x + 14, y + 6)]) & vane, N)
    t.peindre(t.poly([(28, 36), (20, 42), (30, 42)]) | t.poly([(50, 56), (58, 58), (50, 62)]), N)
    poing(t, 46, 88, 62, 104, sens=1)
    t.piece(t.poly([(56, 104), (60, 104), (62, 120), (58, 126), (55, 118)]), B, ombre=0)
    t.peindre(t.trait([(58, 110), (59, 122)]), N)
    t.pixels(55, 128, """
..:..
.:#:.
:###:
:##o:
.:::.
""")
    t.sol(160, cx=90)
    return t.image()


# ------------------------------------------------------------------ le Fossoyeur

def fossoyeur_v3():
    """Le fossoyeur : long et voûté, un chapeau mou, une barbe de trois jours, l'air las ; il s'appuie des deux mains
    sur sa pelle, le menton posé dessus. Un ver de terre sort du tas de terre."""
    t = Toile()
    # le tas de terre, et le ver
    tas = t.ell(96, 140, 170, 176) & t.rect(0, 0, 176, 159)
    t.piece(tas, V, ombre=0)
    t.damier(tas & ~t.bord(tas, 0, -1, 2), N)
    for (x, y) in [(110, 150), (126, 147), (142, 152), (156, 155), (120, 156)]:
        t.piece(t.ell(x - 2, y - 1, x + 2, y + 1), B, ombre=0, lumiere=False)
    ver = t.fuseau([(150, 146), (152, 136), (158, 132), (162, 136)], 4, 3)
    t.piece(ver, B, ombre=0)
    t.peindre(t.trait([(151, 142), (154, 142)]) | t.trait([(152, 138), (155, 137)]), V)
    t.point(160, 134, N)
    # la pelle plantée
    t.piece(t.rect(111, 72, 116, 140), B, ombre=2)
    t.peindre(t.rect(113, 76, 113, 138) & (((t.yy) % 6) < 3), V)
    lame = t.poly([(102, 136), (126, 136), (126, 150), (120, 158), (108, 158), (102, 150)])
    t.piece(lame, V, ombre=3)
    t.peindre(t.trait([(104, 140), (104, 150)], 1), B)
    t.peindre(t.trait([(110, 138), (117, 138)]), N)
    # les longues jambes et les godillots
    for (x, d) in ((62, -3), (80, 2)):
        j = t.poly([(x, 128), (x + 11, 128), (x + 11 + d, 151), (x + d, 151)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 6, 132), (x + 6 + d, 150)]), N)
    t.piece(t.rect(82, 138, 89, 145), B, ombre=0)
    t.peindre(t.trait([(83, 139), (88, 144)]) | t.trait([(88, 139), (83, 144)]), N)
    chaussure(t, 50, 72, y0=150, pointe=-1)
    chaussure(t, 80, 100, y0=150, pointe=1)
    # le bras du fond, vers la pelle
    t.piece(t.fuseau([(98, 66), (128, 88), (122, 70)], 10, 8), V, ombre=2)
    # le long manteau, le dos voûté
    manteau = t.poly([(92, 54), (74, 56), (60, 70), (56, 96), (56, 138), (98, 138), (100, 108), (104, 76), (104, 62)])
    t.piece(manteau, V, ombre=3)
    chemise = t.poly([(90, 58), (102, 60), (100, 100), (90, 100)])
    t.piece(chemise, B, ombre=2)
    t.peindre(t.trait([(96, 62), (95, 100)]), N)
    for y in (70, 80, 90):
        t.point(95, y, B); t.point(96, y, V)
    t.piece(t.poly([(88, 56), (96, 70), (90, 104), (84, 70)]), V, ombre=0)
    t.peindre(t.courbe([(66, 70), (64, 110), (66, 138)]), N)
    t.peindre(t.courbe([(84, 104), (82, 120), (84, 138)]), N)
    t.peindre(t.courbe([(64, 62), (76, 58), (88, 58)]) & (((t.xx) % 2) == 0), B)
    t.piece(t.rect(60, 110, 74, 122), B, ombre=0)
    t.peindre(t.rect(60, 110, 74, 122) & (((t.xx + t.yy) % 4) == 0), V)
    t.peindre(t.trait([(61, 110), (61, 122)]) & (((t.yy) % 2) == 0), N)
    t.peindre(t.rect(56, 104, 98, 107) & manteau, N)
    t.piece(t.rect(74, 103, 80, 108), B, ombre=0)
    # le bras de devant, replié sur le manche
    t.piece(t.fuseau([(76, 64), (84, 100), (108, 78)], 12, 10), V, ombre=2)
    t.peindre(t.courbe([(80, 90), (86, 98), (92, 94)]), N)
    # la poignée et les deux mains l'une sur l'autre
    t.piece(t.poly([(104, 66), (124, 66), (122, 74), (106, 74)]) & ~t.rect(108, 68, 120, 71), V, ombre=0)
    poing(t, 102, 62, 124, 74, doigts=2, sens=-1)
    poing(t, 100, 54, 122, 66, doigts=2, sens=-1)
    # la tête, penchée, le menton sur les mains
    oreille(t, 76, 36, 86, 52, gauche=True)
    tete = t.ell(80, 18, 124, 62)
    t.piece(tete, B, ombre=0)
    barbe = (tete & ~t.ell(84, 10, 120, 58) & t.rect(0, 50, 176, 176)) | (t.ell(92, 56, 114, 64) & tete)
    t.trame(barbe & ~t.bord(tete, 0, 1, 1), V, 0.4)
    # le chapeau mou, cabossé, à bord tombant
    calotte = t.poly([(82, 6), (96, 0), (118, 2), (126, 12), (124, 22), (82, 22)])
    t.piece(calotte, V, ombre=3)
    t.peindre(t.courbe([(94, 2), (102, 10), (110, 2)]), N)
    t.piece(t.rect(82, 17, 125, 21), B, ombre=0)
    bord = t.poly([(68, 28), (80, 22), (126, 20), (144, 26), (140, 31), (122, 26), (88, 28), (70, 34)])
    t.piece(bord, V, ombre=0)
    t.damier(bord & t.rect(0, 27, 176, 40), N)
    t.piece(t.rect(108, 4, 116, 12), B, ombre=0)
    t.peindre(t.trait([(109, 5), (115, 11)]) | t.trait([(115, 5), (109, 11)]), N)
    # les sourcils tombants, les yeux las, tournés vers nous
    t.peindre(t.courbe([(87, 35), (92, 33), (98, 35)], 2), N)
    t.peindre(t.courbe([(105, 35), (111, 33), (117, 36)], 2), N)
    t.oeil(86, 38, l=12, h=9, regard=(-2, 1), paupiere=4)
    t.oeil(105, 38, l=11, h=9, regard=(-2, 1), paupiere=4)
    t.peindre(t.courbe([(87, 48), (92, 49), (97, 48)]) | t.courbe([(106, 48), (110, 49), (115, 48)]), N)
    # le long nez
    t.pixels(97, 41, """
..::....
..:o:...
..:oo:..
.:ooo#:.
.:ooo#:.
.:ooo##:
:oooo##:
:o::o#:.
.:::::..
""")
    # la bouche en biais, une moue lasse
    t.pixels(92, 52, """
...........::
.::::::::::..
:o:###::::...
.:::::.......
""")
    # la mouche qui tourne, pour l'ennui
    t.pixels(148, 8, """
.ooo.ooo.
.o:o.o:o.
..ooooo..
...:#:...
..:#:#:..
...:::...
""")
    t.peindre(t.courbe([(146, 16), (140, 8), (148, 4)]) & (((t.xx) % 2) == 0), B)
    t.peindre(t.courbe([(156, 14), (162, 20), (156, 24)]) & (((t.yy) % 2) == 0), B)
    t.sol(160, cx=80, l=60)
    return t.image()


# ------------------------------------------------------------------ la Gestionnaire du parc

def gestionnaire_v3():
    """La gestionnaire du parc : un chignon, un crayon sur l'oreille, le gilet fluo à bandes ; elle coche son
    classeur, le bout de la langue sorti, tant elle s'applique."""
    t = Toile()
    # les jambes et les chaussures de sécurité
    for (x, d) in ((64, -2), (82, 2)):
        j = t.poly([(x, 112), (x + 14, 112), (x + 14 + d, 151), (x + d, 151)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 7, 116), (x + 7 + d, 150)]), N)
        t.peindre(t.rect(x + d, 138, x + 14 + d, 141) & j, B)
    chaussure(t, 54, 78, y0=150, pointe=-1)
    chaussure(t, 82, 106, y0=150, pointe=1)
    # le bras du fond, qui tient le classeur
    t.piece(t.fuseau([(104, 80), (118, 98), (126, 116)], 11, 9), V, ombre=2)
    # le buste : la chemise blanche et le gilet fluo
    buste = t.poly([(62, 74), (106, 74), (112, 90), (108, 116), (60, 116), (56, 90)])
    t.piece(buste, V, ombre=3)
    gilet = buste & ~t.poly([(76, 72), (92, 72), (88, 100), (80, 100)])
    t.piece(gilet, B, ombre=3)
    for y in (98, 107):
        bande = t.rect(56, y, 112, y + 4) & gilet
        t.peindre(bande, V)
        t.peindre(t.rect(56, y + 2, 112, y + 2) & gilet & (((t.xx) % 3) != 0), N)
    for x0 in (66, 96):
        t.peindre(t.rect(x0, 74, x0 + 5, 97) & gilet, V)
        t.peindre(t.rect(x0 + 2, 74, x0 + 2, 97) & gilet & (((t.yy) % 3) != 0), N)
    t.peindre(t.trait([(84, 100), (84, 116)]), N)
    t.piece(t.rect(70, 110, 78, 114), B, ombre=0)
    t.peindre(t.poly([(80, 74), (88, 74), (84, 82)]), V)
    # le classeur, une liste à cocher
    cl = t.poly([(98, 72), (142, 66), (148, 118), (104, 124)])
    t.piece(cl, V, ombre=2)
    feuille = t.poly([(104, 74), (138, 70), (143, 114), (108, 119)])
    t.piece(feuille, B, ombre=0)
    t.piece(t.rect(114, 64, 130, 70), B, ombre=0)
    t.peindre(t.rect(117, 66, 127, 68), V)
    for k in range(4):
        y = 80 + k * 9
        x = 110 + k // 2
        t.peindre(t.rect(x, y, x + 5, y + 5) & ~t.rect(x + 1, y + 1, x + 4, y + 4), N)
        t.peindre(t.trait([(x + 9, y + 3), (x + 26 - (k % 2) * 6, y + 2)], 1), V)
        if k < 2:
            t.peindre(t.trait([(x + 1, y + 2), (x + 3, y + 5), (x + 8, y - 2)], 1), V)
            t.point(x + 3, y + 4, N)
    poing(t, 118, 112, 132, 126, sens=-1)
    # le bras de devant, le stylo qui coche
    t.piece(t.fuseau([(62, 80), (54, 102), (84, 92)], 11, 9), V, ombre=2)
    t.peindre(t.courbe([(56, 90), (58, 98), (64, 100)]), N)
    t.piece(t.poly([(80, 88), (86, 86), (88, 96), (82, 98)]), B, ombre=0)
    stylo = t.trait([(94, 90), (110, 82)], 3)
    t.piece(stylo, V, ombre=0)
    t.peindre(t.poly([(110, 80), (114, 81), (111, 85)]), N)
    poing(t, 86, 84, 100, 98, sens=1)
    # le chignon
    chignon = t.ell(70, 10, 94, 32)
    t.piece(chignon, V, ombre=2)
    t.peindre(t.courbe([(74, 22), (80, 14), (88, 18), (84, 26)]), N)
    t.peindre(t.courbe([(76, 28), (84, 30), (90, 24)]), N)
    # la tête, penchée vers le classeur
    oreille(t, 100, 44, 110, 58, gauche=False)
    tete = t.ell(62, 26, 106, 72)
    t.piece(tete, B, ombre=0)
    cheveux = t.ell(60, 23, 108, 52) & ~t.ell(68, 36, 104, 80) & t.rect(0, 0, 176, 50)
    t.piece(cheveux, V, ombre=0)
    t.peindre(t.courbe([(68, 32), (78, 27), (90, 28)]) | t.courbe([(92, 28), (100, 31), (104, 38)]), N)
    t.piece(t.fuseau([(66, 40), (60, 50), (62, 60)], 5, 2), V, ombre=0, lumiere=False)
    # le crayon sur l'oreille
    crayon = t.trait([(94, 38), (116, 30)], 3)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.trait([(96, 38), (114, 31)]), V)
    t.peindre(t.poly([(116, 28), (121, 29), (117, 33)]), N)
    t.peindre(t.rect(92, 37, 95, 40), V)
    # les sourcils appliqués, les yeux sur le classeur
    t.peindre(t.courbe([(69, 43), (74, 41), (79, 42)], 2), N)
    t.peindre(t.courbe([(86, 42), (91, 41), (96, 43)], 2), N)
    t.oeil(68, 46, l=11, h=8, regard=(3, 2), paupiere=3, cils=-1)
    t.oeil(86, 46, l=11, h=8, regard=(3, 2), paupiere=3, cils=1)
    t.pixels(80, 54, """
..:..
..oo.
.:oo#
:ooo#
.:::.
""")
    t.damier(t.ell(65, 58, 72, 63), V)
    t.damier(t.ell(96, 58, 103, 63), V)
    # la bouche en coin, le bout de la langue sorti
    t.pixels(76, 63, """
:...........
.::::::::::.
..::::::#::.
.......:##:.
.......:##:.
........::..
""")
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ le Passeur

def passeur_v3():
    """Le passeur : grand et maigre sous sa cape de pluie à capuche, un long nez et deux yeux qui brillent dans
    l'ombre du capuchon ; il tend sa lanterne allumée, une clé pend à son cou au bout d'une ficelle. Il pleut."""
    t = Toile()
    # la pluie, en tirets obliques
    for (x, y) in [(10, 10), (30, 40), (14, 70), (36, 100), (8, 128), (150, 14), (166, 44), (24, 22), (160, 130),
                   (46, 8), (130, 6), (20, 112), (168, 100), (150, 150), (40, 140)]:
        t.peindre(t.trait([(x, y), (x - 3, y + 7)]), B)
    # les bottes
    for (x0, x1, p) in ((62, 82, -1), (88, 108, 1)):
        t.piece(t.rect(x0 + 4, 140, x1 - 4, 152), V, ombre=2)
        chaussure(t, x0, x1, y0=150, pointe=p)
        t.peindre(t.rect(x0 + 6, 142, x0 + 7, 149), B)
    # la grande cape de pluie
    cape = t.poly([(62, 66), (108, 66), (118, 96), (130, 146), (110, 150), (86, 144), (60, 150), (40, 146), (54, 96)])
    t.piece(cape, V, ombre=4)
    for pts in ([(68, 80), (58, 116), (50, 144)], [(84, 86), (80, 118), (76, 146)], [(98, 90), (102, 120), (108, 148)],
                [(110, 96), (118, 124), (124, 146)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(62, 74), (52, 108), (44, 142)]), B)
    t.peindre(t.courbe([(40, 146), (60, 150), (86, 144), (110, 150), (130, 146)], 2), B)
    for (x, y) in [(64, 100), (90, 110), (72, 130), (112, 126), (96, 136)]:
        t.pixels(x, y, """
.:.
:o:
:o:
.:.
""")
    # les boutons de la cape
    for y in (96, 108, 120):
        t.piece(t.ell(88, y - 2, 92, y + 2), B, ombre=0)
        t.point(90, y, N)
    # le bras tendu, qui porte la lanterne
    bras = t.fuseau([(104, 80), (124, 86), (142, 80)], 12, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(112, 88), (124, 90), (134, 86)]), N)
    t.piece(t.rect(138, 74, 142, 86), B, ombre=0)
    # les rayons de la lanterne
    cx, cy = 150, 104
    for k in range(14):
        a = k * math.pi / 7
        r0, r1 = 20, (30 if k % 2 == 0 else 25)
        t.peindre(t.trait([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
                           (cx + r1 * math.cos(a), cy + r1 * math.sin(a))]), B)
    # la lanterne : anse, chapeau, vitres, flamme
    t.peindre(t.ell(144, 72, 156, 86) & ~t.ell(146, 74, 154, 84) & t.rect(0, 0, 176, 82), B)
    t.piece(t.poly([(140, 88), (150, 80), (160, 88), (158, 92), (142, 92)]), V, ombre=0)
    lant = t.rect(142, 92, 158, 116)
    t.piece(lant, V, ombre=0, lumiere=False)
    t.peindre(t.rect(144, 94, 149, 114) | t.rect(151, 94, 156, 114), B)
    t.peindre(t.ell(146, 98, 154, 113), B)
    t.peindre(t.poly([(150, 98), (154, 106), (150, 112), (146, 106)]), V)
    t.peindre(t.poly([(150, 103), (152, 107), (150, 110), (148, 107)]), B)
    t.piece(t.rect(140, 116, 160, 120), V, ombre=0)
    poing(t, 132, 76, 146, 90, sens=-1)
    # la capuche, le visage dans son ombre
    capu = t.poly([(84, 2), (98, 12), (114, 34), (118, 58), (112, 76), (58, 76), (52, 58), (56, 34), (70, 12)])
    t.piece(capu, V, ombre=3)
    t.peindre(t.courbe([(84, 4), (76, 20), (62, 40)]) | t.courbe([(84, 4), (96, 18), (108, 36)]), N)
    t.peindre(t.ell(64, 22, 108, 82), N)
    visage = t.ell(70, 30, 102, 80)
    t.peindre(visage, B)
    t.damier(visage & t.rect(0, 0, 176, 41), N)
    t.peindre(visage & t.rect(0, 0, 176, 35), N)
    t.damier(t.bord(visage, 1, 0, 3) & ~t.rect(0, 0, 176, 41), V)
    t.damier(t.bord(visage, -1, 0, 2) & ~t.rect(0, 0, 176, 41), V)
    t.peindre(t.courbe([(64, 30), (86, 22), (108, 30)], 2), B)
    # les yeux qui brillent dans l'ombre, tournés vers la lanterne
    t.peindre(t.courbe([(74, 41), (79, 39), (84, 41)], 2), B)
    t.peindre(t.courbe([(89, 41), (94, 39), (99, 41)], 2), B)
    t.oeil(73, 43, l=11, h=9, regard=(3, 0))
    t.oeil(89, 43, l=11, h=9, regard=(3, 0))
    t.etoile(71, 42, B, 2)
    t.etoile(101, 42, B, 2)
    # le long nez pointu, qui sort de l'ombre
    n = t.poly([(85, 50), (88, 50), (100, 62), (110, 68), (106, 70), (94, 68), (86, 66)])
    t.piece(n, B, ombre=0)
    t.damier(t.bord(n, 0, 1, 2), V)
    t.point(93, 66, N); t.point(94, 66, N)
    # le sourire en coin
    t.pixels(78, 70, """
:........:.
.::::::::..
..:###::...
...:::.....
""")
    # la clé qui pend à son cou au bout d'une ficelle
    t.peindre(t.courbe([(74, 76), (78, 90), (86, 98)]) | t.courbe([(98, 76), (94, 90), (88, 98)]), B)
    t.pixels(81, 96, """
..:::::..
.:ooooo:.
:oo:::oo:
:oo:.:oo:
.:ooooo:.
..::o::..
...:o:...
...:o:...
...:oo:..
...:o:...
...:oo:..
....:....
""")
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ le Sacristain

def sacristain_v3():
    """Le sacristain : chauve, des sourcils en broussaille, une barbe blanche jusqu'au ventre, la chasuble à galon ;
    il lève son sablier d'une main et tient un cierge allumé de l'autre."""
    t = Toile()
    # l'aube blanche qui dépasse, les souliers
    chaussure(t, 64, 86, y0=152, pointe=-1)
    chaussure(t, 90, 112, y0=152, pointe=1)
    aube = t.poly([(54, 120), (118, 120), (124, 152), (48, 152)])
    t.piece(aube, B, ombre=3)
    for x in range(50, 124, 6):
        t.pixels(x, 146, """
.:.:.
:o:o:
.:o:.
""")
    # la chasuble verte à galon
    chas = t.poly([(58, 70), (114, 70), (124, 96), (122, 142), (86, 146), (50, 142), (48, 96)])
    t.piece(chas, V, ombre=4)
    galon = t.poly([(80, 70), (92, 70), (94, 146), (78, 146)])
    t.piece(galon, B, ombre=0)
    for y in range(76, 144, 8):
        t.peindre(t.poly([(86, y), (90, y + 4), (86, y + 8), (82, y + 4)]), V)
        t.point(86, y + 4, N)
    t.peindre(t.rect(78, 70, 79, 146) | t.rect(93, 70, 94, 146), N)
    for pts in ([(62, 92), (58, 118), (56, 140)], [(110, 92), (116, 118), (116, 140)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(50, 140), (86, 146), (122, 140)], 2), B)
    for (x, y) in [(64, 104), (106, 100), (68, 128), (110, 124)]:
        t.etoile(x, y, B, 1)
    # le bras levé, qui brandit le sablier
    bras = t.fuseau([(62, 80), (40, 74), (40, 46)], 13, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(44, 72), (40, 62)]), N)
    t.piece(t.poly([(32, 50), (48, 50), (48, 56), (32, 56)]), B, ombre=0)
    sab = t.poly([(28, 10), (52, 10), (52, 14), (44, 24), (52, 34), (52, 38), (28, 38), (28, 34), (36, 24), (28, 14)])
    for x in (27, 52):
        t.piece(t.rect(x, 6, x + 2, 42), V, ombre=0, lumiere=False)
    t.piece(t.rect(24, 4, 56, 8), V, ombre=0)
    t.piece(t.rect(24, 40, 56, 44), V, ombre=0)
    verre = t.poly([(31, 9), (49, 9), (49, 13), (42, 24), (49, 35), (49, 39), (31, 39), (31, 35), (38, 24), (31, 13)])
    t.piece(verre, B, ombre=0)
    t.peindre(t.poly([(34, 14), (46, 14), (40, 22)]), V)
    t.peindre(t.poly([(40, 30), (47, 38), (33, 38)]), V)
    t.peindre(t.rect(40, 22, 40, 37) & (((t.yy) % 2) == 0), V)
    t.peindre(t.trait([(33, 11), (33, 13)]) | t.trait([(33, 34), (34, 36)]), B)
    for (x, y) in [(18, 14), (62, 8), (16, 34)]:
        t.etincelle(x, y)
    poing(t, 32, 42, 48, 56, sens=1)
    # le bras qui tient le cierge
    t.piece(t.fuseau([(112, 80), (130, 100), (126, 88)], 13, 11), V, ombre=2)
    cierge = t.rect(124, 54, 132, 96)
    t.piece(cierge, B, ombre=2)
    t.peindre(t.poly([(124, 54), (127, 54), (127, 62), (125, 64), (124, 60)]), B)
    t.peindre(t.trait([(130, 56), (130, 64)]), V)
    t.peindre(t.rect(128, 48, 128, 54), N)
    flamme = t.fuseau([(128, 52), (124, 44), (130, 34)], 8, 1)
    t.piece(flamme, B, ombre=0)
    t.peindre(t.fuseau([(128, 51), (126, 46), (129, 40)], 4, 1), V)
    for k in range(10):
        a = k * math.pi / 5 + 0.3
        r0, r1 = 14, (22 if k % 2 == 0 else 18)
        if 1.0 < a < 2.2:
            continue
        t.peindre(t.trait([(128 + r0 * math.cos(a), 44 + r0 * math.sin(a)),
                           (128 + r1 * math.cos(a), 44 + r1 * math.sin(a))]), B)
    t.piece(t.ell(118, 92, 140, 100), V, ombre=0)
    poing(t, 120, 82, 136, 96, sens=-1)
    # la tête chauve
    oreille(t, 60, 42, 70, 58, gauche=True)
    oreille(t, 102, 42, 112, 58, gauche=False)
    tete = t.ell(64, 16, 108, 66)
    t.piece(tete, B, ombre=0)
    t.peindre(t.courbe([(74, 22), (80, 19), (86, 19)], 2), V)
    t.point(72, 25, V)
    t.peindre(t.courbe([(82, 25), (87, 24), (92, 25)]) | t.courbe([(78, 28), (87, 27), (96, 28)]), N)
    for (x0, x1) in ((60, 70), (102, 112)):
        t.piece(t.ell(x0, 32, x1, 44), B, ombre=0, bord=N)
        t.peindre(t.courbe([(x0 + 2, 36), (x0 + 5, 34), (x0 + 8, 38)]), N)
    # la grande barbe blanche, jusqu'au ventre
    barbe = t.poly([(66, 50), (72, 60), (100, 60), (106, 50), (108, 66), (102, 92), (92, 112), (86, 122),
                    (82, 110), (70, 92), (64, 66)])
    t.piece(barbe, B, ombre=3)
    for pts in ([(76, 70), (78, 90), (84, 108)], [(88, 70), (90, 92), (86, 114)], [(98, 70), (96, 88), (92, 104)],
                [(70, 70), (72, 84), (76, 94)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(86, 122), (82, 126), (86, 130), (90, 126)], 2), B)
    t.contour(t.courbe([(86, 122), (82, 126), (86, 130), (90, 126)], 2), N)
    t.peindre(t.courbe([(86, 122), (82, 126), (86, 130), (90, 126)], 2), B)
    # la moustache
    m1 = t.piece(t.fuseau([(85, 60), (78, 62), (70, 60), (66, 64)], 6, 2), B, ombre=0)
    m2 = t.piece(t.fuseau([(87, 60), (94, 62), (102, 60), (106, 64)], 6, 2), B, ombre=0)
    t.peindre(t.courbe([(83, 61), (76, 62), (70, 61)]) & m1, V)
    t.peindre(t.courbe([(89, 61), (96, 62), (102, 61)]) & m2, V)
    t.pixels(81, 64, """
:.......:
.:::::::.
..:###:..
...:::...
""")
    # les sourcils en broussaille
    for (pts, e) in (([(66, 37), (74, 31), (84, 35)], 6), ([(88, 35), (98, 31), (106, 37)], 6)):
        sc = t.fuseau(pts, e, 3)
        t.piece(sc, V, ombre=0, lumiere=False)
        t.peindre(sc & (((t.xx + t.yy) % 4) == 0), N)
        t.peindre(t.courbe(pts) & sc, B)
    t.oeil(72, 40, l=11, h=9, regard=(-2, -1), paupiere=2)
    t.oeil(89, 40, l=11, h=9, regard=(-2, -1), paupiere=2)
    t.peindre(t.trait([(69, 44), (70, 46)]) | t.trait([(103, 44), (102, 46)]), N)
    t.pixels(82, 47, """
...:....
...:o...
..:oo#..
..:ooo#.
.:oooo#:
:o::oo#:
.::::::.
""")
    t.damier(t.ell(68, 53, 74, 57), V)
    t.damier(t.ell(98, 53, 104, 57), V)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ le Serrurier

def serrurier_v3():
    """Le serrurier : trapu, large d'épaules, les lunettes de protection relevées sur le front, un grand sourire ; il
    lime un cadenas énorme, son tablier plein d'outils."""
    t = Toile()
    # les jambes courtes et les grosses chaussures
    for (x, d) in ((58, -2), (84, 2)):
        j = t.poly([(x, 124), (x + 18, 124), (x + 18 + d, 151), (x + d, 151)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 9, 128), (x + 9 + d, 150)]), N)
    chaussure(t, 48, 76, y0=149, pointe=-1)
    chaussure(t, 86, 114, y0=149, pointe=1)
    # le bras du fond, qui tient le cadenas
    t.piece(t.fuseau([(108, 80), (126, 100), (128, 112)], 14, 12), V, ombre=2)
    # le torse large, chemise blanche à carreaux verts
    torse = t.poly([(44, 74), (116, 74), (122, 92), (112, 128), (50, 128), (38, 92)])
    t.piece(torse, B, ombre=4)
    t.peindre(torse & (((t.xx) % 6) == 0) & ~t.bord(torse, -1, -1, 1), V)
    t.peindre(torse & (((t.yy) % 6) == 0) & ~t.bord(torse, -1, -1, 1), V)
    # le tablier de cuir blanc, ses poches et ses outils
    tab = t.poly([(60, 84), (100, 84), (100, 98), (110, 138), (50, 138), (60, 98)])
    t.piece(tab, V, ombre=3)
    t.peindre(t.trait([(60, 84), (52, 74)], 3) | t.trait([(100, 84), (108, 74)], 3), V)
    t.peindre(eroder_m(t, tab, 2) & t.bord(eroder_m(t, tab, 2), -1, 0, 1) & (((t.yy) % 3) != 0), B)
    for (x0, x1) in ((56, 78), (82, 104)):
        poche = t.rect(x0, 110, x1, 126)
        t.peindre(t.rect(x0, 110, x1, 111), B)
        t.peindre(t.trait([(x0, 110), (x0, 126)]) | t.trait([(x1, 110), (x1, 126)]), N)
        t.peindre(t.rect(x0 + 1, 112, x1 - 1, 113) & (((t.xx) % 3) == 0), N)
    t.piece(t.rect(61, 100, 64, 109), B, ombre=0)
    t.piece(t.rect(60, 96, 65, 100), B, ombre=0)
    t.peindre(t.rect(62, 101, 63, 108), V)
    t.piece(t.trait([(70, 109), (68, 98)], 3), B, ombre=0)
    t.piece(t.trait([(73, 109), (76, 98)], 3), B, ombre=0)
    t.piece(t.rect(88, 100, 91, 109), B, ombre=0)
    t.piece(t.poly([(85, 96), (94, 96), (94, 101), (85, 101)]), B, ombre=0)
    t.piece(t.rect(97, 102, 99, 109), B, ombre=0)
    t.piece(t.ell(94, 96, 102, 104) & ~t.ell(96, 98, 100, 102), B, ombre=0)
    t.peindre(t.courbe([(54, 132), (80, 134), (106, 132)]), N)
    # le cadenas énorme
    anse = t.ell(118, 42, 158, 86) & ~t.ell(126, 50, 150, 86) & t.rect(0, 0, 176, 78)
    t.piece(anse, B, ombre=2)
    cad = t.rect(110, 72, 164, 118)
    t.piece(cad, V, ombre=3)
    t.piece(t.rect(114, 76, 160, 80), B, ombre=0)
    t.peindre(t.rect(114, 77, 160, 77) & (((t.xx) % 3) == 0), V)
    t.piece(t.ell(132, 88, 142, 98), N, bord=B, ombre=0)
    t.piece(t.poly([(135, 96), (139, 96), (141, 108), (133, 108)]), N, bord=B, ombre=0)
    for (x, y) in [(116, 86), (158, 86), (116, 112), (158, 112)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    poing(t, 124, 112, 140, 126, sens=-1)
    # le bras de devant et la lime
    bras = t.fuseau([(48, 80), (40, 98), (52, 98)], 15, 13)
    t.piece(bras, V, ombre=2)
    t.piece(t.poly([(46, 92), (56, 90), (58, 100), (48, 102)]), B, ombre=0)
    t.peindre(t.trait([(48, 96), (57, 94)]), V)
    t.piece(t.fuseau([(56, 96), (74, 94), (90, 90)], 11, 10), B, ombre=2)
    t.peindre(t.courbe([(64, 94), (70, 96), (76, 93)]) | t.courbe([(78, 92), (82, 93)]), V)
    lime = t.poly([(100, 86), (146, 54), (150, 58), (104, 90)])
    t.piece(lime, B, ombre=0)
    t.peindre(lime & (((t.xx - t.yy) % 3) == 0), N)
    t.piece(t.trait([(92, 94), (101, 88)], 5), V, ombre=0)
    poing(t, 86, 84, 102, 98, sens=1)
    # les étincelles et la limaille
    for (x, y) in [(148, 52), (160, 60), (156, 44), (166, 50)]:
        t.etincelle(x, y)
    for (x, y) in [(152, 66), (162, 70), (158, 68), (166, 64)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), B)
    # la tête
    oreille(t, 52, 42, 62, 58, gauche=True)
    oreille(t, 98, 42, 108, 58, gauche=False)
    tete = t.ell(56, 20, 104, 72)
    t.piece(tete, B, ombre=0)
    cheveux = t.ell(54, 14, 106, 44) & ~t.ell(60, 30, 100, 80)
    t.piece(cheveux, V, ombre=0)
    for x in range(60, 102, 5):
        t.peindre(t.trait([(x, 18), (x + 2, 24)]) & cheveux, N)
    # les lunettes de protection relevées sur le front
    t.piece(t.rect(54, 28, 106, 32), N, bord=B, ombre=0)
    t.peindre(t.rect(54, 30, 106, 30) & (((t.xx) % 4) == 0), V)
    for (x0, x1) in ((62, 78), (82, 98)):
        g = t.ell(x0, 20, x1, 36)
        t.piece(g, B, ombre=0)
        verre = t.ell(x0 + 2, 22, x1 - 2, 34)
        t.peindre(verre, V)
        t.peindre(t.trait([(x0 + 5, 25), (x0 + 8, 24)]) | t.trait([(x0 + 5, 27), (x0 + 6, 27)]), B)
        t.damier(t.bord(verre, 1, 1, 2), N)
    t.piece(t.rect(78, 26, 82, 29), B, ombre=0)
    # sourcils relevés, yeux joyeux vers le cadenas
    t.peindre(t.courbe([(64, 40), (69, 38), (75, 40)], 2), N)
    t.peindre(t.courbe([(84, 40), (90, 38), (95, 40)], 2), N)
    t.oeil(63, 43, l=11, h=8, regard=(3, 1))
    t.oeil(84, 43, l=11, h=8, regard=(3, 1))
    t.peindre(t.trait([(60, 47), (61, 49)]) | t.trait([(97, 47), (96, 49)]), N)
    t.pixels(74, 48, """
...:....
...:o...
..:ooo..
.:oooo#.
:ooooo#:
:o::oo#:
.::::::.
""")
    t.damier(t.ell(58, 54, 66, 60), V)
    t.damier(t.ell(94, 54, 102, 60), V)
    # le grand sourire et la barbe courte
    t.trame(t.ell(58, 52, 102, 74) & tete & ~t.ell(62, 30, 98, 66), V, 0.4)
    t.pixels(66, 57, """
:......................:
.::::::::::::::::::::::.
.:oo:oo:oo:oo:oo:oo:oo:.
..:oooooooooooooooooo:..
...:::############:::...
.....::::::::::::::.....
""")
    t.sol(160, cx=82)
    return t.image()


# ------------------------------------------------------------------ le Sonneur

def sonneur_v3():
    """Le sonneur : bonnet de laine, il se pend de tout son poids à la corde de la grande cloche, qui descend du
    ciel ; la bouche grande ouverte (DONG !), une petite cloche à la ceinture, les pieds qui ne touchent plus le sol."""
    t = Toile()
    cx = 116
    # la grande cloche, en haut, et ses ondes
    for (r, k) in ((40, 0), (48, 1), (56, 2)):
        arc = t.ell(cx - r, -30 - r // 2, cx + r, 10 + r // 2) & ~t.ell(cx - r + 2, -28 - r // 2, cx + r - 2, 8 + r // 2)
        t.peindre(arc & t.rect(0, 0, 176, 30 + k * 6) & (((t.xx + t.yy) % 6) < 4), B)
    cloche = t.poly([(cx - 26, 0), (cx + 26, 0), (cx + 32, 10), (cx + 40, 16), (cx - 40, 16), (cx - 32, 10)])
    t.piece(cloche, V, ombre=3)
    t.piece(t.rect(cx - 42, 14, cx + 42, 19), B, ombre=0)
    t.peindre(t.rect(cx - 38, 16, cx + 38, 16) & (((t.xx) % 4) == 0), V)
    t.peindre(t.courbe([(cx - 22, 2), (cx - 24, 8), (cx - 30, 12)]), B)
    # la corde, du ciel jusqu'en bas, et son pompon
    corde = t.rect(cx - 2, 18, cx + 3, 140)
    t.piece(corde, B, ombre=0)
    t.peindre(corde & (((t.xx + t.yy) % 4) == 0), V)
    t.piece(t.ell(cx - 6, 138, cx + 7, 148), V, ombre=0)
    for x in range(cx - 5, cx + 7, 2):
        t.peindre(t.trait([(x, 148), (x, 153)]), V)
    # les jambes repliées, qui ne touchent plus terre
    t.piece(t.fuseau([(76, 118), (62, 120), (56, 132)], 15, 12), V, ombre=2)
    t.piece(t.fuseau([(96, 120), (108, 126), (104, 136)], 15, 12), V, ombre=2)
    j1 = t.fuseau([(58, 128), (56, 138), (48, 144)], 11, 10)
    t.piece(j1, B, ombre=2)
    t.rayures(j1, V, 4, 1, vertical=False)
    j2 = t.fuseau([(106, 132), (100, 140), (94, 146)], 11, 10)
    t.piece(j2, B, ombre=2)
    t.rayures(j2, V, 4, 1, vertical=False)
    b1 = t.poly([(30, 140), (46, 138), (52, 148), (34, 150), (28, 146)])
    t.piece(b1, V, ombre=0)
    t.peindre(t.trait([(30, 148), (50, 147)]), B)
    b2 = t.poly([(80, 144), (96, 142), (100, 152), (82, 154), (76, 150)])
    t.piece(b2, V, ombre=0)
    t.peindre(t.trait([(78, 152), (98, 151)]), B)
    for (a, b) in [((40, 154), (52, 154)), ((84, 158), (98, 158))]:
        t.peindre(t.trait([a, b]) & (((t.xx) % 3) != 0), B)
    # le bras du fond, tendu vers la corde
    t.piece(t.fuseau([(98, 82), (108, 60), (114, 44)], 12, 10), V, ombre=2)
    # le corps qui pend, pull à torsades
    torse = t.poly([(70, 78), (106, 78), (108, 100), (102, 124), (70, 124), (66, 100)])
    t.piece(torse, V, ombre=3)
    for x in (78, 90):
        t.peindre(t.trait([(x, 84), (x, 116)]), N)
        for y in range(84, 116, 6):
            t.peindre(t.courbe([(x - 3, y), (x, y + 3), (x + 3, y)]), B)
    t.piece(t.rect(68, 114, 104, 120), B, ombre=0)
    t.peindre(t.rect(68, 116, 104, 118) & (((t.xx) % 3) == 0), V)
    # la petite cloche à la ceinture
    t.peindre(t.trait([(98, 118), (99, 124)]), B)
    pc = t.poly([(93, 124), (105, 124), (107, 134), (91, 134)])
    t.piece(pc, B, ombre=2)
    t.piece(t.ell(97, 133, 101, 137), V, ombre=0)
    t.peindre(t.courbe([(109, 126), (112, 130), (109, 134)]) | t.courbe([(89, 126), (86, 130), (89, 134)]), B)
    # la tête, renversée, qui crie
    oreille(t, 56, 50, 64, 64, gauche=True)
    oreille(t, 102, 50, 110, 64, gauche=False)
    tete = t.ell(60, 34, 106, 82)
    t.piece(tete, B, ombre=0)
    # le bonnet de laine à revers et pompon
    pompon = t.ell(52, 14, 66, 28)
    t.piece(pompon, B, ombre=0)
    t.peindre(pompon & (((t.xx + t.yy) % 3) == 0), V)
    bonnet = t.poly([(60, 48), (58, 36), (62, 24), (76, 20), (94, 22), (106, 34), (108, 48)])
    t.piece(bonnet, V, ombre=2)
    t.rayures(bonnet & ~t.bord(bonnet, -1, -1, 1), N, 4, 1)
    rev = t.poly([(57, 42), (109, 42), (109, 50), (57, 50)])
    t.piece(rev, B, ombre=0)
    t.peindre(rev & (((t.xx) % 4) == 0) & ~t.bord(rev, 0, -1, 1), V)
    # les yeux levés vers la cloche, sourcils en accent
    t.peindre(t.courbe([(66, 54), (71, 52), (76, 53)], 2), N)
    t.peindre(t.courbe([(88, 53), (93, 52), (98, 54)], 2), N)
    t.oeil(66, 56, l=11, h=9, regard=(2, -2))
    t.oeil(87, 56, l=11, h=9, regard=(2, -2))
    t.pixels(79, 61, """
..:...
..:o..
.:oo#.
:o:o#:
.::::.
""")
    t.damier(t.ell(62, 66, 68, 71), V)
    t.damier(t.ell(98, 66, 104, 71), V)
    # la bouche grande ouverte : DONG !
    t.pixels(74, 67, """
...::::::::::...
..:oooooooooo:..
.::::::::::::::.
.::::::::::::::.
.:::::####:::::.
..:::######:::..
...::::::::::...
""")
    # le bras de devant et les deux poings serrés sur la corde
    t.piece(t.fuseau([(102, 84), (122, 66), (120, 46)], 12, 10), V, ombre=2)
    t.peindre(t.courbe([(112, 74), (118, 66)]), N)
    poing(t, 106, 34, 124, 48, sens=1)
    poing(t, 110, 22, 128, 36, sens=-1)
    # les traits qui disent l'effort et le bruit
    for (a, b) in [((48, 40), (40, 36)), ((46, 52), (36, 52)), ((48, 64), (40, 68)), ((140, 40), (150, 36)),
                   ((142, 52), (152, 54))]:
        t.peindre(t.trait([a, b], 2), B)
    for (x, y) in [(20, 30), (160, 76), (30, 90)]:
        t.etincelle(x, y)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ la Tutrice

def tutrice_v3():
    """La tutrice : une queue de cheval qui balance, une longue écharpe ; elle lève son crayon comme pour dire
    « écoute bien », son cahier ouvert dans l'autre main."""
    t = Toile()
    # la queue de cheval qui balance, derrière
    queue = t.fuseau([(64, 36), (48, 38), (38, 54), (42, 74)], 9, 2) | t.fuseau([(60, 38), (44, 44), (38, 60)], 12, 6)
    t.piece(queue, V, ombre=3)
    for pts in ([(58, 38), (46, 42), (40, 56)], [(56, 42), (46, 50), (42, 64)], [(52, 40), (42, 48), (40, 68)]):
        t.peindre(t.courbe(pts) & queue & ~t.bord(queue, -1, -1, 1), N)
    t.peindre(t.courbe([(56, 37), (46, 40), (40, 50)]) & queue, B)
    t.piece(t.ell(60, 32, 70, 42), B, ombre=0)
    t.peindre(t.trait([(63, 34), (67, 40)]), V)
    for (a, b) in [((26, 40), (20, 46)), ((24, 54), (16, 58)), ((26, 66), (20, 72))]:
        t.peindre(t.trait([a, b], 2), B)
    # les jambes, le jean, les baskets
    for (x, d) in ((68, -3), (86, 3)):
        j = t.poly([(x, 116), (x + 14, 116), (x + 14 + d, 151), (x + d, 151)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 3, 120), (x + 3 + d, 150)]), B)
    chaussure(t, 56, 80, y0=150, pointe=-1)
    chaussure(t, 88, 112, y0=150, pointe=1)
    for x0 in (60, 92):
        t.peindre(t.rect(x0, 152, x0 + 16, 153) & (((t.xx) % 3) == 0), B)
    # le manteau court, cintré
    manteau = t.poly([(64, 74), (104, 74), (110, 92), (112, 122), (60, 122), (60, 92)])
    t.piece(manteau, V, ombre=3)
    t.peindre(t.trait([(86, 82), (86, 122)]), N)
    for y in (90, 102, 114):
        t.piece(t.ell(88, y - 2, 92, y + 2), B, ombre=0)
        t.point(90, y, N)
    t.peindre(t.rect(60, 104, 112, 107) & manteau, N)
    t.piece(t.rect(66, 110, 80, 118), V, ombre=0)
    t.peindre(t.rect(66, 110, 80, 110), B)
    # le bras qui tient le cahier ouvert
    t.piece(t.fuseau([(66, 80), (52, 98), (60, 110)], 11, 9), V, ombre=2)
    cahier = t.poly([(30, 100), (52, 96), (74, 100), (74, 124), (52, 120), (30, 124)])
    t.piece(cahier, B, ombre=0)
    t.peindre(t.trait([(52, 96), (52, 120)]), N)
    t.peindre(t.poly([(30, 124), (52, 120), (74, 124), (74, 126), (52, 122), (30, 126)]), V)
    for k, y in enumerate(range(104, 120, 4)):
        t.peindre(t.trait([(34, y - k % 2), (48, y - 1)]), V)
    texte(t, 56, 103, "ls", N)
    texte(t, 56, 110, "-la", N)
    t.peindre(t.ell(64, 114, 70, 119) & ~t.ell(65, 115, 69, 118), V)
    poing(t, 36, 118, 50, 132, sens=1)
    # l'écharpe longue, rayée, dont un pan s'envole
    pan = t.fuseau([(98, 80), (116, 86), (130, 82), (140, 88)], 10, 8)
    t.piece(pan, B, ombre=2)
    t.rayures(pan & ~t.bord(pan, 1, 1, 1), V, 6, 2)
    for x in range(132, 142, 3):
        t.peindre(t.trait([(x + 2, 90), (x + 3, 95)]), B)
    pan2 = t.poly([(74, 78), (84, 78), (86, 104), (74, 104)])
    t.piece(pan2, B, ombre=2)
    t.rayures(pan2 & ~t.bord(pan2, 1, 1, 1), V, 6, 2, vertical=False)
    for x in range(74, 86, 3):
        t.peindre(t.trait([(x + 1, 105), (x + 1, 109)]), B)
    col = t.poly([(68, 70), (102, 70), (104, 80), (66, 80)])
    t.piece(col, B, ombre=2)
    t.rayures(col & ~t.bord(col, 1, 1, 1), V, 6, 2)
    # le bras levé, le crayon pointé
    bras = t.fuseau([(104, 80), (122, 74), (128, 50)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.rect(122, 48, 134, 53), B, ombre=0)
    crayon = t.trait([(132, 46), (138, 18)], 4)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.trait([(134, 44), (139, 22)]), V)
    t.piece(t.poly([(136, 16), (141, 18), (138, 8)]), B, ombre=0)
    t.peindre(t.poly([(137, 11), (139, 12), (138, 8)]), N)
    t.piece(t.trait([(131, 48), (132, 44)], 4), V, ombre=0)
    poing(t, 122, 38, 136, 52, sens=-1)
    for (x, y) in [(150, 10), (124, 6), (154, 32)]:
        t.etincelle(x, y)
    # la tête
    tete = t.ell(64, 26, 106, 72)
    t.piece(tete, B, ombre=0)
    oreille(t, 100, 44, 110, 58, gauche=False)
    cheveux = t.ell(62, 22, 108, 50) & ~t.ell(70, 34, 112, 80) & t.rect(0, 0, 176, 52)
    t.piece(cheveux, V, ombre=0)
    t.peindre(t.courbe([(70, 30), (82, 25), (96, 27)]) | t.courbe([(98, 28), (104, 32), (106, 38)]), N)
    t.piece(t.fuseau([(68, 38), (64, 48), (66, 58)], 5, 2), V, ombre=0, lumiere=False)
    for pts in ([(74, 34), (84, 29), (94, 30)], [(90, 32), (98, 32), (102, 38)]):
        t.peindre(t.courbe(pts) & cheveux & ~t.bord(cheveux, 0, -1, 1), N)
    # un sourcil levé (« écoute bien »), les yeux vers nous
    t.peindre(t.courbe([(72, 42), (77, 40), (82, 41)], 2), N)
    t.peindre(t.courbe([(88, 39), (93, 36), (98, 38)], 2), N)
    t.oeil(71, 44, l=11, h=8, regard=(1, 0), cils=-1)
    t.oeil(88, 43, l=11, h=9, regard=(1, 0), cils=1)
    t.pixels(82, 52, """
..:..
..oo.
.:oo#
:ooo#
.:::.
""")
    t.damier(t.ell(68, 56, 75, 61), V)
    t.damier(t.ell(97, 56, 104, 61), V)
    t.pixels(77, 61, """
..........:.
.:::::::::..
.:ooooooo:..
..:#####:...
...:::::....
""")
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ le Greffier

def greffier_v3():
    """Le Greffier : un vieil homme tout voûté, une plume d'oie derrière l'oreille ; penché sur son pupitre, il
    recopie dans le registre du roi tout ce que root a vu."""
    t = Toile()
    # le pupitre : pied, socle, plateau incliné
    t.piece(t.rect(134, 96, 142, 150), V, ombre=2)
    t.peindre(t.rect(136, 98, 136, 148), B)
    t.piece(t.poly([(120, 150), (156, 150), (160, 159), (116, 159)]), V, ombre=0)
    t.damier(t.rect(118, 152, 158, 154), N)
    t.peindre(t.rect(116, 158, 160, 159), B)
    plateau = t.poly([(102, 84), (166, 76), (168, 94), (106, 100)])
    t.piece(plateau, V, ombre=3)
    t.peindre(t.trait([(106, 98), (166, 92)]), B)
    # l'encrier et sa plume, sur la tablette
    t.piece(t.rect(148, 98, 170, 102), V, ombre=0)
    t.piece(t.poly([(152, 88), (164, 88), (166, 98), (150, 98)]), B, ombre=2)
    t.piece(t.rect(154, 84, 162, 88), V, ombre=0)
    t.piece(t.fuseau([(160, 86), (164, 70), (170, 54)], 2, 6), B, ombre=0)
    t.peindre(t.courbe([(160, 86), (165, 68), (170, 54)]), V)
    # le registre du roi, ouvert, et son signet
    gauche = t.poly([(106, 72), (134, 68), (136, 88), (108, 92)])
    droite = t.poly([(134, 68), (150, 64), (154, 84), (136, 88)])
    t.piece(gauche | droite, B, ombre=0)
    t.peindre(t.trait([(134, 68), (136, 88)]), N)
    t.peindre(t.trait([(106, 92), (136, 89), (154, 85)], 2), V)
    for k in range(4):
        t.peindre(t.trait([(110, 76 + k * 4), (132, 73 + k * 4)]) & gauche, N if k == 0 else V)
        t.peindre(t.trait([(138, 72 + k * 4), (150, 69 + k * 4)]) & droite, V)
    t.peindre(t.rect(112, 74, 116, 78) & gauche, V)
    t.piece(t.fuseau([(140, 90), (142, 104), (138, 112)], 4, 3), B, ombre=0)
    t.peindre(t.poly([(135, 110), (141, 110), (138, 115)]), N)
    # la longue robe, le dos voûté
    chaussure(t, 44, 68, y0=150, pointe=-1)
    chaussure(t, 74, 98, y0=150, pointe=1)
    robe = t.poly([(80, 66), (62, 58), (44, 66), (34, 90), (34, 148), (104, 148), (104, 112), (100, 88)])
    t.piece(robe, V, ombre=4)
    t.peindre(t.courbe([(58, 62), (40, 80), (38, 146)], 1), B)
    for pts in ([(52, 96), (50, 120), (52, 146)], [(70, 92), (70, 120), (68, 146)], [(88, 96), (90, 120), (92, 146)]):
        t.peindre(t.courbe(pts), N)
    t.piece(t.rect(34, 140, 104, 147) & robe, B, ombre=0)
    for x in range(36, 104, 6):
        t.peindre(t.poly([(x, 141), (x + 3, 144), (x, 147)]), V)
    for (x, y) in [(46, 110), (58, 84), (82, 108), (56, 128), (90, 128), (72, 122), (46, 76)]:
        t.etoile(x, y, B, 1)
    # le col plissé blanc (la fraise)
    fraise = t.ell(66, 70, 108, 90)
    t.piece(fraise, B, ombre=2)
    for k in range(9):
        x = 70 + k * 4
        t.peindre(t.trait([(x, 74), (x + 1, 87)]) & fraise, N if k % 2 else V)
    # le bras qui écrit
    bras = t.fuseau([(96, 90), (102, 112), (114, 92)], 12, 10)
    t.piece(bras, V, ombre=2)
    t.piece(t.poly([(104, 92), (112, 88), (118, 98), (110, 102)]), B, ombre=0)
    t.peindre(t.trait([(106, 95), (114, 92)]), V)
    plume = t.fuseau([(118, 82), (122, 64), (132, 46)], 2, 8)
    t.piece(plume, B, ombre=0)
    t.peindre(t.courbe([(118, 82), (123, 62), (132, 46)]), V)
    for k in range(3):
        t.peindre(t.trait([(124 + k * 2, 60 - k * 4), (128 + k * 2, 62 - k * 4)]), V)
    poing(t, 110, 80, 124, 94, sens=-1)
    # la tête penchée sur le registre
    tete = t.ell(74, 30, 114, 76)
    t.piece(tete, B, ombre=0)
    oreille(t, 70, 46, 80, 62, gauche=True)
    # la plume d'oie derrière l'oreille
    po = t.fuseau([(74, 54), (66, 36), (58, 16)], 3, 10)
    t.piece(po, B, ombre=2)
    t.peindre(t.courbe([(74, 54), (66, 34), (58, 16)]), V)
    for k in range(4):
        t.peindre(t.trait([(64 - k, 40 - k * 6), (60 - k, 36 - k * 6)]), V)
    # les touffes de cheveux blancs et le crâne
    for pts in ([(78, 40), (70, 36), (66, 42)], [(110, 40), (118, 36), (120, 44)]):
        t.piece(t.fuseau(pts, 6, 1), B, ombre=0, lumiere=False)
    t.peindre(t.courbe([(86, 34), (92, 32), (98, 34)], 2), V)
    t.peindre(t.courbe([(86, 40), (92, 38)]) | t.courbe([(98, 38), (104, 40)]), N)
    # les sourcils en broussaille, les yeux baissés sur la page, le pince-nez
    for pts in ([(80, 45), (86, 41), (93, 44)], [(97, 44), (104, 41), (111, 45)]):
        sc = t.fuseau(pts, 5, 2)
        t.piece(sc, V, ombre=0, lumiere=False)
        t.peindre(t.courbe(pts) & sc, B)
    t.oeil(82, 49, l=11, h=8, regard=(3, 2), paupiere=3)
    t.oeil(99, 49, l=11, h=8, regard=(3, 2), paupiere=3)
    # le long nez crochu
    n = t.poly([(95, 52), (98, 52), (104, 62), (102, 66), (96, 66), (93, 64)])
    t.piece(n, B, ombre=0)
    t.damier(t.bord(n, 1, 0, 2) & ~t.bord(n, -1, 0, 1), V)
    t.peindre(t.courbe([(93, 64), (96, 63), (98, 65)]), N)
    # la bouche pincée et les rides
    t.pixels(89, 68, """
:...........
.::::::::::.
...:###:....
....:::.....
""")
    t.peindre(t.courbe([(84, 62), (86, 66), (88, 70)]) | t.courbe([(110, 62), (108, 66), (106, 70)]), N)
    t.sol(160, cx=82)
    return t.image()


# ------------------------------------------------------------------ la Cantinière

def cantiniere_v3():
    """La Cantinière : forte et souriante, le tablier taché de sauce et la recette serrée sur le cœur ; elle touille
    de sa louche la marmite qui fume."""
    t = Toile()
    # les jambes et les sabots
    for x in (52, 74):
        t.piece(t.rect(x + 2, 138, x + 14, 151), B, ombre=2)
    chaussure(t, 46, 70, y0=150, pointe=-1)
    chaussure(t, 72, 96, y0=150, pointe=1)
    # la robe ample
    robe = t.poly([(46, 72), (106, 72), (114, 96), (118, 142), (36, 142), (38, 96)])
    t.piece(robe, V, ombre=4)
    t.peindre(t.courbe([(40, 100), (38, 140)]) | t.courbe([(112, 100), (116, 140)]), N)
    t.piece(t.rect(36, 138, 118, 143) & robe, B, ombre=0)
    t.peindre(t.rect(36, 140, 118, 141) & (((t.xx) % 4) < 2), V)
    # le grand tablier blanc taché de sauce
    tab = t.poly([(54, 84), (98, 84), (98, 98), (108, 138), (44, 138), (54, 98)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.rect(46, 96, 108, 99) & robe, B)
    t.peindre(t.rect(46, 97, 108, 97) & robe & (((t.xx) % 3) == 0), V)
    for (x, y, r) in [(62, 112, 4), (90, 122, 3), (78, 104, 2), (70, 128, 3), (96, 108, 2)]:
        tache = t.ell(x - r, y - r, x + r, y + r) | t.ell(x, y - r - 1, x + r + 2, y)
        t.peindre(tache, V)
        t.point(x + r // 2, y + r + 2, V); t.point(x + r // 2, y + r + 3, V)
    t.piece(t.rect(60, 116, 82, 130) & ~t.rect(61, 117, 81, 129), N, bord=None)
    t.peindre(t.rect(60, 116, 82, 117), N)
    t.peindre(t.courbe([(50, 134), (76, 136), (104, 134)]), N)
    # la marmite qui fume
    for (x, y0, h, sg) in ((124, 100, 44, 1), (146, 100, 50, -1), (160, 96, 30, 1)):
        pts = [(x, y0), (x + 10 * sg, y0 - h // 3), (x - 10 * sg, y0 - 2 * h // 3), (x, y0 - h)]
        t.peindre(t.fuseau(pts, 4, 2), B)
        t.peindre(t.courbe([(x, y0 - h), (x + 5 * sg, y0 - h - 6), (x + 1 * sg, y0 - h - 9), (x - 2 * sg, y0 - h - 5)], 2), B)
    corps = t.poly([(108, 112), (164, 112), (162, 146), (154, 154), (118, 154), (110, 146)])
    t.piece(corps, V, ombre=4)
    t.peindre(t.rect(110, 124, 164, 126) & corps, N)
    t.peindre(t.trait([(114, 116), (114, 144)], 2), B)
    for (x0, x1) in ((100, 110), (162, 172)):
        t.peindre(t.ell(x0, 114, x1, 124) & ~t.ell(x0 + 2, 116, x1 - 2, 122), B)
    bord = t.ell(104, 104, 168, 118)
    t.piece(bord, B, ombre=0)
    soupe = t.ell(108, 106, 164, 116)
    t.peindre(soupe, V)
    t.damier(t.bord(soupe, 0, -1, 2), N)
    for (x, y) in [(118, 111), (150, 110), (140, 113)]:
        t.peindre(t.ell(x - 2, y - 1, x + 2, y + 2) & ~t.ell(x - 1, y, x + 1, y + 1), B)
    # la louche dans la marmite
    t.piece(t.trait([(110, 80), (136, 110)], 4), B, ombre=0)
    t.peindre(t.trait([(111, 79), (135, 108)]), V)
    t.piece(t.ell(128, 106, 142, 114) & soupe, B, ombre=0)
    # le bras qui touille
    t.piece(t.fuseau([(104, 80), (116, 98), (108, 92)], 13, 11), V, ombre=2)
    t.piece(t.fuseau([(110, 96), (106, 90), (104, 84)], 11, 10), B, ombre=0)
    poing(t, 100, 74, 116, 88, sens=-1)
    # le bras qui serre la recette sur le cœur
    t.piece(t.fuseau([(48, 80), (40, 100), (62, 94)], 13, 11), V, ombre=2)
    recette = t.poly([(60, 74), (82, 72), (84, 98), (62, 100)])
    t.piece(recette, B, ombre=2)
    for k, y in enumerate(range(78, 96, 4)):
        t.peindre(t.trait([(64, y + 1), (78 - (k % 2) * 4, y)]), V)
    texte(t, 64, 91, "ok", N)
    t.pixels(74, 90, """
.:.:.
:o:o:
:ooo:
.:o:.
""")
    poing(t, 56, 86, 72, 100, sens=1)
    # la tête ronde et le foulard
    tete = t.ell(54, 24, 100, 72)
    t.piece(tete, B, ombre=0)
    oreille(t, 50, 44, 60, 58, gauche=True)
    oreille(t, 94, 44, 104, 58, gauche=False)
    foulard = t.ell(50, 14, 104, 48) & ~t.ell(56, 34, 98, 80) & t.rect(0, 0, 176, 44)
    t.piece(foulard, V, ombre=2)
    for (x, y) in [(60, 30), (70, 22), (82, 20), (94, 26), (66, 38), (90, 34), (78, 28)]:
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1) & foulard, B)
    noeud = t.fuseau([(80, 16), (90, 6), (98, 8)], 7, 3) | t.fuseau([(80, 16), (70, 6), (64, 10)], 7, 3)
    t.piece(noeud, V, ombre=0)
    t.piece(t.ell(76, 11, 84, 19), V, ombre=0)
    t.peindre(t.courbe([(58, 38), (64, 34), (70, 36)]), V)
    t.piece(t.fuseau([(60, 36), (56, 46), (58, 52)], 5, 2), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(94, 36), (98, 46), (96, 52)], 5, 2), V, ombre=0, lumiere=False)
    # les yeux rieurs vers la marmite
    t.peindre(t.courbe([(62, 40), (67, 37), (72, 39)], 2), N)
    t.peindre(t.courbe([(80, 39), (85, 37), (90, 40)], 2), N)
    t.oeil(62, 42, l=11, h=8, regard=(3, 1), cils=-1)
    t.oeil(80, 42, l=11, h=8, regard=(3, 1), cils=1)
    t.peindre(t.trait([(59, 46), (60, 48)]) | t.trait([(93, 46), (92, 48)]), N)
    t.pixels(73, 49, """
..:..
.:oo.
:ooo#
:o:o#
.:::.
""")
    t.damier(t.ell(58, 54, 66, 60), V)
    t.damier(t.ell(88, 54, 96, 60), V)
    # le grand sourire
    t.pixels(64, 56, """
:..................:
.::::::::::::::::::.
.:oooooooooooooooo:.
..:oooooooooooooo:..
...:::########:::...
.....::::::::::.....
""")
    t.peindre(t.courbe([(70, 68), (77, 70), (84, 68)]), N)
    t.sol(160, cx=96)
    return t.image()


# ------------------------------------------------------------------ le Héraut de l'Inspection

def heraut_v3():
    """Le Héraut de l'Inspection, plumet au chapeau et tabard en damier : il sonne de la trompette, les joues
    gonflées, et de la trompette pend la bannière de l'Inspection (une loupe)."""
    t = Toile()
    # les jambes en collant rayé et les souliers pointus
    for (x, d) in ((80, -3), (98, 3)):
        j = t.poly([(x, 122), (x + 13, 122), (x + 13 + d, 151), (x + d, 151)])
        t.piece(j, B, ombre=2)
        t.rayures(j & ~t.bord(j, -1, -1, 1), V, 5, 2, vertical=False)
    s1 = t.poly([(60, 154), (66, 150), (90, 150), (90, 159), (70, 159), (62, 158)])
    t.piece(s1, V, ombre=0)
    t.peindre(t.rect(64, 158, 90, 158), B)
    s2 = t.poly([(98, 150), (122, 150), (128, 154), (126, 158), (98, 159)])
    t.piece(s2, V, ombre=0)
    t.peindre(t.rect(98, 158, 124, 158), B)
    t.damier(t.rect(66, 151, 124, 153) & (s1 | s2), N)
    # le bras du fond
    t.piece(t.fuseau([(108, 84), (114, 104), (104, 112)], 12, 10), V, ombre=2)
    poing(t, 98, 106, 110, 118, sens=-1)
    # le pourpoint vert et le tabard en damier
    corps = t.poly([(74, 74), (112, 74), (118, 92), (116, 126), (72, 126), (70, 92)])
    t.piece(corps, V, ombre=3)
    tabard = t.poly([(78, 76), (108, 76), (112, 128), (102, 136), (94, 130), (86, 136), (74, 128)])
    t.piece(tabard, B, ombre=0)
    dam = tabard & ~t.bord(tabard, -1, -1, 1) & ~t.bord(tabard, 1, 1, 1)
    t.peindre(dam & ((((t.xx - 78) // 6) + ((t.yy - 76) // 6)) % 2 == 0), V)
    t.piece(t.rect(74, 102, 112, 106), N, bord=B, ombre=0)
    t.piece(t.rect(90, 101, 96, 107), B, ombre=0)
    t.peindre(t.rect(92, 103, 94, 105), N)
    t.piece(t.ell(84, 82, 102, 98), B, ombre=0)
    t.peindre(t.ell(87, 85, 97, 95) & ~t.ell(89, 87, 95, 93), N)
    t.peindre(t.trait([(96, 93), (100, 97)], 2), N)
    t.peindre(t.trait([(90, 88), (91, 87)]), V)
    # les épaulettes bouffantes
    for (x0, x1) in ((66, 82), (104, 120)):
        ep = t.ell(x0, 72, x1, 88)
        t.piece(ep, V, ombre=2)
        for x in range(x0 + 3, x1 - 1, 4):
            t.peindre(t.trait([(x, 74), (x, 86)]) & ep, N)
    # les bras qui tiennent la trompette
    t.piece(t.fuseau([(78, 82), (64, 94), (58, 62)], 12, 10), V, ombre=2)
    t.piece(t.fuseau([(70, 80), (50, 76), (42, 56)], 11, 9), V, ombre=2)
    # la bannière de l'Inspection, qui pend de la trompette
    ban = t.poly([(24, 50), (60, 62), (58, 104), (42, 96), (24, 104)])
    t.piece(ban, V, ombre=3)
    t.peindre(t.poly([(28, 56), (56, 66), (54, 98), (42, 92), (28, 98)]) & ~t.poly([(30, 58), (54, 67), (52, 95), (42, 89), (30, 95)]), B)
    t.piece(t.ell(32, 64, 48, 80), B, ombre=0)
    t.peindre(t.ell(35, 67, 45, 77), V)
    t.peindre(t.trait([(37, 69), (39, 68)]), B)
    t.piece(t.trait([(46, 79), (52, 86)], 3), B, ombre=0)
    for (x, y) in [(30, 86), (40, 84)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.trait([(24, 50), (60, 62)], 2), B)
    # la trompette
    tube = t.trait([(72, 60), (28, 44)], 4)
    t.piece(tube, B, ombre=0)
    t.peindre(t.trait([(70, 61), (30, 46)]), V)
    pav = t.poly([(30, 40), (12, 28), (8, 34), (8, 58), (12, 62), (30, 50)])
    t.piece(pav, B, ombre=2)
    t.piece(t.ell(4, 28, 14, 62), V, ombre=0)
    t.peindre(t.ell(6, 32, 12, 58), N)
    t.piece(t.ell(70, 56, 76, 64), V, ombre=0)
    t.peindre(t.ell(44, 48, 52, 56) & ~t.ell(46, 50, 50, 54), B)
    # le son de la trompette
    for (x, y) in [(16, 14), (8, 76), (34, 18), (4, 10)]:
        t.etincelle(x, y)
    poing(t, 34, 44, 48, 58, sens=1)
    poing(t, 52, 50, 66, 64, sens=1)
    # la tête, les joues gonflées
    tete = t.ell(68, 26, 112, 74)
    t.piece(tete, B, ombre=0)
    oreille(t, 104, 42, 114, 58, gauche=False)
    cheveux = t.ell(66, 22, 114, 50) & ~t.ell(66, 36, 106, 80)
    t.piece(cheveux, V, ombre=0)
    t.piece(t.fuseau([(108, 40), (114, 52), (110, 62)], 6, 2), V, ombre=0, lumiere=False)
    for (cx, cy) in ((72, 60), (98, 61)):
        j = t.ell(cx - 9, cy - 7, cx + 9, cy + 7) & tete
        t.contour(j & ~t.bord(j, 0, -1, 4), N)
        t.peindre(j, B)
        t.damier(j & t.bord(j, 1, 1, 2), V)
    # le chapeau à plumet
    plumet = t.fuseau([(100, 24), (120, 8), (146, 2), (156, 10)], 10, 2)
    t.piece(plumet, B, ombre=2)
    t.peindre(t.courbe([(100, 24), (122, 8), (146, 3), (156, 10)]), V)
    for k in range(7):
        x = 110 + k * 6
        t.peindre(t.trait([(x, 14 - k), (x + 4, 10 - k)]) & plumet, V)
    chap = t.poly([(64, 32), (70, 18), (92, 12), (114, 18), (118, 32)])
    t.piece(chap, V, ombre=3)
    t.piece(t.rect(62, 30, 120, 36), B, ombre=0)
    t.peindre(t.rect(62, 33, 120, 33) & (((t.xx) % 3) == 0), V)
    t.piece(t.ell(96, 22, 106, 32), B, ombre=0)
    t.peindre(t.ell(99, 25, 103, 29), V)
    # les sourcils hauts, les yeux qui suivent la trompette
    t.peindre(t.courbe([(72, 42), (77, 39), (82, 40)], 2), N)
    t.peindre(t.courbe([(90, 40), (95, 39), (100, 42)], 2), N)
    t.oeil(72, 44, l=11, h=8, regard=(-3, 0))
    t.oeil(90, 44, l=11, h=8, regard=(-3, 0))
    t.pixels(80, 51, """
..:..
.:o..
:oo#.
:o:#:
.:::.
""")
    # la bouche pincée sur l'embouchure
    t.pixels(80, 61, """
.::::.
:o##o:
.::::.
""")
    t.peindre(t.rect(74, 61, 80, 63), B)
    t.peindre(t.rect(74, 60, 80, 60) | t.rect(74, 64, 80, 64), N)
    t.sol(160, cx=94)
    return t.image()


PORTRAITS = {
    "item_appariteur.gif": appariteur_v3, "item_bibliothecaire.gif": bibliothecaire_v3,
    "item_documentaliste.gif": documentaliste_v3, "item_enlumineur.gif": enlumineur_v3,
    "item_fossoyeur.gif": fossoyeur_v3, "item_gestionnaire.gif": gestionnaire_v3,
    "item_passeur.gif": passeur_v3, "item_sacristain.gif": sacristain_v3,
    "item_serrurier.gif": serrurier_v3, "item_sonneur.gif": sonneur_v3,
    "item_tutrice.gif": tutrice_v3, "item_greffier.gif": greffier_v3,
    "item_cantiniere.gif": cantiniere_v3, "item_heraut.gif": heraut_v3,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
