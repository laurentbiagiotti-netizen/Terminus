"""Dessine le Bastion (chapitre 5) : le hall, les douze tours, la machine, les douze maîtres, la Pierre d'Inspection
et la Lettre de l'Inspection.

Même style que le chapitre 4 (dessiner_academie.py) : pixel art 1 bit épais (noir, vert, blanc), les pièces en
perspective avec un sol dallé et une bande hachurée, les personnages en pied comme ceux des chapitres 2 à 4
(dessiner_panne.perso : grille 88 x 85, tête carrée, yeux à pupille, sol en tirets).
Usage : python3 outils/dessiner_bastion.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import tramer, briques, arche, creneaux, torche, etoiles, lune  # noqa: E402
from dessiner_academie import salle, texte, robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def cadenas(d, x, y, c=V):
    d.arc([x - 5, y - 9, x + 5, y + 1], 180, 360, fill=B, width=2)
    d.rectangle([x - 7, y - 3, x + 7, y + 8], fill=c)
    d.rectangle([x - 1, y + 1, x + 1, y + 5], fill=N)


def bouclier(d, x, y, l=22, c=V):
    d.polygon([(x - l // 2, y), (x + l // 2, y), (x + l // 2, y + l // 2), (x, y + l), (x - l // 2, y + l // 2)], fill=B)
    d.polygon([(x - l // 2 + 3, y + 3), (x + l // 2 - 3, y + 3), (x + l // 2 - 3, y + l // 2), (x, y + l - 4), (x - l // 2 + 3, y + l // 2)], fill=c)


def murs_de_pierre(d, x0, y0, x1, y1):
    briques(d, x0, y0, x1, y1, h=9, w=20)


# ------------------------------------------------------------------
# Le hall et les douze tours
# ------------------------------------------------------------------

def bastion():
    """Le hall du Bastion : des murs de pierre, une grande herse au fond, la Pierre d'Inspection au centre."""
    im, d = toile()
    salle(d, 26, 14, 150, 104)
    murs_de_pierre(d, 28, 16, 148, 102)
    arche(d, 66, 26, 110, 102, fill=N)                                 # la grande porte, herse levée
    for x in range(72, 106, 6):
        d.line([(x, 30), (x, 50)], fill=B, width=2)
    d.line([(70, 44), (106, 44)], fill=B, width=2)
    torche(d, 48, 52); torche(d, 128, 52)
    # la Pierre d'Inspection, posée au sol, et sa jauge
    d.polygon([(74, 150), (78, 108), (98, 108), (102, 150)], fill=B)
    d.rectangle([80, 116, 96, 144], fill=N)
    for k in range(6):
        d.rectangle([82, 140 - k * 4, 94, 142 - k * 4], fill=V if k < 4 else B)
    return im


