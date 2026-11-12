import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as stairs from '../src/stairs.js';
import {harness,Vector} from './stairs-harness.mjs';

const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
for(const degrees of [0,90,180,270]){
 const r=degrees*Math.PI/180;
 // This is Three.js's local-to-world Y rotation, independent of the inverse under test.
 const world=(x,z)=>({x:10+x*Math.cos(r)+z*Math.sin(r),z:20-x*Math.sin(r)+z*Math.cos(r)});
 for(const type of ['stairs','steepStairs'])test(`${type} ${degrees}°: visible axis, side rejection, full ascent/descent`,()=>{
  const d=stairs.stairDimensions(type),c=harness(3-d.drop),a=world(0,0);
  c.addBuilding(type,a.x,a.z,r,false,7,3);
  for(const z of [0,d.length/4,d.length/2,d.length]){
   const p=world(0,z);near(c.stairSurface(p.x,p.z),3-d.drop*z/d.length,'ramp height');
  }
  const side=world(1.3,d.length/2);assert.equal(c.stairSurface(side.x,side.z),null);
  const midpoint=world(0,d.length/2);
  assert.equal(stairs.stairWalkHeight(c.buildings,{...side,y:0},midpoint,3-d.drop/2),null,'no side pull-up');
  const bottom=world(0,d.length);c.player.pos=new Vector(bottom.x,3-d.drop+1.7,bottom.z);
  const up=new Vector(-Math.sin(r),0,-Math.cos(r));
  for(let i=0;i<100;i++){c.movePlayer(up,d.length/100);c.advanceVertical(1/60);const p=c.player.pos;near(p.y-1.7,c.stairSurface(p.x,p.z),'ascent');}
  near(c.player.pos.y-1.7,3,'upper end');
  for(let i=0;i<100;i++)c.movePlayer(new Vector(-up.x,0,-up.z),d.length/100);
  near(c.player.pos.y-1.7,3-d.drop,'lower end');
 });
 test(`snapping ${degrees}°: foundation edge and second steep flight retain position/elevation`,()=>{
  const c=harness(),center=world(0,-1.5),upper=world(0,0);
  c.addBuilding('raisedFoundation',center.x,center.z,r,false,7,3.88);
  function previewAt(target){
   c.player.pos=new Vector(target.x,0,target.z+2.6);
   c.placement={type:'steepStairs',rotation:0,stairFlip:0,mesh:{position:{set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{},traverse:()=>{}}};
   c.updatePlacement();return c.placement;
  }
  const first=previewAt(upper);
  assert.equal(first.valid,true);near(first.mesh.position.x,upper.x,'upper snap X');near(first.mesh.position.z,upper.z,'upper snap Z');
  near(first.elevation,4,'platform attachment height');near(first.rotation,r,'platform rotation');assert.equal(first.groupId,7);
  c.addBuilding(first.type,first.mesh.position.x,first.mesh.position.z,first.rotation,false,first.groupId,first.elevation);
  const lower=c.stairLowerEnd(c.buildings[1]),second=previewAt(lower);
  assert.equal(second.valid,true);near(second.mesh.position.x,lower.x,'chain snap X');near(second.mesh.position.z,lower.z,'chain snap Z');
  near(second.elevation,2.56,'chain attachment height');near(second.rotation,r,'chain rotation');assert.equal(second.groupId,7);
 });
 test(`two steep flights ${degrees}°: seams, raised deck and version-4 reload`,()=>{
  const c=harness(4-2*1.44),a=world(0,0),center=world(0,-1.5);
  c.addBuilding('raisedFoundation',center.x,center.z,r,false,7,4-.12);
  c.addBuilding('steepStairs',a.x,a.z,r,false,7,4);
  const end=c.stairLowerEnd(c.buildings[1]);
  c.addBuilding('steepStairs',end.x,end.z,r,false,7,end.y);
  const original=c.buildings.map(({type,x,z,rotation,elevation,groupId})=>({type,x,z,rotation,elevation,groupId}));
  const bottom=world(0,4.2);c.player.pos=new Vector(bottom.x,4-2*1.44+1.7,bottom.z);
  function traverse(g,stride=.01){
   const up=new Vector(-Math.sin(r),0,-Math.cos(r));
   let travelled=0;
   while(travelled<4.7-1e-8){
    const distance=Math.min(stride,4.7-travelled);travelled+=distance;
    g.movePlayer(up,distance);g.advanceVertical(1/60);
    const local=stairs.worldToLocal({x:10,z:20,rotation:r},g.player.pos.x,g.player.pos.z);
    near(local.z,4.2-travelled,'unobstructed forward progress');
    const expected=local.z>=0?4-local.z*1.44/2.1:4;
    near(g.player.pos.y-1.7,expected,'continuous support including joins');
   }
   travelled=0;
   while(travelled<4.7-1e-8){
    const distance=Math.min(stride,4.7-travelled);travelled+=distance;
    g.movePlayer(new Vector(-up.x,0,-up.z),distance);g.advanceVertical(1/60);
   }
   near(g.player.pos.y-1.7,4-2*1.44,'descent across both joins');
  }
  traverse(c,.45);
  const loaded=harness(4-2*1.44);
  loaded.loadGame(JSON.parse(JSON.stringify({version:4,pos:[bottom.x,bottom.z],buildings:original})));
  assert.equal(loaded.buildings.length,3);
  assert.deepEqual(loaded.buildings.map(b=>b.elevation),original.map(b=>b.elevation),'saved elevations unchanged');
  near(loaded.player.pos.y,c.player.pos.y,'restored support height');traverse(loaded);
  // Reloading on the upper flight must not reset feet to terrain or eject the player.
  const mid=world(0,.8),onFlight=harness(4-2*1.44);
  onFlight.loadGame({version:4,pos:[mid.x,mid.z],buildings:original});
  near(onFlight.player.pos.x,mid.x,'load X');near(onFlight.player.pos.z,mid.z,'load Z');
  near(onFlight.player.pos.y-1.7,4-.8*1.44/2.1,'load ramp support');
  // The platform is still solid outside the connected flight's corridor.
  const blocked=world(1.4,.2);loaded.player.pos=new Vector(blocked.x,2,blocked.z);
  const candidate=new Vector(blocked.x,2,blocked.z);loaded.resolveCollision(candidate);
  assert.ok(Math.hypot(candidate.x-blocked.x,candidate.z-blocked.z)>.01,'solid platform away from stairs');
 });
}
