"""Dessine le Grand Port de Port-Aube (chapitre 8, « la Flotte noire ») : le port au lever du jour, ses grues et ses
piles de conteneurs, les quatorze quais, les navires de l'escadre, la flotte noire sous l'orage, le bivouac des trois
nuits, la bataille de l'aube, la baie illuminée de la victoire, les images de montée de rang, les plans de la
cinématique 8, les quatorze maîtres et les six habitants en pied, et l'Ordre d'embarquement (la huitième enveloppe).

Même format et même palette que les chapitres précédents (dessiner_lieux.finir : toile 176 x 170 doublée dans le cadre
d'origine ; trois couleurs : noir, vert, blanc ; personnages de dessiner_panne.perso en grille 88 x 85). Le style est
poussé plus loin : des dégradés tramés (trame ordonnée 4 x 4), des plans successifs, des contre-jours, des ombres
portées sur les volumes, des reflets dans l'eau et des halos de lumière.
Usage : python3 outils/dessiner_port.py [nom...]
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_academie import robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle  # noqa: E402


# ------------------------------------------------------------------
# Les trames : la lumière en trois couleurs
# ------------------------------------------------------------------

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def trame(d, x0, y0, x1, y1, c, t):
    """Une trame ordonnée de densité constante t (0 : rien, 1 : plein)."""
    seuil = t * 16
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if BAYER[y % 4][x % 4] < seuil:
                d.point((x, y), fill=c)


def degrade(d, x0, y0, x1, y1, c, t0, t1):
    """Un dégradé vertical tramé : la densité passe de t0 (en haut) à t1 (en bas)."""
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        t = t0 + (t1 - t0) * (y - y0) / max(1, y1 - y0)
        seuil = t * 16
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if BAYER[y % 4][x % 4] < seuil:
                d.point((x, y), fill=c)


def halo(d, cx, cy, r, c, t0=0.8, ry=None, ymax=H):
    """Un halo de lumière tramé, dense au centre, qui s'éteint au bord (ry pour un halo écrasé)."""
    ry = ry or r
    for y in range(max(0, int(cy - ry)), min(H, int(cy + ry) + 1, int(ymax) + 1)):
        for x in range(max(0, int(cx - r)), min(W, int(cx + r) + 1)):
            dist = math.hypot((x - cx) / r, (y - cy) / ry)
            if dist < 1 and BAYER[y % 4][x % 4] < t0 * (1 - dist) * 16:
                d.point((x, y), fill=c)


def ombrer(im, x0, y0, x1, y1, de, vers, t0, t1=None, sens='v'):
    """Ombre (ou éclaire) un volume déjà dessiné : seuls les pixels de couleur `de` passent, par la trame, à `vers`.
    Le dégradé va de t0 à t1, de haut en bas (sens 'v') ou de gauche à droite (sens 'h')."""
    px = im.load()
    t1 = t0 if t1 is None else t1
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if px[x, y] != de:
                continue
            f = (y - y0) / max(1, y1 - y0) if sens == 'v' else (x - x0) / max(1, x1 - x0)
            if BAYER[y % 4][x % 4] < (t0 + (t1 - t0) * f) * 16:
                px[x, y] = vers


# ------------------------------------------------------------------
# Le ciel, la mer, la lumière
# ------------------------------------------------------------------

def ciel_aube(d, horizon=70, fort=0.8):
    """L'aube : le noir de la nuit en haut, le vert qui monte de l'horizon, une bande blanche tout en bas."""
    degrade(d, 0, 0, W, horizon, V, 0, fort)
    degrade(d, 0, horizon - 14, W, horizon, B, 0, 0.45)


def ciel_nuit(d, ymax=70, graine=3, n=40):
    """La nuit : des étoiles de deux tailles, et un voile vert à l'horizon."""
    rnd = random.Random(graine)
    for _ in range(n):
        x, y = rnd.randint(2, W - 3), rnd.randint(2, ymax - 10)
        d.point((x, y), fill=B)
        if rnd.random() < 0.18:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point((x + dx, y + dy), fill=B)
    degrade(d, 0, ymax - 16, W, ymax, V, 0, 0.3)


def soleil(d, x, y, r=12, horizon=None):
    """Le soleil : un disque blanc, un anneau vert et un grand halo tramé (coupé à l'horizon)."""
    ymax = horizon if horizon is not None else H
    halo(d, x, y, r * 3, B, 0.55, r * 2, ymax)
    halo(d, x, y, r * 2, V, 0.9, r * 1.4, ymax)
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    if horizon is not None:
        d.rectangle([x - r - 1, horizon + 1, x + r + 1, y + r + 1], fill=N)


def lune_pleine(d, x, y, r=9):
    halo(d, x, y, r * 2.4, V, 0.5)
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    for (a, b, s) in ((-3, -2, 2), (3, 2, 3), (-2, 4, 1)):
        d.ellipse([x + a - s, y + b - s, x + a + s, y + b + s], fill=V)


def croissant(d, x, y, r=8):
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.ellipse([x - r + 5, y - r - 2, x + r + 5, y + r - 2], fill=N)


def mer(d, y0, y1, graine=1, c=B, reflet=None, c_reflet=B, larg=10):
    """La mer : des vaguelettes plus longues et plus espacées en approchant ; sous la lumière (reflet = x),
    une colonne de reflets brisés qui s'élargit vers le spectateur."""
    rnd = random.Random(graine)
    y = y0
    while y < y1:
        p = (y - y0) / max(1, y1 - y0)
        long_ = 2 + int(p * 7)
        esp = 7 + int(p * 14)
        dec = rnd.randint(0, esp)
        for x in range(-dec, W, esp):
            d.line([(x, y), (x + long_, y)], fill=c)
        if reflet is not None:
            l = larg * (0.5 + p * 1.2)
            x = reflet - l
            while x < reflet + l:
                seg = rnd.randint(2, 4 + int(p * 6))
                if rnd.random() < 0.75 - p * 0.25:
                    d.line([(x, y), (min(x + seg, reflet + l), y)], fill=c_reflet)
                x += seg + rnd.randint(1, 3)
        y += 2 + int(p * 4)


def nuages(im, d, y, graine=2, n=7, epais=1.0, bas=0.8):
    """Des nuages d'orage roulés, éclairés par le dessus, ombrés par le dessous (la trame ombre leur ventre)."""
    rnd = random.Random(graine)
    for k in range(n):
        cx = rnd.randint(-10, W + 10)
        cy = y + rnd.randint(-6, 10)
        lx, ly = rnd.randint(18, 34) * epais, rnd.randint(7, 12) * epais
        d.ellipse([cx - lx, cy - ly, cx + lx, cy + ly], fill=B)
        d.ellipse([cx - lx * 0.6, cy - ly * 1.6, cx + lx * 0.5, cy + ly * 0.4], fill=B)
    ombrer(im, 0, y - 22 * epais, W, y + 20 * epais, B, V, 0.0, bas * 0.7)
    ombrer(im, 0, y - 4, W, y + 22 * epais, B, N, 0.0, bas)