def tour_herse():
    """La Herse des Comptes : une herse de fer abaissée, et un tableau de clés sur le mur."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    murs_de_pierre(d, 26, 16, 150, 102)
    arche(d, 52, 24, 124, 104, fill=N)
    for x in range(58, 122, 8):
        d.line([(x, 34), (x, 104)], fill=B, width=3)
        d.polygon([(x - 2, 104), (x + 2, 104), (x, 110)], fill=B)
    for y in range(46, 104, 14):
        d.line([(54, y), (122, y)], fill=B, width=2)
    cadenas(d, 88, 72)
    for k, x in enumerate((32, 40, 136, 144)):                         # les clés accrochées
        d.ellipse([x - 3, 40, x + 3, 46], outline=V if k % 2 else B)
        d.line([(x, 46), (x, 58)], fill=V if k % 2 else B, width=2)
        d.line([(x, 54), (x + 3, 54)], fill=V if k % 2 else B)
    return im


def tour_sceau():
    """Le Sceau du Roi : un pupitre, un parchemin des droits, et le grand sceau de cire posé dessus."""
    im, d = toile()
    salle(d, 26, 14, 150, 104)
    d.rectangle([36, 20, 140, 30], fill=V)                              # une tenture
    for x in range(40, 140, 12):
        d.polygon([(x, 30), (x + 12, 30), (x + 6, 38)], fill=V)
    d.rectangle([58, 44, 118, 98], fill=B); d.rectangle([62, 48, 114, 94], fill=N)
    for y in range(54, 90, 8):
        d.line([(66, y), (110, y)], fill=B)
    d.line([(66, 78), (96, 78)], fill=V, width=2)                       # la ligne qu'on retire
    d.line([(64, 74), (100, 82)], fill=V, width=2)
    d.polygon([(70, 104), (106, 104), (100, 150), (76, 150)], fill=B)   # le pupitre
    d.ellipse([100, 82, 126, 108], fill=V); d.ellipse([105, 87, 121, 103], fill=N)
    d.polygon([(108, 98), (113, 89), (118, 98)], fill=V)                # une couronne dans la cire
    return im


def tour_pontlevis():
    """Le Pont-levis : la nuit, un pont relevé par ses chaînes au-dessus des douves, une porte bardée."""
    im, d = toile()
    etoiles(d, n=16, graine=31, ymax=50)
    lune(d, 24, 18, 8)
    murs_de_pierre(d, 30, 30, 146, 118)
    creneaux(d, 30, 146, 30, h=10, w=10)
    arche(d, 62, 52, 114, 118, fill=N)
    d.rectangle([66, 64, 110, 118], fill=B)                              # le tablier relevé
    for x in range(70, 110, 8):
        d.line([(x, 66), (x, 116)], fill=N)
    d.line([(46, 40), (68, 66)], fill=V, width=2); d.line([(130, 40), (108, 66)], fill=V, width=2)
    d.polygon([(0, 124), (176, 124), (176, 170), (0, 170)], fill=V)      # les douves
    for y in range(132, 168, 8):
        for x in range(6 + (y // 8 % 2) * 8, 176, 16):
            d.line([(x, y), (x + 6, y)], fill=N)
    cadenas(d, 88, 92, N)
    return im


def tour_portes():
    """Les Portes condamnées : un couloir de portes ; on a cloué des planches sur celles qui ne servent à rien."""
    im, d = toile()
    salle(d, 22, 16, 154, 100)
    for i, x in enumerate((30, 62, 94, 126)):
        d.rectangle([x, 34, x + 20, 98], fill=B); d.rectangle([x + 3, 37, x + 17, 98], fill=N)
        if i in (0, 2, 3):
            d.line([(x - 2, 50), (x + 22, 66)], fill=V, width=3)
            d.line([(x - 2, 72), (x + 22, 56)], fill=V, width=3)
        else:
            d.rectangle([x + 3, 37, x + 17, 98], fill=V)                 # la seule ouverte, éclairée
            d.ellipse([x + 13, 66, x + 15, 68], fill=N)
    texte(d, 70, 22, "22", V)
    return im


def tour_remparts():
    """Les Remparts : le mur crénelé, deux portes ouvertes (22 et 443), toutes les autres murées."""
    im, d = toile()
    etoiles(d, n=12, graine=17, ymax=40)
    murs_de_pierre(d, 0, 52, 176, 130)
    creneaux(d, 0, 176, 52, h=12, w=12)
    for x, t in ((36, "22"), (110, "443")):
        arche(d, x, 78, x + 30, 130, fill=N)
        texte(d, x + 15 - d.textlength(t) / 2, 66, t, V)
    for x in (12, 78, 150):                                              # des portes murées
        d.rectangle([x, 96, x + 14, 130], fill=N)
        briques(d, x + 1, 97, x + 13, 129, h=5, w=7)
    d.polygon([(0, 130), (176, 130), (176, 170), (0, 170)], fill=V)
    tramer(d, 2, 161, 173, 168, c=N, pas=3)
    return im


def tour_coffres():
    """La Salle des Coffres : des coffres cadenassés, un seul resté ouvert, des étagères de clés."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    for x, y, ouvert in ((40, 104, False), (78, 112, True), (116, 104, False)):
        d.rectangle([x, y, x + 28, y + 22], fill=B); d.rectangle([x + 2, y + 10, x + 26, y + 20], fill=N)
        d.line([(x, y + 9), (x + 28, y + 9)], fill=N, width=2)
        if ouvert:
            d.polygon([(x, y), (x + 28, y), (x + 24, y - 14), (x + 4, y - 14)], fill=V)
        else:
            cadenas(d, x + 14, y + 12)
    for y in (30, 52, 74):                                               # les étagères
        d.line([(32, y), (144, y)], fill=B, width=2)
    for k in range(9):
        x = 38 + k * 12
        d.rectangle([x, 22 + (k % 3) * 22, x + 6, 29 + (k % 3) * 22], fill=V if k % 2 else B)
    return im


