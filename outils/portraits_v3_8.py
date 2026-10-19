"""Portraits v3, lot 8 : dix maîtres et habitants du Grand Port (chapitre 8, « la Flotte noire », Docker).

Adonis le passeur des chenaux, Anissa la marinière de la chaloupe, Arnaud le commandant de l'escadre, Chahla la
gardienne des soutes, Déborah la gardienne du registre, Eden la maîtresse du chantier, Edson le charpentier de
marine, Elias le maître des convois, Grégoire le gardien des plans et Ian l'armurier. Mêmes personnages, mêmes rôles
et mêmes objets que les anciens portraits de dessiner_port.py (gardés là-bas), redessinés dans le style v3 : toile de
176 x 170 cases (2 x 2 pixels), pièces avec liseré, lumière et ombre tramée (voir portrait_v3.py).
Usage : python3 outils/portraits_v3_8.py [item_x.gif ...]   (sans argument : les dix)
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import finir, N, V, B  # noqa: E402
from portrait_v3 import Toile, texte  # noqa: E402


# ------------------------------------------------------------------ petites aides communes
def poing(t, x0, y0, x1, y1, doigts=3, vertical=False):
    """Un poing fermé : ellipse blanche à liseré, avec ses plis de doigts."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    w, h = x1 - x0, y1 - y0
    for k in range(1, doigts + 1):
        if vertical:
            x = x0 + k * w // (doigts + 1)
            t.peindre(t.trait([(x, y0 + 2), (x, y0 + h // 2)]) & m, N)
        else:
            y = y0 + k * h // (doigts + 1)
            t.peindre(t.trait([(x0 + 2, y), (x0 + w // 2, y)]) & m, N)
    return m


def nez7(t, x, y, h=9, sens=1):
    """Un nez de trois quarts : arête fine, bout arrondi souligné, ombre tramée sous le bout, une narine."""
    d = sens
    t.damier(t.poly([(x + 1 * d, y + 2), (x + 4 * d, y + h - 2), (x + 5 * d, y + h), (x + 2 * d, y + h)]), V)
    t.peindre(t.courbe([(x, y), (x + 2 * d, y + h - 4), (x + 5 * d, y + h - 1)]), N)
    t.peindre(t.courbe([(x + 5 * d, y + h - 1), (x + 4 * d, y + h + 1), (x + 1 * d, y + h + 1), (x - 1 * d, y + h)], 2), N)
    t.point(x - 3 * d, y + h - 1, N)


def manchette(t, pts, ep=4):
    t.piece(t.trait(pts, ep), B, ombre=0)


def rivets(t, pts, c=B):
    for (x, y) in pts:
        t.point(x, y, c); t.point(x + 1, y, c); t.point(x, y + 1, c); t.point(x + 1, y + 1, N)


def eau(t, y, cx=88):
    """Des vaguelettes blanches au lieu du sol (sous une barque)."""
    for (a, b, dy) in [(-84, -60, 0), (-50, -10, 0), (2, 40, 0), (50, 84, 0), (-70, -36, 4), (-24, 14, 4),
                       (24, 66, 4), (-46, -20, 8), (-6, 20, 8), (34, 50, 8)]:
        t.peindre(t.rect(cx + a, y + dy, cx + b, y + dy + 1), B)
        t.point(cx + b + 1, y + dy - 1, B)


# ------------------------------------------------------------------ Adonis, passeur des chenaux
def adonis_v3():
    t = Toile()
    # la jambe du fond et la jambe d'appui, en ciré
    for pts in ([(74, 104), (64, 122), (60, 140)], [(92, 104), (98, 122), (104, 140)]):
        j = t.fuseau(pts, 15, 12)
        t.piece(j, V, ombre=3)
        t.peindre(t.courbe([(pts[1][0] - 3, pts[1][1] - 4), (pts[1][0] + 3, pts[1][1]), (pts[1][0] - 2, pts[1][1] + 4)]) & j, N)
    # le grand ciré, long, boutonné de cabillots
    cire = t.poly([(68, 64), (100, 62), (110, 84), (118, 114), (104, 118), (84, 114), (62, 118), (52, 114), (60, 82)])
    t.piece(cire, B, ombre=4)
    t.peindre(t.courbe([(84, 66), (86, 90), (84, 112)], 2), N)
    for y in (76, 88, 100):
        t.piece(t.rect(78, y, 86, y + 2), V, ombre=0)
        t.point(87, y + 1, N)
    t.peindre(t.courbe([(64, 104), (74, 108), (84, 106)]), N)
    t.peindre(t.courbe([(100, 96), (104, 106), (108, 110)]), V)
    poche = t.rect(90, 94, 104, 104)
    t.peindre(t.trait([(90, 94), (104, 94)], 2), V)
    t.peindre(t.trait([(90, 95), (90, 104)]), N)
    # l'empiècement des épaules et l'ourlet, verts, comme sur les cirés de pêche
    t.peindre(cire & t.poly([(56, 60), (110, 58), (110, 80), (56, 82)]), V)
    t.peindre(t.trait([(60, 82), (108, 80)]) & cire, N)
    t.peindre(t.trait([(60, 83), (108, 81)]) & cire & (t.xx % 2 == 0), V)
    t.peindre(cire & t.rect(0, 105, 176, 107), V)
    t.peindre(cire & t.rect(0, 106, 176, 106) & (t.xx % 3 == 0), B)
    # le col montant, vert
    t.piece(t.poly([(70, 58), (98, 56), (100, 66), (84, 70), (68, 66)]), V, ombre=0)
    # la gaffe, plantée dans le chenal devant le ciré, derrière les mains
    gaffe = t.trait([(150, 4), (42, 168)], 3)
    t.piece(gaffe, B, ombre=0)
    t.peindre(t.trait([(151, 5), (44, 167)]), V)
    croc = t.courbe([(150, 4), (158, 0), (164, 6), (158, 12)], 2) | t.fuseau([(150, 4), (146, -2), (144, -6)], 3, 1)
    t.piece(croc, V, ombre=0)
    t.peindre(t.rect(140, 10, 152, 13) & dilater_simple(t, gaffe), V)
    # le bras du fond qui pousse la gaffe vers le bas
    bras2 = t.fuseau([(66, 70), (64, 86), (84, 92)], 13, 10)
    t.piece(bras2, B, ombre=3)
    t.peindre(t.courbe([(64, 80), (70, 84), (66, 88)]) & bras2, V)
    manchette(t, [(82, 86), (82, 96)], 4)
    poing(t, 82, 84, 96, 98, vertical=True)
    # le bras de devant, coude en dehors, la main haute sur la gaffe
    bras = t.fuseau([(98, 68), (116, 76), (114, 60)], 13, 10)
    t.piece(bras, B, ombre=3)
    t.peindre(t.courbe([(108, 70), (114, 72), (116, 66)]) & bras, V)
    manchette(t, [(108, 60), (118, 62)], 4)
    poing(t, 104, 50, 118, 64, vertical=True)
    # la tête, le menton fier
    tete = t.ell(64, 18, 104, 66)
    t.piece(tete, B, ombre=0)
    oreille = t.ell(61, 38, 69, 50)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(65, 41), (63, 44), (65, 47)]), N)
    # la mentonnière du suroît
    # les cheveux courts qui dépassent sur la tempe
    t.piece(t.fuseau([(68, 30), (66, 36), (67, 40)], 4, 1), V, ombre=0, lumiere=False)
    # sourcils, yeux levés vers la main haute
    t.piece(t.fuseau([(73, 34), (79, 32), (85, 33)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(90, 33), (95, 31), (101, 33)], 3, 2), V, ombre=0)
    t.oeil(74, 37, l=11, h=8, regard=(2, -1))
    t.oeil(89, 37, l=11, h=8, regard=(2, -1))
    nez7(t, 87, 45, 9, 1)
    t.pixels(78, 57, """
::.............::
..:::::::::::::..
..:ooooooooooo:..
...:::#####:::...
.....:::::::.....
""")
    t.peindre(t.trait([(71, 45), (73, 47)]) | t.trait([(101, 45), (103, 47)]), N)
    t.damier(t.ell(70, 51, 75, 55), V)
    # le suroît : calotte et grand bord rabattu sur la nuque
    calotte = t.ell(64, 4, 104, 34) & t.rect(0, 0, 176, 26)
    t.piece(calotte, V, ombre=3)
    for x in (78, 88):
        t.peindre(t.courbe([(x, 6), (x - 2, 16), (x - 3, 25)]), N)
    bord = t.poly([(52, 30), (60, 24), (108, 22), (112, 28), (100, 30), (70, 30), (56, 42), (48, 40)])
    t.piece(bord, V, ombre=0)
    t.peindre(t.trait([(60, 28), (106, 26)]), B)
    t.damier(t.poly([(50, 34), (60, 30), (56, 40), (50, 40)]), N)
    t.peindre(t.courbe([(70, 8), (76, 5), (82, 5)]), B)
    # la barque (elle cache les bottes) et le rouleau de cordage
    corde = t.ell(14, 118, 46, 134)
    t.piece(corde, B, ombre=0)
    for k in (3, 6, 9):
        t.peindre(t.ell(14 + k, 118 + k // 2, 46 - k, 134 - k // 2) & ~t.ell(15 + k, 119 + k // 2, 45 - k, 133 - k // 2), N)
    t.peindre(t.ell(29, 125, 31, 127), V)
    coque = t.poly([(4, 124), (16, 132), (152, 132), (172, 122), (164, 142), (146, 154), (30, 154), (12, 142)])
    t.piece(coque, V, ombre=3)
    t.peindre(t.rect(0, 132, 176, 136) & coque, B)
    t.peindre(t.trait([(4, 124), (16, 132), (152, 132), (172, 122)]), B)
    for y in (141, 148):
        t.peindre(t.trait([(14, y - 4), (166, y - 6)]) & coque & ~t.rect(0, 132, 176, 136), N)
    rivets(t, [(28, 138), (60, 138), (92, 138), (124, 138), (150, 136)], N)
    t.peindre(t.trait([(30, 154), (146, 154)]), N)
    # le nom de la barque
    texte(t, 112, 143, "passe", B)
    # le fanal de proue, sur son montant
    t.piece(t.rect(160, 98, 162, 126), B, ombre=0)
    t.piece(t.poly([(156, 92), (164, 86), (172, 92)]), V, ombre=0)
    fan = t.rect(156, 92, 170, 108)
    t.piece(fan, V, ombre=0, lumiere=False)
    t.peindre(t.rect(158, 94, 168, 106), B)
    t.peindre(t.poly([(163, 96), (166, 101), (163, 105), (160, 101)]), V)
    t.peindre(t.rect(163, 92, 163, 108), N)
    for (x0, y0, x1, y1) in [(150, 88, 146, 84), (174, 100, 175, 100), (152, 100, 146, 100)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    eau(t, 158, 88)
    # les ronds dans l'eau autour de la gaffe
    t.peindre(t.ell(30, 160, 54, 168) & ~t.ell(32, 161, 52, 167), B)
    return t.image()


def dilater_simple(t, m):
    from portrait_v3 import dilater
    return dilater(m, 1)


# ------------------------------------------------------------------ Anissa, marinière de la chaloupe
def anissa_v3():
    t = Toile()
    # les cheveux longs qui flottent au vent, derrière : une masse et trois grandes mèches
    masse = t.ell(64, 16, 102, 64)
    for pts, e0 in [([(78, 24), (52, 6), (30, 26), (6, 12)], 18), ([(72, 36), (48, 28), (28, 52), (6, 40)], 16),
                    ([(72, 50), (54, 50), (40, 72), (18, 64)], 12)]:
        masse |= t.fuseau(pts, e0, 2)
    t.piece(masse, V, ombre=3, lumiere=False)
    for pts in ([(70, 22), (50, 10), (30, 26), (12, 16)], [(66, 34), (46, 26), (30, 46), (12, 38)],
                [(68, 44), (48, 40), (32, 58), (16, 50)], [(68, 54), (54, 54), (40, 70), (26, 66)]):
        t.peindre(t.courbe(pts), N)
    for pts in ([(60, 22), (44, 20), (34, 24)], [(56, 40), (42, 42), (34, 46)]):
        t.peindre(t.courbe(pts), B)
    # la jambe arrière, talon levé
    j2 = t.fuseau([(78, 106), (66, 126), (54, 140)], 14, 11)
    t.piece(j2, V, ombre=3)
    t.piece(t.fuseau([(56, 138), (48, 146), (44, 152)], 10, 9), B, ombre=2)
    t.piece(t.poly([(30, 150), (46, 146), (50, 154), (46, 158), (30, 158), (28, 154)]), V, ombre=0)
    t.peindre(t.rect(28, 157, 50, 158), B)
    t.peindre(t.trait([(32, 153), (44, 150)]) & (t.xx % 2 == 0), N)
    t.peindre(t.trait([(52, 136), (62, 142)], 3), B)
    # le bras du fond qui balance
    b2 = t.fuseau([(74, 70), (62, 86), (54, 98)], 10, 8)
    t.piece(b2, V, ombre=2)
    t.peindre(t.rect(52, 90, 66, 92) & b2, B)
    poing(t, 46, 96, 58, 108)
    # la jambe avant, grande enjambée
    j1 = t.fuseau([(94, 106), (110, 124), (118, 138)], 15, 11)
    t.piece(j1, V, ombre=3)
    t.peindre(t.trait([(114, 134), (124, 132)], 3), B)
    t.piece(t.fuseau([(120, 136), (124, 146), (126, 150)], 10, 9), B, ombre=2)
    t.piece(t.poly([(118, 148), (132, 148), (144, 154), (144, 159), (116, 159)]), V, ombre=0)
    t.peindre(t.rect(116, 158, 144, 159), B)
    t.peindre(t.trait([(122, 151), (134, 151)]) & (t.xx % 2 == 0), N)
    # la marinière à rayures
    torse = t.poly([(72, 64), (102, 62), (108, 84), (104, 108), (74, 110), (68, 88)])
    t.piece(torse, B, ombre=0)
    t.rayures(torse & t.rect(0, 70, 176, 104), V, 7, 3, vertical=False)
    t.damier(t.bord(torse, 1, 0, 3) & torse, V)
    t.peindre(t.rect(70, 104, 106, 110) & torse, V)
    t.piece(t.rect(84, 104, 92, 110), B, ombre=0)
    t.peindre(t.rect(86, 106, 90, 108), N)
    t.piece(t.poly([(80, 60), (96, 60), (92, 68), (84, 68)]), B, ombre=0)
    t.peindre(t.poly([(85, 61), (91, 61), (88, 66)]), V)
    # la rame, en travers de l'épaule : manche et grande pale
    manche = t.trait([(10, 112), (134, 30)], 3)
    t.piece(manche, B, ombre=0)
    t.peindre(t.trait([(10, 113), (134, 31)]), V)
    t.piece(t.ell(4, 108, 14, 118), V, ombre=0)
    pale = t.fuseau([(128, 36), (146, 24), (164, 12)], 6, 18)
    pale |= t.ell(154, 0, 172, 22)
    t.piece(pale, V, ombre=3)
    t.peindre(t.courbe([(132, 34), (148, 22), (164, 10)]), B)
    t.peindre(t.trait([(140, 24), (146, 32)]) | t.trait([(150, 18), (156, 26)]), N)
    # le bras de devant qui tient la rame sur l'épaule
    b1 = t.fuseau([(100, 70), (122, 72), (120, 48)], 11, 9)
    t.piece(b1, V, ombre=2)
    t.peindre(t.rect(104, 60, 130, 62) & b1, B)
    poing(t, 112, 34, 126, 48, vertical=True)
    # la tête
    tete = t.ell(72, 20, 112, 66)
    t.piece(tete, B, ombre=0)
    t.piece(t.fuseau([(76, 28), (72, 38), (72, 48)], 6, 1), V, ombre=0, lumiere=False)
    # le bandeau, noué, dont les pans flottent
    band = t.fuseau([(72, 26), (92, 20), (112, 26)], 7, 7) & ~t.rect(0, 30, 176, 170)
    t.piece(band, B, ombre=0)
    t.peindre(band & (t.xx % 4 == 0) & (t.yy % 4 == 1), V)
    t.peindre(t.courbe([(74, 28), (92, 23), (110, 28)]), V)
    t.piece(t.ell(64, 22, 76, 32), B, ombre=0)
    t.peindre(t.ell(68, 25, 72, 29), V)
    for pts in ([(66, 26), (52, 22), (38, 12)], [(66, 30), (54, 36), (40, 34)]):
        m = t.fuseau(pts, 7, 2)
        t.piece(m, B, ombre=0)
        t.peindre(t.courbe(pts) & (t.xx % 3 == 0), V)
    # le visage : un œil ouvert, un clin d'œil, le grand sourire
    t.piece(t.fuseau([(80, 35), (86, 32), (92, 33)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(98, 32), (103, 31), (108, 34)], 3, 2), V, ombre=0)
    t.oeil(80, 38, l=11, h=8, regard=(1, 0), cils=-1)
    t.peindre(t.courbe([(97, 43), (102, 39), (108, 42)], 2), N)
    t.peindre(t.trait([(108, 42), (111, 40)]) | t.trait([(107, 44), (110, 45)]), N)
    nez7(t, 96, 44, 8, 1)
    t.pixels(84, 55, """
::.............:
..:::::::::::::.
..:ooooooooooo:.
...:::#####:::..
.....::::::::...
""")
    t.damier(t.ell(78, 49, 84, 53), V)
    t.damier(t.ell(102, 49, 108, 53), V)
    # la petite boucle d'oreille
    t.pixels(72, 50, ".o.\no:o\n.o.")
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Arnaud, commandant de l'escadre
def arnaud_v3():
    t = Toile()
    # la drisse et ses pavillons de signaux qui montent vers le ciel
    t.peindre(t.courbe([(46, 66), (30, 40), (16, 18), (4, 0)], 1), B)
    motifs = ['croix', 'damier', 'moitie', 'cadre']
    for k, (x, y) in enumerate([(32, 42), (22, 26), (12, 10)]):
        f = t.poly([(x, y), (x + 14, y + 2), (x + 13, y + 13), (x - 1, y + 11)])
        t.piece(f, B, ombre=0)
        m = motifs[k]
        if m == 'croix':
            t.peindre((t.rect(x + 5, y, x + 8, y + 14) | t.rect(x, y + 5, x + 14, y + 8)) & f, V)
        elif m == 'damier':
            t.peindre(f & (((t.xx - x) // 4 + (t.yy - y) // 4) % 2 == 0), V)
        else:
            t.peindre(t.poly([(x, y), (x + 14, y + 2), (x - 1, y + 11)]) & f, V)
    t.peindre(t.poly([(2, 0), (10, 0), (6, 6)]), V)
    # les basques de l'habit, en queue d'hirondelle, derrière les jambes
    basque = t.poly([(72, 108), (120, 108), (132, 142), (118, 140), (106, 118), (86, 118), (74, 140), (60, 142)])
    t.piece(basque, V, ombre=3)
    t.peindre(t.trait([(60, 141), (74, 139)], 2) | t.trait([(118, 139), (132, 141)], 2), B)
    t.peindre(t.courbe([(78, 114), (70, 128), (66, 138)]) | t.courbe([(114, 114), (122, 128), (126, 138)]), N)
    # le sabre au fourreau, accroché à la ceinture
    four = t.trait([(84, 116), (56, 150)], 5)
    t.piece(four, V, ombre=0)
    t.peindre(t.trait([(83, 117), (57, 149)]), B)
    t.piece(t.trait([(56, 150), (52, 155)], 5), B, ombre=0)
    # les jambes, campées : culotte blanche, hautes bottes cirées
    for (x, dx) in ((72, -4), (98, 4)):
        j = t.poly([(x, 114), (x + 16, 114), (x + 15 + dx, 142), (x + 1 + dx, 142)])
        t.piece(j, B, ombre=2)
        x2 = x + dx
        b = t.poly([(x2, 140), (x2 + 16, 140), (x2 + 17, 152), (x2 + 18, 160), (x2 - 6, 160), (x2 - 4, 152)])
        t.piece(b, V, ombre=2)
        t.piece(t.poly([(x2 - 1, 138), (x2 + 17, 138), (x2 + 18, 144), (x2 - 2, 144)]), B, ombre=0)
        t.peindre(t.trait([(x2, 141), (x2 + 16, 141)]) & (t.xx % 2 == 0), V)
        t.damier(b & t.rect(0, 146, 176, 152), N)
        t.peindre(t.trait([(x2 + 2, 146), (x2 + 3, 153)]), B)
        t.peindre(t.courbe([(x + 4 + dx // 2, 120), (x + 8 + dx // 2, 128), (x + 5 + dx, 136)]) & j, V)
        t.peindre(t.trait([(x2 - 4, 156), (x2 + 1, 153), (x2 + 12, 152)]), B)
        t.peindre(t.rect(x2 - 6, 159, x2 + 18, 160), N)
    # le torse bombé, plastron blanc, écharpe
    torse = t.poly([(76, 76), (114, 74), (122, 92), (118, 116), (74, 118), (68, 96)])
    t.piece(torse, V, ombre=3)
    plas = t.poly([(86, 78), (104, 78), (106, 112), (84, 112)])
    t.piece(plas, B, ombre=0)
    t.damier(t.bord(plas, 1, 0, 2) & plas, V)
    for y in (86, 94, 102):
        for x in (82, 108):
            t.peindre(t.ell(x - 1, y - 1, x + 2, y + 2), B)
            t.point(x, y, N)
    for y in (88, 98):
        t.peindre(t.courbe([(88, y), (95, y + 2), (102, y)]), V)
    ech = t.poly([(76, 80), (84, 78), (118, 110), (110, 114)])
    t.piece(ech & torse, V, bord=B, ombre=0)
    t.peindre(t.trait([(80, 80), (114, 112)]) & ech, B)
    t.piece(t.rect(72, 112, 120, 118), V, ombre=0)
    t.peindre(t.rect(72, 113, 120, 113), B)
    t.piece(t.rect(92, 111, 100, 119), B, ombre=0)
    t.peindre(t.rect(94, 113, 98, 117), N)
    # les décorations
    for (x, y) in ((86, 90), (92, 90)):
        t.peindre(t.rect(x, y - 6, x + 3, y - 2), V)
        t.piece(t.ell(x - 1, y - 2, x + 4, y + 3), B, ombre=0)
        t.point(x + 1, y, V)
    # la main sur la hanche, coude en dehors
    b2 = t.fuseau([(114, 80), (138, 94), (120, 108)], 12, 9)
    t.piece(b2, V, ombre=2)
    for k in (0, 5):
        t.peindre(t.trait([(126 - k, 92 + k), (134 - k, 98 + k)]) & b2, B)
    manchette(t, [(124, 102), (128, 106)], 5)
    poing(t, 112, 102, 126, 114)
    # la grosse épaulette à franges (côté hanche)
    ep = t.poly([(106, 72), (124, 76), (126, 84), (108, 82)])
    t.piece(ep, B, ombre=0)
    for x in range(110, 127, 2):
        t.peindre(t.trait([(x, 85), (x + 1, 91)]), B)
    t.peindre(t.trait([(108, 77), (124, 80)]), V)
    # le bras tendu qui fait claquer la drisse
    b1 = t.fuseau([(80, 80), (64, 76), (50, 68)], 12, 9)
    t.piece(b1, V, ombre=2)
    for x in (56, 61):
        t.peindre(t.trait([(x, 68), (x + 3, 80)], 2) & b1, B)
    ep2 = t.poly([(68, 72), (86, 70), (88, 80), (70, 82)])
    t.piece(ep2, B, ombre=0)
    for x in range(68, 86, 2):
        t.peindre(t.trait([(x, 83), (x - 1, 89)]), B)
    t.peindre(t.trait([(70, 76), (86, 74)]), V)
    manchette(t, [(52, 62), (50, 74)], 5)
    poing(t, 38, 60, 52, 74, vertical=True)
    t.peindre(t.trait([(46, 66), (44, 74), (46, 82)]), B)
    for (x0, y0, x1, y1) in [(26, 56, 32, 54), (28, 64, 34, 64), (26, 72, 32, 74)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # la tête, menton haut, tournée vers les pavillons
    oreille = t.ell(100, 46, 108, 58)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(103, 49), (106, 52), (103, 55)]), N)
    tete = t.ell(68, 28, 106, 72) | t.poly([(72, 58), (102, 58), (98, 72), (88, 76), (78, 74)])
    t.piece(tete, B, ombre=0)
    t.piece(t.fuseau([(100, 32), (104, 38), (105, 46)], 4, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(73, 42), (80, 39), (87, 41)], 3, 2), V, ombre=0)
    t.piece(t.fuseau([(91, 41), (96, 39), (101, 41)], 2, 3), V, ombre=0)
    t.oeil(74, 46, l=11, h=8, regard=(-2, 0))
    t.oeil(90, 46, l=10, h=8, regard=(-2, 0))
    nez7(t, 87, 50, 10, -1)
    t.pixels(76, 63, """
:.............:
.::.........::.
...:::::::::...
...:ooooooo:...
....:::::::....
""")
    t.peindre(t.courbe([(83, 70), (86, 71), (89, 70)]), N)
    t.peindre(t.trait([(72, 56), (73, 60)]), N)
    t.damier(t.ell(94, 58, 99, 62), V)
    # le bicorne, en travers, galonné, à cocarde
    bic = t.poly([(42, 36), (54, 22), (72, 12), (92, 8), (112, 12), (130, 22), (142, 36), (124, 32), (92, 30), (60, 32)])
    t.piece(bic, V, ombre=3)
    t.peindre(t.trait([(44, 35), (60, 31), (92, 29), (124, 31), (140, 35)], 2), B)
    t.peindre(t.courbe([(54, 24), (92, 6), (130, 24)]), B)
    for k in range(5):
        a = math.pi * (0.15 + 0.7 * k / 4)
        t.peindre(t.trait([(92 - 30 * math.cos(a), 30 - 18 * math.sin(a)), (92 - 22 * math.cos(a), 28 - 12 * math.sin(a))]) & bic, N)
    coc = t.ell(98, 12, 112, 26)
    t.piece(coc, B, ombre=0)
    t.peindre(t.ell(101, 15, 109, 23), V)
    t.peindre(t.ell(104, 18, 106, 20), B)
    t.piece(t.fuseau([(104, 14), (108, 4), (116, 0)], 4, 1), B, ombre=0)
    t.sol(161, cx=92)
    return t.image()


# ------------------------------------------------------------------ Chahla, gardienne des soutes
def chahla_v3():
    t = Toile()
    # le tonneau qui roule : le corps (un cylindre fuyant vers le fond), puis le fond vu de face
    fx, fy, r = 124, 123, 31
    ox, oy = 18, -12
    n = math.hypot(ox, oy)
    px, py = -oy / n, ox / n
    corps = t.ell(fx + ox - r, fy + oy - r, fx + ox + r, fy + oy + r) | t.poly([
        (fx + px * r, fy + py * r), (fx + ox + px * r, fy + oy + py * r),
        (fx + ox - px * r, fy + oy - py * r), (fx - px * r, fy - py * r)])
    t.piece(corps, V, ombre=3)
    face = t.ell(fx - r, fy - r, fx + r, fy + r)
    for k in (0.35, 0.7):
        cx, cy = fx + ox * k, fy + oy * k
        cer = t.ell(cx - r, cy - r, cx + r, cy + r)
        t.peindre(cer & ~t.ell(cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3) & ~face, B)
        t.peindre(cer & ~t.ell(cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2) & ~face, N)
    for a in (-0.9, -0.3, 0.3):
        x0, y0 = fx + r * math.sin(a + 0.6), fy - r * math.cos(a + 0.6)
        t.peindre(t.trait([(x0, y0), (x0 + ox, y0 + oy)]) & corps & ~face & ~t.rect(0, 0, 176, 0), N)
    t.piece(face, B, ombre=0)
    t.peindre(t.ell(fx - r + 4, fy - r + 4, fx + r - 4, fy + r - 4), V)
    t.peindre(t.ell(fx - r + 7, fy - r + 7, fx + r - 7, fy + r - 7), N)
    inner = t.ell(fx - r + 8, fy - r + 8, fx + r - 8, fy + r - 8)
    t.peindre(inner, V)
    for x in range(fx - 18, fx + 20, 7):
        t.peindre(t.trait([(x, fy - r), (x, fy + r)]) & inner, N)
    t.damier(t.bord(inner, 1, 1, 3) & inner, N)
    t.peindre(t.courbe([(fx - 18, fy - 6), (fx - 14, fy - 14), (fx - 6, fy - 19)], 2), B)
    t.piece(t.ell(fx - 5, fy - 5, fx + 5, fy + 5), B, ombre=0)
    t.peindre(t.ell(fx - 2, fy - 2, fx + 2, fy + 2), N)
    # la jambe arrière, tendue, qui pousse
    j2 = t.fuseau([(62, 112), (42, 134), (24, 150)], 15, 11)
    t.piece(j2, B, ombre=3)
    t.peindre(t.courbe([(52, 120), (40, 132), (30, 140)]) & j2, V)
    t.piece(t.poly([(10, 150), (26, 144), (32, 154), (30, 159), (8, 159)]), V, ombre=0)
    t.peindre(t.rect(8, 158, 32, 159), B)
    t.peindre(t.trait([(14, 151), (26, 147)]) & (t.xx % 2 == 0), N)
    # la jambe avant, genou plié
    j1 = t.fuseau([(72, 110), (90, 126), (84, 148)], 15, 11)
    t.piece(j1, B, ombre=3)
    t.peindre(t.courbe([(84, 120), (90, 126), (86, 132)]) & j1, V)
    t.piece(t.poly([(74, 146), (90, 146), (98, 152), (98, 159), (72, 159)]), V, ombre=0)
    t.peindre(t.rect(72, 158, 98, 159), B)
    t.peindre(t.trait([(78, 149), (90, 149)]) & (t.xx % 2 == 0), N)
    # le corps penché : chemise blanche, gilet vert semé, ceinture nouée
    torse = t.poly([(68, 66), (100, 76), (100, 92), (82, 116), (56, 114), (54, 92)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.courbe([(70, 72), (76, 88), (72, 104)]), N)
    t.peindre(t.courbe([(62, 78), (60, 92), (64, 104)]), N)
    for (x, y) in [(62, 84), (68, 96), (76, 80), (58, 98)]:
        t.etoile(x, y, B, 1)
    t.piece(t.poly([(70, 62), (92, 70), (88, 78), (74, 74)]), B, ombre=0)
    t.piece(t.poly([(56, 104), (84, 108), (82, 114), (54, 110)]), V, ombre=0)
    t.peindre(t.trait([(56, 106), (84, 110)]), B)
    t.piece(t.fuseau([(62, 108), (52, 118), (46, 124)], 4, 2), V, ombre=0)
    t.piece(t.fuseau([(62, 108), (56, 120), (54, 128)], 4, 2), V, ombre=0)
    # le bras du fond, puis le bras de devant : les deux mains à plat sur le tonneau
    b2 = t.fuseau([(88, 76), (100, 82), (102, 98)], 10, 8)
    t.piece(b2, B, ombre=2)
    t.peindre(t.courbe([(94, 80), (98, 86)]), V)
    t.peindre(t.trait([(96, 82), (100, 86)]), V)
    main2 = t.ell(98, 94, 110, 108)
    t.piece(main2, B, ombre=0)
    t.peindre(t.trait([(102, 96), (108, 96)]) | t.trait([(102, 100), (109, 100)]), N)
    b1 = t.fuseau([(78, 78), (84, 100), (94, 114)], 11, 9)
    t.piece(b1, B, ombre=2)
    t.peindre(t.courbe([(80, 88), (84, 96), (88, 100)]) & b1, V)
    t.peindre(t.trait([(82, 92), (88, 98)]), V)
    main1 = t.ell(90, 108, 102, 122)
    t.piece(main1, B, ombre=0)
    t.peindre(t.trait([(94, 111), (100, 110)]) | t.trait([(94, 115), (101, 114)]), N)
    # la tête, tendue en avant, au-dessus du tonneau
    tete = t.ell(80, 34, 116, 78)
    t.piece(tete, B, ombre=0)
    # le foulard noué, ses deux pans qui volent derrière
    for pts in ([(80, 46), (60, 36), (42, 42), (26, 34)], [(80, 50), (62, 56), (46, 64), (32, 62)]):
        m = t.fuseau(pts, 9, 3)
        t.piece(m, V, ombre=2)
        t.peindre(t.courbe(pts) & (t.xx % 5 == 0), B)
    t.piece(t.ell(72, 42, 86, 54), V, ombre=0)
    t.peindre(t.courbe([(76, 46), (80, 50), (78, 52)]), N)
    foul = t.ell(76, 26, 118, 56) & ~t.poly([(86, 46), (120, 38), (120, 64), (86, 64)])
    t.piece(foul, V, ombre=3)
    for (x, y) in [(86, 32), (96, 30), (106, 33), (82, 40), (92, 38), (102, 40)]:
        t.etoile(x, y, B, 1)
    t.piece(t.fuseau([(86, 50), (84, 56), (85, 62)], 4, 1), V, ombre=0, lumiere=False)
    # le visage de l'effort : sourcils froncés, mâchoire serrée, mais le regard décidé
    t.piece(t.fuseau([(89, 47), (95, 48), (100, 51)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(104, 51), (108, 47), (113, 46)], 3, 2), V, ombre=0)
    t.oeil(89, 54, l=11, h=8, regard=(2, 0), paupiere=3, cils=-1)
    t.oeil(104, 55, l=9, h=7, regard=(2, 0), paupiere=3)
    nez7(t, 101, 62, 7, 1)
    t.pixels(92, 71, """
::..........::
.:::::::::::::
.:oo:oo:oo:o:.
..::::::::::..
""")
    t.damier(t.ell(86, 65, 92, 69), V)
    # la goutte de l'effort, les traits de poussée
    t.pixels(118, 34, """
...:...
..:o:..
.:ooo:.
:ooo#o:
.:ooo:.
..:::..
""")
    for (x0, y0, x1, y1) in [(118, 80, 124, 76), (120, 86, 128, 84), (150, 156, 168, 156), (158, 152, 172, 152)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Déborah, gardienne du registre
def deborah_v3():
    t = Toile()
    # la robe longue
    robe = t.poly([(72, 70), (104, 70), (110, 100), (118, 152), (64, 152), (66, 100)])
    t.piece(robe, V, ombre=4)
    t.peindre(t.trait([(64, 148), (118, 148)], 3) & robe, B)
    for x in range(66, 118, 6):
        t.peindre(t.poly([(x, 152), (x + 3, 148), (x + 6, 152)]), N)
    for pts in ([(82, 112), (78, 132), (76, 148)], [(98, 112), (104, 130), (108, 148)]):
        t.peindre(t.courbe(pts), N)
    for (x, y) in [(72, 124), (90, 132), (106, 122), (80, 140), (100, 142), (70, 106)]:
        t.etoile(x, y, B, 1)
    # les bottines
    for x in (74, 94):
        b = t.poly([(x, 150), (x + 14, 150), (x + 16, 160), (x - 4, 160)])
        t.piece(b, V, ombre=0)
        t.damier(b, N)
        t.peindre(t.trait([(x - 2, 156), (x + 8, 152)]), B)
    # le corsage : col montant blanc, boutons, ceinture et le trousseau d'attache
    t.piece(t.poly([(78, 64), (98, 64), (100, 72), (88, 80), (76, 72)]), B, ombre=0)
    t.peindre(t.trait([(80, 68), (96, 68)]), V)
    for y in (84, 92, 100):
        t.peindre(t.ell(86, y, 89, y + 3), B)
        t.point(87, y + 1, N)
    t.piece(t.rect(66, 104, 110, 109), V, ombre=0)
    t.peindre(t.rect(66, 105, 110, 105), B)
    t.piece(t.rect(84, 103, 92, 110), B, ombre=0)
    t.peindre(t.rect(86, 105, 90, 108), N)
    # le registre ouvert sur l'avant-bras
    b2 = t.fuseau([(102, 76), (112, 94), (108, 108)], 11, 9)
    t.piece(b2, V, ombre=2)
    cuir = t.poly([(90, 98), (116, 94), (144, 100), (142, 120), (116, 114), (88, 118)])
    t.piece(cuir, V, ombre=2)
    pages = t.poly([(92, 98), (116, 96), (140, 100), (138, 116), (116, 112), (90, 114)])
    t.piece(pages, B, ombre=0)
    t.peindre(t.trait([(116, 96), (116, 112)]), N)
    for k in range(4):
        t.peindre(t.trait([(94, 102 + k * 3), (112, 100 + k * 3)]) & (t.xx % 3 != 0), V)
        t.peindre(t.trait([(120, 101 + k * 3), (136, 103 + k * 3)]) & (t.xx % 3 != 0), V)
    t.piece(t.fuseau([(118, 112), (120, 122), (116, 128)], 3, 2), B, ombre=0, lumiere=False)
    poing(t, 104, 112, 116, 122)
    # les tresses, sur le devant, jusqu'à la taille
    for (x0, x1) in ((72, 70), (100, 104)):
        for k in range(9):
            y = 56 + k * 6
            x = x0 + (x1 - x0) * k / 8
            m = t.ell(x - 4, y, x + 4, y + 7)
            t.piece(m, V, ombre=0, lumiere=False)
            t.peindre(t.trait([(x - 3, y + 2), (x + 2, y + 5)]) & m, N)
            t.point(int(x) - 2, y + 2, B)
        t.piece(t.rect(int(x1) - 3, 110, int(x1) + 3, 113), B, ombre=0)
        t.piece(t.fuseau([(x1, 114), (x1 - 2, 120), (x1 - 3, 124)], 6, 1), V, ombre=0, lumiere=False)
    # le bras levé qui fait tinter le trousseau de clés
    b1 = t.fuseau([(76, 76), (56, 66), (44, 30)], 11, 9)
    t.piece(b1, V, ombre=2)
    manchette(t, [(50, 32), (40, 30)], 5)
    t.peindre(t.ell(28, 26, 52, 50) & ~t.ell(31, 29, 49, 47), B)
    t.contour(t.ell(28, 26, 52, 50) & ~t.ell(31, 29, 49, 47), N)
    for (ang, l) in [(2.65, 22), (2.1, 28), (1.55, 26), (1.0, 22)]:
        dx, dy = math.cos(ang), math.sin(ang)
        cx, cy = 40 + 12 * dx, 38 + 12 * dy
        bx, by = cx + dx * 4, cy + dy * 4
        anneau = t.ell(bx - 5, by - 5, bx + 5, by + 5)
        tige = t.trait([(bx + dx * 4, by + dy * 4), (bx + dx * l, by + dy * l)], 3)
        px, py = -dy, dx
        ex, ey = bx + dx * l, by + dy * l
        dents = t.poly([(ex - dx * 6, ey - dy * 6), (ex, ey), (ex + px * 5, ey + py * 5), (ex + px * 5 - dx * 2, ey + py * 5 - dy * 2),
                        (ex + px * 3 - dx * 3, ey + py * 3 - dy * 3), (ex + px * 5 - dx * 5, ey + py * 5 - dy * 5),
                        (ex + px * 3 - dx * 6, ey + py * 3 - dy * 6)])
        t.piece(anneau | tige | dents, B, ombre=0)
        t.peindre(t.ell(bx - 2, by - 2, bx + 2, by + 2), N)
        t.peindre(t.trait([(bx + dx * 5, by + dy * 5), (bx + dx * (l - 2), by + dy * (l - 2))]), V)
    poing(t, 33, 14, 47, 28, vertical=True)
    for (x, y) in [(16, 24), (60, 14), (8, 54), (64, 44)]:
        t.etincelle(x, y)
    for (x0, y0, x1, y1) in [(16, 40, 22, 38), (14, 48, 20, 50), (56, 34, 60, 30)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # la tête, droite, le regard sur ses clés ; les cheveux en bandeaux qui encadrent le visage
    t.piece(t.poly([(68, 34), (108, 34), (110, 62), (104, 66), (72, 66), (66, 62)]), V, ombre=2, lumiere=False)
    tete = t.ell(70, 22, 106, 68)
    t.piece(tete, B, ombre=0)
    cap = t.ell(66, 12, 110, 52) & ~t.ell(72, 26, 104, 84)
    cap |= t.poly([(66, 34), (74, 34), (72, 58), (66, 60)]) | t.poly([(102, 34), (110, 34), (110, 60), (104, 58)])
    t.piece(cap, V, ombre=2)
    t.peindre(t.courbe([(88, 13), (87, 20), (88, 26)], 2), N)
    for pts in ([(84, 15), (76, 22), (72, 34)], [(80, 18), (70, 30), (68, 46)], [(92, 15), (100, 22), (104, 34)],
                [(96, 18), (106, 30), (108, 46)]):
        t.peindre(t.courbe(pts) & cap, N)
    t.peindre(t.courbe([(72, 20), (78, 15), (84, 14)]), B)
    t.peindre(t.courbe([(94, 15), (100, 17)]), B)
    t.piece(t.fuseau([(76, 39), (81, 36), (87, 37)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(91, 37), (96, 36), (101, 38)], 3, 2), V, ombre=0)
    t.oeil(76, 41, l=11, h=8, regard=(-2, -1), cils=-1)
    t.oeil(91, 41, l=10, h=8, regard=(-2, -1), cils=1)
    nez7(t, 88, 48, 7, -1)
    t.pixels(80, 59, """
::.........::
..:::::::::..
..:ooooooo:..
...:::::::...
""")
    t.damier(t.ell(75, 54, 80, 58), V)
    t.damier(t.ell(96, 54, 101, 58), V)
    t.sol(160, cx=90)
    return t.image()


# ------------------------------------------------------------------ Eden, maîtresse du chantier
def eden_v3():
    t = Toile()
    # le gros marteau sur l'épaule : manche puis masse, derrière
    manche = t.trait([(98, 100), (146, 30)], 4)
    t.piece(manche, B, ombre=0)
    t.peindre(t.trait([(99, 101), (147, 31)]), V)
    dx, dy = 48 / 84.9, -70 / 84.9
    px, py = -dy, dx
    cx, cy = 148, 27
    def pt(u, v):
        return (cx + px * u + dx * v, cy + py * u + dy * v)
    masse = t.poly([pt(-17, -9), pt(17, -9), pt(17, 9), pt(-17, 9)])
    t.piece(masse, V, ombre=3)
    for sgn in (-1, 1):
        t.piece(t.poly([pt(sgn * 14, -10), pt(sgn * 19, -8), pt(sgn * 19, 8), pt(sgn * 14, 10)]), B, ombre=0)
    t.peindre(t.trait([pt(-6, -9), pt(-6, 9)], 2) | t.trait([pt(6, -9), pt(6, 9)], 2), N)
    t.peindre(t.trait([pt(-12, -7), pt(-8, -7)]), B)
    # les jambes écartées, genouillères, chaussures de sécurité
    for (pts, pied) in [([(78, 108), (66, 130), (60, 146)], 46), ([(98, 108), (110, 130), (116, 146)], 104)]:
        j = t.fuseau(pts, 15, 13)
        t.piece(j, V, ombre=3)
        g = t.ell(pts[1][0] - 7, pts[1][1] - 5, pts[1][0] + 7, pts[1][1] + 5)
        t.piece(g, B, ombre=0)
        t.peindre(t.trait([(pts[1][0] - 5, pts[1][1]), (pts[1][0] + 5, pts[1][1])]), V)
        c = t.poly([(pied, 146), (pied + 22, 146), (pied + 26, 152), (pied + 26, 159), (pied - 2, 159), (pied - 2, 152)])
        t.piece(c, V, ombre=0)
        t.piece(t.ell(pied + 14, 148, pied + 26, 158) & c, B, ombre=0)
        t.peindre(t.rect(pied - 2, 157, pied + 26, 159), B)
        t.peindre(t.rect(pied - 2, 159, pied + 26, 159), N)
        t.peindre(t.trait([(pied + 2, 149), (pied + 12, 149)]) & (t.xx % 2 == 0), N)
    # le plan roulé, coincé sous le bras
    plan = t.poly([(34, 74), (40, 70), (80, 100), (74, 106)])
    t.piece(plan, B, ombre=2)
    t.piece(t.ell(30, 70, 40, 80), B, ombre=0)
    t.peindre(t.ell(33, 73, 37, 77) & ~t.ell(34, 74, 36, 76), V)
    t.peindre(t.trait([(52, 82), (48, 88)], 2), V)
    # le gilet de chantier à bandes, sur le tee-shirt
    torse = t.poly([(70, 66), (106, 66), (112, 88), (106, 112), (70, 112), (64, 88)])
    t.piece(torse, V, ombre=3)
    t.piece(t.poly([(80, 64), (96, 64), (92, 76), (84, 76)]), B, ombre=0)
    t.peindre(t.poly([(84, 65), (92, 65), (88, 72)]), V)
    for y in (88, 98):
        t.peindre(t.rect(64, y, 112, y + 3) & torse, B)
        t.peindre(t.rect(64, y + 1, 112, y + 2) & torse & (t.xx % 4 == 0), V)
    for x in (74, 99):
        t.peindre(t.rect(x, 66, x + 3, 112) & torse, B)
        t.peindre(t.rect(x + 1, 66, x + 2, 112) & torse & (t.yy % 4 == 0), V)
    t.peindre(t.courbe([(88, 76), (88, 112)]), N)
    for y in (80, 104):
        t.peindre(t.rect(86, y, 90, y + 1), B)
    t.piece(t.rect(66, 108, 110, 114), V, ombre=0)
    t.peindre(t.rect(66, 110, 110, 110) & (t.xx % 2 == 0), B)
    t.piece(t.rect(84, 107, 92, 115), B, ombre=0)
    t.peindre(t.rect(86, 109, 90, 113), N)
    # la poche à crayons et le mètre pendu à la ceinture
    t.piece(t.rect(102, 72, 110, 82), V, bord=B, ombre=0)
    t.peindre(t.rect(104, 68, 105, 72) | t.rect(107, 66, 108, 72), B)
    t.piece(t.rect(98, 114, 108, 122), B, ombre=0)
    t.peindre(t.ell(100, 116, 106, 121), V)
    # le poing sur la hanche, coude en dehors : manche courte verte, bras nu
    b1 = t.fuseau([(70, 72), (50, 88), (66, 104)], 12, 10)
    t.piece(b1, B, ombre=2)
    t.piece(t.fuseau([(72, 68), (62, 78)], 15, 13), V, ombre=2)
    t.peindre(t.courbe([(56, 86), (54, 90), (58, 94)]), N)
    poing(t, 62, 98, 76, 112)
    # le bras qui tient le manche sur l'épaule
    b2 = t.fuseau([(106, 72), (122, 94), (110, 92)], 12, 10)
    t.piece(b2, B, ombre=2)
    t.piece(t.fuseau([(104, 68), (116, 80)], 15, 13), V, ombre=2)
    t.peindre(t.courbe([(118, 88), (120, 92)]), N)
    poing(t, 100, 82, 114, 96, vertical=True)
    # la tête
    tete = t.ell(70, 26, 106, 66)
    t.piece(tete, B, ombre=0)
    for pts in ([(72, 36), (68, 46), (68, 56)], [(104, 36), (108, 46), (108, 54)]):
        t.piece(t.fuseau(pts, 6, 2), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(76, 37), (82, 35), (88, 37)], 3, 2), V, ombre=0)
    t.piece(t.fuseau([(92, 37), (97, 35), (102, 37)], 2, 3), V, ombre=0)
    t.oeil(76, 42, l=11, h=8, regard=(1, 0), cils=-1)
    t.oeil(91, 42, l=11, h=8, regard=(1, 0), cils=1)
    nez7(t, 88, 49, 7, 1)
    t.pixels(80, 58, """
::...........::
..:::::::::::..
..:ooooooooo:..
...:::###:::...
.....:::::.....
""")
    t.damier(t.ell(76, 52, 81, 56), V)
    # le casque de chantier, et la visière de soudeuse relevée par-dessus
    casque = t.ell(66, 6, 110, 44) & t.rect(0, 0, 176, 27)
    t.piece(casque, B, ombre=2)
    t.peindre(t.courbe([(88, 7), (88, 26)], 3), V)
    t.peindre(t.courbe([(76, 26), (74, 16), (80, 10)]) | t.courbe([(100, 26), (102, 16), (96, 10)]), V)
    t.piece(t.poly([(62, 26), (114, 26), (118, 31), (58, 31)]), B, ombre=0)
    t.peindre(t.rect(60, 29, 116, 29), V)
    vis = t.poly([(72, 8), (78, 0), (98, 0), (104, 8), (98, 12), (78, 12)])
    t.piece(vis, V, ombre=0)
    t.damier(vis, N)
    t.peindre(t.poly([(80, 3), (96, 3), (98, 9), (78, 9)]), V)
    t.peindre(t.trait([(81, 5), (88, 5)]), B)
    for (x, x2) in ((68, 74), (108, 102)):
        t.piece(t.trait([(x, 20), (x2, 10)], 3), V, ombre=0)
        t.piece(t.ell(x - 3, 17, x + 3, 23), B, ombre=0)
        t.point(x, 20, N)
    t.sol(160, cx=88)
    return t.image()


# ------------------------------------------------------------------ Edson, charpentier de marine
def edson_v3():
    t = Toile()
    # la cloison de planches
    cl = t.rect(132, 0, 175, 160)
    t.piece(cl, V, ombre=0, lumiere=False)
    for k, y in enumerate(range(0, 160, 14)):
        t.peindre(t.rect(132, y, 175, y + 1), N)
        t.peindre(t.rect(132, y + 2, 175, y + 2), B)
        jx = (150, 164, 140, 158)[k % 4]
        t.peindre(t.rect(jx, y + 2, jx, y + 13), N)
        t.point(jx - 3, y + 7, B); t.point(jx + 3, y + 7, B)
        for g in range(2):
            gy = y + 5 + g * 4 + (k % 2)
            t.peindre(t.trait([(134 + (k * 7) % 9, gy), (146 + (k * 5) % 7, gy)]) & (t.xx % 3 != 0), N)
        t.damier(t.rect(170, y + 2, 175, y + 13), N)
    for (cx, cy) in [(156, 44), (146, 116)]:
        t.peindre(t.ell(cx - 4, cy - 3, cx + 4, cy + 3) & ~t.ell(cx - 2, cy - 1, cx + 2, cy + 1), N)
    t.peindre(t.rect(130, 0, 131, 160), B)
    # les jambes, campées, penchées vers la cloison
    for pts, x in (([(80, 108), (74, 130), (72, 148)], 62), ([(98, 108), (106, 130), (110, 148)], 100)):
        j = t.fuseau(pts, 15, 12)
        t.piece(j, V, ombre=3)
        t.peindre(t.courbe([(pts[1][0] - 4, pts[1][1] - 6), (pts[1][0], pts[1][1]), (pts[1][0] - 3, pts[1][1] + 6)]) & j, N)
        c = t.poly([(x, 146), (x + 20, 146), (x + 24, 153), (x + 24, 159), (x - 2, 159)])
        t.piece(c, V, ombre=0)
        t.peindre(t.rect(x - 2, 157, x + 24, 158), B)
        t.peindre(t.trait([(x + 2, 149), (x + 14, 149)]) & (t.xx % 2 == 0), N)
    # la chemise blanche et les bretelles
    torse = t.poly([(76, 72), (108, 66), (116, 86), (110, 112), (76, 112), (70, 92)])
    t.piece(torse, B, ombre=3)
    t.peindre(t.courbe([(92, 70), (94, 90), (92, 110)]), N)
    for (a, b) in (((82, 72), (82, 112)), ((104, 68), (106, 112))):
        t.piece(t.trait([a, b], 4), V, ombre=0)
        t.piece(t.rect(b[0] - 3, 98, b[0] + 3, 103), B, ombre=0)
        t.point(b[0], 100, N)
    t.piece(t.rect(72, 108, 112, 114), V, ombre=0)
    t.peindre(t.trait([(86, 76), (90, 80)]) | t.trait([(98, 74), (100, 80)]), V)
    # la pochette et le crayon de rechange
    t.piece(t.rect(96, 112, 108, 122), V, bord=N, ombre=0)
    # le bras qui tient le niveau à bulle
    b2 = t.fuseau([(76, 76), (64, 92), (58, 108)], 12, 9)
    t.piece(b2, B, ombre=2)
    t.peindre(t.trait([(62, 92), (70, 96)], 2) & b2, V)
    niv = t.rect(14, 108, 74, 118)
    t.piece(niv, V, ombre=0)
    t.peindre(t.rect(14, 108, 74, 109), B)
    for x in range(18, 74, 6):
        t.peindre(t.rect(x, 116, x, 118), N)
    fiole = t.rect(30, 110, 46, 115)
    t.piece(fiole, B, ombre=0)
    t.peindre(t.rect(37, 110, 37, 115) | t.rect(41, 110, 41, 115), N)
    t.peindre(t.ell(37, 111, 41, 114), V)
    poing(t, 52, 104, 66, 118, vertical=True)
    # la tête, l'oreille collée à la cloison
    tete = t.ell(94, 28, 130, 72)
    t.piece(tete, B, ombre=0)
    oreille = t.ell(124, 44, 132, 58)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(127, 47), (130, 51), (127, 55)]), N)
    # le crayon sur l'oreille
    cr = t.trait([(122, 41), (136, 46)], 3)
    t.piece(cr, B, ombre=0)
    t.peindre(t.trait([(123, 41), (132, 44)]), V)
    t.peindre(t.poly([(132, 45), (136, 47), (132, 48)]), N)
    # la casquette à l'envers
    cas = t.ell(92, 12, 130, 42) & t.rect(0, 0, 176, 33)
    t.piece(cas, V, ombre=2)
    t.peindre(t.courbe([(98, 20), (110, 14), (124, 18)]), N)
    t.piece(t.ell(108, 10, 112, 14), V, ombre=0)
    visiere = t.poly([(96, 27), (84, 29), (76, 35), (88, 35), (98, 33)])
    t.piece(visiere, V, ombre=0)
    t.damier(visiere, N)
    t.peindre(t.trait([(94, 31), (128, 31)]) & cas, B)
    for pts in ([(98, 34), (95, 42), (96, 50)],):
        t.piece(t.fuseau(pts, 5, 1), V, ombre=0, lumiere=False)
    # le visage qui écoute : un sourcil levé, le regard en coin, la bouche en « o »
    t.piece(t.fuseau([(100, 40), (106, 37), (112, 38)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(115, 40), (119, 39), (123, 41)], 3, 2), V, ombre=0)
    t.oeil(101, 43, l=11, h=8, regard=(3, 0))
    t.oeil(115, 44, l=9, h=7, regard=(2, 0), paupiere=3)
    nez7(t, 111, 51, 8, 1)
    t.pixels(104, 62, """
..:::..
.:ooo:.
:o:::o:
:o:#:o:
.:ooo:.
..:::..
""")
    t.peindre(t.trait([(99, 47), (100, 49)]), N)
    t.damier(t.ell(97, 56, 102, 60), V)
    # le bras qui frappe la cloison du poing, « toc, toc »
    b1 = t.fuseau([(106, 74), (110, 94), (124, 88)], 12, 9)
    t.piece(b1, B, ombre=2)
    t.peindre(t.courbe([(104, 84), (110, 88), (116, 86)]) & b1, N)
    t.piece(t.fuseau([(106, 88), (114, 94)], 7, 7), V, ombre=0)
    t.piece(t.trait([(116, 92), (122, 88)], 4), B, ombre=0)
    poing(t, 118, 78, 132, 94, vertical=True)
    for (x0, y0, x1, y1) in [(136, 74, 142, 70), (136, 84, 144, 84), (136, 94, 142, 98)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    t.peindre(t.rect(144, 4, 175, 18), N)
    texte(t, 146, 6, "toc", B, 2)
    t.peindre(t.rect(146, 100, 170, 108), N)
    texte(t, 148, 102, "toc", B, 1)
    t.sol(160, cx=86, l=60)
    return t.image()


# ------------------------------------------------------------------ Elias, maître des convois
def elias_v3():
    t = Toile()
    # le grand compas, pointes au sol, plus grand que sa jambe
    for pts in ([(136, 62), (118, 158)], [(140, 62), (160, 158)]):
        g = t.trait(pts, 4)
        t.piece(g, B, ombre=0)
        t.peindre(t.trait([(pts[0][0] + 1, pts[0][1]), (pts[1][0] + 1, pts[1][1] - 6)]), V)
    t.peindre(t.poly([(116, 150), (122, 150), (118, 160)]) | t.poly([(156, 150), (162, 150), (161, 160)]), B)
    arc = t.courbe([(124, 112), (138, 118), (152, 112)], 2)
    t.piece(arc, V, ombre=0)
    t.peindre(t.ell(133, 112, 137, 116), B)
    tete_c = t.ell(130, 52, 146, 68)
    t.piece(tete_c, V, ombre=0)
    t.peindre(t.ell(135, 57, 141, 63), B)
    t.peindre(t.ell(137, 59, 139, 61), N)
    t.piece(t.rect(136, 42, 140, 52), B, ombre=0)
    t.piece(t.ell(132, 36, 144, 46), B, ombre=0)
    # les basques du long manteau, qui volent derrière
    basque = t.poly([(70, 96), (100, 98), (98, 128), (84, 124), (66, 134), (48, 130), (58, 112)])
    t.piece(basque, V, ombre=3)
    t.peindre(t.courbe([(70, 104), (62, 118), (54, 128)]), N)
    t.peindre(t.trait([(66, 134), (48, 130)], 2), B)
    # les jambes en marche : culotte, bas blancs, souliers à boucle
    for pts, (sx, sy) in (([(78, 110), (68, 128), (56, 144)], (38, 150)), ([(92, 110), (104, 126), (110, 146)], (102, 152))):
        j = t.fuseau([pts[0], pts[1]], 14, 11)
        t.piece(j, V, ombre=2)
        bas = t.fuseau([pts[1], pts[2]], 10, 8)
        t.piece(bas, B, ombre=2)
        t.peindre(t.ell(pts[1][0] - 6, pts[1][1] - 3, pts[1][0] + 6, pts[1][1] + 3), V)
        s = t.poly([(sx, sy), (sx + 14, sy - 6), (sx + 22, sy), (sx + 22, sy + 6), (sx, sy + 6)])
        t.piece(s, V, ombre=0)
        t.piece(t.rect(sx + 10, sy - 2, sx + 15, sy + 2), B, ombre=0)
        t.peindre(t.rect(sx, sy + 5, sx + 22, sy + 6), B)
    # le manteau : torse, revers blancs, gilet, boutons
    torse = t.poly([(72, 66), (104, 64), (112, 84), (106, 110), (70, 110), (64, 86)])
    t.piece(torse, V, ombre=3)
    gil = t.poly([(82, 70), (96, 70), (96, 106), (82, 106)])
    t.piece(gil, B, ombre=0)
    t.damier(t.bord(gil, 1, 0, 2) & gil, V)
    for y in (78, 86, 94, 102):
        t.peindre(t.ell(88, y, 90, y + 2), V)
    for pts in ([(76, 66), (82, 70), (80, 92), (72, 86)], [(102, 64), (96, 70), (98, 92), (106, 84)]):
        t.piece(t.poly(pts), B, ombre=0)
        t.peindre(t.poly(pts) & t.bord(t.poly(pts), 1, 0, 1), V)
    t.piece(t.poly([(80, 60), (98, 60), (96, 70), (82, 70)]), B, ombre=0)
    t.pixels(84, 64, "oo:oo:oo\n:oo:oo:o")
    # la carte roulée sous le bras du fond
    carte = t.poly([(48, 84), (84, 92), (82, 102), (46, 94)])
    t.piece(carte, B, ombre=2)
    t.piece(t.ell(42, 84, 52, 96), B, ombre=0)
    t.peindre(t.ell(45, 87, 49, 93) & ~t.ell(46, 88, 48, 92), V)
    t.peindre(t.trait([(62, 87), (61, 98)], 2), V)
    b2 = t.fuseau([(72, 70), (64, 86), (70, 98)], 12, 9)
    t.piece(b2, V, ombre=2)
    t.piece(t.rect(66, 92, 76, 98), B, ombre=0)
    # le bras qui s'appuie sur le compas comme sur une canne
    b1 = t.fuseau([(102, 68), (122, 66), (132, 48)], 12, 10)
    t.piece(b1, V, ombre=2)
    t.peindre(t.trait([(112, 64), (114, 72)]) & b1, N)
    manchette(t, [(124, 54), (132, 58)], 6)
    poing(t, 128, 36, 142, 50, vertical=True)
    # la tête, tournée vers sa route ; la queue de cheval nouée d'un ruban
    queue = t.fuseau([(72, 34), (62, 46), (58, 60)], 9, 3)
    t.piece(queue, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(68, 40), (62, 50), (60, 58)]), N)
    t.piece(t.rect(60, 42, 68, 46), B, ombre=0)
    tete = t.ell(70, 22, 108, 68)
    t.piece(tete, B, ombre=0)
    t.piece(t.fuseau([(74, 30), (72, 38), (73, 44)], 5, 2), V, ombre=0, lumiere=False)
    oreille = t.ell(66, 40, 73, 51)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(70, 43), (68, 45), (70, 48)]), N)
    t.piece(t.fuseau([(80, 36), (86, 33), (92, 34)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(96, 34), (101, 32), (106, 34)], 3, 2), V, ombre=0)
    t.oeil(81, 38, l=11, h=8, regard=(2, 1))
    t.oeil(96, 38, l=10, h=8, regard=(2, 1))
    t.peindre(t.trait([(78, 45), (79, 47)]), N)
    nez7(t, 96, 45, 8, 1)
    # la fine moustache, le sourire, la barbiche en pointe
    t.piece(t.fuseau([(97, 56), (91, 57), (86, 55)], 2, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(99, 56), (103, 57), (106, 55)], 2, 1), V, ombre=0, lumiere=False)
    t.pixels(88, 59, """
:..........:
.::::::::::.
..:oooooo:..
...::::::...
""")
    barbe = t.poly([(93, 64), (101, 64), (98, 72)])
    t.piece(barbe, V, ombre=0, lumiere=False)
    t.damier(t.ell(82, 51, 87, 55), V)
    # le tricorne, pointe en avant, galonné
    tric = t.poly([(60, 30), (70, 16), (88, 8), (108, 14), (116, 28), (104, 26), (100, 32), (90, 30), (74, 32)])
    t.piece(tric, V, ombre=3)
    t.peindre(t.trait([(62, 30), (74, 31), (90, 29), (100, 31), (104, 25), (115, 27)], 2), B)
    t.peindre(t.courbe([(72, 18), (88, 9), (106, 15)]), B)
    t.piece(t.ell(96, 16, 104, 24), B, ombre=0)
    t.peindre(t.ell(98, 18, 102, 22), V)
    t.sol(160, cx=96)
    return t.image()


# ------------------------------------------------------------------ Grégoire, gardien des plans
def gregoire_v3():
    t = Toile()
    # la lampe suspendue et ses rayons sur le pupitre
    t.peindre(t.rect(138, 0, 139, 12), B)
    abat = t.poly([(128, 12), (150, 12), (160, 26), (118, 26)])
    t.piece(abat, V, ombre=2)
    t.peindre(t.rect(118, 24, 160, 26), B)
    t.piece(t.ell(132, 24, 146, 34), B, ombre=0)
    for k in range(7):
        a = math.pi * (0.2 + 0.6 * k / 6)
        r0, r1 = 16, (30 if k % 2 == 0 else 24)
        t.peindre(t.trait([(139 + r0 * math.cos(a), 26 + r0 * math.sin(a)), (139 + r1 * math.cos(a), 26 + r1 * math.sin(a))]), B)
    # le pupitre incliné et son pied
    t.piece(t.rect(140, 106, 146, 156), V, ombre=0)
    t.piece(t.poly([(126, 154), (160, 154), (164, 160), (122, 160)]), V, ombre=0)
    pup = t.poly([(94, 98), (164, 80), (176, 94), (106, 114)])
    t.piece(pup, V, ombre=2)
    t.peindre(t.trait([(106, 114), (176, 95)], 2), B)
    plan = t.poly([(102, 98), (162, 83), (170, 94), (110, 110)])
    t.piece(plan, B, ombre=0)
    t.peindre(t.trait([(106, 101), (164, 86)]) & (t.xx % 2 == 0), V)
    for (u, v) in [(0.25, 0.45), (0.45, 0.55), (0.62, 0.35)]:
        x = 102 + 60 * u + 8 * v
        y = 98 - 15 * u + 12 * v
        t.peindre(t.poly([(x, y), (x + 9, y - 2), (x + 10, y + 3), (x + 1, y + 5)]) & ~t.poly([(x + 1, y), (x + 8, y - 1), (x + 9, y + 2), (x + 2, y + 4)]), V)
    t.peindre(t.trait([(150, 98), (156, 96)]) | t.trait([(152, 94), (154, 100)]), V)
    # le cachet de cire qu'il applique, « tac ! »
    cachet = t.ell(118, 92, 136, 102)
    t.piece(cachet, V, ombre=0)
    t.peindre(t.ell(123, 94, 131, 100), B)
    t.peindre(t.ell(126, 96, 128, 98), V)
    t.piece(t.rect(124, 64, 132, 92), B, ombre=0)
    t.peindre(t.rect(124, 80, 132, 82), V)
    t.piece(t.ell(121, 54, 135, 66), V, ombre=0)
    texte(t, 150, 50, "tac!", B, 2)
    for (x0, y0, x1, y1) in [(142, 64, 148, 60), (142, 72, 150, 72), (118, 64, 112, 60)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # les jambes un peu fléchies, les pantoufles
    for pts, x in (([(48, 118), (44, 136), (46, 152)], 34), ([(66, 118), (72, 136), (74, 152)], 66)):
        j = t.fuseau(pts, 12, 9)
        t.piece(j, V, ombre=2)
        c = t.poly([(x, 150), (x + 16, 150), (x + 22, 156), (x + 22, 159), (x, 159)])
        t.piece(c, B, ombre=0)
        t.damier(t.rect(x, 150, x + 22, 159) & c & t.bord(c, 1, 1, 2), V)
    # la blouse longue d'archiviste, le dos voûté par les années
    blouse = t.poly([(36, 124), (30, 104), (32, 86), (40, 70), (52, 60), (66, 58), (80, 64), (90, 76), (94, 92),
                     (88, 124)])
    t.piece(blouse, V, ombre=4)
    t.peindre(t.courbe([(38, 72), (32, 92), (36, 120)]), B)
    t.peindre(t.courbe([(64, 92), (62, 108), (64, 122)]), N)
    t.peindre(t.courbe([(80, 96), (82, 110), (80, 122)]), N)
    t.peindre(t.trait([(36, 120), (88, 120)], 2), B)
    for x in range(38, 88, 5):
        t.peindre(t.rect(x, 122, x + 1, 123), B)
    for (x, y) in [(44, 80), (54, 100), (46, 112), (74, 110), (40, 96), (70, 72)]:
        t.etoile(x, y, B, 1)
    # le col blanc et la poche aux crayons
    t.piece(t.poly([(68, 60), (84, 66), (82, 72), (70, 70), (64, 66)]), B, ombre=0)
    t.piece(t.rect(70, 96, 82, 108), V, bord=B, ombre=0)
    t.peindre(t.rect(72, 92, 73, 96) | t.rect(76, 90, 77, 96), B)
    # le bras du fond, qui serre un plan roulé contre le flanc
    roule = t.poly([(22, 86), (60, 80), (62, 90), (24, 96)])
    t.piece(roule, B, ombre=2)
    t.piece(t.ell(18, 86, 28, 96), B, ombre=0)
    t.peindre(t.ell(21, 89, 25, 93) & ~t.ell(22, 90, 24, 92), V)
    t.peindre(t.trait([(34, 84), (35, 94)], 2), V)
    b2 = t.fuseau([(48, 68), (40, 84), (50, 100)], 12, 9)
    t.piece(b2, V, ombre=2)
    t.peindre(t.courbe([(42, 80), (46, 86)]) & b2, N)
    t.piece(t.trait([(44, 94), (52, 98)], 4), B, ombre=0)
    poing(t, 46, 96, 58, 108)
    # le bras qui appuie sur le cachet
    b1 = t.fuseau([(74, 70), (100, 80), (124, 60)], 12, 9)
    t.piece(b1, V, ombre=2)
    t.peindre(t.courbe([(94, 78), (100, 74)]) & b1, N)
    manchette(t, [(114, 66), (120, 60)], 6)
    poing(t, 116, 46, 130, 60, vertical=True)
    # la tête, penchée en avant
    tete = t.ell(72, 34, 110, 78)
    t.piece(tete, B, ombre=0)
    t.peindre(t.courbe([(80, 40), (90, 36), (100, 38)]), V)
    # les touffes blanches et bouclées au-dessus des oreilles
    touffe = t.ell(62, 40, 76, 52) | t.ell(60, 48, 74, 60) | t.ell(64, 56, 76, 66) | t.ell(68, 38, 80, 48)
    t.piece(touffe, B, ombre=0)
    for (x, y) in [(66, 44), (64, 52), (68, 60), (72, 42)]:
        t.peindre(t.courbe([(x, y), (x + 2, y - 1), (x + 3, y + 1), (x + 1, y + 2)]), V)
    t.peindre(t.courbe([(86, 36), (92, 31), (98, 33)]) | t.courbe([(90, 36), (95, 33), (100, 35)]), N)
    oreille = t.ell(68, 52, 76, 64)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(72, 55), (70, 58), (72, 61)]), N)
    # les grands sourcils broussailleux en auvent
    for pts, e0, e1 in (([(78, 46), (88, 41), (97, 45)], 6, 3), ([(98, 45), (105, 41), (112, 44)], 5, 3)):
        m = t.fuseau(pts, e0, e1)
        t.piece(m, B, ombre=0)
        for k in range(0, 18, 3):
            x = pts[0][0] + k
            t.peindre(t.trait([(x, pts[0][1] - 2), (x + 2, pts[0][1] + 2)]) & m & t.rect(0, 0, 176, 46), N)
    # les yeux sur le cachet, les lunettes rondes
    t.oeil(84, 52, l=9, h=7, regard=(2, 1), paupiere=3)
    t.oeil(99, 52, l=8, h=7, regard=(2, 1), paupiere=3)
    for (x0, x1) in ((81, 95), (96, 109)):
        t.peindre(t.ell(x0, 49, x1, 62) & ~t.ell(x0 + 1, 50, x1 - 1, 61), N)
        t.peindre(t.rect(x0 + 3, 51, x0 + 4, 52), V)
    t.peindre(t.courbe([(95, 54), (96, 53)]), N)
    t.peindre(t.courbe([(81, 54), (75, 54)]), N)
    # le gros nez rond, la bouche qui sourit d'aise
    nez = t.ell(100, 58, 112, 68)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2) & nez, V)
    t.point(105, 66, N)
    t.pixels(92, 69, """
:.........:
.:::::::::.
..:oooo:...
...::::....
""")
    t.peindre(t.courbe([(96, 76), (100, 77), (104, 76)]), N)
    t.peindre(t.courbe([(84, 66), (86, 70)]), N)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Ian, armurier
def ian_v3():
    t = Toile()
    # la caisse blindée
    caisse = t.rect(112, 92, 170, 158)
    t.piece(caisse, V, ombre=3)
    t.peindre(t.rect(112, 92, 170, 96) | t.rect(112, 154, 170, 158) | t.rect(112, 92, 116, 158) | t.rect(166, 92, 170, 158), B)
    t.peindre(t.rect(139, 92, 142, 158) | t.rect(112, 123, 170, 126), B)
    for (x0, y0) in [(118, 98), (144, 98), (118, 128), (144, 128)]:
        p = t.rect(x0, y0, x0 + 19, y0 + 22)
        t.damier(t.bord(p, 1, 1, 2) & p, N)
        rivets(t, [(x0 + 1, y0 + 1), (x0 + 17, y0 + 1), (x0 + 1, y0 + 20), (x0 + 17, y0 + 20)])
    t.peindre(t.rect(110, 158, 172, 159), N)
    # le boulon serré
    t.piece(t.poly([(122, 104), (128, 101), (134, 104), (134, 110), (128, 113), (122, 110)]), B, ombre=0)
    t.peindre(t.ell(126, 105, 130, 109), N)
    # le bouclier au cadenas, posé contre la jambe
    bouc = t.poly([(4, 104), (44, 104), (44, 128), (24, 154), (4, 128)])
    t.piece(bouc, V, ombre=3)
    t.peindre(bouc & ~t.poly([(8, 108), (40, 108), (40, 127), (24, 149), (8, 127)]), B)
    t.piece(t.rect(16, 120, 32, 134), B, ombre=0)
    t.peindre(t.ell(18, 110, 30, 124) & ~t.ell(21, 113, 27, 124) & t.rect(0, 0, 176, 121), B)
    t.contour(t.ell(18, 110, 30, 124) & ~t.ell(21, 113, 27, 124) & t.rect(0, 0, 176, 121), N)
    t.peindre(t.ell(22, 124, 26, 128) | t.rect(23, 127, 25, 131), N)
    # la jambe à genou, la jambe d'appui
    cuisse2 = t.fuseau([(52, 118), (54, 140), (58, 150)], 15, 12)
    t.piece(cuisse2, V, ombre=3)
    tibia = t.poly([(46, 146), (60, 144), (36, 158), (24, 158)])
    botte2 = t.poly([(30, 146), (60, 144), (62, 158), (14, 158), (14, 152)])
    t.piece(botte2, V, ombre=0)
    t.damier(botte2 & t.rect(0, 144, 176, 152), N)
    t.peindre(t.trait([(18, 155), (40, 149)]), B)
    t.peindre(t.rect(14, 157, 62, 158), B)
    cuisse = t.fuseau([(70, 116), (90, 118), (98, 124)], 15, 13)
    t.piece(cuisse, V, ombre=3)
    t.piece(t.ell(90, 116, 104, 130), B, ombre=0)
    t.peindre(t.ell(94, 120, 100, 126), V)
    mollet = t.fuseau([(96, 126), (96, 140), (96, 148)], 13, 11)
    t.piece(mollet, V, ombre=3)
    b = t.poly([(86, 146), (102, 146), (110, 152), (110, 159), (84, 159)])
    t.piece(b, V, ombre=0)
    t.damier(b & t.rect(0, 146, 176, 151), N)
    t.peindre(t.rect(84, 157, 110, 158), B)
    # le torse : cotte de travail, tablier de cuir, ceinture à outils
    torse = t.poly([(56, 70), (88, 68), (96, 86), (90, 118), (52, 120), (46, 92)])
    t.piece(torse, V, ombre=3)
    tab = t.poly([(60, 84), (86, 82), (88, 118), (56, 120)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.courbe([(70, 88), (68, 104), (70, 118)]), V)
    t.piece(t.rect(48, 108, 92, 114), V, ombre=0)
    t.peindre(t.rect(48, 110, 92, 110) & (t.xx % 2 == 0), B)
    t.piece(t.rect(66, 107, 74, 115), B, ombre=0)
    t.peindre(t.rect(68, 109, 72, 113), N)
    t.piece(t.poly([(78, 112), (84, 112), (82, 124), (80, 124)]), B, ombre=0)
    # les épaulières
    for (x0, y0, x1, y1) in ((44, 64, 66, 84), (78, 62, 100, 82)):
        e = t.ell(x0, y0, x1, y1) & t.rect(0, 0, 176, (y0 + y1) // 2 + 4)
        t.piece(e, B, ombre=0)
        for k in (4, 8):
            t.peindre(t.courbe([(x0 + 2, y0 + k + 2), ((x0 + x1) // 2, y0 + k - 2), (x1 - 2, y0 + k + 2)]) & e, V)
        rivets(t, [((x0 + x1) // 2, y0 + 3)], N)
    # la clé énorme : la mâchoire à fourche sur le boulon, le long manche que ses deux mains tirent
    bx, by = 128, 107
    dx, dy = 0.886, 0.463
    px, py = -dy, dx
    def pt(u, v):
        return (bx + dx * u + px * v, by + dy * u + py * v)
    cle = t.trait([pt(-50, 0), pt(-8, 0)], 7)
    t.piece(cle, B, ombre=0)
    t.peindre(t.trait([pt(-46, 0), pt(-12, 0)]), V)
    machoire = t.poly([pt(-14, -8), pt(-8, -12), pt(10, -12), pt(12, -7), pt(12, 7), pt(10, 12), pt(-8, 12), pt(-14, 8)])
    machoire &= ~t.poly([pt(-5, -5), pt(14, -5), pt(14, 5), pt(-5, 5)])
    t.piece(machoire, B, ombre=0)
    t.damier(t.bord(machoire, 1, 1, 2) & machoire, V)
    t.piece(t.poly([(122, 104), (128, 101), (134, 104), (134, 110), (128, 113), (122, 110)]), V, ombre=0)
    t.peindre(t.ell(126, 105, 130, 109), N)
    t.point(127, 106, B)
    for (x0, y0, x1, y1) in [(140, 86, 146, 80), (132, 84, 134, 78), (148, 92, 154, 90), (144, 118, 150, 122)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # les bras qui tirent sur le manche
    b2 = t.fuseau([(86, 76), (96, 96), (98, 90)], 11, 9)
    t.piece(b2, V, ombre=2)
    poing(t, 90, 82, 104, 96, vertical=True)
    b1 = t.fuseau([(58, 80), (70, 98), (84, 88)], 12, 9)
    t.piece(b1, V, ombre=2)
    t.peindre(t.courbe([(62, 88), (68, 94)]) & b1, N)
    poing(t, 78, 76, 92, 90, vertical=True)
    # la tête
    tete = t.ell(56, 26, 92, 72)
    t.piece(tete, B, ombre=0)
    t.piece(t.fuseau([(62, 38), (59, 48), (59, 56)], 5, 2), V, ombre=0, lumiere=False)
    oreille = t.ell(54, 46, 62, 58)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(58, 49), (56, 52), (58, 55)]), N)
    t.piece(t.fuseau([(64, 41), (70, 39), (76, 41)], 3, 3), V, ombre=0)
    t.piece(t.fuseau([(80, 41), (85, 39), (90, 41)], 3, 2), V, ombre=0)
    t.oeil(65, 44, l=11, h=8, regard=(3, 1), paupiere=3)
    t.oeil(80, 44, l=10, h=8, regard=(2, 1), paupiere=3)
    nez7(t, 82, 50, 8, 1)
    # la langue au coin des lèvres : toute sa concentration
    t.pixels(70, 61, """
..........:::.
.::::::::.:##:
...:::::::###:
..........:##:
...........::.
""")
    t.damier(t.ell(63, 56, 68, 60), V)
    # le casque rond, rivé, à jugulaire
    casque = t.ell(52, 6, 96, 44) & t.rect(0, 0, 176, 32)
    t.piece(casque, V, ombre=3)
    t.peindre(t.courbe([(62, 14), (74, 9), (86, 14)]), B)
    t.piece(t.poly([(48, 31), (100, 31), (102, 36), (46, 36)]), B, ombre=0)
    t.peindre(t.rect(48, 33, 100, 33) & (t.xx % 3 == 0), V)
    t.piece(t.rect(72, 4, 76, 14), V, ombre=0)
    rivets(t, [(58, 26), (66, 20), (82, 20), (90, 26)])
    t.sol(160, cx=90)
    return t.image()


PORTRAITS = {
    "item_adonis.gif": adonis_v3, "item_anissa.gif": anissa_v3, "item_arnaud.gif": arnaud_v3,
    "item_chahla.gif": chahla_v3, "item_deborah.gif": deborah_v3, "item_eden.gif": eden_v3,
    "item_edson.gif": edson_v3, "item_elias.gif": elias_v3, "item_gregoire.gif": gregoire_v3,
    "item_ian.gif": ian_v3,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
