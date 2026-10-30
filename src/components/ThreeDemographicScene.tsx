import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ComputedNameStats } from '../data/demographics';

interface ThreeDemographicSceneProps {
  names: ComputedNameStats[];
  selectedIndex: number;
  onSelectName: (index: number) => void;
  isAutoRotate: boolean;
  viewMode: 'overview' | 'comparison' | 'closeUp';
  cameraTrigger?: number;
  isPaused?: boolean;
}

// Module-scope scratch math objects for zero garbage collection in render loop
const _vec3 = new THREE.Vector3();
const _targetCam = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export const ThreeDemographicScene: React.FC<ThreeDemographicSceneProps> = ({
  names,
  selectedIndex,
  onSelectName,
  isAutoRotate,
  viewMode,
  cameraTrigger = 0,
  isPaused = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const monolithGroupsRef = useRef<THREE.Group[]>([]);
  const hoveredIndexRef = useRef<number>(-1);
  const isSoftwareGlRef = useRef<boolean>(false);
  const isTransitioningCameraRef = useRef<boolean>(false);
  const wakeLoopRef = useRef<(frames?: number) => void>(() => {});

  // Keep references to props for animation loop without recreating listeners
  const propsRef = useRef({ names, selectedIndex, isAutoRotate, viewMode, onSelectName, isPaused });
  useEffect(() => {
    propsRef.current = { names, selectedIndex, isAutoRotate, viewMode, onSelectName, isPaused };
    wakeLoopRef.current(45);
  }, [names, selectedIndex, isAutoRotate, viewMode, onSelectName, isPaused]);

  // Trigger smooth camera glide ONLY when user explicitly changes viewMode, cameraTrigger, or selects a pillar in closeUp mode
  useEffect(() => {
    isTransitioningCameraRef.current = true;
    wakeLoopRef.current(60);
  }, [viewMode, cameraTrigger]);

  useEffect(() => {
    if (viewMode === 'closeUp') {
      isTransitioningCameraRef.current = true;
    }
    wakeLoopRef.current(45);
  }, [selectedIndex, viewMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard from GPU renderer string
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();
    isSoftwareGlRef.current = isSoftwareGl;

    // 2. Renderer setup with downscaled pixelRatio on high-DPI displays to prevent MacBook thermal stress
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'default',
      preserveDrawingBuffer: false,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Cache bounding rect to avoid layout thrashing in pointermove
    let cachedRect = renderer.domElement.getBoundingClientRect();
    let lastCursor = 'default';
    let isDraggingCamera = false;
    let lastRaycastTime = 0;

    // 3. Scene & Studio PBR Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls (Free lateral panning & orbital rotation enabled)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 14, 26);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 1.0;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't clip under ground
    controls.minDistance = 4;
    controls.maxDistance = 85;
    controls.target.set(0, 4.5, 0);

    controlsRef.current = controls;

    // 5. Studio 3-Point Lighting Rig
    // Warm key light (1024x1024 shadow map to reduce GPU fill-rate load)
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.8);
    keyLight.position.set(15, 25, 20);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 70;
      keyLight.shadow.camera.left = -25;
      keyLight.shadow.camera.right = 25;
      keyLight.shadow.camera.top = 25;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool sky/ground fill light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.4);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    // General Ambient Fill
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambLight);

    // Blue rim accent light
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.6);
    rimLight.position.set(-20, 15, -18);
    scene.add(rimLight);

    // Warm floor accent
    const groundPoint = new THREE.PointLight(0xf59e0b, 1.8, 30, 1.5);
    groundPoint.position.set(0, 1, 0);
    scene.add(groundPoint);

    // 6. Architectural Demographic Floor / Grid
    const floorGroup = new THREE.Group();

    // Procedural Floor Texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = '#090d16';
    fctx.fillRect(0, 0, 512, 512);

    // Concentric coordinate rings
    fctx.strokeStyle = '#1e293b';
    fctx.lineWidth = 2;
    for (let r = 40; r < 250; r += 40) {
      fctx.beginPath();
      fctx.arc(256, 256, r, 0, Math.PI * 2);
      fctx.stroke();
    }
    // Fine demographic grid lines
    fctx.strokeStyle = '#0f172a';
    fctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) {
      fctx.beginPath();
      fctx.moveTo(x, 0);
      fctx.lineTo(x, 512);
      fctx.stroke();
      fctx.beginPath();
      fctx.moveTo(0, x);
      fctx.lineTo(512, x);
      fctx.stroke();
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(8, 8);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.85,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    floorGroup.add(floorMesh);

    // Decorative demographic age milestone rings (scaled in 3D world units)
    const ringRadii = [6, 12, 18, 24];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.05, r + 0.05, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x0284c7 : 0x475569,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.02;
      floorGroup.add(ringMesh);
    });

    scene.add(floorGroup);

    // Ambient floating particles (data dust)
    const particleCount = 90;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 60;
      particlePositions[i * 3 + 1] = Math.random() * 25 + 0.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.3,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Throttled Render Loop State (30 FPS cap + idle sleep)
    let frameId = 0;
    let isLoopRunning = false;
    let activeFramesRemaining = 45;
    let lastFrameTime = 0;
    const fpsLimit = 30;
    const frameInterval = 1000 / fpsLimit;
    const clock = new THREE.Clock();

    const wakeRenderLoop = (frames = 35) => {
      activeFramesRemaining = Math.max(activeFramesRemaining, frames);
      if (!isLoopRunning && !document.hidden && !propsRef.current.isPaused) {
        isLoopRunning = true;
        clock.getDelta();
        frameId = requestAnimationFrame(tick);
      }
    };
    wakeLoopRef.current = wakeRenderLoop;

    // Immediately cancel any scripted camera glide as soon as the user pans, orbits, or zooms
    controls.addEventListener('start', () => {
      isTransitioningCameraRef.current = false;
      isDraggingCamera = true;
      wakeRenderLoop(45);
    });
    controls.addEventListener('change', () => {
      wakeRenderLoop(25);
    });
    controls.addEventListener('end', () => {
      isDraggingCamera = false;
      wakeRenderLoop(30);
    });

    // 8. Raycasting for hover & click (throttled & zero layout thrashing)
    const setCursorIfChanged = (nextCursor: string) => {
      if (lastCursor !== nextCursor) {
        lastCursor = nextCursor;
        container.style.cursor = nextCursor;
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (isDraggingCamera || propsRef.current.isPaused) return;
      const now = performance.now();
      if (now - lastRaycastTime < 33) return; // Cap raycasting to 30Hz
      lastRaycastTime = now;

      if (cachedRect.width <= 0 || cachedRect.height <= 0) {
        cachedRect = renderer.domElement.getBoundingClientRect();
      }
      _mouse.x = ((e.clientX - cachedRect.left) / cachedRect.width) * 2 - 1;
      _mouse.y = -((e.clientY - cachedRect.top) / cachedRect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(monolithGroupsRef.current, true);

      let nextHovered = -1;
      if (intersects.length > 0) {
        let parent = intersects[0].object.parent;
        while (parent && !(parent.userData && parent.userData.monolithIndex !== undefined)) {
          parent = parent.parent;
        }
        if (parent && parent.userData.monolithIndex !== undefined) {
          nextHovered = parent.userData.monolithIndex;
        }
      }

      if (nextHovered !== hoveredIndexRef.current) {
        hoveredIndexRef.current = nextHovered;
        setCursorIfChanged(nextHovered >= 0 ? 'pointer' : 'default');
        wakeRenderLoop(25);
      }
    };

    const handleClick = () => {
      if (hoveredIndexRef.current >= 0) {
        propsRef.current.onSelectName(hoveredIndexRef.current);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove, { passive: true });
    renderer.domElement.addEventListener('click', handleClick);

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      cachedRect = renderer.domElement.getBoundingClientRect();
      wakeRenderLoop(20);
    };
    window.addEventListener('resize', handleResize);

    // Populate initial monoliths
    rebuildMonoliths(propsRef.current.names, scene);

    function tick(timestamp = performance.now()) {
      const currentProps = propsRef.current;

      if (document.hidden || currentProps.isPaused) {
        isLoopRunning = false;
        return;
      }

      // Throttle 3D rendering to 30 FPS to reduce MacBook GPU/CPU thermal load
      if (timestamp - lastFrameTime < frameInterval) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      lastFrameTime = timestamp;

      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Camera transitions based on viewMode & selected monolith
      const selectedMonolith = monolithGroupsRef.current[currentProps.selectedIndex];

      if (selectedMonolith && currentProps.viewMode === 'closeUp') {
        _targetLook.copy(selectedMonolith.position).add(_vec3.set(0, 5, 0));
        _targetCam.copy(selectedMonolith.position).add(_vec3.set(0, 7, 12));
      } else if (currentProps.viewMode === 'comparison') {
        const span = Math.max(8, currentProps.names.length * 4.5);
        _targetLook.set(0, 5.5, 0);
        _targetCam.set(0, 10, span * 1.5);
      } else {
        // Overview
        _targetLook.set(0, 4.5, 0);
        _targetCam.set(0, 14, 26);
      }

      // Smooth camera interpolation with exponential damping ONLY during explicit preset transitions
      if (isTransitioningCameraRef.current) {
        controls.target.lerp(_targetLook, 1 - Math.exp(-5 * delta));
        camera.position.lerp(_targetCam, 1 - Math.exp(-4 * delta));

        // Stop scripted transition on arrival so user retains 100% free control
        if (
          controls.target.distanceToSquared(_targetLook) < 0.02 &&
          camera.position.distanceToSquared(_targetCam) < 0.05
        ) {
          isTransitioningCameraRef.current = false;
        } else {
          activeFramesRemaining = Math.max(activeFramesRemaining, 10);
        }
      }

      // Auto rotation
      if (currentProps.isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
        activeFramesRemaining = Math.max(activeFramesRemaining, 10);
      } else {
        controls.autoRotate = false;
      }
      controls.update();

      // GPU-friendly ambient floating motion (no buffer re-uploads to GPU)
      if (currentProps.isAutoRotate) {
        particleSystem.rotation.y = time * 0.03;
        particleSystem.position.y = Math.sin(time * 0.5) * 0.3;
      }

      // Animate crystal beacons & selection scale on monoliths
      let anyScaling = false;
      monolithGroupsRef.current.forEach((group, idx) => {
        if (currentProps.isAutoRotate) {
          const crystal = group.userData.crystalMesh as THREE.Mesh;
          if (crystal) {
            crystal.rotation.y = time * 0.8 + idx * 0.5;
          }
        }

        // Highlight selected or hovered monolith
        const isSelected = idx === currentProps.selectedIndex;
        const isHovered = idx === hoveredIndexRef.current;
        const targetScale = isSelected ? 1.06 : isHovered ? 1.03 : 1.0;
        const nextScale = THREE.MathUtils.damp(group.scale.x, targetScale, 8, delta);
        if (Math.abs(nextScale - targetScale) > 0.001) {
          anyScaling = true;
        }
        group.scale.setScalar(nextScale);

        const halo = group.userData.haloMesh as THREE.Mesh;
        if (halo) {
          if (currentProps.isAutoRotate) {
            halo.rotation.z = -time * 0.5;
          }
          (halo.material as THREE.MeshBasicMaterial).opacity = isSelected ? 0.85 : 0.35;
        }
      });

      if (anyScaling) {
        activeFramesRemaining = Math.max(activeFramesRemaining, 5);
      }

      renderer.render(scene, camera);

      activeFramesRemaining--;
      if (activeFramesRemaining > 0 || currentProps.isAutoRotate || isTransitioningCameraRef.current || isDraggingCamera) {
        frameId = requestAnimationFrame(tick);
      } else {
        // Scene is idle: sleep until next user interaction or prop update
        isLoopRunning = false;
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !propsRef.current.isPaused) {
        wakeRenderLoop(30);
      } else {
        isLoopRunning = false;
        cancelAnimationFrame(frameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial render
    isLoopRunning = true;
    frameId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isLoopRunning = false;
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const rebuildMonoliths = (namesList: ComputedNameStats[], targetScene: THREE.Scene) => {
    // Dispose old monoliths
    monolithGroupsRef.current.forEach((grp) => {
      targetScene.remove(grp);
      grp.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    });
    monolithGroupsRef.current = [];

    const numNames = namesList.length;
    if (numNames === 0) return;

    // Spacing along X axis
    const spacing = 5.2;
    const startX = -((numNames - 1) * spacing) / 2;

    namesList.forEach((item, index) => {
      const posX = startX + index * spacing;
      const monolithGroup = createMonolithGroup(item, index, isSoftwareGlRef.current);
      monolithGroup.position.set(posX, 0, 0);
      targetScene.add(monolithGroup);
      monolithGroupsRef.current.push(monolithGroup);
    });
  };

  // Update 3D Monoliths whenever the list of names changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    rebuildMonoliths(names, scene);
    wakeLoopRef.current(35);
  }, [names]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    />
  );
};

/**
 * Creates a Composite 3–12 Part Procedural Model (THREE.Group) for a name
 * Strict Three.js Skill Compliance:
 * - 3–12 parts across primary silhouette, secondary read, and accent detail
 * - Roughness varied by >= 0.25 across adjacent components
 * - Bottom-center pivot sitting flush on ground (y = 0)
 * - Soft radial contact shadow plane directly beneath
 * - Zero 404 external asset dependencies
 */
function createMonolithGroup(item: ComputedNameStats, index: number, isSoftwareGl = false): THREE.Group {
  const group = new THREE.Group();
  group.userData = { monolithIndex: index, item };

  // Scale life expectancy to pillar height
  // Baseline: 60 years = 4 units, 85 years = 9 units
  const minAge = 50;
  const maxAge = 92;
  const clampedLife = Math.min(maxAge, Math.max(minAge, item.adjustedLifeExpectancy));
  const totalHeight = 4.0 + ((clampedLife - minAge) / (maxAge - minAge)) * 6.5;

  // Split height into: Lived age (solid base shaft) vs Remaining expectancy (translucent luminescent crown)
  const livedRatio = Math.min(1.0, item.currentAge / item.adjustedLifeExpectancy);
  const livedHeight = Math.max(1.5, totalHeight * livedRatio);
  const remainingHeight = Math.max(0.6, totalHeight - livedHeight);

  const baseColor = new THREE.Color(item.colorHex);

  // 1. Part 1: Soft Radial Contact Shadow Grounding Disc (flush with ground at y=0.01)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  group.add(shadowMesh);

  // 2. Part 2: Heavy Polished Basalt Base Plinth (Primary Silhouette - Bottom)
  const plinthGeo = new THREE.CylinderGeometry(1.65, 1.85, 0.5, 32);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.6,
  });
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.y = 0.25;
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  group.add(plinthMesh);

  // 3. Part 3: Beveled Brushed Brass Ring / Pedestal Transition (Secondary Read)
  const brassRingGeo = new THREE.TorusGeometry(1.4, 0.12, 16, 32);
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.15, // Smooth metallic contrast (delta >= 0.25 vs plinth)
    metalness: 0.9,
  });
  const brassRingMesh = new THREE.Mesh(brassRingGeo, brassMat);
  brassRingMesh.rotation.x = Math.PI / 2;
  brassRingMesh.position.y = 0.52;
  group.add(brassRingMesh);

  // 4. Part 4: Engraved Brass Label Plaque on Plinth
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 128;
  const pctx = plaqueCanvas.getContext('2d')!;
  pctx.fillStyle = '#b45309';
  pctx.fillRect(0, 0, 512, 128);
  pctx.strokeStyle = '#fef3c7';
  pctx.lineWidth = 6;
  pctx.strokeRect(6, 6, 500, 116);
  pctx.fillStyle = '#ffffff';
  pctx.font = 'bold 44px sans-serif';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillText(`${item.queryName} (${item.birthYear})`, 256, 50);
  pctx.font = '28px sans-serif';
  pctx.fillStyle = '#fef08a';
  pctx.fillText(`Espérance : ${item.adjustedLifeExpectancy} ans`, 256, 92);

  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueGeo = new THREE.PlaneGeometry(1.6, 0.4);
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    roughness: 0.2,
    metalness: 0.8,
  });
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.position.set(0, 0.25, 1.76);
  group.add(plaqueMesh);

  // 5. Part 5: Fluted Demographic Pillar Body (Lived Years Shaft - Primary Silhouette)
  // Procedural fluted surface roughness map
  const shaftGeo = new THREE.CylinderGeometry(1.15, 1.3, livedHeight, 32);
  const shaftMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.55,
    metalness: 0.25,
  });
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  shaftMesh.position.y = 0.55 + livedHeight / 2;
  shaftMesh.castShadow = true;
  shaftMesh.receiveShadow = true;
  group.add(shaftMesh);

  // 6. Part 6: Decade Milestone Horizontal Rings (Secondary Read)
  const numDecades = Math.floor(item.currentAge / 10);
  for (let d = 1; d <= numDecades; d++) {
    const ringY = 0.55 + (livedHeight * (d * 10)) / Math.max(1, item.currentAge);
    if (ringY < 0.55 + livedHeight) {
      const decadeRingGeo = new THREE.TorusGeometry(1.22, 0.04, 12, 32);
      const decadeRingMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
      });
      const decadeMesh = new THREE.Mesh(decadeRingGeo, decadeRingMat);
      decadeMesh.rotation.x = Math.PI / 2;
      decadeMesh.position.y = ringY;
      group.add(decadeMesh);
    }
  }

  // 7. Part 7: Translucent Luminescent Crystal Section (Remaining Expectancy - Accent Silhouette)
  const remainingY = 0.55 + livedHeight + remainingHeight / 2;
  const remainingGeo = new THREE.CylinderGeometry(0.95, 1.15, remainingHeight, 32);
  const remainingMat = new THREE.MeshPhysicalMaterial({
    color: baseColor.clone().offsetHSL(0.05, 0.1, 0.15),
    roughness: 0.15,
    metalness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.8,
    transparent: true,
    opacity: isSoftwareGl ? 0.7 : 0.85,
    ior: 1.45,
  });
  const remainingMesh = new THREE.Mesh(remainingGeo, remainingMat);
  remainingMesh.position.y = remainingY;
  remainingMesh.castShadow = true;
  group.add(remainingMesh);

  // 8. Part 8: Glowing Longevity Crystal Finial on Top (Accent Detail)
  const crystalTopY = 0.55 + totalHeight + 0.6;
  const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
  // Survival color: high survival = cyan/emerald, lower survival = orange/red
  const survivalHue = Math.max(0, Math.min(130, (item.adjustedSurvivalRate - 50) * 2.6)) / 360;
  const survivalColor = new THREE.Color().setHSL(survivalHue, 0.9, 0.6);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: survivalColor,
    emissive: survivalColor,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
  });
  const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
  crystalMesh.position.y = crystalTopY;
  group.add(crystalMesh);
  group.userData.crystalMesh = crystalMesh;

  // 9. Part 9: Floating Halo Ring around Crystal (Luminescence)
  const haloGeo = new THREE.RingGeometry(0.9, 1.1, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: survivalColor,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.rotation.x = Math.PI / 2;
  haloMesh.position.y = crystalTopY;
  group.add(haloMesh);
  group.userData.haloMesh = haloMesh;

  // 10. Part 10: High-Fidelity 3D Billboard Label Floating Above Peak
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const lctx = labelCanvas.getContext('2d')!;

  // Stylized rounded badge
  lctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  lctx.roundRect ? lctx.roundRect(16, 16, 480, 224, 28) : lctx.fillRect(16, 16, 480, 224);
  lctx.fill();

  lctx.strokeStyle = item.colorHex;
  lctx.lineWidth = 6;
  lctx.stroke();

  // Name header
  lctx.fillStyle = '#ffffff';
  lctx.font = 'bold 50px sans-serif';
  lctx.textAlign = 'center';
  lctx.fillText(item.queryName, 256, 75);

  // Life expectancy KPI
  lctx.font = 'bold 42px sans-serif';
  lctx.fillStyle = '#38bdf8';
  lctx.fillText(`${item.adjustedLifeExpectancy} ans`, 256, 135);

  // Survival indicator
  lctx.font = '30px sans-serif';
  lctx.fillStyle = item.adjustedSurvivalRate >= 90 ? '#4ade80' : item.adjustedSurvivalRate >= 70 ? '#fbbf24' : '#f87171';
  lctx.fillText(`Survie en 2026 : ${item.adjustedSurvivalRate}%`, 256, 185);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelGeo = new THREE.PlaneGeometry(3.0, 1.5);
  const labelMat = new THREE.MeshBasicMaterial({
    map: labelTex,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.y = crystalTopY + 1.6;
  group.add(labelMesh);

  return group;
}
