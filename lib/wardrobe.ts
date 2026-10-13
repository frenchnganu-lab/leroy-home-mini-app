import {z} from 'zod';
import type {Config} from './configurator';
export type Shelf={id:string;at:number;fixed:boolean};
export type Drawer={id:string;ratio:number};
export const facadeMaterials=['ЛДСП Egger','МДФ 16 в пленке','МДФ в пленке с фрезеровкой','МДФ Эмаль','Алвик','Шпон','МДФ в пластике'] as const;
export const handleChoices=['Кнопки','Рейлинг','Раковина','Без'] as const;
export type Facade={type:'single'|'double'|'lift'|'drop'|'sliding'|'multi';direction:'left'|'right'|'up'|'down';secondDirection?:'left'|'right';material:typeof facadeMaterials[number];wood:number;handles:typeof handleChoices[number];panel:boolean};
export type Opening={id:string;axis?:'x'|'y';children?:Opening[];shelves:Shelf[];drawers:Drawer[];doors:number;front?:Facade;guides?:'Деревянные'|'Blum';handles?:typeof handleChoices[number]};
export type Box={id:string;node:Opening;x:number;y:number;w:number;h:number;d:number;label:string;parent?:string};
export type Pivot={x:number;y:number;z:number;axis:'x'|'y';angle:number};
export type Motion={id:string;kind:'door'|'drawer'|'sliding';axis:'x'|'y'|'z';amount:number};
export type Part={id:string;kind:'body'|'shelf'|'drawer'|'door'|'support'|'decor'|'handle';x:number;y:number;z:number;w:number;h:number;d:number;opening?:string;pivot?:Pivot;finish?:Facade;motion?:Motion};
export const thickness=16;
const uid=()=>crypto.randomUUID();
export const empty=():Opening=>({id:uid(),shelves:[],drawers:[],doors:0});
export const clearFilling=(node:Opening):Opening=>({...node,shelves:[],drawers:[],children:node.children?.map(clearFilling)});
export function filled(node:Opening,kind:'fixed'|'shelf'|'drawers',count:number):Opening{
 return {...node,shelves:kind==='drawers'?[]:Array.from({length:count},(_,i)=>({id:uid(),at:(i+1)/(count+1),fixed:kind==='fixed'})),drawers:kind==='drawers'?Array.from({length:count},()=>({id:uid(),ratio:1/count})):[]};
}
export function split(node:Opening,axis:'x'|'y',count:number):Opening{return {...node,axis:count>1?axis:undefined,children:count>1?Array.from({length:count},empty):undefined,shelves:[],drawers:[]};}
export function createWardrobe():Opening{return {id:'10000000-0000-4000-8000-000000000001',shelves:[],drawers:[],doors:0};}
export function findNode(root:Opening,id:string):Opening|undefined{return root.id===id?root:root.children?.map(n=>findNode(n,id)).find(Boolean);}
export function changeNode(root:Opening,id:string,fn:(n:Opening)=>Opening):Opening{return root.id===id?fn(root):{...root,children:root.children?.map(n=>changeNode(n,id,fn))};}
export function totals(root:Opening):[number,number,number]{return (root.children??[]).reduce<[number,number,number]>((a,n)=>{const b=totals(n);return a.map((v,i)=>v+b[i]) as [number,number,number];},[root.shelves.length,root.doors,root.drawers.length]);}
export function leafFront(root:Opening,id:string,doors:number):Opening{
 if(root.id===id)return {...removeFronts(root),doors};
 if(root.children?.some(n=>findNode(n,id)))return {...root,doors:0,front:undefined,children:root.children.map(n=>leafFront(n,id,doors))};return root;
}
export function rootFront(root:Opening,doors:number):Opening{
 return {...removeFronts(root),doors};
}
export function removeFronts(node:Opening):Opening{return {...node,doors:0,front:undefined,children:node.children?.map(removeFronts)};}
export const decorativeMaterial=(material:string)=>['МДФ в пленке с фрезеровкой','МДФ Эмаль','Шпон'].includes(material);
export function facadeOf(node:Opening,c:Config):Facade|undefined{
 if(!node.doors)return undefined;if(node.front)return node.front;
 return {type:c.configuration==='Купе'?'sliding':node.doors>2?'multi':node.doors===2?'double':'single',direction:'left',secondDirection:'right',material:c.material as Facade['material'],wood:c.wood,handles:c.handles,panel:decorativeMaterial(c.material)&&c.decor.includes('Филёнчатые фасады')};
}
export function setFacade(root:Opening,id:string,front?:Facade):Opening{
 if(root.id===id)return {...removeFronts(root),front,doors:front?(front.type==='double'?2:front.type==='multi'?Math.max(3,root.doors):front.type==='sliding'?Math.max(1,root.doors):1):0};
 if(!root.children?.some(n=>findNode(n,id)))return root;
 return {...root,doors:0,front:undefined,children:root.children.map(n=>setFacade(n,id,front))};
}
export function migrateWardrobe(root:Opening,c:Config):Opening{
 const visit=(n:Opening,covered:boolean):Opening=>{const doors=covered?0:n.id===root.id&&c.cat===1&&c.niche?Math.max(0,n.doors-1):n.doors;const node={...n,doors};return {...node,front:doors?facadeOf(node,c):undefined,guides:n.guides??(n.drawers.length?c.guides:undefined),handles:n.handles??(n.drawers.length?c.handles:undefined),children:n.children?.map(ch=>visit(ch,covered||doors>0))};};return visit(root,false);
}
export function coveredByFront(root:Opening,id:string):Opening|undefined{if(root.id===id)return undefined;const child=root.children?.find(n=>findNode(n,id));return child?(root.doors?root:coveredByFront(child,id)):undefined;}
export const facadeLabel=(f:Facade)=>f.type==='single'?`Одна створка · петли ${f.direction==='right'?'справа':'слева'}`:f.type==='double'?`Две створки · петли ${f.direction==='right'?'справа':'слева'} / ${f.secondDirection==='left'?'слева':'справа'}`:f.type==='lift'?'Подъёмный · снизу вверх':f.type==='drop'?'Откидной · сверху вниз':f.type==='sliding'?'Раздвижные створки':'Распашные створки · петли '+(f.direction==='right'?'справа':'слева');
export function facadeSummary(root:Opening,c:Config):string{const fronts: string[]=[];const visit=(n:Opening)=>{const f=facadeOf(n,c);if(f)fronts.push(`${facadeLabel(f)} · ${f.material} · ${['Орех','Дуб','Ясень','Бук'][f.wood]}`);n.children?.forEach(visit);};visit(root);return fronts.length?fronts.join('; '):'Без фасадов';}
export function guideSummary(root:Opening,c:Config):string{const guides=new Set<string>();const visit=(n:Opening)=>{if(n.drawers.length)guides.add(n.guides??c.guides);n.children?.forEach(visit);};visit(root);return guides.size?' · Направляющие: '+[...guides].join(', '):'';}
export function geometry(root:Opening,c:Config):{boxes:Box[];parts:Part[];errors:string[];W:number;H:number;D:number}{
 const [W,H,D]=c.dims.map(n=>n*10);const base=c.supportHeight*10,t=thickness;const depth=D-20;
 const boxes:Box[]=[],parts:Part[]=[],errors:string[]=[];
 const part=(id:string,kind:Part['kind'],x:number,y:number,z:number,w:number,h:number,d:number,opening?:string,pivot?:Pivot,finish?:Facade)=>parts.push({id,kind,x,y,z,w,h,d,opening,pivot,finish});
 part('left','body',t/2,(H+base)/2,D/2,t,H-base,D);
 part('right','body',W-t/2,(H+base)/2,D/2,t,H-base,D);
 part('top','body',W/2,H-t/2,D/2,W-2*t,t,D);
 part('bottom','body',W/2,base+t/2,D/2,W-2*t,t,D);
 part('back','body',W/2,(H+base)/2,3,W-2*t,H-base-2*t,6);
 if(c.support==='Цоколь')part('plinth','support',W/2,base/2,D-45,W-32,base,16);
 else for(const x of [40,W-40])for(const z of [40,D-40])part('leg-'+x+'-'+z,'support',x,base/2,z,c.support==='Точёные'?40:25,base,c.support==='Точёные'?40:25);
 function walk(node:Opening,x:number,y:number,w:number,h:number,label:string,parent?:string){
  const box={id:node.id,node,x,y,w,h,d:depth,label,parent};boxes.push(box);
  if(w<100||h<80||depth<100)errors.push(label+': недостаточный полезный размер');
  if(node.children?.length){const axis=node.axis??'x',size=axis==='x'?w:h;const available=size-t*(node.children.length-1);let used=0;
   node.children.forEach((child,i)=>{const remaining=available-used;const baseSize=Math.floor(available/node.children!.length);const s=i===node.children!.length-1?remaining:baseSize+(i<available-baseSize*node.children!.length?1:0);const offset=used+i*t;
    walk(child,x+(axis==='x'?offset:0),y+(axis==='y'?offset:0),axis==='x'?s:w,axis==='y'?s:h,label+' · '+(axis==='x'?String(i+1):i===0?'нижний':i===node.children!.length-1?'верхний':String(i+1)),node.id);
    used+=s;if(i<node.children!.length-1)part(child.id+'-partition','body',axis==='x'?x+offset+s+t/2:x+w/2,axis==='y'?y+offset+s+t/2:y+h/2,D/2,axis==='x'?t:w,axis==='y'?t:h,depth);
   });
  }
  const sorted=[...node.shelves].sort((a,b)=>a.at-b.at);const heights=sorted.map(s=>s.at*h);
  if(heights.some((v,i)=>v-t/2<(i?heights[i-1]+t/2:0)+60)||heights.length&&h-heights[heights.length-1]-t/2<60)errors.push(label+': полки расположены слишком близко');
  node.shelves.forEach(s=>part(s.id,'shelf',x+w/2,y+s.at*h,D/2,w,t,depth-8,node.id));
  let bottom=y;
  node.drawers.forEach(dr=>{const dh=h*dr.ratio,start=parts.length;
   if(dh<100)errors.push(label+': ящик ниже 100 мм');
   const clearance=(node.guides??c.guides)==='Blum'?13:10,iw=w-2*clearance,id=depth-35;
   part(dr.id,'drawer',x+w/2,bottom+dh/2,D-5,w-6,dh-4,16,node.id);
   part(dr.id+'-l','drawer',x+clearance+t/2,bottom+dh*.4,D/2,t,Math.max(20,dh*.65),id,node.id);
   part(dr.id+'-r','drawer',x+w-clearance-t/2,bottom+dh*.4,D/2,t,Math.max(20,dh*.65),id,node.id);
   part(dr.id+'-b','drawer',x+w/2,bottom+16,D/2,iw,6,id,node.id);
   part(dr.id+'-rear','drawer',x+w/2,bottom+dh*.4,25,iw,Math.max(20,dh*.65),t,node.id);
   const handle=node.handles??c.handles;if(handle!=='Без')part(dr.id+'-handle','handle',x+w/2,bottom+dh*.75,D+10,handle==='Кнопки'?14:70,8,12,node.id);
   parts.slice(start).forEach(p=>{p.motion={id:dr.id,kind:'drawer',axis:'z',amount:Math.min(300,depth*.65)};});
   bottom+=dh;
  });
  const doors=node.doors,finish=facadeOf(node,c);
  for(let i=0;i<doors&&finish;i++){const dw=w/doors,fx=x+i*dw+3,fw=dw-6,fy=y+3,fh=h-6,start=parts.length;
   const direction=i===1&&finish.type==='double'?(finish.secondDirection??'right'):finish.direction;
   const horizontal=finish.type==='lift'||finish.type==='drop';
   const pivot:Pivot={x:horizontal?fx+fw/2:direction==='right'?fx+fw:fx,y:horizontal?(finish.type==='lift'?fy+fh:fy):fy+fh/2,z:D+9,axis:horizontal?'x':'y',angle:(horizontal?finish.type==='lift'?-1:1:direction==='right'?1:-1)*Math.PI*.47};
   if(fw<90||fh<70)errors.push(label+': фасад слишком мал');
   part(node.id+'-door-'+i,'door',fx+fw/2,fy+fh/2,D+9+(finish.type==='sliding'?i%2*22:0),fw,fh,16,node.id,finish.type==='sliding'?undefined:pivot,finish);
   if(finish.handles!=='Без')part(node.id+'-dh-'+i,'handle',horizontal?fx+fw/2:direction==='right'?fx+22:fx+fw-22,horizontal?(finish.type==='lift'?fy+22:fy+fh-22):fy+fh/2,D+25,horizontal?finish.handles==='Кнопки'?14:80:finish.handles==='Кнопки'?14:8,horizontal?8:finish.handles==='Кнопки'?14:80,12,node.id,finish.type==='sliding'?undefined:pivot,finish);
   parts.slice(start).forEach(p=>{p.motion={id:node.id+'-door-'+i,kind:finish.type==='sliding'?'sliding':'door',axis:finish.type==='sliding'?'x':pivot.axis,amount:finish.type==='sliding'?dw*.72*(i%2?-1:1):pivot.angle};});
  }
 }
 walk(root,t,base+t,W-2*t,H-base-2*t,'Весь шкаф');
 const decor=['МДФ в пленке с фрезеровкой','МДФ Эмаль','Шпон'].includes(c.material)?c.decor:[];
 if(decor.includes('Карниз сверху'))part('cornice','decor',W/2,H+16,D/2,W+30,32,D+25);
 if(decor.includes('Пилястры по бокам'))for(const x of [14,W-14])part('pilaster-'+x,'decor',x,(H+base)/2,D+18,28,H-base,24);
 if(decor.includes('Фигурный фартук / царга'))part('apron','decor',W/2,base+18,D+15,W-32,36,24);
 const count=totals(root);if(count[0]>30||count[1]>20||count[2]>20)errors.push('Допустимо до 30 полок, 20 створок и 20 ящиков');
 if(boxes.length>100)errors.push('Слишком много отсеков');
 return {boxes,parts,errors,W,H,D};
}
export const facadeSchema=z.object({type:z.enum(['single','double','lift','drop','sliding','multi']),direction:z.enum(['left','right','up','down']),secondDirection:z.enum(['left','right']).optional(),material:z.enum(facadeMaterials),wood:z.number().int().min(0).max(3),handles:z.enum(handleChoices),panel:z.boolean()});
export const openingSchema:z.ZodType<Opening>=z.lazy(()=>z.object({id:z.string().uuid(),axis:z.enum(['x','y']).optional(),children:z.array(openingSchema).min(2).max(6).optional(),shelves:z.array(z.object({id:z.string().uuid(),at:z.number().min(.01).max(.99),fixed:z.boolean()})).max(30),drawers:z.array(z.object({id:z.string().uuid(),ratio:z.number().positive().max(1)})).max(20),doors:z.number().int().min(0).max(6),front:facadeSchema.optional(),guides:z.enum(['Деревянные','Blum']).optional(),handles:z.enum(handleChoices).optional()}));
export function validateTree(root:Opening):boolean{
 let count=0;const ids=new Set<string>();const visit=(n:Opening,depth:number,covered:boolean):boolean=>{if(++count>100||depth>12||ids.has(n.id)||covered&&n.doors>0)return false;ids.add(n.id);if(n.children?.length&&(n.shelves.length||n.drawers.length))return false;if(n.shelves.length&&n.drawers.length)return false;if(n.front){const f=n.front;if(n.doors!==(f.type==='double'?2:f.type==='sliding'||f.type==='multi'?n.doors:1)||n.doors===0||f.type==='multi'&&n.doors<3)return false;if(f.type==='lift'?f.direction!=='up':f.type==='drop'?f.direction!=='down':!['left','right'].includes(f.direction))return false;}if(n.drawers.length&&Math.abs(n.drawers.reduce((a,d)=>a+d.ratio,0)-1)>.001)return false;for(const e of [...n.shelves,...n.drawers]){if(ids.has(e.id))return false;ids.add(e.id);}return (n.children??[]).every(c=>visit(c,depth+1,covered||n.doors>0));};return visit(root,0,false);
}
