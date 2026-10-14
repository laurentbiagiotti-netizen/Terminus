"""Les lieux de la Forteresse (l'épreuve finale), dans le style des lieux du chapitre 1 et des chapitres 2 et 3 :
une pièce en perspective (mur du fond, sol vert, arêtes blanches), de grands objets pleins, des détails au pixel près.

Usage : python3 outils/dessiner_forteresse.py [nom...]   (OUT=dossier pour un aperçu ailleurs)
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import finir, toile, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import piece, tramer, briques, arche, torche, flamme, etoiles, lune, livres, etagere  # noqa: E402


def fenetre(d, x0, y0, x1, y1, nuit=True):
    arche(d, x0, y0, x1, y1, fill=N, outline=B)
    if nuit:
        r = (x1 - x0) // 2
        for k, (dx, dy) in enumerate(((4, 10), (10, 18), (r + 3, 8), (r + 6, 22))):
            d.point((x0 + dx, y0 + dy), fill=B)
    d.line([((x0 + x1) // 2, y0 + 2), ((x0 + x1) // 2, y1)], fill=B)


def quartiers():
    """Les quartiers de la recrue : un lit de camp, une lampe à huile, un coffre, une lucarne étoilée,
    et l'ordre de mission glissé sous la porte."""
    im, d = toile()
    piece(d, 34, 22, 142, 112)
    briques(d, 36, 24, 140, 110, h=7, w=16, fond=N, joint=V)
    fenetre(d, 100, 32, 126, 70)
    # la porte, à gauche, et la lettre glissée dessous
    d.rectangle([44, 50, 72, 112], fill=B)
    d.rectangle([47, 53, 69, 112], fill=N)
    for y in (64, 84, 100):
        d.line([(47, y), (69, y)], fill=V)
    d.ellipse([63, 80, 67, 84], fill=B)
    d.polygon([(52, 116), (74, 113), (78, 120), (56, 123)], fill=B, outline=N)
    d.line([(56, 117), (72, 115)], fill=N)
    d.ellipse([70, 116, 75, 121], fill=V)
    # le lit de camp, en perspective
    d.polygon([(84, 108), (150, 108), (168, 138), (98, 138)], fill=B)
    d.polygon([(86, 106), (148, 106), (152, 112), (90, 112)], fill=V)
    d.ellipse([132, 102, 154, 114], fill=B, outline=N)
    for x in range(104, 160, 12):
        d.line([(x, 124), (x + 4, 136)], fill=N)
    d.line([(98, 138), (98, 150)], fill=B, width=2); d.line([(166, 138), (166, 150)], fill=B, width=2)
    d.line([(86, 112), (86, 126)], fill=B, width=2)
    # le coffre et la lampe à huile posée dessus
    d.rectangle([10, 120, 44, 146], fill=V, outline=B)
    d.chord([10, 112, 44, 128], 180, 360, fill=V, outline=B)
    d.line([(10, 128), (44, 128)], fill=N)
    d.rectangle([24, 126, 30, 134], fill=B)
    d.ellipse([18, 104, 36, 114], fill=B)
    d.polygon([(32, 108), (40, 104), (38, 108)], fill=B)
    flamme(d, 40, 104, 10)
    d.arc([12, 96, 42, 120], 200, 340, fill=V)
    return im


