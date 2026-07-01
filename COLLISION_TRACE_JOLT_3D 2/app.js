import * as THREE from './vendor/three.module.js';
import initJolt from './vendor/jolt-physics.wasm-compat.js';

const canvas = document.querySelector('#gl');
const loadEl = document.querySelector('#load');
const fatalEl = document.querySelector('#fatal');
const fatalText = document.querySelector('#fatalText');
const objectiveEl = document.querySelector('#objective');
const readoutEl = document.querySelector('#readout');
const menuBtn = document.querySelector('#menuBtn');
const menu = document.querySelector('#menu');
const impactEl = document.querySelector('#impact');
const timeline = document.querySelector('#timeline');
const timelineFill = document.querySelector('#timelineFill');
const timelineKnob = document.querySelector('#timelineKnob');

window.addEventListener('error', e => fail(`${e.message}\n${e.filename || ''}:${e.lineno || ''}`));
window.addEventListener('unhandledrejection', e => fail(String(e.reason?.stack || e.reason || 'Unknown promise failure')));

function fail(message){
  console.error(message);
  loadEl.style.display='none';
  fatalEl.style.display='flex';
  fatalText.textContent = `${message}\n\nOpen this project through START_WINDOWS.bat, START_MAC.command, or: python serve.py`;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const distXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

let Jolt, jolt, physicsSystem, bodyInterface;
let renderer, scene, camera, clock, raycaster, pointer;
let audioCtx=null, soundOn=true;
let state='SETUP'; // SETUP | FORECAST | READY | RUNNING | PAUSED | COMPLETE
let elapsed=0, accumulator=0, currentStep=0;
const FIXED_DT=1/60;
const RUN_LIMIT=3.8;
let branchCount=0;
let impactShownAt=0;
let collision=null;
let steerApplied=false;
let steerTime=null;
let steerStrength=0;
let brakeTime=1.55;
let laneZ=4.0;
let dragging=null;
let dragStart={x:0,y:0};
let groundStart=null;
let forecastLines=[];
let history=[];
let historyIndex=0;
let initialSnapshot=null;
let bodies=[];
let dynamicBodies=[];
let debris=[];
let impactRings=[];
let pointerDownTime=0;
let forecastBusy=false;
let forecastMode=false;
let pendingImpact=null;
let contactListener=null;
const bodyByKey=new Map();

const controls={yaw:-0.72,pitch:0.72,distance:48,target:new THREE.Vector3(0,0,0)};

const rendererOpts={canvas,antialias:true,alpha:false,powerPreference:'high-performance'};
renderer=new THREE.WebGLRenderer(rendererOpts);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight,false);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
scene=new THREE.Scene();
scene.background=new THREE.Color(0x05070a);
scene.fog=new THREE.FogExp2(0x05070a,0.015);
camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,180);
clock=new THREE.Clock();
raycaster=new THREE.Raycaster();
pointer=new THREE.Vector2();

const hemi=new THREE.HemisphereLight(0xb8d8ff,0x16110b,1.7); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,3.0); sun.position.set(-14,28,-10); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45; scene.add(sun);
const redLamp=new THREE.PointLight(0xff315f,25,26,2); redLamp.position.set(-7,5,0); scene.add(redLamp);
const cyanLamp=new THREE.PointLight(0x20f3d2,18,26,2); cyanLamp.position.set(6,5,4); scene.add(cyanLamp);

function updateCamera(){
  const cp=Math.cos(controls.pitch), sp=Math.sin(controls.pitch);
  camera.position.set(
    controls.target.x + Math.cos(controls.yaw)*cp*controls.distance,
    controls.target.y + sp*controls.distance,
    controls.target.z + Math.sin(controls.yaw)*cp*controls.distance
  );
  camera.lookAt(controls.target);
}
updateCamera();

