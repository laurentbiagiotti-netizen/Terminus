"""Dessine l'Académie des Arcanes (chapitre 4) : le grand hall, les huit ailes et les portraits des huit maîtres.

Même style que les chapitres précédents (pixel art 1 bit épais : noir, vert, blanc ; dessiner_lieux.finir pose
l'image dans le cadre d'origine). Chaque aile a son décor, chaque maître un objet qui dit son école :
  Runes (Henry) : un mur de runes et un tamis       Divination (Alfred) : un prisme qui découpe la lumière en colonnes
  Transmutation (Lee) : un alambic et une plume     Grimoires (Stephen) : un grimoire relié en arbre
  Alchimie (Doug) : des alambics reliés de tuyaux   Chronomancie (Paul) : des sabliers et une roue d'horloge
  Archives (Andrew) : un miroir et une aiguille     Invocation (Brian) : un tableau noir et un cercle d'invocation
Usage : python3 outils/dessiner_academie.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import piece, tramer, briques, arche, etoiles, lune, flamme, torche, etagere, livres  # noqa: E402
import decor_arcanes as A  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def colonne(d, x, y0, y1, w=12):
    d.rectangle([x - w // 2 - 3, y0, x + w // 2 + 3, y0 + 5], fill=B)
    d.rectangle([x - w // 2, y0 + 5, x + w // 2, y1 - 5], fill=B)
    for k in range(x - w // 2 + 3, x + w // 2 - 1, 4):
        d.line([(k, y0 + 7), (k, y1 - 7)], fill=N)
    d.rectangle([x - w // 2 - 3, y1 - 5, x + w // 2 + 3, y1], fill=B)


def sablier(d, x, y, h=26, w=16, plein=0.5):
    d.rectangle([x - w // 2 - 2, y, x + w // 2 + 2, y + 3], fill=B)
    d.rectangle([x - w // 2 - 2, y + h - 3, x + w // 2 + 2, y + h], fill=B)
    m = y + h // 2
    d.polygon([(x - w // 2, y + 3), (x + w // 2, y + 3), (x + 1, m), (x - 1, m)], outline=B)
    d.polygon([(x - w // 2, y + h - 3), (x + w // 2, y + h - 3), (x + 1, m), (x - 1, m)], outline=B)
    hs = int((h // 2 - 4) * plein)
    d.polygon([(x - w // 2 + 2 + hs // 2, y + h - 4 - hs), (x + w // 2 - 2 - hs // 2, y + h - 4 - hs), (x + w // 2 - 2, y + h - 4), (x - w // 2 + 2, y + h - 4)], fill=V)
    d.line([(x, m), (x, y + h - 4 - hs)], fill=V)


def alambic(d, x, y, r=12):
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.ellipse([x - r + 3, y - r + 3, x + r - 3, y + r - 3], fill=N)
    d.chord([x - r + 3, y - r + 3, x + r - 3, y + r - 3], 20, 160, fill=V)
    d.rectangle([x - 3, y - r - 10, x + 3, y - r + 1], fill=B)


def visage(d, cx, cy, r=24, yeux=True):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B)
    if yeux:
        d.ellipse([cx - 11, cy - 4, cx - 5, cy + 2], fill=N)
        d.ellipse([cx + 5, cy - 4, cx + 11, cy + 2], fill=N)
    d.line([(cx - 7, cy + 12), (cx + 7, cy + 12)], fill=N, width=2)


def robe(d, cx, haut=84, c=V):
    d.rectangle([cx - 8, haut - 8, cx + 8, haut + 2], fill=B)
    d.polygon([(cx - 36, haut), (cx + 36, haut), (cx + 52, 168), (cx - 52, 168)], fill=c)
    d.polygon([(cx - 12, haut), (cx, haut + 18), (cx + 12, haut)], fill=B)


def texte(d, x, y, t, c=B):
    d.text((x, y), t, fill=c)


def salle(d, x0, y0, x1, y1, sol=V):
    """La pièce en perspective des chapitres précédents, avec un dallage au sol et une bande hachurée devant."""
    piece(d, x0, y0, x1, y1, sol=sol)
    prof = H - y1
    for k in range(1, 4):
        t = (k / 4) ** 1.6
        y = int(y1 + t * prof)
        d.line([(int(x0 * (1 - t)) + 1, y), (int(x1 + (W - x1) * t) - 1, y)], fill=N)
    for k in range(1, 6):
        xa = x0 + (x1 - x0) * k / 6
        d.line([(xa, y1 + 1), (W * k / 6, H - 1)], fill=N)
    tramer(d, 2, H - 9, W - 3, H - 2, c=N, pas=3)


# ------------------------------------------------------------------
# Le grand hall et les huit ailes
# ------------------------------------------------------------------

def academie():
    """Le grand hall : des colonnes, des grimoires qui flottent, l'horloge qui file vers minuit, l'escalier."""
    im, d = toile()
    A.salle_pierre(im, d, 42, 28, 134, 100, plafond='voute', graine=4)
    # l'horloge du mur du fond, en rosace : les aiguilles filent vers minuit
    cx, cy, r = 88, 58, 20
    A.halo(d, cx, cy, 44, V, 0.55, 36, im=im, sur=N)
    d.ellipse([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], fill=B)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=N)
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=V)
    for k in range(12):
        a = k * math.pi / 6
        l = 5 if k % 3 == 0 else 2
        d.line([(cx + (r - 3) * math.sin(a), cy - (r - 3) * math.cos(a)), (cx + (r - 3 - l) * math.sin(a), cy - (r - 3 - l) * math.cos(a))],
               fill=B, width=2 if k % 3 == 0 else 1)
    d.line([(cx, cy), (cx, cy - 15)], fill=B, width=2)                              # la grande aiguille sur 12
    d.line([(cx, cy), (cx - 4, cy - 10)], fill=V, width=3)                          # la petite, juste avant
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=B)
    # deux colonnes contre le mur du fond, deux grandes au premier plan, des torches
    A.colonne(im, d, 52, 30, 100, 8)
    A.colonne(im, d, 124, 30, 100, 8)
    for x in (14, 162):
        A.colonne(im, d, x, -6, 160, 18)
    A.torche_murale(im, d, 32, 60, 20, 0.5)
    A.torche_murale(im, d, 144, 60, 20, 0.5)
    # les grimoires qui flottent, chacun sur sa lueur
    for (x, y, l) in [(60, 84, 9), (118, 80, 9), (88, 100, 11)]:
        A.halo(d, x, y + 8, l + 6, V, 0.6, 4, im=im, sur=N)
        A.livre_volant(d, x, y, l)
        for (dx, dy) in ((-l - 3, -5), (l + 2, -8), (1, -9)):
            d.point((x + dx, y + dy), fill=B)
    # l'escalier de pierre, au premier plan, qui descend dans le hall
    for k in range(5):
        y = 166 - k * 10
        xa, xb = 50 + k * 5, 126 - k * 5
        d.rectangle([xa, y - 5, xb, y + 4], fill=N)
        d.rectangle([xa, y - 5, xb, y - 1], fill=B if k < 3 else V)                      # la marche, puis sa contremarche
        d.line([(xa, y - 1), (xb, y - 1)], fill=V if k < 3 else N)
    d.line([(48, 170), (74, 116)], fill=B, width=2); d.line([(128, 170), (102, 116)], fill=B, width=2)
    for (xa, xb) in ((48, 74), (128, 102)):
        d.ellipse([xb - 2, 112, xb + 2, 116], fill=B)
    return im


def aile_runes():
    """Les Runes : un mur de pierre gravé de tablettes d'expressions régulières qui luisent, et, devant, un tamis
    sur son trépied qui ne laisse passer que les bonnes lignes."""
    im, d = toile()
    A.salle_pierre(im, d, 30, 18, 146, 104, plafond='poutres', graine=7, damier=False)
    for i, t in enumerate(["^ $", "[0-9]+", "(a|b)", ".*"]):
        x, y = 42 + (i % 2) * 52, 28 + (i // 2) * 34
        A.halo(d, x + 21, y + 11, 34, V, 0.45, 20, im=im, sur=N)
    for i, t in enumerate(["^ $", "[0-9]+", "(a|b)", ".*"]):
        x, y = 42 + (i % 2) * 52, 28 + (i // 2) * 34
        d.rectangle([x - 2, y - 2, x + 44, y + 24], fill=B)
        d.rectangle([x, y, x + 42, y + 22], fill=N)
        d.line([(x + 42, y), (x + 42, y + 22)], fill=V); d.line([(x, y + 22), (x + 42, y + 22)], fill=V)
        lg = d.textlength(t)
        texte(d, x + 21 - lg / 2, y + 6, t, V if i in (0, 3) else B)
    A.torche_murale(im, d, 14, 56, 18, 0.5)
    A.torche_murale(im, d, 162, 56, 18, 0.5)
    # le tamis, sur son trépied ; des lignes tombent, les bonnes passent, les autres restent dessus
    A.halo(d, 88, 128, 44, B, 0.3, 12, ymin=112, im=im, sur=N)
    for x0, x1 in ((62, 50), (88, 88), (114, 126)):
        d.line([(x0, 128), (x1, 166)], fill=B, width=2)
    d.ellipse([56, 116, 120, 136], fill=B)
    d.ellipse([60, 118, 116, 132], fill=N)
    for x in range(64, 114, 4):
        d.line([(x, 119), (x, 131)], fill=V)
    for y in (122, 126, 129):
        d.line([(61, y), (115, y)], fill=V)
    d.ellipse([56, 116, 120, 136], outline=B, width=2)
    for (x, y, l, c) in ((70, 110, 10, B), (92, 106, 14, B), (78, 100, 8, V)):      # les lignes qui tombent dans le tamis
        d.line([(x, y), (x + l, y)], fill=c, width=2)
    for (x, y) in ((76, 144), (92, 150), (84, 158)):                                 # celles qui sont passées, en vert
        d.line([(x, y), (x + 8, y)], fill=V, width=2)
    return im


def aile_divination():
    """La Divination : une baie en arcades ouverte sur la nuit ; sur une table, un prisme de cristal découpe le rayon
    de lune en colonnes ($1, $2, $3)."""
    im, d = toile()
    d.rectangle([0, 0, W - 1, H - 1], fill=N)
    A.ciel_nuit(d, 0, 0, W - 1, 100, graine=11, n=44, voile=0.5)
    A.halo(d, 30, 22, 26, V, 0.5, im=im, sur=N)
    d.ellipse([21, 13, 39, 31], fill=B)                                              # le croissant de lune
    d.ellipse([27, 10, 45, 28], fill=N)
    for x in (0, 58, 116):                                                           # les arcades de la baie
        d.arc([x + 2, 4, x + 56, 80], 180, 360, fill=B, width=3)
    for x in (0, 58, 116, 175):
        d.rectangle([x - 3, 42, x + 2, 100], fill=B)
        d.rectangle([x + 1, 42, x + 2, 100], fill=V)
    d.rectangle([0, 100, W - 1, 104], fill=B); d.line([(0, 104), (W - 1, 104)], fill=V)
    A.dallage(im, d, 0, 105, W - 1, damier=False, n=6, rangs_n=4)
    # le rayon de lune qui entre et frappe le prisme
    A.rayon(im, d, [(26, 30), (38, 28), (80, 88), (72, 92)], B, 0.55, 0.3)
    d.line([(32, 30), (76, 90)], fill=B)
    A.table(d, 26, 120, 150, ep=4, pieds=38, prof=10)
    # le prisme : une face blanche, une face verte, l'arête noire
    A.halo(d, 88, 96, 34, V, 0.5, 24, im=im, sur=N)
    d.polygon([(64, 114), (88, 62), (112, 114)], fill=B)
    d.polygon([(88, 62), (112, 114), (94, 114)], fill=V)
    d.line([(88, 62), (94, 114)], fill=N)
    d.line([(64, 114), (112, 114)], fill=N)
    # les colonnes qui sortent : trois faisceaux, trois tablettes
    for k in range(3):
        x = 120 + k * 18
        y = 62 + k * 10
        c = V if k % 2 == 0 else B
        d.line([(104, 96), (x - 9, y + 8)], fill=c, width=2)
        d.rectangle([x - 9, y, x + 9, y + 16], fill=N, outline=c)
        d.rectangle([x - 8, y + 15, x + 9, y + 16], fill=c)
        texte(d, x - 5, y + 3, "$" + str(k + 1), c)
    return im


def aile_transmutation():
    """La Transmutation : sur l'établi, un alambic qui fume ; une plume qui change une ligne en une autre."""
    im, d = toile()
    A.salle_pierre(im, d, 28, 16, 148, 100, plafond='voute', graine=9)
    A.halo(d, 56, 70, 40, V, 0.45, 34, im=im, sur=N)
    A.ballon(d, 56, 76, 18, 0.45)
    d.line([(56, 49), (60, 40), (80, 34), (100, 46)], fill=B, width=3)              # le col de cygne
    d.line([(57, 50), (61, 42), (80, 36)], fill=N)
    for k in range(3):                                                             # la vapeur
        d.arc([44 + k * 7, 18 - k * 4, 58 + k * 7, 32 - k * 4], 180, 360, fill=B)
    d.rectangle([44, 94, 68, 98], fill=B)                                           # le trépied et le feu
    for x in (46, 66):
        d.line([(x, 98), (x - 2 + (x - 56) // 5, 116)], fill=B, width=2)
    A.flamme(d, 56, 104, 9)
    # la page : une ligne avant, la même après
    d.polygon([(98, 52), (146, 48), (148, 96), (100, 98)], fill=B)
    d.line([(146, 48), (148, 96)], fill=V, width=2)
    texte(d, 104, 56, "s/a/b/", N)
    d.line([(104, 72), (140, 71)], fill=N)
    texte(d, 104, 78, "=> b", V)
    d.line([(152, 22), (130, 62)], fill=B, width=2)                                 # la plume
    d.polygon([(152, 22), (164, 10), (160, 26), (150, 32)], fill=V)
    d.line([(150, 30), (162, 12)], fill=B)
    # l'établi
    d.rectangle([14, 116, 162, 122], fill=B); d.rectangle([14, 122, 162, 125], fill=V)
    for x in (20, 150):
        d.rectangle([x, 126, x + 5, 166], fill=B); d.rectangle([x + 4, 126, x + 5, 166], fill=V)
    for (x, h) in ((84, 10), (96, 7), (130, 12)):                                  # des fioles sur l'établi
        d.rectangle([x, 116 - h, x + 5, 115], fill=B); d.rectangle([x + 1, 116 - h // 2, x + 4, 114], fill=V)
        d.rectangle([x + 1, 113 - h, x + 4, 115 - h], fill=B)
    return im


def aile_grimoires():
    """Les Grimoires : des rayonnages qui fuient de chaque côté, et, sur un lutrin, un grimoire ouvert dont les pages
    poussent en arbre de lumière (un JSON) dans l'alcôve du fond."""
    im, d = toile()
    A.salle_pierre(im, d, 52, 22, 124, 96, cotes=False, plafond=None, graine=3, damier=True)
    A.etageres_cote(d, True, 52, 22, 96, rangs=5, graine=21)
    A.etageres_cote(d, False, 124, 22, 96, rangs=5, graine=23)
    for (xa, xb, g) in ((54, 68, 1), (108, 122, 2)):                                 # au fond, des livres dans l'ombre
        d.rectangle([xa, 24, xb, 94], fill=N)
        for k in range(4):
            yb = 40 + k * 17
            livres(d, xa + 1, yb - 13, xb - 1, yb - 1, graine=g * 10 + k, vert=1.0)
            d.line([(xa, yb), (xb, yb)], fill=B)
    d.rectangle([70, 24, 106, 94], fill=N)                                           # l'alcôve où pousse l'arbre
    d.arc([70, 24, 106, 60], 180, 360, fill=B, width=2)
    d.line([(70, 42), (70, 94)], fill=B, width=2); d.line([(105, 42), (105, 94)], fill=B, width=2)
    A.halo(d, 88, 74, 50, V, 0.6, 46, im=im, sur=N)
    # le lutrin et le grimoire ouvert
    d.polygon([(80, 166), (96, 166), (92, 140), (84, 140)], fill=B)
    d.line([(92, 140), (96, 166)], fill=V, width=2)
    d.polygon([(52, 132), (88, 124), (124, 132), (124, 146), (88, 140), (52, 146)], fill=B)
    d.polygon([(52, 146), (88, 140), (124, 146), (124, 149), (88, 143), (52, 149)], fill=V)
    for k in range(3):
        d.line([(58, 133 + k * 3), (84, 127 + k * 3)], fill=N)
        d.line([(92, 127 + k * 3), (118, 133 + k * 3)], fill=N)
    d.line([(88, 124), (88, 140)], fill=N, width=2)
    # l'arbre de lumière : un tronc, des branches, des feuilles-objets, la clé { } au sommet
    d.line([(88, 124), (88, 74)], fill=B, width=3)
    for (x0, y0, x1, y1) in [(88, 112, 68, 98), (88, 112, 108, 98), (68, 98, 62, 84), (68, 98, 78, 86), (108, 98, 114, 84),
                             (88, 96, 98, 86)]:
        d.line([(x0, y0), (x1, y1)], fill=B, width=2)
    for x, y in [(62, 84), (78, 86), (114, 84), (98, 86), (68, 98), (108, 98)]:
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=V)
        d.point((x - 1, y - 1), fill=B)
    d.rectangle([75, 56, 101, 70], fill=B)
    d.rectangle([77, 58, 99, 68], fill=N)
    texte(d, 80, 58, "{ }", V)
    A.eclats(d, [(64, 66), (112, 62), (100, 46), (72, 112), (106, 116)])
    return im


def aile_alchimie():
    """L'Alchimie : trois alambics reliés par des tuyaux de cuivre, chacun sur son feu ; un liquide vert passe
    de l'un à l'autre. Au mur, des fioles rangées."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 14, 154, 100, plafond='poutres', graine=5)
    for y in (30, 50):                                                              # les étagères à fioles
        d.rectangle([34, y, 142, y + 2], fill=B)
        for k, x in enumerate(range(38, 140, 9)):
            h = 6 + (k * 7) % 6
            d.rectangle([x, y - h, x + 4, y - 1], fill=B if k % 3 else V)
            d.rectangle([x + 1, y - h - 2, x + 3, y - h], fill=B)
            if k % 3:
                d.rectangle([x + 1, y - h // 2, x + 3, y - 2], fill=V)
    for x in (44, 88, 132):
        A.halo(d, x, 110, 30, V, 0.5, 26, im=im, sur=N)
    for (xa, xb) in ((44, 88), (88, 132)):                                          # les tuyaux de cuivre
        d.line([(xa, 66), (xa, 58), (xb, 58), (xb, 66)], fill=B, width=4)
        d.line([(xa + 2, 57), (xb - 2, 57)], fill=N)
        for x in range(xa + 8, xb - 4, 10):
            d.rectangle([x, 57, x + 3, 59], fill=V)
    d.rectangle([12, 118, 164, 123], fill=B); d.rectangle([12, 123, 164, 126], fill=V)
    for x in (20, 152):
        d.rectangle([x, 127, x + 5, 166], fill=B); d.rectangle([x + 4, 127, x + 5, 166], fill=V)
    for i, x in enumerate((44, 88, 132)):                                           # trois alambics sur leurs feux
        A.ballon(d, x, 88, 16, [0.3, 0.55, 0.8][i], col=12)
        d.rectangle([x - 12, 106, x + 12, 108], fill=B)
        A.flamme(d, x, 117, 11)
    return im


def aile_chronomancie():
    """La Chronomancie : une grande roue d'horloge dentée au mur, deux engrenages, et trois sabliers (timer, at, cron)
    sur une table."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 100, plafond='voute', graine=12)
    cx, cy = 88, 52
    A.halo(d, cx, cy, 52, V, 0.55, 44, im=im, sur=N)
    for k in range(16):                                                            # les dents de la roue
        a = k * math.pi / 8
        x, y = cx + 33 * math.cos(a), cy + 33 * math.sin(a)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=B)
    d.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], fill=B)
    d.ellipse([cx - 27, cy - 27, cx + 27, cy + 27], fill=N)
    d.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], outline=V)
    for k in range(12):
        a = k * math.pi / 6
        l = 5 if k % 3 == 0 else 2
        d.line([(cx + 22 * math.sin(a), cy - 22 * math.cos(a)), (cx + (22 - l) * math.sin(a), cy - (22 - l) * math.cos(a))],
               fill=V if k % 3 == 0 else B, width=2)
    d.line([(cx, cy), (cx, cy - 18)], fill=B, width=3)
    d.line([(cx, cy), (cx + 13, cy + 7)], fill=V, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=B)
    for (gx, gy, gr) in ((36, 30, 10), (140, 72, 8)):                            # deux petits engrenages
        for k in range(8):
            a = k * math.pi / 4
            d.rectangle([gx + (gr + 1) * math.cos(a) - 1, gy + (gr + 1) * math.sin(a) - 1,
                         gx + (gr + 1) * math.cos(a) + 1, gy + (gr + 1) * math.sin(a) + 1], fill=V)
        d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=V)
        d.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=N)
    A.table(d, 22, 122, 154, ep=4, pieds=40, prof=8)                                # la table et les trois sabliers
    for i, x in enumerate((50, 88, 126)):
        A.sablier(d, x, 82, 38, 22, plein=[0.2, 0.55, 0.9][i])
    return im


