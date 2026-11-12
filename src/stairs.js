// Three.js rotation.y maps local +Z to (sin(r), cos(r)) in world X/Z.
export function worldToLocal(b,x,z){
 const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation),s=Math.sin(b.rotation);
 return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function stairDimensions(type){return type==='steepStairs'?{length:6*.35,drop:6*.24}:{length:5*.55,drop:5*.14};}
export function isStair(b){return b.type==='stairs'||b.type==='steepStairs';}
export function stairHeight(b,x,z){
 const p=worldToLocal(b,x,z),d=stairDimensions(b.type);
 // Exact attachment interval; epsilon only absorbs floating-point rotation error.
 if(Math.abs(p.x)>1.20||p.z< -1e-8||p.z>d.length+1e-8)return null;
 return b.mesh.position.y-d.drop*Math.max(0,Math.min(1,p.z/d.length));
}
export function stairSurfaceAt(buildings,x,z){
 let top=null;
 for(const b of buildings){if(!isStair(b))continue;const y=stairHeight(b,x,z);if(y!==null&&(top===null||y>top))top=y;}
 return top;
}
export function stairWalkHeight(buildings,from,to,feet){
 let top=null;
 for(const b of buildings){
  if(!isStair(b))continue;
  const y=stairHeight(b,to.x,to.z);if(y===null)continue;
  const old=worldToLocal(b,from.x,from.z),d=stairDimensions(b.type);
  // Enter through an end, never pull a player up through the side of a flight.
  if(Math.abs(old.x)>1.20+1e-8)continue;
  const oldHeight=b.mesh.position.y-d.drop*Math.max(0,Math.min(1,old.z/d.length));
  if(Math.abs(oldHeight-feet)>.10)continue;
  if(top===null||y>top)top=y;
 }
 return top;
}
export function stairJoinsDeck(stair,foundation,deck){
 if(Math.abs(stair.mesh.position.y-deck)>.01)return false;
 const p=worldToLocal(foundation,stair.x,stair.z);
 if(!(Math.abs(Math.abs(p.x)-1.5)<.01&&Math.abs(p.z)<=1.5 || Math.abs(Math.abs(p.z)-1.5)<.01&&Math.abs(p.x)<=1.5))return false;
 // The descending direction must lead out of the foundation.
 return (stair.x-foundation.x)*Math.sin(stair.rotation)+(stair.z-foundation.z)*Math.cos(stair.rotation)>0;
}
