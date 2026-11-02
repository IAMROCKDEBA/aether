"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

// Domain-warped fbm "aether" clouds. Colours blend between the light
// (Cloud Dancer / champagne / pearl) and dark (obsidian / ember / ink-blue) palettes.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uDark;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  mat2 r=mat2(.8,-.6,.6,.8);
  for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.02;a*=.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);
  float t=uTime*.035;
  vec2 m=(uMouse-.5)*vec2(uRes.x/min(uRes.x,uRes.y),uRes.y/min(uRes.x,uRes.y));
  float pull=exp(-2.4*length(p-m));
  vec2 q=vec2(fbm(p*1.6+vec2(0.,t)),fbm(p*1.6+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p*1.4+3.*q+vec2(1.7,9.2)+t*1.4+pull*.35),fbm(p*1.4+3.*q+vec2(8.3,2.8)-t));
  float f=fbm(p*1.2+2.6*r);

  vec3 baseL=vec3(.941,.933,.914), goldL=vec3(.89,.71,.43), pearlL=vec3(.73,.79,.93), roseL=vec3(.93,.75,.82);
  vec3 baseD=vec3(.047,.043,.055), goldD=vec3(.62,.47,.24), pearlD=vec3(.11,.13,.26), roseD=vec3(.30,.13,.22);
  vec3 base=mix(baseL,baseD,uDark), gold=mix(goldL,goldD,uDark), pearl=mix(pearlL,pearlD,uDark), rose=mix(roseL,roseD,uDark);

  vec3 col=base;
  col=mix(col,pearl,smoothstep(.25,.85,length(q))*.75);
  col=mix(col,rose,smoothstep(.45,.95,r.y)*.55);
  col=mix(col,gold,smoothstep(.5,1.,f*f*2.2)*(.75+pull*.5));
  col+=gold*pull*.08*(1.-uDark*.4);

  // vignette into the canvas colour so edges dissolve into the page
  float vig=smoothstep(1.25,.2,length((uv-.5)*vec2(1.25,1.)));
  col=mix(base,col,vig);
  // fine dithering to avoid banding on large gradients
  col+=(hash(gl_FragCoord.xy+uTime)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/**
 * Full-bleed ambient shader. Renders at reduced resolution (it's soft by nature),
 * pauses when off-screen or the tab is hidden, and draws a single still frame for
 * reduced-motion users. Falls back to the CSS pearl gradient if WebGL is unavailable.
 */
export function AetherShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      gl.useProgram(program);
    } catch {
      return;
    }
    canvas.dataset.ready = "true";

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uDark = gl.getUniformLocation(program, "uDark");

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SCALE = 0.5;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr * SCALE));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    ro.observe(canvas);

    const isDark = () => (document.documentElement.dataset.theme === "dark" ? 1 : 0);
    let dark = isDark();
    const mouse = { x: 0.62, y: 0.55, tx: 0.62, ty: 0.55 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = 1 - (e.clientY - rect.top) / rect.height;
    };
    addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let visible = true;
    const start = performance.now() - 40_000;
    const draw = (now: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      dark += (isDark() - dark) * 0.08;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uDark, dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      draw(now);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const resume = () => {
      if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      resume();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    const themeObserver = new MutationObserver(() => {
      if (reduced) {
        dark = isDark();
        draw(performance.now());
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (reduced) draw(performance.now());
    else resume();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", resume);
      // Free GPU objects but keep the context: a remount (React strict mode,
      // fast refresh) reuses the same canvas and would otherwise get a dead context.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      delete canvas.dataset.ready;
    };
  }, []);

  return (
    <div className={cn("pearl absolute inset-0 overflow-hidden", className)} aria-hidden>
      <canvas
        ref={canvasRef}
        className="size-full opacity-0 transition-opacity duration-[1.6s] ease-out-expo data-[ready=true]:opacity-100"
      />
    </div>
  );
}
