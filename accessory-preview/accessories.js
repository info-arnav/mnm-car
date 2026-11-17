// Roof coordinates in the original 1600 × 900 image plane.
// Each set is front-left, front-right, rear-right, rear-left.
const roofKeys = [
  [0, [[640,225],[960,225],[949,215],[651,215]]],
  [9, [[795,254],[967,224],[639,173],[418,208]]],
  [18,[[846,259],[852,221],[358,222],[318,258]]],
  [27,[[916,247],[823,208],[427,236],[337,274]]],
  [36,[[967,253],[633,253],[628,277],[972,277]]],
  [45,[[784,229],[581,271],[1042,269],[1006,237]]],
  [54,[[536,258],[526,235],[1078,232],[1102,257]]],
  [63,[[566,256],[736,220],[1074,232],[1182,266]]],
  [72,[[640,225],[960,225],[949,215],[651,215]]]
];
function roofAt(frame){
  const n=((frame%72)+72)%72, i=Math.floor(n/9),t=(n-i*9)/9;
  return roofKeys[i][1].map((p,j)=>p.map((v,k)=>v+(roofKeys[i+1][1][j][k]-v)*t));
}
function accessorySvg(frame, type){
  if(type==='none')return '';
  const q=roofAt(frame);
  function point(u,v,h=0){
    const a=q[0].map((x,i)=>x+(q[1][i]-x)*u);
    const b=q[3].map((x,i)=>x+(q[2][i]-x)*u);
    return [a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v-h];
  }
  const items=[];
  function tube(a,b,width=10){
    const gradient='url(#metal)';
    items.push(`<path d="M${a} L${b}" stroke="#080b0c" stroke-width="${width+4}" stroke-linecap="round"/><path d="M${a} L${b}" stroke="${gradient}" stroke-width="${width}" stroke-linecap="round"/>`);
  }
  // Two cross bars use raised feet at both factory roof rails.
  for(const v of [.22,.77]){
    for(const u of [0,1]){
      const a=point(u,v,0),b=point(u,v,14);
      tube(a,b,15);
    }
    tube(point(-.025,v,15),point(1.025,v,15),10);
  }
  if(type==='carrier'){
    for(const v of [.1,.3,.5,.7,.9])tube(point(.02,v,25),point(.98,v,25),6);
    for(const u of [.02,.98])tube(point(u,.08,27),point(u,.92,27),10);
    for(const v of [.08,.92])tube(point(.02,v,27),point(.98,v,27),10);
  }
  return `<defs><linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dae0e1"/><stop offset=".4" stop-color="#818b91"/><stop offset=".6" stop-color="#c9cfd2"/><stop offset="1" stop-color="#3b4348"/></linearGradient></defs>${items.join('')}`;
}
