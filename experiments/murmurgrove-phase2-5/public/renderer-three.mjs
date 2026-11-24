/** Optional Three.js 0.180 WebGL2 renderer. Shares the EXACT adapter and camera state.
 * Three is an external dependency, never vendored or silently represented as local.
 */
import {renderBatches,STRIDE_FLOATS} from './geometry.mjs';
import {FRAGMENT_GLSL} from './optics-glsl.mjs';
const VERT=`precision highp float;
in vec3 aTangent;in vec3 aNormal;
in float aSide;in float aWidth;
in float aAlpha;in float aAge;in float aActivity;in float aRole;in float aArc;
in float aPhase;in float aShape;
uniform vec2 uResolution;uniform float uZoom;uniform float uTime;
out vec4 vData;out vec2 vUV;out float vShape;out float vFresnel;
out vec3 vNormalView;out float vPhase;
void main(){
 vec3 tangent=normalize(aTangent+vec3(.0001));
 vec3 side=normalize(cross(tangent,abs(tangent.y)<.95?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0)));
 vec3 up=normalize(cross(side,tangent));
 float along=aArc;
 float localPhase=dot(aPosition,vec3(2.15,-1.05,.83));
 float breathing=sin(uTime*.59+localPhase);
 float secondary=sin(uTime*.38+localPhase*.57+.7);
 // Global tide is driven by position, not a page-load reset or per-fiber
 // animation seed; source endpoints sharing a location stay visually joined.
 vec3 outward=normalize(aPosition+vec3(.17,.11,.09));
 vec3 tide=outward*((.009*breathing+.003*secondary)*(.74+.26*sin(localPhase)));
 float endEnvelope=aShape<1.5?sin(3.14159265*clamp(along,0.0,1.0)):1.0;
 float rolePulse = aRole < .5 ? .0013 : aRole < 1.5 ? .0048 : aRole < 2.5 ? .0021 : aRole < 3.5 ? .0054 : aRole < 4.5 ? .0066 : .0020;
 float waveA=sin(uTime*(aRole<3.5?1.04:.72)+along*9.2+aPhase);
 float waveB=sin(uTime*.71+along*15.6+aPhase*1.31);
 // All six sprite corners share the same center displacement. Never warp a
 // translucent Gaussian quad into two visible triangles.
 vec3 lifeWave=aShape>1.5?vec3(0.0):endEnvelope*rolePulse*(side*waveA+up*.68*waveB);
 vec3 opticalPosition=position+tide+lifeWave;
 vec4 center=projectionMatrix*modelViewMatrix*vec4(opticalPosition,1.0);
 if(aShape<.5){
  vec4 t=projectionMatrix*modelViewMatrix*vec4(opticalPosition+tangent*.01,1.0);
  vec2 d=normalize(t.xy/max(.001,t.w)-center.xy/max(.001,center.w)+vec2(.00001,.000001));
  vec2 perp=vec2(-d.y,d.x);
  float worldPixels=aWidth*min(uResolution.x,uResolution.y)*uZoom*.72;
  float px=max(1.35,worldPixels);
  center.xy+=aSide*perp*px*center.w/uResolution;
 }else if(aShape>1.5){
  float px=min(185.0,max(1.0,aWidth*min(uResolution.x,uResolution.y)*uZoom*.50));
  center.xy+=vec2(aSide,aArc)*px*2.0*center.w/uResolution;
 }
 gl_Position=center;
 vec3 normalView=normalize(mat3(modelViewMatrix)*aNormal);
 vec3 viewPosition=(modelViewMatrix*vec4(opticalPosition,1.0)).xyz;
 vFresnel=pow(1.0-abs(dot(normalView,normalize(-viewPosition+vec3(.00001)))),1.9);
 vNormalView=normalView;
 vData=vec4(aRole,aAlpha,aAge,aActivity);
 vUV=vec2(aSide,aArc);vShape=aShape;vPhase=aPhase;
}
}`;
const FRAG=FRAGMENT_GLSL.replace(/^#version 300 es\n/,'');
export async function createThreeRenderer(canvas){
 const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
 const context=canvas.getContext('webgl2',{alpha:false,antialias:true,premultipliedAlpha:false});
 if(!context)throw Error('WebGL2 unavailable');
 const renderer=new THREE.WebGLRenderer({canvas,context,alpha:false,antialias:true});renderer.setClearColor(0xf2f3ef,1);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.012,80),objects=[];
 let variant='A',running=true,camState=null,last=performance.now(),frames=0,windowStart=last;
 const uniforms={uResolution:{value:new THREE.Vector2(1,1)},uZoom:{value:1},uVariant:{value:0},uTime:{value:0}};
 function setGeometry(data){
  variant=data.variant;
  const geometries=new Set();for(const o of objects){scene.remove(o);geometries.add(o.geometry);o.material.dispose();}
  for(const g of geometries)g.dispose();objects.length=0;
  for(const batch of renderBatches(data)){
   const values=batch.vertices,n=values.length/STRIDE_FLOATS;
   const geo=new THREE.BufferGeometry();const f=(start,size)=>{const out=new Float32Array(n*size);for(let i=0;i<n;i++)for(let j=0;j<size;j++)out[i*size+j]=values[i*STRIDE_FLOATS+start+j];return out;};
   const positions=f(0,3);for(let i=0;i<positions.length;i++)positions[i]-=batch.center[i%3];
   geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
   for(const [name,start,size] of [['aTangent',3,3],['aNormal',6,3],['aSide',9,1],['aWidth',10,1],['aAlpha',11,1],['aAge',12,1],['aActivity',13,1],['aRole',14,1],['aArc',15,1],['aPhase',16,1],['aShape',17,1]])geo.setAttribute(name,new THREE.BufferAttribute(f(start,size),size));
   const common={vertexShader:VERT,fragmentShader:FRAG,glslVersion:THREE.GLSL3,
    uniforms:{uResolution:uniforms.uResolution,uZoom:uniforms.uZoom,uVariant:uniforms.uVariant,uTime:uniforms.uTime}};
   if(batch.solid){
    // Surface is drawn once using standard depth testing. A strict
    // equal-depth pre-pass could make the entire organism invisible.
    const skinMaterial=new THREE.ShaderMaterial({...common,transparent:true,depthWrite:true,
     depthTest:true,depthFunc:THREE.LessEqualDepth,side:THREE.DoubleSide});
    const skinMesh=new THREE.Mesh(geo,skinMaterial);skinMesh.position.set(...batch.center);
    skinMesh.frustumCulled=false;skinMesh.renderOrder=30;scene.add(skinMesh);objects.push(skinMesh);
   }else{
    const material=new THREE.ShaderMaterial({...common,transparent:true,depthWrite:false,
     depthTest:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,material);mesh.position.set(...batch.center);
    mesh.frustumCulled=false;mesh.renderOrder=0;scene.add(mesh);objects.push(mesh);
   }
  }
 }
 function tick(now){if(!running)return;requestAnimationFrame(tick);if(!camState)return;
  const dpr=Math.min(devicePixelRatio||1,1.7),w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
  renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  const dist=3.5/camState.zoom;camera.position.set(camState.target[0]+Math.sin(camState.azimuth)*Math.cos(camState.elevation)*dist,
   camState.target[1]+Math.sin(camState.elevation)*dist,camState.target[2]+Math.cos(camState.azimuth)*Math.cos(camState.elevation)*dist);
  camera.lookAt(...camState.target);uniforms.uResolution.value.set(w*dpr,h*dpr);uniforms.uZoom.value=camState.zoom;
  uniforms.uVariant.value={A:0,B:1,C:2}[variant];uniforms.uTime.value=Date.now()/1000;
  renderer.render(scene,camera);frames++;
  if(now-windowStart>900){window.dispatchEvent(new CustomEvent('murmurgrove:frame',{detail:{fps:Number((frames*1000/(now-windowStart)).toFixed(1)),
   drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderer:'Three.js 0.180 WebGL2',zoom:camState.zoom}}));
   frames=0;windowStart=now;}
 }
 requestAnimationFrame(tick);
 return {setGeometry,setCamera:c=>{camState=c;},dispose(){running=false;renderer.dispose();}};
}
