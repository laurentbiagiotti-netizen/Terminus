"""Dessine Port-Aube (chapitre 7) : l'Embarcadère du campus, le quai de l'île au petit jour, la cité en fête (la
victoire), les dix maisons, la baie des serveurs et le poste du quai, les dix maîtres bâtisseurs et les six habitants
en pied, le Billet de traversée (la septième enveloppe) et les cinq plans de la cinématique d'ouverture.

Même format et même palette que les chapitres précédents (dessiner_lieux.finir : toile 176 x 170 doublée dans le cadre
d'origine ; trois couleurs : noir, vert, blanc ; personnages de dessiner_panne.perso en grille 88 x 85). Le style est
celui du chapitre 8 (dessiner_port.py), qui se passe dans la même cité : des ciels d'aube en dégradés tramés, la mer
et ses reflets brisés, des contre-jours, des maisons en volume (la façade dans la lumière, le pignon dans l'ombre),
des intérieurs en perspective éclairés par une lampe ou une fenêtre.
Usage : python3 outils/dessiner_ile.py [nom...]
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_academie import texte, robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle, cadenas  # noqa: E402
from dessiner_machines import reverbere, phare, engrenage, caisse, sol, lampe_suspendue, flamme, rayon, for_lignes  # noqa: E402
from dessiner_machines import sprite, trait, sol_traits  # noqa: E402
from dessiner_port import (trame, degrade, halo, ombrer, mer, nuages, eclair, pluie, mouettes, feu_artifice,  # noqa: E402
                           lune_pleine, ciel_nuit, soleil, personnage_ombre, reflet_silhouette, ligne_r, rayures,
                           phare_clair, bitte)


# ------------------------------------------------------------------
# Les briques du décor : le ciel, l'île, les maisons, les navires
# ------------------------------------------------------------------

def ciel_aube(d, horizon=70, fort=0.8, blanc=0.5):
    """L'aube : le noir de la nuit en haut, le vert qui monte de l'horizon, une bande blanche posée dessus."""
    degrade(d, 0, 0, W, horizon, V, 0, fort)
    degrade(d, 0, horizon - 16, W, horizon, B, 0, blanc)


def brume(d, y0, y1, t=0.45):
    """Un banc de brume : une bande blanche tramée, dense au milieu."""
    m = (y0 + y1) / 2
    degrade(d, 0, y0, W, m, B, 0, t)
    degrade(d, 0, m, W, y1, B, t, 0)


def ile(d, x, y, w=60, h=18, avec_phare=True, avec_maisons=True, c=N):
    """L'île au loin, en silhouette sur l'aube : la colline, des toits, le phare au bout ; un liseré clair sur la crête."""
    pts = [(x, y), (x + w * 0.15, y - h * 0.5), (x + w * 0.35, y - h * 0.85), (x + w * 0.5, y - h),
           (x + w * 0.7, y - h * 0.7), (x + w * 0.88, y - h * 0.35), (x + w, y)]
    d.polygon(pts, fill=c)
    d.line(pts[1:-1], fill=B if c == N else N)
    if avec_maisons:
        for k in range(6):
            xx = x + 8 + k * (w - 18) // 6
            hh = 4 + (k % 3)
            d.rectangle([xx, y - hh - 2, xx + 4, y - 1], fill=c)
            d.polygon([(xx - 1, y - hh - 2), (xx + 5, y - hh - 2), (xx + 2, y - hh - 5)], fill=c)
            d.point((xx + 2, y - hh), fill=V if c == N else B)
    if avec_phare:
        d.rectangle([x + w - 3, y - 15, x + w - 1, y], fill=c)
        d.rectangle([x + w - 4, y - 19, x + w, y - 15], fill=c)
        d.point((x + w - 2, y - 17), fill=V)


def maison_ile(d, x, y, w=22, h=26, eclairee=False, enseigne=None, toit=V, p=6, cote=1):
    """Une maison de Port-Aube en volume : la façade blanche, le pignon et le toit en pente, le flanc dans l'ombre
    (côté cote), des fenêtres à croisillon (noires, ou vertes et allumées), une porte, une cheminée."""
    x, y, w, h = int(x), int(y), int(w), int(h)
    hp = w // 2 + 2
    if cote > 0:
        d.polygon([(x + w, y - h), (x + w + p, y - h - p // 2), (x + w + p, y - p // 2), (x + w, y)], fill=V if toit == B else N)
        d.polygon([(x + w // 2, y - h - hp), (x + w // 2 + p, y - h - hp - p // 2), (x + w + p + 1, y - h - p // 2), (x + w + 1, y - h)], fill=toit)
        d.line([(x + w // 2 + p, y - h - hp - p // 2), (x + w + p + 1, y - h - p // 2)], fill=N)
    d.rectangle([x, y - h, x + w, y], fill=B)
    d.polygon([(x - 1, y - h), (x + w + 1, y - h), (x + w // 2, y - h - hp)], fill=B)
    d.line([(x - 1, y - h), (x + w // 2, y - h - hp), (x + w + 1, y - h)], fill=toit if toit != B else V)
    d.rectangle([x + w - 6, y - h - hp + 2, x + w - 3, y - h - hp // 2], fill=N)            # la cheminée
    d.ellipse([x + w // 2 - 2, y - h - hp // 2 - 2, x + w // 2 + 2, y - h - hp // 2 + 2], fill=N)   # l'œil-de-bœuf
    if eclairee:
        d.point((x + w // 2, y - h - hp // 2), fill=V)
    fw = max(4, w // 4)
    for fx in (x + 3, x + w - 3 - fw):
        fy = y - h + 4
        d.rectangle([fx, fy, fx + fw, fy + fw + 2], fill=V if eclairee else N)
        d.line([(fx + fw // 2, fy), (fx + fw // 2, fy + fw + 2)], fill=B if eclairee else B)
        d.line([(fx, fy + (fw + 2) // 2), (fx + fw, fy + (fw + 2) // 2)], fill=B if eclairee else B)
        d.line([(fx - 1, fy + fw + 3), (fx + fw + 1, fy + fw + 3)], fill=N)
    d.rectangle([x + w // 2 - 3, y - 10, x + w // 2 + 3, y], fill=N)
    if eclairee:
        d.rectangle([x + w // 2 - 2, y - 9, x + w // 2 + 2, y], fill=V)
    d.point((x + w // 2 + 1, y - 5), fill=B)
    if enseigne:
        d.rectangle([x + 2, y - 15, x + w - 2, y - 12], fill=V)


def navire(d, x, y, l=70, voiles=True, eclaire=False):
    """Le navire de l'école, de profil : une coque blanche à bande noire et flottaison verte, deux mâts gréés,
    des voiles carrées gonflées (vertes et blanches), un pavillon ; éclairé, ses hublots et son fanal brillent."""
    pts = [(x, y), (x + l, y), (x + l + 8, y - 4), (x + l - 6, y + 12), (x + 8, y + 12), (x - 2, y + 4)]
    d.polygon(pts, fill=B)
    d.polygon([(x - 1, y + 5), (x + l + 3, y + 5), (x + l - 6, y + 12), (x + 8, y + 12)], fill=N)
    d.line([(x + 7, y + 11), (x + l - 5, y + 11)], fill=V)
    d.line([(x, y + 1), (x + l, y + 1)], fill=N)
    for k in range(7):
        hx = x + 8 + k * (l - 16) // 6
        d.rectangle([hx, y + 7, hx + 1, y + 8], fill=V if eclaire else B)
    d.line([(x + l + 8, y - 4), (x + l + 22, y - 10)], fill=B)                              # le beaupré
    mats = (x + l // 3, x + 2 * l // 3 + 2)
    for k, mx in enumerate(mats):
        hm = int(l * 0.62) + (6 if k == 1 else 0)
        d.line([(mx, y), (mx, y - hm)], fill=B, width=2)
        if voiles:
            yv = y - hm + 6
            for j, lv in enumerate((l // 9, l // 8 + 1, l // 7 + 2)):
                hv = hm // 5 + j
                d.line([(mx - lv - 1, yv), (mx + lv + 1, yv)], fill=B)
                d.polygon([(mx - lv, yv + 1), (mx + lv, yv + 1), (mx + lv + 2, yv + hv - 1), (mx, yv + hv + 1), (mx - lv - 2, yv + hv - 1)],
                          fill=B if (j + k) % 2 else V)
                d.line([(mx + lv * 0.4, yv + 2), (mx + lv * 0.5, yv + hv - 1)], fill=N if (j + k) % 2 else B)
                yv += hv + 3
        d.polygon([(mx, y - hm - 7), (mx + 9, y - hm - 4), (mx, y - hm - 1)], fill=V)
        if eclaire:
            d.point((mx, y - hm - 9), fill=B)
    d.line([(x + l + 22, y - 10), (mats[1], y - int(l * 0.62) - 6)], fill=B)
    d.line([(x - 2, y + 2), (mats[0], y - int(l * 0.62))], fill=B)
    if eclaire:
        halo(d, x + l + 2, y - 8, 10, V, 0.6)
        d.rectangle([x + l, y - 10, x + l + 3, y - 7], fill=V)


def traversier(d, x, y, l=80, fanal=True):
    """Le traversier de l'école : une coque basse, une cabine vitrée, un mât court et son fanal."""
    if fanal:
        halo(d, x + l - 18, y - 34, 20, V, 0.75)
    pts = [(x, y - 10), (x + l - 6, y - 10), (x + l + 6, y - 14), (x + l - 2, y), (x + 6, y), (x, y - 4)]
    d.polygon(pts, fill=B)
    d.polygon([(x, y - 5), (x + l + 1, y - 5), (x + l - 2, y), (x + 6, y)], fill=N)
    d.line([(x + 6, y - 1), (x + l - 2, y - 1)], fill=V)
    for k in range(6):
        d.rectangle([x + 8 + k * 6, y - 9, x + 10 + k * 6, y - 7], fill=N)
    d.rectangle([x + 34, y - 24, x + 62, y - 10], fill=B)                                    # la cabine
    d.rectangle([x + 36, y - 22, x + 60, y - 16], fill=N)
    for xx in range(x + 37, x + 60, 6):
        d.rectangle([xx, y - 21, xx + 3, y - 17], fill=V if fanal else N)
    d.rectangle([x + 32, y - 26, x + 64, y - 24], fill=V)
    d.line([(x + l - 18, y - 26), (x + l - 18, y - 32)], fill=B)                             # le mât et son fanal
    d.rectangle([x + l - 20, y - 37, x + l - 16, y - 32], fill=V if fanal else N)
    d.point((x + l - 18, y - 35), fill=B)
    d.rectangle([x + 12, y - 16, x + 16, y - 10], fill=B)                                    # la bouée
    d.rectangle([x + 13, y - 15, x + 15, y - 11], fill=V)


def guirlande(d, x0, y0, x1, y1, creux=8, n=10):
    """Une guirlande de lampions entre deux points, chacun avec sa petite lueur."""
    for k in range(n + 1):
        t = k / n
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + creux * math.sin(math.pi * t)
        if k:
            d.line([(px, py), (x, y)], fill=B)
        px, py = x, y
    for k in range(n + 1):
        t = k / n
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + creux * math.sin(math.pi * t)
        d.rectangle([x - 1, y + 1, x + 1, y + 4], fill=V if k % 2 else B)


def quai_paves(d, y, x0=0, x1=W, fx=88, bord=True):
    """Le quai pavé neuf, en perspective : des joints qui fuient vers le large, des rangs qui s'espacent ;
    le liseré de pierre blanche au bord de l'eau, les bittes d'amarrage."""
    d.rectangle([x0, y, x1, H], fill=N)
    for k in range(-14, 15):
        d.line([(fx + k * 8, y + 3), (fx + k * 30, H)], fill=V)
    yy, pas = y + 6, 3
    while yy < H:
        d.line([(x0, yy), (x1, yy)], fill=V)
        yy += pas
        pas += 2
    if bord:
        d.rectangle([x0, y, x1, y + 3], fill=B)
        for x in range(x0, x1, 10):
            d.line([(x, y), (x, y + 3)], fill=N)
        for x in range(x0 + 16, x1, 50):
            bitte(d, x, y)


