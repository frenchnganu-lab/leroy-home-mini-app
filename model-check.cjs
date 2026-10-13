const fs=require('node:fs');const ts=require('typescript');const assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/lib/wardrobe.ts','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module0={exports:{}};new Function('require','module','exports',code)(require,module0,module0.exports);const m=module0.exports;
const c={dims:[180,220,55],supportHeight:8,support:'Цоколь',guides:'Blum',niche:false,material:'ЛДСП Egger',decor:[],handles:'Без'};
let root=m.split(m.empty(),'x',3);let g=m.geometry(root,c);assert.deepEqual(g.boxes.filter(b=>b.parent===root.id).map(b=>b.w),[579,579,578]);assert.equal(g.boxes[0].h,2088);
const [left,center,right]=root.children;
root=m.changeNode(root,left.id,n=>m.filled(n,'shelf',2));root=m.changeNode(root,right.id,n=>m.split(n,'y',2));const bottom=m.findNode(root,right.id).children[0];root=m.changeNode(root,bottom.id,n=>m.filled(n,'drawers',2));
g=m.geometry(root,c);assert.equal(g.boxes.find(b=>b.id===bottom.id).h,1036);assert.deepEqual(m.totals(root),[2,0,2]);assert.equal(m.findNode(root,center.id).shelves.length,0);assert.equal(m.findNode(root,center.id).drawers.length,0);assert.deepEqual(g.errors,[]);
const copy=JSON.parse(JSON.stringify(root));assert.equal(m.validateTree(copy),true);assert.equal(m.openingSchema.safeParse(copy).success,true);assert.deepEqual(m.geometry(copy,c).parts,g.parts);
const resized=m.geometry(root,{...c,dims:[200,220,55]});assert.equal(resized.boxes.find(b=>b.id===bottom.id).id,bottom.id);assert.equal(m.findNode(root,left.id).shelves.length,2);
const bad=m.changeNode(root,bottom.id,n=>({...n,drawers:n.drawers.map((d,i)=>({...d,ratio:i===0?.99:.01}))}));assert.ok(m.geometry(bad,c).errors.some(x=>x.includes('ящик')));
const overlap=m.changeNode(root,left.id,n=>({...n,shelves:n.shelves.map(s=>({...s,at:.5}))}));assert.ok(m.geometry(overlap,c).errors.some(x=>x.includes('полки')));
const door=m.leafFront(root,center.id,1);assert.equal(m.totals(door)[1],1);assert.deepEqual(m.totals(m.rootFront(door,3)),[2,3,2]);
const cleared=m.clearFilling(m.rootFront(root,3));assert.deepEqual(m.totals(cleared),[0,3,0]);assert.equal(m.findNode(cleared,bottom.id).id,bottom.id);assert.equal(m.findNode(cleared,right.id).children.length,2);assert.equal(m.validateTree(cleared),true);assert.deepEqual(m.geometry(cleared,c).errors,[]);
const blank=m.createWardrobe();assert.deepEqual(m.totals(blank),[0,0,0]);assert.equal(blank.children,undefined);assert.equal(m.validateTree(blank),true);const blankGeometry=m.geometry(blank,c);assert.equal(blankGeometry.boxes.length,1);assert.deepEqual(blankGeometry.errors,[]);assert.equal(blankGeometry.parts.some(p=>p.kind==='shelf'||p.kind==='drawer'||p.kind==='door'||p.id.includes('partition')),false);assert.equal(blankGeometry.W,g.W);assert.equal(blankGeometry.H,g.H);assert.equal(blankGeometry.D,g.D);

