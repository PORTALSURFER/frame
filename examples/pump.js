// Pump composition study; Frame's brush is the interaction surface.
(() => {
  const C={bg:'#1b1e1e',panel:'#202323',line:'#3a3d3d',muted:'#999b9a',text:'#d8d7d3',accent:'#e95843',low:'#8fc5aa',blue:'#809ec6'};
  function rect(c,x,y,w,h,r=2,fill=C.panel,stroke=C.line){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function text(c,t,x,y,size=10,color=C.text,weight=400){c.fillStyle=color;c.font=`${weight} ${size}px ui-monospace, SFMono-Regular, monospace`;c.textBaseline='middle';c.fillText(t,x,y);}
  function button(c,t,x,y,w,active=false){rect(c,x,y,w,22,1,active?'#282725':C.panel);text(c,t,x+7,y+11,9,active?C.accent:C.text);}
  function knob(c,label,value,x,y,a=0){text(c,label,x-label.length*3,y-24,10);c.strokeStyle=C.line;c.lineWidth=1;c.beginPath();c.arc(x,y,16,.75*Math.PI,2.25*Math.PI);c.stroke();if(a>0){c.strokeStyle=C.accent;c.lineWidth=3;c.beginPath();c.arc(x,y,16,.75*Math.PI,(.75+1.5*a)*Math.PI);c.stroke();}text(c,value,x-value.length*2.5,y+23,8,C.muted);}
  function slider(c,label,value,x,y,w=282,a=0){text(c,label,x,y,9,C.muted);const tx=x+47,tw=w-80;rect(c,tx,y-2,tw,4,1,C.line,null);if(a>0)rect(c,tx,y-2,tw*a,4,1,C.accent,null);text(c,value,x+w-25,y,9,C.text);}
  function mixRow(c,label,x,y,value,color,tw=118){text(c,label,x,y,9,color,600);rect(c,x+23,y-2,tw,4,2,'#353838',null);if(value>0)rect(c,x+23,y-2,tw*value,4,2,color,null);text(c,Math.round(value*100)+'%',x+tw+31,y,8);rect(c,x+tw+65,y-6,30,12,1,C.panel);text(c,'SOLO',x+tw+68,y,6,C.muted);}
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
  function shell(c,mode){
    c.fillStyle=C.bg;c.fillRect(0,0,640,400);rect(c,1,1,638,398,5,C.bg,C.line);
    text(c,'PORTALSURFER /',10,20,10,C.muted);text(c,'PUMP',125,20,10,C.accent);c.save();c.textAlign='right';text(c,'0.2.8+preview',629,6,6,'#585c5b');c.restore();
    button(c,'SYNC',269,12,47);button(c,'Sync 1/4 ▾',322,12,96);button(c,'‹',430,12,27);button(c,'›',461,12,27);button(c,'A',500,12,28,true);button(c,'→',532,12,27);button(c,'B',564,12,28);button(c,'?',603,12,26);
    const x=50,y=50,w=534,h=182;rect(c,10,48,575,186,0,C.bg,C.line);
    c.strokeStyle='#333737';c.lineWidth=1;for(let i=0;i<=4;i++){c.beginPath();c.moveTo(x+w*i/4,y);c.lineTo(x+w*i/4,y+h);c.stroke();}for(const level of [0,.5,.75,1]){c.beginPath();c.moveTo(x,y+h*level);c.lineTo(x+w,y+h*level);c.stroke();}
    const gradient=c.createLinearGradient(0,y,0,y+h);gradient.addColorStop(0,'rgba(233,88,67,.30)');gradient.addColorStop(1,'rgba(233,88,67,.03)');c.beginPath();c.moveTo(x,y+h);for(let i=0;i<=w;i++)c.lineTo(x+i,y+(1-sample(shapes[1],i/w))*h);c.lineTo(x+w,y+h);c.closePath();c.fillStyle=gradient;c.fill();
    crossover(c,x,y,w,h);c.strokeStyle=C.accent;c.lineWidth=1.6;curve(c,shapes[1],x,y,w,h);for(const n of shapes[1][1])rect(c,x+n[0]*w-2,y+(1-n[1])*h-2,4,4,0,C.bg,C.accent);
    for(const [label,level] of [['0 dB',0],['−6 dB',.5],['−12 dB',.75],['−∞',1]])text(c,label,24,y+level*h+3,7,C.muted);
    text(c,'OFFSET',18,240,7,C.muted);rect(c,50,237,534,7,0,C.panel);c.fillStyle=C.accent;c.fillRect(50,237,6,7);
    text(c,'GR dB',596,54,7,C.muted);rect(c,596,62,26,170,0,'#303333',null);text(c,'0.0',600,240,7,C.muted);
    shapes.forEach((s,i)=>{const sx=10+i*78;rect(c,sx,250,74,32,2,i===1?'#272523':C.panel,i===1?'#715048':C.line);c.strokeStyle=i===1?C.accent:C.muted;c.lineWidth=1;curve(c,s,sx+7,257,60,18);});
    rect(c,10,288,620,34,1,C.bg,C.line);
    if(mode==='dual'){
      button(c,'24 dB/oct',15,294,90);
      slider(c,'SMOOTH','0%',115,298,212);slider(c,'SWING','0%',115,312,212);button(c,'SPECTRAL',544,294,80);
    }else{
      button(c,'SPECTRAL',15,294,66,true);button(c,'12 dB',87,294,55);button(c,'10 ms',148,294,55);button(c,'150 ms',209,294,55);button(c,'DEPTH',270,294,50,true);slider(c,'SMOOTH','0%',329,298,190);slider(c,'SWING','0%',329,312,190);button(c,'BACK',550,294,74);
      for(let i=0;i<24;i++){const v=.12+.7*Math.exp(-Math.pow((i-9)/3,2));c.fillStyle='#526576';c.fillRect(435+i*5.5,83+35*(1-v),3,35*v);}text(c,'EXT · ILLUSTRATIVE',435,125,6,C.muted);
    }
    for(const dx of [319,478]){c.strokeStyle=C.line;c.beginPath();c.moveTo(dx,332);c.lineTo(dx,375);c.stroke();}
    mixRow(c,'LP',22,341,1,C.low,177);mixRow(c,'HP',22,366,1,C.blue,177);knob(c,'MIX','100%',398,354,1);knob(c,'OUTPUT','+0.0 dB',554,354,.65);
    rect(c,10,383,59,12,0,C.panel);text(c,'SYNC',17,389,8,C.muted);rect(c,505,383,124,12,0,C.panel);text(c,'⏻  ACTIVE',531,389,8,C.muted);
  }
  Frame.register({id:'pump',name:'Pump · Dual band',width:640,height:400,paint(c){shell(c,'dual');}});
  Frame.register({id:'pump-spectral',name:'Pump · Spectral ducking',width:640,height:400,paint(c){shell(c,'spectral');}});
})();
