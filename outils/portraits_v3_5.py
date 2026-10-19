"""Portraits v3, lot 5 : les habitants de Lumen (chapitre 6) et de Port-Aube (chapitre 7).

Même méthode que l'essai validé (voir portrait_v3.py) : une toile de 176 x 170 cases, des pièces peintes de
l'arrière vers l'avant, trois couleurs. Usage :
    python3 outils/portraits_v3_5.py                 (régénère tout le lot)
    python3 outils/portraits_v3_5.py item_gordon     (un ou plusieurs portraits)
"""
import os
import sys
import math
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portrait_v3 import Toile, texte, bezier, dilater, N, V, B  # noqa: E402
from dessiner_lieux import finir  # noqa: E402


# ------------------------------------------------------------------ petites aides communes au lot
def poing(t, x0, y0, x1, y1, doigts=3, vertical=False, ombre=0):
    """Un poing fermé : ellipse blanche cerclée, et les traits des doigts."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=ombre)
    w, h = x1 - x0, y1 - y0
    for k in range(doigts):
        if vertical:
            x = x0 + 3 + k * (w - 6) // max(1, doigts - 1)
            t.peindre(t.trait([(x, y0 + 2), (x, y0 + h // 2)]), N)
        else:
            y = y0 + 3 + k * (h - 6) // max(1, doigts - 1)
            t.peindre(t.trait([(x0 + 2, y), (x0 + w // 2, y)]), N)
    return m


def manchette(t, pts, c=B):
    t.piece(t.poly(pts), c, ombre=0)


def chaussure(t, pts, c=V, lacets=True):
    b = t.poly(pts)
    t.piece(b, c, ombre=0)
    if c == V:
        t.damier(b & t.bord(b, 0, -1, 3), N)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    t.peindre(t.rect(min(xs), max(ys) - 1, max(xs), max(ys)), B if c == V else N)
    return b


def joues(t, pts):
    for (x, y) in pts:
        t.pixels(x, y, "#.#\n.#.")


# ------------------------------------------------------------------ chapitre 6 : Lumen
def allumeur_v3():
    """L'allumeur de réverbères : très grand et très maigre, haut-de-forme cabossé, longue redingote, un grand nez
    et un sourire en coin ; il lève sa perche plus haute que lui, la mèche qui brûle tout en haut."""
    t = Toile()
    # la perche, plantée près des pieds, qui monte plus haut que lui
    perche = t.trait([(130, 160), (144, 34)], 3)
    t.piece(perche, B, ombre=0)
    for y in range(48, 156, 14):
        x = 130 + (160 - y) * 14 // 126
        t.peindre(t.trait([(x - 1, y), (x + 2, y + 1)]), N)
    # le bec de l'allumeur : la virole, le crochet et la mèche qui brûle
    t.piece(t.poly([(139, 22), (150, 22), (149, 36), (140, 36)]), V, ombre=0)
    t.peindre(t.rect(141, 27, 148, 28), N)
    t.peindre(t.courbe([(149, 26), (158, 24), (160, 32), (155, 34)], 2), B)
    flamme = t.fuseau([(144, 22), (140, 16), (146, 10), (143, 2)], 10, 1)
    t.piece(flamme, B, ombre=0)
    t.peindre(t.fuseau([(144, 21), (142, 17), (145, 12)], 5, 1), V)
    for k in range(12):
        a = k * math.pi / 6 + 0.26
        if 1.2 < a < 2.0:
            continue
        r0, r1 = 13, (22 if k % 2 == 0 else 17)
        t.peindre(t.trait([(144 + r0 * math.cos(a), 15 + r0 * math.sin(a)),
                           (144 + r1 * math.cos(a), 15 + r1 * math.sin(a))]), B)
    t.etincelle(120, 10); t.etincelle(170, 50)
    # les jambes, longues et maigres, pantalon rayé
    for (x0, x1) in ((72, 82), (88, 98)):
        j = t.poly([(x0, 118), (x1, 118), (x1 - 1, 150), (x0 + 1, 150)])
        t.piece(j, V, ombre=2)
        t.rayures(j & ~t.bord(j, -1, -1, 1), N, 4, 1)
    chaussure(t, [(62, 150), (84, 150), (84, 160), (56, 160), (56, 156)])
    chaussure(t, [(86, 150), (104, 150), (112, 156), (112, 160), (86, 160)])
    # la longue redingote : basques qui tombent jusqu'aux genoux
    redingote = t.poly([(70, 76), (102, 76), (106, 100), (108, 126), (112, 138), (98, 140), (88, 128), (82, 128),
                        (74, 140), (60, 138), (64, 124), (66, 100)])
    t.piece(redingote, V, ombre=3)
    for pts in ([(78, 112), (74, 126), (66, 136)], [(96, 112), (100, 126), (106, 136)], [(86, 100), (86, 126)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.bord(redingote, 0, 1, 2) & t.rect(0, 130, 176, 170), B)
    # le plastron blanc, le nœud, les revers
    plastron = t.poly([(80, 76), (92, 76), (90, 104), (86, 108), (82, 104)])
    t.piece(plastron, B, ombre=0)
    t.pixels(81, 78, """
:::...:::
:##:::##:
:#o#:#o#:
:##:::##:
:::...:::
""")
    for y in (90, 96, 102):
        t.point(86, y, N)
    for (pts) in ([(72, 76), (80, 76), (84, 100), (76, 92)], [(100, 76), (92, 76), (88, 100), (96, 92)]):
        t.piece(t.poly(pts), B, ombre=0)
        t.damier(t.bord(t.poly(pts), 1, 1, 1), V)
    t.piece(t.rect(66, 104, 106, 108) & redingote, N, bord=N, lumiere=False)
    t.peindre(t.rect(68, 105, 104, 105) & redingote, V)
    t.piece(t.rect(83, 103, 89, 109), B, ombre=0)
    t.peindre(t.rect(85, 105, 87, 107), N)
    for y in (114, 122):
        t.peindre(t.ell(91, y - 1, 94, y + 2), B); t.point(92, y, N)
    # le bras gauche : poing sur la hanche, coude pointu
    bras2 = t.fuseau([(70, 80), (54, 94), (64, 106)], 9, 7)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(60, 100), (68, 98), (70, 104), (62, 107)])
    poing(t, 64, 100, 74, 112, 2)
    # le bras droit levé qui tient la perche
    bras = t.fuseau([(102, 80), (118, 78), (132, 58)], 9, 8)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(112, 80), (118, 76)]), N)
    manchette(t, [(127, 62), (137, 64), (135, 70), (125, 68)])
    poing(t, 128, 46, 144, 62, 3)
    # la tête, longue et étroite
    oreille = t.ell(64, 46, 72, 58)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(67, 49), (65, 52), (67, 55)]), N)
    tete = t.poly([(68, 34), (100, 32), (104, 46), (102, 64), (94, 76), (80, 78), (72, 70), (68, 54)])
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 44, 176, 70), V)
    # les cheveux qui dépassent en mèches sous le chapeau
    for pts in ([(70, 36), (64, 40), (60, 46)], [(70, 38), (66, 44), (64, 50)], [(100, 36), (106, 40), (108, 46)]):
        t.piece(t.fuseau(pts, 5, 1), V, ombre=0, lumiere=False)
    # sourcils en accent, l'un relevé (malice)
    t.piece(t.fuseau([(74, 43), (79, 40), (85, 41)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(90, 41), (95, 37), (101, 38)], 3, 2), V, ombre=0)
    t.oeil(74, 45, l=11, h=9, regard=(3, -1), paupiere=2)
    t.oeil(90, 45, l=11, h=9, regard=(3, -1), paupiere=2)
    t.peindre(t.trait([(102, 50), (104, 48)]) | t.trait([(102, 53), (104, 53)]), N)
    # le grand nez, long et un peu crochu, pointé vers la perche
    t.peindre(t.courbe([(90, 52), (93, 57), (96, 62)]), N)
    t.damier(t.poly([(91, 53), (94, 53), (97, 61), (95, 61)]), V)
    nez = t.ell(90, 60, 102, 69)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(94, 66, N); t.point(95, 66, N)
    t.peindre(t.courbe([(89, 66), (88, 63), (90, 61)]), N)
    # le sourire en coin, la fossette
    t.pixels(78, 70, """
