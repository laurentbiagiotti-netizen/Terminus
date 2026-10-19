"""Portraits v3, lot 3 : les maîtres de l'Académie (chapitre 4) et les habitants de l'Académie (et le Colporteur).

Grille fine de 176 x 170 cases (2 x 2 pixels), dessinés par pièces avec portrait_v3.Toile (liseré noir, aplat,
lumière, ombre tramée), visages détaillés, objet de métier lisible. Méthode : voir portrait_v3.py. Les anciennes
fonctions (dessiner_academie.py, dessiner_habitants.py) restent en place ; ce fichier les remplace pour les GIF.

Usage : python3 outils/portraits_v3_3.py [item_alfred.gif ...]   (sans argument : tout le lot)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import N, V, B, finir  # noqa: E402
from portrait_v3 import Toile, texte, POLICE  # noqa: E402

# deux signes de plus pour la police 3 x 5 (les accolades des modèles ${...})
POLICE.setdefault('{', ".##|.#.|##.|.#.|.##")
POLICE.setdefault('}', "##.|.#.|.##|.#.|##.")


# ------------------------------------------------------------------ petites aides communes
def poing(t, x, y, w=12, h=11, doigts=3, sens=1):
    """Un poing blanc cerclé de noir, 2 ou 3 traits de doigts."""
    m = t.ell(x, y, x + w, y + h)
    t.piece(m, B, ombre=0)
    for k in range(doigts):
        yy = y + 3 + k * 3
        if sens > 0:
            t.peindre(t.trait([(x + 2, yy), (x + w // 2 + 1, yy)]), N)
        else:
            t.peindre(t.trait([(x + w // 2 - 1, yy), (x + w - 2, yy)]), N)
    return m


def lunettes(t, x1, y1, x2, y2, r=7, branches=True, reflet=True):
    """Deux verres ronds, cercle noir d'une case, pont et branches ; (x1, y1) et (x2, y2) : centres."""
    for (x, y) in ((x1, y1), (x2, y2)):
        t.peindre(t.ell(x - r, y - r, x + r, y + r) & ~t.ell(x - r + 1, y - r + 1, x + r - 1, y + r - 1), N)
        if reflet:
            t.point(x - r + 3, y - r + 3, V); t.point(x - r + 4, y - r + 3, V); t.point(x - r + 3, y - r + 4, V)
    t.peindre(t.courbe([(x1 + r, y1 - 1), ((x1 + x2) / 2, y1 - 3), (x2 - r, y2 - 1)]), N)
    if branches:
        t.peindre(t.trait([(x1 - r, y1 - 1), (x1 - r - 4, y1 - 2)]), N)
        t.peindre(t.trait([(x2 + r, y2 - 1), (x2 + r + 4, y2 - 2)]), N)


def rayons(t, cx, cy, r0, r1, r2, n=12, sauf=None, decal=0.0):
    """Une couronne de traits blancs alternés long (r1) et court (r2), sauf dans l'arc sauf=(a0, a1)."""
    for k in range(n):
        a = k * 2 * math.pi / n + decal
        if sauf and sauf[0] < a < sauf[1]:
            continue
        rr = r1 if k % 2 == 0 else r2
        t.peindre(t.trait([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
                           (cx + rr * math.cos(a), cy + rr * math.sin(a))]), B)


def dollar(t, x, y, c=N):
    """Un signe dollar de 3 x 7 cases (celui de la police 3 x 5 se lit mal)."""
    t.pixels(x, y, "\n".join(l.replace('#', {N: ':', V: '#', B: 'o'}[c]) for l in
                               [".#.", "###", "#..", "###", "..#", "###", ".#."]))


def chaussure(t, x, y, l=18, sens=1):
    """Une chaussure verte à reflet blanc, pointe vers sens, semelle sur y."""
    if sens > 0:
        p = t.poly([(x, y - 7), (x + l - 6, y - 7), (x + l, y - 3), (x + l, y), (x, y)])
    else:
        p = t.poly([(x, y - 7), (x - l + 6, y - 7), (x - l, y - 3), (x - l, y), (x, y)])
    t.piece(p, V, ombre=0)
    t.damier(p & t.rect(0, y - 2, 176, y), N)
    xa, xb = (x + 2, x + l - 6) if sens > 0 else (x - l + 6, x - 2)
    t.peindre(t.trait([(xa, y - 5), (xb, y - 5)]), B)
    return p


# ------------------------------------------------------------------ Alfred, le devin de la Divination (awk)
def alfred_v3():
    t = Toile()
    # le grand manteau à capuche, qui tombe jusqu'au sol
    cape = t.poly([(64, 72), (112, 72), (124, 96), (134, 128), (142, 158), (34, 158), (42, 128), (52, 96)])
    t.piece(cape, V, ombre=4)
    for pts in ([(58, 100), (50, 130), (44, 156)], [(116, 102), (124, 130), (130, 156)],
                [(70, 112), (66, 134), (64, 156)], [(108, 116), (112, 136), (114, 156)]):
        t.peindre(t.courbe(pts), N)
    # la robe blanche dans la fente du manteau, brodée d'yeux
    sous = t.poly([(80, 140), (98, 140), (104, 158), (72, 158)])
    t.piece(sous, B, ombre=2)
    for y in (146,):
        t.pixels(82, y, """
...::::::...
.::oooooo::.
:oooo##oooo:
:ooo#::#ooo:
.::oo##oo::.
...::::::...
""")
    ourlet = t.bord(cape, 0, 1, 5) & ~sous
    t.peindre(ourlet, B)
    for x in range(34, 144, 6):
        t.peindre(t.trait([(x, 158), (x + 3, 155), (x + 6, 158)]) & ourlet, N)
    t.peindre(t.bord(sous, 0, 1, 3), V)
    for (x, y) in [(58, 116), (48, 140), (122, 112), (128, 140), (62, 136), (116, 126), (56, 150), (122, 150)]:
        t.etoile(x, y, B, 1)
    # les pointes des chaussons sous la robe
    for x in (70, 92):
        p = t.poly([(x, 155), (x + 12, 155), (x + 20, 158), (x + 18, 161), (x, 161)])
        t.piece(p, V, ombre=0)
    # le bras gauche qui tient le registre ouvert
    manche2 = t.poly([(62, 78), (48, 96), (40, 110), (54, 116), (64, 104), (70, 90)])
    t.piece(manche2, V, ombre=2)
    t.piece(t.poly([(38, 108), (54, 114), (52, 118), (36, 113)]), B, ombre=0)
    livre = t.poly([(8, 104), (34, 98), (56, 108), (54, 136), (32, 128), (8, 134)])
    t.piece(livre, B, ombre=0)
    t.peindre(t.trait([(32, 99), (32, 128)], 2), N)
    t.peindre(t.trait([(8, 134), (32, 128), (54, 136)]) | t.trait([(9, 136), (32, 130), (54, 138)]), N)
    t.peindre(t.poly([(8, 136), (32, 130), (54, 138), (54, 140), (32, 132), (8, 138)]), V)
    for (x, y, c) in ((11, 105, "1"), (22, 104, "2"), (37, 104, "3")):
        dollar(t, x, y - 1, N); texte(t, x + 4, y, c, N)
    for k in range(4):
        y = 113 + k * 4
        for (xa, xb) in ((11, 15), (21, 27), (37, 45), (47, 51)):
            dy = 0 if xa < 32 else 1
            t.peindre(t.trait([(xa, y - (xa - 8) // 12 + dy), (xb, y - (xb - 8) // 12 + dy)]), V)
    t.peindre(t.trait([(19, 104), (18, 126)]) | t.trait([(45, 104), (46, 130)]), N)
    # la tête dans la capuche : le fond d'ombre de la capuche
    capuche = t.poly([(54, 74), (56, 50), (64, 32), (76, 22), (92, 18), (106, 22), (116, 34), (122, 52), (122, 74),
                      (110, 82), (66, 82)])
    pointe = t.fuseau([(80, 22), (68, 10), (52, 10), (40, 22)], 12, 3)
    t.piece(pointe, V, ombre=2)
    t.piece(capuche, V, ombre=3)
    creux = t.ell(66, 30, 112, 86)
    t.peindre(creux, N)
    # le visage, la longue barbe blanche
    visage = t.ell(70, 38, 108, 86)
    barbe = t.poly([(70, 66), (76, 76), (88, 80), (100, 76), (108, 66), (110, 84), (104, 100), (98, 118), (92, 134),
                    (90, 124), (82, 110), (76, 96), (70, 82)])
    t.piece(visage | barbe, B, ombre=0)
    t.damier(visage & t.rect(0, 38, 176, 45), V)
    t.damier(visage & t.bord(visage, 1, 0, 3) & t.rect(0, 38, 176, 70), V)
    t.damier(t.bord(barbe, 1, 0, 2) & t.rect(0, 84, 176, 140), V)
    t.peindre(t.courbe([(72, 66), (76, 72), (80, 74)]) | t.courbe([(106, 66), (102, 72), (98, 74)]), V)
    for pts in ([(80, 84), (84, 100), (88, 116)], [(96, 84), (96, 100), (94, 114)], [(88, 88), (90, 104)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(90, 124), (94, 132), (98, 128), (96, 124)]), N)
    # les bords de la capuche par-dessus la tête (le liseré blanc du tissu)
    for pts in ([(68, 82), (62, 60), (70, 40), (84, 30)], [(110, 82), (116, 60), (110, 40), (96, 30)]):
        t.piece(t.fuseau(pts, 6, 3), V, ombre=0, lumiere=False)
    # les sourcils broussailleux, levés vers l'orbe
    t.piece(t.fuseau([(78, 50), (84, 46), (90, 48)], 3, 2), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(94, 47), (100, 44), (106, 44)], 2, 4), V, ombre=0, lumiere=False)
    # les yeux luisants, tournés vers l'orbe
    t.oeil(77, 52, l=11, h=8, regard=(2, -1), paupiere=3)
    t.oeil(94, 51, l=11, h=8, regard=(2, -1), paupiere=3)
    t.peindre(t.trait([(76, 62), (79, 64)]) | t.trait([(105, 61), (108, 59)]), N)
    # le nez crochu
    nez = t.poly([(89, 58), (93, 61), (98, 68), (96, 72), (91, 72), (86, 73), (85, 69), (88, 64)])
    t.damier(t.bord(nez, 1, 0, 2) | t.bord(nez, 0, 1, 1), V)
    t.peindre(t.courbe([(90, 57), (95, 63), (98, 68), (97, 72), (92, 72)], 2), N)
    t.peindre(t.courbe([(87, 69), (86, 72), (89, 73)]), N)
    t.point(91, 70, N)
    # la moustache et la bouche (un sourire de connivence)
    m1 = t.piece(t.fuseau([(90, 74), (84, 76), (78, 80), (75, 88)], 7, 2), V, ombre=0, lumiere=False)
    m2 = t.piece(t.fuseau([(92, 74), (98, 76), (104, 80), (107, 88)], 7, 2), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(88, 75), (82, 77), (78, 82)]) | t.courbe([(94, 75), (100, 77), (104, 82)]), N)
    t.peindre(t.courbe([(86, 74), (82, 75)]) | t.courbe([(96, 74), (100, 75)]), B)
    t.pixels(85, 78, """
:........:
.::::::::.
..:####:..
...::::...
""")
    # le bras droit levé qui tient l'orbe de cristal
    manche = t.poly([(108, 78), (120, 70), (128, 56), (140, 58), (138, 72), (126, 90), (114, 96)])
    t.piece(manche, V, ombre=2)
    t.peindre(t.courbe([(116, 80), (126, 70), (132, 60)]), N)
    t.piece(t.poly([(126, 54), (142, 56), (141, 61), (126, 59)]), B, ombre=0)
    rayons(t, 140, 30, 20, 30, 25, n=14, sauf=(1.4, 2.6), decal=0.1)
    orbe = t.ell(124, 14, 156, 46)
    t.piece(orbe, B, ombre=0)
    t.peindre(t.ell(127, 17, 153, 43), V)
    for x in (131, 138, 145):
        t.peindre(t.rect(x, 19, x + 3, 41) & t.ell(127, 17, 153, 43), B)
        t.peindre(t.rect(x + 4, 19, x + 4, 41) & t.ell(127, 17, 153, 43), N)
    t.peindre(t.ell(128, 18, 136, 26) & ~t.ell(130, 20, 140, 30), B)
    t.point(150, 22, B); t.point(149, 21, B)
    # la main qui tient l'orbe par-dessous (doigts écartés)
    main = t.ell(129, 43, 151, 56)
    t.piece(main, B, ombre=0)
    t.damier(t.bord(main, 1, 0, 2) | t.bord(main, 0, 1, 1), V)
    t.peindre(t.trait([(135, 44), (135, 47)]) | t.trait([(140, 45), (140, 48)]) | t.trait([(145, 44), (145, 47)]), N)
    for (x, y) in [(116, 12), (164, 50), (160, 8), (112, 36)]:
        t.etincelle(x, y)
    t.sol(162)
    return t.image()

