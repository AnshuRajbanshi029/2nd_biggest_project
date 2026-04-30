// Standalone diagnostic: parse the bike GLB, run my connected-components logic
// against the Rubber mesh, and report what we'd pick as "tires".
const fs = require('fs');
const path = require('path');

const bytes = fs.readFileSync(path.join(__dirname, 'yamaha_motorcycle_fz_16.glb'));
const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const jsonLen = dv.getUint32(12, true);
const json = JSON.parse(bytes.slice(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const binBytes = bytes.slice(binStart);

const matNames = json.materials.map((m) => m.name);
const rubberMeshIdx = json.meshes.findIndex((m) => matNames[m.primitives[0].material] === 'Rubber');
console.log('Rubber mesh index:', rubberMeshIdx, json.meshes[rubberMeshIdx]?.name);

const prim = json.meshes[rubberMeshIdx].primitives[0];

function readAcc(idx) {
  const a = json.accessors[idx];
  const bv = json.bufferViews[a.bufferView];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const itemSize = a.type === 'VEC3' ? 3 : a.type === 'VEC2' ? 2 : 1;
  const Ctor = a.componentType === 5126 ? Float32Array
    : a.componentType === 5125 ? Uint32Array
    : a.componentType === 5123 ? Uint16Array
    : null;
  return new Ctor(binBytes.buffer, binBytes.byteOffset + off, a.count * itemSize);
}

const positions = readAcc(prim.attributes.POSITION);
const indices = readAcc(prim.indices);
const vertCount = positions.length / 3;
const triCount = indices.length / 3;
console.log('verts:', vertCount, 'tris:', triCount);

// Bbox of full rubber mesh
let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity,zmin=Infinity,zmax=-Infinity;
for (let i=0;i<vertCount;i++){
  const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2];
  if(x<xmin)xmin=x;if(x>xmax)xmax=x;
  if(y<ymin)ymin=y;if(y>ymax)ymax=y;
  if(z<zmin)zmin=z;if(z>zmax)zmax=z;
}
console.log('bbox X:[', xmin.toFixed(1), xmax.toFixed(1), '] Y:[', ymin.toFixed(1), ymax.toFixed(1), '] Z:[', zmin.toFixed(1), zmax.toFixed(1), ']');
const fullRangeX = xmax - xmin;

// Union-find connected components
const parent = new Int32Array(vertCount);
for (let i=0;i<vertCount;i++) parent[i]=i;
function find(x){ let r=x; while(parent[r]!==r) r=parent[r]; while(parent[x]!==r){const n=parent[x];parent[x]=r;x=n;} return r;}
function union(a,b){const ra=find(a),rb=find(b);if(ra!==rb)parent[ra]=rb;}
for (let t=0;t<triCount;t++){
  const a=indices[t*3],b=indices[t*3+1],c=indices[t*3+2];
  union(a,b); union(b,c);
}
const groups = new Map();
for (let i=0;i<vertCount;i++){
  const r=find(i);
  let g = groups.get(r);
  if (!g) { g=[]; groups.set(r,g); }
  g.push(i);
}
console.log('Total connected components:', groups.size);

const components = [];
for (const verts of groups.values()) {
  let xx0=Infinity,xx1=-Infinity,yy0=Infinity,yy1=-Infinity,zz0=Infinity,zz1=-Infinity;
  for (const v of verts){
    const x=positions[v*3],y=positions[v*3+1],z=positions[v*3+2];
    if(x<xx0)xx0=x;if(x>xx1)xx1=x;
    if(y<yy0)yy0=y;if(y>yy1)yy1=y;
    if(z<zz0)zz0=z;if(z>zz1)zz1=z;
  }
  components.push({
    nVerts: verts.length,
    sizeX: xx1-xx0, sizeY: yy1-yy0, sizeZ: zz1-zz0,
    cx: (xx0+xx1)/2, cy: (yy0+yy1)/2, cz: (zz0+zz1)/2
  });
}

// Sort by vertex count descending and show the top 10
components.sort((a,b)=>b.nVerts-a.nVerts);
console.log('\nTop 10 components (by vertex count):');
console.log('  nVerts |  sizeX  sizeY  sizeZ |   cx     cy     cz   | ratio  flat');
components.slice(0,10).forEach((c,i)=>{
  const maxXY = Math.max(c.sizeX, c.sizeY);
  const minXY = Math.min(c.sizeX, c.sizeY);
  const ratio = maxXY/Math.max(minXY,1e-6);
  const flat = c.sizeZ/Math.max(maxXY,1e-6);
  console.log(`  ${i.toString().padStart(2)}: ${c.nVerts.toString().padStart(5)} | ${c.sizeX.toFixed(0).padStart(5)} ${c.sizeY.toFixed(0).padStart(5)} ${c.sizeZ.toFixed(0).padStart(5)} | ${c.cx.toFixed(0).padStart(5)} ${c.cy.toFixed(0).padStart(5)} ${c.cz.toFixed(0).padStart(5)} | ${ratio.toFixed(2).padStart(5)} ${flat.toFixed(2).padStart(5)}`);
});

// Pick top 2 disc-shaped components from rubber → tires
const tireCands = components.filter((c)=>{
  if (c.nVerts < 64) return false;
  const sizes=[c.sizeX,c.sizeY,c.sizeZ].sort((a,b)=>a-b);
  if (sizes[2] < 0.05*fullRangeX) return false;
  return (sizes[0]/sizes[2]) < 0.5 && (sizes[1]/sizes[2]) > 0.6;
});
tireCands.sort((a,b)=>{
  const aS=[a.sizeX,a.sizeY,a.sizeZ].sort((x,y)=>y-x);
  const bS=[b.sizeX,b.sizeY,b.sizeZ].sort((x,y)=>y-x);
  return (bS[0]*bS[1])-(aS[0]*aS[1]);
});
const tires = tireCands.slice(0,2).sort((a,b)=>b.cx-a.cx);
console.log('\nTires (front first, by cx descending):');
tires.forEach((t,i)=>{
  const sortedSize=[t.sizeX,t.sizeY,t.sizeZ].sort((a,b)=>a-b);
  const radius = sortedSize[2]/2;
  console.log(`  wheel${i} (${i===0?'FRONT':'REAR'}): center=(${t.cx.toFixed(0)},${t.cy.toFixed(0)},${t.cz.toFixed(0)}) ext=${t.sizeX.toFixed(0)}x${t.sizeY.toFixed(0)}x${t.sizeZ.toFixed(0)} radius≈${radius.toFixed(0)}`);
});
const wheels = tires.map(t=>{
  const sortedSize=[t.sizeX,t.sizeY,t.sizeZ].sort((a,b)=>a-b);
  return { cx:t.cx, cy:t.cy, cz:t.cz, radius:sortedSize[2]/2, tireSizeY:t.sizeY };
});

// Now scan the OTHER meshes for components inside each wheel's disc.
console.log('\n--- Sweeping other meshes for wheel parts ---');
for (let mi=0; mi<json.meshes.length; mi++){
  if (mi === rubberMeshIdx) continue;
  const m = json.meshes[mi];
  const matName = matNames[m.primitives[0].material];
  const p = m.primitives[0];
  if (p.indices === undefined) continue;
  const pos = readAcc(p.attributes.POSITION);
  const idx = readAcc(p.indices);
  const vc = pos.length/3, tc = idx.length/3;
    const par = new Int32Array(vc);
  for (let i=0;i<vc;i++) par[i]=i;
  function fnd(x){let r=x;while(par[r]!==r)r=par[r];while(par[x]!==r){const n=par[x];par[x]=r;x=n;}return r;}
  function un(a,b){const ra=fnd(a),rb=fnd(b);if(ra!==rb)par[ra]=rb;}
  for (let t=0;t<tc;t++){un(idx[t*3],idx[t*3+1]);un(idx[t*3+1],idx[t*3+2]);}
  const grp = new Map();
  for (let i=0;i<vc;i++){const r=fnd(i);let g=grp.get(r);if(!g){g=[];grp.set(r,g);}g.push(i);}
    let parts = [];
  for (const verts of grp.values()){
    if (verts.length < 8) continue;
    let xx0=Infinity,xx1=-Infinity,yy0=Infinity,yy1=-Infinity,zz0=Infinity,zz1=-Infinity;
    for (const v of verts){
      const x=pos[v*3],y=pos[v*3+1],z=pos[v*3+2];
      if(x<xx0)xx0=x;if(x>xx1)xx1=x;
      if(y<yy0)yy0=y;if(y>yy1)yy1=y;
      if(z<zz0)zz0=z;if(z>zz1)zz1=z;
    }
    const cx=(xx0+xx1)/2,cy=(yy0+yy1)/2,cz=(zz0+zz1)/2;
    const sx=xx1-xx0,sy=yy1-yy0,sz=zz1-zz0;
    const compMax = Math.max(sx,sy,sz);
        for (let w=0; w<wheels.length; w++){
      const wh = wheels[w];
      const dx = cx - wh.cx, dz = cz - wh.cz;
      const dist = Math.hypot(dx, dz);
      if (dist > wh.radius * 0.95) continue;
      if (compMax > wh.radius * 2.4) continue;
      const dAxle = Math.abs(cy - wh.cy);
      if (dAxle > wh.tireSizeY * 0.6) continue;
      // Disc-containment: bbox edge in wheel plane shouldn't escape tire radius.
      const inPlaneHalf = 0.5 * Math.max(sx, sz);
      if (dist + inPlaneHalf > wh.radius * 1.1) continue;
      parts.push({ wheel:w, dist, dAxle, sx, sy, sz, cx, cy, cz, nVerts: verts.length });
      break;
    }
  }
  if (parts.length > 0){
    console.log(`  mesh#${mi} (${matName}) → ${parts.length} matched component(s):`);
    parts.forEach(p=>console.log(`     wheel${p.wheel} dist=${p.dist.toFixed(0)} dAxle=${p.dAxle.toFixed(0)} ext=${p.sx.toFixed(0)}x${p.sy.toFixed(0)}x${p.sz.toFixed(0)} nv=${p.nVerts}`));
  }
}

// Diagnostic: show every NEAR-wheel component (centered within 60mm of either wheel),
// regardless of any filter, so we can spot rims/spokes that may be missed.
console.log('\n--- All components centered within 60mm of either wheel hub ---');
for (let mi=0; mi<json.meshes.length; mi++){
  if (mi === rubberMeshIdx) continue;
  const m = json.meshes[mi];
  const matName = matNames[m.primitives[0].material];
  const p = m.primitives[0];
  if (p.indices === undefined) continue;
  const pos = readAcc(p.attributes.POSITION);
  const idx = readAcc(p.indices);
  const vc = pos.length/3, tc = idx.length/3;
  const par = new Int32Array(vc);
  for (let i=0;i<vc;i++) par[i]=i;
  function fnd2(x){let r=x;while(par[r]!==r)r=par[r];while(par[x]!==r){const n=par[x];par[x]=r;x=n;}return r;}
  function un2(a,b){const ra=fnd2(a),rb=fnd2(b);if(ra!==rb)par[ra]=rb;}
  for (let t=0;t<tc;t++){un2(idx[t*3],idx[t*3+1]);un2(idx[t*3+1],idx[t*3+2]);}
  const grp = new Map();
  for (let i=0;i<vc;i++){const r=fnd2(i);let g=grp.get(r);if(!g){g=[];grp.set(r,g);}g.push(i);}
  const nearby = [];
  for (const verts of grp.values()){
    if (verts.length < 16) continue;
    let xx0=Infinity,xx1=-Infinity,yy0=Infinity,yy1=-Infinity,zz0=Infinity,zz1=-Infinity;
    for (const v of verts){
      const x=pos[v*3],y=pos[v*3+1],z=pos[v*3+2];
      if(x<xx0)xx0=x;if(x>xx1)xx1=x;
      if(y<yy0)yy0=y;if(y>yy1)yy1=y;
      if(z<zz0)zz0=z;if(z>zz1)zz1=z;
    }
    const cx=(xx0+xx1)/2,cy=(yy0+yy1)/2,cz=(zz0+zz1)/2;
    const sx=xx1-xx0,sy=yy1-yy0,sz=zz1-zz0;
    for (let w=0; w<wheels.length; w++){
      const wh = wheels[w];
      const dx = cx - wh.cx, dz = cz - wh.cz;
      const dist = Math.hypot(dx, dz);
      if (dist < 60){
        nearby.push({ wheel:w, dist, dAxle: Math.abs(cy-wh.cy), sx, sy, sz, nv: verts.length });
      }
    }
  }
  if (nearby.length){
    console.log(`  mesh#${mi} (${matName}):`);
    nearby.forEach(p=>console.log(`     wheel${p.wheel} dist=${p.dist.toFixed(0)} dAxle=${p.dAxle.toFixed(0)} ext=${p.sx.toFixed(0)}x${p.sy.toFixed(0)}x${p.sz.toFixed(0)} nv=${p.nv}`));
  }
}
