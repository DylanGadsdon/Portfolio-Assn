# Run: python3 scripts/station.py public/media/world/station.svg
# Generates public/media/world/station.svg: a detailed illustration of an ISS-like station.
import random, sys
random.seed(7)
W, H = 1200, 560
cx, cy = W/2, H/2
o = []
a = o.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
a('''<defs>
 <linearGradient id="cell" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3a3524"/><stop offset=".45" stop-color="#2a2a26"/><stop offset="1" stop-color="#1a1d22"/></linearGradient>
 <linearGradient id="cellLit" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#8a6f3a"/><stop offset=".5" stop-color="#4a3e28"/><stop offset="1" stop-color="#22232a"/></linearGradient>
 <linearGradient id="truss" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d9d6cf"/><stop offset=".5" stop-color="#9d9a93"/><stop offset="1" stop-color="#55534f"/></linearGradient>
 <linearGradient id="mod" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#f1eee7"/><stop offset=".35" stop-color="#cfcbc2"/><stop offset=".75" stop-color="#8e8a82"/><stop offset="1" stop-color="#4c4a46"/></linearGradient>
 <linearGradient id="modV" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#f1eee7"/><stop offset=".4" stop-color="#cfcbc2"/><stop offset=".8" stop-color="#8e8a82"/><stop offset="1" stop-color="#4c4a46"/></linearGradient>
 <linearGradient id="rad" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#a7adb4"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#e6c47a"/><stop offset=".5" stop-color="#b48a3e"/><stop offset="1" stop-color="#6e5222"/></linearGradient>
</defs>''')

def wing(x, y, w, h, lit):
    """One solar array blanket: a grid of cells, a mast down the middle."""
    a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{"cellLit" if lit else "cell"})" stroke="#c9b27a" stroke-opacity=".55" stroke-width="1"/>')
    cols, rows = 4, 26
    for c in range(1, cols):
        xx = x + w*c/cols
        a(f'<line x1="{xx:.1f}" y1="{y}" x2="{xx:.1f}" y2="{y+h}" stroke="#c9b27a" stroke-opacity=".28" stroke-width=".8"/>')
    for r in range(1, rows):
        yy = y + h*r/rows
        a(f'<line x1="{x}" y1="{yy:.1f}" x2="{x+w}" y2="{yy:.1f}" stroke="#000" stroke-opacity=".35" stroke-width=".7"/>')
    for r in range(rows):                       # each bay a slightly different tone, like real arrays
        if random.random() < .35:
            yy = y + h*r/rows
            a(f'<rect x="{x}" y="{yy:.1f}" width="{w}" height="{h/rows:.1f}" fill="#{random.choice(["6b5a36","1c2230","3d3a30"])}" opacity=".35"/>')
    # sun glint band
    a(f'<rect x="{x}" y="{y+h*0.08}" width="{w}" height="{h*0.18}" fill="#ffe2a6" opacity="{0.16 if lit else 0.05}"/>')

def array_pair(x, lit):
    """Two long blankets above the truss and two below, on a rotating joint."""
    bw, bh, gap = 34, 205, 6
    top = cy - 20 - bh
    bot = cy + 20
    for xx in (x - bw - gap/2, x + gap/2):
        wing(xx, top, bw, bh, lit)
        wing(xx, bot, bw, bh, lit)
    a(f'<rect x="{x-2}" y="{top-6}" width="4" height="{bh*2+52}" fill="#bdb8ae"/>')            # mast
    a(f'<rect x="{x-8}" y="{cy-22}" width="16" height="44" rx="2" fill="url(#truss)" stroke="#3b3a37"/>')  # joint
    a(f'<rect x="{x-14}" y="{top-8}" width="28" height="6" fill="#9b968c"/><rect x="{x-14}" y="{bot+bh+2}" width="28" height="6" fill="#9b968c"/>')

# ---- Main truss ----
tx0, tx1 = 110, W-110
a(f'<rect x="{tx0}" y="{cy-11}" width="{tx1-tx0}" height="22" fill="url(#truss)" stroke="#2e2d2b" stroke-width="1"/>')
for i in range(int((tx1-tx0)/14)):      # lattice
    x = tx0 + i*14
    a(f'<path d="M{x} {cy-11} L{x+14} {cy+11} M{x+14} {cy-11} L{x} {cy+11}" stroke="#4a4844" stroke-width=".8" opacity=".55"/>')
    a(f'<line x1="{x}" y1="{cy-11}" x2="{x}" y2="{cy+11}" stroke="#3a3936" stroke-width=".8" opacity=".5"/>')

