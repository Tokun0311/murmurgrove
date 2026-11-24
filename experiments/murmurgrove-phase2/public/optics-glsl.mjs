/** Shared Phase 2.4 fragment law for native WebGL2 and Three.js GL3.
 * The fog is an optical sampling of archived positions, never an archive edge.
 */
export const FRAGMENT_GLSL=`#version 300 es
precision highp float;
in vec4 vData;
in vec2 vUV;
in float vShape;
in float vFresnel;
uniform int uVariant;
uniform float uTime;
out vec4 outColor;
void main(){
 float role=vData.x,age=vData.z,activity=vData.w;
 if(vShape>.5&&vShape<1.5&&!gl_FrontFacing)discard;
 float across=abs(vUV.x);
 float center=pow(max(0.0,1.0-across),1.2);
 float fade=1.0;
 float mask=1.0;
 if(vShape>1.5){
  float r=length(vUV);
  if(r>1.015)discard;
  float gaussian=exp(-3.75*r*r);
  mask=gaussian*(1.0-smoothstep(.66,1.01,r));
 }else{
  fade=smoothstep(0.0,0.08,vUV.y)*(1.0-smoothstep(0.92,1.0,vUV.y));
  if(vShape<.5)mask=pow(max(0.0,1.0-across),1.08);
  else mask=1.0-.68*pow(clamp(vFresnel,0.0,1.0),1.22);
 }
 vec3 bone=vec3(.90,.91,.88),silver=vec3(.77,.79,.78),smokeBrown=vec3(.44,.40,.36),warmClay=vec3(.66,.58,.50);
 vec3 teal=vec3(.15,.34,.36),indigo=vec3(.19,.27,.40),amber=vec3(.82,.67,.39),gold=vec3(.92,.83,.62);
 vec3 sage=vec3(.57,.69,.62),mistLilac=vec3(.66,.63,.68),pearl=vec3(.77,.76,.73);
 vec3 color=bone;float opacity=.12;
 if(role<.5){
  color=mix(bone,silver,.55);
  color=mix(color,smokeBrown,clamp(age*.30,0.0,.8));
  opacity=vShape>1.5?.12:.10;
 }else if(role<1.5){
  color=mix(teal,indigo,clamp(age*.28+activity*.16,0.0,1.0));
  opacity=(vShape>.5?.34:.25)*(0.92+.08*center);
 }else if(role<2.5){
  color=mix(smokeBrown,vec3(.50,.46,.41),.36);
  opacity=.20;
 }else if(role<3.5){
  color=mix(amber,gold,.35+.12*sin(uTime*.55+vUV.y*3.0));
  opacity=vShape>1.5?.30:.24;
  opacity*=.86+.14*sin(uTime*1.15+vUV.y*7.0);
 }else if(role<4.5){
  color=mix(teal,indigo,.52);
  opacity=vShape>1.5?.34:.28;
 }else{
  float layer=clamp(age,0.0,1.0);
  color=mix(sage,mistLilac,layer*.62);
  opacity=layer>.5?.18:.20;
 }
 if(role>-.5&&role<.5)color=mix(color,vec3(.96,.96,.94),.08);
 if(role>3.5&&role<5.5)color=mix(color,vec3(.95,.96,.94),.05);
 float approximateAO=1.0-clamp(age*.06+activity*.08,0.0,.14);
 if(role>4.5)approximateAO=1.0-clamp((1.0-age)*.06,0.0,.06);
 color*=approximateAO;
 if(uVariant==1)color=mix(color,vec3(.92,.95,.93),vShape>1.5?.06:across*.08);
 if(uVariant==2)color=mix(color,warmClay,role<.5?age*.14:0.04);
 float flow=role>2.5&&role<4.5?.74+.26*sin(uTime*1.4+vUV.y*6.5):role>.5&&role<1.5?.85+.15*sin(uTime*.95+vUV.y*14.0):role>4.5?.96+.04*sin(uTime*.4+vUV.y*3.0):1.0;
 opacity=clamp(opacity*vData.y*mask*fade*flow,0.0,.48);
 if(opacity<.001)discard;
 outColor=vec4(color,opacity);
}`;
