// Renderer quality is independent of simulation state and savegames.
export function createGraphicsSettings({renderer,scene,camera,sun}) {
  // Quality preference is independent of the savegame and survives reloads.
  const GRAPHICS_KEY='wild_frontier_graphics_v1';
  const graphicsProfiles={
   low:{pixelRatio:1,shadows:false,far:65,shadowSize:512},
   medium:{pixelRatio:1.35,shadows:true,far:90,shadowSize:1024},
   high:{pixelRatio:2,shadows:true,far:115,shadowSize:2048}
  };
  let graphicsQuality='medium';
  try{
   const stored=localStorage.getItem(GRAPHICS_KEY);
   if(Object.hasOwn(graphicsProfiles,stored))graphicsQuality=stored;
  }catch(e){console.warn('Grafikpräferenz nicht lesbar',e);}
  function applyGraphicsQuality(level){
   if(!Object.hasOwn(graphicsProfiles,level))level='medium';
   graphicsQuality=level;
   const q=graphicsProfiles[level];
   renderer.setPixelRatio(Math.min(devicePixelRatio,q.pixelRatio));
   renderer.setSize(innerWidth,innerHeight);
   renderer.shadowMap.enabled=q.shadows;
   scene.fog.near=q.far*.32;scene.fog.far=q.far;
   camera.far=Math.max(140,q.far+20);camera.updateProjectionMatrix();
   const selector=document.querySelector('#graphicsQuality');
   if(selector)selector.value=level;
   const info=document.querySelector('#graphicsInfo');
   if(info)info.textContent=`Sichtweite ${q.far} m · Schatten ${q.shadows?'AN':'AUS'} · Auflösung max. ${q.pixelRatio}×`;
   try{localStorage.setItem(GRAPHICS_KEY,level);}catch(e){console.warn('Grafikpräferenz nicht speicherbar',e);}
  }
  
  // Apply shadow resolution to the actual directional light.
  const apply=applyGraphicsQuality;
  function setQuality(level){
    apply(level);
    const q=graphicsProfiles[graphicsQuality];
    if(sun.shadow.mapSize.x!==q.shadowSize){
      sun.shadow.mapSize.set(q.shadowSize,q.shadowSize);
      if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    }
  }
  return {setQuality, getQuality:()=>graphicsQuality};
}