def armoire(d, x, y, w=26, h=56, leds=True, p=8):
    """Une baie de serveurs en volume : la façade à tiroirs et voyants, le flanc vert, le dessus blanc."""
    d.polygon([(x + w, y), (x + w + p, y - p // 2), (x + w + p, y + h - p // 2), (x + w, y + h)], fill=V)
    for yy in range(y + 4, y + h - 2, 6):
        d.line([(x + w + 1, yy - 1), (x + w + p - 1, yy - p // 2)], fill=N)
    d.polygon([(x, y), (x + p, y - p // 2), (x + w + p, y - p // 2), (x + w, y)], fill=B)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], fill=N)
    for k in range(y + 5, y + h - 5, 7):
        d.rectangle([x + 4, k, x + w - 4, k + 4], fill=B)
        d.rectangle([x + 5, k + 1, x + w - 10, k + 3], fill=N)
        if leds:
            d.point((x + w - 7, k + 2), fill=V)
            d.point((x + w - 5, k + 2), fill=V if (k // 7) % 2 else B)


def hublot_mer(d, x, y, w=40, h=30, soleil_=True):
    """Une fenêtre ronde sur la mer à l'aube : le ciel tramé, l'horizon, le soleil, les vagues ; un cadre à rivets."""
    vue = Image.new('P', (W, H), N); vue.putpalette(PAL); dv = ImageDraw.Draw(vue)
    hz = y + h * 0.55
    degrade(dv, x, y, x + w, hz, V, 0.1, 0.9)
    degrade(dv, x, hz - 6, x + w, hz, B, 0, 0.6)
    if soleil_:
        dv.pieslice([x + w * 0.55, hz - 7, x + w * 0.55 + 14, hz + 7], 180, 360, fill=B)
    dv.rectangle([x, hz, x + w, y + h], fill=N)
    for k in range(4):
        yy = hz + 2 + k * 3
        dv.line([(x + 4 + k, yy), (x + w - 4 - k, yy)], fill=V if k % 2 else B)
    msk = Image.new('L', (W, H), 0)
    ImageDraw.Draw(msk).ellipse([x, y, x + w, y + h], fill=255)
    d._image.paste(vue, (0, 0), msk)
    d.ellipse([x, y, x + w, y + h], outline=B, width=3)
    for k in range(8):
        a = k * math.pi / 4
        d.point((x + w / 2 + (w / 2 - 1) * math.cos(a), y + h / 2 + (h / 2 - 1) * math.sin(a)), fill=N)


def silhouette_dos(d, x, y, h=30, c=B, chapeau=False):
    """Un personnage vu de dos, au loin."""
    d.rectangle([x - 3, y - h, x + 3, y - h + 6], fill=c)
    if chapeau:
        d.rectangle([x - 5, y - h - 1, x + 5, y - h], fill=c)
        d.rectangle([x - 3, y - h - 4, x + 3, y - h - 1], fill=c)
    d.polygon([(x - 6, y - h + 7), (x + 6, y - h + 7), (x + 8, y - 8), (x - 8, y - 8)], fill=c)
    d.rectangle([x - 4, y - 8, x - 2, y], fill=c)
    d.rectangle([x + 2, y - 8, x + 4, y], fill=c)


def interieur_bois(d, fond, fx=None, lampe=None):
    """Une pièce en bois de l'île, en perspective : le mur du fond en planches, les poutres qui viennent vers nous,
    le plancher qui fuit vers le fond ; une lampe pendue (lampe = x)."""
    x0, y0, x1, y1 = fond
    fx = fx if fx is not None else (x0 + x1) // 2
    d.rectangle([0, 0, W, H], fill=N)
    for xx in range(x0, x1, 6):
        d.line([(xx, y0), (xx, y1)], fill=V)
    sol(d, y1, fx, V, pas0=3, n=8, ecart=24)
    for (a, b) in (((x0, y0), (0, 0)), ((x1, y0), (W, 0)), ((x0, y1), (0, H)), ((x1, y1), (W, H))):
        d.line([a, b], fill=B)
    d.rectangle([x0, y0, x1, y1], outline=B)
    for k in range(1, 4):                                                                    # les poutres du plafond
        t = k / 4
        ya = y0 * (1 - t)
        d.line([(x0 * (1 - t), ya), (x1 + (W - x1) * t, ya)], fill=B, width=2 if k > 1 else 1)
    if lampe is not None:
        lampe_suspendue(d, lampe, 0, y0 + 2, 0.5, 40)


# ------------------------------------------------------------------
# Les lieux
# ------------------------------------------------------------------

def embarcadere():
    """L'Embarcadère du campus, à l'aube : le ciel pâlit à peine ; au large, l'île sort de la brume ; le
    traversier attend le long de la jetée, son fanal encore allumé ; la passerelle et sa pancarte PORT-AUBE."""
    im, d = toile()
    degrade(d, 0, 0, W, 76, V, 0.0, 0.55)                                                    # le ciel qui pâlit à peine
    degrade(d, 0, 58, W, 76, B, 0.0, 0.7)
    for (x, y) in ((20, 10), (52, 18), (140, 8), (160, 26), (96, 6), (118, 14)):
        d.point((x, y), fill=B)
    ile(d, 96, 76, 70, 18)
    brume(d, 70, 82, 0.55)
    mer(d, 78, 128, 2, V)
    traversier(d, 30, 116, 110, True)
    reflet_silhouette(d, 40, 140, 116, 3, V)
    d.rectangle([0, 128, W, H], fill=N)                                                      # le ponton, en planches
    for x in range(-80, W + 80, 12):
        d.line([(88 + (x - 88) * 0.3, 128), (x, H)], fill=V)
    yy, pas = 132, 4
    while yy < H:
        d.line([(0, yy), (W, yy)], fill=V)
        yy += pas
        pas += 3
    d.rectangle([0, 126, W, 129], fill=B)
    for x in range(6, W, 30):
        d.rectangle([x, 129, x + 3, 134], fill=B)
    d.polygon([(54, 127), (66, 112), (90, 112), (84, 127)], fill=B)                          # la passerelle
    d.polygon([(84, 127), (90, 112), (92, 112), (87, 127)], fill=V)
    for k in range(5):
        d.line([(57 + k * 6, 126), (68 + k * 5, 113)], fill=N)
    reverbere(d, 14, 82, True)
    d.rectangle([102, 138, 170, 152], fill=B)                                                # la pancarte
    d.rectangle([104, 140, 168, 150], fill=N)
    texte(d, 109, 140, "PORT-AUBE", V)
    d.rectangle([110, 152, 113, 168], fill=B); d.rectangle([158, 152, 161, 168], fill=B)
    mouettes(d, [(60, 34, 3), (72, 42, 2), (40, 26, 2)], N)
    return im


def port_aube(fete=False):
    """Le quai de Port-Aube : au petit jour, le soleil sort de la mer derrière la jetée ; dix maisons neuves
    autour du port, toutes fenêtres noires ; le phare au bout de la jetée ; les pavés neufs, les lanternes
    éteintes, Laurent au bout du quai. La nuit de la fête : les fenêtres et les lanternes allumées, les
    guirlandes, le navire pavoisé à quai, les feux d'artifice, la foule."""
    im, d = toile()
    horizon = 70
    if fete:
        ciel_nuit(d, horizon, 5, 34)
        degrade(d, 0, horizon - 20, W, horizon, V, 0, 0.6)
        lune_pleine(d, 30, 20, 7)
        feu_artifice(d, 70, 22, 13); feu_artifice(d, 104, 12, 9, V, B); feu_artifice(d, 126, 32, 11, B, V, 14)
    else:
        ciel_aube(d, horizon, 0.85, 0.5)
        soleil(d, 40, horizon, 10, horizon=horizon)
        mouettes(d, [(70, 26, 3), (84, 34, 2), (96, 22, 2)], N)
    mer(d, horizon + 2, 106, 2, V if not fete else V, reflet=40 if not fete else 30, larg=8, c_reflet=B)
    if fete:
        for x in range(10, 120, 14):
            for k in range(4):
                d.line([(x + (k % 2) * 2, 92 + k * 3), (x + 3 + (k % 2) * 2, 92 + k * 3)], fill=B if k % 2 else V)
    d.polygon([(118, 104), (176, 98), (176, 108), (118, 110)], fill=B)                      # la jetée du phare
    d.polygon([(118, 110), (176, 108), (176, 112), (118, 112)], fill=V)
    if fete:
        halo(d, 156, 52, 22, V, 0.8)
        rayon(d, 152, 52, 100, 36, 64, 0.6, 0.1)
    phare_clair(d, 156, 100, 44, allume=fete, rayon=0)
    d.polygon([(142, 100), (170, 100), (174, 104), (138, 104)], fill=B)
    xs = [(2, 15, 24), (19, 15, 30), (36, 14, 26), (52, 15, 32), (69, 14, 26)]
    for k, (x, w, h) in enumerate(xs):                                                      # la rangée du fond, sur la colline
        maison_ile(d, x, 100, w, h, eclairee=fete, toit=V if k % 2 else B, p=4)
    if fete:
        navire(d, 18, 112, 82, voiles=False, eclaire=True)
        guirlande(d, 0, 64, 112, 70, 12, 14)
        for k in range(21):
            t = k / 20
            d.point((22 + 80 * t, 92 + 14 * (2 * t - 1) ** 2), fill=V if k % 2 else B)
    for k, x in enumerate((86, 108)):                                                       # deux maisons au bord du quai
        maison_ile(d, x, 120, 18, 30, eclairee=fete, toit=B if k else V, p=5)
    quai_paves(d, 120)
    for x in (10, 60, 128):
        reverbere(d, x, 96 + 36 - 16, fete)
    if fete:
        halo(d, 88, 160, 70, V, 0.35, 16)
        for (x, y) in ((30, 166), (44, 164), (78, 168), (96, 165), (146, 167), (160, 164)):
            personnage_ombre(d, x, y, 24, c=B)
    else:
        personnage_ombre(d, 102, 150, 28, manteau=True, c=B)                                 # Laurent, au bout du quai
        personnage_ombre(d, 103, 151, 28, manteau=True, c=N)
        d.rectangle([140, 132, 144, 160], fill=B)                                            # l'horloge de la capitainerie
        d.ellipse([134, 120, 150, 136], fill=B); d.ellipse([136, 122, 148, 134], fill=N)
        d.line([(142, 128), (142, 123)], fill=V); d.line([(142, 128), (146, 128)], fill=V)
    return im


def baie_ile():
    """La baie d'une maison de l'île : sous les poutres neuves, deux armoires de serveurs en volume, voyants
    verts ; entre elles, une fenêtre ronde sur la mer au petit jour ; des câbles neufs en boucles au sol."""
    im, d = toile()
    interieur_bois(d, (40, 20, 136, 116), 88)
    halo(d, 88, 46, 34, V, 0.5, 28)
    hublot_mer(d, 66, 26, 44, 36)
    armoire(d, 6, 46, 32, 100, p=10)
    armoire(d, 128, 46, 32, 100, p=-10 if False else 10)
    for k in range(5):                                                                       # les câbles neufs
        d.arc([38, 112 + k * 5, 136, 150 + k * 5], 0, 180, fill=B if k % 2 else V, width=2 if k % 2 == 0 else 1)
    d.rectangle([76, 76, 100, 92], fill=B); d.rectangle([78, 78, 98, 90], fill=N)           # l'étiquette de la machine
    d.line([(80, 82), (92, 82)], fill=V); d.line([(80, 86), (88, 86)], fill=V)
    return im


def poste_quai():
    """Le poste du quai : sous un auvent rayé, une borne neuve, son clavier, son écran éteint où clignote
    l'invite ; derrière, la mer au petit jour ; le quai pavé."""
    im, d = toile()
    ciel_aube(d, 74, 0.8, 0.45)
    soleil(d, 132, 74, 9, horizon=74)
    mer(d, 76, 124, 3, V, reflet=132, larg=7, c_reflet=B)
    d.polygon([(4, 22), (172, 22), (176, 40), (0, 40)], fill=B)                              # l'auvent rayé
    for x in range(4, 172, 14):
        d.polygon([(x, 23), (x + 7, 23), (x + 7.5, 39), (x + 0.5, 39)], fill=V)
    for x in range(0, W, 14):
        d.arc([x, 36, x + 14, 46], 0, 180, fill=B if (x // 14) % 2 else V, width=2)
    d.rectangle([10, 44, 13, 124], fill=B); d.rectangle([163, 44, 166, 124], fill=B)
    d.rectangle([14, 44, 16, 124], fill=V); d.rectangle([167, 44, 169, 124], fill=V)
    halo(d, 88, 84, 34, V, 0.35, 26)
    d.polygon([(116, 62), (124, 58), (124, 102), (116, 106)], fill=V)                        # l'écran, en volume
    d.rectangle([56, 62, 116, 106], fill=B)
    d.rectangle([60, 66, 112, 100], fill=N)
    d.line([(64, 92), (68, 96)], fill=V); d.line([(68, 96), (64, 100)], fill=V)
    d.rectangle([71, 98, 75, 99], fill=B)
    d.line([(62, 68), (70, 68)], fill=V)
    d.rectangle([80, 106, 92, 116], fill=B)
    d.polygon([(44, 124), (128, 124), (120, 114), (52, 114)], fill=B)                       # le clavier
    for r_ in range(3):
        y = 116 + r_ * 3
        for x in range(56 + r_ * 2, 118 - r_ * 2, 4):
            d.rectangle([x, y, x + 2, y + 1], fill=N)
    d.rectangle([48, 124, 124, 128], fill=V)
    d.rectangle([60, 128, 112, 150], fill=B); d.rectangle([62, 128, 110, 148], fill=N)      # le pied de la borne
    for x in range(66, 108, 6):
        d.line([(x, 132), (x, 144)], fill=V)
    quai_paves(d, 150, bord=False)
    return im


# --- Les dix maisons, de l'intérieur ---

def etageres(d, x0, y0, x1, y1, n=5, etiquettes=True, graine=1, plein=0.8):
    """Un rayonnage : des planches, des dossiers et des livres de hauteurs variées, des étiquettes."""
    rnd = random.Random(graine)
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    pas = (y1 - y0) // n
    for k in range(n):
        yb = y0 + (k + 1) * pas
        d.rectangle([x0, yb - 1, x1, yb + 1], fill=B)
        x = x0 + 3
        while x < x1 - 5:
            ww = rnd.randint(2, 4)
            hh = rnd.randint(int(pas * 0.45), pas - 4)
            if rnd.random() < plein:
                d.rectangle([x, yb - 1 - hh, x + ww, yb - 2], fill=V if rnd.random() < 0.35 else B)
            x += ww + 1
        if etiquettes:
            xm = (x0 + x1) // 2
            d.rectangle([xm - 7, yb + 2, xm + 7, yb + 5], fill=B)
            d.rectangle([xm - 6, yb + 3, xm + 6, yb + 4], fill=N)


def m_noms():
    """La Maison des Noms : une haute bibliothèque en perspective, chaque rayon porte une étiquette vide ;
    une lampe ; une échelle appuyée contre les rayons."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 70, 60, V, 0.5, 50)
    etageres(d, 48, 8, 128, 120, 6, True, 3)
    for cote in (-1, 1):                                                                     # les rayonnages latéraux
        xa, xb = (0, 46) if cote < 0 else (130, W)
        for k in range(7):
            ya, yb = 8 + k * 18.6, 8 + (k + 1) * 18.6
            d.polygon([(xa if cote < 0 else xb, ya - 14 + k * 2), (xb if cote < 0 else xa, ya)
                       , (xb if cote < 0 else xa, ya + 2), (xa if cote < 0 else xb, ya - 12 + k * 2)], fill=B)
            for j in range(9):
                f = j / 9
                xx = (xa + (xb - xa) * f) if cote < 0 else (xb - (xb - xa) * f)
                yy = (ya - 14 + k * 2) + 14 * f - k * 2 * f
                hh = 13 * (1 - f * 0.4)
                d.rectangle([xx, yy - hh, xx + 3 - f, yy - 1], fill=V if (j + k) % 3 == 0 else B)
        d.line([(xb if cote < 0 else xa, 8), (xb if cote < 0 else xa, 120)], fill=B, width=2)
    sol(d, 120, 88, V, pas0=3, n=8, ecart=24)
    d.line([(118, 166), (140, 12)], fill=V, width=3)                                         # l'échelle
    d.line([(132, 166), (152, 14)], fill=V, width=3)
    for k in range(10):
        y = 156 - k * 15
        d.line([(119 + k * 2.2, y), (133 + k * 2.0, y)], fill=B, width=2)
    lampe_suspendue(d, 88, 0, 4, 0.0, 10)
    return im


def m_phare():
    """Le Phare-Relais : la chambre de la lanterne, la grande lentille à anneaux de prismes au centre, sa lueur ;
    les vitres et leurs montants, la mer et l'aube derrière ; la rambarde de la galerie."""
    im, d = toile()
    ciel_aube(d, 96, 0.9, 0.5)
    mer(d, 98, 136, 4, V, reflet=88, larg=14, c_reflet=B)
    for x in range(0, W + 1, 30):                                                            # les montants des vitres
        d.rectangle([x - 2, 0, x + 1, 136], fill=N)
        d.line([(x + 1, 0), (x + 1, 136)], fill=B)
    d.rectangle([0, 0, W, 6], fill=N); d.line([(0, 6), (W, 6)], fill=B)
    halo(d, 88, 62, 56, B, 0.5)
    cx, cy = 88, 62
    d.ellipse([cx - 38, cy - 40, cx + 38, cy + 40], fill=B)                                  # la lentille de Fresnel
    d.ellipse([cx - 35, cy - 37, cx + 35, cy + 37], fill=N)
    for k, r in enumerate(range(33, 4, -5)):
        d.ellipse([cx - r, cy - r * 1.05, cx + r, cy + r * 1.05], fill=V if k % 2 else N, outline=B)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=B)
    for yy in range(cy - 36, cy + 38, 9):                                                    # les cerclages
        e = math.sqrt(max(0, 35 ** 2 - (yy - cy) ** 2))
        d.line([(cx - e, yy), (cx + e, yy)], fill=N)
    d.rectangle([cx - 6, cy + 40, cx + 6, 136], fill=B)
    d.rectangle([cx + 2, cy + 40, cx + 6, 136], fill=V)
    d.rectangle([0, 136, W, H], fill=N)                                                      # la galerie et sa rambarde
    for x in range(0, W, 8):
        d.line([(x, 136), (x - 16, H)], fill=V)
    d.rectangle([0, 128, W, 130], fill=B)
    for x in range(4, W, 10):
        d.line([(x, 130), (x, 136)], fill=B)
    d.rectangle([60, 136, 116, 142], fill=B)
    return im


def m_poste():
    """La Poste : le mur des casiers de tri, le guichet et son enseigne POSTE ; contre lui, des sacs de lettres
    tamponnés « en attente » ; une lampe, le plancher."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 34, 70, V, 0.4, 36)
    for y in range(8, 62, 9):                                                                # les casiers de tri
        for x in range(10, 166, 11):
            d.rectangle([x, y, x + 9, y + 7], outline=B)
            if (x * 7 + y * 3) % 5 < 2:
                d.polygon([(x + 2, y + 6), (x + 8, y + 3), (x + 8, y + 6)], fill=V if (x + y) % 3 else B)
    d.rectangle([0, 66, W, 70], fill=B)                                                      # le guichet
    d.rectangle([0, 70, W, 104], fill=N)
    for x in range(10, W, 40):
        d.rectangle([x, 70, x + 26, 92], outline=B)
        for yy in range(72, 92, 4):
            d.line([(x + 1, yy), (x + 25, yy)], fill=V)
    d.rectangle([60, 72, 116, 84], fill=B); d.rectangle([62, 74, 114, 82], fill=N)
    texte(d, 74, 73, "POSTE", V)
    d.rectangle([0, 104, W, 108], fill=B)
    sol(d, 108, 88, V, pas0=3, n=8, ecart=24)
    for k, (x, y, s) in enumerate(((6, 160, 1.0), (34, 166, 1.15), (118, 164, 1.1), (146, 158, 0.95), (78, 136, 0.7))):   # les sacs
        w, h = 26 * s, 34 * s
        d.polygon([(x, y), (x + w, y), (x + w - 4 * s, y - h), (x + 4 * s, y - h)], fill=B)
        d.polygon([(x + w * 0.62, y), (x + w, y), (x + w - 4 * s, y - h), (x + w * 0.6, y - h)], fill=V)
        d.polygon([(x + 4 * s, y - h), (x + w - 4 * s, y - h), (x + w / 2 + 3, y - h - 5 * s), (x + w / 2 - 3, y - h - 5 * s)], fill=B)
        d.rectangle([x + w / 2 - 4, y - h - 2, x + w / 2 + 4, y - h], fill=N)
        d.ellipse([x + 4 * s, y - h * 0.6, x + 4 * s + 13 * s, y - h * 0.6 + 9 * s], fill=N)  # le tampon « en attente »
        d.ellipse([x + 5 * s, y - h * 0.6 + 1, x + 3 * s + 13 * s, y - h * 0.6 + 9 * s - 1], outline=V)
        for j in range(3):
            d.point((x + 7 * s + j * 3 * s, y - h * 0.6 + 4.5 * s), fill=V)
    return im


def m_lettres():
    """Le Bureau des Lettres : un mur de casiers à perte de vue, un par habitant, quelques lettres déjà
    rangées ; le pupitre ; trois sceaux de cire marqués S, D et M ; la lampe de travail."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for y in range(6, 98, 9):                                                                # les casiers
        for x in range(4, 172, 10):
            d.rectangle([x, y, x + 8, y + 7], fill=B)
            d.rectangle([x + 1, y + 1, x + 7, y + 6], fill=N)
            if (x * 3 + y) % 7 == 0:
                d.rectangle([x + 2, y + 3, x + 6, y + 6], fill=B)
                d.point((x + 4, y + 4), fill=V)
            d.point((x + 4, y + 7), fill=V)
    halo(d, 128, 112, 50, V, 0.6, 30)
    d.polygon([(6, 112), (170, 112), (176, 126), (0, 126)], fill=B)                          # le pupitre
    d.rectangle([0, 126, W, H], fill=N)
    for yy in range(130, H, 6):
        d.line([(0, yy), (W, yy)], fill=V)
    d.rectangle([4, 126, 8, H], fill=B); d.rectangle([168, 126, 172, H], fill=B)
    d.line([(146, 112), (152, 90)], fill=B, width=2); d.line([(152, 90), (138, 84)], fill=B, width=2)   # la lampe
    d.polygon([(130, 86), (144, 80), (148, 88), (136, 94)], fill=V)
    d.polygon([(18, 108), (44, 104), (48, 114), (22, 118)], fill=B)                          # une lettre, cachetée
    d.line([(18, 108), (34, 112), (44, 104)], fill=N)
    for k, x in enumerate((56, 88, 120)):                                                    # les trois sceaux
        d.ellipse([x - 13, 132, x + 13, 158], fill=V)
        for j in range(8):
            a = j * math.pi / 4
            d.ellipse([x + 12 * math.cos(a) - 2, 145 + 12 * math.sin(a) - 2, x + 12 * math.cos(a) + 2, 145 + 12 * math.sin(a) + 2], fill=V)
        d.ellipse([x - 8, 137, x + 8, 153], fill=N)
        d.arc([x - 12, 133, x + 12, 157], 200, 300, fill=B)
        texte(d, x - 3, 139, ["S", "D", "M"][k], V)
    return im


def m_greniers():
    """Les Greniers : sous une grande charpente en perspective, des étagères chargées de dossiers, un rang par
    habitant ; au fond, la porte close et son cadenas ; une lucarne laisse passer le jour."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 84
    for k in range(7, -1, -1):                                                               # les fermes de la charpente
        s = 1 / (1 + k * 0.4)
        hw, ht = 96 * s, 84 * s
        c = B if k < 4 else V
        ep = 2 if k < 2 else 1
        d.line([(fx - hw, fy + 6 * s), (fx, fy - ht), (fx + hw, fy + 6 * s)], fill=c, width=ep)
        d.line([(fx - hw * 0.55, fy - ht * 0.42), (fx + hw * 0.55, fy - ht * 0.42)], fill=c, width=ep)
        d.line([(fx, fy - ht), (fx, fy - ht * 0.42)], fill=c)
    for a in (0.35, 0.7):                                                                    # les pannes, qui fuient
        d.line([(fx - 96 * a, fy - 84 * (1 - a) + 6 * a), (fx - 96 * a * 0.26, fy - 84 * 0.26 * (1 - a) + 6 * a * 0.26)], fill=V)
        d.line([(fx + 96 * a, fy - 84 * (1 - a) + 6 * a), (fx + 96 * a * 0.26, fy - 84 * 0.26 * (1 - a) + 6 * a * 0.26)], fill=V)
    d.polygon([(118, 20), (140, 30), (140, 46), (118, 36)], fill=V)                          # la lucarne
    for y in range(40, 116):                                                                 # le rai de jour
        f = (y - 40) / 76
        trame(d, 124 - 14 * f, y, 140 - 4 * f, y, B, 0.3 * (1 - f))
    sol(d, 116, fx, V, pas0=3, n=8, ecart=26)
    for cote in (-1, 1):                                                                     # les étagères
        for k in range(4, -1, -1):
            s = 1 / (1 + k * 0.5)
            x = fx + cote * (20 + 72 * s)
            w = 26 * s
            xa, xb = (x - w, x) if cote < 0 else (x, x + w)
            yb = 116 + 46 * s
            for j in range(4):
                yy = yb - j * 22 * s
                d.rectangle([xa, yy - 1, xb, yy + 1], fill=B)
                xx = xa + 1
                q = 0
                while xx < xb - 2:
                    hh = (12 + (q * 5 + k + j) % 6) * s
                    d.rectangle([xx, yy - 1 - hh, xx + max(1, 3 * s), yy - 2], fill=V if (q + j + k) % 3 else B)
                    xx += max(2, 4 * s)
                    q += 1
            d.line([(xa, yb + 1), (xa, yb - 86 * s)], fill=B); d.line([(xb, yb + 1), (xb, yb - 86 * s)], fill=B)
            d.rectangle([xa, yb - 88 * s, xb, yb - 86 * s], fill=B)
    d.rectangle([72, 84, 104, 118], fill=B)                                                  # la porte close
    d.rectangle([74, 86, 102, 118], fill=N)
    for xx in range(78, 100, 5):
        d.line([(xx, 86), (xx, 118)], fill=V)
    d.line([(74, 98), (102, 98)], fill=B, width=2)
    cadenas(d, 88, 104)
    return im


def m_halle():
    """La Halle d'échange : une nef de bois et de verre en perspective, ses arcs et ses vitrages, le jour qui
    tombe des verrières ; les étals vides, alignés de part et d'autre de l'allée."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    fx, fy = 88, 92
    degrade(d, 0, 0, W, 90, V, 0.35, 0.05)
    for k in range(8, -1, -1):                                                               # les arcs de la nef
        s = 1 / (1 + k * 0.42)
        hw, ht = 100 * s, 120 * s
        c = B if k < 5 else V
        d.arc([fx - hw, fy - ht, fx + hw, fy + ht * 0.4], 180, 360, fill=c, width=3 if k < 2 else 1)
        if k < 8:
            s2 = 1 / (1 + (k + 1) * 0.42)
            for j in range(1, 6):                                                            # les vitrages entre deux arcs
                a = math.pi + j * math.pi / 6
                xa, ya = fx + hw * math.cos(a), fy + ht * 0.7 * math.sin(a) - ht * 0.3
                xb, yb = fx + 100 * s2 * math.cos(a), fy + 120 * s2 * 0.7 * math.sin(a) - 120 * s2 * 0.3
                d.line([(xa, ya), (xb, yb)], fill=V)
        d.line([(fx - hw, fy - ht * 0.3), (fx - hw, fy + 70 * s)], fill=c, width=2 if k < 3 else 1)
        d.line([(fx + hw, fy - ht * 0.3), (fx + hw, fy + 70 * s)], fill=c, width=2 if k < 3 else 1)
    sol(d, fy + 4, fx, V, pas0=3, n=8, ecart=26)
    for cote in (-1, 1):                                                                     # les étals vides
        for k in range(3, -1, -1):
            s = 1 / (1 + k * 0.55)
            x = fx + cote * (16 + 50 * s)
            w = 30 * s
            xa, xb = (x - w, x) if cote < 0 else (x, x + w)
            yb = fy + 4 + 64 * s
            d.polygon([(xa - 2 * s, yb - 30 * s), (xb + 2 * s, yb - 30 * s), (xb + 4 * s, yb - 22 * s), (xa - 4 * s, yb - 22 * s)],
                      fill=V if (k + (cote > 0)) % 2 else B)
            d.line([(xa, yb - 22 * s), (xa, yb)], fill=B, width=max(1, int(2 * s)))
            d.line([(xb, yb - 22 * s), (xb, yb)], fill=B, width=max(1, int(2 * s)))
            d.rectangle([xa, yb - 12 * s, xb, yb - 9 * s], fill=B)
    return im


def m_registre():
    """Le Grand Registre : entre deux rayonnages, un livre immense ouvert sur un lutrin, une seule ligne
    écrite ; la place vide de son sceau perdu ; la lumière d'un vitrail."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.pieslice([60, 6, 116, 62], 180, 360, fill=B); d.rectangle([60, 34, 116, 60], fill=B)   # le vitrail
    d.pieslice([63, 9, 113, 59], 180, 360, fill=V); d.rectangle([63, 34, 113, 58], fill=V)
    for x in range(72, 112, 10):
        d.line([(x, 12), (x, 58)], fill=N)
    d.line([(63, 34), (113, 34)], fill=N); d.line([(63, 46), (113, 46)], fill=N)
    for y in range(60, 140):                                                                 # le rai de lumière
        e = 26 + (y - 60) * 0.5
        trame(d, 88 - e, y, 88 + e, y, B, 0.22 * (1 - (y - 60) / 100))
    etageres(d, 0, 10, 46, 128, 6, False, 7)
    etageres(d, 130, 10, W, 128, 6, False, 9)
    sol(d, 128, 88, V, pas0=3, n=8, ecart=24)
    d.polygon([(30, 70), (88, 82), (146, 70), (146, 112), (88, 124), (30, 112)], fill=B)     # le livre ouvert
    d.polygon([(34, 74), (86, 85), (86, 120), (34, 108)], fill=B)
    d.polygon([(90, 85), (142, 74), (142, 108), (90, 120)], fill=B)
    d.polygon([(30, 112), (88, 124), (146, 112), (146, 116), (88, 128), (30, 116)], fill=V)
    d.line([(88, 82), (88, 124)], fill=N)
    d.line([(40, 82), (78, 90)], fill=N, width=2)                                            # la seule ligne écrite
    for k in range(6):
        d.line([(40, 90 + k * 4), (80, 98 + k * 4)], fill=V)
        d.line([(96, 92 + k * 4), (136, 84 + k * 4)], fill=V)
    d.ellipse([110, 96, 126, 112], outline=N, width=1)                                       # la place du sceau perdu
    for j in range(8):
        a = j * math.pi / 4
        d.point((118 + 9 * math.cos(a), 104 + 9 * math.sin(a)), fill=N)
    d.polygon([(78, 128), (98, 128), (108, 160), (68, 160)], fill=B)                         # le lutrin
    d.polygon([(90, 128), (98, 128), (108, 160), (96, 160)], fill=V)
    d.rectangle([60, 160, 116, 164], fill=B)
    return im


def m_portes():
    """Les Portes de la cité, sous l'auvent du débarcadère : une arche de pierre ouverte sur le quai et la mer,
    une borne qui reconnaît les arrivants, son voyant vert ; des pas qui mènent à la porte."""
    im, d = toile()
    ciel_aube(d, 92, 0.8, 0.5)
    mer(d, 94, 128, 6, V, reflet=88, larg=10, c_reflet=B)
    d.rectangle([0, 0, W, 16], fill=N)                                                       # l'auvent
    for x in range(0, W, 12):
        d.polygon([(x, 16), (x + 12, 16), (x + 6, 22)], fill=V if (x // 12) % 2 else B)
    d.rectangle([0, 14, W, 16], fill=B)
    d.rectangle([12, 20, 164, 128], fill=B)                                                  # le mur et l'arche
    d.pieslice([40, 30, 136, 126], 180, 360, fill=N)
    d.rectangle([40, 78, 136, 128], fill=N)
    d.pieslice([44, 34, 132, 122], 180, 360, fill=V)
    d.rectangle([44, 78, 132, 128], fill=V)
    ciel = Image.new('P', (W, H), N); ciel.putpalette(PAL); dc = ImageDraw.Draw(ciel)        # le dehors, dans l'arche
    ciel_aube(dc, 92, 0.8, 0.5)
    mer(dc, 94, 128, 6, V, reflet=88, larg=10, c_reflet=B)
    msk = Image.new('L', (W, H), 0); dm = ImageDraw.Draw(msk)
    dm.pieslice([46, 36, 130, 120], 180, 360, fill=255); dm.rectangle([46, 78, 130, 128], fill=255)
    d._image.paste(ciel, (0, 0), msk)
    for r_, y in enumerate(range(20, 128, 10)):                                              # les pierres du mur
        d.line([(12, y), (40, y)], fill=N); d.line([(136, y), (164, y)], fill=N)
        for x in (12 + (r_ % 2) * 14, 136 + (r_ % 2) * 14):
            d.line([(x, y), (x, y + 10)], fill=N)
    for k in range(9):                                                                       # les claveaux
        a = math.pi + (k + 0.5) * math.pi / 9
        d.line([(88 + 44 * math.cos(a), 78 + 44 * math.sin(a)), (88 + 52 * math.cos(a), 78 + 52 * math.sin(a))], fill=N)
    d.rectangle([12, 20, 16, 128], fill=V); d.rectangle([160, 20, 164, 128], fill=N)
    quai_paves(d, 128, bord=False)
    d.rectangle([140, 86, 158, 140], fill=B)                                                 # la borne
    d.rectangle([152, 86, 158, 140], fill=V)
    d.rectangle([143, 92, 155, 108], fill=N)
    halo(d, 149, 100, 10, V, 0.8)
    d.rectangle([145, 95, 153, 105], fill=V); d.rectangle([147, 98, 151, 102], fill=B)
    d.rectangle([144, 114, 154, 118], fill=N)
    for k, (px, py) in enumerate(((60, 166), (72, 158), (80, 150), (88, 143), (94, 137))):   # des pas
        d.rectangle([px, py, px + 3, py + 4], fill=B)
    return im


def m_forge():
    """La Forge des Sceaux : le foyer qui ne s'éteint jamais, sa hotte et son halo ; l'enclume en volume, un sceau
    de métal posé dessus (marqué CA) ; le marteau ; des sceaux pendus au mur."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 44, 94, 80, V, 0.9, 64)
    d.polygon([(18, 6), (70, 6), (78, 44), (10, 44)], fill=B)                                # la hotte
    d.polygon([(52, 6), (70, 6), (78, 44), (58, 44)], fill=V)
    d.rectangle([30, 0, 58, 6], fill=B)
    d.rectangle([6, 44, 82, 112], fill=B)                                                    # le foyer
    for r_, yy in enumerate(range(46, 112, 6)):
        d.line([(6, yy), (82, yy)], fill=N)
        for xx in range(6 + (r_ % 2) * 6, 82, 12):
            d.line([(xx, yy), (xx, yy + 6)], fill=N)
    d.pieslice([16, 58, 72, 114], 180, 360, fill=N)
    d.rectangle([16, 86, 72, 110], fill=N)
    halo(d, 44, 98, 26, B, 0.7, 16)
    for k, x in enumerate(range(22, 70, 9)):
        flamme(d, x, 108, 16 + (k % 3) * 6)
    for (dx, dy) in ((-10, -40), (6, -46), (16, -36)):
        d.point((44 + dx, 108 + dy), fill=B)
    sol(d, 112, 88, V, pas0=3, n=8, ecart=26)
    d.line([(0, 112), (W, 112)], fill=B)
    x, y = 102, 120                                                                          # l'enclume
    d.polygon([(x - 10, y), (x + 52, y), (x + 62, y - 4), (x + 50, y + 8), (x + 2, y + 8)], fill=B)
    d.polygon([(x - 10, y), (x - 22, y + 2), (x - 6, y + 6)], fill=B)
    d.polygon([(x + 14, y + 8), (x + 38, y + 8), (x + 34, y + 24), (x + 18, y + 24)], fill=B)
    d.polygon([(x + 28, y + 8), (x + 38, y + 8), (x + 34, y + 24), (x + 28, y + 24)], fill=V)
    d.rectangle([x + 6, y + 24, x + 46, y + 30], fill=B)
    d.line([(x - 10, y + 1), (x + 52, y + 1)], fill=V)
    d.ellipse([x + 10, y - 16, x + 34, y + 2], fill=V)                                       # le sceau
    d.ellipse([x + 14, y - 13, x + 30, y - 1], fill=N)
    texte(d, x + 17, y - 13, "CA", V)
    halo(d, x + 22, y - 8, 16, V, 0.4)
    d.line([(150, 108), (168, 78)], fill=B, width=3)                                         # le marteau
    d.rectangle([160, 68, 176, 80], fill=B); d.rectangle([170, 68, 176, 80], fill=V)
    for k, xx in enumerate((96, 114, 132, 150)):                                             # les sceaux pendus
        d.line([(xx, 20), (xx, 30)], fill=B)
        d.ellipse([xx - 6, 30, xx + 6, 42], fill=V if k % 2 else B)
        d.ellipse([xx - 3, 33, xx + 3, 39], fill=N)
    return im


def m_arche():
    """L'Arche, sur la colline, loin des vagues : sous un ciel d'orage qui monte, une coque renversée en pierre,
    sa porte blindée à volant, une lanterne ; la mer en contrebas, le chemin qui monte."""
    im, d = toile()
    ciel_nuit(d, 100, 9, 26)
    degrade(d, 0, 60, W, 100, V, 0, 0.7)
    nuages(im, d, 12, 4, 4, 0.7, 0.8)
    mer(d, 100, 132, 8, V, reflet=150, larg=4, c_reflet=B)
    d.polygon([(0, 120), (30, 100), (70, 84), (110, 80), (150, 88), (176, 100), (176, 170), (0, 170)], fill=N)   # la colline
    d.line([(0, 120), (30, 100), (70, 84), (110, 80), (150, 88), (176, 100)], fill=B)
    crete = [(0, 120), (30, 100), (70, 84), (110, 80), (150, 88), (176, 100)]

    def colline(x):
        for (xa, ya), (xb, yb) in zip(crete, crete[1:]):
            if xa <= x <= xb:
                return ya + (yb - ya) * (x - xa) / (xb - xa)
        return 100
    k = 0
    for y in range(86, H, 7):                                                                # l'herbe, en tirets
        for x in range(2 + (k % 2) * 7, W, 14 - min(6, (y - 86) // 14)):
            if y > colline(x) + 4:
                d.line([(x, y), (x + 2, y - 2)], fill=V)
        k += 1
    d.line([(20, 170), (60, 140), (78, 118)], fill=B, width=3)                               # le chemin
    d.line([(20, 170), (60, 140), (78, 118)], fill=N, width=1)
    halo(d, 88, 92, 60, V, 0.35, 36)
    d.pieslice([40, 40, 136, 136], 180, 360, fill=B)                                         # la coque renversée
    d.rectangle([40, 88, 136, 112], fill=B)
    d.pieslice([100, 40, 136, 136], 270, 360, fill=V)
    d.rectangle([118, 88, 136, 112], fill=V)
    for k in range(1, 5):
        d.arc([40 + k * 8, 40 + k * 8, 136 - k * 8, 136 - k * 8], 185, 355, fill=N)
    for x in range(44, 136, 10):
        d.point((x, 108), fill=N)
    d.rectangle([76, 76, 100, 112], fill=N)                                                  # la porte blindée
    d.rectangle([78, 78, 98, 112], outline=V)
    d.ellipse([82, 84, 94, 96], outline=B, width=2)
    d.line([(88, 84), (88, 96)], fill=B); d.line([(82, 90), (94, 90)], fill=B)
    d.rectangle([104, 74, 108, 80], fill=V); halo(d, 106, 77, 8, V, 0.7)                     # la lanterne
    return im


# ------------------------------------------------------------------
# La cinématique d'ouverture : cinq plans
# ------------------------------------------------------------------

def cine_mer_aube():
    """La mer au petit jour, d'argent : le soleil sort de l'eau, une colonne de reflets ; au loin, une île sort
    de la brume ; le navire de l'école, toutes voiles dehors."""
    im, d = toile()
    ciel_aube(d, 86, 0.9, 0.6)
    soleil(d, 128, 86, 14, horizon=86)
    mouettes(d, [(40, 30, 3), (54, 24, 2), (66, 34, 2)], N)
    ile(d, 16, 86, 74, 20)
    brume(d, 76, 92, 0.6)
    mer(d, 88, H, 3, V, reflet=128, larg=12, c_reflet=B)
    navire(d, 70, 140, 54, voiles=True)
    reflet_silhouette(d, 72, 128, 152, 3, V)
    return im


def cine_quai_laurent():
    """Sur le quai, Laurent attend, de dos, le col relevé, une haute silhouette noire liserée par l'aube,
    face à la cité qui dort de l'autre côté du port."""
    im, d = toile()
    ciel_aube(d, 66, 0.85, 0.55)
    soleil(d, 140, 66, 10, horizon=66)
    for k, x in enumerate(range(4, 170, 28)):
        maison_ile(d, x, 92, 18, 22 + (k % 2) * 8, toit=V if k % 2 else B, p=4)
    phare_clair(d, 160, 92, 30, allume=False, rayon=0)
    mer(d, 94, 114, 5, V, reflet=140, larg=8, c_reflet=B)
    quai_paves(d, 114)
    x, y, h = 70, 186, 116                                                                   # Laurent, de dos, en ombre
    personnage_ombre(d, x - 2, y, h, manteau=True, c=B)
    personnage_ombre(d, x, y - 2, h, manteau=True, c=B)
    personnage_ombre(d, x + 2, y, h, manteau=True, c=V)
    personnage_ombre(d, x, y, h, manteau=True, c=N)
    u = h / 90
    d.polygon([(x - 11 * u, y - h + 14 * u), (x + 11 * u, y - h + 14 * u), (x + 13 * u, y - h + 22 * u), (x - 13 * u, y - h + 22 * u)], fill=N)   # le col relevé
    d.line([(x - 11 * u, y - h + 14 * u), (x - 13 * u, y - h + 22 * u)], fill=B)
    d.line([(x + 11 * u, y - h + 14 * u), (x + 13 * u, y - h + 22 * u)], fill=V)
    return im


def cine_maisons_vides():
    """Dix maisons neuves, en deux rangs, toutes fenêtres noires : pas un nom, pas une lettre, pas une lumière ;
    au-dessus, le ciel pâle du matin ; devant, les pavés neufs."""
    im, d = toile()
    ciel_aube(d, 92, 0.6, 0.35)
    x = 12
    for k in range(5):
        maison_ile(d, x, 92, 24, 28, toit=B if k % 2 else V, p=5)
        x += 32
    quai_paves(d, 92, bord=False)
    x = 2
    for k in range(5):
        maison_ile(d, x, 150, 28, 36, toit=V if k % 2 else B, p=6)
        x += 36
    d.rectangle([0, 150, W, H], fill=N)
    for yy in range(154, H, 5):
        d.line([(0, yy), (W, yy)], fill=V)
    return im


def cine_phare_orage():
    """À l'horizon, l'orage roule sur les vagues : des nuages lourds, l'éclair, la pluie ; le phare sans flamme
    sur son rocher, les grosses vagues qui viennent s'y briser."""
    im, d = toile()
    degrade(d, 0, 0, W, 100, V, 0.2, 0.7)
    degrade(d, 0, 76, W, 100, B, 0, 0.6)
    nuages(im, d, 18, 3, 9, 1.1, 1.0)
    eclair(d, 40, 26, 56, 2)
    pluie(d, 0, 34, W, 104, 7, 3, B)
    mer(d, 100, H, 7, V)
    for k in range(5):                                                                       # les grosses vagues, crête à droite
        x = k * 40 - 20
        y = 120 + (k % 2) * 14
        pts = [(x, y + 18), (x + 14, y + 8), (x + 28, y), (x + 38, y + 2), (x + 42, y + 8), (x + 36, y + 6), (x + 32, y + 10), (x + 46, y + 18)]
        d.polygon(pts, fill=V)
        d.line(pts[:6], fill=B, width=2)
        d.polygon([(x + 28, y), (x + 38, y + 2), (x + 42, y + 8), (x + 34, y + 4)], fill=B)
        for j in range(3):
            d.point((x + 40 + j * 3, y - 2 + j * 2), fill=B)
    d.polygon([(104, 128), (120, 116), (140, 114), (156, 126), (164, 140), (96, 140)], fill=N)   # le rocher
    d.line([(104, 128), (120, 116), (140, 114), (156, 126)], fill=B)
    phare(d, 130, 46, allume=False)
    for k in range(5):                                                                       # l'écume sur le rocher
        d.arc([96 + k * 14, 132, 110 + k * 14, 146], 180, 360, fill=B, width=2)
    return im


def cine_maree():
    """La marée de 19 h : la nuit, le navire entre dans la passe, hublots allumés ; au bastingage, des centaines
    de silhouettes ; le phare de Port-Aube l'accueille de son faisceau ; la lune."""
    im, d = toile()
    ciel_nuit(d, 76, 6, 30)
    degrade(d, 0, 56, W, 76, V, 0, 0.5)
    lune_pleine(d, 146, 20, 8)
    mer(d, 78, H, 9, V, reflet=146, larg=6, c_reflet=B)
    phare(d, 18, 56, allume=True, rayons=False)
    rayon(d, 24, 46, 176, 30, 62, 0.6, 0.1)
    d.polygon([(0, 126), (34, 126), (40, 132), (0, 134)], fill=N)
    navire(d, 34, 116, 116, voiles=True, eclaire=True)
    for x in range(40, 146, 4):                                                              # les passagers au bastingage
        hh = 4 + (x * 7) % 3
        d.rectangle([x, 116 - hh, x + 2, 115], fill=N)
        d.rectangle([x, 116 - hh - 3, x + 2, 116 - hh - 1], fill=N)
        d.point((x + 1, 116 - hh - 3), fill=B)
    d.line([(36, 113), (150, 113)], fill=B)
    reflet_silhouette(d, 40, 150, 128, 4, V)
    return im


def port_aube_fete():
    return port_aube(fete=True)


# ------------------------------------------------------------------
# Les maîtres bâtisseurs et les habitants, en pied
# ------------------------------------------------------------------

# Dans le style des sprites d'origine du chapitre 1 (item_farmer, item_merchant, item_professor...) : des silhouettes
# toutes différentes, des poses vivantes, des visages dessinés au pixel près (sprite), un objet de métier lisible.

def badis_dessin(r):
    # le bibliothécaire des noms : perché sur son escabeau, bonnet à pompon, il brandit sa plume comme une épée,
    # l'autre main pleine d'étiquettes vierges qui dépassent en éventail ; le sourire de celui qui va tout nommer
    cx = 36
    ligne_r(r, cx - 10, 50, cx - 15, 67, B, 2); ligne_r(r, cx + 9, 50, cx + 14, 67, B, 2)    # l'escabeau
    for y in (56, 62): r(cx - 13 + (y - 56) // 6, y, cx + 12 - (y - 56) // 6, y + 1, V)
    r(cx - 12, 49, cx + 11, 51, B); r(cx - 11, 50, cx + 10, 50, N)
    r(cx - 6, 30, cx + 6, 42, B); r(cx - 4, 31, cx + 4, 42, V); r(cx, 31, cx, 42, N)   # le gilet
    for y in (34, 38): r(cx - 2, y, cx - 2, y, B); r(cx + 2, y, cx + 2, y, B)
    r(cx - 5, 42, cx + 5, 44, N); r(cx - 5, 43, cx - 1, 48, V); r(cx + 1, 43, cx + 5, 48, V)
    r(cx - 7, 47, cx - 1, 49, B); r(cx + 1, 47, cx + 7, 49, B)
    trait(r, [(cx + 6, 32), (cx + 12, 26), (cx + 15, 16)], 2, B)              # la plume brandie
    sprite(r, cx + 13, 0, """
|          #
|         ##
|        ###
|       ##g#
|      ##g##
|     ##g##
|    ##g##
|   ##g##
|  ##g#
|  #g#
|  ##
| ##
|##
""")
    trait(r, [(cx - 6, 32), (cx - 12, 36), (cx - 15, 32)], 2, B)              # l'éventail d'étiquettes
    for k in range(5):
        a = math.radians(-150 + k * 22)
        x1, y1 = cx - 16 + round(12 * math.cos(a)), 31 + round(12 * math.sin(a))
        ligne_r(r, cx - 16, 31, x1, y1, N, 3); ligne_r(r, cx - 16, 31, x1, y1, B if k % 2 else V, 2)
        r(x1 - 1, y1 - 1, x1 + 2, y1 + 2, B); r(x1, y1, x1 + 1, y1 + 1, N)
    sprite(r, cx - 9, 6, """
|        ##
|       #..#
|       #..#
|     ggggggggg
|    ggggggggggg
|   g.g.g.g.g.g.g
|   ###############
|   #.############.
|   #.##...###...##
|   #.##.#.###.#.##
|   ###............
|  .################.
|  #.######..######.#
|   .#####.##.#####.
|    ####.####.####
|    ####.#....####
|     ####.##..###
|      ###....###
|        #######
""")
    sol_traits(r, 68, 16, 62, 31)


def maeva_dessin(r):
    # la gardienne du phare : le ciré qui claque, les cheveux emportés par le vent ; campée face à la tempête, elle
    # lève haut sa lanterne allumée, qui rayonne ; des traits de vent passent devant elle
    cx = 38
    for y in range(32, 62):                                                  # le ciré, la pointe qui s'envole
        hw = 7 + (y - 32) // 4
        r(cx - hw + (y - 32) // 6, y, cx + hw + (y - 32) // 3, y, V)
    r(cx - 1, 33, cx + 1, 61, N); r(cx - 4, 33, cx + 4, 36, B)
    for y in (40, 46, 52): r(cx + 3, y, cx + 4, y, B)
    r(cx - 4, 62, cx - 2, 65, B); r(cx + 3, 62, cx + 5, 65, B)
    r(cx - 7, 65, cx - 2, 67, V); r(cx + 3, 65, cx + 8, 67, V)
    trait(r, [(cx - 7, 34), (cx - 12, 26), (cx - 13, 18)], 3, V)              # la lanterne levée haut
    r(cx - 19, 2, cx - 7, 17, N); r(cx - 18, 4, cx - 8, 15, B); r(cx - 16, 6, cx - 10, 13, V); r(cx - 14, 8, cx - 12, 12, B)
    r(cx - 18, 3, cx - 8, 4, V); r(cx - 18, 15, cx - 8, 16, V); r(cx - 15, 0, cx - 11, 2, B)
    for (a, b) in (((cx - 23, 9), (cx - 28, 9)), ((cx - 22, 3), (cx - 26, 0)), ((cx - 22, 15), (cx - 26, 18)), ((cx - 3, 4), (cx + 1, 1))):
        ligne_r(r, a[0], a[1], b[0], b[1], B)
    trait(r, [(cx + 8, 34), (cx + 12, 42), (cx + 10, 48)], 3, V)              # le poing sur la hanche
    for (y, x0, x1) in ((24, cx + 22, cx + 34), (40, cx + 24, cx + 36), (54, cx + 26, cx + 40), (30, cx - 30, cx - 22)):
        r(x0, y, x1, y, B)
    sprite(r, cx - 9, 8, """
|        ggggggggg
|      ggggggggggggggg gg
|     ggggggggggggggggggggg  g
|    gggg.ggggggg.ggggggggggggg
|    ggg######ggggggggggggg  gg
|    gg#########ggggggggggg
|    g###########gggggggg  ggg
|    g##..###..###ggggggg
|    ##.#.##.#.###gggggg
|    ###..###..####gggg
|   .######..#####ggg
|   #.####.##.####gg
|    .###.####.###g
|     ###.###...##
|     ####...####
|      ##.###.##
|       ##...##
|        #####
""")
    sol_traits(r, 68, 14, 64, 32)


def younes_dessin(r):
    # le facteur : assis tout en haut d'une pile de sacs postaux, la casquette de travers, une jambe ballante ; il
    # tend vers nous la lettre tamponnée à l'aube, l'air de dire « toujours là »
    for (x0, y0, x1, y1) in ((14, 52, 40, 66), (38, 54, 62, 66), (24, 42, 52, 54)):    # les sacs postaux
        r(x0, y0, x1, y1, N); r(x0 + 1, y0 + 1, x1 - 1, y1 - 1, B)
        r(x0 + 3, y0 + 2, x0 + 4, y0 + 2, N); r(x1 - 4, y0 + 2, x1 - 3, y0 + 2, N)
        r((x0 + x1) // 2 - 3, (y0 + y1) // 2, (x0 + x1) // 2 + 3, (y0 + y1) // 2 + 2, V)
        r((x0 + x1) // 2 - 2, (y0 + y1) // 2 + 1, (x0 + x1) // 2 + 2, (y0 + y1) // 2 + 1, N)
    cx = 38
    r(cx - 6, 26, cx + 6, 40, V); r(cx - 4, 26, cx + 4, 28, B); r(cx, 28, cx, 40, N)  # la veste
    ligne_r(r, cx - 6, 27, cx + 6, 39, B)
    trait(r, [(cx - 4, 40), (cx - 12, 41), (cx - 13, 50)], 3, V); r(cx - 17, 50, cx - 11, 52, B)   # une jambe ballante
    trait(r, [(cx + 3, 40), (cx + 10, 40), (cx + 14, 46)], 3, V); r(cx + 13, 46, cx + 19, 48, B)
    r(cx + 6, 34, cx + 16, 42, N); r(cx + 7, 35, cx + 15, 41, V); r(cx + 7, 35, cx + 15, 36, B)    # la sacoche
    trait(r, [(cx - 6, 28), (cx - 12, 24), (cx - 15, 18)], 2, B)              # la lettre tendue
    r(cx - 26, 7, cx - 10, 19, N); r(cx - 25, 8, cx - 11, 18, B)
    ligne_r(r, cx - 25, 8, cx - 18, 13, N); ligne_r(r, cx - 18, 13, cx - 11, 8, N)
    r(cx - 15, 14, cx - 12, 17, V); r(cx - 24, 15, cx - 19, 16, V)
    trait(r, [(cx + 6, 28), (cx + 9, 33), (cx + 6, 37)], 2, B)
    sprite(r, cx - 8, 6, """
|      gggggggggg
|    gggggg##ggggg
|    ggggggggggggggggggg
|    ##############
|   ###..#####..####
|   ##.#.#####.#.###
|   ###..#####..####.
|   .######..######.#
|   #.####.##.#####.
|    .###.####.####
|    ####.##..####
|    #####......##
|     #####.##.##
|      ###....##
|       #######
|         ###
""")
    sol_traits(r, 68, 10, 68, 33)


def syrine_dessin(r):
    # la gardienne des casiers : chignon tiré, lunettes carrées, l'air décidé ; elle abat son tampon d'un grand
    # geste (des traits de mouvement), le sceau de cire rond tenu dans l'autre main
    cx = 34
    for y in range(32, 66):                                                  # la robe
        hw = 6 + (y - 32) // 6
        r(cx - hw, y, cx + hw, y, B)
    r(cx - 4, 32, cx + 4, 38, V); r(cx - 1, 33, cx + 1, 37, N); r(cx - 7, 44, cx + 7, 45, V)
    for x in (cx - 3, cx + 3): r(x, 48, x, 65, N)
    r(cx - 5, 66, cx - 2, 67, B); r(cx + 2, 66, cx + 5, 67, B)
    trait(r, [(cx + 6, 34), (cx + 14, 30), (cx + 20, 22)], 2, B)              # le tampon levé
    r(cx + 18, 13, cx + 26, 22, N); r(cx + 20, 14, cx + 24, 17, V); r(cx + 19, 17, cx + 25, 21, B); r(cx + 19, 21, cx + 25, 21, V)
    for (a, b) in (((cx + 28, 12), (cx + 32, 10)), ((cx + 29, 17), (cx + 34, 17)), ((cx + 28, 22), (cx + 32, 25))):
        ligne_r(r, a[0], a[1], b[0], b[1], B)
    r(cx + 24, 55, cx + 36, 57, B); r(cx + 25, 56, cx + 35, 56, N)            # la boîte aux lettres qu'elle va sceller
    r(cx + 22, 57, cx + 38, 66, N); r(cx + 23, 58, cx + 37, 66, V); r(cx + 26, 60, cx + 34, 61, N)
    r(cx + 28, 63, cx + 32, 66, B)
    trait(r, [(cx - 6, 34), (cx - 11, 41), (cx - 9, 46)], 2, B)               # le sceau de cire
    sprite(r, cx - 17, 42, """
|   ######
|  #gggggg#
| #gg####gg#
| #g#g##g#g#
| #g##gg##g#
| #g#g##g#g#
| #gg####gg#
|  #gggggg#
|   ######
""")
    r(cx - 2, 26, cx + 2, 32, B)
    sprite(r, cx - 9, 3, """
|       gggg
|      gggggg
|      gg.ggg
|       gggg
|    gggggggggggg
|   gggggggggggggg
|  ggg##########ggg
|  gg############gg
|  g#.....##.....#g
|  g#.#.#....#.#.#g
|  g#.....##.....#g
|  g######.#######g
|  g#####.########g
|  gg####..######gg
|   g###......##g
|   g####.##.###g
|    ####....###
|     ##########
|       ######
""")
    sol_traits(r, 68, 16, 68, 34)


def noam_dessin(r):
    # le gardien des greniers : grande barbe taillée en carré, gilet de travail à poches ; il fait tinter son gros
    # trousseau de clés levé à hauteur d'épaule, le dossier calé sous le bras ; un clin d'œil
    cx = 36
    r(cx - 8, 32, cx + 8, 56, B); r(cx - 6, 33, cx + 6, 56, V); r(cx - 1, 33, cx + 1, 56, B)   # le gilet à poches
    for (x, y) in ((cx - 5, 42), (cx + 2, 42), (cx - 5, 49), (cx + 2, 49)): r(x, y, x + 3, y + 3, N); r(x, y, x + 3, y, B)
    r(cx - 6, 56, cx - 2, 64, V); r(cx + 2, 56, cx + 6, 64, V); r(cx - 1, 56, cx + 1, 64, N)
    r(cx - 8, 64, cx - 2, 67, B); r(cx + 2, 64, cx + 8, 67, B); r(cx - 8, 66, cx + 8, 66, N)
    trait(r, [(cx + 8, 34), (cx + 14, 36), (cx + 17, 28)], 3, B)              # le trousseau levé
    r(cx + 14, 18, cx + 22, 26, N); r(cx + 15, 19, cx + 21, 25, V); r(cx + 17, 21, cx + 19, 23, N)
    for k, (dx, l) in enumerate(((-3, 8), (2, 10), (7, 7), (11, 9))):
        x = cx + 16 + dx
        ligne_r(r, cx + 18, 25, x, 25 + l, B)
        r(x - 1, 25 + l, x + 1, 25 + l + 1, B if k % 2 else V)
    for (a, b) in (((cx + 26, 18), (cx + 30, 15)), ((cx + 27, 23), (cx + 31, 23))):
        ligne_r(r, a[0], a[1], b[0], b[1], B)
    trait(r, [(cx - 8, 34), (cx - 13, 42), (cx - 9, 47)], 3, B)               # le dossier sous le bras
    r(cx - 22, 38, cx - 8, 52, N); r(cx - 21, 39, cx - 9, 51, V); r(cx - 21, 39, cx - 9, 41, B)
    r(cx - 19, 44, cx - 11, 48, N); r(cx - 18, 45, cx - 12, 45, B); r(cx - 18, 47, cx - 14, 47, B)
    sprite(r, cx - 10, 7, """
|      #########
|    #############
|   ######.########
|   ###############
|  ##gggg###ggggg##
|  ###..####.....##
|  ##.#.####...####
|  ###..#####..####
| .#######..#######.
| #.#####.##.#####.#
|  ######.##.######
|  gggggg....gggggg
|  ggggg######ggggg
|  ggggggg..ggggggg
|  gggg.gggggg.gggg
|  gggggg.gg.gggggg
|  gggg.gggggg.gggg
|  gggggggggggggggg
|   gggggg.ggggggg
""")
    sol_traits(r, 68, 14, 64, 35)


def zelia_dessin(r):
    # la marchande de la Halle : foulard noué sur le côté, grandes boucles d'oreilles ; le panier calé sur la hanche,
    # elle lève une poignée de rubans de la promo qui ondulent au vent ; la jupe rayée tourne
    cx = 34
    for y in range(32, 64):                                                  # la jupe rayée qui tourne
        hw = 6 + (y - 32) // 3
        r(cx - hw, y, cx + hw, y, V if y < 42 else (B if ((y - 42) // 3) % 2 else V))
    r(cx - 4, 32, cx + 4, 41, B); r(cx - 2, 33, cx + 2, 35, N); r(cx - 8, 41, cx + 8, 42, N)
    r(cx - 4, 64, cx - 1, 66, B); r(cx + 2, 64, cx + 5, 66, B)
    trait(r, [(cx + 6, 34), (cx + 12, 40), (cx + 10, 46)], 2, B)              # le panier sur la hanche
    r(cx + 8, 44, cx + 26, 56, N); r(cx + 9, 45, cx + 25, 55, B)
    for x in range(cx + 10, cx + 25, 3): r(x, 45, x, 55, V)
    for y in (48, 52): r(cx + 9, y, cx + 25, y, N)
    ligne_r(r, cx + 9, 45, cx + 17, 38, B); ligne_r(r, cx + 17, 38, cx + 25, 45, B)
    r(cx + 12, 42, cx + 15, 44, V); r(cx + 19, 41, cx + 22, 44, V)
    trait(r, [(cx - 6, 34), (cx - 11, 28), (cx - 13, 18)], 2, B)              # les rubans levés
    r(cx - 15, 15, cx - 11, 18, B)
    for k in range(3):                                                         # trois rubans qui ondulent au vent
        pts = [(cx - 14 - j * 2, 15 - k * 3 + round(2.5 * math.sin(j / 1.4 + k * 2))) for j in range(0, 11)]
        for (p0, p1) in zip(pts, pts[1:]): ligne_r(r, p0[0], p0[1], p1[0], p1[1], (V, B, V)[k], 2)
    sprite(r, cx - 9, 7, """
|      gggggggggg
|    ggg.gggg.gggggg  g
|   gggggggg.ggggggggggg
|   gggg.ggggggg.ggggg  g
|   gg############gg
|   g###...###...##g
|   ##.#.#.###.#.###
|   ##.###.###.###.##
|  .########..######.
|  #.######.#######.#
|  #.######..######.#
|   .####.#...####.
|   #.###.......##g
|   g.####.###.###g
|   g  ####...###  g
|  ggg  ########  ggg
|   g     ####     g
""")
    sol_traits(r, 68, 14, 64, 36)


def kamal_dessin(r):
    # le greffier du Registre : calotte, longue robe à étole ; il porte à bout de bras un livre immense, si lourd qu'il
    # se penche en arrière pour faire contrepoids ; une plume coincée derrière l'oreille
    cx = 30
    for y in range(32, 66):                                                  # la longue robe, penchée en arrière
        sh = (66 - y) // 6
        hw = 6 + (y - 32) // 6
        r(cx - hw - sh, y, cx + hw - sh, y, B)
    for y in range(32, 66):
        sh = (66 - y) // 6
        r(cx - 3 - sh, y, cx - 2 - sh, y, V); r(cx + 2 - sh, y, cx + 3 - sh, y, V)
    r(cx - 5, 66, cx - 1, 67, B); r(cx + 1, 66, cx + 5, 67, B)
    r(cx + 6, 22, cx + 38, 52, N)                                             # le livre immense
    r(cx + 7, 23, cx + 37, 51, V); r(cx + 9, 25, cx + 35, 49, B); r(cx + 9, 25, cx + 10, 49, V)
    r(cx + 12, 28, cx + 32, 32, N); r(cx + 13, 29, cx + 31, 31, V)
    for y in range(36, 48, 3): r(cx + 13, y, cx + 32 - (y % 7), y, N)
    r(cx + 37, 30, cx + 39, 34, B); r(cx + 37, 40, cx + 39, 44, B)
    trait(r, [(cx + 4, 35), (cx + 6, 42), (cx + 8, 48)], 3, B)
    trait(r, [(cx + 2, 34), (cx + 5, 30), (cx + 8, 28)], 3, B)
    for (a, b) in (((cx + 18, 54), (cx + 18, 57)), ((cx + 26, 54), (cx + 27, 57))): ligne_r(r, a[0], a[1], b[0], b[1], V)
    r(cx - 3, 24, cx + 2, 33, B)
    sprite(r, cx - 14, 6, """
|              #
|             #
|            g#
|     gggggg#g
|    ggggggg#g
|   ##########
|  ############
|  ###...##...#
|  ##.#.###.#.##.
|  ###...##...###
|  ######..######
| .#####.##.####.
| #.###.####.###.#
|  .##.##....###.
|   ###.####.###
|   ####....###
|    ##########
|     ########
|      ######
""")
    sol_traits(r, 68, 12, 66, 37)


def lamia_dessin(r):
    # la portière des Portes : adossée à la borne du quai, les bras croisés sur la liste des arrivants, la grande clé
    # passée dans la ceinture ; la cape tombe droit, le badge brille, un demi-sourire tranquille
    r(52, 30, 62, 66, N); r(53, 31, 61, 66, B); r(54, 33, 60, 41, N); r(55, 34, 59, 37, V)    # la borne du quai
    for (x, y) in ((55, 39), (57, 39), (59, 39)): r(x, y, x, y, V)
    r(54, 44, 60, 45, V); r(52, 28, 62, 30, V)
    cx = 40
    for y in range(28, 66):                                                  # la cape, penchée vers la borne
        sh = (66 - y) // 8
        hw = 7 + (y - 28) // 6
        r(cx - hw + sh, y, cx + hw + sh, y, V)
    for y in range(28, 66):
        sh = (66 - y) // 8
        r(cx - 3 + sh, y, cx + 3 + sh, y, B)
    r(cx - 3, 36, cx + 2, 40, N); r(cx - 2, 37, cx + 1, 39, V)                 # le badge
    r(cx - 5, 66, cx - 1, 67, B); r(cx + 2, 66, cx + 6, 67, B)
    r(cx - 8, 42, cx + 12, 52, N); r(cx - 7, 43, cx + 11, 51, B)             # la liste, contre elle, bras croisés
    for y in range(45, 51, 2): r(cx - 5, y, cx + 6, y, N)
    trait(r, [(cx - 8, 31), (cx - 11, 38), (cx - 9, 44)], 3, V)
    trait(r, [(cx + 9, 31), (cx + 12, 38), (cx + 10, 44)], 3, V)
    r(cx - 10, 44, cx + 12, 48, N); r(cx - 9, 45, cx + 11, 47, V); r(cx - 9, 45, cx + 1, 45, B)
    r(cx - 11, 44, cx - 8, 48, B); r(cx + 10, 44, cx + 13, 48, B)
    r(cx + 3, 53, cx + 9, 59, N); r(cx + 4, 54, cx + 8, 58, B); r(cx + 5, 55, cx + 7, 57, N)   # la grande clé
    trait(r, [(cx + 6, 59), (cx + 6, 66)], 2, B, False); r(cx + 7, 63, cx + 9, 64, B)
    sprite(r, cx - 10, 5, """
|      ggggggggg
|    ggggggggggggg
|   ggggggggggggggg
|  ggg...........ggg
|  gg.#########gg.gg
|  g.####ggg######.g
|  g.##############.g
|  g.##.....##.....#.g
|  g.##.##.##.###..#.g
|  g.##############.g
|  g.#######..#####.g
|  g.######.########.g
|  gg.#####...#####.gg
|  gg.###.....#.###.gg
|  ggg.####...####.ggg
|  gggg.#########.gggg
|  ggggg.........ggggg
|   ggggggggggggggggg
""")
    sol_traits(r, 68, 16, 68, 38)


def miguel_dessin(r):
    # le forgeron des sceaux : bandeau noué, avant-bras puissants, tablier de cuir ; il abat son marteau sur
    # l'enclume où rougeoie le sceau, et des étincelles jaillissent en gerbe
    cx = 30
    r(cx - 8, 32, cx + 8, 56, B); r(cx - 6, 36, cx + 6, 60, V); r(cx - 6, 36, cx + 6, 36, N)   # le tablier
    for (x, y) in ((cx - 4, 40), (cx + 3, 40), (cx - 4, 56), (cx + 3, 56)): r(x, y, x, y, B)
    r(cx - 6, 60, cx - 2, 64, V); r(cx + 2, 60, cx + 6, 64, V)
    r(cx - 8, 64, cx - 2, 67, B); r(cx + 2, 64, cx + 8, 67, B); r(cx - 8, 66, cx + 8, 66, N)
    sprite(r, cx + 10, 44, """
|  ###################
| #####################
|  .#################.
|     ..###########..
|       .#########.
|        #########
|       ###########
|      #############
|      #############
""")
    sprite(r, cx + 15, 39, """
|   #######
|  #ggggggg#
|  #g#####g#
""")
    for (a, b) in (((cx + 20, 37), (cx + 18, 30)), ((cx + 24, 36), (cx + 30, 28)), ((cx + 27, 38), (cx + 35, 34)),
                   ((cx + 16, 38), (cx + 10, 33)), ((cx + 22, 35), (cx + 23, 27))):
        ligne_r(r, a[0], a[1], b[0], b[1], V); r(b[0], b[1], b[0], b[1], B)
    trait(r, [(cx + 8, 34), (cx + 14, 30), (cx + 15, 22)], 4, B)              # le bras qui frappe
    trait(r, [(cx + 15, 22), (cx + 23, 31)], 2, B)
    sprite(r, cx + 18, 26, """
|    ..
|   .##.
|  .####.
| .######.
|.#####g##.
| .###g##.
|  .#g##.
|   .##.
|    ..
""")
    trait(r, [(cx - 8, 34), (cx - 13, 42), (cx - 9, 49)], 4, B)              # le poing sur la hanche
    sprite(r, cx - 10, 7, """
|      #########
|    ##.#######.##
|   ###.#########.#
|   gggggggggggggggggg
|   ggggggggggggggggg ggg
|   ##############   gg
|   ##ggggg##gggg#
|   ##.....##....##
|   ##.#.####.#.###.
|  .#################
|  #.######.#######.
|   .#####.#.#####.
|    ####.###.####
|    ###.......###
|    ####.###.####
|     ####...####
|      #########
|        #####
""")
    sol_traits(r, 68, 14, 66, 39)


def amina_dessin(r):
    # la gardienne de l'Arche : sur sa colline, la capuche rabattue par le vent ; elle tient haut une lampe et
    # regarde au loin, la main en visière ; le coffre scellé à ses pieds, cerclé de fer, le sceau au milieu
    for x in range(8, 80):                                                   # le haut de la colline
        y = 66 + round(((x - 40) / 30.0) ** 2 * 3)
        r(x, y, x, y, B)
    cx = 30
    for y in range(28, 66):                                                  # la cape qui vole vers la droite
        hw = 7 + (y - 28) // 5
        r(cx - hw, y, cx + hw + (y - 28) // 3, y, B)
    r(cx - 1, 30, cx + 1, 65, N); r(cx - 8, 44, cx + 10, 45, V)
    for y in range(48, 65, 4): r(cx + 8 + (y - 28) // 3, y, cx + 10 + (y - 28) // 3, y, N)
    trait(r, [(cx + 7, 30), (cx + 12, 22), (cx + 10, 14)], 2, B)              # la lampe levée
    r(cx + 6, 4, cx + 14, 14, N); r(cx + 7, 6, cx + 13, 13, V); r(cx + 9, 8, cx + 11, 11, B); r(cx + 9, 2, cx + 11, 4, B)
    for (a, b) in (((cx + 3, 6), (cx, 4)), ((cx + 17, 6), (cx + 20, 4)), ((cx + 17, 11), (cx + 21, 12))):
        ligne_r(r, a[0], a[1], b[0], b[1], V)
    trait(r, [(cx - 7, 30), (cx - 11, 26), (cx - 6, 18)], 2, B)               # la main en visière
    x0, y0 = cx + 18, 50                                                      # le coffre scellé
    r(x0, y0, x0 + 24, y0 + 15, N); r(x0 + 1, y0 + 1, x0 + 23, y0 + 14, V); r(x0 + 1, y0 + 1, x0 + 23, y0 + 4, B)
    r(x0 + 1, y0 + 5, x0 + 23, y0 + 5, N)
    for x in (x0 + 5, x0 + 19): r(x, y0 + 1, x + 1, y0 + 14, B)
    r(x0 + 9, y0 + 7, x0 + 15, y0 + 12, N); r(x0 + 10, y0 + 8, x0 + 14, y0 + 11, B); r(x0 + 11, y0 + 9, x0 + 13, y0 + 10, V)
    sprite(r, cx - 11, 7, """
|       gggggggg
|     gggggggggggg
|    gggggggggggggggg
|   gggg........gggggggg
|   ggg.########.gggggggggg
|  ggg.##########.gggg  gggg
|  gg.###.....####.ggg     gg
|  gg.###.#.#.####.gg
|  gg.####...#####.gg
|  gg.#######.####.g
|  g.#######..#####.g
|  g.######.######.g
|  g.#######.....#.g
|  gg.#####.###.##.g
|  ggg.####.....#.gg
|  gggg.#######.ggg
|  ggggg.......gggg
|   gggggggggggggg
""")
    sol_traits(r, 70, 16, 64, 40)


def ilyes_dessin(r):
    # le gamin de la gazette : petit, la casquette à l'envers, la bouche grande ouverte (« Édition spéciale ! ») ;
    # il agite une gazette au-dessus de sa tête, la liasse sous l'autre bras, les manches noires d'encre
    cx = 38
    r(cx - 6, 38, cx + 6, 54, V); r(cx - 3, 38, cx + 3, 40, B); r(cx - 6, 46, cx + 6, 46, N)   # la veste trop grande
    r(cx - 5, 54, cx - 2, 62, B); r(cx + 2, 54, cx + 5, 62, B); r(cx - 4, 55, cx - 3, 62, N); r(cx + 3, 55, cx + 4, 62, N)
    r(cx - 7, 62, cx - 2, 64, V); r(cx + 2, 62, cx + 7, 64, V); r(cx - 7, 64, cx - 2, 64, B); r(cx + 2, 64, cx + 7, 64, B)
    trait(r, [(cx + 6, 40), (cx + 11, 32), (cx + 13, 24)], 2, N)              # la gazette agitée
    r(cx + 11, 22, cx + 15, 25, B)
    r(cx + 6, 6, cx + 28, 23, N); r(cx + 7, 7, cx + 27, 22, B); r(cx + 9, 9, cx + 25, 12, N); r(cx + 10, 10, cx + 24, 11, V)
    for y in range(14, 22, 2): r(cx + 9, y, cx + 16, y, N); r(cx + 18, y, cx + 25, y, N)
    r(cx + 18, 14, cx + 25, 18, V)
    for (a, b) in (((cx + 30, 4), (cx + 33, 1)), ((cx + 31, 10), (cx + 35, 10)), ((cx + 3, 4), (cx, 1))):
        ligne_r(r, a[0], a[1], b[0], b[1], B)
    trait(r, [(cx - 6, 40), (cx - 10, 46), (cx - 7, 50)], 2, N)               # la liasse sous le bras
    r(cx - 20, 42, cx - 6, 54, N); r(cx - 19, 43, cx - 7, 53, B)
    for y in range(45, 53, 2): r(cx - 18, y, cx - 8, y, N)
    r(cx - 12, 42, cx - 11, 54, V)
    r(cx - 12, 40, cx - 8, 44, N); r(cx - 11, 41, cx - 9, 43, B)
    r(cx - 2, 31, cx + 2, 38, B)
    sprite(r, cx - 9, 16, """
|          ggg
|     gggggggggg
|   ggggggggggggg
|  gggggggggggggg
|    #############
|   #...####...###
|   #.#.####.#.###
|   #...####...###.
|  .######..######.
|  #.####.##.#####.#
|   .##..........#.
|   ###.##########
|   ###.#.......#
|    ##.#.ggg..#
|    ###.......#
|     ###########
|       ######
""")
    sol_traits(r, 66, 16, 64, 41)


def clara_dessin(r):
    # la secrétaire du capitaine : cheveux au carré avec une frange nette, le crayon derrière l'oreille ; caban
    # croisé à boutons ; elle écrit, appliquée, dans le carnet de bord, la langue entre les dents
    cx = 36
    r(cx - 8, 32, cx + 8, 58, V); r(cx - 6, 32, cx + 6, 35, B); r(cx - 2, 32, cx + 2, 34, N)  # le caban croisé
    for y in (39, 45, 51): r(cx - 4, y, cx - 3, y + 1, B); r(cx + 3, y, cx + 4, y + 1, B)
    r(cx - 8, 47, cx + 8, 47, N)
    r(cx - 5, 58, cx - 2, 64, B); r(cx + 2, 58, cx + 5, 64, B)
    r(cx - 7, 64, cx - 2, 66, V); r(cx + 2, 64, cx + 7, 66, V)
    r(cx - 20, 36, cx - 2, 48, N); r(cx - 19, 37, cx - 11, 47, B); r(cx - 10, 37, cx - 3, 47, B)   # le carnet de bord
    r(cx - 11, 37, cx - 10, 47, V)
    for y in range(39, 47, 2): r(cx - 18, y, cx - 13, y, N); r(cx - 9, y, cx - 4 - (y % 3), y, N)
    trait(r, [(cx - 8, 34), (cx - 14, 40), (cx - 15, 47)], 2, V)
    trait(r, [(cx + 8, 34), (cx + 4, 42), (cx - 3, 42)], 2, V)               # la main qui écrit
    ligne_r(r, cx - 4, 44, cx, 38, B, 1); r(cx, 37, cx, 37, V)
    sprite(r, cx - 10, 7, """
|     ggggggggg
|   ggggggggggggg
|  ggggggggggggggg
|  gggggggggggggggg
|  gg.g.g.g.g.g.ggg   #
|  gg#############g  #
|  gg#############g #
|  gg##..####..###g#
|  gg#.#.####.#.##gg
|  gg############.gg
|  gg######..#####gg
|  gg#####.##.####gg
|  gg####.....####gg
|  ggg####.g.####ggg
|  ggg#####.#####ggg
|   gg###########gg
|        ####
""")
    sol_traits(r, 68, 16, 62, 42)


def mehdi_dessin(r):
    # l'organisateur de la fête : grand et dégingandé, une écharpe qui flotte, un large sourire ; il tend à bout de
    # bras une guirlande de lampions, d'une main à l'autre, comme on présente une banderole
    cx = 44
    r(cx - 6, 30, cx + 6, 54, B); r(cx - 4, 32, cx + 4, 54, V); r(cx - 4, 42, cx + 4, 42, N)
    r(cx - 6, 29, cx + 6, 32, V); trait(r, [(cx + 4, 30), (cx + 14, 26), (cx + 22, 28)], 2, V, False)   # l'écharpe
    r(cx + 20, 27, cx + 24, 30, V)
    r(cx - 4, 54, cx - 1, 64, B); r(cx + 1, 54, cx + 4, 64, B); r(cx - 3, 55, cx - 2, 64, N); r(cx + 2, 55, cx + 3, 64, N)
    r(cx - 7, 64, cx - 1, 66, V); r(cx + 1, 64, cx + 7, 66, V)
    trait(r, [(cx - 6, 32), (cx - 16, 26), (cx - 26, 22)], 2, B)              # les bras grands ouverts
    trait(r, [(cx + 6, 34), (cx + 14, 38), (cx + 24, 36)], 2, B)
    pts = [(cx - 28 + k * 7, round(22 + 14 * math.sin(math.pi * k / 7.5))) for k in range(8)]   # la guirlande
    pts[-1] = (cx + 24, 36)
    for (a, b) in zip(pts, pts[1:]): ligne_r(r, a[0], a[1], b[0], b[1], B)
    for k, (x, y) in enumerate(pts[1:-1]):
        c = V if k % 2 else B
        r(x - 2, y + 1, x + 2, y + 7, N); r(x - 1, y + 1, x + 1, y + 7, c); r(x - 2, y + 3, x + 2, y + 5, c)
        r(x, y + 8, x, y + 9, c)
    r(cx - 2, 26, cx + 2, 29, B)
    sprite(r, cx - 9, 10, """
|      gg gg gg
|    ggggggggggggg
|   gggg.gggg.ggggg
|   gg.gggggggg.ggg
|   gg###########gg
|   g####.####.###g
|   g###.#.##.#.##g
|   ################.
|  .#######..######.#
|  #.#####.##.#####.
|   .####.####.####
|    ####.##..####
|    ###..........
|    ####.######.
|     ####......
|      #########
|        #####
""")
    sol_traits(r, 68, 18, 66, 43)


def sara_dessin(r):
    # l'ingénieure du câble : le ciré vert à capuche, des bottes ; un gros câble enroulé sur l'épaule, elle en colle
    # l'extrémité à son oreille, les yeux fermés, et écoute le grésillement (de petites ondes)
    cx = 36
    for y in range(30, 62):                                                  # le ciré
        hw = 7 + (y - 30) // 6
        r(cx - hw, y, cx + hw, y, V)
    r(cx - 1, 30, cx + 1, 61, N)
    for y in (38, 46, 54): r(cx - 4, y, cx - 3, y + 1, B); r(cx + 3, y, cx + 4, y + 1, B)
    r(cx - 5, 62, cx - 1, 67, B); r(cx + 1, 62, cx + 5, 67, B); r(cx - 5, 64, cx + 5, 64, N)
    for k, rr in enumerate((11, 9, 7)):                                       # le câble enroulé sur l'épaule
        for j in range(60):
            a = j * 2 * math.pi / 60
            x, y = round(cx + 12 + rr * math.cos(a)), round(36 + rr * 0.9 * math.sin(a))
            r(x, y, x + 1, y + 1, N)
        for j in range(60):
            a = j * 2 * math.pi / 60
            x, y = round(cx + 12 + rr * math.cos(a)), round(36 + rr * 0.9 * math.sin(a))
            r(x, y, x, y, B if k != 1 else V)
    trait(r, [(cx - 7, 32), (cx - 12, 26), (cx - 9, 18)], 2, B)               # le bout du câble à l'oreille
    pts = [(cx + 1, 44), (cx - 8, 46), (cx - 16, 40), (cx - 16, 26), (cx - 11, 18)]
    for (a, b) in zip(pts, pts[1:]): ligne_r(r, a[0], a[1], b[0], b[1], B, 2)
    r(cx - 12, 15, cx - 9, 19, V)
    for (a, b) in (((cx - 16, 12), (cx - 20, 10)), ((cx - 17, 16), (cx - 22, 16)), ((cx - 16, 20), (cx - 20, 22))):
        ligne_r(r, a[0], a[1], b[0], b[1], V)
    sprite(r, cx - 9, 6, """
|       ggggggg
|     ggggggggggg
|    ggggggggggggg
|   gggg.......gggg
|   ggg.#######.ggg
|   gg.#########.gg
|   gg.#########.gg
|   gg.##...#...#.gg
|   gg.###########.g
|   gg.######..###.g
|   gg.#####.##.##.g
|   ggg.###.####.#.g
|   ggg.###.......gg
|   gggg.###...##.gg
|   ggggg.#######ggg
|   gggggg.......ggg
|    ggggggggggggggg
""")
    sol_traits(r, 68, 16, 66, 44)


def rayan_dessin(r):
    # le bibliothécaire : lunettes rondes, le nez dans le livre qu'il lit en marchant ; sous l'autre bras, une pile
    # de livres numérisés qui tangue, un marque-page vert qui dépasse
    cx = 34
    r(cx - 7, 32, cx + 7, 54, B); r(cx - 5, 33, cx + 5, 54, V); r(cx, 33, cx, 54, N)       # le gilet
    for y in (37, 42, 47): r(cx - 2, y, cx - 2, y, B); r(cx + 2, y, cx + 2, y, B)
    trait(r, [(cx - 3, 54), (cx - 7, 66)], 3, B); trait(r, [(cx + 3, 54), (cx + 6, 66)], 3, B)   # il marche
    r(cx - 11, 66, cx - 6, 67, V); r(cx + 5, 66, cx + 10, 67, V)
    r(cx + 6, 18, cx + 24, 30, N); r(cx + 7, 19, cx + 14, 29, B); r(cx + 16, 19, cx + 23, 29, B); r(cx + 15, 19, cx + 15, 29, V)  # le livre ouvert
    for y in range(21, 29, 2): r(cx + 8, y, cx + 13, y, N); r(cx + 17, y, cx + 22, y, N)
    r(cx + 14, 30, cx + 15, 34, V)
    trait(r, [(cx + 6, 34), (cx + 10, 33), (cx + 9, 29)], 2, B)
    trait(r, [(cx - 7, 34), (cx - 11, 42), (cx - 8, 47)], 2, B)              # la pile sous le bras
    for k in range(6):
        y = 52 - k * 4; x = cx - 22 + (k % 3) - (1 if k == 4 else 0)
        r(x - 1, y - 1, x + 14, y + 3, N); r(x, y, x + 13, y + 2, V if k % 2 else B); r(x + 2, y + 1, x + 11, y + 1, B if k % 2 else N)
    r(cx - 19, 26, cx - 18, 31, V)
    sprite(r, cx - 9, 8, """
|      ########
|    ###.##.#####
|   ##############
|   #.##########.#
|   ##.ggg###ggg.##
|   ##g###g#g###g##
|   ##g..#ggg..#g###
|   ##g###g#g###g.#.#
|   ###ggg###ggg.###
|   #######.#####.#
|   ######.#######
|    ####.##..###
|    ####.......
|     ####.###.
|      ###...
|       #####
""")
    sol_traits(r, 68, 14, 62, 45)


def fama_dessin(r):
    # l'étudiante qui corrige : deux tresses relevées en macarons, un air malicieux ; elle brandit une copie barrée
    # d'une grande coche verte, le stylo vert dans l'autre main, le cartable bourré de copies à ses pieds
    cx = 34
    for y in range(32, 64):                                                  # la robe
        hw = 6 + (y - 32) // 5
        r(cx - hw, y, cx + hw, y, V)
    r(cx - 4, 32, cx + 4, 36, B); r(cx - 1, 33, cx + 1, 35, N); r(cx - 8, 46, cx + 8, 47, B)
    r(cx - 4, 64, cx - 1, 66, B); r(cx + 2, 64, cx + 5, 66, B)
    trait(r, [(cx + 6, 34), (cx + 12, 28), (cx + 14, 20)], 2, B)              # la copie brandie
    r(cx + 9, 4, cx + 27, 22, N); r(cx + 10, 5, cx + 26, 21, B)
    for y in range(7, 21, 2): r(cx + 12, y, cx + 24, y, N)
    for k in range(4): r(cx + 13 + k, 13 + k, cx + 14 + k, 15 + k, N); r(cx + 13 + k, 13 + k, cx + 14 + k, 14 + k, V)
    ligne_r(r, cx + 16, 16, cx + 25, 6, N, 3); ligne_r(r, cx + 16, 16, cx + 25, 6, V, 2)
    trait(r, [(cx - 6, 34), (cx - 11, 40), (cx - 13, 36)], 2, B)              # le stylo vert
    r(cx - 15, 28, cx - 13, 36, V); r(cx - 15, 28, cx - 13, 29, B); r(cx - 14, 37, cx - 14, 38, B)
    r(cx - 22, 52, cx - 6, 66, N); r(cx - 21, 53, cx - 7, 65, V); r(cx - 21, 53, cx - 7, 56, B)   # le cartable
    r(cx - 15, 56, cx - 13, 58, B)
    for (x, h) in ((cx - 20, 5), (cx - 17, 7), (cx - 12, 6), (cx - 9, 4)): r(x, 52 - h, x + 2, 52, B); r(x, 52 - h, x + 2, 52 - h, N)
    ligne_r(r, cx - 19, 52, cx - 14, 47, V); ligne_r(r, cx - 14, 47, cx - 9, 52, V)
    sprite(r, cx - 13, 6, """
|   ####            ####
|  #.##.#          #.##.#
|  #.##.#  ggggggg #.##.#
|   ####ggggggggggg####
|     ggggggggggggggg
|     ggg#########ggg
|     gg###########gg
|     g###..###..###g
|     g##.#.##.#.###
|     g###..###..###
|     .######..#####.
|     #.####.##.###.#
|      .###.####.##.
|       ##.##...#.#
|       ###.....##
|        ###...##
|         ######
""")
    sol_traits(r, 68, 14, 66, 46)


PORTRAITS = {
    "item_badis.gif": badis_dessin, "item_maeva.gif": maeva_dessin, "item_younes.gif": younes_dessin,
    "item_syrine.gif": syrine_dessin, "item_noam.gif": noam_dessin, "item_zelia.gif": zelia_dessin,
    "item_kamal.gif": kamal_dessin, "item_lamia.gif": lamia_dessin, "item_miguel.gif": miguel_dessin,
    "item_amina.gif": amina_dessin,
    "item_ilyes.gif": ilyes_dessin, "item_clara.gif": clara_dessin, "item_mehdi.gif": mehdi_dessin,
    "item_sara.gif": sara_dessin, "item_rayan.gif": rayan_dessin, "item_fama.gif": fama_dessin,
}


def billet_traversee(nom="item_billet_traversee.gif"):
    """La septième enveloppe : un pli scellé d'un cachet à l'ancre, un billet de traversée à souche qui dépasse,
    perforé, frappé d'un petit navire, et une ligne de vagues."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.rectangle([30, 0, 56, 13], fill=V)                                                     # le billet qui dépasse
    d.rectangle([32, 2, 54, 11], fill=N)
    for y in range(2, 12, 2):
        d.point((41, y), fill=V)                                                             # la perforation de la souche
    d.polygon([(44, 8), (52, 8), (50, 10), (45, 10)], fill=V)                                # un petit navire
    d.line([(48, 3), (48, 8)], fill=V); d.polygon([(49, 4), (52, 6), (49, 7)], fill=B)
    d.line([(34, 5), (39, 5)], fill=V); d.line([(34, 8), (38, 8)], fill=V)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 8):                                                                # des vagues
        d.arc([x, 33, x + 8, 39], 180, 360, fill=V)
    d.ellipse([17, 13, 42, 36], fill=B)                                                      # l'ancre, sur le pli
    d.ellipse([26, 10, 33, 16], outline=N, width=2)
    d.rectangle([29, 16, 30, 31], fill=N)
    d.rectangle([24, 18, 35, 19], fill=N)
    d.rectangle([23, 17, 24, 20], fill=N); d.rectangle([35, 17, 36, 20], fill=N)
    d.arc([20, 20, 39, 34], 20, 160, fill=N, width=2)
    d.polygon([(19, 24), (23, 26), (19, 28)], fill=N); d.polygon([(40, 24), (36, 26), (40, 28)], fill=N)
    d.rectangle([3, 36, 56, 38], fill=B)
    for x in range(4, 56, 8):                                                                # les vagues, devant
        d.arc([x, 35, x + 8, 39], 180, 360, fill=V)
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
