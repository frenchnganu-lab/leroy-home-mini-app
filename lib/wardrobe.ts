import {z} from 'zod';
import type {Config} from './configurator';
export type Shelf={id:string;at:number;fixed:boolean};
export type Drawer={id:string;ratio:number};
export type Opening={id:string;axis?:'x'|'y';children?:Opening[];shelves:Shelf[];drawers:Drawer[];doors:number};
export type Box={id:string;node:Opening;x:number;y:number;w:number;h:number;d:number;label:string;parent?:string};
export type Part={id:string;kind:'body'|'shelf'|'drawer'|'door'|'support'|'decor'|'handle';x:number;y:number;z:number;w:number;h:number;d:number;opening?:string;hinge?:number};
export const thickness=16;
const uid=()=>crypto.randomUUID();
export const empty=():Opening=>({id:uid(),shelves:[],drawers:[],doors:0});
export const clearFilling=(node:Opening):Opening=>({...node,shelves:[],drawers:[],children:node.children?.map(clearFilling)});
export function filled(node:Opening,kind:'fixed'|'shelf'|'drawers',count:number):Opening{
 return {...node,shelves:kind==='drawers'?[]:Array.from({length:count},(_,i)=>({id:uid(),at:(i+1)/(count+1),fixed:kind==='fixed'})),drawers:kind==='drawers'?Array.from({length:count},()=>({id:uid(),ratio:1/count})):[]};
}
export function split(node:Opening,axis:'x'|'y',count:number):Opening{return {...node,axis,children:Array.from({length:count},empty),shelves:[],drawers:[]};}
export function createWardrobe():Opening{
 let root=split(empty(),'x',3);root.doors=3;
 root.children![0]=filled(root.children![0],'shelf',2);
 root.children![1]=filled(root.children![1],'shelf',3);
 root.children![2]=filled(root.children![2],'drawers',2);let serial=1;const stable=(n:Opening)=>{n.id='10000000-0000-4000-8000-'+String(serial++).padStart(12,'0');for(const v of [...n.shelves,...n.drawers])v.id='10000000-0000-4000-8000-'+String(serial++).padStart(12,'0');n.children?.forEach(stable);};stable(root);return root;
}
export function findNode(root:Opening,id:string):Opening|undefined{return root.id===id?root:root.children?.map(n=>findNode(n,id)).find(Boolean);}
export function changeNode(root:Opening,id:string,fn:(n:Opening)=>Opening):Opening{return root.id===id?fn(root):{...root,children:root.children?.map(n=>changeNode(n,id,fn))};}
export function totals(root:Opening):[number,number,number]{return (root.children??[]).reduce<[number,number,number]>((a,n)=>{const b=totals(n);return a.map((v,i)=>v+b[i]) as [number,number,number];},[root.shelves.length,root.doors,root.drawers.length]);}
export function leafFront(root:Opening,id:string,doors:number):Opening{
 if(root.id===id)return {...root,doors};
 if(root.children?.some(n=>findNode(n,id)))return {...root,doors:0,children:root.children.map(n=>leafFront(n,id,doors))};return root;
}
export function rootFront(root:Opening,doors:number):Opening{
 const clear=(n:Opening):Opening=>({...n,doors:0,children:n.children?.map(clear)});return {...clear(root),doors};
}
export function geometry(root:Opening,c:Config):{boxes:Box[];parts:Part[];errors:string[];W:number;H:number;D:number}{
 const [W,H,D]=c.dims.map(n=>n*10);const base=c.supportHeight*10,t=thickness;const depth=D-20;
 const boxes:Box[]=[],parts:Part[]=[],errors:string[]=[];
 const part=(id:string,kind:Part['kind'],x:number,y:number,z:number,w:number,h:number,d:number,opening?:string,hinge?:number)=>parts.push({id,kind,x,y,z,w,h,d,opening,hinge});
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
  node.drawers.forEach(dr=>{const dh=h*dr.ratio;
   if(dh<100)errors.push(label+': ящик ниже 100 мм');
   const clearance=c.guides==='Blum'?13:10,iw=w-2*clearance,id=depth-35;
   part(dr.id,'drawer',x+w/2,bottom+dh/2,D-5,w-6,dh-4,16,node.id);
   part(dr.id+'-l','drawer',x+clearance+t/2,bottom+dh*.4,D/2,t,Math.max(20,dh*.65),id,node.id);
   part(dr.id+'-r','drawer',x+w-clearance-t/2,bottom+dh*.4,D/2,t,Math.max(20,dh*.65),id,node.id);
   part(dr.id+'-b','drawer',x+w/2,bottom+16,D/2,iw,6,id,node.id);
   part(dr.id+'-rear','drawer',x+w/2,bottom+dh*.4,25,iw,Math.max(20,dh*.65),t,node.id);
   if(c.handles!=='Без')part(dr.id+'-handle','handle',x+w/2,bottom+dh*.75,D+10,c.handles==='Кнопки'?14:70,8,12,node.id);
   bottom+=dh;
  });
  const doors=c.niche&&node.id===root.id?Math.max(0,node.doors-1):node.doors;
  for(let i=0;i<doors;i++){const dw=w/doors;const fx=x+i*dw+3;
   part(node.id+'-door-'+i,'door',fx+(dw-6)/2,y+h/2,D+9,dw-6,h-6,16,node.id,fx);
   if(c.handles!=='Без')part(node.id+'-dh-'+i,'handle',fx+dw-27,y+h*.5,D+25,c.handles==='Кнопки'?14:8,c.handles==='Кнопки'?14:80,12,node.id,fx);
  }
 }
 walk(root,t,base+t,W-2*t,H-base-2*t,'Секция');
 const decor=['МДФ в пленке с фрезеровкой','МДФ Эмаль','Шпон'].includes(c.material)?c.decor:[];
 if(decor.includes('Карниз сверху'))part('cornice','decor',W/2,H+16,D/2,W+30,32,D+25);
 if(decor.includes('Пилястры по бокам'))for(const x of [14,W-14])part('pilaster-'+x,'decor',x,(H+base)/2,D+18,28,H-base,24);
 if(decor.includes('Фигурный фартук / царга'))part('apron','decor',W/2,base+18,D+15,W-32,36,24);
 const count=totals(root);if(count[0]>30||count[1]>6||count[2]>20)errors.push('Допустимо до 30 полок, 6 дверей и 20 ящиков');
 if(boxes.length>100)errors.push('Слишком много отсеков');
 return {boxes,parts,errors,W,H,D};
}
export const openingSchema:z.ZodType<Opening>=z.lazy(()=>z.object({id:z.string().uuid(),axis:z.enum(['x','y']).optional(),children:z.array(openingSchema).min(2).max(6).optional(),shelves:z.array(z.object({id:z.string().uuid(),at:z.number().min(.01).max(.99),fixed:z.boolean()})).max(30),drawers:z.array(z.object({id:z.string().uuid(),ratio:z.number().positive().max(1)})).max(20),doors:z.number().int().min(0).max(6)}));
export function validateTree(root:Opening):boolean{
 let count=0;const ids=new Set<string>();const visit=(n:Opening,depth:number):boolean=>{if(++count>100||depth>12||ids.has(n.id))return false;ids.add(n.id);if(n.children?.length&&(n.shelves.length||n.drawers.length))return false;if(n.shelves.length&&n.drawers.length)return false;if(n.drawers.length&&Math.abs(n.drawers.reduce((a,d)=>a+d.ratio,0)-1)>.001)return false;for(const e of [...n.shelves,...n.drawers]){if(ids.has(e.id))return false;ids.add(e.id);}return (n.children??[]).every(c=>visit(c,depth+1));};return visit(root,0);
}