function makeMat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.58,metalness:opts.metalness??.18,transparent:!!opts.transparent,opacity:opts.opacity??1,emissive:opts.emissive??0x000000,emissiveIntensity:opts.emissiveIntensity??0,depthWrite:opts.depthWrite??true});}
function addMesh(geo,mat,parent=scene){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

function buildVisualWorld(){
  const roadMat=makeMat(0x151a21,{roughness:.96});
  const asphalt=addMesh(new THREE.BoxGeometry(72,1,48),roadMat); asphalt.position.y=-.55;
  const sidewalkMat=makeMat(0x3a414a,{roughness:.9});
  for(const z of [-17,17]){const s=addMesh(new THREE.BoxGeometry(72,.55,7),sidewalkMat);s.position.set(0,-.15,z);}
  for(const x of [-29,29]){const s=addMesh(new THREE.BoxGeometry(7,.55,34),sidewalkMat);s.position.set(x,-.15,0);}
  const laneMat=new THREE.MeshBasicMaterial({color:0xe8e2c8,transparent:true,opacity:.65});
  for(let x=-30;x<=30;x+=6){const d=addMesh(new THREE.BoxGeometry(3.4,.025,.12),laneMat);d.position.set(x,.02,0);d.castShadow=false;}
  for(let z=-15;z<=15;z+=6){const d=addMesh(new THREE.BoxGeometry(.12,.025,3.4),laneMat);d.position.set(0,.02,z);d.castShadow=false;}
  const crossMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55});
  for(let i=-4;i<=4;i++){const a=addMesh(new THREE.BoxGeometry(.7,.03,5),crossMat);a.position.set(-6+i*1.5,.03,8);a.castShadow=false;}
  const grid=new THREE.GridHelper(80,40,0x17333a,0x101820);grid.position.y=.04;grid.material.transparent=true;grid.material.opacity=.33;scene.add(grid);
  addTrafficLight(-8,7,Math.PI/2); addTrafficLight(8,-7,-Math.PI/2);
  addBuildings();
  createBrakeMarker();
  createLaneEdge();
}

function addTrafficLight(x,z,rot){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
  const pole=addMesh(new THREE.CylinderGeometry(.12,.15,6,12),makeMat(0x2b3038),g);pole.position.y=3;
  const arm=addMesh(new THREE.BoxGeometry(5,.16,.16),makeMat(0x2b3038),g);arm.position.set(2.4,5.7,0);
  const box=addMesh(new THREE.BoxGeometry(.8,1.8,.55),makeMat(0x111317),g);box.position.set(4.7,5.2,0);
  for(let i=0;i<3;i++){const c=addMesh(new THREE.SphereGeometry(.16,16,8),makeMat(i===0?0xff315f:0x222222,{emissive:i===0?0xff315f:0,emissiveIntensity:i===0?3:0}),g);c.position.set(4.42,5.72-i*.52,-.29);}
}
function addBuildings(){
  const mat=makeMat(0x11161d,{roughness:.8});
  const positions=[[-34,5,-23,12,10,10],[30,4,-24,10,8,12],[-35,6,23,13,12,11],[31,7,23,12,14,10]];
  for(const [x,y,z,w,h,d] of positions){const b=addMesh(new THREE.BoxGeometry(w,h,d),mat);b.position.set(x,y-.1,z);}
}

function createCarVisual(color,label){
  const g=new THREE.Group();g.name=label;g.userData.kind='car';
  const chassis=addMesh(new THREE.BoxGeometry(4.4,1.2,2.05),makeMat(color,{metalness:.45,roughness:.3}),g); chassis.position.y=.76;
  const cabin=addMesh(new THREE.BoxGeometry(2.45,.95,1.72),makeMat(0x91b3c8,{metalness:.1,roughness:.18,transparent:true,opacity:.82}),g); cabin.position.set(-.25,1.64,0);
  const bumper=addMesh(new THREE.BoxGeometry(.18,.35,2.12),makeMat(0x15181c,{metalness:.7}),g);bumper.position.set(2.28,.54,0);
  const wheelMat=makeMat(0x08090a,{roughness:.9});
  for(const x of [-1.45,1.45])for(const z of [-1.08,1.08]){const w=addMesh(new THREE.CylinderGeometry(.43,.43,.28,18),wheelMat,g);w.rotation.x=Math.PI/2;w.position.set(x,.46,z);}
  const lightMat=makeMat(0xffffff,{emissive:0xffffff,emissiveIntensity:3});
  for(const z of [-.65,.65]){const l=addMesh(new THREE.BoxGeometry(.08,.22,.35),lightMat,g);l.position.set(2.24,.9,z);}
  scene.add(g);return g;
}
function createCyclistVisual(){
  const g=new THREE.Group();g.name='cyclist';g.userData.kind='cyclist';
  const wheelMat=makeMat(0x090a0c,{roughness:.9});
  for(const x of [-.7,.7]){const w=addMesh(new THREE.TorusGeometry(.55,.08,10,24),wheelMat,g);w.rotation.y=Math.PI/2;w.position.set(x,.62,0);}
  const frame=addMesh(new THREE.BoxGeometry(1.4,.08,.08),makeMat(0xffd34e,{emissive:0xffb000,emissiveIntensity:.5}),g);frame.position.set(0,.85,0);frame.rotation.z=.18;
  const rider=addMesh(new THREE.CapsuleGeometry(.28,.9,5,10),makeMat(0xffd34e),g);rider.position.set(-.05,1.55,0);rider.rotation.z=-.18;
  scene.add(g);return g;
}