# ------------------------------------------------------------------ Lee, la maîtresse de la Transmutation (sed)
def lee_v3():
    t = Toile()
    # le parchemin qui se réécrit tout seul, en l'air à droite
    parch = t.poly([(132, 20), (166, 16), (168, 84), (134, 88)])
    t.piece(parch, B, ombre=3)
    for (y, x0, x1) in [(16, 130, 168), (84, 132, 170)]:
        rou = t.ell(x0 - 2, y - 4, x1, y + 4)
        t.piece(rou, B, ombre=0)
        t.damier(t.bord(rou, 0, 1, 2), V)
    texte(t, 138, 26, "s/a/o/", N)
    lignes = [(36, 22, N), (42, 26, N), (48, 18, V), (54, 24, V), (60, 20, V), (66, 26, V), (72, 16, V)]
    for (y, l, c) in lignes:
        t.peindre(t.trait([(139, y), (139 + l, y)]) & (((t.xx) % 4) != 3), c)
    t.peindre(t.trait([(138, 49), (160, 47)]) & (((t.xx) % 2) == 0), N)
    for (x, y) in [(160, 50), (150, 58), (164, 66)]:
        t.etoile(x, y, N, 1)
    for (x, y) in [(124, 10), (172, 40), (126, 96)]:
        t.etincelle(x, y)
    # les jambes en bas rayés et les bottines
    for x in (72, 88):
        j = t.rect(x, 134, x + 9, 152)
        t.piece(j, B, ombre=0)
        t.rayures(j, V, 4, 2, vertical=False)
    chaussure(t, 72, 159, 16, -1)
    chaussure(t, 90, 159, 16, 1)
    # la robe verte sous la blouse
    robe = t.poly([(72, 90), (94, 90), (102, 138), (66, 138)])
    t.piece(robe, V, ombre=2)
    for x in range(70, 100, 6):
        t.peindre(t.trait([(x, 132), (x + 3, 136), (x + 6, 132)]), B)
    # la blouse blanche, longue, ouverte sur la robe
    pan1 = t.poly([(66, 78), (80, 80), (78, 100), (74, 140), (52, 140), (58, 104)])
    pan2 = t.poly([(102, 78), (88, 80), (90, 100), (96, 140), (114, 140), (108, 104)])
    for pan in (pan1, pan2):
        t.piece(pan, B, ombre=3)
    t.peindre(t.courbe([(62, 108), (58, 124), (56, 138)]) | t.courbe([(108, 108), (110, 124), (112, 138)]), V)
    t.peindre(t.trait([(54, 128), (74, 128)]) & pan1 | t.trait([(94, 128), (112, 128)]) & pan2, N)
    # la poche à fioles et les boutons
    po = t.rect(96, 112, 108, 122)
    t.piece(po, B, ombre=0)
    t.peindre(t.rect(96, 112, 108, 113), N)
    t.piece(t.rect(99, 104, 101, 112), V, ombre=0)
    t.piece(t.rect(104, 106, 106, 112), V, ombre=0)
    for y in (96, 108, 120):
        t.peindre(t.ell(74, y - 1, 77, y + 2), N)
    # la ceinture nouée
    t.peindre(t.rect(78, 100, 92, 103), N)
    # les revers
    t.piece(t.poly([(70, 78), (80, 80), (84, 96), (76, 90)]), B, ombre=0)
    t.piece(t.poly([(98, 78), (88, 80), (84, 96), (92, 90)]), B, ombre=0)
    t.peindre(t.trait([(76, 82), (82, 94)]) | t.trait([(92, 82), (86, 94)]), V)
    # le bras qui tient la fiole fumante
    bras2 = t.fuseau([(68, 82), (52, 96), (44, 112)], 11, 9)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.rect(38, 106, 52, 108) & bras2, V)
    fumee = t.courbe([(36, 90), (30, 82), (38, 72), (32, 62), (38, 52)], 2) | t.courbe([(40, 90), (46, 80), (42, 70)], 2)
    t.peindre(fumee, B)
    for (x, y) in [(28, 58), (46, 64), (24, 74)]:
        t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2) & ~t.ell(x - 1, y - 1, x + 1, y + 1), B)
    col = t.rect(34, 92, 42, 106)
    fiole = t.ell(24, 100, 52, 128)
    t.piece(col | fiole, B, ombre=0)
    t.peindre(t.ell(27, 108, 49, 125) & t.rect(0, 112, 176, 176), V)
    t.peindre(t.trait([(28, 112), (48, 112)]), N)
    for (x, y) in [(33, 117), (41, 120), (38, 114)]:
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), B)
    t.peindre(t.rect(32, 90, 44, 93), N)
    t.peindre(t.rect(33, 91, 43, 92), V)
    t.peindre(t.courbe([(29, 108), (28, 116)]), B)
    poing(t, 40, 104, 13, 11, 2)
    # le bras levé qui tient la plume
    bras = t.fuseau([(100, 84), (114, 74), (122, 60)], 11, 8)
    t.piece(bras, B, ombre=2)
    t.peindre(t.rect(110, 62, 130, 66) & bras, V)
    plume = t.fuseau([(126, 56), (118, 40), (108, 26), (100, 14)], 3, 9)
    t.piece(plume, V, ombre=0)
    t.peindre(t.courbe([(126, 56), (116, 36), (101, 15)]), B)
    for k in range(5):
        y = 20 + k * 6
        t.peindre(t.trait([(104 + k * 3, y), (110 + k * 3, y - 2)]), N)
    t.peindre(t.trait([(126, 56), (137, 49)], 2), N)
    t.point(137, 49, B)
    t.pixels(117, 50, """
..::::::.
.:oooooo:
:oo:oooo:
:ooo:ooo:
:ooo::oo:
.:oooooo:
..::::::.
""")
    # la tête : la chevelure de derrière
    chev = t.ell(60, 34, 104, 82)
    t.piece(chev, V, ombre=3)
    # le chignon piqué de son épingle
    chig = t.ell(70, 10, 94, 34)
    t.piece(chig, V, ombre=3)
    t.peindre(t.courbe([(74, 22), (82, 16), (90, 22)]) | t.courbe([(76, 28), (84, 22), (90, 28)]), N)
    t.peindre(t.trait([(64, 30), (100, 12)], 2), B)
    t.peindre(t.trait([(64, 31), (100, 13)]), N)
    t.piece(t.ell(98, 8, 104, 14), B, ombre=0)
    t.point(100, 10, V)
    tete = t.ell(64, 32, 98, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 50, 176, 70), V)
    # la frange en vague, tirée sur le côté
    frange = t.poly([(62, 42), (66, 34), (78, 28), (92, 30), (100, 38), (100, 46), (92, 39), (82, 43), (74, 38), (66, 48)])
    t.piece(frange, V, ombre=0)
    t.peindre(t.courbe([(70, 38), (80, 34), (90, 36)]), N)
    t.peindre(t.courbe([(68, 36), (78, 31)]), B)
    # les sourcils fins, l'un levé
    t.peindre(t.courbe([(68, 47), (73, 45), (78, 46)], 2) | t.courbe([(85, 45), (90, 42), (96, 44)], 2), N)
    # les yeux derrière les lunettes rondes, tournés vers la plume
    t.oeil(69, 54, l=11, h=8, regard=(2, -1), paupiere=2, cils=-1)
    t.oeil(85, 54, l=11, h=8, regard=(2, -1), paupiere=2, cils=1)
    lunettes(t, 74, 57, 90, 57, r=8)
    # le nez fin, la bouche, un sourire sûr
    t.peindre(t.courbe([(83, 60), (84, 66), (82, 68)]), N)
    t.point(81, 68, N); t.damier(t.rect(84, 62, 85, 67), V)
    t.pixels(75, 70, """
.........::
::.....:::.
.:::::::#..
..:####:...
""")
    t.damier(t.ell(67, 66, 71, 69), V); t.damier(t.ell(93, 66, 97, 69), V)
    # les boucles d'oreilles
    t.peindre(t.trait([(64, 66), (64, 70)]), N)
    t.piece(t.ell(62, 70, 66, 74), B, ombre=0)
    # le col de la robe
    t.piece(t.poly([(74, 76), (90, 76), (86, 82), (78, 82)]), V, ombre=0)
    t.sol(161, cx=84)
    return t.image()

ACCOLADES = """
.::...::.
.:.....:.
.:.....:.
:.......:
.:.....:.
.:.....:.
.::...::.
"""


# ------------------------------------------------------------------ Stephen, le bibliothécaire des Grimoires (jq)
def stephen_v3():
    t = Toile()
    # l'arbre qui pousse du grimoire ouvert (le JSON) : tronc, branches, feuilles-objets
    tronc = t.fuseau([(42, 70), (40, 50), (44, 34)], 6, 3)
    br = [t.fuseau([(42, 54), (30, 44), (20, 38)], 4, 2), t.fuseau([(42, 46), (56, 36), (66, 30)], 4, 2),
          t.fuseau([(44, 36), (36, 22), (32, 14)], 3, 2), t.fuseau([(44, 36), (50, 22), (56, 12)], 3, 2)]
    for m in [tronc] + br:
        t.piece(m, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(41, 68), (39, 50), (43, 36)]), B)
    for (x, y) in [(10, 28), (58, 20), (22, 4), (48, 2)]:
        f = t.ell(x - 1, y - 1, x + 17, y + 12)
        t.piece(f, B, ombre=0)
        t.damier(t.bord(f, 1, 0, 2) | t.bord(f, 0, 1, 1), V)
        t.pixels(x + 4, y + 2, ACCOLADES)
        t.point(x + 8, y + 5, V); t.point(x + 8, y + 7, V)
    for (x, y) in [(8, 50), (72, 44), (40, 2)]:
        t.etincelle(x, y)
    # la tour de livres, posée sur l'avant-bras
    livres = [(24, 70, 64, 80, B), (20, 80, 62, 90, V), (26, 90, 68, 101, B), (22, 101, 60, 110, V),
              (18, 110, 66, 120, B), (24, 120, 64, 130, V)]
    for (x0, y0, x1, y1, c) in livres:
        m = t.rect(x0, y0, x1, y1)
        t.piece(m, c, ombre=2, lumiere=False)
        cc = V if c == B else B
        t.peindre(t.rect(x0 + 4, y0 + 1, x0 + 5, y1 - 1) | t.rect(x1 - 6, y0 + 1, x1 - 5, y1 - 1), cc)
        t.peindre(t.rect(x0 + 10, y0 + (y1 - y0) // 2 - 1, x1 - 12, y0 + (y1 - y0) // 2), N)
        t.point(x1 - 2, y0 + 2, N if c == B else B)
    # le grimoire ouvert au sommet
    ouvert = t.poly([(20, 70), (30, 62), (44, 66), (58, 62), (68, 70), (44, 74)])
    t.piece(ouvert, B, ombre=0)
    t.peindre(t.trait([(44, 66), (44, 73)]), N)
    for k in range(3):
        t.peindre(t.trait([(26 + k * 2, 66 + k), (40, 69 + k)]) | t.trait([(48, 69 + k), (62 - k * 2, 66 + k)]), V)
    # les jambes, le pantalon à pinces, les souliers
    for x in (84, 100):
        j = t.poly([(x, 120), (x + 14, 120), (x + 13, 152), (x + 1, 152)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 7, 124), (x + 7, 150)]), N)
    chaussure(t, 92, 159, 20, -1)
    chaussure(t, 104, 159, 20, 1)
    # la veste à pans, la chemise, le gilet
    veste = t.poly([(80, 80), (118, 80), (124, 104), (124, 132), (108, 126), (92, 126), (76, 132), (76, 104)])
    t.piece(veste, V, ombre=3)
    chem = t.poly([(90, 80), (108, 80), (100, 112)])
    t.piece(chem, B, ombre=0)
    gilet = t.poly([(92, 92), (106, 92), (104, 120), (94, 120)])
    t.piece(gilet, B, ombre=0)
    t.damier(gilet, V)
    for y in (100, 108, 116):
        t.piece(t.ell(98, y - 1, 101, y + 2), B, ombre=0)
    t.peindre(t.trait([(88, 82), (98, 116)]) | t.trait([(110, 82), (102, 116)]), N)
    t.piece(t.poly([(84, 80), (90, 80), (96, 102), (88, 96)]), V, ombre=0)
    t.piece(t.poly([(114, 80), (108, 80), (102, 102), (110, 96)]), V, ombre=0)
    t.peindre(t.courbe([(80, 106), (82, 120), (78, 130)]) | t.courbe([(120, 106), (118, 120), (122, 130)]), N)
    po = t.rect(108, 106, 118, 108)
    t.peindre(po, N)
    t.peindre(t.poly([(110, 104), (114, 100), (116, 104)]), B)
    # le nœud papillon
    t.pixels(92, 80, """
:::.....:::
:oo::.::oo:
:o#o:::o#o:
:oo::.::oo:
:::.....:::
""")
    # le bras qui porte la tour, la main sous les livres
    bras2 = t.fuseau([(82, 86), (70, 108), (58, 128)], 12, 10)
    t.piece(bras2, V, ombre=2)
    t.piece(t.rect(40, 126, 60, 134), V, ombre=2)
    t.peindre(t.rect(56, 126, 59, 134), B)
    main2 = t.ell(30, 124, 44, 136)
    t.piece(main2, B, ombre=0)
    t.peindre(t.trait([(33, 127), (33, 133)]) | t.trait([(37, 127), (37, 133)]), N)
    # le bras levé, l'index dressé pour la leçon
    bras = t.fuseau([(116, 86), (134, 76), (138, 54)], 12, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.rect(131, 50, 145, 55), B, ombre=0)
    index = t.fuseau([(137, 42), (137, 32), (138, 24)], 5, 4)
    poing_ = t.ell(130, 36, 147, 52)
    t.piece(index | poing_, B, ombre=0)
    t.damier(t.bord(poing_, 1, 0, 2) & t.rect(0, 40, 176, 52), V)
    t.peindre(t.trait([(140, 41), (145, 41)]) | t.trait([(140, 45), (145, 45)]) | t.trait([(133, 40), (135, 46)]), N)
    t.peindre(t.trait([(136, 26), (138, 26)]), N)
    t.etoile(142, 20, B, 2); t.etoile(126, 22, B, 1)
    # la tête : crâne lisse et brillant, couronne de cheveux sur les côtés
    for x0 in (74, 110):
        tf = t.ell(x0, 36, x0 + 14, 60)
        t.piece(tf, V, ombre=0)
        t.peindre(t.courbe([(x0 + 4, 42), (x0 + 3, 50), (x0 + 6, 56)]) | t.courbe([(x0 + 10, 40), (x0 + 9, 48)]), N)
    for (x, sens) in ((72, -1), (116, 1)):
        o = t.ell(x, 50, x + 10, 64)
        t.piece(o, B, ombre=0)
    tete = t.ell(80, 22, 118, 78)
    t.piece(tete, B, ombre=0)
    t.peindre(t.courbe([(78, 54), (75, 57), (78, 61)]) | t.courbe([(120, 54), (123, 57), (120, 61)]), N)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 40, 176, 72), V)
    # le reflet du crâne
    t.peindre(t.courbe([(90, 28), (96, 25), (102, 26)], 2), V)
    t.point(106, 28, V); t.point(107, 29, V)
    # les sourcils relevés de l'orateur
    t.piece(t.fuseau([(84, 46), (89, 41), (95, 42)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(103, 42), (109, 40), (114, 43)], 3, 2), V, ombre=0, lumiere=False)
    # les grosses lunettes rondes, les yeux tournés vers l'index
    t.oeil(84, 50, l=12, h=9, regard=(2, -2))
    t.oeil(102, 50, l=12, h=9, regard=(2, -2))
    lunettes(t, 90, 54, 108, 54, r=9)
    # le nez long et droit
    nez = t.poly([(97, 56), (100, 56), (102, 66), (99, 68), (95, 67)])
    t.damier(t.bord(nez, 1, 0, 1), V)
    t.peindre(t.courbe([(100, 56), (102, 64), (101, 67), (97, 68)]), N)
    t.point(96, 66, N)
    # la bouche ouverte qui explique
    t.pixels(91, 69, """
:............:
.::::::::::::.
.:oooooooooo:.
.:::######:::.
..::::::::::..
""")
    t.sol(161, cx=92)
    return t.image()

