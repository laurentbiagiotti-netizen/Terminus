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
# Les huit maîtres, dessinés au pixel près comme les personnages d'origine du chapitre 1 (le professeur,
# le marchand, l'homme mystérieux) : chacun sa silhouette (voûté, rond, accroupi, de profil...), un visage
# caricatural, l'objet de son métier bien lisible, et deux ou trois traits blancs de sol sous les pieds.
# ------------------------------------------------------------------
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402
from decor_arcanes import robe_plis, manches, ceinture, ligne_r  # noqa: E402
import textwrap  # noqa: E402

COULEURS_PIXELS = {'#': B, 'o': V, ':': N}


def pixels(r, x0, y0, dessin):
    """Pose un morceau de personnage écrit en caractères, un caractère par gros pixel de la grille (88 x 85) :
    # blanc, o vert, : noir (pour creuser un trait dans un aplat), . rien (on voit ce qui est dessous)."""
    for j, ligne in enumerate(textwrap.dedent(dessin).strip('\n').split('\n')):
        for i, c in enumerate(ligne):
            if c in COULEURS_PIXELS:
                r(x0 + i, y0 + j, x0 + i, y0 + j, COULEURS_PIXELS[c])


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
    # le vieux maître des Runes, voûté sous son chapeau pointu qui retombe : sourcils en broussaille, gros nez,
    # une barbe jusqu'aux genoux, robe semée de croix ; il brandit la tablette gravée (^ $ [ ]) et s'appuie sur
    # son bâton à cristal
    pixels(r, 12, 10, """
        .........ooo
        ..........ooooo
        ............oooo
        .............ooooo..........................ooo
        .............oooooo........................o###o
        ............ooo#oooo......................o#ooo#o
        ............ooooooooo.....................o#o#o#o
        ...........oooooo#oooo.....................o###o
        ...........oo#oooooooooo....................ooo
        ..........oooooooooo#ooo.....................#
        ..........ooooo#oooooooooo...................#
        .........##################..................#
        .........#.##.#.##.#.###.##..................#
        ...ooooooooooooooooooooooooooooo.............#
        .....ooooooooooooooooooooooooo...............#
        .........oo############oo....................#
        ........oooooooo###ooooooo...................#
        ..........o###..####..###....................#
        ..........o###..####..####...................#
        ...........#########.######..................#
        ...........########.########.................#
        ...........#######.##########................#
        ...........########.......##.................#
        ..........####.###.####.###..................#
        .........#####.#########.###.................#
        ........######.###.###.#.####................#
        .......#######.###.###.##.#####..............#
        ......oo######.###.###.##.######............###
        .....ooo######.###.###.##.##.####......ooo.####
        ....oooo.#####.###.###.##.##.#####..oooooo.####
        ...ooooo.#####.###.###.##.##.######ooooooo..###
        ...oooooo.####.###.###.##.##.######ooooooo...#
        ..ooooooo.####.###.###.##.##.##.###.oooooo...#
        ..ooooooo..###.###.###.##.##.##.###..oooo....#
        ..oooooooo.###..##.###.##.##.##.###..........#
        .##########.##..##.###.##.##.##.##...........#
        .#........#..#..##.###.##.##.##.##...........#
        .#.o..ooo.#..#...#.###.##.##.##.#............#
        .#o.o.o...#oo#...#..##.##.##.#.#.............#
        .#....ooo.#ooo#..##..#.##.##.#..o............#
        .#......o.#oooo#.###...##.#...ooo............#
        .#....ooo.#ooooo..####.....#.oooo............#
        .#........#oooooo..#####.##.ooooo............#
        .#oo....oo#oooooooo...........oooo...........#
        .#o......o#ooo#oooooooooooooooooooo..........#
        .#oo....oo#ooooooooooooooooooo#ooooo.........#
        .##########oooooo#oooooooooooooooooo.........#
        ..oooooooooooooo###ooooooooo#oooooooo........#
        ...oooooooooooooo#ooooooooo###ooooooooo......#
        ...oooo#oooooooooooooooooooo#oooooo#ooo......#
        ....ooooooooooooo#ooooooooooooooooo###oo.....#
        ....oooooo#ooooo###oooo#oooooooooooo#ooo.....#
        .....ooooooooooo.#ooooooooooooooooooooooo....#
        .....ooooooooooo.oooooooooo#oooooooo.oooo....#
        ......oooooo#ooo.ooooooooooooooooooo.ooooo...#
        ......oooooooooo.ooooooooooooooooooo..oooo...#
        .......ooooooooo..oooooooooo#ooooooo..ooooo..#
        .......oooooooo...ooooooooooooooooo...ooooo..#
        ........###.###....###....######.......###...#
        .....######.#####..#####..########.....###...#
        .
        .####.######################..###########..####...#####
        .
        .........##########.....#########..........###
        .
        .................######
        """)


