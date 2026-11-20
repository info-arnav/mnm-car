import * as THREE from '../vendor/three.module.js';
import {createColourController} from '../colours.js?v=colours-1';
const params=new URL(location.href).searchParams,model=(params.get('id')||'SCN').trim().toUpperCase();
const $=id=>document.getElementById(id),host=$('viewer'),canvas=$('car');
let parentOrigin='*';try{const candidate=new URL(params.get('parentOrigin'));if(/^https?:$/.test(candidate.protocol))parentOrigin=candidate.origin}catch{}
const notify=type=>{if(parent!==window)parent.postMessage({namespace:'digiiq-3d-viewer',type,model},parentOrigin)};
let ready=false,active=true,frame=-1,zoom=1,auto=false,raf,autoRaf,lastAuto=0,detailTimer,controller,generation=0,gesture;
const pointers=new Map(),images=new Map(),details=new Map();
let textures=new Map(),colours;
const small=matchMedia('(max-width:760px)').matches,assets=new URL(['localhost','127.0.0.1','[::1]'].includes(location.hostname)?'../assets/':'https://mnm-car.digiiq.ai/assets/',import.meta.url);
const preview=new URL(small?'rotation/mobile/':'rotation/preview/',assets);
let detail=new URL(small?'car/mobile/':'car/',assets);
const frameFile=n=>String(n).padStart(3,'0')+'.webp',wrap=n=>((Math.round(n)%72)+72)%72;
let renderer,scene,camera,photo,material,usingDetail=false;
function draw(){if(!renderer||!material.map)return;renderer.render(scene,camera)}
function requestDraw(){if(raf||!active||document.hidden)return;raf=requestAnimationFrame(()=>{raf=0;draw()})}
function projection(){if(!renderer)return;const box=host.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);const viewHeight=Math.max(180,box.height-96),fit=Math.min(box.width/16,viewHeight/9)*zoom;photo.scale.set(16*fit/box.width,9*fit/box.height,1);photo.position.y=96/box.height;requestDraw()}
function makeTexture(image,sharp=false){const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=sharp?THREE.LinearMipmapLinearFilter:THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=sharp;texture.needsUpdate=true;renderer.initTexture(texture);return texture}
function cancelDetail(){clearTimeout(detailTimer);controller?.abort();controller=null;generation++}
function scheduleDetail(){clearTimeout(detailTimer);if(!ready||auto||pointers.size||!active||document.hidden)return;if(details.has(frame)){material.map=details.get(frame).texture;usingDetail=true;requestDraw();return}detailTimer=setTimeout(()=>loadDetail(frame),240)}
async function loadDetail(n){
 const token=++generation;controller?.abort();const abort=new AbortController();controller=abort;let url;
 try{const response=await fetch(new URL(frameFile(n),detail),{signal:abort.signal,cache:'force-cache'});if(!response.ok)throw Error('Image unavailable');url=URL.createObjectURL(await response.blob());const image=new Image();image.decoding='async';image.src=url;await image.decode();if(token!==generation||frame!==n||auto||pointers.size||!active){URL.revokeObjectURL(url);return}const entry={image,url,texture:makeTexture(image,true)};details.set(n,entry);while(details.size>3){const[old,item]=details.entries().next().value;details.delete(old);item.texture.dispose();URL.revokeObjectURL(item.url)}material.map=entry.texture;usingDetail=true;requestDraw()}catch(error){if(url)URL.revokeObjectURL(url);if(error.name!=='AbortError')console.warn('Detail image unavailable.')}finally{if(controller===abort)controller=null}
}
function setFrame(n){n=wrap(n);if(!textures.has(n))return;if(n!==frame){cancelDetail();frame=n;usingDetail=false;material.map=textures.get(n);requestDraw()}scheduleDetail()}
function setZoom(value){if(!ready)return;zoom=THREE.MathUtils.clamp(value,.8,2.6);projection();scheduleDetail()}
function autoStep(time){if(!auto)return;if(time-lastAuto>=110){lastAuto=time;setFrame(frame+1)}autoRaf=requestAnimationFrame(autoStep)}
function setAuto(value){if(value&&!ready)return;auto=value;cancelAnimationFrame(autoRaf);$('auto').setAttribute('aria-pressed',String(auto));$('auto').querySelector('span').textContent=auto?'Pause':'Auto rotate';if(auto){cancelDetail();lastAuto=performance.now();autoRaf=requestAnimationFrame(autoStep)}else scheduleDetail()}
function fail(message='Couldn’t load the model.'){$('loading').hidden=false;$('loading').setAttribute('role','alert');$('loading').replaceChildren();const text=document.createElement('span');text.textContent=message;$('loading').append(text);if(model==='SCN'){const button=document.createElement('button');button.className='retry';button.type='button';button.textContent='Try again';button.onclick=()=>location.reload();$('loading').append(button)}notify('error')}
$('zoom-in').onclick=()=>setZoom(zoom*1.15);$('zoom-out').onclick=()=>setZoom(zoom/1.15);$('auto').onclick=()=>setAuto(!auto);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await host.requestFullscreen()}catch{host.classList.toggle('expanded');projection()}};
canvas.addEventListener('pointerdown',event=>{if(!ready)return;setAuto(false);cancelDetail();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture={x:event.clientX,y:event.clientY,frame};if(event.pointerType==='mouse')canvas.setPointerCapture(event.pointerId);if(pointers.size===2){const[a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom}}});
canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2&&gesture.distance){event.preventDefault();const[a,b]=[...pointers.values()];setZoom(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance)}else if(pointers.size===1&&gesture.x!==undefined){const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(!gesture.rotating&&Math.abs(dy)>Math.abs(dx))return;if(Math.abs(dx)>5)gesture.rotating=true;if(gesture.rotating){canvas.setPointerCapture(event.pointerId);setFrame(gesture.frame-dx/Math.max(3.5,host.clientWidth/110))}}});
function end(event){pointers.delete(event.pointerId);if(pointers.size===1){const[a]=pointers.values();gesture={x:a.x,y:a.y,frame}}else if(!pointers.size){gesture=null;scheduleDetail()}}
canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
canvas.addEventListener('keydown',event=>{if(!ready)return;if(['ArrowLeft','ArrowRight','+','=','-','0'].includes(event.key))event.preventDefault();if(event.key==='ArrowLeft'){setAuto(false);setFrame(frame-1)}if(event.key==='ArrowRight'){setAuto(false);setFrame(frame+1)}if(event.key==='+'||event.key==='=')setZoom(zoom*1.12);if(event.key==='-')setZoom(zoom/1.12);if(event.key==='0'){zoom=1;setFrame(9);projection()}});
function pauseWhenHidden(){if(document.hidden||!active){setAuto(false);cancelDetail()}else{requestDraw();scheduleDetail()}}
document.addEventListener('visibilitychange',pauseWhenHidden);addEventListener('message',event=>{if(event.source!==parent||!event.data||event.data.namespace!=='digiiq-3d-viewer'||event.data.type!=='visibility')return;if(parentOrigin!=='*'&&event.origin!==parentOrigin)return;active=!!event.data.visible;pauseWhenHidden()});
try{
 if(model!=='SCN')throw Error('Unknown model');
 renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;material=new THREE.MeshBasicMaterial({transparent:true,toneMapped:false,depthTest:false,depthWrite:false});photo=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(photo);
 new ResizeObserver(projection).observe(host);projection();
 const order=Array.from({length:72},(_,i)=>i).sort((a,b)=>Math.min(wrap(a-9),wrap(9-a))-Math.min(wrap(b-9),wrap(9-b)));
 let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<order.length){const n=order[cursor++],image=new Image();image.crossOrigin='anonymous';image.decoding='async';image.src=new URL(frameFile(n),preview).href;await image.decode();await new Promise(requestAnimationFrame);images.set(n,image);textures.set(n,makeTexture(image));if(n===9){setFrame(9);material.needsUpdate=true;draw()}notify('progress')}}));
 await renderer.compileAsync(scene,camera);ready=true;setFrame(9);draw();$('loading').hidden=true;canvas.setAttribute('aria-busy','false');host.querySelectorAll('button').forEach(button=>button.disabled=false);notify('ready');scheduleDetail();
 colours=createColourController({THREE,renderer,assets,mobile:small,initialTextures:textures,root:$('colours'),onProgress:()=>notify('progress'),onSwap:next=>{cancelDetail();for(const item of details.values()){item.texture.dispose();URL.revokeObjectURL(item.url)}details.clear();textures=next.textures;images.clear();detail=next.detail;usingDetail=false;material.map=textures.get(frame);canvas.setAttribute('aria-label',`${next.name} Scorpio-N. Drag to rotate.`);requestDraw();scheduleDetail()}});
 window.DigiiqCarViewer={get colour(){return colours.colour},get loadingColour(){return colours.loading},get cachedColours(){return colours.cachedColours},selectColour:id=>colours.select(id),model,setFrame,setZoom,setAuto,renderer,get ready(){return ready},get readyFrames(){return textures.size},get frame(){return frame},get zoom(){return zoom},get usingDetail(){return usingDetail}};
}catch(error){console.error(error);fail(model==='SCN'?'Couldn’t load the model.':'This model is unavailable.')}