def tour_coeur():
    """Le Cœur : le moteur du Bastion, une grande roue et des leviers alignés (les réglages du noyau)."""
    im, d = toile()
    salle(d, 22, 12, 154, 102)
    d.ellipse([58, 22, 118, 82], fill=B); d.ellipse([64, 28, 112, 76], fill=N)
    for k in range(8):
        a = k * math.pi / 4
        d.line([(88, 52), (88 + 22 * math.cos(a), 52 + 22 * math.sin(a))], fill=V, width=3)
    d.ellipse([82, 46, 94, 58], fill=V)
    for i, x in enumerate(range(36, 146, 16)):                           # les leviers
        d.rectangle([x - 4, 98, x + 4, 104], fill=B)
        haut = i % 3 != 1
        d.line([(x, 98), (x + (-6 if haut else 6), 84 if haut else 112)], fill=V if haut else B, width=3)
    return im


def tour_poterne():
    """La Poterne : la petite porte basse du pied de la tour, verrouillée ; un clavier aux trois touches barrées."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    murs_de_pierre(d, 26, 16, 150, 102)
    arche(d, 70, 54, 106, 102, fill=B)
    d.rectangle([74, 72, 102, 102], fill=N)
    for x in range(78, 102, 6):
        d.line([(x, 72), (x, 102)], fill=B)
    cadenas(d, 88, 84)
    d.rectangle([44, 122, 132, 150], fill=B)                              # le clavier
    for i, t in enumerate(("Ctrl", "Alt", "Del")):
        x = 50 + i * 28
        d.rectangle([x, 128, x + 22, 144], fill=N)
        texte(d, x + 11 - d.textlength(t) / 2, 130, t, B)
        d.line([(x, 128), (x + 22, 144)], fill=V, width=2)
    return im


def tour_banniere():
    """La Bannière : un mât, une bannière désormais muette, et un sceau vert de chiffrement."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.rectangle([56, 16, 60, 104], fill=B)
    d.polygon([(60, 20), (128, 20), (118, 44), (128, 68), (60, 68)], fill=B)
    d.polygon([(64, 24), (122, 24), (113, 44), (122, 64), (64, 64)], fill=N)
    d.line([(70, 36), (100, 52)], fill=V, width=2); d.line([(70, 52), (100, 36)], fill=V, width=2)   # la version barrée
    cadenas(d, 132, 86)
    texte(d, 70, 80, "https", V)
    return im


def tour_guet():
    """La Tour de Guet : une lanterne, un œil grand ouvert, et le registre où tout s'écrit."""
    im, d = toile()
    salle(d, 22, 12, 154, 102)
    d.ellipse([60, 22, 116, 58], fill=B); d.ellipse([66, 26, 110, 54], fill=N)
    d.ellipse([78, 30, 98, 50], fill=V); d.ellipse([84, 36, 92, 44], fill=N)
    for k in range(-2, 3):
        d.line([(88 + k * 14, 18), (88 + k * 18, 10)], fill=B)
    d.rectangle([48, 104, 128, 150], fill=B); d.rectangle([52, 108, 86, 146], fill=N); d.rectangle([90, 108, 124, 146], fill=N)
    for y in range(114, 144, 6):
        d.line([(56, y), (82, y)], fill=V if y % 12 else B); d.line([(94, y), (120, y)], fill=B)
    torche(d, 30, 60); torche(d, 146, 60)
    return im


def tour_sceaux():
    """Les Sceaux d'intégrité : des parchemins scellés, reliés par une chaîne d'empreintes."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    for i, x in enumerate((36, 76, 116)):
        d.rectangle([x, 30, x + 26, 82], fill=B)
        for y in range(36, 66, 6):
            d.line([(x + 4, y), (x + 22, y)], fill=N)
        d.ellipse([x + 6, 66, x + 20, 80], fill=V)
        d.point((x + 13, 73), fill=N)
    for x in (62, 102):                                                    # la chaîne
        d.ellipse([x, 50, x + 8, 58], outline=V, width=2); d.ellipse([x + 6, 50, x + 14, 58], outline=V, width=2)
    d.rectangle([40, 118, 136, 124], fill=B)
    return im


def tour_garde():
    """La Garde : un poste de garde, un bouclier, une hallebarde et une cage pour ceux qu'on bannit."""
    im, d = toile()
    salle(d, 22, 12, 154, 102)
    bouclier(d, 56, 34, 34)
    d.line([(96, 20), (96, 100)], fill=B, width=3)
    d.polygon([(90, 20), (104, 26), (96, 34)], fill=V)
    d.rectangle([112, 44, 146, 100], fill=N)                                # la cage
    for x in range(112, 148, 6):
        d.line([(x, 44), (x, 100)], fill=B, width=2)
    d.line([(110, 44), (148, 44)], fill=B, width=3); d.line([(110, 100), (148, 100)], fill=B, width=3)
    cadenas(d, 129, 110)
    return im


