import{DepthStencilFormat as ad,DepthTexture as sd,LinearFilter as od,SRGBColorSpace as cd,UnsignedByteType as ld,UnsignedIntType as ud,UnsignedInt248Type as hd,Vector2 as dd,WebGLRenderTarget as fd}from"./three.module.js";import{BasicDepthPacking as yo,BufferAttribute as Kn,BufferGeometry as Co,Material as Do,Mesh as Ro,OrthographicCamera as Io,Scene as jn,Texture as _o,WebGLRenderTarget as Mo}from"./three.module.js";import{LinearFilter as vd,SRGBColorSpace as Ad,UnsignedByteType as Td,WebGLRenderTarget as Sd}from"./three.module.js";import{AlwaysDepth as Ed,NoBlending as wd,ShaderMaterial as yd,Uniform as Cd}from"./three.module.js";import{Color as Rd}from"./three.module.js";import{LinearSRGBColorSpace as _d}from"./three.module.js";import{BackSide as Pd,DoubleSide as Nd,FrontSide as bd,ShaderMaterial as Od}from"./three.module.js";import{EventDispatcher as No,Vector2 as _i}from"./three.module.js";import{EventDispatcher as bo,Uniform as Oo}from"./three.module.js";import{Color as Fd,Uniform as Hd,Vector2 as Gd,Vector4 as zd}from"./three.module.js";import{CanvasTexture as Wd,RepeatWrapping as Vd}from"./three.module.js";import{BasicDepthPacking as pc,EventDispatcher as gc,LinearSRGBColorSpace as vc,Material as Ac,NoColorSpace as Tc,Texture as Sc,WebGLRenderTarget as xc}from"./three.module.js";import{SRGBColorSpace as Qd,Uniform as Zd,WebGLRenderTarget as Kd}from"./three.module.js";import{SRGBColorSpace as qd,UnsignedByteType as Jd,WebGLRenderTarget as $d}from"./three.module.js";import{NoBlending as tf,ShaderMaterial as rf,Uniform as nf,Vector4 as af}from"./three.module.js";import{UnsignedByteType as cf,WebGLRenderTarget as lf}from"./three.module.js";import{NoBlending as hf,REVISION as df,ShaderMaterial as ff,Uniform as mf}from"./three.module.js";import{SRGBColorSpace as gf,UnsignedByteType as vf,Vector2 as Af,WebGLRenderTarget as Tf}from"./three.module.js";import{NoBlending as xf,ShaderMaterial as Ef,Uniform as wf,Vector2 as yf}from"./three.module.js";import{NoBlending as Df,ShaderMaterial as Rf,Uniform as If,Vector2 as _f}from"./three.module.js";import{Uniform as Pf}from"./three.module.js";import{SRGBColorSpace as bf,Uniform as Of}from"./three.module.js";import{Uniform as Lf}from"./three.module.js";import{Uniform as Ff,Vector2 as Hf}from"./three.module.js";import{BasicDepthPacking as zf,SRGBColorSpace as kf,Uniform as Wf,UnsignedByteType as Vf,Vector3 as Yf,WebGLRenderTarget as Xf}from"./three.module.js";import{NoBlending as Zf,ShaderMaterial as Kf,Uniform as jf,Vector2 as qf}from"./three.module.js";import{BasicDepthPacking as $f,NoBlending as e0,PerspectiveCamera as t0,ShaderMaterial as r0,Uniform as i0}from"./three.module.js";import{NoBlending as a0,ShaderMaterial as s0,Uniform as o0,UnsignedByteType as c0}from"./three.module.js";import{UnsignedByteType as Ec}from"./three.module.js";import{Uniform as h0,Vector2 as d0}from"./three.module.js";import{Uniform as m0}from"./three.module.js";import{NearestFilter as g0,RepeatWrapping as v0,RGBAFormat as A0,Uniform as T0,Vector2 as S0}from"./three.module.js";import{DataTexture as E0,RedFormat as w0,RGFormat as y0,RGBAFormat as C0,UnsignedByteType as D0}from"./three.module.js";import{BasicDepthPacking as I0,DepthTexture as _0,Matrix4 as M0,Scene as P0,SRGBColorSpace as N0,Uniform as b0,Vector2 as O0,Vector3 as U0,Vector4 as L0,WebGLRenderTarget as B0}from"./three.module.js";import{NoBlending as H0,ShaderMaterial as G0,Uniform as z0}from"./three.module.js";import{Uniform as W0,Vector2 as V0}from"./three.module.js";import{Uniform as X0,Vector3 as Q0}from"./three.module.js";import{Uniform as K0,Vector2 as j0}from"./three.module.js";import{FloatType as J0,HalfFloatType as $0,Uniform as em}from"./three.module.js";import{Data3DTexture as rm,FloatType as im,HalfFloatType as nm,LinearFilter as am,NearestFilter as sm,SRGBColorSpace as om,Uniform as cm,Vector3 as lm}from"./three.module.js";import{Color as hm,ClampToEdgeWrapping as dm,DataTexture as fm,Data3DTexture as mm,FloatType as pm,LinearFilter as gm,LinearSRGBColorSpace as vm,RGBAFormat as Am,SRGBColorSpace as Tm,UnsignedByteType as Sm,Vector3 as xm}from"./three.module.js";import{Color as wm,RepeatWrapping as ym,Uniform as Cm,UnsignedByteType as Dm,WebGLRenderTarget as Rm}from"./three.module.js";import{NoBlending as _m,PerspectiveCamera as Mm,RGBADepthPacking as Pm,ShaderMaterial as Nm,Uniform as bm}from"./three.module.js";import{NoBlending as Um,ShaderMaterial as Lm,Uniform as Bm,Vector2 as Fm}from"./three.module.js";import{Color as Gm,MeshDepthMaterial as zm,NearestFilter as km,RGBADepthPacking as Wm,WebGLRenderTarget as Vm}from"./three.module.js";import{Uniform as Xm,Vector2 as Qm,Vector4 as Zm}from"./three.module.js";import{Uniform as jm,Vector4 as qm}from"./three.module.js";import{Uniform as $m,Vector2 as ep}from"./three.module.js";import{Uniform as rp,Vector2 as ip,Vector3 as np}from"./three.module.js";import{BasicDepthPacking as op,Color as cp,NotEqualDepth as lp,EqualDepth as up,RGBADepthPacking as hp,SRGBColorSpace as dp,WebGLRenderTarget as fp}from"./three.module.js";import{AlwaysDepth as pp,BasicDepthPacking as gp,EqualDepth as vp,GreaterDepth as Ap,GreaterEqualDepth as Tp,LessDepth as Sp,LessEqualDepth as xp,NeverDepth as Ep,NoBlending as wp,NotEqualDepth as yp,PerspectiveCamera as Cp,ShaderMaterial as Dp,Uniform as Rp,Vector2 as Ip}from"./three.module.js";import{Uniform as Mp,Vector3 as Pp}from"./three.module.js";import{BasicDepthPacking as bp,Color as Op,LinearFilter as Up,LoadingManager as Lp,NearestFilter as Bp,Texture as Fp,Uniform as Hp,WebGLRenderTarget as Gp}from"./three.module.js";import{BasicDepthPacking as kp,NoBlending as Wp,REVISION as Vp,ShaderMaterial as Yp,Uniform as Xp,Vector2 as Qp}from"./three.module.js";import{NoBlending as Kp,ShaderMaterial as jp,Uniform as qp,Vector2 as Jp}from"./three.module.js";import{BasicDepthPacking as e1,Color as t1,RepeatWrapping as r1,RGBAFormat as i1,Uniform as n1,WebGLRenderTarget as a1}from"./three.module.js";import{BasicDepthPacking as o1,Matrix4 as c1,NoBlending as l1,PerspectiveCamera as u1,ShaderMaterial as h1,Uniform as d1,Vector2 as f1}from"./three.module.js";import{BasicDepthPacking as p1,FloatType as g1,NearestFilter as v1,WebGLRenderTarget as A1}from"./three.module.js";import{BasicDepthPacking as S1,NoBlending as x1,ShaderMaterial as E1,Uniform as w1,Vector2 as y1}from"./three.module.js";import{Uniform as D1,UnsignedByteType as R1}from"./three.module.js";import{SRGBColorSpace as _1,Uniform as M1,Vector2 as P1,WebGLRenderTarget as N1}from"./three.module.js";import{Uniform as O1,Vector2 as U1,Vector4 as L1}from"./three.module.js";import{LinearMipmapLinearFilter as F1,REVISION as H1,Uniform as G1,WebGLRenderTarget as z1}from"./three.module.js";import{NearestFilter as W1,WebGLRenderTarget as V1}from"./three.module.js";import{NoBlending as X1,ShaderMaterial as Q1,Uniform as Z1}from"./three.module.js";import{Uniform as j1}from"./three.module.js";import{FileLoader as J1,Loader as $1,LoadingManager as eg}from"./three.module.js";import{FileLoader as rg,Loader as ig,LoadingManager as ng,Vector3 as ag}from"./three.module.js";import{Loader as og,LoadingManager as cg}from"./three.module.js";import{NoBlending as ug,PerspectiveCamera as hg,ShaderMaterial as dg,Uniform as fg,Vector2 as mg}from"./three.module.js";import{BasicDepthPacking as gg,NoBlending as vg,ShaderMaterial as Ag,Uniform as Tg,Vector2 as Sg}from"./three.module.js";import{BasicDepthPacking as Eg,NoBlending as wg,PerspectiveCamera as yg,REVISION as Cg,ShaderMaterial as Dg,Uniform as Rg,Vector2 as Ig}from"./three.module.js";import{NoBlending as Mg,ShaderMaterial as Pg,Uniform as Ng,Vector2 as bg}from"./three.module.js";import{BasicDepthPacking as Ug,SRGBColorSpace as Lg,UnsignedByteType as Bg,WebGLRenderTarget as Fg}from"./three.module.js";import{BasicDepthPacking as Gg,FloatType as zg,REVISION as wc,RGBADepthPacking as kg}from"./three.module.js";import{BasicDepthPacking as Vg,FloatType as Yg,NearestFilter as Xg,RGBADepthPacking as Qg,UnsignedByteType as Zg,WebGLRenderTarget as Kg}from"./three.module.js";import{BasicDepthPacking as ev,NoColorSpace as tv,SRGBColorSpace as rv,UnsignedByteType as iv}from"./three.module.js";import{SRGBColorSpace as av,UnsignedByteType as sv,WebGLRenderTarget as ov}from"./three.module.js";import{Color as lv,MeshNormalMaterial as uv,NearestFilter as hv,WebGLRenderTarget as dv}from"./three.module.js";import{LoadingManager as Ev}from"./three.module.js";var md=1/1e3;var Po=(()=>{let t=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),e=new Float32Array([0,0,2,0,0,2]),r=new Co;return r.setAttribute("position",new Kn(t,3)),r.setAttribute("uv",new Kn(e,2)),r})(),cr=class Pi{static get fullscreenGeometry(){return Po}constructor(e="Pass",r=new jn,i=new Io){this.name=e,this.renderer=null,this.scene=r,this.camera=i,this.screen=null,this.rtt=!0,this.needsSwap=!0,this.needsDepthTexture=!1,this.enabled=!0}get renderToScreen(){return!this.rtt}set renderToScreen(e){if(this.rtt===e){let r=this.fullscreenMaterial;r!==null&&(r.needsUpdate=!0),this.rtt=!e}}set mainScene(e){}set mainCamera(e){}setRenderer(e){this.renderer=e}isEnabled(){return this.enabled}setEnabled(e){this.enabled=e}get fullscreenMaterial(){return this.screen!==null?this.screen.material:null}set fullscreenMaterial(e){let r=this.screen;r!==null?r.material=e:(r=new Ro(Pi.fullscreenGeometry,e),r.frustumCulled=!1,this.scene===null&&(this.scene=new jn),this.scene.add(r),this.screen=r)}getFullscreenMaterial(){return this.fullscreenMaterial}setFullscreenMaterial(e){this.fullscreenMaterial=e}getDepthTexture(){return null}setDepthTexture(e,r=yo){}render(e,r,i,a,s){throw new Error("Render method not implemented!")}setSize(e,r){}initialize(e,r,i){}dispose(){for(let e of Object.keys(this)){let r=this[e];(r instanceof Mo||r instanceof Do||r instanceof _o||r instanceof Pi)&&this[e].dispose()}this.fullscreenMaterial!==null&&this.fullscreenMaterial.dispose()}};var lr={NONE:0,DEPTH:1,CONVOLUTION:2};var vt=-1,Vr=class extends No{constructor(t,e=vt,r=vt,i=1){super(),this.resizable=t,this.baseSize=new _i(1,1),this.preferredSize=new _i(e,r),this.target=this.preferredSize,this.s=i,this.effectiveSize=new _i,this.addEventListener("change",()=>this.updateEffectiveSize()),this.updateEffectiveSize()}updateEffectiveSize(){let t=this.baseSize,e=this.preferredSize,r=this.effectiveSize,i=this.scale;e.width!==vt?r.width=e.width:e.height!==vt?r.width=Math.round(e.height*(t.width/Math.max(t.height,1))):r.width=Math.round(t.width*i),e.height!==vt?r.height=e.height:e.width!==vt?r.height=Math.round(e.width/Math.max(t.width/Math.max(t.height,1),1)):r.height=Math.round(t.height*i)}get width(){return this.effectiveSize.width}set width(t){this.preferredWidth=t}get height(){return this.effectiveSize.height}set height(t){this.preferredHeight=t}getWidth(){return this.width}getHeight(){return this.height}get scale(){return this.s}set scale(t){this.s!==t&&(this.s=t,this.preferredSize.setScalar(vt),this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}getScale(){return this.scale}setScale(t){this.scale=t}get baseWidth(){return this.baseSize.width}set baseWidth(t){this.baseSize.width!==t&&(this.baseSize.width=t,this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}getBaseWidth(){return this.baseWidth}setBaseWidth(t){this.baseWidth=t}get baseHeight(){return this.baseSize.height}set baseHeight(t){this.baseSize.height!==t&&(this.baseSize.height=t,this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}getBaseHeight(){return this.baseHeight}setBaseHeight(t){this.baseHeight=t}setBaseSize(t,e){(this.baseSize.width!==t||this.baseSize.height!==e)&&(this.baseSize.set(t,e),this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}get preferredWidth(){return this.preferredSize.width}set preferredWidth(t){this.preferredSize.width!==t&&(this.preferredSize.width=t,this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}getPreferredWidth(){return this.preferredWidth}setPreferredWidth(t){this.preferredWidth=t}get preferredHeight(){return this.preferredSize.height}set preferredHeight(t){this.preferredSize.height!==t&&(this.preferredSize.height=t,this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}getPreferredHeight(){return this.preferredHeight}setPreferredHeight(t){this.preferredHeight=t}setPreferredSize(t,e){(this.preferredSize.width!==t||this.preferredSize.height!==e)&&(this.preferredSize.set(t,e),this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height))}copy(t){this.s=t.scale,this.baseSize.set(t.baseWidth,t.baseHeight),this.preferredSize.set(t.preferredWidth,t.preferredHeight),this.dispatchEvent({type:"change"}),this.resizable.setSize(this.baseSize.width,this.baseSize.height)}static get AUTO_SIZE(){return vt}};var F={SKIP:9,SET:30,ADD:0,ALPHA:1,AVERAGE:2,COLOR:3,COLOR_BURN:4,COLOR_DODGE:5,DARKEN:6,DIFFERENCE:7,DIVIDE:8,DST:9,EXCLUSION:10,HARD_LIGHT:11,HARD_MIX:12,HUE:13,INVERT:14,INVERT_RGB:15,LIGHTEN:16,LINEAR_BURN:17,LINEAR_DODGE:18,LINEAR_LIGHT:19,LUMINOSITY:20,MULTIPLY:21,NEGATION:22,NORMAL:23,OVERLAY:24,PIN_LIGHT:25,REFLECT:26,SATURATION:27,SCREEN:28,SOFT_LIGHT:29,SRC:30,SUBTRACT:31,VIVID_LIGHT:32},Uo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Lo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return mix(dst,src,src.a*opacity);}",Bo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=(dst.rgb+src.rgb)*0.5;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Fo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(b.xy,a.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ho="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=dst.rgb,b=src.rgb;vec3 c=mix(step(0.0,b)*(1.0-min(vec3(1.0),(1.0-a)/max(b,1e-9))),vec3(1.0),step(1.0,a));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Go="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=dst.rgb,b=src.rgb;vec3 c=step(0.0,a)*mix(min(vec3(1.0),a/max(1.0-b,1e-9)),vec3(1.0),step(1.0,b));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",zo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=min(dst.rgb,src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ko="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=abs(dst.rgb-src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Wo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb/max(src.rgb,1e-9);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Vo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb-2.0*dst.rgb*src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Yo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=min(dst.rgb,1.0);vec3 b=min(src.rgb,1.0);vec3 c=mix(2.0*a*b,1.0-2.0*(1.0-a)*(1.0-b),step(0.5,b));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Xo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=step(1.0,dst.rgb+src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Qo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(b.x,a.yz));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Zo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(1.0-src.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Ko="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=src.rgb*max(1.0-dst.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",jo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(dst.rgb,src.rgb);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",qo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=clamp(src.rgb+dst.rgb-1.0,0.0,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",Jo="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=min(dst.rgb+src.rgb,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",$o="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=clamp(2.0*src.rgb+dst.rgb-1.0,0.0,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ec="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(a.xy,b.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",tc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb*src.rgb;return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",rc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(1.0-abs(1.0-dst.rgb-src.rgb),0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ic="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return mix(dst,src,opacity);}",nc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=2.0*src.rgb*dst.rgb;vec3 b=1.0-2.0*(1.0-src.rgb)*(1.0-dst.rgb);vec3 c=mix(a,b,step(0.5,dst.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",ac="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 src2=2.0*src.rgb;vec3 c=mix(mix(src2,dst.rgb,step(0.5*dst.rgb,src.rgb)),max(src2-1.0,vec3(0.0)),step(dst.rgb,src2-1.0));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",sc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=min(dst.rgb*dst.rgb/max(1.0-src.rgb,1e-9),1.0);vec3 c=mix(a,src.rgb,step(1.0,src.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",oc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 a=RGBToHSL(dst.rgb);vec3 b=RGBToHSL(src.rgb);vec3 c=HSLToRGB(vec3(a.x,b.y,a.z));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",cc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=dst.rgb+src.rgb-min(dst.rgb*src.rgb,1.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",lc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 src2=2.0*src.rgb;vec3 d=dst.rgb+(src2-1.0);vec3 w=step(0.5,src.rgb);vec3 a=dst.rgb-(1.0-src2)*dst.rgb*(1.0-dst.rgb);vec3 b=mix(d*(sqrt(dst.rgb)-dst.rgb),d*dst.rgb*((16.0*dst.rgb-12.0)*dst.rgb+3.0),w*(1.0-step(0.25,dst.rgb)));vec3 c=mix(a,b,w);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",uc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){return src;}",hc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=max(dst.rgb-src.rgb,0.0);return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",dc="vec4 blend(const in vec4 dst,const in vec4 src,const in float opacity){vec3 c=mix(max(1.0-min((1.0-dst.rgb)/(2.0*src.rgb),1.0),0.0),min(dst.rgb/(2.0*(1.0-src.rgb)),1.0),step(0.5,src.rgb));return mix(dst,vec4(c,max(dst.a,src.a)),opacity);}",fc=new Map([[F.ADD,Uo],[F.ALPHA,Lo],[F.AVERAGE,Bo],[F.COLOR,Fo],[F.COLOR_BURN,Ho],[F.COLOR_DODGE,Go],[F.DARKEN,zo],[F.DIFFERENCE,ko],[F.DIVIDE,Wo],[F.DST,null],[F.EXCLUSION,Vo],[F.HARD_LIGHT,Yo],[F.HARD_MIX,Xo],[F.HUE,Qo],[F.INVERT,Zo],[F.INVERT_RGB,Ko],[F.LIGHTEN,jo],[F.LINEAR_BURN,qo],[F.LINEAR_DODGE,Jo],[F.LINEAR_LIGHT,$o],[F.LUMINOSITY,ec],[F.MULTIPLY,tc],[F.NEGATION,rc],[F.NORMAL,ic],[F.OVERLAY,nc],[F.PIN_LIGHT,ac],[F.REFLECT,sc],[F.SATURATION,oc],[F.SCREEN,cc],[F.SOFT_LIGHT,lc],[F.SRC,uc],[F.SUBTRACT,hc],[F.VIVID_LIGHT,dc]]),mc=class extends bo{constructor(t,e=1){super(),this._blendFunction=t,this.opacity=new Oo(e)}getOpacity(){return this.opacity.value}setOpacity(t){this.opacity.value=t}get blendFunction(){return this._blendFunction}set blendFunction(t){this._blendFunction=t,this.dispatchEvent({type:"change"})}getBlendFunction(){return this.blendFunction}setBlendFunction(t){this.blendFunction=t}getShaderCode(){return fc.get(this.blendFunction)}};var Yr=class extends gc{constructor(t,e,{attributes:r=lr.NONE,blendFunction:i=F.NORMAL,defines:a=new Map,uniforms:s=new Map,extensions:o=null,vertexShader:u=null}={}){super(),this.name=t,this.renderer=null,this.attributes=r,this.fragmentShader=e,this.vertexShader=u,this.defines=a,this.uniforms=s,this.extensions=o,this.blendMode=new mc(i),this.blendMode.addEventListener("change",d=>this.setChanged()),this._inputColorSpace=vc,this._outputColorSpace=Tc}get inputColorSpace(){return this._inputColorSpace}set inputColorSpace(t){this._inputColorSpace=t,this.setChanged()}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t,this.setChanged()}set mainScene(t){}set mainCamera(t){}getName(){return this.name}setRenderer(t){this.renderer=t}getDefines(){return this.defines}getUniforms(){return this.uniforms}getExtensions(){return this.extensions}getBlendMode(){return this.blendMode}getAttributes(){return this.attributes}setAttributes(t){this.attributes=t,this.setChanged()}getFragmentShader(){return this.fragmentShader}setFragmentShader(t){this.fragmentShader=t,this.setChanged()}getVertexShader(){return this.vertexShader}setVertexShader(t){this.vertexShader=t,this.setChanged()}setChanged(){this.dispatchEvent({type:"change"})}setDepthTexture(t,e=pc){}update(t,e,r){}setSize(t,e){}initialize(t,e,r){}dispose(){for(let t of Object.keys(this)){let e=this[t];(e instanceof xc||e instanceof Ac||e instanceof Sc||e instanceof cr)&&this[t].dispose()}}};var sf=[new Float32Array([0,0]),new Float32Array([0,1,1]),new Float32Array([0,1,1,2]),new Float32Array([0,1,2,2,3]),new Float32Array([0,1,2,3,4,4,5]),new Float32Array([0,1,2,3,4,5,7,8,9,10])];var ur=class extends cr{constructor(t,e="inputBuffer"){super("ShaderPass"),this.fullscreenMaterial=t,this.input=e}setInput(t){this.input=t}render(t,e,r,i,a){let s=this.fullscreenMaterial.uniforms;e!==null&&s!==void 0&&s[this.input]!==void 0&&(s[this.input].value=e.texture),t.setRenderTarget(this.renderToScreen?null:r),t.render(this.scene,this.camera)}initialize(t,e,r){r!==void 0&&r!==Ec&&(this.fullscreenMaterial.defines.FRAMEBUFFER_PRECISION_HIGH="1")}};var ap=Math.PI*.5;var jg=Number(wc.replace(/\D+/g,"")),wt=255/256,qg=new Float32Array([wt/256**3,wt/256**2,wt/256,wt]),Jg=new Float32Array([wt,wt/256,wt/256**2,1/256**3]);var fv=[new Float32Array(3),new Float32Array(3)],mv=[new Float32Array(3),new Float32Array(3),new Float32Array(3),new Float32Array(3)],pv=[[new Float32Array([0,0,0]),new Float32Array([1,0,0]),new Float32Array([1,1,0]),new Float32Array([1,1,1])],[new Float32Array([0,0,0]),new Float32Array([1,0,0]),new Float32Array([1,0,1]),new Float32Array([1,1,1])],[new Float32Array([0,0,0]),new Float32Array([0,0,1]),new Float32Array([1,0,1]),new Float32Array([1,1,1])],[new Float32Array([0,0,0]),new Float32Array([0,1,0]),new Float32Array([1,1,0]),new Float32Array([1,1,1])],[new Float32Array([0,0,0]),new Float32Array([0,1,0]),new Float32Array([0,1,1]),new Float32Array([1,1,1])],[new Float32Array([0,0,0]),new Float32Array([0,0,1]),new Float32Array([0,1,1]),new Float32Array([1,1,1])]];var gv=[new Float32Array(2),new Float32Array(2)];var vv=new Float32Array([0,-.25,.25,-.125,.125,-.375,.375]),Av=[new Float32Array([0,0]),new Float32Array([.25,-.25]),new Float32Array([-.25,.25]),new Float32Array([.125,-.125]),new Float32Array([-.125,.125])],Tv=[new Uint8Array([0,0]),new Uint8Array([3,0]),new Uint8Array([0,3]),new Uint8Array([3,3]),new Uint8Array([1,0]),new Uint8Array([4,0]),new Uint8Array([1,3]),new Uint8Array([4,3]),new Uint8Array([0,1]),new Uint8Array([3,1]),new Uint8Array([0,4]),new Uint8Array([3,4]),new Uint8Array([1,1]),new Uint8Array([4,1]),new Uint8Array([1,4]),new Uint8Array([4,4])],Sv=[new Uint8Array([0,0]),new Uint8Array([1,0]),new Uint8Array([0,2]),new Uint8Array([1,2]),new Uint8Array([2,0]),new Uint8Array([3,0]),new Uint8Array([2,2]),new Uint8Array([3,2]),new Uint8Array([0,1]),new Uint8Array([1,1]),new Uint8Array([0,3]),new Uint8Array([1,3]),new Uint8Array([2,1]),new Uint8Array([3,1]),new Uint8Array([2,3]),new Uint8Array([3,3])];var wv=new Map([[Ee(0,0,0,0),new Float32Array([0,0,0,0])],[Ee(0,0,0,1),new Float32Array([0,0,0,1])],[Ee(0,0,1,0),new Float32Array([0,0,1,0])],[Ee(0,0,1,1),new Float32Array([0,0,1,1])],[Ee(0,1,0,0),new Float32Array([0,1,0,0])],[Ee(0,1,0,1),new Float32Array([0,1,0,1])],[Ee(0,1,1,0),new Float32Array([0,1,1,0])],[Ee(0,1,1,1),new Float32Array([0,1,1,1])],[Ee(1,0,0,0),new Float32Array([1,0,0,0])],[Ee(1,0,0,1),new Float32Array([1,0,0,1])],[Ee(1,0,1,0),new Float32Array([1,0,1,0])],[Ee(1,0,1,1),new Float32Array([1,0,1,1])],[Ee(1,1,0,0),new Float32Array([1,1,0,0])],[Ee(1,1,0,1),new Float32Array([1,1,0,1])],[Ee(1,1,1,0),new Float32Array([1,1,1,0])],[Ee(1,1,1,1),new Float32Array([1,1,1,1])]]);function Mi(t,e,r){return t+(e-t)*r}function Ee(t,e,r,i){let a=Mi(t,e,.75),s=Mi(r,i,1-.25);return Mi(a,s,1-.125)}import{Vector3 as ae,Vector2 as se,Matrix4 as ce,Object3D as _s,Box3 as ih,Uniform as g,GLSL3 as yi,Vector4 as Re,RawShaderMaterial as Bn,Camera as Bs,WebGLRenderTarget as nh,HalfFloatType as Fs,LinearFilter as Ti,RedFormat as ah,WebGLArrayRenderTarget as sh,EventDispatcher as oh,Matrix3 as ch,Texture as Ms,Data3DTexture as Ps}from"./three.module.js";import{Vector3 as K,Color as En,Uniform as _,Camera as Su,Vector2 as wn,Matrix4 as Fe,RawShaderMaterial as xu,Quaternion as k2,HalfFloatType as Sn,MeshBasicMaterial as W2,DepthTexture as V2,UnsignedIntType as Y2,WebGLRenderTarget as X2,RedFormat as Q2,RGBADepthPacking as Z2,LessEqualDepth as K2,BasicDepthPacking as j2,Matrix3 as q2,Mesh as J2,PlaneGeometry as $2,Scene as eA,FloatType as os,GLSL3 as Ts,CustomBlending as tA,NoBlending as rA,AddEquation as iA,OneFactor as nA,RGBAFormat as aA,LinearFilter as cs,ClampToEdgeWrapping as sA,NoColorSpace as oA,WebGL3DRenderTarget as cA,Loader as Eu,Data3DTexture as An,DataTexture as ls,LightProbe as lA,BufferGeometry as uA,InterleavedBuffer as hA,InterleavedBufferAttribute as dA,Sphere as fA,DirectionalLight as mA}from"./three.module.js";import{Loader as wr,FileLoader as Vc,BufferGeometry as s2,BufferAttribute as o2,Box3 as c2,Vector3 as l2,Sphere as u2,WebGLRenderer as Yc,LinearFilter as la,RGBAFormat as Xc,ByteType as Qc,UnsignedByteType as ua,ShortType as Zc,UnsignedShortType as Kc,IntType as jc,UnsignedIntType as qc,HalfFloatType as Jc,FloatType as ha,MathUtils as Ve,Material as ai,Data3DTexture as $c,DataTexture as el,Quaternion as h2,Matrix4 as d2,Ray as f2,Vector2 as m2}from"./three.module.js";var yc=!0,Ni="Invariant failed";function yt(t,e){if(!t){if(yc)throw new Error(Ni);var r=typeof e=="function"?e():e,i=r?"".concat(Ni,": ").concat(r):Ni;throw new Error(i)}}import{BufferGeometry as Pv,Sphere as Nv,Vector3 as bv,Float32BufferAttribute as Ov,Loader as Uv,Data3DTexture as Lv,FileLoader as Bv,UnsignedByteType as Fv,RedFormat as Hv,NearestFilter as Gv,RepeatWrapping as zv}from"./three.module.js";var Cc="9627216cc50057994c98a2118f3c4a23765d43b9",Dc=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${Cc}/packages/core/assets/stbn.bin`;import{Vector3 as he,Matrix4 as qn,BufferGeometry as Yv,BufferAttribute as Xv}from"./three.module.js";var Rc=new he;function $n(t,e,r=new he,i){let{x:a,y:s,z:o}=t,u=e.x,d=e.y,p=e.z,A=a*a*u,S=s*s*d,P=o*o*p,B=A+S+P,z=Math.sqrt(1/B);if(!Number.isFinite(z))return;let $=Rc.copy(t).multiplyScalar(z);if(B<(i?.centerTolerance??.1))return r.copy($);let oe=$.multiply(e).multiplyScalar(2),ve=(1-z)*t.length()/(oe.length()/2),_e=0,re,le,ie,we;do{ve-=_e,re=1/(1+ve*u),le=1/(1+ve*d),ie=1/(1+ve*p);let Me=re*re,He=le*le,Ae=ie*ie,tt=Me*re,de=He*le,Se=Ae*ie;we=A*Me+S*He+P*Ae-1,_e=we/((A*tt*u+S*de*d+P*Se*p)*-2)}while(Math.abs(we)>1e-12);return r.set(a*re,s*le,o*ie)}var bt=new he,bi=new he,Oi=new he,Ui=class{constructor(e,r,i){this.radii=new he(e,r,i)}get minimumRadius(){return Math.min(this.radii.x,this.radii.y,this.radii.z)}get maximumRadius(){return Math.max(this.radii.x,this.radii.y,this.radii.z)}get flattening(){return 1-this.minimumRadius/this.maximumRadius}get eccentricity(){return Math.sqrt(this.eccentricitySquared)}get eccentricitySquared(){let e=this.maximumRadius**2,r=this.minimumRadius**2;return(e-r)/e}reciprocalRadii(e=new he){let{x:r,y:i,z:a}=this.radii;return e.set(1/r,1/i,1/a)}reciprocalRadiiSquared(e=new he){let{x:r,y:i,z:a}=this.radii;return e.set(1/r**2,1/i**2,1/a**2)}projectOnSurface(e,r=new he,i){return $n(e,this.reciprocalRadiiSquared(),r,i)}getSurfaceNormal(e,r=new he){return r.multiplyVectors(this.reciprocalRadiiSquared(bt),e).normalize()}getEastNorthUpVectors(e,r=new he,i=new he,a=new he){this.getSurfaceNormal(e,a),r.set(-e.y,e.x,0).normalize(),i.crossVectors(a,r).normalize()}getEastNorthUpFrame(e,r=new qn){let i=bt,a=bi,s=Oi;return this.getEastNorthUpVectors(e,i,a,s),r.makeBasis(i,a,s).setPosition(e)}getNorthUpEastFrame(e,r=new qn){let i=bt,a=bi,s=Oi;return this.getEastNorthUpVectors(e,i,a,s),r.makeBasis(a,s,i).setPosition(e)}getIntersection(e,r=new he){let i=this.reciprocalRadii(bt),a=bi.copy(i).multiply(e.origin),s=Oi.copy(i).multiply(e.direction),o=a.lengthSq(),u=s.lengthSq(),d=a.dot(s),p=d**2-u*(o-1);if(o===1)return r.copy(e.origin);if(o>1){if(d>=0||p<0)return;let A=Math.sqrt(p),S=(-d-A)/u,P=(-d+A)/u;return e.at(Math.min(S,P),r)}if(o<1){let A=d**2-u*(o-1),S=Math.sqrt(A),P=(-d+S)/u;return e.at(P,r)}if(d<0)return e.at(-d/u,r)}getOsculatingSphereCenter(e,r,i=new he){yt(this.radii.x===this.radii.y);let a=this.radii.x**2,s=this.radii.z**2,o=bt.set(e.x/a,e.y/a,e.z/s).normalize();return i.copy(o.multiplyScalar(-r).add(e))}getNormalAtHorizon(e,r,i=new he){yt(this.radii.x===this.radii.y);let a=this.radii.x**2,s=this.radii.z**2,o=e,u=r,d=(o.x*u.x+o.y*u.y)/a+o.z*u.z/s;d/=(o.x**2+o.y**2)/a+o.z**2/s;let p=bt.copy(u).multiplyScalar(-d).add(e);return i.set(p.x/a,p.y/a,p.z/s).normalize()}};Ui.WGS84=new Ui(6378137,6378137,6356752314245179e-9);var je=Ui;var Xr=new he,Jn=new he,hr=class Li{constructor(e=0,r=0,i=0){this.longitude=e,this.latitude=r,this.height=i}set(e,r,i){return this.longitude=e,this.latitude=r,i!=null&&(this.height=i),this}clone(){return new Li(this.longitude,this.latitude,this.height)}copy(e){return this.longitude=e.longitude,this.latitude=e.latitude,this.height=e.height,this}equals(e){return e.longitude===this.longitude&&e.latitude===this.latitude&&e.height===this.height}setLongitude(e){return this.longitude=e,this}setLatitude(e){return this.latitude=e,this}setHeight(e){return this.height=e,this}normalize(){return this.longitude<Li.MIN_LONGITUDE&&(this.longitude+=Math.PI*2),this}setFromECEF(e,r){let i=(r?.ellipsoid??je.WGS84).reciprocalRadiiSquared(Xr),a=$n(e,i,Jn,r);if(a==null)throw new Error(`Could not project position to ellipsoid surface: ${e.toArray()}`);let s=Xr.multiplyVectors(a,i).normalize();this.longitude=Math.atan2(s.y,s.x),this.latitude=Math.asin(s.z);let o=Xr.subVectors(e,a);return this.height=Math.sign(o.dot(e))*o.length(),this}toECEF(e=new he,r){let i=r?.ellipsoid??je.WGS84,a=Xr.multiplyVectors(i.radii,i.radii),s=Math.cos(this.latitude),o=Jn.set(s*Math.cos(this.longitude),s*Math.sin(this.longitude),Math.sin(this.latitude)).normalize();return e.multiplyVectors(a,o),e.divideScalar(Math.sqrt(o.dot(e))).add(o.multiplyScalar(this.height))}fromArray(e,r=0){return this.longitude=e[r],this.latitude=e[r+1],this.height=e[r+2],this}toArray(e=[],r=0){return e[r]=this.longitude,e[r+1]=this.latitude,e[r+2]=this.height,e}*[Symbol.iterator](){yield this.longitude,yield this.latitude,yield this.height}};hr.MIN_LONGITUDE=-Math.PI,hr.MAX_LONGITUDE=Math.PI,hr.MIN_LATITUDE=-Math.PI/2,hr.MAX_LATITUDE=Math.PI/2;var qe=hr;import{DataTextureLoader as Wc,DataUtils as oa,FloatType as Gi,HalfFloatType as Qr,LinearFilter as ca,LinearSRGBColorSpace as Ct,RedFormat as Zr,RGFormat as pr,RGBAFormat as Ut}from"./three.module.js";var Le=Uint8Array,Ot=Uint16Array,Ic=Int32Array,ea=new Le([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),ta=new Le([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),_c=new Le([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),ra=function(t,e){for(var r=new Ot(31),i=0;i<31;++i)r[i]=e+=1<<t[i-1];for(var a=new Ic(r[30]),i=1;i<30;++i)for(var s=r[i];s<r[i+1];++s)a[s]=s-r[i]<<5|i;return{b:r,r:a}},ia=ra(ea,2),na=ia.b,Mc=ia.r;na[28]=258,Mc[258]=28;var aa=ra(ta,0),Pc=aa.b,jv=aa.r,Hi=new Ot(32768);for(W=0;W<32768;++W)nt=(W&43690)>>1|(W&21845)<<1,nt=(nt&52428)>>2|(nt&13107)<<2,nt=(nt&61680)>>4|(nt&3855)<<4,Hi[W]=((nt&65280)>>8|(nt&255)<<8)>>1;var nt,W,dr=(function(t,e,r){for(var i=t.length,a=0,s=new Ot(e);a<i;++a)t[a]&&++s[t[a]-1];var o=new Ot(e);for(a=1;a<e;++a)o[a]=o[a-1]+s[a-1]<<1;var u;if(r){u=new Ot(1<<e);var d=15-e;for(a=0;a<i;++a)if(t[a])for(var p=a<<4|t[a],A=e-t[a],S=o[t[a]-1]++<<A,P=S|(1<<A)-1;S<=P;++S)u[Hi[S]>>d]=p}else for(u=new Ot(i),a=0;a<i;++a)t[a]&&(u[a]=Hi[o[t[a]-1]++]>>15-t[a]);return u}),fr=new Le(288);for(W=0;W<144;++W)fr[W]=8;var W;for(W=144;W<256;++W)fr[W]=9;var W;for(W=256;W<280;++W)fr[W]=7;var W;for(W=280;W<288;++W)fr[W]=8;var W,sa=new Le(32);for(W=0;W<32;++W)sa[W]=5;var W;var Nc=dr(fr,9,1);var bc=dr(sa,5,1),Bi=function(t){for(var e=t[0],r=1;r<t.length;++r)t[r]>e&&(e=t[r]);return e},Ge=function(t,e,r){var i=e/8|0;return(t[i]|t[i+1]<<8)>>(e&7)&r},Fi=function(t,e){var r=e/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(e&7)},Oc=function(t){return(t+7)/8|0},Uc=function(t,e,r){return(e==null||e<0)&&(e=0),(r==null||r>t.length)&&(r=t.length),new Le(t.subarray(e,r))};var Lc=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],ze=function(t,e,r){var i=new Error(e||Lc[t]);if(i.code=t,Error.captureStackTrace&&Error.captureStackTrace(i,ze),!r)throw i;return i},Bc=function(t,e,r,i){var a=t.length,s=i?i.length:0;if(!a||e.f&&!e.l)return r||new Le(0);var o=!r,u=o||e.i!=2,d=e.i;o&&(r=new Le(a*3));var p=function(nr){var zr=r.length;if(nr>zr){var ar=new Le(Math.max(zr*2,nr));ar.set(r),r=ar}},A=e.f||0,S=e.p||0,P=e.b||0,B=e.l,z=e.d,$=e.m,oe=e.n,ve=a*8;do{if(!B){A=Ge(t,S,1);var _e=Ge(t,S+1,3);if(S+=3,_e)if(_e==1)B=Nc,z=bc,$=9,oe=5;else if(_e==2){var we=Ge(t,S,31)+257,Me=Ge(t,S+10,15)+4,He=we+Ge(t,S+5,31)+1;S+=14;for(var Ae=new Le(He),tt=new Le(19),de=0;de<Me;++de)tt[_c[de]]=Ge(t,S+de*3,7);S+=Me*3;for(var Se=Bi(tt),Fr=(1<<Se)-1,St=dr(tt,Se,1),de=0;de<He;){var Hr=St[Ge(t,S,Fr)];S+=Hr&15;var re=Hr>>4;if(re<16)Ae[de++]=re;else{var ft=0,xt=0;for(re==16?(xt=3+Ge(t,S,3),S+=2,ft=Ae[de-1]):re==17?(xt=3+Ge(t,S,7),S+=3):re==18&&(xt=11+Ge(t,S,127),S+=7);xt--;)Ae[de++]=ft}}var rr=Ae.subarray(0,we),Ye=Ae.subarray(we);$=Bi(rr),oe=Bi(Ye),B=dr(rr,$,1),z=dr(Ye,oe,1)}else ze(1);else{var re=Oc(S)+4,le=t[re-4]|t[re-3]<<8,ie=re+le;if(ie>a){d&&ze(0);break}u&&p(P+le),r.set(t.subarray(re,ie),P),e.b=P+=le,e.p=S=ie*8,e.f=A;continue}if(S>ve){d&&ze(0);break}}u&&p(P+131072);for(var Xe=(1<<$)-1,ir=(1<<oe)-1,be=S;;be=S){var ft=B[Fi(t,S)&Xe],Qe=ft>>4;if(S+=ft&15,S>ve){d&&ze(0);break}if(ft||ze(2),Qe<256)r[P++]=Qe;else if(Qe==256){be=S,B=null;break}else{var Nt=Qe-254;if(Qe>264){var de=Qe-257,mt=ea[de];Nt=Ge(t,S,(1<<mt)-1)+na[de],S+=mt}var Q=z[Fi(t,S)&ir],Ze=Q>>4;Q||ze(3),S+=Q&15;var Ye=Pc[Ze];if(Ze>3){var mt=ta[Ze];Ye+=Fi(t,S)&(1<<mt)-1,S+=mt}if(S>ve){d&&ze(0);break}u&&p(P+131072);var rt=P+Nt;if(P<Ye){var Gr=s-Ye,Di=Math.min(Ye,rt);for(Gr+P<0&&ze(3);P<Di;++P)r[P]=i[Gr+P]}for(;P<rt;++P)r[P]=r[P-Ye]}}e.l=B,e.p=be,e.b=P,e.f=A,B&&(A=1,e.m=$,e.d=z,e.n=oe)}while(!A);return P!=r.length&&o?Uc(r,0,P):r.subarray(0,P)};var Fc=new Le(0);var Hc=function(t,e){return((t[0]&15)!=8||t[0]>>4>7||(t[0]<<8|t[1])%31)&&ze(6,"invalid zlib data"),(t[1]>>5&1)==+!e&&ze(6,"invalid zlib data: "+(t[1]&32?"need":"unexpected")+" dictionary"),(t[1]>>3&4)+2};function mr(t,e){return Bc(t.subarray(Hc(t,e&&e.dictionary),-4),{i:2},e&&e.out,e&&e.dictionary)}var Gc=typeof TextDecoder<"u"&&new TextDecoder,zc=0;try{Gc.decode(Fc,{stream:!0}),zc=1}catch{}var gr=class extends Wc{constructor(e){super(e),this.type=Qr,this.outputFormat=Ut}parse(e){let Ae=Math.pow(2.7182818,2.2);function tt(n,c){let l=0;for(let m=0;m<65536;++m)(m==0||n[m>>3]&1<<(m&7))&&(c[l++]=m);let f=l-1;for(;l<65536;)c[l++]=0;return f}function de(n){for(let c=0;c<16384;c++)n[c]={},n[c].len=0,n[c].lit=0,n[c].p=null}let Se={l:0,c:0,lc:0};function Fr(n,c,l,f,m){for(;l<n;)c=c<<8|Yn(f,m),l+=8;l-=n,Se.l=c>>l&(1<<n)-1,Se.c=c,Se.lc=l}let St=new Array(59);function Hr(n){for(let l=0;l<=58;++l)St[l]=0;for(let l=0;l<65537;++l)St[n[l]]+=1;let c=0;for(let l=58;l>0;--l){let f=c+St[l]>>1;St[l]=c,c=f}for(let l=0;l<65537;++l){let f=n[l];f>0&&(n[l]=f|St[f]++<<6)}}function ft(n,c,l,f,m,E){let h=c,w=0,T=0;for(;f<=m;f++){if(h.value-c.value>l)return!1;Fr(6,w,T,n,h);let v=Se.l;if(w=Se.c,T=Se.lc,E[f]=v,v==63){if(h.value-c.value>l)throw new Error("Something wrong with hufUnpackEncTable");Fr(8,w,T,n,h);let x=Se.l+6;if(w=Se.c,T=Se.lc,f+x>m+1)throw new Error("Something wrong with hufUnpackEncTable");for(;x--;)E[f++]=0;f--}else if(v>=59){let x=v-59+2;if(f+x>m+1)throw new Error("Something wrong with hufUnpackEncTable");for(;x--;)E[f++]=0;f--}}Hr(E)}function xt(n){return n&63}function rr(n){return n>>6}function Ye(n,c,l,f){for(;c<=l;c++){let m=rr(n[c]),E=xt(n[c]);if(m>>E)throw new Error("Invalid table entry");if(E>14){let h=f[m>>E-14];if(h.len)throw new Error("Invalid table entry");if(h.lit++,h.p){let w=h.p;h.p=new Array(h.lit);for(let T=0;T<h.lit-1;++T)h.p[T]=w[T]}else h.p=new Array(1);h.p[h.lit-1]=c}else if(E){let h=0;for(let w=1<<14-E;w>0;w--){let T=f[(m<<14-E)+h];if(T.len||T.p)throw new Error("Invalid table entry");T.len=E,T.lit=c,h++}}}return!0}let Xe={c:0,lc:0};function ir(n,c,l,f){n=n<<8|Yn(l,f),c+=8,Xe.c=n,Xe.lc=c}let be={c:0,lc:0};function Qe(n,c,l,f,m,E,h,w,T){if(n==c){f<8&&(ir(l,f,m,E),l=Xe.c,f=Xe.lc),f-=8;let v=l>>f;if(v=new Uint8Array([v])[0],w.value+v>T)return!1;let x=h[w.value-1];for(;v-- >0;)h[w.value++]=x}else if(w.value<T)h[w.value++]=n;else return!1;be.c=l,be.lc=f}function Nt(n){return n&65535}function mt(n){let c=Nt(n);return c>32767?c-65536:c}let Q={a:0,b:0};function Ze(n,c){let l=mt(n),m=mt(c),E=l+(m&1)+(m>>1),h=E,w=E-m;Q.a=h,Q.b=w}function rt(n,c){let l=Nt(n),f=Nt(c),m=l-(f>>1)&65535,E=f+m-32768&65535;Q.a=E,Q.b=m}function Gr(n,c,l,f,m,E,h){let w=h<16384,T=l>m?m:l,v=1,x,C;for(;v<=T;)v<<=1;for(v>>=1,x=v,v>>=1;v>=1;){C=0;let y=C+E*(m-x),R=E*v,N=E*x,D=f*v,M=f*x,b,k,j,ue;for(;C<=y;C+=N){let Z=C,U=C+f*(l-x);for(;Z<=U;Z+=M){let ne=Z+D,fe=Z+R,ee=fe+D;w?(Ze(n[Z+c],n[fe+c]),b=Q.a,j=Q.b,Ze(n[ne+c],n[ee+c]),k=Q.a,ue=Q.b,Ze(b,k),n[Z+c]=Q.a,n[ne+c]=Q.b,Ze(j,ue),n[fe+c]=Q.a,n[ee+c]=Q.b):(rt(n[Z+c],n[fe+c]),b=Q.a,j=Q.b,rt(n[ne+c],n[ee+c]),k=Q.a,ue=Q.b,rt(b,k),n[Z+c]=Q.a,n[ne+c]=Q.b,rt(j,ue),n[fe+c]=Q.a,n[ee+c]=Q.b)}if(l&v){let ne=Z+R;w?Ze(n[Z+c],n[ne+c]):rt(n[Z+c],n[ne+c]),b=Q.a,n[ne+c]=Q.b,n[Z+c]=b}}if(m&v){let Z=C,U=C+f*(l-x);for(;Z<=U;Z+=M){let ne=Z+D;w?Ze(n[Z+c],n[ne+c]):rt(n[Z+c],n[ne+c]),b=Q.a,n[ne+c]=Q.b,n[Z+c]=b}}x=v,v>>=1}return C}function Di(n,c,l,f,m,E,h,w,T){let v=0,x=0,C=h,y=Math.trunc(f.value+(m+7)/8);for(;f.value<y;)for(ir(v,x,l,f),v=Xe.c,x=Xe.lc;x>=14;){let N=v>>x-14&16383,D=c[N];if(D.len)x-=D.len,Qe(D.lit,E,v,x,l,f,w,T,C),v=be.c,x=be.lc;else{if(!D.p)throw new Error("hufDecode issues");let M;for(M=0;M<D.lit;M++){let b=xt(n[D.p[M]]);for(;x<b&&f.value<y;)ir(v,x,l,f),v=Xe.c,x=Xe.lc;if(x>=b&&rr(n[D.p[M]])==(v>>x-b&(1<<b)-1)){x-=b,Qe(D.p[M],E,v,x,l,f,w,T,C),v=be.c,x=be.lc;break}}if(M==D.lit)throw new Error("hufDecode issues")}}let R=8-m&7;for(v>>=R,x-=R;x>0;){let N=c[v<<14-x&16383];if(N.len)x-=N.len,Qe(N.lit,E,v,x,l,f,w,T,C),v=be.c,x=be.lc;else throw new Error("hufDecode issues")}return!0}function nr(n,c,l,f,m,E){let h={value:0},w=l.value,T=Ue(c,l),v=Ue(c,l);l.value+=4;let x=Ue(c,l);if(l.value+=4,T<0||T>=65537||v<0||v>=65537)throw new Error("Something wrong with HUF_ENCSIZE");let C=new Array(65537),y=new Array(16384);de(y);let R=f-(l.value-w);if(ft(n,l,R,T,v,C),x>8*(f-(l.value-w)))throw new Error("Something wrong with hufUncompress");Ye(C,T,v,y),Di(C,y,n,l,x,v,E,m,h)}function zr(n,c,l){for(let f=0;f<l;++f)c[f]=n[c[f]]}function ar(n){for(let c=1;c<n.length;c++){let l=n[c-1]+n[c]-128;n[c]=l}}function Fn(n,c){let l=0,f=Math.floor((n.length+1)/2),m=0,E=n.length-1;for(;!(m>E||(c[m++]=n[l++],m>E));)c[m++]=n[f++]}function Hn(n){let c=n.byteLength,l=new Array,f=0,m=new DataView(n);for(;c>0;){let E=m.getInt8(f++);if(E<0){let h=-E;c-=h+1;for(let w=0;w<h;w++)l.push(m.getUint8(f++))}else{let h=E;c-=2;let w=m.getUint8(f++);for(let T=0;T<h+1;T++)l.push(w)}}return l}function Zs(n,c,l,f,m,E){let h=new DataView(E.buffer),w=l[n.idx[0]].width,T=l[n.idx[0]].height,v=3,x=Math.floor(w/8),C=Math.ceil(w/8),y=Math.ceil(T/8),R=w-(C-1)*8,N=T-(y-1)*8,D={value:0},M=new Array(v),b=new Array(v),k=new Array(v),j=new Array(v),ue=new Array(v);for(let U=0;U<v;++U)ue[U]=c[n.idx[U]],M[U]=U<1?0:M[U-1]+C*y,b[U]=new Float32Array(64),k[U]=new Uint16Array(64),j[U]=new Uint16Array(C*64);for(let U=0;U<y;++U){let ne=8;U==y-1&&(ne=N);let fe=8;for(let G=0;G<C;++G){G==C-1&&(fe=R);for(let q=0;q<v;++q)k[q].fill(0),k[q][0]=m[M[q]++],Gn(D,f,k[q]),zn(k[q],b[q]),kn(b[q]);v==3&&js(b);for(let q=0;q<v;++q)Wn(b[q],j[q],G*64)}let ee=0;for(let G=0;G<v;++G){let q=l[n.idx[G]].type;for(let it=8*U;it<8*U+ne;++it){ee=ue[G][it];for(let or=0;or<x;++or){let Ke=or*64+(it&7)*8;h.setUint16(ee+0*q,j[G][Ke+0],!0),h.setUint16(ee+2*q,j[G][Ke+1],!0),h.setUint16(ee+4*q,j[G][Ke+2],!0),h.setUint16(ee+6*q,j[G][Ke+3],!0),h.setUint16(ee+8*q,j[G][Ke+4],!0),h.setUint16(ee+10*q,j[G][Ke+5],!0),h.setUint16(ee+12*q,j[G][Ke+6],!0),h.setUint16(ee+14*q,j[G][Ke+7],!0),ee+=16*q}}if(x!=C)for(let it=8*U;it<8*U+ne;++it){let or=ue[G][it]+8*x*2*q,Ke=x*64+(it&7)*8;for(let Wr=0;Wr<fe;++Wr)h.setUint16(or+Wr*2*q,j[G][Ke+Wr],!0)}}}let Z=new Uint16Array(w);h=new DataView(E.buffer);for(let U=0;U<v;++U){l[n.idx[U]].decoded=!0;let ne=l[n.idx[U]].type;if(l[U].type==2)for(let fe=0;fe<T;++fe){let ee=ue[U][fe];for(let G=0;G<w;++G)Z[G]=h.getUint16(ee+G*2*ne,!0);for(let G=0;G<w;++G)h.setFloat32(ee+G*2*ne,I(Z[G]),!0)}}}function Ks(n,c,l,f,m,E){let h=new DataView(E.buffer),w=l[n],T=w.width,v=w.height,x=Math.ceil(T/8),C=Math.ceil(v/8),y=Math.floor(T/8),R=T-(x-1)*8,N=v-(C-1)*8,D={value:0},M=0,b=new Float32Array(64),k=new Uint16Array(64),j=new Uint16Array(x*64);for(let ue=0;ue<C;++ue){let Z=8;ue==C-1&&(Z=N);for(let U=0;U<x;++U)k.fill(0),k[0]=m[M++],Gn(D,f,k),zn(k,b),kn(b),Wn(b,j,U*64);for(let U=8*ue;U<8*ue+Z;++U){let ne=c[n][U];for(let fe=0;fe<y;++fe){let ee=fe*64+(U&7)*8;for(let G=0;G<8;++G)h.setUint16(ne+G*2*w.type,j[ee+G],!0);ne+=16*w.type}if(x!=y){let fe=y*64+(U&7)*8;for(let ee=0;ee<R;++ee)h.setUint16(ne+ee*2*w.type,j[fe+ee],!0)}}}w.decoded=!0}function Gn(n,c,l){let f,m=1;for(;m<64;)f=c[n.value],f==65280?m=64:f>>8==255?m+=f&255:(l[m]=f,m++),n.value++}function zn(n,c){c[0]=I(n[0]),c[1]=I(n[1]),c[2]=I(n[5]),c[3]=I(n[6]),c[4]=I(n[14]),c[5]=I(n[15]),c[6]=I(n[27]),c[7]=I(n[28]),c[8]=I(n[2]),c[9]=I(n[4]),c[10]=I(n[7]),c[11]=I(n[13]),c[12]=I(n[16]),c[13]=I(n[26]),c[14]=I(n[29]),c[15]=I(n[42]),c[16]=I(n[3]),c[17]=I(n[8]),c[18]=I(n[12]),c[19]=I(n[17]),c[20]=I(n[25]),c[21]=I(n[30]),c[22]=I(n[41]),c[23]=I(n[43]),c[24]=I(n[9]),c[25]=I(n[11]),c[26]=I(n[18]),c[27]=I(n[24]),c[28]=I(n[31]),c[29]=I(n[40]),c[30]=I(n[44]),c[31]=I(n[53]),c[32]=I(n[10]),c[33]=I(n[19]),c[34]=I(n[23]),c[35]=I(n[32]),c[36]=I(n[39]),c[37]=I(n[45]),c[38]=I(n[52]),c[39]=I(n[54]),c[40]=I(n[20]),c[41]=I(n[22]),c[42]=I(n[33]),c[43]=I(n[38]),c[44]=I(n[46]),c[45]=I(n[51]),c[46]=I(n[55]),c[47]=I(n[60]),c[48]=I(n[21]),c[49]=I(n[34]),c[50]=I(n[37]),c[51]=I(n[47]),c[52]=I(n[50]),c[53]=I(n[56]),c[54]=I(n[59]),c[55]=I(n[61]),c[56]=I(n[35]),c[57]=I(n[36]),c[58]=I(n[48]),c[59]=I(n[49]),c[60]=I(n[57]),c[61]=I(n[58]),c[62]=I(n[62]),c[63]=I(n[63])}function kn(n){let c=.5*Math.cos(.7853975),l=.5*Math.cos(3.14159/16),f=.5*Math.cos(3.14159/8),m=.5*Math.cos(3*3.14159/16),E=.5*Math.cos(5*3.14159/16),h=.5*Math.cos(3*3.14159/8),w=.5*Math.cos(7*3.14159/16),T=new Array(4),v=new Array(4),x=new Array(4),C=new Array(4);for(let y=0;y<8;++y){let R=y*8;T[0]=f*n[R+2],T[1]=h*n[R+2],T[2]=f*n[R+6],T[3]=h*n[R+6],v[0]=l*n[R+1]+m*n[R+3]+E*n[R+5]+w*n[R+7],v[1]=m*n[R+1]-w*n[R+3]-l*n[R+5]-E*n[R+7],v[2]=E*n[R+1]-l*n[R+3]+w*n[R+5]+m*n[R+7],v[3]=w*n[R+1]-E*n[R+3]+m*n[R+5]-l*n[R+7],x[0]=c*(n[R+0]+n[R+4]),x[3]=c*(n[R+0]-n[R+4]),x[1]=T[0]+T[3],x[2]=T[1]-T[2],C[0]=x[0]+x[1],C[1]=x[3]+x[2],C[2]=x[3]-x[2],C[3]=x[0]-x[1],n[R+0]=C[0]+v[0],n[R+1]=C[1]+v[1],n[R+2]=C[2]+v[2],n[R+3]=C[3]+v[3],n[R+4]=C[3]-v[3],n[R+5]=C[2]-v[2],n[R+6]=C[1]-v[1],n[R+7]=C[0]-v[0]}for(let y=0;y<8;++y)T[0]=f*n[16+y],T[1]=h*n[16+y],T[2]=f*n[48+y],T[3]=h*n[48+y],v[0]=l*n[8+y]+m*n[24+y]+E*n[40+y]+w*n[56+y],v[1]=m*n[8+y]-w*n[24+y]-l*n[40+y]-E*n[56+y],v[2]=E*n[8+y]-l*n[24+y]+w*n[40+y]+m*n[56+y],v[3]=w*n[8+y]-E*n[24+y]+m*n[40+y]-l*n[56+y],x[0]=c*(n[y]+n[32+y]),x[3]=c*(n[y]-n[32+y]),x[1]=T[0]+T[3],x[2]=T[1]-T[2],C[0]=x[0]+x[1],C[1]=x[3]+x[2],C[2]=x[3]-x[2],C[3]=x[0]-x[1],n[0+y]=C[0]+v[0],n[8+y]=C[1]+v[1],n[16+y]=C[2]+v[2],n[24+y]=C[3]+v[3],n[32+y]=C[3]-v[3],n[40+y]=C[2]-v[2],n[48+y]=C[1]-v[1],n[56+y]=C[0]-v[0]}function js(n){for(let c=0;c<64;++c){let l=n[0][c],f=n[1][c],m=n[2][c];n[0][c]=l+1.5747*m,n[1][c]=l-.1873*f-.4682*m,n[2][c]=l+1.8556*f}}function Wn(n,c,l){for(let f=0;f<64;++f)c[l+f]=oa.toHalfFloat(qs(n[f]))}function qs(n){return n<=1?Math.sign(n)*Math.pow(Math.abs(n),2.2):Math.sign(n)*Math.pow(Ae,Math.abs(n)-1)}function Ri(n){return new DataView(n.array.buffer,n.offset.value,n.size)}function Js(n){let c=n.viewer.buffer.slice(n.offset.value,n.offset.value+n.size),l=new Uint8Array(Hn(c)),f=new Uint8Array(l.length);return ar(l),Fn(l,f),new DataView(f.buffer)}function Ii(n){let c=n.array.slice(n.offset.value,n.offset.value+n.size),l=mr(c),f=new Uint8Array(l.length);return ar(l),Fn(l,f),new DataView(f.buffer)}function $s(n){let c=n.viewer,l={value:n.offset.value},f=new Uint16Array(n.columns*n.lines*(n.inputChannels.length*n.type)),m=new Uint8Array(8192),E=0,h=new Array(n.inputChannels.length);for(let N=0,D=n.inputChannels.length;N<D;N++)h[N]={},h[N].start=E,h[N].end=h[N].start,h[N].nx=n.columns,h[N].ny=n.lines,h[N].size=n.type,E+=h[N].nx*h[N].ny*h[N].size;let w=sr(c,l),T=sr(c,l);if(T>=8192)throw new Error("Something is wrong with PIZ_COMPRESSION BITMAP_SIZE");if(w<=T)for(let N=0;N<T-w+1;N++)m[N+w]=pt(c,l);let v=new Uint16Array(65536),x=tt(m,v),C=Ue(c,l);nr(n.array,c,l,C,f,E);for(let N=0;N<n.inputChannels.length;++N){let D=h[N];for(let M=0;M<h[N].size;++M)Gr(f,D.start+M,D.nx,D.size,D.ny,D.nx*D.size,x)}zr(v,f,E);let y=0,R=new Uint8Array(f.buffer.byteLength);for(let N=0;N<n.lines;N++)for(let D=0;D<n.inputChannels.length;D++){let M=h[D],b=M.nx*M.size,k=new Uint8Array(f.buffer,M.end*2,b*2);R.set(k,y),y+=b*2,M.end+=b}return new DataView(R.buffer)}function eo(n){let c=n.array.slice(n.offset.value,n.offset.value+n.size),l=mr(c),f=n.inputChannels.length*n.lines*n.columns*n.totalBytes,m=new ArrayBuffer(f),E=new DataView(m),h=0,w=0,T=new Array(4);for(let v=0;v<n.lines;v++)for(let x=0;x<n.inputChannels.length;x++){let C=0;switch(n.inputChannels[x].pixelType){case 1:T[0]=h,T[1]=T[0]+n.columns,h=T[1]+n.columns;for(let R=0;R<n.columns;++R){let N=l[T[0]++]<<8|l[T[1]++];C+=N,E.setUint16(w,C,!0),w+=2}break;case 2:T[0]=h,T[1]=T[0]+n.columns,T[2]=T[1]+n.columns,h=T[2]+n.columns;for(let R=0;R<n.columns;++R){let N=l[T[0]++]<<24|l[T[1]++]<<16|l[T[2]++]<<8;C+=N,E.setUint32(w,C,!0),w+=4}break}}return E}function Vn(n){let c=n.viewer,l={value:n.offset.value},f=new Uint8Array(n.columns*n.lines*(n.inputChannels.length*n.type*2)),m={version:Pe(c,l),unknownUncompressedSize:Pe(c,l),unknownCompressedSize:Pe(c,l),acCompressedSize:Pe(c,l),dcCompressedSize:Pe(c,l),rleCompressedSize:Pe(c,l),rleUncompressedSize:Pe(c,l),rleRawSize:Pe(c,l),totalAcUncompressedCount:Pe(c,l),totalDcUncompressedCount:Pe(c,l),acCompression:Pe(c,l)};if(m.version<2)throw new Error("EXRLoader.parse: "+Et.compression+" version "+m.version+" is unsupported");let E=new Array,h=sr(c,l)-2;for(;h>0;){let D=kr(c.buffer,l),M=pt(c,l),b=M>>2&3,k=(M>>4)-1,j=new Int8Array([k])[0],ue=pt(c,l);E.push({name:D,index:j,type:ue,compression:b}),h-=D.length+3}let w=Et.channels,T=new Array(n.inputChannels.length);for(let D=0;D<n.inputChannels.length;++D){let M=T[D]={},b=w[D];M.name=b.name,M.compression=0,M.decoded=!1,M.type=b.pixelType,M.pLinear=b.pLinear,M.width=n.columns,M.height=n.lines}let v={idx:new Array(3)};for(let D=0;D<n.inputChannels.length;++D){let M=T[D];for(let b=0;b<E.length;++b){let k=E[b];M.name==k.name&&(M.compression=k.compression,k.index>=0&&(v.idx[k.index]=D),M.offset=D)}}let x,C,y;if(m.acCompressedSize>0)switch(m.acCompression){case 0:x=new Uint16Array(m.totalAcUncompressedCount),nr(n.array,c,l,m.acCompressedSize,x,m.totalAcUncompressedCount);break;case 1:let D=n.array.slice(l.value,l.value+m.totalAcUncompressedCount),M=mr(D);x=new Uint16Array(M.buffer),l.value+=m.totalAcUncompressedCount;break}if(m.dcCompressedSize>0){let D={array:n.array,offset:l,size:m.dcCompressedSize};C=new Uint16Array(Ii(D).buffer),l.value+=m.dcCompressedSize}if(m.rleRawSize>0){let D=n.array.slice(l.value,l.value+m.rleCompressedSize),M=mr(D);y=Hn(M.buffer),l.value+=m.rleCompressedSize}let R=0,N=new Array(T.length);for(let D=0;D<N.length;++D)N[D]=new Array;for(let D=0;D<n.lines;++D)for(let M=0;M<T.length;++M)N[M].push(R),R+=T[M].width*n.type*2;v.idx[0]!==void 0&&T[v.idx[0]]&&Zs(v,N,T,x,C,f);for(let D=0;D<T.length;++D){let M=T[D];if(!M.decoded)switch(M.compression){case 2:let b=0,k=0;for(let j=0;j<n.lines;++j){let ue=N[D][b];for(let Z=0;Z<M.width;++Z){for(let U=0;U<2*M.type;++U)f[ue++]=y[k+U*M.width*M.height];k++}b++}break;case 1:Ks(D,N,T,x,C,f);break;default:throw new Error("EXRLoader.parse: unsupported channel compression")}}return new DataView(f.buffer)}function kr(n,c){let l=new Uint8Array(n),f=0;for(;l[c.value+f]!=0;)f+=1;let m=new TextDecoder().decode(l.slice(c.value,c.value+f));return c.value=c.value+f+1,m}function to(n,c,l){let f=new TextDecoder().decode(new Uint8Array(n).slice(c.value,c.value+l));return c.value=c.value+l,f}function ro(n,c){let l=Oe(n,c),f=Ue(n,c);return[l,f]}function io(n,c){let l=Ue(n,c),f=Ue(n,c);return[l,f]}function Oe(n,c){let l=n.getInt32(c.value,!0);return c.value=c.value+4,l}function Ue(n,c){let l=n.getUint32(c.value,!0);return c.value=c.value+4,l}function Yn(n,c){let l=n[c.value];return c.value=c.value+1,l}function pt(n,c){let l=n.getUint8(c.value);return c.value=c.value+1,l}let Pe=function(n,c){let l;return"getBigInt64"in DataView.prototype?l=Number(n.getBigInt64(c.value,!0)):l=n.getUint32(c.value+4,!0)+Number(n.getUint32(c.value,!0)<<32),c.value+=8,l};function xe(n,c){let l=n.getFloat32(c.value,!0);return c.value+=4,l}function no(n,c){return oa.toHalfFloat(xe(n,c))}function I(n){let c=(n&31744)>>10,l=n&1023;return(n>>15?-1:1)*(c?c===31?l?NaN:1/0:Math.pow(2,c-15)*(1+l/1024):6103515625e-14*(l/1024))}function sr(n,c){let l=n.getUint16(c.value,!0);return c.value+=2,l}function ao(n,c){return I(sr(n,c))}function so(n,c,l,f){let m=l.value,E=[];for(;l.value<m+f-1;){let h=kr(c,l),w=Oe(n,l),T=pt(n,l);l.value+=3;let v=Oe(n,l),x=Oe(n,l);E.push({name:h,pixelType:w,pLinear:T,xSampling:v,ySampling:x})}return l.value+=1,E}function oo(n,c){let l=xe(n,c),f=xe(n,c),m=xe(n,c),E=xe(n,c),h=xe(n,c),w=xe(n,c),T=xe(n,c),v=xe(n,c);return{redX:l,redY:f,greenX:m,greenY:E,blueX:h,blueY:w,whiteX:T,whiteY:v}}function co(n,c){let l=["NO_COMPRESSION","RLE_COMPRESSION","ZIPS_COMPRESSION","ZIP_COMPRESSION","PIZ_COMPRESSION","PXR24_COMPRESSION","B44_COMPRESSION","B44A_COMPRESSION","DWAA_COMPRESSION","DWAB_COMPRESSION"],f=pt(n,c);return l[f]}function lo(n,c){let l=Oe(n,c),f=Oe(n,c),m=Oe(n,c),E=Oe(n,c);return{xMin:l,yMin:f,xMax:m,yMax:E}}function uo(n,c){let l=["INCREASING_Y","DECREASING_Y","RANDOM_Y"],f=pt(n,c);return l[f]}function ho(n,c){let l=["ENVMAP_LATLONG","ENVMAP_CUBE"],f=pt(n,c);return l[f]}function fo(n,c){let l=["ONE_LEVEL","MIPMAP_LEVELS","RIPMAP_LEVELS"],f=["ROUND_DOWN","ROUND_UP"],m=Ue(n,c),E=Ue(n,c),h=pt(n,c);return{xSize:m,ySize:E,levelMode:l[h&15],roundingMode:f[h>>4]}}function mo(n,c){let l=xe(n,c),f=xe(n,c);return[l,f]}function po(n,c){let l=xe(n,c),f=xe(n,c),m=xe(n,c);return[l,f,m]}function go(n,c,l,f,m){if(f==="string"||f==="stringvector"||f==="iccProfile")return to(c,l,m);if(f==="chlist")return so(n,c,l,m);if(f==="chromaticities")return oo(n,l);if(f==="compression")return co(n,l);if(f==="box2i")return lo(n,l);if(f==="envmap")return ho(n,l);if(f==="tiledesc")return fo(n,l);if(f==="lineOrder")return uo(n,l);if(f==="float")return xe(n,l);if(f==="v2f")return mo(n,l);if(f==="v3f")return po(n,l);if(f==="int")return Oe(n,l);if(f==="rational")return ro(n,l);if(f==="timecode")return io(n,l);if(f==="preview")return l.value+=m,"skipped";l.value+=m}function vo(n,c){let l=Math.log2(n);return c=="ROUND_DOWN"?Math.floor(l):Math.ceil(l)}function Ao(n,c,l){let f=0;switch(n.levelMode){case"ONE_LEVEL":f=1;break;case"MIPMAP_LEVELS":f=vo(Math.max(c,l),n.roundingMode)+1;break;case"RIPMAP_LEVELS":throw new Error("THREE.EXRLoader: RIPMAP_LEVELS tiles currently unsupported.")}return f}function Xn(n,c,l,f){let m=new Array(n);for(let E=0;E<n;E++){let h=1<<E,w=c/h|0;f=="ROUND_UP"&&w*h<c&&(w+=1);let T=Math.max(w,1);m[E]=(T+l-1)/l|0}return m}function To(){let n=this,c=n.offset,l={value:0};for(let f=0;f<n.tileCount;f++){let m=Oe(n.viewer,c),E=Oe(n.viewer,c);c.value+=8,n.size=Ue(n.viewer,c);let h=m*n.blockWidth,w=E*n.blockHeight;n.columns=h+n.blockWidth>n.width?n.width-h:n.blockWidth,n.lines=w+n.blockHeight>n.height?n.height-w:n.blockHeight;let T=n.columns*n.totalBytes,x=n.size<n.lines*T?n.uncompress(n):Ri(n);c.value+=n.size;for(let C=0;C<n.lines;C++){let y=C*n.columns*n.totalBytes;for(let R=0;R<n.inputChannels.length;R++){let N=Et.channels[R].name,D=n.channelByteOffsets[N]*n.columns,M=n.decodeChannels[N];if(M===void 0)continue;l.value=y+D;let b=(n.height-(1+w+C))*n.outLineWidth;for(let k=0;k<n.columns;k++){let j=b+(k+h)*n.outputChannels+M;n.byteArray[j]=n.getter(x,l)}}}}}function So(){let n=this,c=n.offset,l={value:0};for(let f=0;f<n.height/n.blockHeight;f++){let m=Oe(n.viewer,c)-Et.dataWindow.yMin;n.size=Ue(n.viewer,c),n.lines=m+n.blockHeight>n.height?n.height-m:n.blockHeight;let E=n.columns*n.totalBytes,w=n.size<n.lines*E?n.uncompress(n):Ri(n);c.value+=n.size;for(let T=0;T<n.blockHeight;T++){let v=f*n.blockHeight,x=T+n.scanOrder(v);if(x>=n.height)continue;let C=T*E,y=(n.height-1-x)*n.outLineWidth;for(let R=0;R<n.inputChannels.length;R++){let N=Et.channels[R].name,D=n.channelByteOffsets[N]*n.columns,M=n.decodeChannels[N];if(M!==void 0){l.value=C+D;for(let b=0;b<n.columns;b++){let k=y+b*n.outputChannels+M;n.byteArray[k]=n.getter(w,l)}}}}}}function xo(n,c,l){let f={};if(n.getUint32(0,!0)!=20000630)throw new Error("THREE.EXRLoader: Provided file doesn't appear to be in OpenEXR format.");f.version=n.getUint8(4);let m=n.getUint8(5);f.spec={singleTile:!!(m&2),longName:!!(m&4),deepFormat:!!(m&8),multiPart:!!(m&16)},l.value=8;let E=!0;for(;E;){let h=kr(c,l);if(h==="")E=!1;else{let w=kr(c,l),T=Ue(n,l),v=go(n,c,l,w,T);v===void 0?console.warn(`THREE.EXRLoader: Skipped unknown header attribute type '${w}'.`):f[h]=v}}if((m&-7)!=0)throw console.error("THREE.EXRHeader:",f),new Error("THREE.EXRLoader: Provided file is currently unsupported.");return f}function Eo(n,c,l,f,m,E){let h={size:0,viewer:c,array:l,offset:f,width:n.dataWindow.xMax-n.dataWindow.xMin+1,height:n.dataWindow.yMax-n.dataWindow.yMin+1,inputChannels:n.channels,channelByteOffsets:{},shouldExpand:!1,scanOrder:null,totalBytes:null,columns:null,lines:null,type:null,uncompress:null,getter:null,format:null,colorSpace:Ct};switch(n.compression){case"NO_COMPRESSION":h.blockHeight=1,h.uncompress=Ri;break;case"RLE_COMPRESSION":h.blockHeight=1,h.uncompress=Js;break;case"ZIPS_COMPRESSION":h.blockHeight=1,h.uncompress=Ii;break;case"ZIP_COMPRESSION":h.blockHeight=16,h.uncompress=Ii;break;case"PIZ_COMPRESSION":h.blockHeight=32,h.uncompress=$s;break;case"PXR24_COMPRESSION":h.blockHeight=16,h.uncompress=eo;break;case"DWAA_COMPRESSION":h.blockHeight=32,h.uncompress=Vn;break;case"DWAB_COMPRESSION":h.blockHeight=256,h.uncompress=Vn;break;default:throw new Error("EXRLoader.parse: "+n.compression+" is unsupported")}let w={};for(let y of n.channels)switch(y.name){case"Y":case"R":case"G":case"B":case"A":w[y.name]=!0,h.type=y.pixelType}let T=!1,v=!1;if(w.R&&w.G&&w.B)h.outputChannels=4;else if(w.Y)h.outputChannels=1;else throw new Error("EXRLoader.parse: file contains unsupported data channels.");switch(h.outputChannels){case 4:E==Ut?(T=!w.A,h.format=Ut,h.colorSpace=Ct,h.outputChannels=4,h.decodeChannels={R:0,G:1,B:2,A:3}):E==pr?(h.format=pr,h.colorSpace=Ct,h.outputChannels=2,h.decodeChannels={R:0,G:1}):E==Zr?(h.format=Zr,h.colorSpace=Ct,h.outputChannels=1,h.decodeChannels={R:0}):v=!0;break;case 1:E==Ut?(T=!0,h.format=Ut,h.colorSpace=Ct,h.outputChannels=4,h.shouldExpand=!0,h.decodeChannels={Y:0}):E==pr?(h.format=pr,h.colorSpace=Ct,h.outputChannels=2,h.shouldExpand=!0,h.decodeChannels={Y:0}):E==Zr?(h.format=Zr,h.colorSpace=Ct,h.outputChannels=1,h.decodeChannels={Y:0}):v=!0;break;default:v=!0}if(v)throw new Error("EXRLoader.parse: invalid output format for specified file.");if(h.type==1)switch(m){case Gi:h.getter=ao;break;case Qr:h.getter=sr;break}else if(h.type==2)switch(m){case Gi:h.getter=xe;break;case Qr:h.getter=no}else throw new Error("EXRLoader.parse: unsupported pixelType "+h.type+" for "+n.compression+".");h.columns=h.width;let x=h.width*h.height*h.outputChannels;switch(m){case Gi:h.byteArray=new Float32Array(x),T&&h.byteArray.fill(1,0,x);break;case Qr:h.byteArray=new Uint16Array(x),T&&h.byteArray.fill(15360,0,x);break;default:console.error("THREE.EXRLoader: unsupported type: ",m);break}let C=0;for(let y of n.channels)h.decodeChannels[y.name]!==void 0&&(h.channelByteOffsets[y.name]=C),C+=y.pixelType*2;if(h.totalBytes=C,h.outLineWidth=h.width*h.outputChannels,n.lineOrder==="INCREASING_Y"?h.scanOrder=y=>y:h.scanOrder=y=>h.height-1-y,n.spec.singleTile){h.blockHeight=n.tiles.ySize,h.blockWidth=n.tiles.xSize;let y=Ao(n.tiles,h.width,h.height),R=Xn(y,h.width,n.tiles.xSize,n.tiles.roundingMode),N=Xn(y,h.height,n.tiles.ySize,n.tiles.roundingMode);h.tileCount=R[0]*N[0];for(let D=0;D<y;D++)for(let M=0;M<N[D];M++)for(let b=0;b<R[D];b++)Pe(c,f);h.decode=To.bind(h)}else{h.blockWidth=h.width;let y=Math.ceil(h.height/h.blockHeight);for(let R=0;R<y;R++)Pe(c,f);h.decode=So.bind(h)}return h}let Qn={value:0},Zn=new DataView(e),wo=new Uint8Array(e),Et=xo(Zn,e,Qn),gt=Eo(Et,Zn,wo,Qn,this.type,this.outputFormat);if(gt.decode(),gt.shouldExpand){let n=gt.byteArray;if(this.outputFormat==Ut)for(let c=0;c<n.length;c+=4)n[c+2]=n[c+1]=n[c];else if(this.outputFormat==pr)for(let c=0;c<n.length;c+=2)n[c+1]=n[c]}return{header:Et,width:gt.width,height:gt.height,data:gt.byteArray,format:gt.format,colorSpace:gt.colorSpace,type:this.type}}setDataType(e){return this.type=e,this}setOutputFormat(e){return this.outputFormat=e,this}load(e,r,i,a){function s(o,u){o.colorSpace=u.colorSpace,o.minFilter=ca,o.magFilter=ca,o.generateMipmaps=!1,o.flipY=!1,r&&r(o,u)}return super.load(e,s,i,a)}};var Yi=class extends wr{load(e,r,i,a){let s=new Vc(this.manager);s.setResponseType("arraybuffer"),s.setRequestHeader(this.requestHeader),s.setPath(this.path),s.setWithCredentials(this.withCredentials),s.load(e,o=>{yt(o instanceof ArrayBuffer);try{r(o)}catch(u){a!=null?a(u):console.error(u),this.manager.itemError(e)}},i,a)}};function Ma(t){return t instanceof Yc?t.getContext().getExtension("OES_texture_float_linear")!=null:t.backend.hasFeature?.("float32-filterable")??!1}var tl="This is not an object",rl="This is not a Float16Array object",da="This constructor is not a subclass of Float16Array",Pa="The constructor property value is not an object",il="Species constructor didn't return TypedArray object",nl="Derived constructor created TypedArray object which was too small length",Sr="Attempting to access detached ArrayBuffer",Xi="Cannot convert undefined or null to object",Qi="Cannot mix BigInt and other types, use explicit conversions",fa="@@iterator property is not callable",ma="Reduce of empty array with no initial value",al="The comparison function must be either a function or undefined",zi="Offset is out of bounds";function J(t){return(e,...r)=>Ce(t,e,r)}function zt(t,e){return J(Bt(t,e).get)}var{apply:Ce,construct:Ar,defineProperty:sl,get:ki,getOwnPropertyDescriptor:Bt,getPrototypeOf:yr,has:Zi,ownKeys:Na,set:pa,setPrototypeOf:ba}=Reflect,ol=Proxy,{EPSILON:cl,MAX_SAFE_INTEGER:ga,isFinite:Oa,isNaN:Ft}=Number,{iterator:$e,species:ll,toStringTag:en,for:ul}=Symbol,Ht=Object,{create:si,defineProperty:Cr,freeze:hl,is:va}=Ht,Ki=Ht.prototype,dl=Ki.__lookupGetter__?J(Ki.__lookupGetter__):(t,e)=>{if(t==null)throw te(Xi);let r=Ht(t);do{let i=Bt(r,e);if(i!==void 0)return st(i,"get")?i.get:void 0}while((r=yr(r))!==null)},st=Ht.hasOwn||J(Ki.hasOwnProperty),Ua=Array,La=Ua.isArray,oi=Ua.prototype,fl=J(oi.join),ml=J(oi.push),pl=J(oi.toLocaleString),tn=oi[$e],gl=J(tn),{abs:vl,trunc:Ba}=Math,ci=ArrayBuffer,Al=ci.isView,Fa=ci.prototype,Tl=J(Fa.slice),Sl=zt(Fa,"byteLength"),ji=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:null,xl=ji&&zt(ji.prototype,"byteLength"),rn=yr(Uint8Array),El=rn.from,pe=rn.prototype,wl=pe[$e],yl=J(pe.keys),Cl=J(pe.values),Dl=J(pe.entries),Rl=J(pe.set),Aa=J(pe.reverse),Il=J(pe.fill),_l=J(pe.copyWithin),Ta=J(pe.sort),vr=J(pe.slice),Ml=J(pe.subarray),me=zt(pe,"buffer"),Dt=zt(pe,"byteOffset"),Y=zt(pe,"length"),Ha=zt(pe,en),Pl=Uint8Array,Ne=Uint16Array,Sa=(...t)=>Ce(El,Ne,t),nn=Uint32Array,Nl=Float32Array,Rt=yr([][$e]()),li=J(Rt.next),bl=J((function*(){})().next),Ol=yr(Rt),Ul=DataView.prototype,Ll=J(Ul.getUint16),te=TypeError,Wi=RangeError,Ga=WeakSet,za=Ga.prototype,Bl=J(za.add),Fl=J(za.has),ui=WeakMap,an=ui.prototype,$r=J(an.get),Hl=J(an.has),sn=J(an.set),ka=new ui,Gl=si(null,{next:{value:function(){let t=$r(ka,this);return li(t)}},[$e]:{value:function(){return this}}});function Tr(t){if(t[$e]===tn&&Rt.next===li)return t;let e=si(Gl);return sn(ka,e,gl(t)),e}var Wa=new ui,Va=si(Ol,{next:{value:function(){let t=$r(Wa,this);return bl(t)},writable:!0,configurable:!0}});for(let t of Na(Rt))t!=="next"&&Cr(Va,t,Bt(Rt,t));function xa(t){let e=si(Va);return sn(Wa,e,t),e}function ei(t){return t!==null&&typeof t=="object"||typeof t=="function"}function Ea(t){return t!==null&&typeof t=="object"}function ti(t){return Ha(t)!==void 0}function qi(t){let e=Ha(t);return e==="BigInt64Array"||e==="BigUint64Array"}function zl(t){try{return La(t)?!1:(Sl(t),!0)}catch{return!1}}function Ya(t){if(ji===null)return!1;try{return xl(t),!0}catch{return!1}}function kl(t){return zl(t)||Ya(t)}function wa(t){return La(t)?t[$e]===tn&&Rt.next===li:!1}function Wl(t){return ti(t)?t[$e]===wl&&Rt.next===li:!1}function Kr(t){if(typeof t!="string")return!1;let e=+t;return t!==e+""||!Oa(e)?!1:e===Ba(e)}var ri=ul("__Float16Array__");function Vl(t){if(!Ea(t))return!1;let e=yr(t);if(!Ea(e))return!1;let r=e.constructor;if(r===void 0)return!1;if(!ei(r))throw te(Pa);return Zi(r,ri)}var Ji=1/cl;function Yl(t){return t+Ji-Ji}var Xa=6103515625e-14,Xl=65504,Qa=.0009765625,ya=Qa*Xa,Ql=Qa*Ji;function Zl(t){let e=+t;if(!Oa(e)||e===0)return e;let r=e>0?1:-1,i=vl(e);if(i<Xa)return r*Yl(i/ya)*ya;let a=(1+Ql)*i,s=a-(a-i);return s>Xl||Ft(s)?r*(1/0):r*s}var Za=new ci(4),Ka=new Nl(Za),ja=new nn(Za),ke=new Ne(512),We=new Pl(512);for(let t=0;t<256;++t){let e=t-127;e<-24?(ke[t]=0,ke[t|256]=32768,We[t]=24,We[t|256]=24):e<-14?(ke[t]=1024>>-e-14,ke[t|256]=1024>>-e-14|32768,We[t]=-e-1,We[t|256]=-e-1):e<=15?(ke[t]=e+15<<10,ke[t|256]=e+15<<10|32768,We[t]=13,We[t|256]=13):e<128?(ke[t]=31744,ke[t|256]=64512,We[t]=24,We[t|256]=24):(ke[t]=31744,ke[t|256]=64512,We[t]=13,We[t|256]=13)}function Je(t){Ka[0]=Zl(t);let e=ja[0],r=e>>23&511;return ke[r]+((e&8388607)>>We[r])}var on=new nn(2048);for(let t=1;t<1024;++t){let e=t<<13,r=0;for(;(e&8388608)===0;)e<<=1,r-=8388608;e&=-8388609,r+=947912704,on[t]=e|r}for(let t=1024;t<2048;++t)on[t]=939524096+(t-1024<<13);var kt=new nn(64);for(let t=1;t<31;++t)kt[t]=t<<23;kt[31]=1199570944;kt[32]=2147483648;for(let t=33;t<63;++t)kt[t]=2147483648+(t-32<<23);kt[63]=3347054592;var qa=new Ne(64);for(let t=1;t<64;++t)t!==32&&(qa[t]=1024);function X(t){let e=t>>10;return ja[0]=on[qa[e]+(t&1023)]+kt[e],Ka[0]}function at(t){let e=+t;return Ft(e)||e===0?0:Ba(e)}function Vi(t){let e=at(t);return e<0?0:e<ga?e:ga}function jr(t,e){if(!ei(t))throw te(tl);let r=t.constructor;if(r===void 0)return e;if(!ei(r))throw te(Pa);return r[ll]??e}function xr(t){if(Ya(t))return!1;try{return Tl(t,0,0),!1}catch{}return!0}function Ca(t,e){let r=Ft(t),i=Ft(e);if(r&&i)return 0;if(r)return 1;if(i||t<e)return-1;if(t>e)return 1;if(t===0&&e===0){let a=va(t,0),s=va(e,0);if(!a&&s)return-1;if(a&&!s)return 1}return 0}var cn=2,ii=new ui;function Lt(t){return Hl(ii,t)||!Al(t)&&Vl(t)}function V(t){if(!Lt(t))throw te(rl)}function qr(t,e){let r=Lt(t),i=ti(t);if(!r&&!i)throw te(il);if(typeof e=="number"){let a;if(r){let s=L(t);a=Y(s)}else a=Y(t);if(a<e)throw te(nl)}if(qi(t))throw te(Qi)}function L(t){let e=$r(ii,t);if(e!==void 0){let a=me(e);if(xr(a))throw te(Sr);return e}let r=t.buffer;if(xr(r))throw te(Sr);let i=Ar(De,[r,t.byteOffset,t.length],t.constructor);return $r(ii,i)}function Da(t){let e=Y(t),r=[];for(let i=0;i<e;++i)r[i]=X(t[i]);return r}var Ja=new Ga;for(let t of Na(pe)){if(t===en)continue;let e=Bt(pe,t);st(e,"get")&&typeof e.get=="function"&&Bl(Ja,e.get)}var Kl=hl({get(t,e,r){return Kr(e)&&st(t,e)?X(ki(t,e)):Fl(Ja,dl(t,e))?ki(t,e):ki(t,e,r)},set(t,e,r,i){return Kr(e)&&st(t,e)?pa(t,e,Je(r)):pa(t,e,r,i)},getOwnPropertyDescriptor(t,e){if(Kr(e)&&st(t,e)){let r=Bt(t,e);return r.value=X(r.value),r}return Bt(t,e)},defineProperty(t,e,r){return Kr(e)&&st(t,e)&&st(r,"value")&&(r.value=Je(r.value)),sl(t,e,r)}}),De=class t{constructor(e,r,i){let a;if(Lt(e))a=Ar(Ne,[L(e)],new.target);else if(ei(e)&&!kl(e)){let o,u;if(ti(e)){o=e,u=Y(e);let d=me(e);if(xr(d))throw te(Sr);if(qi(e))throw te(Qi);let p=new ci(u*cn);a=Ar(Ne,[p],new.target)}else{let d=e[$e];if(d!=null&&typeof d!="function")throw te(fa);d!=null?wa(e)?(o=e,u=e.length):(o=[...e],u=o.length):(o=e,u=Vi(o.length)),a=Ar(Ne,[u],new.target)}for(let d=0;d<u;++d)a[d]=Je(o[d])}else a=Ar(Ne,arguments,new.target);let s=new ol(a,Kl);return sn(ii,s,a),s}static from(e,...r){let i=this;if(!Zi(i,ri))throw te(da);if(i===t){if(Lt(e)&&r.length===0){let A=L(e),S=new Ne(me(A),Dt(A),Y(A));return new t(me(vr(S)))}if(r.length===0)return new t(me(Sa(e,Je)));let d=r[0],p=r[1];return new t(me(Sa(e,function(A,...S){return Je(Ce(d,this,[A,...Tr(S)]))},p)))}let a,s,o=e[$e];if(o!=null&&typeof o!="function")throw te(fa);if(o!=null)wa(e)?(a=e,s=e.length):Wl(e)?(a=e,s=Y(e)):(a=[...e],s=a.length);else{if(e==null)throw te(Xi);a=Ht(e),s=Vi(a.length)}let u=new i(s);if(r.length===0)for(let d=0;d<s;++d)u[d]=a[d];else{let d=r[0],p=r[1];for(let A=0;A<s;++A)u[A]=Ce(d,p,[a[A],A])}return u}static of(...e){let r=this;if(!Zi(r,ri))throw te(da);let i=e.length;if(r===t){let s=new t(i),o=L(s);for(let u=0;u<i;++u)o[u]=Je(e[u]);return s}let a=new r(i);for(let s=0;s<i;++s)a[s]=e[s];return a}keys(){V(this);let e=L(this);return yl(e)}values(){V(this);let e=L(this);return xa((function*(){for(let r of Cl(e))yield X(r)})())}entries(){V(this);let e=L(this);return xa((function*(){for(let[r,i]of Dl(e))yield[r,X(i)]})())}at(e){V(this);let r=L(this),i=Y(r),a=at(e),s=a>=0?a:i+a;if(!(s<0||s>=i))return X(r[s])}with(e,r){V(this);let i=L(this),a=Y(i),s=at(e),o=s>=0?s:a+s,u=+r;if(o<0||o>=a)throw Wi(zi);let d=new Ne(me(i),Dt(i),Y(i)),p=new t(me(vr(d))),A=L(p);return A[o]=Je(u),p}map(e,...r){V(this);let i=L(this),a=Y(i),s=r[0],o=jr(i,t);if(o===t){let d=new t(a),p=L(d);for(let A=0;A<a;++A){let S=X(i[A]);p[A]=Je(Ce(e,s,[S,A,this]))}return d}let u=new o(a);qr(u,a);for(let d=0;d<a;++d){let p=X(i[d]);u[d]=Ce(e,s,[p,d,this])}return u}filter(e,...r){V(this);let i=L(this),a=Y(i),s=r[0],o=[];for(let p=0;p<a;++p){let A=X(i[p]);Ce(e,s,[A,p,this])&&ml(o,A)}let u=jr(i,t),d=new u(o);return qr(d),d}reduce(e,...r){V(this);let i=L(this),a=Y(i);if(a===0&&r.length===0)throw te(ma);let s,o;r.length===0?(s=X(i[0]),o=1):(s=r[0],o=0);for(let u=o;u<a;++u)s=e(s,X(i[u]),u,this);return s}reduceRight(e,...r){V(this);let i=L(this),a=Y(i);if(a===0&&r.length===0)throw te(ma);let s,o;r.length===0?(s=X(i[a-1]),o=a-2):(s=r[0],o=a-1);for(let u=o;u>=0;--u)s=e(s,X(i[u]),u,this);return s}forEach(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=0;o<a;++o)Ce(e,s,[X(i[o]),o,this])}find(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=0;o<a;++o){let u=X(i[o]);if(Ce(e,s,[u,o,this]))return u}}findIndex(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=0;o<a;++o){let u=X(i[o]);if(Ce(e,s,[u,o,this]))return o}return-1}findLast(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=a-1;o>=0;--o){let u=X(i[o]);if(Ce(e,s,[u,o,this]))return u}}findLastIndex(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=a-1;o>=0;--o){let u=X(i[o]);if(Ce(e,s,[u,o,this]))return o}return-1}every(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=0;o<a;++o)if(!Ce(e,s,[X(i[o]),o,this]))return!1;return!0}some(e,...r){V(this);let i=L(this),a=Y(i),s=r[0];for(let o=0;o<a;++o)if(Ce(e,s,[X(i[o]),o,this]))return!0;return!1}set(e,...r){V(this);let i=L(this),a=at(r[0]);if(a<0)throw Wi(zi);if(e==null)throw te(Xi);if(qi(e))throw te(Qi);if(Lt(e))return Rl(L(this),L(e),a);if(ti(e)){let d=me(e);if(xr(d))throw te(Sr)}let s=Y(i),o=Ht(e),u=Vi(o.length);if(a===1/0||u+a>s)throw Wi(zi);for(let d=0;d<u;++d)i[d+a]=Je(o[d])}reverse(){V(this);let e=L(this);return Aa(e),this}toReversed(){V(this);let e=L(this),r=new Ne(me(e),Dt(e),Y(e)),i=new t(me(vr(r))),a=L(i);return Aa(a),i}fill(e,...r){V(this);let i=L(this);return Il(i,Je(e),...Tr(r)),this}copyWithin(e,r,...i){V(this);let a=L(this);return _l(a,e,r,...Tr(i)),this}sort(e){V(this);let r=L(this),i=e!==void 0?e:Ca;return Ta(r,(a,s)=>i(X(a),X(s))),this}toSorted(e){V(this);let r=L(this);if(e!==void 0&&typeof e!="function")throw new te(al);let i=e!==void 0?e:Ca,a=new Ne(me(r),Dt(r),Y(r)),s=new t(me(vr(a))),o=L(s);return Ta(o,(u,d)=>i(X(u),X(d))),s}slice(e,r){V(this);let i=L(this),a=jr(i,t);if(a===t){let z=new Ne(me(i),Dt(i),Y(i));return new t(me(vr(z,e,r)))}let s=Y(i),o=at(e),u=r===void 0?s:at(r),d;o===-1/0?d=0:o<0?d=s+o>0?s+o:0:d=s<o?s:o;let p;u===-1/0?p=0:u<0?p=s+u>0?s+u:0:p=s<u?s:u;let A=p-d>0?p-d:0,S=new a(A);if(qr(S,A),A===0)return S;let P=me(i);if(xr(P))throw te(Sr);let B=0;for(;d<p;)S[B]=X(i[d]),++d,++B;return S}subarray(e,r){V(this);let i=L(this),a=jr(i,t),s=new Ne(me(i),Dt(i),Y(i)),o=Ml(s,e,r),u=new a(me(o),Dt(o),Y(o));return qr(u),u}indexOf(e,...r){V(this);let i=L(this),a=Y(i),s=at(r[0]);if(s===1/0)return-1;s<0&&(s+=a,s<0&&(s=0));for(let o=s;o<a;++o)if(st(i,o)&&X(i[o])===e)return o;return-1}lastIndexOf(e,...r){V(this);let i=L(this),a=Y(i),s=r.length>=1?at(r[0]):a-1;if(s===-1/0)return-1;s>=0?s=s<a-1?s:a-1:s+=a;for(let o=s;o>=0;--o)if(st(i,o)&&X(i[o])===e)return o;return-1}includes(e,...r){V(this);let i=L(this),a=Y(i),s=at(r[0]);if(s===1/0)return!1;s<0&&(s+=a,s<0&&(s=0));let o=Ft(e);for(let u=s;u<a;++u){let d=X(i[u]);if(o&&Ft(d)||d===e)return!0}return!1}join(e){V(this);let r=L(this),i=Da(r);return fl(i,e)}toLocaleString(...e){V(this);let r=L(this),i=Da(r);return pl(i,...Tr(e))}get[en](){if(Lt(this))return"Float16Array"}};Cr(De,"BYTES_PER_ELEMENT",{value:cn});Cr(De,ri,{});ba(De,rn);var ni=De.prototype;Cr(ni,"BYTES_PER_ELEMENT",{value:cn});Cr(ni,$e,{value:ni.values,writable:!0,configurable:!0});ba(ni,pe);function jl(t,e,...r){return X(Ll(t,e,...Tr(r)))}function ln(t){return t instanceof Int8Array||t instanceof Uint8Array||t instanceof Uint8ClampedArray||t instanceof Int16Array||t instanceof Uint16Array||t instanceof Int32Array||t instanceof Uint32Array||t instanceof De||t instanceof Float32Array||t instanceof Float64Array}var $i=class extends wr{constructor(e,r){super(r),this.parser=e}load(e,r,i,a){let s=new Yi(this.manager);s.setRequestHeader(this.requestHeader),s.setPath(this.path),s.setWithCredentials(this.withCredentials),s.load(e,o=>{try{r(this.parser(o))}catch(u){a!=null?a(u):console.error(u),this.manager.itemError(e)}},i,a)}};function ql(t){let e=t instanceof Int8Array?Qc:t instanceof Uint8Array?ua:t instanceof Uint8ClampedArray?ua:t instanceof Int16Array?Zc:t instanceof Uint16Array?Kc:t instanceof Int32Array?jc:t instanceof Uint32Array?qc:t instanceof De?Jc:t instanceof Float32Array?ha:t instanceof Float64Array?ha:null;return yt(e!=null),e}var At=class extends wr{constructor(e,r,i={},a){super(a),this.textureClass=e,this.parser=r,this.options={format:Xc,minFilter:la,magFilter:la,...i}}load(e,r,i,a){let s=new this.textureClass,o=new $i(this.parser,this.manager);return o.setRequestHeader(this.requestHeader),o.setPath(this.path),o.setWithCredentials(this.withCredentials),o.load(e,u=>{s.image.data=u instanceof De?new Uint16Array(u.buffer):u;let{width:d,height:p,depth:A,...S}=this.options;d!=null&&(s.image.width=d),p!=null&&(s.image.height=p),"depth"in s.image&&A!=null&&(s.image.depth=A),s.type=ql(u),Object.assign(s,S),s.needsUpdate=!0,r?.(s)},i,a),s}},It=Ve.clamp,S2=Ve.euclideanModulo,x2=Ve.inverseLerp,un=Ve.lerp,$a=Ve.degToRad,E2=Ve.radToDeg,w2=Ve.isPowerOfTwo,y2=Ve.ceilPowerOfTwo,C2=Ve.floorPowerOfTwo,D2=Ve.normalize;function es(t,e,r,i=0,a=1){return Ve.mapLinear(t,e,r,i,a)}function ts(t){return Math.min(Math.max(t,0),1)}function H(t){return(e,r)=>{e instanceof ai?Object.defineProperty(e,r,{enumerable:!0,get(){return this.defines?.[t]!=null},set(i){i!==this[r]&&(i?(this.defines??={},this.defines[t]="1"):delete this.defines?.[t],this.needsUpdate=!0)}}):Object.defineProperty(e,r,{enumerable:!0,get(){return this.defines.has(t)},set(i){i!==this[r]&&(i?this.defines.set(t,"1"):this.defines.delete(t),this.setChanged())}})}}function Ra(t){return typeof t=="number"?Math.floor(t):typeof t=="string"?parseInt(t,10):typeof t=="boolean"?+t:0}function ot(t,{min:e=Number.MIN_SAFE_INTEGER,max:r=Number.MAX_SAFE_INTEGER}={}){return(i,a)=>{i instanceof ai?Object.defineProperty(i,a,{enumerable:!0,get(){let s=this.defines?.[t];return s!=null?Ra(s):0},set(s){let o=this[a];s!==o&&(this.defines??={},this.defines[t]=It(s,e,r).toFixed(0),this.needsUpdate=!0)}}):Object.defineProperty(i,a,{enumerable:!0,get(){let s=this.defines.get(t);return s!=null?Ra(s):0},set(s){let o=this[a];s!==o&&(this.defines.set(t,It(s,e,r).toFixed(0)),this.setChanged())}})}}function Ia(t){return typeof t=="number"?t:typeof t=="string"?parseFloat(t):typeof t=="boolean"?+t:0}function hi(t,{min:e=-1/0,max:r=1/0,precision:i=7}={}){return(a,s)=>{a instanceof ai?Object.defineProperty(a,s,{enumerable:!0,get(){let o=this.defines?.[t];return o!=null?Ia(o):0},set(o){let u=this[s];o!==u&&(this.defines??={},this.defines[t]=It(o,e,r).toFixed(i),this.needsUpdate=!0)}}):Object.defineProperty(a,s,{enumerable:!0,get(){let o=this.defines.get(t);return o!=null?Ia(o):0},set(o){let u=this[s];o!==u&&(this.defines.set(t,It(o,e,r).toFixed(i)),this.setChanged())}})}}function hn(t,{validate:e}={}){return(r,i)=>{r instanceof ai?Object.defineProperty(r,i,{enumerable:!0,get(){return this.defines?.[t]},set(a){if(a!==this[i]){if(e?.(a)===!1){console.error(`Expression validation failed: ${a}`);return}this.defines??={},this.defines[t]=a,this.needsUpdate=!0}}}):Object.defineProperty(r,i,{enumerable:!0,get(){return this.defines.get(t)},set(a){if(a!==this[i]){if(e?.(a)===!1){console.error(`Expression validation failed: ${a}`);return}this.defines.set(t,a),this.setChanged()}}})}}function dn(t,...e){let r={};for(let i=0;i<e.length;i+=2){let a=e[i],s=e[i+1];for(let o of s)r[o]={enumerable:!0,get:()=>a[o],set:u=>{a[o]=u}}}return Object.defineProperties(t,r),t}function fn(t,e,r){let i={};for(let a of r)i[a]={enumerable:!0,get:()=>e.uniforms[a].value,set:s=>{e.uniforms[a].value=s}};return Object.defineProperties(t,i),t}var Gt=class extends wr{constructor(e={},r){super(r),this.options=e}load(e,r,i,a){let{width:s,height:o,depth:u}=this.options,d=new $c(null,s,o,u),p=new gr(this.manager);return p.setRequestHeader(this.requestHeader),p.setPath(this.path),p.setWithCredentials(this.withCredentials),p.load(e,A=>{let{image:S}=A;d.image={data:S.data,width:s??S.width,height:o??S.height,depth:u??Math.sqrt(S.height)},d.type=A.type,d.format=A.format,d.colorSpace=A.colorSpace,d.needsUpdate=!0;try{r?.(d)}catch(P){a!=null?a(P):console.error(P),this.manager.itemError(e)}},i,a),d}},Er=class extends wr{constructor(e={},r){super(r),this.options=e}load(e,r,i,a){let{width:s,height:o}=this.options,u=new el(null,s,o),d=new gr(this.manager);return d.setRequestHeader(this.requestHeader),d.setPath(this.path),d.setWithCredentials(this.withCredentials),d.load(e,p=>{let{image:A}=p;u.image={data:A.data,width:s??A.width,height:o??A.height},u.type=p.type,u.format=p.format,u.colorSpace=p.colorSpace,u.needsUpdate=!0;try{r?.(u)}catch(S){a!=null?a(S):console.error(S),this.manager.itemError(e)}},i,a),u}};var _a=class rs{constructor(e=0,r=0,i=0,a=0){this.west=e,this.south=r,this.east=i,this.north=a}get width(){let e=this.east;return e<this.west&&(e+=Math.PI*2),e-this.west}get height(){return this.north-this.south}set(e,r,i,a){return this.west=e,this.south=r,this.east=i,this.north=a,this}clone(){return new rs(this.west,this.south,this.east,this.north)}copy(e){return this.west=e.west,this.south=e.south,this.east=e.east,this.north=e.north,this}equals(e){return e.west===this.west&&e.south===this.south&&e.east===this.east&&e.north===this.north}at(e,r,i=new qe){return i.set(this.west+(this.east-this.west)*e,this.north+(this.south-this.north)*r)}fromArray(e,r=0){return this.west=e[r],this.south=e[r+1],this.east=e[r+2],this.north=e[r+3],this}toArray(e=[],r=0){return e[r]=this.west,e[r+1]=this.south,e[r+2]=this.east,e[r+3]=this.north,e}*[Symbol.iterator](){yield this.west,yield this.south,yield this.east,yield this.north}};_a.MAX=new _a(qe.MIN_LONGITUDE,qe.MIN_LATITUDE,qe.MAX_LONGITUDE,qe.MAX_LATITUDE);var Jl=/^[ \t]*#include +"([\w\d./]+)"/gm;function Be(t,e){return t.replace(Jl,(r,i)=>{let a=i.split("/").reduce((s,o)=>typeof s!="string"&&s!=null?s[o]:void 0,e);if(typeof a!="string")throw new Error(`Could not find include for ${i}.`);return Be(a,e)})}var Jr;function $l(){if(Jr!=null)return Jr;let t=new Uint32Array([268435456]);return Jr=new Uint8Array(t.buffer,t.byteOffset,t.byteLength)[0]===0,Jr}function eu(t,e,r,i=!0){if(i===$l())return new e(t);let a=Object.assign(new DataView(t),{getFloat16(o,u){return jl(this,o,u)}}),s=new e(a.byteLength/e.BYTES_PER_ELEMENT);for(let o=0,u=0;o<s.length;++o,u+=e.BYTES_PER_ELEMENT)s[o]=a[r](u,i);return s}var Wt=(t,e)=>eu(t,De,"getFloat16",e);var tu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*(?:i\s*\+\+|\+\+\s*i)\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ru(t,e,r,i){let a="";for(let s=parseInt(e,10);s<parseInt(r,10);++s)a+=i.replace(/\[\s*i\s*\]/g,`[${s}]`).replace(/UNROLLED_LOOP_INDEX/g,`${s}`);return a}function _t(t){return t.replace(tu,ru)}var iu=`// Reference: https://github.com/mrdoob/three.js/blob/r171/examples/jsm/csm/CSMShader.js

#ifndef SHADOW_CASCADE_COUNT
#error "SHADOW_CASCADE_COUNT macro must be defined."
#endif // SHADOW_CASCADE_COUNT

int getCascadeIndex(
  const mat4 viewMatrix,
  const vec3 worldPosition,
  const vec2 intervals[SHADOW_CASCADE_COUNT],
  const float near,
  const float far
) {
  vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
  float depth = viewZToOrthographicDepth(viewPosition.z, near, far);
  vec2 interval;
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
    interval = intervals[i];
    if (depth >= interval.x && depth < interval.y) {
      return UNROLLED_LOOP_INDEX;
    }
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
  }
  #pragma unroll_loop_end
  return SHADOW_CASCADE_COUNT - 1;
}

int getFadedCascadeIndex(
  const mat4 viewMatrix,
  const vec3 worldPosition,
  const vec2 intervals[SHADOW_CASCADE_COUNT],
  const float near,
  const float far,
  const float jitter
) {
  vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0);
  float depth = viewZToOrthographicDepth(viewPosition.z, near, far);

  vec2 interval;
  float intervalCenter;
  float closestEdge;
  float margin;
  int nextIndex = -1;
  int prevIndex = -1;
  float alpha;

  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
    interval = intervals[i];
    intervalCenter = (interval.x + interval.y) * 0.5;
    closestEdge = depth < intervalCenter ? interval.x : interval.y;
    margin = closestEdge * closestEdge * 0.5;
    interval += margin * vec2(-0.5, 0.5);

    #if UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    if (depth >= interval.x && depth < interval.y) {
      prevIndex = nextIndex;
      nextIndex = UNROLLED_LOOP_INDEX;
      alpha = saturate(min(depth - interval.x, interval.y - depth) / margin);
    }
    #else // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    // Don't fade out the last cascade.
    if (depth >= interval.x) {
      prevIndex = nextIndex;
      nextIndex = UNROLLED_LOOP_INDEX;
      alpha = saturate((depth - interval.x) / margin);
    }
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT - 1
    #endif // UNROLLED_LOOP_INDEX < SHADOW_CASCADE_COUNT
  }
  #pragma unroll_loop_end

  return jitter <= alpha
    ? nextIndex
    : prevIndex;
}
`,nu=`// cSpell:words logdepthbuf

#ifdef DEPTH_PACKING
float readDepthValue(const sampler2D depthBuffer, const vec2 uv) {
  #if DEPTH_PACKING == 3201
  return unpackRGBAToDepth(texture(depthBuffer, uv));
  #else // DEPTH_PACKING == 3201
  return texture(depthBuffer, uv).r;
  #endif // DEPTH_PACKING == 3201
}
#endif // DEPTH_PACKING

float reverseLogDepth(const float depth, const float near, const float far) {
  #if defined(USE_LOGDEPTHBUF) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
  float d = pow(2.0, depth * log2(far + 1.0)) - 1.0;
  float a = far / (far - near);
  float b = far * near / (near - far);
  return a + b / d;
  #else // defined(USE_LOGARITHMIC_DEPTH_BUFFER) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
  return depth;
  #endif // defined(USE_LOGARITHMIC_DEPTH_BUFFER) || defined(USE_LOGARITHMIC_DEPTH_BUFFER)
}

float linearizeDepth(const float depth, const float near, const float far) {
  float ndc = depth * 2.0 - 1.0;
  return 2.0 * near * far / (far + near - ndc * (far - near));
}
`,au=`float checker(const vec2 uv, const vec2 repeats) {
  vec2 c = floor(repeats * uv);
  float result = mod(c.x + c.y, 2.0);
  return sign(result);
}

float checker(const vec2 uv, const float repeats) {
  return checker(uv, vec2(repeats));
}
`,su=`// Reference: https://advances.realtimerendering.com/s2014/index.html#_NEXT_GENERATION_POST

float interleavedGradientNoise(const vec2 coord) {
  const vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(coord, magic.xy)));
}
`,ou=`#if !defined(saturate)
#define saturate(a) clamp(a, 0.0, 1.0)
#endif // !defined(saturate)

float remap(const float x, const float min1, const float max1, const float min2, const float max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec2 remap(const vec2 x, const vec2 min1, const vec2 max1, const vec2 min2, const vec2 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec3 remap(const vec3 x, const vec3 min1, const vec3 max1, const vec3 min2, const vec3 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

vec4 remap(const vec4 x, const vec4 min1, const vec4 max1, const vec4 min2, const vec4 max2) {
  return min2 + (x - min1) / (max1 - min1) * (max2 - min2);
}

float remapClamped(
  const float x,
  const float min1,
  const float max1,
  const float min2,
  const float max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec2 remapClamped(
  const vec2 x,
  const vec2 min1,
  const vec2 max1,
  const vec2 min2,
  const vec2 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec3 remapClamped(
  const vec3 x,
  const vec3 min1,
  const vec3 max1,
  const vec3 min2,
  const vec3 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

vec4 remapClamped(
  const vec4 x,
  const vec4 min1,
  const vec4 max1,
  const vec4 min2,
  const vec4 max2
) {
  return clamp(min2 + (x - min1) / (max1 - min1) * (max2 - min2), min2, max2);
}

// Implicitly remap to 0 and 1
float remap(const float x, const float min1, const float max1) {
  return (x - min1) / (max1 - min1);
}

vec2 remap(const vec2 x, const vec2 min1, const vec2 max1) {
  return (x - min1) / (max1 - min1);
}

vec3 remap(const vec3 x, const vec3 min1, const vec3 max1) {
  return (x - min1) / (max1 - min1);
}

vec4 remap(const vec4 x, const vec4 min1, const vec4 max1) {
  return (x - min1) / (max1 - min1);
}

float remapClamped(const float x, const float min1, const float max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec2 remapClamped(const vec2 x, const vec2 min1, const vec2 max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec3 remapClamped(const vec3 x, const vec3 min1, const vec3 max1) {
  return saturate((x - min1) / (max1 - min1));
}

vec4 remapClamped(const vec4 x, const vec4 min1, const vec4 max1) {
  return saturate((x - min1) / (max1 - min1));
}
`,cu=`// Reference: https://jcgt.org/published/0003/02/01/paper.pdf

vec2 signNotZero(vec2 v) {
  return vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
}

vec2 packNormalToVec2(vec3 v) {
  vec2 p = v.xy * (1.0 / (abs(v.x) + abs(v.y) + abs(v.z)));
  return v.z <= 0.0
    ? (1.0 - abs(p.yx)) * signNotZero(p)
    : p;
}

vec3 unpackVec2ToNormal(vec2 e) {
  vec3 v = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
  if (v.z < 0.0) {
    v.xy = (1.0 - abs(v.yx)) * signNotZero(v.xy);
  }
  return normalize(v);
}
`,lu=`float raySphereFirstIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  return discriminant < 0.0
    ? -1.0
    : (-b - sqrt(discriminant)) * 0.5;
}

float raySphereFirstIntersection(const vec3 origin, const vec3 direction, const float radius) {
  return raySphereFirstIntersection(origin, direction, vec3(0.0), radius);
}

vec4 raySphereFirstIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  return mix((-b - sqrt(max(vec4(0.0), discriminant))) * 0.5, vec4(-1.0), mask);
}

vec4 raySphereFirstIntersection(const vec3 origin, const vec3 direction, const vec4 radius) {
  return raySphereFirstIntersection(origin, direction, vec3(0.0), radius);
}

float raySphereSecondIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  return discriminant < 0.0
    ? -1.0
    : (-b + sqrt(discriminant)) * 0.5;
}

float raySphereSecondIntersection(const vec3 origin, const vec3 direction, const float radius) {
  return raySphereSecondIntersection(origin, direction, vec3(0.0), radius);
}

vec4 raySphereSecondIntersection(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  return mix((-b + sqrt(max(vec4(0.0), discriminant))) * 0.5, vec4(-1.0), mask);
}

vec4 raySphereSecondIntersection(const vec3 origin, const vec3 direction, const vec4 radius) {
  return raySphereSecondIntersection(origin, direction, vec3(0.0), radius);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const float radius,
  out float intersection1,
  out float intersection2
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  float c = dot(a, a) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  if (discriminant < 0.0) {
    intersection1 = -1.0;
    intersection2 = -1.0;
    return;
  } else {
    float Q = sqrt(discriminant);
    intersection1 = (-b - Q) * 0.5;
    intersection2 = (-b + Q) * 0.5;
  }
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const float radius,
  out float intersection1,
  out float intersection2
) {
  raySphereIntersections(origin, direction, vec3(0.0), radius, intersection1, intersection2);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec3 center,
  const vec4 radius,
  out vec4 intersection1,
  out vec4 intersection2
) {
  vec3 a = origin - center;
  float b = 2.0 * dot(direction, a);
  vec4 c = dot(a, a) - radius * radius;
  vec4 discriminant = b * b - 4.0 * c;
  vec4 mask = step(discriminant, vec4(0.0));
  vec4 Q = sqrt(max(vec4(0.0), discriminant));
  intersection1 = mix((-b - Q) * 0.5, vec4(-1.0), mask);
  intersection2 = mix((-b + Q) * 0.5, vec4(-1.0), mask);
}

void raySphereIntersections(
  const vec3 origin,
  const vec3 direction,
  const vec4 radius,
  out vec4 intersection1,
  out vec4 intersection2
) {
  raySphereIntersections(origin, direction, vec3(0.0), radius, intersection1, intersection2);
}
`,uu=`vec3 screenToView(
  const vec2 uv,
  const float depth,
  const float viewZ,
  const mat4 projectionMatrix,
  const mat4 inverseProjectionMatrix
) {
  vec4 clip = vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
  float clipW = projectionMatrix[2][3] * viewZ + projectionMatrix[3][3];
  clip *= clipW;
  return (inverseProjectionMatrix * clip).xyz;
}
`,hu=`// A fifth-order polynomial approximation of Turbo color map.
// See: https://observablehq.com/@mbostock/turbo
// prettier-ignore
vec3 turbo(const float x) {
  float r = 0.1357 + x * (4.5974 - x * (42.3277 - x * (130.5887 - x * (150.5666 - x * 58.1375))));
  float g = 0.0914 + x * (2.1856 + x * (4.8052 - x * (14.0195 - x * (4.2109 + x * 2.7747))));
  float b = 0.1067 + x * (12.5925 - x * (60.1097 - x * (109.0745 - x * (88.5066 - x * 26.8183))));
  return vec3(r, g, b);
}
`,du=`// Reference: https://www.gamedev.net/tutorials/programming/graphics/contact-hardening-soft-shadows-made-fast-r4906/

vec2 vogelDisk(const int index, const int sampleCount, const float phi) {
  const float goldenAngle = 2.39996322972865332;
  float r = sqrt(float(index) + 0.5) / sqrt(float(sampleCount));
  float theta = float(index) * goldenAngle + phi;
  return r * vec2(cos(theta), sin(theta));
}
`,di=iu,fi=nu,is=au,mi=su,Vt=ou,ns=cu,Yt=lu,as=uu,mn=hu,pi=du;import{Matrix3 as M2,Vector3 as fu}from"./three.module.js";var ss="eac103980f20c0956f2d3215833e73514be08462",mu=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${ss}/packages/atmosphere/assets`,pu=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${ss}/packages/atmosphere/assets/stars.bin`,Dr=64,Rr=16,Ir=32,_r=128,Mr=32,Pr=8,pn=Pr*Mr,gn=_r,vn=Ir,Xt=256,Qt=64,Zt=1/1e3;var gu=new fu;function Kt(t,e,r,i){let a=r.projectOnSurface(t,gu);return a!=null?r.getOsculatingSphereCenter(a,e,i).negate():i.setScalar(0)}var vu=typeof window<"u"&&window.requestIdleCallback!=null?window.requestIdleCallback:function(t,e={}){let r=e.timeout??1,i=performance.now();return setTimeout(()=>{t({get didTimeout(){return e.timeout!=null?!1:performance.now()-i-1>r},timeRemaining(){return Math.max(0,1+(performance.now()-i))}})},1)};var jt=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/functions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Precomputed Atmospheric Scattering
 * Copyright (c) 2008 INRIA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

Number ClampCosine(const Number mu) {
  return clamp(mu, Number(-1.0), Number(1.0));
}

Length ClampDistance(const Length d) {
  return max(d, 0.0 * m);
}

Length ClampRadius(const AtmosphereParameters atmosphere, const Length r) {
  return clamp(r, atmosphere.bottom_radius, atmosphere.top_radius);
}

Length SafeSqrt(const Area a) {
  return sqrt(max(a, 0.0 * m2));
}

Length DistanceToTopAtmosphereBoundary(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  Area discriminant = r * r * (mu * mu - 1.0) +
      atmosphere.top_radius * atmosphere.top_radius;
  return ClampDistance(-r * mu + SafeSqrt(discriminant));
}

Length DistanceToBottomAtmosphereBoundary(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  Area discriminant = r * r * (mu * mu - 1.0) +
      atmosphere.bottom_radius * atmosphere.bottom_radius;
  return ClampDistance(-r * mu - SafeSqrt(discriminant));
}

bool RayIntersectsGround(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  return mu < 0.0 && r * r * (mu * mu - 1.0) +
      atmosphere.bottom_radius * atmosphere.bottom_radius >= 0.0 * m2;
}

Number GetTextureCoordFromUnitRange(const Number x, const int texture_size) {
  return 0.5 / Number(texture_size) + x * (1.0 - 1.0 / Number(texture_size));
}

vec2 GetTransmittanceTextureUvFromRMu(const AtmosphereParameters atmosphere,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  // Distance to top atmosphere boundary for a horizontal ray at ground level.
  Length H = sqrt(atmosphere.top_radius * atmosphere.top_radius -
      atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the horizon.
  Length rho =
      SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the top atmosphere boundary for the ray (r,mu), and its minimum
  // and maximum values over all mu - obtained for (r,1) and (r,mu_horizon).
  Length d = DistanceToTopAtmosphereBoundary(atmosphere, r, mu);
  Length d_min = atmosphere.top_radius - r;
  Length d_max = rho + H;
  Number x_mu = (d - d_min) / (d_max - d_min);
  Number x_r = rho / H;
  return vec2(GetTextureCoordFromUnitRange(x_mu, TRANSMITTANCE_TEXTURE_WIDTH),
              GetTextureCoordFromUnitRange(x_r, TRANSMITTANCE_TEXTURE_HEIGHT));
}

DimensionlessSpectrum GetTransmittanceToTopAtmosphereBoundary(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  vec2 uv = GetTransmittanceTextureUvFromRMu(atmosphere, r, mu);
  // @shotamatsuda: Added for the precomputation stage in half-float precision.
  #ifdef TRANSMITTANCE_PRECISION_LOG
  // Manually interpolate the transmittance instead of the optical depth.
  const vec2 size = vec2(TRANSMITTANCE_TEXTURE_WIDTH, TRANSMITTANCE_TEXTURE_HEIGHT);
  const vec3 texel_size = vec3(1.0 / size, 0.0);
  vec2 coord = (uv * size) - 0.5;
  vec2 i = (floor(coord) + 0.5) * texel_size.xy;
  vec2 f = fract(coord);
  vec4 t1 = exp(-texture(transmittance_texture, i));
  vec4 t2 = exp(-texture(transmittance_texture, i + texel_size.xz));
  vec4 t3 = exp(-texture(transmittance_texture, i + texel_size.zy));
  vec4 t4 = exp(-texture(transmittance_texture, i + texel_size.xy));
  return DimensionlessSpectrum(mix(mix(t1, t2, f.x), mix(t3, t4, f.x), f.y));
  #else // TRANSMITTANCE_PRECISION_LOG
  return DimensionlessSpectrum(texture(transmittance_texture, uv));
  #endif // TRANSMITTANCE_PRECISION_LOG
}

DimensionlessSpectrum GetTransmittance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu, const Length d,
    const bool ray_r_mu_intersects_ground) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  assert(d >= 0.0 * m);

  Length r_d = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
  Number mu_d = ClampCosine((r * mu + d) / r_d);

  if (ray_r_mu_intersects_ground) {
    return min(
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r_d, -mu_d) /
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, -mu),
        DimensionlessSpectrum(1.0));
  } else {
    return min(
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r, mu) /
        GetTransmittanceToTopAtmosphereBoundary(
            atmosphere, transmittance_texture, r_d, mu_d),
        DimensionlessSpectrum(1.0));
  }
}

DimensionlessSpectrum GetTransmittanceToSun(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const Length r, const Number mu_s) {
  Number sin_theta_h = atmosphere.bottom_radius / r;
  Number cos_theta_h = -sqrt(max(1.0 - sin_theta_h * sin_theta_h, 0.0));
  return GetTransmittanceToTopAtmosphereBoundary(
          atmosphere, transmittance_texture, r, mu_s) *
      smoothstep(-sin_theta_h * atmosphere.sun_angular_radius / rad,
                 sin_theta_h * atmosphere.sun_angular_radius / rad,
                 mu_s - cos_theta_h);
}

InverseSolidAngle RayleighPhaseFunction(const Number nu) {
  InverseSolidAngle k = 3.0 / (16.0 * PI * sr);
  return k * (1.0 + nu * nu);
}

InverseSolidAngle MiePhaseFunction(const Number g, const Number nu) {
  InverseSolidAngle k = 3.0 / (8.0 * PI * sr) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
}

vec4 GetScatteringTextureUvwzFromRMuMuSNu(const AtmosphereParameters atmosphere,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu >= -1.0 && mu <= 1.0);
  assert(mu_s >= -1.0 && mu_s <= 1.0);
  assert(nu >= -1.0 && nu <= 1.0);

  // Distance to top atmosphere boundary for a horizontal ray at ground level.
  Length H = sqrt(atmosphere.top_radius * atmosphere.top_radius -
      atmosphere.bottom_radius * atmosphere.bottom_radius);
  // Distance to the horizon.
  Length rho =
      SafeSqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  Number u_r = GetTextureCoordFromUnitRange(rho / H, SCATTERING_TEXTURE_R_SIZE);

  // Discriminant of the quadratic equation for the intersections of the ray
  // (r,mu) with the ground (see RayIntersectsGround).
  Length r_mu = r * mu;
  Area discriminant =
      r_mu * r_mu - r * r + atmosphere.bottom_radius * atmosphere.bottom_radius;
  Number u_mu;
  if (ray_r_mu_intersects_ground) {
    // Distance to the ground for the ray (r,mu), and its minimum and maximum
    // values over all mu - obtained for (r,-1) and (r,mu_horizon).
    Length d = -r_mu - SafeSqrt(discriminant);
    Length d_min = r - atmosphere.bottom_radius;
    Length d_max = rho;
    u_mu = 0.5 - 0.5 * GetTextureCoordFromUnitRange(d_max == d_min ? 0.0 :
        (d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
  } else {
    // Distance to the top atmosphere boundary for the ray (r,mu), and its
    // minimum and maximum values over all mu - obtained for (r,1) and
    // (r,mu_horizon).
    Length d = -r_mu + SafeSqrt(discriminant + H * H);
    Length d_min = atmosphere.top_radius - r;
    Length d_max = rho + H;
    u_mu = 0.5 + 0.5 * GetTextureCoordFromUnitRange(
        (d - d_min) / (d_max - d_min), SCATTERING_TEXTURE_MU_SIZE / 2);
  }

  Length d = DistanceToTopAtmosphereBoundary(
      atmosphere, atmosphere.bottom_radius, mu_s);
  Length d_min = atmosphere.top_radius - atmosphere.bottom_radius;
  Length d_max = H;
  Number a = (d - d_min) / (d_max - d_min);
  Length D = DistanceToTopAtmosphereBoundary(
      atmosphere, atmosphere.bottom_radius, atmosphere.mu_s_min);
  Number A = (D - d_min) / (d_max - d_min);
  // An ad-hoc function equal to 0 for mu_s = mu_s_min (because then d = D and
  // thus a = A), equal to 1 for mu_s = 1 (because then d = d_min and thus
  // a = 0), and with a large slope around mu_s = 0, to get more texture
  // samples near the horizon.
  Number u_mu_s = GetTextureCoordFromUnitRange(
      max(1.0 - a / A, 0.0) / (1.0 + a), SCATTERING_TEXTURE_MU_S_SIZE);

  Number u_nu = (nu + 1.0) / 2.0;
  return vec4(u_nu, u_mu_s, u_mu, u_r);
}

vec2 GetIrradianceTextureUvFromRMuS(const AtmosphereParameters atmosphere,
    const Length r, const Number mu_s) {
  assert(r >= atmosphere.bottom_radius && r <= atmosphere.top_radius);
  assert(mu_s >= -1.0 && mu_s <= 1.0);
  Number x_r = (r - atmosphere.bottom_radius) /
      (atmosphere.top_radius - atmosphere.bottom_radius);
  Number x_mu_s = mu_s * 0.5 + 0.5;
  return vec2(GetTextureCoordFromUnitRange(x_mu_s, IRRADIANCE_TEXTURE_WIDTH),
              GetTextureCoordFromUnitRange(x_r, IRRADIANCE_TEXTURE_HEIGHT));
}

IrradianceSpectrum GetIrradiance(
    const AtmosphereParameters atmosphere,
    const IrradianceTexture irradiance_texture,
    const Length r, const Number mu_s) {
  vec2 uv = GetIrradianceTextureUvFromRMuS(atmosphere, r, mu_s);
  return IrradianceSpectrum(texture(irradiance_texture, uv));
}
`,qt=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/definitions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#define assert(x)

#define Length float
#define Wavelength float
#define Angle float
#define SolidAngle float
#define Power float
#define LuminousPower float

#define Number float
#define InverseLength float
#define Area float
#define Volume float
#define NumberDensity float
#define Irradiance float
#define Radiance float
#define SpectralPower float
#define SpectralIrradiance float
#define SpectralRadiance float
#define SpectralRadianceDensity float
#define ScatteringCoefficient float
#define InverseSolidAngle float
#define LuminousIntensity float
#define Luminance float
#define Illuminance float

// A generic function from Wavelength to some other type.
#define AbstractSpectrum vec3
// A function from Wavelength to Number.
#define DimensionlessSpectrum vec3
// A function from Wavelength to SpectralPower.
#define PowerSpectrum vec3
// A function from Wavelength to SpectralIrradiance.
#define IrradianceSpectrum vec3
// A function from Wavelength to SpectralRadiance.
#define RadianceSpectrum vec3
// A function from Wavelength to SpectralRadianceDensity.
#define RadianceDensitySpectrum vec3
// A function from Wavelength to ScatteringCoefficient.
#define ScatteringSpectrum vec3

// A position in 3D (3 length values).
#define Position vec3
// A unit direction vector in 3D (3 unit-less values).
#define Direction vec3
// A vector of 3 luminance values.
#define Luminance3 vec3
// A vector of 3 illuminance values.
#define Illuminance3 vec3

#define TransmittanceTexture sampler2D
#define AbstractScatteringTexture sampler3D
#define ReducedScatteringTexture sampler3D
#define ScatteringTexture sampler3D
#define ScatteringDensityTexture sampler3D
#define IrradianceTexture sampler2D

const Length m = 1.0;
const Wavelength nm = 1.0;
const Angle rad = 1.0;
const SolidAngle sr = 1.0;
const Power watt = 1.0;
const LuminousPower lm = 1.0;

#if !defined(PI)
const float PI = 3.14159265358979323846;
#endif // !defined(PI)

const Length km = 1000.0 * m;
const Area m2 = m * m;
const Volume m3 = m * m * m;
const Angle pi = PI * rad;
const Angle deg = pi / 180.0;
const Irradiance watt_per_square_meter = watt / m2;
const Radiance watt_per_square_meter_per_sr = watt / (m2 * sr);
const SpectralIrradiance watt_per_square_meter_per_nm = watt / (m2 * nm);
const SpectralRadiance watt_per_square_meter_per_sr_per_nm = watt / (m2 * sr * nm);
const SpectralRadianceDensity watt_per_cubic_meter_per_sr_per_nm = watt / (m3 * sr * nm);
const LuminousIntensity cd = lm / sr;
const LuminousIntensity kcd = 1000.0 * cd;
const Luminance cd_per_square_meter = cd / m2;
const Luminance kcd_per_square_meter = kcd / m2;

struct DensityProfileLayer {
  Length width;
  Number exp_term;
  InverseLength exp_scale;
  InverseLength linear_term;
  Number constant_term;
};

struct DensityProfile {
  DensityProfileLayer layers[2];
};

// See AtmosphereParameter.ts for further details.
struct AtmosphereParameters {
  IrradianceSpectrum solar_irradiance;
  Angle sun_angular_radius;
  Length bottom_radius;
  Length top_radius;
  DensityProfile rayleigh_density;
  ScatteringSpectrum rayleigh_scattering;
  DensityProfile mie_density;
  ScatteringSpectrum mie_scattering;
  ScatteringSpectrum mie_extinction;
  Number mie_phase_function_g;
  DensityProfile absorption_density;
  ScatteringSpectrum absorption_extinction;
  DimensionlessSpectrum ground_albedo;
  Number mu_s_min;
};
`,Jt=`// Based on: https://github.com/ebruneton/precomputed_atmospheric_scattering/blob/master/atmosphere/functions.glsl

/**
 * Copyright (c) 2017 Eric Bruneton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Precomputed Atmospheric Scattering
 * Copyright (c) 2008 INRIA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifdef COMBINED_SCATTERING_TEXTURES
vec3 GetExtrapolatedSingleMieScattering(
    const AtmosphereParameters atmosphere, const vec4 scattering) {
  // Algebraically this can never be negative, but rounding errors can produce
  // that effect for sufficiently short view rays.
  // @shotamatsuda: Avoid division by infinitesimal values.
  // See https://github.com/takram-design-engineering/three-geospatial/issues/47
  if (scattering.r < 1e-5) {
    return vec3(0.0);
  }
  return scattering.rgb * scattering.a / scattering.r *
	    (atmosphere.rayleigh_scattering.r / atmosphere.mie_scattering.r) *
	    (atmosphere.mie_scattering / atmosphere.rayleigh_scattering);
}
#endif // COMBINED_SCATTERING_TEXTURES

IrradianceSpectrum GetCombinedScattering(
    const AtmosphereParameters atmosphere,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground,
    out IrradianceSpectrum single_mie_scattering) {
  vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(
      atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  Number tex_coord_x = uvwz.x * Number(SCATTERING_TEXTURE_NU_SIZE - 1);
  Number tex_x = floor(tex_coord_x);
  Number lerp = tex_coord_x - tex_x;
  vec3 uvw0 = vec3((tex_x + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
#ifdef COMBINED_SCATTERING_TEXTURES
  vec4 combined_scattering =
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp;
  IrradianceSpectrum scattering = IrradianceSpectrum(combined_scattering);
  single_mie_scattering =
      GetExtrapolatedSingleMieScattering(atmosphere, combined_scattering);
#else // COMBINED_SCATTERING_TEXTURES
  IrradianceSpectrum scattering = IrradianceSpectrum(
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp);
  single_mie_scattering = IrradianceSpectrum(
      texture(single_mie_scattering_texture, uvw0) * (1.0 - lerp) +
      texture(single_mie_scattering_texture, uvw1) * lerp);
#endif // COMBINED_SCATTERING_TEXTURES
  return scattering;
}

// @shotamatsuda: Added for reading higher-order scattering texture.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
IrradianceSpectrum GetScattering(
    const AtmosphereParameters atmosphere,
    const ReducedScatteringTexture scattering_texture,
    const Length r, const Number mu, const Number mu_s, const Number nu,
    const bool ray_r_mu_intersects_ground) {
  vec4 uvwz = GetScatteringTextureUvwzFromRMuMuSNu(
      atmosphere, r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  Number tex_coord_x = uvwz.x * Number(SCATTERING_TEXTURE_NU_SIZE - 1);
  Number tex_x = floor(tex_coord_x);
  Number lerp = tex_coord_x - tex_x;
  vec3 uvw0 = vec3((tex_x + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  vec3 uvw1 = vec3((tex_x + 1.0 + uvwz.y) / Number(SCATTERING_TEXTURE_NU_SIZE),
      uvwz.z, uvwz.w);
  IrradianceSpectrum scattering = IrradianceSpectrum(
      texture(scattering_texture, uvw0) * (1.0 - lerp) +
      texture(scattering_texture, uvw1) * lerp);
  return scattering;
}
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE

RadianceSpectrum GetSkyRadiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    Position camera, const Direction view_ray, const Length shadow_length,
    const Direction sun_direction,
    out DimensionlessSpectrum transmittance) {
  // Compute the distance to the top atmosphere boundary along the view ray,
  // assuming the viewer is in space (or NaN if the view ray does not intersect
  // the atmosphere).
  Length r = length(camera);
  Length rmu = dot(camera, view_ray);
  // @shotamatsuda: Use SafeSqrt instead.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/26
  Length distance_to_top_atmosphere_boundary = -rmu -
      SafeSqrt(rmu * rmu - r * r +
          atmosphere.top_radius * atmosphere.top_radius);
  // If the viewer is in space and the view ray intersects the atmosphere, move
  // the viewer to the top atmosphere boundary (along the view ray):
  if (distance_to_top_atmosphere_boundary > 0.0 * m) {
    camera = camera + view_ray * distance_to_top_atmosphere_boundary;
    r = atmosphere.top_radius;
    rmu += distance_to_top_atmosphere_boundary;
  } else if (r > atmosphere.top_radius) {
    // If the view ray does not intersect the atmosphere, simply return 0.
    transmittance = DimensionlessSpectrum(1.0);
    return RadianceSpectrum(0.0 * watt_per_square_meter_per_sr_per_nm);
  }
  // Compute the r, mu, mu_s and nu parameters needed for the texture lookups.
  Number mu = rmu / r;
  Number mu_s = dot(camera, sun_direction) / r;
  Number nu = dot(view_ray, sun_direction);

  // @shotamatsuda: For rendering points below the bottom atmosphere.
  #ifdef GROUND
  bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);
  #else // GROUND
  bool ray_r_mu_intersects_ground = false;
  #endif // GROUND

  transmittance = ray_r_mu_intersects_ground ? DimensionlessSpectrum(0.0) :
      GetTransmittanceToTopAtmosphereBoundary(
          atmosphere, transmittance_texture, r, mu);
  IrradianceSpectrum single_mie_scattering;
  IrradianceSpectrum scattering;
  if (shadow_length == 0.0 * m) {
    scattering = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r, mu, mu_s, nu, ray_r_mu_intersects_ground,
        single_mie_scattering);
  } else {
    // Case of light shafts (shadow_length is the total length noted l in our
    // paper): we omit the scattering between the camera and the point at
    // distance l, by implementing Eq. (18) of the paper (shadow_transmittance
    // is the T(x,x_s) term, scattering is the S|x_s=x+lv term).
    Length d = shadow_length;
    Length r_p =
        ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
    Number mu_p = (r * mu + d) / r_p;
    Number mu_s_p = (r * mu_s + d * nu) / r_p;

    scattering = GetCombinedScattering(
        atmosphere, scattering_texture, single_mie_scattering_texture,
        r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
        single_mie_scattering);
    DimensionlessSpectrum shadow_transmittance =
        GetTransmittance(atmosphere, transmittance_texture,
            r, mu, shadow_length, ray_r_mu_intersects_ground);
    // @shotamatsuda: Occlude only single Rayleigh scattering by the shadow.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    IrradianceSpectrum higher_order_scattering = GetScattering(
        atmosphere, higher_order_scattering_texture,
        r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground);
    IrradianceSpectrum single_scattering = scattering - higher_order_scattering;
    scattering = single_scattering * shadow_transmittance + higher_order_scattering;
#else // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    scattering = scattering * shadow_transmittance;
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
    single_mie_scattering = single_mie_scattering * shadow_transmittance;
  }
  return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
      MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

// @shotamatsuda: Returns the point on the ray closest to the origin.
vec3 ClosestPointOnRay(const Position camera, const Position point) {
  Position ray = point - camera;
  Number t = clamp(-dot(camera, ray) / dot(ray, ray), 0.0, 1.0);
  return camera + t * ray;
}

vec2 RaySphereIntersections(
    const Position camera, const Direction direction, const Length radius) {
  float b = 2.0 * dot(direction, camera);
  float c = dot(camera, camera) - radius * radius;
  float discriminant = b * b - 4.0 * c;
  float Q = sqrt(discriminant);
  return vec2(-b - Q, -b + Q) * 0.5;
}

// @shotamatsuda: Clip the view ray at the bottom atmosphere boundary.
bool ClipAtBottomAtmosphere(
    const AtmosphereParameters atmosphere,
    const Direction view_ray, inout Position camera, inout Position point) {
  const Length eps = 0.0;
  Length bottom_radius = atmosphere.bottom_radius + eps;
  Length r_camera = length(camera);
  Length r_point = length(point);
  bool camera_below = r_camera < bottom_radius;
  bool point_below = r_point < bottom_radius;

  vec2 t = RaySphereIntersections(camera, view_ray, bottom_radius);
  Position intersection = camera + view_ray * (camera_below ? t.y : t.x);
  camera = camera_below ? intersection : camera;
  point = point_below ? intersection : point;

  return camera_below && point_below;
}

RadianceSpectrum GetSkyRadianceToPoint(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const ReducedScatteringTexture scattering_texture,
    const ReducedScatteringTexture single_mie_scattering_texture,
    Position camera, Position point, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  // @shotamatsuda: Avoid artifacts when the ray does not intersect the top
  // atmosphere boundary.
  if (length(ClosestPointOnRay(camera, point)) > atmosphere.top_radius) {
    transmittance = vec3(1.0);
    return vec3(0.0);
  }

  Direction view_ray = normalize(point - camera);
  if (ClipAtBottomAtmosphere(atmosphere, view_ray, camera, point)) {
    transmittance = vec3(1.0);
    return vec3(0.0);
  }

  // Compute the distance to the top atmosphere boundary along the view ray,
  // assuming the viewer is in space (or NaN if the view ray does not intersect
  // the atmosphere).
  Length r = length(camera);
  Length rmu = dot(camera, view_ray);
  // @shotamatsuda: Use SafeSqrt instead.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/26
  Length distance_to_top_atmosphere_boundary = -rmu -
      SafeSqrt(rmu * rmu - r * r +
          atmosphere.top_radius * atmosphere.top_radius);
  // If the viewer is in space and the view ray intersects the atmosphere, move
  // the viewer to the top atmosphere boundary (along the view ray):
  if (distance_to_top_atmosphere_boundary > 0.0 * m) {
    camera = camera + view_ray * distance_to_top_atmosphere_boundary;
    r = atmosphere.top_radius;
    rmu += distance_to_top_atmosphere_boundary;
  }

  // Compute the r, mu, mu_s and nu parameters for the first texture lookup.
  Number mu = rmu / r;
  Number mu_s = dot(camera, sun_direction) / r;
  Number nu = dot(view_ray, sun_direction);
  Length d = length(point - camera);
  bool ray_r_mu_intersects_ground = RayIntersectsGround(atmosphere, r, mu);

  // @shotamatsuda: Hack to avoid rendering artifacts near the horizon, due to
  // finite atmosphere texture resolution and finite floating point precision.
  // See: https://github.com/ebruneton/precomputed_atmospheric_scattering/pull/32
  if (!ray_r_mu_intersects_ground) {
    Number mu_horizon = -SafeSqrt(1.0 -
        (atmosphere.bottom_radius * atmosphere.bottom_radius) / (r * r));
    const Number eps = 0.004;
    mu = max(mu, mu_horizon + eps);
  }

  transmittance = GetTransmittance(atmosphere, transmittance_texture,
      r, mu, d, ray_r_mu_intersects_ground);

  IrradianceSpectrum single_mie_scattering;
  IrradianceSpectrum scattering = GetCombinedScattering(
      atmosphere, scattering_texture, single_mie_scattering_texture,
      r, mu, mu_s, nu, ray_r_mu_intersects_ground,
      single_mie_scattering);

  // Compute the r, mu, mu_s and nu parameters for the second texture lookup.
  // If shadow_length is not 0 (case of light shafts), we want to ignore the
  // scattering along the last shadow_length meters of the view ray, which we
  // do by subtracting shadow_length from d (this way scattering_p is equal to
  // the S|x_s=x_0-lv term in Eq. (17) of our paper).
  d = max(d - shadow_length, 0.0 * m);
  Length r_p = ClampRadius(atmosphere, sqrt(d * d + 2.0 * r * mu * d + r * r));
  Number mu_p = (r * mu + d) / r_p;
  Number mu_s_p = (r * mu_s + d * nu) / r_p;

  IrradianceSpectrum single_mie_scattering_p;
  IrradianceSpectrum scattering_p = GetCombinedScattering(
      atmosphere, scattering_texture, single_mie_scattering_texture,
      r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground,
      single_mie_scattering_p);

  // Combine the lookup results to get the scattering between camera and point.
  DimensionlessSpectrum shadow_transmittance = transmittance;
  if (shadow_length > 0.0 * m) {
    // This is the T(x,x_s) term in Eq. (17) of our paper, for light shafts.
    shadow_transmittance = GetTransmittance(atmosphere, transmittance_texture,
        r, mu, d, ray_r_mu_intersects_ground);
  }
  // @shotamatsuda: Occlude only single Rayleigh scattering by the shadow.
#ifdef HAS_HIGHER_ORDER_SCATTERING_TEXTURE
  IrradianceSpectrum higher_order_scattering = GetScattering(
      atmosphere, higher_order_scattering_texture,
      r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  IrradianceSpectrum single_scattering = scattering - higher_order_scattering;
  IrradianceSpectrum higher_order_scattering_p = GetScattering(
      atmosphere, higher_order_scattering_texture,
      r_p, mu_p, mu_s_p, nu, ray_r_mu_intersects_ground);
  IrradianceSpectrum single_scattering_p =
      scattering_p - higher_order_scattering_p;
  scattering =
      single_scattering - shadow_transmittance * single_scattering_p +
      higher_order_scattering - transmittance * higher_order_scattering_p;
#else // HAS_HIGHER_ORDER_SCATTERING_TEXTURE
  scattering = scattering - shadow_transmittance * scattering_p;
#endif // HAS_HIGHER_ORDER_SCATTERING_TEXTURE

  single_mie_scattering =
      single_mie_scattering - shadow_transmittance * single_mie_scattering_p;
#ifdef COMBINED_SCATTERING_TEXTURES
  single_mie_scattering = GetExtrapolatedSingleMieScattering(
      atmosphere, vec4(scattering, single_mie_scattering.r));
#endif // COMBINED_SCATTERING_TEXTURES

  // Hack to avoid rendering artifacts when the sun is below the horizon.
  single_mie_scattering = single_mie_scattering *
      smoothstep(Number(0.0), Number(0.01), mu_s);

  return scattering * RayleighPhaseFunction(nu) + single_mie_scattering *
      MiePhaseFunction(atmosphere.mie_phase_function_g, nu);
}

IrradianceSpectrum GetSunAndSkyIrradiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const IrradianceTexture irradiance_texture,
    const Position point, const Direction normal, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  Length r = length(point);
  Number mu_s = dot(point, sun_direction) / r;

  // Indirect irradiance (approximated if the surface is not horizontal).
  sky_irradiance = GetIrradiance(atmosphere, irradiance_texture, r, mu_s) *
      (1.0 + dot(normal, point) / r) * 0.5;

  // Direct irradiance.
  return atmosphere.solar_irradiance *
      GetTransmittanceToSun(
          atmosphere, transmittance_texture, r, mu_s) *
      max(dot(normal, sun_direction), 0.0);
}

// @shotamatsuda: Added for the clouds.
IrradianceSpectrum GetSunAndSkyScalarIrradiance(
    const AtmosphereParameters atmosphere,
    const TransmittanceTexture transmittance_texture,
    const IrradianceTexture irradiance_texture,
    const Position point, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  Length r = length(point);
  Number mu_s = dot(point, sun_direction) / r;

  // Indirect irradiance. Integral over sphere yields 2\u03C0.
  sky_irradiance = GetIrradiance(atmosphere, irradiance_texture, r, mu_s) *
      2.0 * PI;

  // Direct irradiance. Omit the cosine term.
  return atmosphere.solar_irradiance *
      GetTransmittanceToSun(atmosphere, transmittance_texture, r, mu_s);
}

Luminance3 GetSolarLuminance() {
  return ATMOSPHERE.solar_irradiance /
      (PI * ATMOSPHERE.sun_angular_radius * ATMOSPHERE.sun_angular_radius) *
      SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Luminance3 GetSkyLuminance(
    const Position camera, Direction view_ray, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadiance(ATMOSPHERE, transmittance_texture,
      scattering_texture, single_mie_scattering_texture,
      camera, view_ray, shadow_length, sun_direction,
      transmittance) * SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Luminance3 GetSkyLuminanceToPoint(
    const Position camera, const Position point, const Length shadow_length,
    const Direction sun_direction, out DimensionlessSpectrum transmittance) {
  return GetSkyRadianceToPoint(ATMOSPHERE, transmittance_texture,
      scattering_texture, single_mie_scattering_texture,
      camera, point, shadow_length, sun_direction, transmittance) *
      SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

Illuminance3 GetSunAndSkyIlluminance(
    const Position p, const Direction normal, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance = GetSunAndSkyIrradiance(
      ATMOSPHERE, transmittance_texture, irradiance_texture, p, normal,
      sun_direction, sky_irradiance);
  sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

// @shotamatsuda: Added for the clouds.
Illuminance3 GetSunAndSkyScalarIlluminance(
    const Position p, const Direction sun_direction,
    out IrradianceSpectrum sky_irradiance) {
  IrradianceSpectrum sun_irradiance = GetSunAndSkyScalarIrradiance(
      ATMOSPHERE, transmittance_texture, irradiance_texture, p,
      sun_direction, sky_irradiance);
  sky_irradiance *= SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return sun_irradiance * SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
}

#define GetSolarRadiance GetSolarLuminance
#define GetSkyRadiance GetSkyLuminance
#define GetSkyRadianceToPoint GetSkyLuminanceToPoint
#define GetSunAndSkyIrradiance GetSunAndSkyIlluminance
#define GetSunAndSkyScalarIrradiance GetSunAndSkyScalarIlluminance
`;var wu=new K(.2126,.7152,.0722),yu=["solarIrradiance","sunAngularRadius","bottomRadius","topRadius","rayleighDensity","rayleighScattering","mieDensity","mieScattering","mieExtinction","miePhaseFunctionG","absorptionDensity","absorptionExtinction","groundAlbedo","muSMin","skyRadianceToLuminance","sunRadianceToLuminance"];function Cu(t,e){if(e!=null)for(let r of yu){let i=e[r];i!=null&&(t[r]instanceof K?t[r].copy(i):t[r]=i)}}var ct=class{constructor(e,r,i,a,s){this.width=e,this.expTerm=r,this.expScale=i,this.linearTerm=a,this.constantTerm=s}toUniform(){return new _({width:this.width,exp_term:this.expTerm,exp_scale:this.expScale,linear_term:this.linearTerm,constant_term:this.constantTerm})}},xn=class{constructor(e){this.solarIrradiance=new K(1.474,1.8504,1.91198),this.sunAngularRadius=.004675,this.bottomRadius=636e4,this.topRadius=642e4,this.rayleighDensity=[new ct(0,0,0,0,0),new ct(0,1,-.125,0,0)],this.rayleighScattering=new K(.005802,.013558,.0331),this.mieDensity=[new ct(0,0,0,0,0),new ct(0,1,-.833333,0,0)],this.mieScattering=new K(.003996,.003996,.003996),this.mieExtinction=new K(.00444,.00444,.00444),this.miePhaseFunctionG=.8,this.absorptionDensity=[new ct(25,0,0,1/15,-2/3),new ct(0,0,0,-1/15,8/3)],this.absorptionExtinction=new K(65e-5,.001881,85e-6),this.groundAlbedo=new En().setScalar(.1),this.muSMin=Math.cos($a(120)),this.sunRadianceToLuminance=new K(98242.786222,69954.398112,66475.012354),this.skyRadianceToLuminance=new K(114974.916437,71305.954816,65310.548555),this.sunRadianceToRelativeLuminance=new K,this.skyRadianceToRelativeLuminance=new K,Cu(this,e);let r=wu.dot(this.sunRadianceToLuminance);this.sunRadianceToRelativeLuminance.copy(this.sunRadianceToLuminance).divideScalar(r),this.skyRadianceToRelativeLuminance.copy(this.skyRadianceToLuminance).divideScalar(r)}toUniform(){return new _({solar_irradiance:this.solarIrradiance,sun_angular_radius:this.sunAngularRadius,bottom_radius:this.bottomRadius*Zt,top_radius:this.topRadius*Zt,rayleigh_density:{layers:this.rayleighDensity.map(e=>e.toUniform().value)},rayleigh_scattering:this.rayleighScattering,mie_density:{layers:this.mieDensity.map(e=>e.toUniform().value)},mie_scattering:this.mieScattering,mie_extinction:this.mieExtinction,mie_phase_function_g:this.miePhaseFunctionG,absorption_density:{layers:this.absorptionDensity.map(e=>e.toUniform().value)},absorption_extinction:this.absorptionExtinction,ground_albedo:this.groundAlbedo,mu_s_min:this.muSMin})}};xn.DEFAULT=new xn;var Pt=xn,Du=`precision highp sampler2DArray;

#include "core/depth"
#include "core/math"
#include "core/packing"
#include "core/transform"
#ifdef HAS_SHADOW
#include "core/raySphereIntersection"
#include "core/cascadedShadowMaps"
#include "core/interleavedGradientNoise"
#include "core/vogelDisk"
#endif // HAS_SHADOW

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform sampler2D normalBuffer;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform float bottomRadius;
uniform mat4 worldToECEFMatrix;
uniform float geometricErrorCorrectionAmount;
uniform vec3 sunDirection;
uniform float cosSunAngularRadius;
uniform vec3 moonDirection;
uniform float moonAngularRadius;
uniform float lunarRadianceScale;
uniform float albedoScale;

#include "sky"

#ifdef HAS_LIGHTING_MASK
uniform sampler2D lightingMaskBuffer;
#endif // HAS_LIGHTING_MASK

// prettier-ignore
#define LIGHTING_MASK_CHANNEL_ LIGHTING_MASK_CHANNEL

#ifdef HAS_OVERLAY
uniform sampler2D overlayBuffer;
#endif // HAS_OVERLAY

#ifdef HAS_SHADOW
uniform sampler2DArray shadowBuffer;
uniform vec2 shadowIntervals[SHADOW_CASCADE_COUNT];
uniform mat4 shadowMatrices[SHADOW_CASCADE_COUNT];
uniform mat4 inverseShadowMatrices[SHADOW_CASCADE_COUNT];
uniform float shadowFar;
uniform float shadowTopHeight;
uniform float shadowRadius;
uniform sampler3D stbnTexture;
uniform int frame;
#endif // HAS_SHADOW

#ifdef HAS_SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
#endif // HAS_SHADOW_LENGTH

varying vec3 vCameraPosition;
varying vec3 vRayDirection;
varying vec3 vGeometryAltitudeCorrection;
varying vec3 vEllipsoidRadiiSquared;

vec3 readNormal(const vec2 uv, out bool degenerate) {
  vec3 normal = texture(normalBuffer, uv).xyz;
  degenerate = normal == vec3(0.0);
  #ifdef OCT_ENCODED_NORMAL
  return unpackVec2ToNormal(normal.xy);
  #else // OCT_ENCODED_NORMAL
  return 2.0 * normal - 1.0;
  #endif // OCT_ENCODED_NORMAL
}

void correctGeometricError(inout vec3 positionECEF, inout vec3 normalECEF) {
  // TODO: The error is pronounced at the edge of the ellipsoid due to the
  // large difference between the sphere position and the unprojected position
  // at the current fragment. Calculating the sphere position from the fragment
  // UV may resolve this.

  // Correct way is slerp, but this will be small-angle interpolation anyways.
  vec3 sphereNormal = normalize(positionECEF / vEllipsoidRadiiSquared);
  vec3 spherePosition = ATMOSPHERE.bottom_radius * sphereNormal;
  normalECEF = mix(normalECEF, sphereNormal, geometricErrorCorrectionAmount);
  positionECEF = mix(positionECEF, spherePosition, geometricErrorCorrectionAmount);
}

#if defined(SUN_LIGHT) || defined(SKY_LIGHT)

vec3 getSunSkyIrradiance(
  const vec3 positionECEF,
  const vec3 normal,
  const vec3 inputColor,
  const float sunTransmittance
) {
  // Assume lambertian BRDF. If both SUN_LIGHT and SKY_LIGHT are not defined,
  // regard the inputColor as radiance at the texel.
  vec3 diffuse = inputColor * albedoScale * RECIPROCAL_PI;
  vec3 skyIrradiance;
  vec3 sunIrradiance = GetSunAndSkyIrradiance(positionECEF, normal, sunDirection, skyIrradiance);

  #ifdef HAS_SHADOW
  sunIrradiance *= sunTransmittance;
  #endif // HAS_SHADOW

  #if defined(SUN_LIGHT) && defined(SKY_LIGHT)
  return diffuse * (sunIrradiance + skyIrradiance);
  #elif defined(SUN_LIGHT)
  return diffuse * sunIrradiance;
  #elif defined(SKY_LIGHT)
  return diffuse * skyIrradiance;
  #endif // defined(SUN_LIGHT) && defined(SKY_LIGHT)
}

#endif // defined(SUN_LIGHT) || defined(SKY_LIGHT)

#if defined(TRANSMITTANCE) || defined(INSCATTER)

void applyTransmittanceInscatter(const vec3 positionECEF, float shadowLength, inout vec3 radiance) {
  vec3 transmittance;
  vec3 inscatter = GetSkyRadianceToPoint(
    vCameraPosition,
    positionECEF,
    shadowLength,
    sunDirection,
    transmittance
  );
  #ifdef TRANSMITTANCE
  radiance = radiance * transmittance;
  #endif // TRANSMITTANCE
  #ifdef INSCATTER
  radiance = radiance + inscatter;
  #endif // INSCATTER
}

#endif // defined(TRANSMITTANCE) || defined(INSCATTER)

#ifdef HAS_SHADOW

float getSTBN() {
  ivec3 size = textureSize(stbnTexture, 0);
  vec3 scale = 1.0 / vec3(size);
  return texture(stbnTexture, vec3(gl_FragCoord.xy, float(frame % size.z)) * scale).r;
}

vec2 getShadowUv(const vec3 worldPosition, const int cascadeIndex) {
  vec4 clip = shadowMatrices[cascadeIndex] * vec4(worldPosition, 1.0);
  clip /= clip.w;
  return clip.xy * 0.5 + 0.5;
}

float getDistanceToShadowTop(const vec3 positionECEF) {
  // Distance to the top of the shadows along the sun direction, which matches
  // the ray origin of BSM.
  return raySphereSecondIntersection(
    positionECEF / METER_TO_LENGTH_UNIT, // TODO: Make units consistent
    sunDirection,
    vec3(0.0),
    bottomRadius + shadowTopHeight
  );
}

float readShadowOpticalDepth(const vec2 uv, const float distanceToTop, const int cascadeIndex) {
  // r: frontDepth, g: meanExtinction, b: maxOpticalDepth, a: maxOpticalDepthTail
  vec4 shadow = texture(shadowBuffer, vec3(uv, float(cascadeIndex)));
  // Omit adding maxOpticalDepthTail to avoid pronounced aliasing. Ground
  // shadow will be attenuated by inscatter anyways.
  return min(shadow.b, shadow.g * max(0.0, distanceToTop - shadow.r));
}

float sampleShadowOpticalDepthPCF(
  const vec3 worldPosition,
  const float distanceToTop,
  const float radius,
  const int cascadeIndex
) {
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return 0.0;
  }

  vec2 texelSize = vec2(1.0) / vec2(textureSize(shadowBuffer, 0).xy);
  float sum = 0.0;
  vec2 offset;
  #pragma unroll_loop_start
  for (int i = 0; i < 16; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
    offset = vogelDisk(
      UNROLLED_LOOP_INDEX,
      SHADOW_SAMPLE_COUNT,
      interleavedGradientNoise(gl_FragCoord.xy) * PI2
    );
    sum += readShadowOpticalDepth(uv + offset * radius * texelSize, distanceToTop, cascadeIndex);
    #endif // UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
  }
  #pragma unroll_loop_end
  return sum / float(SHADOW_SAMPLE_COUNT);
}

float sampleShadowOpticalDepth(
  const vec3 worldPosition,
  const vec3 positionECEF,
  const float radius,
  const float jitter
) {
  float distanceToTop = getDistanceToShadowTop(positionECEF);
  if (distanceToTop <= 0.0) {
    return 0.0;
  }
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? sampleShadowOpticalDepthPCF(worldPosition, distanceToTop, radius, cascadeIndex)
    : 0.0;
}

float getShadowRadius(const vec3 worldPosition) {
  vec4 clip = shadowMatrices[0] * vec4(worldPosition, 1.0);
  clip /= clip.w;

  // Offset by 1px in each direction in shadow's clip coordinates.
  vec2 shadowSize = vec2(textureSize(shadowBuffer, 0));
  vec3 offset = vec3(2.0 / shadowSize, 0.0);
  vec4 clipX = clip + offset.xzzz;
  vec4 clipY = clip + offset.zyzz;

  // Convert back to world space.
  vec4 worldX = inverseShadowMatrices[0] * clipX;
  vec4 worldY = inverseShadowMatrices[0] * clipY;

  // Project into the main camera's clip space.
  mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;
  vec4 projected = viewProjectionMatrix * vec4(worldPosition, 1.0);
  vec4 projectedX = viewProjectionMatrix * worldX;
  vec4 projectedY = viewProjectionMatrix * worldY;
  projected /= projected.w;
  projectedX /= projectedX.w;
  projectedY /= projectedY.w;

  // Take the mean of pixel sizes.
  vec2 center = (projected.xy * 0.5 + 0.5) * resolution;
  vec2 offsetX = (projectedX.xy * 0.5 + 0.5) * resolution;
  vec2 offsetY = (projectedY.xy * 0.5 + 0.5) * resolution;
  float size = max(length(offsetX - center), length(offsetY - center));

  return remapClamped(size, 10.0, 50.0, 0.0, shadowRadius);
}

#endif // HAS_SHADOW

void mainImage(const vec4 inputColor, const vec2 uv, out vec4 outputColor) {
  #if defined(HAS_LIGHTING_MASK) && defined(DEBUG_SHOW_LIGHTING_MASK)
  outputColor.rgb = vec3(texture(lightingMaskBuffer, uv).LIGHTING_MASK_CHANNEL_);
  outputColor.a = 1.0;
  return;
  #endif // defined(HAS_LIGHTING_MASK) && defined(DEBUG_SHOW_LIGHTING_MASK)

  float shadowLength = 0.0;
  #ifdef HAS_SHADOW_LENGTH
  shadowLength = texture(shadowLengthBuffer, uv).r;
  #endif // HAS_SHADOW_LENGTH

  #ifdef HAS_OVERLAY
  vec4 overlay = texture(overlayBuffer, uv);
  if (overlay.a == 1.0) {
    outputColor = overlay;
    return;
  }
  #endif // HAS_OVERLAY

  vec3 rayDirection = normalize(vRayDirection);
  vec3 dRDdx = dFdx(rayDirection);
  vec3 dRDdy = dFdy(rayDirection);
  float fragmentAngle = length(dRDdx + dRDdy) / length(rayDirection);

  float depth = readDepthValue(depthBuffer, uv);
  if (depth >= 1.0 - 1e-8) {
    #ifdef SKY
    outputColor.rgb = getSkyRadiance(
      vCameraPosition,
      rayDirection,
      shadowLength,
      sunDirection,
      moonDirection,
      moonAngularRadius,
      lunarRadianceScale,
      fragmentAngle
    );
    outputColor.a = 1.0;
    #else // SKY
    outputColor = inputColor;
    #endif // SKY

    #ifdef HAS_OVERLAY
    outputColor.rgb = outputColor.rgb * (1.0 - overlay.a) + overlay.rgb;
    #endif // HAS_OVERLAY
    return;
  }
  depth = reverseLogDepth(depth, cameraNear, cameraFar);

  // Reconstruct position and normal in world space.
  vec3 viewPosition = screenToView(
    uv,
    depth,
    getViewZ(depth),
    projectionMatrix,
    inverseProjectionMatrix
  );
  vec3 worldPosition = (inverseViewMatrix * vec4(viewPosition, 1.0)).xyz;
  vec3 positionECEF = (worldToECEFMatrix * vec4(worldPosition, 1.0)).xyz;
  positionECEF = positionECEF * METER_TO_LENGTH_UNIT + vGeometryAltitudeCorrection;

  vec3 viewNormal;
  bool degenerateNormal = false;
  #ifdef RECONSTRUCT_NORMAL
  vec3 dVPdx = dFdx(viewPosition);
  vec3 dVPdy = dFdy(viewPosition);
  viewNormal = normalize(cross(dVPdx, dVPdy));
  #elif defined(HAS_NORMALS)
  viewNormal = readNormal(uv, degenerateNormal);
  #endif // defined(HAS_NORMALS)

  #if defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)
  vec3 worldNormal = (inverseViewMatrix * vec4(viewNormal, 0.0)).xyz;
  vec3 normalECEF = (worldToECEFMatrix * vec4(worldNormal, 0.0)).xyz;
  #else // defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)
  vec3 normalECEF = normalize(positionECEF);
  #endif // defined(RECONSTRUCT_NORMAL) || defined(HAS_NORMALS)

  #ifdef CORRECT_GEOMETRIC_ERROR
  correctGeometricError(positionECEF, normalECEF);
  #endif // CORRECT_GEOMETRIC_ERROR

  #ifdef HAS_SHADOW
  float stbn = getSTBN();
  float radius = getShadowRadius(worldPosition);
  float opticalDepth = sampleShadowOpticalDepth(worldPosition, positionECEF, radius, stbn);
  float sunTransmittance = exp(-opticalDepth);
  #else // HAS_SHADOW
  float sunTransmittance = 1.0;
  #endif // HAS_SHADOW

  vec3 radiance;
  #if defined(SUN_LIGHT) || defined(SKY_LIGHT)
  // WORKAROUND: When both post-process lighting and sky options are enabled,
  // stars have degenerate normals. We use this to disable irradiance, which is
  // irrelevant for them.
  if (!degenerateNormal) {
    radiance = getSunSkyIrradiance(positionECEF, normalECEF, inputColor.rgb, sunTransmittance);
  } else {
    radiance = inputColor.rgb;
  }
  #ifdef HAS_LIGHTING_MASK
  float lightingMask = texture(lightingMaskBuffer, uv).LIGHTING_MASK_CHANNEL_;
  radiance = mix(inputColor.rgb, radiance, lightingMask);
  #endif // HAS_LIGHTING_MASK
  #else // defined(SUN_LIGHT) || defined(SKY_LIGHT)
  radiance = inputColor.rgb;
  #endif // defined(SUN_LIGHT) || defined(SKY_LIGHT)

  #if defined(TRANSMITTANCE) || defined(INSCATTER)
  applyTransmittanceInscatter(positionECEF, shadowLength, radiance);
  #endif // defined(TRANSMITTANCE) || defined(INSCATTER)

  outputColor = vec4(radiance, inputColor.a);

  #ifdef HAS_OVERLAY
  outputColor.rgb = outputColor.rgb * (1.0 - overlay.a) + overlay.rgb;
  #endif // HAS_OVERLAY
}
`,Ru=`uniform mat4 inverseViewMatrix;
uniform mat4 inverseProjectionMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;
uniform float geometricErrorCorrectionAmount;
uniform vec3 ellipsoidRadii;

varying vec3 vCameraPosition;
varying vec3 vRayDirection;
varying vec3 vGeometryAltitudeCorrection;
varying vec3 vEllipsoidRadiiSquared;

void getCameraRay(out vec3 origin, out vec3 direction) {
  bool isPerspective = inverseProjectionMatrix[2][3] != 0.0; // 4th entry in the 3rd column

  if (isPerspective) {
    // Calculate the camera ray for a perspective camera.
    vec4 viewPosition = inverseProjectionMatrix * vec4(position, 1.0);
    vec4 worldDirection = inverseViewMatrix * vec4(viewPosition.xyz, 0.0);
    origin = cameraPosition;
    direction = worldDirection.xyz;
  } else {
    // Unprojected points to calculate direction.
    vec4 nearPoint = inverseProjectionMatrix * vec4(position.xy, -1.0, 1.0);
    vec4 farPoint = inverseProjectionMatrix * vec4(position.xy, -0.9, 1.0);
    nearPoint /= nearPoint.w;
    farPoint /= farPoint.w;

    // Calculate world values.
    vec4 worldDirection = inverseViewMatrix * vec4(farPoint.xyz - nearPoint.xyz, 0.0);
    vec4 worldOrigin = inverseViewMatrix * nearPoint;

    // Outputs
    direction = worldDirection.xyz;
    origin = worldOrigin.xyz;
  }
}

void mainSupport() {
  vec3 direction, origin;
  getCameraRay(origin, direction);

  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(origin, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(direction, 0.0)).xyz;

  vGeometryAltitudeCorrection = altitudeCorrection * METER_TO_LENGTH_UNIT;
  // Gradually turn off the altitude correction on geometries as the geometric
  // error correction takes effect, because that on the ideal sphere will be
  // over corrected.
  // See: https://github.com/takram-design-engineering/three-geospatial/pull/23#issuecomment-2542914656
  #ifdef CORRECT_GEOMETRIC_ERROR
  vGeometryAltitudeCorrection *= 1.0 - geometricErrorCorrectionAmount;
  #endif // CORRECT_GEOMETRIC_ERROR

  vec3 radii = ellipsoidRadii * METER_TO_LENGTH_UNIT;
  vEllipsoidRadiiSquared = radii * radii;
}
`,Ss=`vec3 getLunarRadiance(const float moonAngularRadius) {
  // Not a physical number but the order of 10^-6 relative to the sun may fit.
  vec3 radiance =
    ATMOSPHERE.solar_irradiance *
    0.000002 /
    (PI * moonAngularRadius * moonAngularRadius) *
    SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
  return radiance;
}

float intersectSphere(const vec3 ray, const vec3 point, const float radius) {
  vec3 P = -point;
  float PoR = dot(P, ray);
  float D = dot(P, P) - radius * radius;
  return -PoR - sqrt(PoR * PoR - D);
}

float orenNayarDiffuse(const vec3 L, const vec3 V, const vec3 N) {
  float NoL = dot(N, L);
  float NoV = dot(N, V);
  float s = dot(L, V) - NoL * NoV;
  float t = mix(1.0, max(NoL, NoV), step(0.0, s));
  return max(0.0, NoL) * (0.62406015 + 0.41284404 * s / t);
}

vec3 getSkyRadiance(
  const vec3 cameraPosition,
  const vec3 rayDirection,
  const float shadowLength,
  const vec3 sunDirection,
  const vec3 moonDirection,
  const float moonAngularRadius,
  const float lunarRadianceScale,
  const float fragmentAngle
) {
  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(
    cameraPosition,
    rayDirection,
    shadowLength,
    sunDirection,
    transmittance
  );

  // Rendering celestial objects without perspective doesn't make sense.
  #ifdef PERSPECTIVE_CAMERA

  #ifdef SUN
  float viewDotSun = dot(rayDirection, sunDirection);
  if (viewDotSun > cosSunAngularRadius) {
    float angle = acos(clamp(viewDotSun, -1.0, 1.0));
    float antialias = smoothstep(
      ATMOSPHERE.sun_angular_radius,
      ATMOSPHERE.sun_angular_radius - fragmentAngle,
      angle
    );
    radiance += transmittance * GetSolarRadiance() * antialias;
  }
  #endif // SUN

  #ifdef MOON
  float intersection = intersectSphere(rayDirection, moonDirection, moonAngularRadius);
  if (intersection > 0.0) {
    vec3 normal = normalize(moonDirection - rayDirection * intersection);
    float diffuse = orenNayarDiffuse(-sunDirection, rayDirection, normal);
    float viewDotMoon = dot(rayDirection, moonDirection);
    float angle = acos(clamp(viewDotMoon, -1.0, 1.0));
    float antialias = smoothstep(moonAngularRadius, moonAngularRadius - fragmentAngle, angle);
    radiance +=
      transmittance *
      getLunarRadiance(moonAngularRadius) *
      lunarRadianceScale *
      diffuse *
      antialias;
  }
  #endif // MOON

  #endif // PERSPECTIVE_CAMERA

  return radiance;
}
`,Iu=Object.defineProperty,ye=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Iu(e,r,a),a},_u=new K,Mu=new K,Pu=new qe,xs={blendFunction:F.NORMAL,octEncodedNormal:!1,reconstructNormal:!1,ellipsoid:je.WGS84,correctAltitude:!0,correctGeometricError:!0,sunLight:!1,skyLight:!1,transmittance:!0,inscatter:!0,albedoScale:1,sky:!1,sun:!0,moon:!0,moonAngularRadius:.0045,lunarRadianceScale:1,ground:!0},ge=class extends Yr{constructor(e=new Su,r,i=Pt.DEFAULT){let{blendFunction:a,normalBuffer:s=null,octEncodedNormal:o,reconstructNormal:u,irradianceTexture:d=null,scatteringTexture:p=null,transmittanceTexture:A=null,singleMieScatteringTexture:S=null,higherOrderScatteringTexture:P=null,ellipsoid:B,correctAltitude:z,correctGeometricError:$,sunDirection:oe,sunLight:ve,skyLight:_e,transmittance:re,inscatter:le,albedoScale:ie,sky:we,sun:Me,moon:He,moonDirection:Ae,moonAngularRadius:tt,lunarRadianceScale:de,ground:Se}={...xs,...r};super("AerialPerspectiveEffect",_t(Be(Du,{core:{depth:fi,packing:ns,math:Vt,transform:as,raySphereIntersection:Yt,cascadedShadowMaps:di,interleavedGradientNoise:mi,vogelDisk:pi},bruneton:{common:jt,definitions:qt,runtime:Jt},sky:Ss})),{blendFunction:a,vertexShader:Ru,attributes:lr.DEPTH,uniforms:new Map(Object.entries({normalBuffer:new _(s),projectionMatrix:new _(new Fe),viewMatrix:new _(new Fe),inverseProjectionMatrix:new _(new Fe),inverseViewMatrix:new _(new Fe),cameraPosition:new _(new K),bottomRadius:new _(i.bottomRadius),ellipsoidRadii:new _(new K),worldToECEFMatrix:new _(new Fe),altitudeCorrection:new _(new K),geometricErrorCorrectionAmount:new _(0),sunDirection:new _(oe?.clone()??new K),cosSunAngularRadius:new _(i.sunAngularRadius),albedoScale:new _(ie),moonDirection:new _(Ae?.clone()??new K),moonAngularRadius:new _(tt),lunarRadianceScale:new _(de),overlayBuffer:new _(null),shadowBuffer:new _(null),shadowMapSize:new _(new wn),shadowIntervals:new _([]),shadowMatrices:new _([]),inverseShadowMatrices:new _([]),shadowFar:new _(0),shadowTopHeight:new _(0),shadowRadius:new _(3),stbnTexture:new _(null),frame:new _(0),shadowLengthBuffer:new _(null),lightingMaskBuffer:new _(null),ATMOSPHERE:i.toUniform(),SUN_SPECTRAL_RADIANCE_TO_LUMINANCE:new _(i.sunRadianceToRelativeLuminance),SKY_SPECTRAL_RADIANCE_TO_LUMINANCE:new _(i.skyRadianceToRelativeLuminance),irradiance_texture:new _(d),scattering_texture:new _(p),transmittance_texture:new _(A),single_mie_scattering_texture:new _(null),higher_order_scattering_texture:new _(null)})),defines:new Map([["TRANSMITTANCE_TEXTURE_WIDTH",Xt.toFixed(0)],["TRANSMITTANCE_TEXTURE_HEIGHT",Qt.toFixed(0)],["SCATTERING_TEXTURE_R_SIZE",Ir.toFixed(0)],["SCATTERING_TEXTURE_MU_SIZE",_r.toFixed(0)],["SCATTERING_TEXTURE_MU_S_SIZE",Mr.toFixed(0)],["SCATTERING_TEXTURE_NU_SIZE",Pr.toFixed(0)],["IRRADIANCE_TEXTURE_WIDTH",Dr.toFixed(0)],["IRRADIANCE_TEXTURE_HEIGHT",Rr.toFixed(0)],["METER_TO_LENGTH_UNIT",Zt.toFixed(7)]])}),this.camera=e,this.atmosphere=i,this.overlay=null,this.shadow=null,this.shadowLength=null,this.lightingMask=null,this.hasNormals=!1,this.combinedScatteringTextures=!1,this.hasHigherOrderScatteringTexture=!1,this.shadowSampleCount=8,this.octEncodedNormal=o,this.reconstructNormal=u,this.singleMieScatteringTexture=S,this.higherOrderScatteringTexture=P,this.ellipsoid=B,this.correctAltitude=z,this.correctGeometricError=$,this.sunLight=ve,this.skyLight=_e,this.transmittance=re,this.inscatter=le,this.sky=we,this.sun=Me,this.moon=He,this.ground=Se}get mainCamera(){return this.camera}set mainCamera(e){this.camera=e}copyCameraSettings(e){let{projectionMatrix:r,matrixWorldInverse:i,projectionMatrixInverse:a,matrixWorld:s}=e,o=this.uniforms;o.get("projectionMatrix").value.copy(r),o.get("viewMatrix").value.copy(i),o.get("inverseProjectionMatrix").value.copy(a),o.get("inverseViewMatrix").value.copy(s);let u=e.getWorldPosition(o.get("cameraPosition").value),d=o.get("worldToECEFMatrix").value,p=_u.copy(u).applyMatrix4(d);try{let S=Pu.setFromECEF(p).height,P=Mu.set(0,this.ellipsoid.maximumRadius,-Math.max(0,S)).applyMatrix4(r);o.get("geometricErrorCorrectionAmount").value=ts(es(P.y,41.5,13.8,0,1))}catch{return}let A=o.get("altitudeCorrection");this.correctAltitude?Kt(p,this.atmosphere.bottomRadius,this.ellipsoid,A.value):A.value.setScalar(0)}updateOverlay(){let e=!1,{uniforms:r,defines:i,overlay:a}=this,s=i.has("HAS_OVERLAY"),o=a!=null;return o!==s&&(o?i.set("HAS_OVERLAY","1"):(i.delete("HAS_OVERLAY"),r.get("overlayBuffer").value=null),e=!0),o&&(r.get("overlayBuffer").value=a.map),e}updateShadow(){let e=!1,{uniforms:r,defines:i,shadow:a}=this,s=i.has("HAS_SHADOW"),o=a!=null;if(o!==s&&(o?i.set("HAS_SHADOW","1"):(i.delete("HAS_SHADOW"),r.get("shadowBuffer").value=null),e=!0),o){let u=i.get("SHADOW_CASCADE_COUNT"),d=`${a.cascadeCount}`;u!==d&&(i.set("SHADOW_CASCADE_COUNT",a.cascadeCount.toFixed(0)),e=!0),r.get("shadowBuffer").value=a.map,r.get("shadowMapSize").value=a.mapSize,r.get("shadowIntervals").value=a.intervals,r.get("shadowMatrices").value=a.matrices,r.get("inverseShadowMatrices").value=a.inverseMatrices,r.get("shadowFar").value=a.far,r.get("shadowTopHeight").value=a.topHeight}return e}updateShadowLength(){let e=!1,{uniforms:r,defines:i,shadowLength:a}=this,s=i.has("HAS_SHADOW_LENGTH"),o=a!=null;return o!==s&&(o?i.set("HAS_SHADOW_LENGTH","1"):(i.delete("HAS_SHADOW_LENGTH"),r.get("shadowLengthBuffer").value=null),e=!0),o&&(r.get("shadowLengthBuffer").value=a.map),e}updateLightingMask(){let e=!1,{uniforms:r,defines:i,lightingMask:a}=this,s=i.has("HAS_LIGHTING_MASK"),o=a!=null;if(o!==s&&(o?i.set("HAS_LIGHTING_MASK","1"):(i.delete("HAS_LIGHTING_MASK"),r.get("lightingMaskBuffer").value=null),e=!0),o){r.get("lightingMaskBuffer").value=a.map;let u=i.get("LIGHTING_MASK_CHANNEL"),d=a.channel;d!==u&&(/^[rgba]$/.test(d)?(i.set("LIGHTING_MASK_CHANNEL",d),e=!0):console.error(`Expression validation failed: ${d}`))}return e}update(e,r,i){this.copyCameraSettings(this.camera);let a=!1;a||=this.updateOverlay(),a||=this.updateShadow(),a||=this.updateShadowLength(),a||=this.updateLightingMask(),a&&this.setChanged(),++this.uniforms.get("frame").value}get normalBuffer(){return this.uniforms.get("normalBuffer").value}set normalBuffer(e){this.uniforms.get("normalBuffer").value=e,this.hasNormals=e!=null}get irradianceTexture(){return this.uniforms.get("irradiance_texture").value}set irradianceTexture(e){this.uniforms.get("irradiance_texture").value=e}get scatteringTexture(){return this.uniforms.get("scattering_texture").value}set scatteringTexture(e){this.uniforms.get("scattering_texture").value=e}get transmittanceTexture(){return this.uniforms.get("transmittance_texture").value}set transmittanceTexture(e){this.uniforms.get("transmittance_texture").value=e}get singleMieScatteringTexture(){return this.uniforms.get("single_mie_scattering_texture").value}set singleMieScatteringTexture(e){this.uniforms.get("single_mie_scattering_texture").value=e,this.combinedScatteringTextures=e==null}get higherOrderScatteringTexture(){return this.uniforms.get("higher_order_scattering_texture").value}set higherOrderScatteringTexture(e){this.uniforms.get("higher_order_scattering_texture").value=e,this.hasHigherOrderScatteringTexture=e!=null}get ellipsoid(){return this._ellipsoid}set ellipsoid(e){this._ellipsoid=e,this.uniforms.get("ellipsoidRadii").value.copy(e.radii)}get worldToECEFMatrix(){return this.uniforms.get("worldToECEFMatrix").value}get sunDirection(){return this.uniforms.get("sunDirection").value}get sunAngularRadius(){return this.uniforms.get("ATMOSPHERE").value.sun_angular_radius}set sunAngularRadius(e){this.uniforms.get("ATMOSPHERE").value.sun_angular_radius=e,this.uniforms.get("cosSunAngularRadius").value=Math.cos(e)}get albedoScale(){return this.uniforms.get("albedoScale").value}set albedoScale(e){this.uniforms.get("albedoScale").value=e}get moonDirection(){return this.uniforms.get("moonDirection").value}get moonAngularRadius(){return this.uniforms.get("moonAngularRadius").value}set moonAngularRadius(e){this.uniforms.get("moonAngularRadius").value=e}get lunarRadianceScale(){return this.uniforms.get("lunarRadianceScale").value}set lunarRadianceScale(e){this.uniforms.get("lunarRadianceScale").value=e}get stbnTexture(){return this.uniforms.get("stbnTexture").value}set stbnTexture(e){this.uniforms.get("stbnTexture").value=e}get shadowRadius(){return this.uniforms.get("shadowRadius").value}set shadowRadius(e){this.uniforms.get("shadowRadius").value=e}};ye([H("OCT_ENCODED_NORMAL")],ge.prototype,"octEncodedNormal");ye([H("RECONSTRUCT_NORMAL")],ge.prototype,"reconstructNormal");ye([H("HAS_NORMALS")],ge.prototype,"hasNormals");ye([H("COMBINED_SCATTERING_TEXTURES")],ge.prototype,"combinedScatteringTextures");ye([H("HAS_HIGHER_ORDER_SCATTERING_TEXTURE")],ge.prototype,"hasHigherOrderScatteringTexture");ye([H("CORRECT_GEOMETRIC_ERROR")],ge.prototype,"correctGeometricError");ye([H("SUN_LIGHT")],ge.prototype,"sunLight");ye([H("SKY_LIGHT")],ge.prototype,"skyLight");ye([H("TRANSMITTANCE")],ge.prototype,"transmittance");ye([H("INSCATTER")],ge.prototype,"inscatter");ye([H("SKY")],ge.prototype,"sky");ye([H("SUN")],ge.prototype,"sun");ye([H("MOON")],ge.prototype,"moon");ye([H("GROUND")],ge.prototype,"ground");ye([ot("SHADOW_SAMPLE_COUNT",{min:1,max:16})],ge.prototype,"shadowSampleCount");var Nu=Object.defineProperty,Es=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Nu(e,r,a),a},bu=new K;function Ou(t,e){let r="",i="";for(let a=1;a<e;++a)r+=`layout(location = ${a}) out float renderTarget${a};
`,i+=`renderTarget${a} = 0.0;
`;return t.replace("#include <mrt_layout>",r).replace("#include <mrt_output>",i)}var Ai={ellipsoid:je.WGS84,correctAltitude:!0,renderTargetCount:1},lt=class extends xu{constructor(e,r=Pt.DEFAULT){let{irradianceTexture:i=null,scatteringTexture:a=null,transmittanceTexture:s=null,singleMieScatteringTexture:o=null,higherOrderScatteringTexture:u=null,ellipsoid:d,correctAltitude:p,sunDirection:A,sunAngularRadius:S,renderTargetCount:P,...B}={...Ai,...e};super({toneMapped:!1,depthWrite:!1,depthTest:!1,...B,uniforms:{cameraPosition:new _(new K),worldToECEFMatrix:new _(new Fe),altitudeCorrection:new _(new K),sunDirection:new _(A?.clone()??new K),cosSunAngularRadius:new _(r.sunAngularRadius),ATMOSPHERE:r.toUniform(),SUN_SPECTRAL_RADIANCE_TO_LUMINANCE:new _(r.sunRadianceToRelativeLuminance),SKY_SPECTRAL_RADIANCE_TO_LUMINANCE:new _(r.skyRadianceToRelativeLuminance),irradiance_texture:new _(i),scattering_texture:new _(a),transmittance_texture:new _(s),single_mie_scattering_texture:new _(null),higher_order_scattering_texture:new _(null),...B.uniforms},defines:{PI:`${Math.PI}`,TRANSMITTANCE_TEXTURE_WIDTH:Xt.toFixed(0),TRANSMITTANCE_TEXTURE_HEIGHT:Qt.toFixed(0),SCATTERING_TEXTURE_R_SIZE:Ir.toFixed(0),SCATTERING_TEXTURE_MU_SIZE:_r.toFixed(0),SCATTERING_TEXTURE_MU_S_SIZE:Mr.toFixed(0),SCATTERING_TEXTURE_NU_SIZE:Pr.toFixed(0),IRRADIANCE_TEXTURE_WIDTH:Dr.toFixed(0),IRRADIANCE_TEXTURE_HEIGHT:Rr.toFixed(0),METER_TO_LENGTH_UNIT:Zt.toFixed(7),...B.defines}}),this.atmosphere=r,this.combinedScatteringTextures=!1,this.hasHigherOrderScatteringTexture=!1,this.singleMieScatteringTexture=o,this.higherOrderScatteringTexture=u,this.ellipsoid=d,this.correctAltitude=p,S!=null&&(this.sunAngularRadius=S),this.renderTargetCount=P}copyCameraSettings(e){let r=this.uniforms,i=e.getWorldPosition(r.cameraPosition.value),a=bu.copy(i).applyMatrix4(r.worldToECEFMatrix.value),s=r.altitudeCorrection.value;this.correctAltitude?Kt(a,this.atmosphere.bottomRadius,this.ellipsoid,s):s.setScalar(0)}onBeforeCompile(e,r){e.fragmentShader=Ou(e.fragmentShader,this.renderTargetCount)}onBeforeRender(e,r,i,a,s,o){this.copyCameraSettings(i)}get irradianceTexture(){return this.uniforms.irradiance_texture.value}set irradianceTexture(e){this.uniforms.irradiance_texture.value=e}get scatteringTexture(){return this.uniforms.scattering_texture.value}set scatteringTexture(e){this.uniforms.scattering_texture.value=e}get transmittanceTexture(){return this.uniforms.transmittance_texture.value}set transmittanceTexture(e){this.uniforms.transmittance_texture.value=e}get singleMieScatteringTexture(){return this.uniforms.single_mie_scattering_texture.value}set singleMieScatteringTexture(e){this.uniforms.single_mie_scattering_texture.value=e,this.combinedScatteringTextures=e==null}get higherOrderScatteringTexture(){return this.uniforms.higher_order_scattering_texture.value}set higherOrderScatteringTexture(e){this.uniforms.higher_order_scattering_texture.value=e,this.hasHigherOrderScatteringTexture=e!=null}get worldToECEFMatrix(){return this.uniforms.worldToECEFMatrix.value}get sunDirection(){return this.uniforms.sunDirection.value}get sunAngularRadius(){return this.uniforms.ATMOSPHERE.value.sun_angular_radius}set sunAngularRadius(e){this.uniforms.ATMOSPHERE.value.sun_angular_radius=e,this.uniforms.cosSunAngularRadius.value=Math.cos(e)}get renderTargetCount(){return this._renderTargetCount}set renderTargetCount(e){e!==this.renderTargetCount&&(this._renderTargetCount=e,this.needsUpdate=!0)}};Es([H("COMBINED_SCATTERING_TEXTURES")],lt.prototype,"combinedScatteringTextures");Es([H("HAS_HIGHER_ORDER_SCATTERING_TEXTURE")],lt.prototype,"hasHigherOrderScatteringTexture");var ws=14959787069098932e-8;var SA=2*Math.PI,xA=3600*(180/Math.PI);var Uu=10800*60,EA=2*Uu,Lu=6378.1366,wA=Lu/ws;var et;(function(t){t.Sun="Sun",t.Moon="Moon",t.Mercury="Mercury",t.Venus="Venus",t.Earth="Earth",t.Mars="Mars",t.Jupiter="Jupiter",t.Saturn="Saturn",t.Uranus="Uranus",t.Neptune="Neptune",t.Pluto="Pluto",t.SSB="SSB",t.EMB="EMB",t.Star1="Star1",t.Star2="Star2",t.Star3="Star3",t.Star4="Star4",t.Star5="Star5",t.Star6="Star6",t.Star7="Star7",t.Star8="Star8"})(et||(et={}));var yA=[et.Star1,et.Star2,et.Star3,et.Star4,et.Star5,et.Star6,et.Star7,et.Star8];var us;(function(t){t[t.From2000=0]="From2000",t[t.Into2000=1]="Into2000"})(us||(us={}));var hs;(function(t){t[t.Pericenter=0]="Pericenter",t[t.Apocenter=1]="Apocenter"})(hs||(hs={}));var ds;(function(t){t.Penumbral="penumbral",t.Partial="partial",t.Annular="annular",t.Total="total"})(ds||(ds={}));var fs;(function(t){t[t.Invalid=0]="Invalid",t[t.Ascending=1]="Ascending",t[t.Descending=-1]="Descending"})(fs||(fs={}));var CA=.001/ws;function ys(t){return Math.sqrt(Math.max(t,0))}function Bu(t){return Math.max(t,0)}function Fu(t,e,r){let{bottomRadius:i}=t;return r<0&&e**2*(r**2-1)+i**2>=0}function Hu(t,e,r){let{topRadius:i}=t,a=e**2*(r**2-1)+i**2;return Bu(-e*r+ys(a))}function ms(t,e){return .5/e+t*(1-1/e)}var Gu=new K,ps=new K,zu=new K,gs=new WeakMap;function ku(t){t.image;let e=ln(t.image.data)?t.image.data:ln(t.userData.imageData)?t.userData.imageData:void 0;if(t.type===Sn&&e instanceof Uint16Array){let r=gs.get(e.buffer);r==null?(e=new De(e.buffer),gs.set(e.buffer,e)):e=r}return e}function gi(t,e,r){let i=e*4;return r.set(t[i],t[i+1],t[i+2])}function Wu(t,e,r){let i=ku(t);if(i==null)return r.setScalar(0);t.image;let{width:a,height:s}=t.image,o=It(e.x,0,1)*(a-1),u=It(e.y,0,1)*(s-1),d=Math.floor(o),p=Math.floor(u),A=o-d,S=u-p,P=A,B=S,z=d%a,$=(z+1)%a,oe=p%s,ve=(oe+1)%s,_e=gi(i,oe*a+z,Gu),re=gi(i,oe*a+$,ps),le=_e.lerp(re,P),ie=gi(i,ve*a+z,ps),we=gi(i,ve*a+$,zu),Me=ie.lerp(we,P);return r.copy(le.lerp(Me,B))}function Vu(t,e,r,i){let{topRadius:a,bottomRadius:s}=t,o=Math.sqrt(a**2-s**2),u=ys(e**2-s**2),d=Hu(t,e,r),p=a-e,A=u+o,S=(d-p)/(A-p),P=u/o;return i.set(ms(S,Xt),ms(P,Qt))}var Yu=new K,Tn=new K,Xu=new wn;function Cs(t,e,r,i=new En,{ellipsoid:a=je.WGS84,correctAltitude:s=!0}={},o=Pt.DEFAULT){let u=Yu.copy(e);if(s){let z=a.projectOnSurface(e,Tn);z!=null&&u.sub(a.getOsculatingSphereCenter(z,o.bottomRadius,Tn))}let d=Tn,p=u.length(),A=u.dot(r),{topRadius:S}=o,P=-A-Math.sqrt(A**2-p**2+S**2);if(P>0&&(p=S,A+=P),p>S)d.set(1,1,1);else{let z=A/p;if(Fu(o,p,z))d.setScalar(0);else{let $=Vu(o,p,z,Xu);Wu(t,$,d)}}let B=d.multiply(o.solarIrradiance).multiply(o.sunRadianceToRelativeLuminance);return i.setFromVector3(B)}function Qu(t){var e=[];if(t.length===0)return"";if(typeof t[0]!="string")throw new TypeError("Url must be a string. Received "+t[0]);if(t[0].match(/^[^/:]+:\/*$/)&&t.length>1){var r=t.shift();t[0]=r+t[0]}t[0].match(/^file:\/\/\//)?t[0]=t[0].replace(/^([^/:]+):\/*/,"$1:///"):t[0]=t[0].replace(/^([^/:]+):\/*/,"$1://");for(var i=0;i<t.length;i++){var a=t[i];if(typeof a!="string")throw new TypeError("Url must be a string. Received "+a);a!==""&&(i>0&&(a=a.replace(/^[\/]+/,"")),i<t.length-1?a=a.replace(/[\/]+$/,""):a=a.replace(/[\/]+$/,"/"),e.push(a))}var s=e.join("/");s=s.replace(/\/(\?|&|#[^!])/g,"$1");var o=s.split("?");return s=o.shift()+(o.length>0?"?":"")+o.join("&"),s}function Zu(){var t;return typeof arguments[0]=="object"?t=arguments[0]:t=[].slice.call(arguments),Qu(t)}var vs={width:Xt,height:Qt},$t={width:pn,height:gn,depth:vn},As={width:Dr,height:Rr},vi=class extends Eu{constructor({format:e="exr",type:r=Sn,combinedScattering:i=!0,higherOrderScattering:a=!0}={},s){super(s),this.format=e,this.type=r,this.combinedScattering=i,this.higherOrderScattering=a}setType(e){return this.type=Ma(e)?os:Sn,this}load(e,r,i,a){let s={},o=({key:u,loader:d,path:p})=>(d.setRequestHeader(this.requestHeader),d.setPath(this.path),d.setWithCredentials(this.withCredentials),d.load(Zu(e,p),A=>{A.type=this.type,this.type===os&&(A.image,A.image.data!=null&&(A.image.data=new Float32Array(new De(A.image.data?.buffer)))),A.minFilter=cs,A.magFilter=cs,s[`${u}Texture`]=A,s.irradianceTexture!=null&&s.scatteringTexture!=null&&s.transmittanceTexture!=null&&(this.combinedScattering||s.singleMieScatteringTexture!=null)&&(!this.higherOrderScattering||s.higherOrderScatteringTexture!=null)&&r?.(s)},i,a));return this.format==="exr"?{transmittanceTexture:o({key:"transmittance",loader:new Er(vs,this.manager),path:"transmittance.exr"}),scatteringTexture:o({key:"scattering",loader:new Gt($t,this.manager),path:"scattering.exr"}),irradianceTexture:o({key:"irradiance",loader:new Er(As,this.manager),path:"irradiance.exr"}),singleMieScatteringTexture:this.combinedScattering?void 0:o({key:"singleMieScattering",loader:new Gt($t,this.manager),path:"single_mie_scattering.exr"}),higherOrderScatteringTexture:this.higherOrderScattering?o({key:"higherOrderScattering",loader:new Gt($t,this.manager),path:"higher_order_scattering.exr"}):void 0}:{transmittanceTexture:o({key:"transmittance",loader:new At(ls,Wt,vs,this.manager),path:"transmittance.bin"}),scatteringTexture:o({key:"scattering",loader:new At(An,Wt,$t,this.manager),path:"scattering.bin"}),irradianceTexture:o({key:"irradiance",loader:new At(ls,Wt,As,this.manager),path:"irradiance.bin"}),singleMieScatteringTexture:this.combinedScattering?void 0:o({key:"singleMieScattering",loader:new At(An,Wt,$t,this.manager),path:"single_mie_scattering.bin"}),higherOrderScatteringTexture:this.higherOrderScattering?o({key:"higherOrderScattering",loader:new At(An,Wt,$t,this.manager),path:"higher_order_scattering.bin"}):void 0}}};var DA=1/Math.sqrt(Math.PI),RA=Math.sqrt(3)/(2*Math.sqrt(Math.PI));var Ku={ellipsoid:je.WGS84,correctAltitude:!0};var ju=`precision highp float;
precision highp sampler3D;

#define RECIPROCAL_PI 0.3183098861837907

#include "core/raySphereIntersection"

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform vec3 sunDirection;
uniform float cosSunAngularRadius;
uniform vec3 moonDirection;
uniform float moonAngularRadius;
uniform float lunarRadianceScale;
uniform vec3 groundAlbedo;

#include "sky"

#ifdef HAS_SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
#endif // HAS_SHADOW_LENGTH

in vec2 vUv;
in vec3 vCameraPosition;
in vec3 vRayDirection;

layout(location = 0) out vec4 outputColor;

#include <mrt_layout>

void main() {
  float shadowLength = 0.0;
  #ifdef HAS_SHADOW_LENGTH
  shadowLength = texture(shadowLengthBuffer, vUv).r;
  #endif // HAS_SHADOW_LENGTH

  vec3 cameraPosition = vCameraPosition;
  vec3 rayDirection = normalize(vRayDirection);
  vec3 dRDdx = dFdx(rayDirection);
  vec3 dRDdy = dFdy(rayDirection);
  float fragmentAngle = length(dRDdx + dRDdy) / length(rayDirection);

  #ifdef GROUND_ALBEDO

  float r = length(cameraPosition);
  float mu = dot(cameraPosition, rayDirection) / r;
  bool intersectsGround = RayIntersectsGround(ATMOSPHERE, r, mu);
  if (intersectsGround) {
    float distanceToGround = raySphereFirstIntersection(
      cameraPosition,
      rayDirection,
      ATMOSPHERE.bottom_radius
    );
    vec3 groundPosition = rayDirection * distanceToGround + cameraPosition;
    vec3 surfaceNormal = normalize(groundPosition);
    vec3 skyIrradiance;
    vec3 sunIrradiance = GetSunAndSkyIrradiance(
      cameraPosition,
      surfaceNormal,
      sunDirection,
      skyIrradiance
    );
    vec3 transmittance;
    vec3 inscatter = GetSkyRadianceToPoint(
      cameraPosition,
      ATMOSPHERE.bottom_radius * surfaceNormal,
      shadowLength,
      sunDirection,
      transmittance
    );
    vec3 radiance = groundAlbedo * RECIPROCAL_PI * (sunIrradiance + skyIrradiance);
    outputColor.rgb = radiance * transmittance + inscatter;
  } else {
    outputColor.rgb = getSkyRadiance(
      cameraPosition,
      rayDirection,
      shadowLength,
      sunDirection,
      moonDirection,
      moonAngularRadius,
      lunarRadianceScale,
      fragmentAngle
    );
  }

  #else // GROUND_ALBEDO

  outputColor.rgb = getSkyRadiance(
    cameraPosition,
    rayDirection,
    shadowLength,
    sunDirection,
    moonDirection,
    moonAngularRadius,
    lunarRadianceScale,
    fragmentAngle
  );

  #endif // GROUND_ALBEDO

  outputColor.a = 1.0;

  #include <mrt_output>
}
`,qu=`precision highp float;
precision highp sampler3D;

uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;

layout(location = 0) in vec3 position;

out vec2 vUv;
out vec3 vCameraPosition;
out vec3 vRayDirection;

void getCameraRay(out vec3 origin, out vec3 direction) {
  bool isPerspective = inverseProjectionMatrix[2][3] != 0.0; // 4th entry in the 3rd column

  if (isPerspective) {
    // Calculate the camera ray for a perspective camera.
    vec4 viewPosition = inverseProjectionMatrix * vec4(position, 1.0);
    vec4 worldDirection = inverseViewMatrix * vec4(viewPosition.xyz, 0.0);
    origin = cameraPosition;
    direction = worldDirection.xyz;
  } else {
    // Unprojected points to calculate direction.
    vec4 nearPoint = inverseProjectionMatrix * vec4(position.xy, -1.0, 1.0);
    vec4 farPoint = inverseProjectionMatrix * vec4(position.xy, -0.9, 1.0);
    nearPoint /= nearPoint.w;
    farPoint /= farPoint.w;

    // Calculate world values
    vec4 worldDirection = inverseViewMatrix * vec4(farPoint.xyz - nearPoint.xyz, 0.0);
    vec4 worldOrigin = inverseViewMatrix * nearPoint;

    // Outputs
    direction = worldDirection.xyz;
    origin = worldOrigin.xyz;
  }
}

void main() {
  vUv = position.xy * 0.5 + 0.5;

  vec3 direction, origin;
  getCameraRay(origin, direction);

  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(origin, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(direction, 0.0)).xyz;

  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Ju=Object.defineProperty,yn=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Ju(e,r,a),a},Ds={...Ai,sun:!0,moon:!0,moonAngularRadius:.0045,lunarRadianceScale:1,ground:!0,groundAlbedo:new En(0)},Mt=class extends lt{constructor(e){let{sun:r,moon:i,moonDirection:a,moonAngularRadius:s,lunarRadianceScale:o,ground:u,groundAlbedo:d,...p}={...Ds,...e};super({name:"SkyMaterial",glslVersion:Ts,vertexShader:qu,fragmentShader:Be(ju,{core:{raySphereIntersection:Yt},bruneton:{common:jt,definitions:qt,runtime:Jt},sky:Ss}),...p,uniforms:{inverseProjectionMatrix:new _(new Fe),inverseViewMatrix:new _(new Fe),moonDirection:new _(a?.clone()??new K),moonAngularRadius:new _(s),lunarRadianceScale:new _(o),groundAlbedo:new _(d.clone()),shadowLengthBuffer:new _(null),...p.uniforms},defines:{PERSPECTIVE_CAMERA:"1"},depthWrite:!1,depthTest:!0}),this.shadowLength=null,this.sun=r,this.moon=i,this.ground=u}onBeforeRender(e,r,i,a,s,o){super.onBeforeRender(e,r,i,a,s,o);let{uniforms:u,defines:d}=this;u.inverseProjectionMatrix.value.copy(i.projectionMatrixInverse),u.inverseViewMatrix.value.copy(i.matrixWorld);let p=d.PERSPECTIVE_CAMERA!=null,A=i.isPerspectiveCamera===!0;A!==p&&(A?d.PERSPECTIVE_CAMERA="1":delete d.PERSPECTIVE_CAMERA,this.needsUpdate=!0);let S=this.groundAlbedo,P=d.GROUND_ALBEDO!=null,B=S.r!==0||S.g!==0||S.b!==0;B!==P&&(B?this.defines.GROUND_ALBEDO="1":delete this.defines.GROUND_ALBEDO,this.needsUpdate=!0);let z=this.shadowLength,$=d.HAS_SHADOW_LENGTH!=null,oe=z!=null;oe!==$&&(oe?d.HAS_SHADOW_LENGTH="1":(delete d.HAS_SHADOW_LENGTH,u.shadowLengthBuffer.value=null),this.needsUpdate=!0),oe&&(u.shadowLengthBuffer.value=z.map)}get moonDirection(){return this.uniforms.moonDirection.value}get moonAngularRadius(){return this.uniforms.moonAngularRadius.value}set moonAngularRadius(e){this.uniforms.moonAngularRadius.value=e}get lunarRadianceScale(){return this.uniforms.lunarRadianceScale.value}set lunarRadianceScale(e){this.uniforms.lunarRadianceScale.value=e}get groundAlbedo(){return this.uniforms.groundAlbedo.value}};yn([H("SUN")],Mt.prototype,"sun");yn([H("MOON")],Mt.prototype,"moon");yn([H("GROUND")],Mt.prototype,"ground");var $u=`precision highp float;
precision highp sampler3D;

#include "bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "bruneton/common"
#include "bruneton/runtime"

uniform vec3 sunDirection;

in vec3 vCameraPosition;
in vec3 vRayDirection;

layout(location = 0) out vec4 outputColor;

#include <mrt_layout>

in vec3 vColor;

void main() {
  #if !defined(PERSPECTIVE_CAMERA)
  outputColor = vec4(0.0);
  discard; // Rendering celestial objects without perspective doesn't make sense.
  #endif // !defined(PERSPECTIVE_CAMERA)

  #ifdef BACKGROUND
  vec3 rayDirection = normalize(vRayDirection);
  float r = length(vCameraPosition);
  float mu = dot(vCameraPosition, rayDirection) / r;

  if (RayIntersectsGround(ATMOSPHERE, r, mu)) {
    discard;
  }

  vec3 transmittance;
  vec3 radiance = GetSkyRadiance(
    vCameraPosition,
    normalize(vRayDirection),
    0.0, // Shadow length
    sunDirection,
    transmittance
  );
  radiance += transmittance * vColor;
  outputColor = vec4(radiance, 1.0);
  #else // BACKGROUND
  outputColor = vec4(vColor, 1.0);
  #endif // BACKGROUND

  #include <mrt_output>
}
`,eh=`precision highp float;
precision highp sampler3D;

#define saturate(x) clamp(x, 0.0, 1.0)

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat4 matrixWorld;
uniform vec3 cameraPosition;
uniform float cameraFar;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;
uniform float pointSize;
uniform vec2 magnitudeRange;
uniform float intensity;

layout(location = 0) in vec3 position;
layout(location = 1) in float magnitude;
layout(location = 2) in vec3 color;

out vec3 vCameraPosition;
out vec3 vRayDirection;
out vec3 vEllipsoidCenter;
out vec3 vColor;

void main() {
  // Magnitude is stored between 0 to 1 within the given range.
  float m = mix(magnitudeRange.x, magnitudeRange.y, magnitude);
  vec3 v = pow(vec3(10.0), -vec3(magnitudeRange, m) / 2.5);
  vColor = vec3(intensity * color);
  vColor *= saturate((v.z - v.y) / (v.x - v.y));

  #ifdef BACKGROUND
  vec3 worldDirection = normalize(matrixWorld * vec4(position, 1.0)).xyz;
  vec3 cameraPositionECEF = (worldToECEFMatrix * vec4(cameraPosition, 1.0)).xyz;
  vCameraPosition = (cameraPositionECEF + altitudeCorrection) * METER_TO_LENGTH_UNIT;
  vRayDirection = (worldToECEFMatrix * vec4(worldDirection, 0.0)).xyz;
  gl_Position =
    projectionMatrix * viewMatrix * vec4(cameraPosition + worldDirection * cameraFar, 1.0);
  #else // BACKGROUND
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif // BACKGROUND

  gl_PointSize = pointSize;
}
`,th=Object.defineProperty,Rs=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&th(e,r,a),a},Is={...Ai,pointSize:1,intensity:1,background:!0,ground:!0},Nr=class extends lt{constructor(e){let{pointSize:r,intensity:i,background:a,ground:s,...o}={...Is,...e};super({name:"StarsMaterial",glslVersion:Ts,vertexShader:eh,fragmentShader:Be($u,{bruneton:{common:jt,definitions:qt,runtime:Jt}}),...o,uniforms:{projectionMatrix:new _(new Fe),modelViewMatrix:new _(new Fe),viewMatrix:new _(new Fe),matrixWorld:new _(new Fe),cameraFar:new _(0),pointSize:new _(0),magnitudeRange:new _(new wn(-2,8)),intensity:new _(i),...o.uniforms},defines:{PERSPECTIVE_CAMERA:"1"},depthWrite:!0,depthTest:!0}),this.pointSize=r,this.background=a,this.ground=s}onBeforeRender(e,r,i,a,s,o){super.onBeforeRender(e,r,i,a,s,o);let u=this.uniforms;u.projectionMatrix.value.copy(i.projectionMatrix),u.modelViewMatrix.value.copy(i.modelViewMatrix),u.viewMatrix.value.copy(i.matrixWorldInverse),u.matrixWorld.value.copy(s.matrixWorld),u.cameraFar.value=i.far,u.pointSize.value=this.pointSize*e.getPixelRatio();let d=i.isPerspectiveCamera===!0;this.defines.PERSPECTIVE_CAMERA!=null!==d&&(d?this.defines.PERSPECTIVE_CAMERA="1":delete this.defines.PERSPECTIVE_CAMERA,this.needsUpdate=!0)}get magnitudeRange(){return this.uniforms.magnitudeRange.value}get intensity(){return this.uniforms.intensity.value}set intensity(e){this.uniforms.intensity.value=e}};Rs([H("BACKGROUND")],Nr.prototype,"background");Rs([H("GROUND")],Nr.prototype,"ground");var rh={ellipsoid:je.WGS84,correctAltitude:!0,distance:1};var Cn=Jt,Dn=jt,Rn=qt;var Ur=class t{constructor(e=0,r=0,i=0,a=0){this.expTerm=e,this.exponent=r,this.linearTerm=i,this.constantTerm=a}set(e=0,r=0,i=0,a=0){return this.expTerm=e,this.exponent=r,this.linearTerm=i,this.constantTerm=a,this}clone(){return new t(this.expTerm,this.exponent,this.linearTerm,this.constantTerm)}copy(e){return this.expTerm=e.expTerm,this.exponent=e.exponent,this.linearTerm=e.linearTerm,this.constantTerm=e.constantTerm,this}},lh=["channel","altitude","height","densityScale","shapeAmount","shapeDetailAmount","weatherExponent","shapeAlteringBias","coverageFilterWidth","shadow","densityProfile"];function uh(t,e){if(e!=null)for(let r of lh){let i=e[r];i!=null&&(t[r]instanceof Ur?t[r].copy(i):t[r]=i)}}var Pn=class Hs{constructor(e){this.channel="r",this.altitude=0,this.height=0,this.densityScale=.2,this.shapeAmount=1,this.shapeDetailAmount=1,this.weatherExponent=1,this.shapeAlteringBias=.35,this.coverageFilterWidth=.6,this.densityProfile=new Ur(0,0,.75,.25),this.shadow=!1,this.set(e)}set(e){return uh(this,e),this}clone(){return new Hs(this)}copy(e){return this.channel=e.channel,this.altitude=e.altitude,this.height=e.height,this.densityScale=e.densityScale,this.shapeAmount=e.shapeAmount,this.shapeDetailAmount=e.shapeDetailAmount,this.weatherExponent=e.weatherExponent,this.shapeAlteringBias=e.shapeAlteringBias,this.coverageFilterWidth=e.coverageFilterWidth,this.densityProfile.copy(e.densityProfile),this.shadow=e.shadow,this}};Pn.DEFAULT=new Pn;var ht=Pn,er=Array.from({length:8},()=>({value:0,flag:0})),br=Array.from({length:3},()=>({min:0,max:0}));function hh(t,e){return t.value!==e.value?t.value-e.value:t.flag-e.flag}var Nn=class Gs extends Array{constructor(e){super(new ht(e?.[0]),new ht(e?.[1]),new ht(e?.[2]),new ht(e?.[3]))}set(e){return this[0].set(e?.[0]),this[1].set(e?.[1]),this[2].set(e?.[2]),this[3].set(e?.[3]),this}reset(){return this[0].copy(ht.DEFAULT),this[1].copy(ht.DEFAULT),this[2].copy(ht.DEFAULT),this[3].copy(ht.DEFAULT),this}clone(){return new Gs(this)}copy(e){return this[0].copy(e[0]),this[1].copy(e[1]),this[2].copy(e[2]),this[3].copy(e[3]),this}get localWeatherChannels(){return this[0].channel+this[1].channel+this[2].channel+this[3].channel}packValues(e,r){return r.set(this[0][e],this[1][e],this[2][e],this[3][e])}packSums(e,r,i){return i.set(this[0][e]+this[0][r],this[1][e]+this[1][r],this[2][e]+this[2][r],this[3][e]+this[3][r])}packDensityProfiles(e,r){return r.set(this[0].densityProfile[e],this[1].densityProfile[e],this[2].densityProfile[e],this[3].densityProfile[e])}packIntervalHeights(e,r){for(let o=0;o<4;++o){let u=this[o],d=er[o];d.value=u.altitude,d.flag=0,d=er[o+4],d.value=u.altitude+u.height,d.flag=1}er.sort(hh);let i=0,a=0;for(let o=0;o<er.length;++o){let{value:u,flag:d}=er[o];if(a===0&&o>0){let p=br[i++];p.min=er[o-1].value,p.max=u}a+=d===0?1:-1}for(;i<3;++i){let o=br[i];o.min=0,o.max=0}let s=br[0];e.x=s.min,r.x=s.max,s=br[1],e.y=s.min,r.y=s.max,s=br[2],e.z=s.min,r.z=s.max}};Nn.DEFAULT=new Nn([{channel:"r",altitude:750,height:650,densityScale:.2,shapeAmount:1,shapeDetailAmount:1,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.6,shadow:!0},{channel:"g",altitude:1e3,height:1200,densityScale:.2,shapeAmount:1,shapeDetailAmount:1,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.6,shadow:!0},{channel:"b",altitude:7500,height:500,densityScale:.003,shapeAmount:.4,shapeDetailAmount:0,weatherExponent:1,shapeAlteringBias:.35,coverageFilterWidth:.5},{channel:"a"}]);var zs=Nn,dh=!0,Ns="Invariant failed";function Tt(t,e){if(!t){if(dh)throw new Error(Ns);var r=Ns;throw new Error(r)}}var Si=class t{constructor(e,r){this.near=[new ae,new ae,new ae,new ae],this.far=[new ae,new ae,new ae,new ae],e!=null&&r!=null&&this.setFromCamera(e,r)}clone(){return new t().copy(this)}copy(e){for(let r=0;r<4;++r)this.near[r].copy(e.near[r]),this.far[r].copy(e.far[r]);return this}setFromCamera(e,r){let i=e.isOrthographicCamera===!0,a=e.projectionMatrixInverse;this.near[0].set(1,1,-1),this.near[1].set(1,-1,-1),this.near[2].set(-1,-1,-1),this.near[3].set(-1,1,-1);for(let s=0;s<4;++s)this.near[s].applyMatrix4(a);this.far[0].set(1,1,1),this.far[1].set(1,-1,1),this.far[2].set(-1,-1,1),this.far[3].set(-1,1,1);for(let s=0;s<4;++s){let o=this.far[s];o.applyMatrix4(a);let u=Math.abs(o.z);i?o.z*=Math.min(r/u,1):o.multiplyScalar(Math.min(r/u,1))}return this}split(e,r=[]){for(let i=0;i<e.length;++i){let a=r[i]??=new t;if(i===0)for(let s=0;s<4;++s)a.near[s].copy(this.near[s]);else for(let s=0;s<4;++s)a.near[s].lerpVectors(this.near[s],this.far[s],e[i-1]);if(i===e.length-1)for(let s=0;s<4;++s)a.far[s].copy(this.far[s]);else for(let s=0;s<4;++s)a.far[s].lerpVectors(this.near[s],this.far[s],e[i])}return r.length=e.length,r}applyMatrix4(e){for(let r=0;r<4;++r)this.near[r].applyMatrix4(e),this.far[r].applyMatrix4(e);return this}},fh={uniform:(t,e,r,i,a=[])=>{for(let s=0;s<t;++s)a[s]=(e+(r-e)*(s+1)/t)/r;return a.length=t,a},logarithmic:(t,e,r,i,a=[])=>{for(let s=0;s<t;++s)a[s]=e*(r/e)**((s+1)/t)/r;return a.length=t,a},practical:(t,e,r,i=.5,a=[])=>{for(let s=0;s<t;++s){let o=(e+(r-e)*(s+1)/t)/r,u=e*(r/e)**((s+1)/t)/r;a[s]=un(o,u,i)}return a.length=t,a}};function mh(t,e,r,i,a,s=[]){return fh[t](e,r,i,a,s)}var bs=new ae,Os=new ae,ph=new ce,Us=new ce,gh=new Si,vh=new ih,Ah={maxFar:null,farScale:1,splitMode:"practical",splitLambda:.5,margin:0,fade:!0},bn=class{constructor(e){this.cascades=[],this.mapSize=new se,this.cameraFrustum=new Si,this.frusta=[],this.splits=[],this._far=0;let{cascadeCount:r,mapSize:i,maxFar:a,farScale:s,splitMode:o,splitLambda:u,margin:d,fade:p}={...Ah,...e};this.cascadeCount=r,this.mapSize.copy(i),this.maxFar=a,this.farScale=s,this.splitMode=o,this.splitLambda=u,this.margin=d,this.fade=p}get cascadeCount(){return this.cascades.length}set cascadeCount(e){if(e!==this.cascadeCount){for(let r=0;r<e;++r)this.cascades[r]??={interval:new se,matrix:new ce,inverseMatrix:new ce,projectionMatrix:new ce,inverseProjectionMatrix:new ce,viewMatrix:new ce,inverseViewMatrix:new ce};this.cascades.length=e}}get far(){return this._far}updateIntervals(e){let r=this.cascadeCount,i=this.splits,a=this.far;mh(this.splitMode,r,e.near,a,this.splitLambda,i),this.cameraFrustum.setFromCamera(e,a),this.cameraFrustum.split(i,this.frusta);let s=this.cascades;for(let o=0;o<r;++o)s[o].interval.set(i[o-1]??0,i[o]??0)}getFrustumRadius(e,r){let i=r.near,a=r.far,s=Math.max(a[0].distanceTo(a[2]),a[0].distanceTo(i[2]));if(this.fade){let o=e.near,u=this.far,d=a[0].z/(u-o);s+=.25*d**2*(u-o)}return s*.5}updateMatrices(e,r,i=1){let a=ph.lookAt(bs.setScalar(0),Os.copy(r).multiplyScalar(-1),_s.DEFAULT_UP),s=Us.multiplyMatrices(Us.copy(a).invert(),e.matrixWorld),o=this.frusta,u=this.cascades;Tt(o.length===u.length);let d=this.margin,p=this.mapSize;for(let A=0;A<o.length;++A){let S=o[A],P=u[A],B=this.getFrustumRadius(e,o[A]),z=-B,$=B,oe=B,ve=-B;P.projectionMatrix.makeOrthographic(z,$,oe,ve,-this.margin,B*2+this.margin);let{near:_e,far:re}=gh.copy(S).applyMatrix4(s),le=vh.makeEmpty();for(let Ae=0;Ae<4;Ae++)le.expandByPoint(_e[Ae]),le.expandByPoint(re[Ae]);let ie=le.getCenter(bs);ie.z=le.max.z+d;let we=($-z)/p.width,Me=(oe-ve)/p.height;ie.x=Math.round(ie.x/we)*we,ie.y=Math.round(ie.y/Me)*Me,ie.applyMatrix4(a);let He=Os.copy(r).multiplyScalar(i).add(ie);P.inverseViewMatrix.lookAt(ie,He,_s.DEFAULT_UP).setPosition(He)}}update(e,r,i){this._far=this.maxFar!=null?Math.min(this.maxFar,e.far*this.farScale):e.far*this.farScale,this.updateIntervals(e),this.updateMatrices(e,r,i);let a=this.cascades,s=this.cascadeCount;for(let o=0;o<s;++o){let{matrix:u,inverseMatrix:d,projectionMatrix:p,inverseProjectionMatrix:A,viewMatrix:S,inverseViewMatrix:P}=a[o];A.copy(p).invert(),S.copy(P).invert(),u.copy(p).multiply(S),d.copy(P).multiply(A)}}},Ls=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],ks=Ls.reduce((t,e,r)=>{let i=new se;for(let a=0;a<16;++a)if(Ls[a]===r){i.set((a%4+.5)/4,(Math.floor(a/4)+.5)/4);break}return[...t,i]},[]),Th={resolutionScale:1,lightShafts:!0,shapeDetail:!0,turbulence:!0,haze:!0,clouds:{multiScatteringOctaves:8,accurateSunSkyLight:!0,accuratePhaseFunction:!1,maxIterationCount:500,minStepSize:50,maxStepSize:1e3,maxRayDistance:2e5,perspectiveStepScale:1.01,minDensity:1e-5,minExtinction:1e-5,minTransmittance:.01,maxIterationCountToGround:3,maxIterationCountToSun:2,minSecondaryStepSize:100,secondaryStepScale:2,maxShadowLengthIterationCount:500,minShadowLengthStepSize:50,maxShadowLengthRayDistance:2e5},shadow:{cascadeCount:3,mapSize:new se(512,512),maxIterationCount:50,minStepSize:100,maxStepSize:1e3,minDensity:1e-5,minExtinction:1e-5,minTransmittance:1e-4}},O=Th,Sh={low:{...O,lightShafts:!1,shapeDetail:!1,turbulence:!1,clouds:{...O.clouds,accurateSunSkyLight:!1,maxIterationCount:200,minStepSize:100,maxRayDistance:1e5,minDensity:1e-4,minExtinction:1e-4,minTransmittance:.1,maxIterationCountToGround:0,maxIterationCountToSun:1},shadow:{...O.shadow,maxIterationCount:25,minDensity:1e-4,minExtinction:1e-4,minTransmittance:.01,cascadeCount:2,mapSize:new se(256,256)}},medium:{...O,lightShafts:!1,turbulence:!1,clouds:{...O.clouds,minDensity:1e-4,minExtinction:1e-4,accurateSunSkyLight:!1,maxIterationCountToSun:2,maxIterationCountToGround:1},shadow:{...O.shadow,minDensity:1e-4,minExtinction:1e-4,mapSize:new se(256,256)}},high:O,ultra:{...O,clouds:{...O.clouds,minStepSize:10},shadow:{...O.shadow,mapSize:new se(1024,1024)}}},xh=`precision highp float;
precision highp sampler3D;
precision highp sampler2DArray;

#include <common>
#include <packing>

#include "core/depth"
#include "core/math"
#include "core/turbo"
#include "core/generators"
#include "core/raySphereIntersection"
#include "core/cascadedShadowMaps"
#include "core/interleavedGradientNoise"
#include "core/vogelDisk"

#include "atmosphere/bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "atmosphere/bruneton/common"
#include "atmosphere/bruneton/runtime"

#include "types"
#include "parameters"
#include "clouds"

#if !defined(RECIPROCAL_PI4)
#define RECIPROCAL_PI4 0.07957747154594767
#endif // !defined(RECIPROCAL_PI4)

uniform sampler2D depthBuffer;
uniform mat4 viewMatrix;
uniform mat4 reprojectionMatrix;
uniform mat4 viewReprojectionMatrix;
uniform float cameraNear;
uniform float cameraFar;
uniform float cameraHeight;
uniform vec2 temporalJitter;
uniform vec2 targetUvScale;
uniform float mipLevelScale;

// Scattering
const vec2 scatterAnisotropy = vec2(SCATTER_ANISOTROPY_1, SCATTER_ANISOTROPY_2);
const float scatterAnisotropyMix = SCATTER_ANISOTROPY_MIX;
uniform float skyLightScale;
uniform float groundBounceScale;
uniform float powderScale;
uniform float powderExponent;

// Primary raymarch
uniform int maxIterationCount;
uniform float minStepSize;
uniform float maxStepSize;
uniform float maxRayDistance;
uniform float perspectiveStepScale;

// Secondary raymarch
uniform int maxIterationCountToSun;
uniform int maxIterationCountToGround;
uniform float minSecondaryStepSize;
uniform float secondaryStepScale;

// Beer shadow map
uniform sampler2DArray shadowBuffer;
uniform vec2 shadowTexelSize;
uniform vec2 shadowIntervals[SHADOW_CASCADE_COUNT];
uniform mat4 shadowMatrices[SHADOW_CASCADE_COUNT];
uniform float shadowFar;
uniform float maxShadowFilterRadius;

// Shadow length
#ifdef SHADOW_LENGTH
uniform int maxShadowLengthIterationCount;
uniform float minShadowLengthStepSize;
uniform float maxShadowLengthRayDistance;
#endif // SHADOW_LENGTH

in vec2 vUv;
in vec3 vCameraPosition;
in vec3 vCameraDirection; // Direction to the center of screen
in vec3 vRayDirection; // Direction to the texel
in vec3 vViewPosition;
in GroundIrradiance vGroundIrradiance;
in CloudsIrradiance vCloudsIrradiance;

layout(location = 0) out vec4 outputColor;
layout(location = 1) out vec3 outputDepthVelocity;
#ifdef SHADOW_LENGTH
layout(location = 2) out float outputShadowLength;
#endif // SHADOW_LENGTH

float getViewZ(const float depth) {
  #ifdef PERSPECTIVE_CAMERA
  return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
  #else // PERSPECTIVE_CAMERA
  return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
  #endif // PERSPECTIVE_CAMERA
}

vec3 ecefToWorld(const vec3 positionECEF) {
  return (ecefToWorldMatrix * vec4(positionECEF - altitudeCorrection, 1.0)).xyz;
}

vec2 getShadowUv(const vec3 worldPosition, const int cascadeIndex) {
  vec4 clip = shadowMatrices[cascadeIndex] * vec4(worldPosition, 1.0);
  clip /= clip.w;
  return clip.xy * 0.5 + 0.5;
}

float getDistanceToShadowTop(const vec3 rayPosition) {
  // Distance to the top of the shadows along the sun direction, which matches
  // the ray origin of BSM.
  return raySphereSecondIntersection(
    rayPosition,
    sunDirection,
    vec3(0.0),
    bottomRadius + shadowTopHeight
  );
}

#ifdef DEBUG_SHOW_CASCADES

const vec3 cascadeColors[4] = vec3[4](
  vec3(1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0),
  vec3(0.0, 0.0, 1.0),
  vec3(1.0, 1.0, 0.0)
);

vec3 getCascadeColor(const vec3 rayPosition) {
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar
  );
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec3(1.0);
  }
  return cascadeColors[cascadeIndex];
}

vec3 getFadedCascadeColor(const vec3 rayPosition, const float jitter) {
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? cascadeColors[cascadeIndex]
    : vec3(1.0);
}

#endif // DEBUG_SHOW_CASCADES

float readShadowOpticalDepth(
  const vec2 uv,
  const float distanceToTop,
  const float distanceOffset,
  const int cascadeIndex
) {
  // r: frontDepth, g: meanExtinction, b: maxOpticalDepth, a: maxOpticalDepthTail
  // Also see the discussion here: https://x.com/shotamatsuda/status/1885322308908442106
  vec4 shadow = texture(shadowBuffer, vec3(uv, float(cascadeIndex)));
  float distanceToFront = max(0.0, distanceToTop - distanceOffset - shadow.r);
  return min(shadow.b + shadow.a, shadow.g * distanceToFront);
}

float sampleShadowOpticalDepthPCF(
  const vec3 worldPosition,
  const float distanceToTop,
  const float distanceOffset,
  const float radius,
  const int cascadeIndex
) {
  vec2 uv = getShadowUv(worldPosition, cascadeIndex);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return 0.0;
  }
  if (radius < 0.1) {
    return readShadowOpticalDepth(uv, distanceToTop, distanceOffset, cascadeIndex);
  }
  float sum = 0.0;
  vec2 offset;
  #pragma unroll_loop_start
  for (int i = 0; i < 16; ++i) {
    #if UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
    offset = vogelDisk(
      UNROLLED_LOOP_INDEX,
      SHADOW_SAMPLE_COUNT,
      interleavedGradientNoise(gl_FragCoord.xy + temporalJitter * resolution) * PI2
    );
    sum += readShadowOpticalDepth(
      uv + offset * radius * shadowTexelSize,
      distanceToTop,
      distanceOffset,
      cascadeIndex
    );
    #endif // UNROLLED_LOOP_INDEX < SHADOW_SAMPLE_COUNT
  }
  #pragma unroll_loop_end
  return sum / float(SHADOW_SAMPLE_COUNT);
}

float sampleShadowOpticalDepth(
  const vec3 rayPosition,
  const float distanceOffset,
  const float radius,
  const float jitter
) {
  float distanceToTop = getDistanceToShadowTop(rayPosition);
  if (distanceToTop <= 0.0) {
    return 0.0;
  }
  vec3 worldPosition = ecefToWorld(rayPosition);
  int cascadeIndex = getFadedCascadeIndex(
    viewMatrix,
    worldPosition,
    shadowIntervals,
    cameraNear,
    shadowFar,
    jitter
  );
  return cascadeIndex >= 0
    ? sampleShadowOpticalDepthPCF(
      worldPosition,
      distanceToTop,
      distanceOffset,
      radius,
      cascadeIndex
    )
    : 0.0;
}

#ifdef DEBUG_SHOW_SHADOW_MAP
vec4 getCascadedShadowMaps(vec2 uv) {
  vec4 coord = vec4(vUv, vUv - 0.5) * 2.0;
  vec4 shadow = vec4(0.0);
  if (uv.y > 0.5) {
    if (uv.x < 0.5) {
      shadow = texture(shadowBuffer, vec3(coord.xw, 0.0));
    } else {
      #if SHADOW_CASCADE_COUNT > 1
      shadow = texture(shadowBuffer, vec3(coord.zw, 1.0));
      #endif // SHADOW_CASCADE_COUNT > 1
    }
  } else {
    if (uv.x < 0.5) {
      #if SHADOW_CASCADE_COUNT > 2
      shadow = texture(shadowBuffer, vec3(coord.xy, 2.0));
      #endif // SHADOW_CASCADE_COUNT > 2
    } else {
      #if SHADOW_CASCADE_COUNT > 3
      shadow = texture(shadowBuffer, vec3(coord.zy, 3.0));
      #endif // SHADOW_CASCADE_COUNT > 3
    }
  }

  #if !defined(DEBUG_SHOW_SHADOW_MAP_TYPE)
  #define DEBUG_SHOW_SHADOW_MAP_TYPE 0
  #endif // !defined(DEBUG_SHOW_SHADOW_MAP_TYPE

  const float frontDepthScale = 1e-5;
  const float meanExtinctionScale = 10.0;
  const float maxOpticalDepthScale = 0.01;
  vec3 color;
  #if DEBUG_SHOW_SHADOW_MAP_TYPE == 1
  color = vec3(shadow.r * frontDepthScale);
  #elif DEBUG_SHOW_SHADOW_MAP_TYPE == 2
  color = vec3(shadow.g * meanExtinctionScale);
  #elif DEBUG_SHOW_SHADOW_MAP_TYPE == 3
  color = vec3((shadow.b + shadow.a) * maxOpticalDepthScale);
  #else // DEBUG_SHOW_SHADOW_MAP_TYPE
  color =
    (shadow.rgb + vec3(0.0, 0.0, shadow.a)) *
    vec3(frontDepthScale, meanExtinctionScale, maxOpticalDepthScale);
  #endif // DEBUG_SHOW_SHADOW_MAP_TYPE
  return vec4(color, 1.0);
}
#endif // DEBUG_SHOW_SHADOW_MAP

vec2 henyeyGreenstein(const vec2 g, const float cosTheta) {
  vec2 g2 = g * g;
  // prettier-ignore
  return RECIPROCAL_PI4 *
    ((1.0 - g2) / max(vec2(1e-7), pow(1.0 + g2 - 2.0 * g * cosTheta, vec2(1.5))));
}

#ifdef ACCURATE_PHASE_FUNCTION

float draine(float u, float g, float a) {
  float g2 = g * g;
  // prettier-ignore
  return (1.0 - g2) *
    (1.0 + a * u * u) /
    (4.0 * (1.0 + a * (1.0 + 2.0 * g2) / 3.0) * PI * pow(1.0 + g2 - 2.0 * g * u, 1.5));
}

// Numerically-fitted large particles (d=10) phase function It won't be
// plausible without a more precise multiple scattering.
// Reference: https://research.nvidia.com/labs/rtr/approximate-mie/
float phaseFunction(const float cosTheta, const float attenuation) {
  const float gHG = 0.988176691700256; // exp(-0.0990567/(d-1.67154))
  const float gD = 0.5556712547839497; // exp(-2.20679/(d+3.91029) - 0.428934)
  const float alpha = 21.995520856274638; // exp(3.62489 - 8.29288/(d+5.52825))
  const float weight = 0.4819554318404214; // exp(-0.599085/(d-0.641583)-0.665888)
  return mix(
    henyeyGreenstein(vec2(gHG) * attenuation, cosTheta).x,
    draine(cosTheta, gD * attenuation, alpha),
    weight
  );
}

#else // ACCURATE_PHASE_FUNCTION

float phaseFunction(const float cosTheta, const float attenuation) {
  const vec2 g = scatterAnisotropy;
  const vec2 weights = vec2(1.0 - scatterAnisotropyMix, scatterAnisotropyMix);
  // A similar approximation is described in the Frostbite's paper, where phase
  // angle is attenuated instead of anisotropy.
  return dot(henyeyGreenstein(g * attenuation, cosTheta), weights);
}

#endif // ACCURATE_PHASE_FUNCTION

float phaseFunction(const float cosTheta) {
  return phaseFunction(cosTheta, 1.0);
}

float marchOpticalDepth(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const int maxIterationCount,
  const float mipLevel,
  const float jitter,
  out float rayDistance
) {
  int iterationCount = int(
    max(0.0, remap(mipLevel, 0.0, 1.0, float(maxIterationCount + 1), 1.0) - jitter)
  );
  if (iterationCount == 0) {
    // Fudge factor to approximate the mean optical depth.
    // TODO: Remove it.
    return 0.5;
  }
  float stepSize = minSecondaryStepSize / float(iterationCount);
  float nextDistance = stepSize * jitter;
  float opticalDepth = 0.0;
  for (int i = 0; i < iterationCount; ++i) {
    rayDistance = nextDistance;
    vec3 position = rayDistance * rayDirection + rayOrigin;
    vec2 uv = getGlobeUv(position);
    float height = length(position) - bottomRadius;
    WeatherSample weather = sampleWeather(uv, height, mipLevel);
    MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter);
    opticalDepth += media.extinction * stepSize;
    nextDistance += stepSize;
    stepSize *= secondaryStepScale;
  }
  return opticalDepth;
}

float marchOpticalDepth(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const int maxIterationCount,
  const float mipLevel,
  const float jitter
) {
  float rayDistance;
  return marchOpticalDepth(
    rayOrigin,
    rayDirection,
    maxIterationCount,
    mipLevel,
    jitter,
    rayDistance
  );
}

float approximateMultipleScattering(const float opticalDepth, const float cosTheta) {
  // Multiple scattering approximation
  // See: https://fpsunflower.github.io/ckulla/data/oz_volumes.pdf
  // a: attenuation, b: contribution, c: phase attenuation
  vec3 coeffs = vec3(1.0); // [a, b, c]
  const vec3 attenuation = vec3(0.5, 0.5, 0.5); // Should satisfy a <= b
  float scattering = 0.0;
  float beerLambert;
  #pragma unroll_loop_start
  for (int i = 0; i < 12; ++i) {
    #if UNROLLED_LOOP_INDEX < MULTI_SCATTERING_OCTAVES
    beerLambert = exp(-opticalDepth * coeffs.y);
    scattering += coeffs.x * beerLambert * phaseFunction(cosTheta, coeffs.z);
    coeffs *= attenuation;
    #endif // UNROLLED_LOOP_INDEX < MULTI_SCATTERING_OCTAVES
  }
  #pragma unroll_loop_end
  return scattering;
}

// TODO: Construct spherical harmonics of degree 2 using 2 sample points
// positioned near the horizon occlusion points on the sun direction plane.
vec3 getGroundSunSkyIrradiance(
  const vec3 position,
  const vec3 surfaceNormal,
  const float height,
  out vec3 skyIrradiance
) {
  #ifdef ACCURATE_SUN_SKY_LIGHT
  return GetSunAndSkyIrradiance(
    (position - surfaceNormal * height) * METER_TO_LENGTH_UNIT,
    surfaceNormal,
    sunDirection,
    skyIrradiance
  );
  #else // ACCURATE_SUN_SKY_LIGHT
  skyIrradiance = vGroundIrradiance.sky;
  return vGroundIrradiance.sun;
  #endif // ACCURATE_SUN_SKY_LIGHT
}

vec3 getCloudsSunSkyIrradiance(const vec3 position, const float height, out vec3 skyIrradiance) {
  #ifdef ACCURATE_SUN_SKY_LIGHT
  return GetSunAndSkyScalarIrradiance(position * METER_TO_LENGTH_UNIT, sunDirection, skyIrradiance);
  #else // ACCURATE_SUN_SKY_LIGHT
  float alpha = remapClamped(height, minHeight, maxHeight);
  skyIrradiance = mix(vCloudsIrradiance.minSky, vCloudsIrradiance.maxSky, alpha);
  return mix(vCloudsIrradiance.minSun, vCloudsIrradiance.maxSun, alpha);
  #endif // ACCURATE_SUN_SKY_LIGHT
}

#ifdef GROUND_BOUNCE
vec3 approximateRadianceFromGround(
  const vec3 position,
  const vec3 surfaceNormal,
  const float height,
  const float mipLevel,
  const float jitter
) {
  float opticalDepthToGround = marchOpticalDepth(
    position,
    -surfaceNormal,
    maxIterationCountToGround,
    mipLevel,
    jitter
  );
  vec3 skyIrradiance;
  vec3 sunIrradiance = getGroundSunSkyIrradiance(position, surfaceNormal, height, skyIrradiance);
  const float groundAlbedo = 0.3;
  vec3 groundIrradiance = skyIrradiance + (1.0 - coverage) * sunIrradiance;
  vec3 bouncedRadiance = groundAlbedo * RECIPROCAL_PI * groundIrradiance;
  return bouncedRadiance * exp(-opticalDepthToGround);
}
#endif // GROUND_BOUNCE

vec4 marchClouds(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const vec2 rayNearFar,
  const float cosTheta,
  const float jitter,
  const float rayStartTexelsPerPixel,
  out float frontDepth,
  out ivec3 sampleCount
) {
  vec3 radianceIntegral = vec3(0.0);
  float transmittanceIntegral = 1.0;
  float weightedDistanceSum = 0.0;
  float transmittanceSum = 0.0;

  float maxRayDistance = rayNearFar.y - rayNearFar.x;
  float stepSize = minStepSize + (perspectiveStepScale - 1.0) * rayNearFar.x;
  // I don't understand why spatial aliasing remains unless doubling the jitter.
  float rayDistance = stepSize * jitter * 2.0;

  for (int i = 0; i < maxIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }

    vec3 position = rayDistance * rayDirection + rayOrigin;
    float height = length(position) - bottomRadius;
    float mipLevel = log2(max(1.0, rayStartTexelsPerPixel + rayDistance * 1e-5));

    #if !defined(DEBUG_MARCH_INTERVALS)
    if (insideLayerIntervals(height)) {
      stepSize *= perspectiveStepScale;
      rayDistance += mix(stepSize, maxStepSize, min(1.0, mipLevel));
      continue;
    }
    #endif // !defined(DEBUG_MARCH_INTERVALS)

    // Sample rough weather.
    vec2 uv = getGlobeUv(position);
    WeatherSample weather = sampleWeather(uv, height, mipLevel);

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    ++sampleCount.x;
    #endif // DEBUG_SHOW_SAMPLE_COUNT

    if (!any(greaterThan(weather.density, vec4(minDensity)))) {
      // Step longer in empty space.
      // TODO: This produces banding artifacts.
      // Possible improvement: Binary search refinement
      stepSize *= perspectiveStepScale;
      rayDistance += mix(stepSize, maxStepSize, min(1.0, mipLevel));
      continue;
    }

    // Sample detailed participating media.
    MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter, sampleCount);

    if (media.extinction > minExtinction) {
      vec3 skyIrradiance;
      vec3 sunIrradiance = getCloudsSunSkyIrradiance(position, height, skyIrradiance);
      vec3 surfaceNormal = normalize(position);

      // March optical depth to the sun for finer details, which BSM lacks.
      float sunRayDistance = 0.0;
      float opticalDepth = marchOpticalDepth(
        position,
        sunDirection,
        maxIterationCountToSun,
        mipLevel,
        jitter,
        sunRayDistance
      );

      if (height < shadowTopHeight) {
        // Obtain the optical depth from BSM at the ray position.
        opticalDepth += sampleShadowOpticalDepth(
          position,
          // Take account of only positions further than the marched ray
          // distance.
          sunRayDistance,
          // Apply PCF only when the sun is close to the horizon.
          maxShadowFilterRadius * remapClamped(dot(sunDirection, surfaceNormal), 0.1, 0.0),
          jitter
        );
      }

      vec3 radiance = sunIrradiance * approximateMultipleScattering(opticalDepth, cosTheta);

      #ifdef GROUND_BOUNCE
      // Fudge factor for the irradiance from ground.
      if (height < shadowTopHeight && mipLevel < 0.5) {
        vec3 groundRadiance = approximateRadianceFromGround(
          position,
          surfaceNormal,
          height,
          mipLevel,
          jitter
        );
        radiance += groundRadiance * RECIPROCAL_PI4 * groundBounceScale;
      }
      #endif // GROUND_BOUNCE

      // Crude approximation of sky gradient. Better than none in the shadows.
      float skyGradient = dot(weather.heightFraction * 0.5 + 0.5, media.weight);
      radiance += skyIrradiance * RECIPROCAL_PI4 * skyGradient * skyLightScale;

      // Finally multiply by scattering.
      radiance *= media.scattering;

      #ifdef POWDER
      radiance *= 1.0 - powderScale * exp(-media.extinction * powderExponent);
      #endif // POWDER

      #ifdef DEBUG_SHOW_CASCADES
      if (height < shadowTopHeight) {
        radiance = 1e-3 * getFadedCascadeColor(position, jitter);
      }
      #endif // DEBUG_SHOW_CASCADES

      // Energy-conserving analytical integration of scattered light
      // See 5.6.3 in https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016-pbs-frostbite-sky-clouds-new.pdf
      float transmittance = exp(-media.extinction * stepSize);
      float clampedExtinction = max(media.extinction, 1e-7);
      vec3 scatteringIntegral = (radiance - radiance * transmittance) / clampedExtinction;
      radianceIntegral += transmittanceIntegral * scatteringIntegral;
      transmittanceIntegral *= transmittance;

      // Aerial perspective affecting clouds
      // See 5.9.1 in https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016-pbs-frostbite-sky-clouds-new.pdf
      weightedDistanceSum += rayDistance * transmittanceIntegral;
      transmittanceSum += transmittanceIntegral;
    }

    if (transmittanceIntegral <= minTransmittance) {
      break; // Early termination
    }

    // Take a shorter step because we've already hit the clouds.
    stepSize *= perspectiveStepScale;
    rayDistance += stepSize;
  }

  // The final product of 5.9.1 and we'll evaluate this in aerial perspective.
  frontDepth = transmittanceSum > 0.0 ? weightedDistanceSum / transmittanceSum : -1.0;

  return vec4(radianceIntegral, remapClamped(transmittanceIntegral, 1.0, minTransmittance));
}

#ifdef SHADOW_LENGTH

float marchShadowLength(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const vec2 rayNearFar,
  const float jitter
) {
  float shadowLength = 0.0;
  float maxRayDistance = rayNearFar.y - rayNearFar.x;
  float stepSize = minShadowLengthStepSize;
  float rayDistance = stepSize * jitter;
  const float attenuationFactor = 1.0 - 5e-4;
  float attenuation = 1.0;

  // TODO: This march is closed, and sample resolution can be much lower.
  // Refining the termination by binary search will make it much more efficient.
  for (int i = 0; i < maxShadowLengthIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }
    vec3 position = rayDistance * rayDirection + rayOrigin;
    float opticalDepth = sampleShadowOpticalDepth(position, 0.0, 0.0, jitter);
    shadowLength += (1.0 - exp(-opticalDepth)) * stepSize * attenuation;
    stepSize *= perspectiveStepScale;
    rayDistance += stepSize;
  }
  return shadowLength;
}

#endif // SHADOW_LENGTH

#ifdef HAZE

vec4 approximateHaze(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float maxRayDistance,
  const float cosTheta,
  const float shadowLength
) {
  float modulation = remapClamped(coverage, 0.2, 0.4);
  if (cameraHeight * modulation < 0.0) {
    return vec4(0.0);
  }
  float density = modulation * hazeDensityScale * exp(-cameraHeight * hazeExponent);
  if (density < 1e-7) {
    return vec4(0.0); // Prevent artifact in views from space
  }

  // Blend two normals by the difference in angle so that normal near the
  // ground becomes that of the origin, and in the sky that of the horizon.
  vec3 normalAtOrigin = normalize(rayOrigin);
  vec3 normalAtHorizon = (rayOrigin - dot(rayOrigin, rayDirection) * rayDirection) / bottomRadius;
  float alpha = remapClamped(dot(normalAtOrigin, normalAtHorizon), 0.9, 1.0);
  vec3 normal = mix(normalAtOrigin, normalAtHorizon, alpha);

  // Analytical optical depth where density exponentially decreases with height.
  // Based on: https://iquilezles.org/articles/fog/
  float angle = max(dot(normal, rayDirection), 1e-5);
  float exponent = angle * hazeExponent;
  float linearTerm = density / hazeExponent / angle;

  // Derive the optical depths separately for with and without shadow length.
  float expTerm = 1.0 - exp(-maxRayDistance * exponent);
  float shadowExpTerm = 1.0 - exp(-min(maxRayDistance, shadowLength) * exponent);
  float opticalDepth = expTerm * linearTerm;
  float shadowOpticalDepth = max((expTerm - shadowExpTerm) * linearTerm, 0.0);
  float transmittance = saturate(1.0 - exp(-opticalDepth));
  float shadowTransmittance = saturate(1.0 - exp(-shadowOpticalDepth));

  vec3 skyIrradiance = vGroundIrradiance.sky;
  vec3 sunIrradiance = vGroundIrradiance.sun;
  vec3 inscatter = sunIrradiance * phaseFunction(cosTheta) * shadowTransmittance;
  inscatter += skyIrradiance * RECIPROCAL_PI4 * skyLightScale * transmittance;
  inscatter *= hazeScatteringCoefficient / (hazeAbsorptionCoefficient + hazeScatteringCoefficient);
  return vec4(inscatter, transmittance);
}

#endif // HAZE

void applyAerialPerspective(
  const vec3 cameraPosition,
  const vec3 frontPosition,
  const float shadowLength,
  inout vec4 color
) {
  vec3 transmittance;
  vec3 inscatter = GetSkyRadianceToPoint(
    cameraPosition * METER_TO_LENGTH_UNIT,
    frontPosition * METER_TO_LENGTH_UNIT,
    shadowLength * METER_TO_LENGTH_UNIT,
    sunDirection,
    transmittance
  );
  color.rgb = color.rgb * transmittance + inscatter * color.a;
}

bool rayIntersectsGround(const vec3 cameraPosition, const vec3 rayDirection) {
  float r = length(cameraPosition);
  float mu = dot(cameraPosition, rayDirection) / r;
  return mu < 0.0 && r * r * (mu * mu - 1.0) + bottomRadius * bottomRadius >= 0.0;
}

struct IntersectionResult {
  bool ground;
  vec4 first;
  vec4 second;
};

IntersectionResult getIntersections(const vec3 cameraPosition, const vec3 rayDirection) {
  IntersectionResult intersections;
  intersections.ground = rayIntersectsGround(cameraPosition, rayDirection);
  raySphereIntersections(
    cameraPosition,
    rayDirection,
    bottomRadius + vec4(0.0, minHeight, maxHeight, shadowTopHeight),
    intersections.first,
    intersections.second
  );
  return intersections;
}

vec2 getRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < minHeight) {
    // View below the clouds
    if (intersections.ground) {
      nearFar = vec2(-1.0); // No clouds to the ground
    } else {
      nearFar = vec2(intersections.second.y, intersections.second.z);
      nearFar.y = min(nearFar.y, maxRayDistance);
    }
  } else if (cameraHeight < maxHeight) {
    // View inside the total cloud layer
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.y);
    } else {
      nearFar = vec2(cameraNear, intersections.second.z);
    }
  } else {
    // View above the clouds
    nearFar = vec2(intersections.first.z, intersections.second.z);
    if (intersections.ground) {
      // Clamp the ray at the min height.
      nearFar.y = intersections.first.y;
    }
  }
  return nearFar;
}

#ifdef SHADOW_LENGTH
vec2 getShadowRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < shadowTopHeight) {
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.x);
    } else {
      nearFar = vec2(cameraNear, intersections.second.w);
    }
  } else {
    nearFar = vec2(intersections.first.w, intersections.second.w);
    if (intersections.ground) {
      // Clamp the ray at the ground.
      nearFar.y = intersections.first.x;
    }
  }
  nearFar.y = min(nearFar.y, maxShadowLengthRayDistance);
  return nearFar;
}
#endif // SHADOW_LENGTH

#ifdef HAZE
vec2 getHazeRayNearFar(const IntersectionResult intersections) {
  vec2 nearFar;
  if (cameraHeight < maxHeight) {
    if (intersections.ground) {
      nearFar = vec2(cameraNear, intersections.first.x);
    } else {
      nearFar = vec2(cameraNear, intersections.second.z);
    }
  } else {
    nearFar = vec2(cameraNear, intersections.second.z);
    if (intersections.ground) {
      // Clamp the ray at the ground.
      nearFar.y = intersections.first.x;
    }
  }
  return nearFar;
}
#endif // HAZE

float getRayDistanceToScene(const vec3 rayDirection, out float viewZ) {
  float depth = readDepthValue(depthBuffer, vUv * targetUvScale + temporalJitter);
  if (depth < 1.0 - 1e-7) {
    depth = reverseLogDepth(depth, cameraNear, cameraFar);
    viewZ = getViewZ(depth);
    return -viewZ / dot(rayDirection, vCameraDirection);
  }
  viewZ = 0.0;
  return 0.0;
}

void main() {
  #ifdef DEBUG_SHOW_SHADOW_MAP
  outputColor = getCascadedShadowMaps(vUv);
  outputDepthVelocity = vec3(0.0);
  #ifdef SHADOW_LENGTH
  outputShadowLength = 0.0;
  #endif // SHADOW_LENGTH
  return;
  #endif // DEBUG_SHOW_SHADOW_MAP

  vec3 cameraPosition = vCameraPosition + altitudeCorrection;
  vec3 rayDirection = normalize(vRayDirection);
  float cosTheta = dot(sunDirection, rayDirection);

  IntersectionResult intersections = getIntersections(cameraPosition, rayDirection);
  vec2 rayNearFar = getRayNearFar(intersections);
  #ifdef SHADOW_LENGTH
  vec2 shadowRayNearFar = getShadowRayNearFar(intersections);
  #endif // SHADOW_LENGTH
  #ifdef HAZE
  vec2 hazeRayNearFar = getHazeRayNearFar(intersections);
  #endif // HAZE

  float sceneViewZ;
  float rayDistanceToScene = getRayDistanceToScene(rayDirection, sceneViewZ);
  if (rayDistanceToScene > 0.0) {
    rayNearFar.y = min(rayNearFar.y, rayDistanceToScene);
    #ifdef SHADOW_LENGTH
    shadowRayNearFar.y = min(shadowRayNearFar.y, rayDistanceToScene);
    #endif // SHADOW_LENGTH
    #ifdef HAZE
    hazeRayNearFar.y = min(hazeRayNearFar.y, rayDistanceToScene);
    #endif // HAZE
  }

  bool intersectsGround = any(lessThan(rayNearFar, vec2(0.0)));
  bool intersectsScene = rayNearFar.y < rayNearFar.x;

  float stbn = getSTBN();

  vec4 color = vec4(0.0);
  float frontDepth = rayNearFar.y;
  vec3 depthVelocity = vec3(0.0);
  float shadowLength = 0.0;
  bool hitClouds = false;

  if (!intersectsGround && !intersectsScene) {
    vec3 rayOrigin = rayNearFar.x * rayDirection + cameraPosition;

    vec2 globeUv = getGlobeUv(rayOrigin);
    #ifdef DEBUG_SHOW_UV
    outputColor = vec4(vec3(checker(globeUv, localWeatherRepeat + localWeatherOffset)), 1.0);
    outputDepthVelocity = vec3(0.0);
    #ifdef SHADOW_LENGTH
    outputShadowLength = 0.0;
    #endif // SHADOW_LENGTH
    return;
    #endif // DEBUG_SHOW_UV

    float mipLevel = getMipLevel(globeUv * localWeatherRepeat) * mipLevelScale;
    mipLevel = mix(0.0, mipLevel, min(1.0, 0.2 * cameraHeight / maxHeight));

    float marchedFrontDepth;
    ivec3 sampleCount = ivec3(0);
    color = marchClouds(
      rayOrigin,
      rayDirection,
      rayNearFar,
      cosTheta,
      stbn,
      pow(2.0, mipLevel),
      marchedFrontDepth,
      sampleCount
    );

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    outputColor = vec4(vec3(sampleCount) / vec3(500.0, 5.0, 5.0), 1.0);
    outputDepthVelocity = vec3(0.0);
    #ifdef SHADOW_LENGTH
    outputShadowLength = 0.0;
    #endif // SHADOW_LENGTH
    return;
    #endif // DEBUG_SHOW_SAMPLE_COUNT

    // Front depth will be -1.0 when no samples are accumulated.
    hitClouds = marchedFrontDepth >= 0.0;
    if (hitClouds) {
      frontDepth = rayNearFar.x + marchedFrontDepth;

      #ifdef SHADOW_LENGTH
      // Clamp the shadow length ray at the clouds.
      shadowRayNearFar.y = mix(
        shadowRayNearFar.y,
        min(frontDepth, shadowRayNearFar.y),
        color.a // Interpolate by the alpha for smoother edges.
      );

      // Shadow length must be computed before applying aerial perspective.
      if (all(greaterThanEqual(shadowRayNearFar, vec2(0.0)))) {
        shadowLength = marchShadowLength(
          shadowRayNearFar.x * rayDirection + cameraPosition,
          rayDirection,
          shadowRayNearFar,
          stbn
        );
      }
      #endif // SHADOW_LENGTH

      #ifdef HAZE
      // Clamp the haze ray at the clouds.
      hazeRayNearFar.y = mix(
        hazeRayNearFar.y,
        min(frontDepth, hazeRayNearFar.y),
        color.a // Interpolate by the alpha for smoother edges.
      );
      #endif // HAZE

      // Apply aerial perspective.
      vec3 frontPosition = cameraPosition + frontDepth * rayDirection;
      applyAerialPerspective(cameraPosition, frontPosition, shadowLength, color);

      // Velocity for temporal resolution.
      vec3 frontPositionWorld = ecefToWorld(frontPosition);
      vec4 prevClip = reprojectionMatrix * vec4(frontPositionWorld, 1.0);
      prevClip /= prevClip.w;
      vec2 prevUv = prevClip.xy * 0.5 + 0.5;
      vec2 velocity = vUv - prevUv;
      depthVelocity = vec3(frontDepth, velocity);
    }
  }

  if (!hitClouds) {
    #ifdef SHADOW_LENGTH
    if (all(greaterThanEqual(shadowRayNearFar, vec2(0.0)))) {
      shadowLength = marchShadowLength(
        shadowRayNearFar.x * rayDirection + cameraPosition,
        rayDirection,
        shadowRayNearFar,
        stbn
      );
    }
    #endif // SHADOW_LENGTH

    // Velocity for temporal resolution. Here reproject in the view space for
    // greatly reducing the precision errors.
    frontDepth = sceneViewZ < 0.0 ? -sceneViewZ : cameraFar;
    vec3 frontView = vViewPosition * frontDepth;
    vec4 prevClip = viewReprojectionMatrix * vec4(frontView, 1.0);
    prevClip /= prevClip.w;
    vec2 prevUv = prevClip.xy * 0.5 + 0.5;
    vec2 velocity = vUv - prevUv;
    depthVelocity = vec3(frontDepth, velocity);
  }

  #ifdef DEBUG_SHOW_FRONT_DEPTH
  outputColor = vec4(turbo(frontDepth / maxRayDistance), 1.0);
  outputDepthVelocity = vec3(0.0);
  #ifdef SHADOW_LENGTH
  outputShadowLength = 0.0;
  #endif // SHADOW_LENGTH
  return;
  #endif // DEBUG_SHOW_FRONT_DEPTH

  #ifdef HAZE
  vec4 haze = approximateHaze(
    cameraNear * rayDirection + cameraPosition,
    rayDirection,
    hazeRayNearFar.y - hazeRayNearFar.x,
    cosTheta,
    shadowLength
  );
  color.rgb = mix(color.rgb, haze.rgb, haze.a);
  color.a = color.a * (1.0 - haze.a) + haze.a;
  #endif // HAZE

  outputColor = color;
  outputDepthVelocity = depthVelocity;
  #ifdef SHADOW_LENGTH
  outputShadowLength = shadowLength * METER_TO_LENGTH_UNIT;
  #endif // SHADOW_LENGTH
}
`,Ws=`float getSTBN() {
  ivec3 size = textureSize(stbnTexture, 0);
  vec3 scale = 1.0 / vec3(size);
  return texture(stbnTexture, vec3(gl_FragCoord.xy, float(frame % size.z)) * scale).r;
}

// Straightforward spherical mapping
vec2 getSphericalUv(const vec3 position) {
  vec2 st = normalize(position.yx);
  float phi = atan(st.x, st.y);
  float theta = asin(normalize(position).z);
  return vec2(phi * RECIPROCAL_PI2 + 0.5, theta * RECIPROCAL_PI + 0.5);
}

vec2 getCubeSphereUv(const vec3 position) {
  // Cube-sphere relaxation by: http://mathproofs.blogspot.com/2005/07/mapping-cube-to-sphere.html
  // TODO: Tile and fix seams.
  // Possible improvements:
  // https://iquilezles.org/articles/texturerepetition/
  // https://gamedev.stackexchange.com/questions/184388/fragment-shader-map-dot-texture-repeatedly-over-the-sphere
  // https://github.com/mmikk/hextile-demo

  vec3 n = normalize(position);
  vec3 f = abs(n);
  vec3 c = n / max(f.x, max(f.y, f.z));
  vec2 m;
  if (all(greaterThan(f.yy, f.xz))) {
    m = c.y > 0.0 ? vec2(-n.x, n.z) : n.xz;
  } else if (all(greaterThan(f.xx, f.yz))) {
    m = c.x > 0.0 ? n.yz : vec2(-n.y, n.z);
  } else {
    m = c.z > 0.0 ? n.xy : vec2(n.x, -n.y);
  }

  vec2 m2 = m * m;
  float q = dot(m2.xy, vec2(-2.0, 2.0)) - 3.0;
  float q2 = q * q;
  vec2 uv;
  uv.x = sqrt(1.5 + m2.x - m2.y - 0.5 * sqrt(-24.0 * m2.x + q2)) * (m.x > 0.0 ? 1.0 : -1.0);
  uv.y = sqrt(6.0 / (3.0 - uv.x * uv.x)) * m.y;
  return uv * 0.5 + 0.5;
}

vec2 getGlobeUv(const vec3 position) {
  return getCubeSphereUv(position);
}

float getMipLevel(const vec2 uv) {
  const float mipLevelScale = 0.1;
  vec2 coord = uv * resolution;
  vec2 ddx = dFdx(coord);
  vec2 ddy = dFdy(coord);
  float deltaMaxSqr = max(dot(ddx, ddx), dot(ddy, ddy)) * mipLevelScale;
  return max(0.0, 0.5 * log2(max(1.0, deltaMaxSqr)));
}

bool insideLayerIntervals(const float height) {
  bvec3 gt = greaterThan(vec3(height), minIntervalHeights);
  bvec3 lt = lessThan(vec3(height), maxIntervalHeights);
  return any(bvec3(gt.x && lt.x, gt.y && lt.y, gt.z && lt.z));
}

struct WeatherSample {
  vec4 heightFraction; // Normalized height of each layer
  vec4 density;
};

vec4 shapeAlteringFunction(const vec4 heightFraction, const vec4 bias) {
  // Apply a semi-circle transform to round the clouds towards the top.
  vec4 biased = pow(heightFraction, bias);
  vec4 x = clamp(biased * 2.0 - 1.0, -1.0, 1.0);
  return 1.0 - x * x;
}

WeatherSample sampleWeather(const vec2 uv, const float height, const float mipLevel) {
  WeatherSample weather;
  weather.heightFraction = remapClamped(vec4(height), minLayerHeights, maxLayerHeights);

  vec4 localWeather = pow(
    textureLod(
      localWeatherTexture,
      uv * localWeatherRepeat + localWeatherOffset,
      mipLevel
    ).LOCAL_WEATHER_CHANNELS,
    weatherExponents
  );
  #ifdef SHADOW
  localWeather *= shadowLayerMask;
  #endif // SHADOW

  vec4 heightScale = shapeAlteringFunction(weather.heightFraction, shapeAlteringBiases);

  // Modulation to control weather by coverage parameter.
  // Reference: https://github.com/Prograda/Skybolt/blob/master/Assets/Core/Shaders/Clouds.h#L63
  vec4 factor = 1.0 - coverage * heightScale;
  weather.density = remapClamped(
    mix(localWeather, vec4(1.0), coverageFilterWidths),
    factor,
    factor + coverageFilterWidths
  );

  return weather;
}

vec4 getLayerDensity(const vec4 heightFraction) {
  // prettier-ignore
  return densityProfile.expTerms * exp(densityProfile.exponents * heightFraction) +
    densityProfile.linearTerms * heightFraction +
    densityProfile.constantTerms;
}

struct MediaSample {
  float density;
  vec4 weight;
  float scattering;
  float extinction;
};

MediaSample sampleMedia(
  const WeatherSample weather,
  const vec3 position,
  const vec2 uv,
  const float mipLevel,
  const float jitter,
  out ivec3 sampleCount
) {
  vec4 density = weather.density;

  // TODO: Define in physical length.
  vec3 surfaceNormal = normalize(position);
  float localWeatherSpeed = length(localWeatherOffset);
  vec3 evolution = -surfaceNormal * localWeatherSpeed * 2e4;

  vec3 turbulence = vec3(0.0);
  #ifdef TURBULENCE
  vec2 turbulenceUv = uv * localWeatherRepeat * turbulenceRepeat;
  turbulence =
    turbulenceDisplacement *
    (texture(turbulenceTexture, turbulenceUv).rgb * 2.0 - 1.0) *
    dot(density, remapClamped(weather.heightFraction, vec4(0.3), vec4(0.0)));
  #endif // TURBULENCE

  vec3 shapePosition = (position + evolution + turbulence) * shapeRepeat + shapeOffset;
  float shape = texture(shapeTexture, shapePosition).r;
  density = remapClamped(density, vec4(1.0 - shape) * shapeAmounts, vec4(1.0));

  #ifdef DEBUG_SHOW_SAMPLE_COUNT
  ++sampleCount.y;
  #endif // DEBUG_SHOW_SAMPLE_COUNT

  #ifdef SHAPE_DETAIL
  if (mipLevel * 0.5 + (jitter - 0.5) * 0.5 < 0.5) {
    vec3 detailPosition = (position + turbulence) * shapeDetailRepeat + shapeDetailOffset;
    float detail = texture(shapeDetailTexture, detailPosition).r;
    // Fluffy at the top and whippy at the bottom.
    vec4 modifier = mix(
      vec4(pow(detail, 6.0)),
      vec4(1.0 - detail),
      remapClamped(weather.heightFraction, vec4(0.2), vec4(0.4))
    );
    modifier = mix(vec4(0.0), modifier, shapeDetailAmounts);
    density = remapClamped(density * 2.0, vec4(modifier * 0.5), vec4(1.0));

    #ifdef DEBUG_SHOW_SAMPLE_COUNT
    ++sampleCount.z;
    #endif // DEBUG_SHOW_SAMPLE_COUNT
  }
  #endif // SHAPE_DETAIL

  // Apply the density profiles.
  density = saturate(density * densityScales * getLayerDensity(weather.heightFraction));

  MediaSample media;
  float densitySum = density.x + density.y + density.z + density.w;
  media.weight = density / densitySum;
  media.scattering = densitySum * scatteringCoefficient;
  media.extinction = densitySum * absorptionCoefficient + media.scattering;
  return media;
}

MediaSample sampleMedia(
  const WeatherSample weather,
  const vec3 position,
  const vec2 uv,
  const float mipLevel,
  const float jitter
) {
  ivec3 sampleCount;
  return sampleMedia(weather, position, uv, mipLevel, jitter, sampleCount);
}
`,Eh=`precision highp float;
precision highp sampler3D;

#include "atmosphere/bruneton/definitions"

uniform AtmosphereParameters ATMOSPHERE;
uniform vec3 SUN_SPECTRAL_RADIANCE_TO_LUMINANCE;
uniform vec3 SKY_SPECTRAL_RADIANCE_TO_LUMINANCE;

uniform sampler2D transmittance_texture;
uniform sampler3D scattering_texture;
uniform sampler2D irradiance_texture;
uniform sampler3D single_mie_scattering_texture;
uniform sampler3D higher_order_scattering_texture;

#include "atmosphere/bruneton/common"
#include "atmosphere/bruneton/runtime"

#include "types"

uniform mat4 inverseProjectionMatrix;
uniform mat4 inverseViewMatrix;
uniform vec3 cameraPosition;
uniform mat4 worldToECEFMatrix;
uniform vec3 altitudeCorrection;

// Atmosphere
uniform float bottomRadius;
uniform vec3 sunDirection;

// Cloud layers
uniform float minHeight;
uniform float maxHeight;

layout(location = 0) in vec3 position;

out vec2 vUv;
out vec3 vCameraPosition;
out vec3 vCameraDirection; // Direction to the center of screen
out vec3 vRayDirection; // Direction to the texel
out vec3 vViewPosition;

out GroundIrradiance vGroundIrradiance;
out CloudsIrradiance vCloudsIrradiance;

void sampleSunSkyIrradiance(const vec3 positionECEF) {
  vGroundIrradiance.sun = GetSunAndSkyScalarIrradiance(
    positionECEF * METER_TO_LENGTH_UNIT,
    sunDirection,
    vGroundIrradiance.sky
  );

  vec3 surfaceNormal = normalize(positionECEF);
  vec2 radii = (bottomRadius + vec2(minHeight, maxHeight)) * METER_TO_LENGTH_UNIT;
  vCloudsIrradiance.minSun = GetSunAndSkyScalarIrradiance(
    surfaceNormal * radii.x,
    sunDirection,
    vCloudsIrradiance.minSky
  );
  vCloudsIrradiance.maxSun = GetSunAndSkyScalarIrradiance(
    surfaceNormal * radii.y,
    sunDirection,
    vCloudsIrradiance.maxSky
  );
}

void main() {
  vUv = position.xy * 0.5 + 0.5;

  vec3 viewPosition = (inverseProjectionMatrix * vec4(position, 1.0)).xyz;
  vec3 worldDirection = (inverseViewMatrix * vec4(viewPosition.xyz, 0.0)).xyz;
  vec3 cameraDirection = normalize((inverseViewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  vCameraPosition = (worldToECEFMatrix * vec4(cameraPosition, 1.0)).xyz;
  vCameraDirection = (worldToECEFMatrix * vec4(cameraDirection, 0.0)).xyz;
  vRayDirection = (worldToECEFMatrix * vec4(worldDirection, 0.0)).xyz;
  vViewPosition = viewPosition;

  sampleSunSkyIrradiance(vCameraPosition + altitudeCorrection);

  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Vs=`uniform vec2 resolution;
uniform int frame;
uniform sampler3D stbnTexture;

// Atmosphere
uniform float bottomRadius;
uniform mat4 worldToECEFMatrix;
uniform mat4 ecefToWorldMatrix;
uniform vec3 altitudeCorrection;
uniform vec3 sunDirection;

// Participating medium
uniform float scatteringCoefficient;
uniform float absorptionCoefficient;

// Primary raymarch
uniform float minDensity;
uniform float minExtinction;
uniform float minTransmittance;

// Shape and weather
uniform sampler2D localWeatherTexture;
uniform vec2 localWeatherRepeat;
uniform vec2 localWeatherOffset;
uniform float coverage;
uniform sampler3D shapeTexture;
uniform vec3 shapeRepeat;
uniform vec3 shapeOffset;

#ifdef SHAPE_DETAIL
uniform sampler3D shapeDetailTexture;
uniform vec3 shapeDetailRepeat;
uniform vec3 shapeDetailOffset;
#endif // SHAPE_DETAIL

#ifdef TURBULENCE
uniform sampler2D turbulenceTexture;
uniform vec2 turbulenceRepeat;
uniform float turbulenceDisplacement;
#endif // TURBULENCE

// Haze
#ifdef HAZE
uniform float hazeDensityScale;
uniform float hazeExponent;
uniform float hazeScatteringCoefficient;
uniform float hazeAbsorptionCoefficient;
#endif // HAZE

// Cloud layers
uniform vec4 minLayerHeights;
uniform vec4 maxLayerHeights;
uniform vec3 minIntervalHeights;
uniform vec3 maxIntervalHeights;
uniform vec4 densityScales;
uniform vec4 shapeAmounts;
uniform vec4 shapeDetailAmounts;
uniform vec4 weatherExponents;
uniform vec4 shapeAlteringBiases;
uniform vec4 coverageFilterWidths;
uniform float minHeight;
uniform float maxHeight;
uniform float shadowTopHeight;
uniform float shadowBottomHeight;
uniform vec4 shadowLayerMask;
uniform CloudDensityProfile densityProfile;
`,On=`struct GroundIrradiance {
  vec3 sun;
  vec3 sky;
};

struct CloudsIrradiance {
  vec3 minSun;
  vec3 minSky;
  vec3 maxSun;
  vec3 maxSky;
};

struct CloudDensityProfile {
  vec4 expTerms;
  vec4 exponents;
  vec4 linearTerms;
  vec4 constantTerms;
};
`,wh=Object.defineProperty,Ie=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&wh(e,r,a),a},yh=new ae,Ch=new qe,Te=class extends lt{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i},a=Pt.DEFAULT){super({name:"CloudsMaterial",glslVersion:yi,vertexShader:Be(Eh,{atmosphere:{bruneton:{common:Dn,definitions:Rn,runtime:Cn}},types:On}),fragmentShader:_t(Be(xh,{core:{depth:fi,math:Vt,turbo:mn,generators:is,raySphereIntersection:Yt,cascadedShadowMaps:di,interleavedGradientNoise:mi,vogelDisk:pi},atmosphere:{bruneton:{common:Dn,definitions:Rn,runtime:Cn}},types:On,parameters:Vs,clouds:Ws})),uniforms:{...e,...r,...i,depthBuffer:new g(null),viewMatrix:new g(new ce),inverseProjectionMatrix:new g(new ce),inverseViewMatrix:new g(new ce),reprojectionMatrix:new g(new ce),viewReprojectionMatrix:new g(new ce),resolution:new g(new se),cameraNear:new g(0),cameraFar:new g(0),cameraHeight:new g(0),frame:new g(0),temporalJitter:new g(new se),targetUvScale:new g(new se),mipLevelScale:new g(1),stbnTexture:new g(null),skyLightScale:new g(1),groundBounceScale:new g(1),powderScale:new g(.8),powderExponent:new g(150),maxIterationCount:new g(O.clouds.maxIterationCount),minStepSize:new g(O.clouds.minStepSize),maxStepSize:new g(O.clouds.maxStepSize),maxRayDistance:new g(O.clouds.maxRayDistance),perspectiveStepScale:new g(O.clouds.perspectiveStepScale),minDensity:new g(O.clouds.minDensity),minExtinction:new g(O.clouds.minExtinction),minTransmittance:new g(O.clouds.minTransmittance),maxIterationCountToSun:new g(O.clouds.maxIterationCountToSun),maxIterationCountToGround:new g(O.clouds.maxIterationCountToGround),minSecondaryStepSize:new g(O.clouds.minSecondaryStepSize),secondaryStepScale:new g(O.clouds.secondaryStepScale),shadowBuffer:new g(null),shadowTexelSize:new g(new se),shadowIntervals:new g(Array.from({length:4},()=>new se)),shadowMatrices:new g(Array.from({length:4},()=>new ce)),shadowFar:new g(0),maxShadowFilterRadius:new g(6),shadowLayerMask:new g(new Re().setScalar(1)),maxShadowLengthIterationCount:new g(O.clouds.maxShadowLengthIterationCount),minShadowLengthStepSize:new g(O.clouds.minShadowLengthStepSize),maxShadowLengthRayDistance:new g(O.clouds.maxShadowLengthRayDistance),hazeDensityScale:new g(3e-5),hazeExponent:new g(.001),hazeScatteringCoefficient:new g(.9),hazeAbsorptionCoefficient:new g(.5)}},a),this.temporalUpscale=!0,this.depthPacking=0,this.localWeatherChannels="rgba",this.shapeDetail=O.shapeDetail,this.turbulence=O.turbulence,this.shadowLength=O.lightShafts,this.haze=O.haze,this.multiScatteringOctaves=O.clouds.multiScatteringOctaves,this.accurateSunSkyLight=O.clouds.accurateSunSkyLight,this.accuratePhaseFunction=O.clouds.accuratePhaseFunction,this.shadowCascadeCount=O.shadow.cascadeCount,this.shadowSampleCount=8,this.scatterAnisotropy1=.7,this.scatterAnisotropy2=-.2,this.scatterAnisotropyMix=.5}onBeforeRender(e,r,i,a,s,o){let u=this.defines.USE_LOGARITHMIC_DEPTH_BUFFER!=null,d=e.capabilities.logarithmicDepthBuffer;d!==u&&(d?this.defines.USE_LOGARITHMIC_DEPTH_BUFFER="1":delete this.defines.USE_LOGARITHMIC_DEPTH_BUFFER);let p=this.defines.POWDER!=null,A=this.uniforms.powderScale.value>0;A!==p&&(A?this.defines.POWDER="1":delete this.defines.POWDER,this.needsUpdate=!0);let S=this.defines.GROUND_BOUNCE!=null;(this.uniforms.groundBounceScale.value>0&&this.uniforms.maxIterationCountToGround.value>0)!==S&&(A?this.defines.GROUND_BOUNCE="1":delete this.defines.GROUND_BOUNCE,this.needsUpdate=!0)}copyCameraSettings(e){e.isPerspectiveCamera===!0?this.defines.PERSPECTIVE_CAMERA!=="1"&&(this.defines.PERSPECTIVE_CAMERA="1",this.needsUpdate=!0):this.defines.PERSPECTIVE_CAMERA!=null&&(delete this.defines.PERSPECTIVE_CAMERA,this.needsUpdate=!0);let r=this.uniforms;r.viewMatrix.value.copy(e.matrixWorldInverse),r.inverseViewMatrix.value.copy(e.matrixWorld);let i=this.previousProjectionMatrix??e.projectionMatrix,a=this.previousViewMatrix??e.matrixWorldInverse,s=r.inverseProjectionMatrix.value,o=r.inverseViewMatrix.value,u=r.reprojectionMatrix.value,d=r.viewReprojectionMatrix.value;if(this.temporalUpscale){let S=r.frame.value%16,P=r.resolution.value,B=ks[S],z=(B.x-.5)/P.x*4,$=(B.y-.5)/P.y*4;r.temporalJitter.value.set(z,$),r.mipLevelScale.value=.25,s.copy(e.projectionMatrix),s.elements[8]+=z*2,s.elements[9]+=$*2,s.invert(),u.copy(i),u.elements[8]+=z*2,u.elements[9]+=$*2,u.multiply(a),d.copy(u).multiply(o)}else r.temporalJitter.value.setScalar(0),r.mipLevelScale.value=1,s.copy(e.projectionMatrixInverse),u.copy(i).multiply(a),d.copy(u).multiply(o);r.cameraNear.value=e.near,r.cameraFar.value=e.far;let p=e.getWorldPosition(r.cameraPosition.value),A=yh.copy(p).applyMatrix4(r.worldToECEFMatrix.value);try{r.cameraHeight.value=Ch.setFromECEF(A).height}catch{}}copyReprojectionMatrix(e){this.previousProjectionMatrix??=new ce,this.previousViewMatrix??=new ce,this.previousProjectionMatrix.copy(e.projectionMatrix),this.previousViewMatrix.copy(e.matrixWorldInverse)}setSize(e,r,i,a){this.uniforms.resolution.value.set(e,r),i!=null&&a!=null?this.uniforms.targetUvScale.value.set(e/i,r/a):this.uniforms.targetUvScale.value.setScalar(1),this.previousProjectionMatrix=void 0,this.previousViewMatrix=void 0}setShadowSize(e,r){this.uniforms.shadowTexelSize.value.set(1/e,1/r)}get depthBuffer(){return this.uniforms.depthBuffer.value}set depthBuffer(e){this.uniforms.depthBuffer.value=e}};Ie([ot("DEPTH_PACKING")],Te.prototype,"depthPacking");Ie([hn("LOCAL_WEATHER_CHANNELS",{validate:t=>/^[rgba]{4}$/.test(t)})],Te.prototype,"localWeatherChannels");Ie([H("SHAPE_DETAIL")],Te.prototype,"shapeDetail");Ie([H("TURBULENCE")],Te.prototype,"turbulence");Ie([H("SHADOW_LENGTH")],Te.prototype,"shadowLength");Ie([H("HAZE")],Te.prototype,"haze");Ie([ot("MULTI_SCATTERING_OCTAVES",{min:1,max:12})],Te.prototype,"multiScatteringOctaves");Ie([H("ACCURATE_SUN_SKY_LIGHT")],Te.prototype,"accurateSunSkyLight");Ie([H("ACCURATE_PHASE_FUNCTION")],Te.prototype,"accuratePhaseFunction");Ie([ot("SHADOW_CASCADE_COUNT",{min:1,max:4})],Te.prototype,"shadowCascadeCount");Ie([ot("SHADOW_SAMPLE_COUNT",{min:1,max:16})],Te.prototype,"shadowSampleCount");Ie([hi("SCATTER_ANISOTROPY_1")],Te.prototype,"scatterAnisotropy1");Ie([hi("SCATTER_ANISOTROPY_2")],Te.prototype,"scatterAnisotropy2");Ie([hi("SCATTER_ANISOTROPY_MIX")],Te.prototype,"scatterAnisotropyMix");var Dh=`// Taken from https://gist.github.com/TheRealMJP/c83b8c0f46b63f3a88a5986f4fa982b1
// TODO: Use 5-taps version: https://www.shadertoy.com/view/MtVGWz
// Or even 4 taps (requires preprocessing in the input buffer):
// https://www.shadertoy.com/view/4tyGDD

/**
 * MIT License
 *
 * Copyright (c) 2019 MJP
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

vec4 textureCatmullRom(sampler2D tex, vec2 uv) {
  vec2 texSize = vec2(textureSize(tex, 0));

  // We're going to sample a a 4x4 grid of texels surrounding the target UV
  // coordinate. We'll do this by rounding down the sample location to get the
  // exact center of our "starting" texel. The starting texel will be at
  // location [1, 1] in the grid, where [0, 0] is the top left corner.
  vec2 samplePos = uv * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;

  // Compute the fractional offset from our starting texel to our original
  // sample location, which we'll feed into the Catmull-Rom spline function to
  // get our filter weights.
  vec2 f = samplePos - texPos1;

  // Compute the Catmull-Rom weights using the fractional offset that we
  // calculated earlier. These equations are pre-expanded based on our knowledge
  // of where the texels will be located, which lets us avoid having to evaluate
  // a piece-wise function.
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);

  // Work out weighting factors and sampling offsets that will let us use
  // bilinear filtering to simultaneously evaluate the middle 2 samples from the
  // 4x4 grid.
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / (w1 + w2);

  // Compute the final UV coordinates we'll use for sampling the texture
  vec2 texPos0 = texPos1 - 1.0;
  vec2 texPos3 = texPos1 + 2.0;
  vec2 texPos12 = texPos1 + offset12;

  texPos0 /= texSize;
  texPos3 /= texSize;
  texPos12 /= texSize;

  vec4 result = vec4(0.0);
  result += texture(tex, vec2(texPos0.x, texPos0.y)) * w0.x * w0.y;
  result += texture(tex, vec2(texPos12.x, texPos0.y)) * w12.x * w0.y;
  result += texture(tex, vec2(texPos3.x, texPos0.y)) * w3.x * w0.y;

  result += texture(tex, vec2(texPos0.x, texPos12.y)) * w0.x * w12.y;
  result += texture(tex, vec2(texPos12.x, texPos12.y)) * w12.x * w12.y;
  result += texture(tex, vec2(texPos3.x, texPos12.y)) * w3.x * w12.y;

  result += texture(tex, vec2(texPos0.x, texPos3.y)) * w0.x * w3.y;
  result += texture(tex, vec2(texPos12.x, texPos3.y)) * w12.x * w3.y;
  result += texture(tex, vec2(texPos3.x, texPos3.y)) * w3.x * w3.y;

  return result;
}

vec4 textureCatmullRom(sampler2DArray tex, vec3 uv) {
  vec2 texSize = vec2(textureSize(tex, 0));
  vec2 samplePos = uv.xy * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - texPos1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / (w1 + w2);
  vec2 texPos0 = texPos1 - 1.0;
  vec2 texPos3 = texPos1 + 2.0;
  vec2 texPos12 = texPos1 + offset12;
  texPos0 /= texSize;
  texPos3 /= texSize;
  texPos12 /= texSize;
  vec4 result = vec4(0.0);
  result += texture(tex, vec3(texPos0.x, texPos0.y, uv.z)) * w0.x * w0.y;
  result += texture(tex, vec3(texPos12.x, texPos0.y, uv.z)) * w12.x * w0.y;
  result += texture(tex, vec3(texPos3.x, texPos0.y, uv.z)) * w3.x * w0.y;
  result += texture(tex, vec3(texPos0.x, texPos12.y, uv.z)) * w0.x * w12.y;
  result += texture(tex, vec3(texPos12.x, texPos12.y, uv.z)) * w12.x * w12.y;
  result += texture(tex, vec3(texPos3.x, texPos12.y, uv.z)) * w3.x * w12.y;
  result += texture(tex, vec3(texPos0.x, texPos3.y, uv.z)) * w0.x * w3.y;
  result += texture(tex, vec3(texPos12.x, texPos3.y, uv.z)) * w12.x * w3.y;
  result += texture(tex, vec3(texPos3.x, texPos3.y, uv.z)) * w3.x * w3.y;
  return result;
}
`,Rh=`precision highp float;
precision highp sampler2DArray;

#include "core/turbo"
#include "catmullRomSampling"
#include "varianceClipping"

uniform sampler2D colorBuffer;
uniform sampler2D depthVelocityBuffer;
uniform sampler2D colorHistoryBuffer;

#ifdef SHADOW_LENGTH
uniform sampler2D shadowLengthBuffer;
uniform sampler2D shadowLengthHistoryBuffer;
#endif // SHADOW_LENGTH

uniform vec2 texelSize;
uniform int frame;
uniform float varianceGamma;
uniform float temporalAlpha;
uniform vec2 jitterOffset;

in vec2 vUv;

layout(location = 0) out vec4 outputColor;
#ifdef SHADOW_LENGTH
layout(location = 1) out float outputShadowLength;
#endif // SHADOW_LENGTH

const ivec2 neighborOffsets[9] = ivec2[9](
  ivec2(-1, -1),
  ivec2(-1, 0),
  ivec2(-1, 1),
  ivec2(0, -1),
  ivec2(0, 0),
  ivec2(0, 1),
  ivec2(1, -1),
  ivec2(1, 0),
  ivec2(1, 1)
);

const ivec4[4] bayerIndices = ivec4[4](
  ivec4(0, 12, 3, 15),
  ivec4(8, 4, 11, 7),
  ivec4(2, 14, 1, 13),
  ivec4(10, 6, 9, 5)
);

vec4 getClosestFragment(const ivec2 coord) {
  vec4 result = vec4(1e7, 0.0, 0.0, 0.0);
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 9; ++i) {
    neighbor = texelFetchOffset(depthVelocityBuffer, coord, 0, neighborOffsets[i]);
    if (neighbor.r < result.r) {
      result = neighbor;
    }
  }
  #pragma unroll_loop_end
  return result;
}

void temporalUpscale(
  const ivec2 coord,
  const ivec2 lowResCoord,
  const bool currentFrame,
  out vec4 outputColor,
  out float outputShadowLength
) {
  vec4 currentColor = texelFetch(colorBuffer, lowResCoord, 0);
  #ifdef SHADOW_LENGTH
  vec4 currentShadowLength = vec4(texelFetch(shadowLengthBuffer, lowResCoord, 0).rgb, 1.0);
  #endif // SHADOW_LENGTH

  if (currentFrame) {
    // Use the texel just rendered without any accumulation.
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return;
  }

  vec4 depthVelocity = getClosestFragment(lowResCoord);
  vec2 velocity = depthVelocity.gb;
  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return; // Rejection
  }

  // Variance clipping with a large variance gamma seems to work fine for
  // upsampling. This increases ghosting, of course, but it's hard to notice on
  // clouds.
  // vec4 historyColor = textureCatmullRom(colorHistoryBuffer, prevUv);
  vec4 historyColor = texture(colorHistoryBuffer, prevUv);
  vec4 clippedColor = varianceClipping(colorBuffer, vUv, currentColor, historyColor, varianceGamma);
  outputColor = clippedColor;

  #ifdef SHADOW_LENGTH
  // Sampling the shadow length history using scene depth doesn't make much
  // sense, but it's too hard to derive it properly. At least this approach
  // resolves the edges of scene objects.
  // vec4 historyShadowLength = vec4(textureCatmullRom(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 historyShadowLength = vec4(texture(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 clippedShadowLength = varianceClipping(
    shadowLengthBuffer,
    vUv,
    currentShadowLength,
    historyShadowLength,
    varianceGamma
  );
  outputShadowLength = clippedShadowLength.r;
  #endif // SHADOW_LENGTH
}

void temporalAntialiasing(const ivec2 coord, out vec4 outputColor, out float outputShadowLength) {
  vec4 currentColor = texelFetch(colorBuffer, coord, 0);
  #ifdef SHADOW_LENGTH
  vec4 currentShadowLength = vec4(texelFetch(shadowLengthBuffer, coord, 0).rgb, 1.0);
  #endif // SHADOW_LENGTH

  vec4 depthVelocity = getClosestFragment(coord);
  vec2 velocity = depthVelocity.gb;

  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = currentColor;
    #ifdef SHADOW_LENGTH
    outputShadowLength = currentShadowLength.r;
    #endif // SHADOW_LENGTH
    return; // Rejection
  }

  vec4 historyColor = texture(colorHistoryBuffer, prevUv);
  vec4 clippedColor = varianceClipping(colorBuffer, coord, currentColor, historyColor);
  outputColor = mix(clippedColor, currentColor, temporalAlpha);

  #ifdef SHADOW_LENGTH
  vec4 historyShadowLength = vec4(texture(shadowLengthHistoryBuffer, prevUv).rgb, 1.0);
  vec4 clippedShadowLength = varianceClipping(
    shadowLengthBuffer,
    coord,
    currentShadowLength,
    historyShadowLength
  );
  outputShadowLength = mix(clippedShadowLength.r, currentShadowLength.r, temporalAlpha);
  #endif // SHADOW_LENGTH
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);

  #if !defined(SHADOW_LENGTH)
  float outputShadowLength;
  #endif // !defined(SHADOW_LENGTH)

  #ifdef TEMPORAL_UPSCALE
  ivec2 lowResCoord = coord / 4;
  int bayerValue = bayerIndices[coord.x % 4][coord.y % 4];
  bool currentFrame = bayerValue == frame % 16;
  temporalUpscale(coord, lowResCoord, currentFrame, outputColor, outputShadowLength);
  #else // TEMPORAL_UPSCALE
  temporalAntialiasing(coord, outputColor, outputShadowLength);
  #endif // TEMPORAL_UPSCALE

  #if defined(SHADOW_LENGTH) && defined(DEBUG_SHOW_SHADOW_LENGTH)
  outputColor = vec4(turbo(outputShadowLength * 0.05), 1.0);
  #endif // defined(SHADOW_LENGTH) && defined(DEBUG_SHOW_SHADOW_LENGTH)

  #ifdef DEBUG_SHOW_VELOCITY
  outputColor.rgb = outputColor.rgb + vec3(abs(texture(depthVelocityBuffer, vUv).gb) * 10.0, 0.0);
  #endif // DEBUG_SHOW_VELOCITY
}
`,Ih=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Ys=`#ifdef VARIANCE_9_SAMPLES
#define VARIANCE_OFFSET_COUNT 8
const ivec2 varianceOffsets[8] = ivec2[8](
  ivec2(-1, -1),
  ivec2(-1, 1),
  ivec2(1, -1),
  ivec2(1, 1),
  ivec2(1, 0),
  ivec2(0, -1),
  ivec2(0, 1),
  ivec2(-1, 0)
);
#else // VARIANCE_9_SAMPLES
#define VARIANCE_OFFSET_COUNT 4
const ivec2 varianceOffsets[4] = ivec2[4](ivec2(1, 0), ivec2(0, -1), ivec2(0, 1), ivec2(-1, 0));
#endif // VARIANCE_9_SAMPLES

// Reference: https://github.com/playdeadgames/temporal
vec4 clipAABB(const vec4 current, const vec4 history, const vec4 minColor, const vec4 maxColor) {
  vec3 pClip = 0.5 * (maxColor.rgb + minColor.rgb);
  vec3 eClip = 0.5 * (maxColor.rgb - minColor.rgb) + 1e-7;
  vec4 vClip = history - vec4(pClip, current.a);
  vec3 vUnit = vClip.xyz / eClip;
  vec3 aUnit = abs(vUnit);
  float maUnit = max(aUnit.x, max(aUnit.y, aUnit.z));
  if (maUnit > 1.0) {
    return vec4(pClip, current.a) + vClip / maUnit;
  }
  return history;
}

#ifdef VARIANCE_SAMPLER_ARRAY
#define VARIANCE_SAMPLER sampler2DArray
#define VARIANCE_SAMPLER_COORD ivec3
#else // VARIANCE_SAMPLER_ARRAY
#define VARIANCE_SAMPLER sampler2D
#define VARIANCE_SAMPLER_COORD ivec2
#endif // VARIANCE_SAMPLER_ARRAY

// Variance clipping
// Reference: https://developer.download.nvidia.com/gameworks/events/GDC2016/msalvi_temporal_supersampling.pdf
vec4 varianceClipping(
  const VARIANCE_SAMPLER inputBuffer,
  const VARIANCE_SAMPLER_COORD coord,
  const vec4 current,
  const vec4 history,
  const float gamma
) {
  vec4 moment1 = current;
  vec4 moment2 = current * current;
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 8; ++i) {
    #if UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
    neighbor = texelFetchOffset(inputBuffer, coord, 0, varianceOffsets[i]);
    moment1 += neighbor;
    moment2 += neighbor * neighbor;
    #endif // UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
  }
  #pragma unroll_loop_end

  const float N = float(VARIANCE_OFFSET_COUNT + 1);
  vec4 mean = moment1 / N;
  vec4 varianceGamma = sqrt(max(moment2 / N - mean * mean, 0.0)) * gamma;
  vec4 minColor = mean - varianceGamma;
  vec4 maxColor = mean + varianceGamma;
  return clipAABB(clamp(mean, minColor, maxColor), history, minColor, maxColor);
}

vec4 varianceClipping(
  const VARIANCE_SAMPLER inputBuffer,
  const VARIANCE_SAMPLER_COORD coord,
  const vec4 current,
  const vec4 history
) {
  return varianceClipping(inputBuffer, coord, current, history, 1.0);
}

vec4 varianceClipping(
  const sampler2D inputBuffer,
  const vec2 coord,
  const vec4 current,
  const vec4 history,
  const float gamma
) {
  vec4 moment1 = current;
  vec4 moment2 = current * current;
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 8; ++i) {
    #if UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
    neighbor = textureOffset(inputBuffer, coord, varianceOffsets[i]);
    moment1 += neighbor;
    moment2 += neighbor * neighbor;
    #endif // UNROLLED_LOOP_INDEX < VARIANCE_OFFSET_COUNT
  }
  #pragma unroll_loop_end

  const float N = float(VARIANCE_OFFSET_COUNT + 1);
  vec4 mean = moment1 / N;
  vec4 varianceGamma = sqrt(max(moment2 / N - mean * mean, 0.0)) * gamma;
  vec4 minColor = mean - varianceGamma;
  vec4 maxColor = mean + varianceGamma;
  return clipAABB(clamp(mean, minColor, maxColor), history, minColor, maxColor);
}

vec4 varianceClipping(
  const sampler2D inputBuffer,
  const vec2 coord,
  const vec4 current,
  const vec4 history
) {
  return varianceClipping(inputBuffer, coord, current, history, 1.0);
}
`,_h=Object.defineProperty,Xs=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&_h(e,r,a),a},Lr=class extends Bn{constructor({colorBuffer:e=null,depthVelocityBuffer:r=null,shadowLengthBuffer:i=null,colorHistoryBuffer:a=null,shadowLengthHistoryBuffer:s=null}={}){super({name:"CloudsResolveMaterial",glslVersion:yi,vertexShader:Ih,fragmentShader:_t(Be(Rh,{core:{turbo:mn},catmullRomSampling:Dh,varianceClipping:Ys})),uniforms:{colorBuffer:new g(e),depthVelocityBuffer:new g(r),shadowLengthBuffer:new g(i),colorHistoryBuffer:new g(a),shadowLengthHistoryBuffer:new g(s),texelSize:new g(new se),frame:new g(0),jitterOffset:new g(new se),varianceGamma:new g(2),temporalAlpha:new g(.1)}}),this.temporalUpscale=!0,this.shadowLength=!0}setSize(e,r){this.uniforms.texelSize.value.set(1/e,1/r)}onBeforeRender(e,r,i,a,s,o){let u=this.uniforms.frame.value%16,d=ks[u],p=(d.x-.5)*4,A=(d.y-.5)*4;this.uniforms.jitterOffset.value.set(p,A)}};Xs([H("TEMPORAL_UPSCALE")],Lr.prototype,"temporalUpscale");Xs([H("SHADOW_LENGTH")],Lr.prototype,"shadowLength");var xi=class extends cr{constructor(e,r){super(e),this._mainCamera=new Bs;let{shadow:i}=r;this.shadow=i}get mainCamera(){return this._mainCamera}set mainCamera(e){this._mainCamera=e}};function In(t,{depthVelocity:e,shadowLength:r}){let i=new nh(1,1,{depthBuffer:!1,type:Fs});i.texture.minFilter=Ti,i.texture.magFilter=Ti,i.texture.name=t;let a;e&&(a=i.texture.clone(),a.isRenderTargetTexture=!0,i.depthVelocity=a,i.textures.push(a));let s;return r&&(s=i.texture.clone(),s.isRenderTargetTexture=!0,s.format=ah,i.shadowLength=s,i.textures.push(s)),Object.assign(i,{depthVelocity:a??null,shadowLength:s??null})}var Un=class extends xi{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i,...a},s){super("CloudsPass",a),this.atmosphere=s,this.width=0,this.height=0,this.currentMaterial=new Te({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i},s),this.currentPass=new ur(this.currentMaterial),this.resolveMaterial=new Lr,this.resolvePass=new ur(this.resolveMaterial),this.initRenderTargets({depthVelocity:!0,shadowLength:O.lightShafts})}copyCameraSettings(e){this.currentMaterial.copyCameraSettings(e)}initialize(e,r,i){this.currentPass.initialize(e,r,i),this.resolvePass.initialize(e,r,i)}initRenderTargets(e){this.currentRenderTarget?.dispose(),this.resolveRenderTarget?.dispose(),this.historyRenderTarget?.dispose();let r=In("Clouds",e),i=In("Clouds.A",{...e,depthVelocity:!1}),a=In("Clouds.B",{...e,depthVelocity:!1});this.currentRenderTarget=r,this.resolveRenderTarget=i,this.historyRenderTarget=a;let s=this.resolveMaterial.uniforms;s.colorBuffer.value=r.texture,s.depthVelocityBuffer.value=r.depthVelocity,s.shadowLengthBuffer.value=r.shadowLength,s.colorHistoryBuffer.value=a.texture,s.shadowLengthHistoryBuffer.value=a.shadowLength}copyShadow(){let e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){let a=e.cascades[i];r.shadowIntervals.value[i].copy(a.interval),r.shadowMatrices.value[i].copy(a.matrix)}r.shadowFar.value=e.far}copyReprojection(){this.currentMaterial.copyReprojectionMatrix(this.mainCamera)}swapBuffers(){let e=this.historyRenderTarget,r=this.resolveRenderTarget;this.resolveRenderTarget=e,this.historyRenderTarget=r;let i=this.resolveMaterial.uniforms;i.colorHistoryBuffer.value=r.texture,i.shadowLengthHistoryBuffer.value=r.shadowLength}update(e,r,i){this.currentMaterial.uniforms.frame.value=r,this.resolveMaterial.uniforms.frame.value=r,this.copyCameraSettings(this.mainCamera),this.copyShadow(),this.currentPass.render(e,null,this.currentRenderTarget),this.resolvePass.render(e,null,this.resolveRenderTarget),this.copyReprojection(),this.swapBuffers()}setSize(e,r){if(this.width=e,this.height=r,this.temporalUpscale){let i=Math.ceil(e/4),a=Math.ceil(r/4);this.currentRenderTarget.setSize(i,a),this.currentMaterial.setSize(i*4,a*4,e,r)}else this.currentRenderTarget.setSize(e,r),this.currentMaterial.setSize(e,r);this.resolveRenderTarget.setSize(e,r),this.resolveMaterial.setSize(e,r),this.historyRenderTarget.setSize(e,r)}setShadowSize(e,r,i){this.currentMaterial.shadowCascadeCount=i,this.currentMaterial.setShadowSize(e,r)}setDepthTexture(e,r){this.currentMaterial.depthBuffer=e,this.currentMaterial.depthPacking=r??0}get outputBuffer(){return this.historyRenderTarget.texture}get shadowBuffer(){return this.currentMaterial.uniforms.shadowBuffer.value}set shadowBuffer(e){this.currentMaterial.uniforms.shadowBuffer.value=e}get shadowLengthBuffer(){return this.historyRenderTarget.shadowLength}get temporalUpscale(){return this.currentMaterial.temporalUpscale}set temporalUpscale(e){e!==this.temporalUpscale&&(this.currentMaterial.temporalUpscale=e,this.resolveMaterial.temporalUpscale=e,this.setSize(this.width,this.height))}get lightShafts(){return this.currentMaterial.shadowLength}set lightShafts(e){e!==this.lightShafts&&(this.currentMaterial.shadowLength=e,this.resolveMaterial.shadowLength=e,this.initRenderTargets({depthVelocity:!0,shadowLength:e}),this.setSize(this.width,this.height))}};function Mh(t,e){let r=t.properties.get(e.texture).__webglTexture,i=t.getContext();Tt(i instanceof WebGL2RenderingContext),t.setRenderTarget(e);let a=[];if(r!=null)for(let s=0;s<e.depth;++s)i.framebufferTextureLayer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+s,r,0,s),a.push(i.COLOR_ATTACHMENT0+s);i.drawBuffers(a)}var Ei=class extends ur{render(e,r,i,a,s){let o=this.fullscreenMaterial.uniforms;r!==null&&o?.[this.input]!=null&&(o[this.input].value=r.texture),Mh(e,i),e.render(this.scene,this.camera)}},Ph=`precision highp float;
precision highp sampler3D;

#include <common>

#include "core/math"
#include "core/raySphereIntersection"
#include "types"
#include "parameters"
#include "structuredSampling"
#include "clouds"

uniform mat4 inverseShadowMatrices[CASCADE_COUNT];
uniform mat4 reprojectionMatrices[CASCADE_COUNT];

// Primary raymarch
uniform int maxIterationCount;
uniform float minStepSize;
uniform float maxStepSize;
uniform float opticalDepthTailScale;

in vec2 vUv;

layout(location = 0) out vec4 outputColor[CASCADE_COUNT];

// Redundant notation for prettier.
#if CASCADE_COUNT == 1
layout(location = 1) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 2
layout(location = 2) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 3
layout(location = 3) out vec3 outputDepthVelocity[CASCADE_COUNT];
#elif CASCADE_COUNT == 4
layout(location = 4) out vec3 outputDepthVelocity[CASCADE_COUNT];
#endif // CASCADE_COUNT

vec4 marchClouds(
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float maxRayDistance,
  const float jitter,
  const float mipLevel
) {
  // Setup structured volume sampling (SVS).
  // While SVS introduces spatial aliasing, it is indeed temporally stable,
  // which is important for lower-resolution shadow maps where a flickering
  // single pixel can be highly noticeable.
  vec3 normal = getStructureNormal(rayDirection, jitter);
  float rayDistance;
  float stepSize;
  intersectStructuredPlanes(
    normal,
    rayOrigin,
    rayDirection,
    clamp(maxRayDistance / float(maxIterationCount), minStepSize, maxStepSize),
    rayDistance,
    stepSize
  );

  #ifdef TEMPORAL_JITTER
  rayDistance -= stepSize * jitter;
  #endif // TEMPORAL_JITTER

  float extinctionSum = 0.0;
  float maxOpticalDepth = 0.0;
  float maxOpticalDepthTail = 0.0;
  float transmittanceIntegral = 1.0;
  float weightedDistanceSum = 0.0;
  float transmittanceSum = 0.0;

  int sampleCount = 0;
  for (int i = 0; i < maxIterationCount; ++i) {
    if (rayDistance > maxRayDistance) {
      break; // Termination
    }

    vec3 position = rayDistance * rayDirection + rayOrigin;
    float height = length(position) - bottomRadius;

    #if !defined(DEBUG_MARCH_INTERVALS)
    if (insideLayerIntervals(height)) {
      rayDistance += stepSize;
      continue;
    }
    #endif // !defined(DEBUG_MARCH_INTERVALS)

    // Sample rough weather.
    vec2 uv = getGlobeUv(position);
    WeatherSample weather = sampleWeather(uv, height, mipLevel);

    if (any(greaterThan(weather.density, vec4(minDensity)))) {
      // Sample detailed participating media.
      // Note this assumes an homogeneous medium.
      MediaSample media = sampleMedia(weather, position, uv, mipLevel, jitter);
      if (media.extinction > minExtinction) {
        extinctionSum += media.extinction;
        maxOpticalDepth += media.extinction * stepSize;
        transmittanceIntegral *= exp(-media.extinction * stepSize);
        weightedDistanceSum += rayDistance * transmittanceIntegral;
        transmittanceSum += transmittanceIntegral;
        ++sampleCount;
      }
    }

    if (transmittanceIntegral <= minTransmittance) {
      // A large amount of optical depth accumulates in the tail, beyond the
      // point of minimum transmittance. The expected optical depth seems to
      // decrease exponentially with the number of samples taken before reaching
      // the minimum transmittance.
      // See the discussion here: https://x.com/shotamatsuda/status/1886259549931520437
      maxOpticalDepthTail = min(
        opticalDepthTailScale * stepSize * exp(float(1 - sampleCount)),
        stepSize * 0.5 // Excessive optical depth only introduces aliasing.
      );
      break; // Early termination
    }
    rayDistance += stepSize;
  }

  if (sampleCount == 0) {
    return vec4(maxRayDistance, 0.0, 0.0, 0.0);
  }
  float frontDepth = min(weightedDistanceSum / transmittanceSum, maxRayDistance);
  float meanExtinction = extinctionSum / float(sampleCount);
  return vec4(frontDepth, meanExtinction, maxOpticalDepth, maxOpticalDepthTail);
}

void getRayNearFar(
  const vec3 sunPosition,
  const vec3 rayDirection,
  out float rayNear,
  out float rayFar
) {
  vec4 firstIntersections = raySphereFirstIntersection(
    sunPosition,
    rayDirection,
    vec3(0.0),
    bottomRadius + vec4(shadowTopHeight, shadowBottomHeight, 0.0, 0.0)
  );
  rayNear = max(0.0, firstIntersections.x);
  rayFar = firstIntersections.y;
  if (rayFar < 0.0) {
    rayFar = 1e6;
  }
}

void cascade(
  const int cascadeIndex,
  const float mipLevel,
  out vec4 outputColor,
  out vec3 outputDepthVelocity
) {
  vec2 clip = vUv * 2.0 - 1.0;
  vec4 point = inverseShadowMatrices[cascadeIndex] * vec4(clip.xy, -1.0, 1.0);
  point /= point.w;
  vec3 sunPosition = (worldToECEFMatrix * vec4(point.xyz, 1.0)).xyz + altitudeCorrection;

  vec3 rayDirection = normalize(-sunDirection);
  float rayNear;
  float rayFar;
  getRayNearFar(sunPosition, rayDirection, rayNear, rayFar);

  vec3 rayOrigin = rayNear * rayDirection + sunPosition;
  float stbn = getSTBN();
  vec4 color = marchClouds(rayOrigin, rayDirection, rayFar - rayNear, stbn, mipLevel);
  outputColor = color;

  // Velocity for temporal resolution.
  #ifdef TEMPORAL_PASS
  vec3 frontPosition = color.x * rayDirection + rayOrigin;
  vec3 frontPositionWorld = (ecefToWorldMatrix * vec4(frontPosition - altitudeCorrection, 1.0)).xyz;
  vec4 prevClip = reprojectionMatrices[cascadeIndex] * vec4(frontPositionWorld, 1.0);
  prevClip /= prevClip.w;
  vec2 prevUv = prevClip.xy * 0.5 + 0.5;
  vec2 velocity = (vUv - prevUv) * resolution;
  outputDepthVelocity = vec3(color.x, velocity);
  #else // TEMPORAL_PASS
  outputDepthVelocity = vec3(0.0);
  #endif // TEMPORAL_PASS
}

// TODO: Calculate from the main camera frustum perhaps?
const float mipLevels[4] = float[4](0.0, 0.5, 1.0, 2.0);

void main() {
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < CASCADE_COUNT
    cascade(UNROLLED_LOOP_INDEX, mipLevels[i], outputColor[i], outputDepthVelocity[i]);
    #endif // UNROLLED_LOOP_INDEX < CASCADE_COUNT
  }
  #pragma unroll_loop_end
}
`,Nh=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,bh=`// Implements Structured Volume Sampling in fragment shader:
// https://github.com/huwb/volsample
// Implementation reference:
// https://www.shadertoy.com/view/ttVfDc

void getIcosahedralVertices(const vec3 direction, out vec3 v1, out vec3 v2, out vec3 v3) {
  // Normalization scalers to fit dodecahedron to unit sphere.
  const float a = 0.85065080835204; // phi / sqrt(2 + phi)
  const float b = 0.5257311121191336; // 1 / sqrt(2 + phi)

  // Derive the vertices of icosahedron where triangle intersects the direction.
  // See: https://www.ppsloan.org/publications/AmbientDice.pdf
  const float kT = 0.6180339887498948; // 1 / phi
  const float kT2 = 0.38196601125010515; // 1 / phi^2
  vec3 absD = abs(direction);
  float selector1 = dot(absD, vec3(1.0, kT2, -kT));
  float selector2 = dot(absD, vec3(-kT, 1.0, kT2));
  float selector3 = dot(absD, vec3(kT2, -kT, 1.0));
  v1 = selector1 > 0.0 ? vec3(a, b, 0.0) : vec3(-b, 0.0, a);
  v2 = selector2 > 0.0 ? vec3(0.0, a, b) : vec3(a, -b, 0.0);
  v3 = selector3 > 0.0 ? vec3(b, 0.0, a) : vec3(0.0, a, -b);
  vec3 octantSign = sign(direction);
  v1 *= octantSign;
  v2 *= octantSign;
  v3 *= octantSign;
}

void swapIfBigger(inout vec4 a, inout vec4 b) {
  if (a.w > b.w) {
    vec4 t = a;
    a = b;
    b = t;
  }
}

void sortVertices(inout vec3 a, inout vec3 b, inout vec3 c) {
  const vec3 base = vec3(0.5, 0.5, 1.0);
  vec4 aw = vec4(a, dot(a, base));
  vec4 bw = vec4(b, dot(b, base));
  vec4 cw = vec4(c, dot(c, base));
  swapIfBigger(aw, bw);
  swapIfBigger(bw, cw);
  swapIfBigger(aw, bw);
  a = aw.xyz;
  b = bw.xyz;
  c = cw.xyz;
}

vec3 getPentagonalWeights(const vec3 direction, const vec3 v1, const vec3 v2, const vec3 v3) {
  float d1 = dot(v1, direction);
  float d2 = dot(v2, direction);
  float d3 = dot(v3, direction);
  vec3 w = exp(vec3(d1, d2, d3) * 40.0);
  return w / (w.x + w.y + w.z);
}

vec3 getStructureNormal(
  const vec3 direction,
  const float jitter,
  out vec3 a,
  out vec3 b,
  out vec3 c,
  out vec3 weights
) {
  getIcosahedralVertices(direction, a, b, c);
  sortVertices(a, b, c);
  weights = getPentagonalWeights(direction, a, b, c);
  return jitter < weights.x
    ? a
    : jitter < weights.x + weights.y
      ? b
      : c;
}

vec3 getStructureNormal(const vec3 direction, const float jitter) {
  vec3 a, b, c, weights;
  return getStructureNormal(direction, jitter, a, b, c, weights);
}

// Reference: https://github.com/huwb/volsample/blob/master/src/unity/Assets/Shaders/RayMarchCore.cginc
void intersectStructuredPlanes(
  const vec3 normal,
  const vec3 rayOrigin,
  const vec3 rayDirection,
  const float samplePeriod,
  out float stepOffset,
  out float stepSize
) {
  float NoD = dot(rayDirection, normal);
  stepSize = samplePeriod / abs(NoD);

  // Skips leftover bit to get from rayOrigin to first strata plane.
  stepOffset = -mod(dot(rayOrigin, normal), samplePeriod) / NoD;

  // mod() gives different results depending on if the arg is negative or
  // positive. This line makes it consistent, and ensures the first sample is in
  // front of the viewer.
  if (stepOffset < 0.0) {
    stepOffset += stepSize;
  }
}
`,Oh=Object.defineProperty,tr=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Oh(e,r,a),a},dt=class extends Bn{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i}){super({name:"ShadowMaterial",glslVersion:yi,vertexShader:Nh,fragmentShader:_t(Be(Ph,{core:{math:Vt,raySphereIntersection:Yt},types:On,parameters:Vs,structuredSampling:bh,clouds:Ws})),uniforms:{...e,...r,...i,inverseShadowMatrices:new g(Array.from({length:4},()=>new ce)),reprojectionMatrices:new g(Array.from({length:4},()=>new ce)),resolution:new g(new se),frame:new g(0),stbnTexture:new g(null),maxIterationCount:new g(O.shadow.maxIterationCount),minStepSize:new g(O.shadow.minStepSize),maxStepSize:new g(O.shadow.maxStepSize),minDensity:new g(O.shadow.minDensity),minExtinction:new g(O.shadow.minExtinction),minTransmittance:new g(O.shadow.minTransmittance),opticalDepthTailScale:new g(2)},defines:{SHADOW:"1",TEMPORAL_PASS:"1",TEMPORAL_JITTER:"1"}}),this.localWeatherChannels="rgba",this.cascadeCount=O.shadow.cascadeCount,this.temporalPass=!0,this.temporalJitter=!0,this.shapeDetail=O.shapeDetail,this.turbulence=O.turbulence,this.cascadeCount=O.shadow.cascadeCount}setSize(e,r){this.uniforms.resolution.value.set(e,r)}};tr([hn("LOCAL_WEATHER_CHANNELS",{validate:t=>/^[rgba]{4}$/.test(t)})],dt.prototype,"localWeatherChannels");tr([ot("CASCADE_COUNT",{min:1,max:4})],dt.prototype,"cascadeCount");tr([H("TEMPORAL_PASS")],dt.prototype,"temporalPass");tr([H("TEMPORAL_JITTER")],dt.prototype,"temporalJitter");tr([H("SHAPE_DETAIL")],dt.prototype,"shapeDetail");tr([H("TURBULENCE")],dt.prototype,"turbulence");var Uh=`precision highp float;
precision highp sampler2DArray;

#define VARIANCE_9_SAMPLES 1
#define VARIANCE_SAMPLER_ARRAY 1

#include "varianceClipping"

uniform sampler2DArray inputBuffer;
uniform sampler2DArray historyBuffer;

uniform vec2 texelSize;
uniform float varianceGamma;
uniform float temporalAlpha;

in vec2 vUv;

layout(location = 0) out vec4 outputColor[CASCADE_COUNT];

const ivec2 neighborOffsets[9] = ivec2[9](
  ivec2(-1, -1),
  ivec2(-1, 0),
  ivec2(-1, 1),
  ivec2(0, -1),
  ivec2(0, 0),
  ivec2(0, 1),
  ivec2(1, -1),
  ivec2(1, 0),
  ivec2(1, 1)
);

vec4 getClosestFragment(const ivec3 coord) {
  vec4 result = vec4(1e7, 0.0, 0.0, 0.0);
  vec4 neighbor;
  #pragma unroll_loop_start
  for (int i = 0; i < 9; ++i) {
    neighbor = texelFetchOffset(
      inputBuffer,
      coord + ivec3(0, 0, CASCADE_COUNT),
      0,
      neighborOffsets[i]
    );
    if (neighbor.r < result.r) {
      result = neighbor;
    }
  }
  #pragma unroll_loop_end
  return result;
}

void cascade(const int cascadeIndex, out vec4 outputColor) {
  ivec3 coord = ivec3(gl_FragCoord.xy, cascadeIndex);
  vec4 current = texelFetch(inputBuffer, coord, 0);

  vec4 depthVelocity = getClosestFragment(coord);
  vec2 velocity = depthVelocity.gb * texelSize;
  vec2 prevUv = vUv - velocity;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outputColor = current;
    return; // Rejection
  }

  vec4 history = texture(historyBuffer, vec3(prevUv, float(cascadeIndex)));
  vec4 clippedHistory = varianceClipping(inputBuffer, coord, current, history, varianceGamma);
  outputColor = mix(clippedHistory, current, temporalAlpha);
}

void main() {
  #pragma unroll_loop_start
  for (int i = 0; i < 4; ++i) {
    #if UNROLLED_LOOP_INDEX < CASCADE_COUNT
    cascade(UNROLLED_LOOP_INDEX, outputColor[i]);
    #endif // UNROLLED_LOOP_INDEX < CASCADE_COUNT
  }
  #pragma unroll_loop_end
}
`,Lh=`precision highp float;

layout(location = 0) in vec3 position;

out vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Bh=Object.defineProperty,Fh=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Bh(e,r,a),a},wi=class extends Bn{constructor({inputBuffer:e=null,historyBuffer:r=null}={}){super({name:"ShadowResolveMaterial",glslVersion:yi,vertexShader:Lh,fragmentShader:_t(Be(Uh,{varianceClipping:Ys})),uniforms:{inputBuffer:new g(e),historyBuffer:new g(r),texelSize:new g(new se),varianceGamma:new g(1),temporalAlpha:new g(.01)},defines:{}}),this.cascadeCount=O.shadow.cascadeCount}setSize(e,r){this.uniforms.texelSize.value.set(1/e,1/r)}};Fh([ot("CASCADE_COUNT",{min:1,max:4})],wi.prototype,"cascadeCount");function _n(t){let e=new sh(1,1,1,{depthBuffer:!1});return e.texture.type=Fs,e.texture.minFilter=Ti,e.texture.magFilter=Ti,e.texture.name=t,e}var Ln=class extends xi{constructor({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i,...a}){super("ShadowPass",a),this.width=0,this.height=0,this.currentMaterial=new dt({parameterUniforms:e,layerUniforms:r,atmosphereUniforms:i}),this.currentPass=new Ei(this.currentMaterial),this.resolveMaterial=new wi,this.resolvePass=new Ei(this.resolveMaterial),this.initRenderTargets()}initialize(e,r,i){this.currentPass.initialize(e,r,i),this.resolvePass.initialize(e,r,i)}initRenderTargets(){this.currentRenderTarget?.dispose(),this.resolveRenderTarget?.dispose(),this.historyRenderTarget?.dispose();let e=_n("Shadow"),r=this.temporalPass?_n("Shadow.A"):null,i=this.temporalPass?_n("Shadow.B"):null;this.currentRenderTarget=e,this.resolveRenderTarget=r,this.historyRenderTarget=i;let a=this.resolveMaterial.uniforms;a.inputBuffer.value=e.texture,a.historyBuffer.value=i?.texture??null}copyShadow(){let e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){let a=e.cascades[i];r.inverseShadowMatrices.value[i].copy(a.inverseMatrix)}}copyReprojection(){let e=this.shadow,r=this.currentMaterial.uniforms;for(let i=0;i<e.cascadeCount;++i){let a=e.cascades[i];r.reprojectionMatrices.value[i].copy(a.matrix)}}swapBuffers(){Tt(this.historyRenderTarget!=null),Tt(this.resolveRenderTarget!=null);let e=this.historyRenderTarget,r=this.resolveRenderTarget;this.resolveRenderTarget=e,this.historyRenderTarget=r,this.resolveMaterial.uniforms.historyBuffer.value=r.texture}update(e,r,i){this.currentMaterial.uniforms.frame.value=r,this.copyShadow(),this.currentPass.render(e,null,this.currentRenderTarget),this.temporalPass&&(Tt(this.resolveRenderTarget!=null),this.resolvePass.render(e,null,this.resolveRenderTarget),this.copyReprojection(),this.swapBuffers())}setSize(e,r,i=this.shadow.cascadeCount){this.width=e,this.height=r,this.currentMaterial.cascadeCount=i,this.resolveMaterial.cascadeCount=i,this.currentMaterial.setSize(e,r),this.resolveMaterial.setSize(e,r),this.currentRenderTarget.setSize(e,r,this.temporalPass?i*2:i),this.resolveRenderTarget?.setSize(e,r,i),this.historyRenderTarget?.setSize(e,r,i)}get outputBuffer(){return this.temporalPass?(Tt(this.historyRenderTarget!=null),this.historyRenderTarget.texture):this.currentRenderTarget.texture}get temporalPass(){return this.currentMaterial.temporalPass}set temporalPass(e){e!==this.temporalPass&&(this.currentMaterial.temporalPass=e,this.initRenderTargets(),this.setSize(this.width,this.height))}};function Hh(t){return{scatteringCoefficient:new g(1),absorptionCoefficient:new g(0),coverage:new g(.3),localWeatherTexture:new g(t.localWeatherTexture),localWeatherRepeat:new g(t.localWeatherRepeat),localWeatherOffset:new g(t.localWeatherOffset),shapeTexture:new g(t.shapeTexture),shapeRepeat:new g(t.shapeRepeat),shapeOffset:new g(t.shapeOffset),shapeDetailTexture:new g(t.shapeDetailTexture),shapeDetailRepeat:new g(t.shapeDetailRepeat),shapeDetailOffset:new g(t.shapeDetailOffset),turbulenceTexture:new g(t.turbulenceTexture),turbulenceRepeat:new g(t.turbulenceRepeat),turbulenceDisplacement:new g(350)}}function Gh(){return{minLayerHeights:new g(new Re),maxLayerHeights:new g(new Re),minIntervalHeights:new g(new ae),maxIntervalHeights:new g(new ae),densityScales:new g(new Re),shapeAmounts:new g(new Re),shapeDetailAmounts:new g(new Re),weatherExponents:new g(new Re),shapeAlteringBiases:new g(new Re),coverageFilterWidths:new g(new Re),minHeight:new g(0),maxHeight:new g(0),shadowTopHeight:new g(0),shadowBottomHeight:new g(0),shadowLayerMask:new g(new Re),densityProfile:new g({expTerms:new Re,exponents:new Re,linearTerms:new Re,constantTerms:new Re})}}var Mn=[0,0,0,0];function zh(t,e){e.packValues("altitude",t.minLayerHeights.value),e.packSums("altitude","height",t.maxLayerHeights.value),e.packIntervalHeights(t.minIntervalHeights.value,t.maxIntervalHeights.value),e.packValues("densityScale",t.densityScales.value),e.packValues("shapeAmount",t.shapeAmounts.value),e.packValues("shapeDetailAmount",t.shapeDetailAmounts.value),e.packValues("weatherExponent",t.weatherExponents.value),e.packValues("shapeAlteringBias",t.shapeAlteringBiases.value),e.packValues("coverageFilterWidth",t.coverageFilterWidths.value);let r=t.densityProfile.value;e.packDensityProfiles("expTerm",r.expTerms),e.packDensityProfiles("exponent",r.exponents),e.packDensityProfiles("linearTerm",r.linearTerms),e.packDensityProfiles("constantTerm",r.constantTerms);let i=1/0,a=0,s=1/0,o=0;Mn.fill(0);for(let u=0;u<e.length;++u){let{altitude:d,height:p,shadow:A}=e[u],S=d+p;p>0&&(d<i&&(i=d),A&&d<s&&(s=d),S>a&&(a=S),A&&S>o&&(o=S)),Mn[u]=A?1:0}i!==1/0?(t.minHeight.value=i,t.maxHeight.value=a):(Tt(a===0),t.minHeight.value=0),s!==1/0?(t.shadowBottomHeight.value=s,t.shadowTopHeight.value=o):(Tt(o===0),t.shadowBottomHeight.value=0),t.shadowLayerMask.value.fromArray(Mn)}function kh(t,e){return{bottomRadius:new g(t.bottomRadius),topRadius:new g(t.topRadius),worldToECEFMatrix:new g(e.worldToECEFMatrix),ecefToWorldMatrix:new g(e.ecefToWorldMatrix),altitudeCorrection:new g(e.altitudeCorrection),sunDirection:new g(e.sunDirection)}}var Wh=`uniform sampler2D cloudsBuffer;

void mainImage(const vec4 inputColor, const vec2 uv, out vec4 outputColor) {
  #ifdef SKIP_RENDERING
  outputColor = inputColor;
  #else // SKIP_RENDERING
  vec4 clouds = texture(cloudsBuffer, uv);
  outputColor.rgb = inputColor.rgb * (1.0 - clouds.a) + clouds.rgb;
  outputColor.a = inputColor.a * (1.0 - clouds.a) + clouds.a;
  #endif // SKIP_RENDERING
}
`,Vh=Object.defineProperty,Yh=(t,e,r,i)=>{for(var a=void 0,s=t.length-1,o;s>=0;s--)(o=t[s])&&(a=o(e,r,a)||a);return a&&Vh(e,r,a),a},Or=new ae,Xh=new se,Qh=new ch,Zh=["maxIterationCount","minStepSize","maxStepSize","maxRayDistance","perspectiveStepScale","minDensity","minExtinction","minTransmittance","maxIterationCountToSun","maxIterationCountToGround","minSecondaryStepSize","secondaryStepScale","maxShadowFilterRadius","maxShadowLengthIterationCount","minShadowLengthStepSize","maxShadowLengthRayDistance","hazeDensityScale","hazeExponent","hazeScatteringCoefficient","hazeAbsorptionCoefficient"],Kh=["multiScatteringOctaves","accurateSunSkyLight","accuratePhaseFunction"],jh=["maxIterationCount","minStepSize","maxStepSize","minDensity","minExtinction","minTransmittance","opticalDepthTailScale"],qh=["temporalJitter"],Jh=["temporalPass"],$h=["cascadeCount","mapSize","maxFar","farScale","splitMode","splitLambda"],ut={type:"change"},Qs={resolutionScale:O.resolutionScale,width:Vr.AUTO_SIZE,height:Vr.AUTO_SIZE},Br=class extends Yr{constructor(e=new Bs,r,i=Pt.DEFAULT){super("CloudsEffect",Wh,{attributes:lr.DEPTH,uniforms:new Map([["cloudsBuffer",new g(null)]])}),this.camera=e,this.atmosphere=i,this.cloudLayers=zs.DEFAULT.clone(),this.correctAltitude=!0,this.localWeatherRepeat=new se().setScalar(100),this.localWeatherOffset=new se,this.shapeRepeat=new ae().setScalar(3e-4),this.shapeOffset=new ae,this.shapeDetailRepeat=new ae().setScalar(.006),this.shapeDetailOffset=new ae,this.turbulenceRepeat=new se().setScalar(20),this.worldToECEFMatrix=new ce,this.ecefToWorldMatrix=new ce,this.altitudeCorrection=new ae,this.sunDirection=new ae,this.localWeatherVelocity=new se,this.shapeVelocity=new ae,this.shapeDetailVelocity=new ae,this._atmosphereOverlay=null,this._atmosphereShadow=null,this._atmosphereShadowLength=null,this.events=new oh,this.frame=0,this.shadowCascadeCount=0,this.shadowMapSize=new se,this.onResolutionChange=()=>{this.setSize(this.resolution.baseWidth,this.resolution.baseHeight)},this.skipRendering=!0;let{resolutionScale:a,width:s,height:o,resolutionX:u=s,resolutionY:d=o}={...Qs,...r};this.shadowMaps=new bn({cascadeCount:O.shadow.cascadeCount,mapSize:O.shadow.mapSize,splitLambda:.6}),this.parameterUniforms=Hh({localWeatherTexture:this.proceduralLocalWeather?.texture??null,localWeatherRepeat:this.localWeatherRepeat,localWeatherOffset:this.localWeatherOffset,shapeTexture:this.proceduralShape?.texture??null,shapeRepeat:this.shapeRepeat,shapeOffset:this.shapeOffset,shapeDetailTexture:this.proceduralShapeDetail?.texture??null,shapeDetailRepeat:this.shapeDetailRepeat,shapeDetailOffset:this.shapeDetailOffset,turbulenceTexture:this.proceduralTurbulence?.texture??null,turbulenceRepeat:this.turbulenceRepeat}),this.layerUniforms=Gh(),this.atmosphereUniforms=kh(i,{worldToECEFMatrix:this.worldToECEFMatrix,ecefToWorldMatrix:this.ecefToWorldMatrix,altitudeCorrection:this.altitudeCorrection,sunDirection:this.sunDirection});let p={shadow:this.shadowMaps,parameterUniforms:this.parameterUniforms,layerUniforms:this.layerUniforms,atmosphereUniforms:this.atmosphereUniforms};this.shadowPass=new Ln(p),this.shadowPass.mainCamera=e,this.cloudsPass=new Un(p,i),this.cloudsPass.mainCamera=e,this.clouds=dn(fn({},this.cloudsPass.currentMaterial,Zh),this.cloudsPass.currentMaterial,Kh),this.shadow=dn(fn({},this.shadowPass.currentMaterial,jh),this.shadowPass.currentMaterial,qh,this.shadowPass,Jh,this.shadowMaps,$h),this.resolution=new Vr(this,u,d,a),this.resolution.addEventListener("change",this.onResolutionChange)}get mainCamera(){return this.camera}set mainCamera(e){this.camera=e,this.shadowPass.mainCamera=e,this.cloudsPass.mainCamera=e}initialize(e,r,i){this.shadowPass.initialize(e,r,i),this.cloudsPass.initialize(e,r,i)}updateSharedUniforms(e){zh(this.layerUniforms,this.cloudLayers);let{parameterUniforms:r}=this;r.localWeatherOffset.value.add(Xh.copy(this.localWeatherVelocity).multiplyScalar(e)),r.shapeOffset.value.add(Or.copy(this.shapeVelocity).multiplyScalar(e)),r.shapeDetailOffset.value.add(Or.copy(this.shapeDetailVelocity).multiplyScalar(e));let i=this.worldToECEFMatrix;this.ecefToWorldMatrix.copy(i).invert();let a=this.camera.getWorldPosition(Or).applyMatrix4(this.worldToECEFMatrix),s=this.altitudeCorrection;this.correctAltitude?Kt(a,this.atmosphere.bottomRadius,this.ellipsoid,s):s.setScalar(0);let o=this.ellipsoid.getSurfaceNormal(a,Or),u=this.sunDirection.dot(o),d=un(1e6,1e3,u),p=Qh.setFromMatrix4(i).transpose();this.shadowMaps.update(this.camera,Or.copy(this.sunDirection).applyMatrix3(p),d)}updateWeatherTextureChannels(){let e=this.cloudLayers.localWeatherChannels;this.cloudsPass.currentMaterial.localWeatherChannels=e,this.shadowPass.currentMaterial.localWeatherChannels=e}updateAtmosphereComposition(){let{shadowMaps:e,shadowPass:r,cloudsPass:i}=this,a=r.currentMaterial.uniforms,s=i.currentMaterial.uniforms,o=this._atmosphereOverlay,u=Object.assign(this._atmosphereOverlay??{},{map:i.outputBuffer});o!==u&&(this._atmosphereOverlay=u,ut.target=this,ut.property="atmosphereOverlay",this.events.dispatchEvent(ut));let d=this._atmosphereShadow,p=Object.assign(this._atmosphereShadow??{},{map:r.outputBuffer,mapSize:e.mapSize,cascadeCount:e.cascadeCount,intervals:s.shadowIntervals.value,matrices:s.shadowMatrices.value,inverseMatrices:a.inverseShadowMatrices.value,far:e.far,topHeight:s.shadowTopHeight.value});d!==p&&(this._atmosphereShadow=p,ut.target=this,ut.property="atmosphereShadow",this.events.dispatchEvent(ut));let A=this._atmosphereShadowLength,S=i.shadowLengthBuffer!=null?Object.assign(this._atmosphereShadowLength??{},{map:i.shadowLengthBuffer}):null;A!==S&&(this._atmosphereShadowLength=S,ut.target=this,ut.property="atmosphereShadowLength",this.events.dispatchEvent(ut))}update(e,r,i=0){let{shadowMaps:a,shadowPass:s,cloudsPass:o}=this;if(a.cascadeCount!==this.shadowCascadeCount||!a.mapSize.equals(this.shadowMapSize)){let{width:u,height:d}=a.mapSize,p=a.cascadeCount;this.shadowMapSize.set(u,d),this.shadowCascadeCount=p,s.setSize(u,d,p),o.setShadowSize(u,d,p)}this.proceduralLocalWeather?.render(e,i),this.proceduralShape?.render(e,i),this.proceduralShapeDetail?.render(e,i),this.proceduralTurbulence?.render(e,i),++this.frame,this.updateSharedUniforms(i),this.updateWeatherTextureChannels(),s.update(e,this.frame,i),o.shadowBuffer=s.outputBuffer,o.update(e,this.frame,i),this.updateAtmosphereComposition(),this.uniforms.get("cloudsBuffer").value=this.cloudsPass.outputBuffer}setSize(e,r){let{resolution:i}=this;i.setBaseSize(e,r);let{width:a,height:s}=i;this.cloudsPass.setSize(a,s)}setDepthTexture(e,r){this.shadowPass.setDepthTexture(e,r),this.cloudsPass.setDepthTexture(e,r)}set qualityPreset(e){let{clouds:r,shadow:i,...a}=Sh[e];Object.assign(this,a),Object.assign(this.clouds,r),Object.assign(this.shadow,i)}get localWeatherTexture(){return this.proceduralLocalWeather??this.parameterUniforms.localWeatherTexture.value}set localWeatherTexture(e){e instanceof Ms||e==null?(this.proceduralLocalWeather=void 0,this.parameterUniforms.localWeatherTexture.value=e):(this.proceduralLocalWeather=e,this.parameterUniforms.localWeatherTexture.value=e.texture)}get shapeTexture(){return this.proceduralShape??this.parameterUniforms.shapeTexture.value}set shapeTexture(e){e instanceof Ps||e==null?(this.proceduralShape=void 0,this.parameterUniforms.shapeTexture.value=e):(this.proceduralShape=e,this.parameterUniforms.shapeTexture.value=e.texture)}get shapeDetailTexture(){return this.proceduralShapeDetail??this.parameterUniforms.shapeDetailTexture.value}set shapeDetailTexture(e){e instanceof Ps||e==null?(this.proceduralShapeDetail=void 0,this.parameterUniforms.shapeDetailTexture.value=e):(this.proceduralShapeDetail=e,this.parameterUniforms.shapeDetailTexture.value=e.texture)}get turbulenceTexture(){return this.proceduralTurbulence??this.parameterUniforms.turbulenceTexture.value}set turbulenceTexture(e){e instanceof Ms||e==null?(this.proceduralTurbulence=void 0,this.parameterUniforms.turbulenceTexture.value=e):(this.proceduralTurbulence=e,this.parameterUniforms.turbulenceTexture.value=e.texture)}get stbnTexture(){return this.cloudsPass.currentMaterial.uniforms.stbnTexture.value}set stbnTexture(e){this.cloudsPass.currentMaterial.uniforms.stbnTexture.value=e,this.shadowPass.currentMaterial.uniforms.stbnTexture.value=e}get resolutionScale(){return this.resolution.scale}set resolutionScale(e){this.resolution.scale=e}get temporalUpscale(){return this.cloudsPass.temporalUpscale}set temporalUpscale(e){this.cloudsPass.temporalUpscale=e}get lightShafts(){return this.cloudsPass.lightShafts}set lightShafts(e){this.cloudsPass.lightShafts=e}get shapeDetail(){return this.cloudsPass.currentMaterial.shapeDetail}set shapeDetail(e){this.cloudsPass.currentMaterial.shapeDetail=e,this.shadowPass.currentMaterial.shapeDetail=e}get turbulence(){return this.cloudsPass.currentMaterial.turbulence}set turbulence(e){this.cloudsPass.currentMaterial.turbulence=e,this.shadowPass.currentMaterial.turbulence=e}get haze(){return this.cloudsPass.currentMaterial.haze}set haze(e){this.cloudsPass.currentMaterial.haze=e}get scatteringCoefficient(){return this.parameterUniforms.scatteringCoefficient.value}set scatteringCoefficient(e){this.parameterUniforms.scatteringCoefficient.value=e}get absorptionCoefficient(){return this.parameterUniforms.absorptionCoefficient.value}set absorptionCoefficient(e){this.parameterUniforms.absorptionCoefficient.value=e}get coverage(){return this.parameterUniforms.coverage.value}set coverage(e){this.parameterUniforms.coverage.value=e}get turbulenceDisplacement(){return this.parameterUniforms.turbulenceDisplacement.value}set turbulenceDisplacement(e){this.parameterUniforms.turbulenceDisplacement.value=e}get scatterAnisotropy1(){return this.cloudsPass.currentMaterial.scatterAnisotropy1}set scatterAnisotropy1(e){this.cloudsPass.currentMaterial.scatterAnisotropy1=e}get scatterAnisotropy2(){return this.cloudsPass.currentMaterial.scatterAnisotropy2}set scatterAnisotropy2(e){this.cloudsPass.currentMaterial.scatterAnisotropy2=e}get scatterAnisotropyMix(){return this.cloudsPass.currentMaterial.scatterAnisotropyMix}set scatterAnisotropyMix(e){this.cloudsPass.currentMaterial.scatterAnisotropyMix=e}get skyLightScale(){return this.cloudsPass.currentMaterial.uniforms.skyLightScale.value}set skyLightScale(e){this.cloudsPass.currentMaterial.uniforms.skyLightScale.value=e}get groundBounceScale(){return this.cloudsPass.currentMaterial.uniforms.groundBounceScale.value}set groundBounceScale(e){this.cloudsPass.currentMaterial.uniforms.groundBounceScale.value=e}get powderScale(){return this.cloudsPass.currentMaterial.uniforms.powderScale.value}set powderScale(e){this.cloudsPass.currentMaterial.uniforms.powderScale.value=e}get powderExponent(){return this.cloudsPass.currentMaterial.uniforms.powderExponent.value}set powderExponent(e){this.cloudsPass.currentMaterial.uniforms.powderExponent.value=e}get atmosphereOverlay(){return this._atmosphereOverlay}get atmosphereShadow(){return this._atmosphereShadow}get atmosphereShadowLength(){return this._atmosphereShadowLength}get irradianceTexture(){return this.cloudsPass.currentMaterial.irradianceTexture}set irradianceTexture(e){this.cloudsPass.currentMaterial.irradianceTexture=e}get scatteringTexture(){return this.cloudsPass.currentMaterial.scatteringTexture}set scatteringTexture(e){this.cloudsPass.currentMaterial.scatteringTexture=e}get transmittanceTexture(){return this.cloudsPass.currentMaterial.transmittanceTexture}set transmittanceTexture(e){this.cloudsPass.currentMaterial.transmittanceTexture=e}get singleMieScatteringTexture(){return this.cloudsPass.currentMaterial.singleMieScatteringTexture}set singleMieScatteringTexture(e){this.cloudsPass.currentMaterial.singleMieScatteringTexture=e}get higherOrderScatteringTexture(){return this.cloudsPass.currentMaterial.higherOrderScatteringTexture}set higherOrderScatteringTexture(e){this.cloudsPass.currentMaterial.higherOrderScatteringTexture=e}get ellipsoid(){return this.cloudsPass.currentMaterial.ellipsoid}set ellipsoid(e){this.cloudsPass.currentMaterial.ellipsoid=e}get sunAngularRadius(){return this.cloudsPass.currentMaterial.sunAngularRadius}set sunAngularRadius(e){this.cloudsPass.currentMaterial.sunAngularRadius=e}};Yh([H("SKIP_RENDERING")],Br.prototype,"skipRendering");var Ci="45a1c6c1bb9fd38b3680fd120795ff4c32df68ff",ed=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${Ci}/packages/clouds/assets/local_weather.png`,td=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${Ci}/packages/clouds/assets/shape.bin`,rd=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${Ci}/packages/clouds/assets/shape_detail.bin`,id=`https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/${Ci}/packages/clouds/assets/turbulence.png`;import{Camera as uT,RawShaderMaterial as hT,Uniform as dT,GLSL3 as fT,Mesh as mT,PlaneGeometry as pT,WebGL3DRenderTarget as gT,RedFormat as vT,LinearFilter as AT,RepeatWrapping as TT,NoColorSpace as ST,WebGLRenderTarget as xT,RGBAFormat as ET,LinearMipMapLinearFilter as wT}from"./three.module.js";export{Br as CloudsEffect,je as Ellipsoid,vi as PrecomputedTexturesLoader,Mt as SkyMaterial,Cs as getSunLightColor};
/*! Bundled license information:

postprocessing/build/index.js:
  (**
   * postprocessing v6.38.3 build Thu Feb 19 2026
   * https://github.com/pmndrs/postprocessing
   * Copyright 2015-2026 Raoul van Rüschen
   * @license Zlib
   *)

three/examples/jsm/libs/fflate.module.js:
  (*!
  fflate - fast JavaScript compression/decompression
  <https://101arrowz.github.io/fflate>
  Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
  version 0.8.2
  *)

@takram/three-atmosphere/build/shared.js:
  (**
      @preserve
  
      Astronomy library for JavaScript (browser and Node.js).
      https://github.com/cosinekitty/astronomy
  
      MIT License
  
      Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>
  
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:
  
      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.
  
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
  *)
  (**
   * @fileoverview Astronomy calculation library for browser scripting and Node.js.
   * @author Don Cross <cosinekitty@gmail.com>
   * @license MIT
   *)
*/
