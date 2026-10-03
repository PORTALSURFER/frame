// Guide-led GainSnap study. Values and matching states are illustrative; no audio DSP.
(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const d={version:1,id:'gainsnap-sift-hardware',name:'GainSnap · Sift Hardware',revisionId:'gainsnap-sift-hardware-r1',width:200,height:424,styleguideId:'sift-hardware',
      preview:{kind:'GainSnap design study',source:'Sift Hardware written guide and GainSnap product controls',audio:'Illustrative meter values; no live signal or matching DSP'},
      tokens:{colors:{background:'#272B28',surface:'#1F2422',border:'#49534C',text:'#C8CDC9',muted:'#929B95',accent:'#E96B50',rms:'#7658AE'},typography:{family:'Menlo, "DejaVu Sans Mono", "Liberation Mono", monospace',size:10}},
      states:{default:{},listening:{},matched:{},manual:{},silence:{},peak:{},held:{},remeasuring:{}},elements:[]};
    const add=(id,type,x,y,w,h,extra={})=>{const n={id,type,bounds:{x,y,width:w,height:h},...extra};d.elements.push(n);return n;};
    const box=(id,x,y,w,h,style={},points)=>add(id,'container',x,y,w,h,{style:{fill:'surface',stroke:'border',...style},...(points?{points}:{})});
    const text=(id,value,x,y,w,size=10,color='text')=>add(id,'text',x,y,w,size*1.4,{text:value,style:{fontSize:size,color}});
    const line=(id,x,y,w,h,color='border',points)=>add(id,'line',x,y,w,h,{...(points?{points}:{}),style:{stroke:color}});
    const button=(id,label,x,y,w,h,state,style={})=>add(id,'button',x,y,w,h,{text:label,label,action:{type:'set-state',state},style:{fill:'#2A302C',stroke:'border',radius:3,cutCorner:7,color:'text',fontSize:10,padding:6,textAlign:'center',verticalAlign:'middle',...style}});
    const field=(id,label,value,x,y,w)=>add(id,'input',x,y,w,28,{label,value,style:{fillTop:'#222823',fillBottom:'#1B211D',fill:'surface',stroke:'#626F65',radius:2,color:'text',fontSize:12,padding:6,textAlign:'center',verticalAlign:'middle'}});
    box('shell',1,1,198,422,{fillTop:'#2C312C',fillBottom:'#242824',radius:9,stroke:'#667369'});
    box('inner-rim',4,4,192,416,{fill:'none',stroke:'#343D36',radius:7});
    // Eased shoulders stay in a quiet chassis margin, clear of all controls.
    box('top-insert',51,4,98,8,{fillTop:'#414B42',fillBottom:'#303831',stroke:'#424D44'},[[0,0],[98,0],[89,6],[84,8],[14,8],[9,6]]);
    box('bottom-insert',51,412,98,8,{fillTop:'#3B453C',fillBottom:'#2C342D',stroke:'#424D44'},[[0,8],[9,2],[14,0],[84,0],[89,2],[98,8]]);
    text('brand','PORTALSURFER',14,22,92,8,'muted');text('title','GAINSNAP',112,20,76,11,'accent');
    box('display',10,48,180,238,{fillTop:'#202622',fillBottom:'#1B201D',radius:3,stroke:'#4A554C'});
    text('gain-label','GAIN',22,59,70,10,'muted');
    box('knob-bed',22,80,72,72,{fillTop:'#161C18',fillBottom:'#252D26',stroke:'#4B594D',radius:36});
    box('knob-ring',27,85,62,62,{fillTop:'#4E5D51',fillBottom:'#303C32',stroke:'#6A7B6E',radius:31});
    box('knob-cap',35,93,46,46,{fillTop:'#343E36',fillBottom:'#222A24',stroke:'#1B231D',radius:23});
    line('knob-pointer',57,98,0,11,'#C8CDC9');
    const knob=button('gain-knob',' ',22,80,72,72,'manual',{fill:'none',stroke:'none',radius:36,cutCorner:0});knob.label='Preview manual gain control';
    field('gain-value','Gain in dB','0.0',22,162,72);text('gain-unit','dB',43,194,40,9,'muted');
    button('peak-readout','PK  −9.0',18,213,80,28,'peak',{fontSize:10,fill:'#232A25'});
    button('rms-readout','RMS −18.0',18,249,80,28,'default',{fontSize:10,fill:'#3B3649',stroke:'#8776AE'});
    text('output-label','OUT',113,59,44,10,'muted');
    box('meter-bed',120,80,25,164,{fill:'#141B16',stroke:'#3C493F',radius:2});
    box('peak-bar',124,105,7,135,{fill:'accent',stroke:'none'});
    box('rms-bar',134,129,7,111,{fill:'rms',stroke:'none'});
    for(let i=0;i<6;i++){const y=80+i*32;line('tick-'+i,149,y,6,0,'#67746B');text('scale-'+i,i===0?'0':String(-12*i),159,y-5,27,8,'muted');}
    line('target-rule',116,112,32,0,'#D6B0A3');
    box('target-arrow',109,108,6,8,{fill:'#D6B0A3',stroke:'none'},[[0,0],[6,4],[0,8]]);
    text('target-label','TARGET · dBFS',18,299,164,10,'muted');
    field('target-value','Target in dBFS','−12.0',18,319,84);
    button('match','MATCH',114,319,68,28,'listening',{fill:'#414E47',stroke:'#8D9F94',color:'#D6B0A3'});
    button('restart','RESTART',114,357,68,28,'listening',{fontSize:9});
    text('status','MANUAL',18,365,88,10,'muted');
    for(let i=0;i<3;i++)box('activity-'+i,18+i*57,397,50,4,{fill:'#38433B',stroke:'none',radius:1});
    // Product-specific colors retain separate Peak and RMS roles; no imported teal theme.
    d.states.peak['peak-readout']={style:{fill:'#47362E',stroke:'#BD8961'}};
    d.states.peak['rms-readout']={style:{fill:'#232A25',stroke:'#49534C'}};
    const off={style:{fill:'#2A302C',stroke:'#49534C',color:'#929B95'}};
    for(const state of ['default','manual','peak','silence']){d.states[state].match=off;d.states[state].restart={disabled:true};}
    for(const state of ['listening','matched']){d.states[state].match={style:{fill:'#414E47',stroke:'#8D9F94',color:'#D6B0A3'}};d.states[state]['activity-0']={style:{fill:'#BD8961'}};}
    d.states.listening.status={text:'LISTENING',style:{color:'#D6B0A3'}};
    d.states.listening['activity-1']={style:{fill:'#BD8961',opacity:.5}};
    d.states.matched.status={text:'MATCHED',style:{color:'#B5C7BB'}};
    d.states.matched['gain-value']={value:'+6.0'};
    d.states.matched['peak-readout']={text:'PK  −3.0'};d.states.matched['rms-readout']={text:'RMS −12.0'};
    box('peak-bar-matched',124,89,7,151,{fill:'accent',stroke:'none'});
    box('rms-bar-matched',134,113,7,127,{fill:'rms',stroke:'none'});
    line('knob-pointer-matched',68,103,6,7,'#C8CDC9');
    for(let i=0;i<3;i++)d.states.matched['activity-'+i]={style:{fill:'#8D9F94'}};
    // Disabling Match holds the settled value; Restart previews listening from it.
    d.states.held={...d.states.matched,match:off,restart:{disabled:true},status:{text:'MANUAL',style:{color:'#929B95'}}};
    d.states.remeasuring={...d.states.matched,status:{text:'LISTENING',style:{color:'#D6B0A3'}}};
    for(let i=0;i<3;i++){d.states.held['activity-'+i]={style:{fill:'#38433B'}};d.states.remeasuring['activity-'+i]={style:{fill:i===0?'#BD8961':'#38433B'}};}
    d.states.silence.status={text:'NO SIGNAL'};d.states.silence['peak-readout']={text:'PK  −∞'};d.states.silence['rms-readout']={text:'RMS −∞'};
    button('match-stop','MATCH',114,319,68,28,'manual',{fill:'#414E47',stroke:'#8D9F94',color:'#D6B0A3'});
    button('match-hold','MATCH',114,319,68,28,'held',{fill:'#414E47',stroke:'#8D9F94',color:'#D6B0A3'});
    button('restart-held','RESTART',114,357,68,28,'remeasuring',{fontSize:9});
    const visibleIn=(id,states)=>{for(const state of Object.keys(d.states))d.states[state][id]={...d.states[state][id],visible:states.includes(state)};};
    for(const id of ['peak-bar','rms-bar','knob-pointer'])visibleIn(id,['default','manual','peak','listening']);
    for(const id of ['peak-bar-matched','rms-bar-matched','knob-pointer-matched'])visibleIn(id,['matched','held','remeasuring']);
    visibleIn('match',['default','manual','peak','silence','held']);visibleIn('match-stop',['listening']);visibleIn('match-hold',['matched','remeasuring']);
    visibleIn('restart',['default','manual','peak','silence','listening','held']);visibleIn('restart-held',['matched','remeasuring']);
    for(const node of d.elements)node.style={...node.style,fontFamily:d.tokens.typography.family};
    if(!Frame.registerDocument(d))return;
    // Preserve the first study; this revision restores the product's meter-led layout.
    const revised=JSON.parse(JSON.stringify(d));
    revised.revisionId='gainsnap-sift-hardware-r2';
    const move=(id,x,y,width,height)=>Object.assign(revised.elements.find(n=>n.id===id).bounds,{x,y,width,height});
    move('top-insert',51,0,98,12);move('bottom-insert',51,412,98,12);
    revised.elements.find(n=>n.id==='top-insert').points=[[0,0],[98,0],[98,4],[89,10],[84,12],[14,12],[9,10],[0,4]];
    revised.elements.find(n=>n.id==='bottom-insert').points=[[0,12],[0,8],[9,2],[14,0],[84,0],[89,2],[98,8],[98,12]];
    move('display',10,44,180,310);
    move('output-label',20,48,50,14);
    move('meter-bed',36,66,25,280);
    move('peak-bar',40,108,7,234);move('rms-bar',50,150,7,192);
    move('peak-bar-matched',40,80,7,262);move('rms-bar-matched',50,122,7,220);
    for(let i=0;i<6;i++){const y=66+i*56;move('tick-'+i,70,y,5,0);move('scale-'+i,79,y-5,22,11.2);}
    move('target-rule',32,122,32,0);move('target-arrow',23,118,6,8);
    move('gain-label',128,161,50,14);
    move('knob-bed',128,182,48,48);move('knob-ring',132,186,40,40);move('knob-cap',138,192,28,28);
    for(const [id,radius] of [['knob-bed',24],['knob-ring',20],['knob-cap',14],['gain-knob',24]])revised.elements.find(n=>n.id===id).style.radius=radius;
    move('gain-knob',128,182,48,48);move('knob-pointer',152,196,0,8);move('knob-pointer-matched',159,199,4,5);
    move('gain-value',124,242,56,28);move('gain-unit',144,275,25,12.6);
    move('peak-readout',104,66,80,28);move('rms-readout',104,106,80,28);
    move('status',108,294,76,14);
    for(let i=0;i<3;i++)move('activity-'+i,108+i*26,315,20,4);
    move('target-label',16,357,80,11.2);revised.elements.find(n=>n.id==='target-label').style.fontSize=8;
    move('target-value',16,374,70,28);
    for(const id of ['match','match-stop','match-hold'])move(id,98,374,86,28);
    for(const id of ['restart','restart-held'])move(id,108,328,76,24);
    // The right-side gain handle is independent of the moving output bars.
    // Unity aligns to -12 dB; +6 dB maps to -10.5 dB, matching the native control.
    for(const [id,y,states] of [
      ['gain-arrow',118,['default','manual','peak','listening','silence']],
      ['gain-arrow-matched',111,['matched','held','remeasuring']]
    ]){
      revised.elements.push({id,type:'container',bounds:{x:64,y,width:6,height:8},points:[[6,0],[0,4],[6,8]],label:'Manual gain marker',style:{fill:'#C8CDC9',stroke:'none'}});
      for(const state of Object.keys(revised.states))revised.states[state][id]={visible:states.includes(state)};
    }
    revised.states.silence['knob-pointer']={visible:true};
    if(!Frame.revisions.list(d.id).some(r=>r.revisionId===revised.revisionId))Frame.agent.updateDocument(revised);
    const compact=JSON.parse(JSON.stringify(revised));
    compact.revisionId='gainsnap-sift-hardware-r3';
    const control=id=>compact.elements.find(n=>n.id===id);
    for(const id of ['match','match-stop','match-hold'])control(id).bounds.width=54;
    for(const id of ['restart','restart-held']){
      Object.assign(control(id),{text:' ',label:'Restart matching',bounds:{x:160,y:374,width:24,height:28}});
      Object.assign(control(id).style,{padding:0,cutCorner:5});
    }
    // A drawn restart glyph stays crisp independently of the platform font.
    const arc=Array.from({length:33},(_,i)=>{const a=-Math.PI/2+i*Math.PI*1.7/32;return [7+5*Math.cos(a),7+5*Math.sin(a)];});
    compact.elements.push({id:'restart-icon',type:'line',bounds:{x:165,y:381,width:14,height:14},points:arc,style:{stroke:'#C8CDC9',lineWidth:1.4}});
    compact.elements.push({id:'restart-icon-arrow',type:'line',bounds:{x:169,y:379,width:6,height:6},points:[[0,0],[3,2],[0,5]],style:{stroke:'#C8CDC9',lineWidth:1.4}});
    for(const state of Object.keys(compact.states))for(const id of ['restart-icon','restart-icon-arrow'])compact.states[state][id]={style:{opacity:['listening','matched','remeasuring'].includes(state)?1:.35}};
    for(let i=0;i<3;i++)Object.assign(control('activity-'+i).bounds,{x:18+i*57,y:408,width:50,height:2});
    // Reserve six units between the rail, controls and inward insert lip.
    Object.assign(control('bottom-insert'),{bounds:{x:51,y:416,width:98,height:8},points:[[0,8],[9,2],[14,0],[84,0],[89,2],[98,8]]});
    if(!Frame.revisions.list(d.id).some(r=>r.revisionId===compact.revisionId))Frame.agent.updateDocument(compact);
    const lowerGain=JSON.parse(JSON.stringify(compact));
    lowerGain.revisionId='gainsnap-sift-hardware-r4';
    const finalNode=id=>lowerGain.elements.find(n=>n.id===id);
    for(const id of ['knob-bed','knob-ring','knob-cap','gain-knob','knob-pointer','knob-pointer-matched'])finalNode(id).bounds.y+=84;
    finalNode('gain-value').bounds.y=338;
    Object.assign(finalNode('gain-label'),{text:'GAIN · dB',bounds:{x:116,y:257,width:68,height:14}});
    finalNode('gain-label').style.fontSize=9;
    finalNode('gain-unit').visible=false;
    Object.assign(finalNode('output-label').bounds,{x:36,width:25});
    finalNode('output-label').style.textAlign='center';
    finalNode('status').bounds.y=150;
    for(const state of ['default','manual','peak','held'])lowerGain.states[state].status={...lowerGain.states[state].status,visible:false};
    for(const id of ['brand','title']){
      finalNode(id).style.fontSize=9;
      finalNode(id).bounds.y=24;finalNode(id).bounds.height=12.6;
    }
    Object.assign(finalNode('brand').bounds,{x:14,width:70});
    Object.assign(finalNode('title').bounds,{x:102,width:82});
    lowerGain.elements.push({id:'brand-slash',type:'text',bounds:{x:87,y:24,width:8,height:12.6},text:'/',style:{fontFamily:d.tokens.typography.family,fontSize:9,color:'muted'}});
    // Product version verified against GainSnap's Cargo package, not an invented build ID.
    lowerGain.elements.push({id:'version',type:'text',bounds:{x:156,y:5,width:32,height:8.4},text:'v0.1.3',style:{fontFamily:d.tokens.typography.family,fontSize:6,color:'muted',textAlign:'right'}});
    // Scale labels sit outside both handles, with protected horizontal clearance.
    for(const id of ['meter-bed','peak-bar','rms-bar','peak-bar-matched','rms-bar-matched','target-rule','target-arrow','gain-arrow','gain-arrow-matched','output-label'])finalNode(id).bounds.x+=14;
    for(let i=0;i<6;i++){
      Object.assign(finalNode('scale-'+i).bounds,{x:10,width:21});
      finalNode('scale-'+i).style.textAlign='right';
      Object.assign(finalNode('tick-'+i).bounds,{x:32,width:3});
    }
    Object.assign(finalNode('target-value').bounds,{x:34,width:56,height:24});
    Object.assign(finalNode('gain-value').bounds,{x:128,y:322,width:48,height:24});
    for(const id of ['target-value','gain-value'])Object.assign(finalNode(id).style,{fontSize:11,padding:4});
    for(const id of ['target-label','gain-label','gain-unit'])finalNode(id).visible=false;
    if(!Frame.revisions.list(d.id).some(r=>r.revisionId===lowerGain.revisionId))Frame.agent.updateDocument(lowerGain);
    const polished=JSON.parse(JSON.stringify(lowerGain));
    polished.revisionId='gainsnap-sift-hardware-r5';
    const finish=id=>polished.elements.find(n=>n.id===id);
    // Center the identity by its visible lettering, not its oversized text bounds.
    finish('brand').bounds.x=34;finish('brand-slash').bounds.x=107;
    Object.assign(finish('title').bounds,{x:122,width:64});
    finish('display').bounds.height=322;
    finish('meter-bed').bounds.height=292;
    for(let i=0;i<6;i++){
      const y=66+i*58.4;
      finish('tick-'+i).bounds.y=y;finish('scale-'+i).bounds.y=y-5;
      finish('tick-'+i).style.stroke='#59675D';
    }
    for(const [id,db] of [['peak-bar',-9],['rms-bar',-18],['peak-bar-matched',-3],['rms-bar-matched',-12]]){
      const y=66-db/60*292;
      Object.assign(finish(id).bounds,{y,height:354-y});
    }
    finish('target-rule').bounds.y=124.4;finish('target-arrow').bounds.y=120.4;
    finish('gain-arrow').bounds.y=120.4;finish('gain-arrow-matched').bounds.y=113.1;
    // A shared axis unifies readouts, state information, knob and numeric gain.
    for(const [id,y] of [['peak-readout',66],['rms-readout',102]]){
      Object.assign(finish(id).bounds,{x:108,y,width:72,height:24});
      Object.assign(finish(id).style,{fontSize:9,cutCorner:4,radius:2,padding:4});
    }
    finish('peak-readout').style.fill='#222923';
    Object.assign(finish('rms-readout').style,{fill:'#332F3F',stroke:'#6D6188'});
    polished.states.peak['peak-readout']={style:{fill:'#3B302A',stroke:'#967258'}};
    Object.assign(finish('status').bounds,{x:108,y:138,width:72,height:13});
    Object.assign(finish('status').style,{fontSize:9,textAlign:'center'});
    Object.assign(finish('knob-bed').bounds,{x:122,y:282,width:44,height:44});finish('knob-bed').style.radius=22;
    Object.assign(finish('knob-ring').bounds,{x:126,y:286,width:36,height:36});finish('knob-ring').style.radius=18;
    Object.assign(finish('knob-cap').bounds,{x:132,y:292,width:24,height:24});finish('knob-cap').style.radius=12;
    Object.assign(finish('gain-knob').bounds,{x:122,y:282,width:44,height:44});finish('gain-knob').style.radius=22;
    Object.assign(finish('knob-pointer').bounds,{x:144,y:295,width:0,height:7});
    Object.assign(finish('knob-pointer-matched').bounds,{x:150,y:298,width:4,height:4});
    Object.assign(finish('gain-value').bounds,{x:120,y:334});
    for(const id of ['target-value','gain-value'])finish(id).style.stroke='#55645A';
    for(const id of ['match','match-stop','match-hold'])finish(id).style.cutCorner=5;
    if(!Frame.revisions.list(d.id).some(r=>r.revisionId===polished.revisionId))Frame.agent.updateDocument(polished);
    const sync=()=>{if(document.getElementById('design-picker').value!==d.id)return;const picker=document.getElementById('styleguide-picker');if(picker.value!==d.styleguideId){picker.value=d.styleguideId;picker.dispatchEvent(new Event('change'));}};
    window.addEventListener('frame:design-selected',sync);sync();window.dispatchEvent(new Event('frame:designs-changed'));
  });
})();
