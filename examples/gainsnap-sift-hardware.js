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
    const sync=()=>{if(document.getElementById('design-picker').value!==d.id)return;const picker=document.getElementById('styleguide-picker');if(picker.value!==d.styleguideId){picker.value=d.styleguideId;picker.dispatchEvent(new Event('change'));}};
    window.addEventListener('frame:design-selected',sync);sync();window.dispatchEvent(new Event('frame:designs-changed'));
  });
})();
