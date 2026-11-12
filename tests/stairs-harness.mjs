import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const stairs=await import(process.env.STAIR_PHYSICS_MODULE||'../src/stairs.js');

const html=fs.readFileSync(process.env.STAIR_GAME_HTML||new URL('../index.html',import.meta.url),'utf8');
// Exercise the actual game movement, collision, construction and save loader.
export function gameFunction(name){
 const start=html.indexOf(`function ${name}(`);assert(start>=0,name);
 let braces=0,opened=false;
 for(let i=html.indexOf('{',start);i<html.length;i++){
  if(html[i]==='{'){braces++;opened=true;}
  if(html[i]==='}'&&--braces===0&&opened)return html.slice(start,i+1);
 }
 throw Error('Unterminated '+name);
}
export class Vector {
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 clone(){return new Vector(this.x,this.y,this.z);}
 addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
}
export function harness(terrain=0){
 const node={textContent:''};
 const c={...stairs,Math,Number,Array,Object,JSON,Infinity,buildings:[],objects:[],campfires:[],
  FOUNDATION_TYPES:['foundation','raisedFoundation'],FLOOR_OFFSET:{foundation:0,raisedFoundation:1.2},
  player:{pos:new Vector(),health:100,hunger:100,thirst:100},grounded:true,verticalSpeed:0,
  terrainHeight:()=>terrain,terrainTop:()=>terrain,STEP_HEIGHT:.48,
  STAIR_TYPES:['stairs','steepStairs'],GRID:3,snapEnabled:true,inRiver:()=>false,
  forward:()=>({x:0,z:-1}),recipes:{stairs:{title:'Treppe'},steepStairs:{title:'Steile Treppe'}},
  makeBuilding:()=>({position:{y:0},userData:{}}),setSupportPosts:()=>{},nextBuildingGroup:1,nextBedId:1,
  inventory:{},THREE:{MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}},
  document:{querySelector:()=>node},updateInv:()=>{},addCampfire:()=>{},
  yaw:0,cloudReady:true,cloudWorldId:'test',cloudBusy:true,cloudPending:null,pitch:0,homePosition:{},homeBedId:null,activeTool:'hands',axeEquipped:false,elapsed:0};
 vm.createContext(c);
 for(const name of ['rotateXZ','distXZ','deckY','deckSurface','stairLowerEnd','stairSurface','foundationSurface','resolveCollision','autoHopAtLowFoundation','movePlayer','addBuilding','loadGame','updatePlacement','saveGame'])vm.runInContext(gameFunction(name),c);
 if(html.includes('function advanceVertical('))vm.runInContext(gameFunction('advanceVertical'),c);
 else{ // Also run the same integration tests against the unmodified 1.8.31 baseline.
  const start=html.indexOf('  const terrain=terrainHeight(player.pos.x,player.pos.z),surface=foundationSurface');
  const end=html.indexOf('  player.hunger=',start);
  assert(start>=0&&end>start);vm.runInContext('function advanceVertical(dt){'+html.slice(start,end)+'}',c);
 }
 return c;
}
