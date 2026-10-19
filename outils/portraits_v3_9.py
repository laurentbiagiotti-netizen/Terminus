"""Portraits v3, lot 9 : les maîtres et habitants du chapitre 8 (le Port, la Flotte noire, Docker).

Kylian, Megane, Jahmal, Remi, Soufiane, Mina, Ronan, Idrissa et Neil, redessinés sur la grille fine de 176 x 170
cases (2 x 2 pixels) avec portrait_v3.Toile : pièces de l'arrière vers l'avant, liseré noir, lumière et ombre tramée,
visages détaillés, objet de métier lisible. Méthode et règles : portrait_v3.py.

Usage : python3 outils/portraits_v3_9.py [item_kylian.gif ...]   (sans argument : tout le lot)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portrait_v3 import Toile, texte, N, V, B  # noqa: E402
from dessiner_lieux import finir  # noqa: E402


# ------------------------------------------------------------------ petites aides communes

def poing(t, x0, y0, x1, y1, doigts=3, sens=1):
    """Un poing blanc avec liseré et des traits de doigts (horizontaux)."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    h = (y1 - y0) / (doigts + 1)
    for k in range(1, doigts + 1):
        y = int(y0 + k * h)
        if sens > 0:
            t.peindre(t.trait([(x0 + 2, y), (x0 + (x1 - x0) // 2, y)]), N)
        else:
            t.peindre(t.trait([(x1 - (x1 - x0) // 2, y), (x1 - 2, y)]), N)
    return m


def manchette(t, pts, ep=4):
    """Une manchette blanche entre la manche et la main."""
    m = t.trait(pts, ep)
    t.piece(m, B, ombre=0)
    return m


# ------------------------------------------------------------------ Kylian, le premier maître du Quai des premiers pas

def kylian():
    """Il jaillit du conteneur où il était assis, un bras levé pour saluer les mousses, une petite caisse sous
    l'autre bras ; bonnet à pompon, marinière, sourire jusqu'aux oreilles."""
    t = Toile()
    # le conteneur ouvert, derrière lui : la caisse nervurée, la porte battante, l'intérieur sombre
    caisse = t.poly([(2, 40), (58, 40), (58, 158), (2, 158)])
    t.piece(caisse, V, ombre=3)
    t.rayures(caisse & t.rect(4, 46, 56, 152), N, 5, 1)
    t.peindre(t.rect(2, 40, 58, 44) & caisse, B)
    t.peindre(t.rect(4, 42, 56, 42), N)
    ouverture = t.rect(14, 54, 50, 156)
    t.piece(ouverture, N, bord=B, ombre=0)
    t.trame(ouverture & t.rect(14, 54, 50, 66), V, 0.25)
    porte = t.poly([(50, 50), (66, 44), (66, 160), (50, 158)])
    t.piece(porte, B, ombre=2)
    for x in (54, 58, 62):
        t.peindre(t.trait([(x, 50 - (x - 50) // 3 + 4), (x, 154)]), V)
    for y in (80, 120):
        t.piece(t.rect(51, y, 56, y + 3), V, ombre=0)
    t.peindre(t.trait([(60, 96), (60, 108)], 2), N)
    texte(t, 6, 47, "port", N, 1)
    # la jambe arrière, qui pousse encore sur le seuil
    cuisse2 = t.fuseau([(92, 120), (82, 134), (72, 146)], 14, 11)
    t.piece(cuisse2, V, ombre=2)
    pied2 = t.poly([(60, 144), (76, 142), (80, 152), (78, 158), (58, 158), (56, 152)])
    t.piece(pied2, V, ombre=0)
    t.damier(pied2 & t.rect(0, 144, 176, 150), N)
    t.peindre(t.rect(56, 156, 80, 158), B)
    # la jambe avant, genou levé : il saute
    cuisse = t.fuseau([(104, 120), (118, 128), (124, 140)], 14, 11)
    t.piece(cuisse, V, ombre=2)
    mollet = t.fuseau([(124, 138), (126, 146), (124, 152)], 11, 10)
    t.piece(mollet, V, ombre=2)
    t.peindre(t.rect(116, 146, 134, 148), B)
    pied = t.poly([(116, 148), (132, 148), (144, 154), (144, 160), (114, 160)])
    t.piece(pied, V, ombre=0)
    t.damier(pied & t.rect(0, 148, 176, 152), N)
    t.peindre(t.rect(114, 158, 144, 160), B)
    # le bras qui tient la caisse (derrière le corps, à gauche)
    bras2 = t.fuseau([(88, 90), (78, 104), (76, 116)], 11, 9)
    t.piece(bras2, B, ombre=2)
    t.rayures(bras2 & ~t.bord(bras2, -1, -1, 1), V, 5, 2, vertical=False)
    # la marinière : rayures vertes sur blanc, col marin vert
    torse = t.poly([(86, 84), (118, 84), (124, 104), (122, 124), (84, 126), (80, 104)])
    t.piece(torse, B, ombre=3)
    t.rayures(torse & ~t.bord(torse, 0, -1, 2) & ~t.bord(torse, -1, 0, 1), V, 6, 2, vertical=False)
    t.peindre(t.courbe([(112, 90), (116, 106), (114, 122)]), N)
    t.peindre(t.courbe([(92, 108), (96, 116), (94, 124)]), N)
    # la ceinture de corde et le pantalon
    ceint = t.poly([(84, 118), (122, 116), (122, 122), (84, 124)])
    t.piece(ceint, V, ombre=0, lumiere=False)
    t.peindre(t.trait([(86, 121), (120, 119)]) & ((t.xx % 3) == 0), B)
    t.piece(t.ell(100, 116, 108, 124), B, ombre=0)
    t.peindre(t.ell(103, 119, 105, 121), N)
    col = t.poly([(88, 82), (116, 82), (112, 96), (102, 104), (92, 96)])
    t.piece(col, V, ombre=0)
    t.peindre(t.trait([(91, 85), (101, 100), (113, 85)]), B)
    t.piece(t.poly([(98, 98), (106, 98), (104, 110), (102, 106), (100, 110)]), B, ombre=0)
    # la petite caisse sous le bras
    cais = t.poly([(58, 104), (84, 100), (88, 122), (62, 126)])
    t.piece(cais, B, ombre=2)
    t.peindre(t.trait([(60, 108), (86, 104)]) | t.trait([(61, 118), (87, 114)]), V)
    t.peindre(t.trait([(60, 108), (86, 118)], 2) | t.trait([(86, 104), (62, 122)], 2), V)
    main2 = poing(t, 78, 112, 90, 124, 2)
    # le bras levé qui salue
    bras = t.fuseau([(116, 92), (132, 78), (140, 54)], 11, 9)
    t.piece(bras, B, ombre=2)
    t.rayures(bras & ~t.bord(bras, -1, -1, 1), V, 6, 2, vertical=False)
    manchette(t, [(134, 54), (146, 56)], 4)
    paume = t.ell(132, 34, 150, 54)
    doigts = (t.fuseau([(136, 38), (134, 30), (134, 24)], 4, 3) | t.fuseau([(140, 36), (140, 26), (141, 20)], 4, 3) |
              t.fuseau([(144, 37), (146, 28), (148, 23)], 4, 3) | t.fuseau([(147, 40), (151, 34), (154, 30)], 4, 3) |
              t.fuseau([(134, 46), (128, 42), (126, 36)], 4, 3))
    t.piece(paume | doigts, B, ombre=0)
    t.peindre(t.courbe([(136, 48), (141, 50), (146, 47)]), N)
    t.peindre(t.trait([(137, 40), (137, 34)]) | t.trait([(141, 38), (141, 30)]) | t.trait([(145, 39), (146, 32)]), N)
    for (x0, y0, x1, y1) in [(156, 20, 162, 16), (158, 30, 166, 28), (154, 40, 162, 42), (124, 18, 120, 12)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)], 2), B)
    t.etincelle(166, 8)
    # la tête : grand sourire, yeux rieurs vers les mousses
    for x in (78, 116):
        o = t.ell(x, 54, x + 9, 68)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 3, 57), (x + 6, 61), (x + 3, 65)]), N)
    tete = t.ell(80, 32, 122, 82)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 56, 176, 74), V)
    # les mèches qui dépassent du bonnet
    for pts in ([(84, 44), (82, 48), (83, 52)], [(119, 44), (121, 48), (120, 52)]):
        t.piece(t.fuseau(pts, 4, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(88, 48), (92, 45), (97, 46)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(106, 46), (111, 45), (115, 48)], 3, 2), V, ombre=0)
    t.oeil(87, 50, l=11, h=8, regard=(-1, -1))
    t.oeil(105, 50, l=11, h=8, regard=(-1, -1))
    for (x, sx) in ((85, -1), (117, 1)):
        t.peindre(t.trait([(x, 55), (x + 3 * sx, 57)]) | t.trait([(x, 58), (x + 3 * sx, 59)]), N)
    t.damier(t.poly([(103, 57), (106, 63), (104, 65)]), V)
    t.peindre(t.courbe([(101, 56), (100, 62), (98, 65), (101, 67), (105, 66)], 2), N)
    t.pixels(89, 68, """
::....................::
.::::::::::::::::::::::.
.:oo:oo:oo:oo:oo:oo:oo:.
..:oooooooooooooooooo:..
..::::::::::::::::::::..
...:::############::....
.....:::########:::.....
.......::::::::::.......
""")
    t.peindre(t.courbe([(86, 62), (85, 66), (87, 69)]) | t.courbe([(117, 62), (118, 66), (116, 69)]), N)
    for (x, y) in [(88, 64), (90, 65), (89, 66), (114, 64), (112, 65), (113, 66)]:
        t.point(x, y, V)
    # le bonnet à pompon, côtes blanches au revers
    calotte = t.ell(80, 14, 122, 52) & t.rect(0, 0, 176, 36)
    t.piece(calotte, V, ombre=3)
    t.rayures(calotte & ~t.bord(calotte, -1, -1, 1), N, 5, 1)
    revers = t.poly([(78, 33), (124, 33), (124, 41), (78, 41)])
    t.piece(revers, B, ombre=0)
    t.rayures(revers & t.rect(80, 34, 122, 40), V, 3, 1)
    pompon = t.ell(94, 2, 110, 18)
    t.piece(pompon, V, ombre=2)
    for (x, y) in [(98, 6), (104, 5), (101, 10), (106, 11), (97, 13)]:
        t.peindre(t.trait([(x, y), (x + 1, y - 1)]), B)
    t.sol(161, cx=96)
    return t.image()


# ------------------------------------------------------------------ Megane, la maîtresse des Cales

def megane():
    """Elle marche cambrée sous une haute pile de plateaux (chaque plateau, une couche du plan) qui tangue, et
    passe la tête sur le côté pour voir où elle va ; queue de cheval au vent, salopette."""
    t = Toile()
    # la queue de cheval au vent, derrière
    queue = t.fuseau([(52, 32), (36, 22), (22, 32), (6, 26)], 13, 3)
    queue |= t.fuseau([(50, 38), (34, 40), (20, 50), (4, 46)], 9, 2)
    t.piece(queue, V, ombre=2)
    for pts in ([(44, 30), (32, 27), (22, 33)], [(44, 40), (32, 42), (22, 47)], [(40, 34), (28, 35), (16, 38)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(46, 27), (34, 22), (26, 26)]), B)
    for (x0, y0, x1, y1) in [(12, 62, 2, 62), (24, 70, 14, 72), (10, 12, 2, 10)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)], 2), B)
    # la jambe arrière, en appui
    j2 = t.fuseau([(80, 116), (72, 134), (64, 148)], 14, 11)
    t.piece(j2, V, ombre=2)
    t.peindre(t.trait([(76, 140), (66, 146)]), B)
    b2 = t.poly([(52, 146), (68, 144), (72, 152), (70, 158), (50, 158), (48, 152)])
    t.piece(b2, B, ombre=2)
    t.peindre(t.rect(48, 156, 72, 158), V)
    t.peindre(t.trait([(54, 148), (64, 147)]) & ((t.xx % 2) == 0), N)
    # la jambe avant, qui avance
    j1 = t.fuseau([(94, 116), (104, 132), (110, 148)], 14, 11)
    t.piece(j1, V, ombre=2)
    t.peindre(t.trait([(100, 120), (106, 134)]), N)
    t.peindre(t.rect(100, 142, 120, 144) & j1, B)
    b1 = t.poly([(104, 148), (120, 148), (130, 154), (130, 160), (102, 160)])
    t.piece(b1, B, ombre=2)
    t.peindre(t.rect(102, 158, 130, 160), V)
    t.peindre(t.trait([(108, 150), (120, 150)]) & ((t.xx % 2) == 0), N)
    # le corps cambré : t-shirt blanc, salopette verte à bretelles
    torse = t.poly([(68, 74), (96, 70), (100, 96), (98, 120), (74, 122), (66, 100)])
    t.piece(torse, B, ombre=3)
    salo = t.poly([(72, 88), (98, 84), (100, 100), (100, 124), (74, 126), (70, 104)])
    t.piece(salo, V, ombre=3)
    t.peindre(t.trait([(74, 76), (76, 90)], 3) | t.trait([(92, 72), (94, 86)], 3), V)
    for (x, y) in ((76, 90), (94, 86)):
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    poche = t.poly([(78, 94), (94, 92), (94, 104), (80, 106)])
    t.piece(poche, B, ombre=0)
    t.peindre(t.trait([(80, 97), (92, 95)]), V)
    texte(t, 82, 99, "ls", V, 1)
    t.peindre(t.courbe([(86, 108), (88, 116), (86, 124)]), N)
    t.peindre(t.trait([(76, 108), (98, 106)]) & ((t.xx % 3) != 0), B)
    # le bras du fond, qui retient la pile par le côté
    bras2 = t.fuseau([(72, 78), (80, 68), (90, 58)], 9, 8)
    t.piece(bras2, B, ombre=2)
    # la pile de plateaux qui tangue : chaque plateau, une couche du plan (from en bas, cmd en haut)
    couches = ["cmd", "copy . .", "run pip", "copy req", "workdir", "from"]
    y = 12
    for i, mot in enumerate(couches):
        dx = int(5 * math.sin(i * 1.3 + 0.5))
        x0, x1 = 94 + dx, 154 + dx
        pl = t.poly([(x0, y), (x1, y), (x1 + 2, y + 13), (x0 - 2, y + 13)])
        t.piece(pl, B, ombre=2)
        t.peindre(t.rect(x0 - 2, y + 11, x1 + 2, y + 13) & pl, V)
        t.peindre(t.trait([(x0 + 1, y + 11), (x1, y + 11)]), N)
        texte(t, x0 + 5, y + 4, mot, N, 1)
        t.point(x1 - 4, y + 6, V); t.point(x1 - 6, y + 6, V)
        y += 16
    t.peindre(t.courbe([(164, 14), (170, 26), (166, 38)], 2) | t.courbe([(168, 50), (172, 58), (169, 66)], 2), B)
    t.etincelle(166, 4)
    # la main du fond sur le côté de la pile, la main de devant sous le plateau du bas
    poing(t, 86, 52, 96, 64, 2, sens=-1)
    bras = t.fuseau([(80, 82), (86, 100), (98, 112)], 10, 8)
    t.piece(bras, B, ombre=2)
    paume = t.ell(94, 106, 116, 116)
    t.piece(paume, B, ombre=0)
    t.peindre(t.trait([(102, 108), (112, 108)]), N)
    # la tête, penchée sur le côté de la pile pour voir la route
    o = t.ell(40, 48, 48, 60)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(43, 51), (46, 54), (43, 57)]), N)
    tete = t.ell(40, 24, 80, 74)
    t.piece(tete, B, ombre=0)
    # la chevelure tirée en arrière, la raie, l'élastique, la frange
    chev = (t.ell(38, 18, 80, 46) | t.ell(36, 26, 46, 52)) & ~t.poly([(56, 42), (86, 26), (86, 60), (48, 60)])
    t.piece(chev, V, ombre=2)
    t.peindre(t.courbe([(46, 34), (56, 24), (72, 22)]) | t.courbe([(44, 44), (50, 32), (62, 26)]), N)
    t.peindre(t.courbe([(50, 26), (60, 21), (70, 20)]), B)
    frange = t.fuseau([(60, 22), (68, 28), (74, 35)], 8, 2) | t.fuseau([(70, 22), (77, 27), (81, 34)], 6, 1)
    t.piece(frange, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(64, 25), (70, 30)]), N)
    for (x, y) in [(40, 26), (38, 30), (37, 34)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
    # les sourcils relevés, le regard vers la route
    t.piece(t.fuseau([(50, 41), (55, 38), (60, 39)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(64, 38), (69, 36), (74, 37)], 3, 2), V, ombre=0)
    t.oeil(50, 43, l=11, h=9, regard=(2, 0), cils=-1)
    t.oeil(64, 42, l=10, h=9, regard=(2, 0), cils=1)
    t.peindre(t.courbe([(73, 50), (78, 57), (75, 59), (72, 58)], 2), N)
    t.pixels(58, 62, """
:...........:
.:::::::::::.
.:ooooooooo:.
..::#####::..
....:::::....
""")
    for (x, y) in [(50, 56), (52, 57), (51, 58), (54, 56)]:
        t.point(x, y, V)
    t.sol(161, cx=94)
    return t.image()


# ------------------------------------------------------------------ Jahmal, le maître du Chantier des maîtres

def jahmal():
    """Trapu, tablier de cuir, masque de soudeur relevé sur le front, grande barbe ; il tient à bout de bras le
    petit navire fini, poli comme un galet, et le contemple en se grattant la barbe."""
    t = Toile()
    # les jambes courtes et solides, bottes de chantier
    for x in (62, 92):
        j = t.poly([(x, 124), (x + 22, 124), (x + 22, 148), (x, 148)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 6, 128), (x + 8, 146)]), N)
        b = t.poly([(x - 4, 146), (x + 24, 146), (x + 26, 152), (x + 26, 160), (x - 6, 160), (x - 6, 152)])
        t.piece(b, V, ombre=0)
        t.damier(b & t.rect(0, 146, 176, 154), N)
        t.peindre(t.rect(x - 6, 157, x + 26, 158), B)
        t.peindre(t.trait([(x - 2, 152), (x + 8, 150)]), B)
    # le corps large : chemise verte manches retroussées
    corps = t.poly([(52, 84), (126, 84), (136, 104), (130, 130), (52, 130), (44, 104)])
    t.piece(corps, V, ombre=4)
    # le tablier de cuir, blanc, piqué, avec sa grande poche à outils
    tab = t.poly([(64, 92), (114, 92), (118, 142), (60, 142)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.trait([(66, 96), (66, 138)]) & ((t.yy % 3) == 0), V)
    t.peindre(t.trait([(112, 96), (115, 138)]) & ((t.yy % 3) == 0), V)
    poche = t.poly([(70, 114), (108, 114), (110, 132), (68, 132)])
    t.piece(poche, B, ombre=2)
    t.peindre(t.trait([(70, 116), (108, 116)]) & ((t.xx % 3) == 0), V)
    t.peindre(t.trait([(89, 116), (89, 132)]), N)
    # le marteau et la clé dans la poche
    t.piece(t.rect(76, 102, 80, 116), V, ombre=0)
    t.piece(t.rect(70, 98, 86, 104), V, ombre=0)
    t.piece(t.trait([(98, 116), (102, 100)], 4), V, ombre=0)
    t.piece(t.ell(97, 94, 107, 104) & ~t.rect(100, 94, 103, 99), V, ombre=0)
    # la sangle du tablier
    t.peindre(t.trait([(64, 92), (58, 86)], 3) | t.trait([(114, 92), (120, 86)], 3), B)
    t.peindre(t.rect(52, 124, 126, 128) & corps & ~tab, N)
    # le bras levé vers la barbe (il se gratte le menton), à gauche
    bras2 = t.fuseau([(60, 88), (44, 100), (30, 106)], 16, 13)
    t.piece(bras2, V, ombre=3)
    t.peindre(t.courbe([(54, 96), (44, 102), (36, 104)]), N)
    avb = t.fuseau([(30, 104), (40, 92), (54, 84)], 12, 10)
    t.piece(avb, B, ombre=2)
    t.peindre(t.courbe([(34, 100), (42, 92), (50, 87)]), V)
    t.peindre(t.trait([(28, 98), (34, 110)], 4), B)
    t.peindre(t.trait([(29, 99), (33, 109)]) & ((t.yy % 2) == 0), V)
    # le bras tendu qui porte le navire
    bras = t.fuseau([(120, 90), (130, 100), (140, 102)], 16, 13)
    t.piece(bras, V, ombre=3)
    t.peindre(t.courbe([(124, 94), (130, 99), (136, 100)]), N)
    t.peindre(t.trait([(138, 96), (140, 108)], 3), B)
    t.peindre(t.trait([(139, 97), (141, 107)]) & ((t.yy % 2) == 0), V)
    avbras = t.fuseau([(142, 102), (150, 96), (156, 88)], 12, 10)
    t.piece(avbras, B, ombre=2)
    t.peindre(t.courbe([(146, 98), (151, 93), (154, 89)]), V)
    # la paume ouverte sous le navire
    paume = t.ell(142, 78, 170, 90)
    t.piece(paume, B, ombre=0)
    t.piece(t.fuseau([(166, 82), (170, 78), (172, 74)], 5, 3), B, ombre=0)
    t.peindre(t.trait([(148, 86), (162, 86)]), N)
    # le petit navire, poli comme un galet : coque, cheminée, fumée
    coque = t.poly([(138, 66), (172, 66), (166, 78), (144, 78)])
    t.piece(coque, V, ombre=2)
    t.peindre(t.trait([(140, 69), (170, 69)]), B)
    for x in (148, 154, 160):
        t.piece(t.ell(x, 71, x + 3, 74), B, ombre=0)
    pont = t.rect(146, 56, 164, 66)
    t.piece(pont, B, ombre=2)
    t.peindre(t.rect(149, 59, 152, 62) | t.rect(156, 59, 159, 62), V)
    chem = t.rect(152, 44, 158, 56)
    t.piece(chem, V, ombre=0)
    t.peindre(t.rect(152, 48, 158, 49), B)
    for (x, y, r) in [(156, 36, 3), (162, 30, 3), (168, 22, 2)]:
        t.peindre(t.ell(x - r, y - r, x + r, y + r) & ~t.ell(x - r + 1, y - r + 1, x + r - 1, y + r - 1), B)
    t.etincelle(136, 50); t.etincelle(170, 50)
    t.etoile(130, 64, B, 1)
    # la tête, la grande barbe, le masque de soudeur relevé
    for x in (50, 106):
        o = t.ell(x, 46, x + 10, 62)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 3, 49), (x + 7, 54), (x + 3, 59)]), N)
    tete = t.ell(54, 26, 112, 86)
    t.piece(tete, B, ombre=0)
    barbe = (t.ell(54, 46, 112, 102) & ~t.ell(62, 34, 106, 72) & t.rect(0, 58, 176, 170))
    barbe |= t.fuseau([(84, 94), (84, 104), (88, 110)], 14, 2)
    barbe &= ~t.ell(72, 64, 98, 87)
    t.piece(barbe, V, ombre=3)
    for pts in ([(64, 70), (66, 82), (72, 92)], [(74, 78), (76, 90), (80, 98)], [(96, 78), (94, 90), (90, 98)],
                [(104, 70), (102, 82), (98, 92)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(60, 66), (62, 74)]) | t.courbe([(70, 84), (72, 90)]), B)
    t.peindre(t.courbe([(86, 102), (90, 106), (86, 106)]), N)
    # la main qui gratte la barbe
    main2 = t.ell(50, 74, 64, 88)
    t.piece(main2, B, ombre=0)
    doigts = t.fuseau([(58, 78), (64, 76), (68, 79)], 4, 3) | t.fuseau([(58, 82), (65, 81), (69, 84)], 4, 3)
    t.piece(doigts, B, ombre=0)
    t.peindre(t.trait([(52, 80), (57, 79)]), N)
    # la moustache et la bouche contente
    t.pixels(76, 76, """
:............:
.::::::::::::.
.:oooooooooo:.
..:::####:::..
....::::::....
""")
    m1 = t.piece(t.fuseau([(84, 70), (78, 72), (70, 74), (66, 70)], 7, 2), V, ombre=0)
    m2 = t.piece(t.fuseau([(86, 70), (92, 72), (100, 74), (104, 70)], 7, 2), V, ombre=0)
    t.peindre(t.courbe([(82, 71), (76, 73), (70, 73)]) & m1, N)
    t.peindre(t.courbe([(88, 71), (94, 73), (100, 73)]) & m2, N)
    # le nez fort, les yeux qui contemplent le navire
    t.damier(t.poly([(88, 56), (92, 64), (90, 68), (86, 66)]), V)
    t.peindre(t.courbe([(83, 54), (80, 62), (78, 66), (82, 69), (86, 67)], 2), N)
    t.peindre(t.courbe([(87, 68), (91, 68), (92, 65)], 1), N)
    t.piece(t.fuseau([(66, 46), (72, 43), (79, 44)], 3, 4), V, ombre=0)
    t.piece(t.fuseau([(89, 44), (96, 43), (102, 45)], 4, 3), V, ombre=0)
    t.oeil(67, 48, l=12, h=9, regard=(3, -1), paupiere=2)
    t.oeil(88, 48, l=12, h=9, regard=(3, -1), paupiere=2)
    t.peindre(t.trait([(104, 54), (107, 52)]) | t.trait([(104, 57), (107, 58)]), N)
    # le masque de soudeur relevé sur le front, sa vitre sombre et son reflet
    masque = t.poly([(56, 14), (110, 12), (114, 36), (52, 38)])
    t.piece(masque, V, ombre=3)
    vitre = t.poly([(64, 18), (102, 17), (104, 31), (62, 32)])
    t.piece(vitre, N, bord=B, ombre=0)
    t.trame(vitre, V, 0.2)
    t.peindre(t.trait([(68, 28), (76, 20)], 2) | t.trait([(74, 29), (80, 23)]), B)
    for (x, y) in [(56, 26), (108, 24)]:
        t.piece(t.ell(x - 4, y - 4, x + 4, y + 4), B, ombre=0)
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), N)
    sangle = t.poly([(54, 38), (112, 36), (112, 40), (54, 42)])
    t.piece(sangle, B, ombre=0)
    t.peindre(t.trait([(56, 40), (110, 38)]) & ((t.xx % 3) == 0), V)
    t.sol(161, cx=88)
    return t.image()


