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

def steve():
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


DESSINS = {"item_myriam.gif": myriam, "item_dylan.gif": dylan, "item_elfe.gif": steve, "item_rouxblanc.gif": rouxblanc, "item_david.gif": david}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "portraits")
