"""Dessine Port-Aube (chapitre 7) : l'Embarcadère du campus, le quai de l'île au petit jour, la cité en fête (la
victoire), les dix maisons, la baie des serveurs et le poste du quai, les dix maîtres bâtisseurs et les six habitants
en pied, le Billet de traversée (la septième enveloppe) et les cinq plans de la cinématique d'ouverture.

Même style que les chapitres 4 à 6 (dessiner_academie.py, dessiner_bastion.py, dessiner_machines.py) : pixel art 1 bit
épais (noir, vert, blanc), les personnages en pied comme ceux des chapitres 2 à 6 (dessiner_panne.perso : grille 88 x 85,
tête carrée, yeux à pupille, sol en tirets).
Usage : python3 outils/dessiner_ile.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_fantasy import tramer, etoiles, lune, flamme, livres, etagere  # noqa: E402
from dessiner_academie import texte, robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle  # noqa: E402
from dessiner_machines import reverbere, phare, engrenage, caisse  # noqa: E402


# ------------------------------------------------------------------
# Les briques du décor : la mer, l'île, les maisons, le navire, le ciel
# ------------------------------------------------------------------

def mer(d, y0, y1=H, graine=1, c=B):
    """La mer : des vaguelettes en tirets, plus serrées au loin."""
    y, k = y0, 0
    while y < y1:
        pas = 4 + (y - y0) // 10
        dec = (k * 7 + graine * 3) % 11
        for x in range(-dec, W, 14 + (y - y0) // 6):
            d.line([(x, y), (x + 3 + (y - y0) // 14, y)], fill=c)
        y += pas
        k += 1


def soleil_levant(d, x, y, r=14):
    """Le soleil qui sort de la mer : un demi-disque vert, des rayons."""
    d.pieslice([x - r, y - r, x + r, y + r], 180, 360, fill=V)
    for k in range(7):
        a = math.pi + (k + 0.5) * math.pi / 7
        d.line([(x + (r + 4) * math.cos(a), y + (r + 4) * math.sin(a)), (x + (r + 10) * math.cos(a), y + (r + 10) * math.sin(a))], fill=V)


def ile(d, x, y, w=60, h=18, avec_phare=True, avec_maisons=True):
    """L'île au loin : une silhouette de colline, quelques toits, et le phare au bout."""
    d.polygon([(x, y), (x + w * 0.2, y - h * 0.6), (x + w * 0.45, y - h), (x + w * 0.7, y - h * 0.7), (x + w, y)], fill=B)
    if avec_maisons:
        for k in range(5):
            xx = x + 10 + k * (w - 20) // 5
            d.rectangle([xx, y - 6 - (k % 2) * 2, xx + 4, y - 1], fill=N)
            d.polygon([(xx - 1, y - 6 - (k % 2) * 2), (xx + 5, y - 6 - (k % 2) * 2), (xx + 2, y - 9 - (k % 2) * 2)], fill=N)
    if avec_phare:
        d.rectangle([x + w - 3, y - 14, x + w - 1, y], fill=B)
        d.rectangle([x + w - 4, y - 19, x + w, y - 18], fill=B)
        d.rectangle([x + w - 4, y - 18, x + w, y - 14], fill=V)


