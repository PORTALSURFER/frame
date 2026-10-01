// Two independent compositions from written guides; no screenshot-derived traces or assets.
(() => {
  const id = 'sift-style-studies';
  const revisions = ['sift-technical-futurist-r1', 'sift-hardware-r2'];
  const mono = 'Menlo, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  // Synthetic preview signal, shared only to make the style comparison meaningful.
  function amplitude(t, channel) {
    let envelope = 0;
    for (const [onset, strength] of [[.04,.75],[.22,.48],[.37,.9],[.56,.42],[.73,.66],[.88,.32]]) {
      if (t >= onset) envelope += strength * Math.exp(-(t-onset)*38);
    }
    return Math.min(1, envelope * (.68 + .22*Math.sin(t*981+channel*3) + .10*Math.sin(t*2137)));
  }
  function build(guide, revisionId, width, height) {
    return {version:1,id,name:'Sift · style studies',revisionId,width,height,styleguideId:guide,
      tokens:{colors:{background:'#272B28',surface:'#1F2422',border:'#49534C',text:'#D5D8D6',muted:'#A2ABA4',accent:'#E96B50'},typography:{family:mono,size:12}},
      states:{default:{},idle:{},recording:{}},elements:[]};
  }
  function primitives(doc) {
    const e=doc.elements;
    const add=(id,type,x,y,width,height,extra={})=>{const node={id,type,bounds:{x,y,width,height},...extra};e.push(node);return node;};
    const box=(id,x,y,w,h,style={},extra={})=>add(id,'container',x,y,w,h,{style:{fill:'surface',stroke:'border',...style},...extra});
    const text=(id,value,x,y,w,size=12,color='text')=>add(id,'text',x,y,w,size*1.5,{text:value,style:{fontSize:size,color}});
    const line=(id,x,y,w,h,color='border')=>add(id,'line',x,y,w,h,{style:{stroke:color}});
    const button=(id,value,x,y,w,state,style={})=>add(id,'button',x,y,w,34,{text:value,label:value,style:{fill:'#303732',stroke:'border',color:'text',radius:3,cutCorner:8,textAlign:'center',verticalAlign:'middle',padding:6,...style},action:{type:'set-state',state}});
    function waves(prefix,x,y,w,h,color,inner=false,filled=false) {
      for(let channel=0;channel<2;channel++) {
        const center=(channel+.5)*h/2,scale=h*.22*(inner?.34:1),points=[];
        for(let i=0;i<=480;i++)points.push([i*w/480,center-amplitude(i/480,channel)*scale]);
        if(filled)for(let i=480;i>=0;i--)points.push([i*w/480,center+amplitude(i/480,channel)*scale]);
        const node=add(prefix+'-'+channel,filled?'container':'chart',x,y,w,h,{points,style:{fill:filled?color:'none',stroke:color,lineWidth:inner?1:1.1}});
        doc.states.idle[node.id]={visible:false};
      }
    }
    function idleMessage(x,y,w) {
      const node=text('idle-message','ARM TO RECORD · OR DROP AUDIO',x,y,w,13,'muted');
      doc.states.default[node.id]={visible:false};doc.states.recording[node.id]={visible:false};
      doc.states.idle[node.id]={visible:true};
    }
    return {box,text,line,button,waves,idleMessage,add};
  }
  // Technical Futurist: a fresh 70/30 instrumentation layout, coral traces and a take rail.
  function technical() {
    const d=build('technical-futurist',revisions[0],1200,600),p=primitives(d);
    p.text('brand','PORTALSURFER /',24,28,175,17,'muted');p.text('name','SIFT',208,28,100,17,'accent');
    p.text('study','TECHNICAL FUTURIST / DESIGN STUDY',24,62,470,10,'muted');
    p.button('takes','TAKES',956,24,88,'default');p.button('idle','IDLE',1056,24,64,'idle');p.button('help','?',1132,24,44,'default');
    p.line('header-rule',24,91,1152,0);
    p.text('display-title','CAPTURE',24,110,120,11,'muted');p.text('demo','SYNTHETIC SIGNAL · STYLE PREVIEW',444,110,370,10,'muted');
    p.box('display',24,139,806,288,{radius:2});
    for(let i=1;i<8;i++)p.line('grid-'+i,24+i*100.75,139,0,288,'#363F39');
    p.line('center-0',40,211,774,0,'#3C453F');p.line('center-1',40,355,774,0,'#3C453F');
    p.waves('wave',40,152,774,262,'#E96B50');
    p.text('left-label','L',34,146,20,9,'muted');p.text('right-label','R',34,290,20,9,'muted');
    p.line('cursor',407,139,0,288,'#D5D8D6');
    p.idleMessage(235,267,470);
    p.text('time-start','0.00s',24,438,85,10,'muted');p.text('time-end','2.40s',766,438,64,10,'muted');
    p.box('overview',24,469,806,45,{fill:'#242B26',stroke:'border'});p.waves('overview-wave',34,472,786,38,'#A2ABA4');
    p.text('rail-title','TAKE / 01',864,110,220,11,'muted');
    p.line('rail-edge',849,109,0,405);
    p.box('selected-take',864,139,312,64,{fill:'#303732',stroke:'#E96B50',cutCorner:10,radius:2});
    p.text('take-name','Preview take',880,151,240,14);p.text('take-caption','SYNTHETIC · 2.40s',880,179,240,10,'muted');
    p.text('take-note','Capture, select, export.',864,230,280,12,'muted');
    p.line('rail-divider',864,273,312,0);
    p.text('timing','TIMING',864,294,180,10,'muted');
    p.button('sync','SYNC',864,321,94,'default',{color:'accent'});p.button('snap','SNAP',970,321,94,'default',{color:'accent'});
    p.text('division-label','DIVISION',864,381,130,10,'muted');
    p.add('division','input',990,369,186,34,{label:'Grid division',value:'1/16',style:{fill:'#1F2422',stroke:'border',fontSize:12,padding:9}});
    p.button('export','EXPORT',864,453,312,'default',{fill:'#272B28'});
    p.line('footer-rule',24,533,1152,0);
    p.button('arm','ARM',24,549,122,'recording',{fill:'#414E47',stroke:'#8D9F94',color:'accent'});
    p.button('play','PLAY',158,549,82,'default');p.button('loop','LOOP',252,549,82,'default');
    p.text('status','READY',384,560,390,11,'muted');
    p.text('footer-caption','R1 · INSTRUMENTATION',954,560,222,10,'muted');
    d.states.idle.status={text:'AWAITING AUDIO'};d.states.recording.status={text:'RECORDING PROTOTYPE',style:{color:'#E96B50'}};
    return d;
  }
  // Sift Hardware is composed independently from the prose guide, not from R1.
  function hardware() {
    const d=build('sift-hardware',revisions[1],1200,534),p=primitives(d);
    p.box('top-insert',205,0,790,19,{fillTop:'#343C36',fillBottom:'#3C453E',stroke:'#424C45'},
      {points:[[0,0],[790,0],[754,19],[38,19]]});
    p.box('bottom-insert',205,518,790,16,{fillTop:'#3C453E',fillBottom:'#343C36',stroke:'#424C45'},
      {points:[[30,0],[760,0],[790,16],[0,16]]});
    p.text('brand','PORTALSURFER /',22,38,178,16,'muted');p.text('name','SIFT',203,38,80,16,'accent');
    p.button('takes','TAKES',927,30,98,'default');p.button('idle','IDLE',1035,30,68,'idle');p.button('help','?',1113,30,64,'default');
    p.box('display',20,81,1160,306,{radius:3});
    for(let i=1;i<9;i++)p.line('grid-'+i,20+i*145,82,0,304,'#49483F');
    p.waves('wave',32,92,1136,278,'#7658AE',false,true);p.waves('inner-wave',32,92,1136,278,'#E96B50',true,true);
    p.line('cursor',511,82,0,304,'#9BA39D');
    for(const [i,t] of [.04,.22,.37,.56,.73,.88].entries())p.box('onset-'+i,32+t*1136,82,6,5,{fill:'#BD8961',stroke:'none'},{points:[[0,0],[6,0],[3,5]]});
    // Idle texture is its own low-contrast layer, hidden outside idle mode.
    for(let row=0;row<7;row++)for(let column=0;column<31;column++) {
      const dot=p.box('dot-'+row+'-'+column,38+column*37,104+row*39,2,2,{fill:'#3C4540',stroke:'none',radius:1});
      d.states.default[dot.id]={visible:false};d.states.recording[dot.id]={visible:false};d.states.idle[dot.id]={visible:true};
    }
    p.idleMessage(44,119,560);
    p.text('time-start','0.00s',32,365,70,10,'muted');p.text('time-end','2.40s',1104,365,70,10,'muted');
    p.box('overview',20,403,1160,39);p.waves('overview-wave',32,407,1136,30,'#7658AE',false,true);p.waves('overview-inner',32,407,1136,30,'#E96B50',true,true);
    p.button('arm','○ ARM',28,467,106,'recording',{fill:'#414E47',stroke:'#8D9F94',color:'#D6B0A3'});
    p.text('status','SYNTHETIC SIGNAL · STYLE PREVIEW',163,479,470,10,'muted');
    p.button('play','▶',801,467,38,'default');p.button('loop','↻',849,467,38,'default');
    p.button('sync','SYNC',899,467,74,'default',{color:'accent'});p.line('timing-divider',986,470,0,28);
    p.button('snap','SNAP',1000,467,73,'default',{color:'accent'});
    p.add('division','input',1085,467,93,34,{label:'Grid division',value:'1/16',style:{fill:'#2A302C',stroke:'border',radius:3,cutCorner:8,padding:10}});
    d.states.idle['time-end']={text:'0.00s'};d.states.idle.sync={style:{color:'#929B95'}};d.states.idle.snap={style:{color:'#929B95'}};
    for(const node of d.elements.filter(n=>n.id==='cursor'||n.id.startsWith('grid-')||n.id.startsWith('onset-')))d.states.idle[node.id]={visible:false};
    d.states.idle.status={text:'READY TO CAPTURE'};d.states.recording.status={text:'RECORDING PROTOTYPE',style:{color:'#E96B50'}};
    return d;
  }
  window.addEventListener('DOMContentLoaded',()=>{
    if(!Frame.registerDocument(technical()))return;
    if(!Frame.revisions.list(id).some(r=>r.revisionId===revisions[1])) {
      Frame.agent.updateDocument(hardware());
      Frame.revisions.restore(id,revisions[0]);
    }
    function syncGuide() {
      if(document.getElementById('design-picker').value!==id)return;
      const guideId=Frame.agent.getDocument(id).styleguideId,picker=document.getElementById('styleguide-picker');
      if(picker.value!==guideId){picker.value=guideId;picker.dispatchEvent(new Event('change'));}
    }
    window.addEventListener('frame:design-selected',syncGuide);
    window.addEventListener('frame:design-updated',syncGuide);
    syncGuide();
    window.dispatchEvent(new Event('frame:designs-changed'));
  });
})();
