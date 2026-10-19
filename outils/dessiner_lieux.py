"""Dessine les lieux du réseau de l'école en pixel art 1 bit (noir, vert, blanc), dans le cadre des images d'origine."""
from PIL import Image, ImageDraw
import random, os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Web', 'static', 'img') + '/'
OUT = os.environ.get('OUT', SRC)
N, V, B = 0, 1, 2
PAL = [0,0,0, 34,177,76, 255,255,255] + [0,0,0]*253
W, H = 176, 170  # zone intérieure, en pixels logiques (x2 à l'écran)

def cadre():
    im = Image.open(SRC + 'loc_cluster.gif').convert('RGB')
    d = ImageDraw.Draw(im)
    d.rectangle([32, 32, 383, 371], fill=(0, 0, 0))
    return im

def toile():
    im = Image.new('P', (W, H), N); im.putpalette(PAL); return im, ImageDraw.Draw(im)

def finir(nom, im):
    big = im.resize((W*2, H*2), Image.NEAREST).convert('RGB')
    fond = cadre(); fond.paste(big, (32, 32))
    p = fond.quantize(palette=_palimg(), dither=Image.Dither.NONE)
    p.save(OUT + nom)

def _palimg():
    p = Image.new('P', (1, 1)); p.putpalette(PAL); return p

def boite(d, x0, y0, x1, y1, c=B, fond=N, ep=1):
    d.rectangle([x0, y0, x1, y1], fill=c)
    d.rectangle([x0+ep, y0+ep, x1-ep, y1-ep], fill=fond)