def eclair(d, x, y, h=60, graine=1):
    rnd = random.Random(graine)
    pts = [(x, y)]
    while pts[-1][1] < y + h:
        px, py = pts[-1]
        pts.append((px + rnd.randint(-6, 6), py + rnd.randint(6, 12)))
    d.line(pts, fill=V, width=3)
    d.line(pts, fill=B, width=1)
    bx, by = pts[len(pts) // 2]
    d.line([(bx, by), (bx + 8, by + 10), (bx + 6, by + 18)], fill=B)


def pluie(d, x0, y0, x1, y1, pas=6, graine=1, c=B):
    rnd = random.Random(graine)
    for x in range(x0, x1, pas):
        for y in range(y0 + rnd.randint(0, 9), y1, 10 + rnd.randint(0, 4)):
            d.line([(x, y), (x - 2, y + 4)], fill=c)


def mouettes(d, pts, c=B):
    for (x, y, s) in pts:
        d.line([(x - s, y - s // 2), (x, y)], fill=c)
        d.line([(x, y), (x + s, y - s // 2)], fill=c)


def feu_artifice(d, cx, cy, r=14, c=B, c2=V, n=12):
    for k in range(n):
        a = k * 2 * math.pi / n
        d.line([(cx + math.cos(a) * r * 0.35, cy + math.sin(a) * r * 0.35), (cx + math.cos(a) * r, cy + math.sin(a) * r)], fill=c)
        d.point((cx + math.cos(a) * (r + 3), cy + math.sin(a) * (r + 3)), fill=c2)
    d.point((cx, cy), fill=B)


# ------------------------------------------------------------------
# Les conteneurs, les grues, les navires
# ------------------------------------------------------------------

def conteneur(d, x, y, w=24, h=10, c=V, nervure=None, portes=False):
    """Un conteneur vu de côté : une caisse nervurée (c : V, B ou N à liseré blanc)."""
    nervure = nervure if nervure is not None else (V if c == N else N)
    d.rectangle([x, y, x + w, y + h], fill=c)
    if c == N:
        d.rectangle([x, y, x + w, y + h], outline=B)
    pas = 4 if c == N else 2
    for xx in range(x + pas, x + w - 1, pas):
        d.line([(xx, y + 2), (xx, y + h - 2)], fill=nervure)
    d.line([(x, y + h), (x + w, y + h)], fill=nervure if c != N else B)
    if portes:
        d.rectangle([x + w - 6, y + 1, x + w - 1, y + h - 1], fill=c)
        for xx in (x + w - 5, x + w - 2):
            d.line([(xx, y + 1), (xx, y + h - 1)], fill=nervure)


def conteneur3d(im, d, x, y, w=30, h=13, p=6, c=V, portes=True):
    """Un conteneur en volume, en aplats nets : la face nervurée, le toit dans la lumière,
    le bout aux portes dans l'ombre (barres de fermeture), des coins renforcés."""
    toit = {V: B, B: B, N: N}[c]
    bout, barre = {V: (N, V), B: (V, N), N: (N, V)}[c]
    d.polygon([(x, y), (x + p, y - p // 2), (x + w + p, y - p // 2), (x + w, y)], fill=toit)
    d.polygon([(x + w, y), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2), (x + w, y + h)], fill=bout)
    if c == N:
        d.line([(x, y), (x + p, y - p // 2), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2), (x + w, y + h)], fill=B)
    elif c == B:
        d.line([(x + p, y - p // 2), (x + w + p, y - p // 2)], fill=N)
    if portes:
        for xx in range(x + w + 2, x + w + p, 2):
            dy = (xx - x - w) // 2
            d.line([(xx, y - dy + 1), (xx, y + h - dy - 1)], fill=barre)
    conteneur(d, x, y, w, h, c)
    coin = N if c != N else B
    for (cx, cy) in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)):
        d.point((cx, cy), fill=coin)


def pile(im, d, x, y, plan, w=30, h=13, p=6):
    """Une pile de conteneurs en volume ; plan : liste de rangées (de bas en haut) de couleurs, None pour un vide."""
    for rang, ligne in enumerate(plan):
        for k, c in enumerate(ligne):
            if c is None:
                continue
            conteneur3d(im, d, x + k * (w + 2), y - (rang + 1) * (h + 1), w, h, p, c, portes=(k == len(ligne) - 1))


def treillis(d, x0, y0, x1, y1, c=B, pas=6):
    """Une poutre en treillis : deux membrures et des diagonales en zigzag."""
    d.line([(x0, y0), (x1, y0)], fill=c)
    d.line([(x0, y1), (x1, y1)], fill=c)
    haut = True
    for x in range(int(x0), int(x1), pas):
        d.line([(x, y0 if haut else y1), (min(x + pas, x1), y1 if haut else y0)], fill=c)
        haut = not haut


def grue(d, x, y, h=120, fleche=70, arriere=34, ecart=22, c=B, chariot=0.6, charge=V, cable=None, feux=False, creux=N, liser=None):
    """Voir _grue ; liser : la couleur d'un liseré de lumière sur le flanc gauche (contre-jour)."""
    if liser is not None:
        _grue(d, x - 1, y, h, fleche, arriere, ecart, liser, chariot, liser if charge is not None else None, cable, False, None)
        _grue(d, x, y - 1, h, fleche, arriere, ecart, liser, chariot, None, cable, False, None)
    return _grue(d, x, y, h, fleche, arriere, ecart, c, chariot, charge, cable, feux, creux)


def _grue(d, x, y, h=120, fleche=70, arriere=34, ecart=22, c=B, chariot=0.6, charge=V, cable=None, feux=False, creux=N):
    """Une grue à portique de quai, de profil : deux jambes sur leurs bogies, la flèche en caisson ajouré
    au-dessus de l'eau (vers la gauche), le chevalet en A, les haubans, la salle des machines, le chariot,
    sa cabine et sa charge. En contre-jour : c=N et creux=None (une silhouette pleine, des feux verts)."""
    yp = y - int(h * 0.6)                        # le dessous de la flèche
    ya = y - h                                   # le sommet du chevalet
    feu = V
    for xx in (x, x + ecart):                    # les jambes et les bogies
        d.rectangle([xx - 1, yp, xx + 1, y - 4], fill=c)
        d.rectangle([xx - 4, y - 4, xx + 4, y - 1], fill=c)
        for k in (-3, 0, 3):
            d.point((xx + k, y), fill=c)
    d.rectangle([x - 1, y - 30, x + ecart + 1, y - 28], fill=c)                           # la traverse basse
    d.line([(x, yp + 6), (x + ecart, y - 30)], fill=c, width=2)                            # la croix de Saint-André
    d.line([(x + ecart, yp + 6), (x, y - 30)], fill=c, width=2)
    d.rectangle([x - 3, yp, x + ecart + 3, yp + 5], fill=c)                                # la poutre de portique
    d.rectangle([x - fleche, yp - 5, x + ecart + arriere, yp], fill=c)                     # la flèche, en caisson
    d.polygon([(x - fleche - 4, yp - 3), (x - fleche, yp - 5), (x - fleche, yp)], fill=c)
    if creux is not None:
        haut = True
        for xx in range(x - fleche + 2, x + ecart + arriere - 4, 5):
            if haut:
                d.polygon([(xx, yp - 1), (xx + 4, yp - 1), (xx + 2, yp - 4)], fill=creux)
            else:
                d.polygon([(xx, yp - 4), (xx + 4, yp - 4), (xx + 2, yp - 1)], fill=creux)
            haut = not haut
    d.rectangle([x + ecart + arriere - 16, yp - 13, x + ecart + arriere - 1, yp - 5], fill=c)   # la salle des machines
    if creux is not None:
        d.rectangle([x + ecart + arriere - 13, yp - 11, x + ecart + arriere - 10, yp - 9], fill=creux)
    d.line([(x + 1, yp - 5), (x + ecart // 2, ya)], fill=c, width=3)                       # le chevalet
    d.line([(x + ecart - 1, yp - 5), (x + ecart // 2, ya)], fill=c, width=3)
    d.line([(x + ecart // 4, (yp + ya) // 2), (x + ecart - ecart // 4, (yp + ya) // 2)], fill=c)
    d.line([(x + ecart // 2, ya), (x - fleche + 2, yp - 5)], fill=c)                      # les haubans
    d.line([(x + ecart // 2, ya), (x - fleche // 2, yp - 5)], fill=c)
    d.line([(x + ecart // 2, ya), (x + ecart + arriere - 2, yp - 5)], fill=c)
    xc = int(x - fleche * chariot)                                                       # le chariot et sa cabine
    d.rectangle([xc - 4, yp + 1, xc + 4, yp + 3], fill=c)
    d.rectangle([xc + 2, yp + 3, xc + 8, yp + 9], fill=c)
    d.rectangle([xc + 4, yp + 5, xc + 7, yp + 7], fill=feu if (feux or creux is None) else N)
    if cable is None:
        cable = int(h * 0.35)
    d.line([(xc - 2, yp + 3), (xc - 2, yp + cable)], fill=c)
    d.line([(xc + 1, yp + 3), (xc + 1, yp + cable)], fill=c)
    d.rectangle([xc - 9, yp + cable, xc + 8, yp + cable + 2], fill=c)                   # le palonnier
    if charge is not None:
        conteneur(d, xc - 10, yp + cable + 3, 19, 8, charge)
    if feux or creux is None:
        d.rectangle([x + ecart // 2 - 1, ya - 3, x + ecart // 2 + 1, ya - 1], fill=feu)
        d.point((x - fleche - 3, yp - 4), fill=feu)
        d.point((x + ecart + arriere - 1, yp - 14), fill=feu)
    return xc, yp + cable


def coque(d, x, y, l, hc, c=B, noir=False, contour=False):
    """Une coque : l'étrave à droite, le tableau arrière à gauche ; y est la ligne de flottaison.
    Pour l'école : des œuvres mortes blanches, une bande noire sous le pont, la flottaison verte.
    Pour la flotte noire : une silhouette pleine (cerclée de blanc si contour)."""
    pts = [(x, y - hc), (x + l - 10, y - hc), (x + l + 4, y - hc - 3), (x + l - 4, y), (x + 6, y), (x, y - 4)]
    d.polygon(pts, fill=N if noir else c)
    if noir:
        if contour:
            d.line(pts + [pts[0]], fill=B)
        d.line([(x + 6, y), (x + l - 4, y)], fill=V)
        return
    bas = y - hc // 2
    t = (bas - (y - hc - 3)) / (hc + 3)
    d.polygon([(x, bas), (x + l + 4 - 8 * t, bas), (x + l - 4, y), (x + 6, y), (x, y - 4)], fill=N)
    d.line([(x + 6, y - 1), (x + l - 4, y - 1)], fill=V)                                   # la ligne de flottaison
    d.line([(x + 1, y - hc + 2), (x + l - 6, y - hc + 2)], fill=N)
    for xx in range(x + 6, x + l - 12, 5):
        d.point((xx, y - hc + 4), fill=N)


def porte_conteneurs(im, d, x, y, l=120, hc=14, eclaire=False, noir=False, graine=1, hauteur=4, pavillon=False):
    """Un porte-conteneurs : la coque, le château à l'arrière (hublots, passerelle, cheminée), les piles sur
    le pont, en couleurs mêlées ; éclairé, ses hublots et sa ligne de feux sont verts."""
    rnd = random.Random(graine)
    coque(d, x, y, l, hc, B, noir)
    pont = y - hc
    hz = max(12, min(26, l // 4 + 2))
    lz = max(10, min(14, l // 8))
    cx0 = x + 3                                                      # le château
    d.rectangle([cx0, pont - hz, cx0 + lz, pont], fill=N if noir else B)
    for k in range(hz // 6):
        for j in range(lz // 4):
            allume = (eclaire or noir) and (j + k + graine) % 3
            d.rectangle([cx0 + 2 + j * 4, pont - hz + 3 + k * 6, cx0 + 3 + j * 4, pont - hz + 4 + k * 6],
                        fill=V if allume else (N if not noir else N))
    d.rectangle([cx0 - 2, pont - hz - 3, cx0 + lz + 2, pont - hz], fill=N if noir else B)  # la passerelle
    d.line([(cx0 - 2, pont - hz - 1), (cx0 + lz + 2, pont - hz - 1)], fill=V if (eclaire or noir) else N)
    d.rectangle([cx0 + 3, pont - hz - 9, cx0 + 7, pont - hz - 3], fill=N if noir else V)   # la cheminée
    d.line([(cx0 + 3, pont - hz - 8), (cx0 + 7, pont - hz - 8)], fill=N if not noir else N)
    if pavillon:
        d.line([(cx0 + lz, pont - hz - 16), (cx0 + lz, pont - hz - 3)], fill=B if not noir else N)
        d.polygon([(cx0 + lz + 1, pont - hz - 16), (cx0 + lz + 10, pont - hz - 14), (cx0 + lz + 1, pont - hz - 11)], fill=N if noir else V)
    xb = cx0 + lz + 4
    while xb + 12 < x + l - 8:
        n = rnd.randint(max(1, hauteur - 2), hauteur)
        for k in range(n):
            c = N if noir else rnd.choice([V, B, V, V, B])
            if noir:
                d.rectangle([xb, pont - (k + 1) * 6, xb + 11, pont - k * 6 - 1], fill=N)
            else:
                conteneur(d, xb, pont - (k + 1) * 6, 11, 5, c, portes=False)
        xb += 13
    if eclaire and not noir:
        for xx in range(x + 10, x + l - 6, 4):
            d.point((xx, pont - 1), fill=V)
    if noir:
        for xx in range(x + 12, x + l - 10, 7):
            d.rectangle([xx, y - hc + 5, xx + 1, y - hc + 6], fill=V)


def navire_noir(d, x, y, l=60, hc=10, voiles=True, contour=False, graine=1, liser=None):
    """Un navire de la flotte noire : une silhouette pleine (pour le contre-jour), une étrave en éperon,
    deux mâts gréés de voiles carrées noires, gonflées et déchirées (les déchirures laissent passer le jour),
    des conteneurs noirs, une rangée de hublots verts et un fanal. liser : un liseré de lumière (B) sur
    le flanc gauche et le haut, quand le navire passe devant un fond sombre."""
    if liser is not None:
        _navire_noir(d, x - 1, y, l, hc, voiles, graine, liser)
        _navire_noir(d, x, y - 1, l, hc, voiles, graine, liser)
    _navire_noir(d, x, y, l, hc, voiles, graine, N)
    if contour:
        pts = [(x, y - hc), (x + l - 10, y - hc), (x + l + 4, y - hc - 3), (x + l - 4, y), (x + 6, y), (x, y - 4)]
        d.line(pts + [pts[0]], fill=B)


def _navire_noir(d, x, y, l, hc, voiles, graine, c):
    rnd = random.Random(graine)
    details = c == N
    pts = [(x, y - hc), (x + l - 10, y - hc), (x + l + 4, y - hc - 3), (x + l - 4, y), (x + 6, y), (x, y - 4)]
    d.polygon(pts, fill=c)
    d.polygon([(x + l - 10, y - hc), (x + l + 10, y - hc - 8), (x + l + 4, y - hc - 3)], fill=c)    # l'éperon
    d.polygon([(x - 2, y - hc - 6), (x + 10, y - hc - 6), (x + 10, y - hc), (x, y - hc)], fill=c)    # la dunette
    for k, mx in enumerate((x + l // 3, x + 2 * l // 3 + 2)):
        hm = int(l * 0.7) + (4 if k == 0 else 0)
        d.line([(mx, y - hc), (mx, y - hc - hm)], fill=c, width=2)
        if voiles:
            larg = l // 8 + 2
            yv = y - hc - hm + 6
            for j, (lv, hv) in enumerate(((larg - 2, hm // 5), (larg, hm // 5 + 1), (larg + 2, hm // 5 + 3))):
                d.line([(mx - lv - 1, yv), (mx + lv + 1, yv)], fill=c)                      # la vergue
                d.polygon([(mx - lv, yv + 1), (mx + lv, yv + 1), (mx + lv + 2, yv + hv - 2), (mx, yv + hv),
                           (mx - lv - 2, yv + hv - 2)], fill=c)
                for _ in range(1 + j):                                                     # les déchirures
                    hx = mx + rnd.randint(-max(1, lv - 2), max(1, lv - 3))
                    hy = yv + rnd.randint(2, max(3, hv - 4))
                    if details:
                        d.line([(hx, hy), (hx + 2, hy + 1)], fill=B)
                yv += hv + 3
        d.polygon([(mx, y - hc - hm - 7), (mx + 9, y - hc - hm - 4), (mx + 3, y - hc - hm - 3), (mx, y - hc - hm - 1)], fill=c)
    d.line([(x + l + 9, y - hc - 8), (x + 2 * l // 3 + 2, y - hc - int(l * 0.7))], fill=c)       # l'étai
    d.line([(x, y - hc - 6), (x + l // 3, y - hc - int(l * 0.7) - 4)], fill=c)
    for xx in range(x + 12, x + l - 14, 7):
        if min(abs(xx + 3 - x - l // 3), abs(xx + 3 - x - 2 * l // 3 - 2)) > 5:
            d.rectangle([xx, y - hc - 4 - (xx % 3), xx + 5, y - hc], fill=c)
    if details:
        d.line([(x + 6, y), (x + l - 4, y)], fill=V)
        d.rectangle([x + l + 8, y - hc - 12, x + l + 9, y - hc - 9], fill=V)              # le fanal
        for xx in range(x + 8, x + l - 8, 5):
            d.point((xx, y - hc + 4), fill=V)


def silhouette_navire_noir(d, x, y, l=30, c=N, bord=None):
    """Un navire noir minuscule, à l'horizon : une coque, deux mâts, des voiles, un feu vert."""
    d.polygon([(x, y - 4), (x + l, y - 4), (x + l - 4, y), (x + 3, y)], fill=c)
    for mx in (x + l // 3, x + 2 * l // 3):
        d.line([(mx, y - 4), (mx, y - 4 - l // 2)], fill=c)
        d.polygon([(mx + 1, y - 3 - l // 2), (mx + l // 5 + 1, y - 5 - l // 4), (mx + 1, y - 6)], fill=c)
    if bord is not None:
        d.line([(x, y - 4), (x + l, y - 4)], fill=bord)
    d.point((x + l - 2, y - 6), fill=V)


def phare_noir(d, x, y, h=56):
    """Le phare noir : une tour noire cerclée de blanc, sa lanterne éteinte, un œil vert."""
    pts = [(x - 9, y), (x + 9, y), (x + 5, y - h), (x - 5, y - h)]
    d.polygon(pts, fill=N)
    d.line(pts + [pts[0]], fill=B)
    for k in range(3):
        yy = y - 12 - k * 16
        d.line([(x - 7 + k, yy), (x + 7 - k, yy)], fill=B)
    d.rectangle([x - 8, y - h - 3, x + 8, y - h], fill=B)
    d.rectangle([x - 5, y - h - 14, x + 5, y - h - 3], fill=N, outline=B)
    d.rectangle([x - 2, y - h - 11, x + 2, y - h - 6], fill=V)
    d.polygon([(x - 7, y - h - 14), (x + 7, y - h - 14), (x, y - h - 21)], fill=B)


def phare_clair(d, x, y, h=40, allume=True, rayon=50):
    """Le phare de Port-Aube, au loin, rayé de vert, son faisceau sur la mer."""
    d.polygon([(x - 5, y), (x + 5, y), (x + 3, y - h), (x - 3, y - h)], fill=B)
    for k in range(3):
        yy = y - 8 - k * 11
        d.rectangle([x - 4 + k // 2, yy, x + 4 - k // 2, yy + 3], fill=V)
    d.rectangle([x - 4, y - h - 8, x + 4, y - h], fill=B)
    d.rectangle([x - 2, y - h - 6, x + 2, y - h - 2], fill=V if allume else N)
    d.polygon([(x - 5, y - h - 8), (x + 5, y - h - 8), (x, y - h - 12)], fill=B)
    if allume and rayon:
        d.polygon([(x - 3, y - h - 5), (x - rayon, y - h - 14), (x - rayon, y - h + 4)], fill=V)
        d.polygon([(x - 3, y - h - 4), (x - rayon + 6, y - h - 9), (x - rayon + 6, y - h)], fill=B)


def bitte(d, x, y):
    d.rectangle([x - 2, y - 5, x + 2, y], fill=B)
    d.rectangle([x - 3, y - 7, x + 3, y - 5], fill=B)
    d.point((x, y - 3), fill=N)


def quai_beton(im, d, y, x0=0, x1=W, bittes=True, bord=True):
    """Le quai : une dalle sombre en perspective (des joints blancs qui fuient vers le large), le liseré
    de sécurité rayé de vert, les bittes d'amarrage. Des aplats nets, pas de grisaille."""
    d.rectangle([x0, y, x1, H], fill=N)
    fuite = W // 2
    for k in range(-12, 14):
        xb = fuite + k * 22
        d.line([(fuite + k * 7, y + 3), (fuite + (xb - fuite) * 2, H + (H - y))], fill=V)
    yy, pas = y + 7, 4
    while yy < H:
        d.line([(x0, yy), (x1, yy)], fill=V)
        yy += pas
        pas += 3
    if bord:
        d.rectangle([x0, y, x1, y + 2], fill=B)
        for x in range(x0, x1, 8):
            d.rectangle([x, y, x + 3, y + 2], fill=V)
        d.line([(x0, y + 3), (x1, y + 3)], fill=N)
    if bittes:
        for x in range(x0 + 14, x1, 48):
            bitte(d, x, y)


def reverbere_port(d, x, y, h=40, allume=True):
    """Un mât d'éclairage du port : un fût, une tête à deux projecteurs, un cône de lumière tramé."""
    d.rectangle([x - 1, y - h, x + 1, y], fill=B)
    d.rectangle([x - 3, y - 2, x + 3, y], fill=B)
    d.rectangle([x - 7, y - h - 2, x + 7, y - h], fill=B)
    for xx in (x - 6, x + 3):
        d.rectangle([xx, y - h + 1, xx + 3, y - h + 3], fill=V if allume else N)
    if allume:
        for xx in (x - 5, x + 4):
            for k in range(1, h, 1):
                larg = k * 0.35
                t = 0.35 * (1 - k / h)
                for dx in range(int(-larg), int(larg) + 1):
                    xxx, yyy = int(xx + dx), int(y - h + 3 + k)
                    if 0 <= xxx < W and 0 <= yyy < H and BAYER[yyy % 4][xxx % 4] < t * 16:
                        d.point((xxx, yyy), fill=V)


def drapeaux_signaux(d, x, y, n=5, l=60):
    """Une drisse de pavillons de signaux, en guirlande."""
    for k in range(n):
        xx = x + k * l // n
        yy = y + int(4 * math.sin(math.pi * k / max(1, n - 1)))
        d.line([(xx, yy), (xx + l // n, y + int(4 * math.sin(math.pi * (k + 1) / max(1, n - 1))))], fill=B)
        c = V if k % 2 else B
        d.polygon([(xx + 2, yy + 1), (xx + 8, yy + 1), (xx + 5, yy + 8)], fill=c)


def silhouette(d, x, y, h=30, c=B, casquette=False):
    """Un personnage au loin, de face ou de dos."""
    d.rectangle([x - 3, y - h, x + 3, y - h + 6], fill=c)
    if casquette:
        d.rectangle([x - 4, y - h - 2, x + 4, y - h], fill=c)
        d.rectangle([x + 2, y - h, x + 6, y - h], fill=c)
    d.polygon([(x - 6, y - h + 7), (x + 6, y - h + 7), (x + 7, y - 9), (x - 7, y - 9)], fill=c)
    d.rectangle([x - 4, y - 9, x - 2, y], fill=c)
    d.rectangle([x + 2, y - 9, x + 4, y], fill=c)


def feu_de_camp(d, x, y, r=10):
    """Un feu de camp : un grand halo vert, des bûches croisées, des flammes en deux couleurs, des étincelles."""
    halo(d, x, y - 6, r * 3.6, V, 0.6, r * 2.4)
    for k in (-1, 1):
        d.line([(x - r, y + 2 * k + 2), (x + r, y - 2 * k + 2)], fill=B, width=3)
        d.line([(x - r, y + 2 * k + 2), (x + r, y - 2 * k + 2)], fill=N, width=1)
    f = r / 10
    d.polygon([(x - 7 * f, y), (x - 5 * f, y - 9 * f), (x - 2 * f, y - 6 * f), (x, y - 16 * f), (x + 3 * f, y - 7 * f),
               (x + 6 * f, y - 11 * f), (x + 7 * f, y)], fill=V)
    d.polygon([(x - 4 * f, y), (x - 1 * f, y - 6 * f), (x + 1 * f, y - 10 * f), (x + 3 * f, y - 4 * f), (x + 4 * f, y)], fill=B)
    for (dx, dy) in ((-4, -22), (5, -26), (1, -32), (-7, -30)):
        d.point((x + dx * f, y + dy * f), fill=B if dx % 2 else V)


def radio(d, x, y):
    """La radio de Grace : un boîtier, un cadran vert, une antenne."""
    d.rectangle([x, y - 10, x + 16, y], fill=B)
    d.rectangle([x + 2, y - 8, x + 9, y - 3], fill=V)
    d.line([(x + 3, y - 6), (x + 8, y - 6)], fill=N)
    d.ellipse([x + 11, y - 8, x + 14, y - 5], fill=N)
    d.line([(x + 14, y - 10), (x + 20, y - 22)], fill=B)
    d.point((x + 20, y - 23), fill=V)
    for k in (3, 6):
        d.arc([x + 20 - k, y - 23 - k, x + 20 + k, y - 23 + k], 270, 360, fill=V)


# ------------------------------------------------------------------
# Le Grand Port : au lever du jour, dans la bataille, dans la victoire
# ------------------------------------------------------------------

def ciel_contre_jour(d, horizon, haut=0.15, lueur=26, fort=0.75):
    """Le ciel du contre-jour : le vert qui s'épaissit jusqu'à l'horizon, une lueur blanche posée dessus ;
    les silhouettes noires s'y découpent nettement."""
    degrade(d, 0, 0, W, horizon, V, haut, 1.0)
    degrade(d, 0, horizon - lueur, W, horizon, B, 0, fort)


def soleil_raye(d, x, y, r=16, horizon=None):
    """Le grand soleil qui sort de l'eau, rayé de bandes noires qui s'élargissent vers le bas."""
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    yy, ep = y - r // 3, 1
    while yy < y + r:
        d.rectangle([x - r - 1, yy, x + r + 1, yy + ep - 1], fill=N if horizon is None or yy <= horizon else N)
        yy += ep + 3
        ep += 1
    if horizon is not None:
        d.rectangle([x - r - 1, horizon + 1, x + r + 1, y + r + 1], fill=N)


def reflet_silhouette(d, x0, x1, y, n=4, c=V):
    """Le reflet brisé d'une coque sombre, sous la ligne de flottaison."""
    for k in range(n):
        for x in range(x0 + (k * 5) % 7, x1, 9):
            d.line([(x, y + 2 + k * 2), (x + 4 - k, y + 2 + k * 2)], fill=c)


def grand_port():
    """Le Grand Port au lever du jour, en contre-jour : le soleil rayé sort de la mer, deux grues à portique
    se découpent en noir, un porte-conteneurs à quai, ses piles de couleur, une charge qui monte ;
    au premier plan, la dalle du quai, deux piles de conteneurs, un mât d'éclairage, des mouettes."""
    im, d = toile()
    ciel_contre_jour(d, 84)
    soleil_raye(d, 50, 84, 17, horizon=84)
    for (x, h) in ((150, 14), (164, 18)):                                                 # la rive d'en face
        d.line([(x, 84), (x, 84 - h)], fill=N); d.line([(x - 12, 84 - h), (x + 6, 84 - h)], fill=N)
    d.rectangle([128, 82, W, 84], fill=N)
    mer(d, 86, 126, 1, V, reflet=50, larg=10, c_reflet=B)
    porte_conteneurs(im, d, 4, 126, 150, 15, graine=4, hauteur=4)
    grue(d, 120, 142, 134, 92, 28, 20, c=N, creux=None, chariot=0.45, charge=V, cable=30, liser=B)
    grue(d, 160, 142, 108, 40, 14, 14, c=N, creux=None, chariot=0.3, charge=None, cable=16, liser=B)
    quai_beton(im, d, 132)
    pile(im, d, 0, 170, [[V, B], [N, V], [B]], 26, 11, 6)
    pile(im, d, 124, 170, [[B, V], [V]], 22, 11, 5)
    mouettes(d, [(72, 22, 3), (84, 30, 2), (98, 18, 3), (60, 44, 2)], N)
    return im


def grand_port_victoire():
    """La baie illuminée : la nuit, le port tout allumé, des feux d'artifice, le navire pavoisé de lampions ;
    à l'horizon, sous la lune, les navires noirs virent de bord et s'en vont."""
    im, d = toile()
    ciel_nuit(d, 84, 9, 36)
    degrade(d, 0, 66, W, 84, V, 0, 0.9)
    lune_pleine(d, 146, 24, 9)
    feu_artifice(d, 34, 28, 15); feu_artifice(d, 72, 14, 10, V, B); feu_artifice(d, 104, 36, 12, B, V, 14)
    for x in (10, 30, 128, 150):                                                          # les navires noirs qui s'en vont
        silhouette_navire_noir(d, x, 84, 16)
    mer(d, 86, 124, 3, V, reflet=146, larg=6, c_reflet=B)
    for x in range(14, 170, 18):                                                          # les reflets des lumières du port
        for k in range(5):
            d.line([(x + (k % 2) * 2, 104 + k * 4), (x + 3 + (k % 2) * 2, 104 + k * 4)], fill=B if k % 2 else V)
    porte_conteneurs(im, d, 6, 124, 112, 15, eclaire=True, graine=4, hauteur=4, pavillon=True)
    for k in range(21):                                                                   # le grand pavois
        t = k / 20
        xa, ya = 10 + 106 * t, 82 + 20 * (2 * t - 1) ** 2
        d.point((xa, ya), fill=V if k % 2 else B)
    grue(d, 120, 142, 134, 92, 28, 20, chariot=0.45, charge=V, cable=30, feux=True)
    grue(d, 160, 142, 108, 40, 14, 14, chariot=0.3, charge=None, cable=16, feux=True)
    quai_beton(im, d, 132)
    reverbere_port(d, 92, 160, 30)
    pile(im, d, 0, 170, [[V, B], [N, V], [B]], 26, 11, 6)
    for (x, y) in ((64, 168), (78, 168), (112, 168)):
        personnage_ombre(d, x, y, 26, c=B)
    return im


def faisceau(d, x0, y0, x1, y1, ouverture=10, t=0.2, c=B):
    """Un faisceau de projecteur : deux bords nets et une lumière légèrement tramée entre eux."""
    n = int(math.hypot(x1 - x0, y1 - y0))
    for k in range(n):
        f = k / n
        cx, cy = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f
        e = 1 + ouverture * f
        trame(d, cx - e, cy, cx + e, cy, c, t * (1 - f * 0.5))
    d.line([(x0, y0), (x1 - ouverture, y1)], fill=c)
    d.line([(x0, y0), (x1 + ouverture, y1)], fill=c)


def ciel_dechire(im, d, horizon, graine=7, haut_clair=58):
    """Le ciel d'orage déchiré par l'aube : des nuages lourds en haut, et sous eux une bande de jour
    presque blanche jusqu'à l'horizon, où les silhouettes noires se découpent."""
    degrade(d, 0, 0, W, haut_clair, V, 0.25, 0.85)
    degrade(d, 0, haut_clair - 6, W, horizon, V, 0.85, 1.0)
    degrade(d, 0, haut_clair - 4, W, horizon, B, 0.2, 0.95)
    nuages(im, d, 14, graine, 9, 1.1, 0.95)


def bataille_aube():
    """La bataille de l'aube : sous l'orage, la flotte noire s'avance en ligne, noire sur la bande du jour ;
    devant elle, l'escadre de l'école tient, blanche et verte, pavillons hissés ; la pluie, l'éclair."""
    im, d = toile()
    ciel_dechire(im, d, 98)
    pluie(d, 0, 24, W, 50, 9, 5, B)
    eclair(d, 150, 20, 34, 3)
    for k, (x, yy, l) in enumerate(((-4, 96, 34), (46, 98, 46), (112, 97, 36), (160, 95, 22))):   # la flotte noire
        navire_noir(d, x, yy, l, 6 + l // 12, graine=k + 2)
    mer(d, 100, H, 5, V)
    reflet_silhouette(d, 0, W, 98, 3, N)
    porte_conteneurs(im, d, 4, 140, 78, 11, eclaire=True, graine=7, hauteur=3, pavillon=True)
    porte_conteneurs(im, d, 92, 156, 80, 12, eclaire=True, graine=9, hauteur=3, pavillon=True)
    mer(d, 158, H, 11, B)
    return im


# ------------------------------------------------------------------
# Les quatorze quais
# ------------------------------------------------------------------

def quai_premiers_pas():
    """Le Quai des Premiers Pas : sur la dalle vide, un seul conteneur, portes ouvertes, une lampe allumée
    dedans ; des empreintes de pas mènent jusqu'à lui ; le crochet d'une grue descend ; la mer au matin."""
    im, d = toile()
    ciel_contre_jour(d, 72, 0.1, 22, 0.6)
    soleil_raye(d, 150, 72, 10, horizon=72)
    for x in (16, 34):                                                                    # des grues au loin
        d.line([(x, 72), (x, 54)], fill=N); d.line([(x + 5, 72), (x + 5, 54)], fill=N)
        d.line([(x - 12, 52), (x + 10, 52)], fill=N, width=2); d.line([(x + 2, 46), (x - 10, 52)], fill=N)
    mer(d, 74, 100, 2, V, reflet=150, larg=7, c_reflet=B)
    quai_beton(im, d, 100)
    d.line([(70, 0), (70, 44)], fill=B); d.line([(73, 0), (73, 44)], fill=B)                # le crochet
    d.rectangle([66, 44, 77, 48], fill=B)
    d.arc([65, 48, 77, 60], 300, 200, fill=B, width=2)
    x, y, w, h, p = 40, 104, 70, 34, 16                                                  # le conteneur
    conteneur3d(im, d, x, y, w, h, p, V, portes=False)
    bout = [(x + w, y), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2), (x + w, y + h)]
    d.polygon(bout, fill=N)                                                               # l'intérieur, dans l'ombre
    halo(d, x + w + p // 2, y + h // 2, 14, B, 0.45, 12)
    d.line([(x + w + 8, y - 4), (x + w + 8, y + 6)], fill=B)                              # la lampe
    d.rectangle([x + w + 6, y + 6, x + w + 10, y + 10], fill=V)
    d.line(bout + [bout[0]], fill=B)
    vx = x + w + p                                                                        # un battant ouvert vers nous
    battant = [(vx, y - p // 2), (vx + 18, y - p // 2 + 8), (vx + 18, y + h - p // 2 + 12), (vx, y + h - p // 2)]
    d.polygon(battant, fill=V)
    for k in range(3, 18, 3):
        d.line([(vx + k, y - p // 2 + k * 8 // 18 + 1), (vx + k, y + h - p // 2 + k * 12 // 18 - 1)], fill=N)
    d.line(battant + [battant[0]], fill=B)
    for k, (px, py) in enumerate(((22, 162), (34, 156), (44, 150), (56, 146), (66, 142), (80, 140), (92, 139))):   # les pas
        d.rectangle([px, py, px + 3, py + 4], fill=B)
        d.rectangle([px + 1, py + 6, px + 2, py + 7], fill=B)
    d.rectangle([150, 108, 152, 140], fill=B)                                             # le poteau et sa pancarte
    d.rectangle([138, 106, 170, 120], fill=B); d.rectangle([140, 108, 168, 118], fill=N)
    d.polygon([(144, 113), (158, 113), (158, 110), (164, 113), (158, 116), (158, 113)], fill=V)
    return im


def capitainerie():
    """La Capitainerie : une grande baie vitrée sur le port, le tableau des conteneurs (des voyants allumés,
    d'autres éteints), le bureau, le journal de bord ouvert, la cloche et la radio."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.rectangle([8, 10, 168, 74], fill=B)                                                # la baie vitrée
    d.rectangle([10, 12, 166, 72], fill=N)
    degrade(d, 10, 12, 166, 50, V, 0.15, 0.7)
    degrade(d, 10, 40, 166, 50, B, 0, 0.4)
    mer(d, 52, 72, 3, B)
    for x in (40, 120):
        grue(d, x, 58, 46, 22, 10, 8, chariot=0.5, charge=None, cable=8)
    porte_conteneurs(im, d, 60, 64, 52, 6, graine=2, hauteur=2)
    for x in (62, 114):
        d.rectangle([x, 12, x + 1, 72], fill=B)
    d.rectangle([116, 84, 168, 128], fill=B)                                              # le tableau des voyants
    d.rectangle([118, 86, 166, 126], fill=N)
    for r_ in range(5):
        for c_ in range(4):
            xx, yy = 122 + c_ * 11, 90 + r_ * 7
            allume = (r_ * 4 + c_) % 3 != 1
            d.rectangle([xx, yy, xx + 7, yy + 4], fill=B)
            d.rectangle([xx + 1, yy + 1, xx + 2, yy + 3], fill=V if allume else N)
            d.line([(xx + 4, yy + 2), (xx + 6, yy + 2)], fill=N)
    d.polygon([(0, 128), (120, 128), (112, 144), (0, 144)], fill=B)                       # le bureau
    d.rectangle([0, 144, 112, H], fill=N)
    for yy in range(148, H, 6):
        d.line([(0, yy), (112, yy)], fill=V)
    d.polygon([(28, 120), (54, 118), (56, 128), (30, 130)], fill=B)                       # le journal de bord
    d.polygon([(56, 118), (82, 120), (80, 130), (56, 128)], fill=B)
    for k in range(4):
        d.line([(32, 121 + k * 2), (52, 120 + k * 2)], fill=N)
        d.line([(59, 120 + k * 2), (78, 121 + k * 2)], fill=V if k == 1 else N)
    radio(d, 88, 128)
    d.rectangle([14, 84, 16, 96], fill=B)                                                 # la cloche
    d.polygon([(6, 108), (24, 108), (20, 96), (10, 96)], fill=V)
    ombrer(im, 6, 96, 24, 108, V, N, 0.0, 0.5, 'h')
    d.rectangle([14, 108, 16, 111], fill=B)
    d.rectangle([4, 82, 26, 84], fill=B)
    d.rectangle([118, 140, 168, 170], fill=N)
    return im


def entrepot_plans():
    """L'Entrepôt des plans : des casiers de plans roulés, scellés d'un cachet ; sur la table, un plan
    de conteneur déplié sous la lampe ; les étiquettes de version au mur."""
    im, d = toile()
    d.rectangle([0, 0, W, 112], fill=N)
    for x in range(0, W, 30):                                                             # la charpente
        d.line([(x, 0), (x + 15, 14)], fill=B); d.line([(x + 30, 0), (x + 15, 14)], fill=B)
    d.line([(0, 14), (W, 14)], fill=B)
    for x0 in (4, 120):                                                                   # les casiers
        d.rectangle([x0, 20, x0 + 52, 108], fill=B)
        for r_ in range(6):
            for c_ in range(4):
                xx, yy = x0 + 3 + c_ * 12, 23 + r_ * 14
                d.rectangle([xx, yy, xx + 10, yy + 11], fill=N)
                if (r_ + c_ + x0) % 5:
                    d.ellipse([xx + 2, yy + 2, xx + 9, yy + 9], fill=B)
                    d.ellipse([xx + 4, yy + 4, xx + 7, yy + 7], fill=N)
                    if (r_ * 3 + c_) % 4 == 0:
                        d.rectangle([xx + 4, yy + 8, xx + 7, yy + 10], fill=V)               # le cachet
        ombrer(im, x0, 20, x0 + 52, 108, B, N, 0.0, 0.5)
    d.line([(88, 0), (88, 30)], fill=B)                                                   # la lampe
    d.polygon([(78, 38), (98, 38), (92, 30), (84, 30)], fill=V)
    halo(d, 88, 80, 46, V, 0.4, 40)
    d.polygon([(26, 112), (150, 112), (170, 150), (6, 150)], fill=B)                     # la table, le plan
    d.polygon([(40, 116), (136, 116), (150, 144), (26, 144)], fill=V)
    trame(d, 30, 116, 146, 144, B, 0.12)
    d.rectangle([62, 124, 108, 136], fill=N)                                              # le conteneur, au trait
    d.rectangle([64, 126, 106, 134], fill=V)
    for xx in range(66, 106, 3):
        d.line([(xx, 127), (xx, 133)], fill=N)
    for (x0, x1, yy) in ((62, 108, 140), (52, 58, 122)):
        d.line([(x0, yy), (x1, yy)], fill=N)
    d.line([(116, 120), (128, 120)], fill=N); d.line([(116, 124), (124, 124)], fill=N)
    d.ellipse([118, 128, 130, 140], fill=N); d.ellipse([121, 131, 127, 137], fill=V)     # le sceau
    d.rectangle([0, 150, W, H], fill=N)
    degrade(d, 0, 150, W, H, V, 0.4, 0.1)
    return im


def soutes():
    """Les Soutes : le ventre du navire en perspective, une enfilade de membrures courbes ; au fond la lumière ;
    l'échelle sous l'écoutille où tombe le jour ; des tonneaux cerclés bien rangés, une lanterne."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 74
    halo(d, fx, fy + 6, 26, V, 0.6, 18)
    for k in range(7, -1, -1):                                                             # les membrures
        sc = 1.0 / (1 + k * 0.42)
        hw, ht, hb = 96 * sc, 86 * sc, 74 * sc
        c = B if k < 4 else V
        ep = max(1, int(4 * sc))
        d.arc([fx - hw, fy - ht, fx + hw, fy + ht * 1.1], 180, 360, fill=c, width=ep)
        d.line([(fx - hw, fy + 4), (fx - hw * 0.92, fy + hb)], fill=c, width=ep)
        d.line([(fx + hw, fy + 4), (fx + hw * 0.92, fy + hb)], fill=c, width=ep)
    d.polygon([(0, H), (W, H), (fx + 18, fy + 14), (fx - 18, fy + 14)], fill=N)            # le plancher
    for k in range(-6, 7):
        d.line([(fx + k * 3, fy + 14), (fx + k * 30, H)], fill=V)
    yy, pas = fy + 18, 3
    while yy < H:
        d.line([(fx - 18 - (yy - fy - 14) * 1.25, yy), (fx + 18 + (yy - fy - 14) * 1.25, yy)], fill=V)
        yy += pas
        pas += 2
    d.rectangle([fx - 14, 0, fx + 14, 6], fill=B)                                         # l'écoutille et le jour
    for k in range(36):
        trame(d, fx - 12 - k * 0.5, 6 + k * 3, fx + 12 + k * 0.5, 7 + k * 3, B, 0.3 * (1 - k / 40))
    d.line([(fx - 8, 6), (fx - 14, 128)], fill=B, width=2); d.line([(fx + 8, 6), (fx + 14, 128)], fill=B, width=2)
    for k in range(10):
        y = 14 + k * 12
        d.line([(fx - 8 - k * 0.6, y), (fx + 8 + k * 0.6, y)], fill=B, width=1)
    for (x, y, g) in ((2, 160, 1), (26, 164, 1), (16, 132, 0), (128, 164, 1), (152, 160, 1), (144, 132, 0)):   # les tonneaux
        tonneau(im, d, x, y, g)
    d.line([(140, 0), (140, 44)], fill=B)                                                 # la lanterne
    d.rectangle([135, 44, 145, 58], fill=B); d.rectangle([137, 46, 143, 56], fill=V)
    d.polygon([(134, 44), (146, 44), (140, 39)], fill=B)
    halo(d, 140, 51, 22, V, 0.45)
    return im


def tonneau(im, d, x, y, grand=1):
    """Un tonneau cerclé : le corps vert, l'ombre à droite en aplat, deux cercles blancs, le couvercle."""
    w, h = (22, 28) if grand else (16, 20)
    d.rectangle([x, y - h + 3, x + w, y - 3], fill=V)
    d.ellipse([x, y - 6, x + w, y], fill=V)
    d.rectangle([x + w - w // 4, y - h + 3, x + w, y - 3], fill=N)
    for xx in range(x + w - w // 4, x + w, 2):
        d.line([(xx, y - h + 4), (xx, y - 4)], fill=V)
    for yy in (y - h + 8, y - 8):
        d.line([(x, yy), (x + w, yy)], fill=B)
    d.ellipse([x, y - h, x + w, y - h + 6], fill=B)
    d.ellipse([x + 2, y - h + 1, x + w - 2, y - h + 5], fill=N)
    d.line([(x + w // 2 - 2, y - h + 3), (x + w // 2 + 2, y - h + 3)], fill=V)


def chenaux():
    """Les Chenaux, vus de haut : des quais qui se répondent, des chenaux d'eau entre eux, des bouées vertes,
    une écluse, des barques qui passent d'un quai à l'autre."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    mer(d, 0, H, 6, V)
    for (x0, y0, x1, y1) in ((0, 0, 50, 46), (78, 0, 176, 36), (0, 76, 40, 120), (70, 64, 120, 110),
                             (150, 64, 176, 130), (0, 150, 90, 170), (118, 146, 176, 170)):          # les quais
        d.rectangle([x0, y0, x1, y1], fill=B)
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=V)
        for xx in range(x0 + 4, x1 - 8, 14):
            for yy in range(y0 + 4, y1 - 6, 10):
                d.rectangle([xx, yy, xx + 9, yy + 5], fill=V if (xx + yy) % 3 else B)
    for (x, y) in ((60, 30), (60, 56), (136, 50), (46, 134), (100, 132), (136, 110)):    # les bouées
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=V)
    d.rectangle([120, 80, 150, 84], fill=B); d.rectangle([120, 96, 150, 100], fill=B)    # l'écluse
    for (x, y, a) in ((54, 64, 0), (128, 122, 1), (96, 44, 0)):                           # les barques et leur sillage
        if a:
            d.polygon([(x - 4, y - 8), (x + 4, y - 8), (x + 4, y + 4), (x, y + 8), (x - 4, y + 4)], fill=B)
            d.rectangle([x - 2, y - 5, x + 2, y + 1], fill=V)
            d.line([(x - 6, y - 10), (x - 10, y - 22)], fill=B); d.line([(x + 6, y - 10), (x + 10, y - 22)], fill=B)
        else:
            d.polygon([(x - 8, y - 4), (x + 4, y - 4), (x + 8, y), (x + 4, y + 4), (x - 8, y + 4)], fill=B)
            d.rectangle([x - 5, y - 2, x + 1, y + 2], fill=V)
            d.line([(x - 10, y - 6), (x - 22, y - 10)], fill=B); d.line([(x - 10, y + 6), (x - 22, y + 10)], fill=B)
    for (a, b) in (((40, 98), (70, 88)), ((120, 90), (150, 92)), ((50, 24), (78, 18))):    # les passerelles
        d.line([a, b], fill=B, width=3)
        d.line([a, b], fill=N, width=1)
    return im


def chantier_naval():
    """Le Chantier naval, à contre-jour : une grande coque neuve sur ses tins ; l'avant est déjà bordé,
    l'arrière n'est encore qu'un squelette de membrures qui se découpe sur l'aube ; un échafaudage,
    des charpentiers minuscules, une étincelle de soudure sur la tôle."""
    im, d = toile()
    degrade(d, 0, 0, W, 112, V, 0.1, 1.0)
    degrade(d, 0, 40, W, 112, B, 0.0, 0.95)
    quai_beton(im, d, 112, bittes=False, bord=False)

    def quille(x):
        if x < 34:
            return 96 - (34 - x) * 1.6
        if x > 140:
            return 104 - (x - 140) * 2.2
        return 104 - max(0, 46 - (x - 34)) * 0.17

    def pont(x):
        return 50 - max(0, x - 120) * 0.35
    xs = range(10, 166, 2)
    d.line([(x, quille(x)) for x in xs], fill=N, width=4)                                 # la quille et l'étrave
    d.line([(10, pont(10)), (84, pont(84))], fill=N, width=2)
    for x in range(12, 84, 7):                                                            # les membrures de l'arrière
        d.line([(x, pont(x)), (x, quille(x))], fill=N, width=2)
    d.line([(12, (pont(12) + quille(12)) // 2), (84, 76)], fill=N)
    bord = [(84, pont(84))] + [(x, pont(x)) for x in range(86, 166, 2)] + [(x, quille(x)) for x in range(164, 82, -2)]
    d.polygon(bord, fill=N)                                                               # la partie bordée
    d.line([(84, pont(84))] + [(x, pont(x)) for x in range(86, 166, 2)], fill=B)
    for x in range(92, 160, 10):
        d.line([(x, pont(x) + 3), (x, quille(x) - 3)], fill=V)
    for k in (1, 2, 3):
        d.line([(84, pont(84) + k * 13), (156, pont(156) + k * 13)], fill=V)
    d.line([(84, pont(84)), (84, quille(84))], fill=B)
    for x in range(26, 160, 18):                                                          # les tins
        d.rectangle([x, quille(x) + 1, x + 6, 114], fill=N)
    for x in (96, 132):                                                                   # l'échafaudage
        d.line([(x, 36), (x, 112)], fill=N, width=2)
    for y in (44, 66, 88):
        d.line([(92, y), (136, y)], fill=N, width=2)
    silhouette(d, 112, 66, 14, N)
    silhouette(d, 120, 88, 14, N)
    halo(d, 128, 80, 12, B, 0.8)                                                          # la soudure, sur la tôle
    for a in range(10):
        d.line([(128, 80), (128 + 6 * math.cos(a * 0.63), 80 + 6 * math.sin(a * 0.63))], fill=B)
    d.point((128, 80), fill=V)
    silhouette(d, 40, 126, 16, B)
    silhouette(d, 52, 128, 14, B, casquette=True)
    return im


def cales():
    """Les Cales : le navire en coupe, posé sur l'eau ; ses ponts s'empilent comme des couches,
    la plus lourde au fond (le lest), la plus neuve en haut, en vert ; chaque cale porte son numéro."""
    im, d = toile()
    degrade(d, 0, 0, W, 104, V, 0.0, 0.7)
    degrade(d, 0, 84, W, 104, B, 0.0, 0.5)
    mer(d, 106, H, 8, V)
    coque_pts = [(20, 30), (156, 30), (154, 96), (146, 116), (130, 126), (46, 126), (30, 116), (22, 96)]
    d.polygon(coque_pts, fill=B)
    inner = [(24, 34), (152, 34), (150, 95), (143, 113), (128, 122), (48, 122), (33, 113), (26, 95)]
    d.polygon(inner, fill=N)
    d.rectangle([60, 12, 96, 30], fill=B); d.rectangle([62, 14, 94, 28], fill=N)        # la passerelle
    for x in range(66, 92, 6):
        d.rectangle([x, 17, x + 3, 21], fill=V)
    d.rectangle([100, 18, 106, 30], fill=V)
    couches = [(36, 'neuf'), (54, 'conteneurs'), (72, 'caisses'), (90, 'sacs'), (106, 'lest')]
    for k, (y, genre) in enumerate(couches):
        g = 26 + k * 2 if k < 3 else 30 + (k - 2) * 6
        dr = 150 - (k - 2) * 4 if k > 2 else 150
        xg, xd = (26 + (k - 2) * 5 if k > 2 else 26), (150 - (k - 2) * 5 if k > 2 else 150)
        d.line([(xg, y + 15), (xd, y + 15)], fill=B)
        if genre == 'neuf':
            for xx in range(xg + 4, xd - 22, 22):
                conteneur(d, xx, y + 4, 20, 10, V)
        elif genre == 'conteneurs':
            for j, xx in enumerate(range(xg + 4, xd - 22, 22)):
                conteneur(d, xx, y + 4, 20, 10, B if j % 2 else V)
        elif genre == 'caisses':
            for xx in range(xg + 4, xd - 20, 16):
                caisse_x(d, xx, y + 3, 13, 11)
        elif genre == 'sacs':
            for xx in range(xg + 6, xd - 16, 12):
                d.ellipse([xx, y + 5, xx + 10, y + 14], fill=V)
                d.line([(xx + 4, y + 5), (xx + 6, y + 5)], fill=B)
        else:
            for xx in range(xg + 8, xd - 14, 10):
                d.rectangle([xx, y + 6, xx + 7, y + 14], fill=B)
                d.line([(xx + 1, y + 10), (xx + 6, y + 10)], fill=N)
        d.rectangle([xd - 14, y + 3, xd - 4, y + 12], fill=N, outline=V)                  # le numéro de cale
        d.text((xd - 11, y + 2), str(5 - k), fill=B)
    d.line([(10, 104), (166, 104)], fill=V)                                               # la ligne de flottaison
    for x in range(0, W, 9):
        d.line([(x, 112), (x + 4, 112)], fill=B)
    d.line([(10, 30), (10, 122)], fill=B)                                                 # l'échelle des couches
    for k in range(5):
        d.line([(7, 38 + k * 18), (13, 38 + k * 18)], fill=B)
    return im


def chantier_maitres():
    """Le Chantier des maîtres : à gauche, le grand atelier encombré de la première étape (caisses, outils,
    copeaux, la pancarte « AS build ») ; une passerelle fléchée ; à droite, au soleil, le petit navire fin
    et léger qui part : il n'emporte que l'essentiel."""
    im, d = toile()
    ciel_contre_jour(d, 84, 0.1, 24, 0.6)
    soleil_raye(d, 140, 84, 13, horizon=84)
    mer(d, 86, H, 9, V, reflet=140, larg=10, c_reflet=B)
    d.rectangle([0, 26, 80, 152], fill=B)                                                 # l'atelier
    d.polygon([(-6, 28), (86, 28), (40, 4)], fill=V)
    d.polygon([(4, 26), (76, 26), (40, 8)], fill=N)
    d.line([(4, 26), (40, 8), (76, 26)], fill=B)
    d.rectangle([4, 34, 76, 148], fill=N)
    for k in range(6):                                                                    # les outils au mur
        d.line([(10 + k * 11, 40), (10 + k * 11, 52 + (k % 3) * 4)], fill=V)
        d.rectangle([7 + k * 11, 52 + (k % 3) * 4, 13 + k * 11, 55 + (k % 3) * 4], fill=V)
    d.rectangle([6, 62, 74, 63], fill=B)
    d.rectangle([12, 68, 66, 80], fill=B); d.rectangle([13, 69, 65, 79], fill=N)         # la pancarte
    d.text((17, 68), "AS build", fill=V)
    for (x, y, w, h) in ((8, 128, 20, 18), (30, 132, 16, 14), (50, 124, 22, 22), (12, 110, 16, 16), (36, 114, 18, 16), (54, 104, 14, 18)):
        caisse_x(d, x, y, w, h)
    for (x, y) in ((22, 98), (44, 92), (66, 96), (30, 86)):                                # les copeaux
        d.arc([x, y, x + 6, y + 4], 0, 300, fill=V)
    d.rectangle([80, 130, 112, 133], fill=B)                                              # la passerelle fléchée
    for x in range(82, 112, 6):
        d.line([(x, 133), (x, 146)], fill=B)
    d.polygon([(88, 124), (100, 124), (100, 121), (106, 126), (100, 131), (100, 128), (88, 128)], fill=V)
    x, y = 112, 140                                                                       # le petit navire final
    d.polygon([(x, y - 9), (x + 50, y - 9), (x + 60, y - 14), (x + 54, y), (x + 5, y)], fill=B)
    d.polygon([(x + 2, y - 4), (x + 56, y - 4), (x + 54, y), (x + 5, y)], fill=N)
    d.line([(x + 5, y - 1), (x + 54, y - 1)], fill=V)
    conteneur(d, x + 18, y - 17, 18, 7, V)
    d.rectangle([x + 4, y - 22, x + 14, y - 9], fill=B); d.rectangle([x + 6, y - 20, x + 12, y - 17], fill=V)
    d.line([(x + 44, y - 9), (x + 44, y - 46)], fill=B)
    d.polygon([(x + 45, y - 44), (x + 60, y - 28), (x + 45, y - 12)], fill=V)
    d.polygon([(x + 43, y - 42), (x + 36, y - 26), (x + 43, y - 14)], fill=B)
    for k in range(5):                                                                    # le sillage
        d.line([(x - 2 - k * 7, y + 2 + k * 2), (x - 8 - k * 7, y + 3 + k * 2)], fill=B)
    reflet_silhouette(d, x + 6, x + 54, y, 3, V)
    return im


def registre_port():
    """Le Registre du port : un entrepôt gardé ; derrière la grille, des étagères de conteneurs numérotés ;
    la guérite du gardien, son cadenas et son registre ouvert ; une lanterne au-dessus de la porte."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.rectangle([10, 14, 166, 140], fill=B)                                               # le mur et la grande porte
    d.polygon([(4, 14), (172, 14), (88, -6)], fill=V)
    d.rectangle([30, 34, 146, 140], fill=N)
    for r_ in range(4):                                                                   # les rayonnages
        y = 128 - r_ * 22
        d.rectangle([34, y + 8, 142, y + 9], fill=B)
        for c_ in range(5):
            conteneur(d, 36 + c_ * 21, y - 4, 18, 11, V if (r_ + c_) % 3 == 0 else (B if (r_ + c_) % 3 == 1 else N), portes=True)
            for k in range(min(4, (r_ * 5 + c_) % 4 + 1)):
                d.point((38 + c_ * 21 + k * 2, y - 2), fill=N if (r_ + c_) % 3 != 2 else B)
    for x in range(30, 148, 6):                                                           # la grille
        d.line([(x, 34), (x, 140)], fill=B)
    d.rectangle([84, 80, 92, 92], fill=V); d.rectangle([86, 74, 90, 80], outline=V)     # le cadenas
    d.rectangle([87, 84, 89, 88], fill=N)
    d.rectangle([84, 22, 92, 30], fill=V); halo(d, 88, 26, 14, V, 0.6)                   # la lanterne
    d.text((40, 20), ":5000", fill=N)
    d.rectangle([0, 140, W, H], fill=N)
    for yy in range(146, H, 6):
        d.line([(0, yy), (W, yy)], fill=V)
    d.rectangle([150, 108, 176, 150], fill=V)                                             # la guérite
    d.rectangle([154, 114, 172, 126], fill=N)
    d.rectangle([156, 116, 162, 124], fill=B)
    d.polygon([(146, 108), (176, 108), (176, 100)], fill=B)
    d.polygon([(4, 150), (30, 146), (34, 156), (8, 160)], fill=B)                         # le registre ouvert
    for k in range(3):
        d.line([(9, 151 + k * 2), (28, 148 + k * 2)], fill=N)
    return im


def feuille_route():
    """La Feuille de route : la table à cartes, une carte marine où quatre navires se suivent en convoi,
    reliés par la même route ; le compas à pointes, la règle, la lampe."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 60, 90, V, 0.35, 70)
    d.polygon([(10, 34), (166, 34), (176, 150), (0, 150)], fill=B)                        # la carte
    d.polygon([(14, 38), (162, 38), (170, 146), (6, 146)], fill=V)
    trame(d, 6, 38, 170, 146, B, 0.15)
    for k in range(5):
        d.line([(12 + k * 2, 50 + k * 22), (166 - k, 50 + k * 22)], fill=N)
    for k in range(7):
        d.line([(24 + k * 22, 38), (14 + k * 24, 146)], fill=N)
    d.polygon([(100, 40), (162, 40), (166, 90), (130, 96), (110, 70)], fill=B)            # une côte
    trame(d, 100, 40, 166, 96, N, 0.25)
    route = [(22, 132), (48, 116), (76, 112), (100, 96), (118, 108), (150, 116)]
    for k in range(len(route) - 1):
        d.line([route[k], route[k + 1]], fill=N, width=2)
    for k, (x, y) in enumerate(route[1:-1]):                                              # les quatre navires du convoi
        d.polygon([(x - 6, y - 2), (x + 6, y - 2), (x + 4, y + 2), (x - 4, y + 2)], fill=N)
        d.rectangle([x - 3, y - 5, x + 3, y - 3], fill=B if k % 2 else N)
    d.ellipse([144, 110, 156, 122], fill=N); d.ellipse([147, 113, 153, 119], fill=B)     # l'arrivée
    d.line([(40, 60), (64, 90)], fill=N, width=2); d.line([(40, 60), (22, 94)], fill=N, width=2)   # le compas
    d.ellipse([37, 56, 43, 62], fill=B)
    d.polygon([(70, 140), (150, 128), (152, 132), (72, 144)], fill=N)                     # la règle
    for k in range(10):
        d.point((76 + k * 8, 140 - k * 1.2), fill=B)
    d.rectangle([140, 50, 158, 64], fill=N); d.rectangle([142, 52, 156, 62], outline=B)  # la rose des vents
    d.line([(149, 48), (149, 66)], fill=B); d.line([(138, 57), (160, 57)], fill=B)
    d.rectangle([0, 150, W, H], fill=N)
    return im


def vigie_port():
    """La Vigie : le nid de pie au sommet du grand mât, une longue-vue braquée sur la mer, la cloche ;
    en bas, le port tout petit, les conteneurs alignés et leurs voyants."""
    im, d = toile()
    degrade(d, 0, 0, W, 90, V, 0.0, 0.6)
    ciel_nuit(d, 60, 4, 16)
    mer(d, 92, H, 7, B)
    for x in range(0, W, 16):                                                             # le port, en bas, minuscule
        for k in range(3):
            d.rectangle([x + 1, 150 - k * 5, x + 12, 153 - k * 5], fill=V if (x // 16 + k) % 3 else B)
            d.point((x + 2, 151 - k * 5), fill=N)
    d.rectangle([0, 154, W, H], fill=N)
    d.line([(96, 170), (96, 64)], fill=B, width=3)                                        # le mât
    d.line([(96, 66), (176, 150)], fill=B); d.line([(96, 66), (20, 170)], fill=B)
    d.polygon([(70, 64), (124, 64), (118, 82), (76, 82)], fill=B)                        # le nid de pie
    for x in range(72, 122, 5):
        d.line([(x, 66), (x + 1, 80)], fill=N)
    d.rectangle([66, 60, 128, 64], fill=B)
    silhouette(d, 92, 60, 22, B, casquette=True)                                          # le guetteur
    d.line([(96, 44), (128, 34)], fill=B, width=3)                                        # la longue-vue
    d.rectangle([126, 32, 132, 36], fill=V)
    d.line([(96, 30), (96, 4)], fill=B)
    d.polygon([(97, 6), (116, 10), (97, 14)], fill=V)
    d.polygon([(76, 54), (82, 54), (84, 48), (74, 48)], fill=V)
    d.line([(132, 34), (176, 26)], fill=V)
    return im


def armurerie():
    """L'Armurerie : des boucliers au mur, des chaînes et des cadenas, des plaques de coque à rivets,
    un établi où l'on durcit un conteneur, une seule lampe."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for y in range(0, 110, 18):                                                           # les plaques rivetées
        for x in range((y // 18 % 2) * 22, W, 44):
            d.rectangle([x, y, x + 42, y + 16], fill=B)
            d.rectangle([x + 1, y + 1, x + 41, y + 15], fill=N)
            trame(d, x + 1, y + 1, x + 41, y + 15, B, 0.12)
            for (px, py) in ((x + 3, y + 3), (x + 39, y + 3), (x + 3, y + 13), (x + 39, y + 13)):
                d.point((px, py), fill=B)
    for k, x in enumerate((14, 66, 118)):                                                 # les boucliers
        d.polygon([(x, 20), (x + 40, 20), (x + 40, 52), (x + 20, 70), (x, 52)], fill=B)
        d.polygon([(x + 3, 23), (x + 37, 23), (x + 37, 51), (x + 20, 66), (x + 3, 51)], fill=V if k == 1 else N)
        if k == 1:
            conteneur(d, x + 9, 34, 22, 10, N)
        else:
            d.rectangle([x + 14, 34, x + 26, 46], fill=B); d.rectangle([x + 16, 28, x + 24, 34], outline=B)
            d.rectangle([x + 19, 38, x + 21, 42], fill=N)
    for x in (60, 112):                                                                   # les chaînes
        for y in range(76, 108, 5):
            d.ellipse([x, y, x + 4, y + 6], outline=B)
    d.polygon([(0, 118), (W, 118), (W, 128), (0, 128)], fill=B)                          # l'établi et son conteneur
    conteneur3d(im, d, 40, 104, 80, 14, 8, V, portes=True)
    for x in (60, 96):
        d.rectangle([x, 106, x + 6, 114], fill=N); d.rectangle([x + 1, 102, x + 5, 106], outline=N)
    d.rectangle([0, 128, W, H], fill=N)
    d.rectangle([8, 128, 12, H], fill=B); d.rectangle([164, 128, 168, H], fill=B)
    halo(d, 88, 90, 60, V, 0.25, 40)
    return im


def douane():
    """La Douane : sous l'auvent ondulé de la quarantaine, le conteneur noir pris à un éclaireur, sceau étranger
    sur le flanc ; un cordon de chaînes, le pavillon de quarantaine à damier, la lampe d'inspection braquée,
    la loupe et la liste des indices sur le pupitre."""
    im, d = toile()
    degrade(d, 0, 0, W, 50, V, 0.0, 0.4)
    nuages(im, d, 8, 5, 6, 0.8, 0.8)
    d.polygon([(0, 30), (W, 22), (W, 42), (0, 50)], fill=B)                               # l'auvent ondulé
    for x in range(0, W, 4):
        d.line([(x, 30 - x * 8 // W), (x, 50 - x * 8 // W)], fill=N if x % 8 else V)
    d.polygon([(0, 50), (W, 42), (W, 48), (0, 56)], fill=N)
    for x in (8, 88, 168):
        d.rectangle([x - 1, 50 - x * 8 // W, x + 1, 140], fill=B)
    d.rectangle([0, 56, W, 140], fill=N)
    x, y = 38, 132                                                                        # le conteneur noir de l'éclaireur
    conteneur3d(im, d, x, y - 40, 84, 40, 14, N, portes=True)
    d.polygon([(x + 32, y - 32), (x + 52, y - 32), (x + 42, y - 14)], fill=N)            # le sceau étranger
    d.line([(x + 32, y - 32), (x + 52, y - 32), (x + 42, y - 14), (x + 32, y - 32)], fill=B)
    d.line([(x + 42, y - 28), (x + 42, y - 22)], fill=V); d.point((x + 42, y - 19), fill=V)
    for k in range(4):                                                                    # le cordon
        px = 8 + k * 52
        d.rectangle([px - 1, 112, px + 1, 142], fill=B)
        d.rectangle([px - 3, 140, px + 3, 142], fill=B)
        if k < 3:
            for j in range(10):
                t = j / 9
                d.ellipse([px + 2 + t * 46, 114 + 6 * math.sin(math.pi * t), px + 6 + t * 46, 117 + 6 * math.sin(math.pi * t)], outline=V)
    d.line([(160, 112), (160, 62)], fill=B)                                               # le pavillon de quarantaine
    for i in range(4):
        for j in range(3):
            d.rectangle([140 + i * 5, 62 + j * 5, 144 + i * 5, 66 + j * 5], fill=V if (i + j) % 2 else N)
    d.rectangle([140, 62, 159, 76], outline=V)
    d.line([(22, 56), (22, 70)], fill=B)                                                  # la lampe d'inspection
    d.polygon([(14, 70), (30, 70), (34, 80), (10, 80)], fill=V)
    faisceau_bas = [(12, 80), (32, 80), (70, 132), (36, 132)]
    for k in range(52):
        yy = 80 + k
        xa = 12 + (36 - 12) * k / 52
        xb = 32 + (70 - 32) * k / 52
        trame(d, xa, yy, xb, yy, B, 0.15)
    d.rectangle([0, 140, W, H], fill=N)
    for yy in (146, 154, 166):
        d.line([(0, yy), (W, yy)], fill=V)
    d.polygon([(116, 146), (170, 146), (174, 168), (112, 168)], fill=B)                   # le pupitre et la liste
    for k in range(4):
        d.line([(122, 151 + k * 4), (150 - k * 3, 151 + k * 4)], fill=N)
        d.rectangle([156, 150 + k * 4, 158, 152 + k * 4], fill=V)
    d.ellipse([22, 146, 38, 162], fill=N, outline=B, width=2)                             # la loupe
    d.line([(36, 160), (46, 168)], fill=B, width=3)
    d.arc([25, 149, 33, 157], 180, 270, fill=B)
    return im


def escadre():
    """L'Escadre : cinq navires de l'école en formation au lever du jour, reliés par des lignes de signaux ;
    le navire amiral au centre, pavillon hissé ; la drisse de pavillons au-dessus."""
    im, d = toile()
    ciel_contre_jour(d, 62, 0.1, 22, 0.6)
    soleil_raye(d, 88, 62, 12, horizon=62)
    mer(d, 64, H, 10, V, reflet=88, larg=10, c_reflet=B)
    pos = [(10, 96, 44), (118, 92, 46), (48, 124, 80), (4, 156, 60), (110, 160, 62)]
    for (a, b) in ((0, 2), (1, 2), (2, 3), (2, 4)):                                       # les liaisons de l'escadre
        xa, ya, la = pos[a]; xb, yb, lb = pos[b]
        for k in range(0, 31):
            t = k / 30
            if k % 2 == 0:
                d.point((xa + la // 2 + (xb + lb // 2 - xa - la // 2) * t, ya - 14 + (yb - ya) * t), fill=B)
    for k, (x, y, l) in enumerate(pos):
        porte_conteneurs(im, d, x, y, l, 6 + l // 14, eclaire=True, graine=k + 3, hauteur=2 + (k == 2), pavillon=(k == 2))
        reflet_silhouette(d, x + 4, x + l - 4, y, 2, B)
    drapeaux_signaux(d, 60, 20, 7, 56)
    return im


# ------------------------------------------------------------------
# Les machines
# ------------------------------------------------------------------

def baie(d, x, y, w=26, h=60):
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], fill=N)
    for k in range(y + 5, y + h - 4, 6):
        d.rectangle([x + 4, k, x + w - 4, k + 3], fill=B)
        d.rectangle([x + 5, k + 1, x + w - 8, k + 2], fill=N)
        d.point((x + w - 6, k + 1), fill=V)
        if k % 4:
            d.point((x + w - 7, k + 2), fill=V)


def machine_port():
    """La machine du port : un conteneur ouvert sur le quai, des baies de serveurs dedans, des câbles verts,
    un écran avec une invite."""
    im, d = toile()
    degrade(d, 0, 0, W, 60, V, 0.0, 0.3)
    d.rectangle([0, 0, W, 130], fill=N)
    conteneur3d(im, d, 4, 26, 150, 100, 18, B, portes=False)
    d.rectangle([10, 32, 148, 120], fill=N)
    degrade(d, 10, 32, 148, 120, V, 0.0, 0.15)
    for k, x in enumerate((18, 52, 86)):
        baie(d, x, 46, 28, 70)
    for k in range(4):
        d.arc([30 + k * 4, 100 + k * 3, 140 - k * 4, 140 + k * 3], 180, 360, fill=V if k % 2 else B)
    d.rectangle([118, 60, 144, 84], fill=B); d.rectangle([120, 62, 142, 82], fill=N)    # l'écran
    d.line([(123, 66), (126, 69), (123, 72)], fill=V); d.line([(128, 72), (134, 72)], fill=V)
    d.rectangle([128, 84, 134, 90], fill=B)
    quai_beton(im, d, 130, bittes=False)
    return im


def douane_machine():
    """La machine de la douane : un poste isolé dans une cage grillagée, aucun câble vers l'extérieur,
    un disque dans un sachet scellé."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.rectangle([20, 14, 156, 140], fill=B)
    d.rectangle([22, 16, 154, 138], fill=N)
    baie(d, 40, 50, 30, 80)
    d.rectangle([84, 70, 140, 106], fill=B); d.rectangle([87, 73, 137, 103], fill=N)    # l'écran
    for k in range(4):
        d.line([(91, 78 + k * 6), (130 - k * 7, 78 + k * 6)], fill=V)
    d.rectangle([108, 106, 114, 116], fill=B)
    d.rectangle([92, 116, 132, 120], fill=B)
    for x in range(22, 156, 7):                                                           # la cage
        d.line([(x, 16), (x, 138)], fill=B)
    for y in range(16, 140, 7):
        d.line([(22, y), (154, y)], fill=B)
    d.rectangle([70, 140, 106, 150], fill=B)
    d.rectangle([78, 26, 98, 42], fill=V); d.rectangle([84, 20, 92, 26], outline=V)     # le cadenas
    d.rectangle([86, 31, 90, 37], fill=N)
    d.rectangle([0, 150, W, H], fill=N)
    for yy in range(154, H, 6):
        d.line([(0, yy), (W, yy)], fill=V)
    d.line([(150, 148), (170, 134)], fill=N, width=2)
    d.polygon([(132, 160), (160, 156), (164, 168), (136, 170)], fill=V)                   # le sachet scellé
    d.ellipse([144, 160, 152, 166], fill=B)
    return im


def navire_machine():
    """La salle des machines d'un navire de l'escadre : des baies le long de la coque, des hublots sur la mer,
    des tuyaux, une échelle."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for x in (16, 70, 124):                                                               # les hublots
        d.ellipse([x, 12, x + 34, 46], fill=B)
        d.ellipse([x + 3, 15, x + 31, 43], fill=N)
        degrade(d, x + 4, 16, x + 30, 30, V, 0.2, 0.7)
        mer(d, 30, 42, x, B)
    for x in (16, 70, 124):
        d.ellipse([x, 12, x + 34, 46], outline=B, width=3)
    d.rectangle([0, 0, 14, 50], fill=N); d.rectangle([52, 0, 68, 50], fill=N); d.rectangle([106, 0, 122, 50], fill=N); d.rectangle([160, 0, 176, 50], fill=N)
    d.line([(0, 52), (W, 52)], fill=B, width=2)
    d.line([(0, 56), (W, 56)], fill=V, width=2)
    for x in (8, 42, 76, 110, 144):
        baie(d, x, 62, 26, 76)
    d.rectangle([0, 140, W, H], fill=B)
    for x in range(0, W, 8):
        d.line([(x, 140), (x, H)], fill=N)
    for yy in range(146, H, 7):
        d.line([(0, yy), (W, yy)], fill=V)
    return im


# ------------------------------------------------------------------
# Le bivouac des trois nuits
# ------------------------------------------------------------------

def bivouac(nuit):
    """Le bivouac au port, de nuit : un feu entre deux murs de conteneurs, la recrue assise de dos devant lui,
    la radio de Grace sur une caisse ; au fond la mer. La première nuit est calme (un croissant, le phare
    veille), la deuxième voilée (la lune dans les nuages), la troisième voit l'orage et, au large, la ligne
    noire de la flotte sur la lueur de l'horizon."""
    im, d = toile()
    horizon = 66
    if nuit == 1:
        ciel_nuit(d, horizon, 11, 44)
        croissant(d, 124, 20, 8)
    elif nuit == 2:
        ciel_nuit(d, horizon, 12, 30)
        lune_pleine(d, 56, 22, 8)
        nuages(im, d, 34, 13, 4, 0.6, 0.7)
    else:
        ciel_nuit(d, horizon, 14, 12)
        nuages(im, d, 14, 15, 8, 0.9, 1.0)
        eclair(d, 150, 20, 30, 4)
        degrade(d, 0, 44, W, horizon, V, 0.0, 1.0)
        degrade(d, 0, 54, W, horizon, B, 0.0, 0.7)
        for k, x in enumerate(range(26, 150, 19)):
            silhouette_navire_noir(d, x, horizon + 1, 14 + (k % 2) * 4)
    mer(d, horizon + 2, 90, nuit, V)
    if nuit < 3:
        phare_clair(d, 134, horizon + 2, 22, allume=True, rayon=44)
    d.rectangle([0, 90, W, H], fill=N)                                                    # la dalle, éclairée par le feu
    d.rectangle([0, 90, W, 92], fill=B)
    for x in range(0, W, 8):
        d.rectangle([x, 90, x + 3, 92], fill=V)
    halo(d, 96, 124, 86, V, 0.95, 46)
    pile(im, d, -20, 170, [[V, N], [B, V], [N, B], [V], [B]], 30, 14, 8)
    pile(im, d, 152, 170, [[B], [V], [N], [B]] if nuit < 3 else [[B], [V], [N], [V], [N]], 30, 14, 8)
    feu_de_camp(d, 104, 134, 17)
    radio_grande(d, 128, 156)
    recrue_assise(d, 62, 170, galons=nuit)
    return im


# ------------------------------------------------------------------
# Les galons et les montées de rang
# ------------------------------------------------------------------

def galon(d, cx, cy, n, l=56, etoiles_=0):
    """Une patte d'épaule : un écusson à bord vert, un bouton, une ancre, et n galons (des bandes blanches
    filetées de vert) ; l'Amiral porte en plus trois étoiles au-dessus."""
    h = 30 + n * 8
    x0, y0 = cx - l // 2, cy - h // 2
    d.polygon([(x0, y0 + 6), (cx, y0 - 4), (x0 + l, y0 + 6), (x0 + l, y0 + h), (x0, y0 + h)], fill=V)
    d.polygon([(x0 + 3, y0 + 8), (cx, y0 - 1), (x0 + l - 3, y0 + 8), (x0 + l - 3, y0 + h - 3), (x0 + 3, y0 + h - 3)], fill=N)
    d.ellipse([cx - 3, y0 + 3, cx + 3, y0 + 9], fill=B)
    ax, ay = cx, y0 + 13                                                                  # l'ancre
    d.rectangle([ax - 1, ay, ax + 1, ay + 14], fill=B)
    d.rectangle([ax - 5, ay + 3, ax + 5, ay + 4], fill=B)
    d.arc([ax - 8, ay + 4, ax + 8, ay + 17], 10, 170, fill=B, width=2)
    d.polygon([(ax - 9, ay + 8), (ax - 6, ay + 11), (ax - 9, ay + 12)], fill=B)
    d.polygon([(ax + 9, ay + 8), (ax + 6, ay + 11), (ax + 9, ay + 12)], fill=B)
    for k in range(n):
        yy = y0 + 33 + k * 8
        d.rectangle([x0 + 6, yy, x0 + l - 6, yy + 4], fill=B)
        d.line([(x0 + 6, yy + 2), (x0 + l - 6, yy + 2)], fill=V)
    for k in range(etoiles_):
        etoile(d, cx - (etoiles_ - 1) * 9 + k * 18, y0 - 13, 6, B)


def etoile(d, x, y, r=5, c=V):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(pts, fill=c)


def rang(n):
    """La montée de rang : la patte d'épaule dans un médaillon, des rayons tramés derrière, une banderole au nom
    du rang ; en bas, ce que le rang commande : le quai (Matelot), le quart de nuit à la lanterne
    (Quartier-maître), la grue du chantier (Second), la barre (Capitaine), l'escadre entière (Amiral)."""
    im, d = toile()
    horizon = 110
    if n == 2:
        ciel_nuit(d, horizon, 20 + n, 40)
    else:
        ciel_contre_jour(d, horizon, 0.05, 30, 0.5 + n * 0.06)
    cx, cy = 88, 52
    for k in range(18):                                                                   # les rayons tramés
        if k % 2:
            continue
        a0, a1 = k * math.pi / 9, (k + 1) * math.pi / 9
        for rr in range(30, 130, 2):
            for a in (a0 + (a1 - a0) * j / 8 for j in range(9)):
                px, py = cx + rr * math.cos(a), cy + rr * math.sin(a)
                if 0 <= px < W and 0 <= py < horizon and BAYER[int(py) % 4][int(px) % 4] < 8:
                    d.point((px, py), fill=B if n != 2 else V)
    mer(d, horizon + 2, H, n, V)
    if n == 1:
        quai_beton(im, d, 136)
        pile(im, d, 0, 170, [[V, B], [N]], 30, 12, 6)
        pile(im, d, 112, 170, [[B, V], [V]], 30, 12, 6)
    elif n == 2:
        d.line([(30, 118), (30, 132)], fill=B)
        d.rectangle([24, 132, 36, 146], fill=B); d.rectangle([26, 134, 34, 144], fill=V)
        halo(d, 30, 139, 24, V, 0.5)
        porte_conteneurs(im, d, 62, 152, 106, 12, eclaire=True, graine=12, hauteur=3)
    elif n == 3:
        grue(d, 150, 160, 70, 40, 16, 14, c=N, creux=None, chariot=0.5, charge=V, cable=18, liser=B)
        porte_conteneurs(im, d, 2, 160, 104, 12, graine=13, hauteur=3)
    elif n == 4:
        d.ellipse([40, 118, 136, 214], outline=B, width=4)                                # la barre
        d.ellipse([78, 156, 98, 176], fill=B)
        d.ellipse([84, 162, 92, 170], fill=V)
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            d.line([(88 + 10 * math.cos(a), 166 + 10 * math.sin(a)), (88 + 58 * math.cos(a), 166 + 58 * math.sin(a))], fill=B, width=3)
            ex, ey = 88 + 60 * math.cos(a), 166 + 60 * math.sin(a)
            d.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=V)
    else:
        for k, (x, y, l) in enumerate(((0, 134, 50), (118, 132, 56), (44, 162, 88), (150, 168, 34))):
            porte_conteneurs(im, d, x, y, l, 6 + l // 16, eclaire=True, graine=20 + k, hauteur=2, pavillon=(k == 2))
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=N)                               # le médaillon
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=B, width=2)
    d.ellipse([cx - 36, cy - 36, cx + 36, cy + 36], outline=V)
    galon(d, cx, cy + (4 if n == 5 else 0), n, 40 if n < 4 else 44, 3 if n == 5 else 0)
    nom = NOMS_RANGS[n]                                                                   # la banderole
    larg = int(d.textlength(nom)) + 12
    by = 96
    d.polygon([(cx - larg // 2 - 12, by + 2), (cx - larg // 2, by + 2), (cx - larg // 2, by + 14), (cx - larg // 2 - 12, by + 14), (cx - larg // 2 - 7, by + 8)], fill=V)
    d.polygon([(cx + larg // 2 + 12, by + 2), (cx + larg // 2, by + 2), (cx + larg // 2, by + 14), (cx + larg // 2 + 12, by + 14), (cx + larg // 2 + 7, by + 8)], fill=V)
    d.rectangle([cx - larg // 2, by, cx + larg // 2, by + 12], fill=B)
    d.line([(cx - larg // 2, by + 12), (cx + larg // 2, by + 12)], fill=V)
    texte_maj(d, cx - larg // 2 + 6, by + 1, nom, N)
    return im


# ------------------------------------------------------------------
# La cinématique 8 : six plans
# ------------------------------------------------------------------

def cine_lettre():
    """La lettre de la plume grise, posée sur la table de la Capitainerie à la lueur d'une bougie ; en travers,
    une grande plume grise (un damier serré de noir et de blanc), un cachet de cire marqué d'un navire noir."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for y in range(6, H, 9):                                                              # le bois de la table
        d.line([(0, y), (W, y + (y % 5) - 2)], fill=V if y % 18 else N)
    halo(d, 146, 40, 80, V, 0.55, 70)
    d.polygon([(16, 74), (132, 60), (152, 152), (30, 166)], fill=V)                       # l'ombre de la lettre
    d.polygon([(12, 70), (128, 56), (148, 148), (26, 162)], fill=B)                       # la lettre
    for k in range(8):
        x0, y0 = 26 + k * 1.7, 76 + k * 9
        d.line([(x0, y0), (x0 + 86 - (k * 13) % 30, y0 - 10)], fill=N)
    d.line([(92, 138), (128, 134)], fill=N); d.line([(98, 143), (124, 140)], fill=N)    # la signature
    d.ellipse([28, 128, 54, 154], fill=N)                                                 # le cachet de cire
    d.ellipse([31, 131, 51, 151], fill=V)
    d.polygon([(34, 143), (48, 143), (46, 147), (36, 147)], fill=N)
    d.line([(40, 134), (40, 143)], fill=N); d.polygon([(41, 135), (46, 141), (41, 141)], fill=N)
    d.rectangle([140, 30, 152, 74], fill=B)                                               # la bougie
    d.rectangle([148, 30, 152, 74], fill=V)
    d.polygon([(146, 12), (151, 23), (146, 30), (141, 23)], fill=V)
    d.polygon([(146, 18), (148, 25), (144, 25)], fill=B)
    d.polygon([(138, 74), (154, 74), (156, 78), (136, 78)], fill=B)
    ax, ay, bx, by = 60, 168, 168, 84                                                     # la plume grise
    lx, ly = bx - ax, by - ay
    lon = math.hypot(lx, ly)
    ux, uy = lx / lon, ly / lon
    nx, ny = -uy, ux
    plume = []
    for k in range(0, 41):
        t = k / 40
        lg = 15 * math.sin(math.pi * min(1.0, 0.15 + t * 0.95)) * (1 if t > 0.1 else t * 10)
        plume.append((ax + lx * t + nx * lg, ay + ly * t + ny * lg))
    for k in range(40, -1, -1):
        t = k / 40
        lg = 10 * math.sin(math.pi * min(1.0, 0.15 + t * 0.95)) * (1 if t > 0.1 else t * 10)
        plume.append((ax + lx * t - nx * lg, ay + ly * t - ny * lg))
    masque = Image.new('1', (W, H), 0)
    ImageDraw.Draw(masque).polygon(plume, fill=1)
    px = im.load()
    mk = masque.load()
    for y in range(H):
        for x in range(W):
            if mk[x, y]:
                px[x, y] = B if (x + y) % 2 == 0 else N
    d.line(plume + [plume[0]], fill=B)
    for k in range(6, 40, 5):                                                             # les barbes ébouriffées
        t = k / 40
        cx, cy = ax + lx * t, ay + ly * t
        d.line([(cx, cy), (cx + nx * 14 + ux * 6, cy + ny * 14 + uy * 6)], fill=N)
    d.line([(ax - ux * 10, ay - uy * 10), (bx, by)], fill=V)
    return im


def cine_phare_noir():
    """Le phare noir sur son rocher, sa lanterne posée devant une lune énorme ; à l'horizon, sur une bande
    de lumière, la flotte se rassemble : des dizaines de mâts noirs."""
    im, d = toile()
    degrade(d, 0, 0, W, 104, V, 0.05, 0.75)
    degrade(d, 0, 76, W, 104, B, 0.0, 0.9)
    halo(d, 136, 40, 44, B, 0.5)
    d.ellipse([110, 14, 162, 66], fill=B)                                                 # la lune
    for (a, b, r) in ((-10, -8, 5), (8, 6, 7), (-6, 14, 3), (14, -12, 3)):
        d.ellipse([136 + a - r, 40 + b - r, 136 + a + r, 40 + b + r], fill=V)
    nuages(im, d, 82, 21, 3, 0.5, 0.9)
    for k, x in enumerate(range(-4, 112, 9)):                                             # la flotte au loin
        silhouette_navire_noir(d, x, 104 - (k % 3), 8 + (k * 5) % 7)
    for k, x in enumerate(range(4, 100, 26)):
        silhouette_navire_noir(d, x, 108, 18)
    mer(d, 108, H, 21, V, reflet=136, larg=8, c_reflet=B)
    d.polygon([(100, 170), (112, 128), (130, 116), (160, 118), (176, 126), (176, 170)], fill=N)   # le rocher
    d.line([(100, 170), (112, 128), (130, 116), (160, 118), (176, 126)], fill=B)
    x, y, h = 136, 120, 70                                                                # le phare noir
    pts = [(x - 10, y), (x + 10, y), (x + 5, y - h), (x - 5, y - h)]
    d.polygon(pts, fill=N)
    d.line([(x - 10, y), (x - 5, y - h)], fill=B)
    d.rectangle([x - 8, y - h - 3, x + 8, y - h], fill=N)
    d.rectangle([x - 5, y - h - 15, x + 5, y - h - 3], fill=N)
    d.rectangle([x - 2, y - h - 12, x + 2, y - h - 6], fill=V)
    d.polygon([(x - 7, y - h - 15), (x + 7, y - h - 15), (x, y - h - 23)], fill=N)
    d.line([(x, y - h - 23), (x, y - h - 28)], fill=N)
    return im


def cine_port_eveil():
    """Le Grand Port qui s'éveille : une enfilade de grues en contre-jour le long du quai, du premier plan
    jusqu'à l'horizon ; le soleil se lève, les feux verts s'allument au sommet des chevalets, quai après quai."""
    im, d = toile()
    ciel_contre_jour(d, 96, 0.05, 30, 0.7)
    soleil_raye(d, 146, 96, 20, horizon=96)
    mer(d, 98, H, 23, V, reflet=146, larg=12, c_reflet=B)
    d.polygon([(0, 96), (130, 96), (0, 160)], fill=N)                                      # le quai qui fuit
    d.line([(0, 160), (130, 96)], fill=V)
    for k, (gx, sc) in enumerate(((104, 0.26), (80, 0.42), (46, 0.68), (-6, 1.05))):      # l'enfilade des grues
        gy = int(160 - 64 * (gx + 30 * sc) / 130)
        h = int(140 * sc)
        ecart = max(5, int(22 * sc))
        grue(d, gx + int(30 * sc), gy, h, int(56 * sc), int(18 * sc), ecart, c=N, creux=None,
             chariot=0.5, charge=None, cable=max(4, int(14 * sc)), liser=B if sc > 0.4 else None)
        halo(d, gx + int(30 * sc) + ecart // 2, gy - h - 2, 5 + 7 * sc, V, 0.9)
    for x in range(10, 126, 13):                                                          # les piles sur le quai
        y = int(160 - 64 * x / 130)
        d.rectangle([x, y - 5, x + 9, y - 1], fill=V if (x // 13) % 2 else B)
    mouettes(d, [(70, 26, 5), (52, 40, 3), (90, 46, 2)], N)
    return im


def cine_galons():
    """Laurent remet les galons de Mousse : deux silhouettes face à face sur le quai, en contre-jour devant le
    soleil levant ; entre leurs mains tendues, la petite patte d'épaule frappée de l'ancre brille."""
    im, d = toile()
    ciel_contre_jour(d, 112, 0.05, 40, 0.85)
    soleil_raye(d, 88, 112, 34, horizon=112)
    mer(d, 114, 132, 25, V)
    d.rectangle([0, 132, W, H], fill=N)
    for x in range(0, W, 8):
        d.rectangle([x, 132, x + 3, 134], fill=V)
    yy, pas = 140, 4
    while yy < H:
        d.line([(0, yy), (W, yy)], fill=V)
        yy += pas
        pas += 3
    personnage_ombre(d, 50, 164, 104, main=(82, 100), manteau=True)
    personnage_ombre(d, 128, 164, 82, main=(98, 102))
    halo(d, 90, 96, 22, B, 0.75)
    galon(d, 90, 96, 0, 16)
    for a in range(12):
        ang = a * math.pi / 6
        d.line([(90 + 15 * math.cos(ang), 94 + 15 * math.sin(ang)), (90 + 21 * math.cos(ang), 94 + 21 * math.sin(ang))], fill=V)
    return im


def cine_quais_vides():
    """Les quais vides : de longs emplacements tracés au sol qui fuient vers la mer, une seule grue immobile
    dans la brume, un conteneur oublié ; rien n'est encore prêt."""
    im, d = toile()
    degrade(d, 0, 0, W, 90, V, 0.05, 0.6)
    degrade(d, 0, 50, W, 90, B, 0.0, 0.6)
    mer(d, 90, 100, 27, V)
    d.rectangle([0, 100, W, H], fill=N)
    for k in range(10):                                                                   # les emplacements tracés
        y = 102 + k * k * 0.75 + k * 2
        d.line([(0, y), (W, y)], fill=V)
    for k in range(-8, 10):
        d.line([(88 + k * 8, 100), (88 + k * 40, H)], fill=V)
    grue(d, 116, 100, 90, 44, 16, 14, c=N, creux=None, chariot=0.4, charge=None, cable=10, liser=B)
    for y in range(86, 118, 3):                                                           # la brume
        trame(d, 0, y, W, y, B, 0.4 * (1 - abs(y - 100) / 18))
    conteneur3d(im, d, 18, 138, 34, 14, 7, V)
    return im


def cine_flotte_horizon():
    """La flotte noire à l'horizon : l'orage, des éclairs, une ligne de navires noirs sur la bande du jour ;
    au premier plan, le plus grand d'entre eux, voiles déchirées : à l'aube du quatrième jour."""
    im, d = toile()
    ciel_dechire(im, d, 100, 31, 54)
    eclair(d, 30, 22, 36, 6); eclair(d, 158, 26, 30, 7)
    for k, x in enumerate(range(-2, W, 19)):
        silhouette_navire_noir(d, x, 100 - (k % 2) * 2, 14)
    mer(d, 102, H, 31, V)
    navire_noir(d, 30, 152, 104, 18, graine=9, liser=B)
    reflet_silhouette(d, 36, 130, 152, 4, N)
    return im


# ------------------------------------------------------------------
# Les quatorze maîtres et les six habitants, en pied
# ------------------------------------------------------------------

def rayures(r, x0, y0, x1, y1, c=V, pas=3):
    for y in range(y0, y1 + 1, pas):
        r(x0, y, x1, y, c)


def bachi(r, c=B, pompon=V):
    """Le bonnet de marin, son ruban et son pompon."""
    r(36, 8, 51, 12, c); r(35, 11, 52, 12, c); r(36, 12, 51, 12, N)
    r(41, 5, 46, 7, pompon)


def casquette(r, c=B, visiere=N, insigne=V):
    r(35, 7, 52, 12, c); r(36, 6, 51, 7, c); r(34, 12, 53, 13, visiere)
    r(42, 8, 45, 10, insigne)


def casque(r, c=V):
    r(36, 6, 51, 12, c); r(34, 12, 53, 13, c); r(42, 4, 45, 6, c); r(38, 7, 39, 11, B)


def veste(r, c=B, rev=V, boutons=True):
    r(35, 33, 52, 54, c); r(40, 33, 43, 40, rev); r(44, 33, 47, 40, rev)
    if boutons:
        for y in (42, 46, 50):
            r(41, y, 41, y, N if c != N else B); r(46, y, 46, y, N if c != N else B)


def kylian_dessin(r):
    # le premier maître : bonnet à pompon, marinière rayée, un petit conteneur sous le bras
    bachi(r); tete(r, 12, B)
    r(35, 33, 52, 54, B); rayures(r, 35, 35, 52, 54, V, 3)
    bras(r, True, True, 36)
    r(54, 42, 72, 52, V); r(54, 52, 72, 52, N)
    for x in range(56, 72, 2): r(x, 43, x, 51, N)
    jambes(r); sol_tirets(r, 68)


def julien_dessin(r):
    # le capitaine de port : casquette à visière et insigne, veste croisée à boutons, une lanterne de signaux
    casquette(r); tete(r, 12, B)
    veste(r, N, B)
    r(35, 33, 52, 54, N); r(35, 33, 36, 54, B); r(51, 33, 52, 54, B); r(40, 33, 47, 38, B)
    for y in (41, 46, 51): r(40, y, 41, y + 1, V); r(46, y, 47, y + 1, V)
    r(35, 34, 38, 35, V); r(49, 34, 52, 35, V)
    bras(r, True, True, 36)
    r(57, 46, 59, 48, B); r(55, 48, 63, 60, B); r(57, 50, 61, 58, V); r(54, 60, 64, 61, B)
    jambes(r, B); sol_tirets(r, 68)


def gregoire_dessin(r):
    # le gardien des plans : lunettes, gilet, un grand plan roulé sous le bras et un cachet à la main
    r(36, 9, 51, 12, B); tete(r, 12, B, lunettes=True)
    r(35, 33, 52, 54, V); r(38, 33, 49, 54, B); r(40, 36, 47, 52, N); r(43, 38, 44, 50, V)
    bras(r, True, True, 36)
    r(12, 40, 34, 45, B); r(13, 41, 33, 44, V); r(11, 41, 12, 44, N); r(14, 42, 32, 42, N)
    r(12, 40, 13, 45, B); r(15, 40, 16, 45, N)
    r(57, 38, 59, 46, B); r(55, 37, 61, 38, B); r(54, 47, 62, 50, V); r(55, 50, 61, 51, N)
    jambes(r); sol_tirets(r, 68)


def chahla_dessin(r):
    # la gardienne des soutes : foulard noué, tablier, un tonneau cerclé dans les bras
    r(35, 8, 52, 13, V); r(33, 11, 36, 30, V); r(51, 11, 54, 30, V); r(52, 13, 58, 16, V); r(56, 16, 59, 20, V)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52)
    r(38, 40, 49, 64, V); r(38, 40, 49, 41, N)
    bras(r, True, True, 36)
    r(52, 40, 70, 62, V); r(52, 40, 70, 42, B); r(53, 41, 69, 41, N)
    r(52, 46, 70, 47, B); r(52, 56, 70, 57, B)
    r(66, 43, 70, 61, N); r(67, 46, 70, 47, B); r(67, 56, 70, 57, B)
    for x in (56, 60, 64): r(x, 48, x, 55, N)
    pieds_robe(r); sol_tirets(r, 68)


def adonis_dessin(r):
    # le pilote des chenaux : ciré à capuche, une gaffe de batelier et un rouleau de cordage
    r(33, 8, 54, 30, V); r(35, 10, 52, 28, N); tete(r, 12, N)
    r(35, 30, 52, 31, V)
    robe_mage(r, 32, 60, V, 34, 53)
    for y in (40, 46, 52): r(43, y, 44, y + 1, N)
    bras(r, True, True, 36)
    r(62, 2, 63, 66, B); r(60, 2, 65, 3, B); r(64, 4, 67, 5, B)
    for k in range(3): r(14 + k, 44 + k, 30 - k, 45 + k, B); r(14 + k, 44 + k, 15 + k, 56 - k, B); r(29 - k, 44 + k, 30 - k, 56 - k, B); r(14 + k, 55 - k, 30 - k, 56 - k, B)
    jambes(r, B); sol_tirets(r, 68)


def eden_dessin(r):
    # la constructrice de navires : casque de chantier, gilet à bandes, un marteau levé et un plan plié
    casque(r, V); r(34, 13, 36, 22, V); r(51, 13, 53, 22, V); tete(r, 12, V)
    r(35, 33, 52, 54, V); r(35, 44, 52, 45, B); r(35, 49, 52, 50, B); r(42, 33, 45, 54, N); r(36, 34, 40, 37, B)
    bras(r, True, True, 36)
    r(59, 28, 60, 50, B); r(55, 24, 65, 29, B); r(55, 25, 57, 28, V)
    r(14, 42, 28, 54, B); r(15, 43, 27, 53, N); r(17, 45, 25, 45, V); r(17, 48, 23, 48, V); r(17, 51, 21, 51, V)
    jambes(r, B); sol_tirets(r, 68)


def megane_dessin(r):
    # la maîtresse des cales : queue de cheval, salopette, une pile de plateaux empilés comme des couches
    r(36, 9, 51, 12, B); r(51, 10, 58, 13, B); r(56, 13, 59, 26, B); tete(r, 12, B)
    r(35, 33, 52, 54, B); r(37, 38, 50, 54, V); r(37, 33, 39, 38, V); r(48, 33, 50, 38, V); r(41, 42, 46, 46, N)
    bras(r, True, True, 36)
    for k, c in enumerate((V, B, V, B, V)):
        r(53 + k % 2, 58 - k * 5, 71 - k % 2, 61 - k * 5, c); r(55, 59 - k * 5, 69, 59 - k * 5, N)
    jambes(r); sol_tirets(r, 68)


def jahmal_dessin(r):
    # le maître du chantier : masque de soudeur relevé sur le front, tablier de cuir, un petit navire fini dans la main
    r(34, 2, 53, 11, V); r(37, 5, 50, 8, N); r(38, 6, 41, 7, B); r(33, 9, 34, 13, B); r(53, 9, 54, 13, B)
    tete(r, 12, B, barbe=True)
    r(35, 33, 52, 54, B); r(37, 36, 50, 60, N); r(38, 37, 49, 59, V); r(37, 36, 38, 40, B); r(49, 36, 50, 40, B)
    for y in (44, 50): r(40, y, 47, y, N)
    bras(r, True, True, 36)
    r(54, 44, 72, 47, B); r(56, 47, 70, 50, N); r(56, 46, 70, 46, V)
    r(60, 36, 61, 44, B); r(62, 37, 67, 43, V); r(57, 40, 59, 44, B)
    jambes(r, B); sol_tirets(r, 68)


def deborah_dessin(r):
    # la gardienne du registre : tresses, longue robe, un registre épais et un trousseau de clés
    r(36, 9, 51, 12, B); r(32, 13, 35, 40, B); r(52, 13, 55, 40, B)
    for y in range(16, 40, 4): r(32, y, 35, y, N); r(52, y, 55, y, N)
    tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52)
    r(42, 33, 45, 64, B)
    bras(r, True, True, 36)
    r(54, 36, 70, 56, B); r(56, 38, 68, 54, N); r(58, 41, 66, 41, V); r(58, 44, 64, 44, V); r(58, 47, 66, 47, V); r(54, 36, 56, 56, V)
    cle(r, 18, 40, B); cle(r, 22, 44, V)
    pieds_robe(r); sol_tirets(r, 68)


def elias_dessin(r):
    # le navigateur : tricorne vert, long manteau, une carte roulée sous le bras et un compas à pointes
    r(31, 9, 56, 11, V); r(34, 5, 53, 9, V); r(41, 3, 46, 5, V); r(31, 7, 33, 9, V); r(54, 7, 56, 9, V)
    r(36, 9, 51, 9, B)
    tete(r, 12, B)
    robe_mage(r, 33, 64, B, 35, 52)
    r(38, 33, 49, 64, N); r(40, 33, 47, 38, B); r(42, 38, 45, 40, V)
    for y in (42, 48, 54): r(39, y, 39, y, V); r(48, y, 48, y, V)
    bras(r, True, True, 36)
    r(56, 30, 60, 58, V); r(57, 31, 59, 57, N); r(56, 30, 60, 31, B); r(56, 57, 60, 58, B)
    r(21, 36, 24, 39, B); ligne_r(r, 21, 39, 16, 56, B, 2); ligne_r(r, 23, 39, 28, 56, B, 2)
    pieds_robe(r); sol_tirets(r, 68)


def remi_dessin(r):
    # le guetteur de la vigie : bonnet de laine, caban, une longue-vue dépliée
    r(36, 6, 51, 12, V); rayures(r, 36, 7, 51, 11, B, 2); r(42, 4, 45, 6, B); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(38, 33, 49, 54, N)
    for y in range(37, 53, 5): r(40, y, 41, y + 1, B); r(46, y, 47, y + 1, B)
    r(34, 33, 53, 35, V)
    bras(r, True, True, 36)
    r(56, 34, 76, 37, B); r(58, 35, 74, 36, V); r(74, 33, 78, 38, B); r(58, 33, 59, 38, N); r(64, 33, 65, 38, N)
    jambes(r); sol_tirets(r, 68)


def ian_dessin(r):
    # l'armurier : casque rond, épaulières, un bouclier marqué d'un cadenas
    r(35, 5, 52, 12, B); r(33, 11, 54, 13, B); r(37, 6, 50, 8, V); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(31, 32, 37, 37, B); r(50, 32, 56, 37, B); r(35, 42, 52, 43, B)
    for x in range(36, 52, 3): r(x, 46, x, 52, N)
    bras(r, True, True, 38)
    r(52, 38, 72, 58, B); r(54, 40, 70, 56, N); r(54, 56, 62, 62, B); r(62, 56, 70, 58, B)
    r(58, 46, 66, 53, V); r(59, 42, 65, 46, V); r(60, 43, 64, 46, N); r(61, 48, 63, 51, N)
    jambes(r, B); sol_tirets(r, 68)


def soufiane_dessin(r):
    # le douanier : képi à bande, uniforme boutonné, une grande loupe et une planchette d'inspection
    r(37, 4, 50, 11, B); r(37, 8, 50, 9, V); r(35, 11, 52, 12, N); r(35, 12, 52, 12, B)
    tete(r, 12, B)
    r(35, 33, 52, 54, B); r(43, 33, 44, 54, N)
    for y in (38, 43, 48): r(41, y, 41, y, V)
    r(36, 36, 40, 39, N)
    bras(r, True, True, 36)
    r(58, 32, 72, 46, B); r(60, 34, 70, 44, V); r(62, 36, 67, 39, B); r(56, 46, 59, 50, B); r(54, 50, 57, 54, B)
    r(14, 38, 28, 58, B); r(15, 41, 27, 57, N); r(19, 37, 23, 40, V)
    for y in range(44, 56, 3): r(17, y, 18, y, V); r(20, y, 25, y, B)
    jambes(r, B); sol_tirets(r, 68)


def arnaud_dessin(r):
    # le commandant de l'escadre : bicorne, épaulettes à franges, manteau croisé, deux pavillons de signaux
    r(30, 8, 57, 11, B); r(36, 3, 51, 8, B); r(42, 5, 45, 7, V); r(30, 11, 33, 13, B); r(54, 11, 57, 13, B)
    tete(r, 12, B)
    robe_mage(r, 33, 64, N, 35, 52)
    r(35, 33, 52, 64, N); r(35, 33, 36, 64, B); r(51, 33, 52, 64, B)
    r(30, 32, 38, 35, V); r(49, 32, 57, 35, V)
    for x in range(30, 38, 2): r(x, 36, x, 38, V)
    for x in range(50, 58, 2): r(x, 36, x, 38, V)
    for y in (40, 45, 50, 55): r(40, y, 41, y + 1, B); r(46, y, 47, y + 1, B)
    bras(r, True, True, 38)
    r(18, 26, 19, 52, B); r(20, 26, 30, 34, V); r(20, 34, 30, 34, B); r(24, 28, 26, 32, N)
    r(62, 22, 63, 52, B); r(64, 22, 74, 30, B); r(64, 26, 74, 26, V); r(68, 22, 69, 30, V)
    pieds_robe(r); sol_tirets(r, 68)


def anissa_dessin(r):
    # la marinière de la chaloupe : cheveux longs au vent, bandeau, une rame portée en travers de l'épaule
    r(34, 9, 53, 12, V); r(33, 12, 36, 32, V); r(51, 11, 57, 20, V); r(56, 13, 62, 18, V); r(61, 15, 66, 17, V)
    r(35, 11, 52, 12, B)
    tete(r, 12, V)
    r(35, 33, 52, 54, B); rayures(r, 35, 36, 52, 54, V, 4)
    bras(r, True, True, 36)
    ligne_r(r, 14, 58, 66, 22, B, 2)
    r(10, 56, 18, 64, V); r(11, 57, 17, 63, B)
    jambes(r); sol_tirets(r, 68)


def edson_dessin(r):
    # le charpentier des cloisons : casquette, bretelles, un panneau de cloison sous le bras et un niveau
    r(36, 9, 51, 12, V); r(49, 11, 56, 12, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(38, 33, 39, 54, V); r(48, 33, 49, 54, V)
    bras(r, True, True, 36)
    r(54, 30, 72, 62, V); r(56, 32, 70, 60, N); r(62, 32, 63, 60, V); r(56, 45, 70, 46, V)
    r(14, 50, 30, 54, B); r(20, 51, 24, 53, V)
    jambes(r, B); sol_tirets(r, 68)


def mina_dessin(r):
    # la douanière du large : cape à capuche, des jumelles autour du cou, un carnet de relevés
    r(33, 8, 54, 34, B); r(35, 10, 52, 32, N); tete(r, 12, N)
    robe_mage(r, 33, 64, B, 34, 53)
    r(37, 33, 50, 64, V)
    r(39, 38, 42, 43, N); r(45, 38, 48, 43, N); r(42, 40, 45, 41, N); r(38, 33, 39, 38, N); r(48, 33, 49, 38, N)
    bras(r, True, True, 36)
    r(56, 44, 68, 58, B); r(57, 45, 67, 57, N); r(59, 48, 65, 48, V); r(59, 51, 63, 51, V); r(59, 54, 64, 54, V)
    pieds_robe(r); sol_tirets(r, 68)


def ronan_dessin(r):
    # le voyageur des deux continents : sac à dos, une carte où deux terres se font face
    r(36, 9, 51, 12, B); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(31, 34, 35, 52, B); r(52, 34, 56, 52, B)
    r(28, 36, 33, 50, V); r(27, 38, 29, 48, N)
    bras(r, False, True, 36)
    r(12, 38, 34, 56, B); r(13, 39, 33, 55, V)
    r(15, 42, 21, 52, B); r(17, 41, 20, 44, B); r(25, 43, 31, 50, B); r(27, 50, 29, 53, B)
    r(22, 46, 24, 46, N)
    jambes(r); sol_tirets(r, 68)


def idrissa_dessin(r):
    # le relecteur de plans : lunettes, gilet, un plan annoté de coches et un crayon vert
    r(36, 9, 51, 12, V); tete(r, 12, V, lunettes=True)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V); r(42, 35, 45, 54, N)
    bras(r, True, True, 36)
    r(54, 34, 72, 58, B); r(55, 35, 71, 57, N)
    for k in range(4):
        r(57, 38 + k * 5, 64, 38 + k * 5, B)
        r(66, 38 + k * 5, 67, 39 + k * 5, V); r(68, 36 + k * 5, 69, 37 + k * 5, V)
    r(20, 30, 21, 48, V); r(20, 48, 21, 50, B)
    jambes(r); sol_tirets(r, 68)


def neil_dessin(r):
    # le vieux marin de la cabine : casquette de capitaine usée, grande barbe, une clé de cabine et une lanterne
    casquette(r, B, N, N); tete(r, 12, B, barbe=True)
    r(35, 37, 52, 54, V); r(38, 37, 49, 54, B); r(40, 40, 47, 52, N)
    bras(r, True, True, 36)
    cle(r, 58, 42, B)
    r(20, 32, 22, 38, B); r(15, 38, 27, 52, B); r(17, 40, 25, 50, V); r(19, 42, 23, 48, B); r(14, 52, 28, 53, B)
    jambes(r, B); sol_tirets(r, 68)


PORTRAITS = {
    "item_kylian.gif": kylian_dessin, "item_julien.gif": julien_dessin, "item_gregoire.gif": gregoire_dessin,
    "item_chahla.gif": chahla_dessin, "item_adonis.gif": adonis_dessin, "item_eden.gif": eden_dessin,
    "item_megane.gif": megane_dessin, "item_jahmal.gif": jahmal_dessin, "item_deborah.gif": deborah_dessin,
    "item_elias.gif": elias_dessin, "item_remi.gif": remi_dessin, "item_ian.gif": ian_dessin,
    "item_soufiane.gif": soufiane_dessin, "item_arnaud.gif": arnaud_dessin,
    "item_anissa.gif": anissa_dessin, "item_edson.gif": edson_dessin, "item_mina.gif": mina_dessin,
    "item_ronan.gif": ronan_dessin, "item_idrissa.gif": idrissa_dessin, "item_neil.gif": neil_dessin,
}


# ------------------------------------------------------------------
# L'Ordre d'embarquement (la huitième enveloppe)
# ------------------------------------------------------------------

def ordre_embarquement(nom="item_ordre_embarquement.gif"):
    """La huitième enveloppe : un pli scellé d'un cachet à l'ancre, un ordre d'embarquement qui dépasse,
    frappé d'un petit conteneur, et une ligne de vagues."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.rectangle([6, 1, 30, 14], fill=V)                                                   # l'ordre qui dépasse
    d.rectangle([8, 3, 28, 12], fill=N)
    d.rectangle([10, 5, 20, 9], fill=V)
    for x in range(11, 20, 2):
        d.line([(x, 6), (x, 8)], fill=N)
    d.line([(22, 5), (26, 5)], fill=V); d.line([(22, 8), (25, 8)], fill=V)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 8):
        d.arc([x, 33, x + 8, 39], 180, 360, fill=V)
    d.ellipse([21, 15, 38, 32], fill=V)                                                   # le cachet à l'ancre
    d.ellipse([22, 16, 37, 31], outline=N)
    d.ellipse([28, 17, 31, 20], outline=N)
    d.rectangle([29, 20, 30, 29], fill=N)
    d.rectangle([26, 21, 33, 21], fill=N)
    d.arc([24, 22, 35, 30], 15, 165, fill=N)
    d.point((24, 25), fill=N); d.point((35, 25), fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


def caisse_x(d, x, y, w=14, h=12):
    """Une caisse de bois, croisillon vert."""
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 1, y + 1, x + w - 1, y + h - 1], fill=N)
    d.line([(x + 1, y + 1), (x + w - 1, y + h - 1)], fill=V)
    d.line([(x + w - 1, y + 1), (x + 1, y + h - 1)], fill=V)


def radio_grande(d, x, y):
    """La radio de Grace, de près : un boîtier, un haut-parleur grillagé, un cadran vert allumé, une antenne
    et ses ondes."""
    d.rectangle([x, y - 20, x + 30, y], fill=B)
    d.rectangle([x + 2, y - 18, x + 28, y - 2], fill=N)
    for yy in range(y - 16, y - 3, 2):
        d.line([(x + 4, yy), (x + 13, yy)], fill=B)
    d.rectangle([x + 16, y - 16, x + 26, y - 10], fill=V)
    d.line([(x + 18, y - 13), (x + 24, y - 13)], fill=N)
    d.point((x + 21, y - 15), fill=B)
    d.ellipse([x + 17, y - 8, x + 21, y - 4], fill=B); d.ellipse([x + 23, y - 8, x + 27, y - 4], fill=B)
    d.line([(x + 26, y - 20), (x + 36, y - 44)], fill=B)
    d.point((x + 36, y - 45), fill=V)
    for k in (4, 8, 12):
        d.arc([x + 36 - k, y - 45 - k, x + 36 + k, y - 45 + k], 290, 350, fill=V)
    halo(d, x + 21, y - 13, 12, V, 0.4)


def recrue_assise(d, x, y, galons=0, u=1.4):
    """La recrue assise sur une caisse, de trois quarts dos, en silhouette noire devant le feu ; un liseré vert
    sur le flanc tourné vers les flammes ; les galons gagnés brillent sur la manche."""
    d.rectangle([x - 16 * u, y - 14 * u, x + 16 * u, y], fill=B)                         # la caisse
    d.rectangle([x - 15 * u, y - 13 * u, x + 15 * u, y - 1], fill=N)
    d.line([(x - 15 * u, y - 13 * u), (x + 15 * u, y - 1)], fill=V); d.line([(x + 15 * u, y - 13 * u), (x - 15 * u, y - 1)], fill=V)
    d.ellipse([x - 7 * u, y - 58 * u, x + 7 * u, y - 42 * u], fill=N)                     # la tête et le bonnet
    d.rectangle([x - 7 * u, y - 59 * u, x + 7 * u, y - 52 * u], fill=N)
    d.rectangle([x - 2 * u, y - 62 * u, x + 2 * u, y - 59 * u], fill=N)
    d.rectangle([x - 3 * u, y - 43 * u, x + 3 * u, y - 39 * u], fill=N)
    d.polygon([(x - 14 * u, y - 36 * u), (x - 10 * u, y - 40 * u), (x + 10 * u, y - 40 * u), (x + 14 * u, y - 36 * u),
               (x + 16 * u, y - 14 * u), (x - 16 * u, y - 14 * u)], fill=N)                 # le dos
    d.polygon([(x + 12 * u, y - 34 * u), (x + 28 * u, y - 20 * u), (x + 25 * u, y - 16 * u), (x + 10 * u, y - 26 * u)], fill=N)
    d.arc([x - 7 * u, y - 58 * u, x + 7 * u, y - 42 * u], 290, 60, fill=V)              # le liseré du feu
    d.line([(x + 14 * u, y - 36 * u), (x + 16 * u, y - 14 * u)], fill=V)
    d.line([(x + 13 * u, y - 35 * u), (x + 28 * u, y - 21 * u)], fill=V)
    for k in range(galons):
        d.line([(x + 15 * u + k * 3, y - 31 * u + k * 3), (x + 20 * u + k * 3, y - 26 * u + k * 3)], fill=B)


def texte_maj(d, x, y, t, c=N):
    """Un texte en capitales avec la police par défaut ; le Î est dessiné à la main (la police n'a pas d'accents)."""
    for ch in t:
        if ch == 'Î':
            d.text((x, y), 'I', fill=c)
            w = d.textlength('I')
            d.point((x + w / 2 - 1, y), fill=c); d.point((x + w / 2, y - 1), fill=c); d.point((x + w / 2 + 1, y), fill=c)
            x += w
        else:
            d.text((x, y), ch, fill=c)
            x += d.textlength(ch)


NOMS_RANGS = {1: "MATELOT", 2: "QUARTIER-MAÎTRE", 3: "SECOND", 4: "CAPITAINE", 5: "AMIRAL"}


def personnage_ombre(d, x, y, h=90, main=None, manteau=False, casquette=False, c=N):
    """Une silhouette humaine en contre-jour, de profil trois quarts : tête ronde, épaules, jambes ;
    main : le point (x, y) que la main tendue atteint ; manteau : un long manteau évasé."""
    u = h / 90
    tete_r = 7 * u
    d.ellipse([x - tete_r, y - h, x + tete_r, y - h + tete_r * 2.2], fill=c)
    if casquette:
        d.rectangle([x - tete_r - 1, y - h - 1, x + tete_r + 1, y - h + 3 * u], fill=c)
        d.rectangle([x - tete_r - 5 * u, y - h + 2 * u, x + tete_r, y - h + 4 * u], fill=c)
    d.rectangle([x - 3 * u, y - h + 14 * u, x + 3 * u, y - h + 19 * u], fill=c)
    epaule = y - h + 18 * u
    bas = y - (8 if manteau else 40) * u
    d.polygon([(x - 13 * u, epaule + 3 * u), (x - 9 * u, epaule), (x + 9 * u, epaule), (x + 13 * u, epaule + 3 * u),
               (x + (16 if manteau else 11) * u, bas), (x - (16 if manteau else 11) * u, bas)], fill=c)
    d.polygon([(x - 10 * u, bas), (x - 2 * u, bas), (x - 3 * u, y - 2), (x - 9 * u, y - 2)], fill=c)
    d.polygon([(x + 2 * u, bas), (x + 10 * u, bas), (x + 9 * u, y - 2), (x + 3 * u, y - 2)], fill=c)
    d.rectangle([x - 11 * u, y - 2, x - 2 * u, y], fill=c)
    d.rectangle([x + 2 * u, y - 2, x + 12 * u, y], fill=c)
    cote = 1 if main is None or main[0] >= x else -1
    if main is not None:
        sx, sy = x + cote * 10 * u, epaule + 4 * u
        coude = (sx + (main[0] - sx) * 0.5, sy + 12 * u)
        d.line([(sx, sy), coude, main], fill=c, width=max(3, int(6 * u)))
        d.ellipse([main[0] - 3 * u, main[1] - 3 * u, main[0] + 3 * u, main[1] + 3 * u], fill=c)
    d.line([(x - cote * 11 * u, epaule + 4 * u), (x - cote * 13 * u, epaule + 34 * u)], fill=c, width=max(3, int(5 * u)))


def ligne_r(r, x0, y0, x1, y1, c, ep=1):
    """Une ligne en gros pixels (pour les objets en diagonale des personnages)."""
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(n + 1):
        x = round(x0 + (x1 - x0) * k / max(1, n))
        y = round(y0 + (y1 - y0) * k / max(1, n))
        r(x, y, x + ep - 1, y + ep - 1, c)


LIEUX = {
    "loc_grand_port.gif": grand_port, "loc_grand_port_victoire.gif": grand_port_victoire,
    "loc_bataille_aube.gif": bataille_aube,
    "loc_quai_premiers_pas.gif": quai_premiers_pas, "loc_capitainerie.gif": capitainerie,
    "loc_entrepot_plans.gif": entrepot_plans, "loc_soutes.gif": soutes, "loc_chenaux.gif": chenaux,
    "loc_chantier_naval.gif": chantier_naval, "loc_cales.gif": cales, "loc_chantier_maitres.gif": chantier_maitres,
    "loc_registre_port.gif": registre_port, "loc_feuille_route.gif": feuille_route, "loc_vigie_port.gif": vigie_port,
    "loc_armurerie.gif": armurerie, "loc_douane.gif": douane, "loc_escadre.gif": escadre,
    "loc_machine_port.gif": machine_port, "loc_douane_machine.gif": douane_machine, "loc_navire_machine.gif": navire_machine,
    "scene_bivouac_nuit1.gif": lambda: bivouac(1), "scene_bivouac_nuit2.gif": lambda: bivouac(2),
    "scene_bivouac_nuit3.gif": lambda: bivouac(3),
    "rang_matelot.gif": lambda: rang(1), "rang_quartier_maitre.gif": lambda: rang(2), "rang_second.gif": lambda: rang(3),
    "rang_capitaine.gif": lambda: rang(4), "rang_amiral.gif": lambda: rang(5),
    "cine8_lettre.gif": cine_lettre, "cine8_phare_noir.gif": cine_phare_noir, "cine8_port_eveil.gif": cine_port_eveil,
    "cine8_galons.gif": cine_galons, "cine8_quais_vides.gif": cine_quais_vides, "cine8_flotte_horizon.gif": cine_flotte_horizon,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_ordre_embarquement.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_ordre_embarquement.gif":
            ordre_embarquement(nom); n += 1
    print(n, "dessins")