def serveur_bastion():
    """La machine bastion : une baie de serveurs au cœur de la tour, frappée d'un bouclier."""
    im, d = toile()
    salle(d, 30, 12, 146, 104)
    murs_de_pierre(d, 32, 14, 144, 102)
    d.rectangle([62, 18, 114, 140], fill=B); d.rectangle([66, 22, 110, 136], fill=N)
    for k in range(8):
        y = 28 + k * 13
        d.rectangle([70, y, 106, y + 8], fill=B)
        d.rectangle([73, y + 3, 76, y + 5], fill=V if k % 3 else N)
        d.rectangle([80, y + 3, 83, y + 5], fill=V)
    bouclier(d, 128, 40, 20)
    torche(d, 44, 50)
    return im


# ------------------------------------------------------------------
# Les douze maîtres, en pied (style dessiner_panne.perso, comme l'Académie)
# ------------------------------------------------------------------

def tete(r, y=12, cheveux=V, barbe=False, lunettes=False):
    r(37, y, 50, y + 17, B); yeux(r, 38, 45, y + 4)
    r(37, y, 50, y + 1, cheveux)
    r(43, y + 9, 44, y + 11, N)
    if lunettes: r(37, y + 3, 44, y + 3, N); r(45, y + 3, 51, y + 3, N)
    if barbe:
        r(36, y + 12, 51, y + 24, B); r(40, y + 13, 47, y + 13, N); r(40, y + 18, 40, y + 22, N); r(47, y + 18, 47, y + 22, N)
    else:
        r(41, y + 14, 46, y + 14, N)
    r(42, y + 18, 45, y + 19, B)


def cle(r, x, y, c=V):
    r(x, y, x + 5, y + 5, c); r(x + 1, y + 1, x + 4, y + 4, N); r(x + 2, y + 6, x + 3, y + 16, c); r(x + 4, y + 12, x + 6, y + 13, c); r(x + 4, y + 15, x + 5, y + 16, c)


def fernando_dessin(r):
    # le gardien des comptes : vieux, barbe, un trousseau de clés et la liste des comptes
    r(36, 8, 51, 12, B); tete(r, 12, B, barbe=True)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(18, 38, 30, 58, B); r(19, 39, 29, 57, N)
    for y in range(42, 56, 3): r(21, y, 27, y, B)
    r(21, 48, 27, 48, V)
    r(57, 46, 62, 48, B)
    for k, x in enumerate((56, 60, 64)): cle(r, x, 49 + (k % 2) * 3, V if k != 1 else B)
    pieds_robe(r); sol_tirets(r, 68)


def butler_dessin(r):
    # le chancelier du Sceau du Roi : haute toque, le grand sceau à la main, un rouleau sous le bras
    r(39, 2, 48, 11, V); r(37, 10, 50, 12, B)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, V)
    bras(r, True, True, 36)
    r(58, 38, 63, 48, B); r(55, 48, 66, 52, V); r(54, 52, 67, 54, B)        # le sceau
    r(20, 40, 32, 46, B); r(18, 41, 20, 45, V); r(32, 41, 34, 45, V)         # le rouleau
    pieds_robe(r); sol_tirets(r, 68)


def tatu_dessin(r):
    # le passeur du Pont-levis : jeune, écharpe, une grosse clé au bout d'une chaîne
    for x in range(37, 51, 3): r(x, 9, x + 1, 12, V)
    tete(r, 12, V)
    r(35, 31, 52, 34, V); r(48, 34, 51, 42, V)                                # l'écharpe
    r(35, 35, 52, 54, B); r(38, 36, 49, 54, N); r(39, 37, 48, 54, B)
    bras(r, True, True, 36)
    for k in range(6): r(58 + (k % 2), 47 + k * 3, 59 + (k % 2), 48 + k * 3, V)  # la chaîne
    cle(r, 56, 64, B)
    jambes(r); sol_tirets(r, 68)


