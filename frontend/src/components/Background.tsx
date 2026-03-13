import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uScrollSpeed;
  uniform float uTurbulence;
  varying float vElevation;
  varying vec2 vUv;
  varying float vDistFromCenter;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float t = uTime * 0.2;
    float turb = 1.0 + uTurbulence * 3.0;
    float noise1 = snoise(vec3(pos.x * 0.06, pos.z * 0.06 + t, t * 0.3)) * 5.5 * turb;
    float noise2 = snoise(vec3(pos.x * 0.12, pos.z * 0.12 + t * 1.5, t * 0.5 + 10.0)) * 2.5 * turb;
    float elevation = noise1 + noise2;
    pos.y += elevation;
    vElevation = elevation;
    vDistFromCenter = sqrt(pos.x * pos.x + pos.z * pos.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying float vElevation;
  varying vec2 vUv;
  varying float vDistFromCenter;

  void main() {
    vec3 cyanColor = vec3(0.0, 0.97, 1.0);
    vec3 blueColor = vec3(0.15, 0.39, 0.92);
    float elevNorm = clamp((vElevation + 5.0) / 14.0, 0.0, 1.0);
    vec3 terrainColor = mix(blueColor, cyanColor, elevNorm * elevNorm);
    float distFade = 1.0 - smoothstep(10.0, 60.0, vDistFromCenter);
    float gridPulse = 0.8 + 0.4 * sin(uTime * 2.0 + vElevation * 3.0);
    vec3 finalColor = terrainColor * gridPulse * uIntensity;
    float peakGlow = smoothstep(0.65, 1.0, elevNorm);
    finalColor += cyanColor * peakGlow * 1.5;
    float alpha = distFade * uIntensity * (0.4 + 0.6 * elevNorm);
    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
  }
`;

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      // WebGL not available (e.g. headless browser) — silently skip
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050505, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 18, 45);
    camera.lookAt(0, 0, 0);

    const uniforms = {
      uTime: { value: 0 }, uScrollSpeed: { value: 0 },
      uTurbulence: { value: 0 }, uIntensity: { value: 0.8 },
    };

    const terrainMat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      wireframe: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });

    const planeGeo = new THREE.PlaneGeometry(120, 120, 160, 160);
    planeGeo.rotateX(-Math.PI * 0.5);
    const terrain = new THREE.Mesh(planeGeo, terrainMat);
    terrain.position.set(0, -4, -10);
    scene.add(terrain);

    // Particles
    const pCount = 250;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 120;
      pPos[i * 3 + 1] = Math.random() * 40 - 5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00f7ff, size: 0.25, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(pGeo, pMat));

    // Cursor light
    const cursorLight = new THREE.PointLight(0x00f7ff, 2, 40);
    scene.add(cursorLight);

    const mouse = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      uniforms.uTime.value = elapsed;

      // Particle drift
      const arr = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < pCount; i++) arr[i * 3 + 1] += Math.sin(elapsed + i) * 0.01;
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = 0.6 + 0.4 * Math.sin(elapsed * 10);

      raycaster.setFromCamera(mouse, camera);
      const d = raycaster.ray.direction;
      const o = raycaster.ray.origin;
      cursorLight.position.lerp(new THREE.Vector3(o.x + d.x * 20, o.y + d.y * 20, o.z + d.z * 20), 0.1);

      terrain.rotation.z = Math.sin(elapsed * 0.1) * 0.03;
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="three-canvas" />
      <div className="terrain-overlay" />
    </>
  );
}