.............:.
:..........::..
.:::::::::::...
..:ooooooo:....
...:::::::.....
""")
    t.peindre(t.courbe([(76, 66), (75, 70), (77, 73)]), N)
    # le haut-de-forme cabossé, penché, une pièce cousue
    bord_h = t.ell(60, 28, 112, 38)
    t.piece(bord_h, V, ombre=0)
    t.damier(t.bord(bord_h, 0, 1, 2), N)
    forme = t.poly([(70, 32), (68, 8), (78, 12), (88, 6), (102, 8), (100, 32)])
    t.piece(forme, V, ombre=3)
    t.peindre(t.courbe([(76, 13), (82, 18), (88, 12)], 2), N)
    t.peindre(t.courbe([(76, 16), (82, 20)]), B)
    t.piece(t.rect(70, 22, 100, 28) & forme, B, ombre=0)
    t.peindre(t.rect(70, 25, 100, 25) & forme, N)
    piece = t.rect(89, 12, 96, 19)
    t.piece(piece, B, ombre=0)
    t.peindre(piece & ~t.bord(piece, -1, 0, 1) & ~t.bord(piece, 1, 0, 1) & (((t.xx + t.yy) % 3) == 0), V)
    for (x, y) in ((89, 12), (96, 12), (89, 19), (96, 19)):
        t.point(x, y, N)
    t.sol(160, cx=88)
    return t.image()


def gordon_v3():
    """Le forgeron : un colosse chauve et luisant, sourcils froncés, une barbe en buisson ; tablier de cuir clouté,
    le marteau levé au-dessus de la tête, des étincelles ; de l'autre main, la pelle à charbon plantée au sol."""
    t = Toile()
    # la pelle à charbon plantée au sol, à gauche
    manche = t.trait([(30, 52), (34, 132)], 3)
    t.piece(manche, B, ombre=0)
    t.piece(t.poly([(26, 44), (38, 44), (38, 52), (26, 52)]) & ~t.rect(29, 46, 35, 50), B, ombre=0)
    pelle = t.poly([(24, 130), (44, 128), (46, 152), (34, 160), (22, 152)])
    t.piece(pelle, V, ombre=2)
    t.peindre(t.trait([(34, 132), (34, 154)]), N)
    t.peindre(t.ell(26, 146, 44, 160) & pelle, N)
    for (x, y) in ((30, 152), (36, 150), (40, 154), (32, 156)):
        t.pixels(x, y, "oo\no#")
    # les jambes trapues, pantalon de toile, bottes
    for (x0, x1) in ((64, 84), (90, 110)):
        j = t.poly([(x0, 124), (x1, 124), (x1, 148), (x0, 148)])
        t.piece(j, V, ombre=3)
    t.peindre(t.trait([(86, 126), (88, 148)]), N)
    for pts in ([(60, 146), (86, 146), (86, 160), (54, 160), (56, 152)], [(88, 146), (114, 146), (120, 152), (120, 160), (88, 160)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b, N)
        t.peindre(t.bord(b, 0, -1, 1), B)
        t.peindre(t.rect(min(p[0] for p in pts), 158, max(p[0] for p in pts), 159), B)
    # le torse massif, chemise blanche aux manches retroussées
    torse = t.poly([(52, 76), (120, 76), (126, 92), (120, 112), (114, 128), (58, 128), (50, 108), (46, 90)])
    t.piece(torse, B, ombre=3)
    # le tablier de cuir, ses bretelles et ses clous
    tablier = t.poly([(62, 86), (110, 86), (114, 132), (106, 140), (66, 140), (58, 132)])
    t.piece(tablier, V, ombre=4)
    for pts in ([(74, 96), (72, 120), (70, 138)], [(98, 96), (100, 120), (102, 138)]):
        t.peindre(t.courbe(pts), N)
    for (x, y) in ((66, 92), (106, 92), (64, 112), (108, 112), (66, 132), (106, 132)):
        t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2), B); t.point(x, y, N)
    t.peindre(t.trait([(62, 88), (58, 76)], 3) | t.trait([(110, 88), (114, 76)], 3), V)
    poche = t.poly([(76, 112), (96, 112), (96, 126), (76, 126)])
    t.peindre(poche & ~t.rect(77, 113, 95, 125), B)
    t.peindre(t.rect(77, 113, 95, 114), B)
    t.pixels(79, 115, """
.ooo..ooo.
.o:o..o:o.
.o:o..o:o.
.o:oooo:o.
..o::::o..
...oooo...
""")
    # le bras gauche, nu et musclé, qui tient la pelle
    bras2 = t.fuseau([(54, 82), (40, 96), (36, 114)], 16, 12)
    t.piece(bras2, B, ombre=3)
    t.peindre(t.courbe([(48, 88), (42, 96), (44, 102)]), N)
    manchette(t, [(46, 78), (60, 80), (56, 92), (42, 90)], V)
    poing(t, 26, 104, 42, 120, 3)
    # le bras droit levé, le biceps gonflé
    bras = t.fuseau([(116, 84), (138, 70), (136, 44)], 18, 13)
    t.piece(bras, B, ombre=3)
    t.peindre(t.courbe([(128, 74), (136, 66), (134, 56)]), N)
    t.peindre(t.courbe([(124, 80), (130, 74)]), V)
    manchette(t, [(112, 78), (126, 74), (130, 86), (118, 90)], V)
    # le marteau : manche et masse, au-dessus de la tête
    manche2 = t.trait([(134, 46), (104, 14)], 4)
    t.piece(manche2, B, ombre=0)
    t.peindre(t.trait([(130, 41), (122, 33)]) | t.trait([(118, 28), (112, 22)]), N)
    # la masse, perpendiculaire au manche : une tête de fer à deux faces
    masse = t.poly([(88, 18), (110, -4), (124, 10), (102, 32)])
    t.piece(masse, V, ombre=3)
    t.piece(t.poly([(84, 16), (90, 10), (104, 24), (98, 30)]), V, ombre=0)
    t.peindre(t.trait([(94, 12), (106, 26)]) | t.trait([(104, 2), (116, 14)]), N)
    t.peindre(t.trait([(92, 16), (110, -2)]), B)
    t.peindre(t.ell(103, 13, 108, 18), N)
    poing(t, 128, 40, 144, 56, 3, vertical=True)
    # les étincelles qui jaillissent
    for (x, y) in ((76, 4), (80, 18), (126, 6), (140, 18), (70, 30), (122, 30)):
        t.etincelle(x, y)
    for (x, y) in ((86, 34), (116, 34), (132, 12)):
        t.etoile(x, y, B, 1)
    # la tête, ronde et chauve, luisante
    oreilles = t.ell(58, 46, 70, 62) | t.ell(108, 46, 120, 62)
    t.piece(oreilles, B, ombre=0)
    tete = t.ell(64, 26, 114, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 30, 176, 60), V)
    t.peindre(t.courbe([(72, 36), (78, 30), (86, 28)], 2), V)
    t.peindre(t.ell(90, 30, 93, 33), V)
    # la barbe en buisson, verte cernée de blanc
    rnd = random.Random(4)
    barbe = t.ell(64, 54, 114, 100) & t.rect(0, 60, 176, 170)
    for (x, y, r) in [(66, 70, 6), (112, 70, 6), (70, 86, 7), (108, 86, 7), (80, 96, 7), (98, 96, 7), (89, 100, 6)]:
        barbe |= t.ell(x - r, y - r, x + r, y + r)
    barbe &= ~t.ell(74, 40, 104, 70)
    t.piece(barbe, V, bord=B, ombre=3, lumiere=False)
    t.contour(dilater(barbe), N)
    for pts in ([(72, 70), (70, 80), (74, 90)], [(80, 74), (78, 86), (82, 96)], [(89, 76), (89, 90), (88, 100)],
                [(98, 74), (100, 86), (96, 96)], [(106, 70), (108, 80), (104, 90)]):
        t.peindre(t.courbe(pts), N)
    for (x, y, sx) in ((70, 88, 1), (80, 96, 1), (98, 96, -1), (108, 88, -1), (89, 100, 1)):
        t.peindre(t.courbe([(x + 3 * sx, y), (x, y - 1), (x - sx, y + 2), (x + sx, y + 4), (x + 4 * sx, y + 3)]), N)
    for pts in ([(76, 72), (75, 80)], [(94, 78), (95, 86)]):
        t.peindre(t.courbe(pts), B)
    # la moustache sur la barbe
    m1 = t.fuseau([(88, 62), (80, 64), (72, 70)], 6, 2)
    m2 = t.fuseau([(90, 62), (98, 64), (106, 70)], 6, 2)
    t.piece(m1 | m2, V, bord=N, ombre=0)
    t.peindre(t.courbe([(86, 64), (78, 66)]) | t.courbe([(92, 64), (100, 66)]), N)
    # sourcils broussailleux, froncés vers le nez
    t.piece(t.fuseau([(72, 40), (80, 41), (87, 46)], 4, 6), V, ombre=0)
    t.piece(t.fuseau([(106, 40), (98, 41), (91, 46)], 4, 6), V, ombre=0)
    t.oeil(74, 45, l=11, h=8, regard=(2, -1), paupiere=3)
    t.oeil(92, 45, l=11, h=8, regard=(2, -1), paupiere=3)
    # le nez fort, en patate
    nez = t.poly([(86, 50), (92, 50), (95, 58), (93, 62), (85, 62), (83, 58)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(86, 60, N); t.point(92, 60, N)
    # la bouche serrée, dents montrées par l'effort
    t.pixels(82, 70, """
.:::::::::::::.
:ooooooooooooo:
:o:o:o:o:o:o:o:
.:::::::::::::.
""")
    t.sol(160, cx=86)
    return t.image()


def charles_v3():
    """Le marchand du Grand Marché : chapeau melon, gros favoris et moustache en guidon, gilet tendu sur la bedaine
    et sa chaîne de montre ; il brandit la balance à plateaux comme un trophée, un colis ficelé sous l'autre bras."""
    t = Toile()
    # les jambes courtes, pantalon à carreaux
    for (x0, x1) in ((70, 86), (92, 108)):
        j = t.poly([(x0, 128), (x1, 128), (x1, 150), (x0 + 1, 150)])
        t.piece(j, V, ombre=2)
        t.peindre(j & ((t.xx % 6) == 0), N)
        t.peindre(j & ((t.yy % 6) == 0), N)
    t.peindre(t.trait([(78, 132), (78, 148)]) & ((t.yy % 6) == 3), B)
    chaussure(t, [(64, 150), (88, 150), (88, 160), (58, 160), (58, 156)])
    chaussure(t, [(90, 150), (110, 150), (118, 156), (118, 160), (90, 160)])
    for (x0, x1) in ((64, 88), (90, 110)):
        t.piece(t.rect(x0 + 2, 146, x1 - 2, 149), B, ombre=0)
    # la redingote ouverte, aux basques larges
    red = t.poly([(60, 78), (116, 78), (124, 104), (126, 136), (112, 140), (90, 132), (66, 140), (52, 136), (54, 104)])
    t.piece(red, V, ombre=4)
    t.peindre(t.courbe([(62, 110), (58, 124), (56, 136)]) | t.courbe([(116, 110), (120, 124), (122, 136)]), N)
    # la bedaine dans son gilet blanc, ses boutons et la chaîne de montre
    gilet = t.ell(66, 82, 112, 134) | t.poly([(74, 78), (104, 78), (108, 96), (70, 96)])
    t.piece(gilet, B, ombre=3)
    t.damier(gilet & t.bord(gilet, 0, 1, 2), V)
    t.peindre(t.trait([(89, 80), (89, 132)]), N)
    for y in (94, 104, 114, 124):
        t.peindre(t.ell(91, y - 1, 95, y + 3), V); t.point(93, y + 1, N)
    t.peindre(t.courbe([(93, 106), (82, 114), (72, 108)], 2) & ((t.xx % 3) != 0), V)
    t.piece(t.ell(66, 104, 74, 112), V, ombre=0)
    t.peindre(t.ell(68, 106, 72, 110), B); t.point(70, 108, N); t.point(70, 107, N)
    for x in (72, 86, 102):
        t.peindre(t.courbe([(x, 120), (x + 3, 124), (x + 6, 122)]), V)
    # le col cassé, la lavallière
    t.piece(t.poly([(78, 76), (100, 76), (96, 84), (82, 84)]), B, ombre=0)
    t.pixels(82, 80, """
::::...::::
:###:::###:
:#o##:##o#:
:###:::###:
::::.:.::::
""")
    # le bras droit, plié, le colis ficelé sous le bras
    bras2 = t.fuseau([(116, 84), (128, 100), (122, 116)], 12, 10)
    t.piece(bras2, V, ombre=2)
    colis = t.poly([(118, 92), (152, 86), (158, 112), (124, 120)])
    t.piece(colis, B, ombre=3)
    t.peindre(t.trait([(136, 89), (141, 116)], 2) | t.trait([(121, 105), (155, 99)], 2), V)
    t.peindre(t.courbe([(138, 102), (130, 92), (136, 90), (139, 102)], 2) | t.courbe([(139, 102), (148, 92), (152, 96), (139, 102)], 2), N)
    t.peindre(t.trait([(126, 112), (132, 111)]) | t.trait([(146, 108), (152, 107)]), N)
    t.pixels(124, 92, "..\n:.\n.:")
    poing(t, 112, 108, 126, 122, 3)
    manchette(t, [(116, 108), (126, 104), (128, 110), (118, 113)])
    # le bras gauche levé qui brandit la balance
    bras = t.fuseau([(62, 84), (46, 70), (44, 46)], 12, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(52, 72), (48, 62)]), N)
    manchette(t, [(38, 48), (50, 48), (50, 54), (38, 54)])
    # la balance : le fléau, l'aiguille, deux plateaux suspendus
    t.piece(t.trait([(44, 40), (44, 10)], 3), B, ombre=0)
    t.piece(t.poly([(40, 8), (48, 8), (46, 4), (42, 4)]), V, ombre=0)
    fleau = t.trait([(14, 16), (74, 10)], 3)
    t.piece(fleau, V, ombre=0)
    t.piece(t.ell(40, 9, 48, 17), B, ombre=0)
    t.point(44, 13, N)
    for (x, y, dy) in ((16, 16, 14), (72, 10, 12)):
        for dx in (-9, 9):
            t.peindre(t.trait([(x, y), (x + dx, y + dy)]), B)
        plat = t.ell(x - 13, y + dy - 3, x + 13, y + dy + 5) & t.rect(0, y + dy, 176, 170)
        t.piece(plat, V, ombre=0)
        t.peindre(t.trait([(x - 12, y + dy), (x + 12, y + dy)]), B)
    for (x, y) in ((10, 26), (16, 24), (22, 26), (13, 22), (19, 21)):
        t.piece(t.ell(x - 3, y - 3, x + 3, y + 3), B, ombre=0)
        t.point(x, y, V)
    t.piece(t.poly([(66, 16), (78, 16), (76, 20), (68, 20)]), B, ombre=0)
    poing(t, 36, 36, 52, 52, 3, vertical=True)
    t.etincelle(30, 4); t.etincelle(90, 26); t.etoile(4, 38, B, 1)
    # la tête ronde et joviale
    t.piece(t.ell(60, 48, 68, 60) | t.ell(112, 48, 120, 60), B, ombre=0)
    tete = t.ell(64, 28, 116, 78)
    t.piece(tete, B, ombre=0)
    # les gros favoris en côtelettes, le long des joues
    for pts in ([(66, 40), (72, 40), (74, 58), (73, 70), (68, 66), (65, 54)], [(114, 40), (108, 40), (106, 58), (107, 70), (112, 66), (115, 54)]):
        f = t.poly(pts)
        t.piece(f, V, ombre=0, lumiere=False)
        t.peindre(t.courbe([(pts[0][0] + (2 if pts[0][0] < 90 else -2), 44), (pts[0][0] + (3 if pts[0][0] < 90 else -3), 58)]), N)
    t.piece(t.fuseau([(77, 42), (82, 39), (88, 41)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(93, 41), (98, 39), (104, 42)], 3, 2), V, ombre=0)
    t.oeil(77, 45, l=11, h=9, regard=(-2, -1), paupiere=2)
    t.oeil(93, 45, l=11, h=9, regard=(-2, -1), paupiere=2)
    t.peindre(t.trait([(75, 54), (77, 56)]) | t.trait([(105, 54), (103, 56)]), N)
    nez = t.ell(85, 52, 96, 61)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(88, 59, N); t.point(93, 59, N)
    # la moustache en guidon, pointes relevées
    m1 = t.fuseau([(89, 63), (84, 65), (79, 64), (77, 59)], 5, 1)
    m2 = t.fuseau([(92, 63), (97, 65), (102, 64), (104, 59)], 5, 1)
    t.piece(m1 | m2, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(88, 64), (84, 65)]) | t.courbe([(93, 64), (97, 65)]), N)
    t.pixels(83, 67, """
:.............:
.:::::::::::::.
.:ooooooooooo:.
..::#######::..
....:::::::....
""")
    joues(t, [(77, 60), (102, 60)])
    # le chapeau melon
    melon = t.ell(70, 6, 110, 40) & t.rect(0, 0, 176, 32)
    t.piece(melon, V, ombre=3)
    t.peindre(t.courbe([(76, 16), (82, 10), (90, 8)], 2), B)
    t.piece(t.rect(70, 26, 110, 31) & melon, B, ombre=0)
    t.peindre(t.rect(70, 28, 110, 28) & melon, N)
    bordm = t.ell(62, 30, 118, 38)
    t.piece(bordm, V, ombre=0)
    t.damier(t.bord(bordm, 0, 1, 2), N)
    t.sol(160, cx=88)
    return t.image()


