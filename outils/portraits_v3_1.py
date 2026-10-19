"""Portraits v3, lot 1 : les personnages des chapitres 2 et 3 (Whitfield, Frances, le Corbeau, Gaspard) et ceux de
l'épreuve finale (Dylan, Aidan, David, Laurana, Manon, Wissam, Jean-Baptiste, Gabriel, Timour, Steve, Florimond).

Grille fine de 176 x 170 cases (2 x 2 pixels), dessin par pièces avec portrait_v3.Toile (liseré noir, aplat,
lumière, ombre tramée), visages détaillés, objet de métier lisible. Voir la méthode dans portrait_v3.py.

    python3 outils/portraits_v3_1.py                 # régénère les 15 portraits du lot
    python3 outils/portraits_v3_1.py item_corbeau    # seulement ceux passés en argument
"""
import math
import random
import sys

from dessiner_lieux import finir, N, V, B
from portrait_v3 import Toile, texte, dilater, eroder


# ------------------------------------------------------------------ petites aides communes
def dilater_h(t, m, ep=1):
    return dilater(m, ep)


def eroder_h(m, ep=1):
    return eroder(m, ep)


def poing(t, x0, y0, x1, y1, doigts=3, sens=1):
    """Un poing fermé : ellipse blanche à liseré, traits de doigts, ombre tramée dessous."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    h = (y1 - y0) / (doigts + 1)
    for k in range(1, doigts + 1):
        y = int(y0 + k * h)
        if sens > 0:
            t.peindre(t.trait([(x0 + 2, y), (x0 + (x1 - x0) * 3 // 5, y)]), N)
        else:
            t.peindre(t.trait([(x1 - (x1 - x0) * 3 // 5, y), (x1 - 2, y)]), N)
    t.damier(t.bord(m, 0, 1, 1), V)
    return m


def manchette(t, pts, c=B):
    m = t.poly(pts)
    t.piece(m, c, ombre=0)
    return m


def rayons(t, cx, cy, r0, r1, r2, n=12, sauf=None, dec=0.0):
    """Une couronne de rayons blancs alternés long et court (sauf : liste d'intervalles d'angles à éviter)."""
    for k in range(n):
        a = k * 2 * math.pi / n + dec
        if sauf and any(lo < a % (2 * math.pi) < hi for lo, hi in sauf):
            continue
        r = r1 if k % 2 == 0 else r2
        t.peindre(t.trait([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + r * math.cos(a), cy + r * math.sin(a))]), B)


def boucles(t, masque, n, graine, zone=None, reflets=0.4):
    """Creuse une masse de cheveux bouclés de petites spirales noires et de quelques reflets blancs."""
    rnd = random.Random(graine)
    ys, xs = masque.nonzero()
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    k = 0
    essais = 0
    while k < n and essais < 2000:
        essais += 1
        x, y = rnd.randint(x0, x1), rnd.randint(y0, y1)
        if zone is not None and not zone[y, x]:
            continue
        if masque[y, x] and masque[min(169, y + 4), x] and masque[y, min(175, x + 4)] and masque[max(0, y - 3), x]:
            s = rnd.choice((1, -1))
            t.peindre(t.courbe([(x + 3 * s, y), (x, y - 1), (x - s, y + 2), (x + s, y + 4), (x + 4 * s, y + 3)]) & masque, N)
            if rnd.random() < reflets:
                t.peindre(t.trait([(x - 1, y - 3), (x + 2, y - 4)]) & masque, B)
            k += 1


def losanges(t, m, c, pas=8):
    """Le motif d'arlequin : des losanges alternés dans le masque m."""
    k = (((t.xx + t.yy) // pas) + ((t.xx - t.yy + 400) // pas)) % 2 == 0
    t.peindre(m & k, c)


GRANDES = {
    'h': "#...#|#...#|#...#|#####|#...#|#...#|#...#", 'a': ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    '?': ".###.|#...#|....#|..##.|..#..|.....|..#..", 'q': ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    ' ': ".....|.....|.....|.....|.....|.....|.....",
}


def grand_texte(t, x, y, s, c=N, e=2):
    """Des capitales 5 x 7 (agrandies e fois) pour les panneaux."""
    for ch in s:
        for dy, ligne in enumerate(GRANDES[ch].split('|')):
            for dx, p in enumerate(ligne):
                if p == '#':
                    t.peindre(t.rect(x + dx * e, y + dy * e, x + dx * e + e - 1, y + dy * e + e - 1), c)
        x += (6 if ch != ' ' else 3) * e


def maison(t, x, y, num, crieur=False):
    """Une petite maison numérotée du plan de rue."""
    m = t.poly([(x, y + 5), (x + 5, y), (x + 10, y + 5), (x + 10, y + 13), (x, y + 13)])
    t.piece(m, V, ombre=0, lumiere=False)
    t.peindre(t.rect(x + 4, y + 8, x + 6, y + 13), B)
    t.point(x + 2, y + 7, B); t.point(x + 8, y + 7, B)
    texte(t, x + (5 - 2 * len(num)), y + 15, num, N)
    if crieur:
        mega = t.poly([(x + 8, y - 4), (x + 5, y - 4), (x - 1, y - 8), (x - 1, y + 2), (x + 5, y - 1), (x + 8, y - 1)])
        t.piece(mega, V, ombre=0, lumiere=False)
        t.peindre(t.rect(x + 6, y - 4, x + 8, y - 1), N)
        for k in (-1, 1):
            t.peindre(t.trait([(x - 3, y - 3 + 4 * k), (x - 6, y - 3 + 6 * k)]), N)
        t.peindre(t.trait([(x - 3, y - 3), (x - 7, y - 3)]), N)


NOTE_1 = """
....::
...:##:
...:#:#:
...:#..:
.::::#.
:####:.
:####:.
.::::..
"""
NOTE_2 = """
...::::::
..:######:
..:#::::#:
..:#:..:#:
.::#:.::#:
:###::###:
:###::###:
.:::..:::.
"""


def note(t, x, y, double=False):
    """Une note de musique bien lisible : tête ovale, hampe, crochet (ou deux notes liées)."""
    tetes = [(x, y)] + ([(x + 12, y - 3)] if double else [])
    for (a, b) in tetes:
        t.piece(t.ell(a, b, a + 8, b + 6), V, ombre=0)
        t.piece(t.rect(a + 7, b - 12, a + 8, b + 2), V, ombre=0, lumiere=False)
    if double:
        t.piece(t.poly([(x + 7, y - 13), (x + 20, y - 16), (x + 20, y - 12), (x + 7, y - 9)]), V, ombre=0, lumiere=False)
    else:
        t.piece(t.fuseau([(x + 8, y - 12), (x + 13, y - 8), (x + 12, y - 2)], 3, 1), V, ombre=0, lumiere=False)


BOUCHE_SOURIRE = """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..:oooooooooo:..
...::######::...
.....::::::.....
"""


# ------------------------------------------------------------------ Whitfield, l'archiviste
def archiviste():
    """Whitfield, l'archiviste : voûté, le crâne luisant, des touffes folles, de grosses lunettes et un grand nez ; il lit
    de près le rouleau des empreintes SHA256SUMS qui lui tombe jusqu'aux pieds, une loupe sur la ligne qui ne va pas."""
    t = Toile()
    # le rouleau : le papier qui tombe, puis s'étale au sol et s'enroule
    sol_pap = t.poly([(112, 136), (156, 136), (170, 156), (118, 158)])
    t.piece(sol_pap, B, ombre=0)
    t.peindre(t.trait([(116, 146), (162, 146)]) & sol_pap & ((t.xx % 3) != 0), V)
    t.peindre(t.trait([(118, 152), (166, 152)]) & sol_pap & ((t.xx % 3) != 1), V)
    roule = t.ell(152, 146, 172, 160)
    t.piece(roule, B, ombre=2)
    t.peindre(t.ell(157, 150, 165, 157) & ~t.ell(159, 152, 163, 155), N)
    pap = t.poly([(112, 34), (156, 34), (157, 138), (111, 138)])
    t.piece(pap, B, ombre=0)
    t.damier(t.bord(pap, 1, 0, 2), V)
    texte(t, 114, 42, "sha256", N)
    t.peindre(t.trait([(114, 49), (150, 49)]), V)
    lignes = [("e3b0", "ok"), ("9f2c", "ok"), ("7d1a", "ok"), ("c4e8", "ok"), ("0bad", "!!"), ("51fe", "ok"),
              ("a77c", "ok"), ("2d90", "ok"), ("8e1b", "ok"), ("ywq=", "==")]
    for i, (h, s) in enumerate(lignes):
        y = 53 + i * 8
        texte(t, 114, y, h, V)
        texte(t, 138 if s != "!!" else 140, y, s, N)
    # la tringle du haut et ses pommeaux
    tr = t.rect(106, 28, 162, 36)
    t.piece(tr, B, ombre=2)
    t.peindre(t.trait([(108, 30), (160, 30)]), V)
    for x in (100, 162):
        p = t.ell(x, 26, x + 9, 38)
        t.piece(p, V, ombre=0)
    # le bras du fond, levé, qui tient la tringle
    bras2 = t.fuseau([(86, 84), (98, 64), (104, 42)], 11, 8)
    t.piece(bras2, V, ombre=3)
    manchette(t, [(96, 42), (108, 42), (110, 48), (96, 48)])
    poing(t, 96, 24, 110, 40, 3)
    # la robe d'archiviste, voûtée : la bosse du dos à gauche
    robe = t.poly([(58, 70), (44, 78), (34, 96), (30, 120), (26, 152), (98, 152), (98, 124), (96, 98), (90, 76)])
    t.piece(robe, V, ombre=4)
    for pts in ([(48, 110), (42, 130), (38, 150)], [(62, 112), (60, 132), (58, 150)], [(84, 112), (86, 132), (88, 150)]):
        t.peindre(t.courbe(pts), N)
    for (x, y) in [(40, 100), (52, 124), (72, 136), (90, 120), (46, 140)]:
        t.etoile(x, y, B, 1)
    ourlet = t.poly([(26, 144), (98, 144), (98, 152), (26, 152)]) & robe
    t.peindre(ourlet, B)
    for x in range(28, 96, 6):
        t.pixels(x, 146, "o:o:o\n:o:o:\no:o:o")
    t.peindre(t.trait([(26, 143), (98, 143)]) & dilater_h(t, robe), N)
    # les pantoufles qui dépassent
    for x in (52, 78):
        p = t.poly([(x, 152), (x + 16, 152), (x + 22, 156), (x + 20, 159), (x - 2, 159)])
        t.piece(p, V, ombre=0)
        t.damier(p & t.rect(0, 155, 176, 159), N)
        t.peindre(t.trait([(x, 153), (x + 16, 153)]), B)
    # la ceinture de corde, et la clé des archives
    ceint = t.poly([(40, 108), (98, 106), (98, 112), (38, 114)]) & robe
    t.piece(ceint, B, ombre=0)
    t.peindre(ceint & (((t.xx - t.yy) % 4) == 0), V)
    t.peindre(t.trait([(66, 112), (64, 124)]), B)
    cle = t.ell(60, 122, 68, 130)
    t.piece(cle, B, ombre=0)
    t.peindre(t.ell(62, 124, 66, 128), N)
    t.peindre(t.trait([(64, 130), (64, 138)], 2) | t.rect(64, 134, 67, 135) | t.rect(64, 137, 67, 138), B)
    # l'écharpe blanche de laine autour du cou
    ech = t.poly([(58, 70), (92, 72), (94, 80), (60, 82)])
    t.piece(ech, B, ombre=2)
    pend = t.poly([(80, 78), (90, 78), (92, 104), (82, 104)])
    t.piece(pend, B, ombre=2)
    for y in (84, 90, 96):
        t.peindre(t.trait([(81, y), (91, y)]) & pend, V)
    for x in range(82, 92, 2):
        t.peindre(t.trait([(x, 105), (x, 108)]), B)
    # le bras de devant : la loupe sur la ligne qui ne va pas
    bras = t.fuseau([(70, 84), (88, 104), (104, 102)], 11, 8)
    t.piece(bras, V, ombre=3)
    t.peindre(t.courbe([(80, 96), (88, 100)]), N)
    manchette(t, [(98, 96), (104, 94), (106, 106), (100, 108)])
    manche_l = t.fuseau([(108, 100), (114, 94), (118, 88)], 4, 4)
    t.piece(manche_l, V, ombre=0)
    poing(t, 102, 94, 114, 108, 3)
    loupe = t.ell(110, 70, 136, 96)
    t.peindre(dilater_h(t, loupe, 1) & ~loupe, N)
    t.peindre(loupe & ~t.ell(113, 73, 133, 93), V)
    t.peindre(t.ell(113, 73, 133, 93), B)
    texte(t, 116, 78, "ba", V, 2)
    t.peindre(t.courbe([(116, 76), (114, 82)]), V)
    t.point(129, 90, V); t.point(130, 89, V)
    # la plume d'oie glissée derrière l'oreille
    plume = t.fuseau([(52, 62), (44, 46), (40, 26)], 2, 5)
    t.piece(plume, B, ombre=0)
    for k in range(4):
        y = 30 + k * 6
        t.peindre(t.trait([(41 + k, y), (37 + k, y + 3)]), V)
    # les touffes folles autour du crâne
    for pts in ([(58, 52), (46, 48), (40, 40)], [(58, 56), (44, 58), (38, 54)], [(60, 46), (50, 38), (48, 28)],
                [(62, 60), (50, 66), (42, 66)]):
        t.piece(t.fuseau(pts, 7, 1), V, ombre=0, lumiere=False)
    for pts in ([(74, 30), (72, 22), (76, 16), (80, 18)], [(80, 30), (84, 22), (90, 22)]):
        t.piece(t.courbe(pts, 2), V, ombre=0, lumiere=False)
    # la tête, penchée vers le rouleau
    tete = t.ell(56, 28, 100, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 56, 176, 72), V)
    # le crâne qui luit : une calotte tramée et un éclat
    t.damier(tete & t.rect(0, 0, 176, 37) & ~t.ell(66, 31, 86, 40), V)
    t.peindre(t.courbe([(66, 34), (72, 31), (80, 31)], 2), B)
    t.peindre(t.courbe([(68, 37), (74, 35)]), V)
    # l'oreille
    oreille = t.ell(54, 50, 64, 64)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(57, 53), (61, 57), (58, 61)]), N)
    # les sourcils en broussaille, levés de surprise
    t.piece(t.fuseau([(66, 42), (72, 38), (79, 40)], 2, 5), V, ombre=0)
    t.piece(t.fuseau([(84, 40), (90, 37), (98, 39)], 4, 2), V, ombre=0)
    # les grosses lunettes rondes, l'œil grossi derrière
    for (x, l) in ((66, 15), (84, 15)):
        verre = t.ell(x, 44, x + l, 59)
        t.peindre(verre & ~t.ell(x + 1, 45, x + l - 1, 58), N)
        t.point(x + 3, 47, V); t.point(x + 4, 46, V)
    t.peindre(t.courbe([(81, 50), (83, 48), (85, 50)]), N)
    t.peindre(t.trait([(60, 52), (66, 51)]), N)
    t.oeil(69, 47, l=10, h=9, regard=(2, 1), paupiere=3)
    t.oeil(87, 47, l=10, h=9, regard=(2, 1), paupiere=3)
    # le grand nez, qui pique vers le rouleau
    nez = t.poly([(90, 54), (98, 60), (106, 68), (104, 72), (96, 72), (92, 68)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 0, 1, 2), V)
    t.point(97, 70, N); t.point(98, 70, N)
    # les rides, la bouche pincée et le bout de langue de la concentration
    t.peindre(t.courbe([(64, 60), (66, 64), (72, 66)]), N)
    t.peindre(t.trait([(64, 46), (62, 44)]) | t.trait([(64, 49), (61, 49)]), N)
    t.pixels(80, 64, """
..::::::..
.:oooooo:.
:o::::::::
.::....:##:
........:#:
.........:.
""")
    t.peindre(t.courbe([(78, 72), (84, 73), (90, 72)]), N)
    t.sol(160, cx=94)
    return t.image()


