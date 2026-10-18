"""Dessine la WarRoom de Cybersup (loc_warroom.gif) : le mur d'écrans du sol au plafond et sa carte du réseau,
la rangée de voyants (verts, et ceux qui passent à l'alerte), la table en fer à cheval et les étudiants de M2
vus de dos, casque sur les oreilles, éclairés par leurs écrans, le sol lustré où se reflète le mur d'écrans.

Même cadre, même taille et même palette que l'image d'origine (noir, blanc, vert, dans cet ordre-là : cette
image-ci a toujours eu sa propre table de couleurs). Style du chapitre 8 (dessiner_port.py) : lumières et
reflets en trames, volumes éclairés d'un côté, liserés de lumière sur les silhouettes.
Usage : python3 outils/dessiner_warroom.py   (OUT=dossier pour un aperçu ailleurs)
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, cadre, N, V, B, W, H, OUT  # noqa: E402
from dessiner_fantasy import halo, degrade, trame, faisceau  # noqa: E402

# La table de couleurs propre à loc_warroom.gif : noir, blanc, vert.
PAL_WARROOM = [0, 0, 0, 255, 255, 255, 34, 177, 76] + [0, 0, 0] * 253


def finir_warroom(nom, im):
    big = im.resize((W * 2, H * 2), Image.NEAREST).convert('RGB')
    fond = cadre(); fond.paste(big, (32, 32))
    p = Image.new('P', (1, 1)); p.putpalette(PAL_WARROOM)
    fond.quantize(palette=p, dither=Image.Dither.NONE).save(OUT + nom)


def ecran_mural(d, x0, y0, x1, y1):
    """Le grand écran central : la carte du réseau de l'école, ses liens, et un nœud en alerte."""
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    noeuds = [(0.15, 0.3), (0.35, 0.18), (0.55, 0.35), (0.8, 0.22), (0.25, 0.7), (0.5, 0.75), (0.75, 0.65), (0.9, 0.55)]
    liens = [(0, 1), (1, 2), (2, 3), (0, 4), (4, 5), (5, 2), (5, 6), (6, 7), (3, 7), (2, 6)]
    pts = [(x0 + 4 + (x1 - x0 - 8) * a, y0 + 4 + (y1 - y0 - 8) * b) for a, b in noeuds]
    for a, b in liens:
        d.line([pts[a], pts[b]], fill=V)
    for k, (x, y) in enumerate(pts):
        if k == 6:
            halo(d, x, y, 9, B, 0.7, 7, dans=lambda xx, yy: x0 + 2 < xx < x1 - 2 and y0 + 2 < yy < y1 - 2)
            d.rectangle([x - 2, y - 2, x + 2, y + 2], fill=B)
            d.line([(x - 4, y - 4), (x + 4, y + 4)], fill=N); d.line([(x + 4, y - 4), (x - 4, y + 4)], fill=N)
        else:
            d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=B if k % 3 else V)


def ecran_courbe(d, x0, y0, x1, y1, graine=0):
    """Un écran latéral : une courbe de trafic ou des barres."""
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    if graine % 2 == 0:
        pts = []
        for k in range(9):
            x = x0 + 4 + (x1 - x0 - 8) * k / 8
            y = y1 - 5 - ((k * 7 + graine * 3) % 9) * (y1 - y0 - 10) / 10
            if k >= 6:
                y = y0 + 5
            pts.append((x, y))
        d.line(pts, fill=V)
    else:
        n = 5
        for k in range(n):
            x = x0 + 4 + k * (x1 - x0 - 8) / n
            h = ((k * 5 + graine) % 7 + 2) * (y1 - y0 - 8) / 10
            d.rectangle([x, y1 - 4 - h, x + (x1 - x0 - 8) / n - 2, y1 - 4], fill=V if k != 3 else B)


