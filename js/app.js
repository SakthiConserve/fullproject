// ─── FULLSCREEN WEBGL SHADER BACKGROUND ───
(function(){
  const canvas = document.getElementById('bg-canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if(!gl) return;

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const vsSrc = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos,0.,1.); }
  `;
  const fsSrc = `
    precision mediump float;
    uniform float u_time;
    uniform vec2  u_res;
    uniform vec2  u_mouse;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }

    float fbm(vec2 p){
      float v=0.,a=.5;
      for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.1+vec2(1.7,9.2); a*=.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy/u_res;
      vec2 uv2 = uv * 2. - 1.;
      uv2.x *= u_res.x/u_res.y;

      float t = u_time * 0.12;
      vec2 mouse = u_mouse / u_res;

      // Animated blobs
      vec2 b1 = vec2(cos(t*.7)*.55+.5, sin(t*.5)*.35+.5);
      vec2 b2 = vec2(sin(t*.4+1.2)*.45+.5, cos(t*.6+.8)*.4+.55);
      vec2 b3 = vec2(cos(t*.3+2.1)*.4+.45, sin(t*.8+.4)*.3+.45);
      vec2 b4 = mouse + vec2(0.,.1);

      float d1 = 1.-smoothstep(0.,.6,length(uv-b1)*1.6);
      float d2 = 1.-smoothstep(0.,.55,length(uv-b2)*1.7);
      float d3 = 1.-smoothstep(0.,.5,length(uv-b3)*1.8);
      float d4 = 1.-smoothstep(0.,.3,length(uv-b4)*3.5);

      float blobs = (d1+d2+d3)*0.28 + d4*0.18;

      // FBM distortion
      float f = fbm(uv*2.5 + vec2(t*.4, t*.3));
      blobs += f * 0.08;

      // Red glow colour
      vec3 col = vec3(0.);
      col += vec3(.92,.21,.27) * blobs * .55;          // #eb3644
      col += vec3(.6,.04,.09) * pow(blobs,.6) * .22;

      // Subtle scan-lines
      float scan = sin(gl_FragCoord.y * 3.14 / 2.) * .5 + .5;
      col *= 1. - scan * 0.015;

      // Vignette
      float vg = 1. - dot(uv2*.55, uv2*.55);
      col *= clamp(vg,0.,1.);

      col = clamp(col,0.,1.);
      gl_FragColor = vec4(col, 1.);
    }
  `;

  function compile(type,src){
    const s=gl.createShader(type);
    gl.shaderSource(s,src); gl.compileShader(s); return s;
  }
  const prog=gl.createProgram();
  gl.attachShader(prog,compile(gl.VERTEX_SHADER,vsSrc));
  gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,fsSrc));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  const uTime=gl.getUniformLocation(prog,'u_time');
  const uRes=gl.getUniformLocation(prog,'u_res');
  const uMouse=gl.getUniformLocation(prog,'u_mouse');
  let mx=window.innerWidth*.5, my=window.innerHeight*.5;
  document.addEventListener('mousemove',e=>{ mx=e.clientX; my=e.clientY; });

  let start=performance.now();
  function frame(){
    const t=(performance.now()-start)/1000;
    gl.uniform1f(uTime,t);
    gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.uniform2f(uMouse,mx,my);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    requestAnimationFrame(frame);
  }
  frame();
})();

// ─── BIM GRID (Three.js on hero background) ───
(function(){
  const el = document.createElement('canvas');
  el.id='hero3d';
  el.style.cssText='position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.18';
  document.body.insertBefore(el, document.body.firstChild);

  const renderer = new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,.1,100);
  camera.position.z = 4.5;

  function resize(){
    renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize',resize);

  const cols=36, rows=18;
  const pts=[];
  for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
    pts.push((i/cols-.5)*14,(j/rows-.5)*7,0);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  const dotMat=new THREE.PointsMaterial({color:0xeb3644,size:.025,transparent:true,opacity:.5});
  const dots=new THREE.Points(geo,dotMat);
  scene.add(dots);

  const linePts=[];
  for(let i=0;i<cols-1;i++) for(let j=0;j<rows;j++){
    linePts.push((i/cols-.5)*14,(j/rows-.5)*7,0,((i+1)/cols-.5)*14,(j/rows-.5)*7,0);
  }
  for(let i=0;i<cols;i++) for(let j=0;j<rows-1;j++){
    linePts.push((i/cols-.5)*14,(j/rows-.5)*7,0,(i/cols-.5)*14,((j+1)/rows-.5)*7,0);
  }
  const lGeo=new THREE.BufferGeometry();
  lGeo.setAttribute('position',new THREE.Float32BufferAttribute(linePts,3));
  const lines=new THREE.LineSegments(lGeo,new THREE.LineBasicMaterial({color:0xeb3644,transparent:true,opacity:.04}));
  scene.add(lines);

  let mousePX=0,mousePY=0;
  document.addEventListener('mousemove',e=>{
    mousePX=(e.clientX/window.innerWidth-.5)*.12;
    mousePY=-(e.clientY/window.innerHeight-.5)*.08;
  });

  let t=0;
  function animate(){
    requestAnimationFrame(animate);
    t+=.003;
    dots.rotation.x = Math.sin(t*.25)*.04 + mousePY;
    dots.rotation.y = t*.035 + mousePX;
    lines.rotation.x = dots.rotation.x;
    lines.rotation.y = dots.rotation.y;
    renderer.render(scene,camera);
  }
  animate();
})();

// ─── CUSTOM CURSOR ───
(function(){
  const cur=document.getElementById('cursor');
  const ring=document.getElementById('cursor-ring');
  const glow=document.getElementById('cursor-glow');
  if(!cur) return;
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{
    mx=e.clientX; my=e.clientY;
    cur.style.left=mx+'px'; cur.style.top=my+'px';
    glow.style.left=mx+'px'; glow.style.top=my+'px';
  });
  function animRing(){
    rx+=(mx-rx)*0.11; ry+=(my-ry)*0.11;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  }
  animRing();
})();

// ─── TILT CARD ───
(function(){
  const wrap=document.getElementById('tiltCard');
  if(!wrap) return;
  const card=wrap.querySelector('.hero-card');
  wrap.addEventListener('mousemove',e=>{
    const r=wrap.getBoundingClientRect();
    const x=((e.clientX-r.left)/r.width-.5)*16;
    const y=-((e.clientY-r.top)/r.height-.5)*16;
    card.style.transform=`rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
  });
  wrap.addEventListener('mouseleave',()=>{
    card.style.transform='rotateY(0deg) rotateX(0deg) scale(1)';
  });
})();

