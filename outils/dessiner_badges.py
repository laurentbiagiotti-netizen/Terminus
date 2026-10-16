"""Dessine les badges de compétence (chapitres 2, 3, 4 et 5) : des médailles en pixels, une couleur par rang.

Bronze, argent, or et platine, comme les rangs d'un tableau de trophées ; le dessin est propre au jeu :
une médaille hexagonale, deux rubans, et au centre le sigle de la compétence (OSI, DNS, SUID...).
Sortie : Web/static/img/badge_<id>.gif (80 x 80, pixels nets).
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Web', 'static', 'img')
RANGS = {
    'bronze':  [(200, 128, 58), (120, 70, 28), (240, 180, 120)],
    'argent':  [(201, 209, 217), (110, 118, 126), (245, 248, 250)],
    'or':      [(242, 201, 76), (150, 110, 20), (255, 236, 160)],
    'platine': [(167, 216, 255), (70, 120, 170), (230, 245, 255)],
}
BADGES = [
    # chapitre 2 : la panne
    ('r_osi', 'OSI', 'or'), ('r_lien', 'ETH', 'bronze'), ('r_ip', 'IP', 'bronze'), ('r_passerelle', 'GW', 'bronze'),
    ('r_dns', 'DNS', 'argent'), ('r_dhcp', 'DHCP', 'argent'), ('r_netplan', 'YAML', 'argent'), ('r_web', ':80', 'bronze'),
    ('r_https', 'TLS', 'argent'), ('r_smtp', 'FW', 'argent'), ('r_lille', 'RTE', 'argent'), ('r_telnet', 'SSH', 'or'),
    ('r_wifi', 'RF', 'bronze'), ('r_ssid', 'SSID', 'or'), ('r_plan', '/26', 'argent'), ('r_forward', 'FWD', 'argent'),
    ('r_zone', 'ZONE', 'argent'), ('r_prise', 'PORT', 'bronze'), ('r_debit', 'MB/S', 'argent'),
    ('platine_reseau', 'NET', 'platine'),
    # chapitre 3 : la chasse au Corbeau
    ('c_crypte', '?', 'bronze'), ('c_integrite', 'SHA', 'bronze'), ('c_message', 'B64', 'bronze'), ('c_suid', 'SUID', 'argent'),
    ('c_racine', 'ROOT', 'or'), ('c_ecoute', 'PORT', 'argent'), ('c_journaux', 'LOG', 'argent'), ('c_carto', 'MAP', 'argent'),
    ('c_labo', 'PTS', 'bronze'), ('c_service', 'SVC', 'argent'), ('c_web', '+i', 'bronze'), ('c_mail', '@', 'bronze'),
    ('c_dns', 'DNS', 'bronze'), ('c_parefeu', 'UFW', 'bronze'), ('c_compte', 'UID0', 'argent'), ('c_sudo', 'SUDO', 'argent'),
    ('c_cle', 'KEY', 'argent'), ('c_coffre', 'PUB', 'bronze'), ('c_preuves', 'HASH', 'argent'), ('c_gpg', 'GPG', 'or'),
    ('c_corbeau', '!', 'or'), ('platine_cyber', 'SOC', 'platine'),
    # chapitre 4 : l'Académie des Arcanes
    ('d_frances', 'AVIS', 'bronze'), ('d_runes_traces', 'GREP', 'bronze'), ('d_runes_ioc', 'IOC', 'argent'),
    ('d_awk_volume', 'SUM', 'bronze'), ('d_awk_victimes', 'TOP3', 'argent'), ('d_sed_anonymiser', 'RGPD', 'argent'),
    ('d_sed_desarmer', 'SED', 'argent'), ('d_jq_alertes', 'JQ', 'bronze'), ('d_jq_rapport', 'CSV', 'argent'),
    ('d_alchimie_fantomes', 'LOCK', 'argent'), ('d_alchimie_quarantaine', 'CAGE', 'argent'), ('d_chrono_bombe', 'T-0', 'or'),
    ('d_chrono_sauvegarde', 'CRON', 'bronze'), ('d_archives_restaurer', 'SYNC', 'or'), ('d_archives_patch', 'DIFF', 'argent'),
    ('d_script_nettoyage', 'SH', 'bronze'), ('d_script_arguments', '$1', 'argent'), ('d_corbeau', 'STOP', 'or'),
    ('platine_ch4', 'IR', 'platine'),
    # chapitre 5 : le Bastion
    ('tour_herse', 'PASS', 'argent'), ('tour_sceau', 'SUDO', 'argent'), ('tour_pontlevis', 'SSH', 'or'), ('tour_portes', 'OFF', 'argent'),
    ('tour_remparts', 'DENY', 'or'), ('tour_coffres', 'PERM', 'argent'), ('tour_coeur', 'KRNL', 'argent'), ('tour_poterne', 'GRUB', 'bronze'),
    ('tour_banniere', 'HTTP', 'argent'), ('tour_guet', 'LOGS', 'or'), ('tour_sceaux', 'AIDE', 'argent'), ('tour_garde', 'BAN', 'bronze'),
    ('h_pierre', 'SCAN', 'bronze'), ('h_aube', 'AUBE', 'or'), ('h_rapport', 'DOC', 'or'), ('s_h_avant_quatre', '4H', 'or'),
    ('platine_ch5', 'HARD', 'platine'),
]
NOIR = (0, 0, 0)
# Une police de 3 x 5 pixels, pour les sigles de quatre caractères.
PETITE_POLICE = {
    'A': ['###', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'], 'C': ['###', '#..', '#..', '#..', '###'],
    'D': ['##.', '#.#', '#.#', '#.#', '##.'], 'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['###', '#..', '#.#', '#.#', '###'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'], 'I': ['###', '.#.', '.#.', '.#.', '###'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#.#', '###', '###', '#.#', '#.#'],
    'N': ['##.', '#.#', '#.#', '#.#', '#.#'], 'O': ['###', '#.#', '#.#', '#.#', '###'], 'P': ['###', '#.#', '###', '#..', '#..'],
    'R': ['##.', '#.#', '##.', '#.#', '#.#'], 'S': ['###', '#..', '###', '..#', '###'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '3': ['###', '..#', '.##', '..#', '###'], '/': ['..#', '..#', '.#.', '#..', '#..'],
    '?': ['###', '..#', '.#.', '...', '.#.'],
}
BLANC = (242, 242, 242)


def hexagone(cx, cy, r):
    return [(cx, cy - r), (cx + r * 0.87, cy - r / 2), (cx + r * 0.87, cy + r / 2), (cx, cy + r), (cx - r * 0.87, cy + r / 2), (cx - r * 0.87, cy - r / 2)]


def badge(sigle, rang):
    clair, sombre, eclat = RANGS[rang]
    im = Image.new('RGB', (40, 40), NOIR)
    d = ImageDraw.Draw(im)
    # les deux rubans, derrière la médaille
    d.polygon([(12, 26), (17, 26), (15, 39), (12, 36), (9, 39)], fill=sombre)
    d.polygon([(23, 26), (28, 26), (31, 39), (28, 36), (25, 39)], fill=sombre)
    # la médaille : un hexagone à bord épais, un reflet, un cœur noir
    d.polygon(hexagone(20, 18, 17), fill=clair)
    d.polygon(hexagone(20, 18, 14), fill=sombre)
    d.polygon(hexagone(20, 18, 12), fill=NOIR)
    d.line([(9, 9), (18, 3)], fill=eclat, width=1)
    if rang == 'platine':
        for x, y in [(4, 4), (35, 6), (36, 30), (3, 31)]:
            d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=eclat)
    # le sigle, en pixels nets (sans lissage)
    masque = Image.new('1', (40, 40), 0)
    dm = ImageDraw.Draw(masque)
    if len(sigle) >= 4:
        # Quatre caractères ne tiennent pas dans le cœur noir avec la police : une petite police maison de 3 x 5 pixels.
        larg = len(sigle) * 4 - 1
        x0, y0 = 20 - larg // 2, 16
        for k, ch in enumerate(sigle):
            for y, ligne in enumerate(PETITE_POLICE.get(ch, PETITE_POLICE['?'])):
                for x, p in enumerate(ligne):
                    if p == '#':
                        dm.point((x0 + k * 4 + x, y0 + y), fill=1)
        im.paste(Image.new('RGB', (40, 40), BLANC if rang != 'or' else eclat), (0, 0), masque)
        return im.resize((80, 80), Image.NEAREST)
    police = ImageFont.load_default()
    try:
        police = ImageFont.load_default(size=9 if len(sigle) >= 4 else 10)
    except TypeError:
        pass
    dm.fontmode = '1'
    l, t, r, b = dm.textbbox((0, 0), sigle, font=police)
    dm.text((20 - (r - l) / 2 - l, 18 - (b - t) / 2 - t), sigle, fill=1, font=police)
    im.paste(Image.new('RGB', (40, 40), BLANC if rang != 'or' else eclat), (0, 0), masque)
    return im.resize((80, 80), Image.NEAREST)


if __name__ == '__main__':
    for ident, sigle, rang in BADGES:
        badge(sigle, rang).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    print(len(BADGES), 'badges')