# ---- Solar arrays (4 pairs, like the real station) ----
for x, lit in ((175, True), (290, True), (W-290, False), (W-175, False)):
    array_pair(x, lit)

# ---- Radiators: white panels angled off the truss ----
for x in (430, W-430):
    for k in range(3):
        a(f'<rect x="{x-24+k*0}" y="{cy+28+k*44}" width="48" height="38" fill="url(#rad)" stroke="#6d737a" stroke-width=".8" transform="skewX(-12)"/>')
    a(f'<rect x="{x-3}" y="{cy+11}" width="6" height="150" fill="#9da3aa"/>')

# ---- Pressurised modules: long white cylinders crossing the truss ----
def cyl_h(x, y, w, h, ribs=6, fill="mod"):
    a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2.6:.1f}" fill="url(#{fill})" stroke="#3d3b38" stroke-width="1"/>')
    for i in range(1, ribs):
        xx = x + w*i/ribs
        a(f'<line x1="{xx:.1f}" y1="{y+1}" x2="{xx:.1f}" y2="{y+h-1}" stroke="#5c5954" stroke-opacity=".45" stroke-width="1"/>')
    a(f'<rect x="{x+4}" y="{y+h*0.18:.1f}" width="{w-8}" height="{h*0.12:.1f}" fill="#fff" opacity=".35" rx="2"/>')

def cyl_v(x, y, w, h, ribs=5):
    a(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{w/2.6:.1f}" fill="url(#modV)" stroke="#3d3b38" stroke-width="1"/>')
    for i in range(1, ribs):
        yy = y + h*i/ribs
        a(f'<line x1="{x+1}" y1="{yy:.1f}" x2="{x+w-1}" y2="{yy:.1f}" stroke="#5c5954" stroke-opacity=".45" stroke-width="1"/>')

# US / international segment: vertical stack through the centre
cyl_v(cx-22, cy-150, 44, 120, 5)        # lab
cyl_v(cx-20, cy+12, 40, 150, 6)         # nodes and service module line
cyl_v(cx-17, cy+160, 34, 60, 3)         # docking module
# side modules (Columbus, Kibo-like)
cyl_h(cx-130, cy-112, 106, 36, 5)
cyl_h(cx+24, cy-112, 128, 38, 6)
cyl_h(cx+150, cy-108, 44, 30, 2)
# Russian segment hanging below
cyl_h(cx-88, cy+90, 68, 30, 3)
cyl_h(cx+20, cy+90, 78, 30, 4)
# small solar wings on the Russian segment
for side in (-1, 1):
    x = cx + side*150 - (0 if side > 0 else 70)
    a(f'<rect x="{x}" y="{cy+183}" width="70" height="20" fill="url(#cell)" stroke="#c9b27a" stroke-opacity=".5"/>')
    for k in range(1, 7):
        a(f'<line x1="{x+k*10}" y1="{cy+183}" x2="{x+k*10}" y2="{cy+203}" stroke="#000" stroke-opacity=".4"/>')
a(f'<rect x="{cx-150}" y="{cy+191}" width="300" height="3" fill="#a9a59c"/>')

# gold foil details, a robot arm, antennas
a(f'<rect x="{cx-30}" y="{cy-40}" width="60" height="18" rx="3" fill="url(#gold)" stroke="#4a3818"/>')
a(f'<rect x="{cx+60}" y="{cy+128}" width="18" height="22" rx="2" fill="url(#gold)" stroke="#4a3818"/>')
a(f'<path d="M{cx+70} {cy-74} L{cx+130} {cy-150} L{cx+175} {cy-138}" fill="none" stroke="#e8e5de" stroke-width="5" stroke-linecap="round"/>')
a(f'<path d="M{cx+70} {cy-74} L{cx+130} {cy-150} L{cx+175} {cy-138}" fill="none" stroke="#6f6c66" stroke-width="1.5" stroke-linecap="round"/>')
a(f'<circle cx="{cx+130}" cy="{cy-150}" r="4" fill="#bdb8ae"/>')
for x, y in ((cx-70, cy-30), (cx+95, cy-30)):
    a(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y-34}" stroke="#bdb8ae" stroke-width="2"/><ellipse cx="{x}" cy="{y-36}" rx="9" ry="4" fill="#e6e3dc" stroke="#55524d"/>')

# soft shadow side: the sun is top-left
a('</svg>')
open(sys.argv[1], 'w').write('\n'.join(o))
