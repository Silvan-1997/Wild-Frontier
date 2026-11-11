import {riverCenter,riverDistance,inRiver,safeResourcePosition,terrainHeight} from './src/terrain.js';
import assert from 'node:assert/strict';
for(const [x,z] of [[0,0],[-95,22],[64,-54],[100,100]]){
 assert(Number.isFinite(terrainHeight(x,z)));
 assert.equal(terrainHeight(x,z),terrainHeight(x,z));
 assert.equal(riverDistance(x,z),Math.abs(z-riverCenter(x)));
}
assert(inRiver(0,riverCenter(0)));
const p=safeResourcePosition(0,riverCenter(0));assert(!inRiver(p.x,p.z));
console.log('Terrain tests passed');
