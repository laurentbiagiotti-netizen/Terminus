"""Dessine la Chronothèque (chapitre 9, « la Chronique d'Éternité ») : la salle ronde sous la tour de l'horloge, le
Grand Sablier dont le sable coule vers le haut, la Chronique enchaînée sur son lutrin, les quatorze salles des maîtres
du temps, la machine royaume au bout du pont de lumière, les trois nuits, la bataille du temps, la victoire, les
images de montée de rang, les plans de la cinématique 9, le Grand Sablier (objet), le coffre des dossiers et le Sceau
de la Chronique (la neuvième enveloppe).

Même format et même palette que les chapitres précédents (dessiner_lieux.finir : toile 176 x 170 doublée dans le cadre
d'origine ; trois couleurs : noir, vert, blanc), même manière que dessiner_port.py : dégradés tramés (trame ordonnée
4 x 4), plans successifs, contre-jours, halos de lumière. Ici, tout est sous terre et de nuit : la pierre, la cire,
l'or des fils du destin (le vert), la lumière des lanternes (le blanc).
Usage : python3 outils/dessiner_chronique.py [nom...]
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_port import (BAYER, trame, degrade, halo, ombrer, ciel_nuit, etoile, texte_maj, faisceau,  # noqa: E402
                           croissant, lune_pleine, nuages, eclair)


# ------------------------------------------------------------------
# La pierre, les lanternes, les runes
# ------------------------------------------------------------------

def pierres(d, x0, y0, x1, y1, h=8, l=16, c=V, graine=1, fond=N, joint=None):
    """Un mur de pierres de taille : des assises décalées, les joints en noir, une arête claire en haut des pierres."""
    rnd = random.Random(graine)
    d.rectangle([x0, y0, x1, y1], fill=fond)
    y, rang_ = y0, 0
    while y < y1:
        dec = (l // 2) if rang_ % 2 else 0
        x = x0 - dec
        while x < x1:
            lx = l + rnd.randint(-3, 3)
            a, b = max(x0, x + 1), min(x1, x + lx - 1)
            if b > a:
                d.rectangle([a, y + 1, b, min(y1, y + h - 1)], fill=c)
                d.line([(a, y + 1), (b, y + 1)], fill=joint if joint is not None else B)
                if rnd.random() < 0.3:
                    trame(d, a, y + h // 2, b, min(y1, y + h - 1), fond, 0.3)
            x += lx
        y += h
        rang_ += 1


def voute(d, cx, cy, r, c=B, n=9, ep=2):
    """Les nervures d'une voûte : des arcs qui convergent vers la clé de voûte."""
    for k in range(n):
        a = math.pi + k * math.pi / (n - 1)
        x, y = cx + r * math.cos(a), cy + r * 0.5 * math.sin(a) + r * 0.5
        d.line([(cx, cy), (x, y)], fill=c, width=ep)
    d.ellipse([cx - 4, cy - 3, cx + 4, cy + 3], fill=c)


def porte_ogive(d, x, y, w, h, c=B, fond=N, ouverte=False, lueur=False):
    """Une porte en ogive dans la pierre : un chambranle épais (vert, filet clair), un vantail sombre à deux battants
    (ou une lueur si elle est entrouverte sur sa salle)."""
    def ogive(i):
        return [(x + i, y + h), (x + i, y + h * 0.42), (x + w / 2, y + i * 1.4), (x + w - i, y + h * 0.42), (x + w - i, y + h)]
    d.polygon(ogive(0), fill=V)
    d.line(ogive(0)[:5], fill=c)
    i = 2 if w > 10 else 1
    d.polygon(ogive(i), fill=fond)
    if lueur:
        trame(d, x + i, y + h * 0.45, x + w - i, y + h, V, 0.55)
        trame(d, x + i + 1, y + h * 0.7, x + w - i - 1, y + h, B, 0.25)
    if not ouverte and w > 10:
        d.line([(x + w / 2, y + i * 2), (x + w / 2, y + h)], fill=V)
        d.point((x + w / 2 - 2, y + h * 0.65), fill=B); d.point((x + w / 2 + 2, y + h * 0.65), fill=B)


def lanterne(d, x, y, s=1.0, allumee=True):
    """Une lanterne pendue : chaîne, chapeau, cage et sa flamme ; un halo si elle est allumée."""
    if allumee:
        halo(d, x, y + 6 * s, 14 * s, V, 0.6)
    d.line([(x, y - 8 * s), (x, y)], fill=B)
    d.polygon([(x - 4 * s, y + 1), (x + 4 * s, y + 1), (x, y - 3 * s)], fill=B)
    d.rectangle([x - 3 * s, y + 1, x + 3 * s, y + 10 * s], fill=B)
    d.rectangle([x - 2 * s, y + 2, x + 2 * s, y + 9 * s], fill=V if allumee else N)
    if allumee:
        d.line([(x, y + 3), (x, y + 7 * s)], fill=B)
    d.rectangle([x - 4 * s, y + 10 * s, x + 4 * s, y + 11 * s], fill=B)


def cierge(d, x, y, h=14, allume=True):
    d.rectangle([x - 2, y - h, x + 2, y], fill=B)
    d.line([(x + 1, y - h), (x + 1, y)], fill=V)
    if allume:
        halo(d, x, y - h - 3, 9, V, 0.5)
        d.polygon([(x, y - h - 7), (x + 2, y - h - 2), (x, y - h), (x - 2, y - h - 2)], fill=B)


RUNES = ["#.#|.#.|#.#", "###|#..|###", ".#.|###|.#.", "#..|###|..#", "##.|.#.|.##", "#.#|###|#.#", "..#|.#.|#..", "###|.#.|.#."]


def rune(d, x, y, k, c=B, s=1):
    for dy, ligne in enumerate(RUNES[k % len(RUNES)].split('|')):
        for dx, p in enumerate(ligne):
            if p == '#':
                d.rectangle([x + dx * s, y + dy * s, x + dx * s + s - 1, y + dy * s + s - 1], fill=c)


def ligne_runes(d, x, y, n, graine=1, c=B, s=1):
    rnd = random.Random(graine)
    for k in range(n):
        rune(d, x + k * (4 * s), y, rnd.randint(0, 7), c, s)