# ------------------------------------------------------------------ Doug, le maître de l'Alchimie (find)
def doug_v3():
    t = Toile()
    # le tuyau de cuivre vertical, ses brides rivetées, et le bec qui goutte
    tuyau = t.rect(140, 0, 150, 120)
    t.piece(tuyau, V, ombre=2)
    t.peindre(t.rect(142, 0, 143, 120), B)
    for y in (14, 92):
        br = t.rect(136, y, 154, y + 6)
        t.piece(br, V, ombre=0)
        for x in (139, 145, 151):
            t.point(x, y + 3, B)
    bec = t.poly([(140, 104), (124, 104), (120, 108), (120, 114), (126, 114), (128, 110), (140, 110)])
    t.piece(bec, V, ombre=0)
    t.peindre(t.trait([(126, 105), (139, 105)]), B)
    t.pixels(118, 115, """
....:....
...:o:...
..:ooo:..
.:ooooo:.
:oooo#oo:
:ooo##oo:
:oo###oo:
.:ooooo:.
..:::::..
""")
    # l'alambic qui fume à ses pieds, sous la goutte
    vapeur = t.courbe([(124, 108), (116, 98), (122, 88)], 2)
    alam = t.ell(108, 128, 140, 158)
    col = t.poly([(118, 128), (130, 128), (128, 136), (120, 136)])
    t.piece(alam | col | t.rect(116, 124, 132, 129), B, ombre=0)
    t.peindre(t.ell(111, 140, 137, 156) & t.rect(0, 142, 176, 176), V)
    for (x, y) in [(118, 148), (126, 152), (130, 146)]:
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), B)
    t.peindre(t.trait([(112, 142), (136, 142)]), N)
    t.damier(t.bord(alam, 1, 0, 2) & t.rect(0, 128, 176, 142), V)
    t.peindre(t.courbe([(132, 132), (146, 130), (152, 138)], 2), N)
    t.peindre(t.courbe([(132, 132), (146, 130), (152, 138)]), V)
    for (x, y) in [(154, 128), (160, 138), (106, 120)]:
        t.etoile(x, y, B, 1)
    # les jambes courtes et les grosses bottes
    for x in (60, 80):
        j = t.rect(x, 134, x + 12, 150)
        t.piece(j, V, ombre=2)
    chaussure(t, 72, 159, 22, -1)
    chaussure(t, 80, 159, 22, 1)
    # le corps tout rond, le tablier de cuir
    corps = t.ell(40, 74, 112, 142)
    t.piece(corps, V, ombre=4)
    tablier = t.poly([(58, 84), (94, 84), (102, 100), (104, 124), (98, 140), (54, 140), (48, 124), (50, 100)])
    t.piece(tablier & corps, B, ombre=3)
    t.peindre(t.courbe([(66, 104), (64, 122), (66, 138)]) | t.courbe([(86, 104), (88, 122), (86, 138)]), V)
    poche = t.rect(64, 108, 88, 122)
    t.peindre(poche & ~t.rect(65, 109, 87, 121), N)
    t.peindre(t.rect(64, 108, 88, 110), V)
    texte(t, 70, 112, "-o-", V)
    t.peindre(t.rect(66, 110, 66, 121) | t.rect(86, 110, 86, 121), V)
    t.peindre(t.courbe([(58, 86), (66, 76)], 2) | t.courbe([(94, 86), (86, 76)], 2), N)
    t.peindre(t.trait([(42, 104), (52, 104)], 2) | t.trait([(100, 104), (110, 104)], 2), N)
    for x in (52, 100):
        t.piece(t.rect(x - 2, 102, x + 2, 106), B, ombre=0)
    # le bras sur la hanche, coude en dehors
    bras2 = t.fuseau([(50, 86), (32, 98), (30, 104), (42, 114)], 10, 8)
    t.piece(bras2, V, ombre=2)
    t.piece(t.poly([(34, 106), (40, 104), (44, 112), (38, 114)]), B, ombre=0)
    poing(t, 40, 108, 13, 12, 3)
    # le bras tendu qui tourne la vanne
    bras = t.fuseau([(104, 88), (120, 82), (134, 70)], 12, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.trait([(110, 84), (124, 78)]) & bras, B)
    t.peindre(t.ell(124, 66, 130, 80) & bras, B)
    roue = t.ell(128, 44, 162, 78) & ~t.ell(132, 48, 158, 74)
    t.piece(roue, V, ombre=0)
    for a in range(0, 360, 60):
        r = math.radians(a + 15)
        t.peindre(t.trait([(145, 61), (145 + 14 * math.cos(r), 61 + 14 * math.sin(r))], 2), V)
    moyeu = t.ell(140, 56, 150, 66)
    t.piece(moyeu, B, ombre=0)
    t.point(145, 61, N)
    t.peindre(t.courbe([(128, 40), (140, 34), (154, 38)]) | t.courbe([(164, 52), (168, 62), (164, 72)]), B)
    t.peindre(t.poly([(152, 35), (156, 38), (151, 41)]) | t.poly([(162, 70), (166, 73), (166, 67)]), B)
    mainv = t.ell(123, 54, 139, 70)
    t.piece(mainv, B, ombre=0)
    t.damier(t.bord(mainv, 1, 0, 2) & t.rect(0, 60, 176, 70), V)
    for x in (128, 132, 136):
        t.peindre(t.trait([(x, 55), (x, 61)]), N)
    # la tête ronde
    for x, sens in ((50, -1), (96, 1)):
        o = t.ell(x, 50, x + 10, 64)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 5 - sens * 2, 53), (x + 5 + sens, 57), (x + 5 - sens * 2, 61)]), N)
    tete = t.ell(52, 24, 104, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 74), V)
    # les cheveux courts, en brosse
    chev = tete & t.rect(0, 0, 176, 33)
    for x in range(60, 98, 5):
        chev |= t.fuseau([(x, 30), (x + 1, 22), (x + 3, 15)], 4, 1)
    t.piece(chev, V, ombre=0)
    for x in range(62, 96, 5):
        t.peindre(t.trait([(x, 30), (x + 1, 26)]), N)
    # les favoris
    for pts in ([(55, 42), (57, 54), (61, 64)], [(101, 42), (99, 54), (95, 64)]):
        t.piece(t.fuseau(pts, 5, 2), V, ombre=0, lumiere=False)
    # les lunettes de forge relevées sur le front
    sangle = t.rect(53, 28, 103, 32) & ~t.rect(0, 0, 176, 0)
    t.piece(sangle, V, ombre=0, lumiere=False)
    t.damier(sangle, N)
    for cx in (69, 87):
        v = t.ell(cx - 8, 22, cx + 8, 37)
        t.piece(v, V, ombre=0)
        t.peindre(t.ell(cx - 5, 25, cx + 5, 34), B)
        t.peindre(t.ell(cx - 5, 25, cx + 5, 34) & ~t.ell(cx - 6, 23, cx + 2, 31), V)
        t.point(cx - 2, 27, V); t.point(cx - 1, 28, V)
    t.piece(t.rect(76, 27, 80, 32), V, ombre=0)
    # les sourcils joyeux, bien hauts
    t.peindre(t.courbe([(62, 47), (67, 43), (73, 45)], 3) | t.courbe([(83, 45), (89, 43), (94, 47)], 3), V)
    t.peindre(t.courbe([(62, 48), (67, 44), (73, 46)]) | t.courbe([(83, 46), (89, 44), (94, 48)]), N)
    # les yeux, tournés vers la vanne
    t.oeil(62, 51, l=12, h=9, regard=(3, 0))
    t.oeil(82, 51, l=12, h=9, regard=(3, 0))
    t.peindre(t.trait([(59, 57), (57, 56)]) | t.trait([(59, 60), (57, 61)]), N)
    # le nez rond
    nez = t.poly([(76, 59), (81, 61), (84, 66), (82, 70), (77, 70), (72, 69), (71, 65), (74, 61)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 0, 2) | t.bord(nez, 0, 1, 1), V)
    t.point(75, 68, N); t.point(80, 68, N); t.point(74, 62, B)
    # le grand sourire
    t.pixels(63, 71, """
:..........................:
.::......................::.
..::::::::::::::::::::::::..
..:oo:ooo:ooo:ooo:ooo:oo:...
...:oooooooooooooooooooo:...
....::::::::#####:::::::....
.......:::::::::::::::......
""")
    t.damier(t.ell(58, 66, 64, 72), V); t.damier(t.ell(90, 66, 96, 72), V)
    t.sol(161, cx=82)
    return t.image()