let brakeMarker,laneEdge;
function createBrakeMarker(){
  brakeMarker=new THREE.Group();brakeMarker.name='brake-marker';brakeMarker.userData.kind='brake-marker';
  const tor=new THREE.Mesh(new THREE.TorusGeometry(1.35,.15,12,44),new THREE.MeshBasicMaterial({color:0xff315f,transparent:true,opacity:.95}));tor.rotation.x=Math.PI/2;tor.userData.kind='brake-marker';brakeMarker.add(tor);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,4,8),new THREE.MeshBasicMaterial({color:0xff315f,transparent:true,opacity:.5}));beam.position.y=2;beam.userData.kind='brake-marker';brakeMarker.add(beam);
  scene.add(brakeMarker);updateBrakeMarker();
}
function updateBrakeMarker(){const x=lerp(-20,-2,clamp(brakeTime/3,0,1));brakeMarker.position.set(x,.08,0);}
function createLaneEdge(){
  laneEdge=new THREE.Group();laneEdge.name='lane-edge';laneEdge.userData.kind='lane-edge';
  const line=new THREE.Mesh(new THREE.BoxGeometry(44,.08,.15),new THREE.MeshBasicMaterial({color:0x20f3d2,transparent:true,opacity:.8}));line.userData.kind='lane-edge';laneEdge.add(line);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(1.1,.25,1.1),makeMat(0x20f3d2,{emissive:0x20f3d2,emissiveIntensity:1.4}));handle.position.x=-14;handle.userData.kind='lane-edge';laneEdge.add(handle);
  scene.add(laneEdge);laneEdge.position.set(0,.08,laneZ);
}

function setupCollisionFiltering(settings){
  const LAYER_NON_MOVING=0,LAYER_MOVING=1,NUM_OBJECT_LAYERS=2;
  const objectFilter=new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
  objectFilter.EnableCollision(LAYER_NON_MOVING,LAYER_MOVING);objectFilter.EnableCollision(LAYER_MOVING,LAYER_MOVING);
  const BP0=new Jolt.BroadPhaseLayer(0),BP1=new Jolt.BroadPhaseLayer(1),NUM_BP=2;
  const bp=new Jolt.BroadPhaseLayerInterfaceTable(NUM_OBJECT_LAYERS,NUM_BP);
  bp.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING,BP0);bp.MapObjectToBroadPhaseLayer(LAYER_MOVING,BP1);
  settings.mObjectLayerPairFilter=objectFilter;settings.mBroadPhaseLayerInterface=bp;
  settings.mObjectVsBroadPhaseLayerFilter=new Jolt.ObjectVsBroadPhaseLayerFilterTable(bp,NUM_BP,objectFilter,NUM_OBJECT_LAYERS);
}

function jv(x=0,y=0,z=0){return new Jolt.Vec3(x,y,z)}
function jq(x=0,y=0,z=0,w=1){return new Jolt.Quat(x,y,z,w)}
function createBody({name,shape,pos,rot=[0,0,0,1],dynamic=false,mass=1,friction=.65,restitution=.08,linearDamping=.08,angularDamping=.8,object=null}){
  const p=jv(...pos),q=jq(...rot);
  const cs=new Jolt.BodyCreationSettings(shape,p,q,dynamic?Jolt.EMotionType_Dynamic:Jolt.EMotionType_Static,dynamic?1:0);
  cs.mFriction=friction;cs.mRestitution=restitution;cs.mLinearDamping=linearDamping;cs.mAngularDamping=angularDamping;cs.mAllowSleeping=false;if(dynamic)cs.mMotionQuality=Jolt.EMotionQuality_LinearCast;
  const body=bodyInterface.CreateBody(cs);bodyInterface.AddBody(body.GetID(),Jolt.EActivation_Activate);
  if(dynamic&&body.GetMotionProperties())body.GetMotionProperties().ScaleToMass(mass);
  Jolt.destroy(cs);Jolt.destroy(p);Jolt.destroy(q);
  const rawID=body.GetID().GetIndexAndSequenceNumber();const item={name,body,id:new Jolt.BodyID(rawID),object,dynamic,mass};item.key=rawID;bodyByKey.set(item.key,item);bodies.push(item);if(dynamic)dynamicBodies.push(item);return item;
}

