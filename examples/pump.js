// Pump composition study; Frame's brush is the interaction surface.
(() => {
  const C={bg:'#0d0f10',panel:'#121516',line:'#262c2b',muted:'#868c8a',text:'#d5d8d6',accent:'#e86938',low:'#8fc5aa',blue:'#809ec6'};
  function rect(c,x,y,w,h,r=1,fill=C.panel,stroke=C.line){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function text(c,t,x,y,size=10,color=C.text,weight=400){c.fillStyle=color;c.font=`${weight} ${size}px ui-monospace, SFMono-Regular, monospace`;c.textBaseline='middle';c.fillText(t,x,y);}
  function alignedText(c,t,x,y,size=9,color=C.text,align='center',weight=400){c.save();c.textAlign=align;text(c,t,x,y,size,color,weight);c.restore();}
  function rail(c,x,y,w,color=C.line){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x,y+.5);c.lineTo(x+w,y+.5);c.stroke();}
  function button(c,t,x,y,w,active=false){if(active)rect(c,x,y,w,22,0,'#241a15',null);rail(c,x,y+22,w,active?C.accent:C.line);alignedText(c,t,x+w/2,y+11,9,active?C.accent:C.text);}
  function heading(c,label,x,y,w){text(c,label,x,y,9,C.muted);rail(c,x,y+10,w);}
  function knob(c,label,value,x,y,a=0){alignedText(c,label,x,y-24,9,C.muted);c.strokeStyle=C.line;c.lineWidth=1;c.beginPath();c.arc(x,y,17,.75*Math.PI,2.25*Math.PI);c.stroke();if(a>0){c.strokeStyle=C.accent;c.lineWidth=2.2;c.beginPath();c.arc(x,y,17,.75*Math.PI,(.75+1.5*a)*Math.PI);c.stroke();}alignedText(c,value,x,y+23,11,C.text);}
  function slider(c,label,value,x,y,w=282,a=0){text(c,label,x,y,9,C.muted);const tx=x+47,tw=w-84;rect(c,tx,y-1.5,tw,3,1,C.line,null);if(a>0)rect(c,tx,y-1.5,tw*a,3,1,C.accent,null);alignedText(c,value,x+w,y,9,C.text,'right');}
  function mixRow(c,label,x,y,value,color,tw=118){text(c,label,x,y,9,color,600);const bx=x+23,bw=tw+34;rect(c,bx,y-7,bw,14,0,'#1c2221',C.line);if(value>0){c.save();c.globalAlpha=90/255;rect(c,bx+1,y-6,(bw-2)*value,12,0,color,null);c.restore();}alignedText(c,Math.round(value*100)+'%',bx+bw/2,y,9,C.text);rect(c,x+tw+65,y-7,30,14,1,C.panel);alignedText(c,'SOLO',x+tw+80,y,7,C.muted);}
  const shapes=[["Sine", [[0.0, 1.0], [0.16, 0.82], [0.34, 0.36], [0.5, 0.0], [0.66, 0.36], [0.84, 0.82], [1.0, 1.0]], [-0.55, -0.1, 0.25, -0.25, 0.1, 0.55]], ["Soft", [[0.0, 1.0], [0.08, 0.12], [0.34, 0.58], [1.0, 1.0]], [-0.35, 0.42, -0.08]], ["Tight", [[0.0, 1.0], [0.035, 0.02], [0.15, 0.8], [1.0, 1.0]], [-0.58, 0.72, -0.04]], ["Long", [[0.0, 1.0], [0.05, 0.04], [0.46, 0.22], [1.0, 1.0]], [-0.48, 0.58, -0.02]], ["Snap", [[0.0, 1.0], [0.012, 0.22], [0.03, 0.0], [0.075, 0.94], [1.0, 1.0]], [-0.08, 0.02, 0.12, 0.0]], ["Punch", [[0.0, 1.0], [0.02, 0.06], [0.12, 0.44], [0.28, 0.18], [0.58, 0.9], [1.0, 1.0]], [-0.52, 0.3, -0.24, 0.22, -0.04]], ["Thump", [[0.0, 1.0], [0.03, 0.08], [0.18, 0.12], [0.42, 0.48], [0.72, 0.9], [1.0, 1.0]], [-0.35, 0.05, 0.12, 0.08, -0.02]], ["Double", [[0.0, 1.0], [0.04, 0.05], [0.18, 0.82], [0.34, 0.2], [0.56, 0.9], [1.0, 1.0]], [-0.48, 0.18, -0.28, 0.2, -0.05]]];
  function sample(shape,x){const n=shape[1],ts=shape[2];let i=0;while(i<n.length-2&&x>n[i+1][0])i++;const l=n[i],r=n[i+1];let t=Math.max(0,Math.min(1,(x-l[0])/(r[0]-l[0])));const tension=ts[i]||0,power=1+Math.abs(tension)*3;t=tension>=0?Math.pow(t,power):1-Math.pow(1-t,power);return l[1]+(r[1]-l[1])*t;}
  function curve(c,shape,x,y,w,h){c.beginPath();for(let i=0;i<=w;i++){const yy=y+(1-sample(shape,i/w))*h;i?c.lineTo(x+i,yy):c.moveTo(x,yy);}c.stroke();}
  function crossover(c,x,y,w,h){
    const py=y+10,ph=h-22,cutoff=Math.tan(Math.PI*200/48000);
    for(let band=0;band<2;band++){
      const points=[];for(let i=0;i<=w;i++){const f=20*Math.pow(1000,i/w),r=Math.tan(Math.PI*f/48000)/cutoff,p=Math.pow(r,4),gain=band?p/(1+p):1/(1+p);points.push([x+i,py+(1-gain)*ph]);}
      c.beginPath();c.moveTo(x,py+ph);for(const q of points)c.lineTo(...q);c.lineTo(x+w,py+ph);c.closePath();c.fillStyle=band?'rgba(128,158,198,.04)':'rgba(143,197,170,.04)';c.fill();
      c.beginPath();for(let i=0;i<points.length;i++)i?c.lineTo(...points[i]):c.moveTo(...points[i]);c.strokeStyle=band?'#6b819d':'#628976';c.lineWidth=1;c.stroke();
    }
    const marker=x+w/3;c.strokeStyle='#4a4f4e';c.beginPath();c.moveTo(marker,py);c.lineTo(marker,py+ph);c.stroke();text(c,'LP',x+7,y+25,7,C.low);text(c,'HP',x+w-18,y+25,7,C.blue);text(c,'200 Hz',marker+6,y+h-5,7,C.muted);
  }
  function shell(c){
    c.fillStyle=C.bg;c.fillRect(0,0,640,400);rect(c,.5,.5,639,399,1,C.bg,C.line);
    text(c,'PUMP',16,28,17,C.text);text(c,'PORTALSURFER',72,29,8,C.muted);alignedText(c,'0.2.8+preview',624,6,6,'#434a48','right');
    button(c,'SYNC',264,16,42);button(c,'1/4 ▾',314,16,78);button(c,'‹',404,16,24);button(c,'›',432,16,24);button(c,'A',472,16,28,true);button(c,'→',504,16,24);button(c,'B',532,16,28);button(c,'?',600,16,24);
    heading(c,'ENVELOPE',16,54,568);alignedText(c,'GR dB',612,54,7,C.muted);
    const x=48,y=72,w=536,h=166;
    c.strokeStyle='#1d2322';c.lineWidth=1;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(x+w*i/4,y);c.lineTo(x+w*i/4,y+h);c.stroke();}for(const level of [0,.5,.75,1])rail(c,x,y+h*level,w);
    c.beginPath();c.moveTo(x,y+h);for(let i=0;i<=w;i++)c.lineTo(x+i,y+(1-sample(shapes[1],i/w))*h);c.lineTo(x+w,y+h);c.closePath();c.fillStyle='rgba(232,105,56,.065)';c.fill();
    crossover(c,x,y,w,h);c.strokeStyle=C.accent;c.lineWidth=1.6;curve(c,shapes[1],x,y,w,h);for(const n of shapes[1][1])rect(c,x+n[0]*w-2,y+(1-n[1])*h-2,4,4,0,C.bg,C.accent);
    for(const [label,level] of [['0 dB',0],['−6',.5],['−12',.75],['−∞',1]])text(c,label,16,y+level*h,7,C.muted);
    text(c,'OFFSET',16,251,7,C.muted);rect(c,56,249,528,4,0,C.panel,null);rect(c,56,249,4,4,0,C.accent,null);
    rect(c,606,72,12,166,0,C.panel,null);for(let i=0;i<24;i++)rail(c,606,72+i*7,12,C.bg);alignedText(c,'0.0',612,251,8,C.text);
    shapes.forEach((s,i)=>{const sx=16+i*76.5;rail(c,sx,290,72.5,i===1?C.accent:C.line);if(i===1)rect(c,sx,264,72.5,26,0,'#1c1714',null);c.strokeStyle=i===1?C.accent:C.muted;c.lineWidth=1;curve(c,s,sx+7,268,58.5,17);});
    heading(c,'SHAPE',16,305,176);heading(c,'BANDS',208,305,176);heading(c,'LEVEL',400,305,224);
    slider(c,'SMOOTH','0%',16,333,176);slider(c,'SWING','0%',16,357,176);
    alignedText(c,'24 dB/oct',384,305,8,C.muted,'right');
    mixRow(c,'LP',208,333,1,C.low,46);mixRow(c,'HP',208,357,1,C.blue,46);
    knob(c,'MIX','100%',444,348,1);knob(c,'OUTPUT','+0.0 dB',560,348,.65);
    rail(c,16,380,608);text(c,'WAVEFORM',16,389,7,C.muted);text(c,'SYNC',80,389,8,C.text);rect(c,564,387,4,4,0,C.accent,null);alignedText(c,'ACTIVE',624,389,8,C.muted,'right');
  }
  Frame.register({id:'pump',name:'Pump · Dual band',width:640,height:400,paint(c){shell(c);}});
})();