# ------------------------------------------------------------------ Remi, le guetteur de la Vigie

def remi():
    """Tout en haut du grand mât, dans le nid-de-pie : bonnet de quart, écharpe au vent, longue-vue à l'œil ; il ne
    la baisse même pas pour te parler. Le pavillon claque, une mouette passe."""
    t = Toile()
    # les traits de vent
    for (x0, x1, y) in [(120, 150, 92), (136, 170, 100), (4, 26, 64), (2, 20, 74), (128, 160, 18)]:
        t.peindre(t.rect(x0, y, x1, y + 1), B)
    # le grand mât, le pavillon qui claque en haut
    mat = t.rect(34, 0, 42, 169)
    t.piece(mat, B, ombre=2)
    t.peindre(t.rect(34, 0, 35, 169), B)
    for y in (24, 60):
        t.piece(t.rect(32, y, 44, y + 3), V, ombre=0)
    pav = t.fuseau([(44, 10), (56, 4), (68, 12), (82, 6), (96, 12)], 18, 8)
    t.piece(pav, V, ombre=2)
    t.peindre(t.ell(52, 4, 62, 14), B)
    t.peindre(t.ell(55, 7, 59, 11), V)
    t.peindre(t.courbe([(66, 4), (70, 12), (68, 18)]) | t.courbe([(82, 2), (84, 8), (82, 14)]), N)
    # la mouette
    t.pixels(6, 26, """
:::.......:::
:oo::...::oo:
.:ooo:::ooo:.
..:oooooooo#:
...::oooo:::.
.....::::....
""")
    t.pixels(16, 44, """
::...::
.:o:o:.
..:::..
""")
    # les haubans et les enfléchures, sous la hune
    for (x0, x1) in [(48, 6), (56, 30), (120, 150), (130, 174)]:
        t.peindre(t.trait([(x0, 134), (x1, 169)], 2), B)
    for y in (146, 158):
        t.peindre(t.trait([(int(48 - (y - 134) * 42 / 35), y), (int(56 - (y - 134) * 26 / 35), y)]), B)
        t.peindre(t.trait([(int(120 + (y - 134) * 30 / 35), y), (int(130 + (y - 134) * 44 / 35), y)]), B)
    # l'écharpe qui flotte au vent (derrière lui, vers la gauche)
    ech = t.fuseau([(72, 82), (58, 76), (48, 82), (40, 74)], 9, 5)
    ech |= t.fuseau([(70, 86), (56, 90), (48, 96)], 7, 4)
    t.piece(ech, B, ombre=2)
    t.rayures(ech, V, 6, 2)
    for x in (39, 41):
        t.peindre(t.trait([(x, 70), (x - 2, 66)]), B)
    # le torse dans le caban, qui dépasse de la hune
    torse = t.poly([(66, 74), (112, 72), (122, 96), (120, 112), (60, 112), (58, 92)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.trait([(90, 76), (88, 110)], 2), N)
    for y in (88, 100):
        for x in (80, 98):
            t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
            t.point(x, y, N)
    t.peindre(t.courbe([(70, 92), (74, 100), (72, 110)]), N)
    col = t.poly([(68, 70), (110, 68), (106, 80), (92, 84), (72, 80)])
    t.piece(col, B, ombre=2)
    t.rayures(col & ~t.bord(col, 0, -1, 1), V, 6, 2)
    # le bras du fond, coude levé, qui tient le tube près de l'œil
    bras2 = t.fuseau([(110, 78), (122, 72), (118, 60)], 11, 9)
    t.piece(bras2, V, ombre=2)
    # le bras de devant, qui soutient le tube plus loin
    bras = t.fuseau([(72, 86), (104, 84), (136, 66)], 12, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.trait([(116, 80), (124, 78), (130, 76)]) & bras, N)
    manchette(t, [(134, 64), (138, 70)], 4)
    # la tête : l'œil gauche ouvert vers le large, l'autre collé au tube
    o = t.ell(62, 48, 72, 64)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(65, 51), (69, 56), (65, 61)]), N)
    tete = t.ell(64, 26, 106, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 0, 1, 2) & t.rect(0, 70, 176, 80), V)
    # les favoris et la barbe de trois jours
    t.piece(t.fuseau([(68, 42), (68, 50), (70, 54)], 4, 2), V, ombre=0, lumiere=False)
    # l'œil gauche grand ouvert, regard au large ; l'autre plissé contre l'oculaire
    t.piece(t.fuseau([(74, 42), (80, 38), (87, 40)], 2, 4), V, ombre=0)
    t.oeil(75, 45, l=11, h=9, regard=(3, 0))
    t.damier(t.poly([(92, 56), (95, 61), (92, 63)]), V)
    t.peindre(t.courbe([(89, 50), (88, 58), (86, 62), (90, 64), (94, 62)], 2), N)
    t.pixels(76, 66, """
:...........:
.:::::::::::.
.:ooooooooo:.
..::#####::..
....:::::....
""")
    t.damier(t.ell(70, 74, 98, 80) & tete & t.rect(0, 74, 176, 80), V)
    t.peindre(t.trait([(73, 60), (74, 62)]), N)
    # la longue-vue collée à l'œil droit : trois tubes, bagues, lentille
    lv1 = t.poly([(102, 44), (124, 40), (126, 56), (104, 60)])
    lv2 = t.poly([(124, 38), (146, 35), (148, 51), (126, 54)])
    lv3 = t.poly([(146, 33), (164, 31), (166, 47), (148, 49)])
    t.piece(lv1, B, ombre=2)
    t.piece(lv2, V, ombre=2)
    t.piece(lv3, B, ombre=2)
    for (x0, y0, x1, y1) in [(122, 39, 126, 56), (144, 35, 148, 51)]:
        t.piece(t.poly([(x0, y0), (x0 + 3, y0 - 1), (x1 + 1, y1), (x1 - 2, y1 + 1)]), V, ombre=0, lumiere=False)
    t.peindre(t.trait([(156, 34), (158, 46)]), V)
    bague = t.poly([(96, 42), (104, 41), (106, 61), (98, 62)])
    t.piece(bague, V, ombre=0)
    t.peindre(t.trait([(100, 43), (101, 60)]), N)
    oc = t.ell(162, 30, 172, 48)
    t.piece(oc, V, ombre=0)
    t.peindre(t.ell(165, 33, 170, 45), N)
    t.peindre(t.trait([(167, 35), (167, 38)]), B)
    for (x0, y0, x1, y1) in [(174, 26, 175, 22), (174, 52, 175, 56)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)], 2), B)
    t.etincelle(160, 16)
    poing(t, 112, 54, 124, 68, 3)
    poing(t, 132, 52, 146, 68, 3)
    # le bonnet de quart, côtes et revers
    bonnet = t.ell(62, 6, 108, 50) & t.rect(0, 0, 176, 36)
    t.piece(bonnet, V, ombre=3)
    t.rayures(bonnet & ~t.bord(bonnet, -1, -1, 1), N, 4, 1)
    rev = t.poly([(62, 28), (108, 26), (108, 37), (62, 39)])
    t.piece(rev, V, ombre=0)
    t.rayures(rev & eroder_(rev), B, 4, 1)
    # la hune : le panier tressé, cerclé de cordage
    hune = t.poly([(30, 108), (146, 106), (138, 138), (38, 140)])
    t.piece(hune, B, ombre=3)
    for k, y in enumerate(range(114, 138, 6)):
        t.peindre(t.rect(30, y, 146, y + 2) & hune, V)
        t.peindre(t.rect(30, y, 146, y + 2) & hune & (((t.xx + k * 3) % 6) == 0), N)
    for x in range(40, 140, 12):
        t.peindre(t.trait([(x, 110), (x + 1, 136)]) & hune, N)
    bord = t.poly([(26, 102), (150, 100), (150, 110), (26, 112)])
    t.piece(bord, V, ombre=0)
    t.peindre(t.trait([(28, 106), (148, 104)]) & (((t.xx) % 4) < 2), B)
    t.peindre(t.trait([(28, 108), (148, 106)]) & (((t.xx + 2) % 4) < 2), N)
    plaque = t.rect(66, 118, 116, 128)
    t.piece(plaque, B, ombre=0)
    texte(t, 69, 121, "docker stats", N, 1)
    return t.image()