def maison_ile(d, x, y, w=22, h=26, eclairee=False, enseigne=None, toit=V):
    """Une maison de Port-Aube : toit pointu, porte, fenêtres (noires, ou vertes si la maison est bâtie)."""
    d.rectangle([x, y - h, x + w, y], fill=B)
    d.polygon([(x - 2, y - h), (x + w + 2, y - h), (x + w // 2, y - h - 11)], fill=toit)
    d.polygon([(x + 2, y - h - 1), (x + w - 2, y - h - 1), (x + w // 2, y - h - 8)], fill=N if toit == B else toit)
    d.rectangle([x + 2, y - h + 2, x + w - 2, y - 1], fill=N)
    for fx in (x + 4, x + w - 9):
        d.rectangle([fx, y - h + 5, fx + 5, y - h + 11], fill=V if eclairee else N, outline=B)
        if not eclairee:
            d.line([(fx + 2, y - h + 5), (fx + 2, y - h + 11)], fill=B)
    d.rectangle([x + w // 2 - 3, y - 10, x + w // 2 + 3, y - 1], fill=B)
    d.rectangle([x + w // 2 - 2, y - 9, x + w // 2 + 2, y - 1], fill=V if eclairee else N)
    if enseigne:
        d.rectangle([x + 2, y - 16, x + w - 2, y - 12], fill=B)


def quai(d, y, x0=0, x1=W):
    """Le quai : des planches, des bittes d'amarrage."""
    d.rectangle([x0, y, x1, y + 4], fill=B)
    for x in range(x0, x1, 9):
        d.line([(x, y), (x, y + 4)], fill=N)
    for x in range(x0 + 12, x1, 46):
        d.rectangle([x, y - 5, x + 4, y], fill=B)
        d.rectangle([x - 1, y - 6, x + 5, y - 5], fill=B)


def navire(d, x, y, l=70, voiles=True, eclaire=False):
    """Le navire : une coque, deux mâts, des voiles, des hublots."""
    d.polygon([(x, y), (x + l, y), (x + l - 8, y + 12), (x + 8, y + 12)], fill=B)
    d.rectangle([x + 6, y + 3, x + l - 6, y + 4], fill=N)
    for k in range(6):
        d.rectangle([x + 12 + k * (l - 24) // 5, y + 6, x + 14 + k * (l - 24) // 5, y + 8], fill=V if eclaire else N)
    for mx in (x + l // 3, x + 2 * l // 3):
        d.rectangle([mx, y - 40, mx + 1, y], fill=B)
        if voiles:
            d.polygon([(mx + 2, y - 36), (mx + 16, y - 26), (mx + 2, y - 8)], fill=V)
            d.polygon([(mx - 1, y - 34), (mx - 14, y - 24), (mx - 1, y - 10)], fill=B)
    d.polygon([(x + l // 3 + 1, y - 40), (x + l // 3 + 8, y - 43), (x + l // 3 + 1, y - 46)], fill=V)


def nuages_orage(d, y, graine=2):
    """Des nuages lourds, tramés, qui roulent sur la mer."""
    for k in range(6):
        cx = (k * 37 + graine * 13) % (W + 20) - 10
        cy = y + (k * 5) % 12
        d.ellipse([cx - 22, cy - 8, cx + 22, cy + 10], fill=B)
        d.ellipse([cx - 14, cy - 14, cx + 12, cy + 4], fill=B)
    tramer(d, 0, y - 14, W, y + 14, N, 2, 0)


def eclair(d, x, y, h=50):
    pts = [(x, y), (x - 6, y + h * 0.4), (x + 2, y + h * 0.42), (x - 8, y + h)]
    d.line(pts, fill=V, width=3)
    d.line(pts, fill=B, width=1)


def pluie(d, x0, y0, x1, y1, pas=7):
    for x in range(x0, x1, pas):
        for y in range(y0 + (x % 5), y1, 11):
            d.line([(x, y), (x - 2, y + 5)], fill=B)


def guirlande(d, x0, y0, x1, y1, creux=8):
    """Une guirlande de lampions entre deux points."""
    n = 9
    for k in range(n + 1):
        t = k / n
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + creux * math.sin(math.pi * t)
        if k:
            d.line([(px, py), (x, y)], fill=B)
        d.rectangle([x - 1, y + 1, x + 1, y + 3], fill=V if k % 2 else B)
        px, py = x, y


def silhouette(d, x, y, h=30, c=B, chapeau=False):
    """Un personnage vu de dos, au loin (Laurent sur le quai, un étudiant au bastingage)."""
    d.rectangle([x - 3, y - h, x + 3, y - h + 6], fill=c)
    if chapeau:
        d.rectangle([x - 5, y - h - 1, x + 5, y - h], fill=c)
        d.rectangle([x - 3, y - h - 4, x + 3, y - h - 1], fill=c)
    d.polygon([(x - 6, y - h + 7), (x + 6, y - h + 7), (x + 8, y - 8), (x - 8, y - 8)], fill=c)
    d.rectangle([x - 4, y - 8, x - 2, y], fill=c)
    d.rectangle([x + 2, y - 8, x + 4, y], fill=c)


def ciel_aube(d, ligne=70):
    """L'aube : des bandes claires tramées au-dessus de l'horizon."""
    for k, y in enumerate(range(ligne - 26, ligne, 6)):
        tramer(d, 0, y, W, y + 2, V if k % 2 else B, 4 - min(k, 2), k)


def armoire(d, x, y, w=26, h=56, leds=True):
    """Une baie de serveurs : des tiroirs, des voyants."""
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], fill=N)
    for k in range(y + 5, y + h - 4, 7):
        d.rectangle([x + 4, k, x + w - 4, k + 4], fill=B)
        d.rectangle([x + 5, k + 1, x + w - 5, k + 3], fill=N)
        if leds:
            d.point((x + w - 7, k + 2), fill=V)
            d.point((x + w - 9, k + 2), fill=V if k % 2 else B)


def lucarne_mer(d, x, y, w=40, h=30):
    """Une fenêtre ronde qui donne sur la mer."""
    d.ellipse([x, y, x + w, y + h], fill=B)
    d.ellipse([x + 3, y + 3, x + w - 3, y + h - 3], fill=N)
    for k in range(4):
        yy = y + h // 2 + k * 3
        d.line([(x + 6 + k * 2, yy), (x + w - 6 - k * 2, yy)], fill=V if k % 2 == 0 else B)


# ------------------------------------------------------------------
# Les lieux
# ------------------------------------------------------------------

def embarcadere():
    """L'Embarcadère du campus, à l'aube : la jetée, le traversier au fanal allumé, l'île au loin."""
    im, d = toile()
    ciel_aube(d, 72)
    ile(d, 104, 72, 56, 16)
    mer(d, 74, 120)
    d.rectangle([0, 112, 92, 120], fill=B)                                  # la jetée
    for x in range(4, 92, 10):
        d.rectangle([x, 120, x + 2, 140], fill=B)
    navire(d, 40, 116, 60, voiles=False)
    d.rectangle([66, 92, 74, 116], fill=B)                                  # la cabine du traversier
    d.rectangle([68, 95, 72, 100], fill=V)
    d.rectangle([78, 84, 80, 100], fill=B); d.rectangle([76, 80, 82, 85], fill=V)   # le fanal
    for a in (-1, 1):
        d.line([(79 + a * 5, 82), (79 + a * 10, 82)], fill=V)
    d.rectangle([0, 140, W, H], fill=V)
    tramer(d, 0, 146, W, H, N, 2)
    reverbere(d, 14, 94, True)
    d.rectangle([110, 128, 152, 138], fill=B)                               # la pancarte
    d.rectangle([112, 130, 150, 136], fill=N)
    texte(d, 114, 131, "PORT-AUBE", V)
    d.rectangle([129, 138, 131, 150], fill=B)
    return im


def port_aube(fete=False):
    """Le quai de Port-Aube : dix maisons autour du port, le phare au bout de la jetée, la mer.
    Au petit jour (éteinte), ou la nuit de la fête (lanternes allumées, guirlandes, le navire à quai)."""
    im, d = toile()
    if fete:
        etoiles(d, 30, 5, 58)
        lune(d, 26, 20, 7)
    else:
        ciel_aube(d, 62)
        soleil_levant(d, 30, 62, 10)
    mer(d, 62, 104, 2)
    phare(d, 150, 40, allume=fete)
    d.rectangle([132, 108, 176, 112], fill=B)                               # la jetée du phare
    largeurs = [16, 18, 15, 17, 16]
    x = 4
    for k, w in enumerate(largeurs):                                        # la rangée du fond
        maison_ile(d, x, 104, w, 22 + (k % 2) * 6, eclairee=fete, toit=V if k % 2 else B)
        x += w + 6
    if fete:
        navire(d, 30, 112, 74, voiles=False, eclaire=True)
        guirlande(d, 4, 74, 122, 74, 10)
    d.rectangle([0, 124, W, H], fill=V)
    quai(d, 124, 0, W)
    tramer(d, 0, 132, W, H, N, 2)
    for k, xx in enumerate((10, 60, 110, 160)):
        reverbere(d, xx, 92 + 34, fete)
    return im


def baie_ile():
    """La baie d'une maison de l'île : deux armoires de serveurs neuves, une lucarne sur la mer."""
    im, d = toile()
    d.rectangle([0, 0, W, 18], fill=N)
    d.line([(0, 18), (W, 18)], fill=B)
    for x in range(0, W, 22):
        d.line([(x, 0), (x, 18)], fill=B)                                   # les poutres
    lucarne_mer(d, 68, 28, 40, 30)
    armoire(d, 14, 48, 30, 84)
    armoire(d, 132, 48, 30, 84)
    d.rectangle([0, 132, W, H], fill=V)
    tramer(d, 0, 140, W, H, N, 2)
    for k in range(5):                                                      # les câbles neufs
        d.arc([44, 96 + k * 4, 132, 130 + k * 4], 0, 180, fill=B if k % 2 else V)
    return im


def poste_quai():
    """Le poste du quai : une borne sous un auvent, clavier neuf, écran éteint, la mer derrière."""
    im, d = toile()
    ciel_aube(d, 60)
    mer(d, 60, 100)
    d.polygon([(10, 30), (166, 30), (176, 44), (0, 44)], fill=B)            # l'auvent rayé
    for x in range(4, 176, 16):
        d.polygon([(x, 31), (x + 8, 31), (x + 9, 43), (x + 1, 43)], fill=V)
    d.rectangle([14, 44, 16, 120], fill=B); d.rectangle([160, 44, 162, 120], fill=B)
    d.rectangle([60, 66, 116, 104], fill=B)                                 # l'écran
    d.rectangle([64, 70, 112, 100], fill=N)
    d.line([(68, 92), (72, 96)], fill=V); d.line([(72, 96), (68, 100)], fill=V)
    d.rectangle([84, 104, 92, 112], fill=B)
    d.polygon([(52, 116), (124, 116), (130, 124), (46, 124)], fill=B)       # le clavier
    for x in range(52, 124, 4):
        d.point((x + 2, 119), fill=N); d.point((x + 3, 121), fill=N)
    d.rectangle([0, 124, W, H], fill=V)
    quai(d, 124)
    tramer(d, 0, 132, W, H, N, 2)
    return im


# --- Les dix maisons, de l'intérieur ---

def m_noms():
    """La Maison des Noms : de hauts rayonnages, des étiquettes vides, une échelle."""
    im, d = toile()
    for x0 in (8, 62, 116):
        etagere(d, x0, 16, x0 + 50, 128, 5, x0)
        for y in range(26, 128, 22):
            d.rectangle([x0 + 16, y, x0 + 34, y + 5], fill=B)                # les étiquettes
            d.rectangle([x0 + 17, y + 1, x0 + 33, y + 4], fill=N)
    d.line([(150, 140), (168, 18)], fill=V, width=2)                         # l'échelle
    d.line([(160, 140), (176, 22)], fill=V, width=2)
    for k in range(8):
        d.line([(151 + k * 2.3, 128 - k * 15), (161 + k * 2.1, 128 - k * 15)], fill=V)
    d.rectangle([0, 140, W, H], fill=V); tramer(d, 0, 146, W, H, N, 2)
    return im


def m_phare():
    """Le Phare-Relais : la grande lentille, le cœur de la lanterne, la mer par les vitres."""
    im, d = toile()
    for x in range(0, W, 30):
        d.rectangle([x, 10, x + 2, 130], fill=B)                             # les montants des vitres
    mer(d, 96, 130, 4)
    d.ellipse([52, 26, 124, 98], fill=B)                                    # la lentille de Fresnel
    for k, r in enumerate(range(34, 4, -6)):
        d.ellipse([88 - r, 62 - r, 88 + r, 62 + r], fill=V if k % 2 else N, outline=B)
    d.rectangle([84, 98, 92, 130], fill=B)
    d.rectangle([60, 128, 116, 134], fill=B)
    d.rectangle([0, 134, W, H], fill=V); tramer(d, 0, 140, W, H, N, 2)
    return im


def m_poste():
    """La Poste : le guichet, des sacs de lettres tamponnés « en attente », un tri de casiers."""
    im, d = toile()
    for y in range(14, 64, 10):                                             # les casiers de tri
        for x in range(14, 162, 12):
            d.rectangle([x, y, x + 10, y + 8], outline=B)
            if (x + y) % 3 == 0:
                d.rectangle([x + 2, y + 3, x + 8, y + 6], fill=V)
    d.rectangle([0, 76, W, 90], fill=B); d.rectangle([2, 78, W - 2, 88], fill=N)   # le guichet
    texte(d, 70, 80, "POSTE", V)
    for k, x in enumerate((14, 44, 120, 148)):                              # les sacs
        d.polygon([(x, 136), (x + 22, 136), (x + 19, 108), (x + 3, 108)], fill=B)
        d.rectangle([x + 6, 104, x + 16, 108], fill=B)
        d.rectangle([x + 5, 118, x + 17, 124], fill=N)
        texte(d, x + 6, 119, "...", V)
    d.rectangle([0, 138, W, H], fill=V); tramer(d, 0, 144, W, H, N, 2)
    return im


def m_lettres():
    """Le Bureau des Lettres : un mur de casiers, un par habitant, et trois sceaux de cire."""
    im, d = toile()
    for y in range(10, 100, 9):
        for x in range(8, 168, 10):
            d.rectangle([x, y, x + 8, y + 7], outline=B)
            if (x * 3 + y) % 7 == 0:
                d.rectangle([x + 2, y + 2, x + 6, y + 5], fill=B)
    d.rectangle([20, 108, 156, 116], fill=B)                                # le pupitre
    for k, x in enumerate((48, 88, 128)):                                   # les trois sceaux
        d.ellipse([x - 10, 120, x + 10, 140], fill=V)
        d.ellipse([x - 6, 124, x + 6, 136], fill=N)
        texte(d, x - 4, 127, ["S", "D", "M"][k], V)
    d.rectangle([0, 144, W, H], fill=V); tramer(d, 0, 150, W, H, N, 2)
    return im


def m_greniers():
    """Les Greniers : de grandes charpentes, une étagère de dossiers par habitant, des portes closes."""
    im, d = toile()
    d.polygon([(0, 40), (88, 4), (176, 40)], outline=B)
    for k in range(5):
        d.line([(k * 44, 40 - (k if k <= 2 else 4 - k) * 18), (k * 44, 140)], fill=B)
    d.line([(0, 40), (176, 40)], fill=B, width=2)
    d.line([(44, 22), (132, 22)], fill=B)
    for y in (58, 84, 110):
        d.rectangle([8, y, 168, y + 2], fill=B)
        for x in range(12, 164, 9):
            h = 10 + (x * 7 + y) % 8
            d.rectangle([x, y - h, x + 6, y - 1], fill=V if (x + y) % 4 else B)
    d.rectangle([66, 116, 110, 140], fill=B)                                # la porte close
    d.rectangle([68, 118, 108, 140], fill=N)
    d.line([(88, 118), (88, 140)], fill=B)
    d.rectangle([84, 126, 92, 132], fill=V)                                 # le cadenas
    d.rectangle([0, 140, W, H], fill=V); tramer(d, 0, 146, W, H, N, 2)
    return im


def m_halle():
    """La Halle d'échange : une nef de bois et de verre, des étals vides."""
    im, d = toile()
    d.arc([10, 6, 166, 150], 180, 360, fill=B)
    d.arc([16, 12, 160, 144], 180, 360, fill=B)
    for x in range(20, 160, 16):
        d.line([(x, 80 - math.sqrt(max(0, 78 ** 2 - (x - 88) ** 2)) + 2), (x, 100)], fill=B)
    for k, x in enumerate((14, 66, 118)):                                   # les étals
        d.rectangle([x, 106, x + 44, 110], fill=B)
        d.polygon([(x - 2, 96), (x + 46, 96), (x + 40, 88), (x + 4, 88)], fill=V if k % 2 else B)
        d.rectangle([x + 2, 110, x + 4, 132], fill=B); d.rectangle([x + 40, 110, x + 42, 132], fill=B)
    d.rectangle([0, 132, W, H], fill=V); tramer(d, 0, 138, W, H, N, 2)
    return im


def m_registre():
    """Le Grand Registre : un livre immense ouvert sur un lutrin, une seule ligne écrite."""
    im, d = toile()
    for x0 in (4, 136):
        etagere(d, x0, 14, x0 + 36, 124, 5, x0)
    d.polygon([(40, 64), (88, 74), (136, 64), (136, 108), (88, 118), (40, 108)], fill=B)   # le livre ouvert
    d.polygon([(44, 68), (86, 77), (86, 113), (44, 104)], fill=N)
    d.polygon([(90, 77), (132, 68), (132, 104), (90, 113)], fill=N)
    d.line([(50, 76), (80, 82)], fill=V)                                    # la seule ligne écrite
    for k in range(5):
        d.line([(96, 80 + k * 6), (126, 74 + k * 6)], fill=B if k == 0 else N)
    d.polygon([(80, 118), (96, 118), (104, 140), (72, 140)], fill=B)       # le lutrin
    d.rectangle([0, 140, W, H], fill=V); tramer(d, 0, 146, W, H, N, 2)
    return im


def m_portes():
    """Les Portes de la cité : une arche de pierre, une borne qui reconnaît les arrivants."""
    im, d = toile()
    d.rectangle([22, 18, 154, 132], fill=B)
    d.rectangle([28, 24, 148, 132], fill=N)
    d.pieslice([46, 30, 130, 114], 180, 360, fill=B)
    d.rectangle([46, 72, 130, 132], fill=B)
    d.pieslice([52, 36, 124, 108], 180, 360, fill=N)
    d.rectangle([52, 72, 124, 132], fill=N)
    mer(d, 82, 132, 6)
    for k in range(28, 148, 12):
        d.line([(k, 24), (k + 6, 24)], fill=N)
    d.rectangle([132, 92, 146, 130], fill=B)                                # la borne
    d.rectangle([134, 96, 144, 108], fill=V)
    d.rectangle([0, 132, W, H], fill=V); tramer(d, 0, 138, W, H, N, 2)
    return im


def m_forge():
    """La Forge des Sceaux : un foyer rougeoyant (vert), une enclume, un sceau sur l'enclume."""
    im, d = toile()
    d.rectangle([10, 30, 70, 110], fill=B)                                  # le foyer
    d.rectangle([16, 60, 64, 104], fill=N)
    for k, x in enumerate(range(22, 60, 8)):
        flamme(d, x, 96, 14 + (k % 3) * 4)
    d.rectangle([30, 10, 50, 30], fill=B)
    d.polygon([(96, 104), (150, 104), (142, 112), (104, 112)], fill=B)     # l'enclume
    d.rectangle([110, 112, 136, 130], fill=B)
    d.rectangle([102, 130, 144, 134], fill=B)
    d.ellipse([112, 88, 134, 104], fill=V)                                  # le sceau
    d.ellipse([116, 91, 130, 101], fill=N)
    texte(d, 119, 93, "CA", V)
    d.line([(150, 70), (166, 50)], fill=B, width=3)                         # le marteau
    d.rectangle([160, 42, 172, 52], fill=B)
    d.rectangle([0, 134, W, H], fill=V); tramer(d, 0, 140, W, H, N, 2)
    return im


def m_arche():
    """L'Arche : sur la colline, une coque renversée en pierre, sa porte blindée, la mer en contrebas."""
    im, d = toile()
    etoiles(d, 12, 9, 40)
    d.polygon([(0, 120), (40, 92), (100, 80), (150, 90), (176, 104), (176, 170), (0, 170)], fill=V)
    tramer(d, 0, 130, W, H, N, 3)
    d.pieslice([40, 34, 140, 124], 180, 360, fill=B)                       # la coque renversée
    d.rectangle([40, 78, 140, 98], fill=B)
    for k in range(4):
        d.arc([44 + k * 6, 38 + k * 6, 136 - k * 6, 120 - k * 6], 190, 350, fill=N)
    d.rectangle([80, 70, 100, 98], fill=N)                                  # la porte blindée
    d.ellipse([85, 76, 95, 86], outline=V)
    d.line([(90, 76), (90, 86)], fill=V); d.line([(85, 81), (95, 81)], fill=V)
    mer(d, 140, 170, 8, B)
    return im


# ------------------------------------------------------------------
# La cinématique d'ouverture : cinq plans
# ------------------------------------------------------------------

def cine_mer_aube():
    """La mer au petit jour, d'argent ; une île sort de la brume, au loin."""
    im, d = toile()
    ciel_aube(d, 84)
    soleil_levant(d, 132, 84, 16)
    ile(d, 30, 84, 70, 20)
    tramer(d, 0, 76, W, 86, B, 3, 1)                                       # la brume
    mer(d, 88, H, 3)
    navire(d, 96, 140, 50, voiles=True)
    return im


def cine_quai_laurent():
    """Sur le quai, Laurent attend, de dos, le col relevé, face à la cité qui dort."""
    im, d = toile()
    ciel_aube(d, 58)
    x = 6
    for k in range(6):
        maison_ile(d, x, 96, 18, 22 + (k % 2) * 8, toit=V if k % 2 else B)
        x += 28
    mer(d, 96, 112, 5)
    d.rectangle([0, 112, W, H], fill=B)
    for x in range(0, W, 12):
        d.line([(x, 112), (x - 30, H)], fill=N)                             # les planches en perspective
    silhouette(d, 88, 160, 56, N)                                           # Laurent, de dos, en ombre
    d.polygon([(80, 106), (96, 106), (98, 112), (78, 112)], fill=N)         # le col relevé
    return im


def cine_maisons_vides():
    """Dix maisons neuves, toutes fenêtres noires : pas un nom, pas une lettre, pas une lumière."""
    im, d = toile()
    d.rectangle([0, 0, W, 40], fill=N)
    etoiles(d, 8, 4, 30)
    for rang, (y, w, h) in enumerate(((84, 26, 30), (140, 32, 40))):
        x = 4 if rang else 18
        for k in range(5 if rang == 0 else 4):
            maison_ile(d, x, y, w, h, toit=B if (k + rang) % 2 else V)
            for fy in range(y - h + 5, y - h + 12):
                pass
            x += w + (8 if rang == 0 else 12)
    d.rectangle([0, 142, W, H], fill=V); tramer(d, 0, 148, W, H, N, 2)
    return im


def cine_phare_orage():
    """À l'horizon, l'orage roule sur les vagues ; le phare, sans flamme, attend."""
    im, d = toile()
    nuages_orage(d, 24, 3)
    eclair(d, 46, 30, 60)
    pluie(d, 0, 36, W, 110)
    mer(d, 96, H, 7)
    for k in range(4):                                                      # de grosses vagues
        x = k * 50 - 10
        d.arc([x, 104 + (k % 2) * 8, x + 40, 136 + (k % 2) * 8], 180, 300, fill=V, width=3)
    phare(d, 124, 46, allume=False)
    d.polygon([(108, 118), (140, 118), (150, 140), (98, 140)], fill=B)     # le rocher du phare
    return im


def cine_maree():
    """La marée de 19 h : le navire entre dans la passe, des centaines de silhouettes au bastingage."""
    im, d = toile()
    etoiles(d, 16, 6, 40)
    lune(d, 150, 18, 8)
    mer(d, 74, H, 9)
    navire(d, 26, 110, 124, voiles=True, eclaire=True)
    for x in range(40, 140, 6):                                             # les passagers au bastingage
        d.rectangle([x, 104, x + 2, 109], fill=B)
        d.rectangle([x, 101, x + 2, 103], fill=B)
    phare(d, 12, 70, allume=True)
    return im


def port_aube_fete():
    return port_aube(fete=True)


# ------------------------------------------------------------------
# Les maîtres bâtisseurs et les habitants, en pied
# ------------------------------------------------------------------

def badis_dessin(r):
    # le bibliothécaire des noms : bonnet, une pile d'étiquettes et une plume
    r(36, 8, 51, 12, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V)
    bras(r, True, True, 36)
    for k in range(4): r(56, 34 + k * 5, 68, 37 + k * 5, B); r(58, 35 + k * 5, 66, 36 + k * 5, N)
    r(20, 30, 21, 48, V); r(18, 28, 23, 31, B)
    jambes(r); sol_tirets(r, 68)


def maeva_dessin(r):
    # la gardienne du phare : ciré, cheveux au vent, une lanterne à la main
    for (x0, y0, x1, y1) in [(34, 9, 53, 13), (32, 12, 36, 28), (51, 12, 57, 24), (57, 14, 62, 18)]:
        r(x0, y0, x1, y1, V)
    tete(r, 12, V)
    robe_mage(r, 33, 64, V, 35, 52)
    r(38, 33, 49, 40, B)
    bras(r, True, True, 36)
    r(56, 44, 66, 58, B); r(58, 47, 64, 55, V); r(59, 41, 63, 44, B)
    pieds_robe(r); sol_tirets(r, 68)


def younes_dessin(r):
    # le facteur : casquette à visière, sacoche en bandoulière, une lettre levée
    r(36, 9, 51, 12, V); r(49, 11, 56, 12, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, N)
    for k in range(7): r(38 + k * 2, 34 + k * 3, 40 + k * 2, 36 + k * 3, V)
    bras(r, True, True, 36)
    r(52, 46, 66, 58, V); r(54, 48, 64, 56, N)
    r(16, 24, 30, 34, B); r(17, 25, 29, 26, N); r(17, 27, 18, 28, N); r(28, 27, 29, 28, N); r(19, 29, 27, 30, N)
    jambes(r); sol_tirets(r, 68)


def syrine_dessin(r):
    # la gardienne des casiers : chignon, lunettes, un sceau de cire et un tampon
    r(40, 4, 47, 10, V); tete(r, 12, V, lunettes=True)
    robe_mage(r, 33, 64, B, 35, 52)
    bras(r, True, True, 36)
    r(56, 44, 66, 54, V); r(58, 46, 64, 52, N); r(60, 48, 62, 50, V)
    r(18, 40, 22, 52, B); r(15, 52, 25, 56, V)
    pieds_robe(r); sol_tirets(r, 68)


def noam_dessin(r):
    # le gardien des greniers : barbe, gilet de travail, un trousseau et un dossier
    tete(r, 12, B, barbe=True)
    r(35, 33, 52, 54, V); r(38, 35, 49, 54, B); r(40, 38, 47, 52, N)
    bras(r, True, True, 36)
    for k, x in enumerate((56, 61)): cle(r, x, 44 + k * 3, B)
    r(16, 38, 30, 56, V); r(18, 40, 28, 54, N); r(20, 43, 26, 43, B)
    jambes(r); sol_tirets(r, 68)


def zelia_dessin(r):
    # la marchande de la Halle : foulard, un panier, des rubans de la promo
    r(35, 9, 52, 13, V); r(52, 12, 56, 20, V); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 35, 52)
    for y in range(38, 62, 6): r(36, y, 51, y + 1, B)
    bras(r, True, True, 36)
    r(54, 44, 70, 56, B); r(56, 46, 68, 54, N); r(58, 40, 66, 44, B); r(58, 41, 66, 43, N)
    pieds_robe(r); sol_tirets(r, 68)


def kamal_dessin(r):
    # le greffier du Registre : calotte, longue robe, un énorme livre sous le bras
    r(38, 8, 49, 12, B); tete(r, 12, B)
    robe_mage(r, 33, 64, B, 35, 52)
    r(42, 33, 45, 64, V)
    bras(r, True, True, 36)
    r(54, 30, 70, 54, V); r(56, 32, 68, 52, N); r(57, 34, 67, 34, B); r(57, 38, 63, 38, B)
    pieds_robe(r); sol_tirets(r, 68)


def lamia_dessin(r):
    # la portière des Portes : cape, un badge, une grande clé et une liste de noms
    r(33, 11, 54, 33, V); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 34, 53)
    r(38, 38, 43, 44, B); r(39, 39, 42, 43, N)
    bras(r, True, True, 36)
    cle(r, 58, 40, B)
    r(16, 38, 28, 58, B); r(17, 39, 27, 57, N)
    for y in range(42, 56, 3): r(19, y, 25, y, V)
    pieds_robe(r); sol_tirets(r, 68)


def miguel_dessin(r):
    # le forgeron des sceaux : bandeau, tablier de cuir, un marteau et un sceau rougeoyant
    r(36, 13, 51, 14, V); tete(r, 12, V, barbe=True)
    r(35, 33, 52, 54, B); r(37, 35, 50, 56, V)
    bras(r, True, True, 36)
    r(57, 26, 58, 48, B); r(53, 22, 62, 27, B)
    r(14, 48, 26, 58, V); r(16, 50, 24, 56, N); r(19, 52, 21, 54, V)
    jambes(r, B); sol_tirets(r, 68)


def amina_dessin(r):
    # la gardienne de l'Arche : capuche, un coffre scellé et une lampe
    r(33, 9, 54, 33, B); r(35, 11, 52, 31, N); tete(r, 12, B)
    robe_mage(r, 33, 64, B, 34, 53)
    bras(r, True, True, 36)
    r(54, 44, 70, 58, V); r(56, 46, 68, 56, N); r(60, 49, 64, 53, V); r(54, 50, 70, 50, B)
    r(18, 34, 26, 46, B); r(20, 37, 24, 43, V)
    pieds_robe(r); sol_tirets(r, 68)


def ilyes_dessin(r):
    # le gamin de la gazette : casquette, manches noires d'encre, une liasse de feuilles
    r(36, 9, 51, 12, B); r(49, 11, 55, 12, B); tete(r, 12, B)
    r(35, 33, 52, 54, V)
    r(31, 36, 34, 47, N); r(53, 36, 56, 47, N)
    bras(r, True, True, 36)
    r(54, 38, 68, 56, B); r(56, 40, 66, 54, N)
    for y in range(42, 54, 3): r(57, y, 65, y, B)
    jambes(r); sol_tirets(r, 68)


def clara_dessin(r):
    # la secrétaire du capitaine : caban, un carnet de bord
    r(35, 9, 52, 12, V); r(33, 12, 36, 26, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(38, 33, 49, 54, N)
    for y in range(37, 53, 5): r(40, y, 41, y + 1, B); r(46, y, 47, y + 1, B)
    bras(r, True, True, 36)
    r(16, 40, 28, 54, V); r(18, 42, 26, 52, N); r(19, 44, 25, 44, B)
    jambes(r); sol_tirets(r, 68)


def mehdi_dessin(r):
    # l'organisateur de la fête : grand, une guirlande de lampions sur l'épaule
    r(36, 9, 51, 12, B); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 35, 49, 54, B)
    bras(r, True, True, 36)
    for k in range(6):
        x = 20 + k * 9
        r(x, 30 + abs(k - 2) * 3, x + 3, 34 + abs(k - 2) * 3, V if k % 2 else B)
    jambes(r); sol_tirets(r, 68)


def sara_dessin(r):
    # l'ingénieure du câble : ciré jaune (vert), un câble enroulé sur l'épaule
    r(34, 9, 53, 13, V); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    for k in range(3): r(52 + k, 30 + k, 68 - k, 31 + k, B); r(52 + k, 30 + k, 53 + k, 46 - k, B); r(67 - k, 30 + k, 68 - k, 46 - k, B); r(52 + k, 45 - k, 68 - k, 46 - k, B)
    pieds_robe(r); sol_tirets(r, 68)


def rayan_dessin(r):
    # le bibliothécaire : lunettes rondes, une pile de livres numérisés
    r(36, 10, 51, 12, B); tete(r, 12, B, lunettes=True)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V)
    bras(r, True, True, 36)
    for k in range(4): r(54, 52 - k * 5, 68 - (k % 2) * 2, 55 - k * 5, V if k % 2 else B)
    jambes(r); sol_tirets(r, 68)


def fama_dessin(r):
    # l'étudiante qui corrige : tresses, un cartable plein de copies, un stylo vert
    r(36, 9, 51, 12, B); r(32, 14, 35, 34, B); r(52, 14, 55, 34, B); tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(54, 44, 70, 60, B); r(56, 46, 68, 58, N); r(57, 40, 67, 46, B); r(58, 41, 66, 45, N)
    r(20, 34, 21, 50, V)
    pieds_robe(r); sol_tirets(r, 68)


PORTRAITS = {
    "item_badis.gif": badis_dessin, "item_maeva.gif": maeva_dessin, "item_younes.gif": younes_dessin,
    "item_syrine.gif": syrine_dessin, "item_noam.gif": noam_dessin, "item_zelia.gif": zelia_dessin,
    "item_kamal.gif": kamal_dessin, "item_lamia.gif": lamia_dessin, "item_miguel.gif": miguel_dessin,
    "item_amina.gif": amina_dessin,
    "item_ilyes.gif": ilyes_dessin, "item_clara.gif": clara_dessin, "item_mehdi.gif": mehdi_dessin,
    "item_sara.gif": sara_dessin, "item_rayan.gif": rayan_dessin, "item_fama.gif": fama_dessin,
}


def billet_traversee(nom="item_billet_traversee.gif"):
    """La septième enveloppe : un pli marqué d'une ancre, un billet de traversée qui dépasse, des vagues."""
    from PIL import Image, ImageDraw
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.rectangle([34, 1, 55, 12], fill=V)                                    # le billet qui dépasse
    d.rectangle([36, 3, 53, 10], fill=N)
    for x in range(38, 52, 3): d.point((x, 6), fill=V)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 8):                                               # des vagues
        d.arc([x, 33, x + 8, 39], 180, 360, fill=V)
    d.rectangle([29, 13, 30, 29], fill=N)                                   # l'ancre
    d.rectangle([26, 15, 33, 16], fill=N)
    d.arc([22, 20, 37, 31], 20, 160, fill=N, width=2)
    d.ellipse([27, 10, 32, 14], outline=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_embarcadere.gif": embarcadere, "loc_port_aube.gif": port_aube, "loc_port_aube_fete.gif": port_aube_fete,
    "loc_baie_ile.gif": baie_ile, "loc_poste_quai.gif": poste_quai,
    "loc_maison_noms.gif": m_noms, "loc_maison_phare.gif": m_phare, "loc_maison_poste.gif": m_poste,
    "loc_maison_lettres.gif": m_lettres, "loc_maison_greniers.gif": m_greniers, "loc_maison_halle.gif": m_halle,
    "loc_maison_registre.gif": m_registre, "loc_maison_portes.gif": m_portes, "loc_maison_forge.gif": m_forge,
    "loc_maison_arche.gif": m_arche,
    "cine7_mer_aube.gif": cine_mer_aube, "cine7_quai_laurent.gif": cine_quai_laurent, "cine7_maisons_vides.gif": cine_maisons_vides,
    "cine7_phare_orage.gif": cine_phare_orage, "cine7_maree.gif": cine_maree,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_billet_traversee.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_billet_traversee.gif":
            billet_traversee(nom); n += 1
    print(n, "dessins")