def sablier_v3(t, x, y, w=18, h=34):
    """Un sablier : deux plateaux, montants, verre blanc, sable vert qui coule."""
    cx = x + w // 2
    verre = t.poly([(x + 2, y + 4), (x + w - 2, y + 4), (cx + 2, y + h // 2), (x + w - 2, y + h - 4), (x + 2, y + h - 4),
                    (cx - 2, y + h // 2)])
    t.piece(verre, B, ombre=0)
    t.peindre(verre & t.rect(0, y + h - 12, 176, y + h - 4), V)
    t.peindre(verre & t.rect(0, y + 9, 176, y + h // 2 - 2) & t.poly([(x, y + 9), (x + w, y + 9), (cx, y + h // 2)]), V)
    t.peindre(t.trait([(cx, y + h // 2), (cx, y + h - 12)]), V)
    t.point(x + 4, y + 6, V)
    for yy in (y, y + h - 4):
        p = t.rect(x - 1, yy, x + w + 1, yy + 3)
        t.piece(p, V, ombre=0)
    for xx in (x, x + w - 1):
        t.peindre(t.rect(xx, y + 4, xx, y + h - 5), V)


# ------------------------------------------------------------------ Paul, l'horloger de la Chronomancie (cron, at)
def paul_v3():
    t = Toile()
    # les basques de l'habit, derrière les jambes
    basques = t.poly([(70, 112), (100, 112), (106, 140), (98, 146), (86, 128), (74, 146), (64, 140)])
    t.piece(basques, V, ombre=3)
    t.peindre(t.trait([(86, 118), (86, 128)]), N)
    # les longues jambes, pantalon rayé, souliers pointus
    for x in (74, 88):
        j = t.poly([(x, 112), (x + 10, 112), (x + 10, 152), (x + 1, 152)])
        t.piece(j, B, ombre=2)
        t.rayures(j & ~t.bord(j, 1, 0, 2), V, 4, 1)
    chaussure(t, 84, 159, 20, -1)
    chaussure(t, 89, 159, 20, 1)
    # le corps maigre : la chemise, le gilet à damier, l'habit
    habit = t.poly([(68, 80), (102, 80), (104, 100), (102, 118), (68, 118), (66, 100)])
    t.piece(habit, V, ombre=3)
    chem = t.poly([(78, 80), (92, 80), (90, 104), (80, 104)])
    t.piece(chem, B, ombre=0)
    gilet = t.poly([(78, 92), (92, 92), (92, 116), (78, 116)])
    t.piece(gilet, B, ombre=0)
    t.damier(gilet & ~t.bord(gilet, -1, 0, 2), V)
    for y in (98, 104, 110):
        t.piece(t.ell(84, y - 1, 87, y + 2), B, ombre=0)
    t.peindre(t.trait([(76, 82), (80, 116)]) | t.trait([(94, 82), (90, 116)]), N)
    t.piece(t.poly([(70, 80), (78, 80), (82, 98), (74, 92)]), V, ombre=0)
    t.piece(t.poly([(100, 80), (92, 80), (88, 98), (96, 92)]), V, ombre=0)
    # la lavallière
    t.pixels(80, 79, """
:::::::::::
:ooo:::ooo:
.::ooooo::.
...:o#o:...
...:o#o:...
....:o:....
""")
    # la chaîne de la montre qui sort de la poche du gilet
    t.peindre(t.courbe([(90, 108), (74, 120), (60, 116)]) & (((t.xx) % 2) == 0), B)
    # le bras qui laisse pendre la montre à gousset au bout de sa chaîne
    bras2 = t.fuseau([(70, 84), (60, 100), (56, 116)], 10, 8)
    t.piece(bras2, V, ombre=2)
    t.piece(t.rect(50, 114, 62, 118), B, ombre=0)
    poing(t, 50, 116, 12, 11, 2)
    t.peindre(t.trait([(54, 126), (52, 136)]) & (((t.yy) % 2) == 0), B)
    t.peindre(t.trait([(55, 126), (53, 136)]) & (((t.yy) % 2) == 1), B)
    montre = t.ell(40, 136, 64, 160)
    t.piece(montre, V, ombre=0)
    t.peindre(t.ell(43, 139, 61, 157), B)
    t.peindre(t.ell(44, 140, 60, 156) & ~t.ell(45, 141, 59, 155), N)
    for a in range(0, 360, 30):
        r = math.radians(a)
        t.point(round(52 + 6 * math.cos(r)), round(148 + 6 * math.sin(r)), N)
    t.peindre(t.trait([(52, 148), (52, 142)], 1) | t.trait([(52, 148), (56, 150)]), N)
    t.piece(t.rect(50, 132, 54, 136), V, ombre=0)
    t.peindre(t.trait([(34, 140), (30, 138)]) | t.trait([(34, 150), (29, 151)]), B)
    # le bras levé qui tient le sablier contre l'oreille
    bras = t.fuseau([(100, 84), (122, 92), (124, 72)], 10, 8)
    t.piece(bras, V, ombre=2)
    t.piece(t.rect(118, 66, 130, 70), B, ombre=0)
    sablier_v3(t, 112, 26, 20, 38)
    t.pixels(116, 54, """
..::::::::...
.:oooooooo:..
:oo:oo:oo:o:.
:oooooooooooo:
.:oooooooooo:.
..::::::::::..
""")
    for (x, y) in [(140, 30), (146, 44), (138, 60)]:
        t.peindre(t.courbe([(x, y), (x + 3, y + 3), (x, y + 6)]), B)
    # la tête, penchée vers le sablier
    o = t.ell(102, 44, 112, 60)
    t.piece(o, B, ombre=0)
    tete = t.ell(66, 28, 108, 82)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 40, 176, 74), V)
    t.peindre(t.courbe([(106, 48), (109, 52), (106, 56)]), N)
    # les rouflaquettes
    t.piece(t.fuseau([(69, 36), (68, 44), (70, 52)], 4, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(104, 36), (105, 42), (104, 48)], 4, 1), V, ombre=0, lumiere=False)
    # l'œil fermé qui écoute, et l'œil au monocle
    t.piece(t.fuseau([(72, 43), (77, 40), (83, 42)], 2, 3), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(73, 50), (78, 53), (83, 50)], 2), N)
    t.peindre(t.trait([(72, 48), (70, 46)]) | t.trait([(77, 54), (77, 56)]), N)
    t.piece(t.fuseau([(89, 38), (95, 35), (101, 37)], 2, 3), V, ombre=0, lumiere=False)
    t.oeil(89, 44, l=11, h=9, regard=(2, 0))
    t.peindre(t.ell(86, 41, 102, 57) & ~t.ell(88, 43, 100, 55), N)
    t.peindre(t.ell(87, 42, 101, 56) & ~t.ell(88, 43, 100, 55), V)
    t.point(90, 45, V); t.point(91, 45, V)
    t.peindre(t.courbe([(100, 55), (108, 70), (104, 84), (96, 98)]) & (((t.yy) % 2) == 0), B)
    # le nez long et fin
    nez = t.poly([(84, 52), (89, 57), (94, 62), (91, 65), (84, 65)])
    t.damier(t.bord(nez, 1, 0, 2), V)
    t.peindre(t.courbe([(85, 49), (90, 56), (95, 62), (92, 65), (87, 65)], 2), N)
    t.point(84, 64, N); t.point(83, 63, N)
    # la moustache en guidon, pointes relevées qui débordent du visage
    m1 = t.piece(t.fuseau([(86, 67), (76, 70), (64, 67), (58, 61), (60, 56)], 7, 1), V, ombre=0)
    m2 = t.piece(t.fuseau([(88, 67), (98, 70), (110, 67), (116, 61), (114, 56)], 7, 1), V, ombre=0)
    t.peindre(t.courbe([(84, 68), (76, 70), (68, 67)]) & m1, N)
    t.peindre(t.courbe([(90, 68), (98, 70), (106, 67)]) & m2, N)
    t.pixels(82, 72, """
:........:
.::::::::.
..:####:..
...::::...
""")
    t.peindre(t.courbe([(84, 78), (87, 79), (90, 78)]), N)
    # le haut-de-forme, un peu de travers
    bord = t.ell(56, 24, 116, 34)
    t.piece(bord, V, ombre=2)
    calotte = t.poly([(68, 28), (104, 26), (102, 0), (72, -2)])
    t.piece(calotte, V, ombre=3)
    t.peindre(t.poly([(70, 18), (103, 16), (103, 24), (69, 26)]), B)
    t.peindre(t.trait([(69, 20), (103, 18)]) | t.trait([(69, 24), (103, 22)]), N)
    t.pixels(82, 19, """
:::::
.:o:.
..:..
.:o:.
:::::
""")
    t.peindre(t.courbe([(74, 4), (74, 14)]), B)
    t.sol(161, cx=86)
    return t.image()

# ------------------------------------------------------------------ Andrew, l'archiviste (rsync, tar, diff, patch)
def andrew_v3():
    t = Toile()
    # le grand miroir sur pied : pied, cadre ouvragé, glace qui reflète une pile de dossiers
    pied = t.rect(126, 100, 132, 150)
    t.piece(pied, V, ombre=0)
    t.peindre(t.rect(127, 100, 127, 150), B)
    for pts in ([(129, 146), (112, 158)], [(129, 146), (146, 158)]):
        t.piece(t.fuseau(pts, 5, 3), V, ombre=0)
    t.piece(t.ell(124, 140, 134, 150), V, ombre=0)
    cadre = t.ell(96, 8, 162, 106)
    t.piece(cadre, V, ombre=3)
    glace = t.ell(103, 16, 155, 98)
    t.contour(glace, N)
    t.peindre(glace, B)
    for k, (y, x0, x1, c) in enumerate([(70, 112, 146, V), (62, 114, 144, B), (54, 111, 143, V), (46, 115, 147, B),
                                        (38, 113, 141, V)]):
        d = t.rect(x0, y, x1, y + 7)
        t.contour(d, N)
        t.peindre(d, c)
        cc = B if c == V else V
        t.peindre(t.rect(x0 + 4, y + 3, x0 + 12, y + 4), cc)
        t.peindre(t.rect(x1 - 8, y - 2, x1 - 3, y), c)
        t.contour(t.rect(x1 - 8, y - 2, x1 - 3, y) & ~d, N)
    t.peindre(t.rect(112, 78, 146, 80), N)
    t.damier(glace & t.bord(glace, 1, 0, 3), V)
    for k in range(3):
        t.peindre(t.trait([(110 + k * 5, 34 - k * 0), (122 + k * 5, 20)]) & glace, B)
    t.peindre(t.trait([(108, 40), (124, 22)]) & glace, V)
    for (x, y) in [(129, 8), (96, 57), (162, 57), (129, 106)]:
        t.piece(t.ell(x - 4, y - 4, x + 4, y + 4), B, ombre=0)
        t.point(x, y, V)
    for (x, y) in [(150, 30), (140, 86), (166, 18)]:
        t.etincelle(x, y)
    # les jambes courtes, les sabots
    for x in (44, 60):
        j = t.rect(x, 134, x + 10, 150)
        t.piece(j, V, ombre=2)
    chaussure(t, 54, 159, 18, -1)
    chaussure(t, 60, 159, 18, 1)
    # la blouse de couturier, le tablier à poches
    corps = t.poly([(38, 84), (78, 84), (86, 110), (84, 138), (32, 138), (30, 110)])
    t.piece(corps, V, ombre=3)
    tab = t.poly([(42, 100), (76, 100), (80, 138), (38, 138)])
    t.piece(tab, B, ombre=2)
    t.peindre(t.rect(38, 98, 80, 101), N)
    for (x0, x1) in ((44, 56), (62, 74)):
        p_ = t.rect(x0, 114, x1, 126)
        t.peindre(p_ & ~t.rect(x0 + 1, 115, x1 - 1, 125), N)
    t.piece(t.fuseau([(48, 114), (46, 104)], 2, 1), V, ombre=0)
    t.peindre(t.ell(66, 108, 72, 116), V)
    t.peindre(t.trait([(66, 112), (72, 112)]), N)
    t.peindre(t.courbe([(54, 128), (52, 136)]) | t.courbe([(68, 128), (70, 136)]), V)
    # le mètre ruban autour du cou
    for pts in ([(46, 84), (42, 100), (40, 112)], [(70, 84), (74, 100), (78, 108)]):
        r = t.fuseau(pts, 4, 4)
        t.piece(r, B, ombre=0)
        t.peindre(r & (((t.yy) % 3) == 0), N)
    # le bras qui frotte le miroir de sa manche, le chiffon
    bras = t.fuseau([(76, 90), (92, 86), (104, 72)], 12, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.trait([(80, 88), (94, 82)]) & bras, B)
    chiffon = t.poly([(98, 62), (112, 58), (116, 70), (108, 80), (96, 76)])
    t.piece(chiffon, B, ombre=2)
    t.peindre(t.courbe([(100, 66), (106, 64), (112, 66)]) | t.courbe([(100, 72), (106, 70), (110, 74)]), V)
    for (x0, y0, x1, y1) in [(118, 84, 124, 80), (120, 90, 128, 86), (92, 52, 98, 56)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # l'autre main posée sur le ventre
    bras2 = t.fuseau([(40, 90), (30, 104), (40, 114)], 10, 8)
    t.piece(bras2, V, ombre=2)
    poing(t, 38, 106, 12, 11, 3)
    # la tête : grosse barbe, bonnet enfoncé
    tete = t.ell(36, 34, 80, 82)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 50, 176, 70), V)
    for x, sens in ((32, -1), (76, 1)):
        o = t.ell(x, 50, x + 9, 64)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 4 - sens * 2, 53), (x + 4 + sens, 57), (x + 4 - sens * 2, 61)]), N)
    barbe = t.poly([(36, 60), (40, 70), (50, 72), (66, 72), (76, 70), (80, 60), (82, 76), (78, 92), (70, 102), (58, 106),
                    (46, 102), (38, 92), (34, 76)])
    t.piece(barbe, V, bord=N, ombre=0)
    t.damier(t.bord(barbe, 1, 0, 2) | t.bord(barbe, 0, 1, 2), N)
    for pts in ([(46, 78), (48, 92)], [(58, 80), (58, 98)], [(70, 78), (68, 92)], [(52, 86), (52, 100)], [(64, 86), (64, 100)]):
        t.peindre(t.courbe(pts), N)
    for pts in ([(42, 74), (44, 86)], [(55, 76), (56, 88)], [(66, 76), (66, 84)]):
        t.peindre(t.courbe(pts), B)
    # la moustache, et la bouche qui sourit dans la barbe
    t.pixels(51, 72, """
.::::::::::::.
:oooooooooooo:
.:oo:oo:oo:o:.
..::::::::::..
""")
    m1 = t.piece(t.fuseau([(57, 68), (50, 70), (44, 68), (40, 63)], 6, 2), V, bord=B, ombre=0, lumiere=False)
    m2 = t.piece(t.fuseau([(59, 68), (66, 70), (72, 68), (76, 63)], 6, 2), V, bord=B, ombre=0, lumiere=False)
    t.peindre(t.courbe([(55, 69), (49, 70), (44, 67)]) & m1 | t.courbe([(61, 69), (67, 70), (72, 67)]) & m2, N)
    # le nez rond
    nez = t.poly([(55, 54), (60, 56), (63, 62), (61, 66), (55, 67), (51, 65), (51, 60)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 0, 2) | t.bord(nez, 0, 1, 1), V)
    t.point(54, 65, N); t.point(59, 65, N); t.point(53, 58, B)
    # les yeux plissés sous les gros sourcils, tournés vers le miroir
    t.oeil(41, 48, l=11, h=8, regard=(2, 0), paupiere=3)
    t.oeil(61, 48, l=11, h=8, regard=(2, 0), paupiere=3)
    t.piece(t.fuseau([(39, 46), (46, 42), (54, 44)], 5, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(60, 44), (68, 42), (75, 46)], 3, 5), V, ombre=0, lumiere=False)
    # le bonnet, son revers, l'aiguille et le fil vert piqués dedans
    bonnet = t.poly([(34, 40), (36, 26), (44, 16), (58, 12), (72, 16), (80, 26), (82, 40)])
    t.piece(bonnet, V, ombre=3)
    for x in range(40, 80, 5):
        t.peindre(t.trait([(x, 22 if 44 < x < 74 else 28), (x, 34)]) & bonnet, N)
    revers = t.poly([(32, 32), (84, 32), (84, 40), (32, 40)])
    t.piece(revers, B, ombre=0)
    t.peindre(t.rect(32, 34, 84, 38) & (((t.xx) % 4) == 0), V)
    t.piece(t.ell(52, 4, 64, 15), B, ombre=0)
    t.damier(t.ell(52, 4, 64, 15) & t.bord(t.ell(52, 4, 64, 15), 1, 0, 2), V)
    t.peindre(t.trait([(68, 30), (84, 8)], 2), B)
    t.peindre(t.trait([(68, 31), (84, 9)]), N)
    t.peindre(t.ell(81, 9, 85, 13) & ~t.ell(82, 10, 84, 12), N)
    fil = t.courbe([(83, 10), (92, 2), (98, 12), (90, 22), (96, 32), (88, 40)], 2)
    t.peindre(fil, V)
    t.sol(161, cx=80)
    return t.image()

