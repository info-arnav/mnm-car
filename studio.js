import * as THREE from 'three';
import {createColourController} from './colours.js?v=colours-1';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HDRLoader} from './vendor/HDRLoader.js';

const $=id=>document.getElementById(id),stage=$('stage'),canvas=$('vehicle');
const mobile=matchMedia('(max-width:760px)').matches;
const previewBase=mobile?'assets/rotation/mobile/':'assets/rotation/preview/';
let detailBase=mobile?'assets/car/mobile/':'assets/car/',colours;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.autoClear=false;
// Rendering is requested only when the view changes. No shadow updates or idle loop.
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene(),background=new THREE.Scene();background.background=new THREE.Color(0xf0f1ed);
const camera=new THREE.PerspectiveCamera(13,1,.1,100),screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);screenCamera.position.z=1;
const imageMaterial=new THREE.MeshBasicMaterial({transparent:true,toneMapped:false,depthWrite:false,depthTest:false});
const photo=new THREE.Mesh(new THREE.PlaneGeometry(2,2),imageMaterial);background.add(photo);
const key=new THREE.DirectionalLight(0xfffbf7,2);key.position.set(4,8,-3);scene.add(key,new THREE.HemisphereLight(0xe9f1f4,0x697065,.45));
const previews=new Map(),details=new Map(),pointers=new Map();
let previewTextures=new Map();
const configuration={
 factory:{title:'Standard roof',count:'No added accessories',description:'Keep the original roof rails on your Scorpio-N.'},
 crossbars:{title:'Roof crossbars',count:'1 accessory',description:'Aluminium crossbars with a clean black finish at the mounts.'},
 carrier:{title:'Integrated roof carrier',count:'1 accessory',description:'A streamlined roof carrier with five aluminium crossbars.'}
};
let model,crossbars,carrier,proxy,reference,poses,ready=false,displayReady=false;
let frame=9,desiredFrame=9,dragFrame=9,zoom=1,roofFocus=false,variant='factory',compare=false,auto=false;
let dirty=true,renderQueued=false,activeView='quarter',gesture,toastTimer,lastAuto=0,autoRequest;
let detailTimer,detailController,detailGeneration=0,usingDetail=false;
const wrap=n=>((Math.round(n)%72)+72)%72;
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const frameName=n=>String(n).padStart(3,'0')+'.webp';