# ------------------------------------------------------------------ Frances, le Corbeau démasqué
def frances():
    """Frances, sous la capuche noire du Corbeau : un clin d'œil, un sourire en coin, le sweat du BDE sous la cape ;
    elle fait tourner une grande plume noire entre ses doigts, la main sur la hanche."""
    t = Toile()
    # la cape noire (vert tramé de noir) qui tombe jusqu'au sol, ouverte devant ; bords blancs
    cape = t.poly([(60, 72), (48, 84), (38, 110), (28, 140), (22, 158), (60, 156), (66, 120), (100, 120),
                   (106, 156), (140, 158), (130, 130), (120, 100), (108, 80), (98, 72)])
    t.piece(cape, V, ombre=0, lumiere=False)
    t.damier(cape, N)
    t.peindre(t.bord(cape, -1, 0, 2) | t.bord(cape, 0, 1, 2) | t.bord(cape, 1, 0, 2), V)
    for pts in ([(52, 96), (40, 130), (34, 156)], [(116, 102), (126, 132), (130, 156)]):
        t.peindre(t.courbe(pts, 2), V)
    # la doublure blanche qui paraît le long de l'ouverture
    for pts in ([(62, 120), (58, 140), (54, 156)], [(100, 120), (104, 140), (110, 156)]):
        t.peindre(t.courbe(pts, 4) & cape, B)
        t.peindre(t.courbe(pts, 1) & cape, V)
    # le bas de la cape découpé en plumes
    for x in range(26, 140, 10):
        if 60 < x < 104:
            continue
        t.piece(t.fuseau([(x + 4, 150), (x + 2, 156), (x + 6, 162)], 7, 1), V, ombre=0, lumiere=False)
    # les jambes en jean, en appui sur une jambe
    for pts, w in (([(72, 118), (70, 138), (68, 152)], 12), ([(90, 118), (94, 136), (100, 150)], 12)):
        j = t.fuseau(pts, w, w - 2)
        t.piece(j, V, ombre=2)
    t.peindre(t.courbe([(74, 122), (72, 140), (70, 150)]), N)
    t.peindre(t.courbe([(92, 124), (95, 138), (99, 148)]), N)
    # les baskets blanches
    for pts in ([(58, 150), (76, 150), (78, 158), (54, 158)], [(94, 148), (106, 146), (114, 154), (100, 158), (94, 156)]):
        b = t.poly(pts)
        t.piece(b, B, ombre=0)
        t.damier(t.bord(b, 0, 1, 1), V)
    t.peindre(t.trait([(54, 158), (78, 158)]) | t.trait([(96, 157), (112, 155)]), N)
    t.pixels(62, 151, ":.:.:\n.:.:.")
    t.pixels(100, 149, ":.:.\n.:.:")
    # le sweat du BDE, blanc, à bandes vertes
    sweat = t.poly([(62, 74), (98, 74), (102, 92), (100, 122), (62, 122), (58, 94)])
    t.piece(sweat, B, ombre=3)
    t.peindre(t.rect(60, 114, 102, 117) & sweat, V)
    t.peindre(t.rect(60, 118, 102, 118) & sweat, N)
    texte(t, 70, 90, "bde", V, 2)
    t.peindre(t.trait([(68, 102), (94, 102)]) & ((t.xx % 2) == 0), V)
    poche = t.poly([(68, 104), (94, 104), (96, 112), (66, 112)])
    t.peindre(poche & ~t.poly([(69, 105), (93, 105), (95, 111), (67, 111)]), N)
    t.peindre(t.trait([(76, 76), (75, 86)]) | t.trait([(86, 76), (88, 86)]), V)
    # le bras sur la hanche, coude en dehors
    bras = t.fuseau([(62, 80), (46, 96), (60, 108)], 10, 7)
    t.piece(bras, B, ombre=2)
    t.rayures(bras & t.rect(0, 90, 60, 98), V, 3, 1, vertical=False)
    poing(t, 56, 100, 68, 112, 2, -1)
    # le bras levé, la main qui fait tourner la plume
    bras2 = t.fuseau([(98, 80), (114, 80), (124, 64)], 10, 8)
    t.piece(bras2, B, ombre=2)
    manchette(t, [(118, 66), (128, 66), (130, 70), (118, 72)], V)
    # la grande plume noire : tige blanche, barbes vertes et noires
    plume = t.fuseau([(132, 52), (140, 36), (150, 20), (162, 8)], 10, 20) | t.fuseau([(132, 52), (128, 58)], 6, 3)
    for k in range(4):
        x, y = 138 + k * 8, 38 - k * 10
        plume &= ~t.poly([(x - 10, y + 2), (x - 4, y - 1), (x - 11, y - 3)])
    for k in range(3):
        x, y = 150 + k * 7, 34 - k * 9
        plume &= ~t.poly([(x + 4, y + 3), (x + 10, y + 2), (x + 9, y - 2)])
    t.piece(plume, V, ombre=0, lumiere=False)
    t.damier(t.bord(plume, 1, 0, 3) | t.bord(plume, 0, 1, 2), N)
    for k in range(6):
        x, y = 136 + k * 6, 42 - k * 8
        t.peindre(t.trait([(x, y), (x - 7, y - 4)]) & plume, N)
        t.peindre(t.trait([(x + 1, y + 1), (x + 8, y + 3)]) & plume, N)
    t.peindre(t.courbe([(128, 60), (138, 40), (150, 22), (164, 6)], 2), B)
    poing(t, 120, 54, 134, 68, 3)
    # le mouvement de la plume qui tourne
    t.peindre(t.courbe([(112, 30), (116, 18), (128, 12)]) & ((t.xx % 3) != 0), B)
    t.peindre(t.courbe([(146, 54), (156, 50), (164, 40)]) & ((t.xx % 3) != 0), B)
    for (x, y) in [(106, 24), (168, 50), (140, 4)]:
        t.etincelle(x, y)
    # la capuche, bord blanc, pointe en bec
    capu = t.ell(54, 18, 110, 82) | t.poly([(62, 30), (80, 8), (86, 6), (104, 26)])
    t.piece(capu, V, ombre=0, lumiere=False)
    t.damier(capu & ~t.bord(capu, -1, -1, 2), N)
    t.peindre(t.courbe([(84, 8), (76, 22), (66, 34)], 2), V)
    t.peindre(t.courbe([(86, 8), (96, 18), (102, 30)]), V)
    # les mèches qui s'échappent sur les épaules
    for pts in ([(64, 54), (60, 70), (64, 84)], [(100, 54), (104, 70), (100, 82)]):
        t.piece(t.fuseau(pts, 7, 2), V, ombre=0, lumiere=False)
        t.peindre(t.courbe(pts) & t.fuseau(pts, 4, 1), N)
    # le visage
    visage = t.ell(64, 34, 100, 76)
    t.piece(visage, B, ombre=0)
    t.damier(visage & t.bord(visage, 1, 0, 3) & t.rect(0, 46, 176, 68), V)
    frange = t.poly([(64, 46), (68, 36), (80, 32), (96, 34), (100, 44), (94, 42), (88, 46), (82, 40), (74, 46), (68, 44)])
    t.piece(frange, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(70, 40), (76, 36), (84, 36)]), N)
    # le clin d'œil : un œil ouvert qui fixe la recrue, l'autre fermé en arc
    t.peindre(t.courbe([(67, 48), (72, 45), (78, 47)], 2), N)
    t.peindre(t.courbe([(85, 46), (91, 43), (97, 46)], 2), N)
    t.oeil(67, 50, l=11, h=9, regard=(0, 0), paupiere=2, cils=-1)
    t.peindre(t.courbe([(86, 55), (91, 51), (97, 55)], 2), N)
    t.point(98, 54, N); t.point(99, 53, N)
    t.peindre(t.trait([(85, 57), (88, 58)]), V)
    # le nez
    t.pixels(80, 55, """
..:..
..:..
.::..
::::.
""")
    # le sourire en coin
    t.pixels(74, 64, """
............:.
:..........::.
.::......:::..
..::::::::#...
...:####::....
....::::......
""")
    t.damier(t.ell(68, 60, 73, 64), V); t.damier(t.ell(91, 60, 96, 64), V)
    # la broche en plume qui ferme la cape
    t.piece(t.ell(58, 74, 68, 84), B, ombre=0)
    t.peindre(t.fuseau([(60, 82), (63, 78), (66, 76)], 2, 4), V)
    t.sol(160, cx=82)
    return t.image()


# ------------------------------------------------------------------ le Corbeau
def corbeau():
    """Le Corbeau : un gros oiseau perché sur une branche noueuse sous un croissant de lune, l'œil rond et malin, le
    bec crochu ; une plume se détache et tombe en virevoltant."""
    t = Toile()
    # le croissant de lune et les étoiles
    lune = t.ell(10, 6, 40, 36) & ~t.ell(18, 2, 46, 32)
    t.piece(lune, B, ombre=2)
    t.point(16, 26, V); t.point(18, 30, V); t.point(14, 20, V)
    for (x, y, n) in [(52, 10, 2), (70, 4, 1), (8, 52, 1), (44, 44, 1), (90, 8, 1), (168, 14, 1)]:
        t.etoile(x, y, B, n)
    # le tronc mort et la branche noueuse
    tronc = t.poly([(148, 160), (152, 128), (156, 112), (164, 102), (176, 98), (176, 160)])
    t.piece(tronc, V, ombre=3)
    for pts in ([(156, 158), (158, 134), (164, 112)], [(166, 158), (168, 130), (172, 108)]):
        t.peindre(t.courbe(pts), N)
    t.peindre(t.ell(160, 134, 168, 146), N); t.peindre(t.ell(162, 137, 166, 143), V)
    branche = t.fuseau([(158, 112), (110, 120), (70, 128), (24, 126)], 11, 5)
    t.piece(branche, V, ombre=2)
    t.peindre(t.courbe([(146, 118), (108, 122), (70, 129), (30, 127)]), N)
    for pts in ([(40, 127), (30, 118), (24, 108)], [(60, 128), (56, 140), (50, 146)]):
        t.piece(t.fuseau(pts, 4, 1), V, ombre=0)
    for (x, y) in [(22, 104), (48, 148)]:
        f = t.fuseau([(x, y + 4), (x - 3, y), (x, y - 5)], 1, 1) | t.ell(x - 3, y - 4, x + 3, y + 4)
        t.piece(f, B, ombre=0)
        t.peindre(t.trait([(x, y - 3), (x, y + 3)]), V)
    # la queue en éventail, qui pend derrière la branche
    for (pts, e) in (([(70, 118), (54, 138), (40, 158)], 12), ([(76, 118), (66, 140), (60, 160)], 12),
                     ([(64, 116), (44, 132), (26, 148)], 11)):
        q = t.fuseau(pts, e, e - 2)
        t.piece(q, V, ombre=2)
        t.peindre(t.courbe(pts), N)
        t.peindre(t.bord(q, -1, 0, 1) & t.rect(0, 130, 176, 170), B)
        t.trame(q & ~t.bord(q, -1, 0, 2), N, 0.3)
    # les pattes qui serrent la branche
    for x in (88, 104):
        p = t.trait([(x, 112), (x - 2, 122)], 4)
        t.piece(p, V, ombre=0)
        t.pixels(x - 8, 120, """
.:::.:::.:::.
:ooo:ooo:ooo:
:ooo:ooo:oo:.
.:o:.:o:.:o:.
..:...:...:..
""")
    # le corps, gonflé
    corps = t.poly([(96, 40), (118, 46), (130, 62), (130, 88), (120, 106), (104, 118), (80, 120), (64, 114),
                    (54, 98), (60, 76), (78, 56)])
    t.piece(corps, V, ombre=4)
    # le plastron : des rangs d'écailles de plumes
    for row, y in enumerate(range(66, 112, 7)):
        for x in range(100 + (row % 2) * 4, 130, 8):
            if corps[y + 3, x] and corps[y, x - 3]:
                t.peindre(t.courbe([(x - 3, y), (x, y + 3), (x + 3, y)]) & corps, N)
                t.point(x, y + 1, B) if row < 2 else None
    t.trame(corps & ~t.bord(corps, -1, -1, 3) & t.rect(0, 84, 176, 170), N, 0.25)
    # l'aile repliée : les rémiges longues, bordées de blanc, puis les couvertures en écailles
    for pts in ([(96, 92), (72, 118), (46, 136)], [(100, 96), (78, 120), (54, 138)], [(104, 98), (86, 120), (64, 136)],
                [(106, 100), (94, 120), (76, 132)]):
        r = t.fuseau(pts, 10, 3)
        t.piece(r, V, ombre=0, lumiere=False)
        t.peindre(t.bord(r, -1, -1, 1) & ~t.rect(0, 0, 176, 104), B)
        t.peindre(t.courbe(pts) & r & ~t.rect(0, 0, 176, 108), N)
    aile = t.poly([(98, 54), (110, 70), (108, 92), (96, 106), (80, 114), (68, 108), (66, 90), (76, 70)])
    t.piece(aile, V, ombre=3)
    for row, y in enumerate(range(64, 108, 7)):
        for x in range(66 + (row % 2) * 4, 110, 8):
            if aile[y + 4, x] and aile[y - 1, x] and aile[y, x - 4] and aile[y, x + 4]:
                t.peindre(t.courbe([(x - 4, y), (x, y + 4), (x + 4, y)]), N)
                t.point(x - 3, y, B); t.point(x - 2, y + 1, B)
    # la tête, légèrement penchée, avec ses plumes ébouriffées
    for pts in ([(104, 28), (96, 22), (92, 22)], [(102, 36), (92, 34), (88, 36)]):
        t.piece(t.fuseau(pts, 6, 1), V, ombre=0, lumiere=False)
    tete = t.ell(98, 18, 142, 60)
    t.piece(tete, V, ombre=3)
    for pts in ([(104, 40), (108, 50), (114, 56)], [(110, 30), (106, 36)]):
        t.peindre(t.courbe(pts), N)
    # le jabot ébouriffé des corbeaux, sous le bec
    for (x0, y0, x1, y1) in [(134, 52, 128, 66), (128, 54, 120, 68), (122, 54, 114, 66), (138, 50, 136, 62)]:
        pl = t.fuseau([(x0, y0), ((x0 + x1) / 2 + 1, (y0 + y1) / 2), (x1, y1)], 6, 1)
        t.piece(pl, V, ombre=0, lumiere=False)
        t.peindre(t.courbe([(x0, y0 + 2), (x1 + 1, y1 - 2)]) & pl, N)
    # le bec crochu, blanc tramé, la commissure souriante
    bec = t.poly([(132, 28), (150, 28), (162, 34), (170, 42), (170, 50), (164, 44), (152, 44), (134, 46)])
    t.piece(bec, B, ombre=0)
    t.damier(t.bord(bec, 0, 1, 2) | t.rect(132, 28, 140, 46) & bec, V)
    t.peindre(t.trait([(140, 31), (150, 31)]), V)
    bas = t.poly([(134, 46), (156, 46), (162, 50), (152, 54), (138, 54)])
    t.piece(bas, B, ombre=0)
    t.damier(t.bord(bas, 0, 1, 2), V)
    t.peindre(t.courbe([(132, 46), (146, 47), (160, 46)]), N)
    t.peindre(t.courbe([(130, 44), (134, 49), (138, 47)]), N)
    t.point(146, 34, N); t.point(147, 34, N)
    # l'œil rond, malin : un sourcil de plumes froncé, la pupille vers le joueur
    t.piece(t.ell(114, 28, 130, 44), B, ombre=0)
    t.peindre(t.ell(115, 29, 129, 43), N)
    t.peindre(t.ell(116, 30, 128, 42), V)
    t.peindre(t.ell(118, 32, 128, 42), N)
    t.peindre(t.ell(119, 33, 122, 36), B)
    t.point(126, 40, B)
    t.peindre(t.fuseau([(110, 24), (120, 24), (134, 30)], 3, 5), N)
    t.peindre(t.fuseau([(112, 22), (122, 22), (134, 27)], 1, 2), B)
    # la plume qui se détache et tombe, en virevoltant
    p = t.fuseau([(30, 96), (40, 80), (54, 70)], 3, 8) | t.fuseau([(54, 70), (58, 66)], 6, 1)
    t.piece(p, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(28, 100), (40, 80), (58, 66)]), B)
    for k in range(4):
        x, y = 38 + k * 5, 84 - k * 4
        t.peindre(t.trait([(x, y), (x - 3, y - 4)]) & p, N)
    t.peindre(t.courbe([(62, 58), (70, 64), (68, 72)]) & ((t.yy % 3) != 0), B)
    t.peindre(t.courbe([(20, 102), (14, 110), (20, 116)]) & ((t.yy % 3) != 0), B)
    t.sol(160, cx=120, l=54)
    return t.image()


