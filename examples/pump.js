// Pump composition study. Canvas controls are review artwork; use Frame's brush for feedback.
(() => {
  const C = {bg:'#171719',panel:'#212124',line:'#39393d',muted:'#96969f',text:'#f1efec',accent:'#ef897a',blue:'#8cb7c9'};
  function rect(c,x,y,w,h,r=8,fill=C.panel,stroke=C.line){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function text(c,t,x,y,size=12,color=C.text,weight=400){c.fillStyle=color;c.font=`${weight} ${size}px system-ui`;c.textBaseline='middle';c.fillText(t,x,y);}
  function pill(c,t,x,y,w,active=false){rect(c,x,y,w,26,5,active?'#47312f':C.panel,active?C.accent:C.line);text(c,t,x+10,y+13,10,active?C.accent:C.muted,600);}
  function knob(c,label,value,x,y,a=.7){text(c,label,x-25,y-39,10,C.muted,600);c.strokeStyle=C.line;c.lineWidth=4;c.beginPath();c.arc(x,y,20,.75*Math.PI,2.25*Math.PI);c.stroke();c.strokeStyle=C.accent;c.beginPath();c.arc(x,y,20,.75*Math.PI,(.75+1.5*a)*Math.PI);c.stroke();c.fillStyle='#29292e';c.beginPath();c.arc(x,y,15,0,Math.PI*2);c.fill();c.strokeStyle=C.text;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+12*Math.cos((.75+1.5*a)*Math.PI),y+12*Math.sin((.75+1.5*a)*Math.PI));c.stroke();text(c,value,x-24,y+36,12,C.text,600);}
  function slider(c,label,value,x,y,w,color){
    text(c,label,x,y-23,10,color,650);text(c,Math.round(value*100)+'%',x+w-32,y-23,11,C.text,650);
    rect(c,x,y-3,w,6,3,'#39393f',null);rect(c,x,y-3,w*value,6,3,color,null);
    rect(c,x+value*w-5,y-9,10,18,4,C.text,color);
    text(c,'0',x,y+19,8,C.muted);text(c,'100',x+w-17,y+19,8,C.muted);
  }
  const shapes=[["Sine", [[0.0, 1.0], [0.16, 0.82], [0.34, 0.36], [0.5, 0.0], [0.66, 0.36], [0.84, 0.82], [1.0, 1.0]], [-0.55, -0.1, 0.25, -0.25, 0.1, 0.55]], ["Soft", [[0.0, 1.0], [0.08, 0.12], [0.34, 0.58], [1.0, 1.0]], [-0.35, 0.42, -0.08]], ["Tight", [[0.0, 1.0], [0.035, 0.02], [0.15, 0.8], [1.0, 1.0]], [-0.58, 0.72, -0.04]], ["Long", [[0.0, 1.0], [0.05, 0.04], [0.46, 0.22], [1.0, 1.0]], [-0.48, 0.58, -0.02]], ["Snap", [[0.0, 1.0], [0.012, 0.22], [0.03, 0.0], [0.075, 0.94], [1.0, 1.0]], [-0.08, 0.02, 0.12, 0.0]], ["Punch", [[0.0, 1.0], [0.02, 0.06], [0.12, 0.44], [0.28, 0.18], [0.58, 0.9], [1.0, 1.0]], [-0.52, 0.3, -0.24, 0.22, -0.04]], ["Thump", [[0.0, 1.0], [0.03, 0.08], [0.18, 0.12], [0.42, 0.48], [0.72, 0.9], [1.0, 1.0]], [-0.35, 0.05, 0.12, 0.08, -0.02]], ["Double", [[0.0, 1.0], [0.04, 0.05], [0.18, 0.82], [0.34, 0.2], [0.56, 0.9], [1.0, 1.0]], [-0.48, 0.18, -0.28, 0.2, -0.05]]];
  function sample(shape,x){const nodes=shape[1], ts=shape[2];let i=0;while(i<nodes.length-2&&x>nodes[i+1][0])i++;const l=nodes[i],r=nodes[i+1];let t=Math.max(0,Math.min(1,(x-l[0])/(r[0]-l[0])));const tension=ts[i]||0; const power=1+Math.abs(tension)*3; t=tension>=0?Math.pow(t,power):1-Math.pow(1-t,power);return l[1]+(r[1]-l[1])*t;}
  function curve(c,shape,x,y,w,h){c.beginPath();for(let i=0;i<=w;i++){const yy=y+(1-sample(shape,i/w))*h;i?c.lineTo(x+i,yy):c.moveTo(x,yy);}c.stroke();}
  function crossover(c,x,y,w,h,hz=200,slope=24){
    const low=C.accent,high='#8caaeb';
    const px=x,py=y+12,pw=w,ph=h-24;
    const cutoff=Math.tan(Math.PI*hz/48000);
    const magnitude=(t,band)=>{const f=20*Math.pow(1000,t),r=Math.tan(Math.PI*f/48000)/cutoff,p=Math.pow(r,slope===12?2:4);return band?p/(1+p):1/(1+p);};
    for(let band=0;band<2;band++){
      c.beginPath();c.moveTo(px,py+ph);
      for(let i=0;i<=pw;i++)c.lineTo(px+i,py+(1-magnitude(i/pw,band))*ph);
      c.lineTo(px+pw,py+ph);c.closePath();c.fillStyle=band?'rgba(140,170,235,.08)':'rgba(239,137,122,.08)';c.fill();
      c.beginPath();for(let i=0;i<=pw;i++){const yy=py+(1-magnitude(i/pw,band))*ph;i?c.lineTo(px+i,yy):c.moveTo(px+i,yy);}c.strokeStyle=band?high:low;c.lineWidth=1.5;c.stroke();
    }
    const marker=px+Math.log(hz/20)/Math.log(1000)*pw;
    c.strokeStyle='#777780';c.lineWidth=1;c.beginPath();c.moveTo(marker,py);c.lineTo(marker,py+ph);c.stroke();
    text(c,'LP',x+10,y+30,9,low,650);text(c,'HP',x+w-25,y+30,9,high,650);text(c,'20 Hz',x+8,y+h-6,8,C.muted);text(c,hz+' Hz',Math.max(x+48,Math.min(x+w-90,marker+7)),y+h-6,9,C.text,600);text(c,'20 kHz',x+w-44,y+h-6,8,C.muted);
  }
  function shell(c,mode){c.fillStyle=C.bg;c.fillRect(0,0,760,620);text(c,'PUMP',24,30,25,C.text,750);text(c,'ENVELOPE SHAPER',120,33,10,C.muted,600);pill(c,'Init  ▾',393,18,140);pill(c,'A',547,18,35,true);pill(c,'B',586,18,35);pill(c,'A → B',629,18,68);pill(c,'●',705,18,31,true);text(c,'01  /  ENVELOPE',24,76,10,C.muted,600);pill(c,'SYNC',494,63,63,true);pill(c,'1/4  ▾',564,63,70);pill(c,'0 beats',642,63,94);
    rect(c,24,104,712,214,8,'#1b1b1e');const x=46,y=124,w=668,h=168;c.strokeStyle='#303035';c.lineWidth=1;for(let i=0;i<=8;i++){c.beginPath();c.moveTo(x+w*i/8,y);c.lineTo(x+w*i/8,y+h);c.stroke();}for(let i=0;i<=4;i++){c.beginPath();c.moveTo(x,y+h*i/4);c.lineTo(x+w,y+h*i/4);c.stroke();}crossover(c,x,y,w,h);c.strokeStyle=C.text;c.lineWidth=2.5;curve(c,shapes[1],x,y,w,h);for(const n of shapes[1][1]){c.fillStyle=C.bg;c.beginPath();c.arc(x+n[0]*w,y+(1-n[1])*h,4,0,Math.PI*2);c.fill();c.stroke();}text(c,'0',x,307,9,C.muted);text(c,'¼',x+w/4,307,9,C.muted);text(c,'½',x+w/2,307,9,C.muted);text(c,'¾',x+w*3/4,307,9,C.muted);text(c,'1',x+w-4,307,9,C.muted);
    shapes.forEach((s,i)=>{const sx=24+i*90;rect(c,sx,332,82,54,5,i===1?'#332625':C.panel,i===1?C.accent:C.line);c.strokeStyle=i===1?C.accent:C.muted;c.lineWidth=1.5;curve(c,s,sx+10,340,62,23);text(c,s[0],sx+10,375,9,i===1?C.accent:C.muted);});
    text(c,mode==='dual'?'02  /  DUAL BAND':'02  /  SPECTRAL DUCKING',24,412,10,C.muted,600);pill(c,'DUAL BAND',502,398,110,mode==='dual');pill(c,'SPECTRAL',621,398,115,mode==='spectral');
    text(c,'SHARED ENVELOPE',24,590,9,C.muted,600);text(c,'Depth 120 dB    •    Floor −∞    •    Mix 100%    •    Output 0 dB',195,590,10,C.muted);text(c,'UI COMPOSITION STUDY',24,610,8,C.muted);text(c,'Visual controls • annotate with the red brush',482,610,9,C.muted);
  }
  Frame.register({id:'pump',name:'Pump · Dual band',width:760,height:620,paint(c){shell(c,'dual');rect(c,24,434,712,133);text(c,'LOW',43,456,10,C.accent,700);text(c,'HIGH',633,456,10,'#8caaeb',700);text(c,'One crossover · minimum phase · zero latency',43,544,10,C.muted);pill(c,'SOLO',41,476,54);slider(c,'LP MIX',1,115,498,106,C.accent);knob(c,'CROSSOVER','200 Hz',296,498,.34);pill(c,'12',356,474,38);pill(c,'24 dB/oct',400,474,78,true);slider(c,'HP MIX',1,499,498,106,'#8caaeb');pill(c,'SOLO',633,476,54);}});
  Frame.register({id:'pump-spectral',name:'Pump · Spectral ducking',width:760,height:620,paint(c){shell(c,'spectral');rect(c,24,434,712,133);text(c,'EXTERNAL SIDECHAIN  •  24 BANDS',42,453,10,C.blue,650);const x=42,y=470,w=277,h=60;for(let i=0;i<24;i++){const v=.18+.78*Math.exp(-Math.pow((i-9)/3,2))+.3*Math.exp(-Math.pow((i-18)/2,2));rect(c,x+i*w/24,y+h-v*h,7,v*h,1,'#436574',null);c.fillStyle=C.accent;c.fillRect(x+i*w/24,y+h+3,7,Math.min(13,v*13));}text(c,'Illustrative spectrum',42,552,9,C.muted);knob(c,'DEPTH','12 dB',378,498,.4);knob(c,'ATTACK','10 ms',469,498,.25);knob(c,'RELEASE','150 ms',566,498,.4);pill(c,'VOLUME',631,466,83);pill(c,'DEPTH',631,501,83,true);}});
})();
