"""Portraits v3, lot 4 : les douze maîtres du Bastion (chapitre 5) et deux habitants de ses tours (le Sergent de la
Herse, la Sentinelle de la Tour de Guet), redessinés sur la grille fine de 2 px (voir portrait_v3.py).

Usage : python3 outils/portraits_v3_4.py [item_x.gif ...]   (sans argument : les quatorze portraits du lot)
Les anciens dessins restent dans dessiner_bastion.py (maîtres) et dessiner_habitants.py (habitants).
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import finir, N, V, B, W, H  # noqa: E402
from portrait_v3 import Toile, texte, eroder, dilater  # noqa: E402


def dilater_(t, m, k=1):
    return dilater(m, k)


def eroder_(t, m, k=1):
    return eroder(m, k)


# ------------------------------------------------------------------ petites aides communes
def poing(t, x0, y0, x1, y1, doigts=3, sens=1):
    """Un poing fermé : ellipse blanche liserée, des traits de doigts (sens 1 : doigts vers la droite)."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    h = (y1 - y0)
    for k in range(doigts):
        y = y0 + 3 + k * max(2, (h - 5) // doigts)
        if sens > 0:
            t.peindre(t.trait([(x0 + (x1 - x0) // 2, y), (x1 - 1, y)]), N)
        else:
            t.peindre(t.trait([(x0 + 1, y), (x0 + (x1 - x0) // 2, y)]), N)
    return m


def nez(t, pts, narine=None):
    """Un nez blanc : liseré, ombre en damier vert du côté droit et dessous, une narine."""
    m = t.poly(pts)
    t.piece(m, B, ombre=0)
    t.damier(t.bord(m, 1, 0, 2) | t.bord(m, 0, 1, 1), V)
    if narine:
        t.point(narine[0], narine[1], N); t.point(narine[0] + 1, narine[1], N)
    return m


def oreille(t, x0, y0, x1, y1, gauche=False):
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    cx = (x0 + x1) // 2
    if gauche:
        t.peindre(t.courbe([(cx + 1, y0 + 3), (cx - 2, (y0 + y1) // 2), (cx + 1, y1 - 3)]), N)
    else:
        t.peindre(t.courbe([(cx - 1, y0 + 3), (cx + 2, (y0 + y1) // 2), (cx - 1, y1 - 3)]), N)
    return m


def sourcil(t, pts, e0, e1, c=V):
    return t.piece(t.fuseau(pts, e0, e1), c, ombre=0, lumiere=False)


def botte(t, x, y_sol, l=22, h=12, vers=1):
    """Une botte verte tramée de noir (une forme noire disparaîtrait sur le fond), reflet blanc, semelle."""
    if vers > 0:
        pts = [(x, y_sol - h), (x + l - 8, y_sol - h), (x + l - 6, y_sol - 5), (x + l, y_sol - 3), (x + l, y_sol),
               (x, y_sol)]
    else:
        pts = [(x + 8, y_sol - h), (x + l, y_sol - h), (x + l, y_sol), (x, y_sol), (x, y_sol - 3), (x + 6, y_sol - 5)]
    m = t.poly(pts)
    t.piece(m, V, ombre=0)
    t.damier(m & t.rect(0, y_sol - h + 2, W, y_sol - 2) & ~t.bord(m, -1, -1, 1), N)
    t.peindre(t.rect(x, y_sol - 1, x + l, y_sol), B)
    xr = x + 11 if vers > 0 else x + l - 4
    t.peindre(t.trait([(xr, y_sol - h + 2), (xr, y_sol - 4)]) & m, B)
    return m


def cercle(t, x0, y0, x1, y1, ep=1):
    return t.ell(x0, y0, x1, y1) & ~t.ell(x0 + ep, y0 + ep, x1 - ep, y1 - ep)


# ------------------------------------------------------------------ Fernando, la Herse des Comptes
def fernando_v3():
    """Le gardien des comptes, vieux et tout voûté sous sa calotte, la barbe en pointe : il plisse les yeux sur la
    liste des comptes, si longue qu'elle se déroule jusqu'au sol ; un gros trousseau pend à sa ceinture."""
    t = Toile()
    # la liste des comptes : le rouleau du haut, la feuille qui pend, le rouleau couché au sol
    feuille = t.poly([(124, 42), (156, 42), (158, 70), (154, 100), (158, 128), (156, 142), (124, 142), (128, 112),
                      (122, 80), (126, 60)])
    t.piece(feuille, B, ombre=2)
    lignes = ["root:x:0", "daemon", "bin:x:2", "sys:x:3", "lp:x:7", "sshd", "games", "nobody", "backup", "mail"]
    for i, s in enumerate(lignes):
        y = 48 + i * 9
        x = 128 + (2 if i % 3 == 1 else 0)
        texte(t, x, y, s[:7], V)
    t.piece(t.ell(114, 138, 168, 160) & t.rect(0, 140, W, 160), B, ombre=2)
    t.peindre(cercle(t, 150, 141, 166, 157), N)
    t.peindre(t.courbe([(156, 145), (162, 149), (157, 153), (154, 149)]), V)
    for x in range(120, 150, 6):
        t.peindre(t.trait([(x, 146), (x + 3, 146)]) | t.trait([(x, 151), (x + 2, 151)]), V)
    haut = t.rect(118, 34, 162, 44)
    t.piece(haut, B, ombre=2)
    t.piece(t.rect(114, 32, 120, 46), V, ombre=0)
    t.piece(t.rect(160, 32, 166, 46), V, ombre=0)
    t.peindre(t.trait([(122, 41), (158, 41)]), V)
    # le corps voûté : la grande robe, le dos rond qui fait une bosse derrière la tête
    robe = t.poly([(46, 70), (60, 60), (76, 62), (96, 74), (108, 92), (112, 150), (104, 156), (34, 156), (28, 132),
                   (28, 104), (34, 84)])
    t.piece(robe, V, ombre=4)
    t.peindre(t.courbe([(40, 76), (50, 66), (62, 63)]) & robe, B)
    for pts in ([(70, 116), (62, 136), (58, 146)], [(84, 118), (82, 136), (82, 146)], [(98, 116), (102, 134), (104, 146)],
                [(42, 84), (34, 106), (34, 128)], [(52, 80), (46, 98)]):
        t.peindre(t.courbe(pts, 1), N)
    for (x, y) in [(42, 100), (54, 126), (94, 132), (72, 138), (38, 138), (48, 76)]:
        t.etoile(x, y, B, 1)
    ourlet = robe & t.rect(0, 147, W, 156)
    t.peindre(ourlet, B)
    t.peindre(robe & t.rect(0, 147, W, 147), N)
    for x in range(34, 108, 6):
        t.peindre(t.trait([(x, 155), (x + 3, 150), (x + 6, 155)]) & ourlet, V)
    # le galon blanc du devant, brodé de petites clés
    galon = robe & t.poly([(76, 112), (92, 112), (96, 147), (72, 147)])
    t.piece(galon, B, ombre=0)
    for y in range(118, 144, 8):
        t.pixels(80, y, """
.##..
#..####
.##.#.#
""")
    # la ceinture et le gros trousseau
    ceint = robe & t.rect(0, 110, W, 115)
    t.peindre(ceint, N)
    t.piece(t.rect(66, 110, 74, 115), B, ombre=0)
    t.peindre(t.rect(68, 112, 72, 113), N)
    anneau = cercle(t, 44, 108, 62, 126, 2)
    t.contour(anneau, N); t.peindre(anneau, B)
    for (x, y, a) in [(45, 124, -3), (54, 127, 0), (63, 124, 3)]:
        tige = t.trait([(x, y), (x + a, y + 18)], 2)
        t.piece(tige, B, ombre=0, lumiere=False)
        dents = t.rect(x + a, y + 12, x + a + 5, y + 13) | t.rect(x + a, y + 16, x + a + 4, y + 18)
        t.piece(dents, B, ombre=0, lumiere=False)
        arc = cercle(t, x - 4, y - 5, x + 4, y + 3, 2)
        t.contour(arc, N); t.peindre(arc, B)
    # les babouches pointues
    for (x, l) in [(40, 22), (80, 24)]:
        p = t.poly([(x, 156), (x + l - 6, 153), (x + l + 6, 150), (x + l + 2, 158), (x, 160)])
        t.piece(p, V, ombre=0)
        t.peindre(t.rect(x, 159, x + l, 160), B)
        t.damier(p & t.rect(0, 156, W, 157), N)
    # le bras du fond qui tient le rouleau du haut
    bras2 = t.fuseau([(102, 84), (120, 66), (118, 46)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.piece(t.poly([(112, 42), (124, 42), (124, 50), (112, 50)]), B, ombre=0)
    t.peindre(t.trait([(114, 46), (122, 46)]) & ((t.xx % 2) == 0), V)
    poing(t, 112, 28, 126, 44, sens=1)
    # le col de fourrure blanche
    col = t.poly([(58, 76), (68, 70), (100, 70), (108, 80), (102, 88), (62, 88)])
    t.piece(col, B, ombre=2)
    for x in range(62, 104, 5):
        t.peindre(t.courbe([(x, 80), (x + 2, 83), (x + 1, 86)]), V)
    # le bras de devant, le doigt qui suit les lignes
    bras = t.fuseau([(68, 88), (84, 104), (106, 98)], 13, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(74, 94), (84, 100), (94, 100)]) & bras, N)
    manch = t.poly([(102, 90), (110, 90), (112, 106), (104, 106)])
    t.piece(manch, B, ombre=0)
    t.peindre(t.trait([(106, 92), (108, 104)]) & ((t.yy % 2) == 0), V)
    main = t.ell(110, 92, 122, 106)
    t.piece(main, B, ombre=0)
    doigt = t.fuseau([(118, 96), (124, 95), (130, 94)], 4, 3)
    t.piece(doigt, B, ombre=0)
    t.peindre(t.trait([(113, 100), (119, 100)]) | t.trait([(113, 103), (118, 103)]), N)
    # les cheveux blancs qui dépassent derrière l'oreille
    for pts in ([(62, 50), (52, 54), (48, 64)], [(62, 58), (54, 64), (52, 72)], [(64, 44), (56, 44), (50, 50)]):
        t.piece(t.fuseau(pts, 6, 1), B, ombre=0)
    # la tête penchée en avant vers la liste
    oreille(t, 58, 50, 68, 66, gauche=True)
    tete = t.ell(62, 32, 106, 80)
    t.piece(tete, B, ombre=0)
    for y in (42, 45):
        t.peindre(t.courbe([(78, y), (88, y - 1), (98, y)]), N)
    # la calotte
    cal = t.ell(62, 20, 102, 48) & t.rect(0, 0, W, 38)
    t.piece(cal, V, ombre=2)
    t.peindre(t.courbe([(66, 34), (82, 30), (100, 34)]) & cal, N)
    t.piece(t.rect(62, 35, 104, 39) & t.ell(56, 18, 108, 56), B, ombre=0)
    t.peindre(t.trait([(64, 37), (102, 37)]) & ((t.xx % 3) == 0), V)
    t.piece(t.ell(80, 16, 86, 22), B, ombre=0)
    # la barbe en pointe, blanche sur la robe verte : elle part des joues
    barbe = t.poly([(66, 62), (72, 72), (82, 80), (96, 80), (104, 72), (108, 62), (108, 80), (102, 96), (94, 108),
                    (90, 120), (86, 108), (78, 98), (68, 82)])
    t.piece(barbe, B, ombre=2)
    for pts in ([(76, 84), (82, 96), (87, 108)], [(92, 88), (92, 100), (90, 112)], [(102, 82), (99, 94)]):
        t.peindre(t.courbe(pts), V)
    t.peindre(t.courbe([(88, 112), (86, 118), (91, 120), (92, 116)]), N)
    t.damier(t.bord(barbe, 1, 0, 2) & eroder_(t, barbe), V)
    # les sourcils en auvent, broussailleux
    sourcil(t, [(72, 50), (78, 46), (87, 48)], 3, 5)
    sourcil(t, [(91, 48), (98, 45), (106, 48)], 5, 3)
    t.peindre(t.trait([(105, 47), (108, 45)]) | t.trait([(70, 48), (73, 49)]), V)
    # les yeux plissés vers la liste, les poches dessous
    t.oeil(75, 52, l=11, h=8, regard=(2, 1), paupiere=3)
    t.oeil(92, 52, l=11, h=8, regard=(2, 1), paupiere=3)
    t.peindre(t.courbe([(76, 62), (80, 64), (85, 62)]) | t.courbe([(93, 62), (97, 64), (102, 62)]), N)
    t.peindre(t.trait([(71, 54), (74, 55)]) | t.trait([(71, 57), (74, 57)]), N)
    # le nez en patate
    nz = t.ell(84, 61, 98, 75)
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 3) | t.bord(nz, 0, 1, 2), V)
    t.peindre(t.rect(86, 64, 87, 65), B)
    t.peindre(t.rect(87, 72, 88, 72) | t.rect(93, 72, 94, 72), N)
    # la moustache tombante, la bouche pincée
    m1 = t.piece(t.fuseau([(90, 74), (82, 76), (76, 82), (74, 90)], 6, 2), B, ombre=0)
    m2 = t.piece(t.fuseau([(92, 74), (99, 76), (104, 82), (105, 90)], 6, 2), B, ombre=0)
    t.peindre(t.courbe([(88, 76), (81, 79), (77, 86)]) & m1, V)
    t.peindre(t.courbe([(94, 76), (100, 79), (103, 86)]) & m2, V)
    t.pixels(87, 79, """
.:::::.
:#####:
.:::::.
""")
    t.etoile(150, 22, B, 2); t.etoile(140, 14, B, 1)
    t.sol(160, cx=96)
    return t.image()


# ------------------------------------------------------------------ Butler, le Sceau du Roi
def butler_v3():
    """Le chancelier du Sceau du Roi, le nez en l'air sous sa haute toque, longue robe à bande verte : il brandit le
    grand sceau comme un marteau de juge, un rouleau scellé sous le bras."""
    t = Toile()
    # la robe longue, blanche, évasée
    robe = t.poly([(80, 82), (114, 82), (124, 110), (134, 156), (60, 156), (70, 110)])
    t.piece(robe, B, ombre=4)
    for pts in ([(80, 112), (74, 134), (70, 154)], [(116, 112), (122, 134), (126, 154)], [(84, 120), (82, 154)]):
        t.peindre(t.courbe(pts), N)
    bande = robe & t.poly([(90, 82), (104, 82), (110, 156), (84, 156)])
    t.piece(bande, V, ombre=2)
    for y in range(100, 152, 10):
        t.etoile(97, y, B, 2)
        t.point(97, y, N)
    ourlet = robe & t.rect(0, 150, W, 156)
    t.peindre(ourlet & ~bande, V)
    t.damier(ourlet & ~bande & t.rect(0, 150, W, 151), N)
    t.peindre(robe & t.rect(0, 149, W, 149), N)
    # les souliers à boucle
    for (x, v) in [(70, -1), (110, 1)]:
        sl = t.poly([(x, 152), (x + 16, 152), (x + 16 + 4 * v, 160), (x - 4 * (v < 0) * 2, 160)])
        t.piece(sl, V, ombre=0)
        t.damier(sl & t.rect(0, 155, W, 157), N)
        t.piece(t.rect(x + 6, 153, x + 10, 156), B, ombre=0)
        t.peindre(t.rect(x - 8, 159, x + 22, 160) & dilater_(t, sl, 2), B)
    # la ceinture
    t.peindre(robe & t.rect(0, 108, W, 112), N)
    t.piece(t.ell(92, 105, 102, 115), B, ombre=0)
    t.peindre(t.ell(95, 108, 99, 112), V)
    # le bras droit (à droite) qui serre le rouleau scellé sous l'aisselle
    bras2 = t.fuseau([(114, 88), (126, 104), (116, 118)], 13, 10)
    t.piece(bras2, V, ombre=2)
    rouleau = t.poly([(100, 96), (150, 92), (152, 104), (102, 108)])
    t.piece(rouleau, B, ombre=2)
    t.piece(t.ell(146, 91, 156, 105), B, ombre=0)
    t.peindre(t.ell(149, 95, 153, 101), V)
    t.peindre(t.trait([(106, 100), (146, 97)]) & ((t.xx % 4) != 0), V)
    t.piece(t.fuseau([(116, 116), (122, 108), (126, 104)], 12, 12), V, ombre=2)
    t.piece(t.rect(124, 102, 130, 116), B, ombre=0)
    poing(t, 118, 110, 132, 124, sens=-1)
    # le ruban et le cachet de cire qui pendent du rouleau
    for pts in ([(138, 104), (136, 116), (132, 126)], [(140, 104), (144, 116), (146, 126)]):
        t.piece(t.fuseau(pts, 4, 3), V, ombre=0)
    cachet = t.ell(130, 108, 148, 126)
    t.piece(cachet, V, ombre=2)
    t.peindre(cercle(t, 133, 111, 145, 123), N)
    texte(t, 136, 112, "#", B)
    # la pèlerine d'hermine
    cape = t.poly([(72, 84), (84, 76), (110, 76), (122, 84), (124, 98), (100, 104), (94, 104), (70, 98)])
    t.piece(cape, B, ombre=2)
    for (x, y) in [(78, 88), (88, 94), (100, 90), (112, 94), (118, 88), (82, 98), (106, 99)]:
        t.pixels(x - 1, y - 1, """
.:.
:::
.:.
.:.
""")
    # le bras levé qui brandit le grand sceau
    bras = t.fuseau([(78, 90), (62, 74), (54, 54)], 13, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(66, 80), (60, 70)]) & bras, N)
    manchette = t.poly([(46, 52), (62, 50), (64, 58), (48, 60)])
    t.piece(manchette, B, ombre=0)
    t.peindre(t.trait([(48, 56), (62, 54)]) & ((t.xx % 2) == 0), V)
    manche = t.trait([(54, 46), (52, 18)], 4)
    t.piece(manche, V, ombre=0)
    t.peindre(t.trait([(52, 44), (51, 20)]), B)
    poing(t, 46, 36, 62, 52, doigts=3, sens=1)
    tete_sceau = t.poly([(28, 4), (70, 2), (72, 22), (30, 24)])
    t.piece(tete_sceau, V, ombre=3)
    for x in (38, 60):
        t.peindre(t.trait([(x, 3), (x, 23)], 2), B)
        t.peindre(t.trait([(x + 2, 3), (x + 2, 23)]), N)
    face = t.ell(20, 2, 34, 26)
    t.piece(face, B, ombre=2)
    t.peindre(cercle(t, 22, 5, 32, 23), V)
    texte(t, 24, 9, "#", N, 2)
    for (x, y) in [(10, 8), (14, 26), (8, 18)]:
        t.peindre(t.trait([(x, y), (x + 6, y)]), B)
    t.etincelle(80, 8)
    # la perruque bouclée qui encadre le visage
    perruque = t.ell(72, 46, 92, 70) | t.ell(70, 60, 90, 84) | t.ell(110, 46, 130, 70) | t.ell(112, 60, 132, 84)
    t.piece(perruque, V, ombre=2)
    for (x, y) in [(74, 52), (76, 64), (74, 74), (116, 52), (118, 64), (120, 74), (82, 80), (110, 80)]:
        t.peindre(t.courbe([(x, y + 4), (x + 2, y), (x + 6, y + 2), (x + 4, y + 6), (x + 2, y + 4)]), N)
    for (x, y) in [(78, 58), (116, 58), (114, 70)]:
        t.peindre(t.rect(x, y, x + 1, y + 1), B)
    # la tête, menton levé, le nez en l'air
    tete = t.ell(80, 40, 122, 84)
    t.piece(tete, B, ombre=0)
    t.damier(t.ell(84, 68, 90, 72) | t.ell(112, 68, 118, 72), V)
    # les sourcils hautains, très relevés
    sourcil(t, [(83, 51), (89, 46), (97, 48)], 2, 4)
    sourcil(t, [(105, 48), (112, 46), (120, 50)], 4, 2)
    # les yeux mi-clos, qui regardent de haut
    t.oeil(84, 56, l=12, h=9, regard=(0, 1), paupiere=3)
    t.oeil(106, 56, l=12, h=9, regard=(0, 1), paupiere=3)
    t.peindre(t.trait([(82, 57), (86, 55)]) | t.trait([(117, 55), (120, 57)]), N)
    # le nez retroussé pointé vers le ciel : on voit les narines
    nz = t.poly([(98, 60), (101, 60), (103, 66), (106, 65), (106, 71), (101, 74), (96, 73), (95, 69)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 2) & t.rect(0, 66, W, 74), V)
    t.peindre(t.rect(98, 71, 99, 72) | t.rect(103, 70, 104, 71), N)
    # le sourire satisfait, un coin relevé
    t.pixels(95, 76, """
...........:
::::::::::.
.:oooooo:..
..:####:...
...::::....
""")
    # la haute toque
    toque = t.poly([(80, 44), (84, 12), (92, 6), (116, 8), (124, 16), (122, 44)])
    t.piece(toque, V, ombre=3)
    t.peindre(t.courbe([(90, 12), (92, 28), (90, 42)]) | t.courbe([(104, 10), (106, 26), (104, 42)]), N)
    t.piece(t.rect(80, 36, 122, 43), B, ombre=0)
    t.peindre(t.rect(82, 39, 120, 40) & ((t.xx % 4) < 2), V)
    t.piece(t.ell(96, 2, 104, 10), B, ombre=0)
    t.sol(160, cx=96)
    return t.image()


# ------------------------------------------------------------------ Tatu, le Pont-levis
def tatu_v3():
    """Le passeur du Pont-levis, cheveux en épis, l'écharpe qui vole au vent : il marche à grands pas, la grosse clé
    au bout de sa chaîne qui se balance."""
    t = Toile()
    # l'écharpe qui vole derrière lui
    for (pts, e) in [([(84, 66), (60, 54), (40, 64), (14, 50)], 12), ([(84, 70), (64, 76), (44, 70), (24, 80)], 9)]:
        f = t.fuseau(pts, e, e - 4)
        t.piece(f, B, ombre=2)
        t.rayures(f & ~t.bord(f, -1, -1, 1), V, 7, 3, vertical=True)
    for (x, y) in [(12, 46), (14, 54), (22, 78), (24, 84)]:
        t.peindre(t.trait([(x, y), (x - 6, y + 1)]), B)
    # la jambe arrière, tendue, sur la pointe du pied
    cuisse2 = t.fuseau([(90, 106), (80, 120), (72, 132)], 13, 10)
    t.piece(cuisse2, B, ombre=2)
    mollet2 = t.fuseau([(72, 132), (64, 142), (56, 148)], 10, 8)
    t.piece(mollet2, B, ombre=2)
    b2 = t.poly([(44, 142), (58, 140), (62, 150), (52, 158), (40, 156)])
    t.piece(b2, V, ombre=0)
    t.damier(b2 & ~t.bord(b2, -1, -1, 1), N)
    t.peindre(t.trait([(42, 156), (52, 157)]), B)
    t.peindre(t.trait([(46, 144), (56, 142)]), B)
    # le bras arrière, qui balance
    bras2 = t.fuseau([(86, 74), (74, 90), (64, 98)], 11, 8)
    t.piece(bras2, V, ombre=2)
    poing(t, 54, 92, 66, 104, sens=-1)
    # le pourpoint
    torse = t.poly([(82, 66), (110, 66), (118, 90), (114, 110), (84, 110), (80, 90)])
    t.piece(torse, V, ombre=3)
    for (x, y) in [(90, 80), (104, 80), (97, 90), (90, 100), (104, 100)]:
        t.peindre(t.poly([(x, y - 4), (x + 3, y), (x, y + 4), (x - 3, y)]), B)
        t.point(x, y, N)
    t.peindre(t.rect(80, 104, 118, 109) & torse, N)
    t.piece(t.rect(94, 103, 102, 110), B, ombre=0)
    t.peindre(t.rect(96, 105, 100, 108), V)
    # la jambe avant, en grande enjambée
    cuisse = t.fuseau([(104, 108), (116, 118), (124, 128)], 13, 10)
    t.piece(cuisse, B, ombre=2)
    mollet = t.fuseau([(124, 128), (126, 140), (128, 148)], 10, 9)
    t.piece(mollet, B, ombre=2)
    b1 = t.poly([(118, 144), (134, 144), (144, 152), (144, 158), (118, 158)])
    t.piece(b1, V, ombre=0)
    t.damier(b1 & t.rect(0, 147, W, 156), N)
    t.peindre(t.rect(118, 157, 144, 158), B)
    t.peindre(t.trait([(122, 147), (132, 147)]), B)
    t.peindre(t.rect(118, 143, 135, 144), B)
    # le bras avant, tendu, qui fait tournoyer la clé
    bras = t.fuseau([(106, 72), (120, 84), (132, 80)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.poly([(126, 74), (132, 74), (134, 86), (128, 86)]), B, ombre=0)
    # la chaîne et la grosse clé
    for i, (x, y) in enumerate([(140, 82), (145, 88), (149, 94), (152, 100)]):
        maillon = cercle(t, x - 3, y - 2, x + 3, y + 3) if i % 2 == 0 else cercle(t, x - 2, y - 3, x + 2, y + 3)
        t.contour(maillon, N); t.peindre(maillon, B)
    anneau = cercle(t, 144, 102, 166, 122, 3)
    t.piece(anneau, V, ombre=0)
    t.peindre(cercle(t, 148, 106, 162, 118), B)
    t.peindre(t.ell(153, 110, 157, 114), V)
    tige = t.rect(153, 122, 157, 152)
    t.piece(tige, V, ombre=0)
    t.peindre(t.rect(154, 124, 154, 150), B)
    for (y, l) in [(140, 8), (146, 6), (150, 9)]:
        t.piece(t.rect(157, y, 157 + l, y + 2), V, ombre=0)
    for (x0, y0, x1, y1) in [(168, 100, 172, 92), (170, 112, 174, 110), (138, 128, 132, 134), (166, 126, 172, 130)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    poing(t, 130, 74, 144, 88, sens=1)
    # le cou et la tête
    tete = t.ell(80, 24, 120, 70)
    oreille(t, 78, 44, 88, 58, gauche=True)
    t.piece(tete, B, ombre=0)
    # les cheveux en épis
    cheveux = t.ell(80, 20, 120, 44) & ~t.ell(84, 34, 124, 70)
    for pts in ([(86, 30), (78, 18), (70, 12)], [(92, 26), (88, 12), (84, 2)], [(100, 24), (100, 10), (104, 0)],
                [(108, 26), (114, 14), (122, 8)], [(114, 30), (124, 24), (132, 22)], [(84, 36), (74, 32), (66, 34)]):
        cheveux |= t.fuseau(pts, 9, 1)
    cheveux &= ~(t.ell(86, 36, 124, 70) & t.rect(0, 40, W, H))
    t.piece(cheveux, V, ombre=2)
    for pts in ([(92, 30), (88, 20)], [(102, 28), (102, 16)], [(110, 30), (116, 20)]):
        t.peindre(t.courbe(pts), N)
    # les sourcils décidés
    sourcil(t, [(89, 41), (95, 40), (101, 43)], 2, 4)
    sourcil(t, [(106, 43), (111, 40), (117, 40)], 4, 2)
    t.oeil(90, 44, l=11, h=9, regard=(2, 0))
    t.oeil(106, 44, l=10, h=9, regard=(2, 0))
    # le nez qui fend le vent
    nz = t.poly([(104, 51), (106, 51), (111, 56), (112, 59), (104, 60), (101, 58)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 0, 1, 1), V)
    t.point(106, 58, N)
    # le grand sourire
    t.pixels(92, 60, """
:...............
.:::::::::::::::
.:ooooooooooooo:
..:###########:.
...:::::::::::..
""")
    t.peindre(t.trait([(106, 66), (102, 67)]), N)
    t.damier(t.ell(84, 54, 91, 59), V)
    t.peindre(t.trait([(117, 46), (119, 45)]) | t.trait([(117, 49), (119, 49)]), N)
    # le nœud de l'écharpe autour du cou
    noeud = t.poly([(82, 64), (110, 66), (112, 74), (84, 74)])
    t.piece(noeud, B, ombre=2)
    t.rayures(noeud & ~t.bord(noeud, -1, -1, 1), V, 7, 3, vertical=True)
    k = t.ell(80, 66, 90, 78)
    t.piece(k, B, ombre=0)
    t.peindre(t.ell(83, 69, 87, 75), V)
    t.sol(160, cx=94)
    return t.image()


# ------------------------------------------------------------------ Jean, les Portes condamnées
def jean_v3():
    """Le menuisier des Portes condamnées, casquette, crayon sur l'oreille et des clous entre les dents : le marteau
    levé en plein élan, une planche sous le bras, le tablier à outils ; il avance d'un grand pas vers la porte."""
    t = Toile()
    # la jambe arrière, tendue, et la jambe avant qui avance
    j2 = t.fuseau([(82, 118), (74, 136), (66, 150)], 15, 12)
    t.piece(j2, V, ombre=2)
    t.peindre(t.courbe([(76, 130), (72, 140)]), N)
    j1 = t.fuseau([(100, 118), (114, 132), (118, 150)], 15, 12)
    t.piece(j1, V, ombre=2)
    t.peindre(t.courbe([(108, 126), (114, 132), (118, 130)]), N)
    botte(t, 48, 159, l=28, h=12, vers=-1)
    botte(t, 106, 159, l=28, h=12, vers=1)
    # le torse trapu, chemise à carreaux
    torse = t.poly([(72, 74), (112, 72), (120, 94), (114, 122), (72, 122), (64, 96)])
    t.piece(torse, V, ombre=3)
    t.rayures(torse & ~t.bord(torse, -1, -1, 1), N, 7, 1, vertical=True)
    t.rayures(torse & ~t.bord(torse, -1, -1, 1), N, 7, 1, vertical=False)
    # le tablier de cuir blanc : la bavette, les poches, les outils
    tab = t.poly([(78, 86), (106, 86), (112, 138), (72, 138)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.courbe([(78, 86), (76, 80), (80, 74)]) | t.courbe([(106, 86), (108, 80), (104, 74)]), N)
    t.peindre(t.rect(64, 108, 120, 111) & (torse | tab), N)
    t.piece(t.rect(86, 107, 94, 112), B, ombre=0)
    t.peindre(t.rect(88, 109, 92, 110), N)
    poche = t.poly([(78, 116), (106, 116), (107, 132), (77, 132)])
    t.contour(poche, N)
    t.peindre(t.trait([(92, 116), (92, 132)]), N)
    # le tournevis et le mètre pliant dans les poches
    t.piece(t.rect(82, 104, 84, 117), V, ombre=0)
    t.piece(t.poly([(80, 96), (86, 96), (86, 104), (80, 104)]), B, ombre=0)
    t.peindre(t.rect(82, 97, 84, 103), V)
    metre = t.poly([(96, 100), (102, 100), (102, 117), (96, 117)])
    t.piece(metre, V, ombre=0)
    for y in range(102, 116, 3):
        t.peindre(t.rect(97, y, 99, y), B)
    t.peindre(t.courbe([(80, 134), (92, 136), (104, 134)]), V)
    # la planche serrée sous le bras droit
    planche = t.poly([(98, 92), (166, 76), (170, 92), (102, 108)])
    t.piece(planche, B, ombre=2)
    for pts in ([(112, 97), (132, 91), (152, 86), (166, 82)], [(108, 103), (128, 98), (148, 93), (167, 88)]):
        t.peindre(t.courbe(pts), V)
    t.peindre(cercle(t, 136, 90, 146, 96), V)
    bout = t.poly([(166, 76), (172, 78), (176, 94), (170, 92)])
    t.piece(bout, V, ombre=0)
    t.peindre(t.courbe([(170, 82), (173, 86), (171, 90)]), N)
    for x in (152, 158):
        t.peindre(t.rect(x, 82, x, 87) | t.rect(x - 1, 81, x + 1, 81), N)
    bras2 = t.fuseau([(110, 78), (122, 94), (116, 108)], 12, 10)
    t.piece(bras2, V, ombre=2)
    t.peindre(t.courbe([(116, 86), (120, 94)]) & bras2, N)
    t.piece(t.poly([(108, 100), (118, 100), (118, 106), (108, 106)]), B, ombre=0)
    poing(t, 102, 100, 116, 112, sens=-1)
    # le bras levé en plein élan, le marteau au-dessus de la tête
    bras = t.fuseau([(74, 80), (56, 66), (50, 46)], 13, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(64, 74), (56, 64)]) & bras, N)
    t.piece(t.poly([(42, 44), (58, 42), (60, 50), (44, 52)]), B, ombre=0)
    t.peindre(t.trait([(45, 48), (58, 46)]) & ((t.xx % 2) == 0), V)
    manche = t.trait([(48, 40), (36, 10)], 5)
    t.piece(manche, B, ombre=0)
    t.peindre(t.trait([(46, 36), (38, 14)]), V)
    poing(t, 40, 28, 56, 44, doigts=3, sens=1)
    tete_m = t.poly([(20, 14), (44, 2), (50, 12), (26, 24)])
    t.piece(tete_m, V, ombre=2)
    t.piece(t.poly([(42, 2), (46, 0), (52, 10), (48, 13)]), B, ombre=0)
    pied_biche = t.fuseau([(24, 20), (14, 22), (8, 30)], 6, 2)
    t.piece(pied_biche, V, ombre=0)
    t.peindre(t.trait([(20, 20), (12, 25)]), N)
    for pts in ([(56, 2), (64, 10)], [(4, 6), (14, 2)], [(60, 18), (66, 24)]):
        t.peindre(t.courbe(pts), B)
    t.peindre(t.courbe([(30, 36), (20, 34), (12, 40)]) & ((t.xx % 3) != 0), B)
    # l'oreille droite et le crayon coincé derrière
    oreille(t, 110, 48, 122, 66)
    crayon = t.fuseau([(110, 36), (118, 50), (124, 66)], 5, 4)
    t.piece(crayon, B, ombre=0, lumiere=False)
    t.peindre(t.courbe([(112, 38), (119, 50), (123, 62)]), V)
    t.piece(t.poly([(121, 64), (127, 63), (126, 72)]), V, ombre=0)
    # la tête, large et bonhomme
    tete = t.ell(66, 26, 116, 84)
    t.piece(tete, B, ombre=0)
    for pts in ([(68, 42), (67, 54)], [(113, 42), (114, 52)]):
        t.piece(t.trait(pts, 3), V, ombre=0, lumiere=False)
    # les sourcils levés vers le marteau, l'œil qui vise
    sourcil(t, [(72, 46), (79, 42), (88, 44)], 3, 4)
    sourcil(t, [(94, 44), (102, 42), (110, 45)], 4, 3)
    t.oeil(74, 48, l=13, h=10, regard=(-3, -2))
    t.oeil(95, 48, l=13, h=10, regard=(-3, -2))
    t.peindre(t.trait([(110, 52), (113, 51)]) | t.trait([(110, 55), (113, 55)]), N)
    # le gros nez rond
    nz = t.ell(86, 55, 100, 68)
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 3) | t.bord(nz, 0, 1, 2), V)
    t.peindre(t.rect(89, 58, 90, 59), B)
    t.peindre(t.rect(89, 66, 90, 66) | t.rect(95, 66, 96, 66), N)
    t.damier(t.ell(72, 62, 80, 67), V)
    # le grand sourire serré sur les clous
    t.pixels(76, 69, """
::.......................::
.:::::::::::::::::::::::::.
.:oooo:oooo:oooo:oooo:ooo:.
.:oooo:oooo:oooo:oooo:ooo:.
..:::::::::::::::::::::::..
..:ooo:oooo:oooo:oooo:oo:..
...:oo:oooo:oooo:oooo:o:...
....:::::::::::::::::::....
""")
    # deux clous serrés au coin des dents, la pointe dedans, la tête dehors (verts sur la joue blanche)
    for (x0, y0, x1, y1) in [(96, 71, 109, 65), (97, 74, 110, 74)]:
        cl = t.trait([(x0, y0), (x1, y1)], 2)
        t.contour(cl, N); t.peindre(cl, V)
        tc = t.rect(x1, y1 - 3, x1 + 2, y1 + 3)
        t.contour(tc, N); t.peindre(tc, V)
        t.point(x1 + 1, y1 - 2, B)
    # la casquette, visière sur le côté
    cas = t.ell(66, 14, 116, 50) & t.rect(0, 0, W, 36)
    t.piece(cas, V, ombre=2)
    t.peindre(t.courbe([(92, 16), (90, 26), (92, 36)]) & cas, N)
    t.piece(t.ell(88, 11, 95, 18), V, ombre=0)
    t.piece(t.rect(66, 34, 116, 38) & t.ell(60, 12, 122, 60), B, ombre=0)
    visiere = t.poly([(106, 34), (128, 30), (134, 34), (116, 38)])
    t.piece(visiere, V, ombre=0, lumiere=False)
    t.damier(visiere & ~t.bord(visiere, -1, -1, 1), N)
    t.peindre(t.trait([(110, 35), (128, 32)]), B)
    t.sol(160, cx=92)
    return t.image()

FLEUR = """
..o.o..
.ooooo.
ooo:ooo
.ooooo.
..o.o..
"""


# ------------------------------------------------------------------ Vint, les Remparts
def vint_v3():
    """Vint, l'administrateur réseau tout juste rentré de vacances : lunettes de soleil vertes, le nez qui pèle, barbe
    courte, chemise à fleurs, le casque autour du cou ; la truelle levée, une brique dans l'autre main."""
    t = Toile()
    # les jambes nues et les sandales
    for (x0, x1, dx) in [(72, 84, -4), (94, 106, 4)]:
        j = t.poly([(x0, 130), (x1, 130), (x1 + dx // 2, 152), (x0 + dx // 2, 152)])
        t.piece(j, B, ombre=2)
        t.peindre(t.courbe([(x0 + 3, 140), (x0 + 6, 142)]), N)
    for (x, l) in [(62, 24), (94, 24)]:
        sd = t.poly([(x, 154), (x + l, 154), (x + l + 2, 160), (x - 2, 160)])
        t.piece(sd, V, ombre=0)
        t.peindre(t.rect(x - 2, 159, x + l + 2, 160), B)
        t.peindre(t.trait([(x + 6, 154), (x + 10, 148), (x + 16, 154)], 2), V)
        for k in range(4):
            t.peindre(t.rect(x + 4 + k * 5, 152, x + 6 + k * 5, 154), B)
            t.contour(t.rect(x + 4 + k * 5, 152, x + 6 + k * 5, 154), N)
    # le bermuda rayé
    berm = t.poly([(66, 112), (112, 112), (114, 134), (92, 134), (89, 122), (86, 134), (64, 134)])
    t.piece(berm, B, ombre=2)
    t.rayures(berm & ~t.bord(berm, -1, -1, 1), V, 6, 2, vertical=True)
    t.peindre(t.trait([(89, 114), (89, 126)]), N)
    # la chemise à fleurs, ouverte au col
    torse = t.poly([(68, 74), (108, 74), (116, 92), (114, 118), (64, 118), (60, 92)])
    t.piece(torse, V, ombre=3)
    for (x, y) in [(70, 96), (82, 104), (98, 100), (106, 110), (72, 112), (104, 86), (90, 114)]:
        t.pixels(x - 3, y - 2, FLEUR)
    t.peindre(t.trait([(88, 86), (88, 118)]), N)
    for y in (94, 104, 114):
        t.peindre(t.ell(90, y - 1, 92, y + 1), B)
    col = t.poly([(76, 72), (88, 86), (100, 72), (104, 76), (90, 92), (86, 92), (72, 76)])
    t.piece(col, B, ombre=0)
    t.peindre(t.poly([(80, 74), (96, 74), (88, 84)]), B)
    t.damier(t.poly([(80, 74), (96, 74), (88, 84)]) & ~t.rect(0, 0, W, 76), V)
    # le bras qui tient la brique, en avant
    bras2 = t.fuseau([(66, 80), (56, 96), (50, 108)], 12, 10)
    t.piece(bras2, B, ombre=2)
    t.piece(t.fuseau([(66, 80), (60, 88)], 14, 13), V, ombre=0)
    t.pixels(60, 82, FLEUR)
    dessus = t.poly([(30, 96), (56, 92), (60, 98), (34, 102)])
    face = t.poly([(34, 102), (60, 98), (60, 114), (34, 118)])
    cote = t.poly([(30, 96), (34, 102), (34, 118), (30, 112)])
    t.piece(dessus | face | cote, V, ombre=0)
    t.peindre(dessus, B)
    t.damier(dessus & ~t.bord(dessus, -1, -1, 1), V)
    t.peindre(t.trait([(34, 102), (60, 98)]) | t.trait([(34, 102), (34, 118)]), N)
    t.damier(cote, N)
    t.peindre(t.trait([(37, 106), (44, 105)]) | t.trait([(38, 111), (42, 110)]), B)
    poing(t, 44, 104, 58, 118, sens=-1)
    # le bras levé et la truelle
    bras = t.fuseau([(108, 80), (124, 70), (130, 52)], 12, 10)
    t.piece(bras, B, ombre=2)
    t.piece(t.fuseau([(108, 80), (116, 74)], 14, 13), V, ombre=0)
    t.peindre(t.courbe([(122, 66), (127, 58)]), N)
    manche = t.trait([(132, 44), (138, 30)], 4)
    t.piece(manche, V, ombre=0)
    t.peindre(t.trait([(140, 30), (146, 24)], 2), N)
    lame = t.poly([(140, 30), (148, 4), (172, 2), (154, 30)])
    t.piece(lame, B, ombre=2)
    t.peindre(t.trait([(144, 27), (152, 8)]), V)
    mortier = t.ell(150, 14, 168, 24) & lame
    t.peindre(mortier, V)
    t.damier(mortier, N)
    goutte = t.ell(156, 30, 162, 38)
    t.piece(goutte, V, ombre=0)
    poing(t, 124, 40, 138, 54, sens=1)
    # le casque autour du cou
    arceau = t.courbe([(70, 80), (66, 70), (74, 66)], 3) | t.courbe([(106, 80), (110, 70), (102, 66)], 3)
    t.piece(arceau, V, ombre=0, lumiere=False)
    for (x0, x1) in [(64, 74), (102, 112)]:
        e = t.ell(x0, 74, x1, 86)
        t.piece(e, V, ombre=2)
        t.peindre(t.ell(x0 + 3, 77, x1 - 3, 85), B)
        t.peindre(t.ell(x0 + 5, 79, x1 - 5, 83), N)
    # la tête
    oreille(t, 62, 46, 72, 62, gauche=True)
    oreille(t, 104, 46, 114, 62)
    tete = t.ell(66, 22, 110, 74)
    t.piece(tete, B, ombre=0)
    # les cheveux en bataille, décolorés par le soleil
    ch = t.ell(66, 14, 110, 40) & ~t.ell(70, 26, 106, 80)
    for pts in ([(80, 22), (74, 12), (66, 10)], [(90, 20), (92, 8), (98, 4)], [(100, 22), (108, 14), (114, 16)]):
        ch |= t.fuseau(pts, 8, 1)
    t.piece(ch, V, ombre=2)
    t.peindre(t.courbe([(78, 24), (84, 30)]) | t.courbe([(96, 24), (92, 30)]), N)
    # la barbe courte
    barbe = t.ell(66, 44, 110, 82) & ~t.ell(72, 36, 104, 76) & t.rect(0, 54, W, H)
    t.piece(barbe, V, ombre=2)
    t.trame(barbe & ~t.bord(barbe, -1, -1, 1), N, 0.25)
    # les lunettes de soleil vertes, un reflet
    for x in (70, 90):
        v = t.poly([(x, 42), (x + 16, 42), (x + 15, 50), (x + 10, 54), (x + 3, 53), (x, 48)])
        t.piece(v, V, ombre=0, lumiere=False)
        t.peindre(t.trait([(x + 3, 51), (x + 8, 44)]) | t.trait([(x + 7, 51), (x + 11, 45)]), B)
    t.peindre(t.trait([(86, 44), (90, 44)], 2), N)
    t.peindre(t.trait([(70, 43), (64, 46)], 2) | t.trait([(106, 43), (112, 46)], 2), N)
    sourcil(t, [(72, 37), (78, 34), (85, 36)], 2, 3)
    sourcil(t, [(91, 36), (98, 33), (104, 35)], 3, 2)
    # le nez coup de soleil qui pèle
    nz = t.poly([(86, 52), (90, 52), (94, 60), (93, 64), (85, 64), (84, 60)])
    t.piece(nz, B, ombre=0)
    t.damier(nz & ~t.bord(nz, -1, -1, 1) & t.rect(0, 54, W, 62), V)
    t.peindre(t.rect(87, 56, 88, 57) | t.rect(90, 59, 91, 59), B)
    t.point(87, 63, N); t.point(91, 63, N)
    # le grand sourire de vacancier
    t.pixels(78, 65, """
:................:
.::::::::::::::::.
.:oooooooooooooo:.
..:::::::::::::::.
...:##########:...
....::::::::::....
""")
    # le soleil des vacances, encore dans la tête
    t.etincelle(30, 30); t.etincelle(46, 16); t.etoile(20, 52, B, 1)
    t.sol(160, cx=88)
    return t.image()


def petite_cle(t, x, y, c=V, l=12):
    """Une petite clé pendue, anneau en haut en (x, y)."""
    a = cercle(t, x - 3, y, x + 3, y + 6)
    t.contour(a, N); t.peindre(a, c)
    tg = t.rect(x, y + 6, x + 1, y + l)
    t.contour(tg, N); t.peindre(tg, c)
    d = t.rect(x + 2, y + l - 3, x + 3, y + l - 2) | t.rect(x + 2, y + l, x + 4, y + l)
    t.peindre(d, c)


# ------------------------------------------------------------------ Evelyn, la Salle des Coffres
def evelyn_v3():
    """La gardienne des Coffres, haut chignon piqué d'une clé, robe à ceinture de clés : elle brandit un gros cadenas
    d'un air soupçonneux, un petit coffre ferré sous le bras."""
    t = Toile()
    # la jupe longue, en cloche
    jupe = t.poly([(70, 104), (104, 104), (122, 140), (126, 156), (48, 156), (52, 140)])
    t.piece(jupe, B, ombre=4)
    for pts in ([(80, 108), (70, 132), (62, 154)], [(92, 108), (94, 132), (92, 154)], [(100, 108), (110, 132), (116, 154)]):
        t.peindre(t.courbe(pts), V)
    ourlet = jupe & t.rect(0, 146, W, 156)
    t.peindre(ourlet, V)
    t.peindre(jupe & t.rect(0, 146, W, 146), N)
    for x in range(52, 124, 8):
        t.peindre(t.poly([(x, 151), (x + 3, 148), (x + 6, 151), (x + 3, 154)]), B)
    t.peindre(t.rect(46, 159, 128, 160), N)
    for x in (66, 98):
        p = t.poly([(x, 155), (x + 14, 155), (x + 16, 160), (x - 2, 160)])
        t.piece(p, V, ombre=0)
        t.damier(p & t.rect(0, 157, W, 158), N)
    # le corsage lacé
    corsage = t.poly([(70, 74), (102, 74), (106, 90), (104, 108), (70, 108), (66, 90)])
    t.piece(corsage, V, ombre=3)
    for y in range(82, 104, 5):
        t.peindre(t.trait([(83, y), (89, y + 4)]) | t.trait([(89, y), (83, y + 4)]), B)
    t.peindre(t.rect(85, 80, 87, 104) & ((t.yy % 5) == 0), N)
    t.piece(t.poly([(74, 72), (86, 80), (98, 72), (100, 76), (86, 84), (72, 76)]), B, ombre=0)
    # la ceinture de clés
    ceint = t.rect(66, 104, 108, 108)
    t.piece(ceint, V, ombre=0)
    t.damier(ceint & ~t.bord(ceint, -1, -1, 1), N)
    for i, x in enumerate(range(71, 106, 8)):
        petite_cle(t, x, 108 + (i % 2) * 2, V, 16)
    t.piece(t.rect(84, 103, 90, 109), B, ombre=0)
    # le petit coffre ferré sous le bras
    coffre = t.poly([(26, 98), (62, 94), (64, 120), (28, 124)])
    t.piece(coffre, B, ombre=3)
    couv = t.poly([(26, 98), (62, 94), (60, 86), (30, 88)])
    t.piece(couv, B, ombre=0)
    t.damier(couv & ~t.bord(couv, -1, -1, 1), V)
    for x in (32, 54):
        bnd = t.poly([(x, 88), (x + 4, 88), (x + 5, 122), (x + 1, 122)])
        t.piece(bnd, V, ombre=0)
        for y in (100, 112):
            t.point(x + 2, y, B)
    t.peindre(t.trait([(26, 98), (62, 94)], 2), V)
    t.piece(t.rect(42, 100, 48, 108), V, ombre=0)
    t.peindre(t.rect(44, 103, 45, 106), N)
    bras2 = t.fuseau([(70, 80), (58, 94), (54, 106)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.piece(t.rect(50, 102, 60, 106), B, ombre=0)
    poing(t, 50, 104, 62, 116, sens=-1)
    # le bras levé qui brandit le gros cadenas
    bras = t.fuseau([(102, 80), (118, 72), (126, 50)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.poly([(120, 48), (132, 50), (130, 56), (118, 54)]), B, ombre=0)
    anse = t.ell(128, 10, 158, 46) & ~t.ell(134, 16, 152, 46) & t.rect(0, 0, W, 34)
    t.piece(anse | (t.rect(128, 26, 133, 40)) | t.rect(153, 26, 158, 40), B, ombre=2)
    corps = t.poly([(122, 36), (164, 34), (166, 72), (124, 74)])
    t.piece(corps, V, ombre=3)
    t.piece(t.rect(126, 40, 160, 44), B, ombre=0)
    t.peindre(t.rect(128, 42, 158, 42) & ((t.xx % 3) == 0), V)
    for (x, y) in [(128, 50), (158, 50), (128, 68), (158, 68)]:
        t.piece(t.ell(x - 1, y - 1, x + 2, y + 2), B, ombre=0)
    trou = t.ell(138, 50, 148, 60) | t.poly([(141, 56), (145, 56), (147, 68), (139, 68)])
    t.piece(trou, B, ombre=0)
    t.peindre(t.ell(141, 53, 145, 57) | t.rect(142, 57, 144, 65), N)
    poing(t, 118, 40, 132, 54, sens=1)
    for (x0, y0, x1, y1) in [(166, 20, 172, 14), (168, 32, 174, 32), (118, 22, 112, 16)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # le chignon piqué d'une clé
    chignon = t.ell(70, 4, 100, 30)
    t.piece(chignon, V, ombre=2)
    for pts in ([(74, 18), (80, 10), (90, 8)], [(78, 24), (88, 18), (96, 16)], [(80, 12), (88, 12)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(76, 14), (82, 8)]), B)
    cle = t.trait([(62, 22), (104, 4)], 2)
    t.contour(cle, N); t.peindre(cle, B)
    a = cercle(t, 54, 20, 64, 30, 2)
    t.contour(a, N); t.peindre(a, B)
    t.peindre(t.rect(100, 6, 102, 10) | t.rect(96, 8, 97, 12), B)
    # la tête
    cheveux = t.ell(62, 24, 108, 68)
    t.piece(cheveux, V, ombre=2)
    tete = t.ell(66, 30, 106, 76)
    t.piece(tete, B, ombre=0)
    frange = t.ell(64, 24, 108, 50) & ~t.ell(70, 36, 112, 80) & ~t.ell(60, 36, 98, 80)
    t.piece(frange, V, ombre=0)
    t.peindre(t.courbe([(86, 26), (86, 34), (84, 40)]), N)
    t.peindre(t.courbe([(76, 32), (70, 40)]) | t.courbe([(96, 32), (102, 40)]), B)
    # le regard en coin, soupçonneux : un sourcil levé, l'autre froncé
    sourcil(t, [(70, 46), (76, 44), (83, 47)], 2, 3)
    sourcil(t, [(89, 44), (95, 40), (102, 41)], 3, 2)
    t.oeil(71, 50, l=12, h=8, regard=(3, 0), paupiere=3, cils=-1)
    t.oeil(89, 48, l=12, h=9, regard=(3, 0), paupiere=2, cils=1)
    # le nez fin
    nz = t.poly([(86, 56), (90, 63), (90, 66), (84, 66)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 1) | t.bord(nz, 0, 1, 1), V)
    t.point(86, 65, N)
    # la bouche pincée, de travers
    t.pixels(80, 68, """
..........:
:::::::::..
.:#####:...
..:::::....
""")
    t.damier(t.ell(70, 60, 76, 64) | t.ell(96, 60, 102, 64), V)
    # les boucles d'oreille
    t.piece(t.ell(62, 62, 66, 66), B, ombre=0)
    t.sol(160, cx=88)
    return t.image()


def engrenage(t, cx, cy, r, dents=8, c=V):
    """Un engrenage : couronne dentée, moyeu percé."""
    m = t.ell(cx - r, cy - r, cx + r, cy + r)
    for k in range(dents):
        a = 2 * math.pi * k / dents
        m |= t.trait([(cx + (r - 2) * math.cos(a), cy + (r - 2) * math.sin(a)),
                      (cx + (r + 3) * math.cos(a), cy + (r + 3) * math.sin(a))], 4)
    m &= ~t.ell(cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3)
    t.piece(m, c, ombre=2)
    t.contour(t.ell(cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3) & ~m, N)
    t.peindre(cercle(t, cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3), N)
    return m


# ------------------------------------------------------------------ Edsger, le Cœur
def edsger_v3():
    """Le mécanicien du Cœur, crâne dégarni, lunettes, salopette : penché en avant, la main en cornet derrière l'oreille
    (chut, le cœur bat), la clé à molette dans l'autre, la burette, un engrenage tombé au sol."""
    t = Toile()
    # le battement du cœur qu'il écoute : un tracé de pouls et un gros cœur qui bat
    pouls = t.trait([(0, 34), (10, 34), (14, 28), (18, 34), (22, 34), (26, 8), (31, 54), (35, 24), (38, 34), (44, 34)], 2)
    t.peindre(pouls, B)
    for x in (46, 49):
        t.peindre(t.rect(x, 34, x, 35), B)
    coeur = t.ell(4, 60, 18, 74) | t.ell(16, 60, 30, 74) | t.poly([(5, 70), (29, 70), (17, 86)])
    t.piece(coeur, V, ombre=2)
    t.peindre(t.courbe([(8, 66), (10, 63), (13, 63)], 2), B)
    t.peindre(t.trait([(17, 63), (17, 66)]), N)
    for (x0, y0, x1, y1) in [(0, 58, 3, 61), (34, 56, 30, 60), (34, 72, 38, 72), (0, 80, 4, 78), (30, 84, 34, 88),
                             (17, 52, 17, 55)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # l'engrenage tombé et la burette
    engrenage(t, 20, 148, 10, 8)
    bur = t.poly([(136, 132), (156, 132), (160, 158), (132, 158)])
    t.piece(bur, B, ombre=3)
    t.piece(t.poly([(140, 124), (152, 124), (156, 132), (136, 132)]), V, ombre=0)
    bec = t.fuseau([(152, 126), (162, 112), (170, 104)], 4, 2)
    t.piece(bec, V, ombre=0)
    t.peindre(t.trait([(138, 140), (154, 140)], 2), V)
    t.piece(t.ell(169, 108, 173, 114), V, ombre=0)
    t.piece(t.courbe([(136, 136), (128, 140), (132, 152)], 3), V, ombre=0)
    t.peindre(t.rect(130, 159, 162, 160), B)
    # les jambes fléchies, la salopette
    j2 = t.fuseau([(104, 112), (116, 130), (112, 150)], 15, 12)
    t.piece(j2, V, ombre=3)
    j1 = t.fuseau([(88, 112), (82, 132), (74, 150)], 15, 12)
    t.piece(j1, V, ombre=3)
    for (x, y) in [(80, 140), (110, 138)]:
        t.peindre(t.courbe([(x - 4, y), (x, y + 2), (x + 4, y)]), N)
    botte(t, 58, 159, l=26, h=11, vers=-1)
    botte(t, 104, 159, l=24, h=11, vers=1)
    # le bras du fond, qui pend avec la clé à molette
    bras2 = t.fuseau([(80, 84), (68, 102), (62, 116)], 12, 9)
    t.piece(bras2, B, ombre=2)
    t.piece(t.fuseau([(80, 84), (74, 92)], 14, 13), V, ombre=0)
    cle = t.fuseau([(62, 120), (54, 132), (48, 140)], 7, 6)
    t.piece(cle, B, ombre=2)
    t.peindre(t.courbe([(58, 124), (52, 134)]), V)
    tete_cle = t.ell(36, 136, 54, 154) & ~t.poly([(34, 146), (44, 144), (44, 160), (30, 160)])
    t.piece(tete_cle, B, ombre=2)
    t.peindre(t.ell(44, 142, 48, 146), N)
    t.peindre(t.trait([(49, 136), (52, 142)]), V)
    poing(t, 56, 110, 70, 124, sens=-1)
    # le buste penché, la bavette de la salopette
    torse = t.poly([(70, 82), (102, 74), (116, 90), (112, 116), (80, 118), (70, 100)])
    t.piece(torse, B, ombre=3)
    bav = t.poly([(76, 92), (104, 86), (110, 116), (82, 118)])
    t.piece(bav, V, ombre=3)
    poche = t.poly([(84, 96), (100, 93), (102, 104), (86, 107)])
    t.contour(poche, N)
    t.peindre(t.trait([(85, 96), (100, 93)]), B)
    t.piece(t.rect(90, 88, 92, 96), B, ombre=0, lumiere=False)
    t.piece(t.rect(95, 87, 97, 95), V, ombre=0)
    for (x0, y0, x1, y1) in [(76, 92, 74, 80), (104, 86, 98, 74)]:
        t.piece(t.trait([(x0, y0), (x1, y1)], 4), V, ombre=0)
    for (x, y) in [(77, 91), (103, 86)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
        t.point(x, y, N)
    t.peindre(t.rect(80, 114, 112, 118) & (bav | torse), N)
    # le bras levé, la main en cornet derrière l'oreille
    bras = t.fuseau([(104, 80), (126, 70), (124, 54)], 12, 10)
    t.piece(bras, B, ombre=2)
    t.piece(t.fuseau([(104, 80), (114, 75)], 14, 13), V, ombre=0)
    t.peindre(t.courbe([(124, 66), (124, 58)]), N)
    paume = t.ell(110, 30, 128, 60)
    t.piece(paume, B, ombre=2)
    for k, y in enumerate((32, 39, 46, 53)):
        doigt = t.fuseau([(114, y + 2), (108, y), (104, y + 4)], 6, 4)
        t.piece(doigt, B, ombre=0, lumiere=False)
    pouce = t.fuseau([(118, 58), (110, 62), (104, 60)], 6, 4)
    t.piece(pouce, B, ombre=0, lumiere=False)
    t.peindre(t.courbe([(120, 36), (124, 44), (122, 54)]), V)
    # la tête, penchée en avant vers le battement
    tete = t.ell(42, 22, 100, 80)
    t.piece(tete, B, ombre=0)
    # la couronne de cheveux, en touffes, autour de l'oreille et sur la nuque
    couronne = (t.ell(82, 32, 104, 54) | t.ell(84, 50, 106, 74) | t.ell(88, 40, 108, 64)) & ~t.ell(30, 10, 84, 90)
    couronne |= tete & ~t.ell(30, 10, 84, 90) & t.rect(0, 32, W, 76)
    for y in range(34, 76, 7):
        couronne |= t.ell(78, y, 86, y + 7) & tete
    t.piece(couronne, V, ombre=2)
    for y in range(36, 76, 7):
        t.peindre(t.courbe([(84, y + 1), (82, y + 3), (84, y + 5)]), N)
    for (x, y) in [(98, 36), (101, 48), (100, 62), (90, 70), (92, 40), (96, 68), (104, 56)]:
        t.peindre(t.courbe([(x, y + 4), (x + 2, y), (x + 5, y + 2), (x + 3, y + 5)]), N)
    t.peindre(t.courbe([(88, 36), (92, 34)]), B)
    for pts in ([(46, 44), (40, 48), (42, 56)], [(48, 40), (42, 38), (38, 42)]):
        t.piece(t.fuseau(pts, 5, 1), V, ombre=0, lumiere=False)
    oreille(t, 84, 44, 97, 64)
    t.peindre(t.courbe([(88, 52), (91, 50), (93, 54)]), N)
    # la mèche rebelle sur le crâne lisse et son reflet
    t.piece(t.fuseau([(72, 24), (76, 12), (86, 10), (88, 16)], 4, 1), V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(52, 32), (56, 27), (62, 25)], 2), V)
    t.peindre(t.rect(66, 26, 68, 27), V)
    for y in (31, 34):
        t.peindre(t.courbe([(56, y + 1), (64, y - 1), (74, y + 1)]), N)
    # les sourcils très haussés de l'écoute émerveillée
    sourcil(t, [(50, 41), (55, 36), (63, 37)], 2, 4)
    sourcil(t, [(69, 37), (75, 35), (82, 38)], 4, 2)
    # les grands yeux ronds derrière les lunettes
    t.oeil(52, 45, l=12, h=10, regard=(-2, 0), paupiere=2)
    t.oeil(70, 45, l=12, h=10, regard=(-2, 0), paupiere=2)
    for (x0, x1) in [(48, 67), (66, 85)]:
        t.peindre(cercle(t, x0, 41, x1, 59), N)
        t.peindre(t.trait([(x0 + 3, 54), (x0 + 6, 51)]), V)
    t.peindre(t.trait([(85, 48), (86, 48)]), N)
    # le nez rond
    nz = t.ell(52, 56, 66, 68)
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 2) | t.bord(nz, 0, 1, 1), V)
    t.peindre(t.rect(55, 58, 56, 59), B)
    t.point(56, 66, N); t.point(61, 66, N)
    # la bouche en « o » d'émerveillement, les fossettes
    t.pixels(55, 69, """
..:::::..
.:#####:.
:###o###:
:#######:
:#######:
.:#####:.
..:::::..
""")
    t.peindre(t.courbe([(50, 68), (52, 72)]) | t.courbe([(68, 68), (66, 72)]), N)
    t.sol(160, cx=92)
    return t.image()

def lanterne(t, x, y, rayons=True, exclure=None):
    """Une lanterne à vitres (coin haut gauche du toit en (x, y), 22 x 34 cases) : anneau, toit, vitres, flamme, rayons
    blancs en couronne (sauf dans la zone exclure)."""
    cx, cy = x + 11, y + 20
    if rayons:
        for k in range(16):
            a = k * math.pi / 8
            r0, r1 = 20, (30 if k % 2 == 0 else 25)
            tr = t.trait([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + r1 * math.cos(a), cy + r1 * math.sin(a))])
            if exclure is not None:
                tr &= ~exclure
            t.peindre(tr, B)
    t.peindre(cercle(t, cx - 4, y - 8, cx + 4, y + 1), V)
    toit = t.poly([(x - 1, y + 8), (cx, y), (x + 23, y + 8), (x + 21, y + 11), (x + 1, y + 11)])
    t.piece(toit, V, ombre=0)
    corps = t.rect(x + 1, y + 11, x + 21, y + 30)
    t.piece(corps, V, ombre=0, lumiere=False)
    t.peindre(t.rect(x + 4, y + 13, x + 9, y + 28) | t.rect(x + 13, y + 13, x + 18, y + 28), B)
    t.peindre(t.ell(x + 6, y + 16, x + 16, y + 28), B)
    t.peindre(t.poly([(cx, y + 16), (cx + 3, y + 22), (cx, y + 26), (cx - 3, y + 22)]), V)
    t.point(cx, y + 21, B)
    t.piece(t.rect(x - 1, y + 30, x + 23, y + 33), V, ombre=0)


# ------------------------------------------------------------------ Joan, la Poterne
def joan_v3():
    """La gardienne de la Poterne, accroupie dans sa grande cape à capuche, un cadenas à la ceinture : elle lève sa
    lanterne vers la petite porte basse que personne ne surveille."""
    t = Toile()
    # la petite porte basse, dans son arche de pierre
    arche = t.ell(136, 104, 176, 144) | t.rect(136, 124, 176, 160)
    t.piece(arche, B, ombre=0)
    for (x0, y0, x1, y1) in [(136, 132, 142, 132), (170, 128, 176, 128), (136, 146, 142, 146), (170, 142, 176, 142)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), N)
    porte = t.ell(142, 110, 170, 138) | t.rect(142, 124, 170, 160)
    t.piece(porte, V, ombre=2)
    for x in (149, 156, 163):
        t.peindre(t.trait([(x, 112), (x, 159)]), N)
    t.piece(t.rect(144, 126, 168, 129), B, ombre=0)
    t.piece(t.rect(144, 146, 168, 149), B, ombre=0)
    t.piece(t.ell(150, 134, 156, 140), B, ombre=0)
    t.peindre(t.rect(152, 136, 153, 139), N)
    t.peindre(t.ell(158, 106, 166, 112) & ~arche, B)
    # la grande cape, accroupie : une large pyramide
    cape = t.poly([(80, 46), (104, 46), (122, 96), (138, 156), (22, 156), (40, 100)])
    t.piece(cape, V, ombre=4)
    for pts in ([(68, 96), (52, 128), (40, 154)], [(80, 104), (74, 130), (70, 154)], [(110, 104), (118, 130), (122, 154)],
                [(54, 104), (36, 140)]):
        t.peindre(t.courbe(pts), N)
    bord = cape & t.rect(0, 148, W, 156)
    t.peindre(bord, B)
    t.peindre(cape & t.rect(0, 148, W, 148), N)
    for x in range(26, 136, 7):
        t.peindre(t.rect(x, 151, x + 3, 153), V)
    for (x, y) in [(46, 124), (62, 112), (100, 136), (58, 140), (112, 116), (36, 146)]:
        t.etoile(x, y, B, 1)
    # les genoux et les bottes qui dépassent
    for (x, l) in [(56, 24), (96, 24)]:
        b = t.poly([(x, 152), (x + l - 6, 150), (x + l, 154), (x + l, 160), (x, 160)])
        t.piece(b, V, ombre=0)
        t.damier(b & ~t.bord(b, -1, -1, 1) & t.rect(0, 0, W, 157), N)
        t.peindre(t.rect(x, 159, x + l, 160), B)
    # la ceinture et son cadenas
    t.peindre(cape & t.rect(48, 108, 124, 111), N)
    ouv = cape & t.poly([(84, 88), (90, 88), (94, 148), (80, 148)])
    t.piece(ouv, B, ombre=2)
    for y in range(96, 146, 8):
        t.peindre(t.rect(86, y, 88, y + 1), V)
    anse = cercle(t, 82, 108, 94, 122, 2) & t.rect(0, 0, W, 116)
    t.contour(anse, N); t.peindre(anse, B)
    cad = t.rect(78, 116, 98, 132)
    t.piece(cad, B, ombre=2)
    t.peindre(t.ell(86, 120, 90, 124) | t.rect(87, 124, 88, 128), N)
    broche = t.ell(80, 84, 94, 96)
    t.piece(broche, B, ombre=0)
    t.peindre(t.ell(84, 87, 90, 93), V)
    t.point(86, 89, B)
    # le bras levé, la lanterne tendue vers la porte
    bras = t.fuseau([(106, 90), (124, 74), (128, 52)], 13, 10)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(116, 82), (124, 70)]) & bras, N)
    t.piece(t.poly([(120, 50), (134, 50), (134, 58), (120, 58)]), B, ombre=0)
    t.peindre(t.rect(122, 54, 132, 54) & ((t.xx % 2) == 0), V)
    tete_zone = t.ell(52, 18, 114, 92)
    lanterne(t, 118, 4, exclure=tete_zone | dilater(t.ell(52, 18, 114, 92) & True, 4))
    poing(t, 120, 38, 134, 52, sens=1)
    # la capuche
    capuche = t.ell(54, 20, 112, 92) | t.poly([(76, 24), (92, 6), (100, 22)])
    t.piece(capuche, V, ombre=3)
    t.peindre(t.courbe([(92, 8), (90, 16), (84, 24)]), N)
    doublure = t.ell(60, 30, 106, 88)
    t.piece(doublure, B, ombre=0)
    t.peindre(t.ell(62, 32, 104, 88), N)
    # les mèches et le visage
    cheveux = t.ell(62, 34, 104, 76)
    t.piece(cheveux, V, ombre=0)
    visage = t.ell(66, 40, 102, 84)
    t.piece(visage, B, ombre=0)
    frange = t.ell(64, 34, 104, 52) & ~t.ell(70, 46, 112, 80)
    for pts in ([(70, 40), (66, 52), (66, 62)], [(98, 40), (102, 52), (101, 62)]):
        frange |= t.fuseau(pts, 5, 1)
    t.piece(frange, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(78, 38), (84, 44)]) | t.courbe([(90, 38), (94, 44)]), N)
    # le regard levé vers la lanterne
    sourcil(t, [(70, 52), (76, 49), (82, 50)], 2, 3)
    sourcil(t, [(88, 50), (94, 48), (100, 50)], 3, 2)
    t.oeil(70, 54, l=11, h=9, regard=(2, -1), cils=-1)
    t.oeil(88, 54, l=11, h=9, regard=(2, -1), cils=1)
    nz = t.poly([(85, 60), (89, 67), (88, 70), (83, 70)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 1) | t.bord(nz, 0, 1, 1), V)
    t.point(85, 69, N)
    t.pixels(79, 73, """
:.........:
.:::::::::.
..:#####:..
...:::::...
""")
    t.damier(t.ell(70, 66, 76, 70) | t.ell(94, 66, 100, 70), V)
    t.sol(160, cx=82)
    return t.image()


# ------------------------------------------------------------------ Robert, la Bannière
def robert_v3():
    """Le porte-bannière, petit et fier, le poing sur la hanche : à côté de lui, sur son mât, l'immense bannière
    couverte d'inscriptions qu'il ne faudrait pas montrer, barrée d'une croix."""
    t = Toile()
    # le mât et l'immense bannière
    mat = t.rect(104, 4, 108, 158)
    t.piece(mat, B, ombre=0)
    t.peindre(t.rect(107, 6, 107, 156), V)
    t.piece(t.ell(101, 0, 111, 8), V, ombre=0)
    ban = t.poly([(108, 10), (150, 6), (174, 10), (172, 80), (150, 76), (128, 82), (108, 78)])
    t.piece(ban, B, ombre=3)
    for (y, s_) in [(16, "server:"), (24, "apache"), (32, "2.4.29"), (42, "debian"), (50, "php/7.1"), (60, "openssl"),
                    (68, "1.0.2")]:
        texte(t, 120, y, s_, V)
    for x in range(110, 172, 6):
        t.peindre(t.trait([(x, 78), (x + 3, 82)]), B)
    croix = t.trait([(112, 14), (168, 74)], 5) | t.trait([(168, 14), (112, 74)], 5)
    t.contour(croix & ban, B)
    t.peindre(croix & ban, N)
    t.peindre(t.trait([(112, 14), (168, 74)], 1) & ban, V)
    t.peindre(t.trait([(168, 14), (112, 74)], 1) & ban, V)
    for y in (22, 40, 58):
        t.piece(t.ell(104, y, 112, y + 4), V, ombre=0)
    # les jambes, campées, et les bottes
    for (x0, x1) in [(44, 56), (64, 76)]:
        j = t.poly([(x0, 126), (x1, 126), (x1 + (2 if x0 > 50 else -2), 148), (x0 + (2 if x0 > 50 else -2), 148)])
        t.piece(j, B, ombre=2)
        t.rayures(j & ~t.bord(j, -1, -1, 1), V, 4, 2, vertical=False)
    botte(t, 30, 159, l=26, h=13, vers=-1)
    botte(t, 66, 159, l=26, h=13, vers=1)
    # le torse bombé, la tunique frappée de l'écu
    torse = t.poly([(42, 86), (80, 86), (90, 106), (84, 130), (36, 130), (32, 106)])
    t.piece(torse, V, ombre=3)
    ecu = t.poly([(50, 96), (72, 96), (72, 110), (61, 120), (50, 110)])
    t.piece(ecu, B, ombre=2)
    t.peindre(t.rect(60, 98, 62, 116) | t.rect(52, 104, 70, 106), V)
    t.peindre(t.rect(32, 120, 90, 123) & torse, N)
    t.piece(t.rect(56, 119, 66, 124), B, ombre=0)
    t.peindre(t.rect(59, 121, 63, 122), V)
    for x in range(36, 88, 6):
        t.peindre(t.trait([(x, 128), (x + 3, 128)]), B)
    # le poing sur la hanche
    bras2 = t.fuseau([(42, 92), (26, 104), (36, 118)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.peindre(t.courbe([(30, 102), (28, 108)]), N)
    poing(t, 30, 110, 42, 122, sens=1)
    # le bras qui tient le mât
    bras = t.fuseau([(80, 92), (94, 98), (102, 86)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.piece(t.ell(96, 78, 112, 92), B, ombre=0)
    for y in (82, 85, 88):
        t.peindre(t.trait([(98, y), (103, y)]), N)
    t.piece(t.rect(100, 112, 112, 124) & t.ell(98, 110, 114, 126), B, ombre=0)
    t.peindre(t.trait([(102, 116), (110, 116)]) | t.trait([(102, 120), (110, 120)]), N)
    # la tête, menton levé, très fier
    oreille(t, 34, 56, 44, 72, gauche=True)
    oreille(t, 78, 56, 88, 72)
    tete = t.ell(38, 36, 84, 88)
    t.piece(tete, B, ombre=0)
    cheveux = t.ell(36, 32, 86, 60) & ~t.ell(42, 39, 80, 92)
    t.piece(cheveux, V, ombre=0)
    for (x, y) in [(44, 46), (76, 46)]:
        t.peindre(t.courbe([(x, y), (x + 2, y + 4)]), N)
    # le béret à plume
    beret = t.ell(34, 22, 86, 46) & t.rect(0, 0, W, 40)
    t.piece(beret, V, ombre=2)
    t.piece(t.rect(36, 38, 84, 42) & t.ell(30, 20, 90, 60), B, ombre=0)
    t.peindre(t.trait([(38, 40), (82, 40)]) & ((t.xx % 3) == 0), V)
    plume = t.fuseau([(70, 30), (76, 6), (94, 2), (100, 18)], 10, 2)
    t.piece(plume, B, ombre=0)
    t.peindre(t.courbe([(71, 28), (77, 8), (92, 4), (98, 16)]), V)
    for (x, y, dx, dy) in [(74, 20, -4, -2), (76, 12, -4, -3), (82, 6, -2, -4), (90, 5, 2, -4), (96, 10, 4, -2)]:
        t.peindre(t.trait([(x, y), (x + dx, y + dy)]), N)
    # les sourcils fiers, les yeux mi-clos de contentement
    sourcil(t, [(46, 52), (51, 48), (58, 49)], 2, 3)
    sourcil(t, [(64, 49), (70, 48), (76, 51)], 3, 2)
    t.oeil(47, 55, l=11, h=8, regard=(0, -1), paupiere=3)
    t.oeil(64, 55, l=11, h=8, regard=(0, -1), paupiere=3)
    # le petit nez retroussé
    nz = t.poly([(58, 60), (62, 60), (66, 68), (62, 71), (56, 70)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 1) | t.bord(nz, 0, 1, 1), V)
    t.point(59, 69, N); t.point(63, 69, N)
    # le sourire satisfait
    t.pixels(50, 73, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..::::::::::::..
...:########:...
....::::::::....
""")
    t.damier(t.ell(42, 66, 48, 71) | t.ell(74, 66, 80, 71), V)
    t.etincelle(18, 70); t.etoile(14, 40, B, 1)
    t.sol(160, cx=70)
    return t.image()


# ------------------------------------------------------------------ Katherine, la Tour de Guet
def katherine_v3():
    """La vigie de la Tour de Guet, longs cheveux, assise sur une caisse : l'œil à sa longue-vue, le registre où elle
    écrit tout ouvert sur les genoux."""
    t = Toile()
    # la nuit de guet : quelques étoiles
    for (x, y, n) in [(20, 20, 2), (40, 8, 1), (14, 50, 1), (140, 50, 1), (160, 70, 2), (124, 8, 1)]:
        t.etoile(x, y, B, n)
    # la caisse
    caisse = t.rect(34, 118, 96, 158)
    t.piece(caisse, B, ombre=3)
    for y in (128, 138, 148):
        t.peindre(t.trait([(35, y), (95, y)]), V)
    cad = t.rect(34, 118, 96, 158) & ~t.rect(40, 124, 90, 152)
    t.peindre(cad, V)
    t.peindre(t.trait([(40, 124), (90, 152)], 3) | t.trait([(90, 124), (40, 152)], 3), V)
    for (x, y) in [(37, 121), (93, 121), (37, 155), (93, 155)]:
        t.point(x, y, B)
    t.peindre(t.rect(30, 159, 100, 160), B)
    # les longs cheveux qui tombent dans le dos
    cheveux = t.ell(42, 24, 96, 70) | t.poly([(44, 50), (60, 60), (62, 116), (50, 120), (36, 110), (40, 80)])
    t.piece(cheveux, V, ombre=3)
    for pts in ([(48, 60), (44, 86), (46, 112)], [(54, 62), (52, 90), (56, 114)], [(44, 40), (40, 60), (42, 76)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.courbe([(46, 50), (42, 70), (44, 96)]), B)
    # les jambes repliées, le registre sur les genoux
    cuisse = t.poly([(60, 104), (112, 102), (114, 118), (62, 120)])
    t.piece(cuisse, V, ombre=3)
    for x0 in (98, 110):
        tib = t.poly([(x0, 112), (x0 + 12, 112), (x0 + 14, 148), (x0 + 2, 148)])
        t.piece(tib, B, ombre=2)
        t.rayures(tib & ~t.bord(tib, -1, -1, 1), V, 5, 2, vertical=False)
    botte(t, 96, 159, l=20, h=12, vers=1)
    botte(t, 110, 159, l=22, h=12, vers=1)
    # le buste
    torse = t.poly([(60, 72), (90, 72), (96, 90), (94, 108), (58, 108), (56, 90)])
    t.piece(torse, V, ombre=3)
    t.piece(t.poly([(66, 70), (76, 80), (86, 70), (88, 74), (76, 86), (64, 74)]), B, ombre=0)
    for (x, y) in [(76, 92), (76, 100)]:
        t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
    # le registre ouvert
    reg = t.poly([(62, 96), (90, 92), (118, 96), (118, 110), (90, 108), (62, 112)])
    t.piece(reg, B, ombre=2)
    t.peindre(t.trait([(90, 92), (90, 108)]), N)
    for k in range(4):
        t.peindre(t.trait([(66, 100 + k * 3), (86, 97 + k * 3)]) & ((t.xx % 4) != 0), V)
        t.peindre(t.trait([(94, 97 + k * 3), (114, 99 + k * 3)]) & ((t.xx % 5) != 0), V)
    t.peindre(t.rect(62, 112, 90, 113) & dilater(reg, 1), N)
    # la main qui écrit, la plume
    plume = t.fuseau([(104, 98), (114, 84), (124, 72)], 2, 7)
    t.piece(plume, B, ombre=0)
    t.peindre(t.courbe([(106, 96), (116, 82), (123, 73)]), V)
    for (x, y) in [(116, 82), (119, 78), (121, 75)]:
        t.peindre(t.trait([(x, y), (x + 3, y + 1)]), N)
    bras2 = t.fuseau([(64, 80), (78, 96), (100, 100)], 11, 9)
    t.piece(bras2, V, ombre=2)
    poing(t, 98, 94, 110, 104, sens=1)
    # le bras qui tient la longue-vue
    bras = t.fuseau([(86, 80), (102, 70), (106, 52)], 11, 9)
    t.piece(bras, V, ombre=2)
    lv = [((92, 50), (110, 40), 8), ((108, 42), (136, 26), 10), ((134, 27), (168, 8), 13)]
    for ((x0, y0), (x1, y1), e) in reversed(lv):
        tube = t.trait([(x0, y0), (x1, y1)], e)
        t.piece(tube, B if e != 10 else V, ombre=2)
    for (x, y, e) in [(110, 40, 12), (136, 26, 15)]:
        bague = t.trait([(x - 1, y + 1), (x + 1, y - 1)], e)
        t.piece(bague, V, ombre=0)
    t.peindre(t.ell(162, 2, 174, 14), N)
    t.piece(cercle(t, 162, 2, 174, 14, 2), V, ombre=0)
    t.peindre(t.trait([(140, 22), (164, 9)]), V)
    poing(t, 100, 38, 114, 52, sens=1)
    # la tête, l'œil à la lunette
    tete = t.ell(52, 28, 94, 76)
    t.piece(tete, B, ombre=0)
    frange = t.ell(48, 22, 96, 50) & ~t.ell(58, 36, 104, 84)
    for pts in ([(58, 34), (54, 46), (54, 58)], [(70, 30), (64, 40), (62, 46)]):
        frange |= t.fuseau(pts, 6, 1)
    t.piece(frange, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(76, 28), (70, 36)]) | t.courbe([(86, 30), (82, 38)]), N)
    # l'œil gauche fermé, plissé ; l'autre collé à l'oculaire
    sourcil(t, [(62, 46), (68, 45), (74, 48)], 2, 3)
    t.peindre(t.courbe([(62, 52), (68, 56), (75, 52)], 2), N)
    for (x0, y0, x1, y1) in [(63, 54, 60, 56), (66, 56, 64, 59), (70, 56, 70, 59)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), N)
    sourcil(t, [(80, 42), (86, 40), (92, 42)], 3, 2)
    oc = t.ell(80, 44, 96, 58)
    t.piece(oc, V, ombre=0)
    t.peindre(cercle(t, 82, 46, 94, 56), N)
    t.peindre(t.ell(85, 48, 91, 54), B)
    t.peindre(t.ell(87, 50, 89, 52), V)
    nz = t.poly([(76, 58), (80, 62), (80, 66), (74, 66)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 0, 1, 1), V)
    t.point(76, 65, N)
    t.pixels(68, 68, """
.........:.
.::::::::..
..:####:...
...::::....
""")
    t.damier(t.ell(58, 60, 64, 65), V)
    t.sol(160, cx=84)
    return t.image()


def sceau_cire(t, cx, cy, r, c=V):
    """Un sceau de cire : disque au bord festonné, empreinte en étoile."""
    m = t.ell(cx - r, cy - r, cx + r, cy + r)
    for k in range(8):
        a = k * math.pi / 4
        m |= t.ell(cx + r * math.cos(a) - 2, cy + r * math.sin(a) - 2, cx + r * math.cos(a) + 2, cy + r * math.sin(a) + 2)
    t.piece(m, c, ombre=0, lumiere=False)
    t.peindre(cercle(t, cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2), N if c == V else V)
    t.etoile(cx, cy, B if c == V else V, max(1, r // 3))
    return m


# ------------------------------------------------------------------ Ralph, les Sceaux d'intégrité
def ralph_v3():
    """Le gardien des Sceaux, barbu et massif, une chaîne de sceaux de cire en bandoulière : il appuie son tampon sur
    une caisse cachetée pour comparer l'empreinte."""
    t = Toile()
    # la caisse cachetée
    caisse = t.rect(112, 118, 170, 158)
    t.piece(caisse, B, ombre=3)
    dessus = t.poly([(112, 118), (170, 118), (174, 112), (118, 112)])
    t.piece(dessus, B, ombre=0)
    t.damier(dessus & ~t.bord(dessus, -1, -1, 1), V)
    for x in (116, 164):
        t.piece(t.rect(x, 120, x + 4, 157), V, ombre=0)
    for y in (130, 146):
        t.peindre(t.trait([(121, y), (163, y)]), V)
    sceau_cire(t, 141, 138, 7)
    texte(t, 124, 150, "sha256", V)
    t.peindre(t.rect(108, 159, 176, 160), B)
    # les jambes massives
    for (x0, x1) in [(48, 66), (74, 92)]:
        j = t.poly([(x0, 120), (x1, 120), (x1 + 2, 148), (x0 - 2, 148)])
        t.piece(j, V, ombre=3)
    botte(t, 36, 159, l=32, h=13, vers=-1)
    botte(t, 72, 159, l=30, h=13, vers=1)
    # le torse massif, la tunique blanche
    torse = t.poly([(36, 72), (106, 72), (116, 96), (106, 126), (34, 126), (26, 96)])
    t.piece(torse, V, ombre=4)
    for pts in ([(48, 100), (44, 124)], [(96, 100), (100, 124)], [(70, 112), (70, 126)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(torse & t.rect(0, 120, W, 126), B)
    t.peindre(torse & t.rect(0, 120, W, 120), N)
    for x in range(30, 110, 6):
        t.peindre(t.poly([(x, 126), (x + 3, 122), (x + 6, 126)]), V)
    t.peindre(t.rect(28, 112, 112, 116) & torse, N)
    t.piece(t.rect(64, 110, 76, 118), B, ombre=0)
    t.peindre(t.rect(67, 113, 73, 115), N)
    # la bandoulière de sceaux
    band = t.trait([(36, 78), (104, 116)], 7)
    t.piece(band & torse, B, ombre=0)
    t.peindre(t.trait([(36, 78), (104, 116)], 1) & torse, V)
    for k, (x, y) in enumerate([(46, 84), (60, 92), (74, 100), (88, 108)]):
        t.peindre(t.trait([(x, y + 2), (x - 1, y + 8)]), N)
        sceau_cire(t, x - 1, y + 13, 5)
    # le bras qui appuie le tampon sur la caisse
    bras = t.fuseau([(102, 80), (120, 88), (130, 96)], 15, 12)
    t.piece(bras, V, ombre=3)
    t.peindre(t.courbe([(110, 82), (118, 88)]), N)
    t.piece(t.poly([(118, 84), (124, 82), (126, 98), (120, 98)]), B, ombre=0)
    manche = t.rect(129, 92, 135, 108)
    t.piece(manche, V, ombre=0)
    base = t.poly([(122, 106), (142, 106), (144, 112), (120, 112)])
    t.piece(base, V, ombre=0)
    t.damier(base & t.rect(0, 109, W, 112), N)
    poing(t, 122, 82, 142, 98, doigts=3, sens=1)
    for (x0, y0, x1, y1) in [(146, 104, 152, 100), (148, 110, 156, 110), (116, 104, 110, 100)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    # le bras levé qui tient un sceau de référence
    bras2 = t.fuseau([(38, 80), (22, 76), (20, 58)], 15, 12)
    t.piece(bras2, V, ombre=3)
    t.peindre(t.courbe([(26, 74), (22, 66)]), N)
    t.piece(t.poly([(12, 56), (28, 56), (28, 62), (12, 62)]), B, ombre=0)
    poing(t, 12, 44, 28, 60, sens=1)
    sceau_cire(t, 18, 34, 9)
    t.peindre(t.trait([(20, 44), (20, 46)]), N)
    # la tête et la grosse barbe verte
    oreille(t, 44, 42, 54, 58, gauche=True)
    oreille(t, 92, 42, 102, 58)
    tete = t.ell(48, 18, 98, 72)
    t.piece(tete, B, ombre=0)
    cheveux = t.ell(46, 12, 100, 40) & ~t.ell(52, 26, 96, 74)
    t.piece(cheveux, V, ombre=2)
    for (x, y) in [(56, 18), (66, 14), (78, 14), (88, 18)]:
        t.peindre(t.courbe([(x, y + 6), (x + 2, y + 2), (x + 5, y + 4)]), N)
    barbe = (t.ell(46, 40, 100, 92) | t.ell(50, 64, 74, 104) | t.ell(72, 64, 96, 104) | t.ell(60, 84, 86, 114)) \
        & ~t.ell(54, 24, 92, 66)
    barbe &= t.rect(0, 50, W, H)
    t.piece(barbe, B, ombre=3)
    for pts in ([(56, 70), (58, 84), (62, 98)], [(72, 78), (72, 94), (73, 108)], [(88, 70), (86, 84), (82, 98)],
                [(64, 76), (66, 92)], [(80, 76), (80, 92)]):
        t.peindre(t.courbe(pts), V)
    t.peindre(t.courbe([(70, 106), (68, 112), (74, 113)]), N)
    # les sourcils broussailleux, le regard sur l'empreinte
    sourcil(t, [(54, 36), (61, 33), (69, 36)], 4, 4)
    sourcil(t, [(76, 36), (84, 33), (92, 36)], 4, 4)
    t.oeil(56, 40, l=12, h=9, regard=(3, 2))
    t.oeil(76, 40, l=12, h=9, regard=(3, 2))
    nz = t.ell(66, 46, 80, 60)
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 3) | t.bord(nz, 0, 1, 2), V)
    t.peindre(t.rect(68, 49, 69, 50), B)
    t.point(69, 58, N); t.point(76, 58, N)
    # la moustache et la bouche concentrée
    m1 = t.piece(t.fuseau([(72, 61), (64, 62), (56, 68)], 7, 2), B, ombre=0)
    m2 = t.piece(t.fuseau([(74, 61), (82, 62), (90, 68)], 7, 2), B, ombre=0)
    t.damier((m1 | m2) & t.rect(0, 64, W, 70), V)
    t.peindre(t.courbe([(70, 62), (62, 64)]) & m1, N)
    t.peindre(t.courbe([(76, 62), (84, 64)]) & m2, N)
    t.pixels(67, 67, """
.:::::::::.
:#########:
.:::::::::.
""")
    t.sol(160, cx=70)
    return t.image()


def mailles(t, m, c=N):
    """Le motif d'une cotte de mailles : de petits anneaux en quinconce."""
    for y in range(0, H, 4):
        for x in range((y // 4) % 2 * 2, W, 4):
            if m[y, x]:
                t.point(x, y, c); t.point(x + 1, y, c)


# ------------------------------------------------------------------ Adele, la Garde
def adele_v3():
    """La capitaine de la Garde, casque à nasal et tresse, cotte de mailles et tabard à croix : l'écu au bras, la
    hallebarde bien droite, en pleine ronde."""
    t = Toile()
    # la hallebarde : la hampe, le fer de hache, la pique, le croc
    hampe = t.rect(128, 18, 132, 158)
    t.piece(hampe, B, ombre=0)
    t.peindre(t.rect(131, 20, 131, 156), V)
    for y in (100, 104, 108):
        t.peindre(t.rect(128, y, 132, y), V)
    pique = t.poly([(130, 0), (134, 14), (130, 20), (126, 14)])
    t.piece(pique, B, ombre=0)
    t.peindre(t.trait([(130, 2), (130, 18)]), V)
    hache = t.poly([(132, 18), (150, 10), (156, 26), (150, 42), (132, 34)])
    t.piece(hache, V, ombre=2)
    t.peindre(t.courbe([(150, 12), (155, 26), (150, 40)], 2), B)
    croc = t.fuseau([(128, 24), (118, 22), (112, 14)], 6, 1)
    t.piece(croc, V, ombre=0)
    t.piece(t.rect(126, 34, 134, 38), B, ombre=0)
    t.piece(t.rect(126, 16, 134, 19), B, ombre=0)
    # les jambes en marche, chausses vertes et bottes
    for (pts, e) in [([(76, 120), (74, 136), (70, 148)], 13), ([(92, 120), (100, 134), (104, 148)], 13)]:
        j = t.fuseau(pts, e, e - 2)
        t.piece(j, V, ombre=2)
    botte(t, 56, 159, l=26, h=14, vers=-1)
    botte(t, 94, 159, l=26, h=14, vers=1)
    # la cotte de mailles
    cotte = t.poly([(64, 74), (102, 74), (110, 96), (108, 126), (60, 126), (56, 96)])
    t.piece(cotte, V, ombre=3)
    mailles(t, cotte & ~t.bord(cotte, -1, -1, 1), N)
    # le tabard à croix
    tab = t.poly([(70, 76), (98, 76), (102, 132), (66, 132)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.rect(80, 84, 88, 122) | t.rect(70, 94, 98, 102), V)
    t.peindre(t.rect(82, 86, 82, 120) | t.rect(72, 96, 96, 96), B)
    for x in range(68, 102, 6):
        t.peindre(t.poly([(x, 132), (x + 3, 127), (x + 6, 132)]), V)
    t.peindre(t.rect(60, 108, 108, 111) & (cotte | tab), N)
    t.piece(t.rect(80, 107, 88, 112), B, ombre=0)
    t.peindre(t.rect(82, 109, 86, 110), N)
    # le bras qui tient la hallebarde
    bras = t.fuseau([(100, 80), (114, 90), (126, 88)], 12, 10)
    t.piece(bras, V, ombre=2)
    mailles(t, bras & ~t.bord(bras, -1, -1, 1), N)
    t.piece(t.poly([(118, 82), (124, 82), (124, 96), (118, 96)]), B, ombre=0)
    poing(t, 122, 82, 138, 98, doigts=3, sens=1)
    # l'écu au bras gauche
    bras2 = t.fuseau([(66, 80), (54, 94), (50, 106)], 12, 10)
    t.piece(bras2, V, ombre=2)
    ecu = t.poly([(18, 82), (60, 82), (60, 110), (39, 140), (18, 110)])
    t.piece(ecu, V, ombre=3)
    t.peindre(t.poly([(22, 86), (56, 86), (56, 108), (39, 134), (22, 108)]) & ~t.poly([(24, 88), (54, 88), (54, 107),
                                                                                        (39, 131), (24, 107)]), B)
    t.peindre(t.rect(35, 90, 43, 128) | t.rect(25, 100, 53, 108), B)
    t.peindre(t.rect(37, 92, 41, 126) | t.rect(27, 102, 51, 106), V)
    for (x, y) in [(21, 85), (57, 85), (21, 108), (57, 108), (39, 136)]:
        t.point(x, y, N)
    t.peindre(t.courbe([(24, 90), (24, 100)]), B)
    # la tresse qui tombe sur l'épaule
    tresse = t.rect(0, 0, 0, 0)
    for k in range(6):
        y = 56 + k * 8
        tresse |= t.ell(98 - k, y, 110 - k, y + 9)
    t.piece(tresse, V, bord=B, ombre=0)
    t.contour(dilater(tresse, 1), N)
    for k in range(6):
        y = 56 + k * 8
        t.peindre(t.courbe([(99 - k, y + 2), (104 - k, y + 6), (109 - k, y + 3)]), N)
    t.piece(t.rect(98, 104, 108, 107), B, ombre=0)
    t.piece(t.fuseau([(102, 108), (100, 116), (104, 122)], 7, 2), V, ombre=0)
    # la tête
    oreille(t, 58, 50, 68, 64, gauche=True)
    tete = t.ell(60, 30, 104, 78)
    t.piece(tete, B, ombre=0)
    # le camail de mailles autour du visage
    camail = t.ell(56, 30, 108, 84) & ~t.ell(64, 36, 100, 80) & t.rect(0, 44, W, H)
    t.piece(camail, V, ombre=0)
    mailles(t, camail & ~t.bord(camail, -1, -1, 1), N)
    # le regard ferme de la ronde
    sourcil(t, [(68, 48), (74, 47), (80, 49)], 2, 4)
    sourcil(t, [(86, 49), (92, 47), (98, 48)], 4, 2)
    t.oeil(68, 52, l=12, h=9, regard=(2, 0), cils=-1)
    t.oeil(86, 52, l=12, h=9, regard=(2, 0), cils=1)
    t.pixels(80, 70, """
:.......:
.:::::::.
..:###:..
...:::...
""")
    t.damier(t.ell(66, 64, 72, 68) | t.ell(94, 64, 100, 68), V)
    # le casque conique et son nasal
    casque = t.poly([(58, 44), (64, 20), (82, 6), (100, 20), (106, 44)])
    t.piece(casque, V, ombre=3)
    t.peindre(t.courbe([(82, 8), (80, 26), (82, 42)]), N)
    t.peindre(t.courbe([(70, 22), (66, 40)]), B)
    for (x, y) in [(66, 30), (98, 30), (82, 20)]:
        t.piece(t.ell(x - 1, y - 1, x + 1, y + 1), B, ombre=0)
    bandeau = t.rect(56, 40, 108, 45)
    t.piece(bandeau & t.ell(50, 0, 114, 90), B, ombre=0)
    for x in range(60, 106, 4):
        t.point(x, 42, V)
    nasal = t.poly([(80, 45), (86, 45), (86, 66), (83, 70), (80, 66)])
    t.piece(nasal, V, ombre=0)
    t.peindre(t.rect(81, 46, 81, 64), B)
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ le Sergent de la Herse
def sergent_v3():
    """Le Sergent, le torse bombé et la moustache en balai sous son morion : la liste des mots de passe d'une main, le
    clairon de l'autre."""
    t = Toile()
    # les jambes et les bottes, talons joints
    for (x0, x1) in [(66, 80), (86, 100)]:
        j = t.poly([(x0, 122), (x1, 122), (x1, 146), (x0, 146)])
        t.piece(j, B, ombre=2)
        t.peindre(t.rect(x0 + 2, 124, x0 + 3, 145), V)
    botte(t, 50, 159, l=30, h=15, vers=-1)
    botte(t, 86, 159, l=30, h=15, vers=1)
    # le torse bombé, la vareuse à brandebourgs
    torse = t.poly([(62, 72), (100, 72), (114, 90), (108, 126), (58, 126), (52, 96)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.courbe([(64, 80), (54, 96), (60, 120)]), B)
    for y in (88, 96, 104, 112):
        t.peindre(t.trait([(72, y), (94, y)], 2), B)
        t.peindre(t.trait([(72, y), (94, y)]) & ((t.xx % 3) == 0), N)
        for x in (70, 96):
            t.piece(t.ell(x - 2, y - 2, x + 2, y + 2), B, ombre=0)
    t.peindre(t.rect(54, 116, 112, 120) & torse, N)
    t.piece(t.rect(78, 115, 88, 121), B, ombre=0)
    t.peindre(t.rect(81, 117, 85, 119), N)
    # les médailles
    for (x, y) in [(102, 82), (106, 92)]:
        t.peindre(t.trait([(x - 2, y - 6), (x, y)]) | t.trait([(x + 2, y - 6), (x, y)]), B)
        t.piece(t.ell(x - 3, y, x + 3, y + 6), B, ombre=0)
        t.point(x, y + 3, V)
    # les épaulettes à franges
    for (x0, x1) in [(52, 68), (96, 112)]:
        ep = t.poly([(x0, 72), (x1, 72), (x1 + 2, 78), (x0 - 2, 78)])
        t.piece(ep, B, ombre=0)
        for x in range(x0 - 1, x1 + 2, 2):
            t.peindre(t.trait([(x, 79), (x, 83)]), B)
    # le bras qui tend la liste des mots de passe
    bras2 = t.fuseau([(56, 82), (44, 96), (36, 98)], 12, 10)
    t.piece(bras2, V, ombre=2)
    liste = t.poly([(6, 66), (38, 64), (40, 124), (8, 126)])
    t.piece(liste, B, ombre=2)
    t.piece(t.rect(4, 60, 42, 66), B, ombre=0)
    t.peindre(t.rect(5, 63, 41, 63), V)
    for k, mot in enumerate(["soleil", "bastion", "123456", "azerty", "admin"]):
        y = 70 + k * 10
        texte(t, 11, y, mot[:6], V)
        t.peindre(t.trait([(9, y + 3), (36, y + 1)]), N)
    poing(t, 28, 90, 42, 104, sens=-1)
    # le bras levé qui brandit le clairon
    bras = t.fuseau([(106, 80), (122, 72), (128, 52)], 12, 10)
    t.piece(bras, V, ombre=2)
    t.piece(t.poly([(120, 50), (134, 50), (134, 58), (120, 58)]), B, ombre=0)
    boucle = cercle(t, 126, 24, 156, 44, 3)
    t.contour(boucle, N); t.peindre(boucle, B)
    t.peindre(cercle(t, 127, 25, 155, 43, 1) & ((t.xx % 4) == 0), V)
    pav = t.poly([(150, 30), (166, 20), (172, 22), (172, 50), (166, 52), (150, 42)])
    t.piece(pav, B, ombre=2)
    t.peindre(t.ell(164, 20, 174, 52), B)
    t.contour(t.ell(164, 20, 174, 52), N)
    t.peindre(t.ell(166, 24, 172, 48), N)
    t.peindre(t.ell(167, 27, 169, 34), V)
    emb = t.trait([(116, 48), (128, 40)], 3)
    t.piece(emb, B, ombre=0, lumiere=False)
    t.piece(t.ell(112, 46, 118, 52), B, ombre=0)
    cordon = t.courbe([(140, 44), (144, 58), (138, 66)], 2)
    t.peindre(cordon, V)
    t.piece(t.poly([(134, 64), (142, 64), (144, 74), (132, 74)]), V, ombre=0)
    for x in range(134, 144, 2):
        t.point(x, 72, N)
    poing(t, 120, 38, 136, 52, sens=1)
    for (x0, y0, x1, y1) in [(166, 18, 172, 10), (172, 50, 174, 58), (156, 14, 158, 6)]:
        t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    t.pixels(160, 2, """
..::.
.:##:
..:#.
.##..
###..
.#...
""")
    # la tête, menton fier
    oreille(t, 60, 46, 68, 60, gauche=True)
    oreille(t, 98, 46, 106, 60)
    tete = t.ell(62, 26, 104, 76)
    t.piece(tete, B, ombre=0)
    # le morion : bombe à crête, bord relevé en bateau
    bombe = t.ell(64, 10, 102, 44) & t.rect(0, 0, W, 36)
    t.piece(bombe, V, ombre=3)
    crete = t.poly([(70, 14), (76, 4), (94, 2), (100, 12), (96, 14), (72, 16)])
    t.piece(crete, B, ombre=2)
    t.peindre(t.courbe([(76, 6), (84, 4), (94, 5)]), V)
    bord = t.poly([(50, 28), (64, 36), (102, 36), (116, 28), (112, 36), (104, 40), (62, 40), (54, 36)])
    t.piece(bord, B, ombre=2)
    t.peindre(t.trait([(60, 38), (106, 38)]) & ((t.xx % 3) == 0), V)
    for (x, y) in [(72, 26), (94, 26), (83, 22)]:
        t.piece(t.ell(x - 1, y - 1, x + 1, y + 1), B, ombre=0)
    # les sourcils froncés, le regard qui inspecte
    sourcil(t, [(68, 46), (75, 46), (81, 49)], 3, 4)
    sourcil(t, [(86, 49), (92, 46), (99, 46)], 4, 3)
    t.oeil(68, 50, l=12, h=9, regard=(-3, 1), paupiere=2)
    t.oeil(86, 50, l=12, h=9, regard=(-3, 1), paupiere=2)
    nz = t.poly([(80, 56), (86, 56), (88, 64), (84, 66), (78, 64)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 2), V)
    # la moustache en balai
    for sgn in (-1, 1):
        m = t.fuseau([(83, 64), (83 + sgn * 12, 66), (83 + sgn * 22, 62)], 9, 3)
        t.piece(m, V, ombre=0)
        for k in range(4):
            x = 83 + sgn * (4 + k * 4)
            t.peindre(t.trait([(x, 63), (x + sgn, 69)]), N)
    t.pixels(77, 71, """
.:::::::::.
.:ooooooo:.
..:#####:..
...:::::...
""")
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ la Sentinelle de la Tour de Guet
def sentinelle_v3():
    """La Sentinelle, en cotte de mailles, les yeux cernés grands ouverts : elle fixe son registre sans ciller, la lance
    plantée à côté d'elle."""
    t = Toile()
    # la lance plantée
    hampe = t.rect(30, 16, 34, 158)
    t.piece(hampe, B, ombre=0)
    t.peindre(t.rect(33, 18, 33, 156), V)
    fer = t.poly([(32, 0), (40, 12), (36, 20), (28, 20), (24, 12)])
    t.piece(fer, V, ombre=0)
    t.peindre(t.trait([(32, 2), (32, 18)]), B)
    t.piece(t.rect(28, 20, 36, 24), B, ombre=0)
    for k in range(3):
        t.piece(t.fuseau([(34, 26 + k * 3), (44, 30 + k * 4), (50, 40 + k * 3)], 3, 1), V, ombre=0, lumiere=False)
    # la tasse de tisane fumante au pied
    tasse = t.rect(138, 142, 154, 158)
    t.piece(tasse, B, ombre=2)
    t.peindre(cercle(t, 152, 145, 160, 154, 2), B)
    t.contour(cercle(t, 152, 145, 160, 154, 2), N)
    t.peindre(t.rect(140, 148, 152, 149), V)
    for x in (142, 148):
        t.peindre(t.courbe([(x, 138), (x - 2, 132), (x + 2, 126), (x, 120)]), B)
    t.peindre(t.rect(134, 159, 164, 160), B)
    # les jambes raides
    for x0 in (66, 86):
        j = t.rect(x0, 120, x0 + 14, 146)
        t.piece(j, V, ombre=2)
        t.damier(j & ~t.bord(j, -1, -1, 1) & ((t.yy % 4) == 0), N)
    botte(t, 56, 159, l=26, h=14, vers=-1)
    botte(t, 84, 159, l=26, h=14, vers=1)
    # la cotte de mailles, longue
    cotte = t.poly([(62, 70), (104, 70), (110, 96), (108, 128), (58, 128), (56, 96)])
    t.piece(cotte, V, ombre=3)
    mailles(t, cotte & ~t.bord(cotte, -1, -1, 1), N)
    t.peindre(cotte & t.rect(0, 124, W, 128), B)
    t.peindre(cotte & t.rect(0, 123, W, 123), N)
    t.peindre(t.rect(56, 110, 110, 113) & cotte, N)
    # le registre tenu à deux mains, grand ouvert
    bras2 = t.fuseau([(64, 78), (56, 94), (66, 104)], 11, 9)
    bras = t.fuseau([(102, 78), (110, 94), (100, 104)], 11, 9)
    t.piece(bras2, V, ombre=2); t.piece(bras, V, ombre=2)
    mailles(t, (bras | bras2) & ~t.bord(bras | bras2, -1, -1, 1), N)
    reg = t.poly([(52, 90), (83, 96), (114, 90), (116, 116), (83, 122), (50, 116)])
    t.piece(reg, B, ombre=2)
    t.peindre(t.trait([(83, 96), (83, 122)]), N)
    t.peindre(t.trait([(50, 116), (83, 122), (116, 116)]) | t.trait([(51, 118), (83, 124), (115, 118)]), N)
    t.peindre(t.trait([(50, 117), (83, 123), (116, 117)]), V)
    for k in range(5):
        t.peindre(t.trait([(56, 98 + k * 4), (78, 102 + k * 4)]) & ((t.xx % 5) != 0), V)
        t.peindre(t.trait([(88, 102 + k * 4), (110, 98 + k * 4)]) & ((t.xx % 4) != 0), V)
    texte(t, 90, 98, "passwd", N)
    poing(t, 46, 100, 58, 112, sens=1)
    poing(t, 108, 100, 120, 112, sens=-1)
    # la tête et le camail
    camail = t.ell(54, 20, 112, 88)
    t.piece(camail, V, ombre=3)
    mailles(t, camail & ~t.bord(camail, -1, -1, 1), N)
    visage = t.ell(64, 32, 102, 82)
    t.piece(visage, B, ombre=0)
    t.peindre(t.courbe([(66, 44), (82, 36), (100, 44)]), N)
    meche = t.fuseau([(72, 36), (68, 46), (70, 54)], 5, 1)
    t.piece(meche, V, ombre=0, lumiere=False)
    # les grands yeux ronds, écarquillés, et les cernes
    t.oeil(68, 50, l=13, h=12, regard=(0, 3), paupiere=1, cils=-1)
    t.oeil(85, 50, l=13, h=12, regard=(0, 3), paupiere=1, cils=1)
    for x in (68, 85):
        t.peindre(t.courbe([(x + 1, 64), (x + 6, 67), (x + 12, 64)]), N)
        t.damier(t.courbe([(x + 2, 66), (x + 6, 68), (x + 11, 66)], 2), V)
    sourcil(t, [(68, 45), (74, 42), (80, 44)], 2, 3)
    sourcil(t, [(86, 44), (92, 42), (98, 45)], 3, 2)
    nz = t.poly([(81, 60), (84, 60), (86, 68), (80, 69)])
    t.piece(nz, B, ombre=0)
    t.damier(t.bord(nz, 1, 0, 1), V)
    t.pixels(78, 72, """
..:::..
.:###:.
..:::..
""")
    t.sol(160, cx=84)
    return t.image()


PORTRAITS = {
    "item_fernando.gif": fernando_v3,
    "item_butler.gif": butler_v3,
    "item_tatu.gif": tatu_v3,
    "item_jean.gif": jean_v3,
    "item_vint.gif": vint_v3,
    "item_evelyn.gif": evelyn_v3,
    "item_edsger.gif": edsger_v3,
    "item_joan.gif": joan_v3,
    "item_robert.gif": robert_v3,
    "item_katherine.gif": katherine_v3,
    "item_ralph.gif": ralph_v3,
    "item_adele.gif": adele_v3,
    "item_sergent.gif": sergent_v3,
    "item_sentinelle.gif": sentinelle_v3,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