def eroder_(m):
    from portrait_v3 import eroder
    return eroder(m, 1)


# ------------------------------------------------------------------ Soufiane, le douanier de la Douane

def soufiane():
    """Penché en avant, il inspecte à la loupe le conteneur noir sans jamais le toucher ; dans la lentille son
    œil devient énorme. Képi à bande, uniforme boutonné, la planchette d'inspection tenue dans le dos."""
    t = Toile()
    # le conteneur noir saisi, à droite : nervuré, scellé, étiqueté
    cont = t.poly([(128, 104), (176, 104), (176, 160), (128, 160)])
    t.piece(cont, V, ombre=0, lumiere=False)
    t.damier(cont, N)
    for x in range(132, 176, 6):
        t.peindre(t.rect(x, 108, x, 156), N)
        t.peindre(t.rect(x + 1, 108, x + 1, 156), V)
    t.peindre(t.rect(128, 104, 176, 105), B)
    etiq = t.rect(140, 118, 168, 132)
    t.piece(etiq, B, ombre=0)
    texte(t, 143, 121, "prise", N, 1)
    t.peindre(t.rect(143, 128, 165, 128) & ((t.xx % 2) == 0), V)
    t.peindre(t.ell(150, 136, 158, 144) & ~t.ell(152, 138, 156, 142), B)
    cad = t.rect(148, 141, 160, 152)
    t.piece(cad, B, ombre=0)
    t.peindre(t.rect(153, 144, 155, 148), N)
    # la jambe arrière, tendue
    j2 = t.fuseau([(74, 114), (60, 134), (50, 150)], 14, 11)
    t.piece(j2, V, ombre=2)
    t.peindre(t.trait([(70, 118), (56, 142)]), B)
    b2 = t.poly([(36, 148), (52, 146), (58, 152), (56, 159), (34, 159), (32, 154)])
    t.piece(b2, V, ombre=0)
    t.damier(b2 & t.rect(0, 146, 176, 152), N)
    t.peindre(t.trait([(36, 152), (46, 149)]), B)
    t.peindre(t.rect(32, 157, 58, 159), B)
    # la jambe avant, fléchie
    j1 = t.fuseau([(88, 114), (102, 130), (100, 148)], 14, 11)
    t.piece(j1, V, ombre=2)
    t.peindre(t.trait([(92, 116), (104, 132), (102, 146)]), B)
    b1 = t.poly([(92, 146), (106, 146), (118, 152), (118, 159), (90, 159)])
    t.piece(b1, V, ombre=0)
    t.damier(b1 & t.rect(0, 146, 176, 152), N)
    t.peindre(t.trait([(96, 150), (108, 149)]), B)
    t.peindre(t.rect(90, 157, 118, 159), B)
    # le bras du fond, dans le dos, et la planchette d'inspection
    bras2 = t.fuseau([(80, 80), (68, 96), (58, 108)], 11, 9)
    t.piece(bras2, V, ombre=2)
    planche = t.poly([(30, 92), (56, 86), (62, 116), (36, 122)])
    t.piece(planche, B, ombre=2)
    for k in range(5):
        y = 97 + k * 4
        t.peindre(t.trait([(36, y + 2), (52, y - 2)]), V)
        t.piece(t.rect(54 - 0, y - 3, 55, y - 2), V, ombre=0, lumiere=False)
    pince = t.poly([(38, 88), (50, 85), (51, 90), (39, 93)])
    t.piece(pince, V, ombre=0)
    poing(t, 50, 102, 62, 114, 2, sens=-1)
    # la vareuse penchée, ceinturon et baudrier
    torse = t.poly([(76, 72), (104, 62), (118, 80), (110, 104), (100, 118), (70, 118), (68, 96)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.courbe([(98, 66), (94, 90), (90, 116)], 1), N)
    for (x, y) in [(96, 74), (94, 84), (92, 94), (90, 104)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    t.peindre(t.trait([(80, 74), (106, 110)], 3), B)
    t.peindre(t.trait([(81, 75), (105, 109)]) & ((t.yy % 3) == 0), V)
    ceint = t.poly([(68, 108), (104, 106), (104, 114), (68, 116)])
    t.piece(ceint, B, ombre=0)
    t.peindre(t.trait([(70, 112), (102, 110)]) & ((t.xx % 3) == 0), V)
    t.piece(t.rect(82, 106, 90, 116), V, ombre=0)
    t.peindre(t.rect(84, 109, 88, 113), N)
    t.peindre(t.rect(85, 110, 87, 112), B)
    ep = t.poly([(98, 60), (116, 58), (120, 66), (104, 68)])
    t.piece(ep, B, ombre=0)
    for x in range(104, 120, 2):
        t.peindre(t.trait([(x, 69), (x, 72)]), B)
    # la tête, penchée vers l'avant
    o = t.ell(98, 38, 108, 54)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(101, 41), (104, 46), (101, 51)]), N)
    tete = t.ell(100, 22, 140, 70)
    t.piece(tete, B, ombre=0)
    t.piece(t.fuseau([(102, 32), (104, 40), (106, 46)], 5, 2), V, ombre=0, lumiere=False)
    # l'œil nu, plissé de concentration
    t.piece(t.fuseau([(108, 36), (114, 37), (120, 40)], 3, 2), V, ombre=0)
    t.oeil(110, 40, l=10, h=7, regard=(2, 1), paupiere=3)
    nez = t.poly([(128, 42), (138, 54), (134, 57), (126, 55)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 0, 1, 1), V)
    t.point(128, 54, N)
    # la moustache taillée et la bouche pincée d'attention
    m = t.fuseau([(118, 58), (126, 58), (134, 60)], 3, 4)
    t.piece(m, V, ombre=0)
    t.pixels(122, 63, """
.:::::::.
..:ooo:..
...:::...
""")
    t.peindre(t.courbe([(116, 66), (118, 68)]), N)
    # le bras de devant et la loupe : derrière la lentille, son œil devient énorme
    bras = t.fuseau([(104, 74), (122, 86), (136, 80)], 11, 9)
    t.piece(bras, V, ombre=2)
    manchette(t, [(134, 76), (136, 84)], 4)
    poing(t, 136, 72, 150, 88, 3)
    manche = t.fuseau([(148, 76), (152, 68), (154, 60)], 6, 5)
    t.piece(manche, V, ombre=0)
    t.peindre(t.trait([(150, 72), (153, 65)]), N)
    t.peindre(t.trait([(152, 70), (154, 66)]), B)
    cercle = t.ell(128, 22, 170, 62)
    t.piece(cercle, V, ombre=0)
    lentille = t.ell(132, 26, 166, 58)
    t.peindre(lentille, B)
    # l'œil énorme
    t.piece(t.fuseau([(134, 32), (146, 26), (158, 30)], 3, 5), V, ombre=0)
    t.oeil(135, 34, l=27, h=18, regard=(3, 1), paupiere=3)
    gros = t.rect(150, 42, 157, 49)
    t.peindre(gros & t.ell(148, 40, 159, 51), V)
    t.peindre(t.ell(151, 43, 156, 48), N)
    t.peindre(t.rect(152, 44, 153, 45), B)
    t.peindre(t.trait([(138, 56), (160, 54)]) & lentille, N)
    t.peindre(t.trait([(160, 30), (164, 36)], 2) & lentille, B)
    t.peindre(t.trait([(158, 28), (166, 40)]) & lentille & ((t.xx % 2) == 0), V)
    # le képi à bande, l'insigne, la visière
    kep = t.poly([(100, 6), (134, 4), (138, 26), (100, 30)])
    t.piece(kep, V, ombre=3)
    t.peindre(t.trait([(102, 8), (132, 6)]), B)
    bande = t.poly([(100, 20), (138, 18), (138, 28), (100, 30)])
    t.piece(bande, B, ombre=0)
    t.peindre(t.trait([(102, 24), (136, 22)]) & ((t.xx % 4) < 2), V)
    t.pixels(114, 10, """
..:o:..
.:ooo:.
:o#o#o:
.:ooo:.
..:o:..
""")
    vis = t.poly([(118, 28), (142, 26), (150, 30), (124, 32)])
    t.piece(vis, V, ombre=0, lumiere=False)
    t.peindre(t.trait([(122, 29), (144, 27)]), B)
    t.sol(161, cx=80, l=60)
    return t.image()


