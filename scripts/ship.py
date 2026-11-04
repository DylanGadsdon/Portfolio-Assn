# Run: python3 scripts/ship.py public/media/world/mothership.svg
# Generates public/media/world/mothership.svg: an original grey sphere-ship.
# A plated hull drawn on a real sphere projection (tilted), lit from the top-left,
# with one small flush weapon port that glows very faintly.
import math, random, sys
random.seed(11)
S = 800; R = 370; C = S/2
TILT = math.radians(18)        # pole tipped towards the viewer
SPIN = math.radians(25)
def proj(lat, lon):
    """Point on the sphere → (x, y, z) on screen; z > 0 faces the viewer."""
    x = math.cos(lat)*math.sin(lon+SPIN); y = math.sin(lat); z = math.cos(lat)*math.cos(lon+SPIN)
    y2 = y*math.cos(TILT) - z*math.sin(TILT); z2 = y*math.sin(TILT) + z*math.cos(TILT)
    return C + x*R, C - y2*R, z2
def path(pts):
    d, pen = [], False
    for x, y, z in pts:
        if z > 0.02: d.append(('L' if pen else 'M') + f'{x:.1f} {y:.1f}'); pen = True
        else: pen = False
    return ' '.join(d)
o = []; a = o.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">')
a(f'''<defs>
 <radialGradient id="hull" cx="34%" cy="30%" r="75%">
  <stop offset="0" stop-color="#b3b7bd"/><stop offset=".35" stop-color="#767a81"/><stop offset=".7" stop-color="#36393e"/><stop offset="1" stop-color="#121316"/></radialGradient>
 <radialGradient id="shadow" cx="30%" cy="26%" r="85%">
  <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
 <radialGradient id="rim" cx="50%" cy="50%" r="50%">
  <stop offset=".93" stop-color="#9fb3c8" stop-opacity="0"/><stop offset="1" stop-color="#9fb3c8" stop-opacity=".22"/></radialGradient>
 <radialGradient id="port" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="#d8ffe0" stop-opacity=".55"/><stop offset=".35" stop-color="#57ff7a" stop-opacity=".22"/><stop offset="1" stop-color="#57ff7a" stop-opacity="0"/></radialGradient>
 <clipPath id="ball"><circle cx="{C}" cy="{C}" r="{R}"/></clipPath>
</defs>''')
a(f'<circle cx="{C}" cy="{C}" r="{R}" fill="url(#hull)"/>')
a('<g clip-path="url(#ball)">')
# Hull plating: patches of slightly different tone, laid on the sphere
for i in range(900):
    lat = math.asin(random.uniform(-1, 1)); lon = random.uniform(-math.pi, math.pi)
    dl = random.uniform(.03, .09); dn = random.uniform(.04, .12)
    pts = [proj(lat, lon), proj(lat, lon+dn), proj(lat+dl, lon+dn), proj(lat+dl, lon)]
    if min(p[2] for p in pts) < .05: continue
    tone = random.choice(['#ffffff', '#000000', '#000000', '#c8d0da'])
    op = random.uniform(.03, .10)
    a(f'<path d="M{" L".join(f"{x:.1f} {y:.1f}" for x,y,_ in pts)} Z" fill="{tone}" opacity="{op:.3f}"/>')
# Panel seams: latitude rings at irregular spacing, and meridians
for deg in (-72, -58, -41, -27, -12, 4, 17, 33, 49, 63, 76):
    lat = math.radians(deg)
    a(f'<path d="{path([proj(lat, math.radians(l)) for l in range(-180, 181, 3)])}" fill="none" stroke="#0b0c0e" stroke-opacity=".45" stroke-width="1.1"/>')
    a(f'<path d="{path([proj(lat-0.004, math.radians(l)) for l in range(-180, 181, 3)])}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".8"/>')
for k in range(0, 360, 15):
    lon = math.radians(k + random.uniform(-3, 3))
    a(f'<path d="{path([proj(math.radians(t), lon) for t in range(-80, 81, 3)])}" fill="none" stroke="#0b0c0e" stroke-opacity=".3" stroke-width=".9"/>')
# Small structures: sensor blisters and vents, scattered
for i in range(70):
    lat = math.asin(random.uniform(-.95, .95)); lon = random.uniform(-math.pi, math.pi)
    x, y, z = proj(lat, lon)
    if z < .2: continue
    r = random.uniform(1.5, 4.5) * z
    a(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#1a1b1e" opacity=".7"/><circle cx="{x-r*.3:.1f}" cy="{y-r*.3:.1f}" r="{r*.45:.1f}" fill="#e8eaee" opacity=".25"/>')
# Running lights: a sparse ring of tiny lamps near the north pole
for k in range(0, 360, 12):
    x, y, z = proj(math.radians(70), math.radians(k))
    if z > .1: a(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.2" fill="#e9f3ff" opacity="{.35*z+.2:.2f}"/>')
a('</g>')
a(f'<circle cx="{C}" cy="{C}" r="{R}" fill="url(#shadow)"/>')
a(f'<circle cx="{C}" cy="{C}" r="{R}" fill="url(#rim)"/>')
# The weapon port: small, flush, faint
px, py, pz = proj(math.radians(-14), math.radians(20))
a(f'<g id="port-group"><ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{14*pz:.1f}" ry="14" fill="#0d0f10" stroke="#5f646b" stroke-width="1.2"/>')
a(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{7*pz:.1f}" ry="7" fill="#1d3a24"/>')
a(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="26" fill="url(#port)"/></g>')
a('</svg>')
open(sys.argv[1], 'w').write('\n'.join(o))
print(f'port at {px/S:.3f},{py/S:.3f}')
