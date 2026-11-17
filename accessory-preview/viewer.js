const count=72;
const viewer=document.getElementById('viewer');
const car=document.getElementById('car');
const images=[];
let displayedFrame=0;
let frame=0, startX=0, startFrame=0, dragging=false;
const src=n=>`../frames/${String((n+count)%count).padStart(3,'0')}.webp`;
function show(n){
  const next=((n%count)+count)%count;
  if(next===frame)return;
  frame=next;
  preload(next);
  const img=images[next];
  const commit=()=>{
    if(frame!==next)return;
    car.src=src(next);
    displayedFrame=next;
    renderAccessory();
  };
  if(img.complete&&img.naturalWidth)commit();
  else img.addEventListener('load',commit,{once:true});
}
function preload(n){
  if(images[n])return;
  const img=new Image();
  img.src=src(n);
  images[n]=img;
}
preload(0);
setTimeout(()=>{
  let i=1;
  function batch(){
    for(let j=0;j<6&&i<count;j++,i++)preload(i);
    if(i<count)setTimeout(batch,35);
  }
  batch();
},150);
viewer.addEventListener('pointerdown',e=>{
  dragging=true;
  startX=e.clientX;
  startFrame=frame;
  viewer.setPointerCapture(e.pointerId);
});
viewer.addEventListener('pointermove',e=>{
  if(!dragging)return;
  const pixelsPerFrame=Math.max(5,viewer.clientWidth/100);
  show(startFrame+Math.round((startX-e.clientX)/pixelsPerFrame));
});
viewer.addEventListener('pointerup',()=>dragging=false);
viewer.addEventListener('pointercancel',()=>dragging=false);
viewer.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    e.preventDefault();
    show(frame+(e.key==='ArrowRight'?1:-1));
  }
});

const overlay=document.getElementById('accessory');
const selector=document.getElementById('roof-option');
const note=document.getElementById('selection-note');
function renderAccessory(){overlay.innerHTML=accessorySvg(displayedFrame,selector.value)}
selector.addEventListener('change',()=>{
  renderAccessory();
  note.textContent=selector.value==='none'?'Select an accessory to preview it on the car.':'Drag the car to inspect the selected roof accessory.';
});
document.getElementById('reset').addEventListener('click',()=>{
  selector.value='none';
  selector.dispatchEvent(new Event('change'));
});
renderAccessory();
