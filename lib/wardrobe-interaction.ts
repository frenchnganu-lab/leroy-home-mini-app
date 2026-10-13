/** Keep the draft unchanged while the user types; validate only the resulting count. */
export function parseCount(draft:string,max:number):number|undefined{
 if(!/^\d+$/.test(draft))return undefined;
 const count=Number(draft);return Number.isSafeInteger(count)&&count>=0&&count<=max?count:undefined;
}
/** Frame-rate independent easing for reversible door/drawer previews. */
export function advanceMotion(current:number,target:number,seconds:number):number{
 const next=current+(target-current)*(1-Math.exp(-12*Math.max(0,Math.min(.1,seconds))));
 return Math.abs(target-next)<.001?target:next;
}
/** The original footprint keeps an opening door from flickering under a still cursor. */
export function hoverMotion(current:string,overOriginal:boolean,visibleMotion:string,enabled:boolean):string{
 return enabled?(current&&overOriginal?current:visibleMotion):'';
}