def sablier(d, cx, top, h, w, sable_haut=0.6, c=B, montant=True, casse=False, renverse=False):
    """Le Grand Sablier : deux cadres de bois tournés, deux bulbes de verre, et le sable qui MONTE (il s'accumule
    en haut, un filet remonte du col) ; deux montants torsadés."""
    yb = top + h
    d.rectangle([cx - w // 2 - 4, top - 4, cx + w // 2 + 4, top], fill=c)               # les deux plateaux
    d.rectangle([cx - w // 2 - 4, yb, cx + w // 2 + 4, yb + 4], fill=c)
    d.rectangle([cx - w // 2 - 1, top - 6, cx + w // 2 + 1, top - 5], fill=V)
    d.rectangle([cx - w // 2 - 1, yb + 5, cx + w // 2 + 1, yb + 6], fill=V)
    mid = top + h // 2
    haut = [(cx - w // 2, top + 2), (cx + w // 2, top + 2), (cx + 3, mid), (cx - 3, mid)]
    bas = [(cx - 3, mid), (cx + 3, mid), (cx + w // 2, yb - 2), (cx - w // 2, yb - 2)]
    if not casse:
        d.polygon(haut, outline=c); d.polygon(bas, outline=c)
    else:
        d.line([haut[0], haut[3]], fill=c); d.line([bas[1], bas[2]], fill=c)
        d.line([haut[1], (cx + w // 4, top + h // 4)], fill=c)
        d.line([bas[0], (cx - w // 4, yb - h // 5)], fill=c)
    # le sable : en haut il s'empile (montant), en bas il reste un fond
    if not renverse:
        hh = int((mid - top - 4) * sable_haut)
        for y in range(top + 3, top + 3 + hh):
            f = (y - top) / max(1, (mid - top))
            lx = (w // 2 - 1) * (1 - f) + 2 * f
            d.line([(cx - lx + 1, y), (cx + lx - 1, y)], fill=V)
        trame(d, cx - w // 2 + 2, top + 3, cx + w // 2 - 2, top + 3 + hh, B, 0.15)
        reste = int((yb - mid) * (1 - sable_haut) * 0.6)
        for y in range(yb - 3 - reste, yb - 2):
            f = (yb - y) / max(1, (yb - mid))
            lx = (w // 2 - 1) * (1 - f) + 2 * f
            d.line([(cx - lx + 1, y), (cx + lx - 1, y)], fill=V)
        if montant:
            for k, y in enumerate(range(mid - 2, top + 3 + hh, -3)):                    # le filet qui remonte
                d.point((cx + (k % 2), y), fill=B)
            for k in range(6):
                d.point((cx - 2 + k % 5, mid + 2 + k * 2), fill=B)
    for sx in (-1, 1):                                                                     # les montants torsadés
        x = cx + sx * (w // 2 + 2)
        d.line([(x, top), (x, yb)], fill=c, width=2)
        for y in range(top + 3, yb, 5):
            d.point((x + sx, y), fill=N)


def lutrin(d, x, y, s=1.0, ouvert=True, chaine=True, plume=False):
    """Le lutrin de pierre et la Chronique enchaînée : un grimoire épais, ouvert, dont une page se soulève seule."""
    d.polygon([(x - 6 * s, y + 40 * s), (x + 6 * s, y + 40 * s), (x + 4 * s, y + 12 * s), (x - 4 * s, y + 12 * s)], fill=V)
    d.rectangle([x - 12 * s, y + 38 * s, x + 12 * s, y + 42 * s], fill=B)
    d.polygon([(x - 24 * s, y + 4 * s), (x + 24 * s, y), (x + 26 * s, y + 12 * s), (x - 22 * s, y + 16 * s)], fill=B)
    if ouvert:
        d.polygon([(x - 22 * s, y - 2 * s), (x - 1, y + 2 * s), (x - 1, y + 12 * s), (x - 20 * s, y + 10 * s)], fill=B)
        d.polygon([(x + 1, y + 2 * s), (x + 22 * s, y - 4 * s), (x + 24 * s, y + 7 * s), (x + 1, y + 12 * s)], fill=B)
        for k in range(4):
            d.line([(x - 18 * s, y + (1 + k * 2.4) * s), (x - 4 * s, y + (3 + k * 2.4) * s)], fill=N)
            d.line([(x + 4 * s, y + (2 + k * 2.4) * s), (x + 19 * s, y + (-1 + k * 2.4) * s)], fill=N)
        d.polygon([(x + 1, y + 2 * s), (x + 12 * s, y - 14 * s), (x + 16 * s, y - 10 * s), (x + 3, y + 6 * s)], fill=V)   # la page qui tourne
        d.line([(x + 1, y + 2 * s), (x + 12 * s, y - 14 * s)], fill=B)
    if chaine:
        for k in range(7):
            cx, cy = x - 24 * s - k * 3 * s, y + 14 * s + k * 3.5 * s
            d.ellipse([cx - 2, cy - 1, cx + 2, cy + 1], outline=B)
    if plume:
        d.line([(x - 8 * s, y + 8 * s), (x + 10 * s, y - 2 * s)], fill=B, width=2)
        for k in range(5):
            d.line([(x - 6 * s + k * 3 * s, y + 7 * s - k * 1.5 * s), (x - 6 * s + k * 3 * s, y + 3 * s - k * 1.5 * s)], fill=N)


def sceau_cire(d, cx, cy, r, c=V, motif='sablier'):
    """Un sceau de cire : un disque aux bords coulés, un anneau, et le motif frappé."""
    pts = []
    for k in range(16):
        a = k * math.pi / 8
        rr = r + (1.5 if k % 3 == 0 else 0)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=c)
    if r > 4:
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=N)
    if motif == 'sablier':
        a = r * 0.45
        d.polygon([(cx - a, cy - a), (cx + a, cy - a), (cx, cy)], fill=N)
        d.polygon([(cx - a, cy + a), (cx + a, cy + a), (cx, cy)], fill=N)
    elif motif == 'pg':
        texte_maj(d, cx - 6, cy - 5, "PG", N)


def fils_or(d, pts_list, c=V, ep=1):
    for pts in pts_list:
        d.line(bezier(pts, 30), fill=c, width=ep)


def bezier(pts, pas=30):
    r = []
    for i in range(pas + 1):
        t = i / pas
        q = [tuple(map(float, p)) for p in pts]
        while len(q) > 1:
            q = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(q, q[1:])]
        r.append(q[0])
    return r


def sol_dalles(d, y0, y1=H, c=V, cx=88):
    """Un dallage en perspective, qui fuit vers un point au centre."""
    d.rectangle([0, y0, W, y1], fill=N)
    for k in range(0, 9):
        f = (k / 8) ** 1.7
        y = y0 + (y1 - y0) * f
        d.line([(0, y), (W, y)], fill=c)
    for k in range(-10, 11):
        d.line([(cx + k * 6, y0), (cx + k * 30, y1)], fill=c)


def salle_ronde(d, im, horizon=118, portes=14, lueur=True):
    """Le mur circulaire de la Chronothèque, ses quatorze portes en arc, et le dallage."""
    degrade(d, 0, 0, W, horizon, V, 0.35, 0.05)
    voute(d, 88, -30, 120, V, 11, 1)
    pierres(d, 0, 40, W, horizon, 7, 14, V, graine=5)
    ombrer(im, 0, 40, W, horizon, V, N, 0.8, 0.45)
    ombrer(im, 0, 40, W, horizon, B, V, 0.6, 0.3)
    for k in range(portes):
        x = 6 + k * (164 / (portes - 1))
        prof = 1 - abs(x - 88) / 88                                                       # au centre, le fond de la salle
        w, h = 7 + (1 - prof) * 3, 22 + (1 - prof) * 10
        y = horizon - h - prof * 10
        porte_ogive(d, x - w / 2, y, w, h, B, N, lueur=lueur)
    sol_dalles(d, horizon, H, V)


# ------------------------------------------------------------------
# La Chronothèque
# ------------------------------------------------------------------

def chronotheque(victoire=False):
    """La salle ronde : la voûte, les quatorze portes en arc, le Grand Sablier au centre, son sable qui coule vers le
    haut, et devant lui, sur son lutrin, la Chronique enchaînée ; des lanternes pendues ; (victoire) tout illuminé."""
    im, d = toile()
    salle_ronde(d, im, 116, 14, lueur=victoire)
    if victoire:
        for k in range(14):
            x = 8 + k * 12.3
            lanterne(d, x, 14 + (k % 2) * 6, 0.8, True)
        degrade(d, 0, 0, W, 40, B, 0.25, 0.0)
    else:
        for x in (26, 150):
            lanterne(d, x, 20, 1.0, True)
    halo(d, 88, 80, 46, B if victoire else V, 0.55 if victoire else 0.45, 58)
    sablier(d, 88, 30, 78, 34, 0.75 if victoire else 0.55, B)
    lutrin(d, 88, 124, 0.9, True, True)
    d.line([(10, 168), (40, 148)], fill=B); d.line([(166, 168), (136, 148)], fill=B)
    return im


def dossier_coffre():
    """Le coffre à parchemins (les dossiers de ~/chronotheque) : un petit coffre ouvert, des rouleaux scellés."""
    im, d = toile()
    pierres(d, 0, 0, W, 112, 9, 18, V, graine=8)
    ombrer(im, 0, 0, W, 112, V, N, 0.7, 0.2)
    sol_dalles(d, 112)
    halo(d, 88, 96, 60, V, 0.5, 34)
    d.polygon([(40, 96), (136, 96), (130, 150), (46, 150)], fill=B)                        # la caisse
    d.polygon([(44, 100), (132, 100), (127, 146), (49, 146)], fill=V)
    for y in (110, 124, 138):
        d.line([(46, y), (130, y)], fill=N)
    d.rectangle([84, 104, 92, 114], fill=B); d.rectangle([86, 106, 90, 112], fill=N)
    d.polygon([(40, 96), (136, 96), (148, 64), (52, 64)], fill=B)                           # le couvercle ouvert
    d.polygon([(44, 94), (132, 94), (143, 67), (55, 67)], fill=N)
    for k, x in enumerate(range(52, 128, 14)):                                            # les rouleaux
        d.rectangle([x, 80 - (k % 3) * 4, x + 9, 98], fill=B)
        d.line([(x + 9, 80 - (k % 3) * 4), (x + 9, 98)], fill=V)
        sceau_cire(d, x + 5, 92 - (k % 3) * 2, 4, V, None)
    return im


def royaume_machine():
    """La machine royaume : au bout d'un pont de lumière jeté sur le vide, une citadelle, et en son cœur une
    armoire de serveurs aux voyants allumés, gardée de deux bannières."""
    im, d = toile()
    ciel_nuit(d, 110, 31, 50)
    croissant(d, 30, 22, 7)
    x0, x1 = 96, 170                                                                       # la citadelle
    d.rectangle([x0, 40, x1, 128], fill=V)
    for x in range(x0, x1, 8):
        d.rectangle([x, 34, x + 4, 40], fill=V)
    pierres(d, x0 + 2, 42, x1 - 2, 126, 7, 12, V, graine=9)
    d.rectangle([118, 64, 150, 128], fill=N)                                               # l'armoire, dans la porte
    porte_ogive(d, 114, 56, 40, 72, B, N, ouverte=True)
    d.rectangle([122, 74, 146, 126], fill=B); d.rectangle([124, 76, 144, 124], fill=N)
    for k in range(7):
        y = 79 + k * 6
        d.rectangle([126, y, 142, y + 3], fill=V)
        d.point((128, y + 1), fill=B); d.point((131, y + 1), fill=B if k % 2 else N)
    for x in (104, 162):
        d.line([(x, 46), (x, 92)], fill=B)
        d.polygon([(x, 48), (x + (6 if x < 130 else -6), 52), (x, 62)], fill=B)
    # le pont de lumière, qui vient du spectateur
    for k in range(40):
        f = k / 40
        y = 168 - f * 46
        l = 40 - f * 30
        cx = 40 + f * 72
        trame(d, cx - l, y, cx + l, y + 1, B, 0.6 - f * 0.3)
    d.line([(0, 168), (102, 122)], fill=B); d.line([(80, 170), (122, 124)], fill=B)
    trame(d, 0, 128, 96, H, V, 0.12)
    return im


def bataille_temps():
    """La bataille du temps : le Grand Sablier se brise et se retourne, les pages de la Chronique s'envolent en
    tourbillon, une encre noire coule sur les dernières lignes."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 70, 90, V, 0.8, 80)
    halo(d, 88, 70, 40, B, 0.5, 36)
    for k in range(16):                                                                    # les éclats de lumière
        a = k * math.pi / 8 + 0.2
        d.line([(88 + 20 * math.cos(a), 70 + 20 * math.sin(a)), (88 + 80 * math.cos(a), 70 + 80 * math.sin(a))], fill=B if k % 2 else V)
    # le sablier penché, brisé
    im2 = Image.new('P', (80, 100), N); im2.putpalette(PAL); d2 = ImageDraw.Draw(im2)
    sablier(d2, 40, 12, 76, 34, 0.5, B, montant=False, casse=True)
    im2 = im2.rotate(-28, resample=Image.NEAREST, expand=False, fillcolor=N)
    masque = Image.new('L', im2.size, 0)
    mp, ip = masque.load(), im2.load()
    for yy in range(im2.size[1]):
        for xx in range(im2.size[0]):
            if ip[xx, yy] != N:
                mp[xx, yy] = 255
    im.paste(im2, (48, 20), masque)
    rnd = random.Random(4)
    for k in range(14):                                                                    # les pages qui volent
        a = k * 0.9
        r = 34 + k * 4
        x, y = 88 + r * math.cos(a), 74 + r * 0.6 * math.sin(a)
        s = 5 + rnd.randint(0, 4)
        pts = [(x - s, y - s * 0.6), (x + s, y - s), (x + s * 0.8, y + s * 0.6), (x - s * 1.1, y + s * 0.8)]
        d.polygon(pts, fill=B)
        d.line([(x - s * 0.6, y - s * 0.2), (x + s * 0.5, y - s * 0.5)], fill=N)
        d.line([(x - s * 0.6, y + s * 0.3), (x + s * 0.5, y)], fill=V)
    for k in range(6):                                                                     # des grains de sable en l'air
        d.point((60 + k * 11, 30 + (k * 7) % 20), fill=B)
    lutrin(d, 88, 132, 0.8, True, True)
    for k in range(5):                                                                     # l'encre qui coule
        d.line([(80 + k * 3, 136), (80 + k * 3, 140 + (k * 3) % 7)], fill=N)
    return im


# ------------------------------------------------------------------
# Les quatorze salles
# ------------------------------------------------------------------

def cadre_salle(im, d, graine=1, horizon=112, voute_=True):
    """Le fond commun d'une salle : murs de pierre dans la pénombre, voûte, dallage."""
    pierres(d, 0, 0, W, horizon, 8, 16, V, graine=graine)
    ombrer(im, 0, 0, W, horizon, V, N, 0.9, 0.5)
    ombrer(im, 0, 0, W, horizon, B, V, 0.7, 0.3)
    if voute_:
        d.arc([-40, -100, 216, 70], 0, 180, fill=B, width=2)
    sol_dalles(d, horizon, H, V)


def salle_sceaux():
    """La Salle des Sceaux : un établi de pierre couvert de cire, des matrices alignées, une chandelle qui chauffe la
    cire, et au mur trois anneaux, du plus large au plus étroit (system, global, local)."""
    im, d = toile()
    cadre_salle(im, d, 11)
    for k, r in enumerate((26, 18, 11)):                                                   # les trois anneaux
        cx = 46 + k * 42
        d.line([(cx, 0), (cx, 44 - r)], fill=B)
        d.ellipse([cx - r, 46 - r, cx + r, 46 + r], outline=B, width=3)
        d.ellipse([cx - r + 3, 46 - r + 3, cx + r - 3, 46 + r - 3], outline=V)
    for k, t in enumerate(("SYSTEM", "GLOBAL", "LOCAL")):
        texte_maj(d, 46 + k * 42 - len(t) * 3, 76, t, B)
    d.polygon([(10, 112), (166, 112), (176, 132), (0, 132)], fill=B)                        # l'établi
    d.rectangle([0, 132, W, 138], fill=V)
    halo(d, 132, 100, 26, V, 0.6)
    cierge(d, 132, 112, 16)
    d.rectangle([118, 116, 146, 124], fill=N)                                               # le creuset de cire
    d.ellipse([120, 114, 144, 120], fill=V)
    for k, x in enumerate(range(18, 108, 18)):                                              # les sceaux posés
        sceau_cire(d, x + 6, 122, 6, V if k % 2 else B, 'sablier')
    for k, x in enumerate(range(22, 104, 14)):                                              # les matrices
        d.rectangle([x, 98, x + 4, 112], fill=V); d.rectangle([x - 2, 96, x + 6, 98], fill=B)
    return im


def autel_offrandes():
    """L'Autel des Offrandes : une longue table de marbre, des cierges, des offrandes posées ; à droite, un voile de
    soie tendu qui cache un coin de la salle (le .gitignore)."""
    im, d = toile()
    cadre_salle(im, d, 12)
    for k in range(9):                                                                      # le voile
        x = 118 + k * 6
        d.line(bezier([(x, 6), (x + 6, 50), (x - 4, 90), (x + 2, 132)]), fill=B if k % 2 else V)
    trame(d, 116, 6, 170, 132, B, 0.15)
    d.line([(112, 6), (172, 6)], fill=B, width=2)
    d.polygon([(6, 102), (112, 102), (118, 116), (0, 116)], fill=B)                         # l'autel
    d.rectangle([4, 116, 112, 124], fill=V)
    d.rectangle([12, 124, 22, 156], fill=B); d.rectangle([94, 124, 104, 156], fill=B)
    for x in (12, 102):
        cierge(d, x, 102, 18)
    for k, x in enumerate((30, 50, 70, 86)):                                                # les offrandes
        if k == 0:
            d.rectangle([x, 92, x + 12, 102], fill=V); d.line([(x + 2, 95), (x + 10, 95)], fill=B)
        elif k == 1:
            d.ellipse([x, 90, x + 12, 102], fill=B); d.ellipse([x + 3, 93, x + 9, 99], fill=V)
        elif k == 2:
            d.rectangle([x, 88, x + 8, 102], fill=B); d.line([(x + 2, 92), (x + 6, 92)], fill=N); d.line([(x + 2, 96), (x + 6, 96)], fill=N)
        else:
            sceau_cire(d, x + 5, 96, 6, V)
    return im


def crypte_runes():
    """La Crypte des Runes : un caveau voûté où chaque pierre porte une rune ; au fond, une grande dalle gravée de
    quarante signes, éclairée par une torche."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for k in range(4):                                                                     # les arcs du caveau
        r = 100 - k * 20
        d.arc([88 - r, 20 + k * 6, 88 + r, 20 + k * 6 + r * 1.6], 180, 360, fill=V, width=2)
    pierres(d, 0, 60, 34, 140, 9, 12, V, graine=13)
    pierres(d, 142, 60, W, 140, 9, 12, V, graine=14)
    rnd = random.Random(2)
    for _ in range(18):
        rune(d, rnd.randint(2, 28), rnd.randint(62, 132), rnd.randint(0, 7), B)
        rune(d, rnd.randint(146, 170), rnd.randint(62, 132), rnd.randint(0, 7), B)
    d.rectangle([48, 54, 128, 128], fill=V)                                                # la grande dalle
    d.rectangle([50, 56, 126, 126], fill=N)
    halo(d, 88, 90, 40, V, 0.4)
    for r_ in range(5):
        ligne_runes(d, 56, 62 + r_ * 12, 16, r_ + 3, B)
    d.rectangle([140, 50, 143, 74], fill=B)                                                # la torche
    halo(d, 141, 44, 16, V, 0.7)
    d.polygon([(141, 34), (146, 46), (141, 50), (136, 46)], fill=B)
    sol_dalles(d, 140, H, V)
    return im


def oracle():
    """L'Oracle : une vasque d'eau noire sur un pied de pierre, d'où remontent des lettres lumineuses ; contre le mur,
    le Miroir des aveux, un grand miroir ovale."""
    im, d = toile()
    cadre_salle(im, d, 15)
    d.ellipse([112, 18, 164, 98], fill=B); d.ellipse([116, 22, 160, 94], fill=N)           # le miroir
    trame(d, 118, 24, 158, 92, V, 0.25)
    for k in range(5):
        d.line([(124, 34 + k * 12), (150, 32 + k * 12)], fill=B if k % 2 else V)
    d.rectangle([134, 98, 142, 112], fill=B)
    halo(d, 60, 60, 44, V, 0.55, 50)
    d.polygon([(52, 112), (68, 112), (64, 92), (56, 92)], fill=V)                          # le pied
    d.ellipse([22, 78, 98, 98], fill=B); d.ellipse([26, 80, 94, 94], fill=N)               # la vasque
    for k, (x, y) in enumerate(((44, 70), (56, 58), (68, 46), (50, 38), (64, 28), (58, 16))):  # les lettres qui montent
        rune(d, x, y, k + 2, B if k % 2 else V)
    for k in range(3):
        d.arc([40 + k * 6, 84 - k, 80 - k * 6, 90 + k], 180, 360, fill=V)
    return im


def contresorts():
    """La Salle des Contre-sorts : des rayonnages de fioles étiquetées, et au fond, derrière une grille, le grimoire
    rouge du sort interdit (reset --hard)."""
    im, d = toile()
    cadre_salle(im, d, 16)
    for x0 in (4, 122):                                                                    # les rayonnages
        d.rectangle([x0, 14, x0 + 50, 110], fill=N)
        for k in range(4):
            y = 34 + k * 22
            d.rectangle([x0, y, x0 + 50, y + 2], fill=B)
            for j in range(5):
                fx = x0 + 4 + j * 9
                h = 8 + (j * 7 + k) % 6
                d.rectangle([fx + 1, y - h, fx + 5, y - 1], fill=V if (j + k) % 2 else B)
                d.rectangle([fx + 2, y - h - 2, fx + 4, y - h], fill=B)
                d.point((fx + 3, y - h // 2), fill=N)
    halo(d, 88, 64, 26, V, 0.5)
    d.rectangle([66, 36, 110, 96], fill=N)                                                 # la grille
    d.rectangle([72, 50, 104, 86], fill=V)                                                 # le grimoire interdit
    d.rectangle([74, 52, 102, 84], fill=N)
    d.rectangle([76, 54, 100, 82], fill=V)
    texte_maj(d, 77, 62, "HARD", N)
    for x in range(66, 112, 6):
        d.line([(x, 36), (x, 96)], fill=B)
    d.line([(66, 36), (110, 36)], fill=B, width=2); d.line([(66, 96), (110, 96)], fill=B, width=2)
    d.rectangle([84, 98, 92, 104], fill=B); d.ellipse([85, 92, 91, 98], outline=B)          # le cadenas
    return im


def livre_ombres():
    """Le Livre des Ombres : une salle sans lumière, un seul livre ouvert sur un pupitre, une bougie ; les pas de HEAD
    écrits en lignes pâles qui montent dans le noir."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 104, 70, V, 0.55, 50)
    for k in range(9):                                                                     # les lignes du reflog, dans le noir
        y = 14 + k * 9
        x = 30 + (k % 3) * 8
        d.line([(x, y), (x + 90 - k * 4, y)], fill=V if k % 3 else B)
        texte_maj(d, x - 26, y - 4, "@{" + str(k) + "}", V)
    d.polygon([(76, 168), (100, 168), (96, 126), (80, 126)], fill=V)                       # le pupitre
    lutrin(d, 88, 112, 0.8, True, False)
    cierge(d, 124, 124, 14)
    return im


def lignes_destin():
    """Les Lignes du Destin : un plafond d'étoiles où des fils d'or se séparent et se rejoignent (des nœuds : les
    fusions), et en bas une silhouette qui tend la main vers eux."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    ciel_nuit(d, 130, 41, 60)
    fils = [[(0, 120), (40, 110), (70, 80), (176, 60)],
            [(0, 120), (50, 120), (90, 100), (130, 60)],
            [(40, 112), (80, 140), (120, 110), (176, 100)],
            [(90, 100), (110, 90), (150, 80), (176, 40)],
            [(0, 40), (40, 60), (80, 50), (130, 60)]]
    fils_or(d, fils, V, 2)
    fils_or(d, [[(0, 121), (40, 111), (70, 81), (176, 61)]], B, 1)
    for (x, y) in ((40, 111), (90, 100), (130, 60), (120, 110)):                           # les nœuds
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=B)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=V)
    sol_dalles(d, 140, H, V)
    return im


def paradoxes():
    """La Salle des Paradoxes : deux escaliers qui montent l'un vers l'autre et se rejoignent tête en bas, une
    silhouette qui marche à l'envers."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    degrade(d, 0, 0, W, H, V, 0.3, 0.05)
    for k in range(9):                                                                     # l'escalier du bas
        x, y = 10 + k * 10, 160 - k * 9
        d.rectangle([x, y, x + 12, y + 3], fill=B)
        d.rectangle([x, y + 3, x + 12, 170], fill=V if k % 2 else N)
        d.line([(x, y + 3), (x, 170)], fill=B)
    for k in range(9):                                                                     # l'escalier du haut, à l'envers
        x, y = 166 - k * 10, 10 + k * 9
        d.rectangle([x - 12, y - 3, x, y], fill=B)
        d.rectangle([x - 12, 0, x, y - 3], fill=V if k % 2 else N)
        d.line([(x, 0), (x, y - 3)], fill=B)
    for (x, y, s) in ((96, 82, 1), (82, 90, -1)):                                          # deux silhouettes opposées
        d.ellipse([x - 3, y - 14 * s - 3, x + 3, y - 14 * s + 3], fill=B)
        d.line([(x, y - 11 * s), (x, y)], fill=B, width=2)
        d.line([(x, y), (x - 3, y + 5 * s)], fill=B); d.line([(x, y), (x + 3, y + 5 * s)], fill=B)
    texte_maj(d, 60, 64, "<<<<<<<", B)
    texte_maj(d, 92, 104, ">>>>>>>", B)
    return im


def menhir(d, x, y, h=60, w=24, c=V):
    pts = [(x - w // 2, y), (x - w // 2 + 3, y - h + 10), (x - 2, y - h), (x + w // 2 - 2, y - h + 8), (x + w // 2, y)]
    d.polygon(pts, fill=c)
    d.line(pts[:4], fill=B)
    for k in range(4):
        rune(d, x - 4, y - h + 16 + k * 9, k + 3, B)


def besace_reliques():
    """La Besace et les Reliques : une besace de cuir sans fond accrochée à une patère, d'où sort une lumière ; des
    reliques sous cloche de verre ; et dehors, par l'arche, le menhir que personne ne déplace."""
    im, d = toile()
    cadre_salle(im, d, 17)
    porte_ogive(d, 112, 20, 56, 92, B, N, ouverte=True)                                    # l'arche sur la cour
    degrade(d, 114, 40, 166, 112, V, 0.1, 0.5)
    menhir(d, 140, 110, 56, 22, V)
    d.rectangle([20, 20, 30, 24], fill=B)                                                   # la patère
    d.polygon([(10, 30), (46, 30), (54, 82), (4, 86)], fill=V)                             # la besace
    d.polygon([(10, 30), (46, 30), (40, 46), (14, 46)], fill=B)
    d.line([(25, 24), (12, 30)], fill=B, width=2); d.line([(25, 24), (44, 30)], fill=B, width=2)
    halo(d, 28, 40, 16, B, 0.6)
    for k, x in enumerate((64, 88)):                                                        # les reliques sous cloche
        d.rectangle([x - 10, 100, x + 10, 112], fill=B)
        d.arc([x - 10, 70, x + 10, 110], 180, 360, fill=B)
        d.line([(x - 10, 90), (x - 10, 100)], fill=B); d.line([(x + 10, 90), (x + 10, 100)], fill=B)
        if k == 0:
            sceau_cire(d, x, 94, 5, V)
        else:
            rune(d, x - 1, 90, 5, V, 2)
    return im


def atelier_propheties():
    """L'Atelier des Prophéties : des pupitres couverts de parchemins grattés et réécrits ; un couteau à gratter,
    une plume, un parchemin où deux lignes barrées sont remplacées par une seule, droite."""
    im, d = toile()
    cadre_salle(im, d, 18)
    halo(d, 88, 80, 60, V, 0.45, 40)
    d.polygon([(24, 64), (150, 56), (162, 126), (14, 134)], fill=B)                        # le grand parchemin
    d.polygon([(20, 132), (160, 124), (162, 132), (22, 140)], fill=V)
    for k in range(6):
        y0 = 70 + k * 10
        if k in (2, 3):
            d.line([(32, y0), (130, y0 - 6)], fill=V)
            d.line([(30, y0 + 1), (134, y0 - 4)], fill=N)                                   # barré
        else:
            d.line([(32, y0), (140, y0 - 7)], fill=N)
    d.line([(40, 92), (146, 86)], fill=V, width=2)                                          # la ligne réécrite, droite
    d.line([(132, 30), (106, 74)], fill=B, width=2)                                         # la plume
    for k in range(5):
        d.line([(128 - k * 4, 36 + k * 7), (134 - k * 4, 34 + k * 7)], fill=V)
    d.polygon([(26, 40), (52, 52), (50, 56), (24, 44)], fill=B)                             # le grattoir
    d.rectangle([12, 34, 28, 42], fill=V)
    for x in range(20, 160, 30):
        d.rectangle([x, 144, x + 6, H], fill=V)
    return im


def salle_cartes():
    """La Salle des Cartes : une table immense vue d'en haut, trois royaumes dessinés avec leurs routes : un seul
    tronc, des routes courtes ; des routes qui se séparent et se rejoignent ; de longues routes parallèles."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 80, 90, V, 0.4, 70)
    d.polygon([(10, 20), (166, 14), (172, 150), (4, 158)], fill=B)
    d.polygon([(14, 24), (162, 18), (167, 146), (8, 154)], fill=V)
    d.line([(60, 22), (56, 152)], fill=N, width=2); d.line([(112, 20), (116, 148)], fill=N, width=2)
    # royaume 1 : un tronc et des routes très courtes
    d.line([(34, 34), (32, 140)], fill=B, width=2)
    for y in range(44, 140, 14):
        d.line([(32, y), (44, y + 5), (32, y + 10)], fill=B)
    # royaume 2 : des routes qui se séparent et se rejoignent
    d.line([(86, 34), (86, 140)], fill=B, width=2)
    for y in (50, 90):
        d.line(bezier([(86, y), (102, y + 6), (102, y + 20), (86, y + 26)]), fill=B)
    # royaume 3 : des routes parallèles, longues
    for x in (128, 140, 152):
        d.line([(x, 32), (x, 142)], fill=B)
    for y in (60, 100, 130):
        d.line([(128, y), (152, y - 8)], fill=N)
    for k, x in enumerate((26, 80, 132)):
        texte_maj(d, x, 144 - k * 0, str(k + 1), N)
    d.ellipse([140, 140, 170, 168], outline=B); d.line([(155, 140), (155, 168)], fill=B)    # la rose des vents
    d.line([(140, 154), (170, 154)], fill=B)
    return im


def portes_royaumes():
    """Les Portes des Royaumes : une arche de pierre ouverte sur la nuit, un pont de lumière qui file vers une
    citadelle lointaine, des messagers sur le pont."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    ciel_nuit(d, 100, 51, 40)
    for k in range(30):                                                                    # le pont de lumière
        f = k / 30
        y = 168 - f * 70
        l = 34 - f * 30
        trame(d, 88 - l, y, 88 + l, y + 2, B, 0.65 - f * 0.4)
    d.line([(54, 168), (86, 98)], fill=B); d.line([(122, 168), (90, 98)], fill=B)
    d.rectangle([80, 78, 96, 98], fill=V)                                                  # la citadelle lointaine
    for x in range(80, 96, 4):
        d.rectangle([x, 74, x + 2, 78], fill=V)
    d.point((88, 86), fill=B)
    for (x, y, s) in ((76, 140, 1.4), (98, 120, 1.0)):                                     # les messagers
        d.ellipse([x - 2 * s, y - 12 * s, x + 2 * s, y - 8 * s], fill=B)
        d.polygon([(x - 4 * s, y), (x + 4 * s, y), (x + 2 * s, y - 8 * s), (x - 2 * s, y - 8 * s)], fill=V)
        d.rectangle([x + 3 * s, y - 7 * s, x + 6 * s, y - 5 * s], fill=B)
    pierres(d, 0, 0, 34, H, 8, 12, V, graine=19)                                           # l'arche
    pierres(d, 142, 0, W, H, 8, 12, V, graine=20)
    d.arc([10, -50, 166, 120], 180, 360, fill=V, width=14)
    d.arc([22, -40, 154, 108], 180, 360, fill=B, width=2)
    return im


def runes_garde():
    """Les Runes de Garde : un seuil de pierre gravé de runes qui brûlent (une flamme sur chacune), un poinçon d'argent
    posé, et un bâton de cire avec son sceau."""
    im, d = toile()
    cadre_salle(im, d, 21)
    porte_ogive(d, 50, 20, 76, 96, B, N, ouverte=True)
    degrade(d, 52, 50, 124, 116, V, 0.0, 0.4)
    d.polygon([(30, 120), (146, 120), (160, 140), (16, 140)], fill=B)                       # le seuil
    for k in range(9):
        x = 32 + k * 13
        rune(d, x, 126, k, N, 2)
        halo(d, x + 3, 120, 6, V, 0.7)
        d.polygon([(x + 3, 110), (x + 5, 117), (x + 3, 120), (x + 1, 117)], fill=B)
    d.line([(130, 150), (154, 158)], fill=B, width=2)                                       # le poinçon
    d.rectangle([24, 148, 54, 154], fill=V); sceau_cire(d, 62, 151, 6, V)                   # la cire
    return im


def golem(d, x, y, s=1.0):
    """Un golem de bronze : un buste massif, des épaules en blocs, une tête carrée aux yeux lumineux."""
    d.rectangle([x - 14 * s, y - 50 * s, x + 14 * s, y - 14 * s], fill=V)
    d.rectangle([x - 22 * s, y - 50 * s, x - 14 * s, y - 36 * s], fill=V)
    d.rectangle([x + 14 * s, y - 50 * s, x + 22 * s, y - 36 * s], fill=V)
    d.rectangle([x - 22 * s, y - 36 * s, x - 16 * s, y - 16 * s], fill=V)
    d.rectangle([x + 16 * s, y - 36 * s, x + 22 * s, y - 16 * s], fill=V)
    d.rectangle([x - 9 * s, y - 66 * s, x + 9 * s, y - 50 * s], fill=V)
    d.rectangle([x - 6 * s, y - 60 * s, x - 2 * s, y - 57 * s], fill=B)
    d.rectangle([x + 2 * s, y - 60 * s, x + 6 * s, y - 57 * s], fill=B)
    d.rectangle([x - 12 * s, y - 14 * s, x - 4 * s, y], fill=V)
    d.rectangle([x + 4 * s, y - 14 * s, x + 12 * s, y], fill=V)
    for yy in (-44, -32, -22):
        d.line([(x - 14 * s, y + yy * s), (x + 14 * s, y + yy * s)], fill=N)
    d.line([(x - 22 * s, y - 50 * s), (x + 22 * s, y - 50 * s)], fill=B)
    rune(d, x - 1, y - 40 * s, 2, B)


def haut_conseil():
    """Le Haut-Conseil : un hémicycle de bancs de pierre, et sur l'estrade, deux golems de bronze de part et d'autre
    du pupitre où l'on pose les requêtes."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    degrade(d, 0, 0, W, 90, V, 0.25, 0.0)
    for k in range(5):                                                                     # les gradins
        r = 160 - k * 22
        d.arc([88 - r, 20 + k * 6, 88 + r, 20 + k * 6 + r], 200, 340, fill=B if k % 2 else V, width=3)
    d.rectangle([20, 128, 156, 136], fill=B)                                                # l'estrade
    d.rectangle([20, 136, 156, H], fill=V)
    d.polygon([(74, 128), (102, 128), (98, 104), (78, 104)], fill=B)                        # le pupitre
    d.polygon([(70, 104), (106, 104), (100, 96), (76, 96)], fill=V)
    d.rectangle([80, 90, 96, 98], fill=B); d.line([(82, 93), (94, 93)], fill=N)
    halo(d, 88, 92, 18, B, 0.5)
    golem(d, 40, 128, 1.0)
    golem(d, 136, 128, 1.0)
    return im


# ------------------------------------------------------------------
# Les nuits, les rangs, la cinématique
# ------------------------------------------------------------------

def nuit(n):
    """La Chronothèque de nuit : une seule lanterne, la recrue assise au pied du Grand Sablier ; (2) une plume grise
    posée sur le lutrin ; (3) le sable coule deux fois plus vite, en gerbe."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 30, W, 116, 7, 14, V, graine=30 + n)
    ombrer(im, 0, 30, W, 116, V, N, 0.95, 0.6)
    sol_dalles(d, 116)
    halo(d, 70, 74, 56, V, 0.6, 60)
    sablier(d, 70, 22, 80, 34, 0.5 + 0.12 * n, B, montant=True)
    if n == 3:
        for k in range(5):
            d.line([(46 - k * 3, 30 + k * 12), (46 - k * 3, 22 + k * 12)], fill=B)
            d.line([(94 + k * 3, 30 + k * 12), (94 + k * 3, 22 + k * 12)], fill=B)
        for k in range(14):
            d.point((70 + (k % 3) - 1, 60 - k * 2), fill=B)
        for k in range(8):
            a = -math.pi / 2 + (k - 3.5) * 0.25
            d.line([(70, 62), (70 + 16 * math.cos(a), 62 + 16 * math.sin(a))], fill=V)
    lutrin(d, 140, 118, 0.7, True, True, plume=(n == 2))
    if n == 2:
        halo(d, 140, 112, 22, B, 0.35)
        plume = [(116, 120), (126, 108), (146, 96), (162, 88), (158, 96), (140, 108), (122, 122)]
        d.polygon(plume, fill=B)
        px = im.load()
        for yy in range(86, 124):
            for xx in range(114, 164):
                if px[xx, yy] == B and (xx + yy) % 2 and xx > 120:
                    px[xx, yy] = N
        d.line([(114, 124), (162, 88)], fill=B)
    lanterne(d, 140, 40, 1.0, True)
    # la recrue assise, de dos, au pied du sablier
    x, y = 62, 162
    d.ellipse([x - 7, y - 40, x + 7, y - 26], fill=B)
    d.polygon([(x - 14, y), (x + 14, y), (x + 10, y - 26), (x - 10, y - 26)], fill=V)
    d.line([(x - 10, y - 26), (x - 14, y)], fill=B)
    for k in range(n):
        sceau_cire(d, x + 4 - k * 6, y - 14, 2, B, None)
    return im


NOMS_RANGS = {1: "SCRIBE", 2: "ARCHIVISTE", 3: "CHRONIQUEUR", 4: "GARDIEN DU TEMPS", 5: "CHRONOMANCIEN"}


def rang(n):
    """La montée de rang : un sceau de rang dans un médaillon, des rayons tramés, une banderole au nom du rang ; en
    bas, la Chronothèque ; les sceaux deviennent plus nobles : cire, argent, or, plume, et le sablier inversé."""
    im, d = toile()
    salle_ronde(d, im, 124, 14, lueur=(n >= 4))
    d.rectangle([0, 0, W, 40], fill=N)
    degrade(d, 0, 0, W, 40, V, 0.1, 0.35)
    cx, cy = 88, 52
    for k in range(18):
        if k % 2:
            continue
        a0, a1 = k * math.pi / 9, (k + 1) * math.pi / 9
        for rr in range(30, 120, 2):
            for a in (a0 + (a1 - a0) * j / 8 for j in range(9)):
                px, py = cx + rr * math.cos(a), cy + rr * math.sin(a)
                if 0 <= px < W and 0 <= py < 100 and BAYER[int(py) % 4][int(px) % 4] < 6:
                    d.point((px, py), fill=B)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=N)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=B, width=2)
    d.ellipse([cx - 36, cy - 36, cx + 36, cy + 36], outline=V)
    if n == 5:
        for k in range(9):                                                                   # la chaîne
            a = math.pi * (0.15 + 0.7 * k / 8)
            ex, ey = cx + 30 * math.cos(a + math.pi), cy - 30 * math.sin(a)
            d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], outline=B)
        sablier(d, cx, cy - 14, 34, 18, 0.7, B, montant=True)
        for (x, y) in ((cx - 22, cy - 22), (cx + 22, cy - 22), (cx, cy - 32)):
            etoile(d, x, y, 4, B)
    else:
        r = 18 + n * 2
        sceau_cire(d, cx, cy, r, V if n in (1, 3) else B, 'sablier')
        if n >= 2:
            d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], outline=B)
        if n >= 3:
            for k in range(12):
                a = k * math.pi / 6
                d.point((cx + (r + 7) * math.cos(a), cy + (r + 7) * math.sin(a)), fill=V)
        if n == 4:
            d.line([(cx + 10, cy + 28), (cx + 34, cy - 18)], fill=B, width=2)                 # la plume
            for k in range(6):
                d.line([(cx + 14 + k * 3.5, cy + 22 - k * 7), (cx + 20 + k * 3.5, cy + 22 - k * 7)], fill=V)
    nom = NOMS_RANGS[n]
    larg = int(d.textlength(nom)) + 12
    by = 96
    d.polygon([(cx - larg // 2 - 12, by + 2), (cx - larg // 2, by + 2), (cx - larg // 2, by + 14), (cx - larg // 2 - 12, by + 14), (cx - larg // 2 - 7, by + 8)], fill=V)
    d.polygon([(cx + larg // 2 + 12, by + 2), (cx + larg // 2, by + 2), (cx + larg // 2, by + 14), (cx + larg // 2 + 12, by + 14), (cx + larg // 2 + 7, by + 8)], fill=V)
    d.rectangle([cx - larg // 2, by, cx + larg // 2, by + 12], fill=B)
    d.line([(cx - larg // 2, by + 12), (cx + larg // 2, by + 12)], fill=V)
    texte_maj(d, cx - larg // 2 + 6, by + 1, nom, N)
    return im


def cine_empreinte():
    """Une empreinte de clé, lumineuse, flotte dans le noir ; dessous, gravées, deux initiales : P.G."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 66, 70, V, 0.55, 56)
    d.rectangle([28, 40, 148, 92], fill=B)
    d.rectangle([30, 42, 146, 90], fill=N)
    texte_maj(d, 36, 46, "SHA256:", V)
    rnd = random.Random(7)
    for r_ in range(3):
        s = "".join(rnd.choice("ABCDEFGHKLMNPQRSTUVWXYZ0123456789") for _ in range(16))
        texte_maj(d, 36, 58 + r_ * 10, s, B)
    d.ellipse([60, 108, 116, 164], fill=V)                                                 # le sceau aux initiales
    d.ellipse([64, 112, 112, 160], outline=N)
    d.text((72, 128), "P . G .", fill=N)
    for k in range(10):
        d.point((40 + k * 11, 102 + (k % 3)), fill=B)
    return im


def cine_tour_horloge():
    """La vieille tour de l'horloge de l'école, de nuit ; à son pied, une porte ouverte et un escalier qui descend
    dans une lueur verte."""
    im, d = toile()
    ciel_nuit(d, 120, 61, 50)
    croissant(d, 146, 22, 8)
    d.rectangle([58, 18, 118, 140], fill=V)                                                # la tour
    pierres(d, 60, 20, 116, 138, 8, 12, V, graine=62)
    d.polygon([(52, 18), (124, 18), (88, -10)], fill=N); d.line([(52, 18), (88, -10), (124, 18)], fill=B)
    d.ellipse([70, 30, 106, 66], fill=B); d.ellipse([73, 33, 103, 63], fill=N)             # le cadran
    for k in range(12):
        a = k * math.pi / 6
        d.point((88 + 13 * math.cos(a), 48 + 13 * math.sin(a)), fill=B)
    d.line([(88, 48), (88, 37)], fill=B, width=2); d.line([(88, 48), (96, 52)], fill=B)
    d.rectangle([0, 140, W, H], fill=N)
    porte_ogive(d, 76, 104, 24, 36, B, N, ouverte=True)
    halo(d, 88, 140, 30, V, 0.7, 20)
    for k in range(6):                                                                     # l'escalier qui descend
        y = 142 + k * 5
        l = 12 - k
        d.line([(88 - l, y), (88 + l, y)], fill=B)
    return im


def cine_chronique():
    """La Chronique : un grimoire immense, enchaîné à son lutrin par quatre chaînes, ses pages ouvertes."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 80, 80, V, 0.55, 60)
    lutrin(d, 88, 64, 2.4, True, True)
    for (x0, y0) in ((20, 10), (156, 12)):
        for k in range(10):
            cx, cy = x0 + (88 - x0) * k / 14, y0 + 50 * k / 14
            d.ellipse([cx - 3, cy - 2, cx + 3, cy + 2], outline=B)
    return im


def cine_page_reecrite():
    """Une page de la Chronique en gros plan : les lignes du haut sont noires et nettes ; une ligne, au milieu, est en
    train de changer, l'encre verte qui coule et réécrit."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.polygon([(14, 10), (164, 4), (170, 164), (8, 168)], fill=B)
    for k in range(13):
        y = 18 + k * 11
        if k == 6:
            texte_maj(d, 26, y - 3, "LA FLOTTE NOIRE EST", N)
            texte_maj(d, 26, y + 7, "L'ALLIEE DE L'ECOLE", V)
            d.line([(26, y + 4), (140, y + 1)], fill=N)
            for j in range(8):
                d.line([(40 + j * 12, y + 16), (40 + j * 12, y + 22 + (j % 3) * 3)], fill=V)
        elif k in (7, 8):
            continue
        else:
            d.line([(24, y), (148 - (k * 17) % 30, y - 1)], fill=N)
            d.line([(24, y + 3), (120 - (k * 11) % 40, y + 2)], fill=N)
    halo(d, 90, 92, 30, V, 0.3, 14)
    return im


def cine_sablier():
    """Le Grand Sablier, immense, dans la nuit : son sable monte en un filet lumineux et s'accumule en haut."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 84, 84, V, 0.6, 80)
    sablier(d, 88, 12, 146, 66, 0.7, B, montant=True)
    for k in range(30):
        d.point((88 + (k % 3) - 1, 82 - k * 2), fill=B)
    return im


def cine_salles():
    """Quatorze portes taillées dans la pierre, en arc ; chacune une lueur : les salles des maîtres du temps."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    salle_ronde(d, im, 136, 14, lueur=True)
    for k in range(14):
        x = 6 + k * (164 / 13)
        prof = 1 - abs(x - 88) / 88
        h = 22 + (1 - prof) * 10
        y = 136 - h - prof * 10
        lanterne(d, x, y - 14, 0.6, True)
    return im


# ------------------------------------------------------------------
# Les objets
# ------------------------------------------------------------------

def objet_sablier():
    """Le Grand Sablier, comme objet : seul sur son socle, le sable qui monte."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 0, W, 132, 9, 18, V, graine=71)
    ombrer(im, 0, 0, W, 132, V, N, 0.9, 0.5)
    sol_dalles(d, 132)
    halo(d, 88, 76, 60, V, 0.55, 66)
    sablier(d, 88, 14, 116, 52, 0.6, B, montant=True)
    d.rectangle([56, 134, 120, 142], fill=B); d.rectangle([62, 142, 114, 150], fill=V)
    return im


def sceau_chronique(nom="item_sceau_chronique.gif"):
    """La neuvième enveloppe : un pli scellé d'un grand sceau de cire au sablier, un ruban, une page de la Chronique
    qui dépasse, couverte de runes."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.rectangle([34, 1, 54, 14], fill=V)                                                  # la page qui dépasse
    d.rectangle([36, 3, 52, 12], fill=N)
    for k in range(4):
        rune(d, 37 + k * 4, 5, k + 1, V)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    d.line([(2, 33), (57, 33)], fill=V)
    d.ellipse([20, 14, 39, 33], fill=V)                                                   # le sceau au sablier
    d.ellipse([22, 16, 37, 31], outline=N)
    d.polygon([(25, 19), (34, 19), (29, 24)], fill=N)
    d.polygon([(25, 29), (34, 29), (29, 24)], fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_chronotheque.gif": lambda: chronotheque(False), "loc_chronotheque_victoire.gif": lambda: chronotheque(True),
    "loc_chronotheque_dossier.gif": dossier_coffre, "loc_royaume_machine.gif": royaume_machine,
    "loc_bataille_temps.gif": bataille_temps,
    "loc_salle_sceaux.gif": salle_sceaux, "loc_autel_offrandes.gif": autel_offrandes, "loc_crypte_runes.gif": crypte_runes,
    "loc_oracle.gif": oracle, "loc_contresorts.gif": contresorts, "loc_livre_ombres.gif": livre_ombres,
    "loc_lignes_destin.gif": lignes_destin, "loc_paradoxes.gif": paradoxes, "loc_besace_reliques.gif": besace_reliques,
    "loc_atelier_propheties.gif": atelier_propheties, "loc_salle_cartes.gif": salle_cartes,
    "loc_portes_royaumes.gif": portes_royaumes, "loc_runes_garde.gif": runes_garde, "loc_haut_conseil.gif": haut_conseil,
    "scene_chronotheque_nuit1.gif": lambda: nuit(1), "scene_chronotheque_nuit2.gif": lambda: nuit(2),
    "scene_chronotheque_nuit3.gif": lambda: nuit(3),
    "rang_scribe.gif": lambda: rang(1), "rang_archiviste.gif": lambda: rang(2), "rang_chroniqueur.gif": lambda: rang(3),
    "rang_gardien.gif": lambda: rang(4), "rang_chronomancien.gif": lambda: rang(5),
    "cine9_empreinte.gif": cine_empreinte, "cine9_tour_horloge.gif": cine_tour_horloge, "cine9_chronique.gif": cine_chronique,
    "cine9_page_reecrite.gif": cine_page_reecrite, "cine9_sablier.gif": cine_sablier, "cine9_salles.gif": cine_salles,
    "item_sablier.gif": objet_sablier,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + ["item_sceau_chronique.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom == "item_sceau_chronique.gif":
            sceau_chronique(nom); n += 1
    print(n, "dessins")
