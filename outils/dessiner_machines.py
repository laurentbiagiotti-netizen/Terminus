"""Dessine Lumen (chapitre 6) : le hall, la cité de nuit et rallumée, le Cœur de Lumen, les seize quartiers,
les seize gardiens, les six habitants des quêtes annexes et la Lanterne de Lumen (la sixième enveloppe).

Même format et même palette que les chapitres précédents (dessiner_lieux.finir : toile 176 x 170 doublée dans le cadre
d'origine ; trois couleurs : noir, vert, blanc ; personnages de dessiner_panne.perso en grille 88 x 85). Le style est
celui du chapitre 8 (dessiner_port.py) : des dégradés tramés réservés aux lueurs et aux halos, des plans successifs,
des sols en perspective, des volumes ombrés, des silhouettes à liseré de lumière. Lumen est une cité souterraine :
une voûte de roche au-dessus des toits, des façades taillées dans la pierre, des lampes partout où il reste du courant.
Usage : python3 outils/dessiner_machines.py [nom...]
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_academie import texte, robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle, cadenas  # noqa: E402
from dessiner_port import trame, degrade, halo, ombrer, faisceau, personnage_ombre, ligne_r, rayures, tonneau  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def reverbere(d, x, y, allume=True):
    """Un réverbère de la cité : un mât à socle, une crosse, une lanterne vitrée ; allumé, un halo vert
    et un cœur blanc ; éteint, des vitres noires."""
    if allume:
        halo(d, x, y - 7, 22, V, 0.7, 18)
    d.rectangle([x - 1, y, x + 1, y + 44], fill=B)
    d.rectangle([x - 4, y + 40, x + 4, y + 44], fill=B)
    d.rectangle([x - 6, y + 44, x + 6, y + 47], fill=B)
    d.line([(x - 2, y + 6), (x - 5, y + 2)], fill=B); d.line([(x + 2, y + 6), (x + 5, y + 2)], fill=B)
    d.polygon([(x - 6, y - 2), (x + 6, y - 2), (x + 4, y - 12), (x - 4, y - 12)], fill=B)
    d.rectangle([x - 4, y - 11, x + 4, y - 3], fill=V if allume else N)
    if allume:
        d.rectangle([x - 1, y - 9, x + 1, y - 5], fill=B)
    else:
        d.line([(x - 3, y - 10), (x + 3, y - 4)], fill=V)
    d.line([(x, y - 11), (x, y - 3)], fill=B)
    d.polygon([(x - 5, y - 12), (x + 5, y - 12), (x, y - 17)], fill=B)
    d.point((x, y - 18), fill=B)


def phare(d, x, y, allume=True, faible=False, rayons=True):
    """Le Phare : une tour rayée qui s'évase, ombrée à droite, une galerie, la lanterne vitrée et son toit.
    Allumé : un halo et deux faisceaux qui balaient ; faible : une lueur à peine ; éteint : des vitres noires."""
    if allume and not faible:
        halo(d, x, y - 10, 34, V, 0.8, 24)
        if rayons:
            rayon(d, x - 4, y - 10, x - 88, y - 34, y - 8)
            rayon(d, x + 4, y - 10, x + 88, y - 14, y + 12)
    elif faible:
        halo(d, x, y - 10, 16, V, 0.55)
    d.polygon([(x - 10, y + 70), (x + 10, y + 70), (x + 6, y), (x - 6, y)], fill=B)
    for k in range(4):
        yy = y + 8 + k * 16
        d.rectangle([x - 7 - k, yy, x + 7 + k, yy + 5], fill=V)
    d.polygon([(x + 3, y), (x + 6, y), (x + 10, y + 70), (x + 5, y + 70)], fill=V)            # le flanc à l'ombre, en aplat
    for k in range(4):
        yy = y + 8 + k * 16
        d.polygon([(x + 3 + k * 0.6, yy), (x + 7 + k, yy), (x + 7 + k, yy + 5), (x + 3 + k * 0.6, yy + 5)], fill=N)
    d.rectangle([x - 2, y + 24, x + 1, y + 28], fill=N)
    d.rectangle([x - 2, y + 50, x + 1, y + 55], fill=N)
    d.rectangle([x - 11, y - 4, x + 11, y], fill=B)                                          # la galerie
    for xx in range(x - 10, x + 11, 3):
        d.point((xx, y - 2), fill=N)
    d.rectangle([x - 6, y - 16, x + 6, y - 4], fill=B)
    d.rectangle([x - 4, y - 14, x + 4, y - 6], fill=V if allume else N)
    if allume and not faible:
        d.rectangle([x - 2, y - 12, x + 2, y - 8], fill=B)
    d.line([(x, y - 14), (x, y - 6)], fill=B if not allume else V)
    d.polygon([(x - 8, y - 16), (x + 8, y - 16), (x, y - 25)], fill=B)
    d.line([(x, y - 25), (x, y - 29)], fill=B)


def rayon(d, x0, y0, x1, y1a, y1b, t0=0.75, t1=0.15, c=B):
    """Un faisceau horizontal qui s'ouvre de (x0, y0) jusqu'à x1, entre y1a et y1b : une lumière tramée qui
    s'éteint en s'éloignant, deux bords nets près de la lanterne."""
    sens = 1 if x1 > x0 else -1
    n = abs(x1 - x0)
    for k in range(n):
        f = k / n
        x = x0 + sens * k
        ya, yb = y0 + (y1a - y0) * f, y0 + (y1b - y0) * f
        trame(d, x, ya, x, yb, c, t0 + (t1 - t0) * f)
    d.line([(x0, y0), (x0 + (x1 - x0) * 0.45, y0 + (y1a - y0) * 0.45)], fill=c)
    d.line([(x0, y0), (x0 + (x1 - x0) * 0.45, y0 + (y1b - y0) * 0.45)], fill=c)


def engrenage(d, x, y, r, c=B, dents=8, moyeu=N):
    """Un engrenage : des dents carrées, une jante, quatre rayons, un moyeu."""
    for k in range(dents):
        a = k * 2 * math.pi / dents
        d.rectangle([x + (r + 1) * math.cos(a) - 2, y + (r + 1) * math.sin(a) - 2,
                     x + (r + 1) * math.cos(a) + 2, y + (r + 1) * math.sin(a) + 2], fill=c)
    d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    if r >= 7:
        d.ellipse([x - r + 3, y - r + 3, x + r - 3, y + r - 3], fill=moyeu)
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            d.line([(x, y), (x + (r - 3) * math.cos(a), y + (r - 3) * math.sin(a))], fill=c, width=2)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=c)
        d.point((x, y), fill=moyeu)
    else:
        d.ellipse([x - r // 2, y - r // 2, x + r // 2, y + r // 2], fill=moyeu)


def caisse(d, x, y, w=20, h=16, c=B):
    """Une caisse en planches : un cadre, des planches, une croix de renfort."""
    x, y, w, h = int(x), int(y), int(w), int(h)
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], fill=N)
    for yy in range(y + 5, y + h - 2, 4):
        d.line([(x + 2, yy), (x + w - 2, yy)], fill=V if c == B else B)
    d.line([(x + 2, y + 2), (x + w - 2, y + h - 2)], fill=c, width=2)


def caisse3d(d, x, y, w=20, h=16, p=6, c=B):
    """Une caisse en volume : la face en planches, le dessus dans la lumière, le flanc dans l'ombre."""
    d.polygon([(x, y), (x + p, y - p // 2), (x + w + p, y - p // 2), (x + w, y)], fill=B)
    d.polygon([(x + w, y), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2), (x + w, y + h)], fill=N)
    d.line([(x + w, y), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2)], fill=V)
    caisse(d, x, y, w, h, c)


def jauge(d, x0, y0, x1, y1, part, c=V):
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    d.rectangle([x0 + 2, y0 + 2, x0 + 2 + int((x1 - x0 - 4) * part), y1 - 2], fill=c)
    for xx in range(x0 + 6, x1 - 2, 6):
        d.line([(xx, y0 + 2), (xx, y0 + 3)], fill=N if xx < x0 + 2 + int((x1 - x0 - 4) * part) else B)


def lampe_suspendue(d, x, y, l=18, t=0.6, r=34):
    """Une lampe pendue à la voûte : un fil, un abat-jour, un halo vert."""
    halo(d, x, y + l + 6, r, V, t, r * 0.8)
    d.line([(x, y), (x, y + l)], fill=B)
    d.polygon([(x - 6, y + l + 5), (x + 6, y + l + 5), (x + 3, y + l), (x - 3, y + l)], fill=B)
    d.rectangle([x - 2, y + l + 5, x + 2, y + l + 7], fill=V)


def sol(d, y0, fx=88, c=V, x0=0, x1=W, pas0=3, n=9, ecart=26):
    """Un plancher (ou un dallage) en perspective : des joints qui fuient vers (fx, y0), des lignes qui s'espacent."""
    d.rectangle([x0, y0, x1, H], fill=N)
    ecart = ecart * 1.4
    n = max(1, int(n * 0.7))
    for k in range(-n - 2, n + 3):
        d.line([(fx + k * 7, y0), (fx + k * ecart, H)], fill=c)
    yy, pas = y0 + 3, pas0 + 1
    while yy < H:
        d.line([(x0, yy), (x1, yy)], fill=c)
        yy += pas
        pas += 3


def piece(d, fond, fx=88, mur_g=20, mur_d=156, c=B):
    """Une salle profonde : le mur du fond (fond = (x0, y0, x1, y1)), les arêtes des murs et du plafond qui
    viennent vers nous, le plancher en perspective."""
    x0, y0, x1, y1 = fond
    sol(d, y1, fx, V, pas0=3, n=8, ecart=24)
    for (a, b) in (((x0, y0), (0, 0)), ((x1, y0), (W, 0)), ((x0, y1), (0, H)), ((x1, y1), (W, H))):
        d.line([a, b], fill=c)
    d.rectangle([x0, y0, x1, y1], outline=c)


def voute(d, y_cle=6, y_pied=74, lueur=0.5, eclats=24, graine=1, horizon=None):
    """La voûte de roche de Lumen : la lueur de la cité monte vers elle (un dégradé vert tramé), puis l'arc
    taillé dans la pierre, ses claveaux et ses nervures, et des éclats de cristal dans la roche."""
    rnd = random.Random(graine)
    horizon = horizon if horizon is not None else y_pied + 30
    if lueur:
        degrade(d, 0, y_cle, W, horizon, V, 0, lueur)

    def arc(x, dy=0):
        return y_cle + dy + (y_pied - y_cle) * ((x - 88) / 88) ** 2

    for x in range(W + 1):
        d.line([(x, 0), (x, arc(x))], fill=N)
    d.line([(x, arc(x)) for x in range(0, W + 1, 2)], fill=B)
    d.line([(x, arc(x, -6)) for x in range(0, W + 1, 2)], fill=V)
    for x in range(4, W, 11):                                                                # les claveaux
        d.line([(x, arc(x)), (x + (x - 88) * 0.04, arc(x, -6))], fill=B)
    for x in (30, 88, 146):                                                                  # les nervures
        d.line([(x, arc(x, -6)), (88 + (x - 88) * 0.4, 0)], fill=V)
    for _ in range(eclats):
        x = rnd.randint(2, W - 3)
        y = rnd.randint(1, max(2, int(arc(x, -9))))
        if y < arc(x, -8):
            d.point((x, y), fill=B if rnd.random() < 0.6 else V)
            if rnd.random() < 0.15:
                d.point((x + 1, y), fill=V); d.point((x - 1, y), fill=V)


def facades(d, y, rang, allume, graine=3, x0=-6, x1=W + 6):
    """Une rangée de façades taillées dans la roche. Rang 0, au loin : des silhouettes vertes à fenêtres noires
    (blanches si elles brillent). Rang 1, devant : des façades noires cerclées de blanc, des fenêtres vertes
    allumées ou noires barrées. allume : la part des fenêtres allumées (0 à 1)."""
    rnd = random.Random(graine)
    x = x0 + rnd.randint(0, 6)
    while x < x1:
        if rang == 0:
            w, h = rnd.randint(13, 21), rnd.randint(18, 34)
        else:
            w, h = rnd.randint(20, 30), rnd.randint(22, 38)
        toit = rnd.choice(("plat", "pointe", "tour", "plat"))
        fill = V if rang == 0 else N
        d.rectangle([x, y - h, x + w, y], fill=fill)
        if toit == "pointe":
            d.polygon([(x - 1, y - h), (x + w + 1, y - h), (x + w // 2, y - h - w // 2)], fill=fill)
        elif toit == "tour":
            d.rectangle([x + w // 3, y - h - 8, x + 2 * w // 3, y - h], fill=fill)
            d.polygon([(x + w // 3 - 1, y - h - 8), (x + 2 * w // 3 + 1, y - h - 8), (x + w // 2, y - h - 13)], fill=fill)
        else:
            for xx in range(x, x + w, 4):
                d.rectangle([xx, y - h - 2, xx + 1, y - h], fill=fill)
        if rang == 1:
            if toit == "pointe":
                d.line([(x - 1, y - h), (x + w // 2, y - h - w // 2), (x + w + 1, y - h)], fill=B)
            elif toit == "tour":
                d.line([(x, y - h), (x + w // 3, y - h)], fill=B); d.line([(x + 2 * w // 3, y - h), (x + w, y - h)], fill=B)
                d.line([(x + w // 3, y - h), (x + w // 3, y - h - 8), (x + w // 2, y - h - 13), (x + 2 * w // 3, y - h - 8)], fill=B)
            else:
                d.line([(x, y - h), (x + w, y - h)], fill=B)
            d.line([(x, y - h), (x, y)], fill=B)
        fw = 3 if rang == 0 else 4
        for fy in range(y - h + 5, y - 6, 8 if rang == 0 else 9):
            for fx in range(x + 3, x + w - fw - 1, fw + 3 + (rang * 2)):
                lum = rnd.random() < allume
                if rang == 0:
                    d.rectangle([fx, fy, fx + fw - 1, fy + 3], fill=B if lum else N)
                else:
                    if lum:
                        d.rectangle([fx, fy, fx + fw, fy + 5], fill=V)
                        d.rectangle([fx + 1, fy + 1, fx + fw - 1, fy + 2], fill=B)
                    else:
                        d.rectangle([fx, fy, fx + fw, fy + 5], outline=B)
                        d.point((fx + fw // 2, fy + 3), fill=B)
        if rang == 1:                                                                        # la porte en arc
            px = x + w // 2
            d.rectangle([px - 3, y - 8, px + 3, y], fill=B)
            d.rectangle([px - 2, y - 7, px + 2, y], fill=V if rnd.random() < allume else N)
        x += w + rnd.randint(1, 4)


def dallage(d, y0, fx=88, c=V, ecart=22):
    """La place pavée, en perspective."""
    sol(d, y0, fx, c, pas0=2, n=10, ecart=ecart)


def radio(d, x, y):
    """La radio de Grace, posée : un boîtier, un cadran, une antenne et ses ondes."""
    d.rectangle([x, y - 10, x + 16, y], fill=B)
    d.rectangle([x + 2, y - 8, x + 9, y - 3], fill=V)
    d.line([(x + 3, y - 6), (x + 8, y - 6)], fill=N)
    d.ellipse([x + 11, y - 8, x + 14, y - 5], fill=N)
    d.line([(x + 14, y - 10), (x + 20, y - 22)], fill=B)
    d.point((x + 20, y - 23), fill=V)
    for k in (3, 6):
        d.arc([x + 20 - k, y - 23 - k, x + 20 + k, y - 23 + k], 270, 360, fill=V)


def flamme(d, x, y, h=16, c=V, c2=B):
    """Une flamme en deux couleurs : la langue verte, le cœur blanc."""
    f = h / 16
    d.polygon([(x - 6 * f, y), (x - 5 * f, y - 7 * f), (x - 2 * f, y - 5 * f), (x, y - h), (x + 3 * f, y - 6 * f),
               (x + 5 * f, y - 9 * f), (x + 6 * f, y)], fill=c)
    d.polygon([(x - 3 * f, y), (x - 1 * f, y - 5 * f), (x + 1 * f, y - 9 * f), (x + 2 * f, y - 4 * f), (x + 3 * f, y)], fill=c2)


# ------------------------------------------------------------------
# Le hall, la cité, le Cœur
# ------------------------------------------------------------------

def cite_lumen(etat):
    """La place de Lumen sous sa voûte. etat : 'crepuscule' (le hall : quelques fenêtres, le Phare brûle à peine),
    'nuit' (la Longue Nuit : tout est noir, un seul réverbère tient) ou 'rallumee' (tout brille, le Phare balaie)."""
    im, d = toile()
    allume = {"crepuscule": 0.3, "nuit": 0.04, "rallumee": 0.85}[etat]
    lueur = {"crepuscule": 0.45, "nuit": 0.15, "rallumee": 0.8}[etat]
    voute(d, 4, 66, lueur, 30 if etat != "rallumee" else 16, 61, horizon=112)
    if etat == "rallumee":
        degrade(d, 0, 74, W, 112, B, 0, 0.35)
    facades(d, 104, 0, allume, graine=5)
    phare(d, 88, 34, allume=(etat != "nuit"), faible=(etat == "crepuscule"))
    if etat == "rallumee":
        for (x, y) in ((40, 30), (138, 26)):
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=B)
    facades(d, 124, 1, allume, graine=9 if etat != "rallumee" else 9)
    dallage(d, 124)
    if etat != "nuit":
        halo(d, 88, 150, 60, V, 0.25 if etat == "crepuscule" else 0.45, 20)
    d.line([(0, 124), (W, 124)], fill=B)
    if etat == "crepuscule":
        reverbere(d, 24, 104, True); reverbere(d, 152, 104, False)
        d.ellipse([110, 130, 132, 152], fill=B); d.ellipse([113, 133, 129, 149], fill=N)    # l'horloge de la place
        for k in range(12):
            a = k * math.pi / 6
            d.point((121 + 6 * math.cos(a), 141 + 6 * math.sin(a)), fill=V)
        d.line([(121, 141), (121, 135)], fill=B); d.line([(121, 141), (126, 141)], fill=V)
        d.rectangle([119, 152, 123, 166], fill=B); d.rectangle([115, 166, 127, 168], fill=B)
        radio(d, 46, 162)
        personnage_ombre(d, 71, 168, 40, manteau=True, c=B)                                # Laurent, liseré par le Phare
        personnage_ombre(d, 72, 167, 40, manteau=True, c=B)
        personnage_ombre(d, 72, 168, 40, manteau=True, c=N)
    elif etat == "nuit":
        reverbere(d, 36, 108, False); reverbere(d, 140, 108, True)
        for (x, y) in ((96, 150), (104, 158)):                                             # des papiers qui traînent
            d.polygon([(x, y), (x + 6, y - 1), (x + 7, y + 3), (x + 1, y + 4)], fill=V)
    else:
        for x in (16, 58, 118, 160):
            reverbere(d, x, 106, True)
        for k in range(24):                                                                # les lampions
            t = k / 23
            xa, ya = 4 + 168 * t, 92 + 14 * (2 * t - 1) ** 2
            d.point((xa, ya), fill=B if k % 2 else V)
        for (x, y) in ((70, 166), (84, 164), (100, 167), (112, 165)):
            personnage_ombre(d, x, y, 22, c=B)
    return im


def lumen():
    """Le hall de Lumen : la place sous la voûte, peu de fenêtres allumées, le Phare qui brûle à peine,
    l'horloge de la place, la radio de Grace, Laurent qui attend."""
    return cite_lumen("crepuscule")


def lumen_nuit():
    """Lumen sous la Longue Nuit : les façades noires, le Phare éteint, un seul réverbère qui tient."""
    return cite_lumen("nuit")


def lumen_rallumee():
    """Lumen rallumée : toutes les fenêtres brillent, le Phare balaie la voûte, la foule sur la place."""
    return cite_lumen("rallumee")


def coeur_lumen():
    """Le Cœur de Lumen : sous une coupole nervurée, la machine lumen, une haute baie de serveurs qui bat
    dans un halo vert ; des câbles partent vers les quartiers ; seize voyants, dont plusieurs éteints."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for k, r in enumerate((86, 74, 62)):                                                     # la coupole
        d.arc([88 - r, 70 - r, 88 + r, 70 + r], 180, 360, fill=B if k == 0 else V, width=2 if k == 0 else 1)
    for k in range(9):
        a = math.pi + (k + 0.5) * math.pi / 9
        d.line([(88 + 62 * math.cos(a), 70 + 62 * math.sin(a)), (88 + 86 * math.cos(a), 70 + 86 * math.sin(a))], fill=B)
    halo(d, 88, 82, 70, V, 0.75, 56)
    sol(d, 128, 88, V, pas0=3, n=8, ecart=26)
    d.ellipse([28, 120, 148, 140], fill=B); d.ellipse([32, 122, 144, 138], fill=N)           # le socle
    for k in range(10):
        a = k * math.pi / 5
        d.point((88 + 50 * math.cos(a), 130 + 7 * math.sin(a)), fill=V)
    for (sx, ex) in ((60, -10), (70, 30), (106, 150), (116, 190)):                          # les câbles vers les quartiers
        d.line([(sx, 128), ((sx + ex) / 2, 150), (ex, H)], fill=V, width=3)
        d.line([(sx, 128), ((sx + ex) / 2, 150), (ex, H)], fill=N, width=1)
    d.rectangle([60, 20, 116, 130], fill=B)                                                  # la baie
    d.rectangle([106, 20, 116, 130], fill=V)                                                 # son flanc, en aplat
    d.rectangle([64, 24, 104, 126], fill=N)
    for k in list(range(3)) + list(range(6, 9)):
        y = 28 + k * 11
        d.rectangle([67, y, 101, y + 7], fill=B)
        d.rectangle([69, y + 2, 82, y + 5], fill=N)
        d.point((87, y + 3), fill=V if k % 3 else N); d.point((90, y + 3), fill=V if k % 2 else N)
        d.line([(94, y + 2), (99, y + 2)], fill=N); d.line([(94, y + 4), (99, y + 4)], fill=N)
    cy = 78                                                                                  # le Cœur, une lueur ronde qui bat
    halo(d, 84, cy, 21, B, 0.6, 18)
    d.ellipse([68, cy - 16, 100, cy + 16], fill=B)
    d.ellipse([71, cy - 13, 97, cy + 13], fill=V)
    d.ellipse([76, cy - 8, 92, cy + 8], fill=B)
    d.ellipse([80, cy - 4, 88, cy + 4], fill=V)
    d.line([(84, cy - 13), (84, cy + 13)], fill=N); d.line([(71, cy), (97, cy)], fill=N)
    for x in (108, 112):
        for y in range(26, 128, 6):
            d.point((x, y), fill=N)
    d.polygon([(56, 20), (120, 20), (112, 12), (64, 12)], fill=B)                            # le chapiteau
    d.rectangle([84, 4, 92, 12], fill=V); d.rectangle([86, 6, 90, 10], fill=B)
    pts = [(20, 104), (34, 104), (38, 96), (42, 112), (46, 100), (50, 104), (56, 104)]      # le pouls, qui faiblit
    d.line(pts, fill=B)
    d.line([(120, 104), (130, 104), (133, 100), (136, 106), (139, 104), (156, 104)], fill=V)
    for i in range(16):                                                                      # les seize quartiers
        x = 14 + (i % 4) * 8 if i < 8 else 132 + (i % 4) * 8
        y = 46 + (i // 4 % 2) * 8
        on = i not in (2, 5, 9, 11, 14)
        d.rectangle([x, y, x + 5, y + 5], fill=B)
        d.rectangle([x + 1, y + 1, x + 4, y + 4], fill=V if on else N)
    for x in (12, 130):
        d.rectangle([x, 42, x + 34, 62], outline=B)
    return im


# ------------------------------------------------------------------
# Les seize quartiers
# ------------------------------------------------------------------

def q_docks():
    """Les Docks : un entrepôt sous charpente, des caisses empilées jusqu'à la voûte de part et d'autre,
    l'allée bouchée ; la jauge à 97 %."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 92
    halo(d, fx, fy - 10, 40, V, 0.55, 30)
    for k in range(7, -1, -1):                                                               # les fermes de la charpente
        s = 1 / (1 + k * 0.45)
        hw, ht = 96 * s, 92 * s
        c = B if k < 4 else V
        d.line([(fx - hw, fy - ht * 0.55), (fx, fy - ht), (fx + hw, fy - ht * 0.55)], fill=c, width=2 if k < 2 else 1)
        d.line([(fx - hw * 0.5, fy - ht * 0.78), (fx + hw * 0.5, fy - ht * 0.78)], fill=c)
    sol(d, fy, fx, V, pas0=2, n=6, ecart=30)
    for cote in (-1, 1):                                                                     # les murs de caisses jusqu'au toit
        for k in range(9, -1, -1):
            s0, s1 = 1 / (1 + k * 0.45), 1 / (1 + (k + 1) * 0.45)
            xo, xi = fx + cote * 94 * s0, fx + cote * 94 * s1
            xa, xb = min(xo, xi), max(xo, xi)
            w = xb - xa
            if w < 3:
                continue
            yb = fy + 70 * s0
            yt = fy - 50 * s0
            h = max(3, w * 0.75)
            r_ = 0
            y = yb - h
            while y > yt - h * 0.5:
                c = V if (k * 3 + r_ + (cote > 0)) % 4 == 0 else B
                if w >= 9:
                    caisse(d, xa + 1, y, w - 2, h - 1, c)
                else:
                    d.rectangle([xa, y, xb - 1, y + h - 2], fill=c)
                    d.line([(xa, y + h / 2), (xb - 1, y + h / 2)], fill=N)
                y -= h
                r_ += 1
    lampe_suspendue(d, 88, 0, 26, 0.0, 10)
    for (x, y, w, h) in ((44, 140, 32, 24), (78, 144, 28, 22), (60, 116, 26, 20), (92, 122, 24, 20), (74, 100, 20, 16)):   # l'allée bouchée
        caisse3d(d, x, y, w, h, 6, B if (x // 2) % 3 else V)
    jauge(d, 30, 156, 120, 165, 0.97, V)
    texte(d, 126, 155, "97%", B)
    return im


def q_archives():
    """Les Archives : un couloir de meubles à fiches qui fuit vers le fond, tous les tiroirs étiquetés et pleins ;
    une lampe ; au premier plan, un balai contre un tiroir ouvert, qui déborde de fiches."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 70
    halo(d, fx, fy, 40, V, 0.55, 34)
    sol(d, 116, fx, V, pas0=3, n=4, ecart=20)
    for cote in (-1, 1):
        for k in range(8):
            t0, t1 = k / 8, (k + 1) / 8
            xa = fx + cote * (14 + 74 * (1 - t0) ** 1.5)
            xb = fx + cote * (14 + 74 * (1 - t1) ** 1.5)
            s = (1 - t0) ** 1.5
            top, bot = fy - 8 - 62 * s, fy + 8 + 46 * s
            s2 = (1 - t1) ** 1.5
            top2, bot2 = fy - 8 - 62 * s2, fy + 8 + 46 * s2
            d.polygon([(xa, top), (xb, top2), (xb, bot2), (xa, bot)], fill=B)
            n_ = 5
            for j in range(n_):
                ya, yb = top + (bot - top) * (j + 0.15) / n_, top + (bot - top) * (j + 0.85) / n_
                yc, yd = top2 + (bot2 - top2) * (j + 0.15) / n_, top2 + (bot2 - top2) * (j + 0.85) / n_
                m = 0.18
                d.polygon([(xa + (xb - xa) * m, ya + (yc - ya) * m), (xb - (xb - xa) * m, yc - (yc - ya) * m),
                           (xb - (xb - xa) * m, yd - (yd - yb) * m), (xa + (xb - xa) * m, yb + (yd - yb) * m)], fill=N)
                cx, cy = (xa + xb) / 2, (ya + yb + yc + yd) / 4
                e = max(1, abs(xb - xa) * 0.15)
                d.rectangle([cx - e, cy - 1, cx + e, cy], fill=V)
        ombrer(im, 0 if cote < 0 else fx, 0, fx if cote < 0 else W, H, B, V, 0.0, 0.0)
    for k, (dx, dy) in enumerate(((0, 0), (3, -2), (6, 1), (9, -1))):                        # le tiroir ouvert et ses fiches
        d.rectangle([110 + dx, 128 + dy, 118 + dx, 138 + dy], fill=B, outline=N)
    d.polygon([(100, 136), (148, 136), (152, 152), (96, 152)], fill=B)
    d.polygon([(103, 139), (145, 139), (148, 150), (100, 150)], fill=N)
    d.rectangle([118, 143, 128, 146], fill=V)
    for (x, y) in ((92, 158), (104, 162), (140, 160), (150, 166)):                           # des fiches au sol
        d.polygon([(x, y), (x + 7, y - 1), (x + 8, y + 3), (x + 1, y + 4)], fill=B)
    d.line([(40, 104), (24, 162)], fill=B, width=3)                                          # le balai
    d.polygon([(14, 158), (34, 162), (32, 170), (10, 168)], fill=V)
    for x in range(13, 34, 3):
        d.line([(x, 164), (x - 1, 170)], fill=N)
    d.rectangle([20, 156, 30, 160], fill=B)
    return im


def q_gazette():
    """La Gazette : une rotative, ses cylindres et son grand volant ; la bande de papier qui en sort et
    s'enroule sur un rouleau énorme qui déborde ; des feuilles partout au sol."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    lampe_suspendue(d, 60, 0, 14, 0.55, 40)
    sol(d, 126, 88, V, pas0=3, n=8, ecart=24)
    d.rectangle([10, 40, 96, 118], fill=B)                                                   # le bâti de la rotative
    d.rectangle([14, 44, 92, 114], fill=N)
    for (x, y, r) in ((32, 62, 12), (64, 62, 12), (32, 94, 12), (64, 94, 12)):              # les cylindres
        d.ellipse([x - r, y - r, x + r, y + r], fill=B)
        d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], fill=V)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B)
        d.arc([x - r + 3, y - r + 3, x + r - 3, y + r - 3], 200, 290, fill=B)
    ombrer(im, 14, 44, 92, 114, V, N, 0.0, 0.5, 'h')
    d.line([(48, 40), (48, 118)], fill=B)
    engrenage(d, 100, 36, 18, B, 12)                                                         # le grand volant
    d.rectangle([10, 118, 96, 126], fill=B)
    for x in (14, 88):
        d.rectangle([x, 126, x + 6, 134], fill=B)
    pts = [(92, 78), (112, 82), (128, 92)]                                                   # la bande de papier
    d.line(pts, fill=B, width=5)
    d.line(pts, fill=N, width=1)
    cx, cy, r = 138, 112, 30                                                                 # le rouleau qui déborde
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B)
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 300, 120, fill=V)
    for k in range(6, r, 4):
        d.arc([cx - k, cy - k, cx + k, cy + k], 0, 360, fill=N)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=B)
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=N)
    d.polygon([(cx - 6, cy + r - 2), (cx + 30, H), (cx - 40, H)], fill=B)                   # le papier qui se déroule
    for k in range(3):
        d.line([(cx - 8 - k * 10, H - 6 + k * 2), (cx + 10 - k * 6, H - 6 + k * 2)], fill=V)
    for (x, y, a) in ((20, 146, 0), (44, 156, 1), (70, 144, 0), (6, 162, 1), (90, 162, 0)):   # les feuilles
        if a:
            d.polygon([(x, y), (x + 14, y - 3), (x + 16, y + 6), (x + 2, y + 9)], fill=B)
        else:
            d.polygon([(x, y + 2), (x + 13, y), (x + 14, y + 8), (x + 1, y + 10)], fill=B)
        d.line([(x + 3, y + 3), (x + 11, y + 2)], fill=N); d.line([(x + 3, y + 6), (x + 9, y + 5)], fill=N)
    for (x, y) in ((118, 40), (150, 56), (108, 60)):                                        # des feuilles qui volent
        d.polygon([(x, y), (x + 8, y + 2), (x + 6, y + 8), (x - 2, y + 6)], fill=B)
    return im


def q_forges():
    """Les Forges : une enfilade de fourneaux en briques qui fuit vers le fond, tous éteints sauf un qui rugit
    et embrase la salle ; devant lui, un tas de charbon presque vide et une pelle ; le soufflet."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    sol(d, 112, 88, V, pas0=3, n=8, ecart=26)
    halo(d, 52, 92, 70, V, 0.85, 54)
    for k in range(4, -1, -1):                                                               # les fourneaux, de droite
        s = 1 / (1 + k * 0.55)
        x = 88 + 70 * s - 30 * s
        y = 112
        w, h = 34 * s, 70 * s
        d.rectangle([x, y - h, x + w, y], fill=B)
        for yy in range(int(y - h) + 3, int(y), max(2, int(5 * s))):
            d.line([(x, yy), (x + w, yy)], fill=N)
        d.pieslice([x + w * 0.2, y - h * 0.55, x + w * 0.8, y - h * 0.05], 180, 360, fill=N)
        d.rectangle([x + w * 0.2, y - h * 0.3, x + w * 0.8, y - 1], fill=N)
        d.rectangle([x + w * 0.35, y - h - 12 * s, x + w * 0.65, y - h], fill=B)
    x, y, w, h = 18, 112, 66, 92                                                             # le fourneau qui rugit
    d.rectangle([x, y - h, x + w, y], fill=B)
    for r_, yy in enumerate(range(y - h + 2, y, 6)):
        d.line([(x, yy), (x + w, yy)], fill=N)
        for xx in range(x + (r_ % 2) * 6, x + w, 12):
            d.line([(xx, yy), (xx, yy + 5)], fill=N)
    d.rectangle([x + 18, y - h - 20, x + 48, y - h], fill=B)
    halo(d, x + 33, y - 32, 30, B, 0.7, 26)
    d.pieslice([x + 12, y - 62, x + 54, y - 20], 180, 360, fill=V)
    d.rectangle([x + 12, y - 41, x + 54, y - 2], fill=V)
    flamme(d, x + 24, y - 4, 26); flamme(d, x + 40, y - 4, 32); flamme(d, x + 33, y - 4, 20)
    for (dx, dy) in ((-14, -44), (6, -56), (20, -48), (-2, -66)):                            # les étincelles
        d.point((x + 33 + dx, y + dy), fill=B)
    d.polygon([(22, 162), (40, 146), (52, 150), (64, 162)], fill=B)                          # le charbon, presque fini
    for (x, y) in ((34, 156), (44, 152), (50, 158), (40, 160), (56, 160)):
        d.rectangle([x, y, x + 2, y + 1], fill=N)
    d.line([(70, 128), (96, 166)], fill=B, width=2)                                          # la pelle
    d.polygon([(90, 160), (102, 158), (106, 168), (94, 170)], fill=B)
    d.polygon([(132, 138), (164, 128), (164, 156)], fill=V)                                  # le soufflet
    for k in range(3):
        d.line([(136 + k * 9, 137 - k * 3), (136 + k * 9, 141 + k * 4)], fill=N)
    d.rectangle([112, 140, 134, 144], fill=B)
    d.rectangle([162, 136, 172, 148], fill=B)
    return im


def q_horloge():
    """La Tour de l'Horloge, de l'intérieur : le grand cadran vu de dos, éclairé par le jour ; un train
    d'engrenages de bronze, dont un qui s'emballe ; dans l'escalier en colimaçon, des spectres qui ne partent pas."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    cx, cy, r = 112, 54, 46                                                                  # le cadran, à contre-jour
    halo(d, cx, cy, r + 26, V, 0.6)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B)
    d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=V)
    d.ellipse([cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14], outline=B)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=B, width=3)
    for k in range(12):                                                                      # les chiffres, à l'envers
        a = k * math.pi / 6
        d.rectangle([cx + (r - 9) * math.cos(a) - 1, cy + (r - 9) * math.sin(a) - 2,
                     cx + (r - 9) * math.cos(a) + 1, cy + (r - 9) * math.sin(a) + 2], fill=N)
    d.line([(cx, cy), (cx - 22, cy - 18)], fill=N, width=3); d.line([(cx, cy), (cx + 6, cy - 32)], fill=N, width=2)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=N)
    d.line([(cx, cy), (cx + 30, 116)], fill=B, width=3)                                     # l'arbre de transmission
    engrenage(d, 142, 120, 18, B, 12)
    engrenage(d, 112, 130, 11, V, 9)
    engrenage(d, 86, 108, 14, B, 10)
    for k in range(4):                                                                       # celui qui s'emballe
        d.arc([142 - 26 - k * 3, 120 - 26 - k * 3, 142 + 26 + k * 3, 120 + 26 + k * 3], 190 + k * 8, 250 + k * 8, fill=V)
    d.rectangle([0, 150, W, H], fill=B)                                                      # le plancher de la tour
    for yy in range(154, H, 5):
        d.line([(0, yy), (W, yy)], fill=N)
    for k in range(9):                                                                       # l'escalier en colimaçon
        y = 150 - k * 15
        x = 34 + 20 * math.sin(k * 0.9)
        d.polygon([(34, y), (x + 14, y - 4), (x + 16, y), (34, y + 3)], fill=B)
    d.rectangle([32, 0, 36, 150], fill=B)
    for (x, y) in ((54, 112), (18, 82), (50, 54)):                                           # les spectres
        halo(d, x, y, 12, V, 0.7, 16)
        d.ellipse([x - 4, y - 12, x + 4, y - 4], fill=V)
        d.polygon([(x - 6, y - 4), (x + 6, y - 4), (x + 7, y + 10), (x + 3, y + 7), (x, y + 10), (x - 3, y + 7), (x - 7, y + 10)], fill=V)
        d.point((x - 2, y - 9), fill=N); d.point((x + 2, y - 9), fill=N)
    return im


def cuve(im, d, x, y, w, h, niveau, deborde=False):
    """Une cuve cylindrique en volume, en aplats : la face éclairée blanche, le flanc vert, le bord noir ;
    un dôme, des cerclages, un regard qui montre le niveau."""
    q = w // 4
    d.ellipse([x, y + h - q, x + w, y + h + q], fill=N)
    d.ellipse([x, y + h - q, x + w, y + h + q], outline=B)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + w * 0.62, y, x + w * 0.9, y + h], fill=V)
    d.rectangle([x + w * 0.9, y, x + w, y + h], fill=N)
    d.line([(x + w, y), (x + w, y + h)], fill=V)
    d.chord([x, y + h - q, x + w, y + h + q], 0, 180, fill=B)
    d.chord([x + w * 0.62, y + h - q, x + w, y + h + q], 0, 90, fill=V)
    d.ellipse([x, y - q, x + w, y + q], fill=B)
    d.ellipse([x + 3, y - q + 2, x + w - 3, y + q - 2], outline=V)
    d.rectangle([x + w // 2 - 2, y - q - 4, x + w // 2 + 2, y - q + 2], fill=B)
    gx0, gx1 = x + w // 2 - 6, x + w // 2 + 1
    d.rectangle([gx0, y + 6, gx1, y + h - 4], fill=N)
    yn = y + h - 4 - int((h - 10) * niveau)
    d.rectangle([gx0 + 1, yn, gx1 - 1, y + h - 5], fill=V)
    d.line([(gx0 + 1, yn), (gx1 - 1, yn)], fill=B)
    for yy in (y + h // 3, y + 2 * h // 3):
        d.line([(x, yy), (gx0 - 1, yy)], fill=N); d.line([(gx1 + 1, yy), (x + w, yy)], fill=N)
    if deborde:
        d.polygon([(x + 2, y - 2), (x + w - 2, y - 2), (x + w + 4, y + 4), (x - 4, y + 4)], fill=V)
        for k, xx in enumerate((x - 3, x + w + 2)):
            d.line([(xx, y + 2), (xx + (k * 2 - 1) * 2, y + h + 10)], fill=V, width=2)
        d.ellipse([x - 12, y + h + 6, x + w + 12, y + h + 16], fill=V)


def q_citernes():
    """Les Citernes : trois cuves sur un caillebotis, reliées par des tuyaux à vannes ; celle de la base
    déborde ; dessous, la grande réserve commune, à moitié vide."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    lampe_suspendue(d, 88, 0, 8, 0.45, 50)
    for y in range(0, 74, 12):                                                               # le mur de pierre, au fond
        d.line([(0, y), (W, y)], fill=V)
        for x in range(-11 + (y // 12 % 2) * 11, W, 22):
            d.line([(x, y), (x, y + 12)], fill=V)
    d.rectangle([0, 74, W, 78], fill=B)
    for x in range(0, W, 4):
        d.line([(x, 74), (x, 78)], fill=N)
    cuve(im, d, 14, 24, 34, 46, 0.95, deborde=True)
    cuve(im, d, 72, 24, 34, 46, 0.55)
    cuve(im, d, 128, 24, 34, 46, 0.4)
    for x in (31, 89, 145):
        d.line([(x, 82), (x, 104)], fill=B, width=3)
        d.ellipse([x - 4, 88, x + 4, 96], fill=V); d.line([(x - 5, 92), (x + 5, 92)], fill=N)   # la vanne
    d.line([(31, 104), (145, 104)], fill=B, width=3)
    d.rectangle([20, 112, 156, 160], fill=B)                                                 # la réserve commune
    d.ellipse([20, 104, 156, 120], fill=B)
    d.rectangle([24, 116, 152, 156], fill=N)
    d.rectangle([24, 136, 152, 156], fill=V)
    for x in range(26, 152, 9):
        d.line([(x, 136), (x + 4, 136)], fill=B)
    for x in range(30, 150, 13):
        d.line([(x, 142), (x + 6, 142)], fill=N)
    d.rectangle([128, 116, 152, 156], fill=N)
    d.rectangle([128, 136, 140, 156], fill=V)
    for yy in (116, 126, 136, 146):
        d.line([(20, yy), (24, yy)], fill=B); d.line([(152, yy), (156, yy)], fill=B)
    d.ellipse([84, 110, 92, 116], fill=N)
    d.rectangle([0, 160, W, H], fill=B)
    for x in range(0, W, 5):
        d.line([(x, 160), (x, H)], fill=N)
    return im


def q_porte():
    """La Porte du Matin : un grand portail à deux battants dans la roche, entrouvert sur le jour (une lame de
    lumière qui tombe sur les dalles) ; un cadenas ; à côté, clouée, la liste des salles, une ligne rayée."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for x in range(0, W, 18):                                                                # la roche taillée
        for y in range(0, 126, 14):
            d.rectangle([x + (y // 14 % 2) * 9, y, x + (y // 14 % 2) * 9 + 16, y + 12], outline=V)
    d.pieslice([38, 6, 138, 106], 180, 360, fill=B)                                          # l'arc et ses claveaux
    d.rectangle([38, 56, 138, 126], fill=B)
    d.pieslice([46, 14, 130, 98], 180, 360, fill=N)
    d.rectangle([46, 56, 130, 126], fill=N)
    for k in range(11):
        a = math.pi + k * math.pi / 10
        d.line([(88 + 42 * math.cos(a), 56 + 42 * math.sin(a)), (88 + 50 * math.cos(a), 56 + 50 * math.sin(a))], fill=N)
    degrade(d, 86, 16, 92, 126, B, 0.9, 0.9)                                                 # le jour par l'entrebâillement
    for side in (-1, 1):                                                                     # les battants cloutés
        x0, x1 = (48, 85) if side < 0 else (93, 128)
        for x in range(x0 + 4, x1, 8):
            d.line([(x, 30 if abs(x - 88) < 20 else 48), (x, 124)], fill=V)
        for y in (66, 104):
            d.rectangle([x0, y, x1, y + 3], fill=B)
            for x in range(x0 + 3, x1, 6):
                d.point((x, y + 1), fill=N)
    for y in range(126, H):                                                                  # la lame de lumière au sol
        e = (y - 126) * 0.9
        trame(d, 86 - e, y, 92 + e, y, B, 0.55 - (y - 126) / 120)
    sol(d, 126, 88, V, pas0=3, n=0, ecart=20)
    for y in range(127, H):
        e = (y - 126) * 0.9
        trame(d, 86 - e * 0.6, y, 92 + e * 0.6, y, B, 0.5 - (y - 126) / 110)
    d.line([(0, 126), (W, 126)], fill=B)
    cadenas(d, 88, 84)
    d.rectangle([146, 50, 172, 92], fill=B); d.rectangle([148, 52, 170, 90], fill=N)        # la liste des salles
    for k, y in enumerate(range(57, 88, 5)):
        d.line([(151, y), (166 - (k * 3) % 7, y)], fill=V if k != 3 else B)
    d.line([(149, 70), (169, 74)], fill=B, width=2)
    d.rectangle([157, 47, 161, 51], fill=V)
    return im


def automate(d, x, y, s=1.0, c=B, travaille=True):
    """Un automate de bronze : une tête à hublots, un corps à manivelle, deux bras articulés sur l'établi."""
    u = s
    d.rectangle([x - 6 * u, y - 34 * u, x + 6 * u, y - 24 * u], fill=c)
    d.rectangle([x - 4 * u, y - 31 * u, x - 1 * u, y - 28 * u], fill=V if travaille else N)
    d.rectangle([x + 1 * u, y - 31 * u, x + 4 * u, y - 28 * u], fill=V if travaille else N)
    d.line([(x, y - 34 * u), (x, y - 38 * u)], fill=c)
    d.rectangle([x - 8 * u, y - 22 * u, x + 8 * u, y - 4 * u], fill=c)
    d.ellipse([x - 4 * u, y - 17 * u, x + 4 * u, y - 9 * u], fill=N)
    d.ellipse([x - 2 * u, y - 15 * u, x + 2 * u, y - 11 * u], fill=V)
    d.line([(x - 8 * u, y - 18 * u), (x - 16 * u, y - 10 * u), (x - 14 * u, y - 2 * u)], fill=c, width=max(1, int(2 * u)))
    d.line([(x + 8 * u, y - 18 * u), (x + 16 * u, y - 10 * u), (x + 14 * u, y - 2 * u)], fill=c, width=max(1, int(2 * u)))
    d.rectangle([x - 6 * u, y - 4 * u, x - 3 * u, y], fill=c); d.rectangle([x + 3 * u, y - 4 * u, x + 6 * u, y], fill=c)


def q_ateliers():
    """Les Ateliers des automates : une chaîne d'automates qui travaillent seuls, en enfilade, chacun sa feuille
    de route épinglée ; au premier plan, dans le coin, le dernier, qu'on tourne encore à la manivelle."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 150, 70
    for k in range(4):                                                                       # les courroies du plafond
        d.line([(0, 8 + k * 6), (fx, fy - 30 + k * 2)], fill=V if k % 2 else B)
    for (x, y, r) in ((120, 20, 9), (138, 30, 6)):                                           # les engrenages au mur
        engrenage(d, x, y, r, V, 8)
    sol(d, 96, fx, V, pas0=3, n=8, ecart=26)
    d.line([(0, 96), (W, 96)], fill=B)
    for k in range(4, -1, -1):                                                               # la chaîne, qui fuit vers le fond
        s = 1 / (1 + k * 0.6)
        x = fx - (fx - 30) * s
        y = fy + 74 * s
        halo(d, x, y - 40 * s, 22 * s + 4, V, 0.5)
        d.polygon([(x - 26 * s, y - 16 * s), (x + 26 * s, y - 16 * s), (x + 24 * s, y - 12 * s), (x - 24 * s, y - 12 * s)], fill=B)
        d.rectangle([x - 22 * s, y - 12 * s, x - 19 * s, y], fill=B); d.rectangle([x + 19 * s, y - 12 * s, x + 22 * s, y], fill=B)
        automate(d, x, y - 16 * s, s * 1.3, B, True)
        d.rectangle([x - 18 * s, y - 22 * s, x - 10 * s, y - 16 * s], fill=V)               # la pièce qu'il assemble
        d.rectangle([x + 24 * s, y - 66 * s, x + 36 * s, y - 48 * s], fill=B)               # sa feuille de route
        for j in range(3):
            d.line([(x + 26 * s, y - 62 * s + j * 5 * s), (x + 34 * s, y - 62 * s + j * 5 * s)], fill=N)
        d.point((x + 30 * s, y - 67 * s), fill=V)
    d.rectangle([108, 138, 176, 144], fill=B)                                                # l'établi du coin, à la main
    d.rectangle([112, 144, 116, H], fill=B); d.rectangle([168, 144, 172, H], fill=B)
    automate(d, 140, 138, 1.5, V, False)
    d.rectangle([150, 112, 156, 116], fill=B)                                                # la manivelle
    d.line([(156, 114), (166, 106)], fill=B, width=2); d.line([(166, 106), (170, 114)], fill=B, width=2)
    d.ellipse([168, 112, 174, 118], fill=B)
    for k in range(3):
        d.arc([150 - k * 4, 96 - k * 4, 178 + k * 4, 124 + k * 4], 280, 340, fill=B)
    return im


def q_memoires():
    """La Crypte des mémoires : une galerie voûtée qui fuit vers le fond ; de chaque côté, des niches en arc,
    chacune avec son coffret daté ; une bougie ; au premier plan, le sablier qui sonne chaque nuit."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 66
    halo(d, fx, fy + 8, 24, V, 0.6, 20)
    for k in range(7, -1, -1):                                                               # les arcs de la galerie
        s = 1 / (1 + k * 0.5)
        hw, ht = 86 * s, 62 * s
        d.arc([fx - hw, fy - ht, fx + hw, fy + ht], 180, 360, fill=B if k < 4 else V, width=max(1, int(3 * s)))
        d.line([(fx - hw, fy), (fx - hw, fy + 70 * s)], fill=B if k < 4 else V, width=max(1, int(3 * s)))
        d.line([(fx + hw, fy), (fx + hw, fy + 70 * s)], fill=B if k < 4 else V, width=max(1, int(3 * s)))
        if k < 6:
            s2 = 1 / (1 + (k + 1) * 0.5)
            for cote in (-1, 1):
                for j in range(2):
                    xa, xb = fx + cote * hw, fx + cote * 86 * s2
                    xm = (xa + xb) / 2
                    ya = fy - 10 * s + j * 34 * s
                    e = abs(xa - xb) * 0.3
                    if e < 2.5:
                        continue
                    d.pieslice([xm - e, ya - e, xm + e, ya + e], 180, 360, fill=B)
                    d.rectangle([xm - e, ya, xm + e, ya + 18 * s], fill=B)
                    d.pieslice([xm - e + 1, ya - e + 1, xm + e - 1, ya + e - 1], 180, 360, fill=N)
                    d.rectangle([xm - e + 1, ya, xm + e - 1, ya + 18 * s - 1], fill=N)
                    d.rectangle([xm - e * 0.6, ya + 8 * s, xm + e * 0.6, ya + 17 * s], fill=V if (k + j) % 2 else B)
    d.polygon([(0, H), (W, H), (fx + 10, fy + 10), (fx - 10, fy + 10)], fill=N)            # les dalles
    for k in range(-5, 6):
        d.line([(fx + k * 2, fy + 10), (fx + k * 34, H)], fill=V)
    yy, pas = fy + 13, 2
    while yy < H:
        e = 10 + (yy - fy - 10) * 1.05
        d.line([(fx - e, yy), (fx + e, yy)], fill=V)
        yy += pas
        pas += 2
    d.rectangle([fx - 1, fy + 2, fx + 1, fy + 9], fill=B); d.point((fx, fy), fill=V)        # la bougie
    x, y, h, w = 136, 120, 44, 28                                                            # le sablier
    halo(d, x, y + h // 2, 30, V, 0.4)
    d.rectangle([x - w // 2 - 3, y, x + w // 2 + 3, y + 4], fill=B)
    d.rectangle([x - w // 2 - 3, y + h - 4, x + w // 2 + 3, y + h], fill=B)
    for xx in (x - w // 2 - 1, x + w // 2 - 1):
        d.rectangle([xx, y + 4, xx + 2, y + h - 4], fill=B)
    m = y + h // 2
    d.polygon([(x - w // 2 + 3, y + 5), (x + w // 2 - 3, y + 5), (x + 1, m), (x - 1, m)], fill=N, outline=B)
    d.polygon([(x - w // 2 + 3, y + h - 5), (x + w // 2 - 3, y + h - 5), (x + 1, m), (x - 1, m)], fill=N, outline=B)
    d.polygon([(x - 5, y + 12), (x + 5, y + 12), (x + 1, m - 1), (x - 1, m - 1)], fill=V)
    d.polygon([(x - w // 2 + 5, y + h - 6), (x + w // 2 - 5, y + h - 6), (x, y + h - 14)], fill=V)
    d.line([(x, m), (x, y + h - 12)], fill=V)
    return im


def q_observatoire():
    """L'Observatoire : sous la coupole à fente, une grande lunette sur sa monture, braquée vers la lueur du Cœur ;
    un tableau de courbes, des cadrans, un registre ouvert."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.pieslice([4, 6, 172, 174], 180, 360, fill=B)                                           # la coupole
    d.pieslice([8, 10, 168, 170], 180, 360, fill=N)
    for k in range(1, 6):
        a = math.pi + k * math.pi / 6
        d.line([(88 + 80 * math.cos(a), 90 + 80 * math.sin(a)), (88 + 30 * math.cos(a), 90 + 30 * math.sin(a))], fill=V)
    d.polygon([(118, 14), (138, 22), (104, 90), (94, 86)], fill=V)                           # la fente, sur la lueur
    halo(d, 128, 30, 18, B, 0.8)
    d.ellipse([124, 26, 132, 34], fill=B)
    d.line([(8, 90), (168, 90)], fill=B, width=2)
    d.line([(76, 104), (124, 40)], fill=B, width=9)                                          # la lunette
    d.line([(76, 104), (124, 40)], fill=V, width=3)
    d.ellipse([118, 32, 132, 46], fill=B); d.ellipse([121, 35, 129, 43], fill=N)
    d.rectangle([70, 100, 84, 108], fill=B)
    d.polygon([(76, 106), (60, 140), (92, 140)], fill=B)                                     # la monture
    d.polygon([(76, 112), (68, 136), (84, 136)], fill=N)
    d.rectangle([0, 140, W, H], fill=B)
    for x in range(0, W, 8):
        d.line([(x, 140), (x - 6, H)], fill=N)
    d.rectangle([8, 96, 56, 132], fill=B); d.rectangle([10, 98, 54, 130], fill=N)          # le tableau des courbes
    for y in range(104, 130, 8):
        d.line([(12, y), (52, y)], fill=V)
    pts = [(12 + k * 3, 120 - int(14 * abs(math.sin(k * 0.6)) + k * 0.6)) for k in range(14)]
    d.line(pts, fill=B, width=2)
    for (x, y) in ((112, 106), (140, 106)):                                                  # les cadrans
        d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=B); d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=N)
        d.arc([x - 7, y - 7, x + 7, y + 7], 180, 360, fill=V)
        d.line([(x, y), (x + 5, y - 5)], fill=B)
    d.polygon([(110, 146), (138, 142), (140, 154), (112, 158)], fill=V)                       # le registre
    d.polygon([(138, 142), (164, 146), (162, 158), (140, 154)], fill=V)
    for k in range(3):
        d.line([(114, 148 + k * 3), (134, 145 + k * 3)], fill=N); d.line([(142, 145 + k * 3), (160, 149 + k * 3)], fill=N)
    return im


def q_puits():
    """Le Puits aux deux sources : sous la voûte, un puits de pierre en volume, son treuil et deux seaux, l'un
    plein, l'autre brisé ; deux tuyaux d'eau l'alimentent, l'un coule, l'autre est sec ; le miroir de l'eau."""
    im, d = toile()
    voute(d, 2, 50, 0.35, 18, 41, horizon=110)
    d.rectangle([0, 110, W, H], fill=N)
    sol(d, 110, 88, V, pas0=3, n=8, ecart=26)
    for (x0, coule) in ((0, True), (176, False)):                                            # les deux sources
        xs = 30 if x0 == 0 else 146
        d.line([(x0, 64), (xs, 64), (xs, 82)], fill=B, width=5)
        d.line([(x0, 64), (xs, 64), (xs, 82)], fill=N, width=1)
        if coule:
            d.line([(xs, 84), (xs + 4, 108)], fill=V, width=3)
            d.line([(xs + 1, 86), (xs + 3, 104)], fill=B)
        else:
            for k in range(3):
                d.point((xs + k, 86 + k * 4), fill=V)
    d.ellipse([28, 104, 148, 128], fill=B)                                                   # la margelle
    d.rectangle([28, 116, 148, 160], fill=B)
    d.ellipse([28, 148, 148, 172], fill=B)
    ombrer(im, 102, 117, 128, H, B, V, 1.0)                                                  # le flanc, en aplats
    ombrer(im, 128, 117, 148, H, B, N, 1.0)
    for r_, y in enumerate(range(122, 166, 8)):                                              # les pierres
        d.line([(28, y), (128, y)], fill=N)
        d.line([(129, y), (147, y)], fill=V)
        for x in range(28 + (r_ % 2) * 10, 148, 20):
            d.line([(x, y), (x, y + 8)], fill=N if x < 128 else V)
    d.ellipse([36, 108, 140, 124], fill=N)
    d.ellipse([42, 111, 134, 122], fill=V)                                                   # le miroir de l'eau
    trame(d, 42, 111, 134, 122, B, 0.12)
    d.line([(56, 116), (76, 116)], fill=B); d.line([(96, 118), (120, 118)], fill=B)
    for x in (40, 134):                                                                      # le treuil
        d.rectangle([x, 42, x + 3, 112], fill=B)
    d.rectangle([36, 38, 140, 44], fill=B)
    d.rectangle([60, 46, 116, 52], fill=V)
    d.ellipse([132, 44, 142, 54], outline=B, width=2)
    d.line([(70, 52), (70, 74)], fill=B); d.line([(106, 52), (106, 74)], fill=B)
    d.polygon([(62, 74), (78, 74), (76, 90), (64, 90)], fill=V)                              # le seau plein
    d.line([(62, 74), (70, 70), (78, 74)], fill=B)
    d.line([(64, 78), (76, 78)], fill=B)
    d.polygon([(98, 74), (114, 74), (112, 90), (100, 90)], fill=B)                           # le seau brisé
    d.line([(98, 74), (106, 70), (114, 74)], fill=B)
    d.polygon([(104, 76), (110, 82), (106, 84), (108, 90), (102, 90)], fill=N)
    return im


def q_thermes():
    """Les Thermes : une salle à colonnes, deux bassins derrière une grille fermée ; l'un, fendu, est figé
    (lecture seule, ro), l'autre fume encore (rw)."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 40, 70, V, 0.4, 40)
    d.pieslice([10, 4, 166, 112], 180, 360, fill=B)                                          # la voûte des thermes
    d.pieslice([14, 8, 162, 108], 180, 360, fill=N)
    for x in (14, 54, 118, 158):                                                             # les colonnes
        d.rectangle([x - 4, 56, x + 4, 112], fill=B)
        d.rectangle([x - 6, 54, x + 6, 58], fill=B); d.rectangle([x - 6, 110, x + 6, 114], fill=B)
        ombrer(im, x - 4, 58, x + 4, 110, B, V, 0.0, 0.8, 'h')
    sol(d, 114, 88, V, pas0=3, n=8, ecart=24)
    for i, x in enumerate((20, 96)):                                                         # les bassins
        d.polygon([(x, 116), (x + 60, 116), (x + 66, 140), (x - 6, 140)], fill=B)
        d.polygon([(x + 3, 119), (x + 57, 119), (x + 62, 137), (x - 2, 137)], fill=V if i else N)
        if i:
            trame(d, x, 120, x + 60, 136, B, 0.18)
            for k in range(4):                                                                # la vapeur
                bx = x + 6 + k * 14
                halo(d, bx + 6, 98, 9, B, 0.35, 14)
                d.arc([bx, 96, bx + 12, 114], 90, 270, fill=B, width=2); d.arc([bx + 2, 80, bx + 14, 98], 270, 90, fill=B, width=2)
                d.arc([bx, 66, bx + 12, 82], 90, 270, fill=V)
        else:
            trame(d, x, 120, x + 60, 136, B, 0.3)
            d.line([(x + 6, 122), (x + 22, 128), (x + 18, 134), (x + 36, 136)], fill=B, width=2)   # la glace fendue
            d.line([(x + 22, 128), (x + 42, 124), (x + 54, 130)], fill=B)
            d.line([(x + 30, 119), (x + 26, 127)], fill=B)
        d.rectangle([x + 21, 124, x + 37, 133], fill=N if i else B)
        texte(d, x + 24, 123, "ro" if i == 0 else "rw", N if i == 0 else B)
    for x in range(4, 174, 8):                                                               # la grille, au premier plan
        d.line([(x, 148), (x, H)], fill=B)
        d.polygon([(x - 2, 148), (x + 2, 148), (x, 144)], fill=B)
    d.line([(0, 152), (W, 152)], fill=B, width=2); d.line([(0, 164), (W, 164)], fill=B)
    d.rectangle([82, 154, 94, 164], fill=V); d.arc([83, 147, 93, 159], 180, 360, fill=V, width=2)
    d.rectangle([87, 157, 89, 161], fill=N)
    return im


def q_marche():
    """Le Grand Marché : une rue en perspective bordée d'étals à auvents rayés ; des étals renversés, des colis
    à moitié déballés ; au milieu de l'allée, la charrette de livraison abandonnée, une roue de travers."""
    im, d = toile()
    voute(d, 0, 30, 0.4, 12, 12, horizon=80)
    fx, fy = 88, 70
    facades(d, 80, 0, 0.15, graine=21)
    sol(d, 80, fx, V, pas0=2, n=8, ecart=22)
    for cote in (-1, 1):                                                                     # les étals
        for k in range(3, -1, -1):
            s = 1 / (1 + k * 0.6)
            x = fx + cote * (22 + 64 * s)
            w = 30 * s
            yb = 80 + 60 * s
            xa, xb = (x - w, x) if cote < 0 else (x, x + w)
            d.rectangle([xa, yb - 40 * s, xa + 2, yb], fill=B); d.rectangle([xb - 2, yb - 40 * s, xb, yb], fill=B)
            d.polygon([(xa - 3 * s, yb - 40 * s), (xb + 3 * s, yb - 40 * s), (xb, yb - 30 * s), (xa, yb - 30 * s)], fill=B)
            j = 0
            xx = xa
            while xx < xb:
                if j % 2:
                    d.polygon([(xx, yb - 39 * s), (min(xx + 5 * s, xb), yb - 39 * s), (min(xx + 5 * s, xb), yb - 31 * s), (xx, yb - 31 * s)], fill=V)
                xx += 5 * s
                j += 1
            renverse = (k + (cote > 0)) % 2 == 0
            if renverse:
                d.polygon([(xa, yb - 6 * s), (xb, yb - 14 * s), (xb, yb - 10 * s), (xa, yb - 2 * s)], fill=B)
            else:
                d.rectangle([xa, yb - 16 * s, xb, yb - 13 * s], fill=B)
                caisse(d, xa + 4 * s, yb - 26 * s, max(6, w * 0.45), max(6, 10 * s), V)
    x, y = 60, 150                                                                           # la charrette
    d.polygon([(x, y - 18), (x + 56, y - 22), (x + 58, y - 6), (x + 2, y - 2)], fill=B)
    d.polygon([(x + 3, y - 15), (x + 53, y - 19), (x + 54, y - 9), (x + 4, y - 5)], fill=N)
    d.line([(x + 56, y - 14), (x + 86, y - 2)], fill=B, width=2)
    d.line([(x + 56, y - 8), (x + 86, y + 2)], fill=B, width=2)
    d.ellipse([x + 4, y - 8, x + 24, y + 12], outline=B, width=3)
    for k in range(4):
        a = k * math.pi / 4
        d.line([(x + 14 - 9 * math.cos(a), y + 2 - 9 * math.sin(a)), (x + 14 + 9 * math.cos(a), y + 2 + 9 * math.sin(a))], fill=B)
    d.ellipse([x + 40, y - 2, x + 54, y + 18], outline=B, width=3)                           # la roue de travers
    caisse3d(d, x + 8, y - 34, 18, 14, 5, B)
    d.polygon([(x + 30, y - 32), (x + 46, y - 36), (x + 48, y - 22), (x + 32, y - 20)], fill=V)
    d.line([(x + 30, y - 32), (x + 24, y - 40)], fill=V); d.line([(x + 46, y - 36), (x + 52, y - 44)], fill=V)
    for (cx, cy) in ((36, 158), (128, 162), (142, 150)):                                     # des colis au sol
        caisse3d(d, cx, cy, 12, 9, 4, B)
    return im


def q_labyrinthe():
    """Le Labyrinthe, vu d'en haut et de biais : des murs en volume (le dessus blanc, la face verte), le fil
    vert qui court dans les couloirs et s'arrête devant une porte fermée d'un cadenas."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    murs = ((12, 12, 164, 18), (12, 12, 18, 158), (158, 12, 164, 158), (12, 152, 164, 158),
            (34, 34, 140, 40), (34, 34, 40, 132), (134, 34, 140, 118), (56, 56, 118, 62), (56, 56, 62, 152),
            (78, 78, 118, 84), (112, 78, 118, 136), (34, 128, 96, 134), (78, 100, 84, 128), (134, 134, 158, 140))
    for (x0, y0, x1, y1) in murs:                                                            # les faces, puis les dessus
        d.rectangle([x0, y0 + 4, x1, y1 + 8], fill=V)
        for xx in range(x0, x1 + 1, 3):
            d.line([(xx, y1 + 2), (xx, y1 + 8)], fill=N)
    for (x0, y0, x1, y1) in murs:
        d.rectangle([x0, y0, x1, y1], fill=B)
    fil = [(25, 146), (25, 25), (150, 25), (150, 126), (126, 126), (126, 90)]
    d.line(fil, fill=V, width=2)
    for (x, y) in fil:
        d.point((x, y), fill=B)
    d.rectangle([120, 86, 132, 90], fill=B)                                                  # la porte fermée
    d.rectangle([120, 90, 132, 98], fill=N, outline=B)
    cadenas(d, 126, 72)
    d.ellipse([18, 144, 32, 154], fill=V); d.ellipse([22, 146, 28, 152], fill=B)             # la pelote
    halo(d, 98, 110, 14, V, 0.5)
    d.ellipse([94, 104, 102, 112], fill=B)                                                   # celui qui fait patienter
    for k in range(3):
        d.arc([90 - k * 3, 100 - k * 3, 106 + k * 3, 116 + k * 3], 200, 340, fill=V)
    return im


def q_limites():
    """La Bibliothèque des limites : de hauts rayonnages en perspective, deux pupitres de lecture ; l'un
    étouffe sous une lampe minuscule, l'autre accapare toute la lumière ; sur la porte, la pancarte « 1024 »."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 60
    for cote in (-1, 1):                                                                     # les rayonnages
        xa, xb = (0, fx - 22) if cote < 0 else (fx + 22, W)
        for k in range(5):
            t = k / 5
            y = 10 + k * 20
            yb = y + (fy - y) * 0.25
            if cote < 0:
                d.line([(0, y), (xb, yb)], fill=B, width=2)
            else:
                d.line([(xa, yb), (W, y)], fill=B, width=2)
            n_ = 9
            for j in range(n_):
                f0 = j / n_
                x = (0 + (xb - 0) * f0) if cote < 0 else (xa + (W - xa) * f0)
                yy = (y + (yb - y) * f0) if cote < 0 else (yb + (y - yb) * f0)
                hh = 16 * (1 - f0 * 0.6) if cote < 0 else 16 * (0.4 + f0 * 0.6)
                ww = 5 * (1 - f0 * 0.5) if cote < 0 else 5 * (0.5 + f0 * 0.5)
                d.rectangle([x + 1, yy - hh, x + ww, yy - 1], fill=V if (j + k * 3 + cote) % 4 == 0 else B)
    d.rectangle([fx - 22, 10, fx + 22, 100], fill=N)                                         # la porte au fond
    d.rectangle([fx - 14, 30, fx + 14, 100], fill=B); d.rectangle([fx - 11, 33, fx + 11, 100], fill=N)
    d.rectangle([fx - 16, 38, fx + 16, 50], fill=V)
    texte(d, fx - 12, 39, "1024", N)
    sol(d, 100, fx, V, pas0=3, n=6, ecart=26)
    halo(d, 132, 128, 50, V, 0.95, 36)                                                       # celui qui prend tout
    halo(d, 132, 128, 24, B, 0.6)
    for (x, lampe) in ((44, 2), (132, 8)):                                                   # les pupitres
        d.polygon([(x - 24, 140), (x + 24, 140), (x + 20, 146), (x - 20, 146)], fill=B)
        d.rectangle([x - 18, 146, x - 15, 166], fill=B); d.rectangle([x + 15, 146, x + 18, 166], fill=B)
        d.polygon([(x - 14, 138), (x, 134), (x + 14, 138), (x, 140)], fill=V)
        d.line([(x + 18, 140), (x + 18, 120)], fill=B)
        d.polygon([(x + 18 - lampe, 120 + lampe // 2), (x + 18 + lampe, 120 + lampe // 2), (x + 18, 116)], fill=B)
    halo(d, 44 + 18, 122, 6, V, 0.6)
    personnage_ombre(d, 30, 166, 30, c=B)                                                    # le lecteur qui étouffe
    personnage_ombre(d, 146, 166, 34, c=N)
    d.arc([139, 130, 153, 142], 160, 340, fill=B)
    return im


def q_guetteur():
    """Le Guetteur : la chambre haute de la vigie, un grand cornet d'écoute braqué vers une porte au fond du
    couloir ; la console qui tient la nuit, ses lignes qui défilent ; sur un banc, un messager qui attend."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 140, 70
    piece(d, (124, 46, 156, 100), fx, c=V)                                                   # le couloir et la porte
    d.rectangle([132, 56, 148, 100], fill=B); d.rectangle([134, 58, 146, 100], fill=N)
    d.point((143, 80), fill=V)
    d.rectangle([12, 30, 72, 92], fill=B); d.rectangle([15, 33, 69, 89], fill=N)            # la console
    halo(d, 42, 60, 34, V, 0.35, 28)
    for k, y in enumerate(range(38, 86, 6)):
        d.line([(18, y), (18 + (y * 7 + k * 11) % 40 + 6, y)], fill=V if k != 7 else B)
    d.rectangle([18, 82, 22, 86], fill=B)
    d.polygon([(8, 92), (76, 92), (82, 104), (2, 104)], fill=B)
    for x in range(8, 76, 5):
        d.point((x + 2, 96), fill=N); d.point((x + 3, 100), fill=N)
    d.polygon([(84, 66), (118, 50), (118, 86)], fill=B)                                      # le cornet
    d.ellipse([112, 50, 124, 86], fill=B); d.ellipse([115, 54, 121, 82], fill=N)
    ombrer(im, 84, 50, 118, 86, B, V, 0.0, 0.6)
    d.line([(84, 66), (60, 70), (52, 92)], fill=B, width=2)
    for k in range(3):
        d.arc([124 + k * 4, 56 - k * 4, 136 + k * 4, 80 + k * 4], 300, 60, fill=V)
    d.rectangle([94, 140, 150, 144], fill=B)                                                 # le banc et le messager
    d.rectangle([98, 144, 101, 156], fill=B); d.rectangle([143, 144, 146, 156], fill=B)
    personnage_ombre(d, 122, 142, 40, c=V)
    d.rectangle([112, 128, 132, 140], fill=V)
    d.polygon([(108, 136), (116, 132), (118, 140), (110, 142)], fill=B)
    d.line([(0, 156), (W, 156)], fill=B)
    return im


# ------------------------------------------------------------------
# Les gardiens et les habitants, en pied
# ------------------------------------------------------------------

def for_lignes(r, x0, y0, x1, y1, c=N):
    for y in range(y0, y1, 3):
        r(x0, y, x1, y, c)


def seymour_dessin(r):
    # le docker : bonnet, barbe, marinière, gros bras, une caisse en planches sur l'épaule
    r(36, 7, 51, 12, V); r(36, 10, 51, 10, B); tete(r, 12, V, barbe=True)
    r(35, 33, 52, 54, B); rayures(r, 35, 36, 52, 54, V, 3); r(41, 33, 46, 35, N)
    bras(r, True, True, 36); r(56, 37, 58, 46, B)
    r(52, 16, 72, 32, B); r(54, 18, 70, 30, N)
    for y in (21, 25, 29): r(54, y, 70, y, V)
    r(54, 18, 56, 30, B); r(68, 18, 70, 30, B); ligne_r(r, 56, 19, 68, 29, B)
    r(36, 54, 51, 55, N); r(41, 54, 46, 55, V)
    jambes(r); sol_tirets(r, 68)


def kathleen_dessin(r):
    # l'archiviste des fiches : chignon, lunettes, col blanc, un tiroir de fiches dans les bras
    r(40, 4, 47, 10, B); r(42, 2, 45, 4, B); tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52); r(39, 33, 48, 36, B); r(43, 36, 44, 64, N)
    bras(r, True, True, 36)
    r(32, 44, 55, 54, B); r(34, 46, 53, 52, N)
    for x in range(35, 53, 2): r(x, 44, x, 46, B if x % 4 else V)
    r(41, 48, 46, 50, V); r(43, 49, 44, 49, N)
    pieds_robe(r); sol_tirets(r, 68)


def ida_dessin(r):
    # l'imprimeuse de la Gazette : visière, tablier taché d'encre, une feuille fraîche imprimée
    r(34, 9, 55, 12, V); r(35, 12, 52, 12, N); tete(r, 12, V)
    r(35, 33, 52, 54, V); r(38, 35, 49, 56, B); r(38, 35, 49, 36, N)
    for (x, y) in ((41, 44), (45, 50), (40, 52), (47, 41)): r(x, y, x + 1, y + 1, N)
    bras(r, True, True, 36); r(30, 40, 31, 44, N)
    r(56, 30, 72, 52, B); r(58, 32, 70, 36, N); for_lignes(r, 58, 39, 70, 51); r(58, 39, 63, 45, V)
    jambes(r); sol_tirets(r, 68)


def gordon_dessin(r):
    # le forgeron : barbe, tablier de cuir clouté, un marteau levé et une pelle à charbon
    tete(r, 12, V, barbe=True); r(37, 12, 50, 13, V)
    r(35, 33, 52, 54, B); r(37, 35, 50, 57, V); r(37, 35, 50, 36, N)
    for (x, y) in ((39, 40), (48, 40), (39, 52), (48, 52)): r(x, y, x, y, B)
    bras(r, True, True, 36)
    r(57, 22, 58, 48, B); r(52, 16, 63, 23, B); r(53, 17, 55, 22, V)
    r(18, 38, 19, 58, B); r(13, 58, 24, 63, V); r(13, 62, 24, 63, B); r(15, 57, 22, 57, B)
    jambes(r, B); sol_tirets(r, 68)


def niklaus_dessin(r):
    # l'horloger de la Tour : loupe à l'œil, gilet à chaîne, une montre à gousset ouverte
    tete(r, 12, B, lunettes=True); r(44, 13, 52, 21, V); r(46, 15, 50, 19, B); r(47, 16, 49, 18, V)
    r(35, 33, 52, 54, B); r(38, 33, 49, 54, N); r(39, 36, 48, 52, V); r(43, 36, 44, 52, N)
    for y in (39, 44, 49): r(41, y, 41, y, B); r(46, y, 46, y, B)
    for k in range(5): r(44 + k * 2, 42 + k, 45 + k * 2, 42 + k, B)
    bras(r, True, True, 36)
    r(55, 42, 69, 56, B); r(57, 44, 67, 54, N); r(61, 39, 63, 42, B)
    r(62, 46, 62, 49, V); r(62, 49, 65, 49, V); r(58, 49, 58, 49, B); r(66, 49, 66, 49, B); r(62, 45, 62, 45, B); r(62, 53, 62, 53, B)
    jambes(r); sol_tirets(r, 68)


def sophie_dessin(r):
    # la fontainière : foulard noué, robe à tablier, une grande clé de vanne et un seau d'eau
    r(35, 9, 52, 13, V); r(52, 12, 56, 15, V); r(55, 15, 57, 18, V); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(38, 40, 49, 64, V); r(38, 40, 49, 40, N)
    bras(r, True, True, 36)
    r(57, 30, 59, 54, B); r(52, 27, 64, 31, B); r(54, 28, 62, 30, V); r(55, 54, 61, 56, B)
    r(14, 46, 30, 60, B); r(16, 48, 28, 58, N); r(16, 48, 28, 51, V); r(15, 42, 29, 43, B); r(14, 43, 15, 46, B); r(29, 43, 30, 46, B)
    pieds_robe(r); sol_tirets(r, 68)


def lynn_dessin(r):
    # la portière du Matin : cape à capuche, un trousseau de clés et la liste des salles à ouvrir
    r(33, 9, 54, 33, V); r(35, 11, 52, 13, B); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 34, 53); r(36, 33, 51, 64, B); r(38, 33, 49, 64, N); r(43, 34, 44, 40, V)
    bras(r, True, True, 36)
    r(55, 44, 66, 45, B)
    for k, x in enumerate((56, 60, 64)): cle(r, x, 46 + (k % 2) * 3, B if k != 1 else V)
    r(16, 36, 30, 60, B); r(17, 37, 29, 59, N); for_lignes(r, 19, 41, 27, 57, B); r(18, 49, 28, 50, V)
    pieds_robe(r); sol_tirets(r, 68)


def mary_dessin(r):
    # la mécanicienne des automates : foulard, salopette, une clé plate et un petit automate à hublots
    r(36, 9, 51, 12, V); r(49, 11, 54, 14, V); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 40, 49, 54, B); r(38, 33, 39, 40, B); r(48, 33, 49, 40, B); r(41, 44, 46, 48, N)
    bras(r, True, True, 36)
    r(57, 28, 58, 46, B); r(54, 24, 61, 28, B); r(56, 25, 59, 26, N)
    r(14, 40, 28, 56, B); r(16, 42, 26, 54, N); r(17, 44, 20, 47, V); r(22, 44, 25, 47, V); r(18, 50, 24, 51, B)
    r(20, 36, 21, 40, B); r(19, 34, 22, 35, V)
    jambes(r); sol_tirets(r, 68)


def betty_dessin(r):
    # la gardienne des mémoires : cheveux longs, longue robe, un sablier et un registre daté
    r(36, 9, 51, 12, B); r(34, 12, 36, 30, B); r(51, 12, 53, 30, B)
    tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52); r(42, 33, 45, 64, N); r(36, 44, 51, 45, B)
    bras(r, True, True, 36)
    r(56, 36, 66, 38, B); r(57, 39, 65, 44, V); r(59, 45, 63, 46, B); r(57, 47, 65, 52, B); r(60, 48, 62, 51, V); r(56, 53, 66, 55, B)
    r(16, 38, 30, 58, B); r(18, 40, 28, 56, N); for_lignes(r, 19, 43, 27, 55, V); r(18, 40, 28, 41, V)
    pieds_robe(r); sol_tirets(r, 68)


def donald_dessin(r):
    # l'astronome des mesures : chapeau pointu étoilé, une lunette d'approche et un carnet de courbes
    for k in range(9): r(43 - k // 2 - 1, 1 + k, 44 + k // 2 + 1, 1 + k, V)
    r(33, 10, 54, 12, V); r(42, 4, 43, 5, B); r(46, 7, 46, 7, B)
    tete(r, 12, B, barbe=True)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 37, 45, 64, V)
    bras(r, True, True, 36)
    r(54, 28, 72, 32, B); r(56, 29, 70, 31, V); r(70, 26, 75, 34, B); r(62, 27, 63, 33, N)
    r(14, 40, 30, 58, B); r(16, 42, 28, 56, N); r(17, 52, 19, 54, V); r(20, 48, 22, 51, V); r(23, 45, 25, 47, V); r(26, 43, 27, 44, V)
    r(16, 55, 28, 55, B)
    pieds_robe(r); sol_tirets(r, 68)


def dorothy_dessin(r):
    # la gardienne du Puits : tresses, deux seaux, un plein (vert) dans une main, le brisé dans l'autre
    r(36, 9, 51, 12, V); r(33, 14, 35, 34, V); r(52, 14, 54, 34, V)
    for y in range(16, 34, 4): r(33, y, 35, y, N); r(52, y, 54, y, N)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 44, 50, 46, V)
    bras(r, True, True, 36)
    r(12, 50, 28, 62, B); r(14, 52, 26, 60, V); r(14, 52, 26, 53, B); ligne_r(r, 12, 50, 20, 44, B); ligne_r(r, 20, 44, 28, 50, B)
    r(60, 50, 74, 62, B); r(62, 52, 72, 60, N); r(66, 52, 68, 57, B); r(68, 57, 70, 60, B); ligne_r(r, 60, 50, 67, 44, B)
    pieds_robe(r); sol_tirets(r, 68)


def ruth_dessin(r):
    # la gardienne des Thermes : serviette rayée sur l'épaule, un pic à glace, une lanterne chaude
    r(36, 10, 51, 12, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(36, 31, 44, 42, V); rayures(r, 36, 33, 44, 42, B, 3)
    bras(r, True, True, 36)
    r(57, 24, 58, 48, B); r(54, 22, 61, 24, B); r(55, 20, 56, 22, B); r(59, 20, 60, 22, B)
    r(18, 34, 26, 36, B); r(15, 40, 29, 56, B); r(17, 42, 27, 54, V); r(20, 45, 24, 51, B); r(14, 56, 30, 58, B)
    jambes(r); sol_tirets(r, 68)


def charles_dessin(r):
    # le marchand : chapeau rond, gilet, un colis ficelé et une balance à plateaux
    r(35, 5, 52, 11, B); r(33, 11, 54, 12, B); r(35, 9, 52, 9, V)
    tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 33, 49, 54, N); r(42, 33, 45, 54, B)
    for y in (40, 46): r(40, y, 40, y, V); r(47, y, 47, y, V)
    bras(r, True, True, 36)
    r(54, 40, 70, 54, B); r(56, 42, 68, 52, N); r(61, 40, 62, 54, V); r(54, 46, 70, 47, V)
    r(22, 28, 23, 52, B); r(12, 34, 33, 35, B); r(12, 36, 18, 40, V); r(27, 36, 33, 41, V); r(12, 40, 18, 41, B); r(27, 41, 33, 42, B)
    r(18, 52, 27, 54, B)
    jambes(r); sol_tirets(r, 68)


def john_dessin(r):
    # le guide du Labyrinthe : capuche, une pelote de fil qui se déroule, une craie
    for k in range(5): r(40 - k - 2, 6 + k, 47 + k + 2, 6 + k, B)
    r(33, 11, 54, 33, B); r(35, 13, 52, 31, N); tete(r, 14, B)
    robe_mage(r, 33, 64, B, 34, 53); r(38, 33, 49, 64, N); r(36, 46, 51, 47, V)
    bras(r, True, True, 36)
    r(55, 42, 67, 54, V); r(57, 44, 65, 52, N); r(59, 46, 63, 50, V); r(57, 48, 65, 48, B)
    for k in range(12): r(62 + k, 54 + k // 2, 63 + k, 55 + k // 2, V)
    r(20, 40, 22, 48, B)
    pieds_robe(r); sol_tirets(r, 68)


def kay_dessin(r):
    # la bibliothécaire des limites : chignon, lunettes, une pile de livres et une règle graduée
    r(40, 5, 47, 10, V); r(36, 10, 51, 12, V); tete(r, 12, V, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52); r(38, 33, 49, 37, B)
    bras(r, True, True, 36)
    for k in range(5):
        r(53 + (k % 2), 54 - k * 4, 68 - (k % 2) * 2, 57 - k * 4, B if k % 2 else V); r(55, 55 - k * 4, 56, 56 - k * 4, N)
    r(18, 28, 21, 60, B)
    for y in range(30, 60, 3): r(19, y, 20 if y % 6 else 21, y, N)
    pieds_robe(r); sol_tirets(r, 68)


def klara_dessin(r):
    # la guetteuse : casque d'écoute à antenne, gilet, une console pliante qui tient la nuit
    tete(r, 12, B)
    r(34, 12, 36, 22, V); r(51, 12, 53, 22, V); r(36, 9, 51, 11, V); r(33, 15, 35, 20, B); r(52, 15, 54, 20, B)
    r(52, 4, 52, 9, B); r(51, 3, 53, 3, V)
    r(35, 33, 52, 54, B); r(38, 36, 49, 54, N); r(40, 38, 47, 52, V); r(43, 38, 44, 52, B)
    bras(r, True, True, 36)
    r(54, 38, 72, 54, B); r(56, 40, 70, 48, N); r(57, 42, 61, 42, V); r(57, 45, 66, 45, V); r(56, 50, 70, 52, V)
    for x in range(57, 70, 3): r(x, 50, x, 51, N)
    jambes(r); sol_tirets(r, 68)


def logeuse_dessin(r):
    # la logeuse : chignon, châle, un trousseau des chambres et le registre des pensionnaires
    r(40, 4, 47, 10, V); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(34, 33, 53, 38, V); r(42, 38, 45, 42, V); r(37, 46, 50, 47, V)
    bras(r, True, True, 36)
    r(55, 44, 64, 45, B)
    for k, x in enumerate((56, 60)): cle(r, x, 46 + k * 3, V)
    r(16, 38, 30, 58, B); r(18, 40, 28, 56, N); for_lignes(r, 19, 43, 27, 55, B); r(16, 38, 18, 58, V)
    pieds_robe(r); sol_tirets(r, 68)


def allumeur_dessin(r):
    # l'allumeur de réverbères : haut-de-forme, redingote, une longue perche dont la mèche brûle
    r(39, 0, 48, 10, B); r(39, 7, 48, 8, V); r(35, 10, 52, 12, B)
    tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 33, 49, 58, N); r(42, 33, 45, 54, B); r(36, 54, 51, 58, V)
    for y in (40, 46): r(40, y, 40, y, B); r(47, y, 47, y, B)
    bras(r, True, True, 36)
    r(60, 6, 61, 66, B); r(58, 2, 63, 6, B); r(59, 0, 62, 2, V); r(60, 1, 61, 1, B)
    jambes(r); sol_tirets(r, 68)


def veilleuse_dessin(r):
    # la veilleuse : un châle sur la tête, une bougie allumée, un vieux cahier de chants
    r(33, 9, 54, 34, V); r(35, 11, 52, 32, N); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 34, 53); r(37, 33, 50, 64, B); r(39, 33, 48, 64, N); r(40, 40, 47, 41, V)
    bras(r, True, True, 36)
    r(59, 36, 61, 48, B); r(60, 31, 60, 31, B); r(59, 32, 61, 35, V); r(56, 48, 64, 50, B)
    r(16, 42, 32, 56, B); r(17, 43, 23, 55, N); r(25, 43, 31, 55, N); r(24, 42, 24, 56, V)
    for_lignes(r, 18, 46, 22, 54, V); for_lignes(r, 26, 46, 30, 54, V)
    pieds_robe(r); sol_tirets(r, 68)


def horloger_dessin(r):
    # l'horloger de la cité : barbe, lunettes, tablier, un grand réveil à deux cloches sous le bras
    tete(r, 12, B, barbe=True, lunettes=True)
    r(35, 33, 52, 54, B); r(38, 35, 49, 57, V); r(38, 35, 49, 36, N); r(41, 42, 46, 46, N)
    bras(r, True, True, 36)
    r(12, 40, 30, 58, B); r(14, 42, 28, 56, N); r(21, 44, 21, 49, V); r(21, 49, 25, 49, V)
    for (x, y) in ((21, 43), (21, 55), (15, 49), (27, 49)): r(x, y, x, y, B)
    r(11, 36, 16, 40, V); r(26, 36, 31, 40, V); r(13, 58, 15, 60, B); r(27, 58, 29, 60, B)
    jambes(r); sol_tirets(r, 68)


def imprimeur_dessin(r):
    # l'imprimeur : visière, tablier, un rouleau de papier compressé et une manivelle
    r(34, 9, 55, 12, B); r(35, 12, 52, 12, N); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 35, 49, 56, B); r(38, 35, 49, 36, N); r(41, 46, 42, 47, N)
    bras(r, True, True, 36)
    r(54, 40, 72, 54, B); r(56, 42, 70, 52, V); r(58, 44, 68, 50, N); r(60, 46, 66, 48, V); r(71, 44, 73, 50, B)
    r(18, 36, 19, 54, B); r(13, 34, 24, 36, B); r(13, 30, 14, 34, B); r(22, 54, 26, 56, V)
    jambes(r); sol_tirets(r, 68)


def postiere_dessin(r):
    # la postière : casquette à visière, sacoche en bandoulière, des lettres datées
    r(36, 9, 51, 12, V); r(48, 11, 55, 12, V); r(42, 9, 45, 10, B)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52)
    for k in range(7): r(37 + k * 2, 34 + k * 3, 39 + k * 2, 36 + k * 3, V)
    bras(r, True, True, 36)
    r(52, 48, 68, 62, V); r(54, 50, 66, 60, N); r(54, 50, 66, 53, V); r(59, 53, 61, 55, B)
    r(16, 42, 32, 52, B); r(17, 43, 31, 44, N); ligne_r(r, 17, 44, 24, 48, N); ligne_r(r, 24, 48, 31, 44, N); r(28, 48, 31, 51, V)
    pieds_robe(r); sol_tirets(r, 68)


PORTRAITS = {
    "item_seymour.gif": seymour_dessin, "item_kathleen.gif": kathleen_dessin, "item_ida.gif": ida_dessin,
    "item_gordon.gif": gordon_dessin, "item_niklaus.gif": niklaus_dessin, "item_sophie.gif": sophie_dessin,
    "item_lynn.gif": lynn_dessin, "item_mary.gif": mary_dessin, "item_betty.gif": betty_dessin,
    "item_donald.gif": donald_dessin, "item_dorothy.gif": dorothy_dessin, "item_ruth.gif": ruth_dessin,
    "item_charles.gif": charles_dessin, "item_john.gif": john_dessin, "item_kay.gif": kay_dessin,
    "item_klara.gif": klara_dessin,
    "item_logeuse.gif": logeuse_dessin, "item_allumeur.gif": allumeur_dessin, "item_veilleuse.gif": veilleuse_dessin,
    "item_horloger.gif": horloger_dessin, "item_imprimeur.gif": imprimeur_dessin, "item_postiere.gif": postiere_dessin,
}


def lanterne_lumen(nom="item_lanterne_lumen.gif"):
    """La sixième enveloppe : un pli marqué d'une lanterne allumée (sa lueur tramée, son anneau, ses montants),
    liseré de fenêtres allumées."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 6):                                                                # des fenêtres allumées
        d.rectangle([x, 35, x + 3, 38], fill=V); d.point((x + 1, 36), fill=B)
    for y in range(9, 33):                                                                   # la lueur
        for x in range(17, 43):
            dist = math.hypot((x - 29.5) / 12, (y - 21) / 11)
            if dist < 1 and ((x + y) % 2 == 0) and dist > 0.55:
                d.point((x, y), fill=V)
    d.ellipse([27, 6, 32, 11], outline=N)                                                    # l'anneau
    d.polygon([(23, 15), (36, 15), (33, 11), (26, 11)], fill=N)                              # le chapeau
    d.rectangle([24, 15, 35, 29], fill=N)
    d.rectangle([26, 17, 33, 27], fill=V)
    d.rectangle([28, 19, 31, 25], fill=B)
    d.line([(29, 17), (29, 27)], fill=N)
    d.rectangle([23, 29, 36, 31], fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_lumen.gif": lumen, "loc_lumen_nuit.gif": lumen_nuit, "loc_lumen_rallumee.gif": lumen_rallumee,
    "loc_coeur_lumen.gif": coeur_lumen,
    "loc_q_docks.gif": q_docks, "loc_q_archives.gif": q_archives, "loc_q_gazette.gif": q_gazette,
    "loc_q_forges.gif": q_forges, "loc_q_horloge.gif": q_horloge, "loc_q_citernes.gif": q_citernes,
    "loc_q_porte.gif": q_porte, "loc_q_ateliers.gif": q_ateliers, "loc_q_memoires.gif": q_memoires,
    "loc_q_observatoire.gif": q_observatoire, "loc_q_puits.gif": q_puits, "loc_q_thermes.gif": q_thermes,
    "loc_q_marche.gif": q_marche, "loc_q_labyrinthe.gif": q_labyrinthe, "loc_q_limites.gif": q_limites,
    "loc_q_guetteur.gif": q_guetteur,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_lanterne_lumen.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_lanterne_lumen.gif":
            lanterne_lumen(nom); n += 1
    print(n, "dessins")
