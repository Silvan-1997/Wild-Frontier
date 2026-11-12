const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 html=html.replace('window.wildFrontierReady=true;',`window.stairTest={THREE,buildings,objects,player,loadGame,addBuilding,stairSurface,stairLowerEnd,movePlayer,setWalking(){grounded=true;verticalSpeed=0;}};window.wildFrontierReady=true;`);
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
  return checks;
 });assert.deepEqual(errors,[]);console.log(`PASS browser: ${result} assertions using real Three.js meshes, 4 rotations, chained stairs, raised deck, save reload; no page errors`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
