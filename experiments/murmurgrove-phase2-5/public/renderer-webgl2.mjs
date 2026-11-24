import {renderBatches,STRIDE_FLOATS} from './geometry.mjs';
import {FRAGMENT_GLSL} from './optics-glsl.mjs';
const VS=`#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aTangent;
in vec3 aNormal;
in float aSide;
in float aWidth;
in float aAlpha;
in float aAge;
in float aActivity;
in float aRole;
in float aArc;
in float aPhase;
in float aShape;
uniform float uTime;
uniform mat4 uView;
uniform mat4 uProjection;
uniform vec2 uResolution;
uniform float uZoom;
out vec4 vData;
out vec2 vUV;
out float vShape;
out float vFresnel;
out vec3 vNormalView;
out float vPhase;
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
 vec3 opticalPosition=aPosition+tide+lifeWave;
 vec4 center=uProjection*uView*vec4(opticalPosition,1.0);
 if(aShape<.5){
  vec4 t=uProjection*uView*vec4(opticalPosition+tangent*.01,1.0);
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
 vec3 normalView=normalize(mat3(uView)*aNormal);
 vec3 viewPosition=(uView*vec4(opticalPosition,1.0)).xyz;
 vFresnel=pow(1.0-abs(dot(normalView,normalize(-viewPosition+vec3(.00001)))),1.9);
 vNormalView=normalView;
 vData=vec4(aRole,aAlpha,aAge,aActivity);
 vUV=vec2(aSide,aArc);vShape=aShape;vPhase=aPhase;
}`;
const FS=FRAGMENT_GLSL;
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const normalize=a=>{const d=Math.hypot(...a)||1;return a.map(x=>x/d);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function viewMatrix(eye,target){const z=normalize(eye.map((x,i)=>x-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),r=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*r,-1,0,0,2*far*near*r,0]);}
export class NativeWebGL2Renderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:true,premultipliedAlpha:false,depth:true});
  if(!this.gl)throw Error('WebGL2 not available');const gl=this.gl;this.p=program(gl);this.uniforms=Object.fromEntries(['uView','uProjection','uResolution','uVariant','uTime','uZoom'].map(k=>[k,gl.getUniformLocation(this.p,k)]));
  this.entries=[];this.variant='A';this.stats={fps:0,drawCalls:0,triangles:0,renderer:'Native WebGL2 fallback'};
  this.last=performance.now();this.frames=0;this.windowStart=this.last;this.running=true;
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  this.tick=this.tick.bind(this);requestAnimationFrame(this.tick);
 }
 setGeometry(data){const gl=this.gl;for(const e of this.entries){gl.deleteBuffer(e.buffer);gl.deleteVertexArray(e.vao);}this.entries=[];
  this.variant=data.variant;for(const batch of renderBatches(data)){const values=batch.vertices,vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);
   const names=['aPosition','aTangent','aNormal','aSide','aWidth','aAlpha','aAge','aActivity','aRole','aArc','aPhase','aShape'];
   let offset=0;for(const [i,name] of names.entries()){
    const size=i<3?3:1,loc=gl.getAttribLocation(this.p,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,STRIDE_FLOATS*4,offset*4);}offset+=size;
   }
   gl.bindVertexArray(null);
   this.entries.push({buffer,vao,count:values.length/STRIDE_FLOATS,center:batch.center,solid:batch.solid});
  }
 }
 setCamera(camera){this.camera=camera;}
 tick(now){if(!this.running)return;this.draw(now);requestAnimationFrame(this.tick);}
 draw(now){const gl=this.gl,canvas=this.canvas,dpr=Math.min(window.devicePixelRatio||1,1.7);
  const w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.depthMask(true);gl.clearColor(.952,.956,.944,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(!this.camera)return;
  const cam=this.camera,dist=3.5/cam.zoom,eye=[cam.target[0]+Math.sin(cam.azimuth)*Math.cos(cam.elevation)*dist,
   cam.target[1]+Math.sin(cam.elevation)*dist,cam.target[2]+Math.cos(cam.azimuth)*Math.cos(cam.elevation)*dist];
  const forward=normalize(cam.target.map((v,i)=>v-eye[i]));
  // Phase 2.5: pre-fill the depth buffer with every solid epidermal face,
  // then draw fog through its depth test and shade only the nearest skin.
  // No translucent front/back wall stacking, including within the same tube.
  const ordered=[...this.entries].sort((a,b)=>dot(b.center.map((v,i)=>v-eye[i]),forward)-dot(a.center.map((v,i)=>v-eye[i]),forward));
  const solids=ordered.filter(e=>e.solid),opticals=ordered.filter(e=>!e.solid);
  gl.useProgram(this.p);gl.uniformMatrix4fv(this.uniforms.uView,false,viewMatrix(eye,cam.target));
  gl.uniformMatrix4fv(this.uniforms.uProjection,false,perspective(Math.PI/3,w/h,.012,80));
  gl.uniform2f(this.uniforms.uResolution,w,h);gl.uniform1i(this.uniforms.uVariant,{A:0,B:1,C:2}[this.variant]);
  gl.uniform1f(this.uniforms.uTime,Date.now()/1000);gl.uniform1f(this.uniforms.uZoom,cam.zoom);
  let triangles=0,drawCalls=0;
  const paint=e=>{gl.bindVertexArray(e.vao);gl.drawArrays(gl.TRIANGLES,0,e.count);triangles+=e.count/3;drawCalls++;};
  // Fail-safe two-layer composition. Draw atmosphere first, then the solid
  // epidermis with regular depth testing. The previous hidden-depth + EQUAL
  // pass could leave the entire organism invisible on some WebGL2 drivers.
  // This path never requires color pixels to exactly equal a depth pre-pass.
  gl.colorMask(true,true,true,true);
  gl.enable(gl.BLEND);
  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  for(const e of opticals)paint(e);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  for(const e of solids)paint(e);
  gl.depthMask(false);
  gl.bindVertexArray(null);
  this.frames++;if(now-this.windowStart>900){this.stats={fps:Number((this.frames*1000/(now-this.windowStart)).toFixed(1)),drawCalls,
   triangles,renderer:'Native WebGL2 fallback',width:w,height:h,zoom:cam.zoom};this.windowStart=now;this.frames=0;
   window.dispatchEvent(new CustomEvent('murmurgrove:frame',{detail:this.stats}));}
 }
 dispose(){this.running=false;for(const e of this.entries){this.gl.deleteBuffer(e.buffer);this.gl.deleteVertexArray(e.vao);}this.gl.deleteProgram(this.p);}
}
