import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,Vector} from './stairs-harness.mjs';
import {PLAYER,stairDimensions,localToWorld,worldToLocal} from '../src/stairs.js';
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,`${msg}: ${a} != ${b}`);
for(const rotation of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const x of [-1.24,-1.21,0,1.21,1.24])for(const direction of [-1,1])test(`flat edge x=${x}, ${rotation*180/Math.PI}°, direction=${direction}: no catch or forward ejection`,()=>{
 const g=harness(-10),d=stairDimensions('stairs'),b={x:10,z:20,rotation};
 g.addBuilding('stairs',b.x,b.z,rotation,false,1,4);
 let z=direction===-1?.16: .5;
 const p=localToWorld(b,x,z);g.player.pos=new Vector(p.x,4-d.drop*z/d.length+PLAYER.eyeHeight,p.z);
 for(let i=0;i<80;i++){
  const distance=.015;z+=direction*distance;
  g.movePlayer(new Vector(direction*Math.sin(rotation),0,direction*Math.cos(rotation)),distance);g.advanceVertical(1/60);
  const local=worldToLocal(b,g.player.pos.x,g.player.pos.z);
  near(local.x,x,'no lateral ejection');near(local.z,z,'each input advances exactly the requested distance');
  if(z>=0)near(g.player.pos.y-PLAYER.eyeHeight,4-d.drop*z/d.length,'ramp follows feet at visible tread edge');
 }
});
for(const rotation of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
 test(`flat high-end edge ${rotation*180/Math.PI}°: no forward jump onto deck`,()=>{
  const g=harness(-10),b={x:10,z:20,rotation},deck=localToWorld(b,0,-1.5),p=localToWorld(b,1.21,.005);
  g.addBuilding('raisedFoundation',deck.x,deck.z,rotation,false,1,3.88);g.addBuilding('stairs',b.x,b.z,rotation,false,1,4);
  g.player.pos=new Vector(p.x,4-.7*.005/2.75+PLAYER.eyeHeight,p.z);
  g.movePlayer(new Vector(-Math.sin(rotation),0,-Math.cos(rotation)),.01);g.advanceVertical(1/60);
  const local=worldToLocal(b,g.player.pos.x,g.player.pos.z);near(local.z,-.005,'no extra forward correction');near(local.x,1.21,'no extra lateral correction');
 });
 test(`flat edge landing ${rotation*180/Math.PI}°: subsequent descent retains support`,()=>{
  const g=harness(-10),b={x:10,z:20,rotation},p=localToWorld(b,1.4,1);
  g.addBuilding('stairs',b.x,b.z,rotation,false,1,4);
  const height=4-.7/2.75;g.player.pos=new Vector(p.x,height+.2+PLAYER.eyeHeight,p.z);g.grounded=false;g.verticalSpeed=-4;
  g.advanceVertical(.2);near(g.player.pos.y-PLAYER.eyeHeight,height,'same height for landing and walking');
  g.movePlayer(new Vector(Math.sin(rotation),0,Math.cos(rotation)),.1);g.advanceVertical(1/60);
  const local=worldToLocal(b,g.player.pos.x,g.player.pos.z);near(local.x,1.4,'edge support retained');near(local.z,1.1,'descent continues after landing');
 });
 test(`flat descending airborne contact ${rotation*180/Math.PI}°: no ejection before landing`,()=>{
  const g=harness(-10),b={x:10,z:20,rotation},p=localToWorld(b,1.21,1);
  g.addBuilding('stairs',b.x,b.z,rotation,false,1,4);
  g.player.pos=new Vector(p.x,4-.7/2.75+.02+PLAYER.eyeHeight,p.z);g.grounded=false;g.verticalSpeed=-.2;
  for(let i=0;i<30;i++){
   g.movePlayer(new Vector(Math.sin(rotation),0,Math.cos(rotation)),.03);g.advanceVertical(1/60);
   const local=worldToLocal(b,g.player.pos.x,g.player.pos.z);near(local.x,1.21,'no lateral correction while above ramp');near(local.z,1+(i+1)*.03,'no forward correction before landing');
  }
 });
}
