(function(){
'use strict';
const query=new URLSearchParams(location.search);
if(query.has('tv')||query.has('together')||query.has('manual'))return;
const by=id=>document.getElementById(id),joined=query.has('join');
const title=by('titleScreen'),controls=title.querySelector('.title-controls');
const css=document.createElement('style');css.textContent=`
#titleScreen.dock-title{gap:8px}#titleScreen.dock-title [hidden]{display:none!important}
#titleScreen.dock-title #introFilm{max-height:29dvh}
#titleScreen.dock-title .title-heading p{font-size:clamp(16px,4.5vw,22px)}
#titleScreen.dock-title .title-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#titleScreen.dock-title #beginBody{grid-column:1/-1;min-height:66px;font-size:25px}
#titleScreen.dock-title .title-controls .secondary{min-height:42px;font-size:14px;padding:7px;text-decoration:none;text-align:center}
#titleScreen.dock-title #beginTouch{min-height:42px;font-size:14px}
#titleScreen.dock-title .title-note{font-size:12px}
#dockSetup[hidden],#dockFrame[hidden]{display:none!important}
#dockSetup{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:16px;background:#102d27fc;color:#eff0da;text-align:center;overflow:hidden}
#dockSetup h2,#dockSetup p{margin:0}
#dockSetup h2{font:normal clamp(28px,6vw,45px)/1 Georgia,serif}
#dockSetup .dk-guide{max-width:600px;display:grid;gap:7px;text-align:left;font-size:clamp(13px,3.5vw,18px);line-height:1.3;color:#d8e7d0}
#dockSetup .dk-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(100%,500px)}
#dockSetup button{min-height:42px;padding:8px 12px;font-size:14px}
#dockSetup button.selected{background:#d5e7ae;color:#193a31;border-color:#d5e7ae}
#dockSetup .dk-small{font-size:11px;color:#c1d2b9;max-width:54ch}
#dockSetup .dk-actions{display:flex;gap:8px}
.app.dock-active .cam{max-height:100%;width:min(86vw,450px)}
.app.dock-active .cam.dk-ready{border-color:#b7e69d}
.app.dock-active .cam.dk-wait{border-color:#efd18a}
.app.dock-active .cam.dk-endhold{border-color:#f7df99}
.app.dock-active .cam.dk-rear video{transform:none}
.app.dock-active .camlabel{bottom:auto;top:0;background:#102a25db}
#dockFrame{position:absolute;inset:35px 0 0;z-index:1;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:7px}
#dockFrame .dk-brackets{position:absolute;inset:9px 12px 39px;border:1px dashed #f4f4d280;border-radius:15px}
#dockFrame .dk-parts{margin-top:auto;display:flex;gap:5px;justify-content:center;max-width:100%}
#dockFrame .dk-parts span{background:#122d28de;border:1px solid #f4e4b477;padding:4px 7px;border-radius:20px;font-size:11px;color:#f6e7bd;font-weight:700;white-space:nowrap}
#dockFrame .dk-parts span.ok{border-color:#c7e6a5;color:#daf2b7}
.app.dock-active .bottom{gap:5px}
.app.dock-active .caption{font-size:clamp(23px,5.5vw,34px)}
.app.dock-active .subcaption{font-size:clamp(12px,3.5vw,15px)}
.app.dock-active .buttons #act{min-height:47px;font-size:16px;background:#193e35;color:#f0f0d8;border:1px solid #d3e2bd77;box-shadow:none}
.app.dock-active .buttons #act.dk-restart{min-height:59px;font-size:21px;background:#d4e8ad;color:#163729}
@media(max-height:550px) and (orientation:landscape){
#titleScreen.dock-title #introFilm{max-height:78dvh}
#titleScreen.dock-title #beginBody{min-height:45px;font-size:20px}
#titleScreen.dock-title .title-controls .secondary{min-height:32px;font-size:12px}
#dockSetup{gap:6px}#dockSetup .dk-guide{gap:4px;font-size:13px}#dockSetup button{min-height:33px;font-size:12px}
.app.dock-active .cam{width:min(43vw,360px);height:100%;aspect-ratio:auto}
.app.dock-active .buttons #act{min-height:38px}
}
@media(max-height:600px) and (orientation:portrait){#titleScreen.dock-title #introFilm{max-height:24dvh}#titleScreen.dock-title #beginBody{min-height:53px}#dockSetup .dk-guide{font-size:13px;gap:4px}#dockSetup{gap:7px}}
`;
document.head.append(css);title.classList.add('dock-title');
title.querySelector('.title-heading p').textContent=joined?'Join the creek. Play hands-free.':'Move gently. Play hands-free.';
title.querySelector('.title-note').innerHTML='Put your phone on a stand before playing. Move only as approved. <a class="advanced-link" href="advanced.html">Guided therapy</a>';
const oldHelp=[...controls.querySelectorAll('button')].find(b=>b.textContent.trim()==='Listen to setup');if(oldHelp)oldHelp.hidden=true;
if(joined){for(const b of controls.querySelectorAll('button'))if(/TV game|Join TV$/.test(b.textContent.trim()))b.hidden=true}
const helper=document.createElement('button');helper.className='secondary';helper.textContent='Listen to setup';controls.append(helper);
by('beginBody').textContent=joined?'Join & play':'Play';
by('beginTouch').textContent='Touch play';
by('app').insertAdjacentHTML('beforeend',`<section id="dockSetup" hidden aria-label="Camera setup"><h2>Put the phone down.</h2><div class="dk-guide"><p><b>1.</b> Ask a helper to put the phone on a stable table or stand. Use your usual approved seating or support.</p><p><b>2.</b> Start about 5–8 feet away. Adjust the phone until your hips, knees and ankles are visible. This is a starting distance, not a requirement.</p><p><b>3.</b> Tap Play and allow the camera once. You can start, play, rest and resume without reaching for the screen.</p><p><b>4.</b> To end, stop moving and rest. If comfortable, hold a hand near your chest for about three seconds to turn off the camera. A helper can also press End.</p></div><div class="dk-choices"><button class="secondary selected" id="dkFront">Front camera<br>Screen faces you</button><button class="secondary" id="dkRear">Rear camera<br>TV or helper sees screen</button></div><p class="dk-small" id="dkCameraNote">Use the front camera when the phone is your display. Mirror to a TV for easier viewing.</p><div class="dk-actions"><button class="primary" id="dkListen">Listen again</button><button class="secondary" id="dkDone">Done</button></div></section>`);
by('cam').insertAdjacentHTML('beforeend',`<div id="dockFrame" hidden><div class="dk-brackets"></div><div class="dk-parts"><span id="dkHip">Hip</span><span id="dkKnee">Knee</span><span id="dkAnkle">Ankle</span></div></div>`);
let active=false,state='idle',facing='user',rear=false,spoken=true,wake=null,serial=0;
let cameraAt=0,lastActivity=0,lastValid=0,lastPoseAt=0,goodSince=0,lastEvent=-1e9,voiceAt=-1e9,saidReady=false,saidRest=false,saidFallback=false,saidComplete=false,wasFramed=false,everFramed=false,saidLost=false;
let handOutsideSince=0,handArmed=false,handSince=0,handWarning=false,handCancelUntil=0,handMissingSince=0;
let smooth=new Map(),anchors=new Map(),frameParts=[false,false,false],frameKind='',frameMode='pose',lastUI='';
const originalRender=renderFree,originalAct=by('act').onclick,originalStop=stopCamera,originalSoundToggle=by('sound').onclick;
const guideText='Put the phone on a stable stand. Sit comfortably with your usual approved support. Ask a helper to start about five to eight feet away and aim the camera so your hips, knees and ankles are visible. Tap Play once, then allow camera access. When your body is in view, the creek is ready. Use only movements approved by your physical therapist. Stop moving to rest, and move again only when you are ready. If comfortable, hold a hand near your chest for three seconds to end. You do not need to reach for the phone. A helper can always turn off the camera.';
function speech(text,force=false){
 if(!force&&(!spoken||performance.now()-voiceAt<5500||document.hidden))return;
 try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
 const syn=window.speechSynthesis;if(!force&&syn.speaking)return;
 if(force)syn.cancel();const u=new window.SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.87;u.volume=.82;voiceAt=performance.now();syn.speak(u);
 }catch(e){}
}
function silence(){try{window.speechSynthesis?.cancel()}catch(e){}}
helper.onclick=()=>{by('dockSetup').hidden=false;speech(guideText,true)};
by('dkListen').onclick=()=>speech(guideText,true);
by('dkDone').onclick=()=>{silence();by('dockSetup').hidden=true};
function chooseCamera(v){facing=v;by('dkFront').classList.toggle('selected',v==='user');by('dkRear').classList.toggle('selected',v==='environment');by('dkCameraNote').textContent=v==='user'?'Use the front camera when the phone is your display. Mirror to a TV for easier viewing.':'The phone screen faces away from you. Use a TV or ask a helper to view it.'}
by('dkFront').onclick=()=>chooseCamera('user');by('dkRear').onclick=()=>chooseCamera('environment');
by('sound').onclick=()=>{originalSoundToggle?.();spoken=soundOn;if(!spoken)silence()};
async function keepAwake(){
 if(!active||!stream||document.hidden||wake)return;
 try{if(!navigator.wakeLock?.request)return;const lock=await navigator.wakeLock.request('screen');if(!active||!stream){await lock.release();return}wake=lock;lock.addEventListener('release',()=>{if(wake===lock)wake=null})}catch(e){}
}
function releaseWake(){const w=wake;wake=null;try{w?.release()?.catch(()=>{})}catch(e){}}
function resetTracking(){
 smooth.clear();anchors.clear();frameParts=[false,false,false];frameKind='';goodSince=0;lastValid=0;wasFramed=false;everFramed=false;saidLost=false;
 handOutsideSince=0;handArmed=false;handSince=0;handWarning=false;handCancelUntil=0;handMissingSince=0;lastPoseAt=0;lastUI='';
}
stopCamera=function(){releaseWake();return originalStop()};
function setState(next){if(state!==next){state=next;lastUI='';renderDock()}}
function renderDock(){
 if(!active&&state==='idle')return;
 const cam=by('cam'),has=!!stream;
 by('app').classList.toggle('dock-active',true);
 by('dockFrame').hidden=!has;
 cam.classList.toggle('dk-rear',rear);
 cam.classList.toggle('dk-ready',['ready','playing','rest'].includes(state));
 cam.classList.toggle('dk-wait',['framing','loading','motion'].includes(state));
 cam.classList.toggle('dk-endhold',state==='ending');
 for(const [i,id] of ['dkHip','dkKnee','dkAnkle'].entries())by(id).classList.toggle('ok',frameParts[i]);
 const frameLabel=frameKind==='legs'?'Legs in view':frameKind==='upper'?'Upper body in view':frameKind==='motion'?'Camera motion only':'Adjust camera';
 const motionOnly=frameMode==='motion';
 const text={
 starting:['Allow camera','Tap Allow once. A helper can place the phone.','Waiting for permission'],
 loading:['Camera on','Ask a helper to aim the phone. Body tracking is loading.','Camera on · loading'],
 framing:['Adjust the phone','Ask a helper to put your body in view. No need to change position.','Body not fully in view'],
 ready:['Ready','Move only when comfortable and as approved.','Ready · '+frameLabel],
 playing:[restoration.stage===5?'Creek restored':'Creek responding',motionOnly?'Camera motion changes the water. Joints are not tracked.':'Your movement changes the water.',motionOnly?'Motion detected · no joint tracking':'Movement detected'],
 rest:['Resting','The creek waits. Move again only when ready.',motionOnly?'Resting · motion only':'Resting · camera on'],
 motion:['Camera motion mode','No joint tracking yet. Gentle motion can change the creek.','Motion only'],
 ending:['Hold to end','Relax your hand to cancel.','Ending camera…'],
 finished:[restoration.stage===5?'Creek restored':'Session ended','Camera off. Your creek stays here.','Camera off'],
 error:['Camera unavailable',permissionError||'Ask a helper to allow camera access.','Camera off']
 }[state]||['Ready','Move gently.','Camera on'];
 const key=[state,frameLabel,restoration.stage,has,permissionError].join('|');
 by('camText').textContent=text[2];
 if(key!==lastUI){
  lastUI=key;by('worldTitle').textContent='Creekkeeper';by('prompt').textContent=text[0];by('hint').textContent=text[1];by('camText').textContent=text[2];
  const act=by('act');act.textContent=has?'End':state==='starting'?'Waiting…':state==='finished'?'Resume creek':'Try again';act.disabled=state==='starting';act.classList.toggle('dk-restart',!has);
  const alt=by('touchPlay');alt.hidden=state!=='error';alt.style.display=alt.hidden?'none':'flex';alt.textContent='Touch';
 }
}
renderFree=function(){originalRender();lastUI='';if(active||state!=='idle')renderDock()};
function finish(reason){
 if(!active&&!stream)return;
 ++serial;active=false;stopCamera();loading=false;modelReady=false;simpleRest=true;paused=false;permissionError='';resetTracking();state='finished';renderHUD();if(audio)updateSoundMix(true);
 if(reason==='gesture'&&spoken)speech('Camera off. Rest comfortably.',true);
 else if(reason==='idle')speech('Camera off. Your creek will wait.');
}
function pointGood(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.58&&p.x>.025&&p.x<.975&&p.y>.025&&p.y<.975}
const sideParts=[[23,25,27],[24,26,28]],armParts=[[11,13,15],[12,14,16]];
function framing(lm){
 const mask=ids=>ids.map(i=>pointGood(lm[i]));
 const left=mask(sideParts[0]),right=mask(sideParts[1]);
 const total=x=>x.filter(Boolean).length;
 frameParts=total(left)>=total(right)?left:right;
 const legs=total(left)===3||total(right)===3,upper=armParts.some(ids=>ids.every(i=>pointGood(lm[i])));
 frameKind=legs?'legs':upper?'upper':'';
 return {eligible:legs||upper,legs,upper};
}
function screenX(x){return rear?x:1-x}
function drawPose(lm){
 if(!lm)return;const vw=VIDEO.videoWidth||640,vh=VIDEO.videoHeight||480;
 if(POSE.width!==vw||POSE.height!==vh){POSE.width=vw;POSE.height=vh}
 PC.clearRect(0,0,vw,vh);PC.lineWidth=Math.max(3,vw/160);PC.lineCap='round';PC.strokeStyle='#e5efb6';PC.fillStyle='#eaf4c2';
 for(const [a,b] of links){if(!pointGood(lm[a])||!pointGood(lm[b]))continue;PC.beginPath();PC.moveTo(screenX(lm[a].x)*vw,lm[a].y*vh);PC.lineTo(screenX(lm[b].x)*vw,lm[b].y*vh);PC.stroke()}
 for(const i of [11,12,13,14,15,16,23,24,25,26,27,28,29,30,31,32]){const p=lm[i];if(!pointGood(p))continue;PC.beginPath();PC.arc(screenX(p.x)*vw,p.y*vh,Math.max(3,vw/165),0,Math.PI*2);PC.fill()}
}
function nearChest(lm){
 const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const sh=[lm[11],lm[12]],hip=[lm[23],lm[24]];
 if(!sh.every(pointGood)||!hip.every(pointGood))return null;
 const s=mid(...sh),h=mid(...hip),size=Math.hypot(h.x-s.x,h.y-s.y);
 if(size<.065)return null;
 const wrist=[lm[15],lm[16]].filter(pointGood);if(!wrist.length)return null;
 const chest={x:s.x+(h.x-s.x)*.30,y:s.y+(h.y-s.y)*.30};
 return wrist.some(w=>Math.hypot(w.x-chest.x,w.y-chest.y)<Math.max(.035,size*.27));
}
function checkEnd(lm,t){
 const near=nearChest(lm);
 if(near===null){if(!handMissingSince)handMissingSince=t;if(t-handMissingSince>350){handSince=0;handArmed=false;handOutsideSince=0;handWarning=false;if(state==='ending')setState('ready')}return false}
 handMissingSince=0;
 if(!near){
  if(handSince){handSince=0;handWarning=false;handCancelUntil=t+650;if(state==='ending')setState('ready');anchors.clear()}
  if(!handOutsideSince)handOutsideSince=t;
  if(t-handOutsideSince>900)handArmed=true;
  return t<handCancelUntil;
 }
 handOutsideSince=0;
 if(!handArmed||t<handCancelUntil)return false;
 if(!handSince){handSince=t;handWarning=false}
 const elapsed=t-handSince;
 if(elapsed>600){setState('ending');if(!handWarning&&elapsed>850){handWarning=true;speech('Hold to finish, or relax your hand to cancel.')}}
 if(elapsed>=3000){finish('gesture');return true}
 return true;
}
function react(x,y,t,source){
 if(!active||!stream||document.hidden||t-lastEvent<600)return;
 lastActivity=t;lastEvent=t;bodyControl.active=true;bodyControl.last=t;bodyControl.source=source;bodyControl.tx=x;bodyControl.ty=.43+y*.32;
 setState('playing');ecologyEvent(x*W,(.43+y*.32)*H,true);
 by('cam').classList.add('motion-flash');setTimeout(()=>by('cam').classList.remove('motion-flash'),500);
 if(restoration.stage===5&&!saidComplete){saidComplete=true;speech('The creek is restored. Rest whenever you like.')}
}
function poseFrame(poses,t){
 if(!active||!stream||document.hidden)return;
 lastPoseAt=t;const lm=poses?.[0];
 if(!lm){goodSince=0;if(t-lastValid>1100){anchors.clear();smooth.clear();handSince=0;handArmed=false;frameParts=[false,false,false];wasFramed=false;if(frameMode!=='motion'){frameKind='';setState('framing');renderDock()}}return}
 const f=framing(lm);drawPose(lm);
 if(!f.eligible){goodSince=0;if(t-lastValid>1000){anchors.clear();smooth.clear();handSince=0;handArmed=false;wasFramed=false;if(frameMode!=='motion'){setState('framing');renderDock()}}return}
 lastValid=t;
 if(!goodSince)goodSince=t;
 if(t-goodSince<450){renderDock();return}
 if(!wasFramed||frameMode!=='pose'){
  frameMode='pose';wasFramed=true;everFramed=true;saidLost=false;anchors.clear();smooth.clear();lastEvent=t;setState('ready');
  if(!saidReady){saidReady=true;if(spoken)speech(f.legs?'Your legs are in view. Move whenever you are ready.':'Your upper body is in view. Ask a helper to aim lower for leg play.',true)}
 }
 if(checkEnd(lm,t))return;
 const ids=f.legs?[23,24,25,26,27,28,29,30,31,32,15,16]:[11,12,13,14,15,16];
 const moved=[];
 for(const id of ids){
  const p=lm[id];if(!pointGood(p)){anchors.delete(id);smooth.delete(id);continue}
  const old=smooth.get(id),a={x:screenX(p.x),y:p.y};
  const n=old?{x:old.x*.30+a.x*.70,y:old.y*.30+a.y*.70}:a;smooth.set(id,n);
  const start=anchors.get(id);if(!start){anchors.set(id,n);continue}
  const d=Math.hypot(n.x-start.x,n.y-start.y);
  if(d>.25){anchors.set(id,n);continue}
  if(d>.010)moved.push({id,d,...n});
 }
 moved.sort((a,b)=>b.d-a.d);
 if(moved.length&&t-lastEvent>=650){const p=moved[0];for(const [id,n] of smooth)anchors.set(id,n);react(p.x,p.y,t,'pose')}
 else if(t-lastActivity>=5000&&state!=='rest'&&state!=='ending'){setState('rest');if(!saidRest){saidRest=true;speech('Resting. Move again only when you are ready.')}}
 renderDock();
}
window.ckMultiPose=poseFrame;
function dockMotion(token,session){
 let canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;
 const mc=canvas.getContext('2d',{willReadFrequently:true});let prev=null,lastFrameTime=0,eligibleSince=0;
 const loop=t=>{
  if(!active||!stream||token!==cameraToken||session!==serial)return;
  if(document.hidden){prev=null;eligibleSince=0;motionRAF=requestAnimationFrame(loop);return}
  if(t-lastActivity>180000){finish('idle');return}
  // Camera-motion play never claims that the camera has identified a joint.
  const fallback=!everFramed&&t-cameraAt>1800&&(!modelReady||t-lastPoseAt>3500||t-Math.max(cameraAt,lastValid)>9000);
  if(fallback&&t-lastFrameTime>110&&VIDEO.readyState>=2){
   if(frameMode!=='motion'){frameMode='motion';wasFramed=false;anchors.clear();smooth.clear();handSince=0;handArmed=false;prev=null;eligibleSince=t}
   frameParts=[false,false,false];frameKind='motion';
   if(state==='loading'||state==='framing'||state==='ready')setState('motion');
   if(!saidFallback&&t-cameraAt>4500){saidFallback=true;speech('Camera motion mode. A helper can adjust the camera for joint tracking.')}
   lastFrameTime=t;
   try{
    mc.drawImage(VIDEO,0,0,80,60);const data=mc.getImageData(0,0,80,60).data,g=new Uint8Array(4800);
    let n=0,x=0,y=0;for(let i=0;i<g.length;i++){g[i]=(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114)|0;if(prev&&Math.abs(g[i]-prev[i])>17){n++;x+=i%80;y+=Math.floor(i/80)}}
    if(n>=14&&n<1200&&t-eligibleSince>350){const xx=screenX(x/n/79),yy=y/n/59;react(xx,yy,t,'motion');const vw=VIDEO.videoWidth||640,vh=VIDEO.videoHeight||480;if(POSE.width!==vw||POSE.height!==vh){POSE.width=vw;POSE.height=vh}PC.clearRect(0,0,vw,vh);PC.strokeStyle='#e4f1b8';PC.lineWidth=4;PC.beginPath();PC.arc(xx*vw,yy*vh,19,0,Math.PI*2);PC.stroke()}
    prev=g;
   }catch(e){}
   if(t-lastActivity>=5000&&state!=='rest'){setState('rest');if(!saidRest){saidRest=true;speech('Resting. The creek will wait.')}}
  }else if(!fallback){prev=null;eligibleSince=0}
  if(!fallback&&everFramed&&t-lastValid>1500&&state!=='framing'){wasFramed=false;goodSince=0;anchors.clear();smooth.clear();handSince=0;handArmed=false;frameKind='';frameParts=[false,false,false];setState('framing')}
  if(!fallback&&everFramed&&t-lastValid>3500&&!saidLost){saidLost=true;speech('Ask a helper to adjust the camera. Stay comfortable.')}
  motionRAF=requestAnimationFrame(loop);
 };
 cancelAnimationFrame(motionRAF);motionRAF=requestAnimationFrame(loop);
}
quickCamera=async function(){
 if(loading||stream)return;
 if(phase!=='free')welcome();
 silence();startSound();stopCamera();active=true;state='starting';paused=false;simpleRest=false;touchMode=false;bodyStarted=true;permissionError='';loading=true;modelReady=false;poseLoading=false;resetTracking();saidReady=saidRest=saidFallback=saidComplete=false;frameMode='pose';lastEvent=-1e9;const my=++serial,token=cameraToken;renderHUD();
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Open in Chrome or Safari.');
  const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24}}});
  if(my!==serial||token!==cameraToken){media.getTracks().forEach(t=>t.stop());return}
  stream=media;rear=(media.getVideoTracks()[0]?.getSettings?.().facingMode||facing)==='environment';
  restoreCamera();VIDEO.muted=true;VIDEO.srcObject=media;loading=false;cameraAt=lastActivity=performance.now();lastPoseAt=cameraAt;state='loading';renderHUD();
  for(const t of media.getVideoTracks())t.addEventListener('ended',()=>{if(my===serial){finish('disconnect')}});
  VIDEO.play().catch(()=>{if(my===serial){permissionError='Ask a helper to tap the camera preview.';by('hint').textContent=permissionError}});
  keepAwake();speech('Camera on. Ask a helper to frame your body.');
  dockMotion(token,my);poseLoading=true;
  prepareModel().then(m=>{if(my!==serial||token!==cameraToken||!stream)return;landmarker=m;modelReady=true;poseLoading=false;lastVideoTime=-1;lastInfer=0;lastGood=0;runPose(++runToken)}).catch(()=>{if(my!==serial)return;poseLoading=false;modelReady=false});
 }catch(e){
  if(my!==serial)return;active=false;stopCamera();loading=false;modelReady=false;state='error';permissionError=e?.name==='NotAllowedError'?'Allow the camera in browser settings, then ask a helper to try again.':'Open in Chrome or Safari. Ask a helper to check the camera.';renderHUD();
 }
};
by('act').onclick=()=>{if(active&&stream){finish('helper');return}if(state==='finished'||state==='error'){quickCamera();return}originalAct?.()};
const originalTouch=startTouchSimple;startTouchSimple=function(){if(active||state!=='idle'){active=false;++serial;state='idle';releaseWake();by('app').classList.remove('dock-active');by('dockFrame').hidden=true;silence()}originalTouch()};
const originalWelcome=welcome;welcome=function(){active=false;state='idle';++serial;releaseWake();by('app').classList.remove('dock-active');by('dockFrame').hidden=true;originalWelcome()};
document.addEventListener('visibilitychange',()=>{if(document.hidden){smooth.clear();anchors.clear();handSince=0;handArmed=false;handOutsideSince=0;silence()}else if(active&&stream)keepAwake()});
window.addEventListener('pagehide',()=>{silence();releaseWake()});
})();