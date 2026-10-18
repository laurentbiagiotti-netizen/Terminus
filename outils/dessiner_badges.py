"""Dessine les badges de compétence (chapitres 2 à 7) : des médailles en pixels, une couleur par rang.

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
    # chapitre 6 : Lumen, la cité qui s'éteint (un badge par quartier rallumé, puis la Lanterne, la Nuit, le rapport)
    ('quartier_docks', 'DISK', 'argent'), ('quartier_archives', 'INOD', 'argent'), ('quartier_gazette', 'ROT', 'argent'),
    ('quartier_forges', 'OOM', 'or'), ('quartier_horloge', 'CPU', 'argent'), ('quartier_citernes', 'LVM', 'or'),
    ('quartier_porte', 'FSTB', 'argent'), ('quartier_ateliers', 'UNIT', 'or'), ('quartier_memoires', 'BAK', 'or'),
    ('quartier_observatoire', 'IO', 'bronze'), ('quartier_puits', 'RAID', 'or'), ('quartier_thermes', 'FSCK', 'argent'),
    ('quartier_marche', 'APT', 'argent'), ('quartier_labyrinthe', 'BOOT', 'argent'), ('quartier_limites', 'CGRP', 'argent'),
    ('quartier_guetteur', 'TRCE', 'bronze'), ('m6_lanterne', 'PHAR', 'bronze'), ('m6_nuit', 'NUIT', 'or'),
    ('m6_rapport', 'DOC', 'or'), ('s_m6_avant_midi', '12H', 'or'), ('platine_ch6', 'OPS', 'platine'),
    # chapitre 7 : Port-Aube, la cité à bâtir (un badge par maison bâtie, puis le plan, la Tempête, la Marée, le Premier Pas, le rapport)
    ('maison_noms', 'DNS', 'argent'), ('maison_phare', 'PTR', 'argent'), ('maison_poste', 'MTA', 'argent'),
    ('maison_lettres', 'DKIM', 'or'), ('maison_greniers', 'NFS', 'argent'), ('maison_halle', 'SMB', 'argent'),
    ('maison_registre', 'LDAP', 'or'), ('maison_portes', 'SSSD', 'argent'), ('maison_forge', 'CA', 'or'),
    ('maison_arche', 'BORG', 'or'), ('p7_chantier', 'PLAN', 'bronze'), ('p7_tempete', 'SOS', 'or'),
    ('p7_maree', '19H', 'or'), ('p7_premier_pas', 'E2E', 'or'), ('p7_rapport', 'DOC', 'or'),
    ('s_p7_avant_tempete', '14H', 'or'), ('platine_ch7', 'SRV', 'platine'),
]

# Les badges « Ami » (toutes les quêtes annexes d'un chapitre) : une médaille ronde, à part des badges de
# compétence, avec l'emblème du décor du chapitre et un ruban à sa couleur.
ICONES_AMI = {
    # le campus : une antenne qui émet
    'ami_ch2': ['#.......#', '.#..#..#.', '..#.#.#..', '....#....', '...###...', '....#....', '...#.#...', '..#...#..', '.#######.'],
    # la Crypte : une clé
    'ami_ch3': ['..###....', '.#...#...', '.#...#...', '..###....', '...#.....', '...##....', '...#.....', '...##....', '...#.....'],
    # l'Académie : un grimoire ouvert
    'ami_ch4': ['##.....##', '#.##.##.#', '#...#...#', '#.##.##.#', '#...#...#', '#.##.##.#', '#...#...#', '#########', '....#....'],
    # le Bastion : une tour crénelée
    'ami_ch5': ['#.#.#.#.#', '#########', '.#######.', '.###.###.', '.#######.', '.#######.', '.###.###.', '.##...##.', '.##...##.'],
    # Lumen : une lanterne allumée
    'ami_ch6': ['...###...', '....#....', '..#####..', '..#.#.#..', '..##.##..', '..#.#.#..', '..#####..', '...###...', '....#....'],
    # Port-Aube : une ancre
    'ami_ch7': ['...###...', '...#.#...', '...###...', '.#######.', '....#....', '#...#...#', '##..#..##', '.##.#.##.', '..#####..'],
}
RUBANS_AMI = {'ami_ch2': (70, 140, 230), 'ami_ch3': (150, 90, 210), 'ami_ch4': (60, 170, 90), 'ami_ch5': (200, 60, 60), 'ami_ch6': (240, 150, 40),
              'ami_ch7': (40, 60, 140)}
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


def badge_ami(ident):
    clair, sombre, eclat = RANGS['or']
    ruban = RUBANS_AMI[ident]
    fonce = tuple(c * 6 // 10 for c in ruban)
    im = Image.new('RGB', (40, 40), NOIR)
    d = ImageDraw.Draw(im)
    # deux rubans à la couleur du chapitre, en V
    d.polygon([(11, 27), (17, 27), (14, 39), (11, 36), (8, 39)], fill=ruban)
    d.polygon([(23, 27), (29, 27), (32, 39), (29, 36), (26, 39)], fill=fonce)
    # la médaille ronde : un anneau d'or perlé, un cœur sombre
    d.ellipse([3, 1, 37, 35], fill=clair)
    for k in range(16):
        import math
        a = k * math.pi / 8
        x, y = 20 + 16 * math.cos(a), 18 + 16 * math.sin(a)
        d.point((round(x), round(y)), fill=eclat)
    d.ellipse([6, 4, 34, 32], fill=sombre)
    d.ellipse([8, 6, 32, 30], fill=NOIR)
    d.line([(10, 10), (15, 6)], fill=eclat, width=1)
    # l'emblème du chapitre, 9 x 9 pixels, doublé : 18 x 18
    icone = ICONES_AMI[ident]
    for y, ligne in enumerate(icone):
        for x, p in enumerate(ligne):
            if p == '#':
                d.rectangle([11 + 2 * x, 9 + 2 * y, 12 + 2 * x, 10 + 2 * y], fill=eclat)
    return im.resize((80, 80), Image.NEAREST)


if __name__ == '__main__':
    import sys
    choix = sys.argv[1:]
    for ident, sigle, rang in BADGES:
        if choix and ident not in choix:
            continue
        badge(sigle, rang).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    for ident in ICONES_AMI:
        if choix and ident not in choix:
            continue
        badge_ami(ident).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    print(len([b for b in BADGES if not choix or b[0] in choix]) + len([i for i in ICONES_AMI if not choix or i in choix]), 'badges')