def betty_v3():
    """La gardienne des mémoires (la Crypte) : une longue chevelure qui tombe jusqu'aux reins, longue robe ; elle
    lève à hauteur d'œil un sablier qu'elle scrute, un œil fermé ; le registre daté serré sous l'autre bras."""
    t = Toile()
    # la longue chevelure, derrière tout le reste
    chev = t.poly([(64, 30), (56, 48), (54, 76), (50, 104), (54, 118), (62, 112), (66, 96), (106, 96), (110, 112),
                   (118, 118), (122, 104), (118, 76), (114, 48), (106, 30)])
    t.piece(chev, V, ombre=3)
    for pts in ([(60, 50), (58, 80), (54, 110)], [(64, 60), (62, 88), (60, 108)], [(110, 50), (112, 80), (116, 110)],
                [(106, 62), (108, 88), (112, 106)]):
        t.peindre(t.courbe(pts), N)
    for pts in ([(58, 54), (56, 70)], [(112, 56), (114, 72)]):
        t.peindre(t.courbe(pts), B)
    # la longue robe, qui s'évase jusqu'au sol
    jupe = t.poly([(68, 104), (102, 104), (114, 128), (126, 158), (46, 158), (56, 128)])
    t.piece(jupe, V, ombre=4)
    for pts in ([(74, 108), (66, 132), (60, 156)], [(86, 108), (86, 134), (84, 156)], [(96, 108), (104, 132), (110, 156)]):
        t.peindre(t.courbe(pts), N)
    ourlet = t.bord(jupe, 0, 1, 7)
    t.piece(ourlet, B, ombre=0)
    for x in range(48, 126, 8):
        t.pixels(x, 152, ":::::\n.:o:.\n..:..\n.:#:.\n:::::")
    for (x, y) in [(70, 120), (98, 124), (62, 142), (90, 140), (110, 144), (78, 132)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.rect(56, 159, 118, 159), N)
    # le corsage blanc, le laçage vert, la ceinture
    corsage = t.poly([(68, 76), (102, 76), (104, 92), (102, 106), (68, 106), (66, 92)])
    t.piece(corsage, B, ombre=2)
    lacage = t.poly([(78, 84), (92, 84), (90, 106), (80, 106)])
    t.piece(lacage, V, ombre=0)
    for y in (88, 94, 100):
        t.peindre(t.trait([(81, y), (89, y + 3)]) | t.trait([(89, y), (81, y + 3)]), B)
    t.peindre(t.trait([(68, 78), (78, 84)]) | t.trait([(102, 78), (92, 84)]), V)
    t.piece(t.rect(64, 104, 106, 108), N, bord=N, lumiere=False)
    t.peindre(t.rect(66, 105, 104, 105), V)
    # le registre daté, serré sous le bras gauche
    bras2 = t.fuseau([(68, 80), (58, 96), (62, 112)], 10, 8)
    t.piece(bras2, V, ombre=2)
    reg = t.poly([(30, 92), (64, 88), (68, 124), (34, 128)])
    t.piece(reg, V, ombre=3)
    t.piece(t.poly([(36, 98), (60, 95), (62, 108), (38, 111)]), B, ombre=0)
    texte(t, 39, 100, "1970", N)
    t.peindre(t.trait([(34, 94), (38, 126)], 2), N)
    for y in (114, 118):
        t.peindre(t.trait([(42, y + 1), (62, y - 2)]) & (((t.xx) % 2) == 0), B)
    t.peindre(t.trait([(31, 126), (66, 122)]), B)
    poing(t, 54, 106, 68, 118, 3)
    # le bras droit levé, qui tient le sablier à hauteur d'œil
    bras = t.fuseau([(102, 82), (122, 96), (126, 72)], 10, 8)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(114, 92), (120, 90)]), N)
    manchette(t, [(118, 74), (132, 74), (132, 80), (118, 80)])
    # le sablier : deux plateaux de bois, quatre colonnes, deux bulbes de verre et le sable qui coule
    for y in (24, 64):
        t.piece(t.rect(112, y, 142, y + 4), V, ombre=0)
        t.peindre(t.rect(114, y + 2, 140, y + 2) & (((t.xx) % 3) == 0), N)
    verre = t.poly([(118, 29), (136, 29), (136, 34), (129, 44), (129, 48), (136, 58), (136, 63), (118, 63), (118, 58),
                    (125, 48), (125, 44), (118, 34)])
    t.piece(verre, B, ombre=0)
    sable_h = t.poly([(121, 37), (133, 37), (128, 44), (126, 44)])
    t.piece(sable_h, V, bord=None, ombre=0, lumiere=False)
    t.peindre(t.rect(127, 45, 127, 58), V)
    sable_b = t.poly([(120, 62), (127, 54), (134, 62)])
    t.peindre(sable_b, V)
    t.peindre(t.trait([(120, 32), (120, 36)]) | t.trait([(120, 59), (121, 56)]), V)
    for x in (113, 140):
        t.piece(t.rect(x, 29, x + 1, 63), B, ombre=0)
    poing(t, 118, 66, 134, 80, 3, vertical=True)
    t.etincelle(150, 30); t.etoile(108, 18, B, 1); t.etoile(148, 56, B, 1)
    # la tête
    tete = t.ell(64, 26, 104, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 66), V)
    # la frange séparée par la raie, et le bandeau
    frange = t.poly([(64, 46), (66, 30), (84, 22), (84, 36), (76, 40), (68, 50)]) | \
        t.poly([(104, 46), (102, 30), (86, 22), (86, 34), (96, 38), (102, 50)])
    t.piece(frange, V, ombre=0)
    t.peindre(t.courbe([(80, 26), (72, 32), (68, 42)]) | t.courbe([(90, 26), (98, 32), (101, 42)]), N)
    band = t.courbe([(64, 30), (84, 22), (104, 30)], 3)
    t.piece(band, B, ombre=0)
    t.pixels(82, 21, ":::::\n:#o#:\n:::::")
    # un œil fermé, plissé ; l'autre grand ouvert sur le sablier
    t.peindre(t.courbe([(68, 44), (73, 42), (79, 45)], 2), N)
    t.peindre(t.courbe([(68, 51), (73, 54), (79, 51)], 2), N)
    t.point(67, 50, N); t.point(66, 49, N)
    t.peindre(t.courbe([(87, 39), (93, 35), (100, 37)], 2), N)
    t.oeil(87, 42, l=12, h=10, regard=(3, 0), paupiere=2, cils=1)
    nez = t.poly([(84, 52), (86, 52), (88, 60), (84, 62), (82, 61)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(82, 59, "..:..\n.:..:\n:::::")
    # la bouche en moue, poussée sur le côté
    t.pixels(80, 65, """
.......:.
.:::::::.
:o####:..
.:::::...
""")
    joues(t, [(70, 58), (96, 58)])
    t.sol(160, cx=86)
    return t.image()


def donald_v3():
    """L'astronome des mesures (l'Observatoire) : chapeau pointu étoilé qui penche, longue barbe, robe semée
    d'étoiles ; l'œil vissé à sa lunette braquée vers le haut, le dos cambré, la main sur les reins ; le carnet de
    courbes pend à sa ceinture."""
    t = Toile()
    # le bras gauche, plié derrière, la main sur les reins
    bras2 = t.fuseau([(66, 82), (50, 96), (60, 110)], 11, 9)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(52, 102), (62, 100), (64, 106), (54, 108)])
    poing(t, 58, 104, 70, 116, 2)
    # la longue robe, cambrée, semée d'étoiles
    robe = t.poly([(66, 78), (104, 80), (112, 104), (120, 130), (128, 156), (46, 156), (54, 128), (58, 104)])
    t.piece(robe, V, ombre=4)
    for pts in ([(68, 110), (60, 134), (56, 154)], [(84, 112), (84, 134), (82, 154)], [(102, 112), (110, 134), (116, 154)]):
        t.peindre(t.courbe(pts), N)
    for (x, y) in [(64, 120), (94, 124), (72, 140), (108, 142), (60, 96), (98, 96), (82, 128), (118, 120)]:
        t.etoile(x, y, B, 1)
    for (x, y) in [(76, 104), (90, 138), (66, 146)]:
        t.etoile(x, y, B, 2)
    ourlet = t.bord(robe, 0, 1, 7)
    t.piece(ourlet, B, ombre=0)
    for x in range(50, 126, 10):
        t.pixels(x, 150, "..::.\n.:...\n.:...\n..::.")
        t.etoile(x + 7, 152, V, 1)
    # les babouches pointues
    for pts in ([(60, 156), (80, 156), (80, 162), (52, 162), (48, 158)], [(90, 156), (110, 156), (120, 158), (116, 162), (90, 162)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b & t.bord(b, 0, -1, 2), N)
    # la ceinture de corde, le carnet de courbes qui pend
    t.piece(t.courbe([(58, 106), (84, 110), (110, 106)], 3), B, ombre=0)
    t.peindre(t.trait([(96, 110), (98, 118)]), B)
    carnet = t.poly([(90, 118), (110, 116), (112, 138), (92, 140)])
    t.piece(carnet, B, ombre=2)
    t.peindre(t.trait([(91, 120), (93, 138)], 2), V)
    t.peindre(t.courbe([(96, 132), (100, 120), (104, 134), (108, 122)]), N)
    t.peindre(t.trait([(96, 134), (109, 133)]) | t.trait([(96, 122), (96, 134)]), V)
    # la lunette, braquée vers le ciel, en trois tubes
    for (a, b, e, c) in (((98, 50), (118, 38), 6, B), ((118, 38), (140, 24), 9, V), ((140, 24), (166, 8), 13, V)):
        m = t.trait([a, b], e)
        t.piece(m, c, ombre=0 if c == B else 2)
    for (x, y) in ((118, 38), (140, 24), (164, 9)):
        t.piece(t.trait([(x - 4, y - 6), (x + 4, y + 6)], 3), B, ombre=0)
    t.peindre(t.trait([(126, 30), (136, 24)]) | t.trait([(146, 18), (158, 11)]), B)
    for (x, y) in ((150, 30), (170, 22), (130, 6), (110, 14)):
        t.etincelle(x, y)
    t.etoile(162, 40, B, 1); t.etoile(100, 4, B, 1)
    # le bras droit qui tient la lunette
    bras = t.fuseau([(104, 86), (124, 72), (130, 40)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(116, 80), (124, 76)]), N)
    manchette(t, [(122, 44), (134, 44), (134, 50), (122, 50)])
    poing(t, 122, 26, 138, 44, 3, vertical=True)
    # la tête, renversée vers la lunette
    t.piece(t.ell(60, 52, 70, 64), B, ombre=0)
    t.peindre(t.courbe([(63, 55), (62, 58), (63, 61)]), N)
    tete = t.ell(66, 34, 104, 78)
    t.piece(tete, B, ombre=0)
    # la longue barbe blanche, sur la robe verte
    barbe = t.poly([(70, 62), (78, 70), (96, 70), (104, 60), (104, 74), (100, 92), (92, 108), (88, 118), (90, 126),
                    (84, 120), (80, 106), (72, 90)])
    t.piece(barbe, B, ombre=2)
    for pts in ([(78, 76), (80, 92), (86, 108)], [(88, 74), (90, 94), (88, 112)], [(98, 74), (96, 90), (92, 102)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(88, 118), (86, 124), (90, 126)]), N)
    m1 = t.fuseau([(86, 66), (78, 68), (72, 66)], 6, 1)
    m2 = t.fuseau([(88, 66), (96, 68), (102, 64)], 6, 1)
    t.piece(m1 | m2, B, ombre=0)
    t.peindre(t.courbe([(84, 68), (76, 68)]) | t.courbe([(90, 68), (98, 66)]), N)
    t.pixels(84, 70, ".:::.\n:###:\n.:::.")
    # l'œil gauche fermé, plissé de concentration ; l'autre vissé à l'oculaire
    t.piece(t.fuseau([(68, 46), (74, 43), (81, 46)], 3, 4), V, ombre=0)
    t.pixels(69, 49, """
...::::::..
.::......::
:..........
""")
    for (x0, y0) in ((68, 49), (69, 46)):
        t.point(x0, y0, N)
    t.piece(t.fuseau([(86, 42), (93, 39), (100, 41)], 4, 3), V, ombre=0)
    ocul = t.ell(86, 44, 102, 60)
    t.piece(ocul, V, ombre=0)
    t.peindre(t.ell(89, 47, 99, 57), N)
    t.peindre(t.ell(91, 49, 97, 55) & ~t.ell(92, 50, 96, 54), V)
    t.point(93, 51, B); t.point(94, 51, B)
    nez = t.ell(76, 54, 88, 64)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(79, 62, N); t.point(84, 62, N)
    m1 = t.fuseau([(82, 65), (74, 68), (68, 64)], 7, 1)
    m2 = t.fuseau([(84, 65), (92, 68), (100, 64)], 7, 1)
    t.piece(m1 | m2, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(80, 67), (74, 67)]) | t.courbe([(86, 67), (93, 66)]), N)
    t.pixels(80, 70, ".:::.\n:###:\n.:::.")
    # le chapeau pointu, qui penche en arrière, la pointe pliée
    cone = t.fuseau([(82, 30), (70, 14), (52, 4), (34, 8)], 34, 2)
    t.piece(cone, V, ombre=3)
    t.peindre(t.courbe([(64, 22), (58, 14), (50, 10)]), N)
    for (x, y) in ((74, 20), (60, 12), (82, 14)):
        t.etoile(x, y, B, 1)
    t.pixels(30, 4, "..o..\n.ooo.\nooooo\n.o.o.")
    bordc = t.poly([(58, 36), (64, 27), (100, 23), (110, 29), (100, 36), (66, 40)])
    t.piece(bordc, V, ombre=0)
    t.damier(t.bord(bordc, 0, 1, 2), N)
    t.piece(t.poly([(64, 29), (98, 25), (96, 21), (70, 23)]), B, ombre=0)
    t.pixels(80, 22, ".:.\n:#:\n.:.")
    t.sol(162, cx=86)
    return t.image()


