"""Les portraits de l'épreuve finale, dans le style des personnages du chapitre 1 : pixel art 1 bit
(noir, vert, blanc), au pixel près, des silhouettes qui remplissent le cadre, de grands aplats verts
creusés de plis noirs, des détails et des reflets blancs, et un sol en traits sous les pieds.

Usage : python3 outils/dessiner_examen.py [nom...]   (OUT=dossier pour un aperçu ailleurs)
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402


# ------------------------------------------------------------------
# Petits outils de dessin
# ------------------------------------------------------------------

def sol(d, x0, x1, y):
    """Le sol du chapitre 1 : un trait, puis des tirets dessous."""
    d.line([(x0, y), (x1, y)], fill=B)
    for x in range(x0 + 6, x1 - 6, 14):
        d.line([(x, y + 4), (x + 6, y + 4)], fill=B)
    for x in range(x0 + 16, x1 - 16, 22):
        d.line([(x, y + 8), (x + 8, y + 8)], fill=B)


def etincelle(d, x, y, r=3, c=B):
    d.line([(x - r, y), (x + r, y)], fill=c)
    d.line([(x, y - r), (x, y + r)], fill=c)
    if r > 2:
        d.point([(x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1)], fill=c)


def etoile_robe(d, x, y, c=B):
    d.point([(x, y - 1), (x - 1, y), (x, y), (x + 1, y), (x, y + 1)], fill=c)


def pois(d, zone, n, graine, motif=etoile_robe, dans=None):
    r = random.Random(graine)
    x0, y0, x1, y1 = zone
    faits = 0
    essais = 0
    while faits < n and essais < 2000:
        essais += 1
        x, y = r.randint(x0, x1), r.randint(y0, y1)
        if dans and not dans(x, y):
            continue
        motif(d, x, y)
        faits += 1


def dans_polygone(points):
    def test(x, y):
        dedans = False
        j = len(points) - 1
        for i in range(len(points)):
            xi, yi = points[i]
            xj, yj = points[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
                dedans = not dedans
            j = i
        return dedans
    return test


def pli(d, points, c=N, w=1):
    d.line(points, fill=c, width=w)


def tramer(d, x0, y0, x1, y1, c=B, pas=2, test=None):
    for y in range(y0, y1 + 1, pas):
        for x in range(x0 + (y // pas) % 2, x1 + 1, pas):
            if test is None or test(x, y):
                d.point((x, y), fill=c)


# ------------------------------------------------------------------
# Myriam, la sorcière
# ------------------------------------------------------------------

def myriam():
    """Myriam, la sorcière qui a pris la Forteresse : chapeau pointu cassé, longs cheveux, robe étoilée, bâton à orbe."""
    im, d = toile()
    # la robe, large en bas, qui traîne au sol en pointes
    robe = [(70, 78), (98, 78), (104, 96), (112, 124), (124, 150), (130, 160), (118, 156), (108, 160), (96, 155),
            (84, 160), (72, 155), (60, 160), (50, 156), (40, 160), (46, 148), (56, 124), (64, 96)]
    d.polygon(robe, fill=V)
    test = dans_polygone(robe)
    pois(d, (46, 96, 126, 154), 14, 7, dans=lambda x, y: test(x, y) and test(x - 2, y) and test(x + 2, y))
    pli(d, [(84, 92), (80, 120), (76, 156)])
    pli(d, [(96, 98), (100, 126), (104, 156)])
    pli(d, [(70, 104), (62, 132), (56, 152)])
    pli(d, [(106, 120), (114, 146)])
    # la ceinture et sa boucle en lune
    d.rectangle([64, 94, 104, 98], fill=N)
    d.ellipse([80, 92, 88, 100], fill=B)
    d.ellipse([83, 92, 90, 99], fill=N)
    # les longs cheveux blancs, de part et d'autre
    for cote, signe in ((62, -1), (106, 1)):
        x = cote
        d.polygon([(x, 44), (x + 6 * signe, 48), (x + 10 * signe, 70), (x + 14 * signe, 96), (x + 8 * signe, 104),
                   (x + 2 * signe, 82), (x - 2 * signe, 60)], fill=B)
        pli(d, [(x + 3 * signe, 54), (x + 7 * signe, 80), (x + 9 * signe, 98)])
    # le visage
    d.ellipse([68, 40, 100, 74], fill=B)
    tramer(d, 70, 44, 98, 50, c=N, pas=2)          # l'ombre du chapeau, tramée
    # les yeux en amande, malicieux, et les sourcils froncés
    d.polygon([(72, 55), (78, 52), (83, 55), (77, 58)], fill=N)
    d.polygon([(96, 55), (90, 52), (85, 55), (91, 58)], fill=N)
    d.point([(77, 55), (91, 55)], fill=V)
    d.line([(71, 50), (82, 53)], fill=N, width=2)
    d.line([(97, 50), (86, 53)], fill=N, width=2)
    # le nez pointu, un grain de beauté, et le sourire en coin
    d.line([(84, 56), (81, 64), (85, 65)], fill=N)
    d.point([(93, 62)], fill=N)
    d.line([(75, 67), (79, 70), (88, 70), (95, 64)], fill=N)
    d.point([(96, 63)], fill=N)
    tramer(d, 72, 62, 76, 66, c=V, pas=2)
    # le col
    d.polygon([(70, 74), (84, 84), (98, 74), (102, 80), (84, 92), (66, 80)], fill=B)
    pli(d, [(84, 84), (84, 92)])
    # le chapeau : un large bord, un cône qui se casse vers l'arrière, une bande et une boucle
    d.ellipse([46, 38, 122, 50], fill=V)
    d.line([(48, 44), (120, 44)], fill=N)
    d.polygon([(66, 42), (102, 42), (94, 22), (90, 12), (100, 6), (112, 10), (104, 4), (86, 6), (80, 18)], fill=V)
    pli(d, [(88, 12), (92, 26), (96, 40)])
    d.rectangle([68, 34, 100, 40], fill=N)
    d.rectangle([80, 33, 88, 41], outline=B)
    d.point([(84, 37)], fill=B)
    # le bras levé et le bâton tordu, avec son orbe qui crépite
    d.polygon([(100, 82), (112, 74), (124, 60), (130, 64), (120, 82), (106, 94)], fill=V)
    pli(d, [(112, 80), (118, 70)])
    d.ellipse([124, 54, 134, 64], fill=V)            # la main
    d.line([(129, 64), (126, 92), (130, 120), (127, 158)], fill=B, width=2)
    d.line([(129, 58), (132, 40), (128, 30), (134, 22)], fill=B, width=2)
    d.ellipse([128, 8, 144, 24], fill=V, outline=B)
    d.ellipse([132, 12, 137, 17], fill=B)
    for ang in range(0, 360, 45):
        a = math.radians(ang)
        d.point((136 + round(12 * math.cos(a)), 16 + round(12 * math.sin(a))), fill=B)
    etincelle(d, 152, 10, 4)
    etincelle(d, 150, 34, 2)
    etincelle(d, 120, 18, 2)
    # l'autre main, posée sur la hanche
    d.polygon([(66, 82), (56, 96), (62, 104), (70, 94)], fill=V)
    pli(d, [(60, 98), (66, 92)])
    sol(d, 30, 150, 162)
    return im


# ------------------------------------------------------------------
# Dylan, le Saltimbanque
# ------------------------------------------------------------------

def massue(d, x, y, angle, flamme=False):
    """Une massue de jongleur (ou une torche enflammée), vue en biais."""
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    x1, y1 = x + 16 * dx, y + 16 * dy
    d.line([(x, y), (x1, y1)], fill=B, width=3)
    d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=B)
    if flamme:
        d.polygon([(x1 - 6 * dy - 1, y1 + 6 * dx), (x1 + 12 * dx, y1 + 12 * dy - 4), (x1 + 6 * dy + 1, y1 - 6 * dx)], fill=V)
        d.polygon([(x1 - 3 * dy, y1 + 3 * dx), (x1 + 7 * dx, y1 + 7 * dy - 2), (x1 + 3 * dy, y1 - 3 * dx)], fill=B)
    else:
        d.ellipse([x1 - 6, y1 - 6, x1 + 6, y1 + 6], fill=B, outline=N)
        d.line([(x1 - 4, y1), (x1 + 4, y1)], fill=V, width=2)


def dylan():
    """Dylan le Saltimbanque : bonnet de bouffon à grelots, costume en losanges, fraise, il jongle debout sur une grosse balle."""
    im, d = toile()
    # la grosse balle à quartiers, sous ses pieds
    d.ellipse([54, 124, 122, 166], fill=B, outline=B)
    d.ellipse([66, 124, 110, 166], fill=V)
    d.ellipse([78, 124, 98, 166], fill=B)
    d.ellipse([54, 124, 122, 166], outline=N)
    d.arc([60, 130, 84, 150], 200, 250, fill=N)
    # les jambes en collant losangé, pointes de pied tendues
    for x0, x1, pied in ((74, 84, -1), (92, 102, 1)):
        d.polygon([(x0, 100), (x1, 100), (x1 - 1 if pied < 0 else x1 + 2, 128), (x0 - 2 if pied < 0 else x0 + 1, 128)], fill=V)
        for y in range(104, 128, 8):
            d.polygon([(x0 + 4, y), (x0 + 7, y + 4), (x0 + 4, y + 8), (x0 + 1, y + 4)], fill=B)
    d.polygon([(70, 126), (84, 126), (84, 131), (66, 131), (62, 127)], fill=N, outline=B)
    d.point([(61, 126), (60, 125)], fill=B)
    d.polygon([(92, 126), (106, 126), (114, 127), (110, 131), (92, 131)], fill=N, outline=B)
    d.point([(115, 126), (116, 125)], fill=B)
    # le pourpoint à losanges verts et blancs, avec ses pointes à grelots
    corps = [(66, 72), (110, 72), (114, 92), (118, 104), (108, 100), (98, 106), (88, 100), (78, 106), (68, 100), (58, 104), (62, 92)]
    d.polygon(corps, fill=V)
    test = dans_polygone(corps)
    for y in range(74, 104, 8):
        for x in range(62 + (y // 8 % 2) * 6, 116, 12):
            losange = [(x, y - 4), (x + 4, y), (x, y + 4), (x - 4, y)]
            if all(test(px, py) for px, py in losange):
                d.polygon(losange, fill=B)
    for x, y in ((58, 104), (78, 106), (98, 106), (118, 104)):
        d.ellipse([x - 2, y, x + 2, y + 4], fill=B)
    d.line([(64, 92), (114, 92)], fill=N)
    # la fraise plissée autour du cou
    for x in range(66, 112, 6):
        d.ellipse([x - 4, 66, x + 4, 76], fill=B, outline=N)
    # les bras levés qui jonglent
    d.polygon([(66, 76), (52, 64), (44, 50), (50, 46), (58, 58), (72, 72)], fill=V)
    d.polygon([(110, 76), (124, 64), (132, 50), (126, 46), (118, 58), (104, 72)], fill=V)
    for x, y in ((50, 60), (126, 60)):
        d.polygon([(x - 3, y - 3), (x, y), (x - 3, y + 3), (x - 6, y)], fill=B)
    d.ellipse([40, 40, 50, 50], fill=B)
    d.ellipse([126, 40, 136, 50], fill=B)
    # les massues en l'air, en arc de cercle, et deux torches enflammées
    for x in range(30, 148, 5):
        y = 34 - math.sqrt(max(0, 59 ** 2 - (x - 88) ** 2)) * 0.5
        d.point((x, round(y)), fill=B)
    massue(d, 24, 30, -70, flamme=True)
    massue(d, 50, 16, -110)
    massue(d, 126, 16, -70)
    massue(d, 152, 30, -110, flamme=True)
    # le visage blanc, avec ses pommettes en losange et son grand sourire
    d.ellipse([72, 34, 104, 68], fill=B)
    d.polygon([(76, 54), (79, 51), (82, 54), (79, 57)], fill=V)
    d.polygon([(94, 54), (97, 51), (100, 54), (97, 57)], fill=V)
    d.arc([76, 42, 86, 52], 200, 340, fill=N)
    d.arc([90, 42, 100, 52], 200, 340, fill=N)
    d.point([(80, 47), (81, 47), (94, 47), (95, 47)], fill=N)
    d.line([(88, 50), (87, 56), (89, 56)], fill=N)
    d.chord([79, 54, 97, 66], 0, 180, fill=N)
    d.rectangle([82, 59, 94, 61], fill=B)
    # le bonnet de bouffon : trois pointes molles et leurs grelots
    d.rectangle([70, 32, 106, 40], fill=V)
    for x in range(72, 106, 6):
        d.polygon([(x, 33), (x + 3, 36), (x, 39), (x - 3, 36)], fill=B)
    d.polygon([(72, 34), (56, 18), (50, 28), (60, 26)], fill=V)
    d.polygon([(84, 32), (88, 16), (94, 32)], fill=V)
    d.polygon([(104, 34), (120, 18), (126, 28), (116, 26)], fill=V)
    pli(d, [(70, 34), (58, 22)])
    pli(d, [(106, 34), (118, 22)])
    for x, y in ((48, 28), (88, 13), (128, 28)):
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B, outline=N)
        d.point((x, y + 1), fill=N)
    etincelle(d, 148, 90, 3)
    etincelle(d, 26, 96, 2)
    sol(d, 30, 150, 166)
    return im


# ------------------------------------------------------------------
# Aidan, l'elfe rigolo
# ------------------------------------------------------------------

def aidan():
    """Aidan, l'elfe rigolo : immenses oreilles, bonnet à grelot qui retombe, grand sourire, pieds nus poilus de hobbit, un panneau HA HA."""
    im, d = toile()
    # les jambes en collant rayé et les grands pieds nus, poilus comme ceux d'un hobbit
    for x in (72, 94):
        d.rectangle([x, 128, x + 10, 148], fill=B)
        for y in range(130, 148, 5):
            d.line([(x, y), (x + 10, y)], fill=V, width=2)
    for x0, x1, sens in ((52, 86, -1), (90, 124, 1)):
        d.ellipse([x0, 146, x1, 162], fill=B, outline=N)
        orteils = range(x0 + 1, x0 + 14, 4) if sens < 0 else range(x1 - 14, x1 - 1, 4)
        for x in orteils:
            d.ellipse([x, 155, x + 4, 162], fill=B, outline=N)
        for x in range(x0 + 6, x1 - 4, 3):
            d.line([(x, 146), (x + sens, 141)], fill=V)
            d.line([(x + 1, 149), (x + 1 + sens, 144)], fill=V)
    # la tunique, en pointes, avec la ceinture
    tunique = [(68, 92), (110, 92), (116, 116), (122, 134), (112, 130), (104, 136), (96, 130), (88, 136),
               (80, 130), (72, 136), (64, 130), (56, 134), (62, 116)]
    d.polygon(tunique, fill=V)
    pli(d, [(80, 100), (76, 130)])
    pli(d, [(98, 100), (102, 130)])
    d.rectangle([62, 112, 116, 117], fill=N)
    d.rectangle([84, 110, 94, 119], fill=B)
    d.rectangle([86, 112, 92, 117], fill=N)
    # le col en pétales
    for x in range(70, 108, 8):
        d.polygon([(x, 90), (x + 8, 90), (x + 4, 98)], fill=B)
    # le bras gauche qui fait coucou, le bras droit qui jongle
    d.polygon([(66, 94), (54, 84), (44, 70), (50, 66), (60, 78), (72, 92)], fill=V)
    pli(d, [(56, 80), (52, 74)])
    d.ellipse([40, 58, 52, 70], fill=B)
    for k in range(4):
        d.line([(41 + 3 * k, 58), (40 + 3 * k, 52)], fill=B)
    d.polygon([(110, 94), (124, 102), (132, 98), (134, 104), (124, 110), (108, 102)], fill=V)
    d.ellipse([130, 94, 140, 104], fill=B)
    # le panneau qu'il brandit : HA HA
    d.line([(136, 96), (136, 90)], fill=B, width=2)
    d.rectangle([122, 68, 168, 90], fill=B)
    d.rectangle([124, 70, 166, 88], outline=N)
    for x0 in (128, 147):
        d.line([(x0, 74), (x0, 84)], fill=N, width=2); d.line([(x0 + 6, 74), (x0 + 6, 84)], fill=N, width=2); d.line([(x0, 79), (x0 + 6, 79)], fill=N)
        d.line([(x0 + 9, 84), (x0 + 11, 74)], fill=N); d.line([(x0 + 11, 74), (x0 + 13, 84)], fill=N); d.line([(x0 + 10, 80), (x0 + 12, 80)], fill=N)
    # les oreilles, immenses, en lames
    d.polygon([(70, 58), (18, 34), (24, 42), (66, 70)], fill=V, outline=B)
    pli(d, [(30, 40), (64, 62)])
    d.polygon([(106, 58), (158, 34), (152, 42), (110, 70)], fill=V, outline=B)
    pli(d, [(146, 40), (112, 62)])
    # le visage
    d.ellipse([66, 40, 110, 92], fill=V)
    d.ellipse([72, 54, 86, 68], fill=B)
    d.ellipse([90, 54, 104, 68], fill=B)
    d.ellipse([77, 58, 83, 64], fill=N)
    d.ellipse([95, 58, 101, 64], fill=N)
    d.point([(78, 59), (96, 59)], fill=B)
    d.line([(72, 50), (84, 52)], fill=N)
    d.line([(104, 50), (92, 52)], fill=N)
    d.polygon([(88, 64), (84, 74), (90, 74)], fill=N)     # le nez
    d.point([(86, 72)], fill=V)
    d.chord([72, 70, 104, 90], 0, 180, fill=N)           # le grand sourire
    d.rectangle([78, 80, 98, 83], fill=B)                # les dents
    d.line([(83, 80), (83, 83)], fill=N)
    d.line([(88, 80), (88, 83)], fill=N)
    d.line([(93, 80), (93, 83)], fill=N)
    d.chord([82, 82, 94, 92], 0, 180, fill=V)            # la langue
    tramer(d, 68, 70, 74, 76, c=B, pas=3)                # les joues roses (en blanc tramé)
    tramer(d, 102, 70, 108, 76, c=B, pas=3)
    # le bonnet, qui retombe sur le côté, et son grelot
    d.rectangle([64, 40, 112, 47], fill=B)
    for x in range(66, 112, 4):
        d.point((x, 43), fill=N)
    d.polygon([(66, 40), (110, 40), (104, 24), (92, 14), (112, 6), (128, 12), (120, 20), (110, 18), (114, 30)], fill=V)
    pli(d, [(92, 18), (100, 36)])
    d.ellipse([124, 6, 136, 18], fill=B)
    d.line([(127, 13), (133, 13)], fill=N)
    d.point([(130, 15)], fill=N)
    etincelle(d, 142, 6, 2)
    sol(d, 40, 140, 164)
    return im