def jean_dessin(r):
    # le menuisier des Portes condamnées : casquette, tablier, un marteau et une planche à clouer
    r(36, 9, 51, 12, V); r(48, 11, 54, 12, V)
    tete(r, 12, V)
    r(35, 33, 52, 54, V); r(38, 35, 49, 56, B); r(40, 44, 47, 49, N)
    bras(r, True, True, 36)
    r(57, 30, 58, 48, B); r(54, 27, 62, 31, B)                                # le marteau
    r(14, 44, 32, 49, B); r(16, 46, 17, 47, N); r(29, 46, 30, 47, N)           # la planche
    jambes(r); sol_tirets(r, 68)


def vint_dessin(r):
    # Vint, l'administrateur réseau revenu de vacances : casque audio, barbe courte, une truelle et une brique
    tete(r, 12, B, barbe=True)
    r(35, 12, 36, 22, V); r(51, 12, 52, 22, V); r(36, 10, 51, 11, V)          # le casque
    r(35, 33, 52, 54, V); r(42, 33, 45, 54, B)
    bras(r, True, True, 36)
    r(57, 46, 58, 52, B); r(54, 52, 62, 56, B)                                # la truelle
    r(16, 44, 32, 52, B); r(17, 45, 23, 47, N); r(25, 45, 31, 47, N); r(20, 49, 27, 51, N)  # la brique
    jambes(r); sol_tirets(r, 68)


def evelyn_dessin(r):
    # la gardienne des Coffres : chignon, un cadenas en main, un petit coffre sous le bras
    r(40, 4, 47, 10, V)
    tete(r, 12, V)
    r(35, 12, 36, 24, V); r(51, 12, 52, 24, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 40, 50, 41, V)
    bras(r, True, True, 36)
    r(56, 42, 64, 44, B); r(55, 46, 65, 54, V); r(59, 49, 61, 51, N)          # le cadenas
    r(16, 42, 32, 54, B); r(17, 47, 31, 53, N); r(17, 46, 31, 46, V); r(23, 48, 25, 50, V)  # le coffre
    pieds_robe(r); sol_tirets(r, 68)


def edsger_dessin(r):
    # le mécanicien du Cœur : crâne dégarni, lunettes, une clé à molette et un engrenage
    r(36, 14, 37, 20, V); r(50, 14, 51, 20, V)
    tete(r, 12, B, lunettes=True)
    r(35, 33, 52, 54, B); r(36, 34, 51, 54, V); r(42, 34, 45, 54, B)
    bras(r, True, True, 36)
    r(57, 30, 58, 46, B); r(54, 26, 61, 30, B); r(56, 27, 59, 28, N)         # la clé à molette
    r(16, 42, 30, 56, B); r(19, 45, 27, 53, N); r(22, 48, 24, 50, V)
    for x, y in ((22, 40), (22, 56), (14, 48), (30, 48)): r(x, y, x + 2, y + 1, B)
    jambes(r); sol_tirets(r, 68)


def joan_dessin(r):
    # la gardienne de la Poterne : capuche, une lanterne levée, un gros cadenas à la ceinture
    for k in range(5): r(40 - k - 2, 6 + k, 47 + k + 2, 6 + k, V)
    r(33, 11, 54, 33, V); tete(r, 14, V)
    robe_mage(r, 33, 64, V, 34, 53)
    bras(r, True, True, 36)
    r(56, 24, 57, 34, B); r(53, 34, 61, 44, B); r(55, 36, 59, 42, V)         # la lanterne
    r(40, 48, 47, 56, B); r(42, 50, 45, 54, N); r(41, 45, 46, 47, B)          # le cadenas
    pieds_robe(r); sol_tirets(r, 68)


def robert_dessin(r):
    # le porte-bannière : cheveux courts, un mât et une bannière roulée et muette
    tete(r, 12, V)
    r(35, 33, 52, 54, V); r(38, 33, 49, 38, B)
    bras(r, True, True, 36)
    r(59, 8, 60, 66, B)                                                       # le mât
    r(61, 10, 74, 26, B); r(62, 11, 73, 25, N); r(64, 14, 71, 22, V)          # la bannière
    jambes(r, B); sol_tirets(r, 68)


def katherine_dessin(r):
    # la vigie de la Tour de Guet : une longue-vue, et le registre où tout s'écrit
    r(36, 9, 51, 13, V); r(35, 12, 36, 26, V); r(51, 12, 52, 26, V)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, V)
    bras(r, True, True, 36)
    r(54, 30, 70, 34, B); r(70, 29, 73, 35, V)                                # la longue-vue
    r(16, 40, 31, 56, B); r(17, 41, 23, 55, N); r(24, 41, 30, 55, N)
    for y in range(44, 54, 3): r(18, y, 22, y, V); r(25, y, 29, y, B)
    pieds_robe(r); sol_tirets(r, 68)