# ------------------------------------------------------------------ Gaspard, le régisseur de l'Annexe
def gaspard():
    """Gaspard, le régisseur de l'Annexe : petit et rond, bonnet à pompon, grosse moustache, tablier vert à poche ;
    il fixe sa montre de gousset en tapant du pied, le trousseau de clés de Vint à la ceinture."""
    t = Toile()
    # les jambes courtes : l'une plantée, l'autre qui tape du pied
    j1 = t.poly([(66, 128), (82, 128), (82, 150), (68, 150)])
    t.piece(j1, V, ombre=2)
    j2 = t.poly([(88, 128), (104, 128), (108, 146), (94, 148)])
    t.piece(j2, V, ombre=2)
    s1 = t.poly([(60, 148), (84, 148), (86, 158), (56, 158), (56, 154)])
    t.piece(s1, V, ombre=0)
    t.damier(s1 & t.rect(0, 150, 176, 158), N)
    t.peindre(t.trait([(58, 152), (66, 149)]), B)
    t.peindre(t.rect(56, 157, 86, 158), B)
    s2 = t.poly([(92, 146), (110, 142), (122, 136), (126, 140), (114, 152), (94, 154)])
    t.piece(s2, V, ombre=0)
    t.damier(s2 & t.rect(0, 146, 176, 156), N)
    t.peindre(t.trait([(94, 153), (114, 151), (126, 140)]), B)
    t.peindre(t.trait([(110, 145), (118, 140)]), B)
    for pts in ([(128, 132), (132, 128)], [(130, 140), (136, 139)], [(126, 126), (127, 120)]):
        t.peindre(t.trait(pts), B)
    texte(t, 130, 146, "tap", B)
    # le ventre rond, la chemise blanche
    ventre = t.ell(50, 72, 116, 138)
    t.piece(ventre, B, ombre=3)
    # le tablier vert : bavette, bretelles, grande poche
    tab = t.poly([(68, 80), (98, 80), (100, 98), (112, 112), (110, 138), (56, 138), (54, 112), (66, 98)]) & ventre
    t.piece(tab, V, ombre=3)
    for x in (66, 96):
        t.peindre(t.trait([(x, 74), (x + 2, 82)], 3), V)
    for x in (68, 98):
        t.piece(t.ell(x - 2, 80, x + 3, 85), B, ombre=0)
    poche = t.poly([(66, 112), (100, 112), (98, 130), (68, 130)])
    t.piece(poche, V, ombre=0)
    t.peindre(t.trait([(66, 112), (100, 112)]) | t.trait([(83, 112), (83, 130)]), N)
    t.peindre(t.trait([(67, 114), (99, 114)]) & ((t.xx % 2) == 0), B)
    # le crayon et le tournevis dans la poche
    t.piece(t.fuseau([(72, 112), (74, 100)], 3, 3), B, ombre=0)
    t.pixels(73, 97, ".o.\n:o:")
    t.piece(t.fuseau([(90, 112), (92, 104)], 4, 4), B, ombre=0)
    t.peindre(t.trait([(92, 104), (93, 96)], 2), B)
    t.peindre(t.trait([(90, 107), (93, 107)]), V)
    # la ceinture du tablier et le trousseau de clés de Vint
    t.peindre(t.rect(50, 106, 116, 109) & ventre, N)
    t.peindre(t.rect(50, 107, 116, 107) & ventre & ((t.xx % 2) == 0), V)
    t.peindre(t.ell(104, 106, 116, 118) & ~t.ell(106, 108, 114, 116), B)
    for k, (x, y, a) in enumerate([(104, 118, 0.3), (110, 118, 0.0), (116, 116, -0.4)]):
        bout = (x + 8 * math.sin(a), y + 14 * math.cos(a))
        t.piece(t.ell(x - 3, y, x + 3, y + 6), B, ombre=0)
        t.peindre(t.ell(x - 1, y + 2, x + 1, y + 4), N)
        t.piece(t.trait([(x, y + 6), bout], 2), B, ombre=0)
        t.peindre(t.trait([(bout[0], bout[1] - 2), (bout[0] + 3, bout[1] - 2)]) | t.trait([(bout[0], bout[1] - 5), (bout[0] + 2, bout[1] - 5)]), B)
    # le bras sur la hanche, coude en dehors, manche retroussée
    bras = t.fuseau([(60, 84), (40, 98), (56, 112)], 12, 9)
    t.piece(bras, B, ombre=2)
    t.peindre(t.courbe([(46, 94), (44, 100)]), V)
    t.piece(t.fuseau([(44, 102), (50, 108)], 8, 8), V, ombre=0)
    poing(t, 50, 102, 62, 116, 3, -1)
    # le bras levé, la montre de gousset sous le nez
    bras2 = t.fuseau([(104, 86), (122, 84), (124, 66)], 12, 9)
    t.piece(bras2, B, ombre=2)
    t.peindre(t.trait([(110, 80), (114, 90)], 2) & bras2, V)
    t.peindre(t.courbe([(118, 86), (122, 82)]), V)
    # la chaîne de la montre jusqu'à la poche
    t.peindre(t.courbe([(124, 60), (128, 80), (112, 98), (100, 112)]) & ((t.xx % 2) == 0), B)
    montre = t.ell(116, 30, 146, 60)
    t.piece(montre, B, ombre=0)
    t.peindre(montre & ~t.ell(118, 32, 144, 58), N)
    t.peindre(t.ell(119, 33, 143, 57) & ~t.ell(121, 35, 141, 55), V)
    for k in range(12):
        a = k * math.pi / 6
        r0, r1 = (8, 10) if k % 3 else (7, 10)
        t.peindre(t.trait([(131 + r0 * math.cos(a), 45 + r0 * math.sin(a)), (131 + r1 * math.cos(a), 45 + r1 * math.sin(a))]), N)
    t.peindre(t.trait([(131, 45), (131, 38)], 2) | t.trait([(131, 45), (137, 48)], 2), N)
    t.peindre(t.ell(129, 43, 133, 47), N)
    t.piece(t.rect(128, 24, 134, 29), V, ombre=0)
    t.peindre(t.ell(127, 18, 135, 25) & ~t.ell(129, 20, 133, 23), B)
    for (x, y) in [(110, 30), (152, 34), (150, 62)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.trait([(148, 42), (154, 40)]) | t.trait([(148, 48), (155, 49)]), B)
    poing(t, 116, 56, 130, 70, 3)
    # la tête ronde
    tete = t.ell(58, 24, 106, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 72), V)
    for x, s in ((54, 1), (100, -1)):
        o = t.ell(x, 46, x + 10, 60)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 5 - s * 2, 49), (x + 5 + s, 53), (x + 5 - s * 2, 57)]), N)
    # le bonnet à côtes et son pompon
    bonnet = t.ell(58, 8, 106, 48) & t.rect(0, 0, 176, 32)
    t.piece(bonnet, V, ombre=3)
    t.rayures(bonnet & ~t.bord(bonnet, -1, -1, 1), N, 5, 1)
    revers = t.poly([(56, 28), (108, 28), (108, 37), (56, 37)])
    t.piece(revers, B, ombre=0)
    t.rayures(revers, V, 4, 1)
    t.peindre(t.rect(56, 36, 108, 37) & revers, N)
    pompon = t.ell(72, 0, 92, 14)
    for (x, y) in [(70, 4), (90, 3), (80, -2), (72, 11), (90, 11)]:
        pompon |= t.ell(x - 3, y - 3, x + 3, y + 3)
    t.piece(pompon, B, ombre=0)
    t.damier(t.bord(pompon, 1, 1, 2), V)
    for pts in ([(76, 6), (78, 4)], [(84, 9), (86, 7)], [(82, 2), (84, 2)]):
        t.peindre(t.trait(pts), V)
    # les sourcils froncés d'impatience
    t.piece(t.fuseau([(64, 43), (70, 41), (77, 44)], 3, 5), V, ombre=0)
    t.piece(t.fuseau([(88, 44), (94, 40), (101, 41)], 5, 3), V, ombre=0)
    t.oeil(65, 47, l=11, h=9, regard=(2, -1), paupiere=2)
    t.oeil(89, 47, l=11, h=9, regard=(2, -1), paupiere=2)
    t.peindre(t.trait([(62, 52), (60, 50)]) | t.trait([(102, 52), (104, 50)]), N)
    # le nez rond
    nez = t.ell(76, 50, 89, 64)
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 2), V)
    t.point(79, 62, N); t.point(86, 62, N)
    # la grosse moustache en brosse et la bouche pincée
    for pts in ([(83, 65), (72, 67), (64, 71), (60, 67)], [(83, 65), (94, 67), (102, 71), (106, 67)]):
        m = t.fuseau(pts, 9, 3)
        t.piece(m, V, ombre=0, lumiere=False)
        t.peindre(t.courbe(pts) & m, N)
    t.peindre(t.trait([(82, 64), (82, 67)]) | t.trait([(84, 64), (84, 67)]), N)
    t.pixels(77, 72, """
.:::::::::.
..:#####:..
...:::::...
""")
    # la goutte d'agacement
    t.pixels(48, 38, """
..:..
.:o:.
:ooo:
:oo#:
.:::.
""")
    t.sol(160, cx=88)
    return t.image()


