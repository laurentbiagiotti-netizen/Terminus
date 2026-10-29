"""Dessine les badges de compétence (chapitres 2 à 10) : des médailles en pixels, une couleur par rang.

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
    # chapitre 8 : le Grand Port, la Flotte noire (un badge par quai tenu, puis le port, la flotte, le piège, le rapport)
    ('quai_premiers', 'RUN', 'bronze'), ('quai_capitainerie', 'LOGS', 'bronze'), ('quai_plans', 'TAG', 'bronze'),
    ('quai_soutes', 'VOL', 'argent'), ('quai_chenaux', 'NET', 'argent'), ('quai_chantier', 'FROM', 'argent'),
    ('quai_cales', 'HIT', 'argent'), ('quai_maitres', 'SLIM', 'or'), ('quai_registre', 'PUSH', 'argent'),
    ('quai_feuille', 'YAML', 'argent'), ('quai_vigie', 'STAT', 'argent'), ('quai_armurerie', 'CAP', 'or'),
    ('quai_douane', 'SHA', 'or'), ('quai_escadre', 'NODE', 'or'),
    ('n8_port', 'PORT', 'bronze'), ('n8_flotte', 'FLOT', 'or'), ('n8_piege', 'DGST', 'or'), ('n8_rapport', 'DOC', 'or'),
    ('s_n8_avant_aube', 'J4', 'or'), ('platine_ch8', 'CNTR', 'platine'),
    # chapitre 9 : la Chronothèque, la Chronique d'Éternité (un badge par salle tenue, puis le sablier, l'histoire
    # restaurée, les faux sceaux, le rapport ; les sigles et les métaux sont ceux de SIGLES_CH9)
    ('salle_sceaux', 'INIT', 'bronze'), ('salle_autel', 'ADD', 'bronze'), ('salle_runes', 'SHA', 'bronze'),
    ('salle_oracle', 'LOG', 'argent'), ('salle_contresorts', 'RVRT', 'argent'), ('salle_ombres', 'RFLG', 'argent'),
    ('salle_lignes', 'MRG', 'argent'), ('salle_paradoxes', '<<<', 'argent'), ('salle_besace', 'TAG', 'argent'),
    ('salle_propheties', 'RBS', 'or'), ('salle_cartes', 'FLOW', 'argent'), ('salle_portes', 'PUSH', 'or'),
    ('salle_garde', 'SIGN', 'or'), ('salle_conseil', 'PR', 'or'),
    ('n9_sablier', 'TIME', 'bronze'), ('n9_restauration', 'HIST', 'or'), ('n9_faux_sceaux', 'SEAL', 'or'),
    ('n9_rapport', 'DOC', 'or'), ('s_n9_avant_aube', 'J4', 'or'), ('platine_ch9', 'GIT', 'platine'),
    # chapitre 10 : le Lac Profond, la grande finale (un badge par poste tenu, puis la jauge, la Grande Marée, le néant
    # vaincu, le rapport, la défense avant la marée)
    ('poste_greve', 'HEAD', 'bronze'), ('poste_banc', 'SORT', 'bronze'), ('poste_comptoir', 'AWK', 'bronze'),
    ('poste_gue', 'UTF8', 'argent'), ('poste_moulin', 'UNIQ', 'argent'), ('poste_vanne', 'JSON', 'argent'),
    ('poste_ecluse', 'TRAP', 'argent'), ('poste_bief', 'XARG', 'argent'), ('poste_tour', 'CRON', 'argent'),
    ('poste_fosse', 'DF', 'argent'), ('poste_chambre', 'NICE', 'or'), ('poste_coffre', 'RGPD', 'or'),
    ('poste_chantier', 'DOCK', 'or'), ('poste_citerne', 'PG', 'or'), ('poste_bassin', 'YAML', 'or'),
    ('n10_jauge', 'LAC', 'bronze'), ('n10_maree', '8', 'or'), ('n10_neant', 'BAK', 'or'),
    ('n10_rapport', 'DOC', 'or'), ('s_n10_avant_maree', 'J4', 'or'), ('platine_ch10', 'DATA', 'platine'),
]

# Les insignes de rang du chapitre 10 (Riverain, Pêcheur, Plongeur, Éclusier, Sondeur des Abysses, Maître du Lac) :
# une forme à part, la goutte d'eau, avec une vague et autant de points que le rang ; le Maître porte le trident.
INSIGNES = [
    ('insigne_riverain', 0, 'bronze'), ('insigne_pecheur', 1, 'bronze'), ('insigne_plongeur', 2, 'argent'),
    ('insigne_eclusier', 3, 'argent'), ('insigne_sondeur', 4, 'or'), ('insigne_maitre', 5, 'platine'),
]

# Les sceaux de rang du chapitre 9 (Apprenti du Temps, Scribe, Archiviste, Chroniqueur, Gardien du Temps,
# Chronomancien) : une forme à part, le sceau de cire festonné, avec le sablier et autant de points que le rang.
SCEAUX = [
    ('sceau_apprenti', 0, 'bronze'), ('sceau_scribe', 1, 'bronze'), ('sceau_archiviste', 2, 'argent'),
    ('sceau_chroniqueur', 3, 'argent'), ('sceau_gardien', 4, 'or'), ('sceau_chronomancien', 5, 'platine'),
]

# Les galons du chapitre 8 (un par rang : Mousse, Matelot, Quartier-maître, Second, Capitaine, Amiral) : une forme
# à part, la patte d'épaule, avec l'ancre et autant de galons que le rang en compte ; le métal monte avec le rang.
GALONS = [
    ('galon_mousse', 0, 'bronze'), ('galon_matelot', 1, 'bronze'), ('galon_quartier_maitre', 2, 'argent'),
    ('galon_second', 3, 'argent'), ('galon_capitaine', 4, 'or'), ('galon_amiral', 5, 'platine'),
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
    # le Grand Port : une grue à portique et son conteneur suspendu
    'ami_ch8': ['......#..', '.....###.', '#########', '.#...#.#.', '.#...#.#.', '###..###.', '###..#.#.', '###..#.#.', '....##.##'],
    # la Chronothèque : un sablier
    'ami_ch9': ['#########', '.#.....#.', '..#####..', '...###...', '....#....', '...#.#...', '..#.#.#..', '.#.###.#.', '#########'],
    # le Lac Profond : une pieuvre
    'ami_ch10': ['...###...', '..#####..', '..#.#.#..', '..#####..', '.#.###.#.', '#..#.#..#', '#.#.#.#.#', '.#.#.#.#.', '#.#...#.#'],
}
RUBANS_AMI = {'ami_ch2': (70, 140, 230), 'ami_ch3': (150, 90, 210), 'ami_ch4': (60, 170, 90), 'ami_ch5': (200, 60, 60), 'ami_ch6': (240, 150, 40),
              'ami_ch7': (40, 60, 140), 'ami_ch8': (60, 190, 170), 'ami_ch9': (170, 120, 60), 'ami_ch10': (30, 110, 120)}
NOIR = (0, 0, 0)
# Une police de 3 x 5 pixels, pour les sigles de quatre caractères.
PETITE_POLICE = {
    'A': ['###', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'], 'C': ['###', '#..', '#..', '#..', '###'],
    'D': ['##.', '#.#', '#.#', '#.#', '##.'], 'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['###', '#..', '#.#', '#.#', '###'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'], 'I': ['###', '.#.', '.#.', '.#.', '###'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#.#', '###', '###', '#.#', '#.#'],
    'N': ['##.', '#.#', '#.#', '#.#', '#.#'], 'O': ['###', '#.#', '#.#', '#.#', '###'], 'P': ['###', '#.#', '###', '#..', '#..'],
    'R': ['##.', '#.#', '##.', '#.#', '#.#'], 'S': ['###', '#..', '###', '..#', '###'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'], 'W': ['#.#', '#.#', '###', '###', '#.#'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '3': ['###', '..#', '.##', '..#', '###'], '/': ['..#', '..#', '.#.', '#..', '#..'],
    '?': ['###', '..#', '.#.', '...', '.#.'],
    'J': ['..#', '..#', '..#', '#.#', '###'], 'Q': ['###', '#.#', '#.#', '###', '..#'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
    'Z': ['###', '..#', '.#.', '#..', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'], '6': ['###', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
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


def badge_galon(n, rang):
    """Un galon de rang : une patte d'épaule au métal du rang, un bouton, une ancre (plus petite quand les galons
    montent), n barrettes ; l'Amiral a trois étoiles à la place de l'ancre."""
    clair, sombre, eclat = RANGS[rang]
    im = Image.new('RGB', (40, 40), NOIR)
    d = ImageDraw.Draw(im)
    d.polygon([(7, 11), (20, 2), (33, 11), (33, 38), (7, 38)], fill=clair)
    d.polygon([(9, 12), (20, 5), (31, 12), (31, 36), (9, 36)], fill=sombre)
    d.polygon([(11, 13), (20, 7), (29, 13), (29, 34), (11, 34)], fill=NOIR)
    d.line([(8, 11), (19, 3)], fill=eclat)
    d.ellipse([18, 8, 22, 12], fill=eclat)
    if n == 5:
        for x in (14, 20, 26):
            d.point([(x, 15), (x - 1, 15), (x + 1, 15), (x, 14), (x, 16)], fill=eclat)
    elif n >= 3:
        d.line([(20, 14), (20, 19)], fill=eclat); d.line([(18, 15), (22, 15)], fill=eclat)
        d.point([(17, 18), (23, 18), (18, 19), (22, 19), (19, 20), (21, 20)], fill=eclat)
    else:
        d.line([(20, 14), (20, 24)], fill=eclat); d.line([(17, 16), (23, 16)], fill=eclat)
        d.arc([15, 18, 25, 26], 10, 170, fill=eclat)
        d.point([(15, 21), (25, 21)], fill=eclat)
    for k in range(n):
        y = 31 - k * 3
        d.rectangle([12, y, 28, y + 1], fill=clair)
        d.line([(12, y), (28, y)], fill=eclat)
    if rang == 'platine':
        for x, y in [(4, 4), (35, 6), (36, 30), (3, 31)]:
            d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=eclat)
    return im.resize((80, 80), Image.NEAREST)


def badge_sceau(n, rang):
    """Un sceau de rang : une galette de cire festonnée au métal du rang, un sablier gravé au centre, n points
    dessous ; le Chronomancien a en plus quatre éclats."""
    import math
    clair, sombre, eclat = RANGS[rang]
    im = Image.new('RGB', (40, 40), NOIR)
    d = ImageDraw.Draw(im)
    d.polygon([(12, 27), (17, 27), (15, 39), (12, 36), (9, 39)], fill=sombre)
    d.polygon([(23, 27), (28, 27), (31, 39), (28, 36), (25, 39)], fill=sombre)
    festons = []
    for k in range(24):
        a = k * math.pi / 12
        r = 17 if k % 2 == 0 else 15
        festons.append((20 + r * math.cos(a), 18 + r * math.sin(a)))
    d.polygon(festons, fill=clair)
    d.ellipse([6, 4, 34, 32], fill=sombre)
    d.ellipse([8, 6, 32, 30], fill=NOIR)
    d.line([(9, 9), (16, 4)], fill=eclat)
    # le sablier
    d.line([(16, 9), (24, 9)], fill=eclat); d.line([(16, 23), (24, 23)], fill=eclat)
    d.line([(17, 10), (20, 16), (23, 10)], fill=eclat); d.line([(17, 22), (20, 16), (23, 22)], fill=eclat)
    d.line([(18, 11), (22, 11)], fill=clair)
    d.line([(19, 21), (21, 21)], fill=clair); d.line([(18, 22), (22, 22)], fill=clair)
    for k in range(n):
        x = round(20 + (k - (n - 1) / 2) * 3)
        d.rectangle([x - 1, 26, x, 27], fill=clair)
    if rang == 'platine':
        for x, y in [(4, 4), (35, 6), (36, 30), (3, 31)]:
            d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=eclat)
    return im.resize((80, 80), Image.NEAREST)


def badge_insigne(n, rang):
    """Un insigne de rang du Lac : une goutte d'eau au métal du rang, une vague gravée, n points dessous ; le Maître
    du Lac porte un trident à la place de la vague, et quatre éclats."""
    import math
    clair, sombre, eclat = RANGS[rang]
    im = Image.new('RGB', (40, 40), NOIR)
    d = ImageDraw.Draw(im)
    d.polygon([(12, 27), (17, 27), (15, 39), (12, 36), (9, 39)], fill=sombre)
    d.polygon([(23, 27), (28, 27), (31, 39), (28, 36), (25, 39)], fill=sombre)
    goutte = [(20, 1)] + [(20 + 14 * math.cos(a), 20 + 13 * math.sin(a)) for a in [math.pi * (-0.15 + 1.3 * k / 20) for k in range(21)]]
    d.polygon(goutte, fill=clair)
    goutte2 = [(20, 5)] + [(20 + 11 * math.cos(a), 20 + 10 * math.sin(a)) for a in [math.pi * (-0.12 + 1.24 * k / 20) for k in range(21)]]
    d.polygon(goutte2, fill=sombre)
    goutte3 = [(20, 8)] + [(20 + 9 * math.cos(a), 20 + 8 * math.sin(a)) for a in [math.pi * (-0.1 + 1.2 * k / 20) for k in range(21)]]
    d.polygon(goutte3, fill=NOIR)
    d.line([(12, 14), (18, 5)], fill=eclat)
    if n == 5:
        d.line([(20, 12), (20, 26)], fill=eclat)
        for x in (16, 20, 24):
            d.line([(x, 12), (x, 16)], fill=eclat)
        d.line([(16, 16), (24, 16)], fill=eclat)
    else:
        for y in (17, 21):
            d.point([(14, y), (15, y - 1), (16, y - 1), (17, y), (18, y + 1), (19, y + 1), (20, y), (21, y - 1), (22, y - 1), (23, y), (24, y + 1), (25, y + 1)], fill=eclat)
    for k in range(n):
        x = round(20 + (k - (n - 1) / 2) * 3)
        d.rectangle([x - 1, 25, x, 26], fill=clair)
    if rang == 'platine':
        for x, y in [(4, 4), (35, 6), (36, 30), (3, 31)]:
            d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=eclat)
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
    for ident, n, rang in GALONS:
        if choix and ident not in choix:
            continue
        badge_galon(n, rang).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    for ident, n, rang in SCEAUX:
        if choix and ident not in choix:
            continue
        badge_sceau(n, rang).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    for ident, n, rang in INSIGNES:
        if choix and ident not in choix:
            continue
        badge_insigne(n, rang).convert('P', palette=Image.ADAPTIVE, colors=16).save(os.path.join(OUT, 'badge_' + ident + '.gif'))
    print(len([i for i in INSIGNES if not choix or i[0] in choix]) + len([b for b in BADGES if not choix or b[0] in choix]) + len([i for i in ICONES_AMI if not choix or i in choix])
          + len([g for g in GALONS if not choix or g[0] in choix]) + len([s for s in SCEAUX if not choix or s[0] in choix]),
          'badges')
