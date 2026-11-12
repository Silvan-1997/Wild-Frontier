import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,Vector} from './stairs-harness.mjs';
import {PLAYER,WALL_HEIGHT,stairDimensions,stairEnds,stairHeight,stairVolume,worldToLocal,localToWorld,stairSnapCandidates,selectStairSnap} from '../src/stairs.js';
const near=(a,b,msg='coordinate')=>assert.ok(Math.abs(a-b)<1e-6,`${msg}: ${a} != ${b}`);
function world(r,x,z){return localToWorld({x:10,z:20,rotation:r},x,z);}
function setPlayer(g,p,feet){g.player.pos=new Vector(p.x,feet+PLAYER.eyeHeight,p.z);g.verticalSpeed=0;g.grounded=true;}
function preview(g,target,type,flip=0){
 g.forward=()=>({x:Math.SQRT1_2,z:Math.SQRT1_2});
 setPlayer(g,{x:target.x-2.6*Math.SQRT1_2,z:target.z-2.6*Math.SQRT1_2},target.y-PLAYER.eyeHeight);
 g.placement={type,rotation:0,stairFlip:flip,mesh:{position:{set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{},traverse:()=>{}}};
 g.updatePlacement();return g.placement;
}
for(const degrees of [0,90,180,270])for(const type of ['stairs','steepStairs']){
 const r=degrees*Math.PI/180,d=stairDimensions(type);
 for(const fps of [15,30,60,144])for(const speed of [2,6,9])test(`${type} ${degrees}° ground entry, first step, deck and descent: ${fps}fps / ${speed}m/s`,()=>{
  const g=harness(0),top=world(r,0,0),centre=world(r,0,-1.5);
  g.addBuilding('raisedFoundation',centre.x,centre.z,r,false,1,d.drop-.12);
  g.addBuilding(type,top.x,top.z,r,false,1,d.drop);
  setPlayer(g,world(r,0,d.length+.6),0);
  const total=d.length+1.4,up=new Vector(-Math.sin(r),0,-Math.cos(r)),dt=1/fps;
  function walk(sign){
   let distance=0;
   while(distance<total-1e-8){
    const step=Math.min(speed*dt,total-distance);distance+=step;
    g.movePlayer(new Vector(sign*up.x,0,sign*up.z),step);g.advanceVertical(step/speed);
    const expectedZ=sign===1?d.length+.6-distance:-.8+distance;
    const local=worldToLocal({x:10,z:20,rotation:r},g.player.pos.x,g.player.pos.z);
    near(local.z,expectedZ,'uninterrupted travel (including toe contact)');
    near(g.player.pos.y-PLAYER.eyeHeight,d.drop*(1-Math.max(0,Math.min(1,local.z/d.length))),'smooth height');
    near(g.verticalSpeed,0,'no automatic jump');assert.equal(g.grounded,true);
   }
  }
  walk(1);walk(-1);
 });
 test(`${type} ${degrees}° solid sides while walking and jumping`,()=>{
  for(const airborne of [false,true]){
   const g=harness(0),p=world(r,0,0);g.addBuilding(type,p.x,p.z,r,false,1,6);
   const b=g.buildings[0],mid=6-d.drop/2;
   setPlayer(g,world(r,2,d.length/2),mid-.5);g.grounded=!airborne;g.verticalSpeed=airborne?4:0;
   g.movePlayer(new Vector(-Math.cos(r),0,Math.sin(r)),2);
   const local=worldToLocal(b,g.player.pos.x,g.player.pos.z);
   assert.ok(local.x>=d.halfWidth+PLAYER.radius-1e-6,'blocked outside side face');
   const volume=stairVolume(b,g.player.pos.x,g.player.pos.z);
   assert.ok(volume===null||g.player.pos.y-PLAYER.eyeHeight>=volume.top-1e-6||g.player.pos.y+PLAYER.headOffset<=volume.bottom+1e-6,'no body penetration');
  }
 });
 test(`${type} ${degrees}° stationary jump hits underside and falls back`,()=>{
  for(const fps of [15,30,60,144]){
   const g=harness(-10),p=world(r,0,0);g.addBuilding(type,p.x,p.z,r,false,1,6);
   const point=world(r,0,d.length/2),bottom=stairVolume(g.buildings[0],point.x,point.z).bottom;
   setPlayer(g,point,bottom-PLAYER.eyeHeight-PLAYER.headOffset-.05);g.verticalSpeed=7.1;g.grounded=false;
   let stopped=false;
   for(let frame=0;frame<fps*.25;frame++){
    g.advanceVertical(1/fps);
    assert.ok(g.player.pos.y+PLAYER.headOffset<=bottom+1e-6,'head never crosses underside');
    if(g.verticalSpeed<=0)stopped=true;
   }
   assert.ok(stopped,'upward speed cancelled without horizontal movement');assert.equal(g.grounded,false);
  }
 });
 test(`${type} ${degrees}° finite underside: headroom passes, insufficient headroom blocks`,()=>{
  for(const clear of [true,false]){
   const upper=6,mid=world(r,0,d.length/2),fake={type,x:10,z:20,rotation:r,mesh:{position:{y:upper}}};
   const bottom=stairVolume(fake,mid.x,mid.z).bottom;
   const floor=bottom-PLAYER.eyeHeight-PLAYER.headOffset+(clear?-.05:.10);
   const g=harness(floor),p=world(r,0,0);g.addBuilding(type,p.x,p.z,r,false,1,upper);
   setPlayer(g,world(r,2,d.length/2),floor);
   g.movePlayer(new Vector(-Math.cos(r),0,Math.sin(r)),4);
   const local=worldToLocal(g.buildings[0],g.player.pos.x,g.player.pos.z);
   if(clear)near(local.x,-2,'can cross underneath: no wall to terrain');
   else assert.ok(local.x>0,'blocked when full player height does not fit');
  }
 });
 test(`${type} ${degrees}° falling from above lands on ramp`,()=>{
  const g=harness(-10),p=world(r,0,0);g.addBuilding(type,p.x,p.z,r,false,1,6);
  const middle=world(r,0,d.length/2),height=6-d.drop/2;setPlayer(g,middle,height+.3);g.grounded=false;g.verticalSpeed=-4;
  g.advanceVertical(.2);near(g.player.pos.y-PLAYER.eyeHeight,height);assert.equal(g.grounded,true);
 });
 test(`${type} ${degrees}° all foundation edges: lower/upper anchors and rotated preview`,()=>{
  for(const foundationType of ['foundation','raisedFoundation']){
  const g=harness(),centre=world(r,0,0);g.addBuilding(foundationType,centre.x,centre.z,r,false,4,4-(foundationType==='raisedFoundation'?.12:.29));
  for(const [x,z,angle] of [[1.5,0,Math.PI/2],[-1.5,0,-Math.PI/2],[0,1.5,0],[0,-1.5,Math.PI]])for(const upward of [false,true]){
   const edge=world(r,x,z),p=preview(g,{...edge,y:4+(upward?d.drop/2:-d.drop/2)},type);
   assert.equal(p.valid,true);const stair={type,x:p.mesh.position.x,z:p.mesh.position.z,rotation:p.rotation,mesh:{position:{y:p.elevation}}};
   const anchor=stairEnds(stair)[upward?1:0];near(anchor.x,edge.x);near(anchor.z,edge.z);near(anchor.y,4);
   near(Math.cos(p.rotation-(r+angle+(upward?Math.PI:0))),1,'outward direction');
   assert.equal(p.groupId,4);
  }
  const edge=world(r,0,1.5),p=preview(g,{...edge,y:4+d.drop/2},type,Math.PI/2);
  const stair={type,x:p.mesh.position.x,z:p.mesh.position.z,rotation:p.rotation,mesh:{position:{y:p.elevation}}},anchor=stairEnds(stair)[1];
  near(anchor.x,edge.x,'rotation keeps lower attachment');near(anchor.z,edge.z);near(anchor.y,4);
  }
 });
 test(`${type} ${degrees}° wall upper edge: down/up plus upward continuation`,()=>{
  const g=harness(),point=world(r,0,0);g.addBuilding('wall',point.x,point.z,r,false,4,4-WALL_HEIGHT);
  for(const upward of [false,true]){
   const p=preview(g,{...point,y:4+(upward?d.drop/2:-d.drop/2)},type);
   assert.equal(p.valid,true);const stair={type,x:p.mesh.position.x,z:p.mesh.position.z,rotation:p.rotation,mesh:{position:{y:p.elevation}}};
   const anchor=stairEnds(stair)[upward?1:0];near(anchor.x,point.x);near(anchor.z,point.z);near(anchor.y,4,'actual wall crown');
  }
  const first=preview(g,{...point,y:4+d.drop/2},type);
  g.addBuilding(type,first.mesh.position.x,first.mesh.position.z,first.rotation,false,first.groupId,first.elevation);
  const high=stairEnds(g.buildings[1])[0],next=preview(g,{...high,y:high.y+d.drop/2},type);
  const flight={type,x:next.mesh.position.x,z:next.mesh.position.z,rotation:next.rotation,mesh:{position:{y:next.elevation}}};
  const anchor=stairEnds(flight)[1];near(anchor.x,high.x);near(anchor.z,high.z);near(anchor.y,high.y,'continued exact height');
 });
 test(`${type} ${degrees}° uninterrupted walking across wall-top attachment`,()=>{
  const g=harness(-10),origin=world(r,0,0),high=world(r,0,-d.length);
  g.addBuilding('wall',origin.x,origin.z,r,false,4,4-WALL_HEIGHT);
  g.addBuilding(type,origin.x,origin.z,r,false,4,4);
  g.addBuilding(type,high.x,high.z,r,false,4,4+d.drop);
  setPlayer(g,world(r,0,d.length),4-d.drop);
  const up=new Vector(-Math.sin(r),0,-Math.cos(r));
  for(let i=0;i<80;i++){
   g.movePlayer(up,2*d.length/80);g.advanceVertical(1/60);
   const expected=d.length-(i+1)*2*d.length/80,local=worldToLocal(g.buildings[1],g.player.pos.x,g.player.pos.z);
   near(local.z,expected,'wall must not block ramp corridor');near(g.player.pos.y-PLAYER.eyeHeight,4-expected*d.drop/d.length);
  }
 });
}
test('nearest attachment wins over a remote upward origin',()=>{
 const g=harness();g.addBuilding('wall',0,0,0,false,1,4-WALL_HEIGHT);
 g.addBuilding('foundation',0,4.25,0,false,2,0);
 const candidates=stairSnapCandidates(g.buildings,'stairs',g.deckSurface);
 const selected=selectStairSnap(candidates,{x:0,z:0,y:4});assert.equal(selected.base.type,'wall');
});
test('version-4 save/load preserves existing walls, elevations, groups, origins and rotations',()=>{
 const original=[{type:'raisedFoundation',x:20,z:20,rotation:Math.PI/2,elevation:3.88,groupId:7},
  {type:'wall',x:21.5,z:20,rotation:Math.PI/2,elevation:4,groupId:7},
  {type:'steepStairs',x:21.5,z:20,rotation:Math.PI/2,elevation:6.95,groupId:7},
  {type:'stairs',x:23.6,z:20,rotation:Math.PI/2,elevation:5.51,groupId:7}];
 const saved={version:4,pos:[0,0],buildings:original};
 const g=harness(-10);g.loadGame(JSON.parse(JSON.stringify(saved)));assert.equal(g.buildings.length,4);
 g.saveGame(true);assert.ok(g.cloudPending,'actual saveGame generated payload');
 const json=JSON.parse(JSON.stringify(g.cloudPending));assert.equal(json.version,4);
 for(let i=0;i<original.length;i++)for(const key of ['type','x','z','rotation','elevation','groupId'])assert.equal(json.buildings[i][key],original[i][key],key);
 const loaded=harness(-10);loaded.loadGame(json);loaded.saveGame(true);
 assert.deepEqual(JSON.parse(JSON.stringify(loaded.cloudPending.buildings)),json.buildings);
});
for(const degrees of [0,90,180,270])for(const fps of [15,30,60,144])for(const speed of [2,6,9])test(`two steep flights from terrain ${degrees}° / ${fps}fps / ${speed}m/s`,()=>{
 const r=degrees*Math.PI/180,d=stairDimensions('steepStairs'),g=harness(0),centre=world(r,0,-1.5),a=world(r,0,0);
 g.addBuilding('raisedFoundation',centre.x,centre.z,r,false,1,d.drop*2-.12);
 g.addBuilding('steepStairs',a.x,a.z,r,false,1,d.drop*2);
 const lower=stairEnds(g.buildings[1])[1];g.addBuilding('steepStairs',lower.x,lower.z,r,false,1,lower.y);
 const total=d.length*2+1.4,up=new Vector(-Math.sin(r),0,-Math.cos(r));setPlayer(g,world(r,0,d.length*2+.6),0);
 for(const sign of [1,-1]){
  let distance=0;
  while(distance<total-1e-8){
   const step=Math.min(speed/fps,total-distance);distance+=step;
   g.movePlayer(new Vector(up.x*sign,0,up.z*sign),step);g.advanceVertical(step/speed);
   const local=worldToLocal(g.buildings[1],g.player.pos.x,g.player.pos.z),expected=sign===1?d.length*2+.6-distance:-.8+distance;
   near(local.z,expected,'no obstruction at flight seam');
   near(g.player.pos.y-PLAYER.eyeHeight,Math.max(0,Math.min(d.drop*2,d.drop*2-local.z*d.drop/d.length)));near(g.verticalSpeed,0);
  }
 }
});
test('falling onto lateral slab edge cannot pass through the body',()=>{
 const g=harness(-10);g.addBuilding('steepStairs',0,0,0,false,1,6);
 const b=g.buildings[0],x=1.4,z=1.05,top=stairVolume(b,x,z).top;
 setPlayer(g,{x,z},top+.3);g.grounded=false;g.verticalSpeed=-4;g.advanceVertical(.3);
 near(g.player.pos.y-PLAYER.eyeHeight,top);assert.equal(g.grounded,true);
});
test('new version-4 saves preserve being underneath a flight; legacy saves still reconstruct support',()=>{
 const g=harness(0);g.addBuilding('steepStairs',0,0,0,false,1,6);setPlayer(g,{x:0,z:1},0);g.saveGame(true);
 const json=JSON.parse(JSON.stringify(g.cloudPending));near(json.playerY,PLAYER.eyeHeight);
 const loaded=harness(0);loaded.loadGame(json);near(loaded.player.pos.y,PLAYER.eyeHeight);near(loaded.player.pos.z,1);
 delete json.playerY;const legacy=harness(0);legacy.grounded=false;legacy.verticalSpeed=7.1;legacy.loadGame(json);
 near(legacy.player.pos.x,0,'loading ignores previous airborne state');near(legacy.player.pos.z,1);
 near(legacy.player.pos.y-PLAYER.eyeHeight,6-1.44/2.1,'legacy on-ramp reconstruction');
});
for(const type of ['stairs','steepStairs'])for(const slope of [-.08,.08])test(`${type}: exposed first tread blends to sloping terrain without jumping (${slope})`,()=>{
 const d=stairDimensions(type),g=harness(0);
 g.terrainHeight=(x,z)=>slope*(z-d.length);
 g.addBuilding(type,0,0,0,false,1,d.drop+d.rise*.5);
 setPlayer(g,{x:0,z:d.length+.6},g.terrainHeight(0,d.length+.6));
 let previous=g.player.pos.y;
 for(let i=0;i<120;i++){
  g.movePlayer(new Vector(0,0,-1),.01);g.advanceVertical(1/60);
  near(g.player.pos.z,d.length+.6-(i+1)*.01,'first tread stays accessible');
  assert.ok(Math.abs(g.player.pos.y-previous)<.02,'no hop or frame discontinuity');previous=g.player.pos.y;
  near(g.verticalSpeed,0,'no jumping');assert.equal(g.grounded,true);
 }
});
for(const type of ['stairs','steepStairs'])for(const slope of [-.08,.08])for(const fps of [15,30,60,144])for(const speed of [2,6,9])test(`${type} exposed sloping first tread: slope ${slope}, ${fps}fps, ${speed}m/s`,()=>{
 const d=stairDimensions(type),g=harness(0);g.terrainHeight=(x,z)=>slope*(z-d.length);
 g.addBuilding(type,0,0,0,false,1,d.drop+d.rise*.5);
 const total=d.length+.3;setPlayer(g,{x:0,z:d.length+.6},g.terrainHeight(0,d.length+.6));
 for(const sign of [-1,1]){
  let distance=0;
  while(distance<total-1e-8){
   const step=Math.min(speed/fps,total-distance);distance+=step;
   g.movePlayer(new Vector(0,0,sign),step);g.advanceVertical(step/speed);
   near(g.player.pos.z,sign===-1?d.length+.6-distance:.3+distance,'terrain/ramp continuous travel');
   near(g.verticalSpeed,0,`ground contact independent of frame rate (direction ${sign}, z ${g.player.pos.z})`);assert.equal(g.grounded,true);
  }
 }
});
