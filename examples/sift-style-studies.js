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
  // R3/R4 are new snapshots; the first guide experiment remains immutable.
  function refinedTools(d) {
    const p=primitives(d);
    const polygon=(id,x,y,w,h,points,fill,stroke='none')=>p.box(id,x,y,w,h,{fill,stroke},{points});
    const circle=(id,x,y,r,fill,stroke='none')=>p.box(id,x-r,y-r,r*2,r*2,{fill,stroke,radius:r});
    function control(id,label,x,y,w,kind,state='default',height=31) {
      const node=p.button(id,'',x,y,w,state,{fill:'#272D29',radius:3,cutCorner:8});
      node.label=label;node.bounds.height=height;
      const cx=x+w/2,cy=y+height/2;
      const stroke='#A4ADA7';
      const path=(suffix,points,width=1.7)=>p.add(id+'-'+suffix,'line',x,y,w,height,{points,style:{stroke,lineWidth:width}});
      if(kind==='play')polygon(id+'-glyph',cx-5,cy-7,13,14,[[0,0],[12,7],[0,14]],'#D5D8D6');
      else if(kind==='loop') {
        path('ring',Array.from({length:25},(_,i)=>{const a=.5+i/24*5.1;return [w/2+7*Math.cos(a),height/2+7*Math.sin(a)];}),2);
        polygon(id+'-tip',cx+1,cy-9,7,8,[[0,0],[7,2],[0,8]],stroke);
      } else if(kind==='level')for(const [i,h] of [[0,8],[1,17],[2,12]])p.line(id+'-bar-'+i,cx-7+i*7,cy-h/2,0,h,stroke).style.lineWidth=2.3;
      else if(kind==='export') {path('arrow',[[10,21],[22,9],[12,9],[22,9],[22,19]],2);}
      else if(kind==='settings') {
        circle(id+'-ring',cx,cy,5,'none',stroke);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p.add(id+'-tooth-'+i,'line',cx-9,cy-9,18,18,{points:[[9+6*Math.cos(a),9+6*Math.sin(a)],[9+9*Math.cos(a),9+9*Math.sin(a)]],style:{stroke,lineWidth:1.7}});}
      } else if(kind==='help') {
        path('question',[[w/2-4,10],[w/2-4,8],[w/2+2,8],[w/2+4,11],[w/2+3,14],[w/2,16],[w/2,20]],1.8);circle(id+'-dot',cx,cy+9,1,stroke);
      } else if(kind==='capture') {
        for(let row=0;row<3;row++)for(let col=0;col<2;col++)p.box(id+'-grid-'+row+'-'+col,x+7+col*4,y+8+row*5,2,2,{fill:stroke,stroke:'none'});
        path('arrow',[[16,15],[26,15],[21,10],[26,15],[21,20]],1.8);
      }
      return node;
    }
    function textControl(id,label,x,y,w,state='default',accent=false) {
      const node=p.button(id,label,x,y,w,state,{fill:'#272D29',color:accent?'accent':'muted',fontSize:11,padding:3});node.bounds.height=31;return node;
    }
    function dropdown(id,label,x,y,w) {
      const node=textControl(id,label,x,y,w);node.style.textAlign='left';node.style.padding=11;
      p.add(id+'-chevron','line',x+w-20,y+13,9,6,{points:[[0,0],[4.5,5],[9,0]],style:{stroke:'#929B95',lineWidth:1.5}});return node;
    }
    function arm(x,y,technical=false) {
      const node=p.button('arm','ARM',x,y,84,'recording',{fillTop:'#46564D',fillBottom:'#39473F',fill:'#414E47',stroke:'#8D9F94',color:technical?'#E96B50':'#D6B0A3',fontSize:13,padding:2});
      node.bounds.height=38;node.style.textAlign='right';node.style.padding=18;
      circle('arm-circle',x+26,y+19,4.4,'none',technical?'#E96B50':'#D6B0A3');
      d.states.recording.arm={disabled:true};
      d.states.recording['arm-circle']={style:{fill:'#E96B50',stroke:'#E96B50'}};
    }
    // Procedural preview material, not audio measurements or image-extracted traces.
    const onsets=[.006,.267,.538,.813];
    function energy(t,channel,side) {
      let value=0;
      const strength=channel?[.83,.46,.94,.26]:[.89,.97,.59,.41];
      for(let k=0;k<onsets.length;k++) {
        const dt=t-onsets[k];if(dt<0)continue;
        const decay=[.042,.031,.049,.034][k]*(channel&&k===2?1.2:1);
        const body=Math.exp(-dt/decay)*(1+.17*Math.sin(dt*110+k));
        const n=Math.sin(t*12973+channel*643+side*937+k*311)*43758.5453;
        const rough=.66+.26*(n-Math.floor(n))+.08*Math.sin(t*777+side);
        value+=strength[k]*body*rough*(side?.91:1);
      }
      return Math.min(.95,value);
    }
    function signal(prefix,x,y,w,h,outer,inner,overview=false) {
      const channels=overview?1:2;
      for(let channel=0;channel<channels;channel++) {
        const center=(channel+.5)*h/channels,scale=h/channels*.48;
        const band=(suffix,color,narrow)=>{
          const points=[];
          const amp=(t,side)=>overview?Math.max(energy(t,0,side),energy(t,1,side))*.72:energy(t,channel,side);
          for(let i=0;i<=900;i++)points.push([i*w/900,center-amp(i/900,0)*scale*(narrow?.27:1)]);
          for(let i=900;i>=0;i--)points.push([i*w/900,center+amp(i/900,1)*scale*(narrow?.27:1)]);
          const node=polygon(prefix+(narrow?'-inner':'')+'-'+channel,x,y,w,h,points,color);
          d.states.idle[node.id]={visible:false};
        };
        band('',outer,false);if(inner)band('inner',inner,true);
      }
    }
    function waveform(x,y,w,h,technical=false) {
      p.box('display',x,y,w,h,{fillTop:'#202522',fillBottom:'#1D221F',fill:'#1F2422',radius:3,stroke:'#49534C'});
      // Neutral baseline and timing are supporting marks, never polygon outlines.
      for(let i=0;i<2;i++)p.line('baseline-'+i,x+1,y+3+(i+.5)*(h-13)/2,w-2,0,technical?'#52443D':'#423849');
      for(let i=1;i<9;i++){const grid=p.line('grid-'+i,x+i*w/9,y+1,0,h-2,'#41453D');d.states.idle[grid.id]={visible:false};}
      signal('wave',x+1,y+3,w-2,h-13,technical?'#995D4E':'#7658AE', '#E96B50');
      for(const [i,t] of onsets.entries()){const node=polygon('onset-'+i,x+t*w,y+1,5,5,[[0,0],[5,0],[2.5,5]],'#BD8961');d.states.idle[node.id]={visible:false};}
      const cursor=p.line('cursor',x+w*.347,y+1,0,h-2,'#8A928C');d.states.idle.cursor={visible:false};
      p.text('time-start','0.00s',x+9,y+h-20,68,10,'muted');p.text('time-end','2.40s',x+w-46,y+h-20,45,10,'muted');
      d.states.idle['time-end']={text:'0.00s'};
      if(!technical) {
        for(let row=0;row<10;row++)for(let col=0;col<38;col++) {
          const variation=(1+Math.sin(col*.45+row*.64))/2,diameter=.7+variation*3.1;
          const dot=p.box('dot-'+row+'-'+col,x+16+col*29,y+22+row*29,diameter,diameter,{fill:'#414A44',stroke:'none',radius:diameter/2,opacity:.08+variation*.58});
          d.states.default[dot.id]={visible:false};d.states.recording[dot.id]={visible:false};
        }
      }
      const backing=p.box('idle-backing',x+13,y+33,235,19,{fill:'#1B201D',stroke:'none'});
      d.states.default[backing.id]={visible:false};d.states.recording[backing.id]={visible:false};
      const hint=p.text('idle-message','ARM TO RECORD · OR DROP AUDIO',x+16,y+37,380,11,'muted');
      d.states.default[hint.id]={visible:false};d.states.recording[hint.id]={visible:false};
      for(let i=0;i<2;i++)d.states.idle['baseline-'+i]={visible:false};
    }
    function overview(x,y,w,h,technical=false) {
      p.box('overview',x,y,w,h,{fill:'#1F2422',stroke:'#49534C'});
      signal('overview-wave',x+1,y+2,w-2,h-4,technical?'#805346':'#7658AE',technical?null:'#E96B50',true);
      const cursor=p.line('overview-cursor',x+w*.347,y+1,0,h-2,'#8A928C');d.states.idle[cursor.id]={visible:false};
      const rail=p.box('viewport-rail',x+w*.22,y+h-3,w*.61,2,{fill:'#858D86',stroke:'none'});d.states.idle[rail.id]={visible:false};
      const topRail=p.box('main-viewport-rail',x+w*.22,377,w*.61,2,{fill:'#858D86',stroke:'none'});d.states.idle[topRail.id]={visible:false};
    }
    function shell(hardware) {
      p.box('enclosure',1,1,1138,503,{fill:'#272B28',stroke:'#111512',radius:10});
      p.box('inner-rim',2,2,1136,501,{fill:'none',stroke:'#49514B',radius:9});
      if(hardware) {
        // Ease shoulders with multiple closely spaced points; retain shallow depth.
        const top=[[0,0],[748,0],[712,14],[703,17],[689,19],[60,19],[46,17],[37,14]];
        p.box('top-metal',196,2,748,19,{fillTop:'#303831',fillBottom:'#3B443C',stroke:'#424C44'},{points:top});
        p.line('top-lip',255,21,630,0,'#465049');
        p.box('bottom-metal',138,485,786,19,{fillTop:'#3A433C',fillBottom:'#303831',stroke:'#424C44'},
          {points:[[0,19],[19,3],[26,1],[37,0],[749,0],[760,1],[767,3],[786,19]]});
        p.line('bottom-lip',176,485,710,0,'#454F47');
        p.line('glint-left',151,489,6,8,'#4A554D');p.add('glint-right','line',899,489,6,8,{points:[[6,0],[0,8]],style:{stroke:'#4A554D'}});
      } else {
        // Quiet edge recesses, mirrored and in contact with the intact perimeter.
        p.box('left-recess',3,214,7,77,{fill:'#1B211D',stroke:'none'},{points:[[0,0],[7,7],[7,70],[0,77]]});
        p.box('right-recess',1130,214,7,77,{fill:'#1B211D',stroke:'none'},{points:[[7,0],[0,7],[0,70],[7,77]]});
        p.line('chassis-lip',240,4,660,0,'#3C463F');
      }
      p.text('brand','PORTALSURFER',32,46,140,15,'#C8CDC9');p.text('brand-separator','/',168,46,20,15,'muted');p.text('name','SIFT',194,46,72,15,'accent');
    }
    return {...p,polygon,circle,control,textControl,dropdown,arm,waveform,overview,shell};
  }
  function technicalRefined() {
    const d=build('technical-futurist','sift-technical-futurist-r3',1140,505),p=refinedTools(d);
    d.preview={source:'Procedural synthetic signal',guideRevision:'refined-2026-10-01'};
    p.shell(false);
    p.dropdown('takes','TAKES',881,29,84);p.control('export','Export take',975,29,30,'export');p.control('settings','Settings',1015,29,30,'settings');p.control('help','Help',1055,29,30,'help');
    p.waveform(18,78,1104,302,true);p.overview(18,396,1104,37,true);
    p.arm(29,452,true);p.control('play','Play',128,456,30,'play');p.control('loop','Loop',168,456,30,'loop');
    p.textControl('sync','SYNC',894,456,52,'default',true);p.line('timing-divider',958,458,0,27,'#49534C');
    p.textControl('snap','SNAP',970,456,51,'default',true);p.dropdown('division','1/16',1034,456,62);
    d.states.idle.sync={style:{color:'#929B95'}};d.states.idle.snap={style:{color:'#929B95'}};
    return d;
  }
  function hardwareRefined() {
    const d=build('sift-hardware','sift-hardware-r4',1140,505),p=refinedTools(d);
    d.preview={source:'Procedural synthetic signal',guideRevision:'refined-2026-10-01'};
    p.shell(true);
    p.control('capture','Capture actions',882,29,30,'capture');p.dropdown('takes','TAKES',920,29,72);
    p.control('export','Export take',1000,29,30,'export');p.control('settings','Settings',1038,29,30,'settings');p.control('help','Help',1076,29,30,'help');
    p.waveform(18,73,1104,307);p.overview(18,395,1104,38);
    p.arm(29,452);p.control('level','Level view',850,456,30,'level');p.control('play','Play',888,456,30,'play');p.control('loop','Loop',926,456,30,'loop');
    p.textControl('sync','SYNC',964,456,48,'default',true);p.line('timing-divider',1020,458,0,27,'#49534C');
    p.textControl('snap','SNAP',1028,456,48,'default',true);p.dropdown('division','1/16',1084,456,40);
    // Fraction fits the compact field; chevron sits beside it rather than over the digits.
    const division=d.elements.find(n=>n.id==='division');division.text='1/16';division.style.fontSize=10;division.style.padding=3;
    d.elements.find(n=>n.id==='division-chevron').bounds.x=1113;
    return d;
  }
  function hardwareClearance() {
    const d=hardwareRefined();d.revisionId='sift-hardware-r5';
    d.preview.guideRevision='clearance-2026-10-01';
    const node=id=>d.elements.find(n=>n.id===id);
    // Keep the archived r4 immutable. Move each control and its vector parts together.
    function move(id,x,y,w,height) {
      const button=node(id),old={...button.bounds},dx=x-old.x,dy=y-old.y;
      for(const part of d.elements.filter(n=>n.id.startsWith(id+'-'))) {
        part.bounds.x+=dx+(w-old.width)/2;part.bounds.y+=dy+(height-old.height)/2;
      }
      Object.assign(button.bounds,{x,y,width:w,height});
      if(node(id+'-chevron'))Object.assign(node(id+'-chevron').bounds,{x:x+w-18,y:y+13});
    }
    move('capture',850,31,32,32);move('takes',894,31,84,32);
    move('export',990,31,32,32);move('settings',1034,31,32,32);move('help',1078,31,32,32);
    move('arm',29,448,84,38);
    move('level',790,450,32,32);move('play',834,450,32,32);move('loop',878,450,32,32);
    move('sync',922,450,52,32);move('snap',998,450,48,32);move('division',1058,450,64,32);
    Object.assign(node('division').style,{fontSize:11,padding:10});
    Object.assign(node('timing-divider').bounds,{x:986,y:452,height:28});
    // Insets occupy the quiet chassis, with space around their lips and shoulders.
    const top=node('top-metal');top.points=top.points.map(([x,y])=>[x*630/748,y*16/19]);Object.assign(top.bounds,{width:630,height:16});
    Object.assign(node('top-lip').bounds,{x:246,y:18,width:530});
    const bottom=node('bottom-metal');bottom.points=bottom.points.map(([x,y])=>[x*620/786,y*16/19]);Object.assign(bottom.bounds,{y:488,width:620,height:16});
    Object.assign(node('bottom-lip').bounds,{x:168,y:488,width:560});
    Object.assign(node('glint-left').bounds,{x:149,y:492,height:7});
    Object.assign(node('glint-right').bounds,{x:738,y:492,height:7});
    node('glint-left').points=[[0,0],[6,7]];node('glint-right').points=[[6,0],[0,7]];
    return d;
  }
  function technicalReference() {
    const d=build('technical-futurist','sift-technical-futurist-r6',1140,505),p=refinedTools(d);
    d.preview={source:'Procedural synthetic signal',guideRevision:'black-field-references-2026-10-01'};
    d.tokens.colors={background:'#090909',surface:'#0E0F10',border:'#3F3731',text:'#EEEAE5',muted:'#ADA49B',accent:'#E47745'};
    p.box('enclosure',1,1,1138,503,{fill:'#090909',stroke:'#3F3731',radius:1});
    p.text('brand','PORTALSURFER',32,38,140,14,'text');p.text('brand-separator','/',168,38,20,14,'muted');p.text('name','SIFT',194,38,72,14,'accent');
    p.dropdown('takes','TAKES',881,28,84);p.control('export','Export take',977,28,32,'export');p.control('settings','Settings',1021,28,32,'settings');p.control('help','Help',1065,28,32,'help');
    p.waveform(18,78,1104,302,true);p.overview(18,396,1104,37,true);
    p.arm(29,448,true);p.control('play','Play',128,451,32,'play');p.control('loop','Loop',172,451,32,'loop');
    p.textControl('sync','SYNC',894,451,52,'default',true);p.line('timing-divider',958,453,0,27,'#3F3731');
    p.textControl('snap','SNAP',970,451,51,'default',true);p.dropdown('division','1/16',1034,451,64);
    const replacements={'#49534C':'#3F3731','#A4ADA7':'#ADA49B','#929B95':'#ADA49B','#D5D8D6':'#EEEAE5','#8A928C':'#C4B5A7','#BD8961':'#E47745','#41453D':'#25211E','#52443D':'#302821','#858D86':'#8D7E72','#995D4E':'#71432E','#805346':'#71432E','#E96B50':'#E47745','#1B201D':'#090909'};
    for(const n of d.elements) {
      if(n.style)for(const key of ['fill','stroke','color'])if(replacements[n.style[key]])n.style[key]=replacements[n.style[key]];
      if(n.type==='button')Object.assign(n.style,{fill:'#0E0F10',stroke:'#3F3731',radius:1,cutCorner:0,lineWidth:1});
      if(['display','overview'].includes(n.id)) {
        delete n.style.fillTop;delete n.style.fillBottom;Object.assign(n.style,{fill:'#0E0F10',stroke:'#3F3731',radius:0,lineWidth:1});
      }
    }
    const arm=d.elements.find(n=>n.id==='arm');delete arm.style.fillTop;delete arm.style.fillBottom;
    Object.assign(arm.style,{fill:'#E47745',stroke:'#E47745',color:'#090909'});
    Object.assign(d.elements.find(n=>n.id==='arm-circle').style,{stroke:'#090909'});
    d.states.recording.arm={disabled:true,style:{fill:'#FF495E',stroke:'#FF495E',color:'#090909'}};
    d.states.recording['arm-circle']={style:{fill:'#090909',stroke:'#090909'}};
    d.states.idle.sync={style:{color:'#ADA49B'}};d.states.idle.snap={style:{color:'#ADA49B'}};
    return d;
  }

  function technicalExpressive() {
    const d=technicalReference();d.revisionId='sift-technical-futurist-r7';
    d.preview.guideRevision='expressive-panels-2026-10-01';
    const find=id=>d.elements.find(n=>n.id===id);
    Object.assign(find('enclosure').style,{fillTop:'#21130E',fillBottom:'#090909',stroke:'#574137'});
    Object.assign(find('display').style,{fillTop:'#17120F',fillBottom:'#090A0A',stroke:'#594236'});
    Object.assign(find('overview').style,{fillTop:'#1C1510',fillBottom:'#0C0D0C',stroke:'#594236'});
    const panel=(id,x,y,w,h,points,style)=>({id,type:'container',bounds:{x,y,width:w,height:h},points,style:{stroke:'#594236',lineWidth:1,...style}});
    const plates=[
      panel('identity-plate',18,20,276,44,[[0,0],[256,0],[276,20],[276,44],[12,44],[0,32]],{fill:'#DDD8CD',stroke:'#DDD8CD'}),
      panel('utility-bed',853,19,269,48,[[14,0],[269,0],[269,34],[255,48],[0,48],[0,14]],{fillTop:'#251910',fillBottom:'#100E0C'}),
      panel('capture-bed',18,440,222,55,[[0,0],[208,0],[222,14],[222,55],[0,55]],{fillTop:'#251910',fillBottom:'#100E0C'}),
      panel('timing-bed',876,440,246,55,[[14,0],[246,0],[246,55],[0,55],[0,14]],{fillTop:'#251910',fillBottom:'#100E0C'})
    ];
    d.elements.splice(1,0,...plates);
    find('brand').style.color='#17120F';find('brand-separator').style.color='#65564A';find('name').style.color='#A34D27';
    for(const n of d.elements.filter(n=>n.type==='button'&&n.id!=='arm'))Object.assign(n.style,{fillTop:'#211710',fillBottom:'#100F0D',stroke:'#675044'});
    const p=primitives(d);
    // Graphic registration details belong to frame/identity regions, never control hit areas.
    for(const [id,x,y,points] of [
      ['display-register-left',18,78,[[0,16],[0,0],[24,0]]],
      ['display-register-right',1098,356,[[24,0],[24,24],[0,24]]],
      ['overview-register',18,396,[[0,12],[0,0],[24,0]]]
    ])p.add(id,'line',x,y,24,24,{points,style:{stroke:'#B86B46',lineWidth:1.6}});
    for(let i=0;i<3;i++)p.box('identity-stripe-'+i,249+i*9,47,6,8,{fill:'#65564A',stroke:'none'},{points:[[3,0],[6,0],[3,8],[0,8]]});
    // Keep functional timing grids sparse rather than multiplying visual treatments.
    d.elements=d.elements.filter(n=>!['grid-1','grid-3','grid-5','grid-7'].includes(n.id));
    for(const state of Object.values(d.states))for(const id of ['grid-1','grid-3','grid-5','grid-7'])delete state[id];
    return d;
  }

  window.addEventListener('DOMContentLoaded',()=>{
    if(!Frame.registerDocument(technical()))return;
    let added=false;
    for(const create of [hardware,technicalRefined,hardwareRefined,hardwareClearance,technicalReference,technicalExpressive]) {
      const document=create();
      if(!Frame.revisions.list(id).some(r=>r.revisionId===document.revisionId)) {
        Frame.agent.updateDocument(document);added=true;
      }
    }
    if(added)Frame.revisions.restore(id,'sift-technical-futurist-r7');
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