def ecran(d, x, y, w, h, contenu=None):
    # moniteur cathodique avec profondeur, comme les images d'origine
    d.polygon([(x+w, y+2), (x+w+5, y+5), (x+w+5, y+h+3), (x+w, y+h)], fill=B)
    boite(d, x, y, x+w, y+h, B, N, 2)
    boite(d, x+4, y+4, x+w-4, y+h-6, B, N, 1)
    if contenu == 'invite':
        d.line([(x+7, y+8), (x+9, y+10), (x+7, y+12)], fill=V)
        d.line([(x+11, y+12), (x+15, y+12)], fill=V)
    elif contenu == 'lignes':
        for k in range(3): d.line([(x+7, y+8+k*3), (x+w-8-((k*5) % 9), y+8+k*3)], fill=V)
    # pied
    d.rectangle([x+w//2-4, y+h+1, x+w//2+4, y+h+4], fill=B)
    d.rectangle([x+w//2-9, y+h+5, x+w//2+9, y+h+6], fill=B)

def clavier(d, x, y, w):
    d.polygon([(x, y), (x+w, y), (x+w+4, y+6), (x+4, y+6)], fill=B)
    for k in range(x+2, x+w, 3): d.point((k+2, y+2), fill=N); d.point((k+3, y+4), fill=N)

def table(d, x0, x1, y):
    d.rectangle([x0, y, x1, y+2], fill=B)
    d.rectangle([x0+3, y+3, x0+5, y+22], fill=B)
    d.rectangle([x1-5, y+3, x1-3, y+22], fill=B)

def sol(d, y):
    for k in range(0, W, 6): d.line([(k, y), (k+3, y)], fill=B)

# --- labo : trois postes, un tableau blanc, un écran resté allumé ---
def labo():
    im, d = toile()
    boite(d, 30, 8, 146, 52, B, N, 2)
    d.text((38, 13), "who", fill=V); d.text((38, 25), "last", fill=V); d.text((38, 37), "vimtuteur", fill=B)
    d.line([(96, 14), (136, 14)], fill=B); d.line([(96, 22), (126, 22)], fill=B); d.ellipse([92, 30, 140, 48], outline=V)
    table(d, 4, 172, 118)
    for i, x in enumerate([10, 66, 122]):
        ecran(d, x, 82, 38, 30, 'invite' if i == 2 else None)
        clavier(d, x+2, 112, 32)
    sol(d, 150)
    return im

# --- web : une fenêtre de navigateur, et une page piégée dans uploads ---
def web():
    im, d = toile()
    boite(d, 12, 12, 164, 150, B, N, 2)
    d.rectangle([14, 14, 162, 26], fill=B)
    for k, c in enumerate([N, N, N]): d.ellipse([18+k*8, 17, 23+k*8, 22], fill=c)
    boite(d, 46, 16, 158, 24, N, B, 1)
    d.text((50, 16), "http://web/", fill=N)
    d.rectangle([24, 36, 110, 46], fill=V)
    for k in range(4): d.line([(24, 56+k*8), (150-(k*17) % 40, 56+k*8)], fill=B)
    boite(d, 24, 96, 70, 140, B, N, 1); boite(d, 78, 96, 124, 140, B, N, 1)
    # le fichier piégé, avec son cadenas (attribut immuable)
    d.polygon([(130, 98), (148, 98), (154, 104), (154, 140), (130, 140)], fill=B)
    d.polygon([(148, 98), (148, 104), (154, 104)], fill=N)
    d.text((133, 108), "php", fill=N)
    boite(d, 136, 124, 148, 136, N, V, 1); d.arc([138, 118, 146, 128], 180, 360, fill=V)
    return im

# --- mail : une pile d'enveloppes, une ouverte avec sa pièce jointe ---
def mail():
    im, d = toile()
    for k in range(4):
        x, y = 22+k*6, 30+k*8
        boite(d, x, y, x+80, y+50, B, N, 2)
        d.line([(x, y), (x+40, y+26), (x+80, y)], fill=B, width=2)
    x, y = 70, 70
    boite(d, x, y, x+90, y+60, B, N, 2)
    d.polygon([(x, y), (x+45, y-34), (x+90, y)], outline=B)
    d.line([(x, y), (x+45, y-34)], fill=B, width=2); d.line([(x+45, y-34), (x+90, y)], fill=B, width=2)
    d.text((x+38, y+24), "@", fill=V)
    # la pièce jointe qui dépasse : un trombone et un .sh
    d.rectangle([x+58, y-26, x+84, y-4], fill=B); d.text((x+61, y-22), ".sh", fill=N)
    d.arc([x+50, y-34, x+60, y-10], 90, 270, fill=V, width=2)
    sol(d, 150)
    return im

# --- dns : un panneau indicateur, les noms d'un côté, les adresses de l'autre ---
def dns():
    im, d = toile()
    d.rectangle([84, 20, 90, 150], fill=B)
    panneaux = [("web", 26, 1), ("mail", 52, -1), ("labo", 78, 1), ("maj?", 104, -1)]
    for nom, y, sens in panneaux:
        c = V if nom == "maj?" else B
        if sens == 1:
            d.polygon([(92, y), (150, y), (162, y+9), (150, y+18), (92, y+18)], fill=c)
            d.text((98, y+4), nom, fill=N)
        else:
            d.polygon([(82, y), (24, y), (12, y+9), (24, y+18), (82, y+18)], fill=c)
            d.text((30, y+4), nom, fill=N)
    d.polygon([(70, 150), (104, 150), (96, 140), (78, 140)], fill=B)
    sol(d, 152)
    return im

# --- pare-feu : un mur de briques, une seule porte, gardée ---
def parefeu():
    im, d = toile()
    for rang in range(9):
        y = 40 + rang*12
        decal = 0 if rang % 2 == 0 else 10
        for x in range(-10+decal, W, 20):
            d.rectangle([x, y, x+18, y+10], outline=B)
    d.rectangle([72, 88, 104, 148], fill=N)
    boite(d, 72, 88, 104, 148, B, N, 2)
    for x in range(78, 102, 6): d.line([(x, 92), (x, 146)], fill=V, width=2)
    # des flammes vertes au-dessus du mur
    random.seed(7)
    for x in range(4, W-4, 10):
        h = random.randint(10, 26)
        d.polygon([(x, 38), (x+5, 38-h), (x+10, 38)], fill=V)
    return im

# --- badgeuse : un portillon et son lecteur, le badge passe ---
def badgeuse():
    im, d = toile()
    boite(d, 20, 50, 60, 140, B, N, 2)
    boite(d, 116, 50, 156, 140, B, N, 2)
    d.rectangle([60, 86, 116, 90], fill=B)
    boite(d, 28, 60, 52, 84, B, N, 1); d.rectangle([36, 92, 44, 98], fill=V)
    # le badge
    boite(d, 66, 20, 104, 44, B, B, 1); d.rectangle([70, 24, 80, 36], fill=N); d.text((84, 26), "047", fill=N)
    d.line([(85, 44), (85, 60)], fill=V); d.line([(85, 60), (52, 72)], fill=V)
    sol(d, 152)
    return im

# --- imprimante : la machine et la feuille oubliée ---
def imprimante():
    im, d = toile()
    boite(d, 30, 70, 146, 120, B, N, 2)
    d.polygon([(30, 70), (46, 56), (130, 56), (146, 70)], fill=B)
    d.rectangle([40, 120, 136, 128], fill=B)
    d.rectangle([118, 80, 126, 86], fill=V)
    # la feuille qui sort, avec du texte
    d.rectangle([50, 18, 126, 62], fill=B)
    for k in range(5): d.line([(56, 24+k*7), (118-(k*13) % 30, 24+k*7)], fill=N)
    d.rectangle([52, 128, 124, 150], fill=B)
    for k in range(3): d.line([(58, 134+k*5), (110, 134+k*5)], fill=N)
    return im

# --- sauvegarde : une armoire de disques et des bandes ---
def sauvegarde():
    im, d = toile()
    boite(d, 24, 14, 110, 156, B, N, 2)
    for k in range(6):
        y = 22 + k*22
        boite(d, 30, y, 104, y+16, B, N, 1)
        d.rectangle([94, y+6, 98, y+10], fill=V if k % 2 == 0 else B)
        for x in range(36, 84, 6): d.line([(x, y+4), (x, y+12)], fill=B)
    for k, y in enumerate([40, 84, 128]):
        d.ellipse([122, y, 152, y+30], outline=B, width=2)
        d.ellipse([132, y+10, 142, y+20], fill=V if k == 1 else B)
    return im

# --- poste-47 : un poste ordinaire, un sweat du BDE sur la chaise ---
def poste():
    im, d = toile()
    table(d, 10, 120, 108)
    ecran(d, 26, 66, 46, 36, 'lignes')
    clavier(d, 30, 102, 38)
    # la chaise et le sweat
    d.rectangle([130, 60, 160, 66], fill=B); d.rectangle([132, 66, 158, 108], outline=B, width=2)
    d.polygon([(128, 70), (162, 70), (166, 96), (124, 96)], fill=V)
    d.text((136, 76), "BDE", fill=N)
    d.rectangle([140, 108, 150, 112], fill=B); d.line([(132, 140), (145, 112), (158, 140)], fill=B, width=2)
    # la clé USB oubliée
    d.rectangle([84, 98, 96, 104], fill=V); d.rectangle([96, 99, 100, 103], fill=B)
    sol(d, 150)
    return im

if __name__ == "__main__":
    for nom, f in [("loc_labo.gif", labo), ("loc_web.gif", web), ("loc_mail.gif", mail), ("loc_dns.gif", dns), ("loc_parefeu.gif", parefeu),
                   ("loc_badgeuse.gif", badgeuse), ("loc_imprimante.gif", imprimante), ("loc_sauvegarde.gif", sauvegarde), ("loc_poste.gif", poste)]:
        finir(nom, f())
    print("ok")

# --- les deux enveloppes du premier lancement ---
def enveloppe(nom, mission):
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    if mission:
        # liseré « urgent » et tampon de la WarRoom
        for x in range(2, 58, 6): d.rectangle([x, 6, x+2, 7], fill=V); d.rectangle([x+3, 38, x+5, 39], fill=V)
        d.rectangle([40, 9, 54, 19], outline=V); d.line([(42, 12), (52, 12)], fill=V); d.line([(42, 16), (49, 16)], fill=V)
    else:
        d.ellipse([24, 19, 35, 30], fill=V); d.point((29, 24), fill=N); d.point((30, 24), fill=N)
    im.resize((w*2, h*2), Image.NEAREST).save(OUT + nom)

if __name__ == "__main__":
    # la Convocation est redessinée avec les images du chapitre 1 (outils/dessiner_terminus.py)
    import dessiner_terminus
    dessiner_terminus.sauver_petit("item_convocation.gif", dessiner_terminus.enveloppe_convocation())
    enveloppe("item_mission.gif", True)

# ------------------------------------------------------------------
# Cybersup, la Crypte et les dossiers système
# ------------------------------------------------------------------

def texte_centre(d, y, t, c=B):
    w = d.textlength(t)
    d.text(((W - w) / 2, y), t, fill=c)

def cybersup():
    # redessinée dans le style du chapitre 8 avec les images du chapitre 1 : outils/dessiner_terminus.py
    import dessiner_terminus
    return dessiner_terminus.cybersup()

def sallereseau():
    im, d = toile()
    boite(d, 34, 10, 142, 150, B, N, 2)
    for r in range(6):
        y = 18 + r*22
        boite(d, 40, y, 136, y+12, B, N, 1)
        for k in range(10):
            x = 44 + k*9
            d.rectangle([x, y+4, x+4, y+8], fill=V if (r*3 + k) % 4 == 0 else B)
    random.seed(3)
    for _ in range(9):
        x0, x1 = random.randint(44, 132), random.randint(44, 132)
        y0 = random.choice([30, 52, 74, 96, 118])
        d.arc([min(x0, x1), y0-4, max(x0, x1)+6, y0+18], 0, 180, fill=random.choice([B, V]), width=1)
    return im

def salleserveurs():
    im, d = toile()
    d.polygon([(0, 150), (70, 96), (106, 96), (176, 150)], outline=B)
    for k in range(0, 5):
        x0 = 6 + k*14; h = 100 - k*14; y0 = 150 - h - (k*6)
        d.rectangle([x0, y0, x0+12, y0+h], outline=B)
        for y in range(y0+4, y0+h-2, 6): d.point((x0+4, y), fill=V if (y // 6 + k) % 3 == 0 else B)
        x1 = 176 - 18 - k*14
        d.rectangle([x1, y0, x1+12, y0+h], outline=B)
        for y in range(y0+4, y0+h-2, 6): d.point((x1+8, y), fill=V if (y // 6 + k) % 2 == 0 else B)
    d.rectangle([76, 60, 100, 96], outline=B); d.line([(88, 60), (88, 96)], fill=B)
    return im

def baie():
    im, d = toile()
    boite(d, 50, 8, 126, 156, B, N, 2)
    for r in range(9):
        y = 14 + r*15
        boite(d, 56, y, 120, y+11, B, N, 1)
        d.rectangle([60, y+4, 63, y+7], fill=V if r % 3 != 1 else B)
        d.rectangle([66, y+4, 69, y+7], fill=B)
        for x in range(76, 116, 4): d.point((x, y+5), fill=B)
    return im

def bde():
    im, d = toile()
    d.rectangle([10, 14, 166, 30], fill=B); texte_centre(d, 17, "BUREAU DES ELEVES", N)
    d.line([(20, 44), (156, 44)], fill=B, width=2)
    for k, x in enumerate([24, 58, 92, 126]):
        c = V if k % 2 == 0 else B
        d.line([(x+14, 44), (x+14, 50)], fill=B)
        d.polygon([(x, 54), (x+28, 54), (x+32, 72), (x+26, 70), (x+26, 96), (x+2, 96), (x+2, 70), (x-4, 72)], fill=c)
        d.text((x+5, 66), "BDE", fill=N)
    d.rectangle([24, 120, 152, 138], outline=B, width=2); d.rectangle([20, 112, 30, 140], fill=B); d.rectangle([146, 112, 156, 140], fill=B)
    sol(d, 150)
    return im

def bureau():
    im, d = toile()
    boite(d, 120, 10, 166, 100, B, N, 2)
    for y in (32, 56, 80):
        d.line([(122, y), (164, y)], fill=B)
        for x in range(126, 160, 6): d.rectangle([x, y-16, x+3, y-1], fill=V if (x + y) % 4 == 0 else B)
    table(d, 8, 112, 104)
    d.polygon([(30, 104), (70, 104), (66, 86), (34, 86)], fill=B); d.rectangle([36, 88, 64, 102], fill=N)
    d.line([(40, 92), (56, 92)], fill=V); d.line([(40, 96), (50, 96)], fill=V)
    d.rectangle([72, 90, 112, 103], fill=B); d.text((74, 91), "Laurent", fill=N)
    d.rectangle([12, 92, 22, 103], outline=B); d.arc([18, 94, 26, 100], 270, 90, fill=B)
    d.ellipse([8, 60, 30, 84], fill=V); d.rectangle([14, 84, 24, 103], fill=B)
    sol(d, 150)
    return im

def lille():
    im, d = toile()
    d.rectangle([74, 40, 102, 150], outline=B, width=2)
    d.polygon([(70, 40), (88, 8), (106, 40)], fill=B)
    d.ellipse([80, 50, 96, 66], outline=B); d.line([(88, 58), (88, 52)], fill=V); d.line([(88, 58), (92, 58)], fill=V)
    for y in range(76, 146, 14): d.rectangle([84, y, 92, y+8], outline=B)
    for x0 in (10, 120):
        for k in range(3):
            x = x0 + k*16
            d.polygon([(x, 150), (x, 110), (x+8, 98), (x+16, 110), (x+16, 150)], outline=B)
    sol(d, 152)
    return im

def marseille():
    im, d = toile()
    d.ellipse([124, 14, 156, 46], outline=V, width=2)
    d.rectangle([20, 40, 34, 118], outline=B, width=2); d.polygon([(16, 40), (27, 26), (38, 40)], fill=B)
    for y in range(48, 116, 12): d.line([(20, y), (34, y)], fill=B)
    for k in range(4): d.line([(0, 122 + k*8), (W, 122 + k*8)], fill=V if k % 2 == 0 else B)
    for x in (58, 104):
        d.polygon([(x, 116), (x+40, 116), (x+34, 124), (x+6, 124)], fill=B)
        d.line([(x+20, 116), (x+20, 80)], fill=B); d.polygon([(x+21, 82), (x+36, 112), (x+21, 112)], fill=B)
    return im

def coffre():
    im, d = toile()
    d.ellipse([28, 10, 148, 130], outline=B, width=3)
    d.ellipse([40, 22, 136, 118], outline=B, width=1)
    d.ellipse([78, 60, 98, 80], fill=V)
    for a in range(0, 360, 45):
        import math
        x = 88 + 30 * math.cos(math.radians(a)); y = 70 + 30 * math.sin(math.radians(a))
        d.line([(88, 70), (x, y)], fill=B, width=2)
    d.rectangle([138, 60, 146, 80], fill=B)
    d.rectangle([70, 136, 106, 140], fill=B); d.rectangle([74, 118, 102, 136], outline=B); d.line([(74, 140), (70, 156)], fill=B); d.line([(102, 140), (106, 156)], fill=B)
    return im

def crypte():
    im, d = toile()
    for k in range(3):
        m = 14 + k*22
        d.arc([m, 6 + k*18, W-m, 120 + k*10], 180, 360, fill=B, width=2)
        d.line([(m, 63 + k*14), (m, 160)], fill=B, width=2); d.line([(W-m, 63 + k*14), (W-m, 160)], fill=B, width=2)
    for k in range(7):
        y = 104 + k*8; x0 = 70 - k*6; x1 = 106 + k*6
        d.rectangle([x0, y, x1, y+3], fill=B)
    for x in (40, 136):
        d.rectangle([x-2, 70, x+2, 84], fill=B); d.polygon([(x-5, 70), (x, 56), (x+5, 70)], fill=V)
    return im

def binaires():
    im, d = toile()
    for r, y in enumerate([36, 86, 136]):
        d.rectangle([10, y, 166, y+3], fill=B)
    noms = ["gardien", "portier", "veilleur", "passwd"]
    for k, nom in enumerate(noms):
        x = 14 + k*40; y = 6 if k < 2 else 56
        y = [8, 8, 58, 58][k]; x = [16, 92, 16, 92][k]
        boite(d, x, y, x+68, y+28, B, N, 1)
        d.text((x+6, y+8), nom, fill=V if nom == "gardien" else B)
        if nom == "gardien": d.text((x+58, y+8), "!", fill=V)
    boite(d, 16, 108, 160, 134, B, N, 1); d.text((22, 116), "SHA256SUMS", fill=B)
    return im

def caveau():
    im, d = toile()
    d.arc([0, 10, W, 130], 180, 360, fill=B, width=2)
    for k in range(6):
        x = 8 + k*28
        d.rectangle([x, 70, x+20, 120], outline=B)
        d.arc([x, 60, x+20, 80], 180, 360, fill=B)
        d.line([(x+4, 76), (x+16, 116)], fill=B); d.line([(x+16, 76), (x+4, 116)], fill=B)
    # une porte que personne n'a construite, à peine visible
    for y in range(126, 158, 4): d.point((80, y), fill=V); d.point((96, y), fill=V)
    for x in range(80, 98, 4): d.point((x, 126), fill=V)
    sol(d, 160)
    return im

def racine():
    im, d = toile()
    random.seed(11)
    for _ in range(9):
        x = random.randint(6, 170); y = 0
        for _ in range(8):
            nx = x + random.randint(-8, 8); ny = y + random.randint(8, 16)
            d.line([(x, y), (nx, ny)], fill=B, width=2); x, y = nx, ny
    for k in range(7):
        x, y = 20 + k*21, 110 + (k % 2) * 16
        d.ellipse([x, y, x+8, y+6], fill=V if k == 4 else B)
        d.line([(x+2, y), (x-1, y-4)], fill=B); d.line([(x+6, y), (x+9, y-4)], fill=B)
    d.text((60, 146), "[kworker]", fill=B)
    return im

def etc_():
    im, d = toile()
    boite(d, 40, 10, 136, 156, B, N, 2)
    for k, nom in enumerate(["passwd", "shadow", "group", "sudoers"]):
        y = 18 + k*34
        boite(d, 46, y, 130, y+28, B, N, 1)
        d.rectangle([80, y+18, 96, y+22], fill=B)
        d.text((54, y+4), nom, fill=V if nom == "sudoers" else B)
    return im

def journaux():
    im, d = toile()
    for k in range(5):
        x, y = 14 + k*8, 120 - k*20
        boite(d, x, y, x+120, y+30, B, N, 1)
        for l in range(3): d.line([(x+6, y+7+l*7), (x+100-l*13, y+7+l*7)], fill=V if (k == 2 and l == 1) else B)
    d.rectangle([20, 140, 74, 148], fill=N); d.text((22, 139), "auth.log", fill=V)
    return im

def tmp_():
    im, d = toile()
    random.seed(5)
    for _ in range(14):
        x, y = random.randint(10, 150), random.randint(70, 140)
        d.polygon([(x, y), (x+14, y-3), (x+18, y+8), (x+4, y+12)], outline=B)
    d.polygon([(66, 60), (110, 60), (104, 120), (72, 120)], outline=B, width=2)
    d.line([(62, 60), (114, 60)], fill=B, width=2)
    d.text((76, 40), "/tmp", fill=V)
    sol(d, 150)
    return im

if __name__ == "__main__":
    for nom, f in [("loc_cybersup.gif", cybersup), ("loc_sallereseau.gif", sallereseau), ("loc_salleserveurs.gif", salleserveurs), ("loc_baie.gif", baie),
                   ("loc_bde.gif", bde), ("loc_bureau.gif", bureau), ("loc_lille.gif", lille), ("loc_marseille.gif", marseille), ("loc_coffre.gif", coffre),
                   ("loc_crypte.gif", crypte), ("loc_bin.gif", binaires), ("loc_caveau.gif", caveau), ("loc_racine.gif", racine),
                   ("loc_etc.gif", etc_), ("loc_journaux.gif", journaux), ("loc_tmp.gif", tmp_)]:
        finir(nom, f())
    print("ok 2")

# --- le Corbeau, pour la scène où on le démasque ---
def corbeau():
    from PIL import ImageFilter, ImageChops
    im, d = toile()
    # un corbeau noir, perché de profil sur une branche : une silhouette pleine, puis creusée pour n'en garder que le trait
    masque = Image.new('L', (W, H), 0); m = ImageDraw.Draw(masque)
    m.polygon([(60, 70), (84, 56), (112, 60), (126, 78), (122, 100), (100, 116), (74, 118), (52, 108), (40, 92)], fill=255)
    m.polygon([(52, 100), (14, 138), (26, 140), (12, 152), (48, 134), (76, 116)], fill=255)
    m.ellipse([100, 28, 142, 64], fill=255)
    m.polygon([(134, 36), (168, 46), (136, 54)], fill=255)
    interieur = masque.filter(ImageFilter.MinFilter(5))
    trait = ImageChops.subtract(masque, interieur)
    d.bitmap((0, 0), trait, fill=B)
    for k in range(5):
        d.line([(64 + k*9, 76 + k*2), (44 + k*11, 108 + k)], fill=B)
    d.line([(136, 45), (160, 46)], fill=B)
    d.ellipse([122, 38, 129, 45], fill=V)
    d.line([(4, 132), (172, 122)], fill=B, width=3)
    d.line([(132, 124), (150, 110)], fill=B, width=2)
    d.line([(88, 116), (86, 129)], fill=B, width=2); d.line([(100, 114), (102, 127)], fill=B, width=2)
    return im

if __name__ == "__main__":
    # item_corbeau.gif est dessiné par dessiner_panne.py (corbeau_dessin), au pixel près comme les personnages d'origine.
    print("ok 3")


if __name__ == "__main__":
    # Les lieux des chapitres 2 et 3 ont été redessinés dans le style épais du chapitre 1 : dessiner_fantasy.py a le dernier mot.
    import dessiner_fantasy
    for _nom, _dessin in dessiner_fantasy.DESSINS.items():
        finir(_nom, _dessin())
