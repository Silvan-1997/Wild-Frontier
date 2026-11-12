const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 html=html.replace('window.wildFrontierReady=true;',`window.stairTest={...(await import('./src/stairs.js')),THREE,buildings,objects,player,loadGame,addBuilding,stairSurface,stairLowerEnd,movePlayer,advanceVertical,terrainHeight,stairDimensions,PLAYER,WALL_HEIGHT,worldToLocal,
  setMotion(walking,velocity){grounded=walking;verticalSpeed=velocity;},motion(){return {grounded,verticalSpeed};},
  previewAt(type,target){yaw=0;pitch=0;player.pos.set(target.x,target.y,target.z+2.6);placement={type,rotation:0,stairFlip:0,mesh:makeBuilding(type,0,0,0,true)};updatePlacement();return {type,x:placement.mesh.position.x,z:placement.mesh.position.z,rotation:placement.rotation,mesh:{position:{y:placement.elevation}}};},
  setWalking(){grounded=true;verticalSpeed=0;}};window.wildFrontierReady=true;`);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='cdn.jsdelivr.net'&&process.env.THREE_MODULE_PATH)return route.fulfill({path:process.env.THREE_MODULE_PATH,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
  if(url.hostname==='cdn.jsdelivr.net')return route.continue();
  if(url.hostname==='esm.sh')return route.fulfill({body:'export function createClient(){return {auth:{getUser:async()=>({data:{user:null}})}}}',contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
  if(url.hostname==='wild-frontier.test')return url.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):route.fulfill({path:path.join(root,url.pathname),contentType:'text/javascript'});
  return route.abort();
 });
 await page.goto('http://wild-frontier.test/');
 try{await page.waitForFunction(()=>window.wildFrontierReady===true,{},{timeout:45000,polling:50});}
 catch(e){throw Error(e.message+'; page errors: '+errors.join(' | ')+'; status: '+await page.locator('#menuStatus').textContent());}
 const result=await page.evaluate(()=>{
  const t=window.stairTest,{THREE}=t;let checks=0;
  function near(a,b,msg){if(Math.abs(a-b)>1e-6)throw Error(msg+': '+a+' != '+b);checks++;}
  for(const degrees of [0,90,180,270]){
   t.buildings.length=0;t.objects.length=0;const r=degrees*Math.PI/180;
   function world(z,x=0){return new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),r).add(new THREE.Vector3(200,0,200));}
   const center=world(-1.5);
   t.addBuilding('raisedFoundation',center.x,center.z,r,false,1,19.88);
   t.addBuilding('steepStairs',200,200,r,false,1,20);
   const end=t.stairLowerEnd(t.buildings[1]);t.addBuilding('steepStairs',end.x,end.z,r,false,1,end.y);
   for(const b of t.buildings.filter(b=>b.type==='steepStairs')){
    b.mesh.updateMatrixWorld(true);
    const mid=b.mesh.localToWorld(new THREE.Vector3(0,-.72,1.05));
    near(t.stairSurface(mid.x,mid.z),mid.y,'real mesh matrix agrees with ramp');
   }
   const saved=t.buildings.map(({type,x,z,rotation,elevation,groupId})=>({type,x,z,rotation,elevation,groupId}));
   // Test the real loader constructing real meshes from unchanged JSON values.
   t.buildings.length=0;const bottom=world(4.2);
   t.loadGame({version:4,pos:[bottom.x,bottom.z],buildings:JSON.parse(JSON.stringify(saved))});t.setWalking();
   near(t.player.pos.y-1.7,17.12,'saved lower support');
   const up=new THREE.Vector3(-Math.sin(r),0,-Math.cos(r));
   t.movePlayer(up,4.7);const deck=world(-.5);
   near(t.player.pos.x,deck.x,'walk onto raised foundation X');near(t.player.pos.z,deck.z,'walk onto raised foundation Z');near(t.player.pos.y-1.7,20,'deck height');
   t.movePlayer(up.clone().negate(),4.7);
   near(t.player.pos.x,bottom.x,'descent X');near(t.player.pos.z,bottom.z,'descent Z');near(t.player.pos.y-1.7,17.12,'lower end after descent');
  }
  for(const degrees of [0,90,180,270])for(const type of ['stairs','steepStairs']){
   t.buildings.length=0;t.objects.length=0;const r=degrees*Math.PI/180,d=t.stairDimensions(type);
   const frame={x:200,z:200,rotation:r};
   function world(x,z){return new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),r).add(new THREE.Vector3(200,0,200));}
   const low=world(0,d.length),top=t.terrainHeight(low.x,low.z)+d.drop+d.rise*.5;
   const centre=world(0,-1.5);t.addBuilding('raisedFoundation',centre.x,centre.z,r,false,1,top-.12);
   t.addBuilding(type,200,200,r,false,1,top);
   near(t.buildings[1].mesh.children[0].geometry.parameters.width,d.halfWidth*2,'real tread width');
   const start=world(0,d.length+.6);t.player.pos.set(start.x,t.terrainHeight(start.x,start.z)+t.PLAYER.eyeHeight,start.z);t.setWalking();
   const up=new THREE.Vector3(-Math.sin(r),0,-Math.cos(r)),total=d.length+1.4;
   for(const sign of [1,-1]){
    let distance=0;
    while(distance<total-1e-8){
     const step=Math.min(.1,total-distance);distance+=step;t.movePlayer(up.clone().multiplyScalar(sign),step);t.advanceVertical(step/6);
     const p=t.worldToLocal(frame,t.player.pos.x,t.player.pos.z),expected=sign===1?d.length+.6-distance:-.8+distance;
     near(p.z,expected,'real terrain first-step traversal');near(t.motion().verticalSpeed,0,'no automatic hop');
    }
   }
   t.buildings.length=0;t.addBuilding(type,200,200,r,false,1,20);
   const mid=world(0,d.length/2),body=t.stairVolume(t.buildings[0],mid.x,mid.z);
   t.player.pos.set(mid.x,body.bottom-t.PLAYER.headOffset-.05,mid.z);t.setMotion(false,7.1);t.advanceVertical(.1);
   if(t.player.pos.y+t.PLAYER.headOffset>body.bottom+1e-6||t.motion().verticalSpeed>0)throw Error('underside jump');checks++;
   const side=world(2,d.length/2);t.player.pos.set(side.x,t.terrainHeight(side.x,side.z)+t.PLAYER.eyeHeight,side.z);t.setWalking();
   const across=new THREE.Vector3(-Math.cos(r),0,Math.sin(r));t.movePlayer(across,4);
   near(t.worldToLocal(frame,t.player.pos.x,t.player.pos.z).x,-2,'real-mesh underpass');
   t.player.pos.set(side.x,20-d.drop/2-.5+t.PLAYER.eyeHeight,side.z);t.setMotion(false,4);t.movePlayer(across,2);
   if(t.worldToLocal(frame,t.player.pos.x,t.player.pos.z).x<d.halfWidth+t.PLAYER.radius-1e-6)throw Error('side jump entered body');checks++;
   t.buildings.length=0;t.addBuilding('wall',200,200,r,false,1,10-t.WALL_HEIGHT);
   for(const upward of [false,true]){
    const preview=t.previewAt(type,{x:200,z:200,y:10+(upward?d.drop/2:-d.drop/2)});
    const end=t.stairEnds(preview)[upward?1:0];near(end.x,200,'wall snap X');near(end.z,200,'wall snap Z');near(end.y,10,'wall crown elevation');
   }
  }
  for(const degrees of [0,90,180,270])for(const x of [-1.24,-1.21,0,1.21,1.24])for(const sign of [-1,1]){
   t.buildings.length=0;t.objects.length=0;const rotation=degrees*Math.PI/180,frame={x:200,z:200,rotation};
   const point=(x,z)=>new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),rotation).add(new THREE.Vector3(200,0,200));
   t.addBuilding('stairs',200,200,rotation,false,1,20);
   let z=sign===-1?.16:.5;const start=point(x,z);
   t.player.pos.set(start.x,20-.7*z/2.75+t.PLAYER.eyeHeight,start.z);t.setWalking();
   for(let i=0;i<30;i++){
    z+=sign*.01;t.movePlayer(new THREE.Vector3(sign*Math.sin(rotation),0,sign*Math.cos(rotation)),.01);t.advanceVertical(1/60);
    const p=t.worldToLocal(frame,t.player.pos.x,t.player.pos.z);
    near(p.x,x,'flat tread edge: no sideways ejection');near(p.z,z,'flat tread edge: no extra forward movement');
    near(t.player.pos.y-t.PLAYER.eyeHeight,20-.7*Math.max(0,z)/2.75,'flat tread edge: stable ramp support');
   }
  }
  return checks;
 });assert.deepEqual(errors,[]);console.log(`PASS browser: ${result} assertions using real Three.js meshes, 4 rotations, real-terrain entry, chained stairs, raised deck, underside/side jumps, underpass, wall-top snaps save reload and flat-tread edge movement; no page errors`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