def alfred_dessin(r):
    # le devin d'awk, tout entier dans sa capuche : on ne voit qu'un nez crochu, deux yeux qui luisent et un bout de
    # barbe ; ses mains entourent la boule de cristal qui découpe la lumière en trois colonnes ($1 $2 $3)
    pixels(r, 14, 16, """
        ......................o
        .....................ooo
        ....................ooooo
        ...................ooooooo
        ..................ooooooooo
        .................ooooooooooo
        ................ooooooooooooo
        ...............ooooo.....oooooo
        ..............oooo.........oooooo
        .............oooo...........oooooo
        ............oooo.............ooooo
        ............ooo....##........ooooo
        ...........oooo...##.....##...oooo
        ...........ooo....#o.....#o...oooo
        ...........ooo.........#.......oooo
        ...........ooo.........##......ooooo
        ...........ooo.........###.....ooooo
        ...........oooo........####....ooooo
        ...........oooo.........##.....oooooo
        ..........oooooo..#.#.#.#.#..ooooooo
        ..........ooooooo..#.#.#.#..oooooooo
        .........ooooooooo.........ooooooooo
        ........ooooooooooooo....ooooooooooooo
        .......oooooooooooooooooooooooooooooooo
        ......oooooooooooooooooooooooooooooooooo
        .....oooo.ooooooooooooooooooooooo.oooooooo
        ....oooo.ooooooooooooooooooooooooo.ooooooo
        ...oooo.ooooooo##ooooooooooo##ooooo.oooooo
        ...ooo.oooooo######ooooooo######ooooo.ooooo
        ..oooo.ooooo###..###########..###oooo.ooooo
        ..ooo.oooooo##.................##oooo.ooooo
        ..ooo.ooooo##...................##ooo.ooooo
        .oooo.ooooo#..o....o....o........#ooo.oooooo
        .ooo.oooo###..o....o....o........###oo.ooooo
        .ooo.ooo###...o....o....o.........###o.ooooo
        .ooo.ooo###...o....o....o..#......###o.oooooo
        oooo.ooo###...o....o....o...##....###oo.ooooo
        oooo.ooo###...o....o....o...##....###oo.ooooo
        oooo.oooo###..o....o....o........###ooo.ooooo
        oooo.oooooo#..o....o....o........#ooooo.oooooo
        oooo.ooooooo##.................##oooooo.oooooo
        oooo.oooooooo###.............###ooooooo.oooooo
        oooo.ooooooooo.###############.oooooooo.oooooo
        oooo.ooooooooooo.....#####.....ooooooooo.ooooo
        ooooo.ooooooooo..#############..oooooooo.ooooo
        ooooo.oooooooo..###############..ooooooo.ooooo
        ooooo.oooooooo.#################.ooooooo.oooooo
        ooooo.ooooooooo.................oooooooo.oooooo
        oooooo.oooooooooooooooooooooooooooooooo.ooooooo
        oooooo.ooooooooooooooooooooooooooooooooo.oooooo
        ooooooo.oooooooooooooooooooooooooooooooo.oooooo
        .ooooooo.ooooooooooooooooooooooooooooooo.ooooo
        ...ooooooooooooooooooooooooooooooooooooooooo
        .....###.####....#####.....######...#####
        .
        #######.###########################.#####.##########
        .
        ..........#########......###########.......#####
        .
        ........................######
        """)