def aile_archives():
    """Les Archives : un grand miroir ovale qui reflète une pile de dossiers, et, sur un pupitre, une page épinglée
    qu'une aiguille recoud d'un fil vert."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 100, plafond='voute', graine=14)
    # le miroir sur pied : son reflet est un double exact de la pile de dossiers posée devant
    A.halo(d, 58, 60, 40, V, 0.45, 46, im=im, sur=N)
    d.ellipse([30, 16, 86, 108], fill=B)
    d.ellipse([34, 20, 82, 104], fill=N)
    d.polygon([(38, 70), (60, 24), (70, 28), (46, 84)], fill=V); d.polygon([(50, 92), (76, 40), (79, 50), (58, 100)], fill=V)
    d.ellipse([34, 20, 82, 104], outline=V)
    for k in range(4):                                                              # le reflet
        d.rectangle([46, 40 + k * 12, 70, 48 + k * 12], fill=N, outline=V)
        d.line([(50, 44 + k * 12), (60, 44 + k * 12)], fill=V)
    d.line([(42, 34), (52, 26)], fill=B); d.line([(42, 40), (56, 28)], fill=B)
    d.rectangle([54, 108, 62, 140], fill=B); d.rectangle([60, 108, 62, 140], fill=V)
    d.polygon([(40, 146), (76, 146), (70, 140), (46, 140)], fill=B)
    for k in range(4):                                                              # la pile de dossiers, devant
        d.rectangle([20 + k % 2, 162 - k * 6, 46 + k % 2, 166 - k * 6], fill=B)
        d.line([(20 + k % 2, 166 - k * 6), (46 + k % 2, 166 - k * 6)], fill=V)
        d.line([(24, 164 - k * 6), (32, 164 - k * 6)], fill=N)
    # la page épinglée sur le pupitre, l'aiguille et son fil
    d.rectangle([104, 34, 146, 98], fill=B)
    d.line([(146, 34), (146, 98)], fill=V, width=2)
    for y in range(42, 92, 7):
        d.line([(108, y), (140, y)], fill=N)
    d.rectangle([108, 58, 140, 66], fill=B)
    texte(d, 110, 58, "-  +", V)
    for (x, y) in ((106, 36), (142, 36)):
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=V)
    d.line([(98, 110), (138, 66)], fill=B, width=3); d.line([(99, 110), (138, 67)], fill=V)
    d.ellipse([136, 63, 141, 68], outline=B)
    d.line([(98, 110), (92, 118), (96, 126), (104, 124), (112, 130), (122, 128)], fill=V, width=2)
    d.polygon([(96, 116), (156, 116), (148, 128), (104, 128)], fill=B)
    d.rectangle([122, 128, 128, 166], fill=B); d.rectangle([126, 128, 128, 166], fill=V)
    return im


def aile_invocation():
    """L'Invocation : un grand tableau noir couvert d'un script, un pupitre éclairé d'une bougie, et un cercle
    d'invocation tracé au sol qui luit."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 10, 154, 94, plafond=None, graine=16, damier=False)
    d.rectangle([32, 12, 144, 82], fill=B)                                           # le tableau et son cadre de bois
    d.rectangle([35, 15, 141, 79], fill=N)
    d.rectangle([32, 82, 144, 85], fill=V)
    for k, t in enumerate(["#!/bin/bash", "for f in *", "do", "  echo $f", "done"]):
        texte(d, 42, 18 + k * 11, t, V if k == 0 else B)
    d.rectangle([118, 79, 126, 81], fill=B)                                          # la craie
    cx, cy = 88, 138                                                                 # le cercle d'invocation, qui luit
    A.halo(d, cx, cy, 70, V, 0.6, 30, ymin=96, im=im, sur=N)
    d.ellipse([cx - 56, cy - 22, cx + 56, cy + 22], outline=B, width=2)
    d.ellipse([cx - 44, cy - 16, cx + 44, cy + 16], outline=V, width=2)
    pts = []
    for k in range(5):
        a = k * 4 * math.pi / 5 - math.pi / 2
        pts.append((cx + 44 * math.cos(a), cy + 16 * math.sin(a)))
    d.line(pts + [pts[0]], fill=B)
    for k in range(8):
        a = k * math.pi / 4
        x, y = cx + 50 * math.cos(a), cy + 19 * math.sin(a)
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=V)
    d.polygon([(70, 100), (106, 100), (100, 112), (76, 112)], fill=B)               # le pupitre et sa bougie
    d.line([(70, 100), (106, 100)], fill=V)
    d.rectangle([84, 112, 92, 140], fill=B); d.rectangle([90, 112, 92, 140], fill=V)
    d.rectangle([76, 140, 100, 143], fill=B)
    A.bougie(im, d, 100, 99, 8, 12)
    d.polygon([(74, 101), (92, 101), (90, 106), (76, 106)], fill=N)                  # le parchemin posé
    d.line([(78, 103), (88, 103)], fill=B)
    return im


