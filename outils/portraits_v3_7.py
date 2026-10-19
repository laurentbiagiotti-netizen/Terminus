"""Portraits v3, lot 7 : les habitants de Lumen (chapitre 6) et de Port-Aube (chapitre 7), redessinés en grand.

Chaque fonction <nom>() construit le personnage pièce par pièce sur la toile fine de portrait_v3 (176 x 170 cases de
2 px) et renvoie l'image ; dessiner_lieux.finir la colle dans le cadre (GIF 416 x 404, trois couleurs).
Mêmes personnages, mêmes rôles et mêmes objets que les anciens dessins (dessiner_machines.py pour Lumen,
dessiner_ile.py pour Port-Aube), mis en scène en grand.

Usage : python3 outils/portraits_v3_7.py            (tout le lot)
        python3 outils/portraits_v3_7.py item_sara.gif item_rayan.gif
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portrait_v3 import Toile, N, V, B, texte, dilater  # noqa: E402
from dessiner_lieux import finir  # noqa: E402


# ------------------------------------------------------------------ petites aides communes

def poing(t, x0, y0, x1, y1, doigts=3, sens=1):
    """Un poing fermé : ellipse blanche cerclée, traits des doigts."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    h = (y1 - y0)
    for k in range(doigts):
        y = y0 + 3 + k * (h - 5) // max(1, doigts - 1) if doigts > 1 else (y0 + y1) // 2
        if sens > 0:
            t.peindre(t.trait([(x0 + 2, y), (x0 + (x1 - x0) // 2, y)]) & m, N)
        else:
            t.peindre(t.trait([(x1 - (x1 - x0) // 2, y), (x1 - 2, y)]) & m, N)
    return m


def manchette(t, pts):
    """Une manchette blanche (poly) entre la manche et la main."""
    m = t.poly(pts)
    t.piece(m, B, ombre=0)
    return m


def botte(t, x0, x1, y_haut, pointe=1, y_sol=160):
    """Une chaussure ou botte verte à semelle blanche, tramée de noir, reflet blanc ; pointe : 1 vers la droite."""
    if pointe > 0:
        b = t.poly([(x0, y_haut), (x1 - 6, y_haut), (x1 - 4, y_sol - 8), (x1 + 4, y_sol - 5), (x1 + 4, y_sol - 1),
                    (x0, y_sol - 1)])
    else:
        b = t.poly([(x0 + 6, y_haut), (x1, y_haut), (x1, y_sol - 1), (x0 - 4, y_sol - 1), (x0 - 4, y_sol - 5),
                    (x0 + 4, y_sol - 8)])
    t.piece(b, V, ombre=0)
    t.damier(b & t.rect(0, y_haut + 2, 176, y_sol - 5) & t.bord(b, 1 if pointe > 0 else -1, 0, 3), N)
    t.peindre(t.rect(x0 - 4, y_sol - 3, x1 + 4, y_sol - 2) & b, B)
    t.peindre(t.rect(x0 - 5, y_sol - 1, x1 + 5, y_sol - 1), N)
    return b


def plis(t, m, lignes, c=N, ep=1):
    for pts in lignes:
        t.peindre(t.courbe(pts, ep) & m, c)


def meche(t, pts, e0=5, e1=1, c=V):
    return t.piece(t.fuseau(pts, e0, e1), c, ombre=0, lumiere=False)


# ------------------------------------------------------------------ Port-Aube (chapitre 7)

def miguel():
    """Le forgeron des sceaux : bandeau noué, avant-bras puissants, tablier de cuir ; il lève son marteau au-dessus
    de la tête et va l'abattre sur l'enclume où rougeoie le sceau, des étincelles jaillissent en gerbe."""
    t = Toile()
    # l'enclume, devant à droite
    corne = t.poly([(92, 118), (112, 114), (112, 126), (100, 124)])
    t.piece(corne, B, ombre=2)
    table = t.poly([(108, 112), (166, 112), (166, 118), (160, 126), (114, 126)])
    t.piece(table, B, ombre=2)
    t.peindre(t.rect(110, 116, 164, 116) & table, N)
    taille = t.poly([(124, 126), (152, 126), (148, 142), (128, 142)])
    t.piece(taille, V, ombre=2)
    t.hachures(taille, N, 3)
    pied = t.poly([(118, 142), (158, 142), (166, 152), (166, 158), (110, 158), (110, 152)])
    t.piece(pied, B, ombre=3)
    t.peindre(t.trait([(114, 151), (162, 151)]), N)
    t.peindre(t.rect(110, 159, 166, 159), N)
    # le sceau qui rougeoie sur l'enclume, et la gerbe d'étincelles
    for k in range(9):
        a = -math.pi * (0.08 + 0.105 * k)
        r1 = 30 if k % 2 == 0 else 20
        t.peindre(t.trait([(140 + 12 * math.cos(a), 104 + 12 * math.sin(a)),
                           (140 + r1 * math.cos(a), 104 + r1 * math.sin(a))]), B)
    for (x, y) in [(118, 70), (164, 76), (156, 60), (128, 64), (170, 94)]:
        t.etincelle(x, y)
    for (x, y) in [(150, 70), (134, 76), (112, 84), (168, 104)]:
        t.etoile(x, y, B, 1)
    sceau = t.ell(130, 102, 150, 113)
    t.piece(sceau, V, ombre=0)
    t.peindre(t.ell(134, 104, 146, 111), B)
    t.etoile(140, 107, V, 2)
    # la pince qui tient le sceau
    t.peindre(t.trait([(100, 104), (132, 108)], 3), N)
    t.peindre(t.trait([(100, 103), (131, 107)], 1) | t.trait([(100, 106), (130, 110)], 1), B)
    # les jambes écartées, pantalon de travail
    for pts in ([(56, 118), (72, 118), (68, 150), (52, 150)], [(76, 118), (92, 118), (98, 150), (82, 150)]):
        j = t.poly(pts)
        t.piece(j, V, ombre=2)
        t.damier(j & t.rect(0, 136, 176, 150), N)
    botte(t, 44, 66, 146, -1)
    botte(t, 82, 100, 146, 1)
    # le torse : chemise blanche aux manches roulées, tablier de cuir vert
    torse = t.poly([(52, 80), (94, 78), (100, 96), (96, 124), (52, 124), (48, 98)])
    t.piece(torse, B, ombre=3)
    tablier = t.poly([(58, 90), (88, 90), (94, 136), (90, 140), (54, 140), (52, 136)])
    t.piece(tablier, V, ombre=3)
    t.peindre(t.courbe([(56, 134), (72, 138), (92, 134)]) & tablier, N)
    t.peindre(t.courbe([(57, 94), (55, 136)]) & (((t.yy) % 3) == 0), B)
    t.peindre(t.courbe([(89, 94), (91, 136)]) & (((t.yy) % 3) == 0), B)
    t.peindre(t.trait([(56, 137), (90, 137)]) & (((t.xx) % 3) == 0), B)
    plis(t, tablier, [[(66, 106), (64, 120), (62, 136)], [(80, 106), (82, 120), (84, 136)]])
    poche = t.poly([(64, 108), (82, 108), (82, 120), (64, 120)])
    t.peindre(poche & ~t.rect(65, 109, 81, 119), B)
    t.peindre(t.rect(64, 108, 82, 109), B)
    t.peindre(t.trait([(68, 104), (68, 112)], 2) | t.trait([(76, 102), (77, 112)], 2), B)
    t.peindre(t.rect(56, 98, 92, 100) & tablier, N)
    t.piece(t.rect(70, 97, 76, 101), B, ombre=0)
    t.point(73, 99, N)
    for pts in ([(58, 90), (60, 80)], [(88, 90), (86, 80)]):
        t.peindre(t.trait(pts, 3), V)
    # le bras de devant, qui serre la pince
    bras = t.fuseau([(92, 84), (98, 96), (100, 106)], 12, 10)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(94, 92), (98, 96)]) | t.courbe([(96, 100), (100, 103)]), N)
    manche = t.fuseau([(90, 82), (95, 90)], 14, 13)
    t.piece(manche, B, ombre=2)
    t.peindre(t.trait([(88, 92), (100, 88)]), N)
    poing(t, 94, 100, 106, 112)
    # le bras levé, qui brandit le marteau au-dessus de la tête
    bras2 = t.fuseau([(54, 86), (34, 70), (30, 40)], 13, 11)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.courbe([(34, 68), (30, 58), (31, 48)]), V)
    t.peindre(t.courbe([(40, 74), (36, 66)]), N)
    m2 = t.fuseau([(58, 90), (46, 80)], 15, 14)
    t.piece(m2, B, ombre=2)
    t.peindre(t.trait([(42, 84), (52, 74)]), N)
    manche_ = t.trait([(34, 34), (50, 10)], 4)
    t.piece(manche_, V, ombre=0)
    t.peindre(t.trait([(35, 32), (48, 12)]), B)
    tete_m = t.poly([(32, 6), (58, 2), (60, 14), (34, 18)])
    t.piece(tete_m, B, ombre=2)
    t.peindre(t.poly([(32, 6), (37, 5), (39, 17), (34, 18)]), V)
    t.peindre(t.poly([(54, 3), (58, 2), (60, 14), (56, 15)]), V)
    t.peindre(t.trait([(44, 6), (46, 15)], 3), V)
    t.peindre(t.trait([(45, 6), (47, 15)]), N)
    poing(t, 23, 26, 39, 42)
    for (x, y) in [(76, 4), (16, 16)]:
        t.peindre(t.courbe([(x, y), (x + 4, y + 4), (x + 3, y + 10)]), B)
    # la tête, tournée vers l'enclume
    tete = t.ell(56, 34, 94, 80)
    t.piece(tete, B, ombre=0)
    oreille = t.ell(52, 50, 61, 64)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(57, 53), (55, 57), (57, 61)]), N)
    t.damier(t.ell(64, 64, 92, 82) & ~t.ell(66, 58, 90, 78) & tete, V)
    # les cheveux courts qui dépassent, le bandeau noué, les pointes qui flottent
    band = t.poly([(54, 38), (70, 31), (94, 34), (96, 43), (56, 47)])
    t.piece(band, V, ombre=0)
    for (x, y) in [(62, 40), (70, 36), (78, 37), (86, 37), (66, 43), (74, 41), (82, 41), (90, 41)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), B)
    t.peindre(t.courbe([(58, 46), (76, 42), (95, 42)]), N)
    t.piece(t.fuseau([(54, 42), (46, 40), (40, 44)], 6, 2), V, ombre=0)
    t.piece(t.fuseau([(54, 44), (48, 50), (46, 56)], 5, 2), V, ombre=0)
    t.piece(t.ell(50, 38, 58, 47), V, ombre=0)
    # sourcils froncés, yeux sur le sceau
    t.piece(t.fuseau([(63, 49), (71, 50), (77, 54)], 3, 5), V, ombre=0)
    t.piece(t.fuseau([(81, 54), (86, 50), (93, 49)], 5, 3), V, ombre=0)
    t.oeil(65, 54, l=11, h=8, regard=(2, 1))
    t.oeil(81, 54, l=10, h=8, regard=(2, 1))
    nez = t.poly([(77, 58), (84, 66), (82, 70), (75, 69)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(80, 69, N)
    # la bouche serrée par l'effort, dents visibles
    m1 = t.piece(t.fuseau([(77, 71), (71, 72), (66, 76)], 5, 1), V, ombre=0)
    m2 = t.piece(t.fuseau([(79, 71), (85, 72), (89, 76)], 5, 1), V, ombre=0)
    t.pixels(70, 74, """
:..........:
.::::::::::.
.:oo:oo:oo:.
..::::::::..
""")
    t.sol(160, cx=96)
    return t.image()


def noam():
    """Le gardien des greniers : grande barbe taillée en carré, gilet de travail à poches ; il fait tinter son gros
    trousseau de clés levé à hauteur d'épaule, le dossier calé sous le bras ; un clin d'oeil."""
    t = Toile()
    # les jambes, pantalon droit, et les chaussures
    for x in (64, 82):
        j = t.poly([(x, 120), (x + 15, 120), (x + 15, 150), (x + 1, 150)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 7, 124), (x + 7, 148)]), N)
    botte(t, 58, 78, 147, -1)
    botte(t, 84, 100, 147, 1)
    # le dossier calé sous le bras (derrière le bras)
    dos = t.poly([(30, 92), (60, 86), (66, 124), (36, 130)])
    t.piece(dos, B, ombre=3)
    t.peindre(t.poly([(30, 92), (60, 86), (61, 92), (31, 98)]), V)
    t.piece(t.poly([(36, 84), (48, 82), (49, 88), (37, 90)]), V, ombre=0)
    for k in range(4):
        t.peindre(t.trait([(36, 104 + k * 5), (56, 100 + k * 5)]) & (((t.xx) % 4) != 3), N)
    texte(t, 37, 122, "n42", V)
    # le torse : chemise blanche, gilet de travail vert à poches
    torse = t.poly([(62, 80), (102, 80), (106, 100), (102, 124), (62, 124), (58, 100)])
    t.piece(torse, B, ombre=3)
    for pts in ([(62, 80), (68, 80), (76, 104), (76, 124), (62, 124), (58, 100)], [(98, 80), (102, 80), (106, 100), (102, 124), (90, 124), (90, 104)]):
        g = t.poly(pts)
        t.piece(g, V, ombre=2)
    for (x, y) in [(64, 106), (92, 106)]:
        pch = t.rect(x, y, x + 9, y + 10)
        t.peindre(pch & ~t.rect(x + 1, y + 1, x + 8, y + 9), N)
        t.peindre(t.rect(x, y, x + 9, y + 2), B)
        t.point(x + 4, y + 3, N)
    t.peindre(t.rect(95, 100, 96, 106), B)
    t.peindre(t.rect(98, 100, 99, 106), N)
    for y in (100, 108, 116):
        t.peindre(t.ell(82, y, 84, y + 2), V)
    t.peindre(t.rect(58, 120, 106, 123) & torse, N)
    t.piece(t.rect(80, 119, 86, 124), B, ombre=0)
    # le bras qui tient le dossier
    bras = t.fuseau([(64, 84), (58, 102), (64, 118)], 12, 10)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(58, 96), (62, 98)]), N)
    t.piece(t.fuseau([(64, 84), (60, 96)], 14, 13), V, ombre=2)
    poing(t, 58, 114, 72, 126)
    # le bras levé qui fait tinter le trousseau
    bras2 = t.fuseau([(114, 98), (122, 94), (126, 72)], 11, 9)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.courbe([(121, 92), (124, 84)]), N)
    t.piece(t.fuseau([(100, 84), (118, 98)], 14, 13), V, ombre=2)
    t.piece(t.poly([(112, 92), (122, 98), (118, 104), (110, 98)]), B, ombre=0)
    # l'anneau, les clés qui pendent et tintent
    anneau = t.ell(118, 52, 146, 78) & ~t.ell(122, 56, 142, 74)
    t.piece(anneau, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(124, 56), (130, 53), (138, 54)]), B)
    for (x0, y0, a, lg) in [(124, 76, 1.9, 22), (132, 78, 1.65, 26), (140, 76, 1.35, 22), (146, 68, 0.9, 20)]:
        x1, y1 = x0 + lg * math.cos(a), y0 + lg * math.sin(a)
        tige = t.trait([(x0, y0), (x1, y1)], 3)
        t.piece(tige, B, ombre=0)
        tete_c = t.ell(x0 - 4, y0 - 3, x0 + 4, y0 + 5)
        t.piece(tete_c, B, ombre=0)
        t.peindre(t.ell(x0 - 1, y0, x0 + 1, y0 + 2), N)
        dx, dy = -math.sin(a), math.cos(a)
        for k in (4, 8):
            xb, yb = x1 - k * math.cos(a) * 0.6, y1 - k * math.sin(a) * 0.6
            t.peindre(t.trait([(xb, yb), (xb + 4 * dx * -1, yb + 4 * dy * -1)], 2), B)
    for pts in ([(110, 72), (106, 78), (110, 84)], [(152, 84), (158, 90), (154, 98)], [(150, 100), (156, 106)]):
        t.peindre(t.courbe(pts), B)
    for (x, y) in [(158, 62), (114, 100), (162, 78)]:
        t.etincelle(x, y)
    poing(t, 118, 62, 134, 78, sens=-1)
    # la tête
    tete = t.ell(62, 22, 102, 78)
    t.piece(tete, B, ombre=0)
    for x in (57, 98):
        o = t.ell(x, 44, x + 9, 58)
        t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(60, 47), (59, 51), (61, 55)]) | t.courbe([(103, 47), (104, 51), (102, 55)]), N)
    # les cheveux courts en brosse, une mèche sur le front
    ch = (t.ell(62, 16, 102, 44) & ~t.ell(64, 30, 100, 76)) | t.fuseau([(66, 32), (76, 26), (84, 30)], 6, 2)
    t.piece(ch, V, ombre=2)
    for x in range(68, 100, 5):
        t.peindre(t.trait([(x, 20 + abs(x - 82) // 6), (x + 2, 26 + abs(x - 82) // 6)]), N)
    t.peindre(t.courbe([(70, 20), (82, 17), (94, 20)]), B)
    # la barbe taillée en carré, la bouche qui sourit dedans
    barbe = t.poly([(63, 60), (70, 70), (94, 70), (101, 60), (102, 74), (97, 98), (67, 98), (62, 74)])
    barbe &= ~t.rect(0, 95, 176, 120)
    for x in range(66, 94, 7):
        barbe |= t.ell(x, 90, x + 8, 100)
    barbe &= ~t.ell(75, 67, 91, 81)
    t.piece(barbe, V, ombre=3, lumiere=False)
    t.contour(barbe & t.rect(0, 86, 176, 104), B)
    for (x, y) in [(68, 82), (80, 88), (92, 86), (98, 76), (74, 92), (88, 94)]:
        t.peindre(t.courbe([(x + 3, y), (x, y - 1), (x - 1, y + 2), (x + 1, y + 4), (x + 4, y + 3)]), N)
    t.peindre(t.courbe([(66, 72), (68, 78)]) | t.courbe([(100, 64), (100, 70)]), B)
    # les sourcils : l'un levé, l'autre baissé sur l'oeil fermé
    t.piece(t.fuseau([(66, 44), (72, 44), (79, 47)], 4, 3), V, ombre=0)
    t.piece(t.fuseau([(85, 43), (91, 38), (98, 40)], 3, 5), V, ombre=0)
    # le clin d'oeil (oeil gauche fermé, rides de rire), l'oeil droit sur les clés
    t.peindre(t.courbe([(67, 53), (73, 50), (79, 53)], 2), N)
    t.peindre(t.trait([(64, 51), (66, 52)]) | t.trait([(64, 55), (66, 54)]), N)
    t.oeil(85, 46, l=12, h=9, regard=(2, -1))
    t.peindre(t.trait([(99, 50), (101, 49)]), N)
    nez = t.poly([(82, 52), (78, 60), (77, 63), (80, 66), (88, 66), (91, 63), (87, 56)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 0, 3) | t.bord(nez, 0, 1, 2), V)
    t.point(81, 64, N); t.point(86, 64, N)
    t.damier(t.ell(65, 57, 73, 63), V)
    # moustache et sourire dans la barbe
    t.piece(t.fuseau([(82, 67), (75, 68), (69, 64)], 5, 1), V, ombre=0)
    t.piece(t.fuseau([(84, 67), (91, 67), (97, 62)], 5, 1), V, ombre=0)
    t.pixels(76, 70, """
:.............
.::::::::::::.
.:oooooooooo:.
..:oooooooo:..
...::####::...
.....::::.....
""")
    t.sol(160, cx=92)
    return t.image()


def younes():
    """Le facteur : assis tout en haut d'une pile de sacs postaux, la casquette de travers, une jambe ballante ; il
    tend vers nous la lettre tamponnée à l'aube, l'air de dire « toujours là »."""
    t = Toile()

    def sac(pts, cx, cy, embleme=True):
        m = t.poly(pts) | t.ell(pts[0][0] - 2, pts[0][1] - 2, pts[0][0] + 8, pts[0][1] + 8)
        t.piece(m, B, ombre=3)
        t.peindre(t.rect(0, cy - 4, 176, cy - 2) & m, V)
        t.peindre(t.rect(0, cy + 8, 176, cy + 9) & m, V)
        if embleme:
            env = t.rect(cx - 7, cy - 1, cx + 7, cy + 7)
            t.peindre(env, V)
            t.peindre(t.trait([(cx - 7, cy - 1), (cx, cy + 4), (cx + 7, cy - 1)]), B)
        return m

    # la pile de sacs postaux : deux en bas, un dessus
    s1 = sac([(18, 126), (78, 122), (84, 140), (80, 158), (16, 158), (12, 140)], 48, 138)
    t.peindre(t.courbe([(30, 132), (34, 144), (30, 156)]) & s1, N)
    s2 = sac([(84, 124), (150, 122), (160, 140), (156, 158), (80, 158), (78, 140)], 120, 138)
    t.peindre(t.courbe([(134, 132), (138, 144), (136, 156)]) & s2, N)
    for (x, y) in [(16, 124), (82, 122)]:
        t.piece(t.fuseau([(x + 2, y + 2), (x - 4, y - 6), (x - 8, y - 4)], 4, 2), B, ombre=0)
        t.piece(t.fuseau([(x + 2, y + 2), (x + 2, y - 8), (x + 6, y - 10)], 4, 2), B, ombre=0)
        t.peindre(t.rect(x, y, x + 4, y + 2), V)
    s3 = sac([(44, 100), (120, 98), (128, 112), (124, 128), (42, 128), (38, 112)], 84, 112, embleme=False)
    env = t.rect(52, 106, 70, 118)
    t.peindre(env, V)
    t.peindre(t.trait([(52, 106), (61, 113), (70, 106)]), B)
    t.peindre(t.rect(0, 157, 176, 159) & (s1 | s2), B)
    t.peindre(t.rect(10, 159, 162, 159), N)
    # la jambe repliée, le pied posé sur le sac
    cuisse = t.fuseau([(94, 100), (112, 88), (122, 90)], 14, 12)
    t.piece(cuisse, V, ombre=2)
    tibia = t.fuseau([(122, 90), (126, 102), (126, 110)], 12, 10)
    t.piece(tibia, V, ombre=2)
    pied = t.poly([(118, 106), (132, 104), (142, 110), (140, 116), (118, 116)])
    t.piece(pied, V, ombre=0)
    t.peindre(t.rect(118, 114, 142, 115), B)
    t.damier(pied & t.rect(0, 104, 176, 111), N)
    # la jambe ballante, devant les sacs
    cuisse2 = t.fuseau([(80, 102), (86, 110)], 15, 14)
    t.piece(cuisse2, V, ombre=2)
    tibia2 = t.fuseau([(86, 110), (90, 124), (92, 138)], 12, 10)
    t.piece(tibia2, V, ombre=2)
    t.peindre(t.trait([(88, 112), (92, 136)]), B)
    chaus = t.poly([(84, 136), (98, 136), (106, 142), (104, 148), (84, 148)])
    t.piece(chaus, V, ombre=0)
    t.peindre(t.rect(84, 146, 106, 147), B)
    t.damier(chaus & t.rect(0, 136, 176, 143), N)
    # le torse : veste de facteur, galons, sacoche
    torse = t.poly([(76, 62), (110, 62), (114, 80), (110, 104), (74, 104), (70, 80)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.trait([(94, 64), (92, 102)], 2), N)
    for y in (72, 82, 92):
        t.piece(t.ell(96, y - 2, 100, y + 2), B, ombre=0)
    t.piece(t.poly([(80, 60), (96, 60), (92, 70), (84, 70)]), B, ombre=0)
    t.peindre(t.poly([(86, 62), (91, 62), (89, 68)]), V)
    t.peindre(t.rect(72, 98, 112, 101) & torse, N)
    t.piece(t.rect(98, 97, 104, 102), B, ombre=0)
    t.peindre(t.trait([(78, 64), (108, 98)], 3), B)
    t.peindre(t.trait([(79, 65), (107, 97)]) & (((t.xx) % 3) == 0), N)
    # la main posée sur le genou
    bras2 = t.fuseau([(108, 66), (116, 80), (118, 88)], 11, 9)
    t.piece(bras2, V, ombre=2)
    poing(t, 112, 82, 126, 94, sens=-1)
    # le bras tendu vers nous, la lettre
    bras = t.fuseau([(78, 68), (62, 78), (50, 64)], 12, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.rect(48, 64, 60, 66) & bras, B)
    lettre = t.poly([(10, 30), (60, 24), (64, 58), (14, 64)])
    t.piece(lettre, B, ombre=3)
    t.peindre(t.trait([(10, 30), (38, 48), (60, 24)], 2), N)
    t.peindre(t.rect(46, 30, 56, 40) & lettre, V)
    t.peindre(t.rect(48, 32, 54, 38), B)
    t.point(51, 35, V)
    tampon = t.ell(16, 40, 36, 60) & ~t.ell(18, 42, 34, 58)
    t.peindre(tampon & lettre, V)
    t.peindre(t.rect(19, 52, 33, 52) & lettre, V)
    t.peindre(t.ell(21, 46, 31, 56) & t.rect(0, 0, 176, 51), V)
    for a in (-2.6, -2.0, -1.57, -1.1, -0.5):
        t.peindre(t.trait([(26 + 7 * math.cos(a), 51 + 7 * math.sin(a)), (26 + 9 * math.cos(a), 51 + 9 * math.sin(a))]) & lettre, V)
    t.peindre(t.courbe([(36, 52), (44, 48), (52, 54), (60, 50)]), V)
    poing(t, 46, 52, 60, 66)
    t.peindre(t.trait([(48, 54), (48, 64)]), N)
    for (x, y) in [(6, 22), (68, 18)]:
        t.etincelle(x, y)
    # la tête
    tete = t.ell(72, 20, 110, 66)
    t.piece(tete, B, ombre=0)
    o = t.ell(104, 38, 113, 52)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(108, 41), (110, 45), (108, 49)]), N)
    ch = t.poly([(104, 24), (113, 26), (114, 38), (110, 36), (106, 30)])
    t.piece(ch, V, ombre=0)
    t.peindre(t.courbe([(107, 27), (110, 31), (112, 36)]), N)
    t.piece(t.fuseau([(76, 26), (72, 32), (73, 36)], 5, 1), V, ombre=0, lumiere=False)
    # sourcil levé d'assurance, sourire franc
    t.piece(t.fuseau([(76, 34), (81, 30), (88, 32)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(91, 35), (96, 34), (101, 36)], 4, 2), V, ombre=0)
    t.oeil(76, 37, l=12, h=9, regard=(-2, 1))
    t.oeil(91, 38, l=12, h=9, regard=(-2, 1))
    nez = t.poly([(88, 44), (84, 52), (88, 54), (92, 52)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(86, 52, N)
    t.pixels(79, 56, """
:............
.::::::::::::
.:oooooooooo:
..:oooooooo:.
...::####::..
.....::::....
""")
    t.peindre(t.trait([(80, 52), (82, 54)]) | t.trait([(100, 54), (102, 52)]), N)
    # la casquette de travers
    cas = t.poly([(68, 26), (76, 12), (104, 6), (114, 14), (112, 26)])
    t.piece(cas, V, ombre=2)
    t.peindre(t.trait([(70, 26), (112, 22)], 2), N)
    t.peindre(t.trait([(70, 28), (112, 24)], 2), B)
    t.pixels(86, 13, """
.ooooooo.
.o#####o.
.o#o#o#o.
.o#####o.
.ooooooo.
""")
    visiere = t.poly([(64, 26), (90, 26), (84, 32), (62, 32)])
    t.piece(visiere, V, ombre=0, lumiere=False)
    t.damier(visiere, N)
    t.peindre(t.trait([(64, 27), (88, 27)]), B)
    t.sol(160, cx=86, l=80)
    return t.image()


def seymour():
    """Le docker : bonnet côtelé, sourcils en broussaille, nez en patate, grosse barbe et rire ouvert ; la
    marinière tendue sur le ventre ; une caisse en planches sur l'épaule, tenue d'un bras, l'autre poing sur la
    hanche."""
    t = Toile()
    # la caisse en planches, sur l'épaule (face et dessus)
    dessus = t.poly([(8, 30), (56, 20), (66, 14), (20, 24)])
    t.piece(dessus, B, ombre=0)
    t.hachures(dessus, V, 3)
    cote = t.poly([(56, 20), (66, 14), (74, 52), (64, 62)])
    t.piece(cote, V, ombre=0, lumiere=False)
    t.damier(cote, N)
    caisse = t.poly([(8, 30), (56, 20), (64, 62), (16, 72)])
    t.piece(caisse, B, ombre=3)
    for k in (1, 2):
        y0 = 30 + k * 14
        t.peindre(t.trait([(10 + k * 3, y0 - 0), (58 + k * 2, y0 - 10)]), N)
    cadre = t.poly([(8, 30), (56, 20), (64, 62), (16, 72)]) & ~t.poly([(14, 34), (52, 26), (58, 58), (20, 66)])
    t.peindre(cadre, V)
    for (x, y) in [(11, 33), (53, 24), (18, 68), (60, 59), (34, 28), (40, 66)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), N)
    t.pixels(30, 38, """
....###....
....#.#....
....###....
.#########.
.....#.....
.#...#...#.
.##..#..##.
..#######..
...#####...
""")
    # le bras levé qui tient la caisse
    bras = t.fuseau([(66, 90), (44, 88), (36, 70)], 15, 12)
    t.piece(bras, B, ombre=2)
    t.rayures(bras, V, 6, 2, vertical=True)
    t.contour(bras, N)
    poing(t, 28, 60, 44, 76)
    # les jambes courtes et solides
    for x in (70, 92):
        j = t.poly([(x, 128), (x + 18, 128), (x + 17, 150), (x + 1, 150)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 9, 134), (x + 9, 148)]), N)
        t.peindre(t.rect(x + 1, 146, x + 17, 148), B)
    botte(t, 64, 88, 148, -1)
    botte(t, 94, 112, 148, 1)
    # le ventre rond dans la marinière
    ventre = t.ell(62, 80, 124, 136) | t.poly([(70, 80), (116, 80), (118, 100), (68, 100)])
    t.piece(ventre, B, ombre=3)
    t.rayures(ventre & ~t.bord(ventre, -1, -1, 1), V, 7, 3, vertical=False, phase=2)
    t.damier(ventre & t.bord(ventre, 1, 1, 4), N)
    t.peindre(t.courbe([(72, 128), (92, 134), (114, 128)], 2), N)
    t.peindre(t.rect(64, 126, 122, 129) & ventre, N)
    t.piece(t.rect(88, 125, 96, 130), B, ombre=0)
    # le bras sur la hanche, le coude en dehors
    bras2 = t.fuseau([(116, 88), (136, 104), (120, 118)], 15, 12)
    t.piece(bras2, B, ombre=2)
    t.rayures(bras2, V, 6, 2, vertical=True)
    t.contour(bras2, N)
    poing(t, 112, 110, 126, 124, sens=-1)
    # la tête
    tete = t.ell(68, 26, 118, 84)
    t.piece(tete, B, ombre=0)
    for x in (63, 112):
        o = t.ell(x, 50, x + 10, 64)
        t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(66, 53), (65, 57), (67, 61)]) | t.courbe([(119, 53), (120, 57), (118, 61)]), N)
    # la grosse barbe ronde, qui part des joues
    barbe = (t.ell(64, 50, 122, 108) & ~t.ell(70, 22, 116, 76)) | t.ell(76, 86, 110, 110)
    barbe |= t.poly([(66, 58), (72, 58), (76, 74), (68, 76)]) | t.poly([(120, 58), (114, 58), (110, 74), (118, 76)])
    barbe &= ~t.ell(80, 70, 106, 92)
    t.piece(barbe, V, ombre=3, lumiere=False)
    for (x, y) in [(72, 82), (82, 96), (94, 102), (106, 96), (114, 82), (70, 70), (116, 70)]:
        t.peindre(t.courbe([(x + 3, y), (x, y - 1), (x - 1, y + 2), (x + 1, y + 4), (x + 4, y + 3)]), N)
    t.peindre(t.courbe([(68, 78), (72, 90)]) | t.courbe([(88, 100), (96, 104)]), B)
    # le bonnet côtelé, bord retourné
    bonnet = t.ell(68, 10, 118, 50) & t.rect(0, 0, 176, 34)
    t.piece(bonnet, V, ombre=2)
    t.rayures(bonnet & ~t.bord(bonnet, -1, -1, 1), N, 4, 1)
    bord_b = t.poly([(66, 28), (120, 28), (120, 38), (66, 38)])
    t.piece(bord_b, B, ombre=2)
    t.rayures(bord_b, V, 4, 1)
    pompon = t.ell(86, 2, 100, 14)
    t.piece(pompon, B, ombre=0)
    t.damier(pompon & t.bord(pompon, 1, 1, 2), V)
    # sourcils en broussaille, yeux plissés de rire
    for pts in ([(72, 46), (79, 41), (89, 44)], [(97, 44), (107, 41), (114, 46)]):
        t.piece(t.fuseau(pts, 6, 3), V, ombre=0)
        t.peindre(t.trait([pts[1], (pts[1][0] + 2, pts[1][1] - 3)], 2), V)
    t.oeil(76, 50, l=11, h=7, regard=(1, 0), paupiere=2, plisse=True)
    t.oeil(99, 50, l=11, h=7, regard=(-1, 0), paupiere=2, plisse=True)
    t.peindre(t.trait([(72, 54), (74, 55)]) | t.trait([(72, 58), (74, 57)]), N)
    t.peindre(t.trait([(112, 55), (114, 54)]) | t.trait([(112, 57), (114, 58)]), N)
    # les joues rondes
    t.damier(t.ell(74, 60, 84, 68) | t.ell(102, 60, 112, 68), V)
    # le nez en patate
    nez = t.ell(85, 56, 101, 72)
    t.piece(nez, B, ombre=0)
    t.damier(nez & t.bord(nez, 1, 1, 3), V)
    t.peindre(t.rect(88, 59, 89, 61), V)
    t.point(89, 69, N); t.point(96, 69, N)
    # la moustache et le rire grand ouvert
    t.piece(t.fuseau([(92, 73), (84, 74), (78, 70)], 6, 2), V, ombre=0)
    t.piece(t.fuseau([(94, 73), (102, 74), (108, 70)], 6, 2), V, ombre=0)
    t.pixels(82, 77, """
.:::::::::::::::::::.
.:ooooooooooooooooo:.
.:::::::::::::::::::.
..:::###########:::..
...::###########::...
....:::#######:::....
......:::::::::......
""")
    texte(t, 136, 14, "ho", B, 2)
    texte(t, 146, 30, "ho", B, 2)
    t.etincelle(156, 50)
    t.sol(160, cx=90)
    return t.image()