def operateur(d, x, y, l=12):
    """Un étudiant vu de dos, en contre-jour devant les écrans : une silhouette noire, le liseré de lumière
    sur le crâne et les épaules, le casque vert sur les oreilles."""
    d.polygon([(x - l, y + 12), (x + l, y + 12), (x + l + 3, y + 30), (x - l - 3, y + 30)], fill=N)
    d.chord([x - l, y + 8, x + l, y + 18], 180, 360, fill=N)
    d.arc([x - l, y + 8, x + l, y + 18], 190, 350, fill=B)
    d.ellipse([x - 6, y - 7, x + 6, y + 8], fill=N)
    d.arc([x - 6, y - 7, x + 6, y + 8], 200, 340, fill=B)
    d.arc([x - 8, y - 10, x + 8, y + 6], 205, 335, fill=V, width=2)
    d.rectangle([x - 9, y - 1, x - 6, y + 5], fill=V); d.rectangle([x + 6, y - 1, x + 9, y + 5], fill=V)
    d.rectangle([x - 3, y + 8, x + 3, y + 12], fill=N)


def warroom():
    im, d = toile()
    # la salle : le mur d'écrans du sol au plafond, les arêtes
    d.rectangle([22, 10, 154, 100], fill=N)
    for a, b in (((0, 0), (22, 10)), ((W - 1, 0), (154, 10)), ((0, H - 1), (22, 100)), ((W - 1, H - 1), (154, 100))):
        d.line([a, b], fill=B, width=2)
    halo(d, 88, 56, 96, V, 0.38, 62)
    # la rangée de voyants au-dessus du mur : verts, sauf ceux qui passent à l'alerte
    for k in range(14):
        x = 28 + k * 9
        alerte = k in (4, 9, 10)
        if alerte:
            halo(d, x + 1, 15, 6, B, 0.7, 5)
        d.rectangle([x, 14, x + 3, 16], fill=B if alerte else V)
    # le mur d'écrans
    d.rectangle([22, 20, 154, 100], fill=N)
    d.rectangle([22, 20, 154, 100], outline=B, width=2)
    ecran_mural(d, 56, 24, 120, 66)
    for k, (x0, y0) in enumerate(((26, 24), (26, 46), (124, 24), (124, 46))):
        ecran_courbe(d, x0, y0, x0 + 26, y0 + 18, k)
    for k in range(5):
        x0 = 26 + k * 26
        ecran_courbe(d, x0, 70, x0 + 24, 94, k + 3)
    # le sol lustré, et le reflet du mur d'écrans
    d.polygon([(22, 100), (154, 100), (W, H), (0, H)], fill=N)
    for x in range(26, 152, 6):
        faisceau(d, x, 110, x - 6 - (88 - x) * 0.4, x + 3 - (88 - x) * 0.4, 168, 0.3, 0.0, V)
    for k in range(1, 5):
        f = (k / 5) ** 1.5
        y = 100 + 70 * f
        d.line([(22 - 22 * f, y), (154 + 22 * f, y)], fill=V)
    # la table en fer à cheval : le fond, sous les écrans, et ses deux bras qui viennent vers nous
    d.rectangle([22, 100, 154, 106], fill=B); d.rectangle([22, 106, 154, 110], fill=V); d.line([(22, 110), (154, 110)], fill=N)
    for (xa, xb, sens) in ((22, 0, -1), (154, W, 1)):
        d.polygon([(xa, 100), (xa - sens * 14, 100), (xb - sens * 24, H), (xb, H)], fill=B)
        d.polygon([(xa - sens * 14, 100), (xa - sens * 14, 106), (xb - sens * 24, H), (xb - sens * 30, H)], fill=V)
        d.line([(xa - sens * 14, 100), (xb - sens * 24, H)], fill=N)
    # sur les bras, deux écrans de dos et leur lueur
    for (x, y) in ((22, 128), (154, 128)):
        halo(d, x, y, 12, V, 0.55, 8)
        d.rectangle([x - 7, y - 8, x + 7, y + 2], fill=N); d.rectangle([x - 7, y - 8, x + 7, y + 2], outline=B)
    # les étudiants de M2, de dos, casque sur les oreilles
    for k, x in enumerate((44, 70, 96, 122)):
        operateur(d, x, 84 + (k % 2) * 3, 9)
    operateur(d, 30, 132, 11); operateur(d, 146, 132, 11)
    return im


DESSINS = {"loc_warroom.gif": warroom}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir_warroom(nom, DESSINS[nom]())
    print(len(noms), "dessins")