# ------------------------------------------------------------------ Mina, la douanière du large

def mina():
    """Debout face au vent, la cape sombre qui claque derrière elle, des jumelles au cou ; le regard au loin,
    elle note dans son carnet sans le regarder."""
    t = Toile()
    for (x0, x1, y) in [(140, 170, 40), (150, 174, 52), (136, 162, 120), (146, 172, 130), (154, 172, 8)]:
        t.peindre(t.rect(x0, y, x1, y + 1), B)
    # la cape sombre qui claque vers la gauche, doublure claire dans les replis
    cape = t.fuseau([(84, 74), (60, 74), (32, 84), (6, 76)], 28, 12)
    cape |= t.fuseau([(86, 92), (62, 104), (36, 120), (8, 116)], 40, 12)
    cape |= t.fuseau([(88, 108), (76, 130), (58, 146), (38, 148)], 30, 8)
    t.piece(cape, V, ombre=4, lumiere=False)
    t.damier(cape & t.rect(0, 130, 176, 170), N)
    for pts in ([(82, 86), (56, 92), (30, 100), (12, 100)], [(84, 104), (60, 120), (34, 132)],
                [(72, 76), (48, 80), (22, 82)]):
        t.peindre(t.courbe(pts, 2), N)
    doub = t.fuseau([(82, 62), (58, 62), (30, 72), (4, 66)], 5, 2)
    doub |= t.fuseau([(34, 112), (20, 116), (6, 112)], 5, 2)
    t.piece(doub, B, ombre=0)
    # les bottes hautes à revers
    for x in (72, 94):
        bt = t.poly([(x, 128), (x + 14, 128), (x + 15, 150), (x + 22, 153), (x + 22, 159), (x - 2, 159)])
        t.piece(bt, V, ombre=0)
        t.damier(bt & t.rect(0, 134, 176, 150) & t.bord(bt, 1, 0, 4), N)
        t.peindre(t.trait([(x + 3, 136), (x + 3, 150)]), B)
        t.piece(t.rect(x - 1, 128, x + 15, 133), B, ombre=0)
        t.peindre(t.rect(x - 2, 157, x + 22, 159), B)
    # le long manteau croisé, basques évasées par le vent
    man = t.poly([(72, 70), (104, 70), (112, 96), (116, 130), (104, 134), (68, 134), (58, 128), (64, 96)])
    t.piece(man, V, ombre=3)
    t.piece(t.poly([(58, 126), (116, 128), (116, 134), (104, 136), (68, 136), (58, 132)]), B, ombre=0)
    t.peindre(t.trait([(60, 131), (114, 132)]) & ((t.xx % 4) < 2), V)
    rev = t.poly([(74, 70), (88, 90), (102, 70), (98, 70), (88, 82), (78, 70)])
    t.peindre(rev, B)
    for (x, y) in [(82, 96), (94, 96), (82, 118), (94, 118)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    t.peindre(t.courbe([(88, 90), (88, 126)]), N)
    t.peindre(t.courbe([(70, 112), (66, 122), (62, 128)]) | t.courbe([(106, 110), (110, 120), (112, 128)]), N)
    ceint = t.poly([(64, 100), (110, 100), (110, 105), (64, 105)])
    t.piece(ceint, V, ombre=0, lumiere=False)
    t.damier(ceint, N)
    t.piece(t.rect(84, 99, 92, 106), B, ombre=0)
    t.peindre(t.rect(86, 101, 90, 104), N)
    col = t.poly([(72, 64), (80, 74), (96, 74), (104, 64), (100, 78), (76, 78)])
    t.piece(col, V, ombre=0)
    t.pixels(84, 72, """
.:::::.
:ooooo:
:o###o:
:ooooo:
.:::::.
""")
    # les jumelles pendues au cou, sur le ventre
    t.peindre(t.courbe([(78, 76), (74, 96), (80, 108)]) | t.courbe([(98, 76), (104, 96), (100, 108)]), B)
    for x in (78, 90):
        tube = t.poly([(x, 106), (x + 10, 106), (x + 11, 122), (x - 1, 122)])
        t.piece(tube, B, ombre=2)
        t.peindre(t.rect(x - 1, 117, x + 11, 122) & tube, V)
        t.peindre(t.ell(x + 1, 117, x + 9, 122) & tube, N)
        t.point(x + 3, 118, B)
    t.piece(t.rect(88, 108, 91, 114), V, ombre=0)
    # le bras du fond, qui tient le carnet ouvert contre la poitrine
    bras2 = t.fuseau([(72, 76), (62, 88), (64, 96)], 10, 8)
    t.piece(bras2, V, ombre=2)
    carnet = t.poly([(52, 80), (74, 76), (78, 96), (56, 100)])
    t.piece(carnet, B, ombre=2)
    t.peindre(t.trait([(63, 78), (67, 98)]), V)
    for k in range(4):
        t.peindre(t.trait([(55, 84 + k * 4), (61, 83 + k * 4)]) & ((t.xx % 2) == 0), N)
        t.peindre(t.trait([(68, 82 + k * 4), (74, 81 + k * 4)]), N)
    poing(t, 58, 92, 68, 104, 2, sens=-1)
    # le bras de devant qui écrit sans regarder, crayon en main
    bras = t.fuseau([(102, 76), (112, 90), (90, 96)], 11, 8)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(108, 84), (110, 90), (102, 94)]), N)
    crayon = t.trait([(70, 92), (80, 84)], 3)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.trait([(70, 92), (71, 91)], 2), N)
    t.peindre(t.trait([(73, 89), (79, 85)]), V)
    poing(t, 78, 86, 92, 98, 2)
    # les cheveux longs au vent, derrière la tête
    chev = t.fuseau([(80, 30), (60, 26), (44, 38), (24, 36)], 22, 4)
    chev |= t.fuseau([(78, 48), (58, 52), (46, 62), (28, 60)], 14, 3)
    chev |= t.fuseau([(78, 40), (60, 40), (40, 50), (30, 46)], 12, 3)
    t.piece(chev, V, ombre=2)
    for pts in ([(74, 32), (58, 32), (44, 40)], [(74, 44), (58, 46), (44, 54)], [(70, 38), (54, 38), (38, 46)],
                [(72, 52), (58, 56), (48, 60)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(76, 26), (62, 24), (50, 28)]), B)
    t.peindre(t.courbe([(70, 46), (56, 48), (48, 52)]), B)
    # la tête, de trois quarts, tournée vers le large
    cou = t.rect(84, 62, 94, 70)
    t.piece(cou, B, ombre=0)
    tete = t.ell(74, 20, 112, 70)
    t.piece(tete, B, ombre=0)
    # la frange et le bandeau
    fr = t.ell(72, 14, 112, 38) & ~t.poly([(84, 32), (114, 22), (114, 40), (84, 40)])
    t.piece(fr, V, ombre=2)
    t.peindre(t.courbe([(78, 30), (86, 22), (100, 20)]), N)
    band = t.fuseau([(74, 26), (92, 18), (110, 20)], 4, 3)
    t.piece(band, B, ombre=0)
    t.peindre(t.courbe([(76, 26), (92, 19), (108, 21)]) & ((t.xx % 3) == 0), V)
    t.piece(t.fuseau([(110, 24), (114, 32), (112, 38)], 4, 3), V, ombre=0, lumiere=False)
    # le regard au loin, sourcils fermes
    t.piece(t.fuseau([(84, 35), (89, 33), (94, 34)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(98, 33), (103, 32), (108, 34)], 3, 2), V, ombre=0)
    t.oeil(84, 38, l=11, h=8, regard=(3, -1), cils=-1)
    t.oeil(99, 37, l=10, h=8, regard=(3, -1), cils=1)
    t.peindre(t.courbe([(107, 48), (110, 53), (107, 55), (104, 55)], 1), N)
    t.damier(t.poly([(108, 50), (111, 54), (108, 56)]), V)
    t.pixels(94, 58, """
:........:
.::::::::.
..:####:..
...::::...
""")
    for (x, y) in [(86, 51), (88, 52), (87, 53), (90, 51)]:
        t.point(x, y, V)
    t.sol(161, cx=88, l=64)
    return t.image()


