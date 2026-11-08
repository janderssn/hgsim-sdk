"""Author the lakeside kit in Blender; run blender -b --python tools/build-lakeside-assets.py.

Original meshes, guided by docs/concept/lakeside-boathouse.png. Exports a Y-up GLB,
an editable .blend, photographic PBR companions and a provenance/bounds manifest.
Pass -- --render to also create a Cycles model-review image (not a game screenshot).
"""
from pathlib import Path
import hashlib
import json
import math
import random
import sys
import bpy
import numpy as np
from PIL import Image
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'range/assets/lakeside'
OUT.mkdir(parents=True, exist_ok=True)
SCANNED = ROOT / 'range/assets/materials/scanned'
RNG = random.Random(80431)
HASH = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials): bpy.data.materials.remove(data)
texture_records = []


def prepare_map(source, name, tint=None, size=512):
    image = Image.open(source).convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    if tint:
        rgb = np.asarray(image, dtype=np.float32) / 255
        luma = rgb @ np.array([.2126, .7152, .0722])
        # Original photographic grain remains; pigments are explicitly authored
        # derivatives, not represented as unmodified scan colour.
        rgb = np.clip(luma[:, :, None] * np.array(tint)[None, None, :], 0, 1)
        image = Image.fromarray(np.rint(rgb * 255).astype(np.uint8))
    if 'normal' in name:
        vector = np.asarray(image, dtype=np.float32) / 127.5 - 1
        vector /= np.maximum(np.linalg.norm(vector, axis=2, keepdims=True), 1e-6)
        image = Image.fromarray(np.rint((vector + 1) * 127.5).clip(0, 255).astype(np.uint8))
    destination = OUT / (name + '.png')
    image.save(destination, optimize=True)
    texture_records.append({'file': destination.name, 'sha256': HASH(destination),
        'source': str(source.relative_to(ROOT)), 'source_sha256': HASH(source),
        'dimensions': [size, size], 'tint': tint,
        'transforms': ['Lanczos resize', 'PNG encoding'] + (['luminance multiplied by recorded RGB pigment'] if tint else [])
        + (['renormalized tangent-space vectors'] if 'normal' in name else [])})
    return destination


maps = {}
for kind in ['wood', 'rock']:
    for channel in ['normal', 'roughness']:
        maps[kind + '-' + channel] = prepare_map(SCANNED / f'{kind}-{channel}.webp', f'{kind}-{channel}')
for key, source, tint in [
    ('timber', 'wood', [.74, .49, .28]), ('redwood', 'wood', [.66, .31, .18]),
    ('tealwood', 'wood', [.21, .43, .41]), ('hullwood', 'wood', [1.03, .63, .29]),
    ('slate', 'rock', [.44, .49, .51]), ('stone', 'rock', [.76, .74, .67]),
]:
    maps[key] = prepare_map(SCANNED / f'{source}-color.webp', key + '-color', tint)


def material(name, color=(1, 1, 1), roughness=.85, metallic=0, texture=None, source='wood', emission=0):
    result = bpy.data.materials.new(name); result.use_nodes = True
    result.diffuse_color = (*color, 1)
    nodes = result.node_tree.nodes; links = result.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    if texture:
        for channel, path in [('color', maps[texture]), ('normal', maps[source + '-normal']), ('roughness', maps[source + '-roughness'])]:
            node = nodes.new('ShaderNodeTexImage'); node.image = bpy.data.images.load(str(path), check_existing=True)
            node.image.colorspace_settings.name = 'sRGB' if channel == 'color' else 'Non-Color'
            if channel == 'color': links.new(node.outputs['Color'], shader.inputs['Base Color'])
            elif channel == 'roughness': links.new(node.outputs['Color'], shader.inputs['Roughness'])
            else:
                normal = nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value = .24 if source == 'wood' else .32
                links.new(node.outputs['Color'], normal.inputs['Color']); links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return result


timber = material('Lakeside / aged structural timber PBR', texture='timber')
redwood = material('Lakeside / weathered red siding PBR', texture='redwood')
teal = material('Lakeside / worn teal door and gunwale PBR', texture='tealwood')
hull = material('Lakeside / honey clinker planks PBR', texture='hullwood')
slate = material('Lakeside / mineral slate PBR', texture='slate', source='rock')
stone = material('Lakeside / granite footing PBR', texture='stone', source='rock')
iron = material('Lakeside / forged iron', (.10, .115, .10), .55, .65)
rope_mat = material('Lakeside / flax rope', (.50, .35, .16), .97)
endgrain = material('Lakeside / pale endgrain', (.42, .25, .095), .93)
glass = material('Lakeside / recessed dark glazing', (.025, .065, .068), .24, .30)
interior = material('Lakeside / warm interior hint', (.34, .15, .035), .8, emission=.24)
leaves = material('Lakeside / sage planter foliage', (.20, .29, .10), .95)
flowers = material('Lakeside / cream flowers', (.82, .72, .40), .9)
lavender = material('Lakeside / violet flowers', (.34, .18, .43), .9)