def lee_dessin(r):
    # la maîtresse de la Transmutation, chignon piqué d'une épingle, lunettes rondes, blouse et bas rayés : elle lève
    # sa plume vers le parchemin qui se réécrit tout seul, une fiole fumante au bout de l'autre bras
    pixels(r, 12, 19, """
        .............................oooo.............ooo
        ............................oooooo..#.........#ooo
        ...........................oooooooo#..........#.oo
        ...........................ooooooo#o.........#..o
        ............................ooooo#...........#
        .........................ooooooooooo........#
        ........................ooooooooooooo......##
        .......................oo###########oo....###
        .......................o#ooooo#ooooo#o....###
        .......................o#o#.#o#o#.#o#o...####.##########
        .......................o#ooooo#ooooo#o....##..#........#
        .......................oo####.######oo...###..#.oo..o..#
        .......................oo####..#####oo..###...#.o.o.o..#
        ........................o###########o..###....#.oo..o..#
        ........................o##.....####..###....##........#
        .........................####...###..###......#..ooo...#
        .........................##########.###.......#...o....#
        ..........................########.####.......#.o.ooo..#
        ............................###..####.........#.ooo....#
        ......................######oo###oo####
        .....................########oo#oo#####
        ....................###.######o#o######
        ...................###..#######o#######
        ..................###..########.########
        .................###...########.########
        ................###....########.########
        ...............###.....########.#.######
        ........o.....###.....#########.#########
        ..........o..###......#########.#########
        .........o..###.......#########.#########
        ...........###........#########.#.#######
        ..........#..........#......###.#####
        ..........#..........##########.##########
        .........###.........###.######.#######.##
        ........#ooo#........###.######.#.#####.##
        ........#ooo#.......###.#######.########.##
        ........#####.......####.######.#######.###
        ....................####.######.#######.###
        ....................####.######.#######.###
        ...................#####.######.#######.####
        ...................#####.######.#######.####
        ...................#####.######.#######.####
        ...................######.#####.######.#####
        ..................######.######.#######.#####
        ..................####
        ...................ooo.......ooo
        ...................#o#.......#o#
        ...................ooo.......ooo
        ...................#o#.......#o#
        ...................ooo.......ooo
        ...................#o#.......#o#
        ...................ooo.......ooo
        ..................#####.....#####
        .
        .......#####.##################.######
        .
        ................#########......#######
        """)


def stephen_dessin(r):
    # le bibliothécaire des Grimoires, crâne lisse et grosses lunettes : une tour de livres sur un bras, le grimoire
    # du dessus ouvert d'où pousse un arbre (le JSON), l'index levé comme pour une leçon
    pixels(r, 14, 10, """
        ........o.o.....o
        .......ooooo..oooo
        ......oo.o.oo.o.oo
        .....o..ooo..ooo.o
        .......o.#.o.o.#
        ......oo.#..o..#.oo
        .....o..##..o..##..o
        ........#...o...#
        ........##..o..##
        .........#..o..#
        ...#############.#############
        ....##:#:##:##:#:#:##:#:##:##
        ....###########:#:###########
        ...ooooooooooooo#ooooooooooooo
        ......##################
        ......#:oooooooooooooo:#
        ......##################
        ....oooooooooooooooooooo
        ....o#o#oooooooooooo#o#o
        ....oooooooooooooooooooo
        .......##################
        .......##:#:#:######:#:##
        .......##################
        .....oooooooooooooooooooo
        .....ooo#oooooooooooo#ooo
        .....oooooooooooooooooooo
        ....###################
        ....#:##::##:#####:##::#
        ....###################
        ......ooooooooooooooooooo
        ......o###ooooooooooo###o
        ......ooooooooooooooooooo
        .....####################
        .....##:#:#:######:#:#:##
        .....####################
        ...oooooooooooooooooooooo
        ...ooo#ooooooooooooo#oooo
        ...oooooooooooooooooooooo
        ..........#######
        """)
    pixels(r, 47, 14, """
        .....#####
        ...#########
        ..###########:o
        .#############o
        .##############
        .##############
        oooooo#oooooo#
        o####o#o####o#
        o#::#ooo#::#o##
        o####o#o####o##
        oooooo#oooooo##
        .#######:#######
        .######:########
        .#####::########
        .##############
        ..###:::::####
        ..###::###:###
        ...##########
        .....#####
        """)
    pixels(r, 43, 33, """
        ........#####
        ..oooooo#####ooooooo......##
        .ooooooo#:#:#oooooooo....##
        oooooooo##:##ooooooooo..##
        ooooooooo#:#oooooooooo.##
        ooooooooo#:#ooooooooooo##
        ooo:ooooo#:#ooooo:ooooo#
        oooooooo#:::#oooooooooo
        oooo:ooo#:::#oooo:oooo
        .ooooooo#:::#oooooooo
        .ooo:ooo##:##oooo:ooo
        .oooooooo###ooooooooo
        .oooo:oooo#oooooo:ooo
        .ooooooooo#ooo##oooooo
        .oooooooooooo#..#ooooo
        .ooooooooooooo##.oooooo
        .oooooooooooooo#..ooooo
        ..ooooooooooooooo#ooooo
        """)
    pixels(r, 65, 23, """
        ..##
        ..##
        .###
        .###
        ####
        ####
        .###
        .##
        .##
        ##
        """)
    pixels(r, 39, 35, """
        ....ooo
        ...ooo
        ..ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        .ooo
        ####
        ####
        """)
    pixels(r, 45, 51, """
        ooooooooooooooooooo
        ooooooooooooooooooo
        ooooooooo.ooooooooo
        .ooooooo...ooooooo
        ..ooooo.....ooooo
        ..ooooo.....ooooo
        ..oo:oo.....oo:oo
        ..ooooo.....ooooo
        ..oo:oo.....oo:oo
        ..ooooo.....ooooo
        ..oo:oo.....oo:oo
        ..ooooo.....ooooo
        ..ooooo.....ooooo
        ..ooooo.....ooooo
        ..ooooo.....ooooo
        .#######...#######
        #########..########
        """)
    pixels(r, 14, 71, """
        .....########.###################.######
        .
        ........#####.....##############....###########
        .
        ...................#######
        """)


