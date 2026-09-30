// A serializable, responsive instrument panel with real prototype controls.
(() => {
  const C=Frame.components;
  Frame.registerDocument({
    version:1,id:"instrument",name:"Instrument workstation",revisionId:"instrument-r1",width:1000,height:700,
    tokens:{colors:{accent:"#E86938"},typography:{family:"monospace",size:14}},
    states:{
      default:{},
      loading:{status:{text:"PROCESSING · CHANNEL 04"},run:{disabled:true,text:"PROCESSING"}},
      empty:{status:{text:"NO INPUT SIGNAL"},trace:{visible:false}},
      error:{status:{text:"SIGNAL LOSS · CHECK INPUT",style:{color:"#E34B56"}}},
      hover:{run:{style:{stroke:"accent"}}},
      focus:{run:{style:{stroke:"#EDF767"}}},
      disabled:{run:{disabled:true,style:{opacity:0.4}}}
    },
    elements:[
      C.text("title",{x:24,y:24,width:500,height:40},{responsive:{width:"90%"},text:"SIGNAL / ANALYSIS",style:{fontSize:24}}),
      C.text("status",{x:24,y:64,width:600,height:24},{responsive:{width:"90%"},text:"READY · CHANNEL 04",style:{color:"muted",fontSize:12}}),
      C.container("telemetry",{x:24,y:120,width:220,height:520},{style:{stroke:"border"},breakpoints:[{maxWidth:900,bounds:{width:"90%",height:190}}]}),
      C.text("input-label",{x:16,y:16,width:180,height:20},{parentId:"telemetry",text:"INPUT FREQUENCY",style:{fontSize:12,color:"muted"}}),
      C.input("frequency",{x:16,y:48,width:184,height:40},{parentId:"telemetry",label:"Input frequency in Hz",value:"440",style:{color:"text"}}),
      C.text("level-label",{x:16,y:112,width:184,height:20},{parentId:"telemetry",text:"SIGNAL LEVEL",style:{fontSize:12,color:"muted"}}),
      C.text("level",{x:16,y:144,width:184,height:40},{parentId:"telemetry",text:"04.81 dB",style:{fontSize:28,color:"accent"}}),
      C.container("signal",{x:276,y:120,width:700,height:380},{responsive:{width:"70%"},breakpoints:[{maxWidth:900,bounds:{x:24,y:334,width:"90%",height:190}}],style:{stroke:"border"}}),
      C.text("trace-label",{x:16,y:16,width:230,height:20},{parentId:"signal",text:"INPUT SIGNAL / 004",style:{color:"muted",fontSize:12}}),
      C.chart("trace",{x:16,y:80,width:650,height:190},{parentId:"signal",style:{stroke:"accent"},points:Array.from({length:120},(_,i)=>[i*5,80+Math.sin(i*0.3)*45]),breakpoints:[{maxWidth:900,bounds:{y:70,height:110,width:250}}]}),
      C.button("run",{x:276,y:540,width:208,height:40},{text:"RUN ANALYSIS",label:"Run analysis",style:{fill:"accent",color:"background",stroke:"accent"},action:{type:"set-state",state:"loading"},breakpoints:[{maxWidth:900,bounds:{x:24,y:558,width:208}}]}),
      C.button("reset",{x:500,y:540,width:140,height:40},{text:"RESET",label:"Reset analysis",action:{type:"set-state",state:"default"},breakpoints:[{maxWidth:900,bounds:{x:24,y:614,width:140}}]})
    ]
  });
})();