def root(name):
    obj = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(obj)
    obj['authoring'] = 'Original Blender mesh kit'; return obj


house = root('LakesideBoathouse'); boat = root('LakesideRowboat')
house['frontLocalGlTF'] = [0, 0, -1]
boat['waterlineLocalGlTF'] = 0.0


def mesh(name, vertices, faces, mat, parent, uvs=None, smooth=False):
    data = bpy.data.meshes.new(name); data.from_pydata(vertices, [], faces); data.materials.append(mat); data.update()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj); obj.parent = parent
    if uvs:
        uv = data.uv_layers.new(name='UVMap')
        for loop in data.loops: uv.data[loop.index].uv = uvs[loop.vertex_index]
    for face in data.polygons: face.use_smooth = smooth
    return obj


def unwrap_box(obj, longest=None):
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    bounds = [max(v.co[i] for v in obj.data.vertices) - min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    axis = longest if longest is not None else max(range(3), key=lambda i: bounds[i])
    shift = (RNG.random(), RNG.random())
    for face in obj.data.polygons:
        side = max((i for i in range(3) if i != axis), key=lambda i: abs(face.normal[i]))
        across = next(i for i in range(3) if i not in [axis, side])
        for index in face.loop_indices:
            p = obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv = (p[axis] / 2 + shift[0], p[across] / 2 + shift[1])


def box(name, centre, size, mat, parent, bevel=.012, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size; obj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat); unwrap_box(obj)
    if bevel:
        mod = obj.modifiers.new('Hand worn bevel', 'BEVEL'); mod.width = bevel; mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        normal = obj.modifiers.new('Weighted timber face normals', 'WEIGHTED_NORMAL'); normal.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=normal.name)
    if rotation: obj.rotation_euler = rotation
    return obj


