// Shared colour loading and controls for the studio and isolated embed.
export const COLOURS = [
 {id:'deep-forest',name:'Deep Forest',swatch:'#424632'},
 {id:'everest-white',name:'Everest White',swatch:'#f0f0eb'},
 {id:'galaxy-grey',name:'Galaxy Grey',swatch:'#64686c'},
 {id:'oceanic-blue',name:'Oceanic Blue',swatch:'#163f52'},
 {id:'stealth-black',name:'Stealth Black',swatch:'#1b1c1d'}
];
export function colourPaths(assets,id,mobile) {
 return id==='deep-forest'
  ? {preview:new URL(mobile?'rotation/mobile/':'rotation/preview/',assets),detail:new URL(mobile?'car/mobile/':'car/',assets)}
  : {preview:new URL(`colours/${id}/${mobile?'mobile':'preview'}/`,assets),detail:new URL(`colours/${id}/${mobile?'detail-mobile':'detail'}/`,assets)};
}
export function createColourController({THREE,renderer,assets,mobile,initialTextures,root,onSwap,onProgress=()=>{}}) {
 let current='deep-forest',pending=null,request=0;
 const cache=new Map([[current,{textures:initialTextures}]]),buttons=new Map();
 root.classList.add('colour-picker');
 const group=document.createElement('div');group.className='colour-swatches';group.setAttribute('role','group');group.setAttribute('aria-label','Exterior colour');
 const label=document.createElement('div');label.className='colour-name';label.setAttribute('role','status');label.setAttribute('aria-live','polite');label.setAttribute('aria-atomic','true');
 for(const colour of COLOURS){
  const button=document.createElement('button');button.type='button';button.className='colour-swatch';button.title=colour.name;button.setAttribute('aria-label',colour.name);button.style.setProperty('--swatch',colour.swatch);
  const paint=document.createElement('span');paint.setAttribute('aria-hidden','true');button.append(paint);button.onclick=()=>select(colour.id);buttons.set(colour.id,button);group.append(button);
 }
 root.append(group,label);
 function update(message){
  for(const [id,button] of buttons){button.setAttribute('aria-pressed',String(id===current));button.setAttribute('aria-busy',String(id===pending?.id));}
  label.textContent=message||(pending?`Loading ${COLOURS.find(c=>c.id===pending.id).name}…`:COLOURS.find(c=>c.id===current).name);
 }
 function dispose(entry){for(const texture of entry.textures.values()){texture.dispose();texture.image?.close?.()}entry.textures.clear()}
 async function prepare(id,signal){
  const textures=new Map(),base=colourPaths(assets,id,mobile).preview;let cursor=0;
  const workers=Array.from({length:4},async()=>{
   while(cursor<72&&!signal.aborted){
    const n=cursor++;let objectURL;
    try{
     const response=await fetch(new URL(String(n).padStart(3,'0')+'.webp',base),{signal,cache:'force-cache'});
     if(!response.ok)throw Error('Colour image unavailable');
     objectURL=URL.createObjectURL(await response.blob());const image=new Image();image.decoding='async';image.src=objectURL;await image.decode();
     if(signal.aborted)throw new DOMException('Cancelled','AbortError');
     await new Promise(resolve=>requestAnimationFrame(resolve));
     if(signal.aborted)throw new DOMException('Cancelled','AbortError');
     const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
     renderer.initTexture(texture);textures.set(n,texture);onProgress();
    }finally{if(objectURL)URL.revokeObjectURL(objectURL)}
   }
  });
  const results=await Promise.allSettled(workers);
  const failure=results.find(result=>result.status==='rejected');
  if(failure||signal.aborted||textures.size!==72){dispose({textures});throw failure?.reason||new DOMException('Cancelled','AbortError')}
  return {textures};
 }
 async function select(id){
  if(!COLOURS.some(c=>c.id===id))return false;
  const ticket=++request,previous=pending;
  previous?.abort.abort();
  if(previous)await previous.promise.catch(()=>{});
  if(ticket!==request)return false;
  pending=null;
  if(id===current){update();return true}
  if(!cache.has(id)){
   // Keep at most two complete rotations on the GPU, including the active one.
   for(const [key,entry] of cache)if(key!==current){dispose(entry);cache.delete(key)}
   const abort=new AbortController(),job={id,abort,promise:null};pending=job;update();
   job.promise=prepare(id,abort.signal);
   try{
    const entry=await job.promise;
    if(ticket!==request){dispose(entry);return false}
    cache.set(id,entry);
   }catch(error){
    if(ticket===request){pending=null;update(`Couldn’t load ${COLOURS.find(c=>c.id===id).name}. Select it to retry.`)}
    return false;
   }
  }
  if(ticket!==request)return false;
  pending=null;current=id;
  onSwap({id,name:COLOURS.find(c=>c.id===id).name,textures:cache.get(id).textures,...colourPaths(assets,id,mobile)});
  update();return true;
 }
 update();
 return {select,get colour(){return current},get loading(){return pending?.id||null},get cachedColours(){return [...cache.keys()]}};
}
