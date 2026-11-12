import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,Vector} from './stairs-harness.mjs';
import {PLAYER,stairDimensions,stairEnds,localToWorld,worldToLocal} from '../src/stairs.js';

const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const pairs=[['stairs','stairs'],['steepStairs','steepStairs'],['stairs','steepStairs'],['steepStairs','stairs']];
const offsets=[-1.5,-1.24,-.75,0,.75,1.24,1.5];
for(const [upperType,lowerType] of pairs)for(const degrees of [0,90,180,270])for(const x of offsets)for(const sign of [-1,1]){
 test(`${upperType}/${lowerType} ${degrees}°, x=${x}, ${sign===-1?'up':'down'}: full-width joint`,()=>{
  const r=degrees*Math.PI/180,frame={x:10,z:20,rotation:r},a=stairDimensions(upperType),b=stairDimensions(lowerType);
  const total=a.length+b.length,start=sign===-1?total-.4:.4,finish=sign===-1?.4:total-.4;
  const height=z=>z<=a.length?8-a.drop*z/a.length:8-a.drop-b.drop*(z-a.length)/b.length;
  for(const fps of [15,30,60,144])for(const speed of [6,9])for(const reload of [false,true]){
   let g=harness(-10);g.addBuilding(upperType,frame.x,frame.z,r,false,7,8);
   const end=stairEnds(g.buildings[0])[1];g.addBuilding(lowerType,end.x,end.z,r,false,7,end.y);
   const first=localToWorld(frame,x,start);g.player.pos=new Vector(first.x,height(start)+PLAYER.eyeHeight,first.z);
   if(reload){
    g.saveGame(true);const saved=JSON.parse(JSON.stringify(g.cloudPending));saved.buildings.reverse();g=harness(-10);g.loadGame(saved);
    near(g.player.pos.x,first.x,'load preserves X');near(g.player.pos.z,first.z,'load preserves Z');
   }
   let travelled=0,distance=Math.abs(finish-start);
   while(travelled<distance-1e-8){
    const step=Math.min(speed/fps,distance-travelled);travelled+=step;
    g.movePlayer(new Vector(sign*Math.sin(r),0,sign*Math.cos(r)),step);g.advanceVertical(step/speed);
    const p=worldToLocal(frame,g.player.pos.x,g.player.pos.z),expected=start+sign*travelled;
    near(p.x,x,'no sideways ejection at seam');near(p.z,expected,'no blocking or extra forward movement at seam');
    near(g.player.pos.y-PLAYER.eyeHeight,height(expected),'continuous height across both flights');
    near(g.verticalSpeed,0,'no auto-jump');assert.equal(g.grounded,true);
   }
  }
 });
}

for(const [upperType,lowerType] of pairs)for(const degrees of [0,90,180,270]){
 const r=degrees*Math.PI/180,frame={x:10,z:20,rotation:r},a=stairDimensions(upperType),b=stairDimensions(lowerType);
 function pair(g,offset=0){
  g.addBuilding(upperType,frame.x,frame.z,r,false,7,8);
  const end=stairEnds(g.buildings[0])[1];g.addBuilding(lowerType,end.x,end.z,r,false,7,end.y+offset);
 }
 test(`${upperType}/${lowerType} ${degrees}°: joint does not open sides or underside to an unsupported player`,()=>{
  for(const airborne of [false,true])for(const side of [-1,1]){
   const g=harness(-10);pair(g);
   const z=a.length+.05,feet=8-a.drop-.4,p=localToWorld(frame,side*2,z);
   g.player.pos=new Vector(p.x,feet+PLAYER.eyeHeight,p.z);g.grounded=!airborne;g.verticalSpeed=airborne?4:0;
   const candidatePoint=localToWorld(frame,side*1.3,z),candidate=new Vector(candidatePoint.x,feet+PLAYER.eyeHeight,candidatePoint.z);
   assert.equal(g.resolveStairSides(g.buildings,g.player.pos,candidate,{grounded:g.grounded,velocity:g.verticalSpeed,terrain:g.terrainHeight}),true);
   const local=worldToLocal(frame,candidate.x,candidate.z);assert.ok(Math.abs(local.x)>=a.halfWidth+PLAYER.radius-1e-6,'side stays solid below the walking surface');
  }
  const g=harness(-10);pair(g);const p=localToWorld(frame,1,a.length-.1);
  const volume=g.stairVolume(g.buildings[0],p.x,p.z);
  g.player.pos=new Vector(p.x,volume.bottom-PLAYER.headOffset-.05,p.z);g.grounded=false;g.verticalSpeed=7.1;
  g.advanceVertical(.1);assert.ok(g.player.pos.y+PLAYER.headOffset<=volume.bottom+1e-6,'underside remains solid near wide joint');assert.ok(g.verticalSpeed<=0);
 });
 test(`${upperType}/${lowerType} ${degrees}°: unequal endpoint heights do not create a portal`,()=>{
  const g=harness(-10);pair(g,-.25);
  const p=localToWorld(frame,1,a.length+.1),feet=8-a.drop-.25-b.drop*.1/b.length;
  g.player.pos=new Vector(p.x,feet+PLAYER.eyeHeight,p.z);
  const next=localToWorld(frame,1,a.length+.05),candidate=new Vector(next.x,8-a.drop-.25-b.drop*.05/b.length+PLAYER.eyeHeight,next.z);
  assert.equal(g.resolveStairSides(g.buildings,g.player.pos,candidate,{grounded:true,velocity:0,terrain:g.terrainHeight}),true,'height mismatch stays blocked');
 });
 for(const sign of [-1,1])test(`${upperType}/${lowerType} ${degrees}°: diagonal joint crossing ${sign}`,()=>{
  const g=harness(-10);pair(g);
  const total=a.length+b.length,startZ=sign===-1?total-.4:.4,endZ=sign===-1?.4:total-.4;
  const start=localToWorld(frame,-1.2,startZ),finish=localToWorld(frame,1.2,endZ),distance=Math.hypot(finish.x-start.x,finish.z-start.z);
  const height=z=>z<=a.length?8-a.drop*z/a.length:8-a.drop-b.drop*(z-a.length)/b.length;
  g.player.pos=new Vector(start.x,height(startZ)+PLAYER.eyeHeight,start.z);
  for(let i=1;i<=80;i++){
   g.movePlayer(new Vector((finish.x-start.x)/distance,0,(finish.z-start.z)/distance),distance/80);g.advanceVertical(distance/80/6);
   const local=worldToLocal(frame,g.player.pos.x,g.player.pos.z),fraction=i/80,z=startZ+(endZ-startZ)*fraction;
   near(local.x,-1.2+2.4*fraction,'diagonal X progress');near(local.z,z,'diagonal Z progress');near(g.player.pos.y-PLAYER.eyeHeight,height(z),'diagonal height');
  }
 });
}