# ------------------------------------------------------------------
# Laurent, le Mage Rouxblanc
# ------------------------------------------------------------------

def rouxblanc():
    """Laurent, le Mage Rouxblanc : chapeau étoilé, lunettes, une barbe mi-rousse (verte) mi-blanche, bâton de lumière."""
    im, d = toile()
    # la cape, ample
    cape = [(64, 70), (110, 70), (118, 100), (126, 130), (136, 158), (120, 154), (104, 160), (88, 154), (72, 160),
            (56, 154), (40, 158), (50, 130), (58, 100)]
    d.polygon(cape, fill=V)
    test = dans_polygone(cape)
    pois(d, (42, 100, 134, 154), 12, 11, dans=lambda x, y: test(x, y) and test(x - 2, y) and test(x + 2, y))
    pli(d, [(70, 96), (62, 128), (56, 152)])
    pli(d, [(106, 96), (114, 128), (120, 152)])
    pli(d, [(88, 120), (88, 154)])
    # la barbe : la moitié gauche rousse (verte), la droite blanche, ondulée
    barbe_g = [(72, 64), (88, 64), (88, 128), (82, 122), (76, 124), (72, 110), (66, 96), (68, 76)]
    barbe_d = [(88, 64), (104, 64), (108, 76), (110, 96), (104, 110), (100, 124), (94, 122), (88, 128)]
    d.polygon(barbe_g, fill=V, outline=B)
    d.polygon(barbe_d, fill=B)
    for x0, y0, y1 in ((76, 78, 112), (82, 74, 120)):
        pli(d, [(x0, y0), (x0 - 2, (y0 + y1) // 2), (x0 + 1, y1)])
    for x0, y0, y1 in ((94, 74, 120), (100, 78, 110)):
        pli(d, [(x0, y0), (x0 + 2, (y0 + y1) // 2), (x0 - 1, y1)], c=V)
    # le visage et les lunettes
    d.ellipse([70, 34, 106, 70], fill=B)
    d.rectangle([72, 34, 104, 44], fill=N)
    d.rectangle([73, 48, 85, 56], outline=N)
    d.rectangle([91, 48, 103, 56], outline=N)
    d.line([(85, 51), (91, 51)], fill=N)
    d.point([(78, 52), (79, 52), (96, 52), (97, 52)], fill=N)
    d.line([(73, 45), (84, 46)], fill=V)
    d.line([(103, 45), (92, 46)], fill=V)
    d.line([(88, 56), (86, 62), (89, 62)], fill=N)
    # la moustache, rousse d'un côté, blanche de l'autre
    d.polygon([(88, 63), (78, 64), (72, 70), (80, 68), (88, 67)], fill=V, outline=N)
    d.polygon([(88, 63), (98, 64), (104, 70), (96, 68), (88, 67)], fill=B, outline=N)
    d.line([(84, 70), (92, 70)], fill=N)
    # le chapeau à larges bords, étoilé, avec une lune
    d.ellipse([52, 34, 124, 46], fill=V)
    d.line([(54, 40), (122, 40)], fill=N)
    chapeau = [(70, 38), (106, 38), (98, 18), (92, 6), (84, 2), (88, 10), (80, 22)]
    d.polygon(chapeau, fill=V)
    for (x, y) in ((86, 28), (94, 20), (80, 32), (100, 32)):
        etoile_robe(d, x, y)
    d.ellipse([88, 10, 94, 16], fill=B)
    d.ellipse([90, 9, 96, 15], fill=V)
    # la main gauche qui tient le bâton, le bâton de lumière
    d.line([(132, 30), (130, 160)], fill=B, width=3)
    d.polygon([(110, 82), (124, 86), (132, 80), (134, 90), (122, 96), (106, 92)], fill=V)
    d.ellipse([126, 78, 138, 90], fill=B)
    pli(d, [(130, 84), (134, 84)])
    d.ellipse([124, 14, 140, 30], fill=B)
    d.ellipse([127, 17, 137, 27], fill=V)
    d.ellipse([130, 20, 134, 24], fill=B)
    for ang in range(0, 360, 30):
        a = math.radians(ang)
        r = 13 if ang % 60 == 0 else 11
        d.point((132 + round(r * math.cos(a)), 22 + round(r * math.sin(a))), fill=B)
    etincelle(d, 152, 14, 3)
    etincelle(d, 114, 10, 2)
    etincelle(d, 150, 40, 2)
    # l'autre main, ouverte, qui fait jaillir une étincelle verte
    d.polygon([(64, 82), (50, 96), (44, 92), (56, 78)], fill=V)
    d.ellipse([38, 86, 50, 98], fill=B)
    etincelle(d, 36, 76, 4, c=V)
    etincelle(d, 28, 90, 2, c=V)
    sol(d, 30, 150, 163)
    return im


# ------------------------------------------------------------------
# David, l'ogre des steppes
# ------------------------------------------------------------------

def david():
    """David, l'ogre des steppes : grand et maigre comme un bâton, chapka de fourrure, longue tresse, petites défenses,
    une Galette du Roi Gras dans une main et un cornet de frites dans l'autre."""
    im, d = toile()
    # les longues jambes maigres et les bottes de cavalier
    for x in (76, 94):
        d.rectangle([x, 118, x + 6, 152], fill=V)
        d.line([(x + 3, 120), (x + 3, 150)], fill=N)
        d.polygon([(x - 3, 150), (x + 8, 150), (x + 10, 160), (x - 6, 160)], fill=B, outline=N)
    d.polygon([(73, 160), (68, 156), (70, 152)], fill=B)
    # le manteau long et étroit, croisé, ceinturé
    corps = [(74, 74), (102, 74), (106, 96), (108, 124), (68, 124), (70, 96)]
    d.polygon(corps, fill=V)
    d.polygon([(78, 74), (98, 74), (88, 90)], fill=B)
    d.line([(78, 74), (96, 98)], fill=N, width=2)
    d.rectangle([68, 100, 108, 104], fill=N)
    d.rectangle([84, 99, 92, 105], fill=B)
    pli(d, [(74, 108), (72, 122)])
    pli(d, [(102, 108), (104, 122)])
    # le cou, long et fin
    d.rectangle([84, 62, 92, 76], fill=V)
    d.line([(86, 66), (88, 70)], fill=N)
    # les bras en fil de fer
    d.line([(74, 78), (58, 96), (50, 112)], fill=V, width=5)
    d.line([(102, 78), (118, 92), (126, 78)], fill=V, width=5)
    pli(d, [(58, 96), (60, 98)])
    # la tête étroite et longue
    d.ellipse([70, 20, 106, 68], fill=V)
    d.ellipse([64, 36, 72, 48], fill=V, outline=N)                # les oreilles
    d.ellipse([104, 36, 112, 48], fill=V, outline=N)
    d.polygon([(76, 54), (78, 64), (80, 54)], fill=N)               # les joues creuses
    d.polygon([(96, 54), (98, 64), (100, 54)], fill=N)
    d.ellipse([75, 37, 85, 47], fill=B)                              # les yeux ronds et ravis
    d.ellipse([91, 37, 101, 47], fill=B)
    d.ellipse([79, 40, 83, 45], fill=N)
    d.ellipse([93, 40, 97, 45], fill=N)
    d.line([(74, 34), (84, 36)], fill=N, width=2)
    d.line([(102, 34), (92, 36)], fill=N, width=2)
    d.polygon([(88, 44), (85, 54), (91, 54)], fill=N)               # le long nez
    d.line([(80, 58), (88, 62), (98, 56)], fill=N, width=2)          # le sourire en coin
    d.polygon([(82, 59), (83, 55), (85, 60)], fill=B)                # les petites défenses
    d.polygon([(93, 59), (95, 55), (96, 59)], fill=B)
    # la chapka, et la longue tresse qui tombe dans le dos
    d.chord([70, 2, 106, 36], 180, 360, fill=V)
    pli(d, [(88, 4), (88, 18)])
    d.rounded_rectangle([66, 16, 110, 26], radius=5, fill=B)
    for x in range(68, 108, 4):
        d.point([(x, 18), (x + 2, 22)], fill=N)
    d.ellipse([84, -2, 92, 6], fill=B, outline=N)
    for k in range(7):
        y = 30 + 9 * k
        d.ellipse([108 + (k % 2), y, 116 + (k % 2), y + 9], fill=B, outline=N)
    d.polygon([(110, 93), (114, 102), (118, 93)], fill=V)
    # la Galette du Roi Gras, plus grosse que sa tête
    d.ellipse([120, 70, 132, 82], fill=V, outline=N)
    d.chord([112, 46, 164, 76], 180, 360, fill=B, outline=N)
    for x, y in ((124, 52), (134, 50), (144, 53), (152, 58)):
        d.point((x, y), fill=N)
    d.polygon([(110, 62), (166, 62), (162, 67), (114, 67)], fill=V)
    for x in range(112, 164, 6):
        d.polygon([(x, 66), (x + 3, 70), (x + 6, 66)], fill=V)
    d.rectangle([112, 68, 164, 73], fill=N)
    d.line([(112, 68), (164, 68)], fill=B)
    d.rectangle([112, 74, 164, 77], fill=B)
    d.chord([112, 72, 164, 88], 0, 180, fill=B, outline=N)
    # le cornet de frites dorées, couronné du Roi Gras
    d.ellipse([42, 106, 56, 120], fill=V, outline=N)
    for k, x in enumerate(range(28, 56, 4)):
        h = 12 + (k * 7) % 9
        d.rectangle([x, 96 - h, x + 2, 98], fill=B, outline=N)
    d.polygon([(26, 96), (58, 96), (52, 122), (32, 122)], fill=V, outline=B)
    d.polygon([(35, 112), (35, 104), (39, 108), (42, 102), (45, 108), (49, 104), (49, 112)], fill=B)
    etincelle(d, 150, 30, 2)
    etincelle(d, 20, 70, 2)
    sol(d, 30, 150, 163)
    return im


# ------------------------------------------------------------------
# Laurana la Flamboyante, le héraut
# ------------------------------------------------------------------

def laurana():
    """Laurana la Flamboyante : longue chevelure de feu (verte, comme la barbe rousse du Mage), tabard du héraut,
    trompette d'argent levée, d'où pend la bannière de Cybersup."""
    im, d = toile()
    # la chevelure de feu, très longue, qui flotte au vent derrière elle
    d.polygon([(64, 34), (56, 60), (46, 96), (38, 132), (50, 126), (54, 140), (66, 120), (70, 92), (72, 60)], fill=V)
    d.polygon([(104, 34), (114, 54), (120, 84), (132, 110), (122, 108), (126, 126), (110, 104), (104, 74)], fill=V)
    for pts in ([(60, 50), (52, 90), (44, 124)], [(66, 60), (60, 100), (54, 130)], [(108, 48), (116, 80), (126, 104)]):
        pli(d, pts)
    # la robe longue et le tabard du héraut, frappé d'un soleil
    robe = [(70, 82), (100, 82), (108, 120), (118, 160), (52, 160), (62, 120)]
    d.polygon(robe, fill=V)
    pli(d, [(76, 120), (70, 158)])
    pli(d, [(96, 120), (102, 158)])
    d.polygon([(74, 84), (96, 84), (98, 140), (85, 150), (72, 140)], fill=B)
    d.ellipse([79, 100, 91, 112], fill=V)
    for k in range(8):
        a = math.radians(k * 45)
        d.line([(85 + round(8 * math.cos(a)), 106 + round(8 * math.sin(a))), (85 + round(11 * math.cos(a)), 106 + round(11 * math.sin(a)))], fill=V)
    d.rectangle([66, 118, 104, 122], fill=N)
    # le visage, de face, avec des taches de rousseur
    d.ellipse([70, 34, 100, 68], fill=B)
    d.chord([66, 26, 104, 56], 180, 360, fill=V)                 # la frange
    d.polygon([(66, 42), (70, 36), (74, 50)], fill=V)
    d.polygon([(104, 42), (100, 36), (96, 50)], fill=V)
    d.ellipse([76, 46, 82, 52], fill=N)
    d.ellipse([88, 46, 94, 52], fill=N)
    d.point([(77, 47), (89, 47)], fill=B)
    d.line([(75, 43), (82, 44)], fill=N)
    d.line([(95, 43), (88, 44)], fill=N)
    d.line([(85, 52), (84, 57), (86, 57)], fill=N)
    d.arc([79, 56, 91, 64], 20, 160, fill=N)
    for x, y in ((75, 55), (77, 57), (79, 55), (91, 55), (93, 57), (95, 55)):
        d.point((x, y), fill=V)
    d.rectangle([80, 68, 90, 76], fill=B)                          # le cou
    # un diadème en flamme
    d.polygon([(78, 30), (81, 22), (85, 28), (89, 20), (92, 30)], fill=B, outline=N)
    # le bras levé et la trompette d'argent, et la bannière qui en pend
    d.polygon([(98, 86), (112, 72), (120, 56), (126, 60), (118, 78), (104, 94)], fill=V)
    d.ellipse([118, 50, 128, 60], fill=B)
    d.line([(120, 54), (150, 30)], fill=B, width=3)
    d.polygon([(148, 22), (162, 16), (160, 40), (150, 34)], fill=B, outline=N)
    d.ellipse([116, 52, 122, 58], fill=B, outline=N)
    d.polygon([(128, 46), (144, 34), (148, 62), (138, 70), (132, 60)], fill=V)
    d.line([(128, 46), (144, 34)], fill=B)
    d.polygon([(133, 54), (138, 48), (140, 56)], fill=B)
    for k, (x, y) in enumerate(((158, 50), (164, 34), (166, 10), (152, 8))):
        d.arc([x - 4, y - 4, x + 4, y + 4], 200 + 30 * k, 340 + 30 * k, fill=B)
    # l'autre main, sur la hanche
    d.polygon([(70, 88), (58, 104), (64, 114), (72, 102)], fill=V)
    d.ellipse([58, 106, 68, 116], fill=B)
    etincelle(d, 30, 40, 3)
    etincelle(d, 140, 96, 2)
    sol(d, 30, 150, 163)
    return im


# ------------------------------------------------------------------
# Les fidèles du Mage : Manon, Wissam, Jean-Baptiste, Gabriel, Timour
# ------------------------------------------------------------------

def yeux(d, cx, cy, ecart=8, regard=0, sourcils=0):
    """Deux yeux expressifs : le blanc, la pupille, un reflet, et des sourcils (penchés selon l'humeur)."""
    for sx in (-1, 1):
        x = cx + sx * ecart
        d.ellipse([x - 4, cy - 3, x + 4, cy + 3], fill=B, outline=N)
        d.ellipse([x - 2 + regard, cy - 2, x + 1 + regard, cy + 2], fill=N)
        d.point((x - 1 + regard, cy - 1), fill=B)
        d.line([(x - 5, cy - 6 - sourcils * sx), (x + 4, cy - 6 + sourcils * sx)], fill=N, width=2)


def manon():
    """Manon la Châtelaine : chignon tenu par une épingle, col montant, longue robe à ceinture de clés, grand registre ouvert."""
    im, d = toile()
    robe = [(66, 80), (110, 80), (116, 108), (128, 146), (136, 160), (40, 160), (48, 146), (60, 108)]
    d.polygon(robe, fill=V)
    test = dans_polygone(robe)
    tramer(d, 44, 138, 132, 158, c=N, pas=3, test=lambda x, y: test(x, y) and (x < 70 or x > 108))
    for pts in ([(78, 108), (70, 158)], [(98, 108), (106, 158)], [(88, 114), (88, 158)], [(64, 120), (52, 156)], [(112, 120), (124, 156)]):
        pli(d, pts)
    d.rectangle([60, 102, 116, 107], fill=N)
    d.rectangle([84, 101, 92, 108], fill=B)
    # le corsage et son col montant, les manches bouffantes
    d.polygon([(72, 74), (104, 74), (100, 88), (88, 96), (76, 88)], fill=B)
    for y in (80, 86):
        d.point([(88, y)], fill=N)
    d.ellipse([56, 78, 76, 98], fill=V, outline=N); d.ellipse([100, 78, 120, 98], fill=V, outline=N)
    # le visage, doux et sérieux
    d.ellipse([72, 36, 104, 72], fill=B)
    yeux(d, 88, 53, ecart=7, sourcils=0)
    d.line([(88, 56), (87, 61), (89, 61)], fill=N)
    d.arc([82, 61, 94, 68], 20, 160, fill=N)
    d.point([(78, 62), (98, 62)], fill=V)
    # les cheveux tirés, le chignon et son épingle
    d.chord([70, 30, 106, 60], 180, 360, fill=V)
    d.polygon([(70, 44), (72, 64), (77, 48)], fill=V)
    d.polygon([(106, 44), (104, 64), (99, 48)], fill=V)
    for x in (78, 86, 94):
        pli(d, [(x, 34), (x + 2, 44)])
    d.ellipse([78, 14, 98, 34], fill=V, outline=N)
    d.arc([82, 18, 94, 30], 0, 270, fill=N)
    d.line([(74, 18), (102, 28)], fill=B, width=2)
    d.ellipse([100, 26, 105, 31], fill=B)
    # le trousseau de clés pendu à la ceinture
    d.ellipse([52, 104, 66, 118], outline=B, width=2)
    for k, x in enumerate((52, 58, 64)):
        d.line([(x, 116), (x - 3 + 3 * k, 132)], fill=B, width=2)
        d.rectangle([x - 6 + 3 * k, 130, x - 1 + 3 * k, 134], fill=B)
        d.point([(x - 4 + 3 * k, 132)], fill=N)
    # le grand registre ouvert, et sa plume
    d.polygon([(104, 92), (120, 98), (122, 88)], fill=V)
    d.polygon([(110, 92), (132, 82), (154, 92), (132, 104)], fill=B, outline=N)
    d.line([(132, 82), (132, 104)], fill=N)
    for k in range(4):
        d.line([(116 + 2 * k, 92 - 2 * k + 3), (128, 87 - 2 * k + 3)], fill=N)
        d.line([(136, 87 - 2 * k + 3), (148, 92 - 2 * k + 3)], fill=N)
    d.line([(150, 70), (140, 92)], fill=B)
    d.polygon([(150, 70), (158, 60), (154, 74)], fill=B)
    etincelle(d, 28, 34, 3); etincelle(d, 150, 40, 2)
    sol(d, 30, 150, 163)
    return im


def wissam():
    """Wissam le Sage : assis en tailleur sur un tapis, turban, barbe courte, le doigt levé du conseil, une théière qui fume."""
    im, d = toile()
    # le tapis à franges
    d.polygon([(22, 150), (154, 150), (162, 162), (14, 162)], fill=B)
    for x in range(26, 152, 10):
        d.polygon([(x, 152), (x + 5, 157), (x, 161), (x - 5, 157)], fill=V)
    for x in range(14, 164, 4):
        d.line([(x, 162), (x, 166)], fill=B)
    # les jambes croisées
    d.ellipse([40, 124, 136, 154], fill=V, outline=N)
    pli(d, [(56, 140), (88, 132), (120, 140)])
    pli(d, [(70, 150), (88, 144), (106, 150)])
    for x in (46, 116):
        d.polygon([(x, 140), (x + 14, 136), (x + 16, 146), (x + 2, 148)], fill=B, outline=N)
    # le corps, en tunique, avec un gilet
    d.polygon([(62, 80), (114, 80), (124, 132), (52, 132)], fill=B, outline=N)
    d.polygon([(62, 80), (80, 80), (84, 132), (52, 132)], fill=V, outline=N)
    d.polygon([(96, 80), (114, 80), (124, 132), (92, 132)], fill=V, outline=N)
    tramer(d, 58, 100, 80, 130, c=N, pas=3, test=dans_polygone([(62, 80), (80, 80), (84, 132), (52, 132)]))
    tramer(d, 96, 100, 120, 130, c=N, pas=3, test=dans_polygone([(96, 80), (114, 80), (124, 132), (92, 132)]))
    for y in (96, 106, 116):
        d.ellipse([86, y, 90, y + 4], fill=B)
    # le visage, la barbe courte, le sourire tranquille
    d.ellipse([72, 40, 104, 76], fill=B)
    yeux(d, 88, 56, ecart=7, sourcils=-1)
    d.line([(88, 59), (86, 64), (89, 64)], fill=N)
    d.polygon([(72, 62), (76, 74), (88, 80), (100, 74), (104, 62), (98, 70), (88, 72), (78, 70)], fill=V)
    d.arc([82, 64, 94, 70], 20, 160, fill=N)
    # le turban, enroulé
    d.ellipse([68, 26, 108, 52], fill=B, outline=N)
    for k in range(3):
        d.arc([68, 26 + 4 * k, 108, 50 + 4 * k], 200, 330, fill=N)
    d.ellipse([84, 30, 92, 38], fill=V, outline=N)
    # le doigt levé du conseil, et l'étincelle d'une idée
    d.polygon([(110, 86), (124, 72), (130, 76), (118, 92)], fill=V, outline=N)
    d.ellipse([124, 62, 134, 74], fill=B, outline=N)
    d.line([(129, 62), (129, 50)], fill=B, width=3)
    etincelle(d, 136, 42, 4); etincelle(d, 146, 54, 2)
    # l'autre main posée sur le genou
    d.ellipse([54, 116, 66, 128], fill=B, outline=N)
    # la théière et ses deux verres, la vapeur qui monte
    d.ellipse([16, 124, 40, 146], fill=B, outline=N)
    d.polygon([(38, 132), (52, 122), (50, 128), (40, 140)], fill=B, outline=N)
    d.arc([10, 128, 22, 142], 90, 270, fill=B, width=2)
    d.polygon([(22, 124), (28, 114), (34, 124)], fill=B, outline=N)
    d.rectangle([20, 132, 36, 135], fill=V)
    for x in (140, 150):
        d.polygon([(x, 136), (x + 7, 136), (x + 6, 148), (x + 1, 148)], fill=B, outline=N)
        d.rectangle([x + 1, 140, x + 6, 147], fill=V)
    for k in range(3):
        d.arc([22 + 3 * k, 92 - 7 * k, 32 + 3 * k, 110 - 7 * k], 260, 100, fill=B)
    return im


def jeanbaptiste():
    """Jean-Baptiste, le Maître des Adresses, fils de l'Oracle : cape de voyageur, casquette, l'oeil de l'Oracle en pendentif,
    un compas de cartographe et un grand plan de rue déroulé, aux maisons numérotées."""
    im, d = toile()
    # la cape de voyageur
    d.polygon([(64, 80), (112, 80), (124, 156), (52, 156)], fill=V)
    tramer(d, 54, 120, 122, 154, c=N, pas=3, test=dans_polygone([(64, 80), (112, 80), (124, 156), (52, 156)]))
    pli(d, [(72, 92), (62, 154)]); pli(d, [(104, 92), (114, 154)])
    d.polygon([(76, 78), (88, 96), (100, 78)], fill=B)
    d.line([(80, 78), (88, 90), (96, 78)], fill=N)
    d.ellipse([82, 92, 94, 104], fill=B, outline=N)                   # l'oeil de l'Oracle
    d.ellipse([85, 95, 91, 101], fill=V)
    d.point((88, 98), fill=N)
    # le visage, attentif, un oeil plissé de cartographe
    d.ellipse([72, 38, 104, 76], fill=B)
    yeux(d, 88, 56, ecart=7, regard=1, sourcils=1)
    d.line([(88, 59), (86, 65), (89, 65)], fill=N)
    d.line([(82, 69), (94, 68)], fill=N)
    d.point([(95, 67)], fill=N)
    d.polygon([(70, 52), (74, 72), (76, 52)], fill=V)                # les pattes
    d.polygon([(106, 52), (102, 72), (100, 52)], fill=V)
    # la casquette de cartographe, visière en avant
    d.chord([68, 26, 108, 56], 180, 360, fill=V)
    d.polygon([(68, 42), (50, 46), (52, 48), (70, 46)], fill=V, outline=N)
    pli(d, [(88, 27), (88, 40)])
    d.rectangle([68, 40, 108, 44], fill=N)
    d.ellipse([85, 23, 91, 29], fill=B)
    # le plan de la rue, déroulé à deux mains : la rue, ses maisons, le crieur au bout
    d.rectangle([22, 110, 154, 146], fill=B, outline=N, width=2)
    d.ellipse([14, 106, 30, 150], fill=B, outline=N, width=2); d.arc([18, 112, 26, 144], 90, 270, fill=N)
    d.ellipse([146, 106, 162, 150], fill=B, outline=N, width=2); d.arc([150, 112, 158, 144], 270, 90, fill=N)
    d.rectangle([30, 125, 146, 131], fill=V)
    for k, x in enumerate(range(34, 140, 13)):
        for y in (115, 135):
            d.polygon([(x, y + 6), (x + 4, y), (x + 8, y + 6)], outline=N)
            d.rectangle([x + 1, y + 6, x + 7, y + 10], outline=N)
    d.rectangle([138, 112, 146, 122], fill=V)                       # le crieur, au bout de la rue
    d.ellipse([28, 98, 42, 112], fill=B, outline=N); d.ellipse([134, 98, 148, 112], fill=B, outline=N)
    # le compas glissé à la ceinture
    d.line([(112, 84), (122, 104)], fill=B, width=2); d.line([(112, 84), (106, 104)], fill=B, width=2)
    d.ellipse([109, 81, 115, 87], fill=B)
    etincelle(d, 140, 30, 3); etincelle(d, 30, 44, 2); etincelle(d, 150, 70, 2)
    return im


def gabriel():
    """Gabriel, le Maître des Composants : lunettes de protection relevées, barbe de trois jours, tablier à outils,
    une barrette de mémoire levée d'une main, un processeur de l'autre."""
    im, d = toile()
    corps = [(62, 80), (114, 80), (124, 160), (52, 160)]
    d.polygon(corps, fill=V)
    pli(d, [(66, 100), (58, 158)]); pli(d, [(110, 100), (118, 158)])
    d.polygon([(72, 90), (104, 90), (108, 156), (68, 156)], fill=B, outline=N)        # le tablier
    d.line([(72, 90), (66, 80)], fill=B, width=2); d.line([(104, 90), (110, 80)], fill=B, width=2)
    d.rectangle([74, 118, 102, 136], outline=N, width=2)                              # la poche à outils
    d.line([(80, 114), (80, 132)], fill=N, width=2)                                    # le tournevis
    d.polygon([(78, 112), (82, 112), (80, 108)], fill=N)
    d.line([(88, 110), (88, 132)], fill=N, width=2); d.ellipse([85, 106, 91, 112], outline=N)   # la clé
    d.line([(96, 116), (96, 132)], fill=N, width=3)                                    # le fer à souder
    d.line([(96, 112), (96, 116)], fill=N)
    tramer(d, 70, 140, 106, 154, c=N, pas=4)
    # le visage, réjoui, barbe de trois jours
    d.ellipse([72, 38, 104, 76], fill=B)
    yeux(d, 88, 57, ecart=7, sourcils=-1)
    d.line([(88, 60), (86, 65), (89, 65)], fill=N)
    d.chord([80, 64, 96, 74], 0, 180, fill=N)
    d.rectangle([83, 67, 93, 68], fill=B)
    tramer(d, 74, 64, 102, 76, c=V, pas=3, test=lambda x, y: (x - 88) ** 2 / 196 + (y - 57) ** 2 / 324 <= 1 and not (80 <= x <= 96 and 63 <= y <= 74))
    # les cheveux en bataille et les lunettes de protection relevées sur le front
    d.chord([70, 28, 106, 58], 180, 360, fill=V)
    for x in range(72, 106, 5):
        d.polygon([(x, 34), (x + 2, 24), (x + 4, 34)], fill=V)
    d.rectangle([68, 38, 108, 44], fill=N)
    d.ellipse([71, 34, 87, 48], fill=B, outline=N); d.ellipse([89, 34, 105, 48], fill=B, outline=N)
    d.ellipse([75, 37, 83, 45], fill=V); d.ellipse([93, 37, 101, 45], fill=V)
    d.point([(76, 38), (94, 38)], fill=B)
    # la barrette de mémoire, levée
    d.polygon([(62, 86), (48, 72), (54, 66), (68, 80)], fill=V, outline=N)
    d.rectangle([14, 44, 64, 60], fill=V, outline=B)
    for x in range(18, 62, 11):
        d.rectangle([x, 47, x + 7, 55], fill=N)
        d.point([(x + 2, 49)], fill=B)
    for x in range(16, 64, 3):
        d.line([(x, 60), (x, 64)], fill=B)
    d.rectangle([37, 58, 40, 64], fill=N)                                               # l'encoche
    d.ellipse([46, 58, 58, 70], fill=B, outline=N)
    # le processeur, dans l'autre main
    d.polygon([(114, 86), (130, 98), (124, 104), (110, 94)], fill=V, outline=N)
    d.rectangle([126, 80, 156, 110], fill=B, outline=N)
    d.rectangle([133, 87, 149, 103], fill=V)
    d.rectangle([137, 91, 145, 99], fill=N)
    d.point([(128, 82)], fill=N)
    for k in range(6):
        for (x0, y0, x1, y1) in ((128 + 5 * k, 76, 128 + 5 * k, 80), (128 + 5 * k, 110, 128 + 5 * k, 114),
                                 (122, 82 + 5 * k, 126, 82 + 5 * k), (156, 82 + 5 * k, 160, 82 + 5 * k)):
            d.line([(x0, y0), (x1, y1)], fill=B)
    d.ellipse([120, 94, 132, 106], fill=B, outline=N)
    etincelle(d, 162, 66, 3); etincelle(d, 12, 30, 3); etincelle(d, 30, 76, 2)
    sol(d, 34, 146, 163)
    return im


def timour():
    """Cheb Timour, l'assistant de Gabriel : cheveux en brosse, sourire de chanteur, tablier de cuisine,
    un grand tajine fumant tenu à deux mains, et une lanterne étoilée au mur."""
    im, d = toile()
    corps = [(64, 80), (112, 80), (122, 160), (54, 160)]
    d.polygon(corps, fill=V)
    pli(d, [(68, 100), (60, 158)]); pli(d, [(108, 100), (116, 158)])
    d.polygon([(74, 88), (102, 88), (106, 158), (70, 158)], fill=B, outline=N)        # le tablier
    d.line([(74, 88), (68, 80)], fill=B, width=2); d.line([(102, 88), (108, 80)], fill=B, width=2)
    for y in range(140, 158, 6):
        for x in range(74 + (y // 6 % 2) * 3, 104, 6):
            d.point((x, y), fill=V)                                                     # les taches de sauce
    # le visage, et le grand sourire du chanteur
    d.ellipse([72, 36, 104, 74], fill=B)
    yeux(d, 88, 53, ecart=7, sourcils=-1)
    d.line([(88, 56), (86, 61), (89, 61)], fill=N)
    d.chord([78, 60, 98, 72], 0, 180, fill=N)
    d.rectangle([81, 63, 95, 65], fill=B)
    d.chord([84, 66, 92, 72], 0, 180, fill=V)
    d.point([(76, 63), (100, 63)], fill=V)
    d.ellipse([69, 50, 75, 60], fill=B, outline=N); d.ellipse([101, 50, 107, 60], fill=B, outline=N)
    # les cheveux en brosse, bien coiffés
    d.chord([70, 26, 106, 54], 180, 360, fill=V)
    for x in range(72, 106, 3):
        d.line([(x, 32), (x + 1, 24)], fill=V)
    d.line([(72, 40), (104, 40)], fill=N)
    # le tajine : le plat, le couvercle conique décoré, tenu à deux mains
    d.ellipse([42, 126, 134, 146], fill=V, outline=B)
    d.ellipse([48, 128, 128, 140], fill=N)
    d.polygon([(56, 134), (88, 88), (120, 134)], fill=B, outline=N)
    for k, y in enumerate((126, 116, 106)):
        w = 28 - 8 * k
        d.line([(88 - w, y), (88 + w, y)], fill=V)
        for x in range(88 - w + 3, 88 + w, 6):
            d.polygon([(x, y - 3), (x + 2, y), (x, y + 3), (x - 2, y)], fill=V)
    d.ellipse([83, 82, 93, 92], fill=V, outline=B)
    d.ellipse([34, 126, 48, 140], fill=B, outline=N); d.ellipse([128, 126, 142, 140], fill=B, outline=N)
    for k in range(3):
        d.arc([110 + 6 * k, 66 - 8 * k, 122 + 6 * k, 84 - 8 * k], 250, 90, fill=B)   # la vapeur
    # la lanterne étoilée, au mur
    d.line([(150, 0), (150, 16)], fill=B)
    d.polygon([(142, 16), (158, 16), (162, 30), (154, 44), (146, 44), (138, 30)], fill=N, outline=B)
    d.polygon([(150, 20), (153, 27), (160, 27), (154, 31), (156, 38), (150, 34), (144, 38), (146, 31), (140, 27), (147, 27)], fill=V)
    for x, y in ((136, 50), (164, 48), (132, 30)):
        d.point((x, y), fill=B)
    etincelle(d, 20, 40, 2)
    sol(d, 30, 150, 163)
    return im


def steve():
    """Steve, le présentateur de Questions pour un Linux : costume à paillettes, noeud papillon, cheveux gominés,
    grand sourire de plateau, micro doré dans une main, fiches de questions dans l'autre."""
    im, d = toile()
    # la veste à paillettes et le pantalon
    veste = [(62, 80), (114, 80), (122, 140), (54, 140)]
    d.polygon(veste, fill=V)
    test = dans_polygone(veste)
    pois(d, (56, 84, 120, 138), 26, 31, motif=lambda d, x, y: d.point((x, y), fill=B), dans=test)
    d.polygon([(76, 80), (88, 104), (100, 80)], fill=B)                           # la chemise
    d.polygon([(66, 80), (80, 80), (88, 104), (80, 120)], fill=N)                 # les revers
    d.polygon([(110, 80), (96, 80), (88, 104), (96, 120)], fill=N)
    d.line([(66, 80), (80, 120)], fill=B); d.line([(110, 80), (96, 120)], fill=B)
    d.polygon([(80, 82), (88, 86), (96, 82), (96, 92), (88, 88), (80, 92)], fill=N)   # le noeud papillon
    d.ellipse([86, 85, 90, 89], fill=V)
    for y in (106, 116, 126):
        d.ellipse([86, y, 90, y + 4], fill=B)
    d.rectangle([62, 140, 84, 158], fill=N, outline=B); d.rectangle([92, 140, 114, 158], fill=N, outline=B)
    d.polygon([(58, 156), (84, 156), (86, 162), (56, 162)], fill=B)
    d.polygon([(92, 156), (118, 156), (120, 162), (90, 162)], fill=B)
    # le visage et le sourire de plateau
    d.ellipse([72, 36, 104, 74], fill=B)
    yeux(d, 88, 54, ecart=7, sourcils=-1)
    d.line([(88, 57), (86, 62), (89, 62)], fill=N)
    d.chord([77, 60, 99, 72], 0, 180, fill=N)
    d.rectangle([80, 63, 96, 66], fill=B)
    d.line([(84, 63), (84, 66)], fill=N); d.line([(88, 63), (88, 66)], fill=N); d.line([(92, 63), (92, 66)], fill=N)
    d.ellipse([68, 48, 74, 58], fill=B, outline=N); d.ellipse([102, 48, 108, 58], fill=B, outline=N)
    # les cheveux gominés, la mèche brillante
    d.chord([71, 32, 105, 52], 180, 360, fill=V)
    d.polygon([(72, 42), (74, 32), (82, 24), (96, 20), (106, 26), (100, 28), (92, 30), (84, 34), (78, 44)], fill=V)
    d.line([(84, 28), (96, 23)], fill=B)
    d.point([(80, 32), (98, 25)], fill=B)
    # le micro doré, levé
    d.polygon([(110, 84), (124, 70), (130, 74), (118, 90)], fill=V, outline=N)
    d.ellipse([124, 64, 136, 76], fill=B, outline=N)
    d.line([(132, 66), (142, 50)], fill=B, width=3)
    d.ellipse([136, 38, 150, 52], fill=B, outline=N)
    tramer(d, 138, 40, 148, 50, c=N, pas=2)
    for k in range(3):
        d.arc([148 + 4 * k, 32 - 4 * k, 156 + 4 * k, 48 - 4 * k], 300, 60, fill=B)
    # les fiches de questions, dans l'autre main
    d.polygon([(66, 84), (50, 102), (56, 108), (70, 94)], fill=V, outline=N)
    d.polygon([(30, 96), (52, 92), (56, 116), (34, 120)], fill=B, outline=N)
    for k in range(4):
        d.line([(35, 101 + 4 * k), (51, 98 + 4 * k)], fill=N)
    d.text((38, 104), "?", fill=V)
    d.ellipse([46, 104, 58, 116], fill=B, outline=N)
    # les projecteurs du plateau
    for x in (14, 162):
        d.polygon([(x - 6, 0), (x + 6, 0), (x + 3, 10), (x - 3, 10)], fill=B)
        tramer(d, x - 12, 12, x + 12, 40, c=V, pas=4)
    etincelle(d, 24, 70, 3); etincelle(d, 158, 96, 2)
    sol(d, 30, 150, 164)
    return im


def florimond():
    """Florimond, le barde de la Taverne : chapeau à large bord et longue plume, boucles, bouche ouverte qui chante,
    pourpoint à crevés, cape, un luth en travers, et des notes qui s'envolent."""
    im, d = toile()
    # la cape, derrière
    cape = [(52, 78), (124, 78), (136, 158), (40, 158)]
    d.polygon(cape, fill=V)
    tramer(d, 40, 120, 136, 158, c=N, pas=3, test=dans_polygone(cape))
    for pts in ([(56, 90), (46, 156)], [(120, 90), (130, 156)]):
        pli(d, pts)
    # les jambes en collants rayés et les bottes à revers
    for x in (72, 94):
        d.rectangle([x, 124, x + 10, 150], fill=B)
        for y in range(126, 150, 4):
            d.line([(x, y), (x + 10, y)], fill=V)
        d.polygon([(x - 2, 148), (x + 12, 148), (x + 16, 160), (x - 2, 160)], fill=N, outline=B)
        d.rectangle([x - 2, 146, x + 12, 149], fill=B)
    # le pourpoint à crevés
    pour = [(64, 78), (112, 78), (116, 126), (60, 126)]
    d.polygon(pour, fill=B, outline=N)
    for x in (70, 80, 90, 100, 108):
        d.line([(x, 82), (x - 1, 124)], fill=V, width=3)
    d.rectangle([60, 112, 116, 117], fill=N)
    d.rectangle([84, 111, 92, 118], fill=B, outline=N)
    # le col en dentelle
    for k in range(7):
        d.ellipse([66 + 6 * k, 72, 74 + 6 * k, 80], fill=B, outline=N)
    # le visage qui chante
    d.ellipse([72, 36, 104, 72], fill=B)
    yeux(d, 88, 51, ecart=7, sourcils=-1)
    d.line([(88, 54), (86, 59), (89, 59)], fill=N)
    d.ellipse([83, 61, 93, 69], fill=N)
    d.chord([84, 64, 92, 70], 0, 180, fill=V)
    d.point([(77, 60), (99, 60)], fill=V)
    # les boucles
    for x, y in ((68, 46), (66, 56), (70, 64), (106, 46), (108, 56), (104, 64)):
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=V, outline=N)
        d.arc([x - 3, y - 3, x + 3, y + 3], 0, 270, fill=N)
    # le chapeau à large bord et sa plume
    d.ellipse([58, 32, 118, 44], fill=V, outline=N)
    d.chord([70, 16, 106, 48], 180, 360, fill=V, outline=N)
    d.rectangle([71, 30, 105, 34], fill=B)
    plume = [(100, 30), (126, 6), (140, 2), (128, 14), (106, 32)]
    d.polygon(plume, fill=B, outline=N)
    for k in range(5):
        d.line([(106 + 6 * k, 28 - 5 * k), (110 + 6 * k, 22 - 5 * k)], fill=N)
    # le luth, en travers, et la main qui gratte
    d.ellipse([86, 88, 126, 124], fill=V, outline=N)
    d.ellipse([90, 92, 122, 120], outline=N)
    d.ellipse([102, 100, 112, 110], fill=N)
    d.polygon([(110, 98), (148, 66), (152, 70), (116, 104)], fill=B, outline=N)
    d.polygon([(146, 62), (158, 52), (162, 58), (152, 70)], fill=V, outline=N)
    for k in range(3):
        d.point([(152 + 3 * k, 56 + 2 * k)], fill=B)
    for k in range(3):
        d.line([(100 + k * 2, 112 - k * 2), (148 + k, 68 + k)], fill=N)
    d.ellipse([64, 96, 76, 108], fill=B, outline=N)
    d.line([(76, 102), (98, 106)], fill=N)
    d.ellipse([94, 106, 104, 114], fill=B, outline=N)
    # les notes qui s'envolent
    for x, y in ((26, 40), (40, 24), (150, 92), (24, 74)):
        d.ellipse([x, y + 8, x + 6, y + 13], fill=B)
        d.line([(x + 6, y), (x + 6, y + 10)], fill=B)
        d.line([(x + 6, y), (x + 11, y + 3)], fill=B)
    etincelle(d, 150, 120, 2); etincelle(d, 30, 110, 3)
    sol(d, 30, 150, 163)
    return im


DESSINS = {"item_myriam.gif": myriam, "item_dylan.gif": dylan, "item_elfe.gif": aidan, "item_rouxblanc.gif": rouxblanc, "item_david.gif": david, "item_laurana.gif": laurana,
    "item_manon.gif": manon, "item_wissam.gif": wissam, "item_jeanbaptiste.gif": jeanbaptiste, "item_gabriel.gif": gabriel, "item_timour.gif": timour, "item_steve.gif": steve, "item_florimond.gif": florimond}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "portraits")