def couloir():
    """Le couloir des quartiers (/home) : des portes de chaque côté, des torches, un long tapis, et la théière de Wissam."""
    im, d = toile()
    piece(d, 66, 40, 110, 96)
    arche(d, 76, 50, 100, 96, fill=N)
    # les murs latéraux et leurs portes en perspective
    for cote in (-1, 1):
        for k, (xa, xb) in enumerate(((8, 30), (36, 52))):
            if cote < 0:
                x0, x1 = xa, xb
            else:
                x0, x1 = W - xb, W - xa
            ya = 40 + (k * 18 if cote < 0 else k * 18)
            haut0, haut1 = (30 + k * 14, 44 + k * 10)
            bas0, bas1 = (150 - k * 14, 130 - k * 10)
            if cote < 0:
                pts = [(x0, haut0), (x1, haut1), (x1, bas1), (x0, bas0)]
            else:
                pts = [(x1, haut0), (x0, haut1), (x0, bas1), (x1, bas0)]
            d.polygon(pts, fill=B)
            interieur = [(p[0] + (2 if i in (0, 3) else -2) * (1 if cote < 0 else -1), p[1] + (2 if i < 2 else -2)) for i, p in enumerate(pts)]
            d.polygon(interieur, fill=N)
            mx = (pts[0][0] + pts[1][0]) // 2
            d.ellipse([mx - 2, (haut0 + bas0) // 2, mx + 2, (haut0 + bas0) // 2 + 4], fill=V)
    torche(d, 58, 50); torche(d, 118, 50)
    # le long tapis
    d.polygon([(76, 100), (100, 100), (124, 168), (52, 168)], fill=B)
    d.polygon([(80, 104), (96, 104), (114, 166), (62, 166)], fill=V)
    for y in range(110, 166, 12):
        cx = 88
        w = 6 + (y - 104) // 6
        d.polygon([(cx - w, y), (cx, y - 4), (cx + w, y), (cx, y + 4)], fill=B)
    # la théière de Wissam, au bord du tapis
    d.ellipse([124, 134, 142, 150], fill=B, outline=N)
    d.polygon([(140, 140), (150, 132), (148, 136), (142, 146)], fill=B)
    d.polygon([(130, 134), (133, 126), (136, 134)], fill=B)
    for k in range(2):
        d.arc([128 + 3 * k, 108 - 6 * k, 136 + 3 * k, 124 - 6 * k], 260, 100, fill=B)
    return im


def proclamations():
    """La Tour des Proclamations (/var/www) : une grande baie ouverte sur la ville endormie, un pupitre et son parchemin,
    les bannières de Cybersup, et un socle vide où se tenait le héraut."""
    im, d = toile()
    piece(d, 30, 16, 146, 108)
    briques(d, 32, 18, 144, 106, h=7, w=16, fond=N, joint=V)
    # la grande baie, et la ville dehors
    arche(d, 62, 22, 114, 104, fill=N, outline=B, ep=3)
    etoiles(d, n=10, graine=21, ymax=60)
    lune(d, 100, 40, 6)
    for k, (x, h) in enumerate(((68, 24), (76, 34), (84, 18), (92, 40), (100, 26), (106, 30))):
        d.rectangle([x, 104 - h, x + 7, 103], fill=V)
        for y in range(104 - h + 4, 100, 6):
            d.point([(x + 2, y), (x + 5, y)], fill=B if (x + y) % 3 else N)
    d.rectangle([62, 96, 114, 104], fill=B)
    for x in range(64, 114, 6):
        d.rectangle([x, 92, x + 2, 96], fill=B)
    # les deux bannières
    for x in (38, 124):
        d.line([(x, 20), (x + 14, 20)], fill=B, width=2)
        d.polygon([(x + 1, 22), (x + 13, 22), (x + 13, 70), (x + 7, 62), (x + 1, 70)], fill=V)
        d.ellipse([x + 3, 32, x + 11, 40], fill=B)
        d.polygon([(x + 7, 44), (x + 4, 54), (x + 10, 54)], fill=B)
    # le pupitre et sa proclamation
    d.polygon([(18, 120), (54, 112), (58, 118), (22, 128)], fill=B)
    d.rectangle([34, 124, 42, 154], fill=B)
    d.rectangle([26, 152, 50, 156], fill=B)
    d.polygon([(24, 118), (50, 112), (52, 116), (26, 122)], fill=N)
    for k in range(3):
        d.line([(28, 118 - k * 1 + 0), (46, 114 - k * 1)], fill=V)
    # le socle du héraut, et la trompette d'argent posée au pied
    d.rectangle([120, 126, 156, 134], fill=B)
    d.rectangle([124, 134, 152, 156], fill=B)
    d.rectangle([128, 138, 148, 152], outline=N)
    d.line([(132, 145), (144, 145)], fill=N)
    d.line([(100, 152), (122, 146)], fill=B, width=2)
    d.polygon([(120, 142), (130, 140), (128, 152)], fill=B)
    return im


def atelier():
    """L'Atelier des Composants (/opt/atelier) : un établi couvert de barrettes et de processeurs, des outils au mur,
    une carte mère épinglée, et le petit réchaud où mijote le tajine de Timour."""
    im, d = toile()
    piece(d, 26, 18, 150, 100)
    # le panneau à outils au mur
    d.rectangle([32, 26, 92, 70], fill=N, outline=B)
    for x in range(36, 90, 6):
        for y in range(30, 68, 6):
            d.point((x, y), fill=V)
    d.line([(40, 32), (40, 60)], fill=B, width=2); d.polygon([(37, 32), (43, 32), (40, 28)], fill=B)
    d.line([(52, 32), (52, 58)], fill=B, width=3); d.rectangle([49, 58, 55, 64], fill=B)
    d.ellipse([60, 32, 72, 44], outline=B, width=2); d.line([(66, 44), (66, 62)], fill=B, width=2)
    d.line([(78, 34), (86, 62)], fill=B, width=2); d.line([(86, 34), (78, 62)], fill=B, width=2)
    # la carte mère épinglée
    d.rectangle([100, 26, 144, 70], fill=V, outline=B)
    d.rectangle([106, 32, 120, 46], fill=B); d.rectangle([109, 35, 117, 43], fill=N)
    for y in (52, 56, 60):
        d.line([(106, y), (140, y)], fill=B)
    for x in range(124, 142, 4):
        d.rectangle([x, 32, x + 2, 46], fill=N)
    d.point([(102, 28), (142, 28), (102, 68), (142, 68)], fill=N)
    # l'établi
    d.rectangle([10, 106, 120, 112], fill=B)
    d.rectangle([14, 112, 18, 150], fill=B); d.rectangle([112, 112, 116, 150], fill=B)
    d.line([(18, 140), (112, 140)], fill=B)
    for k, x in enumerate(range(16, 70, 14)):
        d.rectangle([x, 96, x + 11, 104], fill=V, outline=B)
        for j in range(3):
            d.point((x + 2 + 3 * j, 99), fill=N)
    d.rectangle([76, 92, 92, 104], fill=B); d.rectangle([80, 95, 88, 101], fill=V)
    for k in range(4):
        d.point([(78 + 4 * k, 90), (78 + 4 * k, 106)], fill=B)
    d.rectangle([96, 98, 114, 104], fill=N, outline=B)
    d.line([(100, 98), (110, 92)], fill=B, width=2)
    # le réchaud et le tajine qui mijote
    d.rectangle([126, 118, 160, 150], fill=B)
    d.rectangle([130, 122, 156, 146], fill=N)
    for x in range(132, 156, 6):
        flamme(d, x + 2, 122, 5)
    d.ellipse([124, 108, 162, 118], fill=V, outline=B)
    d.polygon([(130, 112), (143, 84), (156, 112)], fill=B, outline=N)
    d.line([(135, 104), (151, 104)], fill=V); d.line([(138, 96), (148, 96)], fill=V)
    d.ellipse([140, 80, 146, 86], fill=V)
    for k in range(3):
        d.arc([144 + 4 * k, 54 - 7 * k, 152 + 4 * k, 72 - 7 * k], 250, 90, fill=B)
    return im


def gardiens():
    """Les gardiens (/opt/gardiens) : quatre statues dans leurs niches ; l'une a les yeux qui brillent de vert."""
    im, d = toile()
    piece(d, 20, 20, 156, 116)
    briques(d, 22, 22, 154, 114, h=7, w=16, fond=N, joint=V)
    for k, x in enumerate((26, 60, 94, 128)):
        arche(d, x, 32, x + 24, 112, fill=N, outline=B)
        cx = x + 12
        d.ellipse([cx - 6, 52, cx + 6, 64], fill=B)                    # la tête
        d.polygon([(cx - 8, 66), (cx + 8, 66), (cx + 10, 108), (cx - 10, 108)], fill=B)
        d.line([(cx, 68), (cx, 106)], fill=N)
        d.line([(cx - 8, 78), (cx + 8, 78)], fill=N)
        d.rectangle([cx - 11, 104, cx + 11, 110], fill=B)
        ensorcele = (k == 1)
        if ensorcele:
            d.rectangle([cx - 4, 56, cx - 2, 58], fill=V); d.rectangle([cx + 2, 56, cx + 4, 58], fill=V)
            for a in range(0, 360, 60):
                r = math.radians(a)
                d.point((cx + round(13 * math.cos(r)), 58 + round(13 * math.sin(r))), fill=V)
        else:
            d.point([(cx - 3, 57), (cx + 3, 57)], fill=N)
        d.line([(cx + 8, 70), (cx + 8, 102)], fill=B, width=2)           # la lance
        d.polygon([(cx + 6, 70), (cx + 10, 70), (cx + 8, 64)], fill=B)
    # la liste des empreintes, clouée au sol
    d.polygon([(64, 132), (112, 132), (118, 152), (58, 152)], fill=B)
    for y in (137, 142, 147):
        d.line([(66, y), (110, y)], fill=N)
    return im


def horloge():
    """Les tâches planifiées (/etc/cron.d) : une grande horloge à engrenages, ses cinq aiguilles (minute, heure, jour, mois,
    jour de la semaine), et un sablier qui ne se vide jamais."""
    im, d = toile()
    piece(d, 28, 16, 148, 108)
    # l'horloge
    cx, cy, r = 88, 60, 36
    d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=B)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=N)
    for k in range(12):
        a = math.radians(k * 30 - 90)
        x1, y1 = cx + round((r - 3) * math.cos(a)), cy + round((r - 3) * math.sin(a))
        x2, y2 = cx + round((r - 8) * math.cos(a)), cy + round((r - 8) * math.sin(a))
        d.line([(x1, y1), (x2, y2)], fill=V if k % 3 else B, width=2)
    for k, (ang, long_) in enumerate(((-90, 30), (-30, 22), (40, 18), (150, 14), (220, 10))):
        a = math.radians(ang)
        d.line([(cx, cy), (cx + round(long_ * math.cos(a)), cy + round(long_ * math.sin(a)))], fill=B if k == 0 else V, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=B)
    # les engrenages
    for (gx, gy, gr) in ((38, 36, 9), (136, 40, 11), (130, 88, 8)):
        d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=V, outline=B)
        for k in range(8):
            a = math.radians(k * 45)
            d.rectangle([gx + round((gr + 1) * math.cos(a)) - 1, gy + round((gr + 1) * math.sin(a)) - 1,
                         gx + round((gr + 1) * math.cos(a)) + 1, gy + round((gr + 1) * math.sin(a)) + 1], fill=B)
        d.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=N)
    # le sablier, sur une table basse
    d.rectangle([22, 140, 66, 144], fill=B); d.line([(26, 144), (26, 158)], fill=B, width=2); d.line([(62, 144), (62, 158)], fill=B, width=2)
    d.rectangle([32, 106, 56, 109], fill=B); d.rectangle([32, 137, 56, 140], fill=B)
    d.polygon([(34, 109), (54, 109), (46, 123), (54, 137), (34, 137), (42, 123)], fill=N, outline=B)
    d.polygon([(37, 111), (51, 111), (44, 121)], fill=V)
    d.polygon([(38, 136), (50, 136), (44, 128)], fill=V)
    d.line([(44, 121), (44, 130)], fill=V)
    # le parchemin de la tâche, cloué
    d.rectangle([104, 120, 156, 150], fill=B)
    for y in (126, 132, 138, 144):
        d.line([(108, y), (150, y)], fill=N)
    for x in (110, 118, 126, 134, 142):
        d.rectangle([x, 124, x + 3, 127], fill=V)
    return im