# ------------------------------------------------------------------ Ronan, le voyageur des deux continents

def ronan():
    """Un sac à dos plus haut que lui, chargé d'une couverture roulée, d'une gamelle et d'une boussole ; il
    déplie à bout de bras une carte où deux continents se font face, amd64 et arm64."""
    t = Toile()
    # la jambe arrière
    j2 = t.fuseau([(76, 116), (68, 134), (60, 148)], 13, 11)
    t.piece(j2, V, ombre=2)
    t.peindre(t.trait([(72, 120), (64, 140)]), N)
    b2 = t.poly([(46, 146), (62, 144), (66, 152), (66, 159), (44, 159), (42, 153)])
    t.piece(b2, B, ombre=2)
    t.peindre(t.rect(42, 157, 66, 159), V)
    for x in (50, 54, 58):
        t.peindre(t.trait([(x, 146), (x + 2, 150)]), V)
    # le gros sac à dos, plus haut que lui
    sac = t.poly([(20, 22), (78, 18), (84, 40), (82, 126), (24, 130), (16, 100)])
    t.piece(sac, V, ombre=4)
    poche = t.poly([(24, 74), (58, 72), (60, 112), (26, 116)])
    t.piece(poche, B, ombre=2)
    rabat = t.poly([(22, 70), (60, 68), (62, 82), (24, 84)])
    t.piece(rabat, V, ombre=0)
    t.peindre(t.trait([(26, 76), (58, 74)]) & ((t.xx % 3) == 0), B)
    t.piece(t.rect(38, 80, 44, 90), B, ombre=0)
    t.peindre(t.rect(40, 84, 42, 86), N)
    t.peindre(t.trait([(30, 98), (54, 96)]) | t.trait([(30, 104), (54, 102)]), V)
    for x in (66, 74):
        t.peindre(t.trait([(x, 26), (x + 1, 124)], 2), B)
        t.peindre(t.trait([(x, 26), (x + 1, 124)]) & ((t.yy % 4) == 0), N)
    t.peindre(t.courbe([(30, 40), (46, 44), (62, 40)]), N)
    # la couverture roulée, sanglée sur le dessus
    couv = t.poly([(10, 4), (82, 2), (86, 10), (84, 22), (12, 24), (8, 14)])
    t.piece(couv, B, ombre=2)
    t.rayures(couv & ~t.bord(couv, -1, -1, 1), V, 8, 2)
    t.piece(t.ell(4, 4, 16, 24), B, ombre=0)
    t.peindre(t.courbe([(10, 8), (7, 14), (10, 18), (13, 14)]), N)
    for x in (30, 60):
        t.piece(t.rect(x, 1, x + 4, 25), V, ombre=0, lumiere=False)
        t.peindre(t.rect(x + 1, 12, x + 3, 14), B)
    # la gamelle pendue au flanc, la boussole qui se balance
    t.peindre(t.trait([(18, 44), (12, 52)]), B)
    gam = t.poly([(2, 52), (20, 52), (18, 70), (4, 70)])
    t.piece(gam, B, ombre=2)
    t.piece(t.rect(0, 50, 22, 54), V, ombre=0)
    t.peindre(t.trait([(4, 60), (18, 60)]), V)
    t.peindre(t.courbe([(18, 116), (10, 124), (10, 132)]), B)
    bous = t.ell(2, 130, 20, 148)
    t.piece(bous, V, ombre=0)
    t.peindre(t.ell(5, 133, 17, 145), B)
    t.peindre(t.poly([(11, 134), (13, 139), (11, 144), (9, 139)]), N)
    t.peindre(t.poly([(11, 134), (13, 139), (9, 139)]), V)
    t.point(11, 139, B)
    # la jambe avant, qui marche
    j1 = t.fuseau([(92, 116), (102, 132), (108, 148)], 13, 11)
    t.piece(j1, V, ombre=2)
    t.peindre(t.trait([(96, 122), (104, 140)]), N)
    t.peindre(t.rect(98, 136, 116, 138) & j1, B)
    b1 = t.poly([(100, 146), (116, 146), (128, 152), (128, 159), (98, 159)])
    t.piece(b1, B, ombre=2)
    t.peindre(t.rect(98, 157, 128, 159), V)
    for x in (104, 108, 112):
        t.peindre(t.trait([(x, 147), (x + 2, 151)]), V)
    # le corps : veste de voyage à poches, ceinturon
    torse = t.poly([(76, 72), (106, 70), (112, 96), (110, 122), (74, 122), (70, 98)])
    t.piece(torse, V, ombre=3)
    for (x0, y0) in ((78, 90), (96, 90)):
        pq = t.rect(x0, y0, x0 + 12, y0 + 12)
        t.piece(pq, B, ombre=0)
        t.peindre(t.rect(x0, y0, x0 + 12, y0 + 3), V)
        t.point(x0 + 6, y0 + 2, B)
    t.peindre(t.courbe([(92, 74), (92, 120)]), N)
    ceint = t.poly([(72, 110), (110, 108), (110, 114), (72, 116)])
    t.piece(ceint, V, ombre=0, lumiere=False)
    t.damier(ceint, N)
    t.piece(t.rect(88, 107, 96, 117), B, ombre=0)
    t.peindre(t.rect(90, 110, 94, 114), N)
    # les bretelles du sac sur les épaules, la main qui en tient une
    t.peindre(t.trait([(80, 70), (78, 106)], 4), B)
    t.peindre(t.trait([(80, 72), (78, 104)]) & ((t.yy % 3) == 0), V)
    # le foulard noué au cou
    fl = t.poly([(80, 66), (104, 64), (98, 76), (92, 80), (84, 76)])
    t.piece(fl, B, ombre=0)
    t.peindre(t.trait([(82, 70), (100, 68)]) & ((t.xx % 3) == 0), V)
    t.piece(t.fuseau([(92, 76), (96, 84), (100, 88)], 4, 2), B, ombre=0)
    # le bras du fond, qui tient la bretelle
    bras2 = t.fuseau([(78, 76), (70, 90), (76, 98)], 10, 8)
    t.piece(bras2, V, ombre=2)
    poing(t, 72, 88, 84, 100, 2)
    # le bras tendu qui déplie la carte
    bras = t.fuseau([(104, 76), (118, 84), (128, 80)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.trait([(112, 80), (116, 86)]) & bras, N)
    # la carte des deux continents, pliée en accordéon
    carte = t.poly([(122, 62), (174, 58), (174, 110), (124, 114)])
    t.piece(carte, B, ombre=0)
    for x in (139, 156):
        t.peindre(t.trait([(x, 61), (x + 1, 112)]), N)
        t.damier(t.rect(x + 1, 61, x + 3, 112) & carte, V)
    c1 = t.poly([(128, 70), (140, 66), (146, 74), (142, 86), (148, 96), (136, 102), (128, 92)])
    c2 = t.poly([(156, 70), (168, 66), (172, 80), (166, 92), (170, 102), (158, 104), (154, 88)])
    for c in (c1, c2):
        t.piece(c, V, ombre=0, lumiere=False)
        t.damier(t.bord(c, 1, 1, 2), N)
    for (x, y) in [(146, 80), (149, 88), (146, 96)]:
        t.peindre(t.courbe([(x, y), (x + 2, y - 2), (x + 4, y), (x + 6, y - 2)]), V)
    t.peindre(t.trait([(140, 84), (158, 80)]) & ((t.xx % 3) == 0), N)
    texte(t, 126, 104, "amd64", N, 1)
    texte(t, 152, 106, "arm64", N, 1)
    t.etoile(150, 66, V, 1)
    poing(t, 118, 76, 130, 90, 3)
    # la tête, tournée vers la carte
    o = t.ell(76, 44, 86, 60)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(79, 47), (82, 52), (79, 57)]), N)
    tete = t.ell(78, 26, 118, 72)
    t.piece(tete, B, ombre=0)
    # les cheveux sous le chapeau, sur la nuque
    t.piece(t.fuseau([(80, 34), (78, 42), (81, 48)], 6, 2), V, ombre=0, lumiere=False)
    # sourcils joyeux, regard sur la carte
    t.piece(t.fuseau([(90, 41), (95, 38), (101, 39)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(104, 39), (109, 37), (114, 39)], 3, 2), V, ombre=0)
    t.oeil(90, 43, l=11, h=8, regard=(3, 1))
    t.oeil(104, 43, l=10, h=8, regard=(3, 1))
    t.damier(t.poly([(112, 52), (116, 58), (113, 60)]), V)
    t.peindre(t.courbe([(110, 50), (112, 56), (109, 60), (113, 61), (116, 60)], 2), N)
    t.pixels(94, 61, """
:.............:
.:::::::::::::.
.:ooooooooooo:.
..:::::::::::..
...::#####::...
.....:::::.....
""")
    for (x, y) in [(90, 56), (92, 57), (91, 58)]:
        t.point(x, y, V)
    # le chapeau d'explorateur à large bord
    cal = t.poly([(82, 10), (90, 4), (112, 4), (118, 12), (120, 30), (80, 32)])
    t.piece(cal, V, ombre=3)
    t.peindre(t.courbe([(96, 6), (98, 14), (96, 20)]), N)
    band = t.poly([(80, 22), (120, 20), (120, 28), (80, 30)])
    t.piece(band, B, ombre=0)
    t.peindre(t.trait([(82, 26), (118, 24)]) & ((t.xx % 4) < 2), V)
    t.piece(t.fuseau([(110, 18), (116, 8), (122, 2)], 4, 1), B, ombre=0)
    bord = t.fuseau([(66, 32), (84, 27), (104, 26), (124, 26), (136, 22)], 5, 4)
    t.piece(bord, V, ombre=0)
    t.peindre(t.courbe([(70, 31), (90, 28), (120, 26), (132, 23)]), B)
    t.sol(161, cx=86, l=72)
    return t.image()


