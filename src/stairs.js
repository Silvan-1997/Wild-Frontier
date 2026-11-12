// All stair coordinates use Three.js rotation.y; saved origins are upper ends.
export const PLAYER={radius:.38,eyeHeight:1.7,headOffset:.15};
export const WALL_HEIGHT=2.95;
const EPS=1e-7,CONTACT=1e-4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function worldToLocal(b,x,z){
 const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation),s=Math.sin(b.rotation);
 return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function localToWorld(b,x,z){
 return {x:b.x+x*Math.cos(b.rotation)+z*Math.sin(b.rotation),z:b.z-x*Math.sin(b.rotation)+z*Math.cos(b.rotation)};
}
export function stairDimensions(type){
 const count=type==='steepStairs'?6:5,depth=type==='steepStairs'?.35:.55,rise=type==='steepStairs'?.24:.14,treadThickness=.16;
 return {count,depth,rise,length:count*depth,drop:count*rise,halfWidth:1.25,treadThickness,thickness:Math.max(treadThickness,rise)};
}
export function isStair(b){return b.type==='stairs'||b.type==='steepStairs';}
function plane(b,z){const d=stairDimensions(b.type);return b.mesh.position.y-d.drop*clamp(z/d.length,0,1);}
export function stairEnds(b){
 const d=stairDimensions(b.type),lower=localToWorld(b,0,d.length);
 return [{x:b.x,z:b.z,y:b.mesh.position.y},{...lower,y:b.mesh.position.y-d.drop}];
}
export function stairHeight(b,x,z,footRadius=0){
 const p=worldToLocal(b,x,z),d=stairDimensions(b.type);
 const dx=Math.max(0,Math.abs(p.x)-d.halfWidth),dz=Math.max(0,-p.z,p.z-d.length);
 // Support and the solid body use the same footprint. The foot cylinder may
 // overlap an edge; there is no unsupported strip inside the visible tread.
 if(footRadius===0?(dx>EPS||dz>EPS):Math.hypot(dx,dz)>=footRadius-EPS)return null;
 return plane(b,p.z);
}
export function stairSurfaceAt(buildings,x,z){
 let top=null;
 for(const b of buildings){if(!isStair(b))continue;const y=stairHeight(b,x,z);if(y!==null&&(top===null||y>top))top=y;}
 return top;
}
// The player's leading radius reaches the first tread before its centre does.
// Join a small exposed first tread to terrain over that contact distance; the
// maximum climb is the real tread/body thickness, not a height tolerance.
function entryPlane(b,p,terrain){
 const d=stairDimensions(b.type),bottom=b.mesh.position.y-d.drop;
 if(p.z>d.length){
  const end=localToWorld(b,0,d.length),gap=bottom-terrain(end.x,end.z);
  if(gap>0&&gap<=d.thickness+EPS){
   const point=localToWorld(b,p.x,p.z),ground=terrain(point.x,point.z);
   const progress=clamp((d.length+PLAYER.radius-p.z)/PLAYER.radius,0,1);
   return ground+(bottom-ground)*progress;
  }
 }
 return plane(b,p.z);
}
function walkingHeight(b,x,z,terrain){
 if(stairHeight(b,x,z,PLAYER.radius)===null)return null;
 return entryPlane(b,worldToLocal(b,x,z),terrain);
}
function walkContact(buildings,from,to,feet,terrain){
 const hits=[];
 for(const b of buildings){
  if(!isStair(b))continue;
  const d=stairDimensions(b.type),p=worldToLocal(b,to.x,to.z),old=worldToLocal(b,from.x,from.z);
  let height=walkingHeight(b,to.x,to.z,terrain);
  if(height===null&&p.z>d.length+PLAYER.radius&&Math.abs(p.x)<d.halfWidth+PLAYER.radius-EPS&&
   old.z>=d.length&&old.z<=d.length+PLAYER.radius+EPS){
   const end=localToWorld(b,0,d.length),gap=b.mesh.position.y-d.drop-terrain(end.x,end.z);
   if(gap>0&&gap<=d.thickness+EPS)height=terrain(to.x,to.z);
  }
  if(height===null)continue;
  // Body contact starts one radius before the end, not at the centre's crossing.
  // Side entry is never a route onto the ramp, even at similar heights.
  if(Math.abs(old.x)>=d.halfWidth+PLAYER.radius-EPS)continue;
  const oldY=entryPlane(b,old,terrain),oldFloor=Math.max(oldY,terrain(from.x,from.z));
  const crossingEnd=(old.z<0&&p.z>=-EPS||old.z>d.length&&p.z<=d.length+EPS);
  const connected=crossingEnd&&buildings.some(other=>{
   if(other===b||!isStair(other)||!commonEnd(other,b))return false;
   const h=walkingHeight(other,from.x,from.z,terrain);
   return h!==null&&Math.abs(Math.max(h,terrain(from.x,from.z))-feet)<=CONTACT;
  });
  if(Math.abs(oldFloor-feet)>CONTACT&&!connected)continue;
  hits.push({stair:b,height:Math.max(height,terrain(to.x,to.z)),interior:p.z>=-EPS&&p.z<=d.length+EPS});
 }
 // At a seam use the actual next flight, not an endpoint apron of the old one.
 hits.sort((a,b)=>Number(b.interior)-Number(a.interior)||b.height-a.height);
 return hits[0]??null;
}
export function stairWalkHeight(buildings,from,to,feet,terrain=()=>-Infinity){return walkContact(buildings,from,to,feet,terrain)?.height??null;}
// Vertical interval of the sloping slab intersected by the player's cylinder.
// This is a finite slab, never a solid extrusion down to the terrain.
export function stairVolume(b,x,z){
 const p=worldToLocal(b,x,z),d=stairDimensions(b.type);
 const dx=Math.max(0,Math.abs(p.x)-d.halfWidth);
 if(dx>=PLAYER.radius-EPS)return null;
 const reach=Math.sqrt(PLAYER.radius**2-dx**2),lo=Math.max(0,p.z-reach),hi=Math.min(d.length,p.z+reach);
 if(lo>=hi-EPS)return null;
 return {top:plane(b,lo),bottom:plane(b,hi)-d.thickness,local:p};
}
function commonEnd(a,b){return stairEnds(a).find(p=>stairEnds(b).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<CONTACT&&Math.abs(p.y-q.y)<CONTACT));}
function footTouchesEndEdge(stair,joint,point){
 const p=worldToLocal(stair,point.x,point.z),end=worldToLocal(stair,joint.x,joint.z);
 const outsideWidth=Math.max(0,Math.abs(p.x)-stairDimensions(stair.type).halfWidth);
 // The portal is the full finite tread edge, not a circle around its centre.
 return Math.hypot(outsideWidth,p.z-end.z)<=PLAYER.radius+EPS;
}
function supportedBody(b,contact,candidate){
 if(!contact||Math.abs(candidate.y-PLAYER.eyeHeight-contact.height)>CONTACT)return false;
 if(contact.stair===b)return true;
 const joint=commonEnd(b,contact.stair);
 return !!joint&&footTouchesEndEdge(b,joint,candidate)&&footTouchesEndEdge(contact.stair,joint,candidate);
}
export function resolveStairSides(buildings,from,candidate,{grounded=false,velocity=0,terrain=()=>-Infinity}={}){
 const contact=grounded&&velocity<=0?walkContact(buildings,from,candidate,from.y-PLAYER.eyeHeight,terrain):null;
 let corrected=false;
 for(const b of buildings){
  if(!isStair(b))continue;
  const volume=stairVolume(b,candidate.x,candidate.z);if(!volume)continue;
  const feet=candidate.y-PLAYER.eyeHeight,head=candidate.y+PLAYER.headOffset;
  const surface=stairHeight(b,candidate.x,candidate.z,PLAYER.radius);
  if(head<=volume.bottom+EPS||surface!==null&&feet>=surface-EPS||supportedBody(b,contact,candidate))continue;
  const d=stairDimensions(b.type),p=volume.local;
  const nx=clamp(p.x,-d.halfWidth,d.halfWidth),nz=clamp(p.z,0,d.length);
  const vx=p.x-nx,vz=p.z-nz,dist=Math.hypot(vx,vz);
  let x=p.x,z=p.z;
  if(dist>EPS){x+=vx*(PLAYER.radius-dist)/dist;z+=vz*(PLAYER.radius-dist)/dist;}
  else{
   const exits=[{distance:p.x+d.halfWidth,x:-d.halfWidth-PLAYER.radius,z},
    {distance:d.halfWidth-p.x,x:d.halfWidth+PLAYER.radius,z},
    {distance:p.z,x,z:-PLAYER.radius},{distance:d.length-p.z,x,z:d.length+PLAYER.radius}];
   exits.sort((a,b)=>a.distance-b.distance);({x,z}=exits[0]);
  }
  const world=localToWorld(b,x,z);candidate.x=world.x;candidate.z=world.z;corrected=true;
 }
 return corrected;
}
// Called every frame, including when no horizontal keys are held.
export function advancePlayerVertical({buildings,position,velocity,grounded,dt,terrain,foundation}){
 const count=Math.max(1,Math.ceil(dt/(1/120))),step=dt/count;
 for(let i=0;i<count;i++){
  const oldY=position.y,oldFeet=oldY-PLAYER.eyeHeight,oldHead=oldY+PLAYER.headOffset;
  let nextY=oldY+velocity*step-7.5*step*step;velocity-=15*step;
  if(nextY>oldY){
   let ceiling=Infinity;
   for(const b of buildings){if(!isStair(b))continue;const v=stairVolume(b,position.x,position.z);
    if(v&&oldHead<=v.bottom+EPS&&nextY+PLAYER.headOffset>=v.bottom)ceiling=Math.min(ceiling,v.bottom);}
   if(ceiling<Infinity){nextY=ceiling-PLAYER.headOffset;velocity=0;}
  }
  let floor=terrain(position.x,position.z);
  const deck=foundation(position.x,position.z);
  if(deck!==null&&oldFeet>=deck-CONTACT&&nextY-PLAYER.eyeHeight<=deck)floor=Math.max(floor,deck);
  if(velocity<=0)for(const b of buildings){
   if(!isStair(b))continue;
   // Land and walk on the same plane, including partial foot overlap at an
   // edge. A separate "highest point under the cylinder" produced a different
   // standing height here, so the next horizontal step lost its support.
   const y=grounded?walkingHeight(b,position.x,position.z,terrain):stairHeight(b,position.x,position.z,PLAYER.radius);
   if(y!==null&&oldFeet>=y-CONTACT&&nextY-PLAYER.eyeHeight<=y)floor=Math.max(floor,y);
  }
  grounded=nextY-PLAYER.eyeHeight<=floor+EPS;
  if(grounded){nextY=floor+PLAYER.eyeHeight;velocity=0;}
  position.y=nextY;
 }
 return {velocity,grounded};
}
export function stairJoinsDeck(stair,foundation,deck){
 const p=worldToLocal(foundation,stair.x,stair.z);
 return Math.abs(stair.mesh.position.y-deck)<CONTACT&&
  (Math.abs(Math.abs(p.x)-1.5)<CONTACT&&Math.abs(p.z)<=1.5+EPS||Math.abs(Math.abs(p.z)-1.5)<CONTACT&&Math.abs(p.x)<=1.5+EPS)&&
  (stair.x-foundation.x)*Math.sin(stair.rotation)+(stair.z-foundation.z)*Math.cos(stair.rotation)>0;
}
export function stairOpensSupport(buildings,support,from,to,{grounded,velocity,terrain},height){
 if(!grounded||velocity>0)return false;
 const contact=walkContact(buildings,from,to,from.y-PLAYER.eyeHeight,terrain);
 if(!contact||Math.abs(to.y-PLAYER.eyeHeight-Math.max(contact.height,terrain(to.x,to.z)))>CONTACT)return false;
 if(support.type!=='wall')return stairJoinsDeck(contact.stair,support,height);
 return stairEnds(contact.stair).some(p=>Math.hypot(p.x-support.x,p.z-support.z)<CONTACT&&Math.abs(p.y-height)<CONTACT);
}
// Anchor-based candidates: rotation is applied about the connected endpoint.
export function stairSnapCandidates(buildings,type,deckSurface,flip=0){
 const d=stairDimensions(type),candidates=[];
 function add(base,anchor,rotation,endpoint){
  rotation+=flip;
  const delta=localToWorld({x:0,z:0,rotation},0,endpoint==='lower'?d.length:0);
  const elevation=anchor.y+(endpoint==='lower'?d.drop:0);
  const candidate={x:anchor.x-delta.x,z:anchor.z-delta.z,rotation,base,anchor,endpoint,stairEndY:elevation,stairChain:true};
  candidate.midpoint={...localToWorld(candidate,0,d.length/2),y:elevation-d.drop/2};
  // Reject duplicates before ranking so an occupied anchor cannot hide a free one.
  if(buildings.some(b=>isStair(b)&&Math.hypot(b.x-candidate.x,b.z-candidate.z)<CONTACT&&Math.abs(b.mesh.position.y-elevation)<CONTACT&&Math.cos(b.rotation-rotation)>1-EPS))return;
  candidates.push(candidate);
 }
 for(const b of buildings){
  if(['foundation','raisedFoundation'].includes(b.type)){
   for(const [x,z,r] of [[1.5,0,Math.PI/2],[-1.5,0,-Math.PI/2],[0,1.5,0],[0,-1.5,Math.PI]]){
    const edge=localToWorld(b,x,z),anchor={...edge,y:deckSurface(b)};
    add(b,anchor,b.rotation+r,'upper');add(b,anchor,b.rotation+r+Math.PI,'lower');
   }
  }else if(b.type==='wall'){
   const anchor={x:b.x,z:b.z,y:b.mesh.position.y+WALL_HEIGHT};
   for(const side of [0,Math.PI]){add(b,anchor,b.rotation+side,'upper');add(b,anchor,b.rotation+side+Math.PI,'lower');}
  }else if(isStair(b)){
   const [upper,lower]=stairEnds(b);
   add(b,lower,b.rotation,'upper');add(b,upper,b.rotation,'lower');
  }
 }
 return candidates;
}
export function selectStairSnap(candidates,target){
 const distance=c=>Math.hypot(c.anchor.x-target.x,c.anchor.z-target.z);
 const centreDistance=c=>Math.hypot(c.midpoint.x-target.x,c.midpoint.z-target.z,c.midpoint.y-(target.y??c.anchor.y));
 const nearby=candidates.filter(c=>distance(c)<4.5);
 nearby.sort((a,b)=>Math.abs(distance(a)-distance(b))>EPS?distance(a)-distance(b):centreDistance(a)-centreDistance(b));
 return nearby[0]??null;
}