def chambre_myriam():
    """La chambre de Myriam (/home/myriam) : un chaudron qui bouillonne, un grimoire ouvert, son chapeau pendu, des bougies."""
    im, d = toile()
    piece(d, 30, 20, 146, 110)
    briques(d, 32, 22, 144, 108, h=7, w=16, fond=N, joint=V)
    # le chapeau pendu au mur
    d.line([(120, 30), (120, 36)], fill=B, width=2)
    d.ellipse([102, 54, 140, 62], fill=V, outline=B)
    d.polygon([(110, 58), (132, 58), (124, 40), (128, 32), (118, 36)], fill=V, outline=B)
    # les étagères de fioles
    d.line([(40, 44), (90, 44)], fill=B, width=2)
    for k, x in enumerate(range(44, 88, 9)):
        h = 8 + (k * 5) % 7
        d.rectangle([x, 44 - h, x + 5, 43], fill=V if k % 2 else B)
        d.rectangle([x + 1, 44 - h - 3, x + 4, 44 - h], fill=B)
    # le chaudron qui bouillonne
    d.ellipse([52, 110, 112, 150], fill=B)
    d.ellipse([56, 106, 108, 122], fill=V, outline=B)
    for (x, y, r) in ((70, 108, 4), (84, 104, 5), (96, 109, 3)):
        d.ellipse([x - r, y - r, x + r, y + r], outline=B)
    for k in range(3):
        d.arc([70 + 8 * k, 74 - 6 * k, 82 + 8 * k, 100 - 6 * k], 250, 90, fill=V)
    d.line([(60, 150), (54, 160)], fill=B, width=2); d.line([(104, 150), (110, 160)], fill=B, width=2)
    for x in range(64, 104, 8):
        flamme(d, x, 158, 8)
    # le grimoire ouvert sur un lutrin
    d.polygon([(124, 112), (146, 104), (168, 112), (146, 122)], fill=B, outline=N)
    d.line([(146, 104), (146, 122)], fill=N)
    d.rectangle([142, 122, 150, 150], fill=B)
    d.ellipse([132, 108, 140, 114], fill=V)
    # les bougies
    for x in (14, 24):
        d.rectangle([x, 128, x + 5, 150], fill=B)
        flamme(d, x + 2, 127, 8)
    return im


