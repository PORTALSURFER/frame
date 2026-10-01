// Reviewable redesign of Frame inside Frame. Interactions are prototype states.
(() => {
  window.addEventListener('DOMContentLoaded',()=>{
    if(!Frame.documents.has('sift-style-studies'))return;
    const d={version:1,id:'frame-workspace',name:'Frame · workspace redesign',revisionId:'frame-workspace-r1',width:1280,height:800,styleguideId:'technical-futurist',
      preview:{kind:'App redesign prototype',sample:'Sift r7 with illustrative feedback; controls do not operate the surrounding Frame app'},
      tokens:{colors:{background:'#090909',surface:'#120F0C',border:'#49372D',text:'#EEEAE5',muted:'#B5A797',accent:'#E47745'},typography:{family:'Menlo, "SFMono-Regular", Consolas, "Liberation Mono", monospace',size:12}},
      states:Object.fromEntries(['default','note','pan','interact','selected','selected2','resolved','empty','guide','project','export','review'].map(s=>[s,{}])),elements:[]};
    const add=(id,type,x,y,w,h,extra={})=>{const n={id,type,bounds:{x,y,width:w,height:h},...extra};d.elements.push(n);return n;};
    const box=(id,x,y,w,h,style={},points)=>add(id,'container',x,y,w,h,{style:{fill:'surface',stroke:'border',...style},...(points?{points}:{})});
    const text=(id,value,x,y,w,size=12,color='text')=>add(id,'text',x,y,w,size*1.45,{text:value,style:{fontSize:size,color}});
    const line=(id,x,y,w,h,color='border')=>add(id,'line',x,y,w,h,{style:{stroke:color}});
    const button=(id,label,x,y,w,state='default',extra={})=>add(id,'button',x,y,w,32,{text:label,label,action:{type:'set-state',state},style:{fill:'#17110D',stroke:'#624A3B',color:'text',fontSize:11,padding:8,textAlign:'center',verticalAlign:'middle',radius:1},...extra});
    const dropdown=(id,label,x,y,w,state)=>{const b=button(id,label,x,y,w,state);b.style.textAlign='left';b.style.padding=12;add(id+'-arrow','line',x+w-22,y+13,9,6,{points:[[0,0],[4.5,5],[9,0]],style:{stroke:'#B5A797'}});return b;};
    box('shell',1,1,1278,798,{fillTop:'#20140E',fillBottom:'#090A09',radius:1});
    box('identity',16,16,156,38,{fill:'#DCD6C9',stroke:'none'},[[0,0],[142,0],[156,14],[156,38],[0,38]]);
    text('app-name','FRAME',30,24,106,18,'#17110D');
    for(let i=0;i<3;i++)box('brand-bar-'+i,130+i*7,40,4,5,{fill:'#66574B',stroke:'none'},[[2,0],[4,0],[2,5],[0,5]]);
    dropdown('design-choice','Sift · style studies',196,20,240,'project');
    dropdown('revision-choice','Sift TF r7',452,20,176,'review');
    dropdown('guide-choice','Technical Futurist',644,20,224,'guide');button('view-guide','Guide',880,20,64,'guide');
    dropdown('project-menu','Project',1136,20,128,'project');
    line('header-edge',16,68,1248,0);
    text('viewport-label','VIEW',92,90,40,10,'muted');dropdown('viewport-choice','Design size',140,80,144,'review');
    text('state-label','STATE',308,90,44,10,'muted');dropdown('state-choice','Default',360,80,132,'review');
    button('zoom-out','−',624,80,32);text('zoom-value','100%',670,90,50,12,'muted');button('zoom-in','+',730,80,32);button('fit','Fit',774,80,52);
    button('check','Check',850,80,68,'review');button('png','PNG',930,80,72,'export');
    box('workspace',92,128,910,622,{fillTop:'#100E0C',fillBottom:'#090A09',stroke:'#3C3029'});
    // One purposeful miniature design, built from structured nodes rather than a bitmap.
    const sample=Frame.revisions.get('sift-style-studies','sift-technical-futurist-r7'),scale=.74;
    for(const source of FrameDocument.inspect(sample,{width:1140,height:505},'default')) {
      const n=FrameDocument.clone(source);n.id='sample-'+source.id;delete n.children;delete n.parentId;delete n.action;
      n.bounds={x:126+source.bounds.x*scale,y:248+source.bounds.y*scale,width:source.bounds.width*scale,height:source.bounds.height*scale};
      if(n.type==='button'||n.type==='input')n.disabled=true;
      if(n.points)n.points=n.points.map(([x,y])=>[x*scale,y*scale]);
      n.style={...n.style,fontSize:(n.style?.fontSize||sample.tokens.typography.size)*scale};
      for(const key of ['padding','radius','cutCorner','lineWidth'])if(typeof n.style[key]==='number')n.style[key]*=scale;
      d.elements.push(n);
    }
    const pen=button('tool-pen','Pen',16,144,60);pen.bounds.height=44;Object.assign(pen.style,{fill:'accent',stroke:'accent',color:'#130C09'});
    for(const [id,label,y,state] of [['note','Note',202,'note'],['pan','Pan',260,'pan'],['interact','Use',318,'interact'],['select','Select',376,'selected']]){const b=button('tool-'+id,label,16,y,60,state);b.bounds.height=44;}
    button('undo','Undo',16,454,60);button('redo','Redo',16,500,60);
    for(const state of ['note','pan','interact','selected','selected2']) {
      d.states[state]['tool-pen']={style:{fill:'#17110D',stroke:'#624A3B',color:'#EEEAE5'}};
      const id=state.startsWith('selected')?'select':state;d.states[state]['tool-'+id]={style:{fill:'#E47745',stroke:'#E47745',color:'#130C09'}};
    }
    box('feedback-panel',1018,128,246,622,{fillTop:'#1A120D',fillBottom:'#0C0C0A'});
    text('feedback-title','FEEDBACK',1034,148,140,12,'accent');text('mark-count','2 open',1188,148,64,11,'muted');
    dropdown('feedback-filter','All marks',1034,178,214,'project');
    function mark(id,num,y,body,state) {
      const b=button(id,'',1034,y,214,state);b.bounds.height=110;b.label='Feedback mark '+num;
      text(id+'-heading','MARK '+num,1048,y+15,120,11,'accent');text(id+'-status','OPEN',1192,y+15,44,10,'muted');
      text(id+'-body',body,1048,y+43,190,12);
    }
    mark('mark-1','1',228,'Keep the controls clear\nof the frame edges.','selected');
    mark('mark-2','2',352,'Keep the instrument\ncompact.','selected2');
    for(const [id,label,x,state] of [['resolve','Resolve',1034,'resolved'],['delete','Delete',1148,'empty']]) {
      const b=button(id,label,x,482,100,state);b.disabled=true;b.style.opacity=.45;
    }
    for(const state of ['selected','selected2']) {
      d.states[state][state==='selected'?'mark-1':'mark-2']={style:{stroke:'#E47745',fill:'#2B1C13'}};
      d.states[state].resolve={disabled:false,style:{opacity:1}};d.states[state].delete={disabled:false,style:{opacity:1}};
    }
    d.states.resolved['mark-1-status']={text:'DONE',style:{color:'#EEEAE5'}};d.states.resolved['mark-count']={text:'1 open'};
    button('feedback-import','Import',1034,658,100,'project');button('feedback-export','Export',1148,658,100,'export');button('feedback-clear','Clear',1034,706,214,'empty');
    for(const id of ['mark-1','mark-1-heading','mark-1-status','mark-1-body','mark-2','mark-2-heading','mark-2-status','mark-2-body'])d.states.empty[id]={visible:false};
    text('empty-message','No feedback yet',1048,250,190,12,'muted');
    for(const state of Object.keys(d.states))d.states[state]['empty-message']={visible:state==='empty'};
    d.states.empty['mark-count']={text:'0 open'};
    line('footer-edge',16,766,1248,0);text('tool-help','Pen · Shift for a straight line',92,781,460,11,'muted');text('dimensions','1140 × 505',896,781,110,11,'muted');text('storage','Saved locally',1126,781,138,11,'muted');
    d.states.note['tool-help']={text:'Note · click the canvas to place feedback'};d.states.pan['tool-help']={text:'Pan · drag to move the view'};d.states.interact['tool-help']={text:'Interact · use the design controls'};
    // A small selection marker shows the intended design/feedback relationship.
    add('sample-mark','line',880,258,66,44,{points:[[0,22],[8,4],[42,0],[65,12],[60,36],[20,43],[0,22]],style:{stroke:'#EF6559',lineWidth:2}});
    function overlay(state,title,content,actions) {
      const start=d.elements.length;
      box(state+'-scrim',92,128,1172,622,{fill:'#090909',stroke:'none',opacity:.82});
      box(state+'-dialog',294,210,640,348,{fillTop:'#28190F',fillBottom:'#100E0C',stroke:'#946444'},[[0,0],[616,0],[640,24],[640,348],[0,348]]);
      text(state+'-title',title,322,238,550,18,'accent');text(state+'-copy',content,322,282,560,13);
      actions.forEach((label,i)=>button(state+'-action-'+i,label,322+i*146,450,130));button(state+'-close','Close',788,510,116);
      for(const n of d.elements.slice(start))for(const s of Object.keys(d.states))d.states[s][n.id]={visible:s===state};
    }
    overlay('guide','TECHNICAL FUTURIST','Compact task layout. Warm tonal depth.\nPrecise silhouettes and restrained graphic detail.\n\nKeep controls, data and focus areas clear.\nEnrich existing space before adding another panel.',['Read guide','Copy prompt']);
    overlay('project','PROJECT','Keep project operations together.\nImport a project as a new design.\nExport bundles revisions, state, guide and feedback.',['Import project','Export project']);
    overlay('export','EXPORT','Choose the artifact to hand off.\nPNG exports the current design.\nProject retains its editable revision history.',['PNG','Project','Feedback']);
    overlay('review','REVIEW','Revision selection loads immediately.\nState and viewport controls stay beside the canvas.\nChecks report layout and contrast issues.',['Compare','Check design']);
    if(!Frame.registerDocument(d))return;
    const sync=()=>{if(document.getElementById('design-picker').value!==d.id)return;const picker=document.getElementById('styleguide-picker');if(picker.value!==d.styleguideId){picker.value=d.styleguideId;picker.dispatchEvent(new Event('change'));}};
    window.addEventListener('frame:design-selected',sync);sync();window.dispatchEvent(new Event('frame:designs-changed'));
  });
})();