# ------------------------------------------------------------------ Dylan le Saltimbanque
def dylan():
    """Dylan le Saltimbanque : le bonnet de bouffon à grelots, la fraise, le costume d'arlequin ; il jongle avec trois
    balles, en équilibre sur une jambe au sommet d'une grosse balle à quartiers."""
    t = Toile()
    # la grosse balle à quartiers
    balle = t.ell(48, 118, 120, 160)
    t.piece(balle, B, ombre=0)
    for (a, b) in [(56, 70), (84, 98)]:
        q = balle & t.poly([(a, 116), (b, 116), (b + 10, 162), (a - 6, 162)])
        t.peindre(q, V)
    t.peindre(t.courbe([(60, 122), (64, 140), (60, 158)]) & balle, N)
    t.peindre(t.courbe([(84, 118), (86, 140), (84, 160)]) & balle, N)
    t.peindre(t.courbe([(104, 120), (110, 140), (106, 158)]) & balle, N)
    t.damier(balle & t.bord(balle, 1, 1, 4), N)
    t.peindre(t.courbe([(58, 128), (64, 122), (72, 120)], 2), B)
    t.etoile(98, 132, B, 2)
    # la jambe en l'air, genou levé façon flamant, chausson à pointe recourbée et grelot
    j2 = t.fuseau([(88, 102), (100, 96), (110, 94)], 12, 10)
    t.piece(j2, V, ombre=2)
    losanges(t, j2 & ~t.bord(j2, -1, -1, 1), B, 6)
    j3 = t.fuseau([(110, 94), (110, 104), (106, 114)], 10, 8)
    t.piece(j3, V, ombre=2)
    losanges(t, j3 & ~t.bord(j3, -1, -1, 1), B, 6)
    ch2 = t.fuseau([(102, 114), (112, 116), (122, 112), (124, 104)], 9, 3)
    t.piece(ch2, V, ombre=0)
    t.peindre(t.trait([(102, 117), (116, 117)]), B)
    t.piece(t.ell(121, 98, 128, 105), B, ombre=0)
    t.point(124, 103, N)
    # la jambe d'appui, collant à losanges, sur la balle
    j1 = t.fuseau([(80, 106), (78, 116), (76, 122)], 12, 10)
    t.piece(j1, V, ombre=2)
    losanges(t, j1 & ~t.bord(j1, -1, -1, 1), B, 6)
    ch1 = t.poly([(68, 118), (84, 118), (88, 122), (96, 118), (92, 126), (66, 126)])
    t.piece(ch1, V, ombre=0)
    t.peindre(t.trait([(68, 125), (90, 125)]), B)
    t.piece(t.ell(94, 114, 100, 120), B, ombre=0)
    # le pourpoint d'arlequin, ceinturé, aux basques en pointes
    corps = t.poly([(70, 74), (98, 74), (102, 92), (106, 108), (98, 104), (92, 110), (84, 104), (76, 110), (70, 104),
                    (62, 108), (66, 92)])
    t.piece(corps, V, ombre=3)
    losanges(t, corps & ~t.bord(corps, -1, -1, 1) & ~t.bord(corps, 1, 1, 2), B, 8)
    t.peindre(t.rect(64, 94, 104, 97) & corps, N)
    t.peindre(t.rect(64, 95, 104, 95) & corps & ((t.xx % 2) == 0), V)
    t.piece(t.rect(80, 92, 88, 99), B, ombre=0)
    t.peindre(t.rect(82, 94, 86, 97), N)
    for (x, y) in [(76, 104), (92, 104)]:
        t.piece(t.ell(x - 2, y + 2, x + 2, y + 6), B, ombre=0)
    # les bras levés en V qui jonglent
    for pts in ([(70, 78), (50, 72), (34, 54)], [(98, 78), (118, 70), (134, 52)]):
        b = t.fuseau(pts, 10, 8)
        t.piece(b, V, ombre=2)
        losanges(t, b & ~t.bord(b, -1, -1, 1), B, 6)
    # les mains ouvertes, paumes vers le ciel, manchettes à grelot
    for (x, y) in [(24, 38), (128, 36)]:
        manchette(t, [(x + 2, y + 14), (x + 14, y + 14), (x + 15, y + 18), (x + 1, y + 18)], V)
        poing(t, x + 1, y + 2, x + 15, y + 15, 3, 1 if x < 88 else -1)
        t.peindre(t.trait([(x + 4 if x < 88 else x + 12, y + 2), (x + 8, y - 1)], 2), B)
    # les trois balles en l'air, sur leur arc, avec les traits de mouvement
    t.peindre(t.courbe([(34, 30), (50, -6), (120, -8), (136, 28)]) & ((t.xx % 4) < 2), B)
    for (x, y, motif) in [(26, 12, 0), (60, 0, 1), (130, 10, 2)]:
        bl = t.ell(x, y, x + 16, y + 16)
        t.piece(bl, B if motif != 1 else V, ombre=0)
        if motif == 0:
            t.peindre(t.ell(x + 4, y + 4, x + 12, y + 12), V)
            t.peindre(t.ell(x + 6, y + 6, x + 10, y + 10), B)
        elif motif == 1:
            t.peindre(t.rect(x, y + 7, x + 16, y + 9) & bl, B)
            t.peindre(t.rect(x + 7, y, x + 9, y + 16) & bl, B)
        else:
            t.damier(bl & ~t.bord(bl, -1, -1, 3), V)
        t.peindre(t.courbe([(x + 3, y + 7), (x + 5, y + 4), (x + 8, y + 3)]), B if motif == 1 else N)
    # la fraise plissée
    fraise = t.ell(60, 64, 108, 82)
    t.piece(fraise, B, ombre=0)
    for x in range(62, 108, 5):
        t.peindre(t.courbe([(84, 73), (x, 66 if x < 84 else 66), (x + 1, 81)]) & fraise, V)
    t.peindre(t.ell(66, 66, 102, 76) & ~t.ell(68, 64, 100, 74), N)
    # la tête
    tete = t.ell(64, 30, 104, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 66), V)
    # le bonnet de bouffon à trois pointes, chacune son grelot
    for (pts, e, gx, gy) in (([(68, 40), (54, 40), (50, 54)], 12, 50, 58), ([(84, 36), (90, 16), (102, 10)], 12, 106, 8),
                             ([(100, 40), (114, 40), (118, 54)], 12, 118, 58)):
        p = t.fuseau(pts, e, 3)
        t.piece(p, V, ombre=2)
        g = t.ell(gx - 4, gy - 4, gx + 4, gy + 4)
        t.piece(g, B, ombre=0)
        t.peindre(t.trait([(gx - 2, gy + 1), (gx + 2, gy + 1)]), N)
        t.point(gx, gy + 3, N)
    t.peindre(t.courbe([(62, 42), (54, 44)]) | t.courbe([(106, 42), (114, 44)]), N)
    t.peindre(t.courbe([(88, 32), (92, 18)]), N)
    bande = t.poly([(62, 36), (106, 36), (106, 44), (62, 44)])
    t.piece(bande, B, ombre=0)
    for x in range(64, 106, 6):
        t.peindre(t.poly([(x, 44), (x + 3, 38), (x + 6, 44)]), V)
    # le visage : sourire éclatant, regard vers la balle du haut
    t.piece(t.fuseau([(68, 48), (74, 45), (80, 47)], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(88, 47), (94, 45), (100, 48)], 3, 2), V, ombre=0)
    t.oeil(68, 50, l=11, h=9, regard=(1, -2), paupiere=2)
    t.oeil(88, 50, l=11, h=9, regard=(1, -2), paupiere=2)
    t.pixels(82, 55, """
..:..
..:..
.::..
:::..
""")
    t.pixels(76, 61, BOUCHE_SOURIRE)
    t.damier(t.ell(67, 59, 72, 63), V); t.damier(t.ell(96, 59, 101, 63), V)
    for (x, y) in [(16, 60), (150, 56), (60, 22)]:
        t.etincelle(x, y)
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ Aidan, l'elfe rigolo
def elfe():
    """Aidan, l'elfe rigolo : de grandes oreilles pointues, le bonnet à grelot qui retombe, un sourire jusqu'aux
    oreilles, la tunique à col dentelé, des collants rayés et de grands pieds nus ; il brandit son panneau HA HA."""
    t = Toile()
    # le panneau HA HA, au bout de son bâton
    baton = t.fuseau([(132, 30), (130, 90), (128, 150)], 4, 4)
    t.piece(baton, V, ombre=0)
    for y in (100, 126):
        t.peindre(t.trait([(127, y), (133, y + 1)]), N)
    pan = t.poly([(102, 4), (166, 2), (168, 34), (104, 36)])
    t.piece(pan, B, ombre=2)
    t.peindre(t.poly([(106, 7), (163, 5), (165, 31), (107, 33)]) & ~t.poly([(108, 9), (161, 7), (163, 29), (109, 31)]), V)
    grand_texte(t, 110, 9, "ha ha", N, 2)
    t.peindre(t.trait([(112, 28), (158, 27)]) & ((t.xx % 2) == 0), V)
    for (x, y) in [(105, 6), (164, 4), (165, 31), (106, 33)]:
        t.point(x, y, N)
    for (x, y) in [(96, 4), (172, 20), (100, 40)]:
        t.etincelle(x, y)
    # les jambes en collants rayés, bien campées
    for pts in ([(74, 112), (68, 132), (62, 146)], [(90, 112), (98, 130), (104, 146)]):
        j = t.fuseau(pts, 12, 10)
        t.piece(j, B, ombre=2)
        t.rayures(j & ~t.bord(j, -1, 0, 1), V, 6, 3, vertical=False)
    # les grands pieds nus, orteils et touffes de poils
    for (x, s) in ((50, -1), (96, 1)):
        p = t.ell(x, 142, x + 26, 160)
        t.piece(p, B, ombre=0)
        t.damier(t.bord(p, 0, 1, 2), V)
        ox = x + 18 if s > 0 else x + 2
        for k in range(4):
            t.peindre(t.ell(ox + k * 2 * s - 2, 142 + k * 2, ox + k * 2 * s + 3, 147 + k * 2) & ~t.ell(ox + k * 2 * s - 1, 143 + k * 2, ox + k * 2 * s + 2, 146 + k * 2), N)
        for k in range(3):
            t.piece(t.fuseau([(x + 8 + k * 4, 145), (x + 7 + k * 4 - s, 140)], 3, 1), V, ombre=0, lumiere=False)
    # le bras qui tient le bâton
    bras = t.fuseau([(96, 82), (114, 92), (126, 82)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(118, 80), (124, 78), (126, 88), (120, 90)])
    poing(t, 122, 76, 136, 90, 3)
    # la tunique, col dentelé, ceinture, bas en dents de scie
    tun = t.poly([(64, 78), (96, 78), (100, 96), (106, 116), (98, 112), (90, 118), (82, 112), (74, 118), (66, 112),
                  (56, 116), (60, 96)])
    t.piece(tun, V, ombre=3)
    t.peindre(t.courbe([(70, 102), (66, 112)]) | t.courbe([(92, 102), (98, 112)]), N)
    for (x, y) in [(68, 108), (84, 106), (96, 110)]:
        t.etoile(x, y, B, 1)
    t.peindre(t.rect(58, 96, 104, 100) & tun, N)
    t.peindre(t.rect(58, 97, 104, 97) & tun & ((t.xx % 2) == 0), V)
    t.piece(t.rect(76, 94, 86, 102), B, ombre=0)
    t.peindre(t.rect(78, 96, 84, 100), N)
    t.peindre(t.rect(81, 96, 81, 100), B)
    col = t.poly([(62, 76), (100, 76), (98, 82), (94, 88), (90, 82), (86, 90), (82, 82), (78, 90), (74, 82), (70, 88),
                  (66, 82)])
    t.piece(col, B, ombre=0)
    t.damier(t.bord(col, 0, 1, 1), V)
    for (x, y) in [(80, 85), (80, 90)]:
        t.peindre(t.ell(x - 1, y - 1, x + 2, y + 2), B)
    # le bras qui se tient le ventre de rire
    bras2 = t.fuseau([(66, 82), (52, 96), (66, 104)], 10, 8)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(58, 98), (62, 96), (66, 104), (60, 106)])
    poing(t, 62, 96, 76, 108, 3, 1)
    # les grandes oreilles pointues
    for pts in ([(64, 56), (44, 46), (24, 32)], [(96, 56), (114, 48), (130, 38)]):
        o = t.fuseau(pts, 14, 2)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(pts[0][0] + (-4 if pts[0][0] < 80 else 4), pts[0][1] - 2), pts[1], pts[2]]) & eroder_h(o, 3), V)
        t.damier(t.bord(o, 0, 1, 2), V)
    # la tête
    tete = t.ell(60, 32, 100, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 70), V)
    # le bonnet qui retombe en arrière, grelot au bout
    bonnet = t.ell(58, 22, 102, 54) & t.rect(0, 0, 176, 40)
    t.piece(bonnet, V, ombre=3)
    pointe = t.fuseau([(66, 30), (56, 14), (40, 10), (30, 20)], 14, 4)
    t.piece(pointe, V, ombre=2)
    t.peindre(t.courbe([(78, 26), (62, 18), (46, 14)]), N)
    for (x, y) in [(84, 30), (70, 24), (52, 14)]:
        t.etoile(x, y, B, 1)
    revers = t.poly([(56, 36), (104, 36), (104, 43), (56, 43)])
    t.piece(revers, B, ombre=0)
    for x in range(58, 104, 6):
        t.peindre(t.poly([(x, 43), (x + 3, 38), (x + 6, 43)]), V)
    g = t.ell(22, 18, 34, 30)
    t.piece(g, B, ombre=0)
    t.peindre(t.trait([(25, 25), (31, 25)]), N)
    t.point(28, 28, N)
    t.peindre(t.trait([(18, 16), (14, 12)]) | t.trait([(16, 24), (11, 25)]), B)
    # le visage : yeux plissés de rire, sourcils hauts, sourire jusqu'aux oreilles
    t.peindre(t.courbe([(65, 47), (70, 44), (76, 45)], 2), V)
    t.peindre(t.courbe([(85, 45), (90, 44), (95, 47)], 2), V)
    t.peindre(t.courbe([(65, 48), (70, 45), (76, 46)]), N)
    t.peindre(t.courbe([(85, 46), (90, 45), (95, 48)]), N)
    t.oeil(66, 50, l=10, h=9, regard=(1, 0), paupiere=2, cils=0)
    t.oeil(85, 50, l=10, h=9, regard=(1, 0), paupiere=2, cils=0)
    t.peindre(t.courbe([(67, 59), (71, 60), (75, 59)]) | t.courbe([(86, 59), (90, 60), (94, 59)]), N)
    t.pixels(77, 56, """
..:..
..:..
.:o::
:::::
""")
    t.pixels(65, 61, """
::......................::
.::....................::.
..::::::::::::::::::::::..
..:oooooooooooooooooooo:..
...:oooooooooooooooooo:...
...::::::::::::::::::::...
....:::::########:::::....
.....::::########::::.....
.......::::::::::::.......
""")
    t.damier(t.ell(63, 61, 67, 64), V); t.damier(t.ell(93, 61, 97, 64), V)
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ David, l'ogre des steppes
def david():
    """David, l'ogre des steppes : grand et élancé, la chapka de fourrure à rabats, une longue tresse, deux petites
    défenses dans un grand sourire, le manteau croisé des steppes ; il présente la Galette du Roi Gras sur sa paume et
    garde un cornet de frites dans l'autre main."""
    t = Toile()
    # les jambes et les bottes des steppes, pointes relevées
    for x in (72, 90):
        j = t.rect(x, 136, x + 11, 150)
        t.piece(j, V, ombre=2)
    for (x, s) in ((70, -1), (88, 1)):
        b = t.poly([(x, 146), (x + 14, 146), (x + 16, 158), (x - 4, 158), (x - 8, 152), (x - 6, 150), (x - 2, 154)]) if s < 0 \
            else t.poly([(x, 146), (x + 14, 146), (x + 16, 154), (x + 22, 150), (x + 22, 152), (x + 18, 158), (x, 158)])
        t.piece(b, V, ombre=0)
        t.damier(b & t.rect(0, 152, 176, 158), N)
        t.peindre(t.rect(x, 146, x + 14, 148) & b, B)
        t.peindre(t.trait([(x + 2, 151), (x + 6, 149), (x + 10, 151)]), B)
        t.peindre(t.rect(x - 8, 159, x + 22, 159), N)
    # le manteau croisé, long et droit
    man = t.poly([(70, 74), (102, 74), (104, 100), (110, 140), (62, 140), (68, 100)])
    t.piece(man, V, ombre=3)
    t.peindre(t.courbe([(76, 106), (72, 124), (70, 138)]) | t.courbe([(98, 106), (102, 124), (104, 138)]), N)
    rabat = t.poly([(72, 76), (82, 76), (98, 100), (100, 140), (92, 140), (92, 104)])
    t.peindre(t.bord(rabat, -1, 0, 3) & man, B)
    t.peindre(t.bord(rabat, -1, 0, 3) & man & (((t.xx + t.yy) % 4) == 0), V)
    for y in (84, 94):
        t.piece(t.ell(92 - (100 - y) // 3, y - 2, 96 - (100 - y) // 3, y + 2), B, ombre=0)
    ourlet = t.rect(62, 134, 110, 140) & man
    t.peindre(ourlet, B)
    for x in range(62, 110, 6):
        t.pixels(x, 135, ".o:o.\no:o:o\n.o:o.")
    # la ceinture-écharpe nouée, pans qui tombent
    ceint = t.rect(66, 100, 106, 106) & dilater_h(t, man, 1)
    t.piece(ceint, B, ombre=0)
    t.peindre(ceint & (((t.xx - t.yy) % 4) == 0), V)
    t.piece(t.ell(70, 98, 80, 108), B, ombre=0)
    for pts in ([(72, 106), (68, 118), (66, 124)], [(76, 106), (76, 120), (74, 126)]):
        t.piece(t.fuseau(pts, 4, 3), B, ombre=0)
    # le bras qui tient le cornet de frites
    bras2 = t.fuseau([(102, 80), (118, 96), (122, 108)], 10, 8)
    t.piece(bras2, V, ombre=2)
    t.peindre(t.courbe([(108, 88), (114, 92)]), N)
    manchette(t, [(112, 100), (120, 96), (124, 104), (116, 108)])
    for k, x in enumerate(range(116, 140, 4)):
        f = t.fuseau([(x, 100), (x + (k % 3) - 1, 84 - (k % 2) * 6)], 3, 3)
        t.piece(f, B, ombre=0)
        t.peindre(t.bord(f, 1, 0, 1), V)
    cornet = t.poly([(112, 98), (142, 98), (130, 128), (124, 128)])
    t.piece(cornet, V, ombre=2)
    t.rayures(cornet & ~t.bord(cornet, -1, -1, 1), B, 6, 2, vertical=True)
    t.peindre(t.rect(112, 98, 142, 100) & cornet, B)
    poing(t, 116, 104, 130, 118, 3)
    # le bras levé, la galette sur la paume, comme un plat de fête
    bras = t.fuseau([(70, 80), (52, 74), (42, 58)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(36, 60), (48, 58), (50, 64), (38, 66)])
    paume = t.ell(32, 50, 54, 60)
    galette = t.ell(14, 36, 66, 54)
    t.piece(galette, B, ombre=0)
    dessus = t.ell(16, 34, 64, 48)
    t.peindre(dessus, V)
    t.damier(t.bord(dessus, 1, 1, 2), N)
    for k in range(5):
        x = 20 + k * 9
        t.peindre(t.courbe([(x, 38), (x + 5, 41), (x + 10, 38)]) & dessus, B)
        t.peindre(t.courbe([(x, 44), (x + 5, 41), (x + 10, 44)]) & dessus, B)
    t.peindre(t.rect(14, 48, 66, 49) & galette, N)
    t.damier(t.rect(14, 50, 66, 54) & galette, V)
    # la couronne en papier du Roi Gras, posée sur la galette
    cour = t.poly([(28, 34), (28, 20), (34, 26), (40, 14), (46, 26), (52, 20), (52, 34)])
    t.piece(cour, B, ombre=0)
    t.peindre(t.rect(28, 30, 52, 31), V)
    for x in (34, 40, 46):
        t.point(x, 33, V)
    t.etoile(40, 22, V, 1)
    t.piece(paume, B, ombre=0)
    for k in range(3):
        t.peindre(t.trait([(36 + k * 5, 53), (36 + k * 5, 57)]), N)
    for (x, y) in [(10, 22), (64, 18), (8, 60)]:
        t.etincelle(x, y)
    t.peindre(t.courbe([(24, 30), (22, 22), (26, 16)]) | t.courbe([(58, 28), (60, 20), (56, 14)]), B)
    # la longue tresse qui passe devant l'épaule
    tresse = t.fuseau([(100, 54), (106, 72), (104, 96), (100, 112)], 8, 6)
    t.piece(tresse, V, ombre=0, lumiere=False)
    for y in range(58, 112, 6):
        t.peindre(t.courbe([(98, y), (103, y + 3), (108, y)]) & tresse, N)
        t.peindre(t.trait([(100, y + 1), (102, y + 2)]) & tresse, B)
    t.piece(t.rect(97, 110, 104, 114), B, ombre=0)
    t.piece(t.fuseau([(100, 114), (100, 124)], 6, 2), V, ombre=0)
    # les rabats de fourrure de la chapka, derrière la tête
    for x in (57, 104):
        rab = t.poly([(x, 24), (x + 12, 24), (x + 11, 54), (x + 6, 58), (x + 1, 54)])
        t.piece(rab, B, ombre=0)
        for y in range(30, 54, 5):
            t.peindre(t.trait([(x + 3, y), (x + 5, y + 3), (x + 8, y)]) & rab, V)
        t.damier(t.bord(rab, 1, 1, 2), V)
    # la tête, longue
    tete = t.ell(67, 18, 105, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 40, 176, 66), V)
    # la chapka : calotte verte, bande de fourrure, pompon
    calotte = t.ell(70, -2, 102, 28) & t.rect(0, -6, 176, 20)
    t.piece(calotte, V, ombre=3)
    t.peindre(t.courbe([(86, 0), (86, 18)]) | t.courbe([(78, 4), (76, 18)]) | t.courbe([(94, 4), (96, 18)]), N)
    t.piece(t.ell(82, -6, 90, 2), B, ombre=0)
    fourrure = t.ell(62, 14, 112, 34)
    t.piece(fourrure, B, ombre=0)
    for k, x in enumerate(range(64, 110, 4)):
        y = 18 + (k % 3) * 4
        if fourrure[y + 4, x]:
            t.peindre(t.trait([(x, y), (x + 1, y + 4), (x + 3, y + 1)]) & fourrure, V)
    t.damier(t.bord(fourrure, 1, 1, 2), V)
    # le visage : sourcils hauts, regard vers la galette, grand sourire à petites défenses
    t.peindre(t.courbe([(72, 39), (77, 35), (83, 37)], 2), V)
    t.peindre(t.courbe([(89, 37), (95, 35), (100, 39)], 2), V)
    t.peindre(t.courbe([(72, 40), (77, 36), (83, 38)]), N)
    t.peindre(t.courbe([(89, 38), (95, 36), (100, 40)]), N)
    t.oeil(72, 41, l=11, h=9, regard=(-2, 0), paupiere=2)
    t.oeil(90, 41, l=11, h=9, regard=(-2, 0), paupiere=2)
    nez = t.poly([(86, 47), (90, 54), (88, 57), (83, 57)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(85, 56, N)
    t.pixels(75, 58, """
::....................::
.::::::::::::::::::::::.
.:oooooooooooooooooooo:.
..::::::::::::::::::::..
...:::::########:::::...
....::::########::::....
......::::::::::::......
""")
    for x in (78, 95):
        t.pixels(x, 54, ".:.\n:o:\n:o:\n:o:")
    t.damier(t.ell(70, 56, 75, 60), V); t.damier(t.ell(97, 56, 102, 60), V)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Laurana la Flamboyante
def laurana():
    """Laurana la Flamboyante, le héraut : une chevelure de feu qui flotte au vent, le tabard du héraut ; elle sonne de
    sa trompette d'argent levée vers le ciel, d'où pend la bannière de Cybersup."""
    t = Toile()
    # la chevelure de feu, qui flotte au vent derrière elle
    feu = t.ell(48, 22, 92, 72)
    flammes = [([(62, 28), (54, 12), (46, 6), (40, -4)], 16), ([(56, 36), (40, 30), (34, 14), (20, 6)], 20),
               ([(54, 48), (34, 46), (26, 30), (10, 24)], 20), ([(56, 60), (34, 62), (24, 50), (6, 50)], 18),
               ([(60, 68), (42, 80), (30, 72), (14, 76)], 15), ([(64, 72), (56, 90), (44, 90), (34, 100)], 11)]
    for pts, e in flammes:
        feu |= t.fuseau(pts, e, 2)
    t.piece(feu, V, ombre=3, lumiere=False)
    for pts, e in flammes:
        a, b, c, d = pts
        t.peindre(t.courbe([((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), b, c]), N)
        lang = t.fuseau([((a[0] * 2 + b[0]) / 3 + 2, (a[1] * 2 + b[1]) / 3), ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2 + 2)], 4, 1)
        t.peindre(lang & feu, B)
    for (x, y) in [(10, 26), (4, 58), (18, 88), (34, 108), (24, 4)]:
        t.etoile(x, y, B, 1)
    # les jambes, bottes hautes, en marche
    for pts in ([(74, 124), (70, 140), (66, 152)], [(90, 124), (96, 140), (102, 150)]):
        j = t.fuseau(pts, 12, 10)
        t.piece(j, V, ombre=2)
    for (x0, pts) in ((60, [(58, 146), (76, 146), (78, 158), (54, 158), (54, 152)]),
                      (96, [(94, 142), (108, 140), (118, 150), (112, 158), (98, 156)])):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b, N)
        t.peindre(t.bord(b, -1, -1, 1), B)
    t.peindre(t.trait([(56, 146), (78, 146)], 2) | t.trait([(94, 142), (108, 140)], 2), B)
    # la tunique verte et le tabard blanc du héraut, blason et franges
    tun = t.poly([(66, 74), (98, 74), (104, 100), (108, 128), (58, 128), (62, 100)])
    t.piece(tun, V, ombre=3)
    tab = t.poly([(70, 76), (94, 76), (98, 132), (66, 132)])
    t.piece(tab, B, ombre=2)
    t.peindre(t.bord(tab, -1, 0, 2) | t.bord(tab, 1, 0, 2), V)
    for x in range(67, 98, 4):
        t.pixels(x, 133, "o.\no.\no.")
    bl = t.poly([(74, 92), (90, 92), (90, 104), (82, 112), (74, 104)])
    t.piece(bl, V, ombre=0)
    t.peindre(t.trait([(77, 96), (80, 99), (77, 102)]) | t.trait([(82, 103), (86, 103)]), B)
    t.peindre(t.rect(64, 112, 100, 115) & tun, N)
    t.peindre(t.rect(64, 113, 100, 113) & tun & ((t.xx % 2) == 0), V)
    t.piece(t.ell(78, 110, 86, 117), B, ombre=0)
    t.peindre(t.ell(80, 112, 84, 115), N)
    # le bras sur la hanche
    bras2 = t.fuseau([(66, 80), (52, 96), (64, 108)], 10, 7)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(56, 100), (60, 98), (64, 106), (58, 108)])
    poing(t, 60, 100, 72, 112, 2, -1)
    # l'épaulette à franges
    ep = t.poly([(88, 72), (104, 74), (106, 82), (90, 82)])
    t.piece(ep, B, ombre=0)
    for x in range(91, 106, 2):
        t.peindre(t.trait([(x, 83), (x, 87)]), B)
    # la bannière qui pend sous la trompette, à queue d'aronde
    for (x, y) in [(120, 46), (140, 35)]:
        t.peindre(t.trait([(x, y), (x, y + 6)]), B)
    ban = t.poly([(116, 52), (148, 38), (148, 86), (132, 78), (116, 92)])
    t.piece(ban, V, ombre=3)
    t.peindre(t.trait([(118, 54), (146, 41)]) | t.trait([(118, 89), (132, 80), (146, 84)]), B)
    blason = t.poly([(122, 60), (142, 54), (142, 70), (132, 80), (122, 74)])
    t.piece(blason, B, ombre=0)
    texte(t, 125, 62, ">_", N, 2)
    for (x, y) in [(119, 68), (145, 76)]:
        t.etoile(x, y, B, 1)
    # le bras levé qui tient la trompette
    bras = t.fuseau([(94, 80), (108, 68), (118, 52)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(112, 56), (122, 54), (124, 60), (114, 62)])
    # la tête, menton levé vers le ciel
    tete = t.ell(62, 26, 100, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 64), V)
    # la frange de flammes
    fr = t.poly([(60, 42), (62, 30), (74, 22), (92, 22), (102, 32), (100, 40), (92, 32), (84, 30), (74, 32), (66, 38)])
    fr |= t.fuseau([(98, 26), (104, 30), (106, 40)], 5, 1)
    t.piece(fr, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(66, 36), (74, 28), (90, 26)]), N)
    t.peindre(t.courbe([(72, 26), (82, 24)]), B)
    # le visage : regard vers le ciel, cils, joues gonflées par le souffle
    t.peindre(t.courbe([(67, 44), (72, 41), (78, 42)], 2), V)
    t.peindre(t.courbe([(85, 42), (90, 40), (96, 42)], 2), V)
    t.peindre(t.courbe([(67, 45), (72, 42), (78, 43)]), N)
    t.peindre(t.courbe([(85, 43), (90, 41), (96, 43)]), N)
    t.oeil(67, 46, l=11, h=9, regard=(2, -2), paupiere=2, cils=-1)
    t.oeil(85, 46, l=11, h=9, regard=(2, -2), paupiere=2, cils=1)
    t.pixels(80, 52, """
..:..
..:..
.::..
::::.
""")
    t.damier(t.ell(68, 57, 76, 63), V); t.damier(t.ell(90, 56, 98, 62), V)
    t.peindre(t.courbe([(76, 64), (74, 61)]) | t.courbe([(96, 60), (98, 57)]), N)
    t.pixels(86, 58, """
.::::::.
:oooooo:
:o::::o:
.::::::.
""")
    # la trompette d'argent : embouchure, tube, pavillon
    tube = t.trait([(92, 60), (148, 28)], 4)
    t.piece(tube, B, ombre=0)
    t.peindre(t.trait([(96, 59), (146, 30)]), V)
    t.piece(t.ell(89, 56, 96, 63), B, ombre=0)
    t.peindre(t.ell(91, 58, 94, 61), N)
    for (x, y) in [(110, 49), (132, 37)]:
        t.piece(t.ell(x - 3, y - 3, x + 3, y + 3), B, ombre=0)
        t.point(x, y, V)
    dx, dy = 0.87, -0.5
    px, py = 0.5, 0.87
    cx, cy = 160, 20
    pav = t.poly([(146 - 2 * px, 30 - 2 * py), (cx - 13 * px, cy - 13 * py), (cx + 13 * px, cy + 13 * py),
                  (146 + 2 * px, 30 + 2 * py)])
    t.piece(pav, B, ombre=0)
    t.damier(t.bord(pav, 1, 1, 2), V)
    bord_ = [(cx + 13 * math.cos(a) * px + 5 * math.sin(a) * dx, cy + 13 * math.cos(a) * py + 5 * math.sin(a) * dy)
             for a in [k * math.pi / 12 for k in range(24)]]
    rim = t.poly(bord_)
    t.piece(rim, B, ombre=0)
    inner = [(cx + 10 * math.cos(a) * px + 3 * math.sin(a) * dx + 1, cy + 10 * math.cos(a) * py + 3 * math.sin(a) * dy)
             for a in [k * math.pi / 12 for k in range(24)]]
    t.peindre(t.poly(inner), N)
    t.peindre(t.courbe([(149, 26), (154, 18), (156, 12)]), V)
    poing(t, 114, 38, 128, 52, 3)
    # les notes qui jaillissent du pavillon
    for k in range(9):
        a = -0.9 + k * 0.22
        if k % 2 == 0:
            t.peindre(t.trait([(165 + 14 * math.cos(a), 21 + 14 * math.sin(a)), (165 + 20 * math.cos(a), 21 + 20 * math.sin(a))]), B)
    note(t, 152, 60)
    note(t, 156, 90, double=False)
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Manon la Châtelaine
def manon():
    """Manon la Châtelaine, intendante de la Forteresse : un chignon tenu par une épingle, un col montant de dentelle,
    une longue robe à ceinture de clés ; elle tient ouvert le grand registre des sceaux et y coche, plume en main."""
    t = Toile()
    # la jupe longue, évasée, panneau central brodé
    jupe = t.poly([(68, 104), (98, 104), (110, 124), (122, 146), (130, 158), (36, 158), (44, 144), (56, 124)])
    t.piece(jupe, V, ombre=4)
    for pts in ([(66, 110), (54, 134), (46, 156)], [(100, 110), (112, 134), (120, 156)]):
        t.peindre(t.courbe(pts), N)
    pan = t.poly([(76, 106), (90, 106), (100, 158), (66, 158)])
    t.piece(pan, B, ombre=0)
    t.damier(t.bord(pan, 1, 0, 2), V)
    for y in range(114, 154, 8):
        w = (y - 106) * 17 // 52
        t.pixels(82, y, ".#.\n#o#\n.#.")
        t.point(83 - w + 3, y + 1, V); t.point(83 + w - 3, y + 1, V)
    ourlet = t.bord(jupe, 0, 1, 4)
    t.peindre(ourlet, B)
    for x in range(36, 130, 6):
        t.pixels(x, 155, ".:.:\n:o:o")
    for (x, y) in [(52, 140), (112, 140), (60, 124), (106, 124), (48, 152), (118, 152)]:
        t.etoile(x, y, B, 1)
    # le corsage, ceinture et clés pendues
    cor = t.poly([(68, 76), (96, 76), (100, 92), (96, 108), (70, 108), (64, 92)])
    t.piece(cor, V, ombre=3)
    t.peindre(t.trait([(82, 80), (82, 106)]), N)
    for y in (84, 92, 100):
        t.peindre(t.ell(80, y - 1, 84, y + 3), B)
        t.point(82, y + 1, N)
    ceint = t.rect(64, 104, 102, 109)
    t.piece(ceint, N, bord=N, lumiere=False)
    t.peindre(t.rect(65, 105, 101, 105), V)
    t.piece(t.ell(78, 102, 88, 112), B, ombre=0)
    t.peindre(t.ell(80, 104, 86, 110), V)
    t.peindre(t.courbe([(96, 108), (100, 118), (98, 128)]) & ((t.yy % 2) == 0), B)
    for k, (x, y) in enumerate([(92, 120), (98, 128), (104, 120)]):
        t.peindre(t.trait([(x + 2, y - 4), (98, 112)]), B)
        t.piece(t.ell(x, y - 4, x + 6, y + 2), B, ombre=0)
        t.peindre(t.ell(x + 2, y - 2, x + 4, y), N)
        t.piece(t.trait([(x + 3, y + 2), (x + 3, y + 12)], 2), B, ombre=0)
        t.peindre(t.rect(x + 4, y + 8, x + 6, y + 9) | t.rect(x + 4, y + 11, x + 6, y + 12), B)
    # le bras qui porte le registre
    bras2 = t.fuseau([(68, 80), (54, 96), (40, 100)], 10, 8)
    t.piece(bras2, V, ombre=2)
    # le grand registre ouvert, pages lignées et sceaux cochés
    couv = t.poly([(6, 72), (36, 80), (66, 72), (68, 104), (36, 112), (4, 104)])
    t.piece(couv, V, ombre=2)
    pg = t.poly([(8, 70), (36, 78), (36, 108), (8, 100)])
    pd = t.poly([(36, 78), (64, 70), (64, 100), (36, 108)])
    for p in (pg, pd):
        t.piece(p, B, ombre=0)
    t.peindre(t.trait([(36, 78), (36, 108)]), N)
    t.damier(t.bord(pg, 1, 0, 2) | t.bord(pd, -1, 0, 2), V)
    for k in range(5):
        y = 78 + k * 5
        t.peindre(t.trait([(12, y + 1 - 1), (26, y + 4)]) & ((t.xx % 3) != 0), V)
        t.pixels(28, y + 2, ":::\n:#:\n:::")
        t.peindre(t.trait([(40, y + 3), (56, y - 1)]) & ((t.xx % 3) != 0), V)
    for k in range(3):
        t.pixels(29, 80 + k * 5, ".o.")
    t.piece(t.fuseau([(36, 108), (34, 118), (38, 124)], 3, 3), V, ombre=0)
    t.pixels(40, 86, """
:::::::::.
:ooooooo:.
:o:o:o:o:.
:ooooooo:.
:::::::::.
""")
    poing(t, 30, 100, 44, 112, 2)
    # le bras qui écrit, la plume d'oie sur la page
    bras = t.fuseau([(96, 80), (92, 98), (62, 94)], 10, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(60, 88), (66, 88), (66, 99), (60, 99)])
    plume = t.fuseau([(52, 92), (44, 74), (30, 56)], 2, 9)
    t.piece(plume, B, ombre=0)
    for k in range(5):
        x = 44 - k * 3
        t.peindre(t.trait([(x, 76 - k * 4), (x + 4, 72 - k * 4)]), V)
    t.peindre(t.courbe([(50, 90), (42, 76), (32, 58)]), V)
    poing(t, 48, 86, 62, 98, 3, -1)
    # le col montant de dentelle
    col = t.poly([(64, 64), (70, 72), (94, 72), (100, 64), (98, 80), (66, 80)])
    t.piece(col, B, ombre=0)
    for x in range(65, 100, 4):
        t.peindre(t.trait([(x, 66), (x + 1, 79)]), V)
    t.peindre(t.trait([(66, 79), (98, 79)]), N)
    t.piece(t.ell(78, 74, 86, 82), V, ombre=0)
    t.point(82, 78, B)
    # le chignon et son épingle
    chig = t.ell(70, 6, 96, 30)
    t.piece(chig, V, ombre=3)
    t.peindre(t.courbe([(74, 22), (78, 12), (88, 10), (92, 18)]), N)
    t.peindre(t.courbe([(78, 24), (82, 16), (88, 16)]), N)
    t.peindre(t.courbe([(76, 12), (82, 9)]), B)
    t.piece(t.trait([(62, 22), (104, 8)], 2), B, ombre=0)
    t.piece(t.ell(100, 2, 110, 12), B, ombre=0)
    t.pixels(102, 4, ".:.\n:#:\n.:.")
    # les cheveux lisses, raie de côté
    chev = t.ell(60, 22, 104, 58)
    t.piece(chev, V, ombre=0, lumiere=False)
    # la tête
    tete = t.ell(64, 28, 100, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 66), V)
    fr = t.poly([(62, 44), (64, 30), (78, 24), (96, 26), (102, 40), (94, 34), (86, 32), (78, 34), (68, 40)])
    t.piece(fr, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(86, 26), (80, 30), (68, 40)]), N)
    t.peindre(t.courbe([(90, 28), (98, 32)]), B)
    t.peindre(t.courbe([(70, 30), (76, 27)]), B)
    # le visage : regard vers le registre, cils, sourire bienveillant
    t.peindre(t.courbe([(67, 45), (72, 42), (78, 43)], 2), V)
    t.peindre(t.courbe([(86, 43), (91, 42), (96, 45)], 2), V)
    t.peindre(t.courbe([(67, 46), (72, 43), (78, 44)]), N)
    t.peindre(t.courbe([(86, 44), (91, 43), (96, 46)]), N)
    t.oeil(67, 47, l=11, h=9, regard=(-2, 1), paupiere=2, cils=-1)
    t.oeil(86, 47, l=11, h=9, regard=(-2, 1), paupiere=2, cils=1)
    t.pixels(80, 54, """
..:..
..:..
.::..
::::.
""")
    t.pixels(76, 61, """
:..........:
.::::::::::.
.:oooooooo:.
..:######:..
...::::::...
""")
    t.damier(t.ell(68, 58, 74, 62), V); t.damier(t.ell(91, 58, 97, 62), V)
    for (x, y) in [(64, 66), (100, 64)]:
        t.piece(t.ell(x - 2, y, x + 2, y + 5), B, ombre=0)
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ Wissam le Sage
def wissam():
    """Wissam le Sage : assis en tailleur sur son tapis à franges, le turban, une barbe courte et soignée ; il lève le
    doigt du conseil, un verre de thé dans l'autre main, à côté de sa théière qui fume."""
    t = Toile()
    # le tapis, en perspective, à losanges et franges
    tapis = t.poly([(20, 136), (156, 136), (166, 156), (10, 156)])
    t.piece(tapis, V, ombre=0)
    t.peindre(t.poly([(26, 139), (150, 139), (158, 153), (18, 153)]) & ~t.poly([(29, 141), (147, 141), (154, 151), (22, 151)]), B)
    for x in range(36, 150, 14):
        t.peindre(t.poly([(x, 146), (x + 6, 142), (x + 12, 146), (x + 6, 150)]), B)
        t.point(x + 6, 146, V)
    for x in range(12, 166, 3):
        t.peindre(t.trait([(x, 157), (x, 160)]), B)
    # la théière qui fume, et le plateau
    t.piece(t.ell(126, 128, 164, 138), B, ombre=0)
    t.peindre(t.ell(129, 130, 161, 136), V)
    th = t.poly([(134, 106), (154, 106), (158, 122), (150, 132), (138, 132), (130, 122)])
    t.piece(th, B, ombre=2)
    t.peindre(t.rect(130, 116, 158, 118) & th, V)
    for x in range(134, 156, 5):
        t.point(x, 112, V); t.point(x + 2, 124, V)
    bec = t.fuseau([(132, 120), (124, 114), (118, 104)], 5, 3)
    t.piece(bec, B, ombre=0)
    anse = t.courbe([(154, 110), (164, 112), (158, 126)], 2)
    t.piece(anse, B, ombre=0)
    cou = t.poly([(138, 100), (150, 100), (152, 106), (136, 106)])
    t.piece(cou, B, ombre=0)
    t.piece(t.poly([(140, 92), (148, 92), (150, 100), (138, 100)]), V, ombre=0)
    t.piece(t.ell(141, 86, 147, 92), B, ombre=0)
    for (x0, pts) in ((0, [(118, 100), (114, 90), (120, 82), (116, 72)]), (1, [(144, 84), (140, 74), (146, 66), (142, 56)])):
        t.peindre(t.courbe(pts) & ((t.yy % 4) != 0), B)
    # les jambes croisées, sous la djellaba
    jambes = t.ell(30, 112, 128, 144)
    t.piece(jambes, V, ombre=3)
    t.peindre(t.courbe([(46, 128), (78, 122), (108, 132)]), N)
    t.peindre(t.courbe([(70, 136), (90, 128), (116, 126)]), N)
    for x, s in ((34, 1), (110, 1)):
        p = t.ell(x, 128, x + 18, 140)
        t.piece(p, B, ombre=0)
        t.damier(t.bord(p, 0, 1, 1), V)
        t.peindre(t.courbe([(x + 4, 131), (x + 10, 129), (x + 15, 132)]), V)
    # le corps : djellaba verte à galons blancs
    corps = t.poly([(62, 72), (98, 72), (110, 96), (114, 124), (46, 124), (50, 96)])
    t.piece(corps, V, ombre=3)
    gal = t.poly([(76, 74), (84, 74), (86, 124), (74, 124)])
    t.piece(gal, B, ombre=0)
    for y in range(80, 122, 6):
        t.pixels(77, y, ":o:o:\no:o:o")
    t.peindre(t.courbe([(58, 96), (54, 112), (50, 122)]) | t.courbe([(102, 96), (106, 112), (110, 122)]), N)
    # le bras qui tient le verre de thé, posé sur le genou
    bras2 = t.fuseau([(62, 80), (48, 96), (42, 112)], 11, 9)
    t.piece(bras2, V, ombre=2)
    manchette(t, [(36, 108), (48, 106), (50, 112), (38, 114)])
    verre = t.poly([(34, 94), (46, 94), (44, 110), (36, 110)])
    t.piece(verre, B, ombre=0)
    t.peindre(t.poly([(36, 100), (44, 100), (43, 108), (37, 108)]), V)
    t.pixels(37, 96, "o:o:o:o")
    t.peindre(t.courbe([(38, 90), (36, 84), (40, 78)]) & ((t.yy % 3) != 0), B)
    poing(t, 36, 104, 50, 116, 2)
    # le bras levé, l'index du conseil
    bras = t.fuseau([(98, 80), (114, 72), (120, 58)], 11, 9)
    t.piece(bras, V, ombre=2)
    manchette(t, [(112, 58), (124, 56), (126, 62), (114, 64)])
    t.pixels(113, 42, """
....::.....
...:oo:....
...:oo:....
...:oo:....
...:oo:....
..::oo::::.
.:oooooooo:
:ooo:oooooo:
:ooooo:ooo:.
:o:::::oooo:
:ooooooooo:.
:o:::::ooo:.
.:oooooooo:.
..::::::::..
""")
    for (x, y) in [(106, 38), (128, 36), (118, 32)]:
        t.peindre(t.trait([(x, y), (x + (x - 116) // 4, y - 4)]), B)
    t.etincelle(134, 46)
    # la tête
    tete = t.ell(60, 30, 100, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 66), V)
    for x, s in ((56, 1), (96, -1)):
        o = t.ell(x, 48, x + 8, 60)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 4 - s, 51), (x + 4 + s, 54), (x + 4 - s, 57)]), N)
    # la barbe courte et soignée
    barbe = (t.ell(60, 36, 100, 84) & t.rect(0, 64, 176, 170)) | t.poly([(70, 80), (90, 80), (80, 88)])
    barbe |= t.fuseau([(61, 54), (62, 66)], 2, 5) | t.fuseau([(99, 54), (98, 66)], 2, 5)
    t.piece(barbe, V, ombre=0, lumiere=False)
    t.damier(eroder_h(barbe, 2) & t.rect(0, 0, 176, 78), B)
    for pts in ([(66, 74), (70, 80)], [(80, 80), (80, 86)], [(94, 74), (90, 80)]):
        t.peindre(t.courbe(pts), N)
    # le turban : enroulé, bande croisée, joyau
    tur = t.ell(54, 6, 106, 46)
    t.piece(tur, B, ombre=3)
    for k in range(4):
        y = 14 + k * 7
        t.peindre(t.courbe([(56, y + 10), (80, y - 2), (104, y + 8)]) & tur, V)
    t.peindre(t.courbe([(60, 40), (80, 30), (100, 40)], 2) & tur, N)
    t.piece(t.ell(74, 22, 86, 34), V, ombre=0)
    t.peindre(t.poly([(80, 24), (84, 28), (80, 32), (76, 28)]), B)
    t.point(80, 28, V)
    t.piece(t.fuseau([(80, 22), (84, 10), (92, 4)], 4, 1), V, ombre=0)
    # le visage : yeux bienveillants, sourcils relevés, sourire dans la barbe
    t.piece(t.fuseau([(64, 47), (70, 44), (77, 46)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(84, 46), (90, 44), (96, 47)], 4, 2), V, ombre=0)
    t.oeil(65, 50, l=11, h=8, regard=(2, -1), paupiere=2)
    t.oeil(84, 50, l=11, h=8, regard=(2, -1), paupiere=2)
    for (x, s) in ((63, -1), (96, 1)):
        t.peindre(t.trait([(x, 56), (x + 2 * s, 54)]), N)
    nez = t.poly([(80, 54), (84, 62), (82, 65), (76, 65)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(78, 64, N)
    mous = t.fuseau([(80, 66), (73, 67), (67, 65)], 3, 1) | t.fuseau([(80, 66), (87, 67), (93, 65)], 3, 1)
    t.piece(mous, V, ombre=0, lumiere=False)
    t.pixels(72, 69, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..::########::..
....::::::::....
""")
    t.sol(161, cx=88)
    return t.image()


# ------------------------------------------------------------------ Jean-Baptiste, le Maître des Adresses
def jeanbaptiste():
    """Jean-Baptiste, le Maître des Adresses, fils de l'Oracle des Noms : la casquette, la cape de voyageur, l'œil de
    l'Oracle en pendentif ; il pointe son compas sur le grand plan de rue qu'il déroule, aux maisons numérotées."""
    t = Toile()
    # la cape de voyageur, doublure blanche, qui flotte derrière
    cape = t.poly([(84, 76), (122, 76), (134, 100), (146, 134), (156, 156), (136, 152), (122, 158), (110, 150),
                   (96, 158), (88, 130)])
    t.piece(cape, V, ombre=4)
    doub = t.poly([(136, 120), (146, 134), (156, 156), (136, 152), (132, 136)])
    t.piece(doub, B, ombre=2)
    for pts in ([(110, 96), (116, 128), (122, 156)], [(122, 92), (132, 126), (140, 150)]):
        t.peindre(t.courbe(pts), N)
    # les jambes et les bottes de voyage
    for (x, pts) in ((92, [(96, 116), (94, 136), (92, 150)]), (108, [(110, 116), (114, 136), (116, 150)])):
        j = t.fuseau(pts, 12, 10)
        t.piece(j, V, ombre=2)
    for x in (82, 106):
        b = t.poly([(x + 4, 144), (x + 18, 144), (x + 20, 158), (x - 2, 158), (x, 152)])
        t.piece(b, V, ombre=0)
        t.damier(b & t.rect(0, 150, 176, 158), N)
        t.peindre(t.trait([(x + 4, 145), (x + 18, 145)], 2), B)
        t.peindre(t.trait([(x, 155), (x + 6, 152)]), B)
    # le gilet sur la chemise blanche
    torse = t.poly([(90, 74), (120, 74), (124, 96), (122, 120), (88, 120), (86, 96)])
    t.piece(torse, B, ombre=3)
    for (pts) in ([(90, 74), (100, 74), (104, 96), (100, 120), (88, 120), (86, 96)],
                  [(112, 74), (120, 74), (124, 96), (122, 120), (108, 120), (106, 96)]):
        g = t.poly(pts)
        t.piece(g, V, ombre=2)
    for y in (100, 108):
        t.piece(t.ell(100, y - 2, 104, y + 2), B, ombre=0)
    t.peindre(t.rect(86, 112, 124, 115), N)
    t.peindre(t.rect(86, 113, 124, 113) & ((t.xx % 2) == 0), V)
    t.piece(t.rect(100, 110, 108, 117), B, ombre=0)
    t.peindre(t.rect(102, 112, 106, 115), N)
    # l'œil de l'Oracle en pendentif
    t.peindre(t.courbe([(96, 76), (104, 90), (112, 76)]), B)
    pend = t.ell(98, 86, 110, 98)
    t.piece(pend, B, ombre=0)
    t.pixels(99, 89, ".::::::::.\n:oo###oo:.\n:o##:##o:.\n.:::::::..")
    # le bras du fond, qui tient le haut du plan
    bras2 = t.fuseau([(90, 80), (74, 62), (64, 42)], 10, 8)
    t.piece(bras2, V, ombre=2)
    # le grand plan de rue, déroulé : un rouleau en haut, le bas qui s'enroule
    plan = t.poly([(10, 40), (72, 38), (74, 124), (8, 128)])
    t.piece(plan, B, ombre=0)
    t.damier(t.bord(plan, 1, 0, 2), V)
    texte(t, 13, 44, "10.0.97.0/26", N)
    t.peindre(t.trait([(13, 51), (70, 50)]), V)
    rue = t.poly([(10, 82), (73, 80), (73, 88), (10, 90)])
    t.peindre(rue, V)
    t.peindre(t.trait([(12, 86), (72, 84)]) & ((t.xx % 6) < 3), B)
    maison(t, 14, 58, "1")
    maison(t, 30, 58, "2")
    texte(t, 46, 64, "..", N)
    maison(t, 58, 58, "62")
    maison(t, 12, 98, "0")
    maison(t, 46, 98, "63", crieur=True)
    t.peindre(t.ell(40, 94, 62, 120) & ~t.ell(42, 96, 60, 118), N)
    roul = t.ell(6, 120, 76, 134)
    t.piece(roul, B, ombre=2)
    t.peindre(t.courbe([(10, 126), (40, 124), (72, 126)]), V)
    tring = t.rect(6, 34, 76, 40)
    t.piece(tring, V, ombre=0)
    poing(t, 56, 26, 70, 41, 3, -1)
    # le bras de devant et le compas, pointé sur la maison du crieur
    bras = t.fuseau([(120, 82), (114, 108), (86, 108)], 11, 8)
    t.piece(bras, V, ombre=2)
    manchette(t, [(82, 102), (88, 102), (88, 114), (82, 114)])
    compas = t.trait([(76, 98), (60, 104)], 2) | t.trait([(76, 98), (63, 112)], 2)
    t.piece(compas, B, ombre=0)
    t.peindre(t.trait([(67, 102), (69, 106)]), V)
    t.piece(t.ell(73, 93, 80, 100), B, ombre=0)
    t.point(76, 96, N)
    poing(t, 74, 100, 88, 114, 3, -1)
    t.etincelle(46, 92)
    # la tête
    tete = t.ell(86, 30, 122, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 68), V)
    o = t.ell(118, 48, 126, 60)
    t.piece(o, B, ombre=0)
    t.peindre(t.courbe([(121, 51), (123, 54), (121, 57)]), N)
    # les cheveux qui dépassent de la casquette
    for pts in ([(118, 38), (126, 44), (126, 52)], [(88, 40), (84, 46), (84, 52)]):
        t.piece(t.fuseau(pts, 6, 1), V, ombre=0, lumiere=False)
    # la casquette de voyageur, visière vers l'avant
    cas = t.ell(84, 18, 124, 44) & t.rect(0, 0, 176, 38)
    t.piece(cas, V, ombre=3)
    t.peindre(t.courbe([(90, 26), (104, 20), (118, 26)]), N)
    t.piece(t.ell(102, 16, 108, 22), V, ombre=0)
    vis = t.poly([(82, 34), (110, 34), (106, 42), (74, 42)])
    t.piece(vis, V, ombre=0)
    t.damier(vis & t.rect(0, 38, 176, 42), N)
    t.peindre(t.trait([(84, 35), (108, 35)]), B)
    # le visage : regard vers le plan, sourire malicieux
    t.piece(t.fuseau([(88, 47), (94, 44), (101, 46)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(106, 46), (112, 44), (118, 47)], 4, 2), V, ombre=0)
    t.oeil(89, 49, l=11, h=9, regard=(-2, 1), paupiere=2)
    t.oeil(106, 49, l=11, h=9, regard=(-2, 1), paupiere=2)
    nez = t.poly([(102, 54), (98, 62), (100, 65), (105, 65)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(102, 64, N)
    t.pixels(94, 66, """
:............:
.::::::::::::.
.:oooooooooo:.
..::######::..
....::::::....
""")
    t.damier(t.ell(88, 60, 93, 64), V); t.damier(t.ell(112, 60, 117, 64), V)
    t.sol(160, cx=96)
    return t.image()


# ------------------------------------------------------------------ Gabriel, le Maître des Composants
def gabriel():
    """Gabriel, le Maître des Composants : les lunettes de protection relevées sur le front, une barbe de trois jours,
    le tablier à outils ; ravi, il brandit une barrette de mémoire d'une main et un processeur de l'autre."""
    t = Toile()
    # les jambes et les chaussures de sécurité
    for pts in ([(76, 120), (74, 138), (72, 150)], [(94, 120), (98, 138), (100, 150)]):
        j = t.fuseau(pts, 13, 11)
        t.piece(j, V, ombre=2)
    for (x, pts) in ((60, [(62, 146), (80, 146), (82, 158), (58, 158), (58, 152)]),
                     (94, [(92, 146), (108, 146), (114, 152), (114, 158), (92, 158)])):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b & t.rect(0, 152, 176, 158), N)
        t.peindre(t.trait([(pts[0][0] + 2, 148), (pts[1][0] - 2, 148)]), B)
    t.peindre(t.rect(56, 159, 116, 159), N)
    # le corps : chemise à manches retroussées
    corps = t.poly([(66, 76), (106, 76), (110, 96), (108, 124), (64, 124), (62, 96)])
    t.piece(corps, B, ombre=3)
    t.peindre(t.trait([(86, 78), (86, 92)]), V)
    # le tablier à outils, poches garnies
    tab = t.poly([(70, 84), (102, 84), (104, 104), (106, 130), (66, 130), (68, 104)])
    t.piece(tab, V, ombre=3)
    for x in (72, 100):
        t.peindre(t.trait([(x, 76), (x, 86)], 2), V)
    t.peindre(t.trait([(70, 108), (102, 108)]) | t.trait([(81, 108), (81, 126)]) | t.trait([(92, 108), (92, 126)]), N)
    t.peindre(t.trait([(70, 110), (102, 110)]) & ((t.xx % 2) == 0), B)
    # tournevis, pince et fer à souder dans les poches
    t.piece(t.trait([(75, 108), (75, 96)], 3), B, ombre=0)
    t.peindre(t.trait([(75, 96), (75, 92)]), B)
    t.peindre(t.rect(74, 102, 76, 103), V)
    for dx in (-2, 2):
        t.piece(t.trait([(86, 108), (86 + dx, 96)], 2), B, ombre=0)
    t.piece(t.ell(84, 100, 89, 105), V, ombre=0)
    t.piece(t.trait([(97, 108), (98, 98)], 3), B, ombre=0)
    t.peindre(t.trait([(98, 98), (99, 92)]), B)
    t.peindre(t.rect(96, 102, 99, 103), V)
    t.peindre(t.rect(64, 104, 108, 107) & corps, N)
    t.peindre(t.rect(64, 105, 108, 105) & corps & ((t.xx % 2) == 0), V)
    # le bras gauche levé : la barrette de mémoire
    bras = t.fuseau([(68, 82), (50, 70), (42, 50)], 11, 9)
    t.piece(bras, B, ombre=2)
    manchette(t, [(42, 60), (54, 60), (56, 66), (44, 68)], V)
    t.peindre(t.courbe([(50, 74), (56, 76)]), V)
    ram = t.poly([(10, 26), (64, 14), (68, 30), (14, 42)])
    t.piece(ram, V, ombre=0)
    for k in range(4):
        x0 = 16 + k * 12
        y0 = 26 - k * 3
        puce = t.poly([(x0, y0 + 2), (x0 + 9, y0), (x0 + 11, y0 + 8), (x0 + 2, y0 + 10)])
        t.piece(puce, N, bord=None, lumiere=False)
        t.point(x0 + 3, y0 + 3, V)
    for k in range(18):
        x = 15 + k * 3
        y = 40 - (k * 3 * 12) // 54
        t.peindre(t.trait([(x, y), (x + 1, y + 2)]), B)
    t.peindre(t.rect(38, 34, 40, 38) & ram, N)
    poing(t, 34, 40, 50, 56, 3)
    for (x, y) in [(6, 12), (72, 8), (4, 48)]:
        t.etincelle(x, y)
    # le bras droit levé : le processeur, broches et puce
    bras2 = t.fuseau([(104, 82), (122, 74), (132, 58)], 11, 9)
    t.piece(bras2, B, ombre=2)
    manchette(t, [(124, 66), (136, 64), (138, 70), (126, 72)], V)
    cpu = t.poly([(118, 18), (154, 14), (158, 48), (122, 52)])
    t.piece(cpu, B, ombre=0)
    t.peindre(t.bord(cpu, -1, -1, 1) | t.bord(cpu, 1, 1, 1), V)
    for k in range(7):
        for (a, b) in [((120 + k * 5, 18 - k * 0.6), (120 + k * 5, 14 - k * 0.6)),
                       ((123 + k * 5, 52 - k * 0.6), (123 + k * 5, 56 - k * 0.6)),
                       ((118 - k * 0, 22 + k * 4.5), (114, 22 + k * 4.5)), ((156, 18 + k * 4.5), (160, 18 + k * 4.5))]:
            t.peindre(t.trait([a, b]), B)
    die = t.poly([(128, 26), (146, 24), (148, 42), (130, 44)])
    t.piece(die, V, ombre=0)
    t.damier(die & ~t.bord(die, -1, -1, 2), N)
    t.peindre(t.poly([(132, 30), (142, 29), (143, 38), (133, 39)]), V)
    t.point(134, 31, B); t.point(135, 31, B)
    t.peindre(t.trait([(121, 21), (124, 21)]), N)
    poing(t, 124, 46, 140, 62, 3, -1)
    for (x, y) in [(110, 10), (166, 30), (164, 58)]:
        t.etincelle(x, y)
    # la tête
    tete = t.ell(66, 30, 106, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 46, 176, 70), V)
    for x, s in ((62, 1), (102, -1)):
        o = t.ell(x, 50, x + 8, 62)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 4 - s, 53), (x + 4 + s, 56), (x + 4 - s, 59)]), N)
    # la barbe de trois jours, en damier léger
    barbe = t.ell(66, 30, 106, 78) & t.rect(0, 62, 176, 170) & ~t.ell(76, 60, 98, 76)
    t.damier(barbe & ~t.bord(barbe, 0, 1, 1) & (t.yy % 2 == 0), V)
    t.damier(t.ell(70, 64, 102, 80) & tete & t.rect(0, 72, 176, 170), V)
    # les cheveux courts, en épis
    chev = t.ell(64, 22, 108, 50) & t.rect(0, 0, 176, 40)
    for pts in ([(70, 30), (66, 22), (68, 16)], [(80, 26), (80, 16), (86, 12)], [(92, 26), (96, 16), (102, 16)],
                [(102, 32), (108, 26), (112, 28)]):
        chev |= t.fuseau(pts, 8, 1)
    t.piece(chev, V, ombre=2, lumiere=False)
    for pts in ([(74, 30), (80, 24)], [(90, 30), (96, 24)]):
        t.peindre(t.courbe(pts), N)
    # les lunettes de protection relevées sur le front
    t.piece(t.rect(64, 36, 108, 40), V, ombre=0)
    t.damier(t.rect(64, 37, 108, 39), N)
    for x in (70, 88):
        verre = t.ell(x, 30, x + 16, 44)
        t.piece(verre, B, ombre=0)
        t.peindre(verre & ~t.ell(x + 2, 32, x + 14, 42), V)
        t.peindre(t.ell(x + 3, 33, x + 13, 41), B)
        t.peindre(t.courbe([(x + 5, 35), (x + 8, 34)]), V)
        t.point(x + 11, 39, V)
    # le visage : sourcils hauts de joie, yeux vers le processeur, grand sourire
    t.piece(t.fuseau([(70, 48), (76, 45), (82, 47)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(90, 47), (96, 45), (102, 48)], 4, 2), V, ombre=0)
    t.oeil(71, 51, l=11, h=9, regard=(2, 0), paupiere=2)
    t.oeil(90, 51, l=11, h=9, regard=(2, 0), paupiere=2)
    for (x, s) in ((69, -1), (102, 1)):
        t.peindre(t.trait([(x, 58), (x + 2 * s, 56)]), N)
    nez = t.poly([(86, 54), (91, 62), (89, 66), (82, 66)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(84, 65, N)
    t.pixels(76, 66, """
::....................::
.::::::::::::::::::::::.
.:oooooooooooooooooooo:.
..::::::::::::::::::::..
...:::::########:::::...
....::::########::::....
......::::::::::::......
""")
    t.sol(160, cx=86)
    return t.image()


# ------------------------------------------------------------------ Cheb Timour, l'assistant de Gabriel
def timour():
    """Cheb Timour, l'assistant de Gabriel : les cheveux en brosse, un sourire de chanteur, le tablier de cuisine ; il
    porte à deux mains un grand tajine qui fume, sous une lanterne ajourée d'étoiles, et chantonne."""
    t = Toile()
    # la lanterne ajourée qui pend du plafond
    t.peindre(t.trait([(146, 0), (146, 12)]) & ((t.yy % 3) != 2), B)
    toit = t.poly([(138, 18), (146, 10), (154, 18)])
    t.piece(toit, V, ombre=0)
    lant = t.poly([(136, 18), (156, 18), (160, 32), (156, 46), (136, 46), (132, 32)])
    t.piece(lant, V, ombre=0, lumiere=False)
    t.peindre(t.poly([(139, 21), (153, 21), (156, 32), (153, 43), (139, 43), (136, 32)]), B)
    for (x, y) in [(146, 26), (141, 36), (151, 36)]:
        t.pixels(x - 2, y - 2, "..:..\n.:::.\n:::::\n.:::.\n..:..")
    t.peindre(t.trait([(146, 21), (146, 43)]) | t.trait([(136, 32), (156, 32)]), V)
    t.piece(t.poly([(138, 46), (154, 46), (146, 54)]), V, ombre=0)
    rayons(t, 146, 32, 18, 26, 22, n=12, sauf=[(1.6, 3.4)])
    # les jambes et les babouches
    for pts in ([(72, 124), (70, 140), (68, 150)], [(90, 124), (94, 140), (96, 150)]):
        j = t.fuseau(pts, 12, 10)
        t.piece(j, V, ombre=2)
    for (pts) in ([(56, 150), (76, 148), (80, 158), (56, 158), (52, 152)], [(90, 148), (108, 150), (114, 154), (110, 158), (88, 158)]):
        b = t.poly(pts)
        t.piece(b, B, ombre=0)
        t.damier(t.bord(b, 0, 1, 1), V)
    t.peindre(t.trait([(52, 152), (48, 148)], 2) | t.trait([(114, 154), (118, 150)], 2), B)
    # le corps et le tablier de cuisine
    corps = t.poly([(64, 76), (100, 76), (106, 100), (104, 126), (60, 126), (58, 100)])
    t.piece(corps, V, ombre=3)
    tab = t.poly([(68, 80), (96, 80), (100, 104), (102, 132), (62, 132), (64, 104)])
    t.piece(tab, B, ombre=3)
    t.peindre(t.bord(tab, 0, 1, 3), V)
    t.peindre(t.trait([(62, 128), (102, 128)]) & ((t.xx % 2) == 0), B)
    for y in (84,):
        t.peindre(t.trait([(68, y), (96, y)]) & ((t.xx % 2) == 0), V)
    poche = t.poly([(70, 112), (92, 112), (92, 124), (70, 124)])
    t.peindre(poche & ~t.poly([(71, 113), (91, 113), (91, 123), (71, 123)]), V)
    t.piece(t.fuseau([(86, 113), (88, 102)], 2, 2), V, ombre=0)
    t.piece(t.ell(85, 96, 91, 104), V, ombre=0)
    # les bras qui portent le plat
    for (pts) in ([(62, 82), (46, 96), (38, 110)], [(100, 82), (116, 96), (124, 110)]):
        b = t.fuseau(pts, 10, 8)
        t.piece(b, V, ombre=2)
    # le tajine : le plat à rebord, le couvercle conique peint, le bouton ; la vapeur
    for pts in ([(66, 92), (60, 80), (52, 70), (50, 56)], [(96, 92), (104, 80), (112, 70), (114, 56)]):
        t.peindre(t.courbe(pts, 2) & ((t.yy % 5) != 0), B)
    plat = t.ell(30, 110, 130, 128)
    t.piece(plat, B, ombre=2)
    for x in range(38, 124, 8):
        t.pixels(x, 122, "#.#\n.#.")
    cou = t.poly([(42, 118), (60, 100), (72, 94), (88, 94), (100, 100), (118, 118)])
    t.piece(cou, V, ombre=3)
    t.peindre(t.trait([(52, 110), (108, 110)]), B)
    t.peindre(t.trait([(64, 100), (96, 100)]), B)
    for x in range(56, 106, 7):
        t.pixels(x - 1, 103, ".o.\no:o\n.o.")
    for x in range(48, 114, 6):
        t.point(x, 114, B)
    t.peindre(t.trait([(42, 118), (118, 118)], 2), N)
    t.piece(t.ell(74, 84, 86, 96), B, ombre=0)
    t.piece(t.rect(78, 80, 82, 86), B, ombre=0)
    t.point(77, 87, V)
    # les mains qui tiennent le plat par les bords
    for (x, s) in ((28, 1), (118, -1)):
        poing(t, x, 106, x + 14, 120, 3, s)
    # la tête
    tete = t.ell(60, 26, 100, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 68), V)
    for x, s in ((56, 1), (96, -1)):
        o = t.ell(x, 46, x + 8, 58)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 4 - s, 49), (x + 4 + s, 52), (x + 4 - s, 55)]), N)
    # les cheveux en brosse, bien droits
    brosse = t.poly([(60, 40), (60, 22), (64, 14), (96, 14), (100, 22), (100, 40), (94, 34), (66, 34)])
    t.piece(brosse, V, ombre=2, lumiere=False)
    t.peindre(t.rect(64, 14, 96, 14), B)
    for x in range(63, 98, 3):
        t.peindre(t.trait([(x, 12), (x, 30)]) & brosse & ((t.yy % 4) != 0), N)
        t.point(x + 1, 12, V)
    # le visage : yeux fermés de plaisir, sourcils hauts, bouche de chanteur grande ouverte
    t.peindre(t.courbe([(64, 42), (70, 39), (76, 41)], 2), V)
    t.peindre(t.courbe([(84, 41), (90, 39), (96, 42)], 2), V)
    t.peindre(t.courbe([(64, 43), (70, 40), (76, 42)]), N)
    t.peindre(t.courbe([(84, 42), (90, 40), (96, 43)]), N)
    for x in (65, 85):
        t.peindre(t.courbe([(x, 50), (x + 5, 46), (x + 10, 50)], 2), N)
        t.point(x - 1, 51, N); t.point(x + 11, 51, N)
    nez = t.poly([(80, 48), (84, 56), (82, 59), (76, 59)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(78, 58, N)
    t.pixels(71, 61, """
.:::::::::::::::::.
:ooooooooooooooooo:
:o:::::::::::::::o:
.:::::::::::::::::.
..::::#######::::..
...::#########::...
....:::::::::::....
""")
    t.damier(t.ell(64, 56, 70, 60), V); t.damier(t.ell(90, 56, 96, 60), V)
    # les notes qui s'envolent de la chanson
    note(t, 106, 52)
    note(t, 30, 50, double=True)
    note(t, 120, 76)
    t.sol(160, cx=84)
    return t.image()


# ------------------------------------------------------------------ Steve, le présentateur de Questions pour un Linux
def steve():
    """Steve, le présentateur de « Questions pour un Linux » : la banane gominée, un sourire de plateau, le nœud
    papillon, la veste à paillettes ; il lève le micro, les fiches de questions en éventail dans l'autre main."""
    t = Toile()
    # le panneau ON AIR du plateau, et des paillettes dans l'air
    pan = t.rect(4, 6, 40, 22)
    t.piece(pan, V, ombre=0)
    t.peindre(t.rect(6, 8, 38, 20), N)
    texte(t, 9, 11, "on air", B)
    for (x, y) in [(8, 40), (30, 34), (150, 60), (164, 90), (12, 74)]:
        t.etoile(x, y, B, 1)
    # les jambes et les chaussures vernies
    for pts in ([(78, 120), (76, 138), (74, 150)], [(94, 120), (98, 138), (100, 150)]):
        j = t.fuseau(pts, 12, 10)
        t.piece(j, V, ombre=2)
        t.peindre(t.courbe(pts) & j, B)
    for (pts) in ([(62, 148), (80, 148), (82, 158), (58, 158)], [(92, 148), (108, 148), (114, 158), (92, 158)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b, N)
        t.peindre(t.trait([(pts[0][0] + 2, 150), (pts[1][0] - 2, 150)]), B)
    t.peindre(t.rect(56, 159, 116, 159), N)
    # la veste à paillettes, revers blancs, chemise et nœud papillon
    veste = t.poly([(66, 76), (106, 76), (112, 98), (110, 126), (62, 126), (60, 98)])
    t.piece(veste, V, ombre=3)
    t.damier(veste & ((t.xx // 4 + t.yy // 4) % 3 == 0) & ~t.bord(veste, -1, -1, 1), B)
    chem = t.poly([(80, 76), (92, 76), (90, 104), (86, 110), (82, 104)])
    t.piece(chem, B, ombre=0)
    for y in (90, 98):
        t.peindre(t.ell(85, y - 1, 87, y + 1), N)
    for s in (-1, 1):
        rev = t.poly([(86 + s * 6, 76), (86 + s * 14, 78), (86 + s * 8, 108), (86 + s * 4, 104)])
        t.piece(rev, B, ombre=0)
        t.damier(t.bord(rev, 1, 1, 1), V)
    nd = t.poly([(76, 78), (84, 82), (88, 82), (96, 78), (96, 88), (88, 84), (84, 84), (76, 88)])
    t.piece(nd, V, ombre=0)
    t.piece(t.rect(84, 81, 88, 85), V, ombre=0)
    t.peindre(t.trait([(78, 80), (78, 86)]) | t.trait([(94, 80), (94, 86)]), N)
    t.piece(t.poly([(98, 88), (104, 86), (104, 92), (98, 94)]), B, ombre=0)
    t.peindre(t.trait([(99, 86), (101, 82)]) | t.trait([(102, 86), (104, 82)]), B)
    # le bras qui tient les fiches de questions, en éventail
    bras2 = t.fuseau([(66, 82), (50, 98), (44, 112)], 11, 9)
    t.piece(bras2, V, ombre=2)
    t.damier(bras2 & ((t.xx // 4 + t.yy // 4) % 3 == 0) & ~t.bord(bras2, -1, -1, 1), B)
    for k, (dx, dy) in enumerate(((-6, -4), (-3, -2), (0, 0))):
        c = t.poly([(26 + dx, 84 + dy), (52 + dx, 80 + dy), (56 + dx, 112 + dy), (30 + dx, 116 + dy)])
        t.piece(c, B, ombre=0)
    t.damier(t.bord(c, 1, 1, 2), V)
    grand_texte(t, 34, 88, "?", V, 2)
    t.peindre(t.trait([(32, 106), (46, 104)]) & ((t.xx % 2) == 0), V)
    poing(t, 40, 106, 54, 120, 3)
    # le bras levé qui tend le micro
    bras = t.fuseau([(104, 82), (122, 72), (130, 52)], 11, 9)
    t.piece(bras, V, ombre=2)
    t.damier(bras & ((t.xx // 4 + t.yy // 4) % 3 == 0) & ~t.bord(bras, -1, -1, 1), B)
    manchette(t, [(122, 58), (136, 58), (136, 64), (122, 64)])
    manche_m = t.poly([(128, 50), (136, 48), (140, 26), (134, 26)])
    t.piece(manche_m, V, ombre=0)
    t.damier(manche_m & ~t.bord(manche_m, -1, -1, 1), N)
    t.piece(t.rect(132, 24, 142, 28), B, ombre=0)
    boule = t.ell(128, 6, 148, 26)
    t.piece(boule, B, ombre=0)
    t.peindre(boule & ~t.bord(boule, -1, -1, 2) & (((t.xx + t.yy) % 3) == 0), V)
    t.peindre(boule & (((t.xx - t.yy) % 3) == 0) & ~t.bord(boule, -1, -1, 2), N)
    t.peindre(t.courbe([(131, 12), (134, 9), (138, 8)]), B)
    poing(t, 124, 40, 140, 56, 3, -1)
    for (x, y) in [(120, 6), (156, 10), (154, 32), (114, 20)]:
        t.etincelle(x, y)
    # la tête
    tete = t.ell(66, 28, 106, 76)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 68), V)
    for x, s in ((62, 1), (102, -1)):
        o = t.ell(x, 46, x + 8, 58)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 4 - s, 49), (x + 4 + s, 52), (x + 4 - s, 55)]), N)
    # la banane gominée, raie sur le côté, mèches et reflets
    ban = (t.ell(62, 14, 108, 52) & t.rect(0, 0, 176, 34)) | t.poly([(62, 34), (68, 34), (68, 46), (64, 46)]) \
        | t.poly([(104, 34), (108, 34), (108, 46), (104, 46)])
    ban |= t.fuseau([(66, 28), (72, 10), (90, 4), (110, 12), (114, 22)], 16, 6)
    t.piece(ban, V, ombre=2, lumiere=False)
    for pts in ([(70, 32), (74, 18), (88, 10), (106, 14)], [(80, 34), (84, 22), (96, 16), (110, 20)],
                [(92, 34), (98, 26), (108, 24)], [(66, 34), (66, 24)]):
        t.peindre(t.courbe(pts), N)
    for pts in ([(74, 24), (80, 14), (92, 9)], [(100, 12), (108, 15)]):
        t.peindre(t.courbe(pts, 2), B)
    t.peindre(t.trait([(76, 34), (80, 30)]), N)
    t.etincelle(116, 10)
    # le visage : sourcils hauts, clin d'œil complice à la caméra, sourire de plateau
    t.piece(t.fuseau([(70, 44), (76, 40), (82, 42)], 2, 4), V, ombre=0)
    t.piece(t.fuseau([(90, 42), (96, 40), (102, 44)], 4, 2), V, ombre=0)
    t.oeil(71, 46, l=11, h=9, regard=(0, 0), paupiere=2)
    t.oeil(90, 46, l=11, h=9, regard=(0, 0), paupiere=2)
    nez = t.poly([(86, 50), (90, 58), (88, 61), (82, 61)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(84, 60, N)
    t.pixels(74, 62, """
::....................::
.::::::::::::::::::::::.
.:oooooooooooooooooooo:.
..:ooooooooooooooooo:..
...::::::::::::::::::...
.....::::######::::.....
.......::::::::::.......
""")
    t.damier(t.ell(70, 58, 75, 62), V); t.damier(t.ell(97, 58, 102, 62), V)
    t.etoile(108, 66, B, 2)
    t.sol(160, cx=88)
    return t.image()


# ------------------------------------------------------------------ Florimond, le barde de la Taverne
def florimond():
    """Florimond, le barde de la Taverne : le chapeau à large bord et sa longue plume, des boucles, la bouche ouverte qui
    chante, le pourpoint à crevés ; il gratte son luth, et les notes s'envolent."""
    t = Toile()
    # les boucles qui tombent sur les épaules, derrière
    chev = t.ell(52, 34, 106, 86)
    for (x, y, r) in [(54, 60, 7), (52, 74, 7), (58, 84, 6), (104, 60, 7), (106, 74, 7), (100, 84, 6)]:
        chev |= t.ell(x - r, y - r, x + r, y + r)
    t.piece(chev, V, ombre=3, lumiere=False)
    boucles(t, chev, 18, 11, reflets=0.5)
    # les jambes en collants, bottes à revers, pose de chanteur
    for pts in ([(74, 120), (68, 138), (62, 150)], [(92, 120), (98, 138), (104, 150)]):
        j = t.fuseau(pts, 11, 9)
        t.piece(j, V, ombre=2)
    for (pts) in ([(52, 146), (70, 144), (72, 158), (48, 158)], [(96, 144), (112, 146), (118, 158), (96, 158)]):
        b = t.poly(pts)
        t.piece(b, V, ombre=0)
        t.damier(b & t.rect(0, 151, 176, 158), N)
        t.peindre(t.trait([(pts[0][0], pts[0][1] + 1), (pts[1][0], pts[1][1] + 1)], 3), B)
    t.peindre(t.rect(46, 159, 120, 159), N)
    # le pourpoint à crevés, basques festonnées
    pp = t.poly([(66, 78), (100, 78), (104, 98), (108, 120), (100, 116), (92, 122), (84, 116), (76, 122), (68, 116),
                 (60, 120), (62, 98)])
    t.piece(pp, V, ombre=3)
    for x in range(68, 102, 7):
        t.peindre(t.poly([(x, 84), (x + 3, 84), (x + 3, 104), (x, 104)]) & pp, B)
        t.peindre(t.trait([(x + 1, 86), (x + 1, 102)]) & pp, V)
    t.peindre(t.rect(60, 104, 106, 108) & pp, N)
    t.peindre(t.rect(60, 105, 106, 105) & pp & ((t.xx % 2) == 0), V)
    col = t.poly([(68, 76), (98, 76), (94, 84), (84, 88), (72, 84)])
    t.piece(col, B, ombre=0)
    t.peindre(t.trait([(72, 80), (94, 80)]) & ((t.xx % 2) == 0), V)
    # les manches bouffantes à crevés
    for (pts, s) in (([(68, 82), (56, 94), (60, 108)], 1), ([(98, 82), (112, 92), (120, 104)], -1)):
        m = t.fuseau(pts, 16, 9)
        t.piece(m, V, ombre=2)
        t.rayures(m & ~t.bord(m, -1, -1, 1) & ~t.bord(m, 1, 1, 2), B, 5, 2)
    # le luth : la caisse en poire, la rosace, le manche et le chevillier
    manche = t.fuseau([(80, 100), (40, 66), (26, 54)], 7, 5)
    t.piece(manche, V, ombre=0)
    for k in range(5):
        x = 40 + k * 7
        y = 66 + k * 6
        t.peindre(t.trait([(x - 2, y + 2), (x + 2, y - 2)]), B)
    chev_ = t.poly([(28, 56), (20, 52), (12, 60), (18, 64)])
    t.piece(chev_, V, ombre=0)
    for k in range(3):
        t.peindre(t.trait([(16 + k * 4, 54 + k), (14 + k * 4, 50 + k)], 2), B)
        t.peindre(t.trait([(16 + k * 4, 62 + k), (18 + k * 4, 66 + k)], 2), B)
    caisse = t.ell(72, 94, 112, 128) | t.ell(68, 92, 94, 116)
    t.piece(caisse, B, ombre=3)
    ros = t.ell(81, 101, 93, 113)
    t.peindre(ros, N)
    t.pixels(82, 102, "..o.o..\n.o.o.o.\no.o:o.o\n.o.o.o.\n..o.o..")
    t.peindre(ros & ~t.ell(82, 102, 92, 112), V)
    for k in (-2, 0, 2):
        t.peindre(t.trait([(30, 57 + k), (101, 117 + k)]) & ~manche & caisse, N)
        t.peindre(t.trait([(30, 57 + k), (101, 117 + k)]) & manche, B)
    cord = t.poly([(98, 112), (108, 120), (104, 124), (94, 118)])
    t.piece(cord, V, ombre=0)
    # la main qui tient le manche, la main qui gratte
    poing(t, 34, 58, 48, 72, 3)
    poing(t, 98, 102, 112, 116, 3, -1)
    t.peindre(t.trait([(94, 100), (90, 96)]) | t.trait([(96, 96), (94, 92)]), B)
    # la tête
    tete = t.ell(62, 34, 98, 78)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 48, 176, 70), V)
    # la frange bouclée
    fr = t.ell(60, 34, 74, 48) | t.ell(70, 32, 84, 44) | t.ell(82, 32, 96, 44) | t.ell(90, 34, 102, 48)
    t.piece(fr, V, ombre=0, lumiere=False)
    for x, y, sx in ((65, 40, 1), (76, 37, -1), (88, 37, 1), (96, 41, -1)):
        t.peindre(t.courbe([(x + 3 * sx, y), (x, y - 1), (x - sx, y + 2), (x + sx, y + 4), (x + 4 * sx, y + 3)]), N)
    # le chapeau à large bord, incliné, et sa longue plume
    plume = t.fuseau([(98, 28), (120, 14), (140, 10), (158, 18)], 4, 12) | t.ell(146, 8, 166, 26)
    t.piece(plume, B, ombre=0)
    for k in range(9):
        x = 108 + k * 6
        t.peindre(t.trait([(x, 18 - (k < 5) * k // 2 + (k >= 5) * (k - 5)), (x + 4, 22 + (k >= 5) * (k - 3))]) & plume, V)
    t.peindre(t.courbe([(98, 28), (120, 16), (140, 12), (160, 20)]), N)
    bord = t.poly([(40, 36), (60, 28), (100, 24), (120, 30), (110, 38), (80, 38), (56, 42)])
    t.piece(bord, V, ombre=2)
    cal = t.ell(60, 6, 102, 40) & t.rect(0, 0, 176, 32)
    t.piece(cal, V, ombre=3)
    t.peindre(t.poly([(62, 26), (100, 22), (102, 30), (62, 32)]) & cal, N)
    t.pixels(66, 27, ":o::o::o::o::o::o::o::o::o:"[:34])
    t.piece(t.ell(90, 20, 100, 30), B, ombre=0)
    t.peindre(t.ell(93, 23, 97, 27), V)
    # le visage : yeux mi-clos de bonheur, sourcils levés, bouche ouverte qui chante
    t.peindre(t.courbe([(65, 50), (70, 46), (76, 48)], 2), V)
    t.peindre(t.courbe([(84, 48), (90, 46), (95, 50)], 2), V)
    t.peindre(t.courbe([(65, 51), (70, 47), (76, 49)]), N)
    t.peindre(t.courbe([(84, 49), (90, 47), (95, 51)]), N)
    t.oeil(65, 52, l=11, h=8, regard=(1, -1), paupiere=3)
    t.oeil(84, 52, l=11, h=8, regard=(1, -1), paupiere=3)
    nez = t.poly([(80, 56), (84, 63), (82, 66), (76, 66)])
    t.piece(nez, B, ombre=0)
    t.damier(t.bord(nez, 1, 1, 1), V)
    t.point(78, 65, N)
    t.pixels(74, 67, """
..::::::::..
.:oooooooo:.
:::::::::::.
:::::::::::.
.::::##::::.
..:######:..
...::::::...
""")
    t.damier(t.ell(66, 62, 72, 66), V); t.damier(t.ell(88, 62, 94, 66), V)
    # les notes qui s'envolent
    note(t, 124, 58, double=True)
    note(t, 148, 76)
    note(t, 128, 92)
    note(t, 154, 44)
    for (x, y) in [(120, 64), (160, 56), (142, 96)]:
        t.etoile(x, y, B, 1)
    t.sol(160, cx=84)
    return t.image()



PORTRAITS = {
    "item_florimond": florimond,
    "item_steve": steve,
    "item_timour": timour,
    "item_gabriel": gabriel,
    "item_jeanbaptiste": jeanbaptiste,
    "item_wissam": wissam,
    "item_manon": manon,
    "item_laurana": laurana,
    "item_david": david,
    "item_elfe": elfe,
    "item_dylan": dylan,
    "item_gaspard": gaspard,
    "item_corbeau": corbeau,
    "item_frances": frances,
    "item_archiviste": archiviste,
}


if __name__ == "__main__":
    noms = [n.replace('.gif', '') for n in sys.argv[1:]] or list(PORTRAITS)
    for n in noms:
        finir(n + ".gif", PORTRAITS[n]())