function requestRender(){
 dirty=true;if(renderQueued||!displayReady||document.hidden)return;
 renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(dirty)render()});
}
function render(){
 if(!displayReady)return;
 renderer.clear();renderer.render(background,screenCamera);renderer.clearDepth();renderer.render(scene,camera);dirty=false;
}
function textureFor(image,detail=false){
 const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;
 texture.minFilter=detail?THREE.LinearMipmapLinearFilter:THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=detail;texture.needsUpdate=true;
 renderer.initTexture(texture);return texture;
}
async function prepareFrame(n){
 if(previews.has(n))return previews.get(n);
 const promise=(async()=>{
  const image=new Image();image.decoding='async';image.src=previewBase+frameName(n);await image.decode();
  await nextPaint();const texture=textureFor(image);previewTextures.set(n,texture);return image;
 })();previews.set(n,promise);return promise;
}
function cancelDetail(){
 clearTimeout(detailTimer);detailController?.abort();detailController=null;detailGeneration++;
}
function releaseDetail(entry){entry.texture.dispose();URL.revokeObjectURL(entry.url)}
function scheduleDetail(){
 clearTimeout(detailTimer);if(!ready||auto||pointers.size||document.hidden)return;
 const n=frame;
 if(details.has(n)){
  imageMaterial.map=details.get(n).texture;usingDetail=true;requestRender();return;
 }
 detailTimer=setTimeout(()=>loadDetail(n),240);
}
async function loadDetail(n){
 if(frame!==n||auto||pointers.size||document.hidden)return;
 const generation=++detailGeneration;detailController?.abort();const controller=new AbortController();detailController=controller;
 let url;
 try{
  const response=await fetch(new URL(frameName(n),new URL(detailBase,location.href)),{signal:controller.signal,cache:'force-cache'});
  if(!response.ok)throw Error('Image unavailable');
  const blob=await response.blob();url=URL.createObjectURL(blob);
  const image=new Image();image.decoding='async';image.src=url;await image.decode();
  if(generation!==detailGeneration||frame!==n||auto||pointers.size){URL.revokeObjectURL(url);return}
  const entry={image,url,texture:textureFor(image,true)};details.set(n,entry);
  while(details.size>3){const [old,item]=details.entries().next().value;details.delete(old);releaseDetail(item)}
  imageMaterial.map=entry.texture;usingDetail=true;requestRender();
 }catch(error){
  if(url)URL.revokeObjectURL(url);
  // Detail is an optional enhancement; the complete prepared rotation stays usable.
  if(error.name!=='AbortError')console.warn('Detail image could not be loaded.');
 }finally{if(detailController===controller)detailController=null}
}
function setFrame(n){
 n=wrap(n);if(!previewTextures.has(n))return;
 desiredFrame=n;
 if(frame!==n||!imageMaterial.map){
  cancelDetail();frame=n;usingDetail=false;imageMaterial.map=previewTextures.get(n);
  camera.position.copy(poses[n].position);camera.quaternion.copy(poses[n].quaternion);camera.updateMatrixWorld();projection();
 }
 scheduleDetail();
}
function projection(){
 if(!reference)return;
 const {width:W,height:H}=stage.getBoundingClientRect();if(!W||!H)return;
 const fit=Math.min(W/reference.w,H/reference.h)*zoom,panY=roofFocus?H*.29:H*(W<761?.065:.045),cx=W/2,cy=H/2+panY;
 const fx=reference.fl_x*fit,fy=reference.fl_y*fit,n=camera.near,f=camera.far;
 photo.scale.set(reference.w*fit/W,reference.h*fit/H,1);photo.position.set(0,-2*panY/H,0);camera.aspect=W/H;
 camera.projectionMatrix.set(2*fx/W,0,1-2*cx/W,0,0,2*fy/H,2*cy/H-1,0,0,0,-(f+n)/(f-n),-2*f*n/(f-n),0,0,-1,0);
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();requestRender();
}
function size(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);projection()}
new ResizeObserver(size).observe(stage);size();
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2500)}
function applyVisibility(){if(crossbars)crossbars.visible=variant==='crossbars'&&!compare;if(carrier)carrier.visible=variant==='carrier'&&!compare;requestRender()}
function selectVariant(next,persist=true){
 if(!configuration[next])next='factory';variant=next;compare=false;
 $('finish').setAttribute('aria-pressed','false');$('finish').textContent='View without accessories';applyVisibility();
 for(const label of document.querySelectorAll('.option')){const selected=label.dataset.variant===next;label.classList.toggle('selected',selected);label.querySelector('input').checked=selected}
 const value=configuration[next];$('selected-title').textContent=value.title;$('selected-count').textContent=value.count;$('selected-description').textContent=value.description;
 if(persist)try{localStorage.setItem('scorpio-accessory-prototype-v2',next)}catch{}
}
function autoStep(time){
 if(!auto)return;
 if(time-lastAuto>=110){lastAuto=time;setFrame(desiredFrame+1)}
 autoRequest=requestAnimationFrame(autoStep);
}
function setAuto(value){
 if(value&&!ready)return;
 auto=value;cancelAnimationFrame(autoRequest);$('auto-rotate').setAttribute('aria-pressed',String(value));
 if(value){cancelDetail();lastAuto=performance.now();autoRequest=requestAnimationFrame(autoStep)}else scheduleDetail();
}
function setView(view){
 if(!ready)return;setAuto(false);activeView=view;roofFocus=view==='roof';zoom=roofFocus?1.75:1;
 const n={quarter:9,front:0,side:18,rear:36,roof:14}[view]??9;dragFrame=n;setFrame(n);projection();
 document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
}
function changeZoom(factor){if(!ready)return;zoom=THREE.MathUtils.clamp(zoom*factor,.8,2.6);projection();scheduleDetail()}
$('options').onchange=event=>{if(event.target.name==='accessory')selectVariant(event.target.value)};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
$('zoom-in').onclick=()=>changeZoom(1.15);$('zoom-out').onclick=()=>changeZoom(1/1.15);
$('auto-rotate').onclick=()=>setAuto(!auto);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.stage-wrap').requestFullscreen()}catch{notify('Fullscreen is unavailable in this browser.')}};
$('finish').onclick=()=>{compare=!compare;applyVisibility();$('finish').textContent=compare?'Return to your selection':'View without accessories';$('finish').setAttribute('aria-pressed',String(compare))};
$('reset').onclick=()=>{selectVariant('factory');setView('quarter');notify('Your selection has been reset.')};
$('capture').onclick=()=>{render();canvas.toBlob(blob=>{if(!blob)return;const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=`Scorpio-N-${colours?.colour||'deep-forest'}-${variant}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Image saved.')},'image/png')};
canvas.addEventListener('pointerdown',event=>{
 if(!ready)return;event.preventDefault();setAuto(false);cancelDetail();canvas.setPointerCapture(event.pointerId);
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});dragFrame=desiredFrame;gesture={x:event.clientX,frame:dragFrame};
 if(pointers.size===2){const[a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom}}
 activeView=null;document.querySelectorAll('[data-view]').forEach(button=>button.classList.remove('active'));
});
canvas.addEventListener('pointermove',event=>{
 if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2&&gesture.distance){const[a,b]=[...pointers.values()];zoom=THREE.MathUtils.clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,.8,2.6);projection()}
 else if(pointers.size===1&&gesture.x!==undefined){dragFrame=gesture.frame-(event.clientX-gesture.x)/Math.max(3.5,stage.clientWidth/110);setFrame(dragFrame)}
});
function endPointer(event){pointers.delete(event.pointerId);if(pointers.size===1){const[a]=pointers.values();gesture={x:a.x,frame:desiredFrame}}else if(!pointers.size){gesture=null;scheduleDetail()}}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',event=>{if(!ready)return;event.preventDefault();changeZoom(Math.exp(-event.deltaY*.001))},{passive:false});
window.addEventListener('keydown',event=>{
 if(!ready||['INPUT','BUTTON','A','SELECT'].includes(document.activeElement.tagName))return;
 if(event.key==='ArrowLeft'){event.preventDefault();setAuto(false);setFrame(desiredFrame-1)}
 if(event.key==='ArrowRight'){event.preventDefault();setAuto(false);setFrame(desiredFrame+1)}
 if(event.key==='+'||event.key==='=')changeZoom(1.12);if(event.key==='-')changeZoom(1/1.12);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){setAuto(false);cancelDetail()}else{requestRender();scheduleDetail()}});
function showLoadingError(){
 $('loading').hidden=false;$('loading').setAttribute('role','alert');
 $('loading').innerHTML='<strong>Couldn’t load the model.</strong><button type="button" id="retry-loading">Try again</button>';
 $('retry-loading').onclick=()=>location.reload();
}
try{
 const [data,gltf,hdr]=await Promise.all([
  fetch('assets/reference-cameras.json').then(response=>{if(!response.ok)throw Error('Camera data unavailable');return response.json()}),
  new GLTFLoader().loadAsync('assets/scorpio-accessories.glb?v=rail-contact-3'),
  new HDRLoader().loadAsync('assets/studio-small-09.hdr'),prepareFrame(9)
 ]);
 reference=data;poses=reference.frames.map(item=>{const matrix=new THREE.Matrix4().set(...item.transform_matrix.flat()),position=new THREE.Vector3(),quaternion=new THREE.Quaternion();matrix.decompose(position,quaternion,new THREE.Vector3());return{position,quaternion}});
 model=gltf.scene;crossbars=model.getObjectByName('ACCESSORY_CROSSBARS');carrier=model.getObjectByName('ACCESSORY_CARRIER');proxy=model.getObjectByName('CAR_PROXY');
 if(!crossbars||!carrier||!proxy)throw Error('Accessory assembly incomplete');
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.65;hdr.dispose();pmrem.dispose();
 proxy.material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true});scene.add(model);
 let saved='factory';try{saved=localStorage.getItem('scorpio-accessory-prototype-v2')||'factory'}catch{}selectVariant(saved,false);
 displayReady=true;setFrame(9);imageMaterial.needsUpdate=true;size();render();$('poster').hidden=true;
 // Prepare every lightweight angle and both accessory shaders before enabling input.
 crossbars.visible=true;carrier.visible=true;
 const compile=Promise.all([renderer.compileAsync(scene,camera),renderer.compileAsync(background,screenCamera)]);
 const order=Array.from({length:72},(_,i)=>i).sort((a,b)=>Math.min(wrap(a-9),wrap(9-a))-Math.min(wrap(b-9),wrap(9-b)));
 let cursor=0;const workers=Array.from({length:4},async()=>{while(cursor<order.length)await prepareFrame(order[cursor++])});
 await Promise.all([compile,...workers]);
 ready=true;applyVisibility();render();$('loading').hidden=true;canvas.setAttribute('aria-busy','false');
 document.querySelector('#options fieldset').disabled=false;document.querySelectorAll('button').forEach(button=>button.disabled=false);
 colours=createColourController({THREE,renderer,assets:new URL('assets/',location.href),mobile,initialTextures:previewTextures,root:$('colours'),onSwap:next=>{cancelDetail();for(const item of details.values())releaseDetail(item);details.clear();previews.clear();previewTextures=next.textures;detailBase=next.detail.href;usingDetail=false;imageMaterial.map=previewTextures.get(frame);$('colour-label-name').textContent=next.name.toUpperCase();$('colour-label-dot').style.background=getComputedStyle(document.querySelector(`[aria-label="${next.name}"]`)).getPropertyValue('--swatch');canvas.setAttribute('aria-label',`${next.name} Scorpio-N. Drag to rotate and scroll or pinch to zoom.`);requestRender();scheduleDetail()}});
 window.prototypeApp={get colour(){return colours.colour},get loadingColour(){return colours.loading},get cachedColours(){return colours.cachedColours},selectColour:id=>colours.select(id),model,camera,renderer,scene,background,photo,crossbars,carrier,proxy,reference,setFrame,setView,selectVariant,render,
  rotationReady:true,get frame(){return frame},get variant(){return variant},get compare(){return compare},get zoom(){return zoom},
  get readyFrames(){return previewTextures.size},get usingDetail(){return usingDetail},get bounds(){return new THREE.Box3().setFromObject(model)}};
 scheduleDetail();
}catch(error){console.error(error);showLoadingError()}