def doug_dessin(r):
    # le maître de l'Alchimie, tout rond, lunettes de forge sur le front, favoris et grand sourire, poing sur la hanche :
    # il tourne la vanne du tuyau de cuivre, une goutte verte tombe, un petit alambic fume à ses pieds
    pixels(r, 26, 19, """
        .......#########
        .....#############
        ...oooooo###oooooo
        ..oo#oooooo#oo#ooooo
        oooooooooooooooooooooo
        ..oooooo###oooooo####
        ..o##################o
        .oo####:#####:#######oo
        .oo###:#:###:#:######oo
        .oo##################oo
        .oo#######::#########oo
        .oo######:##:########oo
        .oo#######::#########oo
        .oo##:::::::::::::###oo
        ..o##:###########:###o
        ...###:::::::::::####
        ....################
        ......############
        """)
    pixels(r, 18, 38, """
        ................#######
        .........###################
        ......#####ooooooooooooooo#######
        .....####ooooooooooooooooooo#####
        ...#####ooooooooooooooooooooo#####
        ..####.ooooooooooooooooooooooo.####
        .####.oooooooo:oooooo:ooooooooo.#####
        .###..ooooooooooooooooooooooooo..#######
        ####..oooooooooooooooooooooooooo...#######
        .###..oooooo:::::::::::::oooooooo....######
        ..###.oooooo:ooooooooooo:oooooooo......####
        ...##.oooooo:ooo:ooo:ooo:oooooooo.......###
        ....#.oooooo:ooooooooooo:oooooooo
        ...##.oooooo:::::::::::::oooooooo
        ..###.ooooooooooooooooooooooooooo
        .####.ooooooooooooooooooooooooooo
        ..###..ooooooooooooooooooooooooo
        .......oooooooooooooooooooooooo
        ........oooooooooooooooooooooo
        .........oooooooooooooooooooo
        ...........oooooooooooooooo
        .............####...####
        .............####...####
        .............oooo...oooo
        .............oooo...oooo
        ...........######...######
        ..........#######...#######
        """)
    pixels(r, 57, 17, """
        ...ooooo
        ...o###o
        ...ooooo
        ....###
        ....###
        ....###
        ....###
        .....###
        ...##..##
        ..#.#.#..#
        .#..#.#...#
        .###########
        .#..#.#...#
        ..#.#.#..#
        ...##..##
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###.....o
        ....###
        ....###....o
        ....###
        ....###.....o
        ....###
        ...#####...o#o
        ...#####...ooo
        ....###....ooo
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ....###
        ..#######
        .#########
        """)
    pixels(r, 8, 57, """
        .......o
        ........o
        .......o
        .....#####
        ......###
        ....#######
        ...#ooooooo#
        ..#ooooooooo#
        ..#####ooo###
        ...#########
        .....#####
        .....#.#.#
        """)
    pixels(r, 8, 71, """
        ....####.#############..#####################...####
        .
        .......#########.......####################
        .
        .....................######
        """)