def tube(name, points, radius, mat, parent, sides=8, smooth=True):
    vertices, faces, uvs = [], [], []
    for index, p in enumerate(points):
        tangent = (Vector(points[min(index + 1, len(points) - 1)]) - Vector(points[max(0, index - 1)])).normalized()
        side = tangent.cross(Vector((0, 0, 1)))
        if side.length < .01: side = tangent.cross(Vector((0, 1, 0)))
        side.normalize(); other = tangent.cross(side).normalized()
        for k in range(sides):
            angle = k / sides * math.tau
            vertices.append(tuple(Vector(p) + (side * math.cos(angle) + other * math.sin(angle)) * radius))
            uvs.append((index / max(1, len(points) - 1), k / sides))
    for index in range(len(points) - 1):
        for k in range(sides):
            a = index * sides + k; b = index * sides + (k + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces += [tuple(range(sides - 1, -1, -1)), tuple((len(points) - 1) * sides + k for k in range(sides))]
    return mesh(name, vertices, faces, mat, parent, uvs, smooth)


def beam(name, a, b, width, depth, mat, parent):
    delta = Vector(b) - Vector(a)
    obj = box(name, (Vector(a) + Vector(b)) / 2, (width, depth, delta.length), mat, parent, min(width, depth) * .09)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler(); return obj


def nail(parent, centre, axis=(0, 1, 0), radius=.021):
    c = Vector(centre); a = Vector(axis) * .008
    tube('Forged nail head', [c - a, c + a], radius, iron, parent, 7)


# The small hut is a framed shell, with actual openings and visible deep jambs.
for i in range(9):
    for j in range(2):
        box('Front granite foundation block', (-1.35 + i * .34, 1.91, -.12 + j * .17), (.32, .30, .17), stone, house, .045)
        box('Rear granite foundation block', (-1.35 + i * .34, -1.91, -.12 + j * .17), (.32, .30, .17), stone, house, .045)
for side in [-1, 1]:
    for j in range(12): box('Side granite footing', (side * 1.42, -1.82 + j * .33, -.14), (.28, .31, .35), stone, house, .04)
for i in range(15): box('Floor and porch board', (-1.4 + i * .20, .47, .12), (.194, 5.30, .13), timber, house, .012)
for x in [-1.40, 1.40]:
    for y in [-1.89, 1.89]: box('Corner upright', (x, y, 1.31), (.18, .18, 2.45), timber, house, .026)
    box('Eaves rail', (x, 0, 2.46), (.19, 4.20, .22), timber, house, .024)
    for y in [-1.89, 1.89]:
        beam('Corner knee brace', (x, y - math.copysign(.48, y), 2.46), (x, y, 1.95), .10, .12, timber, house)
for y in [-1.96, 1.96]:
    for i in range(21):
        x = -1.40 + i * .14; top = 2.43 + 1.09 * (1 - abs(x) / 1.5)
        # Front door opening occupies most of the gable; boards above it are real.
        bottom = 2.19 if y > 0 and abs(x) < .87 else .20
        box('Vertical red weatherboard', (x, y, (top + bottom) / 2), (.133, .075, top - bottom), redwood, house, .009)
for side in [-1, 1]:
    for i in range(28):
        y = -1.90 + i * .14
        intervals = [(.20, 2.40)] if abs(y - .25) > .60 else [(.20, .87), (1.88, 2.40)]
        for bottom, top in intervals:
            box('Side vertical siding', (side * 1.46, y, (bottom + top) / 2), (.075, .133, top - bottom), redwood, house, .009)

# Teal double plank doors have overlay braces, black reveals and metal hinges.
box('Door shadow recess', (0, 1.985, 1.18), (1.82, .035, 2.0), glass, house, 0)
for door in [-1, 1]:
    cx = door * .43
    for i in range(6): box('Teal door board', (cx - .35 + i * .14, 2.045, 1.17), (.132, .065, 1.92), teal, house, .007)
    for z in [.43, 1.90]: box('Door crossbatten', (cx, 2.09, z), (.79, .052, .075), timber, house, .008)
    beam('Door diagonal brace', (cx - door * .32, 2.10, .47), (cx + door * .32, 2.10, 1.85), .06, .045, teal, house)
    for z in [.50, 1.85]:
        box('Long iron strap hinge', (door * .62, 2.133, z), (.39, .02, .055), iron, house, .009)
        for x in [door * .47, door * .76]: nail(house, (x, 2.15, z), radius=.014)
    tube('Bent iron door pull', [(door * .09, 2.15, 1.07), (door * .09, 2.21, 1.10), (door * .09, 2.21, 1.27), (door * .09, 2.15, 1.30)], .014, iron, house, 8)
for x in [-.93, .93]: box('Deep door jamb', (x, 2.00, 1.24), (.14, .21, 2.18), timber, house, .021)
box('Door lintel', (0, 2.02, 2.29), (2.08, .23, .19), timber, house, .025)
for y in [-2.08, 2.08]:
    beam('Gable king post', (0, y, 2.46), (0, y, 3.50), .14, .17, timber, house)
    beam('Left gable brace', (-1.38, y, 2.49), (0, y, 3.49), .14, .17, timber, house)
    beam('Right gable brace', (1.38, y, 2.49), (0, y, 3.49), .14, .17, timber, house)
    box('Gable cross tie', (0, y, 2.46), (3.15, .17, .17), timber, house, .02)

# Actual recessed side windows, four panes, chunky ledges and visible jamb depth.
for side in [-1, 1]:
    sx = side * 1.43
    box('Warm dark room behind glass', (sx - side * .10, .25, 1.39), (.018, 1.12, .95), interior, house, 0)
    for yy in [-.04, .54]:
        for zz in [1.16, 1.63]: box('Inset window pane', (sx, yy, zz), (.015, .50, .405), glass, house, .004)
    for yy in [-.37, .25, .87]: box('Window upright mullion', (side * 1.50, yy, 1.39), (.17, .07, 1.07), timber, house, .009)
    for zz in [.85, 1.39, 1.93]: box('Window rail', (side * 1.50, .25, zz), (.17, 1.30, .075), timber, house, .011)
    box('Deep window sill', (side * 1.60, .25, .81), (.42, 1.42, .10), timber, house, .018)
    # Narrow warm reveal visible behind mullions remains shaded by the physical frame.
    for yy in [.12, .38]: box('Interior warm upright', (sx + side * .012, yy, 1.39), (.018, .027, .90), interior, house, .003)

# Layered slate, the ridge cap and exposed rafters shape the silhouette.
slope = math.atan2(1.12, 1.72)
for side in [-1, 1]:
    for row in range(8):
        x = side * (1.61 - row * .205)
        z = 3.57 - abs(x) * (1.12 / 1.72)
        for col in range(13):
            y = -2.19 + col * .35 + (row % 2) * .10
            if y > 2.28: continue
            box('Overlapping hand laid slate', (x, y, z + row * .004), (.285, .343, .036), slate, house, .009,
                (0, side * slope, RNG.uniform(-.014, .014)))
    for y in [-2.21, 2.25]: beam('Worn roof fascia', (0, y, 3.62), (side * 1.80, y, 2.43), .14, .15, timber, house)
    for i in range(11):
        y = -1.98 + i * .40
        beam('Exposed rafter tail', (side * 1.29, y, 2.62), (side * 1.77, y, 2.39), .09, .11, timber, house)
for i in range(14): box('Slate ridge cap', (0, -2.16 + i * .34, 3.64), (.23, .36, .045), slate, house, .01)

# Porch supports/steps, a hanging mountain sign, flowerbox and split log stack.
for x in [-1.38, 1.38]:
    for y in [2.1, 3.02]: box('Porch footing post', (x, y, -.13), (.17, .17, .69), timber, house, .02)
for i in range(2):
    for board in range(3): box('Porch step board', (-.6 + board * .60, 3.16 + i * .28, -.01 - i * .13), (.59, .27, .12), timber, house, .018)
beam('Hanging sign bracket', (1.10, 2.02, 2.48), (1.10, 2.60, 2.48), .055, .055, iron, house)
for x in [.91, 1.29]: tube('Sign hanger chain', [(x, 2.56, 2.48), (x, 2.56, 2.18)], .012, iron, house, 6)
box('Mountain boathouse plaque', (1.10, 2.57, 2.02), (.66, .07, .38), timber, house, .08)
for offset, height in [(-.15, .16), (.02, .22), (.18, .13)]:
    tube('Cream mountain crest', [(1.10 + offset - .12, 2.616, 1.95), (1.10 + offset, 2.616, 1.95 + height), (1.10 + offset + .12, 2.616, 1.95)], .012, endgrain, house, 5)
for wave in range(2):
    tube('Carved lake crest', [(0.84 + i * .033, 2.616, 1.89 - wave * .045 + math.sin(i * .8) * .014) for i in range(17)], .009, teal, house, 5)
box('Flower box front', (1.81, .25, .69), (.085, 1.31, .22), timber, house, .015)
for y in [-.39, .89]: box('Flower box side', (1.64, y, .69), (.39, .07, .22), timber, house, .012)
box('Flower box earth', (1.65, .25, .73), (.28, 1.15, .07), iron, house, .01)
for i in range(26):
    x, y, z = 1.57 + RNG.random() * .17, -.29 + RNG.random() * 1.08, .77
    height = .13 + RNG.random() * .24
    tube('Planter stem', [(x, y, z), (x + .02, y + .03, z + height)], .005, leaves, house, 5)
    for leaf in range(2):
        a = RNG.random() * math.tau; dx, dy = math.cos(a) * .09, math.sin(a) * .09
        mesh('Folded planter leaf', [(x,y,z+.06),(x+dx*.4-dy*.25,y+dy*.4+dx*.25,z+.12),(x+dx,y+dy,z+.14),(x+dx*.4+dy*.25,y+dy*.4-dx*.25,z+.12)], [(0,1,2),(0,2,3)], leaves, house)
    for petal in range(5):
        a = petal * math.tau / 5; dx, dy = math.cos(a) * .037, math.sin(a) * .037
        mesh('Cupped planter petal', [(x,y,z+height),(x+dx-dy*.4,y+dy+dx*.4,z+height+.01),(x+dx*1.4,y+dy*1.4,z+height+.005),(x+dx+dy*.4,y+dy-dx*.4,z+height+.01)], [(0,1,2),(0,2,3)], flowers if i % 3 else lavender, house)
for row in range(4):
    for col in range(5 - row):
        y = -.70 + col * .19 + row * .095; z = .24 + row * .17
        tube('Stacked split firewood bark', [(1.53, y, z), (1.97, y, z)], .10, timber, house, 7)
        tube('Visible split log end', [(1.976, y, z), (1.983, y, z)], .085, endgrain, house, 7)
for y in [-1.25, 1.42]:
    for z in [.42, 1.23, 2.17]: nail(house, (1.51, y, z), (1, 0, 0), .018)

# A curved clinker hull: overlapping individual strakes, inner ribs and open cockpit.
LENGTH, WIDTH = 3.6, 1.30
def hull_point(t, h, side, outward=0):
    y = t * LENGTH / 2
    width = WIDTH / 2 * max(.001, 1 - t * t) ** .64
    # The beam grows from the keel through a rounded bilge to the gunwale.
    x = side * (width * math.sin(h * math.pi / 2) + outward)
    z = -.22 + .59 * h + .17 * abs(t) ** 3
    return x, y, z

for side in [-1, 1]:
    for strake in range(9):
        vertices, faces, uvs = [], [], []
        for i in range(33):
            t = -.985 + 1.97 * i / 32
            for h in [max(0, strake / 9 - .013), min(1, (strake + 1) / 9 + .013)]:
                vertices.append(hull_point(t, h, side, .012 * strake / 9)); uvs.append((i / 14, strake * .11 + h * .025))
        for i in range(32): faces.append((i*2, i*2+2, i*2+3, i*2+1) if side > 0 else (i*2+1,i*2+3,i*2+2,i*2))
        obj = mesh('Curved overlapping clinker strake', vertices, faces, hull, boat, uvs, True)
        solid = obj.modifiers.new('Actual plank thickness', 'SOLIDIFY'); solid.thickness = .016
        bpy.context.view_layer.objects.active = obj; obj.select_set(True); bpy.ops.object.modifier_apply(modifier=solid.name); obj.select_set(False)
    for h, radius, mat in [(1,.035,teal),(.96,.024,timber)]:
        tube('Continuous curved gunwale', [hull_point(-.99 + i * 1.98 / 32, h, side, .015) for i in range(33)], radius, mat, boat, 6)
    for strake in [2,4,6,8]:
        for i in range(9):
            t = -.85 + i * 1.7 / 8; p = hull_point(t, (strake + .75) / 9, side, .026)
            nail(boat, p, (side,0,0), .008)
for rib in range(11):
    t = -.82 + rib * 1.64 / 10
    points = [hull_point(t, 1 - i / 10, -1, -.026) for i in range(11)] + [hull_point(t, i / 10, 1, -.026) for i in range(1,11)]
    tube('Bent interior steam rib', points, .022, timber, boat, 6)
for i in range(7): box('Cockpit floorboard', (-.27 + i*.09, 0, -.10), (.083, 2.53, .032), timber, boat, .008)
for y in [-.92,0,.91]:
    t=y/(LENGTH/2); beam_width=2*abs(hull_point(t,.92,1)[0])-.07
    box('Thwart seat with rounded edges', (0,y,.245), (beam_width,.25,.055), hull, boat, .025)
    for x in [-beam_width*.34,beam_width*.34]: box('Thwart support bracket',(x,y,.17),(.06,.19,.15),timber,boat,.009)
for end in [-1,1]:
    tube('Raised carved stem', [(0,end*(1.70+i*.02),-.17+i*.125) for i in range(6)], .037, timber, boat, 8)
    # A tiny solid end deck caps the sharply converging boards, not the cockpit.
    mesh('Bow stern triangular deck', [(-.21,end*1.47,.35),(.21,end*1.47,.35),(0,end*1.78,.48)], [(0,1,2)], hull, boat, [(0,0),(0,.2),(.3,.1)])
for side in [-1,1]:
    y = .15; x = side * .66
    tube('Bronze oarlock socket', [(x,y,.35),(x,y,.43)], .018, iron, boat, 8)
    points=[(x + math.cos(a)*.043,y,.46 + math.sin(a)*.043) for a in np.linspace(.15,math.pi*1.95,18)]
    tube('Curved oarlock ring', points, .009, iron, boat, 6)
for oar in [-1,1]:
    x = oar*.19
    tube('Tapered wooden oar shaft', [(x,-1.05,.29),(x+oar*.07,.75,.32)], .018, hull, boat, 8)
    vertices=[(x+oar*.07,.72,.32),(x+oar*.07-.075,1.05,.315),(x+oar*.07-.065,1.52,.31),(x+oar*.07,1.60,.31),(x+oar*.07+.065,1.52,.31),(x+oar*.07+.075,1.05,.315)]
    obj=mesh('Sculpted broad oar blade',vertices,[(0,1,2,3,4,5)],hull,boat,[(0,.5),(.3,0),(1,0),(1.1,.5),(1,1),(.3,1)])
    solid=obj.modifiers.new('Oar blade thickness','SOLIDIFY');solid.thickness=.014;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=solid.name)