def dorothy_v3():
    """La gardienne du Puits aux deux sources : deux tresses qui volent, taches de rousseur, la langue tirée sous
    l'effort ; un joug sur les épaules : à gauche le seau plein, à droite le seau percé qui fuit goutte à goutte."""
    t = Toile()
    # les cordes et les seaux
    for x in (20, 156):
        t.peindre(t.trait([(x, 76), (x - 8, 108)]) | t.trait([(x, 76), (x + 8, 108)]), B)
    for (x0, plein) in ((2, True), (138, False)):
        seau = t.poly([(x0, 108), (x0 + 36, 108), (x0 + 32, 140), (x0 + 4, 140)])
        t.piece(seau, V, ombre=3)
        for y in (114, 132):
            t.piece(t.rect(x0 + 1, y, x0 + 35, y + 2) & seau, B, ombre=0)
        t.peindre(t.rect(x0 + 6, 118, x0 + 8, 128) & (((t.yy) % 2) == 0), B)
        t.piece(t.ell(x0 - 2, 104, x0 + 38, 112), B if plein else N, ombre=0)
        if plein:
            t.peindre(t.ell(x0 + 2, 106, x0 + 34, 110), V)
            t.peindre(t.courbe([(x0 + 6, 108), (x0 + 12, 106), (x0 + 18, 108), (x0 + 24, 106), (x0 + 30, 108)]), B)
            t.pixels(x0 + 8, 96, "..o...o.\n.o#o.o#o\n..o...o.")
        else:
            t.peindre(t.ell(x0 + 4, 107, x0 + 32, 110), V)
            for (x, y) in ((x0 + 10, 124), (x0 + 22, 128), (x0 + 16, 136)):
                t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), N)
                t.point(x, y, B)
    for (x, y) in ((146, 144), (160, 142), (152, 150)):
        t.pixels(x, y, ".o.\noVo\n.o.".replace('V', '#'))
    t.piece(t.ell(138, 156, 170, 160), V, ombre=0)
    t.peindre(t.trait([(144, 157), (164, 157)]), B)
    # le joug sur les épaules
    joug = t.courbe([(8, 80), (60, 68), (88, 66), (116, 68), (168, 80)], 6)
    t.piece(joug, V, ombre=2)
    t.peindre(t.courbe([(10, 78), (60, 66), (88, 64), (116, 66), (166, 78)]), B)
    for x in (20, 156):
        t.piece(t.ell(x - 4, 72, x + 4, 80), B, ombre=0)
        t.point(x, 76, N)
    # les jambes fléchies, bas rayés, sabots
    for pts in ([(72, 122), (84, 122), (78, 138), (72, 150), (62, 150), (68, 136)], [(92, 122), (104, 122), (110, 136), (114, 150), (104, 150), (98, 136)]):
        j = t.poly(pts)
        t.piece(j, B, ombre=2)
        t.rayures(j, V, 4, 2, vertical=False)
    for pts in ([(56, 148), (74, 148), (76, 158), (52, 158)], [(102, 148), (120, 148), (124, 158), (100, 158)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(t.bord(b, 0, 1, 2), N)
        t.peindre(t.trait([(pts[0][0] + 2, 150), (pts[1][0] - 2, 150)]), B)
    # la robe courte et le tablier
    robe = t.poly([(70, 78), (106, 78), (110, 100), (118, 126), (58, 126), (66, 100)])
    t.piece(robe, V, ombre=3)
    for pts in ([(72, 104), (66, 124)], [(104, 104), (110, 124)]):
        t.peindre(t.courbe(pts), N)
    tablier = t.poly([(76, 96), (100, 96), (106, 122), (70, 122)])
    t.piece(tablier, B, ombre=2)
    t.peindre(t.bord(tablier, 0, 1, 2) & ((t.xx % 4) < 2), V)
    t.piece(t.poly([(80, 104), (96, 104), (96, 114), (80, 114)]), B, ombre=0)
    t.pixels(84, 106, "..:.:..\n.:#:#:.\n.:###:.\n..:#:..\n...:...")
    t.peindre(t.rect(70, 94, 106, 96) & robe, N)
    # le col, les bras levés qui tiennent le joug
    t.piece(t.poly([(76, 76), (100, 76), (96, 84), (88, 88), (80, 84)]), B, ombre=0)
    for (pts, mpts) in (([(72, 82), (56, 84), (48, 72)], (40, 62, 56, 76)), ([(104, 82), (120, 84), (128, 72)], (120, 62, 136, 76))):
        b = t.fuseau(pts, 10, 8)
        t.piece(b, V, ombre=2)
        poing(t, *mpts, 3, vertical=True)
    # les tresses qui volent, nattées
    for (sx, pts) in ((-1, [(70, 40), (56, 34), (44, 22), (34, 18)]), (1, [(106, 40), (120, 34), (132, 22), (142, 18)])):
        c = bezier(pts, 6)
        for k, (x, y) in enumerate(c[:-1]):
            r = 7.5 - k * 0.6
            m = t.ell(x - r, y - r * 0.8, x + r, y + r * 0.8)
            t.piece(m, V, ombre=0, lumiere=False)
            t.peindre(t.courbe([(x - r + 1, y - 1), (x, y + 2), (x + r - 1, y - 1)]) & m, N)
            t.point(int(x - sx * 2), int(y - 2), B)
        xe, ye = c[-1]
        t.pixels(int(xe) - 4, int(ye) - 3, """
:::..:::
:oo::oo:
:o#oo#o:
:oo::oo:
:::..:::
""")
    # la tête
    tete = t.ell(66, 26, 110, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 66), V)
    cheveux = (t.ell(64, 22, 112, 50) & ~t.ell(70, 36, 106, 80)) | t.poly([(88, 24), (100, 30), (106, 40), (92, 36)]) \
        | t.poly([(88, 24), (76, 30), (70, 40), (82, 36)])
    t.piece(cheveux, V, ombre=2)
    t.peindre(t.trait([(88, 24), (88, 30)]), N)
    t.peindre(t.courbe([(86, 28), (78, 32), (72, 40)]) | t.courbe([(90, 28), (98, 32), (104, 40)]), N)
    t.peindre(t.courbe([(74, 30), (82, 26)]) | t.courbe([(96, 26), (104, 30)]), B)
    # l'effort : sourcils froncés, un œil fermé, la langue tirée, la goutte de sueur
    t.piece(t.fuseau([(72, 44), (78, 43), (84, 47)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(104, 44), (98, 43), (92, 47)], 2, 4), V, ombre=0)
    t.oeil(72, 48, l=11, h=9, regard=(0, 0), paupiere=2, cils=-1)
    t.peindre(t.courbe([(93, 50), (98, 53), (103, 50)], 2), N)
    t.peindre(t.trait([(104, 49), (106, 47)]) | t.trait([(104, 52), (107, 52)]), N)
    nez = t.poly([(86, 54), (89, 54), (92, 60), (88, 62), (84, 61)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(84, 60, "..:..\n.:..:\n:::::")
    for (x, y) in ((74, 60), (78, 62), (76, 58), (98, 60), (102, 62), (100, 58)):
        t.point(x, y, V)
    t.pixels(80, 64, """
:.............
.:::::::::::..
..:oooooo##:..
...::::::##:..
.........::...
""")
    t.pixels(114, 36, "..:..\n.:o:.\n:ooo:\n:oo#:\n.:::.")
    t.sol(160, cx=88)
    return t.image()


def horloger_v3():
    """L'horloger de la cité : barbe en pointe, lunettes rondes, tablier ; le grand réveil à deux cloches qu'il
    tient dans ses bras se met à sonner (des traits de vibration), et il grimace, un œil fermé, l'épaule remontée."""
    t = Toile()
    # les jambes, le pantalon, les souliers
    for (x0, x1) in ((60, 74), (78, 92)):
        j = t.poly([(x0, 124), (x1, 124), (x1, 150), (x0, 150)])
        t.piece(j, V, ombre=2)
    chaussure(t, [(54, 150), (76, 150), (76, 160), (48, 160), (48, 156)])
    chaussure(t, [(78, 150), (96, 150), (104, 156), (104, 160), (78, 160)])
    # le corps penché loin du réveil, gilet et tablier
    corps = t.poly([(52, 80), (94, 76), (104, 96), (100, 128), (56, 128), (48, 104)])
    t.piece(corps, B, ombre=3)
    gilet = t.poly([(58, 84), (90, 82), (96, 100), (94, 112), (58, 112), (54, 100)])
    t.piece(gilet, V, ombre=2)
    t.peindre(t.trait([(74, 84), (76, 112)]), N)
    for y in (90, 98, 106):
        t.peindre(t.ell(70, y - 1, 73, y + 2), B); t.point(71, y, N)
    t.peindre(t.courbe([(72, 96), (64, 102), (58, 100)], 1) & (((t.xx) % 2) == 0), B)
    tablier = t.poly([(56, 108), (98, 106), (102, 140), (54, 142)])
    t.piece(tablier, V, ombre=3)
    poche = t.rect(62, 118, 80, 132)
    t.piece(poche, B, ombre=0)
    t.peindre(t.trait([(66, 112), (66, 122)], 2) | t.trait([(72, 110), (74, 122)], 2), B)
    t.peindre(t.rect(65, 110, 67, 112) | t.rect(72, 108, 74, 110), N)
    t.pixels(64, 124, ":::::::::::::::\n.:..:..:..:..:.")
    # le col, le nœud papillon
    t.piece(t.poly([(64, 76), (88, 74), (86, 82), (66, 84)]), B, ombre=0)
    t.pixels(70, 79, ":::.:::\n:##:##:\n:::.:::")
    # le grand réveil à deux cloches, tenu à bras-le-corps
    for cx in (110, 146):
        cl = t.ell(cx - 11, 38, cx + 11, 60) & t.rect(0, 0, 176, 52)
        t.piece(cl, V, ombre=2)
        t.piece(t.rect(cx - 12, 51, cx + 12, 54), V, ombre=0)
        t.piece(t.ell(cx - 2, 33, cx + 2, 38), B, ombre=0)
    t.piece(t.trait([(128, 36), (128, 52)], 2), B, ombre=0)
    t.piece(t.ell(122, 30, 134, 38), V, ombre=0)
    corps_r = t.ell(98, 50, 158, 110)
    t.piece(corps_r, V, ombre=3)
    cadran = t.ell(104, 56, 152, 104)
    t.piece(cadran, B, ombre=0)
    for k in range(12):
        a = k * math.pi / 6
        r0, r1 = (18, 22) if k % 3 else (15, 22)
        t.peindre(t.trait([(128 + r0 * math.cos(a), 80 + r0 * math.sin(a)), (128 + r1 * math.cos(a), 80 + r1 * math.sin(a))],
                          2 if k % 3 == 0 else 1), N)
    t.peindre(t.trait([(128, 80), (128, 64)], 2) | t.trait([(128, 80), (139, 84)], 2), N)
    t.peindre(t.trait([(128, 80), (118, 70)]), V)
    t.piece(t.ell(126, 78, 130, 82), V, ombre=0)
    for x in (108, 142):
        t.piece(t.poly([(x, 106), (x + 6, 106), (x + 8, 116), (x - 2, 116)]), V, ombre=0)
    # les traits de vibration, la sonnerie
    for (cx, sx) in ((110, -1), (146, 1)):
        for r in (16, 22):
            t.peindre(t.courbe([(cx + sx * r * 0.4, 46 - r), (cx + sx * r, 40 - r * 0.6), (cx + sx * (r + 4), 48)], 1), B)
    for (x, y) in ((96, 22), (164, 28), (128, 16), (166, 70), (92, 46)):
        t.etincelle(x, y)
    for (x0, y0) in ((160, 92), (88, 64)):
        t.peindre(t.trait([(x0, y0), (x0 + 4, y0 - 3), (x0, y0 - 6), (x0 + 4, y0 - 9)]), B)
    # les bras qui serrent le réveil
    bras2 = t.fuseau([(94, 84), (110, 112), (130, 112)], 11, 9)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.courbe([(102, 104), (108, 110)]), N)
    poing(t, 126, 104, 142, 118, 3, vertical=True)
    # la tête, rejetée en arrière, l'épaule droite remontée
    epaule = t.ell(84, 64, 104, 90)
    t.piece(epaule, B, ombre=2)
    tete = t.ell(42, 28, 86, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, -1, 0, 2) & t.rect(0, 40, 176, 66), V)
    for pts in ([(44, 46), (36, 40), (34, 50)], [(46, 54), (38, 54), (38, 62)], [(84, 42), (92, 36), (94, 44)]):
        t.piece(t.fuseau(pts, 6, 2), V, ombre=0, lumiere=False)
    # le crâne dégarni, la loupe frontale d'horloger relevée sur le front
    band = t.courbe([(43, 36), (64, 31), (85, 34)], 3)
    t.piece(band, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(44, 35), (64, 30), (84, 33)]), B)
    t.piece(t.trait([(62, 30), (60, 24)], 3), V, ombre=0)
    t.piece(t.ell(56, 26, 64, 33), B, ombre=0)
    t.point(60, 29, N)
    lentille = t.ell(48, 10, 72, 30)
    t.piece(lentille, V, ombre=2)
    verre = t.ell(52, 14, 68, 26)
    t.piece(verre, B, bord=N, ombre=0)
    t.peindre(t.courbe([(55, 20), (57, 17), (61, 16)]), V)
    t.point(64, 22, V); t.point(65, 23, V)
    t.etoile(76, 12, B, 1)
    # la barbe en pointe
    barbe = t.poly([(52, 66), (64, 72), (76, 66), (72, 80), (64, 92), (60, 82)])
    t.piece(barbe, V, ombre=0)
    t.peindre(t.courbe([(64, 74), (64, 88)]) | t.courbe([(58, 72), (62, 84)]), N)
    # les sourcils en accent, la grimace : un œil fermé fort, l'autre grand ouvert
    t.piece(t.fuseau([(48, 40), (54, 37), (60, 39)], 3, 4), V, ombre=0)
    t.piece(t.fuseau([(66, 42), (72, 38), (80, 40)], 4, 2), V, ombre=0)
    t.oeil(48, 44, l=11, h=10, regard=(-2, 0), paupiere=1)
    t.peindre(t.trait([(68, 48), (73, 50), (68, 52)], 2) | t.trait([(74, 50), (79, 50)]), N)
    for (x0, y0, x1, y1) in ((47, 43, 60, 55), (65, 43, 78, 55)):
        anneau = t.ell(x0, y0, x1, y1) & ~t.ell(x0 + 1, y0 + 1, x1 - 1, y1 - 1)
        t.peindre(anneau, N)
    t.peindre(t.trait([(60, 48), (65, 48)]) | t.trait([(78, 47), (84, 46)]), N)
    t.peindre(t.trait([(49, 46), (51, 45)]), V)
    nez = t.poly([(60, 52), (64, 52), (66, 58), (62, 61), (57, 59)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 0, 1, 1), V)
    t.pixels(54, 62, """
..:::::::::.
.:ooooooooo:
.:o:o:o:o:o:
..:::::::::.
""")
    t.peindre(t.trait([(52, 62), (50, 66)]) | t.trait([(68, 60), (72, 58)]), N)
    t.sol(160, cx=86)
    return t.image()


