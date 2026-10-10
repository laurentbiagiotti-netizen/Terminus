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

enveloppe("item_convocation.gif", False)
enveloppe("item_mission.gif", True)