# ------------------------------------------------------------------ Idrissa, le relecteur de plans

def idrissa():
    """Lunettes relevées sur le front, crayon sur l'oreille, le nez dans une liste de règles si longue qu'elle se
    déroule jusqu'au sol et s'enroule à ses pieds ; il coche les cases une à une, très appliqué."""
    t = Toile()
    # la longue liste qui se déroule jusqu'au sol et s'enroule
    liste = t.poly([(104, 40), (146, 36), (150, 70), (140, 104), (148, 136), (144, 150), (108, 152), (114, 124),
                    (104, 92), (110, 66)])
    t.piece(liste, B, ombre=3)
    rouleau = t.ell(100, 140, 124, 160)
    t.piece(rouleau, B, ombre=2)
    t.peindre(t.courbe([(112, 144), (106, 150), (112, 156), (118, 150), (112, 147)]), N)
    t.peindre(t.courbe([(106, 106), (112, 96), (110, 84)]) | t.courbe([(140, 108), (146, 120), (142, 132)]), N)
    regles = [("dl3008", True), ("dl3009", True), ("dl3025", False)]
    texte(t, 112, 41, "hadolint", V, 1)
    t.peindre(t.trait([(112, 48), (142, 47)]) & ((t.xx % 2) == 0), V)
    for k, (code, ok) in enumerate(regles):
        y = 52 + k * 11
        x = 112 + (2 if k % 2 else 0)
        if ok is None:
            texte(t, x, y, code, V, 1)
            continue
        t.peindre(t.rect(x, y, x + 6, y + 6) & ~t.rect(x + 1, y + 1, x + 5, y + 5), N)
        if ok:
            t.peindre(t.trait([(x + 1, y + 3), (x + 3, y + 5), (x + 8, y - 2)], 2), V)
        texte(t, x + 10, y + 1, code, N, 1)
    for k in range(5):
        y = 92 + k * 10
        x = 116 + int(6 * math.sin(k * 0.9))
        t.peindre(t.rect(x, y, x + 4, y + 4) & ~t.rect(x + 1, y + 1, x + 3, y + 3), N)
        t.peindre(t.trait([(x + 7, y + 2), (x + 22, y + 2)]) & ((t.xx % 2) == 0), V)
    # les jambes, les chaussures
    for (x, d) in ((70, -2), (88, 2)):
        j = t.poly([(x, 116), (x + 14, 116), (x + 14 + d, 150), (x + d, 150)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([(x + 4, 120), (x + 4 + d, 148)]), N)
        ch = t.poly([(x - 2 + d, 148), (x + 14 + d, 148), (x + 22 + d, 153), (x + 22 + d, 159), (x - 4 + d, 159)])
        t.piece(ch, B, ombre=2)
        t.peindre(t.rect(x - 4 + d, 157, x + 22 + d, 159), V)
    # la chemise blanche et le gilet sans manches à losanges
    chem = t.poly([(68, 74), (104, 72), (110, 96), (106, 120), (68, 120), (62, 96)])
    t.piece(chem, B, ombre=2)
    gil = t.poly([(70, 82), (82, 78), (88, 92), (94, 78), (104, 80), (106, 120), (68, 120)])
    t.piece(gil, V, ombre=3)
    for y in range(90, 118, 8):
        for x in range(72, 106, 8):
            o = (4 if (y // 8) % 2 else 0)
            t.peindre(t.poly([(x + o, y - 3), (x + o + 3, y), (x + o, y + 3), (x + o - 3, y)]) & gil &
                      ~t.bord(gil, 1, 0, 3), N)
            t.point(x + o, y, B)
    t.peindre(t.trait([(68, 114), (106, 114)]) & ((t.xx % 2) == 0), B)
    col = t.poly([(76, 70), (88, 80), (100, 70), (98, 76), (88, 84), (78, 76)])
    t.piece(col, B, ombre=0)
    # le bras du fond, qui tient le haut de la liste
    bras2 = t.fuseau([(70, 80), (80, 64), (100, 50)], 11, 8)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.courbe([(74, 76), (82, 64)]), V)
    poing(t, 96, 38, 110, 54, 3)
    # le bras de devant, qui coche au crayon
    bras = t.fuseau([(102, 78), (104, 94), (106, 90)], 11, 9)
    t.piece(bras, B, ombre=2)
    t.peindre(t.trait([(100, 84), (104, 92)], 2), V)
    crayon = t.trait([(104, 86), (113, 76)], 3)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.trait([(106, 84), (112, 77)]), V)
    t.peindre(t.trait([(113, 76), (114, 75)], 2), N)
    poing(t, 100, 82, 112, 96, 3)
    # la tête, penchée sur la liste
    o = t.ell(62, 44, 72, 60)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(65, 47), (68, 52), (65, 57)]), N)
    tete = t.ell(64, 26, 104, 74)
    t.piece(tete, B, ombre=0)
    # les cheveux ras, frisés serré
    chev = (t.ell(62, 18, 104, 46) | t.ell(60, 28, 72, 50)) & ~t.poly([(70, 40), (104, 36), (104, 60), (70, 60)])
    t.piece(chev, V, ombre=2, lumiere=False)
    for (x, y) in [(66, 24), (74, 21), (82, 20), (90, 20), (98, 23), (70, 30), (78, 27), (86, 26), (94, 27),
                   (64, 36), (66, 44)]:
        t.peindre(t.courbe([(x + 2, y), (x, y - 1), (x - 1, y + 1), (x + 1, y + 2)]), N)
    # le crayon sur l'oreille
    cr2 = t.trait([(56, 44), (74, 38)], 3)
    t.piece(cr2, B, ombre=0)
    t.peindre(t.trait([(60, 43), (72, 39)]), V)
    t.peindre(t.trait([(56, 44), (57, 44)], 2), N)
    # les lunettes relevées sur le front
    for x in (72, 88):
        v = t.ell(x, 28, x + 12, 37)
        t.peindre(v, B)
        t.peindre(t.ell(x - 1, 27, x + 13, 38) & ~v, N)
        t.peindre(t.trait([(x + 3, 30), (x + 5, 30)]), V)
    t.peindre(t.courbe([(84, 32), (86, 30), (88, 32)]), N)
    # sourcil levé d'application, regard sur la liste
    t.piece(t.fuseau([(74, 41), (79, 40), (84, 41)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(88, 41), (94, 38), (99, 40)], 3, 2), V, ombre=0)
    t.oeil(74, 45, l=11, h=8, regard=(3, 1), paupiere=3)
    t.oeil(89, 44, l=11, h=8, regard=(3, 1), paupiere=3)
    t.damier(t.poly([(98, 54), (102, 60), (99, 62)]), V)
    t.peindre(t.courbe([(96, 52), (98, 58), (95, 62), (99, 63), (102, 62)], 2), N)
    # la bouche appliquée, le bout de la langue au coin
    t.pixels(82, 64, """
:.........:
.:::::::::.
..:oooo#::.
...:::##:..
.......:...
""")
    for (x, y) in [(72, 58), (74, 59), (73, 60)]:
        t.point(x, y, V)
    t.etincelle(160, 20)
    t.etoile(152, 32, B, 1)
    t.sol(161, cx=96, l=70)
    return t.image()


