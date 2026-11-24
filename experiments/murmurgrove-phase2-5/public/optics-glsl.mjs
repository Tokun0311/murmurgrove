/** Phase 2.5 shared tissue fragment law.
 * Physical tube skin shades with lambertian volume and a small translucent rim.
 * Pulse/veil/deposit quads are radially isotropic Gaussian fields, no polygon rays.
 */
export const FRAGMENT_GLSL=`#version 300 es
precision highp float;
in vec4 vData;
in vec2 vUV;
in float vShape;
in float vFresnel;
in vec3 vNormalView;
in float vPhase;
uniform int uVariant;
uniform float uTime;
out vec4 outColor;
void main(){
 float role=vData.x,age=vData.z,activity=vData.w;
 bool skin=vShape>.5&&vShape<1.5;
 bool gaussian=vShape>1.5;
 // Two-sided skin remains visible even if a curved sweep reverses winding.
 // Depth testing, not face orientation, decides which epidermis is visible.
 float mask=1.0,fade=1.0;
 if(gaussian){
  float r2=dot(vUV,vUV);
  if(r2>1.04)discard;
  // Pure radial falloff, invariant under quad triangulation: no triangular rays.
  float r=sqrt(r2);
  mask=exp(-4.8*r2)*(1.0-smoothstep(.72,1.02,r));
 }else{
  fade=smoothstep(0.0,.065,vUV.y)*(1.0-smoothstep(.935,1.0,vUV.y));
  if(!skin)mask=pow(max(0.0,1.0-abs(vUV.x)),1.15);
 }
 vec3 bone=vec3(.92,.93,.90),silver=vec3(.80,.82,.80),smokeBrown=vec3(.43,.40,.38);
 vec3 teal=vec3(.13,.35,.36),indigo=vec3(.18,.28,.39),amber=vec3(.84,.68,.39),gold=vec3(.95,.82,.60);
 vec3 sage=vec3(.59,.71,.64),lilac=vec3(.69,.66,.70),pearl=vec3(.77,.78,.75);
 vec3 color=bone;float opacity=.12;
 float rim=clamp(vFresnel,0.0,1.0);
 float lambert=max(0.0,dot(normalize(vNormalView),normalize(vec3(-.38,.58,.72))));
 float clayLight=.68+.31*lambert;
 if(role<.5){
  color=mix(bone,silver,.44);
  color=mix(color,smokeBrown,clamp(age*.25,0.0,.7));
  opacity=gaussian?.12:.11;
 }else if(role<1.5){
  color=mix(teal,indigo,clamp(age*.27+activity*.10,0.0,1.0));
  opacity=skin?.96:.24;
 }else if(role<2.5){
  color=mix(smokeBrown,pearl,.12);
  opacity=skin?.88:.17;
 }else if(role<3.5){
  color=mix(amber,gold,.38);
  opacity=gaussian?.36:.20;
 }else if(role<4.5){
  color=mix(teal,indigo,.45);
  opacity=skin?.97:(gaussian?.37:.25);
 }else{
  color=mix(sage,lilac,clamp(age*.50,0.0,1.0));
  opacity=age>.5?.17:.18;
 }
 if(skin){
  // Opaque body mass, warmly shaded rather than an X-ray tube. Only the rim
  // admits a little background: the depth prepass occludes the rear wall.
  color*=clayLight;
  color=mix(color,vec3(.76,.79,.77),.15*rim);
  opacity*=1.0-.23*rim;
  float naturalAlpha=role<1.5?.82:role<2.5?.29:.88;
  opacity*=clamp(vData.y/naturalAlpha,0.0,1.0);
  opacity*=fade;
 }else{
  float biologicalGlow=role>2.5&&role<4.5?.81+.19*sin(uTime*1.06+vPhase):1.0;
  opacity*=vData.y*mask*fade*biologicalGlow;
 }
 if(role>4.5)color*=.96;
 if(uVariant==1)color=mix(color,vec3(.90,.94,.92),.035);
 if(uVariant==2&&role<.5)color=mix(color,pearl,clamp(age*.06,0.0,.10));
 if(opacity<.001)discard;
 outColor=vec4(color,clamp(opacity,0.0,.985));
}`;