# ------------------------------------------------------------------ Brian, le jeune enchanteur de l'Invocation (bash)
def brian_v3():
    t = Toile()
    # le cercle d'invocation qui luit au sol, ses runes et sa lueur
    anneau = t.ell(22, 144, 154, 168) & ~t.ell(28, 147, 148, 165)
    t.peindre(anneau, B)
    t.peindre(t.ell(36, 150, 140, 162) & ~t.ell(38, 151, 138, 161), V)
    for k in range(10):
        a = k * math.pi / 5 + 0.3
        x, y = 88 + 62 * math.cos(a), 156 + 10 * math.sin(a)
        if y > 156:
            continue
        t.peindre(t.trait([(x, y - 4), (x, y - 10 if k % 2 == 0 else y - 7)]), V)
    for x in (48, 66, 110, 128):
        t.pixels(x - 2, 154, ":.:\n.:.\n:.:")
    # la jambe d'appui, la jambe levée (genou en avant), les bottes
    j1 = t.fuseau([(80, 118), (78, 136), (76, 150)], 12, 10)
    t.piece(j1, B, ombre=2)
    b1 = t.poly([(68, 142), (84, 142), (86, 154), (88, 159), (64, 159), (66, 150)])
    t.piece(b1, V, ombre=0)
    t.peindre(t.trait([(68, 146), (82, 146)]), B)
    t.damier(b1 & t.rect(0, 155, 176, 159), N)
    j2 = t.fuseau([(94, 116), (108, 122), (116, 116)], 12, 10)
    t.piece(j2, B, ombre=2)
    tibia = t.fuseau([(116, 116), (122, 128), (126, 136)], 10, 9)
    t.piece(tibia, B, ombre=2)
    b2 = t.poly([(118, 128), (132, 124), (140, 132), (144, 140), (128, 144), (122, 138)])
    t.piece(b2, V, ombre=0)
    t.peindre(t.trait([(122, 132), (132, 128)]), B)
    t.damier(b2 & t.bord(b2, 1, 1, 2), N)
    # la tunique étoilée, la ceinture
    tun = t.poly([(70, 78), (104, 78), (110, 100), (112, 124), (90, 120), (68, 124), (64, 100)])
    t.piece(tun, V, ombre=3)
    for (x, y) in [(76, 96), (98, 92), (86, 108), (104, 112), (72, 114)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.trait([(64, 124), (68, 120), (72, 124), (76, 120), (80, 124), (84, 120), (88, 124), (92, 120), (96, 124),
                       (100, 120), (104, 124), (108, 120), (112, 124)]), B)
    ceint = t.poly([(66, 102), (108, 100), (109, 105), (66, 107)])
    t.piece(ceint, B, ombre=0)
    t.peindre(t.rect(84, 100, 90, 107) & ~t.rect(86, 102, 88, 105), N)
    # le col blanc
    t.piece(t.poly([(74, 76), (100, 76), (96, 84), (87, 88), (78, 84)]), B, ombre=0)
    t.peindre(t.trait([(87, 80), (87, 88)]), V)
    # le parchemin #! roulé sous le bras gauche
    rou = t.poly([(30, 92), (70, 86), (74, 104), (34, 110)])
    t.piece(rou, B, ombre=2)
    for x in (30, 70):
        e = t.ell(x - 5, 88 if x == 70 else 91, x + 5, (106 if x == 70 else 111))
        t.piece(e, B, ombre=0)
        t.peindre(t.ell(x - 2, (93 if x == 70 else 96), x + 2, (101 if x == 70 else 106)), V)
    t.pixels(38, 93, """
..:..:...::.
..:..:...::.
::::::::.::.
.:..:....::.
.:..:....::.
::::::::.::.
:..:.........
:..:.....::.
""")
    t.peindre(t.trait([(58, 96), (64, 95)]) | t.trait([(56, 100), (64, 99)]), V)
    bras2 = t.fuseau([(72, 84), (58, 100), (62, 112)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.piece(t.rect(56, 108, 68, 111), B, ombre=0)
    poing(t, 56, 110, 12, 11, 3)
    # le bras levé qui brandit la craie qui crépite
    bras = t.fuseau([(102, 84), (114, 66), (120, 44)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.trait([(106, 76), (112, 64)]) & bras, B)
    t.piece(t.rect(114, 40, 128, 44), B, ombre=0)
    craie = t.fuseau([(122, 34), (126, 20), (128, 10)], 5, 4)
    t.piece(craie, B, ombre=0)
    t.damier(t.bord(craie, 1, 0, 1), V)
    poing(t, 114, 28, 14, 13, 3)
    for (pts) in ([(128, 8), (136, 4), (134, 0)], [(130, 10), (142, 12), (148, 6)], [(126, 8), (118, 2), (112, 4)]):
        t.peindre(t.trait(pts, 2), B)
    for (x, y) in [(150, 18), (140, 24), (106, 10), (156, 2)]:
        t.etincelle(x, y)
    # la tête, les cheveux en bataille
    for x, sens in ((60, -1), (102, 1)):
        o = t.ell(x, 50, x + 10, 64)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 5 - sens * 2, 53), (x + 5 + sens, 57), (x + 5 - sens * 2, 61)]), N)
    tete = t.ell(64, 30, 106, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 72), V)
    chev = t.ell(60, 20, 110, 48) & ~t.ell(68, 38, 102, 80)
    for pts in ([(70, 26), (60, 16), (50, 18)], [(78, 22), (74, 8), (64, 4)], [(88, 22), (90, 6), (98, 0)],
                [(98, 24), (106, 12), (116, 12)], [(104, 32), (114, 28), (120, 32)], [(66, 34), (56, 32), (52, 38)]):
        chev |= t.fuseau(pts, 8, 1)
    t.piece(chev, V, ombre=2)
    for pts in ([(72, 30), (66, 22)], [(86, 28), (86, 14)], [(98, 30), (106, 20)]):
        t.peindre(t.courbe(pts), N)
    # les mèches de la frange
    fr = t.poly([(68, 38), (76, 34), (88, 36), (100, 34), (104, 42), (98, 40), (94, 46), (88, 40), (82, 46), (76, 40), (70, 46)])
    t.piece(fr, V, ombre=0)
    # les sourcils hauts, les yeux levés vers la craie
    t.piece(t.fuseau([(70, 50), (75, 47), (81, 48)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(88, 47), (94, 45), (100, 47)], 3, 2), V, ombre=0, lumiere=False)
    t.oeil(70, 52, l=11, h=9, regard=(2, -2))
    t.oeil(88, 52, l=11, h=9, regard=(2, -2))
    # le petit nez, les taches de rousseur
    t.peindre(t.courbe([(85, 60), (88, 66), (84, 68)], 2), N)
    for (x, y) in [(72, 66), (75, 68), (70, 69), (96, 66), (99, 68), (94, 69)]:
        t.point(x, y, V)
    # le grand sourire émerveillé, bouche ouverte
    t.pixels(76, 70, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..:::::::::::::.
...:::####::::..
....::::::::....
""")
    return t.image()

LOSANGE = """
...:...
..:o:..
.:o:oo:
:ooo:oo
.:oo:o:
..:o:..
...:...
"""


# ------------------------------------------------------------------ le Copiste (cat -A, iconv, dos2unix)
def copiste_v3():
    t = Toile()
    # l'encrier et sa plume de rechange, posés au sol
    pl = t.fuseau([(146, 138), (152, 120), (160, 104)], 2, 7)
    t.piece(pl, B, ombre=0)
    t.peindre(t.courbe([(146, 138), (159, 105)]), V)
    for k in range(4):
        t.peindre(t.trait([(152 + k * 2, 122 - k * 5), (156 + k * 2, 124 - k * 5)]), N)
    enc = t.ell(132, 138, 160, 160) & t.rect(0, 0, 176, 158)
    t.piece(enc, V, ombre=2)
    t.piece(t.rect(140, 132, 152, 140), V, ombre=0)
    t.peindre(t.rect(142, 132, 150, 133), N)
    t.peindre(t.courbe([(136, 146), (140, 142), (146, 141)]), B)
    # la bure, ronde, qui tombe jusqu'aux pieds
    bure = t.poly([(46, 80), (96, 80), (110, 100), (118, 130), (120, 158), (24, 158), (26, 130), (32, 100)])
    t.piece(bure, V, ombre=4)
    for pts in ([(40, 112), (34, 136), (32, 156)], [(66, 116), (64, 138), (64, 156)], [(96, 116), (102, 136), (104, 156)]):
        t.peindre(t.courbe(pts), N)
    scap = t.poly([(58, 92), (82, 92), (84, 156), (56, 156)])
    t.piece(scap, B, ombre=2)
    t.peindre(t.trait([(60, 150), (80, 150)]) | t.trait([(60, 152), (80, 152)]), V)
    t.pixels(64, 128, "..::.\n.::::\n::::.\n.::..\n...:.")
    ourlet = t.bord(bure, 0, 1, 4) & ~scap
    t.peindre(ourlet, B)
    t.peindre(ourlet & (((t.xx) % 6) == 0), N)
    for x in (46, 78):
        chaussure(t, x, 160, 18, 1 if x > 60 else -1)
    # la corde à nœuds de la ceinture
    t.peindre(t.courbe([(30, 116), (70, 122), (114, 114)], 3) & bure, B)
    t.peindre(t.courbe([(30, 116), (70, 122), (114, 114)]) & bure & (((t.xx) % 4) == 0), N)
    cordon = t.fuseau([(48, 120), (46, 134), (50, 146)], 3, 3)
    t.piece(cordon, B, ombre=0)
    for y in (130, 142):
        t.piece(t.ell(44, y - 3, 51, y + 3), B, ombre=0)
    # le capuchon rabattu sur les épaules
    cap = t.poly([(38, 78), (104, 78), (110, 92), (92, 100), (72, 96), (50, 100), (32, 92)])
    t.piece(cap, B, ombre=2)
    t.peindre(t.courbe([(42, 88), (70, 94), (100, 88)]), V)
    # le bras du fond : seule la main dépasse du livre, avec sa manchette tachée
    man2 = t.poly([(146, 64), (156, 60), (160, 72), (150, 76)])
    t.piece(man2, B, ombre=0)
    t.pixels(150, 64, ".::\n::.\n.:.")
    # le gros grimoire tenu tout près du nez
    livre = t.poly([(98, 44), (124, 38), (150, 46), (148, 96), (124, 90), (100, 98)])
    t.piece(livre, B, ombre=0)
    t.peindre(t.trait([(124, 39), (124, 90)], 2), N)
    tr = t.poly([(100, 98), (124, 90), (148, 96), (148, 100), (124, 94), (100, 102)])
    t.contour(tr, N); t.peindre(tr, V)
    for (x, y) in [(103, 50), (113, 48), (130, 46), (140, 50), (104, 66), (114, 64), (131, 62), (141, 66), (108, 80), (134, 78)]:
        t.pixels(x, y, LOSANGE)
    for (y, x0, x1) in [(60, 103, 120), (74, 129, 145), (90, 104, 118), (88, 130, 145)]:
        t.peindre(t.trait([(x0, y), (x1, y)]) & (((t.xx) % 3) != 2), N)
    t.damier(t.bord(livre, 1, 0, 2) & t.rect(0, 46, 176, 94), V)
    h2 = t.ell(142, 66, 154, 80)
    t.piece(h2, B, ombre=0)
    t.peindre(t.trait([(145, 70), (149, 70)]) | t.trait([(145, 73), (149, 73)]) | t.trait([(145, 76), (149, 76)]), N)
    # le bras de devant, la grande manche, la manchette tachée d'encre, la main sous le livre
    bras = t.fuseau([(50, 86), (42, 108), (66, 112), (92, 100)], 14, 11)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(46, 96), (46, 106), (56, 110)]), N)
    man = t.poly([(84, 94), (94, 88), (98, 100), (88, 106)])
    t.piece(man, B, ombre=0)
    t.pixels(87, 95, ".::\n::.\n.:..:\n...::")
    h = t.ell(94, 88, 108, 102)
    t.piece(h, B, ombre=0)
    t.peindre(t.trait([(98, 90), (98, 96)]) | t.trait([(102, 90), (102, 97)]), N)
    t.pixels(60, 104, ".::.\n::::\n.::.")
    t.pixels(84, 130, ".:.\n:::\n.:.")
    # la tête ronde et tonsurée, penchée vers le livre
    o = t.ell(46, 50, 56, 64)
    t.piece(o, B, ombre=0)
    tete = t.ell(50, 20, 96, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, -1, 0, 3) & t.rect(0, 46, 176, 74), V)
    t.peindre(t.courbe([(50, 53), (48, 57), (51, 61)]), N)
    # la couronne de cheveux autour de la tonsure, le crâne lisse et brillant
    couronne = tete & t.rect(0, 36, 176, 41) | (tete & t.bord(tete, -1, 0, 5) & t.rect(0, 36, 176, 56))
    for x in range(52, 98, 4):
        couronne |= t.ell(x - 2, 33, x + 2, 37) & tete
    t.piece(couronne, V, ombre=0, lumiere=False)
    for x in range(54, 98, 4):
        t.peindre(t.trait([(x, 36), (x + 1, 40)]) & couronne, N)
    t.peindre(t.courbe([(64, 26), (71, 23), (78, 24)], 2), V)
    t.point(82, 25, V)
    # la plume coincée derrière l'oreille
    plume = t.fuseau([(52, 56), (44, 40), (38, 24)], 2, 7)
    t.piece(plume, V, ombre=0)
    t.peindre(t.courbe([(51, 54), (38, 25)]), B)
    for k in range(4):
        t.peindre(t.trait([(41 + k * 2, 28 + k * 5), (37 + k * 2, 32 + k * 5)]), N)
    # les sourcils froncés, les yeux qui plissent devant les losanges
    t.piece(t.fuseau([(64, 48), (70, 45), (77, 49)], 3, 4), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(80, 49), (86, 45), (92, 46)], 4, 3), V, ombre=0, lumiere=False)
    t.oeil(65, 52, l=11, h=8, regard=(3, 0), paupiere=2)
    t.oeil(81, 52, l=11, h=8, regard=(3, 0), paupiere=3, plisse=True)
    # le gros nez rond, collé au livre
    nez = t.poly([(86, 58), (94, 60), (100, 64), (100, 70), (94, 72), (86, 70), (84, 64)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 0, 2) | t.bord(nez, 0, 1, 1), V)
    t.point(90, 69, N); t.point(95, 69, N); t.point(87, 61, B)
    # la bouche en cul-de-poule, perplexe
    t.pixels(73, 70, """
..::::..
.::::::.
::#::#::
.::::::.
..::::..
""")
    t.damier(t.ell(58, 64, 64, 70), V)
    t.peindre(t.courbe([(68, 80), (76, 82), (84, 80)]), N)
    # le point d'interrogation qui flotte
    texte(t, 106, 14, "?", B, 3)
    t.etoile(100, 22, B, 1); t.etoile(122, 10, B, 1)
    t.sol(161, cx=80)
    return t.image()

def tampon(t, x, y):
    """Un tampon encreur brandi, la semelle encrée en haut : socle blanc, manche, pommeau vert serré dans le poing ;
    (x, y) : haut de la semelle."""
    socle = t.rect(x - 11, y, x + 11, y + 7)
    t.piece(socle, B, ombre=0)
    t.peindre(t.rect(x - 11, y, x + 11, y + 2), V)
    t.peindre(t.rect(x - 11, y, x + 11, y + 2) & (((t.xx) % 2) == 0), N)
    t.peindre(t.rect(x - 8, y + 4, x + 8, y + 5) & (((t.xx) % 3) == 0), V)
    manche = t.rect(x - 3, y + 7, x + 3, y + 16)
    t.piece(manche, V, ombre=0)
    t.peindre(t.rect(x - 2, y + 8, x - 2, y + 15), B)
    pom = t.ell(x - 7, y + 14, x + 7, y + 26)
    t.piece(pom, V, ombre=0)


FEUILLE = """
..::::::::::::::::..
.:oooooooooooooooo:.
.:o:ooo#####ooo:o:.
.:oooooooooooooooo:.
.:o:o##o##o##ooo:o:.
.:oooooooooooooooo:.
.:o:ooooooooooooo:o:.
.:o:o###o####ooo:o:.
.:oooooooooooooooo:.
..::::::::::::::::..
"""


# ------------------------------------------------------------------ la Secrétaire (export, printenv, envsubst)
def secretaire_v3():
    t = Toile()
    # la pile de formulaires à trous, à ses pieds
    for k in range(9):
        y = 154 - k * 5
        dx = (k * 7) % 5 - 2
        f = t.poly([(10 + dx, y - 5), (52 + dx, y - 6), (54 + dx, y), (12 + dx, y + 1)])
        t.piece(f, B, ombre=0)
        t.peindre(t.trait([(12 + dx, y - 1), (52 + dx, y - 2)]), V)
    haut = t.poly([(8, 104), (52, 100), (56, 112), (12, 116)])
    t.piece(haut, B, ombre=0)
    dollar(t, 14, 103, N)
    texte(t, 18, 104, "{nom}", N)
    for x in (16, 30, 44):
        t.point(x, 112, N)
    # les feuilles qui s'envolent
    for (x, y) in [(2, 58), (142, 70), (150, 110)]:
        t.pixels(x, y, FEUILLE)
    for (x, y) in [(28, 80), (166, 96), (138, 140)]:
        t.etoile(x, y, B, 1)
    # les jambes, les escarpins
    for x in (78, 92):
        j = t.fuseau([(x + 4, 124), (x + 4, 140), (x + 5, 152)], 7, 5)
        t.piece(j, B, ombre=2)
    for (x, sens) in ((80, -1), (98, 1)):
        p = t.poly([(x, 150), (x + sens * 12, 154), (x + sens * 14, 158), (x - sens * 2, 158), (x - sens * 2, 154)])
        t.piece(p, V, ombre=0)
        t.peindre(t.rect(x - sens * 2 - (1 if sens > 0 else 0), 156, x - sens * 2 + (0 if sens > 0 else 1), 160), V)
    # la jupe droite
    jupe = t.poly([(74, 104), (106, 104), (106, 136), (74, 136)])
    t.piece(jupe, V, ombre=3)
    t.peindre(t.trait([(90, 124), (90, 136)]), N)
    t.peindre(t.rect(72, 104, 108, 107), N)
    t.piece(t.rect(86, 103, 94, 108), B, ombre=0)
    # le chemisier, le gilet ouvert
    gil = t.poly([(72, 78), (108, 78), (110, 104), (70, 104)])
    t.piece(gil, V, ombre=3)
    chem = t.poly([(82, 78), (98, 78), (96, 104), (84, 104)])
    t.piece(chem, B, ombre=0)
    t.peindre(t.trait([(90, 84), (90, 102)]), V)
    for y in (88, 94, 100):
        t.point(90, y, N)
    t.piece(t.poly([(80, 76), (90, 84), (80, 88)]), B, ombre=0)
    t.piece(t.poly([(100, 76), (90, 84), (100, 88)]), B, ombre=0)
    t.peindre(t.rect(72, 92, 82, 104) & gil & (((t.xx + t.yy) % 4) == 0), B)
    t.peindre(t.rect(98, 92, 110, 104) & gil & (((t.xx + t.yy) % 4) == 0), B)
    # les bras levés, un tampon dans chaque main
    b1 = t.fuseau([(74, 82), (56, 70), (46, 40)], 10, 8)
    b2 = t.fuseau([(106, 82), (124, 70), (134, 38)], 10, 8)
    for b in (b1, b2):
        t.piece(b, V, ombre=2)
    t.peindre(t.trait([(60, 74), (52, 62)]) & b1 | t.trait([(118, 74), (126, 62)]) & b2, B)
    tampon(t, 46, 10)
    tampon(t, 134, 8)
    for (x, y) in ((38, 26), (126, 24)):
        h = t.ell(x, y, x + 16, y + 14)
        t.piece(h, B, ombre=0)
        for k in range(3):
            t.peindre(t.trait([(x + 3, y + 4 + k * 3), (x + 9, y + 4 + k * 3)]), N)
    for (x0, y0, x1, y1) in [(26, 18, 32, 22), (24, 30, 31, 31), (60, 14, 66, 10), (150, 14, 156, 10), (152, 28, 159, 28),
                             (118, 12, 112, 8)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # le chignon, la mèche qui s'échappe, le crayon piqué
    chig = t.ell(76, 10, 102, 32)
    t.piece(chig, V, ombre=3)
    t.peindre(t.courbe([(80, 22), (88, 14), (98, 20)]) | t.courbe([(82, 28), (90, 22), (98, 28)]), N)
    t.peindre(t.trait([(70, 22), (104, 10)], 2), B)
    t.peindre(t.trait([(70, 23), (104, 11)]), N)
    t.pixels(102, 8, "o:\n::")
    chev = t.ell(66, 28, 112, 78)
    t.piece(chev, V, ombre=3)
    tete = t.ell(70, 30, 108, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 50, 176, 72), V)
    fr = t.poly([(68, 44), (74, 32), (90, 28), (104, 32), (110, 44), (100, 38), (90, 42), (80, 38)])
    t.piece(fr, V, ombre=0)
    meche = t.fuseau([(100, 34), (114, 40), (110, 52), (118, 58), (116, 66)], 4, 1)
    t.piece(meche, V, ombre=0, lumiere=False)
    # les boucles d'oreilles
    t.peindre(t.trait([(70, 64), (70, 68)]) | t.trait([(108, 64), (108, 68)]), N)
    t.piece(t.ell(68, 68, 72, 72), B, ombre=0); t.piece(t.ell(106, 68, 110, 72), B, ombre=0)
    # les sourcils en accent circonflexe (débordée), les yeux écarquillés
    t.piece(t.fuseau([(74, 50), (79, 46), (85, 45)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(93, 45), (99, 46), (104, 50)], 3, 2), V, ombre=0, lumiere=False)
    t.oeil(74, 51, l=11, h=9, regard=(0, -1), paupiere=1, cils=-1)
    t.oeil(93, 51, l=11, h=9, regard=(0, -1), paupiere=1, cils=1)
    # le nez fin
    t.peindre(t.courbe([(89, 58), (91, 64), (88, 66)]), N)
    t.damier(t.rect(91, 60, 92, 64), V)
    # la bouche ouverte, en vague
    t.pixels(82, 68, """
.:::::::::::.
:o:o:o:o:o:o:
.:#########:.
..:::::::::..
""")
    t.damier(t.ell(73, 62, 78, 66), V); t.damier(t.ell(100, 62, 105, 66), V)
    # la goutte de sueur
    t.pixels(112, 44, """
..:..
.:o:.
:ooo:
:o#o:
.:::.
""")
    t.sol(161, cx=88)
    return t.image()

def pile_pieces(t, x, y, n, l=18):
    """Une pile de n pièces, posée sur y (bas), centrée en x."""
    for k in range(n):
        yy = y - 5 - k * 4
        p = t.ell(x - l // 2, yy, x + l // 2, yy + 6)
        t.piece(p, B if k % 2 == 0 else V, ombre=0, lumiere=False)
        t.peindre(t.trait([(x - l // 2 + 2, yy + 4), (x + l // 2 - 2, yy + 4)]) & p, V if k % 2 == 0 else N)
    dessus = t.ell(x - l // 2, y - 5 - (n - 1) * 4 - 1, x + l // 2, y - 5 - (n - 1) * 4 + 5)
    t.piece(dessus, B, ombre=0)
    t.peindre(t.ell(x - 3, y - 5 - (n - 1) * 4 + 1, x + 3, y - 5 - (n - 1) * 4 + 3), V)


# ------------------------------------------------------------------ le Trésorier (numfmt, bc)
def tresorier_v3():
    t = Toile()
    # les deux piles de pièces, de part et d'autre
    pile_pieces(t, 22, 160, 9)
    pile_pieces(t, 40, 160, 5)
    pile_pieces(t, 146, 160, 4)
    pile_pieces(t, 160, 160, 7, 14)
    # les jambes courtes, les souliers à boucle
    for x in (68, 86):
        j = t.rect(x, 134, x + 12, 152)
        t.piece(j, B, ombre=2)
        t.rayures(j, V, 6, 1, vertical=False)
    for (x, sens) in ((78, -1), (88, 1)):
        c = chaussure(t, x, 159, 18, sens)
        t.piece(t.rect(x + sens * 4 - 2, 151, x + sens * 4 + 2, 155), B, ombre=0)
    # la redingote ronde, le gilet à boutons
    corps = t.ell(50, 80, 116, 142)
    t.piece(corps, V, ombre=4)
    gil = t.poly([(72, 84), (94, 84), (100, 110), (96, 134), (70, 134), (66, 110)]) & corps
    t.piece(gil, B, ombre=2)
    for y in (94, 104, 114, 124):
        t.piece(t.ell(82, y - 2, 85, y + 1), V, ombre=0)
        t.point(83, y - 1, N)
    t.peindre(t.courbe([(70, 100), (62, 110), (58, 124)]) | t.courbe([(96, 100), (104, 112), (106, 126)]), N)
    t.peindre(t.rect(60, 128, 106, 130) & corps, N)
    # le col cassé et la cravate
    t.piece(t.poly([(72, 80), (82, 86), (78, 92), (70, 86)]), B, ombre=0)
    t.piece(t.poly([(94, 80), (84, 86), (88, 92), (96, 86)]), B, ombre=0)
    t.piece(t.poly([(80, 84), (86, 84), (88, 96), (83, 100), (78, 96)]), V, ombre=0)
    # la main qui lève une pièce devant son œil
    bras2 = t.fuseau([(58, 92), (44, 92), (40, 76)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.piece(t.rect(34, 74, 46, 78), B, ombre=0)
    poing(t, 34, 62, 13, 13, 3)
    piece_ = t.ell(32, 46, 48, 62)
    t.piece(piece_, B, ombre=0)
    t.peindre(t.ell(35, 49, 45, 59) & ~t.ell(36, 50, 44, 58), V)
    texte(t, 39, 51, "1", N)
    t.etincelle(28, 44)
    # le bras levé qui tient la balance par son anneau
    t.peindre(t.ell(136, 8, 146, 18) & ~t.ell(138, 10, 144, 16), V)
    t.peindre(t.rect(140, 18, 142, 24), V)
    fleau = t.trait([(118, 30), (170, 22)], 3)
    t.piece(fleau, V, ombre=0)
    t.piece(t.ell(137, 22, 145, 30), B, ombre=0)
    t.point(141, 26, N)
    for (x, y, h) in ((119, 31, 26), (169, 23, 16)):
        t.peindre(t.trait([(x, y), (x - 9, y + h)]) | t.trait([(x, y), (x + 9, y + h)]), B)
        plateau = t.ell(x - 12, y + h - 3, x + 12, y + h + 6) & t.rect(0, y + h + 1, 176, 176)
        t.piece(plateau, V, ombre=0)
        t.peindre(t.trait([(x - 10, y + h + 1), (x + 10, y + h + 1)]), B)
    for k in range(3):
        c = t.ell(112 + k * 2, 52 - k * 3, 124 + k * 2, 57 - k * 3)
        t.piece(c, B, ombre=0)
        t.peindre(t.trait([(114 + k * 2, 55 - k * 3), (122 + k * 2, 55 - k * 3)]), V)
    t.pixels(166, 34, ".::.\n:oo:\n.::.")
    bras = t.fuseau([(108, 92), (128, 78), (140, 44)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.rect(133, 38, 147, 42), B, ombre=0)
    poing(t, 134, 24, 14, 14, 3)
    t.peindre(t.courbe([(150, 44), (156, 50), (152, 56)]) | t.courbe([(104, 40), (100, 46), (104, 52)]), B)
    # la tête
    for x, sens in ((56, -1), (100, 1)):
        o = t.ell(x, 52, x + 10, 66)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 5 - sens * 2, 55), (x + 5 + sens, 59), (x + 5 - sens * 2, 63)]), N)
    tete = t.ell(60, 32, 106, 84)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 48, 176, 76), V)
    # les cheveux plaqués, raie sur le côté
    chev = tete & ~t.ell(62, 42, 112, 110) & t.rect(0, 0, 176, 56)
    chev |= t.fuseau([(62, 40), (62, 48), (64, 54)], 5, 2)
    t.piece(chev, V, ombre=0)
    for pts in ([(74, 35), (90, 36), (104, 44)], [(66, 40), (82, 40), (96, 44)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(68, 37), (76, 34)]), B)
    # les sourcils inquiets (relevés vers le milieu)
    t.piece(t.fuseau([(66, 54), (72, 51), (79, 48)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(87, 48), (94, 51), (100, 54)], 3, 2), V, ombre=0, lumiere=False)
    # les yeux, qui louchent vers la balance par-dessus les lunettes
    t.oeil(67, 55, l=11, h=9, regard=(3, -2), paupiere=1)
    t.oeil(86, 55, l=11, h=9, regard=(3, -2), paupiere=1)
    # les petites lunettes en demi-lune, au bout du nez
    for cx in (75, 91):
        t.peindre(t.ell(cx - 6, 63, cx + 6, 73) & t.rect(0, 68, 176, 176) & ~t.ell(cx - 5, 64, cx + 5, 72), N)
        t.peindre(t.rect(cx - 6, 67, cx + 6, 67), N)
        t.point(cx - 3, 69, V); t.point(cx - 2, 69, V)
    t.peindre(t.courbe([(81, 67), (83, 65), (85, 67)]), N)
    # le nez pointu
    t.peindre(t.courbe([(84, 57), (87, 63), (84, 66)], 2), N)
    t.damier(t.rect(86, 58, 88, 63), V)
    # la bouche pincée, de travers
    t.pixels(78, 76, """
:.......
.::::::.
......::
""")
    t.peindre(t.courbe([(66, 64), (68, 70), (66, 74)]), V)
    # la goutte de sueur
    t.pixels(106, 44, """
..:..
.:o:.
:ooo:
:o#o:
.:::.
""")
    t.sol(161, cx=84)
    return t.image()

# ------------------------------------------------------------------ l'Apprentie (fonctions, getopts)
def apprentie_v3():
    t = Toile()
    # les nattes, derrière
    for pts in ([(68, 64), (56, 76), (50, 94)], [(98, 64), (110, 76), (116, 94)]):
        n = t.fuseau(pts, 9, 6)
        t.piece(n, V, ombre=0)
        for k in range(4):
            q = 0.2 + k * 0.2
            x = (1 - q) ** 2 * pts[0][0] + 2 * q * (1 - q) * pts[1][0] + q * q * pts[2][0]
            y = (1 - q) ** 2 * pts[0][1] + 2 * q * (1 - q) * pts[1][1] + q * q * pts[2][1]
            t.peindre(t.trait([(x - 4, y - 1), (x + 4, y + 2)]), N)
        t.piece(t.ell(pts[2][0] - 4, pts[2][1], pts[2][0] + 4, pts[2][1] + 6), B, ombre=0)
    # la robe trop grande, qui traîne au sol en plis
    robe = t.poly([(68, 84), (100, 84), (112, 110), (126, 140), (140, 160), (24, 160), (40, 140), (54, 110)])
    t.piece(robe, V, ombre=4)
    for pts in ([(62, 110), (52, 136), (40, 158)], [(76, 112), (72, 136), (66, 158)], [(92, 112), (96, 136), (98, 158)],
                [(104, 112), (116, 136), (124, 158)]):
        t.peindre(t.courbe(pts), N)
    ourlet = t.bord(robe, 0, 1, 4)
    t.peindre(ourlet, B)
    for x in range(24, 140, 8):
        t.peindre(t.trait([(x, 158), (x + 4, 156), (x + 8, 158)]) & ourlet, N)
    for (x, y) in [(58, 124), (84, 132), (110, 140), (48, 146), (94, 120), (122, 150), (70, 148)]:
        t.etoile(x, y, B, 1)
    # le bout des souliers qui dépasse, et un pan de robe sous le pied
    t.piece(t.poly([(86, 156), (100, 156), (106, 161), (86, 161)]), B, ombre=0)
    # le col
    t.piece(t.poly([(70, 82), (98, 82), (94, 92), (84, 96), (74, 92)]), B, ombre=0)
    t.peindre(t.courbe([(76, 86), (84, 92), (92, 86)]), V)
    # la manche trop longue qui tient le script gribouillé
    m2 = t.poly([(70, 88), (52, 100), (36, 112), (32, 124), (48, 126), (60, 112), (74, 104)])
    t.piece(m2, V, ombre=2)
    t.peindre(t.trait([(34, 120), (48, 122)]), B)
    script = t.poly([(6, 106), (36, 102), (40, 140), (10, 144)])
    t.piece(script, B, ombre=2)
    texte(t, 10, 108, "-n ?", N)
    for k, y in enumerate((116, 122, 128, 134)):
        t.peindre(t.courbe([(12, y + 1), (18, y - 2), (24, y + 2), (32, y - 1)]), V if k % 2 else N)
    t.peindre(t.trait([(10, 120), (34, 116)], 1) | t.trait([(12, 132), (34, 126)]), N)
    t.pixels(30, 114, ":::\n:o:\n:::")
    t.pixels(30, 122, "..::\n.:ooo\n:::.")
    # le bras levé, la baguette qui ne fait que des étincelles
    m1 = t.poly([(96, 88), (110, 80), (122, 62), (132, 54), (140, 62), (132, 74), (116, 96), (104, 100)])
    t.piece(m1, V, ombre=2)
    t.peindre(t.trait([(130, 56), (138, 64)]), B)
    bag = t.fuseau([(134, 56), (140, 40), (146, 24)], 4, 3)
    t.piece(bag, B, ombre=0)
    t.peindre(t.trait([(141, 36), (145, 26)]) & bag, V)
    t.piece(t.ell(143, 20, 149, 26), B, ombre=0)
    for (x, y) in [(150, 14), (138, 12), (158, 22), (146, 6)]:
        t.etincelle(x, y)
    for (x, y) in [(156, 8), (132, 18), (160, 30)]:
        t.etoile(x, y, B, 1)
    fumee = t.ell(150, 30, 162, 40) | t.ell(156, 24, 168, 36) | t.ell(160, 34, 170, 44)
    t.piece(fumee, B, ombre=0)
    t.damier(t.bord(fumee, 1, 1, 2), V)
    # la tête
    tete = t.ell(64, 36, 102, 84)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 52, 176, 76), V)
    frange = t.poly([(64, 52), (70, 40), (96, 40), (102, 52), (96, 48), (90, 52), (84, 48), (76, 52), (70, 48)])
    t.piece(frange, V, ombre=0)
    # les sourcils inquiets, les grands yeux qui regardent les étincelles
    t.piece(t.fuseau([(70, 58), (74, 55), (80, 54)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(86, 54), (92, 55), (96, 58)], 3, 2), V, ombre=0, lumiere=False)
    t.oeil(69, 59, l=11, h=9, regard=(2, -2), paupiere=2, cils=-1)
    t.oeil(86, 59, l=11, h=9, regard=(2, -2), paupiere=2, cils=1)
    # le petit nez, la bouche qui tremble, les joues rouges
    t.peindre(t.trait([(83, 69), (84, 71)]) | t.trait([(82, 72), (84, 72)]), N)
    t.pixels(78, 75, """
.:..:..:.
:.::.::.:
""")
    t.damier(t.ell(68, 70, 74, 74), V); t.damier(t.ell(93, 70, 99, 74), V)
    # le grand chapeau pointu, trop grand, qui penche et tombe sur le front
    bordc = t.poly([(46, 48), (62, 40), (100, 36), (122, 40), (120, 46), (98, 48), (66, 54), (48, 56)])
    t.piece(bordc, V, ombre=2)
    cone = t.poly([(60, 44), (106, 38), (100, 24), (88, 10), (78, 14), (66, 28)])
    t.piece(cone, V, ombre=3)
    pointe = t.fuseau([(84, 12), (78, 2), (64, 0), (54, 8)], 9, 2)
    t.piece(pointe, V, ombre=0)
    bande = t.poly([(62, 38), (104, 32), (106, 38), (60, 44)]) & cone
    t.peindre(bande, B)
    t.peindre(bande & (((t.xx) % 4) == 0), V)
    for (x, y) in [(80, 24), (92, 20), (70, 32), (56, 6)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.trait([(68, 52), (98, 47)]), B)
    t.sol(162, cx=82)
    return t.image()

PIGEON = """
..........:::::.........
........::ooooo:........
.......:oooo:ooo:::.....
.......:ooo:o:oo::#:....
......:oooooooooo::.....
.....:#ooooooooo:.......
....:##oooo##ooo:.......
...:###ooo####oo:.......
..:####oo#####ooo:......
.:#####o######oooo:.....
:######o#####ooooo:.....
:#####oo####oooooo:.....
.::###oo###ooooo::......
...:::oooooooo::........
......::::::::..........
.........:..:...........
........::.::...........
"""


# ------------------------------------------------------------------ la Messagère (mkfifo, tubes nommés)
def messagere_v3():
    t = Toile()
    # la cape de voyage qui flotte au vent, derrière
    cape = t.poly([(64, 80), (100, 80), (106, 104), (100, 140), (84, 150), (60, 152), (36, 150), (14, 142), (28, 130),
                   (40, 112), (52, 92)])
    t.piece(cape, V, ombre=3)
    for pts in ([(58, 96), (40, 124), (22, 140)], [(64, 104), (54, 130), (42, 148)], [(72, 110), (70, 134), (62, 150)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.trait([(14, 142), (36, 150), (60, 152), (84, 150)], 2), B)
    # les jambes en marche, les bottes
    j1 = t.fuseau([(80, 120), (74, 136), (70, 150)], 11, 9)
    j2 = t.fuseau([(94, 120), (102, 134), (108, 148)], 11, 9)
    for j in (j1, j2):
        t.piece(j, B, ombre=2)
    for (x, sens) in ((72, -1), (106, 1)):
        bt = t.poly([(x - 7, 142), (x + 7, 142), (x + 7 + sens * 6, 154), (x + sens * 12, 159), (x - 9 * sens, 159)])
        bt = t.poly([(x - 7, 142), (x + 7, 142), (x + 8, 152), (x + (14 if sens > 0 else 6), 154),
                     (x + (16 if sens > 0 else 8), 159), (x - (8 if sens > 0 else 16), 159), (x - (6 if sens > 0 else 14), 154), (x - 8, 152)])
        t.piece(bt, V, ombre=0)
        t.peindre(t.rect(x - 7, 144, x + 7, 146), B)
        t.damier(bt & t.rect(0, 156, 176, 159), N)
    # la tunique, la ceinture, la sacoche
    tun = t.poly([(72, 80), (100, 80), (104, 104), (106, 124), (70, 124), (70, 104)])
    t.piece(tun, B, ombre=3)
    t.peindre(t.trait([(86, 84), (86, 104)]), V)
    for y in (88, 94, 100):
        t.point(84, y, N); t.point(88, y, N)
    t.peindre(t.rect(70, 106, 106, 110), N)
    t.peindre(t.rect(71, 107, 105, 109), V)
    t.piece(t.rect(84, 105, 90, 111), B, ombre=0)
    t.peindre(t.rect(86, 107, 88, 109), N)
    t.peindre(t.courbe([(78, 112), (76, 124)]) | t.courbe([(96, 112), (100, 124)]), V)
    # le tube à messages, serré sous le bras
    tube = t.poly([(40, 96), (110, 82), (114, 94), (44, 108)])
    t.piece(tube, V, ombre=2)
    t.peindre(t.trait([(42, 99), (110, 85)]), B)
    for (x, y) in ((44, 96), (108, 82)):
        cap = t.ell(x - 6, y - 1, x + 4, y + 13)
        t.piece(cap, B, ombre=0)
        t.peindre(t.ell(x - 3, y + 3, x + 1, y + 9), V)
    for x in (58, 74, 90):
        t.peindre(t.trait([(x, 93 - (x - 58) // 5), (x + 2, 105 - (x - 58) // 5)]), N)
    t.pixels(36, 98, "..o\n.oo\noo:\n:o.")
    # le bras qui serre le tube
    bras2 = t.fuseau([(74, 84), (64, 98), (70, 106)], 10, 8)
    t.piece(bras2, B, ombre=2)
    poing(t, 64, 98, 13, 11, 3)
    # le bras levé en visière au-dessus des yeux
    bras = t.fuseau([(100, 84), (120, 74), (116, 52)], 10, 8)
    t.piece(bras, B, ombre=2)
    t.peindre(t.rect(110, 54, 124, 58) & bras, V)
    main = t.poly([(102, 44), (118, 42), (122, 48), (104, 52)])
    t.piece(main, B, ombre=0)
    for k in range(3):
        t.peindre(t.trait([(104 + k * 4, 50 - k), (108 + k * 4, 44 - k)]), N)
    # la tête, tournée vers le lointain ; les cheveux courts au vent
    chev = t.ell(64, 26, 104, 76) | t.fuseau([(66, 40), (52, 44), (40, 40)], 10, 2) | t.fuseau([(66, 52), (54, 58), (44, 58)], 8, 2)
    t.piece(chev, V, ombre=3)
    t.peindre(t.courbe([(62, 42), (50, 43)]) | t.courbe([(62, 54), (52, 57)]), N)
    tete = t.ell(70, 30, 106, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 48, 176, 70), V)
    fr = t.poly([(70, 42), (76, 30), (92, 26), (106, 34), (106, 42), (98, 38), (90, 42), (82, 38)])
    t.piece(fr, V, ombre=0)
    # le foulard noué
    t.piece(t.poly([(74, 74), (102, 74), (100, 82), (76, 82)]), V, ombre=0)
    t.piece(t.fuseau([(76, 78), (64, 82), (56, 90)], 6, 3), V, ombre=0)
    # les yeux qui scrutent l'horizon, à droite
    t.piece(t.fuseau([(76, 52), (81, 49), (87, 50)], 2, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(92, 50), (97, 48), (102, 50)], 3, 2), V, ombre=0, lumiere=False)
    t.oeil(77, 54, l=10, h=8, regard=(3, 0), paupiere=2, cils=-1)
    t.oeil(93, 54, l=10, h=8, regard=(3, 0), paupiere=2, cils=1)
    t.peindre(t.courbe([(92, 60), (95, 66), (92, 68)]), N)
    t.damier(t.rect(94, 61, 95, 65), V)
    t.pixels(84, 70, """
.........:
.:::::::::
..:####:..
""")
    t.damier(t.ell(74, 62, 79, 66), V)
    # le pigeon voyageur perché sur l'épaule, avec sa bague
    queue = t.poly([(40, 78), (24, 84), (22, 90), (38, 86)])
    t.piece(queue, V, ombre=0)
    t.peindre(t.trait([(24, 87), (38, 83)]), N)
    corps = t.ell(34, 68, 62, 88)
    t.piece(corps, B, ombre=0)
    t.damier(t.bord(corps, 0, 1, 2), V)
    aile = t.fuseau([(56, 72), (44, 74), (32, 82)], 10, 3)
    t.piece(aile, V, ombre=0)
    for k in range(3):
        t.peindre(t.trait([(48 - k * 5, 74 + k * 2), (46 - k * 5, 80 + k * 2)]), N)
    tp = t.ell(52, 56, 68, 72)
    t.piece(tp, B, ombre=0)
    t.peindre(t.ell(54, 66, 64, 72) & tp, V)
    t.pixels(59, 60, ".::.\n:#o:\n.::.")
    t.piece(t.poly([(67, 62), (74, 64), (67, 66)]), V, ombre=0)
    for x in (44, 50):
        t.peindre(t.trait([(x, 88), (x, 91)]) | t.trait([(x - 2, 91), (x + 2, 91)]), V)
    t.pixels(42, 87, ":o:")
    for (x, y) in [(140, 40), (150, 52), (160, 36)]:
        t.peindre(t.trait([(x - 3, y), (x, y + 2), (x + 3, y)]), B)
    t.sol(161, cx=88)
    return t.image()

CLE = """
.::::.....
:oooo:....
:o::o:::::
:oooooooo:
.::::::o:o
......:::.
"""


# ------------------------------------------------------------------ la Surveillante (sqlite3)
def surveillante_v3():
    t = Toile()
    # la longue robe droite, à plis creux
    robe = t.poly([(64, 86), (106, 86), (112, 120), (118, 158), (52, 158), (58, 120)])
    t.piece(robe, V, ombre=4)
    for x0, x1 in [(70, 64), (84, 84), (98, 104)]:
        t.peindre(t.courbe([(x0, 112), (x0 + (x1 - x0) // 2, 136), (x1, 156)]), N)
        t.peindre(t.courbe([(x0 + 2, 116), (x1 + 2, 154)]), B)
    ourlet = t.bord(robe, 0, 1, 4)
    t.peindre(ourlet, B)
    t.damier(ourlet & t.rect(0, 155, 176, 156), V)
    for (x, sens) in ((76, -1), (94, 1)):
        p = t.poly([(x, 154), (x + sens * 12, 156), (x + sens * 14, 160), (x - sens * 2, 160)])
        t.piece(p, V, ombre=0)
    # la ceinture, le trousseau de clés qui pend
    t.peindre(t.rect(58, 114, 112, 118), N)
    t.peindre(t.rect(59, 115, 111, 117), V)
    anneau = t.ell(100, 116, 114, 130) & ~t.ell(102, 118, 112, 128)
    t.piece(anneau, B, ombre=0)
    for (x, y, mir) in [(98, 128, True), (106, 130, False), (110, 124, False)]:
        t.pixels(x, y, CLE.replace('.', ',') if False else CLE, miroir=mir)
    t.peindre(t.trait([(104, 128), (100, 134)]) | t.trait([(108, 128), (110, 136)]), B)
    for k, (x, y) in enumerate([(94, 136), (104, 142), (114, 134)]):
        cle = t.fuseau([(x, y), (x + (k - 1) * 2, y + 12)], 3, 3)
        t.piece(cle, B, ombre=0)
        t.piece(t.ell(x - 4, y - 6, x + 4, y + 2), B, ombre=0)
        t.peindre(t.ell(x - 1, y - 3, x + 1, y - 1), N)
        t.peindre(t.rect(x + (k - 1) * 2, y + 9, x + (k - 1) * 2 + 3, y + 10), B)
    # le corsage, le haut col montant à boutons
    buste = t.poly([(66, 74), (104, 74), (108, 96), (104, 114), (66, 114), (62, 96)])
    t.piece(buste, V, ombre=3)
    col = t.poly([(76, 60), (96, 60), (98, 76), (88, 80), (74, 76)])
    t.piece(col, B, ombre=2)
    for y in (64, 70):
        t.peindre(t.trait([(78, y), (94, y)]) & (((t.xx) % 2) == 0), V)
    t.piece(t.ell(84, 74, 90, 80), V, ombre=0)
    t.point(87, 77, B)
    # les bras qui descendent le long du corps vers le registre
    for pts in ([(68, 78), (58, 92), (56, 104)], [(102, 78), (112, 88), (114, 98)]):
        t.piece(t.fuseau(pts, 11, 9), V, ombre=2)
    # le registre fermé à clé, serré contre la poitrine
    reg = t.poly([(60, 82), (108, 76), (114, 118), (66, 124)])
    t.piece(reg, B, ombre=3)
    t.peindre(t.poly([(60, 82), (108, 76), (109, 80), (61, 86)]), V)
    t.peindre(t.trait([(64, 86), (70, 122)], 2), V)
    eti = t.poly([(72, 86), (104, 82), (105, 92), (73, 96)])
    t.contour(eti, N); t.peindre(eti, V)
    texte(t, 77, 86, "eleves", B)
    for (x, y) in [(61, 83), (107, 77), (113, 117), (67, 123)]:
        t.piece(t.poly([(x - 4, y - 4), (x + 4, y - 4), (x + 4, y + 4), (x - 4, y + 4)]) & reg, V, ombre=0, lumiere=False)
        t.point(x, y, B)
    sangle = t.poly([(62, 106), (112, 100), (113, 107), (63, 113)])
    t.piece(sangle, V, ombre=0, lumiere=False)
    t.damier(sangle & ~t.bord(sangle, 0, -1, 2) & ~t.bord(sangle, 0, 1, 2), N)
    t.peindre(t.ell(81, 96, 95, 112) & ~t.ell(84, 99, 92, 112), B)
    t.contour(t.ell(81, 96, 95, 112) & ~t.ell(84, 99, 92, 112), N)
    cad = t.rect(79, 103, 97, 118)
    t.piece(cad, B, ombre=2)
    t.peindre(t.ell(86, 107, 90, 111), N)
    t.peindre(t.rect(87, 111, 89, 114), N)
    # les mains qui serrent le registre par les bords
    for (x, y) in ((50, 98), (108, 92)):
        m = t.ell(x, y, x + 12, y + 14)
        t.piece(m, B, ombre=0)
        for k in range(3):
            t.peindre(t.trait([(x + 5, y + 3 + k * 3), (x + 11, y + 3 + k * 3)]) if x > 60 else
                      t.trait([(x + 1, y + 3 + k * 3), (x + 7, y + 3 + k * 3)]), N)
    # la tête, sévère ; le chignon serré
    chig = t.ell(74, 6, 98, 26)
    t.piece(chig, V, ombre=3)
    t.peindre(t.courbe([(78, 18), (86, 10), (94, 16)]) | t.courbe([(78, 22), (86, 16), (94, 22)]), N)
    t.peindre(t.trait([(70, 12), (102, 20)], 2), B)
    t.peindre(t.trait([(70, 13), (102, 21)]), N)
    tete = t.ell(66, 18, 106, 70)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 36, 176, 62), V)
    chev = tete & ~t.ell(56, 25, 116, 130)
    t.piece(chev, V, ombre=0)
    t.peindre(t.trait([(86, 19), (86, 25)]), N)
    t.peindre(t.courbe([(84, 21), (76, 23), (70, 28)]) | t.courbe([(88, 21), (96, 23), (102, 28)]), N)
    # les sourcils froncés vers le nez
    t.piece(t.fuseau([(71, 31), (77, 33), (84, 36)], 2, 4), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(101, 31), (95, 33), (88, 36)], 2, 4), V, ombre=0, lumiere=False)
    # les yeux sévères, qui te fixent, derrière des lunettes rectangulaires
    t.oeil(72, 41, l=11, h=7, regard=(0, 0), paupiere=3, cils=-1)
    t.oeil(89, 41, l=11, h=7, regard=(-1, 0), paupiere=3, cils=1)
    for x in (70, 87):
        t.peindre(t.rect(x, 39, x + 14, 50) & ~t.rect(x + 1, 40, x + 13, 49), N)
        t.point(x + 2, 42, V); t.point(x + 3, 42, V)
    t.peindre(t.trait([(84, 42), (87, 42)]) | t.trait([(70, 42), (66, 41)]) | t.trait([(101, 42), (106, 41)]), N)
    # le nez droit, la bouche pincée, coins tombants
    t.peindre(t.courbe([(86, 48), (88, 55), (85, 57)], 2), N)
    t.damier(t.rect(88, 50, 89, 55), V)
    t.pixels(79, 60, """
.::::::::::.
:..........:
""")
    t.peindre(t.courbe([(76, 54), (77, 58)]) | t.courbe([(96, 54), (95, 58)]), N)
    t.peindre(t.trait([(81, 65), (91, 65)]) & (((t.xx) % 2) == 0), V)
    t.sol(161, cx=86)
    return t.image()

ENVELOPPE = """
::::::::::::
:oooooooooo:
:::oooooo:::
:oo::oo::oo:
:oooo::oooo:
:oooooooooo:
::::::::::::
"""


# ------------------------------------------------------------------ le Colporteur (ssh, known_hosts)
def colporteur_v3():
    t = Toile()
    # la poussière qui vole derrière lui
    for (x, y, r) in [(20, 150, 7), (10, 140, 5), (32, 142, 5), (6, 154, 4), (40, 156, 4)]:
        p = t.ell(x - r, y - r, x + r, y + r)
        t.piece(p, B, ombre=0)
        t.damier(t.bord(p, 1, 1, 2), V)
    for (x, y) in [(46, 134), (26, 128), (12, 124)]:
        t.etoile(x, y, B, 1)
    # le bâton de marche, planté devant
    baton = t.fuseau([(156, 46), (158, 100), (162, 158)], 4, 5)
    t.piece(baton, V, ombre=0)
    for y in (60, 124):
        t.peindre(t.trait([(155, y), (162, y + 2)]), N)
    t.piece(t.ell(151, 40, 161, 50), V, ombre=0)
    # la jambe arrière, talon levé, et la jambe avant, à grand pas
    j2 = t.fuseau([(86, 116), (72, 136), (60, 150)], 13, 10)
    t.piece(j2, V, ombre=2)
    b2 = t.poly([(48, 146), (62, 144), (66, 152), (58, 158), (44, 156)])
    t.piece(b2, V, ombre=0)
    t.damier(b2, N)
    t.peindre(t.trait([(50, 148), (60, 146)]), B)
    j1 = t.fuseau([(98, 114), (116, 132), (122, 150)], 13, 10)
    t.piece(j1, V, ombre=2)
    t.peindre(t.courbe([(102, 120), (112, 132)]) | t.courbe([(70, 132), (80, 124)]), N)
    t.damier(j1 & t.rect(0, 136, 176, 152) & (((t.xx + t.yy) % 3) == 0), B)
    b1 = t.poly([(112, 148), (128, 146), (138, 152), (138, 159), (110, 159)])
    t.piece(b1, V, ombre=0)
    t.damier(b1 & t.rect(0, 154, 176, 159), N)
    t.peindre(t.trait([(114, 150), (128, 149)]), B)
    t.peindre(t.rect(110, 160, 138, 160), N)
    # la veste, le dos courbé
    veste = t.poly([(84, 76), (112, 70), (124, 86), (116, 116), (84, 120), (78, 100)])
    t.piece(veste, B, ombre=3)
    t.peindre(t.courbe([(100, 76), (98, 96), (96, 118)]), V)
    for y in (84, 94, 104):
        t.point(102, y, N)
    t.peindre(t.rect(80, 108, 118, 112) & veste, V)
    t.peindre(t.rect(80, 108, 118, 112) & veste & (((t.xx) % 3) == 0), N)
    t.damier(veste & t.rect(0, 112, 176, 120) & (((t.xx + t.yy) % 3) == 0), V)
    # l'énorme besace de lettres, sur le dos
    sac = t.poly([(30, 40), (64, 28), (86, 36), (96, 64), (92, 100), (70, 112), (36, 108), (20, 86), (18, 60)])
    t.piece(sac, V, ombre=4)
    for (x, y) in [(28, 32), (40, 22), (54, 18), (68, 24), (78, 32)]:
        t.pixels(x, y, ENVELOPPE)
    t.peindre(t.trait([(48, 16), (50, 10)]) | t.trait([(62, 13), (64, 7)]) | t.trait([(36, 22), (34, 16)]), B)
    rabat = t.poly([(28, 44), (62, 32), (84, 40), (88, 58), (60, 66), (32, 66)])
    t.piece(rabat, B, ombre=2)
    t.peindre(t.courbe([(32, 66), (58, 72), (88, 58)]), N)
    for (x, y) in [(44, 82), (64, 90), (34, 94), (76, 76)]:
        t.peindre(t.rect(x, y, x + 8, y + 6), B)
        t.contour(t.rect(x, y, x + 8, y + 6), N)
        t.peindre(t.trait([(x, y), (x + 4, y + 3), (x + 8, y)]), N)
    piece_ = t.rect(52, 96, 64, 106)
    t.peindre(piece_, B)
    t.peindre(piece_ & ~t.rect(53, 97, 63, 105) & (((t.xx + t.yy) % 2) == 0), N)
    t.peindre(t.trait([(54, 98), (62, 104)]) | t.trait([(62, 98), (54, 104)]), V)
    # la sangle de la besace, en travers
    sangle = t.fuseau([(86, 40), (104, 70), (110, 100)], 5, 5)
    t.piece(sangle, V, ombre=0)
    t.damier(sangle, N)
    t.piece(t.rect(104, 82, 112, 88), B, ombre=0)
    t.peindre(t.rect(106, 84, 110, 86), N)
    # le bras qui s'appuie sur le bâton
    bras = t.fuseau([(112, 78), (134, 84), (150, 72)], 11, 9)
    t.piece(bras, B, ombre=2)
    t.damier(bras & t.rect(118, 80, 132, 90), V)
    poing(t, 148, 56, 14, 14, 3)
    # la tête, penchée en avant
    o = t.ell(100, 50, 110, 64)
    t.piece(o, B, ombre=0)
    tete = t.ell(104, 32, 140, 80)
    t.piece(tete, B, ombre=0)
    t.peindre(t.courbe([(104, 53), (102, 57), (105, 61)]), N)
    # la barbe de plusieurs jours, la poussière sur les joues
    t.trame(tete & t.rect(0, 70, 176, 80) & ~t.ell(116, 68, 134, 78), V, 0.3)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 66), V)
    # les sourcils froncés d'effort, les yeux vers la route
    t.piece(t.fuseau([(110, 49), (116, 48), (122, 51)], 2, 4), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(126, 51), (131, 48), (137, 48)], 4, 2), V, ombre=0, lumiere=False)
    t.oeil(110, 53, l=11, h=8, regard=(3, 0), paupiere=3)
    t.oeil(126, 53, l=10, h=8, regard=(3, 0), paupiere=3)
    # le grand nez
    nez = t.poly([(128, 60), (137, 66), (139, 69), (135, 71), (128, 70)])
    t.damier(t.bord(nez, 1, 0, 2) | t.bord(nez, 0, 1, 1), V)
    t.peindre(t.courbe([(129, 60), (137, 66), (140, 69), (136, 72), (130, 71)], 2), N)
    t.point(128, 70, N)
    # la bouche serrée, souffle court
    t.pixels(118, 72, """
:.........:
.:::::::::.
..:ooooo:..
...:::::...
""")
    t.peindre(t.trait([(142, 76), (146, 76)]) | t.trait([(142, 80), (146, 82)]), B)
    # le chapeau de feutre cabossé, plein de poussière
    bordc = t.poly([(94, 40), (114, 35), (146, 37), (152, 42), (138, 43), (110, 43), (96, 45)])
    t.piece(bordc, V, ombre=0)
    calotte = t.poly([(104, 38), (106, 22), (118, 14), (132, 16), (140, 26), (140, 38)])
    t.piece(calotte, V, ombre=3)
    t.peindre(t.courbe([(116, 18), (122, 24), (130, 18)]), N)
    t.peindre(t.poly([(104, 32), (140, 30), (140, 36), (104, 38)]), B)
    t.peindre(t.trait([(104, 35), (140, 33)]) & (((t.xx) % 3) == 0), V)
    t.piece(t.fuseau([(136, 30), (144, 22), (148, 12)], 4, 1), B, ombre=0)
    t.peindre(t.courbe([(137, 30), (146, 17)]), V)
    t.damier(calotte & t.rect(104, 16, 120, 30) & (((t.xx * 3 + t.yy) % 5) == 0), B)
    t.sol(161, cx=96)
    return t.image()


PORTRAITS = {
    "item_alfred.gif": alfred_v3,
    "item_lee.gif": lee_v3,
    "item_stephen.gif": stephen_v3,
    "item_doug.gif": doug_v3,
    "item_paul.gif": paul_v3,
    "item_andrew.gif": andrew_v3,
    "item_brian.gif": brian_v3,
    "item_copiste.gif": copiste_v3,
    "item_secretaire.gif": secretaire_v3,
    "item_tresorier.gif": tresorier_v3,
    "item_apprentie.gif": apprentie_v3,
    "item_messagere.gif": messagere_v3,
    "item_surveillante.gif": surveillante_v3,
    "item_colporteur.gif": colporteur_v3,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        if not nom.endswith(".gif"):
            nom = nom + ".gif"
        finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