OEIL_F = """
:..::::::...
.:::ooo##:..
..:ooo#o:#:.
..:ooo#::#:.
...:ooo##:..
....::::....
"""


def visage_f(t, x, y, regard=(0, 0), bouche="sourire", cils=True):
    """Deux yeux de femme (gauche en x, droit en x + 17), haut des yeux en y."""
    t.oeil(x, y, l=12, h=9, regard=regard, paupiere=2, cils=-1 if cils else 0)
    t.oeil(x + 17, y, l=12, h=9, regard=regard, paupiere=2, cils=1 if cils else 0)


def zelia():
    """La marchande de la Halle : foulard noué sur le côté, grandes boucles d'oreilles ; le panier calé sur la
    hanche, elle lève une poignée de rubans de la promo qui ondulent au vent ; la jupe rayée tourne."""
    t = Toile()
    # les rubans qui ondulent au vent
    for (pts, e, c) in [([(54, 34), (36, 14), (22, 30), (4, 8)], 5, V), ([(54, 36), (34, 40), (24, 22), (2, 30)], 5, B),
                        ([(54, 34), (46, 8), (28, 6), (16, 4)], 4, B), ([(54, 38), (40, 56), (20, 46), (6, 58)], 4, V)]:
        r = t.fuseau(pts, e, e - 1)
        t.piece(r, c, ombre=0, lumiere=False)
        if c == V:
            t.peindre(t.courbe(pts) & r & (((t.xx) % 4) == 0), B)
        else:
            t.peindre(t.courbe(pts) & r & (((t.xx) % 4) == 0), V)
    # les petits souliers sous la jupe
    for (x0, x1) in [(70, 86), (94, 110)]:
        sl = t.poly([(x0, 150), (x1, 150), (x1 + 2, 159), (x0 - 2, 159)])
        t.piece(sl, V, ombre=0)
        t.peindre(t.rect(x0 - 2, 158, x1 + 2, 159), B)
        t.damier(sl & t.rect(0, 150, 176, 154), N)
    # la jupe rayée qui tourne
    jupe = t.poly([(72, 104), (114, 104), (126, 124), (140, 148), (128, 150), (116, 154), (100, 151), (86, 155),
                   (70, 151), (56, 154), (44, 148), (58, 124)])
    t.piece(jupe, B, ombre=3)
    bandes = jupe & (((t.yy - 104 + (t.xx - 92) // 10) % 9) < 4)
    t.peindre(bandes, V)
    t.damier(bandes & t.bord(jupe, 1, 0, 4), N)
    plis(t, jupe, [[(84, 108), (78, 130), (70, 152)], [(100, 108), (106, 130), (114, 152)], [(92, 110), (92, 152)]])
    t.peindre(t.trait([(46, 148), (58, 151), (72, 149), (86, 153), (100, 149), (116, 152), (128, 148), (138, 147)]), N)
    for x in range(52, 136, 6):
        t.etoile(x, 145 + (x // 6) % 2, B, 1)
    # le corsage : blouse blanche, corselet vert lacé
    blouse = t.poly([(74, 76), (110, 76), (114, 92), (110, 106), (74, 106), (70, 92)])
    t.piece(blouse, B, ombre=2)
    corse = t.poly([(78, 88), (106, 88), (110, 106), (74, 106)])
    t.piece(corse, V, ombre=2)
    for y in range(91, 104, 4):
        t.peindre(t.trait([(88, y), (96, y + 2)]) | t.trait([(96, y), (88, y + 2)]), B)
    t.peindre(t.courbe([(78, 78), (92, 86), (106, 78)]), N)
    # le bras levé qui tient les rubans
    bras = t.fuseau([(78, 82), (62, 66), (56, 46)], 11, 8)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(64, 66), (60, 58)]), N)
    manche = t.ell(68, 72, 86, 90)
    t.piece(manche, B, ombre=2)
    t.peindre(t.courbe([(72, 76), (76, 82), (74, 88)]) | t.courbe([(80, 74), (82, 82)]), V)
    poing(t, 48, 30, 62, 46)
    # le panier calé sur la hanche
    anse = t.ell(112, 70, 156, 112) & ~t.ell(116, 74, 152, 108) & t.rect(0, 0, 176, 96)
    t.piece(anse, V, ombre=0, lumiere=False)
    for (x, y) in [(120, 88), (128, 82), (138, 84), (146, 88)]:
        t.piece(t.ell(x - 5, y - 5, x + 5, y + 5), V if (x // 8) % 2 else B, ombre=0)
        t.peindre(t.courbe([(x - 3, y), (x, y - 2), (x + 3, y)]), N if (x // 8) % 2 == 0 else B)
    panier = t.poly([(110, 92), (158, 92), (154, 124), (116, 124)])
    t.piece(panier, B, ombre=3)
    t.peindre(panier & ((((t.xx // 3) + (t.yy // 3)) % 2) == 0) & ~t.bord(panier, -1, -1, 1), V)
    t.peindre(t.rect(110, 92, 158, 95) & panier, V)
    t.peindre(t.trait([(110, 96), (158, 96)]), N)
    # le bras qui tient le panier
    bras2 = t.fuseau([(106, 82), (118, 96), (124, 104)], 11, 9)
    t.piece(bras2, B, ombre=2)
    manche2 = t.ell(100, 72, 118, 90)
    t.piece(manche2, B, ombre=2)
    t.peindre(t.courbe([(108, 76), (112, 82), (110, 88)]), V)
    poing(t, 118, 98, 132, 110, sens=-1)
    # les cheveux noués, qui dépassent du foulard
    ch = t.ell(64, 36, 80, 86) | t.ell(102, 36, 118, 86)
    ch &= ~t.ell(74, 28, 108, 76) & ~t.rect(0, 0, 176, 48)
    t.piece(ch, V, ombre=0, lumiere=False)
    for (x, y) in [(70, 60), (112, 62), (70, 72), (112, 74)]:
        t.peindre(t.courbe([(x + 3, y), (x, y - 1), (x - 1, y + 2), (x + 1, y + 4), (x + 4, y + 3)]), N)
    # la tête
    tete = t.ell(72, 28, 110, 76)
    t.piece(tete, B, ombre=0)
    # les grandes boucles d'oreilles
    for x in (70, 108):
        t.piece(t.ell(x - 4, 60, x + 6, 72) & ~t.ell(x - 2, 62, x + 4, 70), V, ombre=0, lumiere=False)
        t.peindre(t.ell(x - 1, 59, x + 2, 62), B)
    # le foulard, noué sur le côté, les pointes au vent
    foulard = (t.ell(68, 18, 114, 56) & t.rect(0, 0, 176, 42)) | t.poly([(68, 40), (114, 36), (114, 44), (70, 46)])
    t.piece(foulard, V, ombre=2)
    for (x, y) in [(76, 30), (86, 24), (98, 24), (106, 30), (80, 38), (92, 34), (104, 38)]:
        t.pixels(x, y, ".o.\no:o\n.o.")
    t.peindre(t.courbe([(70, 44), (92, 40), (114, 40)]), N)
    t.piece(t.ell(110, 34, 120, 44), V, ombre=0)
    t.piece(t.fuseau([(118, 38), (128, 30), (136, 34)], 7, 2), V, ombre=0)
    t.piece(t.fuseau([(118, 42), (130, 46), (138, 54)], 7, 2), V, ombre=0)
    t.peindre(t.courbe([(120, 38), (128, 33)]) | t.courbe([(120, 43), (130, 47)]), N)
    # le visage : regard vers les rubans, grand sourire
    t.peindre(t.courbe([(76, 47), (81, 44), (87, 46)], 2), N)
    t.peindre(t.courbe([(93, 46), (99, 44), (104, 46)], 2), N)
    t.oeil(76, 49, l=12, h=9, regard=(-2, -2), paupiere=2, cils=-1)
    t.oeil(93, 49, l=12, h=9, regard=(-2, -2), paupiere=2, cils=1)
    t.pixels(88, 56, """
..:..
..:..
.:o::
:::::
""")
    t.pixels(83, 63, """
:..........:
.::::::::::.
.:oooooooo:.
..:######:..
...::::::...
""")
    t.damier(t.ell(75, 59, 82, 64) | t.ell(100, 59, 107, 64), V)
    for (x, y) in [(10, 66), (30, 0), (64, 18)]:
        t.etincelle(x, y)
    t.sol(160, cx=92)
    return t.image()


def syrine():
    """La gardienne des casiers : chignon tiré, lunettes carrées, l'air décidé ; elle abat son tampon d'un grand
    geste (des traits de mouvement), le sceau de cire rond tenu dans l'autre main."""
    t = Toile()
    # la robe longue
    robe = t.poly([(70, 82), (104, 82), (108, 104), (120, 156), (54, 156), (66, 104)])
    t.piece(robe, V, ombre=3)
    t.peindre(t.rect(54, 148, 120, 152) & robe, B)
    t.peindre(t.rect(54, 150, 120, 150) & robe & (((t.xx) % 3) == 0), N)
    plis(t, robe, [[(80, 104), (76, 128), (70, 154)], [(96, 104), (100, 128), (106, 154)], [(88, 108), (88, 146)]])
    t.peindre(t.rect(54, 156, 120, 157) & dilater(robe, 1), N)
    for (x0, x1) in [(66, 84), (92, 110)]:
        sl = t.poly([(x0, 156), (x1, 156), (x1 + 2, 160), (x0 - 2, 160)])
        t.piece(sl, B, ombre=0)
    t.peindre(t.rect(60, 160, 116, 160), N)
    # le col blanc, la ceinture, la clé au cordon
    t.piece(t.poly([(74, 78), (100, 78), (96, 90), (87, 84), (78, 90)]), B, ombre=0)
    t.peindre(t.rect(64, 102, 110, 105) & robe, N)
    t.piece(t.rect(84, 101, 90, 106), B, ombre=0)
    t.peindre(t.trait([(82, 86), (78, 112)]), B)
    t.pixels(74, 112, """
.ooo.
o:.:o
.ooo.
..o..
..oo.
..o..
..oo.
""")
    # le bras qui tend le sceau de cire
    bras = t.fuseau([(70, 86), (58, 104), (44, 108)], 11, 9)
    t.piece(bras, V, ombre=2)
    manchette(t, [(44, 102), (50, 102), (52, 114), (46, 114)])
    paume = t.ell(30, 104, 48, 116)
    t.piece(paume, B, ombre=0)
    t.peindre(t.trait([(34, 108), (40, 108)]), N)
    sceau = t.ell(28, 86, 50, 106)
    t.piece(sceau, V, ombre=0)
    t.peindre(t.ell(32, 90, 46, 102) & ~t.ell(33, 91, 45, 101), N)
    t.etoile(39, 96, B, 3)
    t.point(39, 96, V)
    for (x, y) in [(28, 90), (50, 92), (27, 100)]:
        t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2), V)
    t.piece(t.fuseau([(36, 106), (32, 120), (26, 128)], 4, 2), B, ombre=0)
    t.piece(t.fuseau([(42, 106), (44, 120), (50, 128)], 4, 2), B, ombre=0)
    # le casier, à côté d'elle, et le registre posé dessus
    cas = t.rect(118, 112, 168, 159)
    t.piece(cas, B, ombre=3)
    for (x0, x1) in [(121, 142), (145, 165)]:
        porte = t.rect(x0, 116, x1, 156)
        t.peindre(t.bord(porte, -1, 0, 1) | t.bord(porte, 1, 0, 1) | t.bord(porte, 0, -1, 1) | t.bord(porte, 0, 1, 1), N)
        for y in range(120, 132, 3):
            t.peindre(t.rect(x0 + 5, y, x1 - 5, y), V)
        t.piece(t.rect(x1 - 5, 138, x1 - 3, 144), V, ombre=0)
    texte(t, 126, 136, "12", V)
    texte(t, 150, 136, "13", V)
    reg = t.poly([(116, 104), (166, 102), (170, 112), (114, 114)])
    t.piece(reg, V, ombre=0)
    t.peindre(t.poly([(118, 104), (140, 103), (141, 110), (117, 111)]) | t.poly([(143, 103), (164, 102), (167, 109), (144, 110)]), B)
    for y in (106, 108):
        t.peindre(t.trait([(121, y), (137, y - 1)]) & (((t.xx) % 3) != 0), V)
    t.peindre(t.trait([(141, 103), (142, 111)]), N)
    # l'impact
    for (a0, r0, r1) in [(-2.8, 14, 20), (-2.3, 15, 22), (-0.4, 14, 20), (-0.9, 15, 22), (-3.1, 14, 19), (0.0, 14, 19)]:
        t.peindre(t.trait([(154 + r0 * math.cos(a0), 102 + r0 * math.sin(a0)), (154 + r1 * math.cos(a0), 102 + r1 * math.sin(a0))]), B)
    # le bras qui abat le tampon sur le registre
    bras2 = t.fuseau([(102, 86), (124, 88), (140, 76)], 11, 9)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(136, 72), (144, 70), (146, 78), (138, 80)])
    sem = t.poly([(140, 92), (168, 90), (169, 98), (141, 100)])
    t.piece(sem, V, ombre=2)
    t.peindre(t.poly([(141, 98), (169, 96), (169, 101), (142, 102)]), B)
    t.piece(t.rect(150, 76, 158, 91), B, ombre=0)
    t.peindre(t.rect(152, 76, 153, 91), V)
    knob = t.ell(144, 46, 164, 64)
    t.piece(knob, V, ombre=2)
    t.peindre(t.ell(147, 49, 151, 53), B)
    poing(t, 142, 62, 162, 80, sens=-1)
    for (x, y0, y1) in [(140, 26, 44), (152, 20, 40), (164, 26, 44), (170, 40, 56)]:
        t.peindre(t.rect(x, y0, x, y1) & (((t.yy) % 6) < 4), B)
    t.peindre(t.courbe([(112, 60), (124, 44), (140, 38)]) & (((t.xx) % 4) < 3), B)
    t.peindre(t.courbe([(116, 70), (126, 56), (138, 50)]) & (((t.xx) % 4) < 3), B)
    for (x, y) in [(124, 22), (110, 96)]:
        t.etincelle(x, y)
    # les boutons et les étoiles semées sur la robe
    for y in (92, 98):
        t.piece(t.ell(86, y - 1, 89, y + 2), B, ombre=0)
    for (x, y) in [(70, 118), (102, 116), (64, 136), (84, 130), (108, 134), (96, 142), (76, 144)]:
        t.etoile(x, y, B, 1)
    # la tête : chignon tiré, lunettes carrées
    chignon = t.ell(80, 6, 100, 24)
    t.piece(chignon, V, ombre=2)
    t.peindre(t.courbe([(84, 12), (90, 9), (96, 14)]) | t.courbe([(84, 18), (90, 14), (96, 20)]), N)
    t.peindre(t.trait([(98, 8), (104, 2)], 2), B)
    tete = t.ell(68, 20, 108, 76)
    t.piece(tete, B, ombre=0)
    ch = t.ell(66, 16, 110, 48) & ~t.ell(70, 30, 106, 80)
    t.piece(ch, V, ombre=2)
    for x in (78, 86, 94, 100):
        t.peindre(t.courbe([(88, 22), (x, 28), (x + 2, 34)]) & ch, N)
    # sourcils froncés de décision, lunettes carrées
    t.piece(t.fuseau([(74, 43), (80, 41), (86, 44)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(90, 44), (96, 41), (102, 43)], 3, 2), V, ombre=0)
    t.oeil(75, 50, l=11, h=8, regard=(2, 0), paupiere=2, cils=-1)
    t.oeil(91, 50, l=11, h=8, regard=(2, 0), paupiere=2, cils=1)
    for x in (73, 92):
        cad = t.rect(x, 47, x + 13, 59) & ~t.rect(x + 1, 48, x + 12, 58)
        cad &= ~(t.rect(x, 47, x, 47) | t.rect(x + 13, 47, x + 13, 47) | t.rect(x, 59, x, 59) | t.rect(x + 13, 59, x + 13, 59))
        t.peindre(cad, N)
        t.point(x + 2, 49, V); t.point(x + 3, 49, V); t.point(x + 2, 50, V)
    t.peindre(t.courbe([(86, 51), (88, 50), (90, 51)]) | t.trait([(70, 50), (73, 49)]) | t.trait([(103, 49), (106, 50)]), N)
    nez = t.poly([(88, 54), (85, 62), (87, 64), (91, 63)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.pixels(82, 66, """
:........:
.::::::::.
..:####:..
...::::...
""")
    t.damier(t.ell(72, 61, 78, 65) | t.ell(99, 61, 105, 65), V)
    t.sol(160, cx=84, l=66)
    return t.image()


def sara():
    """L'ingénieure du câble : le ciré vert à capuche, des bottes ; un gros câble enroulé sur l'épaule, elle en colle
    l'extrémité à son oreille, les yeux fermés, et écoute le grésillement (de petites ondes)."""
    t = Toile()
    # les bottes de pluie
    for (x0, x1, p) in [(66, 82, -1), (90, 106, 1)]:
        b = t.poly([(x0, 132), (x1, 132), (x1 + (4 if p > 0 else 0), 159), (x0 - (4 if p < 0 else 0), 159)])
        t.piece(b, B, ombre=3)
        t.peindre(t.rect(x0 - 4, 156, x1 + 4, 159) & b, V)
        t.peindre(t.rect(x0, 134, x1, 136) & b, V)
    t.peindre(t.rect(60, 160, 112, 160), N)
    # le ciré long, évasé
    cire = t.poly([(66, 80), (104, 80), (110, 100), (118, 140), (100, 144), (86, 141), (72, 144), (52, 140), (60, 100)])
    t.piece(cire, V, ombre=3)
    t.peindre(t.trait([(86, 84), (86, 141)], 2), N)
    for y in (94, 106, 118, 130):
        t.piece(t.rect(88, y, 94, y + 2), B, ombre=0)
        t.peindre(t.trait([(86, y + 1), (88, y + 1)]), B)
    plis(t, cire, [[(72, 104), (66, 122), (62, 140)], [(100, 104), (106, 122), (110, 140)]])
    t.peindre(t.trait([(54, 139), (72, 143), (86, 140), (100, 143), (116, 139)]), B)
    for (x, y) in [(70, 124), (102, 112)]:
        t.peindre(t.rect(x - 6, y, x + 6, y + 1), N)
        t.peindre(t.rect(x - 6, y - 1, x + 6, y - 1), B)
    # le gros câble enroulé, en bandoulière sur l'épaule
    for (dx, dy) in [(-4, 5), (0, 0), (4, 3)]:
        rond = t.ell(34 + dx, 70 + dy, 94 + dx, 128 + dy) & ~t.ell(41 + dx, 77 + dy, 87 + dx, 121 + dy)
        t.piece(rond, B, ombre=2)
        t.peindre(rond & (((t.xx + t.yy * 2) % 12) < 2), V)
    t.damier(t.ell(30, 75, 98, 131) & ~t.ell(42, 82, 84, 120) & t.bord(t.ell(30, 75, 98, 131), 1, 1, 3), V)
    # le bras qui retient la boucle
    bras = t.fuseau([(68, 86), (56, 102), (60, 116)], 11, 9)
    t.piece(bras, V, ombre=2)
    poing(t, 54, 110, 68, 122)
    # le bras levé, la main à l'oreille qui tient l'extrémité du câble
    bras2 = t.fuseau([(102, 86), (118, 80), (116, 62)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.peindre(t.courbe([(112, 82), (116, 76)]), N)
    t.piece(t.courbe([(92, 120), (126, 112), (132, 82), (120, 56)], 3), B, ombre=0)
    # la capuche (derrière la tête)
    cap = t.ell(60, 16, 118, 86)
    t.piece(cap, V, ombre=3)
    t.peindre(t.courbe([(64, 50), (66, 30), (88, 18), (110, 26), (116, 48)]), N)
    # la tête, penchée vers le câble
    tete = t.ell(68, 28, 106, 78)
    t.piece(tete, B, ombre=0)
    bord_cap = t.ell(64, 22, 112, 84) & ~t.ell(68, 26, 108, 80) & t.rect(0, 0, 176, 70)
    t.piece(bord_cap, B, ombre=0)
    t.peindre(bord_cap & (((t.xx + t.yy) % 4) == 0), V)
    # la frange
    for pts in ([(74, 32), (70, 40), (72, 46)], [(84, 30), (78, 38), (76, 44)], [(94, 30), (90, 38), (86, 42)],
                [(102, 34), (100, 40), (98, 44)]):
        t.piece(t.fuseau(pts, 7, 2), V, ombre=0, lumiere=False)
    # le connecteur au bout du câble, contre l'oreille
    con = t.poly([(112, 44), (124, 42), (126, 58), (114, 60)])
    t.piece(con, B, ombre=0)
    t.peindre(t.rect(115, 46, 123, 50), N)
    for x in range(116, 123, 2):
        t.point(x, 47, V); t.point(x, 48, V)
    t.peindre(t.rect(116, 53, 122, 56), V)
    main = t.ell(106, 52, 122, 68)
    t.piece(main, B, ombre=0)
    for y in (56, 59, 62):
        t.peindre(t.trait([(117, y), (121, y)]), N)
    # les petites ondes du grésillement
    for (r, k) in [(10, 0), (16, 1), (22, 2)]:
        arc = t.ell(124 - r, 50 - r, 124 + r, 50 + r) & ~t.ell(125 - r, 51 - r, 123 + r, 49 + r) & t.rect(130, 0, 176, 170)
        t.peindre(arc & (((t.yy) % 3) != 0), B)
    t.pixels(150, 34, ".:.\n:o:\n.:.")
    for (x, y) in [(156, 64), (140, 22)]:
        t.etincelle(x, y)
    # les yeux fermés, l'air concentré et heureux
    t.peindre(t.courbe([(74, 46), (79, 43), (85, 45)], 2), N)
    t.peindre(t.courbe([(91, 45), (96, 43), (101, 46)], 2), N)
    t.peindre(t.courbe([(74, 54), (79, 57), (85, 54)], 2), N)
    t.peindre(t.courbe([(91, 54), (96, 57), (101, 54)], 2), N)
    t.peindre(t.trait([(73, 53), (71, 54)]) | t.trait([(102, 53), (104, 54)]), N)
    t.pixels(86, 56, """
..:..
..:..
.:o::
:::..
""")
    t.pixels(82, 64, """
:.........
.::::::::.
..:####:..
...::::...
""")
    t.damier(t.ell(72, 58, 79, 63) | t.ell(98, 58, 105, 63), V)
    t.sol(160, cx=86)
    return t.image()


def rayan():
    """Le bibliothécaire : lunettes rondes, le nez dans le livre qu'il lit en marchant ; sous l'autre bras, une pile
    de livres numérisés qui tangue, un marque-page vert qui dépasse."""
    t = Toile()
    # la jambe arrière, la jambe avant : il marche
    j2 = t.fuseau([(86, 116), (96, 132), (102, 148)], 13, 11)
    t.piece(j2, V, ombre=2)
    t.damier(j2 & t.bord(j2, 1, 0, 3), N)
    s2 = t.poly([(96, 146), (110, 144), (120, 150), (120, 156), (98, 156)])
    t.piece(s2, V, ombre=0)
    t.peindre(t.rect(96, 154, 120, 155), B)
    t.damier(s2 & t.rect(0, 144, 176, 150), N)
    j1 = t.fuseau([(76, 116), (70, 134), (62, 150)], 13, 11)
    t.piece(j1, V, ombre=2)
    t.peindre(t.courbe([(74, 120), (68, 136)]), N)
    s1 = t.poly([(54, 148), (68, 148), (72, 158), (46, 158), (48, 152)])
    t.piece(s1, V, ombre=0)
    t.peindre(t.rect(46, 156, 72, 157), B)
    t.damier(s1 & t.rect(0, 148, 176, 153), N)
    # le gilet sans manches sur la chemise blanche, le noeud papillon
    torse = t.poly([(68, 78), (102, 78), (106, 98), (102, 120), (70, 120), (64, 98)])
    t.piece(torse, B, ombre=3)
    for pts in ([(68, 80), (80, 80), (86, 104), (86, 120), (70, 120), (64, 98)], [(92, 80), (102, 80), (106, 98), (102, 120), (88, 120), (88, 104)]):
        g = t.piece(t.poly(pts), V, ombre=2)
        t.peindre(g & (((t.xx + t.yy) % 6) == 0) & ~t.bord(g, -1, -1, 1), N)
    for y in (106, 112):
        t.piece(t.ell(89, y - 1, 92, y + 2), B, ombre=0)
    t.pixels(80, 79, """
:::....:::
:##::::##:
:###oo###:
:##::::##:
:::....:::
""")
    # le bras qui tient la pile de livres, sous l'aisselle
    bras = t.fuseau([(68, 84), (58, 104), (66, 116)], 12, 10)
    t.piece(bras, B, ombre=2)
    pile = [(26, 108, 66, 118, 0), (28, 98, 62, 108, 1), (22, 88, 60, 98, 0), (28, 78, 64, 88, 1), (24, 68, 58, 78, 0),
            (30, 58, 62, 68, 1)]
    for k, (x0, y0, x1, y1, c) in enumerate(pile):
        d = (k * 3) - 6
        liv = t.poly([(x0 + d, y0), (x1 + d, y0 - 1), (x1 + d, y1 - 1), (x0 + d, y1)])
        t.piece(liv, V if c else B, ombre=0)
        t.peindre(t.rect(x0 + d + 3, 0, x0 + d + 4, 170) & liv, N if c else V)
        t.peindre(t.rect(x1 + d - 6, 0, x1 + d - 5, 170) & liv, N if c else V)
        if k in (1, 4):
            texte(t, x0 + d + 8, y0 + 3, "01", B if c else V)
    t.piece(t.poly([(38, 52), (42, 52), (42, 64), (40, 62), (38, 64)]), V, ombre=0)
    for (x, y) in [(18, 60), (66, 52), (12, 82)]:
        t.peindre(t.courbe([(x, y), (x - 3, y + 4), (x, y + 8)]), B)
    poing(t, 60, 108, 74, 120)
    t.piece(bras & t.rect(0, 0, 176, 104), B, ombre=2)
    # le livre ouvert qu'il lit en marchant
    bras2 = t.fuseau([(102, 84), (116, 98), (118, 84)], 11, 9)
    t.piece(bras2, B, ombre=2)
    livre = t.poly([(96, 66), (118, 60), (140, 66), (140, 90), (118, 86), (96, 92)])
    t.piece(livre, B, ombre=0)
    t.peindre(t.poly([(94, 92), (118, 88), (142, 92), (142, 95), (118, 91), (94, 95)]), V)
    t.peindre(t.trait([(118, 60), (118, 88)]), N)
    for k in range(5):
        t.peindre(t.trait([(100, 70 + k * 4), (114, 66 + k * 4)]) & (((t.xx) % 4) != 0), V)
        t.peindre(t.trait([(122, 66 + k * 4), (136, 70 + k * 4)]) & (((t.xx) % 4) != 1), V)
    t.piece(t.poly([(128, 88), (132, 88), (132, 104), (130, 101), (128, 104)]), V, ombre=0)
    poing(t, 108, 84, 122, 96, sens=-1)
    # la tête penchée sur le livre
    tete = t.ell(66, 24, 104, 72)
    t.piece(tete, B, ombre=0)
    o = t.ell(62, 42, 71, 56)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(65, 45), (64, 49), (66, 53)]), N)
    # les cheveux ondulés, la raie sur le côté
    ch = (t.ell(62, 14, 106, 44) & ~t.ell(66, 25, 112, 80)) | t.fuseau([(72, 24), (88, 20), (104, 28)], 6, 3)
    t.piece(ch, V, ombre=2)
    for pts in ([(72, 22), (80, 20), (88, 24)], [(70, 30), (78, 28), (84, 32)], [(92, 22), (100, 26), (104, 32)]):
        t.peindre(t.courbe(pts) & ch, N)
    t.peindre(t.courbe([(76, 20), (86, 18)]), B)
    # les sourcils, les lunettes rondes, les yeux sur la page
    t.piece(t.fuseau([(73, 37), (79, 34), (85, 36)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(89, 36), (95, 34), (101, 37)], 3, 2), V, ombre=0)
    for (x0, y0) in [(71, 40), (87, 40)]:
        t.peindre(t.ell(x0, y0, x0 + 15, y0 + 14) & ~t.ell(x0 + 1, y0 + 1, x0 + 14, y0 + 13), N)
        t.oeil(x0 + 3, y0 + 4, l=10, h=8, regard=(1, 2), paupiere=2)
        t.point(x0 + 3, y0 + 2, V); t.point(x0 + 4, y0 + 2, V); t.point(x0 + 2, y0 + 3, V)
    t.peindre(t.courbe([(86, 46), (87, 45), (88, 46)]) | t.trait([(67, 45), (71, 46)]), N)
    nez = t.poly([(86, 54), (90, 60), (88, 63), (83, 62)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.pixels(80, 65, """
.:........:
..::::::::.
...:####:..
....::::...
""")
    t.sol(160, cx=84)
    return t.image()



# ------------------------------------------------------------------ Lumen (chapitre 6)

def niklaus():
    """L'horloger de la Tour : un petit vieux voûté, tourné vers sa montre, deux touffes blanches autour du crâne, la
    loupe vissée à l'oeil ; il approche de son nez une montre à gousset ouverte, au bout de sa chaîne ; la burette
    dans l'autre main."""
    t = Toile()
    # les jambes maigres, genoux pliés, souliers à boucle
    for pts in ([(66, 124), (62, 140), (60, 150)], [(84, 124), (90, 138), (90, 150)]):
        j = t.fuseau(pts, 10, 8)
        t.piece(j, V, ombre=2)
        t.peindre(t.rect(0, 140, 176, 150) & j, B)
        t.rayures(t.rect(0, 140, 176, 150) & j, V, 3, 1, vertical=False)
    for (x0, x1, p_) in [(48, 66, -1), (84, 102, 1)]:
        b = botte(t, x0, x1, 150, p_)
        t.piece(t.rect((x0 + x1) // 2 - 2, 151, (x0 + x1) // 2 + 2, 154), B, ombre=0)
    # la redingote à basques, le dos voûté
    redi = t.poly([(52, 84), (52, 70), (62, 62), (84, 68), (102, 80), (104, 104), (100, 128), (92, 136), (70, 132), (56, 140),
                   (48, 124), (46, 100)])
    t.piece(redi, V, ombre=3)
    plis(t, redi, [[(56, 104), (54, 120), (52, 136)], [(70, 110), (70, 130)]])
    t.peindre(t.courbe([(52, 84), (58, 74), (70, 70)]), B)
    # le gilet blanc à boutons, la poche de la montre
    gilet = t.poly([(80, 74), (100, 80), (102, 104), (96, 124), (80, 120)])
    t.piece(gilet, B, ombre=2)
    for y in (88, 98, 108):
        t.piece(t.ell(84, y - 1, 87, y + 2), V, ombre=0)
    t.peindre(t.rect(90, 104, 100, 106), N)
    # la chaîne qui monte de la poche vers la montre
    ch = t.courbe([(96, 104), (110, 104), (120, 90), (126, 78)], 1)
    t.peindre(dilater(ch, 1), N)
    t.peindre(ch & (((t.xx + t.yy) % 2) == 0), B)
    t.peindre(ch & (((t.xx + t.yy) % 2) == 1), V)
    # le bras qui tient la burette
    bras2 = t.fuseau([(58, 80), (44, 96), (40, 108)], 11, 9)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(34, 104), (46, 104), (46, 110), (34, 110)])
    # la burette, au bout du bras, le bec long qui goutte
    t.piece(t.ell(30, 108, 46, 126) & ~t.ell(33, 111, 43, 123), B, ombre=0)
    bur = t.poly([(12, 146), (46, 146), (40, 128), (32, 120), (26, 120), (18, 128)])
    t.piece(bur, B, ombre=3)
    t.peindre(t.rect(12, 136, 46, 139) & bur, V)
    t.peindre(t.rect(12, 144, 46, 146) & bur, V)
    t.piece(t.rect(25, 116, 33, 121), V, ombre=0)
    t.piece(t.fuseau([(18, 134), (8, 116), (4, 96)], 5, 2), B, ombre=0)
    t.pixels(2, 90, "..:..\n.:o:.\n:ooo:\n:o#o:\n.:::.")
    t.pixels(3, 100, ".:.\n:o:\n.:.")
    poing(t, 32, 102, 46, 116)
    # le bras qui lève la montre à gousset
    bras = t.fuseau([(94, 80), (110, 90), (120, 76)], 11, 9)
    t.piece(bras, V, ombre=2)
    manchette(t, [(116, 76), (126, 72), (128, 78), (118, 82)])
    couv = t.ell(126, 32, 154, 60)
    t.piece(couv, V, ombre=2)
    t.peindre(t.ell(130, 36, 150, 56) & ~t.ell(131, 37, 149, 55), N)
    t.etoile(140, 46, B, 3)
    montre = t.ell(116, 52, 144, 80)
    t.piece(montre, B, ombre=0)
    t.peindre(montre & ~t.ell(118, 54, 142, 78), V)
    t.peindre(t.ell(118, 54, 142, 78) & ~t.ell(119, 55, 141, 77), N)
    for k in range(12):
        a = k * math.pi / 6
        t.point(int(round(130 + 9 * math.cos(a))), int(round(66 + 9 * math.sin(a))), N if k % 3 else V)
    t.peindre(t.trait([(130, 66), (130, 59)], 2) | t.trait([(130, 66), (136, 69)]), N)
    t.piece(t.rect(127, 47, 133, 52), V, ombre=0)
    t.piece(t.ell(126, 42, 134, 49) & ~t.ell(128, 44, 132, 47), V, ombre=0)
    poing(t, 116, 74, 130, 86, sens=-1)
    for (x, y) in [(160, 40), (150, 84), (112, 40)]:
        t.etincelle(x, y)
    # la tête, penchée sur la montre
    tete = t.ell(60, 28, 104, 80)
    t.piece(tete, B, ombre=0)
    o = t.ell(56, 46, 66, 62)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(60, 49), (58, 54), (60, 59)]), N)
    t.peindre(t.courbe([(70, 34), (82, 30), (94, 34)]) | t.courbe([(76, 38), (84, 36)]), V)
    # les deux touffes blanches autour du crâne
    for (pts, sens) in [([(64, 44), (54, 34), (48, 40)], 1), ([(62, 50), (50, 50), (46, 58)], 1), ([(64, 56), (54, 62), (52, 70)], 1),
                        ([(100, 42), (110, 32), (116, 36)], -1), ([(102, 48), (112, 46), (118, 52)], -1)]:
        m = t.fuseau(pts, 8, 2)
        t.piece(m, B, ombre=0)
        t.damier(m & t.bord(m, 0, 1, 2), V)
    # les sourcils en broussaille, blancs
    t.piece(t.fuseau([(66, 46), (74, 42), (80, 45)], 5, 3), B, ombre=0)
    t.damier(t.fuseau([(66, 46), (74, 42), (80, 45)], 5, 3) & ~t.bord(t.fuseau([(66, 46), (74, 42), (80, 45)], 5, 3), 0, -1, 1), V)
    # l'oeil gauche plissé, l'oeil droit derrière la loupe
    t.oeil(68, 49, l=11, h=8, regard=(3, 1), paupiere=3)
    t.peindre(t.trait([(66, 54), (64, 56)]) | t.trait([(66, 58), (64, 58)]), N)
    loupe = t.poly([(86, 44), (100, 42), (110, 46), (110, 60), (100, 62), (86, 60)])
    t.piece(loupe, V, ombre=0)
    t.rayures(loupe, N, 5, 1)
    t.piece(t.ell(104, 42, 116, 64), B, ombre=0)
    t.peindre(t.ell(106, 45, 114, 61), V)
    t.peindre(t.ell(107, 47, 111, 53), B)
    t.piece(t.ell(84, 44, 98, 60), B, ombre=0)
    t.oeil(86, 47, l=10, h=10, regard=(2, 0), paupiere=1)
    # le nez long et la grosse moustache blanche tombante
    nez = t.poly([(82, 56), (88, 64), (92, 70), (88, 72), (80, 70)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(85, 70, N)
    for pts in ([(84, 72), (74, 74), (68, 82)], [(86, 72), (96, 74), (100, 82)]):
        m = t.fuseau(pts, 7, 2)
        t.piece(m, B, ombre=0)
        t.damier(m & t.bord(m, 0, 1, 2), V)
    t.pixels(80, 76, """
.:::::..
..:##:..
...::...
""")
    t.sol(160, cx=82)
    return t.image()


def sophie():
    """La fontainière : solide, foulard noué dont les pointes s'envolent, joues rondes ; la grande clé de vanne en
    laiton jetée sur l'épaule comme un fusil, le seau d'eau de l'autre main, qui déborde en gouttes."""
    t = Toile()
    # les sabots
    for (x0, x1) in [(66, 84), (92, 110)]:
        sb = t.poly([(x0, 148), (x1, 148), (x1 + 4, 156), (x1 + 2, 160), (x0 - 2, 160)])
        t.piece(sb, B, ombre=2)
        t.peindre(t.rect(x0 - 2, 158, x1 + 4, 160) & sb, V)
    t.peindre(t.rect(60, 161, 116, 161), N)
    # la robe et le grand tablier
    robe = t.poly([(68, 82), (106, 82), (112, 110), (120, 150), (56, 150), (62, 110)])
    t.piece(robe, V, ombre=3)
    t.peindre(t.rect(56, 144, 120, 146) & robe, B)
    for x in range(58, 120, 4):
        t.peindre(t.rect(x, 147, x + 1, 149) & robe, B)
    tablier = t.poly([(72, 98), (102, 98), (108, 140), (66, 140)])
    t.piece(tablier, B, ombre=3)
    plis(t, tablier, [[(80, 104), (76, 138)], [(94, 104), (98, 138)]], V)
    poche = t.rect(78, 116, 94, 128)
    t.peindre(poche & ~t.rect(79, 117, 93, 127), N)
    t.peindre(t.ell(83, 119, 89, 125), V)
    t.peindre(t.rect(64, 96, 110, 99) & robe, N)
    t.piece(t.ell(100, 94, 108, 102), B, ombre=0)
    t.piece(t.fuseau([(106, 100), (112, 112)], 4, 2), B, ombre=0)
    t.piece(t.poly([(74, 80), (100, 80), (96, 90), (87, 86), (78, 90)]), B, ombre=0)
    # le bras qui porte le seau, et le seau qui déborde
    bras = t.fuseau([(68, 86), (54, 104), (48, 116)], 13, 11)
    t.piece(bras, V, ombre=2)
    manchette(t, [(42, 110), (54, 112), (52, 118), (40, 116)])
    seau_anse = t.ell(22, 102, 64, 140) & ~t.ell(24, 104, 62, 138) & t.rect(0, 0, 176, 122)
    t.peindre(dilater(seau_anse, 1), N)
    t.peindre(seau_anse, B)
    seau = t.poly([(20, 122), (66, 122), (60, 156), (26, 156)])
    t.piece(seau, B, ombre=3)
    for y in (130, 148):
        t.peindre(t.rect(0, y, 176, y + 2) & seau, V)
    for x in range(30, 60, 6):
        t.point(x, 131, N); t.point(x, 149, N)
    eau = t.ell(20, 116, 66, 128)
    t.piece(eau, V, ombre=0)
    t.peindre(t.courbe([(26, 121), (32, 119), (38, 122), (44, 119), (50, 122), (56, 119), (62, 121)]), B)
    t.piece(t.fuseau([(22, 122), (16, 130), (15, 140)], 5, 2), V, ombre=0)
    GOUTTE = """
...:...
..:o:..
.:oo#:.
:oo##o:
:o###o:
.:ooo:.
..:::..
"""
    for (x, y) in [(14, 148), (12, 106), (26, 96), (6, 126), (54, 98)]:
        t.pixels(x - 3, y - 3, GOUTTE)
    poing(t, 36, 104, 50, 118)
    # le bras qui tient la clé sur l'épaule
    bras2 = t.fuseau([(104, 86), (118, 104), (122, 94)], 13, 11)
    t.piece(bras2, V, ombre=2)
    # la grande clé de vanne, sur l'épaule (derrière la tête)
    tige = t.trait([(120, 98), (40, 16)], 5)
    t.piece(tige, B, ombre=0)
    t.peindre(t.trait([(118, 102), (40, 18)], 1), V)
    douille = t.poly([(30, 6), (42, 2), (50, 14), (38, 20)])
    t.piece(douille, V, ombre=0)
    t.peindre(t.poly([(34, 8), (40, 6), (44, 12), (38, 15)]), N)
    t.peindre(t.trait([(32, 10), (40, 18)]), B)
    for k in (60, 76):
        y = 16 + (k - 40) * 84 / 78
        t.piece(t.ell(k - 4, y - 4, k + 4, y + 4), V, ombre=0)
    barre = t.trait([(112, 108), (132, 88)], 5)
    t.piece(barre, B, ombre=0)
    t.peindre(t.trait([(113, 109), (133, 89)]), V)
    poing(t, 114, 90, 128, 104, sens=-1)
    # la tête, les joues rondes
    tete = t.ell(68, 30, 108, 80)
    t.piece(tete, B, ombre=0)
    for x in (64, 104):
        t.piece(t.ell(x, 50, x + 9, 64), B, ombre=0)
    t.peindre(t.courbe([(67, 53), (66, 57), (68, 61)]) | t.courbe([(109, 53), (110, 57), (108, 61)]), N)
    # les cheveux sous le foulard
    for pts in ([(72, 42), (68, 50), (70, 56)], [(104, 42), (108, 50), (106, 56)]):
        t.piece(t.fuseau(pts, 7, 3), V, ombre=0, lumiere=False)
    # le foulard à pois, noué sur le dessus, pointes au vent
    foul = (t.ell(66, 20, 110, 58) & t.rect(0, 0, 176, 44))
    t.piece(foul, V, ombre=2)
    for (x, y) in [(74, 30), (84, 26), (94, 26), (102, 32), (80, 36), (90, 34), (98, 38), (72, 40)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), B)
    t.peindre(t.courbe([(68, 42), (88, 38), (108, 42)], 2), B)
    t.piece(t.ell(82, 14, 94, 24), V, ombre=0)
    t.piece(t.fuseau([(84, 18), (74, 8), (66, 10)], 7, 2), V, ombre=0)
    t.piece(t.fuseau([(92, 18), (102, 6), (112, 6)], 7, 2), V, ombre=0)
    t.peindre(t.courbe([(84, 17), (74, 10)]) | t.courbe([(92, 17), (102, 8)]), N)
    # le visage : regard franc, sourire, joues rondes
    t.piece(t.fuseau([(74, 46), (80, 43), (86, 45)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(91, 45), (96, 43), (102, 46)], 3, 2), V, ombre=0)
    t.oeil(74, 49, l=12, h=9, regard=(1, 0), paupiere=2, cils=-1)
    t.oeil(91, 49, l=12, h=9, regard=(-1, 0), paupiere=2, cils=1)
    t.pixels(86, 57, """
..:..
..:..
.:o::
:::::
""")
    t.pixels(80, 65, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..:::######:::..
....::::::::....
""")
    t.damier(t.ell(70, 60, 80, 68) | t.ell(98, 60, 108, 68), V)
    t.sol(160, cx=88)
    return t.image()


def ruth():
    """La gardienne des Thermes : ronde et gaie, cheveux en serviette roulée, la serviette rayée sur l'épaule ; elle
    lève une lanterne chaude d'où monte de la vapeur, le pic à glace dans l'autre main ; les joues rouges de
    chaleur."""
    t = Toile()
    # la vapeur qui monte de la lanterne
    for pts in ([(140, 18), (134, 10), (140, 4), (134, -4)], [(150, 18), (156, 10), (150, 2)], [(130, 20), (124, 14), (126, 6)]):
        t.peindre(t.courbe(pts, 2), B)
    # les mules
    for (x0, x1) in [(62, 82), (94, 114)]:
        m = t.poly([(x0, 150), (x1, 150), (x1 + 4, 158), (x0 - 4, 158)])
        t.piece(m, V, ombre=0)
        t.peindre(t.rect(x0 - 4, 156, x1 + 4, 158), B)
        t.peindre(t.rect(x0 + 4, 150, x1 - 4, 152), B)
    t.peindre(t.rect(56, 159, 120, 159), N)
    # le peignoir tout rond
    pei = t.ell(52, 74, 126, 154) | t.poly([(64, 80), (114, 80), (118, 100), (60, 100)])
    t.piece(pei, B, ombre=4)
    t.peindre(t.courbe([(70, 82), (86, 110), (80, 152)], 2), N)
    t.peindre(t.courbe([(72, 84), (88, 110), (82, 150)], 2), V)
    plis(t, pei, [[(62, 112), (60, 136)], [(108, 116), (114, 138)], [(96, 120), (98, 148)]])
    t.peindre(t.rect(52, 146, 126, 148) & pei & (((t.xx) % 4) < 2), V)
    t.peindre(t.courbe([(56, 108), (90, 114), (124, 108)], 4), V)
    t.peindre(t.courbe([(56, 106), (90, 112), (124, 106)]), N)
    t.piece(t.ell(84, 108, 96, 120), V, ombre=0)
    t.piece(t.fuseau([(88, 118), (82, 132), (84, 140)], 5, 3), V, ombre=0)
    t.piece(t.fuseau([(92, 118), (98, 130), (96, 138)], 5, 3), V, ombre=0)
    poche = t.rect(98, 124, 114, 136)
    t.peindre(poche & ~t.rect(99, 125, 113, 135), N)
    t.etoile(106, 130, V, 2)
    # la serviette rayée sur l'épaule
    serv = t.poly([(60, 78), (78, 76), (74, 128), (58, 126)])
    t.piece(serv, B, ombre=2)
    t.rayures(serv, V, 6, 2, vertical=False)
    for x in range(58, 75, 2):
        t.peindre(t.trait([(x, 127), (x, 131)]), B)
    # le bras au pic à glace
    bras = t.fuseau([(60, 86), (42, 102), (34, 112)], 13, 11)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(44, 98), (40, 104)]), N)
    manche = t.fuseau([(62, 84), (50, 96)], 16, 15)
    t.piece(manche, B, ombre=2)
    t.peindre(t.trait([(42, 98), (54, 88)], 2), V)
    pic = t.trait([(30, 112), (14, 142)], 2)
    t.piece(pic, B, ombre=0)
    t.piece(t.poly([(14, 140), (17, 142), (10, 152)]), B, ombre=0)
    t.piece(t.trait([(26, 118), (22, 126)], 5), V, ombre=0)
    t.peindre(t.trait([(25, 119), (21, 126)]), B)
    t.piece(t.trait([(42, 96), (32, 112)], 5), V, ombre=0)
    poing(t, 28, 104, 42, 118)
    for (x, y) in [(6, 136), (20, 152)]:
        t.etoile(x, y, B, 2)
    # le bras levé, la lanterne chaude
    bras2 = t.fuseau([(114, 86), (130, 76), (136, 56)], 13, 11)
    t.piece(bras2, B, ombre=2)
    t.piece(t.fuseau([(112, 86), (124, 80)], 16, 15), B, ombre=2)
    t.peindre(t.trait([(124, 74), (126, 88)], 2), V)
    t.piece(t.ell(136, 22, 148, 32) & ~t.ell(138, 24, 146, 30), V, ombre=0, lumiere=False)
    toit = t.poly([(128, 34), (142, 26), (156, 34), (152, 38), (132, 38)])
    t.piece(toit, V, ombre=0)
    lant = t.rect(132, 38, 152, 58)
    t.piece(lant, V, ombre=0, lumiere=False)
    t.peindre(t.rect(135, 40, 140, 55) | t.rect(144, 40, 149, 55), B)
    t.peindre(t.ell(137, 42, 147, 56), B)
    t.peindre(t.poly([(142, 43), (146, 50), (142, 55), (138, 50)]), V)
    t.point(142, 49, B)
    t.piece(t.rect(130, 58, 154, 61), V, ombre=0)
    for k in range(10):
        a = k * math.pi / 5 + 0.3
        if 1.6 < a < 2.9:
            continue
        r1 = 24 if k % 2 == 0 else 19
        t.peindre(t.trait([(142 + 16 * math.cos(a), 48 + 16 * math.sin(a)), (142 + r1 * math.cos(a), 48 + r1 * math.sin(a))]), B)
    poing(t, 130, 58, 146, 72, sens=-1)
    # la tête ronde
    tete = t.ell(66, 34, 110, 84)
    t.piece(tete, B, ombre=0)
    # la serviette roulée en turban
    turb = t.ell(62, 6, 114, 54) & t.rect(0, 0, 176, 48)
    t.piece(turb, B, ombre=3)
    for pts in ([(64, 40), (88, 18), (112, 30)], [(66, 30), (84, 12), (104, 14)], [(70, 46), (96, 30), (112, 42)]):
        t.peindre(t.courbe(pts, 3) & turb, V)
        t.peindre(t.courbe([(p[0], p[1] + 2) for p in pts]) & turb, N)
    t.piece(t.ell(80, 0, 96, 14), B, ombre=2)
    t.peindre(t.courbe([(84, 4), (88, 2), (92, 6), (88, 10), (86, 7)]), N)
    t.peindre(t.courbe([(64, 46), (88, 42), (112, 46)], 2), N)
    # les mèches qui s'échappent
    t.piece(t.fuseau([(68, 48), (64, 56), (66, 62)], 5, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(108, 48), (112, 56), (110, 62)], 5, 1), V, ombre=0, lumiere=False)
    # le visage gai, les joues rouges
    t.peindre(t.courbe([(72, 52), (78, 48), (84, 50)], 2), N)
    t.peindre(t.courbe([(92, 50), (98, 48), (104, 52)], 2), N)
    t.oeil(72, 53, l=12, h=9, regard=(2, -2), paupiere=2, cils=-1)
    t.oeil(92, 53, l=12, h=9, regard=(2, -2), paupiere=2, cils=1)
    t.pixels(85, 62, """
..:..
..:..
.:o::
:::::
""")
    t.pixels(78, 70, """
:................:
.::::::::::::::::.
.:oooooooooooooo:.
..::::::::::::::..
...:::######:::...
.....::::::::.....
""")
    t.damier(t.ell(68, 64, 80, 74) | t.ell(98, 64, 110, 74), V)
    t.peindre(t.trait([(70, 60), (72, 62)]) | t.trait([(106, 62), (108, 60)]), N)
    t.sol(160, cx=88)
    return t.image()


def veilleuse():
    """La veilleuse : une petite vieille sous son châle, voûtée, la bougie allumée qui éclaire son visage par en
    dessous ; elle chante, la bouche ronde, une note qui s'envole ; le vieux cahier de chants ouvert dans l'autre
    main."""
    t = Toile()
    # les notes qui s'envolent
    def note(x, y, double=False):
        tetes = [(x, y)] + ([(x + 12, y - 3)] if double else [])
        for (hx, hy) in tetes:
            t.piece(t.ell(hx, hy, hx + 7, hy + 5), B, ombre=0)
            t.piece(t.rect(hx + 6, hy - 12, hx + 7, hy + 2), B, ombre=0)
        if double:
            t.piece(t.poly([(x + 6, y - 12), (x + 19, y - 15), (x + 19, y - 12), (x + 6, y - 9)]), B, ombre=0)
        else:
            t.piece(t.fuseau([(x + 7, y - 12), (x + 12, y - 8), (x + 11, y - 3)], 3, 1), B, ombre=0)
    note(132, 30)
    note(146, 14, double=True)
    note(116, 10)
    for (x, y) in [(164, 40), (106, 22), (140, 46)]:
        t.etincelle(x, y)
    # le bas de la robe et les petits souliers
    for (x0, x1) in [(70, 84), (90, 104)]:
        sl = t.poly([(x0, 152), (x1, 152), (x1 + 2, 159), (x0 - 2, 159)])
        t.piece(sl, V, ombre=0)
        t.peindre(t.rect(x0 - 2, 158, x1 + 2, 159), B)
    robe = t.poly([(60, 132), (114, 132), (118, 154), (56, 154)])
    t.piece(robe, B, ombre=2)
    t.rayures(robe, V, 6, 1, vertical=True)
    # le grand châle qui l'enveloppe, du crâne aux genoux, à franges
    chale = t.poly([(72, 14), (96, 12), (112, 26), (118, 60), (128, 110), (134, 140), (40, 140), (38, 104), (42, 64), (52, 32)])
    t.piece(chale, V, ombre=4)
    t.peindre(t.courbe([(60, 40), (52, 90), (46, 136)]), N)
    t.peindre(t.courbe([(118, 40), (126, 90), (130, 136)]), N)
    for x in range(42, 134, 3):
        t.peindre(t.trait([(x, 141), (x, 146 + (x % 2) * 2)]), B)
    t.peindre(t.rect(40, 138, 134, 140) & chale, B)
    for (x, y) in [(56, 120), (70, 130), (88, 124), (106, 130), (120, 120), (64, 104), (116, 100), (52, 70), (124, 66)]:
        t.etoile(x, y, B, 1)
    for x in range(46, 132, 8):
        t.pixels(x, 132, ".o.\no:o\n.o.")
    # le cahier de chants ouvert, dans la main gauche
    cah = t.poly([(20, 90), (42, 84), (62, 90), (62, 114), (42, 108), (20, 114)])
    t.piece(cah, B, ombre=0)
    t.peindre(t.poly([(18, 114), (42, 110), (64, 114), (64, 117), (42, 113), (18, 117)]), V)
    t.peindre(t.trait([(42, 84), (42, 110)]), N)
    for k in range(4):
        t.peindre(t.trait([(24, 94 + k * 4), (38, 90 + k * 4)]), V)
        t.peindre(t.trait([(46, 90 + k * 4), (58, 94 + k * 4)]), V)
    for (x, y) in [(28, 95), (34, 97), (50, 95), (55, 101)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), N)
    main = t.ell(36, 106, 50, 118)
    t.piece(main, B, ombre=0)
    t.peindre(t.trait([(39, 110), (44, 110)]) | t.trait([(39, 113), (44, 113)]), N)
    # le visage, sous le châle, éclairé par en dessous
    tete = t.ell(62, 28, 100, 74)
    t.piece(tete, B, ombre=0)
    t.damier(t.ell(62, 28, 100, 74) & t.rect(0, 0, 176, 36), V)
    # les cheveux blancs en bandeaux sous le châle
    for pts in ([(80, 28), (68, 32), (64, 44)], [(82, 28), (94, 32), (98, 44)]):
        m = t.fuseau(pts, 7, 3)
        t.piece(m, B, ombre=0)
        t.peindre(t.courbe(pts) & m, V)
    # rides, yeux mi-clos de chanteuse, sourcils levés
    t.peindre(t.courbe([(66, 42), (72, 39), (78, 41)], 2), N)
    t.peindre(t.courbe([(84, 41), (90, 39), (96, 42)], 2), N)
    t.peindre(t.courbe([(67, 49), (72, 52), (78, 49)], 2), N)
    t.peindre(t.courbe([(84, 49), (90, 52), (95, 49)], 2), N)
    for (x, y) in [(70, 52), (74, 53), (87, 53), (91, 52)]:
        t.point(x, y, N)
    t.peindre(t.trait([(64, 48), (62, 50)]) | t.trait([(64, 52), (62, 52)]) | t.trait([(97, 48), (99, 50)]) | t.trait([(97, 52), (99, 52)]), N)
    nez = t.poly([(82, 48), (86, 58), (84, 60), (78, 59)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(81, 59, N)
    t.pixels(76, 61, """
...::::...
..:####:..
.:##::##:.
.:#:..:#:.
.:##::##:.
..:####:..
...::::...
""")
    t.peindre(t.courbe([(72, 64), (70, 68)]) | t.courbe([(90, 64), (92, 68)]), N)
    t.damier(t.ell(66, 54, 74, 60) | t.ell(88, 54, 96, 60), V)
    # le capuchon du châle autour du visage
    cap = t.ell(54, 16, 108, 84) & ~t.ell(62, 26, 100, 76) & t.rect(0, 0, 176, 76)
    t.piece(cap, V, ombre=2)
    t.peindre(t.courbe([(64, 30), (80, 22), (98, 30)]), B)
    # la bougie dans son bougeoir, tenue près du visage
    t.piece(t.ell(116, 104, 144, 112), B, ombre=0)
    t.peindre(t.ell(120, 106, 140, 110), V)
    t.piece(t.ell(138, 102, 148, 112) & ~t.ell(140, 104, 146, 110), B, ombre=0)
    bougie = t.rect(126, 82, 134, 106)
    t.piece(bougie, B, ombre=2)
    t.piece(t.fuseau([(128, 82), (127, 88), (128, 92)], 3, 1), B, ombre=0)
    t.peindre(t.trait([(130, 79), (130, 82)]), N)
    flamme = t.fuseau([(130, 80), (126, 74), (130, 62)], 8, 1)
    t.piece(flamme, B, ombre=0)
    t.peindre(t.fuseau([(130, 79), (128, 74), (130, 68)], 3, 1), V)
    for k in range(12):
        a = k * math.pi / 6
        if 1.9 < a < 4.3:
            continue
        r1 = 18 if k % 2 == 0 else 14
        t.peindre(t.trait([(130 + 11 * math.cos(a), 72 + 11 * math.sin(a)), (130 + r1 * math.cos(a), 72 + r1 * math.sin(a))]), B)
    main2 = t.ell(118, 98, 132, 110)
    t.piece(main2, B, ombre=0)
    t.peindre(t.trait([(120, 102), (125, 102)]) | t.trait([(120, 105), (125, 105)]), N)
    t.sol(160, cx=88)
    return t.image()


def postiere():
    """La postière : en pleine course, une jambe en l'air, la casquette qui s'envole presque ; elle brandit une
    lettre datée, la sacoche en bandoulière bat contre sa hanche et laisse échapper deux enveloppes."""
    t = Toile()
    # les traits de vitesse, derrière elle
    for (x0, x1, y) in [(140, 172, 60), (130, 168, 76), (146, 174, 92), (136, 166, 130), (150, 174, 144), (124, 150, 112)]:
        t.peindre(t.rect(x0, y, x1, y + 1), B)
        t.peindre(t.rect(x0 - 6, y, x0 - 4, y + 1), B)
    # la jambe arrière, talon en l'air
    cuisse2 = t.fuseau([(92, 112), (106, 126), (116, 134)], 12, 10)
    t.piece(cuisse2, B, ombre=2)
    mollet2 = t.fuseau([(116, 134), (130, 126), (142, 116)], 9, 7)
    t.piece(mollet2, B, ombre=2)
    t.rayures(mollet2, V, 4, 2, vertical=False)
    t.contour(mollet2, N)
    sh2 = t.poly([(138, 106), (150, 104), (156, 114), (146, 120), (136, 116)])
    t.piece(sh2, V, ombre=0)
    t.damier(sh2 & t.rect(0, 104, 176, 110), N)
    t.peindre(t.trait([(146, 120), (157, 114)], 2), B)
    # la sacoche et les enveloppes qui s'échappent
    for (x, y, a) in [(144, 126, 0), (152, 144, 1)]:
        env = t.poly([(x, y), (x + 16, y - 3 + a * 6), (x + 18, y + 8 + a * 6), (x + 2, y + 11)])
        t.piece(env, B, ombre=0)
        t.peindre(t.trait([(x, y), (x + 9, y + 5 + a * 3), (x + 16, y - 3 + a * 6)]), N)
        t.peindre(t.rect(x + 11, y + 1 + a * 4, x + 14, y + 4 + a * 4), V)
    # la jupe qui vole
    jupe = t.poly([(70, 98), (100, 98), (112, 112), (106, 122), (94, 118), (82, 124), (66, 120), (58, 112)])
    t.piece(jupe, B, ombre=3)
    plis(t, jupe, [[(76, 102), (70, 120)], [(86, 102), (84, 122)], [(96, 102), (102, 118)]], V)
    t.peindre(t.trait([(60, 113), (66, 119), (82, 123), (94, 117), (106, 121)]), V)
    sac = t.poly([(98, 98), (124, 94), (128, 116), (102, 120)])
    t.piece(sac, V, ombre=3)
    rabat = t.poly([(98, 98), (124, 94), (125, 106), (99, 110)])
    t.piece(rabat, V, ombre=0)
    t.peindre(t.trait([(100, 108), (124, 104)]), B)
    t.piece(t.rect(108, 103, 114, 110), B, ombre=0)
    t.point(111, 106, N)
    t.peindre(t.trait([(126, 106), (138, 112)]), B)
    # la jambe avant, tendue vers l'avant, le pied qui touche terre
    cuisse = t.fuseau([(74, 116), (62, 132), (56, 146)], 12, 10)
    t.piece(cuisse, B, ombre=2)
    t.rayures(cuisse & t.rect(0, 128, 176, 170), V, 4, 2, vertical=False)
    t.contour(cuisse, N)
    sh = t.poly([(46, 144), (62, 144), (64, 156), (38, 158), (38, 152)])
    t.piece(sh, V, ombre=0)
    t.peindre(t.rect(38, 156, 64, 157), B)
    t.damier(sh & t.rect(0, 144, 176, 150), N)
    t.peindre(t.rect(36, 159, 66, 159), N)
    # la veste, penchée en avant
    veste = t.poly([(70, 70), (96, 66), (104, 82), (102, 100), (68, 102), (62, 86)])
    t.piece(veste, V, ombre=3)
    t.piece(t.poly([(74, 68), (92, 66), (88, 76), (82, 72), (76, 76)]), B, ombre=0)
    for y in (80, 88, 96):
        t.piece(t.ell(80, y - 1, 83, y + 2), B, ombre=0)
    t.peindre(t.trait([(76, 70), (110, 106)], 3), B)
    t.peindre(t.trait([(77, 71), (109, 105)]) & (((t.xx) % 3) == 0), N)
    # le bras arrière qui balance
    bras2 = t.fuseau([(98, 74), (112, 84), (122, 80)], 10, 8)
    t.piece(bras2, V, ombre=2)
    poing(t, 118, 72, 130, 84, sens=-1)
    # le bras levé qui brandit la lettre datée
    bras = t.fuseau([(74, 74), (56, 62), (48, 40)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(42, 42), (54, 40), (54, 46), (44, 48)])
    lettre = t.poly([(14, 8), (58, 2), (62, 32), (18, 38)])
    t.piece(lettre, B, ombre=3)
    t.peindre(t.trait([(14, 8), (37, 22), (58, 2)], 2), N)
    t.peindre(t.rect(46, 8, 54, 16) & lettre, V)
    t.peindre(t.rect(48, 10, 52, 14), B)
    texte(t, 20, 26, "6.04", V)
    t.peindre(t.trait([(20, 33), (52, 29)]) & (((t.xx) % 3) != 0), V)
    poing(t, 40, 26, 54, 42)
    for (x, y) in [(8, 44), (68, 10), (6, 2)]:
        t.etincelle(x, y)
    # la queue de cheval qui flotte
    for pts in ([(96, 38), (110, 34), (122, 40)], [(96, 44), (112, 46), (124, 52)]):
        t.piece(t.fuseau(pts, 8, 2), V, ombre=0)
    t.peindre(t.courbe([(100, 38), (114, 37)]) | t.courbe([(100, 45), (114, 47)]), N)
    t.piece(t.ell(92, 36, 100, 46), B, ombre=0)
    # la tête
    tete = t.ell(60, 24, 98, 70)
    t.piece(tete, B, ombre=0)
    ch = t.ell(58, 22, 100, 50) & ~t.ell(62, 32, 96, 74)
    ch |= t.fuseau([(64, 30), (70, 40), (68, 46)], 7, 2)
    t.piece(ch, V, ombre=2)
    t.peindre(t.courbe([(68, 26), (80, 23), (92, 28)]), B)
    # la casquette qui s'envole presque
    cas = t.poly([(74, 14), (86, 2), (108, 4), (112, 12), (106, 18), (78, 20)])
    t.piece(cas, V, ombre=2)
    t.peindre(t.trait([(76, 17), (108, 13)], 2), B)
    t.pixels(92, 6, ".ooo.\no#o#o\n.ooo.")
    vis = t.poly([(76, 17), (62, 18), (60, 23), (76, 22)])
    t.piece(vis, V, ombre=0, lumiere=False)
    t.damier(vis, N)
    t.peindre(t.trait([(63, 19), (75, 18)]), B)
    for (x, y) in [(116, 4), (118, 12)]:
        t.peindre(t.rect(x, y, x + 8, y), B)
    t.peindre(t.courbe([(70, 24), (66, 20), (68, 14)]) | t.courbe([(112, 22), (116, 18)]), B)
    # le visage : regard vers la lettre, bouche ouverte d'élan
    t.piece(t.fuseau([(66, 38), (71, 35), (77, 37)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(82, 37), (87, 35), (93, 38)], 3, 2), V, ombre=0)
    t.oeil(65, 40, l=12, h=9, regard=(-2, -2), paupiere=2, cils=-1)
    t.oeil(82, 40, l=12, h=9, regard=(-2, -2), paupiere=2, cils=1)
    t.pixels(74, 48, """
..:..
.:...
:o::.
::::.
""")
    t.pixels(70, 56, """
:........:
.::::::::.
.:oooooo:.
.::####::.
..::::::..
""")
    t.damier(t.ell(64, 52, 70, 57) | t.ell(88, 52, 94, 57), V)
    t.pixels(100, 26, """
...:...
..:o:..
.:ooo:.
:ooo#o:
.:ooo:.
..:::..
""")
    t.sol(160, cx=84)
    return t.image()


PORTRAITS = {
    "item_niklaus": niklaus, "item_sophie": sophie, "item_ruth": ruth, "item_veilleuse": veilleuse,
    "item_postiere": postiere,
    "item_sara": sara, "item_rayan": rayan,
    "item_zelia": zelia, "item_syrine": syrine,
    "item_miguel": miguel, "item_noam": noam, "item_younes": younes, "item_seymour": seymour,
}


if __name__ == "__main__":
    noms = [n.replace(".gif", "") for n in sys.argv[1:]] or list(PORTRAITS)
    for nom in noms:
        finir(nom + ".gif", PORTRAITS[nom]())
    print(len(noms), "portraits")