function installContactListener(){
  contactListener=new Jolt.ContactListenerJS();
  contactListener.OnContactValidate=()=>Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
  contactListener.OnContactAdded=(p1,p2)=>{
    const b1=Jolt.wrapPointer(p1,Jolt.Body),b2=Jolt.wrapPointer(p2,Jolt.Body);
    const a=bodyByKey.get(b1.GetID().GetIndexAndSequenceNumber());
    const b=bodyByKey.get(b2.GetID().GetIndexAndSequenceNumber());
    if(!a||!b||collision)return;
    const names=new Set([a.name,b.name]);
    let type=null,target=null;
    if(names.has('ego')&&names.has('other')){type='VEHICLE';target=other;}
    else if(names.has('ego')&&names.has('cyclist')){type='CYCLIST';target=cyclist;}
    if(!type)return;
    const ep=vecOf(ego),tp=vecOf(target);
    collision={type,time:elapsed,pos:{x:(ep.x+tp.x)/2,y:.8,z:(ep.z+tp.z)/2},speed:relativeSpeed(ego,target)};
    pendingImpact=collision;
  };
  contactListener.OnContactPersisted=()=>{};
  contactListener.OnContactRemoved=()=>{};
  physicsSystem.SetContactListener(contactListener);
}

let ego,other,cyclist,groundBody;
function buildPhysicsWorld(){
  const floorShape=new Jolt.BoxShape(jv(36,.5,24),.05,null);
  groundBody=createBody({name:'ground',shape:floorShape,pos:[0,-.55,0],dynamic:false,friction:1.2});
  const curbShapeX=new Jolt.BoxShape(jv(36,.3,.4),.04,null);
  createBody({name:'curbN',shape:curbShapeX,pos:[0,-.1,20],dynamic:false,friction:1});
  createBody({name:'curbS',shape:curbShapeX,pos:[0,-.1,-20],dynamic:false,friction:1});
  const curbShapeZ=new Jolt.BoxShape(jv(.4,.3,20),.04,null);
  createBody({name:'curbE',shape:curbShapeZ,pos:[34,-.1,0],dynamic:false,friction:1});
  createBody({name:'curbW',shape:curbShapeZ,pos:[-34,-.1,0],dynamic:false,friction:1});
  const carShape=new Jolt.BoxShape(jv(2.2,.62,1.03),.08,null);
  ego=createBody({name:'ego',shape:carShape,pos:[-24,.72,0],dynamic:true,mass:1550,friction:.95,restitution:.05,angularDamping:2.1,object:createCarVisual(0x20f3d2,'ego')});
  other=createBody({name:'other',shape:carShape,pos:[0,.72,-21],rot:[0,Math.sin(Math.PI/4),0,Math.cos(Math.PI/4)],dynamic:true,mass:1450,friction:.95,restitution:.05,angularDamping:2.1,object:createCarVisual(0xff315f,'other')});
  const cyclistShape=new Jolt.BoxShape(jv(.78,1.08,.42),.08,null);
  cyclist=createBody({name:'cyclist',shape:cyclistShape,pos:[18,1.08,laneZ],rot:[0,1,0,0],dynamic:true,mass:95,friction:.8,restitution:.03,angularDamping:1.4,object:createCyclistVisual()});
  initialSnapshot=captureSnapshot();
  resetScenario(false);
}