# ------------------------------------------------------------------
# Les huit maîtres, dans le style des personnages des chapitres 2 et 3 (dessiner_panne.perso) :
# une silhouette en pied, gros pixels, tête carrée, yeux carrés à pupille noire, sol en tirets.
# ------------------------------------------------------------------
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402
from decor_arcanes import robe_plis, manches, ceinture, ligne_r  # noqa: E402


def robe_mage(r, haut=33, bas=64, c=V, x0=35, x1=52):
    """Une robe de mage qui s'évase vers le bas."""
    for k, y in enumerate(range(haut, bas + 1)):
        e = k // 6
        r(x0 - e, y, x1 + e, y, c)


def bras(r, gauche=True, droite=True, y=35):
    if gauche: r(31, y, 34, y + 1, B); r(30, y + 1, 31, y + 11, B); r(30, y + 11, 33, y + 12, B)
    if droite: r(53, y, 56, y + 1, B); r(56, y + 1, 57, y + 11, B); r(54, y + 11, 57, y + 12, B)


def jambes(r, c=V):
    r(38, 55, 41, 64, B); r(46, 55, 49, 64, B); r(39, 56, 40, 63, N); r(47, 56, 48, 63, N)
    r(36, 65, 42, 66, c); r(45, 65, 51, 66, c)