// ─── COUNTDOWN (June 14, 2026 9:00 AM) ───
(function(){
  const target=new Date('2026-06-14T09:00:00');
  const els={d:document.getElementById('cd-d'),h:document.getElementById('cd-h'),m:document.getElementById('cd-m'),s:document.getElementById('cd-s')};
  const prev={d:'',h:'',m:'',s:''};
  function tick(){
    const diff=Math.max(0,target-new Date());
    const d=Math.floor(diff/86400000);
    const h=Math.floor(diff%86400000/3600000);
    const m=Math.floor(diff%3600000/60000);
    const s=Math.floor(diff%60000/1000);
    const p=n=>String(n).padStart(2,'0');
    [['d',d],['h',h],['m',m],['s',s]].forEach(([k,v])=>{
      const str=p(v);
      if(str!==prev[k]){
        prev[k]=str;
        els[k].textContent=str;
        els[k].style.transform='scale(1.08)';
        setTimeout(()=>{ els[k].style.transform='scale(1)'; },100);
      }
    });
  }
  tick(); setInterval(tick,1000);
})();

// ─── SCROLL REVEAL ───
(function(){
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:.08});
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>obs.observe(el));
})();

// ─── FAQ ACCORDION ───
document.querySelectorAll('.faq-q').forEach(q=>{
  q.addEventListener('click',()=>{
    const item=q.closest('.faq-item');
    const ans=item.querySelector('.faq-a');
    const isOpen=item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i=>{
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight='0';
    });
    if(!isOpen){
      item.classList.add('open');
      ans.style.maxHeight=ans.scrollHeight+'px';
    }
  });
});

// ─── MAGNETIC BUTTONS ───
document.querySelectorAll('.btn-primary,.btn-outline,.nav-reg').forEach(btn=>{
  btn.addEventListener('mousemove',e=>{
    const r=btn.getBoundingClientRect();
    const x=(e.clientX-r.left-r.width/2)*.22;
    const y=(e.clientY-r.top-r.height/2)*.22;
    btn.style.transform=`translate(${x}px,${y}px) translateY(-3px)`;
  });
  btn.addEventListener('mouseleave',()=>{ btn.style.transform=''; });
});

// ─── GSAP HERO ENTRANCE ───
if(typeof gsap!=='undefined'){
  gsap.registerPlugin(ScrollTrigger);
  const tl=gsap.timeline({defaults:{ease:'power3.out'}});
  tl.from('.hero-eyebrow',{y:18,opacity:0,duration:.7})
    .from('h1.hero-h1',{y:38,opacity:0,duration:.85},.15)
    .from('.hero-sub',{y:18,opacity:0,duration:.65},.32)
    .from('.hero-meta',{y:16,opacity:0,duration:.55},.46)
    .from('.hero-btns',{y:16,opacity:0,duration:.55},.58)
    .from('.hero-card-wrap',{x:36,opacity:0,duration:.9},.28);

  // Parallax on scroll
  gsap.to('.hero-left',{
    y:-60,
    scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}
  });
}