def ida_v3():
    """L'imprimeuse de la Gazette : visière verte, mèche rebelle, une tache d'encre sur le nez ; elle lit, bouche
    bée, la feuille toute fraîche qu'elle tient à bout de bras, le tablier constellé d'encre ; le rouleau à ses
    pieds, qui déborde."""
    t = Toile()
    # le rouleau de papier couché, et la bande qui déborde jusqu'aux pieds
    bande = t.poly([(30, 154), (126, 150), (126, 158), (30, 160)])
    t.piece(bande, B, ombre=0)
    t.peindre(t.trait([(40, 156), (120, 153)]) & (((t.xx) % 3) == 0), V)
    t.peindre(t.courbe([(30, 154), (22, 150), (18, 156), (28, 160)], 2), B)
    rouleau = t.poly([(120, 124), (156, 124), (156, 158), (120, 158)])
    t.piece(rouleau, B, ombre=3)
    t.peindre(t.trait([(124, 130), (150, 130)]) | t.trait([(124, 146), (150, 146)]), V)
    bout = t.ell(146, 122, 168, 160)
    t.piece(bout, B, ombre=0)
    for r in (8, 5, 2):
        t.peindre(t.ell(157 - r, 141 - r * 2, 157 + r, 141 + r * 2) & ~t.ell(158 - r, 142 - r * 2, 156 + r, 140 + r * 2), V)
    t.piece(t.ell(154, 136, 160, 146), N, bord=N, lumiere=False)
    # les jambes, les bottines lacées
    for (x0, x1) in ((64, 76), (82, 94)):
        j = t.poly([(x0, 126), (x1, 126), (x1, 148), (x0, 148)])
        t.piece(j, B, ombre=2)
    for pts in ([(58, 144), (78, 144), (78, 154), (54, 154), (54, 150)], [(80, 144), (98, 144), (104, 150), (104, 154), (80, 154)]):
        b = chaussure(t, pts)
        t.pixels(pts[0][0] + 6, 145, ":.:\n.:.\n:.:")
    # la robe et le tablier constellé d'encre
    robe = t.poly([(62, 80), (98, 80), (106, 104), (110, 132), (50, 132), (54, 104)])
    t.piece(robe, V, ombre=3)
    tablier = t.poly([(66, 96), (96, 96), (102, 130), (60, 130)])
    t.piece(tablier, B, ombre=2)
    for (x, y, r) in ((72, 104, 2), (88, 112, 3), (70, 120, 2), (94, 122, 2), (80, 100, 1), (82, 126, 1)):
        t.peindre(t.ell(x - r, y - r, x + r, y + r), N)
        t.point(x + r + 1, y + 1, N)
    for (x, y) in ((78, 116), (92, 104), (66, 112)):
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), V)
    t.piece(t.rect(60, 94, 102, 97) & robe, N, bord=N, lumiere=False)
    t.pixels(78, 94, ":::::\n:o:o:\n:::::")
    # le col blanc
    t.piece(t.poly([(68, 78), (92, 78), (88, 86), (80, 82), (72, 86)]), B, ombre=0)
    # les deux bras tendus qui tiennent la feuille
    for (pts, mp) in (([(96, 84), (112, 74), (114, 58)], (106, 50, 120, 62)), ([(66, 84), (84, 64), (104, 26)], (98, 16, 112, 30))):
        b = t.fuseau(pts, 10, 8)
        t.piece(b, V, ombre=2)
        t.peindre(t.courbe([pts[1], (pts[1][0] + 4, pts[1][1] - 6)]) & b & (((t.yy) % 2) == 0), N)
    # la feuille toute fraîche de la Gazette, encore chaude
    feuille = t.poly([(108, 8), (164, 4), (168, 62), (112, 66)])
    t.piece(feuille, B, ombre=3)
    texte(t, 116, 10, "gazette", N, 1)
    t.peindre(t.trait([(114, 18), (162, 15)]), N)
    t.piece(t.poly([(116, 21), (160, 18), (161, 26), (117, 29)]), V, ombre=0)
    texte(t, 124, 21, "extra", B)
    t.peindre(t.poly([(117, 33), (136, 32), (137, 46), (118, 47)]), V)
    t.pixels(120, 35, "...oo..\n..o..o.\n.o....o\nooooooo")
    for k in range(5):
        y = 32 + k * 6
        t.peindre(t.trait([(140, y), (162, y - 1)]) & (((t.xx) % 4) != 0), N)
    for k in range(2):
        y = 52 + k * 6
        t.peindre(t.trait([(118, y + 1), (162, y - 2)]) & (((t.xx) % 5) != 0), N)
    for x in (122, 140, 158):
        t.peindre(t.courbe([(x, 2), (x - 3, -2), (x + 1, -5), (x - 2, -8)]), B)
    t.etincelle(102, 6); t.etoile(172, 70, B, 1)
    poing(t, 106, 50, 120, 62, 3, vertical=True)
    poing(t, 100, 16, 114, 30, 3, vertical=True)
    # la tête, le menton tiré par la surprise
    tete = t.ell(52, 32, 94, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, -1, 0, 2) & t.rect(0, 46, 176, 72), V)
    cheveux = t.poly([(50, 40), (52, 66), (58, 70), (62, 50), (90, 46), (94, 60), (98, 52), (94, 36), (72, 30)])
    t.piece(cheveux, V, ombre=0)
    t.peindre(t.courbe([(54, 46), (56, 62)]) | t.courbe([(94, 42), (95, 52)]), N)
    # la visière verte
    band = t.poly([(52, 38), (94, 34), (96, 40), (54, 44)])
    t.piece(band, V, ombre=0)
    vis = t.poly([(56, 40), (100, 34), (112, 40), (96, 46), (62, 48)])
    t.piece(vis, V, ombre=0, lumiere=False)
    t.damier(vis & t.bord(vis, 0, 1, 2), N)
    for x in range(64, 106, 6):
        t.peindre(t.trait([(x, 41 - (x - 60) // 8), (x + 2, 45 - (x - 60) // 8)]) & vis, N)
    t.peindre(t.trait([(60, 42), (100, 36)]), B)
    # la mèche rebelle
    for pts in ([(68, 38), (62, 30), (60, 22)], [(74, 37), (74, 26), (82, 20)], [(80, 37), (88, 30), (94, 30)]):
        t.piece(t.fuseau(pts, 6, 1), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(74, 34), (75, 26), (80, 22)]), N)
    t.peindre(t.courbe([(66, 34), (62, 26)]), N)
    # bouche bée, sourcils très hauts, les yeux qui lisent
    t.peindre(t.courbe([(58, 52), (63, 49), (69, 51)], 2), N)
    t.peindre(t.courbe([(75, 51), (81, 48), (87, 50)], 2), N)
    t.oeil(58, 54, l=11, h=10, regard=(3, -1), paupiere=1, cils=-1)
    t.oeil(75, 54, l=11, h=10, regard=(3, -1), paupiere=1, cils=1)
    nez = t.poly([(72, 64), (75, 64), (78, 70), (74, 72), (70, 71)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(70, 69, "..:..\n.:..:\n:::::")
    t.pixels(72, 64, ".::\n:::")
    t.pixels(68, 73, """
..:::::..
.:#####:.
:#:::::#:
.:#####:.
..:::::..
""")
    joues(t, [(60, 68), (84, 68)])
    t.sol(160, cx=88)
    return t.image()


# ------------------------------------------------------------------ chapitre 7 : Port-Aube
def amina_v3():
    """La gardienne de l'Arche : sur sa colline, la capuche rabattue par le vent ; elle tient haut une lampe et
    regarde au loin, la main en visière ; le coffre scellé à ses pieds, cerclé de fer, le sceau au milieu."""
    t = Toile()
    # les traits du vent
    for (x0, x1, y) in ((4, 30, 70), (12, 40, 86), (140, 172, 40), (150, 174, 60), (2, 22, 104)):
        t.peindre(t.rect(x0, y, x1, y + 1), B)
        t.peindre(t.rect(x1 + 4, y, x1 + 6, y + 1), B)
    # la cape qui claque au vent, derrière tout
    cape = t.poly([(70, 72), (104, 72), (124, 80), (150, 88), (166, 104), (154, 110), (160, 124), (142, 126), (146, 140),
                   (118, 142), (96, 150), (60, 150)])
    t.piece(cape, V, ombre=4)
    for pts in ([(104, 80), (130, 96), (156, 108)], [(100, 96), (124, 112), (144, 126)], [(96, 112), (110, 130), (120, 142)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.bord(cape, 0, 1, 2) & t.rect(110, 0, 176, 170), B)
    # le coffre scellé, cerclé de fer
    coffre = t.poly([(112, 128), (162, 128), (162, 158), (112, 158)])
    t.piece(coffre, V, ombre=3)
    couvercle = t.ell(110, 116, 164, 140) & t.rect(0, 0, 176, 128)
    t.piece(couvercle, V, ombre=2)
    t.peindre(t.rect(113, 129, 161, 130), N)
    for x in (120, 152):
        t.piece(t.rect(x - 2, 118, x + 2, 158) & (coffre | couvercle), B, ombre=0)
        for y in (124, 136, 148):
            t.point(x, y, N)
    for x in range(116, 160, 8):
        t.peindre(t.trait([(x, 142), (x + 3, 142)]), N)
    sceau = t.ell(128, 130, 146, 148)
    t.piece(sceau, B, ombre=0)
    t.peindre(t.ell(131, 133, 143, 145) & ~t.ell(132, 134, 142, 144), V)
    t.pixels(133, 135, "...#...\n..###..\n...#...\n#.###.#\n.#####.\n..###..")
    t.peindre(t.rect(110, 158, 164, 159), B)
    # les jambes, bottes hautes
    for (x0, x1) in ((70, 82), (88, 100)):
        j = t.poly([(x0, 124), (x1, 124), (x1, 140), (x0, 140)])
        t.piece(j, B, ombre=2)
    for pts in ([(66, 138), (84, 138), (84, 160), (60, 160), (62, 152)], [(86, 138), (102, 138), (106, 152), (108, 160), (86, 160)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(t.bord(b, 1, 0, 3), N)
        t.peindre(t.trait([(pts[0][0] + 1, 141), (pts[1][0] - 1, 141)]), B)
        t.peindre(t.rect(pts[3][0], 158, pts[4][0] if pts[4][0] > pts[3][0] else pts[2][0], 159), B)
    # la tunique, la ceinture tressée
    tunique = t.poly([(70, 74), (102, 74), (106, 98), (110, 126), (62, 126), (66, 98)])
    t.piece(tunique, B, ombre=3)
    t.peindre(t.courbe([(76, 104), (72, 124)]) | t.courbe([(96, 104), (100, 124)]), V)
    t.peindre(t.trait([(86, 76), (86, 98)]), N)
    for y in (82, 88, 94):
        t.pixels(84, y, ":.:\n.:.")
    ceint = t.rect(64, 98, 108, 103)
    t.piece(ceint, V, ombre=0)
    t.peindre(ceint & ((t.xx + t.yy) % 4 == 0), N)
    t.peindre(t.trait([(98, 103), (100, 116)], 2) | t.trait([(102, 103), (106, 114)], 2), V)
    # la capuche rabattue sur les épaules
    capuche = t.poly([(62, 64), (110, 64), (114, 76), (100, 84), (72, 84), (58, 76)])
    t.piece(capuche, V, ombre=2)
    t.peindre(t.courbe([(68, 76), (86, 82), (104, 76)]), N)
    # le bras gauche levé, la lampe tenue haut
    bras = t.fuseau([(70, 78), (52, 66), (44, 40)], 11, 8)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(56, 66), (50, 58)]), V)
    poing(t, 36, 30, 52, 46, 3, vertical=True)
    t.piece(t.courbe([(44, 30), (38, 22), (44, 14)], 2), B, ombre=0)
    lampe_bas = t.poly([(30, 2), (58, 2), (54, 8), (34, 8)])
    globe = t.ell(30, 6, 58, 30)
    t.piece(globe, B, ombre=0)
    t.peindre(t.ell(34, 10, 54, 26) & ~t.ell(36, 12, 52, 24), V)
    t.piece(t.poly([(40, 26), (48, 26), (50, 32), (38, 32)]), V, ombre=0)
    t.piece(lampe_bas, V, ombre=0)
    flamme = t.fuseau([(44, 24), (40, 18), (46, 12), (43, 8)], 8, 1)
    t.piece(flamme, V, bord=B, ombre=0, lumiere=False)
    t.point(44, 18, B)
    for k in range(12):
        a = k * math.pi / 6 + math.pi / 12
        if 0.6 < a < 1.6:
            continue
        r0, r1 = 20, (28 if k % 2 == 0 else 24)
        t.peindre(t.trait([(44 + r0 * math.cos(a), 18 + r0 * math.sin(a)), (44 + r1 * math.cos(a), 18 + r1 * math.sin(a))]), B)
    # la tête, la chevelure qui vole au vent
    cheveux = t.poly([(64, 34), (86, 22), (106, 28), (126, 30), (140, 40), (126, 44), (136, 52), (118, 54), (124, 64),
                      (104, 62), (108, 70), (66, 70)])
    t.piece(cheveux, V, ombre=3)
    for pts in ([(100, 34), (120, 38), (134, 42)], [(102, 44), (118, 48), (130, 52)], [(100, 54), (112, 58), (120, 62)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(84, 26), (100, 28), (112, 32)]), B)
    tete = t.ell(66, 28, 104, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 46, 176, 70), V)
    frange = t.poly([(66, 42), (70, 30), (86, 24), (104, 32), (104, 40), (92, 34), (80, 38)])
    t.piece(frange, V, ombre=0)
    t.peindre(t.courbe([(74, 36), (84, 30)]) | t.courbe([(90, 30), (100, 36)]), N)
    # le bras droit, la main en visière au-dessus des yeux
    bras2 = t.fuseau([(102, 80), (128, 70), (114, 46)], 12, 9)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.courbe([(120, 70), (126, 64)]), V)
    main = t.poly([(84, 42), (96, 37), (112, 38), (118, 44), (112, 48), (88, 47)])
    t.piece(main, B, ombre=0)
    for x in (92, 98, 104):
        t.peindre(t.trait([(x, 43), (x + 1, 47)]), N)
    t.piece(t.fuseau([(110, 48), (104, 51), (98, 50)], 4, 2), B, ombre=0)
    t.damier(t.bord(main, 0, 1, 1) & t.rect(0, 0, 100, 170), V)
    # le regard au loin
    t.oeil(70, 49, l=11, h=9, regard=(-3, 0), paupiere=2, cils=-1)
    t.oeil(87, 49, l=11, h=9, regard=(-3, 0), paupiere=2, cils=1)
    nez = t.poly([(81, 56), (84, 56), (84, 64), (79, 64)])
    t.damier(t.bord(nez, -1, 0, 1), V)
    t.pixels(78, 61, ":::..\n.::::")
    t.pixels(78, 66, """
:........:
.::::::::.
..:####:..
...::::...
""")
    joues(t, [(70, 60), (94, 60)])
    t.sol(160, cx=92)
    return t.image()


def badis_v3():
    """Le bibliothécaire de la Maison des Noms : perché sur son escabeau, bonnet à pompon, il brandit sa plume comme
    une épée, l'autre main pleine d'étiquettes vierges qui dépassent en éventail ; le sourire de celui qui va tout
    nommer."""
    t = Toile()
    # l'escabeau, en A
    for pts in ([(66, 112), (52, 160)], [(108, 112), (122, 160)], [(76, 112), (70, 160)], [(98, 112), (104, 160)]):
        t.piece(t.trait(pts, 4), V, ombre=0)
    for (y, w) in ((126, 0), (142, 4)):
        t.piece(t.rect(62 - w, y, 112 + w, y + 3), B, ombre=0)
    plateau = t.rect(60, 108, 114, 113)
    t.piece(plateau, B, ombre=0)
    t.peindre(t.rect(62, 111, 112, 111) & ((t.xx % 3) == 0), V)
    # les jambes, les chaussures
    for (x0, x1) in ((74, 84), (90, 100)):
        j = t.poly([(x0, 86), (x1, 86), (x1, 102), (x0, 102)])
        t.piece(j, V, ombre=2)
    chaussure(t, [(70, 100), (86, 100), (86, 108), (64, 108), (64, 104)])
    chaussure(t, [(88, 100), (102, 100), (110, 104), (110, 108), (88, 108)])
    # le pull à torsades, le col roulé
    pull = t.poly([(68, 60), (106, 60), (110, 76), (106, 90), (68, 90), (64, 76)])
    t.piece(pull, V, ombre=3)
    for x in (76, 88, 100):
        for y in range(64, 88, 6):
            t.pixels(x - 2, y, ".o.\no.o\n.o.")
    t.piece(t.rect(66, 86, 108, 90), B, ombre=0)
    t.peindre(t.rect(66, 88, 108, 88) & ((t.xx % 2) == 0), V)
    col = t.poly([(74, 56), (100, 56), (100, 63), (74, 63)])
    t.piece(col, B, ombre=0)
    t.rayures(col, V, 3, 1)
    # le bras gauche et l'éventail d'étiquettes vierges
    bras2 = t.fuseau([(70, 64), (54, 74), (42, 66)], 10, 8)
    t.piece(bras2, V, ombre=2)
    for k, a in enumerate((-60, -35, -10, 15)):
        ang = math.radians(a - 90)
        cx, cy = 34 + 22 * math.cos(ang) * 0.9, 62 + 22 * math.sin(ang)
        ux, uy = math.cos(ang), math.sin(ang)
        px, py = -uy, ux
        pts = [(34 + 6 * px, 62 + 6 * py), (34 - 6 * px, 62 - 6 * py),
               (cx - 7 * px, cy - 7 * py), (cx + ux * 5, cy + uy * 5), (cx + 7 * px, cy + 7 * py)]
        et = t.poly([(round(x), round(y)) for x, y in pts])
        t.piece(et, B, ombre=0)
        hx, hy = round(cx), round(cy)
        t.peindre(t.ell(hx - 1, hy - 1, hx + 1, hy + 1), N)
        t.peindre(t.courbe([(hx, hy), (hx + 3 * ux - 4, hy + 3 * uy - 4), (hx - 2, hy - 8)]), V)
        t.peindre(t.trait([(34 + 8 * ux, 62 + 8 * uy), (34 + 14 * ux, 62 + 14 * uy)]) & et & (((t.xx + t.yy) % 2) == 0), V)
    poing(t, 28, 58, 42, 72, 3)
    # le bras droit levé, la plume brandie comme une épée
    bras = t.fuseau([(104, 64), (124, 62), (130, 40)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(123, 44), (135, 44), (135, 50), (123, 50)])
    tige = t.trait([(128, 52), (154, 4)], 2)
    t.piece(tige, B, ombre=0)
    plume = t.fuseau([(134, 36), (142, 18), (154, 2)], 14, 2)
    t.piece(plume, V, ombre=0)
    for k in range(7):
        x = 136 + k * 3
        y = 34 - k * 5
        t.peindre(t.trait([(x, y), (x - 6, y - 2)]) | t.trait([(x + 1, y), (x + 7, y - 3)]), N)
    t.peindre(t.trait([(132, 40), (154, 2)]), B)
    t.peindre(t.trait([(126, 54), (128, 52)], 2), N)
    poing(t, 122, 34, 138, 50, 3, vertical=True)
    for (x, y) in ((162, 18), (118, 22), (166, 44)):
        t.etincelle(x, y)
    t.pixels(122, 56, ".:.\n:#:\n.:.")
    # la tête, le grand sourire
    t.piece(t.ell(62, 34, 72, 48) | t.ell(104, 34, 114, 48), B, ombre=0)
    tete = t.ell(66, 16, 110, 60)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 30, 176, 54), V)
    for pts in ([(68, 30), (62, 34), (64, 40)], [(108, 30), (114, 34), (112, 40)]):
        t.piece(t.fuseau(pts, 6, 2), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(74, 26), (79, 23), (85, 25)], 2) | t.courbe([(91, 25), (97, 22), (102, 25)], 2), N)
    t.oeil(74, 28, l=11, h=9, regard=(3, -1), paupiere=2)
    t.oeil(91, 28, l=11, h=9, regard=(3, -1), paupiere=2)
    t.peindre(t.trait([(72, 35), (70, 37)]) | t.trait([(104, 35), (106, 37)]), N)
    nez = t.poly([(87, 37), (90, 37), (92, 44), (88, 46), (84, 45)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(84, 43, "..:..\n.:..:\n:::::")
    t.pixels(78, 48, """
:................:
.::::::::::::::::.
.:oooooooooooooo:.
..:oooooooooooo:..
...::########::...
.....::::::::.....
""")
    joues(t, [(74, 46), (100, 46)])
    # le bonnet à pompon
    bonnet = t.ell(64, 2, 112, 34) & t.rect(0, 0, 176, 24)
    t.piece(bonnet, V, ombre=3)
    t.rayures(bonnet & ~t.bord(bonnet, -1, -1, 1), N, 6, 1)
    revers = t.poly([(64, 18), (112, 18), (112, 26), (64, 26)])
    t.piece(revers, B, ombre=0)
    t.rayures(revers, V, 4, 2)
    pompon = t.ell(80, -2, 98, 12)
    t.piece(pompon, B, ombre=0)
    for (x, y) in ((84, 2), (90, 6), (93, 1), (86, 8)):
        t.pixels(x, y, "#.\n.#")
    t.sol(160, cx=88)
    return t.image()


def clara_v3():
    """La secrétaire du capitaine : cheveux au carré avec une frange nette, le crayon derrière l'oreille ; caban
    croisé à boutons ; elle écrit, appliquée, dans le carnet de bord, la langue entre les dents."""
    t = Toile()
    # les jambes, pantalon de marin, bottines
    for (x0, x1) in ((70, 84), (90, 104)):
        j = t.poly([(x0, 120), (x1, 120), (x1 + 2, 150), (x0 - 2, 150)])
        t.piece(j, B, ombre=2)
    t.peindre(t.trait([(87, 122), (87, 150)]), N)
    chaussure(t, [(64, 150), (86, 150), (86, 160), (60, 160), (60, 156)])
    chaussure(t, [(88, 150), (106, 150), (112, 156), (112, 160), (88, 160)])
    # le caban croisé, double rangée de boutons
    caban = t.poly([(66, 74), (108, 74), (114, 96), (116, 126), (60, 126), (60, 96)])
    t.piece(caban, V, ombre=3)
    t.peindre(t.trait([(94, 78), (98, 126)]), N)
    for y in (88, 100, 112):
        for x in (82, 104):
            t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2), B); t.point(x, y, N)
    t.peindre(t.rect(60, 120, 116, 122) & caban, N)
    for pts in ([(64, 102), (62, 124)], [(112, 102), (114, 124)]):
        t.peindre(t.courbe(pts), N)
    revers = t.poly([(70, 72), (86, 72), (94, 88), (82, 84)]) | t.poly([(104, 72), (90, 72), (94, 88), (100, 82)])
    t.piece(revers, B, ombre=0)
    t.damier(t.bord(revers, 1, 1, 1), V)
    t.piece(t.poly([(86, 72), (90, 72), (92, 80), (88, 80)]), V, ombre=0, lumiere=False)
    # l'ancre brodée sur la manche
    # le bras gauche, qui tient le carnet de bord ouvert
    bras2 = t.fuseau([(66, 80), (56, 100), (70, 108)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.pixels(54, 88, "..o..\n.ooo.\n..o..\no.o.o\n.ooo.")
    carnet = t.poly([(48, 96), (84, 92), (122, 96), (120, 120), (84, 116), (50, 120)])
    t.piece(carnet, B, ombre=2)
    t.peindre(t.trait([(84, 92), (84, 116)]), N)
    t.peindre(t.bord(carnet, 0, 1, 2), V)
    texte(t, 56, 98, "log", V)
    for k in range(3):
        t.peindre(t.trait([(56, 106 + k * 4), (80, 104 + k * 4)]) & ((t.xx % 3) != 0), N)
    for k in range(4):
        t.peindre(t.trait([(88, 98 + k * 4), (88 + 22 - (k % 2) * 6, 99 + k * 4)]) & ((t.xx % 4) != 0), N)
    poing(t, 62, 108, 76, 120, 2)
    # le bras droit, qui écrit à la plume
    bras = t.fuseau([(108, 80), (118, 94), (110, 104)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.trait([(104, 112), (118, 86)], 2), V, ombre=0)
    t.peindre(t.trait([(103, 113), (104, 111)]), N)
    poing(t, 104, 98, 118, 110, 3)
    t.pixels(112, 114, ".:.\n:.:")
    # la tête penchée sur le carnet
    t.piece(t.ell(60, 44, 68, 58), B, ombre=0)
    tete = t.ell(62, 28, 106, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 46, 176, 70), V)
    # les cheveux au carré, la frange nette
    carre = (t.ell(56, 18, 112, 70) & ~t.rect(0, 0, 63, 38) | t.rect(56, 36, 66, 72) | t.rect(102, 36, 112, 72)) \
        & t.rect(0, 0, 176, 72)
    carre &= ~(t.ell(66, 38, 102, 80) & t.rect(0, 40, 176, 170))
    t.piece(carre, V, ombre=3)
    t.peindre(t.rect(56, 70, 112, 72) & carre, N)
    t.peindre(t.bord(carre, 0, 1, 1) & t.rect(0, 66, 176, 72), B)
    for x in range(70, 102, 6):
        t.peindre(t.trait([(x, 30), (x, 38)]), N)
    t.peindre(t.courbe([(62, 30), (74, 22), (88, 22)]), B)
    for pts in ([(60, 44), (60, 66)], [(108, 44), (108, 66)]):
        t.peindre(t.courbe(pts), N)
    # le crayon derrière l'oreille
    crayon = t.trait([(104, 54), (122, 32)], 3)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.trait([(105, 52), (120, 34)]), V)
    t.pixels(120, 28, ".::\n:o:\n:::")
    # les yeux baissés sur le carnet, application
    t.peindre(t.courbe([(70, 44), (76, 42), (82, 45)], 2) | t.courbe([(88, 45), (94, 42), (100, 44)], 2), N)
    t.oeil(70, 48, l=11, h=8, regard=(1, 1), paupiere=3, cils=-1)
    t.oeil(89, 48, l=11, h=8, regard=(1, 1), paupiere=3, cils=1)
    nez = t.poly([(85, 54), (88, 54), (90, 61), (86, 63), (82, 62)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(82, 60, "..:..\n.:..:\n:::::")
    t.pixels(80, 66, """
.::::::::.
:oooooooo:
.::::##::.
.....##...
......:...
""")
    joues(t, [(70, 60), (98, 60)])
    t.sol(160, cx=86)
    return t.image()


def fama_v3():
    """L'étudiante qui corrige : deux tresses relevées en macarons, un air malicieux ; elle brandit une copie barrée
    d'une grande coche verte, le stylo vert dans l'autre main, le cartable bourré de copies à ses pieds."""
    t = Toile()
    # le cartable bourré de copies
    for k, (x, y, a) in enumerate(((22, 118, -8), (30, 114, 6), (40, 116, 14))):
        f = t.poly([(x, y), (x + 18, y - a // 3), (x + 20, y + 20), (x + 2, y + 22)])
        t.piece(f, B, ombre=0)
        t.peindre(t.trait([(x + 4, y + 6), (x + 14, y + 5)]) | t.trait([(x + 4, y + 10), (x + 12, y + 9)]), V)
    cart = t.poly([(14, 128), (64, 128), (66, 158), (12, 158)])
    t.piece(cart, V, ombre=3)
    rabat = t.poly([(12, 126), (66, 126), (62, 142), (16, 142)])
    t.piece(rabat, V, ombre=0)
    t.peindre(t.bord(rabat, 0, 1, 1), N)
    t.piece(t.rect(34, 138, 44, 148), B, ombre=0)
    t.peindre(t.rect(37, 141, 41, 144), N)
    t.peindre(t.courbe([(24, 128), (38, 112), (54, 128)], 2) & ~t.rect(0, 116, 176, 126), V)
    t.peindre(t.rect(12, 158, 66, 159), B)
    # les jambes, les collants à motifs, les baskets
    for (x0, x1) in ((76, 86), (94, 104)):
        j = t.poly([(x0, 124), (x1, 124), (x1, 150), (x0, 150)])
        t.piece(j, B, ombre=2)
        t.peindre(j & (((t.xx // 2 + t.yy // 2) % 3) == 0) & ~t.bord(j, -1, 0, 1), V)
    for pts in ([(70, 150), (88, 150), (90, 160), (64, 160)], [(92, 150), (108, 150), (114, 160), (92, 160)]):
        b = t.poly(pts)
        t.piece(b, B, ombre=0)
        t.damier(t.bord(b, 0, 1, 1), V)
        t.peindre(t.trait([(pts[0][0] + 3, 153), (pts[1][0] - 3, 153)]) & ((t.xx % 2) == 0), N)
    t.peindre(t.rect(64, 160, 114, 160), N)
    # la robe à bretelles et le chemisier
    haut = t.poly([(72, 76), (108, 76), (110, 96), (70, 96)])
    t.piece(haut, B, ombre=2)
    robe = t.poly([(74, 88), (106, 88), (112, 108), (118, 128), (62, 128), (68, 108)])
    t.piece(robe, V, ombre=3)
    for pts in ([(78, 100), (70, 126)], [(90, 100), (90, 126)], [(102, 100), (110, 126)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.trait([(78, 76), (78, 90)], 3) | t.trait([(102, 76), (102, 90)], 3), V)
    for x in (78, 102):
        t.peindre(t.ell(x - 2, 88, x + 2, 92), B); t.point(x, 90, N)
    t.piece(t.poly([(84, 104), (98, 104), (98, 116), (84, 116)]), B, ombre=0)
    t.pixels(87, 107, ":::::::\n:#####:\n:::::::\n.:###:.")
    for (x, y) in ((72, 118), (108, 118), (90, 122)):
        t.etoile(x, y, B, 1)
    # le bras gauche, le stylo vert pointé
    bras2 = t.fuseau([(74, 80), (60, 96), (66, 106)], 10, 8)
    t.piece(bras2, B, ombre=2)
    stylo = t.trait([(60, 116), (74, 92)], 4)
    t.piece(stylo, V, ombre=0)
    t.peindre(t.trait([(60, 116), (62, 112)], 2), N)
    t.peindre(t.trait([(73, 94), (70, 99)]), B)
    poing(t, 60, 100, 74, 112, 3)
    t.etoile(54, 120, B, 1)
    # le bras droit levé, la copie barrée d'une grande coche
    bras = t.fuseau([(106, 80), (122, 70), (128, 46)], 10, 8)
    t.piece(bras, B, ombre=2)
    copie = t.poly([(112, 4), (162, 8), (158, 54), (108, 48)])
    t.piece(copie, B, ombre=3)
    texte(t, 116, 8, "20/20", N)
    for k in range(5):
        y = 18 + k * 6
        t.peindre(t.trait([(130, y), (154, y + 2)]) & ((t.xx % 4) != 0), N)
    coche = t.trait([(116, 22), (125, 33), (152, 6)], 5)
    t.piece(coche, V, ombre=0)
    poing(t, 120, 40, 136, 54, 3, vertical=True)
    for (x, y) in ((104, 10), (168, 26), (148, 62)):
        t.etincelle(x, y)
    # les deux macarons tressés
    for cx in (64, 114):
        mac = t.ell(cx - 11, 30, cx + 11, 52)
        t.piece(mac, V, ombre=2)
        for r in (8, 4):
            t.peindre(t.courbe([(cx - r, 41), (cx, 41 - r), (cx + r, 41), (cx, 41 + r), (cx - r + 2, 41)]), N)
        t.peindre(t.courbe([(cx - 6, 34), (cx - 2, 32)]), B)
        t.pixels(cx - 4, 50, ":::::::\n:o#o#o:\n:::::::")
    # la tête
    tete = t.ell(68, 24, 110, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 42, 176, 66), V)
    cheveux = t.ell(66, 20, 112, 46) & ~t.ell(70, 34, 108, 80)
    t.piece(cheveux, V, ombre=0)
    t.peindre(t.trait([(89, 22), (89, 32)]), N)
    t.peindre(t.courbe([(76, 28), (84, 24)]) | t.courbe([(94, 24), (102, 28)]), B)
    # l'air malicieux : un sourcil levé, un clin d'œil, le sourire en coin
    t.peindre(t.courbe([(72, 42), (78, 40), (84, 42)], 2), N)
    t.peindre(t.courbe([(92, 40), (98, 35), (105, 37)], 2), N)
    t.pixels(72, 47, """
...........
.:::::::::.
:.........:
""")
    t.peindre(t.trait([(70, 47), (72, 48)]), N)
    t.oeil(93, 42, l=11, h=9, regard=(2, -1), paupiere=2, cils=1)
    nez = t.poly([(86, 52), (89, 52), (91, 58), (87, 60), (83, 59)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(83, 57, "..:..\n.:..:\n:::::")
    t.pixels(78, 62, """
..............:
:...........::.
.::::::::::::..
..:oooooooo:...
...::::::::....
""")
    joues(t, [(74, 56), (100, 56)])
    t.sol(160, cx=88)
    return t.image()


def ilyes_v3():
    """Le gamin de la gazette : petit, la casquette de gavroche, la bouche grande ouverte (« Édition spéciale ! ») ;
    il agite une gazette au-dessus de sa tête, la liasse sous l'autre bras, les manches noires d'encre ; il saute."""
    t = Toile()
    # les traits de mouvement du saut
    for (x0, x1, y) in ((112, 132, 150), (120, 142, 156), (40, 58, 156)):
        t.peindre(t.rect(x0, y, x1, y + 1), B)
    # les jambes : l'une tendue, l'autre repliée en arrière
    j1 = t.poly([(70, 112), (82, 112), (80, 136), (70, 136)])
    t.piece(j1, B, ombre=2)
    j2 = t.fuseau([(92, 114), (104, 126), (114, 122)], 11, 9)
    t.piece(j2, B, ombre=2)
    for (pts) in ([(68, 132), (82, 132), (82, 140), (68, 140)],):
        t.piece(t.poly(pts), V, ombre=0)
        t.rayures(t.poly(pts), N, 3, 1, vertical=False)
    t.piece(t.poly([(110, 114), (118, 112), (122, 122), (114, 126)]), V, ombre=0)
    t.rayures(t.poly([(110, 114), (118, 112), (122, 122), (114, 126)]), N, 3, 1, vertical=False)
    chaussure(t, [(64, 140), (82, 140), (84, 150), (58, 150), (58, 146)])
    b2 = t.poly([(118, 108), (128, 106), (136, 114), (132, 124), (120, 124)])
    t.piece(b2, V, ombre=0)
    t.damier(t.bord(b2, 1, 0, 2), N)
    t.peindre(t.trait([(132, 112), (134, 122)]), B)
    # la culotte courte à bretelles
    culotte = t.poly([(68, 96), (100, 96), (104, 116), (88, 118), (84, 112), (80, 118), (66, 116)])
    t.piece(culotte, V, ombre=2)
    t.peindre(t.trait([(84, 100), (84, 112)]), N)
    # la chemise blanche, les bretelles, le gilet trop grand
    chemise = t.poly([(68, 70), (102, 70), (104, 98), (66, 98)])
    t.piece(chemise, B, ombre=2)
    gilet = t.poly([(66, 72), (78, 72), (82, 98), (66, 100)]) | t.poly([(102, 72), (90, 72), (88, 98), (104, 100)])
    t.piece(gilet, V, ombre=2)
    for y in (80, 88):
        t.peindre(t.ell(78, y - 1, 81, y + 2), B); t.point(79, y, N)
    t.pixels(80, 70, ":::.:::\n:##:##:\n:::.:::")
    # la liasse de gazettes sous le bras droit
    bras2 = t.fuseau([(102, 76), (114, 88), (106, 98)], 9, 7)
    t.piece(bras2, B, ombre=2)
    liasse = t.poly([(96, 82), (138, 76), (142, 98), (100, 104)])
    t.piece(liasse, B, ombre=3)
    for k in range(4):
        t.peindre(t.trait([(100, 98 - k * 4 + 2), (140, 92 - k * 4 + 2)]) & ((t.xx % 5) != 0), N)
    t.peindre(t.trait([(118, 78), (121, 102)], 2), V)
    texte(t, 102, 84, "gazette", V)
    poing(t, 102, 92, 116, 104, 3)
    for (x, y) in ((106, 84), (110, 80), (60, 54), (56, 50), (62, 60)):
        t.pixels(x, y, ":#\n#:")
    # le bras gauche levé, la gazette agitée au-dessus de la tête
    bras = t.fuseau([(70, 76), (54, 60), (52, 36)], 9, 7)
    t.piece(bras, B, ombre=2)
    t.piece(t.poly([(44, 38), (58, 38), (60, 46), (44, 46)]), B, ombre=0)
    t.peindre(t.rect(46, 40, 58, 44) & (((t.xx + t.yy) % 2) == 0), N)
    gaz = t.poly([(14, 6), (50, 2), (62, 22), (54, 34), (20, 38), (8, 22)])
    t.piece(gaz, B, ombre=3)
    t.peindre(t.trait([(34, 4), (36, 36)]), N)
    texte(t, 14, 12, "extra", N)
    t.piece(t.poly([(14, 20), (32, 18), (32, 30), (16, 32)]), V, ombre=0)
    for k in range(4):
        t.peindre(t.trait([(40, 10 + k * 6), (56, 12 + k * 6)]) & ((t.xx % 3) != 0), N)
    poing(t, 44, 28, 58, 42, 3, vertical=True)
    for (x0, y0) in ((4, 8), (2, 22), (6, 36)):
        t.peindre(t.trait([(x0, y0), (x0 + 4, y0 + 1)]), B)
    for (x, y) in ((68, 6), (72, 18)):
        t.etincelle(x, y)
    # la tête, la bouche grande ouverte
    t.piece(t.ell(62, 40, 70, 54), B, ombre=0)
    tete = t.ell(64, 22, 104, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 64), V)
    for pts in ([(68, 30), (62, 34), (62, 40)], [(100, 30), (106, 34), (106, 40)]):
        t.piece(t.fuseau(pts, 6, 2), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(68, 38), (74, 34), (80, 36)], 2) | t.courbe([(87, 36), (93, 34), (99, 38)], 2), N)
    t.oeil(69, 40, l=11, h=9, regard=(-2, -1), paupiere=2)
    t.oeil(87, 40, l=11, h=9, regard=(-2, -1), paupiere=2)
    nez = t.poly([(82, 48), (85, 48), (87, 54), (83, 56), (79, 55)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.pixels(79, 53, "..:..\n.:..:\n:::::")
    t.pixels(76, 57, """
.::::::::::.
:oooooooooo:
:::::::::::.
:::::::::::.
:::##::###:.
.::#####:::.
..::::::::..
""")
    joues(t, [(68, 52), (96, 52)])
    for (x, y) in ((74, 50), (77, 52), (93, 50)):
        t.point(x, y, V)
    # la casquette de gavroche
    cas = t.ell(60, 12, 108, 38) & t.rect(0, 0, 176, 32)
    t.piece(cas, V, ombre=3)
    for x in range(66, 106, 8):
        t.peindre(t.courbe([(84, 13), (x, 22), (x - 2 if x < 84 else x + 2, 31)]) & cas, N)
    t.piece(t.ell(80, 9, 88, 15), V, ombre=0)
    visiere = t.poly([(60, 30), (96, 28), (100, 34), (64, 36)])
    t.piece(visiere, V, ombre=0, lumiere=False)
    t.damier(visiere, N)
    t.peindre(t.trait([(62, 31), (96, 29)]), B)
    # le cri : « extra ! »
    for (pts) in ([(112, 40), (120, 36)], [(112, 50), (122, 50)], [(112, 60), (120, 64)]):
        t.peindre(t.trait(pts, 2), B)
    t.sol(160, cx=88)
    return t.image()


PORTRAITS = {
    "item_allumeur": allumeur_v3,
    "item_gordon": gordon_v3,
    "item_charles": charles_v3,
    "item_betty": betty_v3,
    "item_donald": donald_v3,
    "item_dorothy": dorothy_v3,
    "item_horloger": horloger_v3,
    "item_ida": ida_v3,
    "item_amina": amina_v3,
    "item_badis": badis_v3,
    "item_clara": clara_v3,
    "item_fama": fama_v3,
    "item_ilyes": ilyes_v3,
}

if __name__ == "__main__":
    noms = [n.replace('.gif', '') for n in sys.argv[1:]] or list(PORTRAITS)
    for n in noms:
        finir(n + ".gif", PORTRAITS[n]())
    print(len(noms), "portraits")