function captureBody(item){
  const p=item.body.GetPosition();const pv=[p.GetX(),p.GetY(),p.GetZ()];
  const q=item.body.GetRotation();const qv=[q.GetX(),q.GetY(),q.GetZ(),q.GetW()];
  const lv=item.body.GetLinearVelocity();const lvv=[lv.GetX(),lv.GetY(),lv.GetZ()];
  const av=item.body.GetAngularVelocity();const avv=[av.GetX(),av.GetY(),av.GetZ()];
  return {p:pv,q:qv,lv:lvv,av:avv};
}
function captureSnapshot(){const s={};for(const b of dynamicBodies)s[b.name]=captureBody(b);return s;}
function restoreSnapshot(s){
  for(const b of dynamicBodies){const v=s[b.name];if(!v)continue;const p=jv(...v.p),q=jq(...v.q),lv=jv(...v.lv),av=jv(...v.av);bodyInterface.SetPositionAndRotation(b.id,p,q,Jolt.EActivation_Activate);bodyInterface.SetLinearAndAngularVelocity(b.id,lv,av);Jolt.destroy(p);Jolt.destroy(q);Jolt.destroy(lv);Jolt.destroy(av);}
  syncVisuals();
}
function setVelocity(item,x,y,z){const v=jv(x,y,z);bodyInterface.SetLinearVelocity(item.id,v);Jolt.destroy(v);}
function setAngular(item,x,y,z){const v=jv(x,y,z);bodyInterface.SetAngularVelocity(item.id,v);Jolt.destroy(v);}
function setBodyPose(item,pos,quat){const p=jv(...pos),q=jq(...quat);bodyInterface.SetPositionAndRotation(item.id,p,q,Jolt.EActivation_Activate);Jolt.destroy(p);Jolt.destroy(q);}
function addForce(item,x,y,z){const v=jv(x,y,z);bodyInterface.AddForce(item.id,v,Jolt.EActivation_Activate);Jolt.destroy(v);}
function addImpulse(item,x,y,z){const v=jv(x,y,z);bodyInterface.AddImpulse(item.id,v);Jolt.destroy(v);}
function addTorque(item,x,y,z){const v=jv(x,y,z);bodyInterface.AddTorque(item.id,v,Jolt.EActivation_Activate);Jolt.destroy(v);}

function resetDynamicPose(){
  setBodyPose(ego,[-24,.72,0],[0,0,0,1]);setVelocity(ego,13.2,0,0);setAngular(ego,0,0,0);
  setBodyPose(other,[0,.72,-21],[0,Math.sin(Math.PI/4),0,Math.cos(Math.PI/4)]);setVelocity(other,0,0,10.8);setAngular(other,0,0,0);
  setBodyPose(cyclist,[18,1.08,laneZ],[0,1,0,0]);setVelocity(cyclist,-5.1,0,0);setAngular(cyclist,0,0,0);
}
function resetScenario(rebuild=true){
  clearDebris();clearImpactRings();collision=null;impactEl.classList.remove('show');history=[];historyIndex=0;elapsed=0;currentStep=0;steerApplied=false;state='READY';timeline.classList.remove('show');
  resetDynamicPose();syncVisuals();updateBrakeMarker();laneEdge.position.z=laneZ;
  objective('<em>DRAG</em> THE RED BRAKE RING ALONG THE ROAD');
  if(rebuild)buildForecast();
}

function controlStep(dt,settings={brakeTime,steerTime,steerStrength,laneZ},forecast=false){
  forecastMode=forecast;pendingImpact=null;
  if(!collision){
    const ev=ego.body.GetLinearVelocity();const evx=ev.GetX(),evy=ev.GetY(),evz=ev.GetZ();
    const ov=other.body.GetLinearVelocity();const ovx=ov.GetX(),ovy=ov.GetY(),ovz=ov.GetZ();
    const cv=cyclist.body.GetLinearVelocity();const cvx=cv.GetX(),cvy=cv.GetY(),cvz=cv.GetZ();
    let ex=evx;
    if(elapsed<settings.brakeTime)ex=Math.max(ex,13.2);
    else ex=Math.max(0,ex-8.6*dt);
    setVelocity(ego,ex,evy,evz);
    setVelocity(other,ovx,ovy,Math.max(ovz,10.8));
    setVelocity(cyclist,Math.min(cvx,-5.1),cvy,cvz);
    if(settings.steerTime!==null&&!steerApplied&&elapsed>=settings.steerTime){
      steerApplied=true;addImpulse(ego,0,0,settings.steerStrength*1450);addTorque(ego,0,-settings.steerStrength*640,0);
    }
  }
  jolt.Step(dt,1);
  elapsed+=dt;currentStep++;
  if(pendingImpact&&!forecast&&debris.length===0)spawnImpact(pendingImpact);
  forecastMode=false;
}
function vecOf(item){const p=item.body.GetPosition();return{x:p.GetX(),y:p.GetY(),z:p.GetZ()};}
function relativeSpeed(a,b){const av=a.body.GetLinearVelocity();const ax=av.GetX(),ay=av.GetY(),az=av.GetZ();const bv=b.body.GetLinearVelocity();return Math.hypot(ax-bv.GetX(),ay-bv.GetY(),az-bv.GetZ());}

