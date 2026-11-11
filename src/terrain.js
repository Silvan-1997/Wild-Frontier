// Pure world geometry and river math. Keep this deterministic for saved-world compatibility.
export function riverCenter(x){
 const u=Math.max(0,Math.min(29,(x+95)/6)),i=Math.min(28,Math.floor(u)),t=u-i;
 return (Math.sin(i*.38)*(1-t)+Math.sin((i+1)*.38)*t)*13+23;
}
export function riverDistance(x,z){return Math.abs(z-riverCenter(x));}
export function inRiver(x,z,margin=0){return x>=-95-margin&&x<=79+margin&&riverDistance(x,z)<5+margin;}
export function safeResourcePosition(x,z){
 if(inRiver(x,z,2.3)){const center=riverCenter(x);z=center+(z<center?-1:1)*9;}
 return {x,z};
}
export function terrainHeight(x,z){
 const hill=Math.exp(-(((x-64)/19)**2+((z+54)/16)**2)*1.6)*8;
 const broad=2.2*Math.sin(x*.028)*Math.cos(z*.026)+1.35*Math.sin((x+z)*.039)+.85*Math.cos(z*.055);
 const detail=.38*Math.sin(x*.14)*Math.cos(z*.12);
 const riverBlend=Math.min(1,Math.max(0,(riverDistance(x,z)-5)/17));
 return (broad+detail)*(.22+.78*riverBlend)+hill;
}