def paul_dessin(r):
    # l'horloger de la Chronomancie, long et maigre, haut-de-forme, monocle et moustache en guidon : il écoute couler
    # le sablier tenu contre son oreille, la tête penchée ; la montre à gousset pend au bout de sa chaîne
    pixels(r, 38, 16, """
        .........##########
        ........###########
        ........##########
        .......###########
        .......##########
        ......###########
        ......ooooooooooo
        ......###########
        ...#################
        """)
    pixels(r, 38, 25, """
        .......############
        ......##:::###:::##
        ......###:####.ooooo
        .....######.#.o###o
        .....######.#.o#:#o
        .....#####:##.ooooo
        ......####::######..o
        ......##########....o
        ....o::::::::::::o..o
        ...oo.:#######:...oo
        .......########.....o
        ........######
        .........####
        """)
    pixels(r, 38, 38, """
        .........###
        .....##########
        ...####:oooo:####
        ..###:ooooooo:####
        ..###:oooooo:##:####
        ..###:ooo:ooo:##.:####
        ..###:oooooo:##...:####
        ..###:ooo:ooo:##....:##
        ..###:oooooo:##......##
        ..###:ooo:ooo:##.....##
        ..###:oooooo:##......##
        ..###:oooooooo:##....###
        ..###:oooooooo:##
        ..####:oooooo:###
        ..#####::::::####
        ..######...######
        ...#####...#####
        ...####.....####
        ...####.....####
        ....###.....###
        ....###.....###
        ....###.....###
        ....###.....###
        ....###.....###
        ....###.....###
        ....###.....###
        ....###.....###
        ...####.....####
        ..#####.....#####
        .######.....######
        """)
    pixels(r, 57, 19, """
        ...#########
        ....#:::::#
        .....#ooo#
        ......#o#
        .......#
        ......#:#
        .....#:o:#
        ....#ooooo#
        ...#########
        .....##
        .....##
        ....###
        ....###
        ...###
        ..###
        .###
        ###
        ##
        """)
    pixels(r, 34, 44, """
        ....#
        ...#
        ..#
        ..#
        ..##
        .####
        #:##:#
        #:o::#
        #::::#
        .####
        """)
    pixels(r, 16, 71, """
        ....#######.##########.######################
        .
        ........##########......##################
        .
        .....................#########
        """)


def andrew_dessin(r):
    # l'archiviste, petit et barbu, bonnet sur les yeux, une aiguille et son fil vert piqués dedans : il frotte de la
    # manche le grand miroir sur pied, qui reflète une pile de dossiers
    pixels(r, 22, 26, """
        .......##########
        .....##############
        ....################
        ...##################
        ..####:#####:####:####
        ..ooooooooooooooooooooo
        .oooooooooooooooooooooo
        """)
    pixels(r, 22, 30, """
        ............................#
        ...........................#
        ..........................#
        .........................#
        ........................#
        .......................o
        .......................o
        ..........................o
        ............................o
        .............................o
        ............................o
        """)
    pixels(r, 24, 37, """
        ..o#################o
        ..o####::#####::####o
        ..o####::#####::####o
        ..o#################o
        ..o#######:#########o
        ..o######:::########o
        .###################
        ###:##:#:#:##:#:##:##
        ####:##:#:#:#:##:####
        ####:#:##:#:##:#:####
        .####:#:#:#:##:#:###
        ..####:#:#:#:##:###
        ...#####:#:##:####
        .....#####:#####
        """)
    pixels(r, 18, 51, """
        .......oooooooooooo
        .....oooooooooooooooo
        ....ooooooooooooooooooo
        ...ooo:oooooooooooo:oooo
        ..oooo:oooooooooooo:ooooo
        .ooooo:oooooooooooo:oooooo
        #####o:ooo#o#o#oooo:oooooo
        ######:ooo#o#o#oooo:oooooo
        ##:###:ooo#o#o#oooo:ooooooo
        ######:ooooooooooooo:oooooo
        .####oo:oooooooooooo:ooooooo
        .....oo:ooooooooooooo:oooooo
        .....oo:ooooooooooooo:oooooo
        ....ooo:ooooooooooooo:ooooooo
        ....ooo:ooooooooooooo:ooooooo
        ....ooooooooooooooooooooooooo
        .....########.....#########
        ....#########.....##########
        """)
    pixels(r, 49, 28, """
        ........#########
        ......###:::::::###
        .....##:::::::::::##
        ....##::o:::::::::::#
        ....#::o:::::::::::::#
        ...##:o:::::::::::::::#
        ...#:::::::::::::::::##
        ...#::::####::::::::::#
        ...#::::#::#::::::::::#
        ...#::::####::::::::::#
        ...#::::#::#::::::::::#
        ...#::::####::::o:::::#
        ...#::::#::#:::o::::::#
        ...#::::####::o:::::::#
        ...##::::::::o:::::::##
        ....#:::::::::::::::##
        ....##:::::::::::::##
        .....###:::::::::###
        .......###########
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        ...........###
        .......###########
        .....#####.....#####
        .....###.........###
        """)
    pixels(r, 41, 52, """
        .........#####
        .......######
        .....ooooo
        ...ooooo
        .ooooo
        ooooo
        """)
    pixels(r, 14, 71, """
        ...######.#######################.....#############
        .
        ........##########....#######################
        .
        ...................#######
        """)