for coil in range(4):
    radius=.10+coil*.023
    tube('Coiled painter rope',[(.21+math.cos(a)*radius,-1.10+math.sin(a)*radius,.30+coil*.002) for a in np.linspace(0,math.tau,37)],.010,rope_mat,boat,6)
for side in [-1,1]:
    tube('Bow eye iron loop',[(side*.025,1.80,.39),(side*.040,1.84,.40),(side*.025,1.84,.45)],.009,iron,boat,6)
    tube('Stern painter iron loop',[(side*.025,-1.80,.39),(side*.040,-1.84,.40),(side*.025,-1.84,.45)],.009,iron,boat,6)


# Merge by root and material after real bevel/solidify modelling. The .blend keeps
# distinct authored geometry islands, while runtime needs only a few draw batches.
for parent in [house, boat]:
    groups = {}
    for obj in list(parent.children):
        if obj.type == 'MESH': groups.setdefault(obj.data.materials[0], []).append(obj)
    for mat, objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        obj=bpy.context.object; obj.name=parent.name+'_'+mat.name.split(' / ')[1].replace(' ','_')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.data.calc_loop_triangles()

roots=[house,boat];bounds={};triangles={}
for parent in roots:
    coordinates=[child.matrix_world @ Vector(corner) for child in parent.children for corner in child.bound_box]
    # Blender Z-up -> standard glTF Y-up.
    converted=[(p.x,p.z,-p.y) for p in coordinates]
    bounds[parent.name]={'min':[min(p[i] for p in converted) for i in range(3)],'max':[max(p[i] for p in converted) for i in range(3)]}
    triangles[parent.name]=sum(len(child.data.loop_triangles) for child in parent.children)