def pieds_robe(r):
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B)


def henry_dessin(r):
    # le vieux maître des Runes : chapeau pointu à bandeau gravé, longue barbe, robe étoilée, bâton à cristal,
    # une tablette de pierre gravée de runes (^ $ [ ])
    for k in range(11): r(43 - k // 2 - (k > 6), 1 + k, 44 + k // 2 + (k > 6), 1 + k, V)
    r(43, 0, 44, 1, V); r(45, 1, 46, 2, V)
    r(30, 12, 57, 13, V); r(31, 14, 56, 14, B)
    r(37, 9, 50, 11, B); r(41, 9, 42, 10, N); r(45, 10, 46, 11, N)            # le bandeau gravé
    r(37, 15, 50, 30, B); yeux(r, 38, 45, 17)
    r(37, 15, 43, 15, V); r(44, 15, 50, 15, V)                               # les sourcils broussailleux
    r(43, 22, 44, 23, N)
    r(35, 24, 52, 30, B); r(36, 31, 51, 38, B); r(38, 39, 49, 43, B); r(41, 44, 46, 46, B)   # la barbe
    r(40, 26, 47, 26, N); r(39, 30, 39, 37, V); r(43, 32, 43, 42, V); r(48, 30, 48, 37, V)
    robe_plis(r, 33, 64, V, 35, 52)
    r(36, 36, 51, 39, N)                                                     # le col sous la barbe
    r(36, 31, 51, 38, B); r(38, 39, 49, 43, B); r(41, 44, 46, 46, B)
    r(39, 30, 39, 37, V); r(43, 32, 43, 42, V); r(48, 30, 48, 37, V)
    for x, y in [(37, 50), (50, 54), (40, 58), (47, 60), (36, 61)]: r(x, y, x, y, B); r(x - 1, y, x + 1, y, B); r(x, y - 1, x, y + 1, B)
    manches(r, V, 34, True, True, B, 11)
    # la tablette de pierre, tenue à gauche
    r(16, 38, 31, 56, B); r(17, 39, 30, 55, N); r(29, 40, 31, 56, V)
    r(19, 42, 20, 42, V); r(18, 43, 19, 43, V); r(20, 43, 21, 43, V)          # ^
    r(25, 41, 26, 46, V); r(24, 42, 27, 42, V); r(24, 45, 27, 45, V)          # $
    r(19, 49, 19, 53, B); r(19, 49, 20, 49, B); r(19, 53, 20, 53, B)          # [ ]
    r(26, 49, 26, 53, B); r(25, 49, 26, 49, B); r(25, 53, 26, 53, B)
    # le bâton et son cristal
    r(61, 10, 62, 66, B); r(62, 10, 62, 66, V)
    r(61, 2, 62, 3, B); r(59, 4, 64, 7, B); r(60, 8, 63, 8, B); r(61, 9, 62, 9, B); r(60, 4, 61, 6, V)
    for (x, y) in ((56, 2), (67, 4), (57, 10), (66, 11)): r(x, y, x, y, V)
    r(57, 45, 61, 47, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def alfred_dessin(r):
    # le devin d'awk : grande capuche pointue, robe à pan blanc, une boule de cristal qui découpe la lumière en
    # trois colonnes ($1 $2 $3), posée sur un socle
    for k in range(8): r(43 - k, 2 + k, 44 + k, 2 + k, V)
    r(33, 10, 54, 33, V); r(43, 1, 44, 2, V)
    r(36, 13, 51, 31, N)                                                     # l'ombre de la capuche
    r(37, 14, 50, 31, B); yeux(r, 38, 45, 18); r(43, 23, 44, 25, N)
    r(41, 28, 46, 28, N); r(37, 14, 50, 15, N)
    robe_plis(r, 33, 64, V, 34, 53)
    r(41, 34, 46, 64, B)                                                     # le pan blanc de la robe
    for y in range(37, 63, 5): r(43, y, 44, y + 1, V)
    manches(r, V, 34, True, True, B, 9)
    # la boule de cristal, tenue à deux mains, ses trois colonnes
    for (x0, x1, y) in [(38, 49, 38), (36, 51, 39), (35, 52, 40), (34, 53, 41), (34, 53, 42), (34, 53, 43), (34, 53, 44),
                        (34, 53, 45), (34, 53, 46), (35, 52, 47), (36, 51, 48), (38, 49, 49)]:
        r(x0, y, x1, y, B)
    r(36, 40, 51, 47, N); r(35, 41, 52, 46, N)
    for x in (37, 43, 49): r(x, 40, x + 1, 47, V)
    r(38, 39, 40, 39, N); r(37, 40, 38, 41, B)                                # le reflet
    r(38, 50, 49, 51, V); r(36, 52, 51, 53, B)                                # le socle
    for x, y in [(26, 30), (61, 33), (24, 48), (63, 50), (28, 58), (60, 60)]:   # des éclats de lumière
        r(x, y, x, y, B); r(x - 1, y, x + 1, y, V); r(x, y - 1, x, y + 1, V); r(x, y, x, y, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def lee_dessin(r):
    # la maîtresse de la Transmutation : chignon piqué d'une épingle, lunettes rondes, blouse d'alchimiste à poches,
    # une plume levée qui réécrit un parchemin (a > b), une fiole fumante dans l'autre main
    r(40, 2, 47, 8, V); r(39, 4, 48, 6, V); r(46, 1, 50, 1, B)               # le chignon et l'épingle
    r(35, 9, 52, 14, V); r(34, 12, 36, 24, V); r(51, 12, 53, 24, V)
    r(37, 12, 50, 30, B); r(37, 12, 50, 13, V); yeux(r, 38, 45, 16)
    r(37, 15, 44, 15, N); r(44, 17, 45, 17, N); r(45, 15, 51, 15, N)         # les lunettes
    r(43, 21, 44, 23, N); r(41, 26, 46, 26, N); r(41, 25, 41, 25, N); r(46, 25, 46, 25, N)
    r(42, 31, 45, 32, B)
    r(34, 33, 53, 56, B); r(42, 33, 45, 38, V); r(43, 39, 44, 56, N)          # la blouse, le col vert
    r(36, 33, 41, 35, N); r(46, 33, 51, 35, N)
    r(36, 44, 41, 49, N); r(37, 45, 40, 48, B); r(38, 43, 38, 46, V)           # les poches et un crayon
    r(46, 44, 51, 49, N); r(47, 45, 50, 48, B)
    for y in (38, 42, 46, 50): r(42, y, 42, y, V)
    bras(r, True, True, 35)
    r(56, 22, 57, 36, B)                                                     # la plume levée
    r(57, 12, 59, 16, V); r(58, 16, 61, 20, V); r(59, 20, 61, 24, V); r(58, 13, 58, 22, B)
    r(60, 28, 72, 42, B); r(61, 29, 71, 41, N); r(60, 28, 72, 29, V)          # le parchemin : a > b
    r(62, 32, 64, 32, B); r(62, 33, 62, 34, B); r(64, 33, 64, 34, B)
    r(66, 32, 66, 34, V); r(67, 33, 67, 33, V)
    r(68, 32, 70, 32, V); r(68, 33, 68, 34, V); r(70, 34, 70, 34, V); r(69, 34, 69, 34, V)
    r(62, 37, 70, 37, B); r(62, 39, 67, 39, B)
    r(24, 34, 26, 39, B); r(21, 40, 29, 49, B); r(22, 44, 28, 48, V); r(22, 41, 28, 43, N); r(23, 42, 23, 42, B)   # la fiole
    for (x, y) in ((23, 31), (26, 28), (24, 25)): r(x, y, x + 1, y, B)
    jambes(r); sol_tirets(r, 68)


def stephen_dessin(r):
    # le bibliothécaire des Grimoires : crâne lisse, grosses lunettes vertes, gilet ; un grimoire ouvert dont la page
    # gauche porte { } et une branche (un JSON), une loupe accrochée au gilet
    r(37, 6, 50, 29, B); r(38, 6, 49, 7, V)
    r(34, 13, 37, 21, V); r(50, 13, 53, 21, V)
    r(36, 14, 43, 20, V); r(44, 14, 51, 20, V); yeux(r, 38, 45, 15)
    r(43, 22, 44, 24, N); r(41, 26, 46, 26, N)
    r(42, 30, 45, 31, B)
    r(35, 32, 52, 54, V); r(41, 32, 46, 54, B); r(43, 33, 44, 36, N)            # le gilet, la chemise, la cravate
    for y in (38, 43, 48): r(39, y, 39, y, B); r(48, y, 48, y, B)
    r(31, 34, 34, 35, V); r(30, 35, 31, 41, V); r(53, 34, 56, 35, V); r(56, 35, 57, 41, V)
    # le grimoire ouvert, tenu devant lui
    r(22, 39, 65, 53, B); r(23, 40, 42, 52, N); r(45, 40, 64, 52, N); r(43, 39, 44, 54, V)
    r(22, 53, 65, 54, V)
    r(26, 42, 27, 50, V); r(28, 41, 29, 41, V); r(28, 51, 29, 51, V); r(25, 46, 25, 46, V)   # {
    r(39, 42, 40, 50, V); r(37, 41, 38, 41, V); r(37, 51, 38, 51, V); r(41, 46, 41, 46, V)   # }
    r(31, 46, 36, 46, B); r(33, 43, 33, 49, B); r(35, 43, 36, 43, B); r(35, 49, 36, 49, B)   # une branche
    for y in (43, 46, 49): r(48, y, 61 - (y % 3), y, B)
    r(30, 38, 31, 39, B); r(56, 38, 57, 39, B)                                # les mains sur la reliure
    r(48, 56, 51, 59, B); r(49, 57, 50, 58, N); r(51, 59, 52, 61, B)          # la loupe
    jambes(r); sol_tirets(r, 68)


def doug_dessin(r):
    # le maître de l'Alchimie : lunettes de forge sur le front, favoris, grand sourire, tablier de cuir ;
    # un tuyau de cuivre coudé sur l'épaule, des gants, un petit alambic fumant à ses pieds
    r(37, 8, 50, 30, B)
    r(36, 8, 51, 10, V); r(37, 10, 42, 14, V); r(45, 10, 50, 14, V); r(38, 11, 41, 13, N); r(46, 11, 49, 13, N)
    r(39, 11, 39, 11, B); r(47, 11, 47, 11, B)
    yeux(r, 38, 45, 16); r(43, 21, 44, 23, N)
    r(39, 26, 48, 28, N); r(40, 26, 47, 26, B)                               # le grand sourire
    r(36, 22, 38, 30, V); r(49, 22, 51, 30, V)                               # les favoris
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, V)
    r(38, 33, 49, 57, B); r(39, 36, 48, 56, N); r(40, 37, 47, 56, B)         # le tablier et ses bretelles
    r(38, 33, 39, 36, B); r(48, 33, 49, 36, B)
    r(41, 44, 46, 49, N); r(42, 45, 45, 48, V)
    r(40, 51, 47, 51, N)
    # le tuyau coudé, porté sur l'épaule, ses colliers
    r(53, 34, 56, 35, V); r(56, 22, 58, 36, B); r(56, 20, 70, 23, B); r(67, 23, 70, 42, B); r(66, 42, 71, 44, V)
    r(56, 21, 70, 21, V); r(68, 24, 68, 41, V)
    for y in (28, 36): r(66, y, 71, y, V)
    r(53, 44, 58, 48, V); r(57, 36, 58, 44, V)                                # bras et gant droit
    r(30, 35, 34, 36, V); r(29, 36, 30, 44, V); r(27, 45, 32, 49, V)          # gant gauche
    # le petit alambic, sa flamme, sa fumée
    r(17, 56, 27, 64, B); r(18, 60, 26, 63, V); r(18, 57, 26, 58, N); r(21, 50, 23, 56, B); r(23, 50, 29, 51, B)
    r(20, 65, 24, 66, V); r(21, 64, 23, 64, B)
    for (x, y) in ((28, 46), (30, 43), (28, 40)): r(x, y, x + 1, y, B)
    jambes(r, B); sol_tirets(r, 68)


def paul_dessin(r):
    # l'horloger de la Chronomancie : haut-de-forme à ruban, monocle, moustache, veste et gilet,
    # montre à gousset au bout de sa chaîne ; un sablier levé
    r(37, 0, 50, 10, B); r(38, 1, 49, 9, N); r(38, 7, 49, 8, V); r(33, 11, 54, 12, B); r(38, 1, 38, 6, B)
    r(37, 13, 50, 30, B); yeux(r, 38, 45, 16)
    r(44, 15, 51, 15, V); r(44, 15, 44, 20, V); r(51, 15, 51, 20, V); r(44, 20, 51, 20, V)   # le monocle
    r(51, 21, 51, 27, V)
    r(43, 21, 44, 23, N); r(39, 25, 48, 26, N); r(38, 26, 39, 27, N); r(48, 26, 49, 27, N)   # la moustache
    r(41, 28, 46, 28, N)
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, N); r(35, 33, 36, 54, B); r(51, 33, 52, 54, B)          # la veste noire, liserée
    r(38, 34, 49, 54, V); r(42, 33, 45, 36, B)                               # le gilet vert, le col
    for y in (39, 44, 49): r(43, y, 44, y + 1, B)
    r(39, 41, 42, 41, B); r(38, 42, 38, 45, B)                                # chaîne et montre
    r(35, 45, 39, 50, B); r(36, 46, 38, 49, N); r(37, 46, 37, 48, V)
    r(31, 34, 34, 35, N); r(30, 35, 31, 44, N); r(30, 35, 30, 44, B); r(29, 45, 32, 47, B)
    r(53, 34, 56, 35, N); r(56, 26, 57, 35, N); r(57, 26, 57, 35, B)
    # le sablier, levé
    r(57, 22, 68, 24, B); r(57, 42, 68, 44, B)
    for k in range(8):
        r(59 + k // 2, 25 + k, 66 - k // 2, 25 + k, B)
        r(59 + k // 2, 41 - k, 66 - k // 2, 41 - k, B)
    r(60, 26, 65, 28, N); r(62, 29, 63, 32, V); r(62, 33, 63, 37, V); r(61, 38, 64, 40, V)
    r(60, 26, 61, 27, V)
    r(57, 25, 57, 41, V); r(68, 25, 68, 41, V)
    r(55, 34, 56, 36, B)
    jambes(r, B); sol_tirets(r, 68)


def andrew_dessin(r):
    # l'archiviste : bonnet, barbe, cache-poussière ceinturé de rouleaux ; le Miroir (rsync) dans une main,
    # l'Aiguille et son fil vert qui ondule (patch) dans l'autre
    r(36, 5, 51, 12, V); r(35, 11, 52, 13, B); r(41, 3, 46, 5, V)
    r(37, 13, 50, 30, B); yeux(r, 38, 45, 17); r(43, 22, 44, 24, N)
    r(36, 24, 51, 31, B); r(40, 26, 47, 26, N); r(39, 28, 39, 30, V); r(44, 29, 44, 31, V); r(48, 28, 48, 30, V)
    r(36, 24, 37, 28, V); r(50, 24, 51, 28, V)
    robe_plis(r, 33, 62, V, 35, 52)
    r(35, 40, 52, 42, B); r(35, 50, 52, 51, B)                               # la ceinture de rouleaux
    for x in (37, 42, 47): r(x, 43, x + 2, 49, B); r(x + 1, 44, x + 1, 48, N)
    manches(r, V, 34, True, True, B, 10)
    # le Miroir : un ovale sur un manche, son reflet
    r(19, 24, 27, 25, B); r(17, 26, 29, 41, B); r(19, 42, 27, 43, B); r(19, 26, 27, 41, N); r(18, 27, 28, 40, N)
    r(20, 28, 21, 32, V); r(22, 29, 22, 30, V); r(24, 36, 26, 39, V)
    r(22, 44, 24, 48, B); r(24, 46, 28, 47, B)
    # l'Aiguille et son fil vert
    r(60, 20, 61, 40, B); r(60, 21, 61, 22, N); r(61, 34, 61, 40, V)
    for (x, y) in [(62, 22), (64, 25), (65, 29), (64, 33), (66, 37), (68, 41), (67, 45), (65, 49)]:
        r(x, y, x + 1, y + 2, V)
    r(59, 44, 61, 47, B)
    r(37, 63, 42, 64, B); r(45, 63, 50, 64, B); sol_tirets(r, 68)


def brian_dessin(r):
    # le jeune enchanteur de l'Invocation : cheveux en bataille, veste à boutons, une craie levée qui crépite,
    # un parchemin #! et un cercle d'invocation tracé à ses pieds
    for x in range(35, 53, 3): r(x, 5, x + 1, 9, V)
    r(36, 3, 37, 4, V); r(48, 3, 49, 4, V)
    r(35, 9, 52, 14, V)
    r(37, 12, 50, 30, B); r(37, 12, 50, 13, V); yeux(r, 38, 45, 16)
    r(43, 21, 44, 23, N); r(41, 26, 46, 26, N); r(46, 25, 46, 25, N)
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, V); r(43, 33, 44, 54, B); r(40, 33, 47, 35, B)
    for y in (38, 44, 50): r(40, y, 41, y + 1, B); r(46, y, 47, y + 1, B)
    r(35, 54, 52, 54, B)
    # la craie levée, qui crépite
    r(53, 34, 56, 35, V); r(56, 24, 57, 35, V); r(55, 19, 58, 23, B); r(56, 15, 57, 18, B)
    for x, y in [(60, 12), (62, 17), (52, 12), (58, 9), (63, 13)]: r(x, y, x, y, V)
    r(60, 12, 60, 12, B); r(58, 9, 58, 9, B)
    # le parchemin, avec #!
    r(30, 35, 34, 36, V); r(29, 36, 30, 40, V)
    r(15, 37, 31, 57, B); r(16, 38, 30, 56, N); r(14, 36, 32, 38, V); r(14, 56, 32, 58, V)
    r(18, 41, 18, 46, V); r(21, 41, 21, 46, V); r(17, 42, 22, 42, V); r(17, 45, 22, 45, V)   # #
    r(25, 41, 25, 44, B); r(25, 46, 25, 46, B)                                                # !
    for y in (49, 52): r(18, y, 28 - (y % 2) * 3, y, B)
    jambes(r)
    for k in range(0, 360, 15):                                               # le cercle d'invocation
        x = 43 + int(26 * math.cos(math.radians(k))); y = 66 + int(4 * math.sin(math.radians(k)))
        r(x, y, x + 1, y, V)
    for (x, y) in ((17, 66), (69, 66), (43, 62), (43, 70)): r(x, y, x + 1, y, B)
    sol_tirets(r, 72)


def lettre_academie(nom="item_lettre_academie.gif"):
    """La quatrième enveloppe du premier lancement : un pli de l'Académie, scellé d'une étoile à cinq branches,
    même format que la convocation et l'ordre de mission (60 x 42, agrandi deux fois)."""
    from PIL import Image, ImageDraw
    from dessiner_lieux import PAL, OUT
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    # le sceau de cire, frappé d'une étoile
    d.ellipse([22, 17, 37, 32], fill=V)
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        r = 6 if k % 2 == 0 else 2.5
        pts.append((29.5 + r * math.cos(a), 24.5 + r * math.sin(a)))
    d.polygon(pts, fill=N)
    # de petites étoiles dans les coins, comme une poussière de sort
    for x, y in [(8, 12), (51, 12), (8, 34), (51, 34)]:
        d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=V)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


PORTRAITS = {
    "item_henry.gif": henry_dessin, "item_alfred.gif": alfred_dessin, "item_lee.gif": lee_dessin,
    "item_stephen.gif": stephen_dessin, "item_doug.gif": doug_dessin, "item_paul.gif": paul_dessin,
    "item_andrew.gif": andrew_dessin, "item_brian.gif": brian_dessin,
}


DESSINS = {
    "loc_academie.gif": academie,
    "loc_aile_runes.gif": aile_runes, "loc_aile_divination.gif": aile_divination,
    "loc_aile_transmutation.gif": aile_transmutation, "loc_aile_grimoires.gif": aile_grimoires,
    "loc_aile_alchimie.gif": aile_alchimie, "loc_aile_chronomancie.gif": aile_chronomancie,
    "loc_aile_archives.gif": aile_archives, "loc_aile_invocation.gif": aile_invocation,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS) + list(PORTRAITS) + ["item_lettre_academie.gif"]
    for nom in noms:
        if nom == "item_lettre_academie.gif": lettre_academie(nom)
        elif nom in PORTRAITS: A.perso_fini(nom, PORTRAITS[nom])
        else: finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