function runActual(){
  clearDebris();clearImpactRings();history=[];historyIndex=0;elapsed=0;currentStep=0;collision=null;steerApplied=false;resetDynamicPose();state='RUNNING';timeline.classList.remove('show');objective('<em>GRAB</em> THE MOVING CYAN CAR TO ADD A SECOND CORRECTION');branchCount++;
  recordHistory();playTone(230,.08,.08);
}
function pauseAtHistory(index){
  if(!history.length)return;state='PAUSED';historyIndex=clamp(index,0,history.length-1);restoreSnapshot(history[historyIndex].snapshot);elapsed=history[historyIndex].time;timeline.classList.add('show');updateTimeline();objective('<em>DRAG</em> THE CYAN CAR SIDEWAYS, THEN RELEASE');
}
function recordHistory(){history.push({time:elapsed,snapshot:captureSnapshot()});historyIndex=history.length-1;}
function finishRun(){state='COMPLETE';timeline.classList.add('show');historyIndex=history.length-1;updateTimeline();
  if(collision){objective(`<em>${collision.type} IMPACT</em> · DRAG THE TIMELINE TO REWIND`);}else{objective('<em>CLEAR PASSAGE</em> · MOVE THE GREEN LANE EDGE OR REWIND');}
}

function spawnImpact(c){
  impactEl.textContent=`${c.type} IMPACT · ${c.speed.toFixed(1)} m/s`;impactEl.classList.add('show');impactShownAt=performance.now();playImpact(c.speed);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.4,.7,48),new THREE.MeshBasicMaterial({color:0xff315f,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(c.pos.x,.12,c.pos.z);scene.add(ring);impactRings.push({mesh:ring,age:0});
  for(let i=0;i<13;i++){
    const size=.12+Math.random()*.22;const obj=addMesh(new THREE.BoxGeometry(size,size,size),makeMat(i%2?0xff315f:0x20f3d2,{emissive:i%2?0x550014:0x00483d,emissiveIntensity:1}));
    const shape=new Jolt.BoxShape(jv(size/2,size/2,size/2),.02,null);const b=createBody({name:`debris-${Date.now()}-${i}`,shape,pos:[c.pos.x,c.pos.y,c.pos.z],dynamic:true,mass:.8+Math.random()*2,friction:.7,restitution:.35,angularDamping:.25,object:obj});
    const a=Math.random()*Math.PI*2,s=2+Math.random()*6;setVelocity(b,Math.cos(a)*s,2+Math.random()*5,Math.sin(a)*s);setAngular(b,Math.random()*8,Math.random()*8,Math.random()*8);debris.push(b);
  }
}
function clearDebris(){for(const d of debris){bodyInterface.RemoveBody(d.id);bodyInterface.DestroyBody(d.id);bodyByKey.delete(d.key);Jolt.destroy(d.id);if(d.object)scene.remove(d.object);const bi=bodies.indexOf(d);if(bi>=0)bodies.splice(bi,1);const di=dynamicBodies.indexOf(d);if(di>=0)dynamicBodies.splice(di,1);}debris=[];}
function clearImpactRings(){for(const r of impactRings)scene.remove(r.mesh);impactRings=[];}

function syncVisuals(){
  for(const b of bodies){if(!b.object)continue;const p=b.body.GetPosition(),q=b.body.GetRotation();b.object.position.set(p.GetX(),p.GetY(),p.GetZ());b.object.quaternion.set(q.GetX(),q.GetY(),q.GetZ(),q.GetW());}
}

async function buildForecast(){
  if(forecastBusy)return;forecastBusy=true;state='FORECAST';objective('<em>JOLT</em> IS RUNNING COUNTERFACTUALS');clearDebris();clearImpactRings();clearForecast();
  const saved=captureSnapshot();const savedElapsed=elapsed;const savedCollision=collision;
  const variants=[-.42,-.24,-.1,0,.1,.24,.42];
  for(let i=0;i<variants.length;i++){
    resetDynamicPose();elapsed=0;currentStep=0;collision=null;steerApplied=false;
    const pts=[];for(let s=0;s<228;s++){controlStep(FIXED_DT,{brakeTime:clamp(brakeTime+variants[i],.3,2.9),steerTime,steerStrength,laneZ},true);if(s%5===0)pts.push(vecOf(ego));if(elapsed>3.8)break;}
    const color=collision?(collision.type==='CYCLIST'?0xffd34e:0xff315f):0x20f3d2;const geo=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(p.x,.18,p.z)));const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity:i===3?.95:.28,depthWrite:false});const line=new THREE.Line(geo,mat);line.userData.forecast=true;scene.add(line);forecastLines.push(line);
  }
  restoreSnapshot(saved);elapsed=savedElapsed;collision=savedCollision;state='READY';forecastBusy=false;objective('<em>TAP</em> THE CYAN CAR TO RUN THIS BRANCH');syncVisuals();
}
function clearForecast(){for(const l of forecastLines){scene.remove(l);l.geometry.dispose();l.material.dispose();}forecastLines=[];}

