"""Build the original alpine prop library. Run: blender --background --python tools/build-alpine-assets.py

The generated GLB is a mesh library, not a placed scene. Each root is named for
its runtime contract. Exported origins sit at the ground and glTF uses Y up.
"""
from pathlib import Path
import math
import random
import sys
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'range/assets/alpine/environment.glb'
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def material(name, color, roughness=.9, metallic=0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return result


wood = material('AlpineWood', (.27, .19, .115))
endgrain = material('AlpineEndgrain', (.39, .29, .17))
granite = material('AlpineGranite', (.35, .37, .34))
metal = material('AlpineIron', (.16, .18, .17), .56, .65)
roof = material('AlpineRoof', (.13, .16, .17), .78)
cream = material('AlpineCream', (.75, .67, .48))
foliage = material('AlpineNeedles', (.18, .30, .23))
bark = material('AlpineBark', (.25, .18, .12))


# Original tiled bark maps add fissures and rough relief to close branches.
w,h=256,1024
u,v=np.meshgrid(np.linspace(0,1,w,endpoint=False),np.linspace(0,1,h,endpoint=False))
rng=np.random.default_rng(712)
fissures=np.sin(u*math.tau*23+np.sin(v*math.tau*3.1)*.6+np.sin(u*math.tau*7+v*9)*.35)
relief=.52+.23*np.tanh(fissures*3)+.06*np.sin(u*math.tau*61+v*math.tau*4)+rng.random((h,w))*.06
for name,is_normal in [('spruce-bark',False),('spruce-bark-normal',True)]:
    rgba=np.ones((h,w,4),dtype=np.float32)
    if is_normal:
        dx=(np.roll(relief,-1,axis=1)-np.roll(relief,1,axis=1))*3.5
        dy=(np.roll(relief,-1,axis=0)-np.roll(relief,1,axis=0))*3.5
        length=np.sqrt(dx*dx+dy*dy+1)
        rgba[:,:,0]=.5-dx/length*.5;rgba[:,:,1]=.5-dy/length*.5;rgba[:,:,2]=.5+1/length*.5
    else:
        rgba[:,:,0]=.06+relief*.12;rgba[:,:,1]=.045+relief*.085;rgba[:,:,2]=.03+relief*.055
    image=bpy.data.images.new(name,width=w,height=h,alpha=True)
    if is_normal:image.colorspace_settings.name='Non-Color'
    image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(OUT.with_name(name+'.png'));image.file_format='PNG';image.save()
    node=bark.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    if is_normal:
        normal=bark.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55
        bark.node_tree.links.new(node.outputs['Color'],normal.inputs['Color'])
        bark.node_tree.links.new(normal.outputs['Normal'],bark.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
    else:bark.node_tree.links.new(node.outputs['Color'],bark.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])


def root(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj['assetLibrary'] = True
    return obj


def mesh(name, vertices, faces, mat, parent=None, colors=None, uvs=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    if uvs:
        uv = data.uv_layers.new(name='UVMap')
        for loop in data.loops: uv.data[loop.index].uv = uvs[loop.vertex_index]
    if colors:
        attr = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        for i, color in enumerate(colors): attr.data[i].color = (*color, 1)
    return obj


def box(name, location, dimensions, mat, parent, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Worn edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def cylinder(name, a, b, radius, mat, parent, sides=7):
    delta = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius*1.15, radius2=radius,
        depth=delta.length, location=(Vector(a)+Vector(b))/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def spruce(name, seed):
    """Irregular woody branches and individual needle fans, not crown cones."""
    rng = random.Random(811 + seed * 103)
    height = 18.2 + seed * .55
    vertices, faces, colors = [], [], []
    wood_vertices, wood_faces, wood_uvs = [], [], []

    def tube(points, radius, sides=5):
        first = len(wood_vertices)
        for index, point in enumerate(points):
            direction = points[min(index+1, len(points)-1)] - points[max(0, index-1)]
            direction.normalize()
            side = direction.cross(Vector((0,0,1)))
            if side.length < .01: side = Vector((1,0,0))
            side.normalize(); other = direction.cross(side).normalized()
            width = radius * (1 - index / max(1,len(points)-1) * .91)
            for k in range(sides):
                a = k / sides * math.tau
                wood_vertices.append(tuple(point + (side*math.cos(a)+other*math.sin(a))*width))
                wood_uvs.append((k / sides, index * .6))
        for index in range(len(points)-1):
            for k in range(sides):
                a=first+index*sides+k; b=first+index*sides+(k+1)%sides
                c=a+sides; d=b+sides
                wood_faces.extend([(a,b,c),(b,d,c)])

    def needle(origin, direction, length, shade):
        direction.normalize()
        cross = direction.cross(Vector((0,0,1)))
        if cross.length < .01: cross=Vector((1,0,0))
        cross.normalize()
        width = length * .24
        first = len(vertices)
        vertices.extend([tuple(origin-cross*width),tuple(origin+cross*width),tuple(origin+direction*length)])
        faces.append((first, first+1, first+2))
        # True needle colour is rendered into the atlas and exported as COLOR_0.
        colour=(.014+shade*.012,.045+shade*.04,.017+shade*.014)
        colors.extend([colour,colour,tuple(channel*1.12 for channel in colour)])

    trunk_points=[Vector((math.sin(k*.4+seed)*.045*k/3, math.cos(k*.3)*.025*k/3,k/16*height)) for k in range(17)]
    tube(trunk_points,.28,9)
    for tier in range(17):
        t=tier/16
        z=2.2+t*(height-2.45)+rng.uniform(-.23,.23)
        radius=(4.0*(1-t)**.62+.22)*rng.uniform(.86,1.08)
        branch_count=7 if 9 <= tier <= 13 else 6
        phase=tier*2.399+seed*.9
        for branch in range(branch_count):
            angle=phase+branch/branch_count*math.tau+rng.uniform(-.16,.16)
            outward=Vector((math.cos(angle),math.sin(angle),0))
            lateral=Vector((-math.sin(angle),math.cos(angle),0))
            root=Vector((math.sin(z*.35+seed)*.1,math.cos(z*.4)*.05,z))
            points=[root,
                root+outward*radius*.35+Vector((0,0,-.24)),
                root+outward*radius*.72+Vector((0,0,-.62*(1-t))),
                root+outward*radius+Vector((0,0,-.58*(1-t)+.12))]
            tube(points,.055*(1-t)+.009,5)
            sites=6 if tier<9 else 7
            if tier < 6 and branch == 0: sites -= 1
            for site in range(sites):
                along=.16+site/max(1,sites-1)*.83
                base=root+outward*radius*along+Vector((0,0,-.34*(1-t)*along))
                for sign in [-1,1]:
                    twig=(outward*.35+lateral*sign*.75+Vector((0,0,rng.uniform(-1.3,.38)))).normalized()
                    twig_length=(1.25*(1-t)+.35)*rng.uniform(.85,1.15)
                    for pin in range(11):
                        f=(pin+.25)/11
                        origin=base+twig*twig_length*f
                        side_sign=-1 if pin%2 else 1
                        direction=twig*.45 + outward*side_sign*.7 + Vector((0,0,rng.uniform(-.4,.5)))
                        length=(.36*(1-t)+.24)*rng.uniform(.8,1.25)*(1-.18*f)
                        needle(origin,direction,length,rng.uniform(.6,1.3))
    needles=mesh(name+'_Near',vertices,faces,foliage,colors=colors)
    branches=mesh(name+'_Trunk',wood_vertices,wood_faces,bark,uvs=wood_uvs)
    for polygon in branches.data.polygons: polygon.use_smooth=True
    return needles,branches


# Vertex colour carries natural green variation in both Blender and glTF.
foliage.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,1,1,1)
colour_node=foliage.node_tree.nodes.new('ShaderNodeVertexColor')
colour_node.layer_name='Color'
foliage.node_tree.links.new(colour_node.outputs['Color'],foliage.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
TREE_ASSETS=[]
for i,name in enumerate(['SpruceA','SpruceB','SpruceC']):
    TREE_ASSETS.append(spruce(name,i+1))


def stone(name, location, scale, parent, seed=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    rng = random.Random(seed)
    for v in obj.data.vertices:
        wobble = 1 + .105*math.sin(v.co.x*5+seed)*math.sin(v.co.y*4.3+seed*.7) + .045*math.sin(v.co.z*8.1+seed)
        v.co.x *= scale[0]*wobble
        v.co.y *= scale[1]*wobble
        v.co.z *= scale[2]*wobble
        v.co.x += .11*max(0,v.co.z)
    obj.data.materials.append(granite)
    obj.parent = parent
    return obj


for name, dimensions, seed in [('BoulderA',(1.8,1.25,1.1),41), ('BoulderB',(1.35,1.6,.85),89)]:
    group = root(name)
    stone(name+'_Stone', (0,0,dimensions[2]*.64), dimensions, group, seed)

cairn = root('Cairn')
for i, (z, size) in enumerate([(0.14,.72),(.42,.55),(.70,.39),(.94,.23)]):
    stone('Cairn_Stone'+str(i), (math.sin(i)*.08,math.cos(i)*.05,z), (size,size*.72,.19), cairn, 90+i)

sign = root('TrailSign')
cylinder('TrailSign_Post', (0,0,0), (0,0,2.3), .105, wood, sign)
for z, length, direction in [(1.65,1.35,1),(2.03,1.1,-1)]:
    verts=[(-length/2,-.055,z-.12),(length/2-.16,-.055,z-.12),(length/2,-.055,z),
           (length/2-.16,-.055,z+.12),(-length/2,-.055,z+.12)]
    if direction<0: verts=[(-x,y,h) for x,y,h in verts]
    mesh('TrailSign_Arrow',verts,[(0,1,2),(0,2,3),(0,3,4)],endgrain,sign)
    box('TrailSign_Bolt',(0,-.08,z),(.055,.035,.055),metal,sign)

crate = root('EquipmentCrate')
box('Crate_Body',(0,0,.37),(1.1,.75,.7),wood,crate,.025)
for x in [-.42,.42]:
    for y in [-.395,.395]: box('Crate_Batten',(x,y,.38),(.11,.06,.73),endgrain,crate,.008)
for x in [-.42,.42]: box('Crate_TopBatten',(x,0,.75),(.11,.81,.06),endgrain,crate,.008)
for z in [.17,.57]:
    box('Crate_Strap',(0,-.405,z),(1.06,.025,.04),metal,crate)
box('Crate_Lid',(0,0,.73),(1.16,.81,.065),endgrain,crate,.015)

hut = root('Cabin')
box('Cabin_Walls',(0,0,1.3),(5.8,4.3,2.6),wood,hut,.04)
for side in [-1,1]:
    for y in [-1.4,0,1.4]: box('Cabin_Window',(side*2.92,y,1.45),(.05,.7,.75),roof,hut)
    for y in [-2.18,2.18]:
        for z in [.35,.95,1.55,2.15]: box('Cabin_LogEnd',(side*2.93,y,z),(.18,.3,.23),endgrain,hut)
box('Cabin_Door',(0,-2.18,1.02),(1.05,.08,2.04),endgrain,hut,.025)
mesh('Cabin_Roof',[(-3.3,-2.55,2.6),(3.3,-2.55,2.6),(3.3,2.55,2.6),(-3.3,2.55,2.6),(0,-2.55,4.25),(0,2.55,4.25)],
     [(0,1,4),(2,3,5),(0,4,5,3),(4,1,2,5)],roof,hut)
box('Cabin_Chimney',(1.6,.8,3.45),(.55,.65,1.5),granite,hut,.04)

# Collapse each prop into one object with material primitives. The loader then
# needs one draw per surface, rather than one draw per board or crate batten.
for asset in [obj for obj in bpy.data.objects if obj.type == 'EMPTY']:
    pieces = [obj for obj in asset.children_recursive if obj.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces: obj.select_set(True)
    if pieces:
        bpy.context.view_layer.objects.active = pieces[0]
        bpy.ops.object.join()
        pieces[0].name = asset.name + '_Mesh'

OUT.parent.mkdir(parents=True,exist_ok=True)

# Bake four real views per species into a shared alpha-tested tree atlas.
# Cycles CPU works without a graphics display or an Eevee GPU context.
import numpy as np
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32
scene.cycles.use_denoising=False
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.72,.82,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
assets=list(bpy.data.objects)
for obj in assets: obj.hide_render=True

light_data=bpy.data.lights.new('AtlasSun','SUN')
light_data.energy=2.0
light_data.angle=.4
light=bpy.data.objects.new('AtlasSun',light_data)
bpy.context.collection.objects.link(light)
light.rotation_euler=(math.radians(32),math.radians(-20),math.radians(-30))
fill_data=bpy.data.lights.new('AtlasFill','AREA'); fill_data.energy=600;fill_data.shape='DISK';fill_data.size=15
fill=bpy.data.objects.new('AtlasFill',fill_data);bpy.context.collection.objects.link(fill);fill.location=(10,-10,16)
fill.rotation_euler=(Vector((0,0,9))-fill.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('AtlasCamera');camera_data.type='ORTHO';camera_data.ortho_scale=23
camera=bpy.data.objects.new('AtlasCamera',camera_data);bpy.context.collection.objects.link(camera);scene.camera=camera

if '--reuse-atlas' in sys.argv:
    image=bpy.data.images.load(str(OUT.with_name('spruce-atlas.png')))
else:
    # A first beauty render is available while the twelve atlas renders continue.
    for obj in TREE_ASSETS[0]:obj.hide_render=False
    scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    camera.location=(22,-32,15)
    camera.rotation_euler=(Vector((0,0,10))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath='/tmp/alpine-spruce-preview.png'
    bpy.ops.render.render(write_still=True)
    print('PREVIEW_READY /tmp/alpine-spruce-preview.png',flush=True)
    if '--preview-only' in sys.argv: raise SystemExit(0)
    for obj in TREE_ASSETS[0]:obj.hide_render=True

    width,height=512,768
    scene.render.resolution_x=width;scene.render.resolution_y=height
    atlas=np.zeros((height*3,width*4,4),dtype=np.float32)
    for variant,objects in enumerate(TREE_ASSETS):
        for obj in objects:obj.hide_render=False
        for view in range(4):
            angle=view/4*math.tau
            camera.location=(math.sin(angle)*35,-math.cos(angle)*35,10.75)
            camera.rotation_euler=(Vector((0,0,10.75))-camera.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath=f'/tmp/alpine-tree-{variant}-{view}.png'
            bpy.ops.render.render(write_still=True)
            result=bpy.data.images.load(scene.render.filepath,check_existing=False)
            pixels=np.empty(width*height*4,dtype=np.float32)
            result.pixels.foreach_get(pixels)
            atlas[(2-variant)*height:(3-variant)*height,view*width:(view+1)*width]=pixels.reshape((height,width,4))
            bpy.data.images.remove(result)
            print('ATLAS_VIEW',variant,view,flush=True)
        for obj in objects:obj.hide_render=True
    image=bpy.data.images.new('AlpineSpruceAtlas',width=width*4,height=height*3,alpha=True)
    image.pixels.foreach_set(atlas.ravel())
    image.filepath_raw=str(OUT.with_name('spruce-atlas.png'));image.file_format='PNG';image.save()

impostor=material('AlpineSpruceImpostor',(1,1,1),1)
shader=impostor.node_tree.nodes.get('Principled BSDF')
texture=impostor.node_tree.nodes.new('ShaderNodeTexImage');texture.image=image
impostor.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
impostor.node_tree.links.new(texture.outputs['Alpha'],shader.inputs['Alpha'])
impostor.surface_render_method='DITHERED'
for index,name in enumerate(['SpruceA','SpruceB','SpruceC']):
    card=mesh(name+'_Far',[(-23/3,0,-.75),(23/3,0,-.75),(23/3,0,22.25),(-23/3,0,22.25)],[(0,1,2),(0,2,3)],impostor)
    uv=card.data.uv_layers.new(name='UVMap')
    # Blender UVs are bottom-up. Runtime replaces these with per-instance views.
    for loop in card.data.loops:
        vertex=card.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv=((vertex.x/(23/3)+1)*.125,(2-index)/3+(vertex.z+.75)/23/3)
    card['impostorColumns']=4;card['impostorRows']=3;card['impostorRow']=index
    assets.append(card)
for obj in assets:obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT')
for obj in assets:obj.select_set(True)
export_path=OUT.with_suffix('.build.glb')
bpy.ops.export_scene.gltf(filepath=str(export_path),export_format='GLB',use_selection=True,
    export_yup=True,export_materials='EXPORT',export_extras=True,export_vertex_color='ACTIVE',
    export_image_format='WEBP',export_image_quality=92)
# Vertex colours are a standard normalized byte attribute. Repack their float
# streams to RGBA8; positions and normals retain full precision.
import json,struct
payload=export_path.read_bytes();json_length=struct.unpack_from('<I',payload,12)[0]
document=json.loads(payload[20:20+json_length]);binary=payload[28+json_length:]
colour_ids={primitive['attributes']['COLOR_0'] for geometry in document['meshes']
    for primitive in geometry['primitives'] if 'COLOR_0' in primitive['attributes']}
replacement={}
for index in colour_ids:
    accessor=document['accessors'][index]
    if accessor['componentType']!=5126:continue
    view=document['bufferViews'][accessor['bufferView']]
    assert 'byteStride' not in view
    channels=3 if accessor['type']=='VEC3' else 4
    start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
    colour=np.frombuffer(binary,dtype='<f4',count=accessor['count']*channels,offset=start)
    rgba=np.full((accessor['count'],4),255,dtype=np.uint8)
    rgba[:,:channels]=np.rint(np.clip(colour.reshape((-1,channels)),0,1)*255).astype(np.uint8)
    replacement[accessor['bufferView']]=rgba.tobytes()
    accessor['componentType']=5121;accessor['normalized']=True;accessor['byteOffset']=0;accessor['type']='VEC4'
packed=bytearray()
for index,view in enumerate(document['bufferViews']):
    while len(packed)%4:packed.append(0)
    old_start=view.get('byteOffset',0)
    part=replacement.get(index,binary[old_start:old_start+view['byteLength']])
    view['byteOffset']=len(packed);view['byteLength']=len(part);packed.extend(part)
while len(packed)%4:packed.append(0)
document['buffers'][0]['byteLength']=len(packed)
encoded=json.dumps(document,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4)
length=12+8+len(encoded)+8+len(packed)
ready=OUT.with_suffix('.ready.glb')
ready.write_bytes(struct.pack('<III',0x46546c67,2,length)+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(packed),0x004e4942)+packed)
ready.replace(OUT);export_path.unlink()
print('ALPINE_ASSETS',OUT,OUT.stat().st_size,flush=True)