def plateau():
    """Le plateau de Questions pour un Linux (/dev/random) : un grand écran, trois pupitres et leurs buzzers,
    des projecteurs, un public d'ombres au premier rang."""
    im, d = toile()
    piece(d, 22, 14, 154, 104)
    # les projecteurs et leurs faisceaux
    for x in (30, 88, 146):
        d.polygon([(x - 5, 14), (x + 5, 14), (x + 3, 20), (x - 3, 20)], fill=B)
        tramer(d, x - 10, 22, x + 10, 100, c=V, pas=5)
    # le grand écran et son titre
    d.rectangle([40, 20, 136, 62], fill=B)
    d.rectangle([44, 24, 132, 58], fill=N)
    d.text((54, 28), "QUESTIONS", fill=V)
    d.text((60, 38), "POUR UN", fill=B)
    d.text((62, 48), "LINUX", fill=V)
    for k in range(6):
        d.point([(46 + 16 * k, 26), (52 + 16 * k, 56)], fill=B)
    # trois pupitres avec leurs buzzers
    for k, x in enumerate((30, 74, 118)):
        d.polygon([(x, 90), (x + 30, 90), (x + 34, 126), (x - 4, 126)], fill=B)
        d.rectangle([x + 4, 100, x + 26, 118], fill=V if k == 1 else N)
        d.text((x + 11, 104), "ABC"[k], fill=B if k == 1 else V)
        d.chord([x + 9, 82, x + 21, 94], 180, 360, fill=V if k != 1 else B, outline=B)
    # le public, en ombres, au premier rang
    for k, x in enumerate(range(6, 176, 14)):
        d.ellipse([x, 142 + (k % 2) * 3, x + 10, 152 + (k % 2) * 3], fill=N, outline=B)
        d.chord([x - 3, 150 + (k % 2) * 3, x + 13, 172], 180, 360, fill=N, outline=B)
    return im


DESSINS = {"loc_quartiers.gif": quartiers, "loc_couloir.gif": couloir, "loc_proclamations.gif": proclamations,
           "loc_atelier.gif": atelier, "loc_gardiens.gif": gardiens, "loc_horloge.gif": horloge, "loc_chambre_myriam.gif": chambre_myriam, "loc_plateau.gif": plateau}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "lieux")