# ------------------------------------------------------------------ Neil, le vieux marin de la Capitainerie

def neil():
    """Assis sur un tonneau, voûté, casquette de capitaine fatiguée, grande barbe blanche ; la lanterne pend au
    bout d'un bras, la grosse clé de sa vieille cabine posée sur le genou."""
    t = Toile()
    # le tonneau
    ton = t.poly([(46, 116), (110, 116), (116, 138), (110, 160), (46, 160), (40, 138)])
    t.piece(ton, B, ombre=4)
    for x in (58, 70, 82, 94):
        t.peindre(t.courbe([(x, 117), (x - 2 + (x - 78) // 8, 138), (x, 159)]), V)
    for y in (122, 152):
        cer = t.poly([(42, y), (114, y), (114, y + 4), (42, y + 4)]) & ton
        t.piece(cer, V, ombre=0, lumiere=False)
        t.peindre(t.trait([(44, y + 2), (112, y + 2)]) & ((t.xx % 6) == 0), B)
    t.peindre(t.rect(40, 159, 116, 160), N)
    # le bras qui pend et la lanterne au bout
    bras2 = t.fuseau([(58, 78), (44, 96), (36, 112)], 12, 10)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(32, 110), (42, 114)], 4)
    for k in range(12):
        a = k * math.pi / 6
        r0, r1 = 20, (28 if k % 2 == 0 else 24)
        if -0.3 < math.sin(a) and math.cos(a) > 0.3:
            continue
        cx, cy = 26, 136
        t.peindre(t.trait([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
                           (cx + r1 * math.cos(a), cy + r1 * math.sin(a))]), B)
    t.peindre(t.ell(28, 112, 38, 122) & ~t.ell(30, 114, 36, 120), V)
    poing(t, 30, 108, 42, 120, 2)
    toit = t.poly([(16, 124), (26, 118), (36, 124), (34, 128), (18, 128)])
    t.piece(toit, V, ombre=0)
    lant = t.rect(16, 128, 36, 150)
    t.piece(lant, V, ombre=0, lumiere=False)
    t.peindre(t.rect(19, 130, 24, 147) | t.rect(28, 130, 33, 147), B)
    t.peindre(t.ell(22, 133, 30, 146), B)
    t.peindre(t.poly([(26, 134), (29, 140), (26, 144), (23, 140)]), V)
    t.point(26, 139, B)
    t.piece(t.rect(14, 150, 38, 154), V, ombre=0)
    # les jambes : genoux en avant, bottes de mer
    for (y, xg) in ((116, 128), (124, 140)):
        cu = t.fuseau([(84, y), (110, y), (xg, y + 2)], 16, 14) | t.ell(xg - 9, y - 6, xg + 7, y + 10)
        t.piece(cu, V, ombre=3)
        t.peindre(t.courbe([(100, y - 2), (112, y - 3), (xg - 4, y - 2)]), B)
    for (x, d) in ((124, 0), (136, 8)):
        mol = t.fuseau([(x + 2, 118 + d), (x + 2, 134), (x + 1, 148)], 15, 12)
        t.piece(mol, V, ombre=2)
        t.peindre(t.courbe([(x - 2, 124 + d), (x - 3, 134), (x - 2, 142)]), N)
        bt = t.poly([(x - 6, 146), (x + 8, 146), (x + 18, 152), (x + 18, 159), (x - 6, 159)])
        t.piece(bt, B, ombre=2)
        t.peindre(t.rect(x - 6, 157, x + 18, 159), V)
        t.peindre(t.trait([(x - 4, 150), (x + 6, 149)]) & ((t.xx % 2) == 0), V)
    # le caban, dos rond
    cab = t.poly([(54, 72), (92, 66), (110, 82), (112, 112), (100, 128), (56, 128), (46, 104), (46, 84)])
    t.piece(cab, V, ombre=4)
    t.peindre(t.courbe([(54, 82), (50, 100), (54, 124)]), N)
    t.peindre(t.courbe([(62, 90), (60, 106), (64, 122)]), N)
    poche = t.poly([(58, 106), (74, 104), (74, 109), (58, 111)])
    t.piece(poche, B, ombre=0)
    t.peindre(t.trait([(60, 108), (72, 106)]) & ((t.xx % 2) == 0), V)
    t.peindre(t.trait([(48, 124), (100, 124)]) & ((t.xx % 3) != 0), B)
    for (x, y) in [(82, 104), (96, 102), (82, 116), (96, 114)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    # le bras de devant, la main posée sur le genou qui tient la grosse clé
    bras = t.fuseau([(96, 80), (106, 100), (118, 112)], 12, 10)
    t.piece(bras, V, ombre=2)
    manchette(t, [(114, 108), (120, 114)], 4)
    # la grosse clé de la vieille cabine
    anneau = t.ell(100, 102, 116, 118) & ~t.ell(104, 106, 112, 114)
    tige = t.rect(114, 108, 158, 112)
    dents = t.rect(150, 112, 154, 120) | t.rect(144, 112, 147, 118) | t.rect(156, 112, 158, 116)
    t.piece(anneau | tige | dents, B, ombre=0)
    t.peindre(t.rect(116, 110, 156, 110) & ((t.xx % 3) == 0), V)
    t.etincelle(162, 102)
    poing(t, 116, 104, 130, 118, 3)
    # la tête, la grande barbe blanche
    tete = t.ell(60, 30, 104, 80)
    t.piece(tete, B, ombre=0)
    o = t.ell(98, 48, 108, 64)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(104, 51), (101, 56), (104, 61)]), N)
    barbe = (t.ell(56, 50, 106, 100) & t.rect(0, 60, 176, 170)) | t.fuseau([(80, 96), (78, 106), (84, 112)], 18, 2)
    barbe &= ~t.ell(68, 50, 96, 76)
    t.piece(barbe, B, ombre=3)
    for pts in ([(64, 70), (66, 84), (72, 94)], [(74, 80), (76, 92), (78, 102)], [(88, 80), (88, 92), (86, 102)],
                [(98, 70), (98, 82), (94, 94)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(80, 104), (84, 110), (80, 110)]), N)
    # la moustache, la bouche douce
    m1 = t.piece(t.fuseau([(80, 72), (72, 74), (64, 72)], 7, 2), B, ombre=0)
    m2 = t.piece(t.fuseau([(82, 72), (90, 74), (98, 72)], 7, 2), B, ombre=0)
    t.peindre(t.courbe([(78, 73), (70, 74)]) & m1, V)
    t.peindre(t.courbe([(84, 73), (92, 74)]) & m2, V)
    t.pixels(74, 78, """
:.........:
.:::::::::.
..:ooooo:..
...:::::...
""")
    # le gros nez rond, les yeux plissés et bienveillants
    nez = t.ell(76, 58, 88, 70)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(79, 68, N); t.point(84, 68, N)
    t.piece(t.fuseau([(62, 48), (68, 44), (78, 47)], 5, 3), V, ombre=0)
    t.piece(t.fuseau([(86, 47), (94, 44), (100, 47)], 3, 5), V, ombre=0)
    t.oeil(66, 50, l=11, h=8, regard=(3, 1), paupiere=2)
    t.oeil(86, 50, l=11, h=8, regard=(3, 1), paupiere=2)
    for (x, sx) in ((64, -1), (98, 1)):
        t.peindre(t.trait([(x, 55), (x + 3 * sx, 53)]) | t.trait([(x, 58), (x + 3 * sx, 59)]), N)
    # la vieille casquette de capitaine, molle et inclinée
    cal = t.poly([(54, 28), (66, 14), (100, 12), (114, 24), (108, 38), (58, 40)])
    t.piece(cal, V, ombre=3)
    t.peindre(t.courbe([(62, 24), (82, 18), (106, 22)]), N)
    t.peindre(t.courbe([(70, 20), (84, 16), (96, 16)]), B)
    band = t.poly([(58, 34), (108, 32), (108, 40), (58, 42)])
    t.piece(band, B, ombre=0)
    t.peindre(t.trait([(60, 38), (106, 36)]) & (((t.xx) % 4) < 2), V)
    t.pixels(80, 24, """
..:o:..
.:o#o:.
..:o:..
""")
    vis = t.poly([(56, 40), (90, 40), (96, 44), (60, 46), (50, 44)])
    t.piece(vis, V, ombre=0, lumiere=False)
    t.peindre(t.trait([(56, 41), (90, 41)]), B)
    t.sol(161, cx=88, l=74)
    return t.image()


PORTRAITS = {
    "item_kylian.gif": kylian, "item_megane.gif": megane, "item_jahmal.gif": jahmal,
    "item_remi.gif": remi, "item_soufiane.gif": soufiane, "item_mina.gif": mina,
    "item_ronan.gif": ronan, "item_idrissa.gif": idrissa, "item_neil.gif": neil,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        finir(nom, PORTRAITS[nom]())
    print("ok lot 9 :", ", ".join(noms))