function objective(html){objectiveEl.innerHTML=html;}
function updateReadout(){const outcome=collision?collision.type:(state==='COMPLETE'?'CLEAR':'—');readoutEl.innerHTML=`<strong>${state}</strong><br>TIME ${elapsed.toFixed(2)} s<br>BRAKE ${brakeTime.toFixed(2)} s<br>BRANCH ${branchCount}<br>OUTCOME ${outcome}`;}
function updateTimeline(){if(!history.length)return;const pct=historyIndex/Math.max(1,history.length-1);timelineFill.style.width=`${pct*100}%`;timelineKnob.style.left=`${pct*100}%`;}

function setPointer(e){const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;}
function hits(e,objects){setPointer(e);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(objects,true);}
function rootKind(obj){while(obj&&obj!==scene){if(obj.userData?.kind)return{kind:obj.userData.kind,obj};obj=obj.parent;}return null;}
function groundPoint(e){setPointer(e);raycaster.setFromCamera(pointer,camera);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);const p=new THREE.Vector3();return raycaster.ray.intersectPlane(plane,p)?p:null;}

canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);initAudio();pointerDownTime=performance.now();dragStart={x:e.clientX,y:e.clientY};groundStart=groundPoint(e);
  const all=[brakeMarker,laneEdge,ego.object,other.object,cyclist.object].filter(Boolean);const hit=hits(e,all)[0];const rk=hit?rootKind(hit.object):null;
  if(rk?.kind==='brake-marker'&&(state==='READY'||state==='COMPLETE')){dragging='brake';objective('<em>RELEASE</em> TO RUN JOLT FORECASTS');return;}
  if(rk?.kind==='lane-edge'&&(state!=='RUNNING')){dragging='lane';objective('<em>MOVE</em> THE PHYSICAL LANE EDGE');return;}
  if(rk?.kind==='car'&&rk.obj===ego.object){
    if(state==='READY'||state==='COMPLETE'){runActual();return;}
    if(state==='RUNNING'){dragging='steer';state='PAUSED';steerTime=elapsed;objective('<em>DRAG</em> SIDEWAYS AND RELEASE');return;}
    if(state==='PAUSED'){dragging='steer';return;}
  }
  if((state==='COMPLETE'||state==='PAUSED')&&history.length){dragging='scrub-road';timeline.classList.add('show');return;}
  dragging='camera';
});
canvas.addEventListener('pointermove',e=>{
  if(!dragging)return;e.preventDefault();const gp=groundPoint(e);
  if(dragging==='brake'&&gp){const x=clamp(gp.x,-20,-2);brakeTime=clamp((x+20)/18*3,.25,2.9);updateBrakeMarker();}
  else if(dragging==='lane'&&gp){laneZ=clamp(gp.z,2.5,7.5);laneEdge.position.z=laneZ;}
  else if(dragging==='steer'&&gp&&groundStart){steerStrength=clamp((gp.z-groundStart.z)*.7,-6,6);drawSteerPreview(steerStrength);}
  else if(dragging==='scrub-road'&&history.length){const dx=e.clientX-dragStart.x;const base=historyIndex;const idx=clamp(Math.round(base+dx/3),0,history.length-1);historyIndex=idx;restoreSnapshot(history[idx].snapshot);elapsed=history[idx].time;updateTimeline();}
  else if(dragging==='camera'){const dx=e.movementX||0,dy=e.movementY||0;controls.yaw-=dx*.006;controls.pitch=clamp(controls.pitch-dy*.004,.3,1.15);updateCamera();}
});
canvas.addEventListener('pointerup',e=>{
  if(!dragging)return;e.preventDefault();const mode=dragging;dragging=null;
  if(mode==='brake'){buildForecast();}
  else if(mode==='lane'){setBodyPose(cyclist,[18,1.08,laneZ],[0,1,0,0]);setVelocity(cyclist,-5.1,0,0);clearSteerPreview();buildForecast();}
  else if(mode==='steer'){clearSteerPreview();if(history.length&&state==='PAUSED'){history=history.slice(0,historyIndex+1);restoreSnapshot(history[historyIndex].snapshot);elapsed=history[historyIndex].time;}collision=null;steerApplied=false;state='RUNNING';timeline.classList.remove('show');objective('<em>JOLT</em> IS RUNNING THE COMPOUND BRANCH');branchCount++;}
  else if(mode==='scrub-road'){state='PAUSED';objective('<em>GRAB</em> THE CYAN CAR TO CHANGE THIS MOMENT');}
});
canvas.addEventListener('wheel',e=>{e.preventDefault();controls.distance=clamp(controls.distance+e.deltaY*.025,24,72);updateCamera();},{passive:false});
let pinchDist=0;
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);controls.distance=clamp(controls.distance-(d-pinchDist)*.05,24,72);pinchDist=d;updateCamera();}},{passive:false});