assert sum(triangles.values())<50000, triangles
bpy.ops.object.select_all(action='DESELECT')
for parent in roots:
    parent.select_set(True)
    for child in parent.children:child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'lakeside.glb'),export_format='GLB',use_selection=True,
    export_yup=True,export_materials='EXPORT',export_extras=True,export_image_format='AUTO',export_texcoords=True,
    export_normals=True,export_tangents=True)

# Review layout in the editable source; the GLB above retains zero library origins.
boat.location=(-3.3,2.1,.12)
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.device='CPU';bpy.context.scene.cycles.samples=48
# The managed Blender build may omit OpenImageDenoise. The preview is rendered
# directly at48 samples, with no external denoising or image editing.
bpy.context.scene.cycles.use_denoising=False
bpy.context.scene.world.use_nodes=True
world=bpy.context.scene.world.node_tree; background=world.nodes.get('Background');background.inputs['Color'].default_value=(.35,.48,.62,1);background.inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='SUN',location=(6,8,9));sun=bpy.context.object;sun.name='Review afternoon sun';sun.rotation_euler=Vector((-6,-8,-9)).to_track_quat('-Z','Y').to_euler();sun.data.energy=3.0;sun.data.angle=.10;sun.data.color=(1,.79,.55)
bpy.ops.object.camera_add(location=(8,11,7));camera=bpy.context.object;target=Vector((-1,.3,1.2));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=10.5;bpy.context.scene.camera=camera
bpy.context.scene.render.resolution_x=1200;bpy.context.scene.render.resolution_y=900;bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.image_settings.file_format='PNG';bpy.context.scene.render.filepath=str(OUT/'model-preview.png')
bpy.context.scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lakeside.blend'))
manifest={'generator':'tools/build-lakeside-assets.py','blender':bpy.app.version_string,'concept':'docs/concept/lakeside-boathouse.png',
    'geometry':'lakeside.glb','geometry_sha256':HASH(OUT/'lakeside.glb'),'blend':'lakeside.blend','blend_sha256':HASH(OUT/'lakeside.blend'),
    'original_geometry':True,'coordinate_system':'glTF Y up, metres; house floor base0/front-Z; boat waterline0',
    'bounds':bounds,'triangles':triangles,'draws':sum(len(parent.children) for parent in roots),
    'textures':texture_records,'source_notice':'../materials/scanned/CREDITS.md','source_manifest':'../materials/scanned/manifest.json',
    'source_license_qualification':'Upstream README identifies package as CC0-Textures; no standalone per-material license. Retained notice and checksums in scanned source manifest.',
    'source_builder_sha256':HASH(__file__)}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('LAKESIDE_ASSET',json.dumps({'triangles':triangles,'bounds':bounds,'draws':manifest['draws'],'bytes':(OUT/'lakeside.glb').stat().st_size}),flush=True)
if '--render' in sys.argv:bpy.ops.render.render(write_still=True)
