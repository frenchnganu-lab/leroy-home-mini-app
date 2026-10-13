'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {geometry,coveredByFront,type Opening} from '../lib/wardrobe';
import type {Config} from '../lib/configurator';
type Props={root:Opening;c:Config;selected:string;layer:string;opened:boolean;reset:number;assetBase:string;onSelect:(id:string)=>void;onFail:()=>void};
export default function WardrobeScene(p:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(p);latest.current=p;
 const runtime=useRef<{scene:THREE.Scene;group:THREE.Group;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;controls:OrbitControls;size:string;fit:()=>void}|null>(null);
 const [ready,setReady]=useState(0);
 useEffect(()=>{const element=host.current;if(!element)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{latest.current.onFail();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Объёмная модель шкафа: вращайте, приближайте, выбирайте отсек');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0ede7');const group=new THREE.Group();scene.add(group);
  const camera=new THREE.PerspectiveCamera(36,1,1,30000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.85;
  scene.add(new THREE.HemisphereLight(0xffffff,0x75634e,2.5));const sun=new THREE.DirectionalLight(0xfff5e7,3);sun.position.set(2500,5000,4000);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-3000;sun.shadow.camera.right=3000;sun.shadow.camera.top=4000;sun.shadow.camera.bottom=-3000;sun.shadow.camera.far=14000;sun.shadow.normalBias=3;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(15000,15000),new THREE.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-4;floor.receiveShadow=true;scene.add(floor);
  const fit=()=>{const {W,H,D}=geometry(latest.current.root,latest.current.c);const h=element.clientHeight||390,w=element.clientWidth||390;camera.aspect=w/h;camera.updateProjectionMatrix();const radius=Math.max(H/2,W/(2*camera.aspect),D)*1.35;const dist=radius/Math.tan(THREE.MathUtils.degToRad(18));camera.position.set(W*.8,H*.5+dist*.12,dist);controls.target.set(0,H*.5,0);controls.minDistance=Math.max(W,H)*.45;controls.maxDistance=dist*2.5;controls.update();};
  runtime.current={scene,group,camera,renderer,controls,size:'',fit};
  const resize=()=>{renderer.setSize(element.clientWidth,element.clientHeight,false);camera.aspect=element.clientWidth/Math.max(1,element.clientHeight);camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(element);resize();fit();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let multitouch=false;
  const hit=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(group.children,true).find(h=>h.object.userData.opening);};
  const start=(e:PointerEvent)=>{pointers.add(e.pointerId);if(pointers.size>1)multitouch=true;down={x:e.clientX,y:e.clientY};};
  const finish=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(e.type!=='pointercancel'&&down&&!multitouch&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const h=hit(e);if(h)latest.current.onSelect(h.object.userData.opening);}if(!pointers.size){down=null;multitouch=false;}};
  const hover=(e:PointerEvent)=>{if(!down)renderer.domElement.style.cursor=hit(e)?'pointer':'grab';};
  const lost=(e:Event)=>{e.preventDefault();latest.current.onFail();};
  renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',finish);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('pointercancel',finish);renderer.domElement.addEventListener('webglcontextlost',lost);
  let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();setReady(v=>v+1);
  return()=>{cancelAnimationFrame(frame);renderer.domElement.removeEventListener('webglcontextlost',lost);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});renderer.dispose();renderer.forceContextLoss();element.replaceChildren();runtime.current=null;};
 },[]);
 useEffect(()=>{const rt=runtime.current;if(!rt)return;const {group}=rt;group.children.forEach(o=>o.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.LineSegments){n.geometry.dispose();const ms=Array.isArray(n.material)?n.material:[n.material];ms.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial)m.map?.dispose();m.dispose();});}}));group.clear();
  const g=geometry(p.root,p.c),loader=new THREE.TextureLoader();const colors=['#a28b74','#c6ab80','#cfbea0','#cfa883'];
  for(const part of g.parts){if((part.kind==='door'||part.kind==='handle'&&part.id.includes('-dh-'))&&p.layer!=='facades')continue;
   const wood=part.finish?.wood??p.c.wood;
   const tex=part.kind==='handle'?undefined:loader.load(p.assetBase+'wood-'+wood+'.webp');if(tex){tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(Math.max(.3,part.w/650),Math.max(.3,part.h/900));}
   const material=new THREE.MeshStandardMaterial({color:part.kind==='handle'?'#484138':colors[wood],map:tex,roughness:part.kind==='handle'?.4:.8,metalness:part.kind==='handle'?.55:0});
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(part.w,part.h,part.d),material);mesh.position.set(part.x-g.W/2,part.y,part.z-g.D/2);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.opening=part.opening;
   const doorpart=part.kind==='door'||part.kind==='handle'&&part.id.includes('-dh-');
   if(doorpart&&part.pivot&&p.opened){const pivot=part.pivot,hinge=new THREE.Group();hinge.position.set(pivot.x-g.W/2,pivot.y,pivot.z-g.D/2);mesh.position.set(part.x-pivot.x,part.y-pivot.y,part.z-pivot.z);hinge.add(mesh);hinge.rotation[pivot.axis]=pivot.angle;group.add(hinge);}else group.add(mesh);
   if(part.kind==='door'&&part.finish?.panel){const trim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Math.max(10,part.w-65),Math.max(10,part.h-80),3)),new THREE.LineBasicMaterial({color:'#735a42'}));trim.position.set(0,0,part.d/2+2);mesh.add(trim);}
   if(part.kind==='door'&&part.opening===p.selected){mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#aa6f36'})));}
  }
  for(const b of g.boxes.filter(b=>!b.node.children?.length&&(p.layer==='filling'||!b.node.doors&&!coveredByFront(p.root,b.id)))){
   const material=new THREE.MeshBasicMaterial({color:'#998571',transparent:true,opacity:p.selected===b.id ? .15 : .018,depthWrite:false,side:THREE.DoubleSide});const plane=new THREE.Mesh(new THREE.PlaneGeometry(b.w-3,b.h-3),material);plane.position.set(b.x+b.w/2-g.W/2,b.y+b.h/2,g.D/2+22);plane.userData.opening=b.id;group.add(plane);
   if(p.selected===b.id){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w,b.h,1)),new THREE.LineBasicMaterial({color:'#756049'}));edges.position.copy(plane.position);group.add(edges);}
  }
  const size=[g.W,g.H,g.D,p.reset].join(':');if(rt.size!==size){rt.size=size;rt.fit();}
 },[p.root,p.c,p.selected,p.layer,p.opened,p.reset,p.assetBase,ready]);
 return <div className="wardrobe-canvas" ref={host}/>;
}