def brian_dessin(r):
    # le jeune enchanteur de l'Invocation, cheveux en bataille, une jambe en l'air : il lève une craie qui crépite,
    # son parchemin #! sous le bras, au milieu du cercle d'invocation qui luit au sol
    pixels(r, 55, 25, """
        o...o..o
        ..o.#.o
        o...#...o
        ..o.#.o
        ...###
        ..####
        ..####
        ...##
        """)
    pixels(r, 47, 33, """
        .........###
        ........###
        .......###
        ......###
        .....###
        ....###
        ...###
        ..###
        .###
        ###
        """)
    pixels(r, 32, 31, """
        .....o..o.o..o
        ....oo.ooooo.oo
        ...ooooooooooooo.o
        ..ooooooooooooooooo
        .oooo###########ooo
        .ooo#############oo
        .ooo#####:####:##oo
        .oo####:#:##:#:##o
        .oo##############o
        .oo#######:######o
        .ooo#####::######o
        ..oo#############
        ...o###:::::::##
        ....####:::::##
        .....#########
        .......#####
        """)
    pixels(r, 30, 46, """
        ........###########
        ......oooooooooooooo#
        .....ooooo:##:oooooooo
        ....oooooo:##:ooooooo
        ...ooooooo:##:ooooooo
        ..oooooooo:##:ooooooo
        .####ooooo:##:oooooo
        #####ooo#o:##:o#oooo
        ####.ooooo:##:oooooo
        .....ooooo:##:oooooo
        .....ooo#o:##:o#oooo
        .....ooooo:##:oooooo
        .....ooooo:##:oooooo
        .....ooo#o:##:o#oooo
        .....oooooo::oooooooo
        .....ooooooooooooooooo
        ......ooooo....oooooo
        ......oooo......oooo
        ......oooo.......oooo
        ......oooo........oooo
        ......oooo.........ooooo
        .....######.........#####
        ....#######.........######
        """)
    pixels(r, 24, 47, """
        ..##############
        ..#::::::::::::#
        ..#:o:o:::#::::#
        ..#ooooo::#::::#
        ..#:o:o:::#::::#
        ..#ooooo:::::::#
        ..#:o:o:::#::::#
        ..#::::::::::::#
        ..#:###:#####::#
        ..#::::::::::::#
        ..#:####:###:::#
        ..#::::::::::::#
        ..##############
        """)
    pixels(r, 24, 69, """
        .............ooo..ooo..ooo..ooo
        .......ooo.......................ooo
        .....oo.....######.######.#####.....oo
        .......ooo.......................ooo
        .............ooo..ooo..ooo..ooo
        .
        .........#########.....############
        """)


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
        elif nom in PORTRAITS: perso(nom, PORTRAITS[nom])
        else: finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