const THREE=require('three');
const baseFront={type:'single',direction:'left',material:'МДФ Эмаль',wood:2,handles:'Рейлинг',panel:true};
for(const [type,direction,axis,sign] of [['single','left','y',-1],['single','right','y',1],['lift','up','x',-1],['drop','down','x',1]]){
 const front={...baseFront,type,direction};const tree=m.setFacade(blank,blank.id,front);assert.equal(m.validateTree(tree),true);assert.equal(m.openingSchema.safeParse(tree).success,true);
 const parts=m.geometry(tree,c).parts;const door=parts.find(p=>p.kind==='door');assert.equal(door.pivot.axis,axis);assert.equal(Math.sign(door.pivot.angle),sign);assert.equal(door.finish.wood,2);
 const axisVector=axis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
 const relative=new THREE.Vector3(door.x-door.pivot.x,door.y-door.pivot.y,door.z-door.pivot.z).applyAxisAngle(axisVector,door.pivot.angle);
 assert.ok(relative.z>50,'Opened '+type+' must project forward, outside the body');
 const handle=parts.find(p=>p.kind==='handle');assert.deepEqual(handle.pivot,door.pivot);assert.equal(door.finish.material,'МДФ Эмаль');
 const restored=m.openingSchema.parse(JSON.parse(JSON.stringify(tree)));assert.deepEqual(m.geometry(restored,c).parts,parts);
}
const pair=m.setFacade(blank,blank.id,{...baseFront,type:'double',direction:'left',secondDirection:'right'});const pairDoors=m.geometry(pair,c).parts.filter(p=>p.kind==='door');assert.equal(pairDoors.length,2);assert.ok(pairDoors[0].pivot.angle<0&&pairDoors[1].pivot.angle>0);assert.ok(pairDoors[0].pivot.x<pairDoors[1].pivot.x);assert.deepEqual(m.totals(pair),[0,2,0]);
let local=m.setFacade(root,left.id,{...baseFront,direction:'right'});local=m.setFacade(local,bottom.id,{...baseFront,type:'lift',direction:'up',wood:1});assert.equal(m.validateTree(local),true);assert.equal(m.findNode(local,left.id).front.wood,2);assert.equal(m.findNode(local,bottom.id).front.wood,1);assert.equal(m.findNode(local,center.id).doors,0);
const common=m.setFacade(local,root.id,{...baseFront,type:'double',secondDirection:'right'});assert.equal(m.findNode(common,left.id).doors,0);assert.equal(m.findNode(common,bottom.id).front,undefined);assert.equal(m.coveredByFront(common,bottom.id).id,root.id);assert.deepEqual(m.totals(common),[2,2,2]);assert.equal(m.validateTree(common),true);
const replaceCommon=m.setFacade(common,bottom.id,{...baseFront,type:'drop',direction:'down'});assert.equal(replaceCommon.doors,0);assert.equal(replaceCommon.front,undefined);assert.equal(m.findNode(replaceCommon,bottom.id).doors,1);assert.equal(m.validateTree(replaceCommon),true);
const open=m.setFacade(replaceCommon,bottom.id);assert.equal(m.totals(open)[1],0);assert.equal(m.findNode(open,bottom.id).drawers.length,2);
const invalidDirection={...m.setFacade(blank,blank.id,{...baseFront,type:'lift',direction:'up'}),front:{...baseFront,type:'lift',direction:'left'}};assert.equal(m.validateTree(invalidDirection),false);
const overlapping=m.changeNode(common,bottom.id,n=>({...n,doors:1,front:baseFront}));assert.equal(m.validateTree(overlapping),false);
const old=m.rootFront(root,3);const migrated=m.migrateWardrobe(old,{...c,wood:3,handles:'Кнопки',configuration:'Купе',niche:false});assert.equal(migrated.front.type,'sliding');assert.equal(migrated.front.wood,3);assert.equal(m.totals(migrated)[1],3);assert.equal(m.validateTree(migrated),true);
const withGuides=m.changeNode(root,bottom.id,n=>({...n,guides:'Blum',handles:'Без'}));const withOtherGuides=m.changeNode(withGuides,bottom.id,n=>({...n,guides:'Деревянные'}));const drawerLeft=m.geometry(withGuides,c).parts.find(p=>p.id===m.findNode(withGuides,bottom.id).drawers[0].id+'-l');const otherDrawerLeft=m.geometry(withOtherGuides,c).parts.find(p=>p.id===drawerLeft.id);assert.equal(drawerLeft.x-otherDrawerLeft.x,3);assert.equal(m.geometry(withGuides,c).parts.some(p=>p.kind==='handle'),false);assert.ok(m.guideSummary(withGuides,c).includes('Blum'));
const oldHinged=m.migrateWardrobe(m.rootFront(root,3),{...c,cat:1,configuration:'Распашные'});assert.equal(oldHinged.front.type,'multi');assert.equal(m.validateTree(oldHinged),true);assert.equal(m.geometry(oldHinged,c).parts.filter(p=>p.kind==='door').length,3);assert.ok(m.geometry(oldHinged,c).parts.filter(p=>p.kind==='door').every(p=>p.pivot.axis==='y'&&p.pivot.angle<0));
console.log('PASS: geometry, nested filling, all opening axes/directions, paired doors, independent finishes, front replacement without overlaps, guides, validation and saved-project migration');