timeline.addEventListener('pointerdown',e=>{e.preventDefault();timeline.setPointerCapture(e.pointerId);scrubTimeline(e);});
timeline.addEventListener('pointermove',e=>{if(e.buttons)scrubTimeline(e);});
function scrubTimeline(e){if(!history.length)return;const r=timeline.getBoundingClientRect();const pct=clamp((e.clientX-r.left)/r.width,0,1);historyIndex=Math.round(pct*(history.length-1));restoreSnapshot(history[historyIndex].snapshot);elapsed=history[historyIndex].time;state='PAUSED';updateTimeline();objective('<em>GRAB</em> THE CYAN CAR TO CHANGE THIS MOMENT');}

let steerPreview=null;
function drawSteerPreview(v){clearSteerPreview();const pts=[];const ep=vecOf(ego);for(let i=0;i<20;i++)pts.push(new THREE.Vector3(ep.x+i*.45,.25,ep.z+v*(i/20)));const geo=new THREE.BufferGeometry().setFromPoints(pts);steerPreview=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffd34e,transparent:true,opacity:.9}));scene.add(steerPreview);}
function clearSteerPreview(){if(steerPreview){scene.remove(steerPreview);steerPreview.geometry.dispose();steerPreview.material.dispose();steerPreview=null;}}

menuBtn.addEventListener('click',()=>menu.classList.toggle('show'));
document.querySelector('#resetBtn').onclick=()=>{menu.classList.remove('show');branchCount=0;steerTime=null;steerStrength=0;brakeTime=1.55;laneZ=4;resetScenario(true);};
document.querySelector('#observedBtn').onclick=()=>{menu.classList.remove('show');brakeTime=2.7;steerTime=null;steerStrength=0;updateBrakeMarker();runActual();};
document.querySelector('#forecastBtn').onclick=()=>{menu.classList.remove('show');buildForecast();};
document.querySelector('#cameraBtn').onclick=()=>{menu.classList.remove('show');controls.yaw=-.72;controls.pitch=.72;controls.distance=48;controls.target.set(0,0,0);updateCamera();};
document.querySelector('#soundBtn').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'SOUND ON':'SOUND OFF';menu.classList.remove('show');};

function initAudio(){if(audioCtx||!soundOn)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();}
function playTone(freq,dur=.08,gain=.05){if(!audioCtx||!soundOn)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}
function playImpact(speed){if(!audioCtx||!soundOn)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(110+speed*8,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(28,audioCtx.currentTime+.35);g.gain.setValueAtTime(Math.min(.25,.05+speed*.008),audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.38);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.4);try{navigator.vibrate?.([30,20,80]);}catch{}}

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.033);accumulator+=dt;
  if(state==='RUNNING'){
    while(accumulator>=FIXED_DT){controlStep(FIXED_DT,{brakeTime,steerTime,steerStrength,laneZ},false);if(currentStep%2===0)recordHistory();accumulator-=FIXED_DT;if(elapsed>=RUN_LIMIT){finishRun();break;}}
  }else accumulator=0;
  syncVisuals();
  for(const r of impactRings){r.age+=dt;r.mesh.scale.setScalar(1+r.age*4);r.mesh.material.opacity=Math.max(0,1-r.age*.9);}
  if(performance.now()-impactShownAt>1800)impactEl.classList.remove('show');
  updateReadout();renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

(async function boot(){
  try{
    Jolt=await initJolt();
    const settings=new Jolt.JoltSettings();setupCollisionFiltering(settings);jolt=new Jolt.JoltInterface(settings);Jolt.destroy(settings);physicsSystem=jolt.GetPhysicsSystem();bodyInterface=physicsSystem.GetBodyInterface();installContactListener();
    buildVisualWorld();buildPhysicsWorld();await buildForecast();
    loadEl.style.display='none';state='READY';animate();
  }catch(err){fail(err?.stack||String(err));}
})();