def ralph_dessin(r):
    # le gardien des Sceaux : barbe, une chaîne de sceaux en bandoulière, un tampon à empreinte
    tete(r, 12, B, barbe=True)
    robe_mage(r, 33, 64, V, 35, 52)
    for k in range(6): r(37 + k * 2, 36 + k * 4, 39 + k * 2, 38 + k * 4, B)   # la chaîne en bandoulière
    for x, y in ((38, 38), (44, 46), (49, 54)): r(x, y, x + 3, y + 3, B); r(x + 1, y + 1, x + 2, y + 2, V)
    bras(r, True, True, 36)
    r(57, 38, 61, 46, B); r(54, 46, 64, 50, B); r(55, 50, 63, 51, V)
    pieds_robe(r); sol_tirets(r, 68)


def adele_dessin(r):
    # la capitaine de la Garde : casque à nasal, bouclier, hallebarde
    r(36, 7, 51, 13, B); r(43, 13, 44, 18, B)
    tete(r, 12, B)
    r(35, 33, 52, 54, B); r(36, 34, 51, 54, N)
    for y in range(36, 54, 4): r(37, y, 50, y + 1, B)
    bras(r, True, True, 36)
    r(59, 4, 60, 66, B); r(56, 4, 63, 8, V); r(61, 8, 64, 13, V)              # la hallebarde
    r(16, 38, 32, 50, B); r(18, 40, 30, 49, V); r(21, 50, 27, 55, V); r(24, 41, 24, 52, N)  # le bouclier
    jambes(r); sol_tirets(r, 68)


def pierre_dessin(r):
    # la Pierre d'Inspection : un monolithe gravé, sa jauge, et le score qui monte
    r(28, 6, 59, 66, B); r(30, 4, 57, 6, B)
    r(33, 10, 54, 62, N)
    for k in range(10):
        r(37, 58 - k * 5, 50, 60 - k * 5, V if k < 6 else B)
    r(26, 66, 61, 68, V)
    for x, y in ((20, 12), (66, 18), (18, 40), (68, 46)): r(x, y, x + 1, y + 1, V)
    sol_tirets(r, 70)


PORTRAITS = {
    "item_fernando.gif": fernando_dessin, "item_butler.gif": butler_dessin, "item_tatu.gif": tatu_dessin,
    "item_jean.gif": jean_dessin, "item_vint.gif": vint_dessin, "item_evelyn.gif": evelyn_dessin,
    "item_edsger.gif": edsger_dessin, "item_joan.gif": joan_dessin, "item_robert.gif": robert_dessin,
    "item_katherine.gif": katherine_dessin, "item_ralph.gif": ralph_dessin, "item_adele.gif": adele_dessin,
    "item_pierre.gif": pierre_dessin,
}


def lettre_inspection(nom="item_lettre_inspection.gif"):
    """La cinquième enveloppe : un pli officiel de l'Inspection, scellé d'un bouclier, liseré de remparts."""
    from PIL import Image, ImageDraw
    from dessiner_lieux import PAL, OUT
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 6): d.rectangle([x, 36, x + 2, 39], fill=V)          # des créneaux
    d.polygon([(23, 17), (36, 17), (36, 25), (29.5, 31), (23, 25)], fill=V)    # le sceau en bouclier
    d.polygon([(26, 19), (33, 19), (33, 24), (29.5, 28), (26, 24)], fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_bastion.gif": bastion, "loc_tour_herse.gif": tour_herse, "loc_tour_sceau.gif": tour_sceau,
    "loc_tour_pontlevis.gif": tour_pontlevis, "loc_tour_portes.gif": tour_portes, "loc_tour_remparts.gif": tour_remparts,
    "loc_tour_coffres.gif": tour_coffres, "loc_tour_coeur.gif": tour_coeur, "loc_tour_poterne.gif": tour_poterne,
    "loc_tour_banniere.gif": tour_banniere, "loc_tour_guet.gif": tour_guet, "loc_tour_sceaux.gif": tour_sceaux,
    "loc_tour_garde.gif": tour_garde, "loc_serveur_bastion.gif": serveur_bastion,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_lettre_inspection.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_lettre_inspection.gif":
            lettre_inspection(nom); n += 1
    print(n, "dessins")
