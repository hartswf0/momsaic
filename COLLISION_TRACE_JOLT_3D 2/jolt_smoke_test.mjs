import initJolt from './vendor/jolt-physics.wasm-compat.js';
const Jolt=await initJolt();
function setup(settings){
 const of=new Jolt.ObjectLayerPairFilterTable(2);of.EnableCollision(0,1);of.EnableCollision(1,1);
 const bp0=new Jolt.BroadPhaseLayer(0),bp1=new Jolt.BroadPhaseLayer(1);
 const bp=new Jolt.BroadPhaseLayerInterfaceTable(2,2);bp.MapObjectToBroadPhaseLayer(0,bp0);bp.MapObjectToBroadPhaseLayer(1,bp1);
 settings.mObjectLayerPairFilter=of;settings.mBroadPhaseLayerInterface=bp;
 settings.mObjectVsBroadPhaseLayerFilter=new Jolt.ObjectVsBroadPhaseLayerFilterTable(bp,2,of,2);
}
const s=new Jolt.JoltSettings();setup(s);const ji=new Jolt.JoltInterface(s);Jolt.destroy(s);
const bi=ji.GetPhysicsSystem().GetBodyInterface();
function body(shape,pos,dyn,mass){const p=new Jolt.Vec3(...pos),q=new Jolt.Quat(0,0,0,1);const cs=new Jolt.BodyCreationSettings(shape,p,q,dyn?Jolt.EMotionType_Dynamic:Jolt.EMotionType_Static,dyn?1:0);cs.mAllowSleeping=false;const b=bi.CreateBody(cs);bi.AddBody(b.GetID(),Jolt.EActivation_Activate);if(dyn)b.GetMotionProperties().ScaleToMass(mass);Jolt.destroy(cs);Jolt.destroy(p);Jolt.destroy(q);return b;}
const floor=body(new Jolt.BoxShape(new Jolt.Vec3(20,.5,20),.05,null),[0,-.5,0],false,0);
const car=body(new Jolt.BoxShape(new Jolt.Vec3(2,.5,1),.05,null),[-5,.6,0],true,1500);
let v=new Jolt.Vec3(12,0,0);bi.SetLinearVelocity(car.GetID(),v);Jolt.destroy(v);
for(let i=0;i<120;i++){if(i>50){let f=new Jolt.Vec3(-15000,0,0);bi.AddForce(car.GetID(),f,Jolt.EActivation_Activate);Jolt.destroy(f);}ji.Step(1/60,1);}
const p=car.GetPosition(),lv=car.GetLinearVelocity();
console.log(JSON.stringify({x:p.GetX(),y:p.GetY(),z:p.GetZ(),vx:lv.GetX(),ok:Number.isFinite(p.GetX())&&p.GetY()>-2}));
