'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { WEAPONS, WeaponType } from './StressAnnihilator';

interface Weapon3DCursorProps {
  weapon: WeaponType;
  position: { x: number; y: number };
  showMuzzleFlash: boolean;
}

// 무기별 설정 (screenOffsetX, screenOffsetY: 크로스헤어 대비 무기 위치 오프셋)
const weaponSettings: Record<string, { scale: number; cameraZ: number; offsetY: number; rotationY: number; screenOffsetX: number; screenOffsetY: number }> = {
  gun1: { scale: 3.5, cameraZ: 3, offsetY: 0, rotationY: (210 * Math.PI / 180), screenOffsetX: 80, screenOffsetY: 60 }, // 권총
  gun2: { scale: 4.5, cameraZ: 3, offsetY: -0.5, rotationY: (200 * Math.PI / 180), screenOffsetX: 100, screenOffsetY: 80 }, // 샷건
  gun3: { scale: 5.0, cameraZ: 3, offsetY: -0.3, rotationY: (200 * Math.PI / 180), screenOffsetX: 120, screenOffsetY: 80 }, // 라이플
  hammer: { scale: 3.0, cameraZ: 5, offsetY: 0, rotationY: (210 * Math.PI / 180), screenOffsetX: 60, screenOffsetY: 60 }, // 망치
};

const defaultSettings = { scale: 2.5, cameraZ: 5, offsetY: 0, rotationY: Math.PI + Math.PI / 6, screenOffsetX: 50, screenOffsetY: 50 };

export default function Weapon3DCursor({
  weapon,
  position,
  showMuzzleFlash,
}: Weapon3DCursorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const muzzleFlashRef = useRef<THREE.PointLight | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const modelPath = WEAPONS[weapon].modelPath;
  const settings = weaponSettings[weapon] || defaultSettings;

  // 샷건/라이플은 더 큰 캔버스
  const canvasSize = (weapon === 'gun2' || weapon === 'gun3') ? 250 : 150;

  // 의존성 배열을 위해 설정값 추출
  const { scale, cameraZ, offsetY, rotationY, screenOffsetX, screenOffsetY } = settings;

  useEffect(() => {
    if (!containerRef.current || !modelPath) return;

    const container = containerRef.current;
    const width = canvasSize;
    const height = canvasSize;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera - 무기별 거리 조정
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, cameraZ);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - 원래 색상을 보여주기 위한 자연스러운 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, -5, 5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    // Muzzle flash light (initially off)
    const muzzleFlash = new THREE.PointLight(0xff6600, 0, 10);
    muzzleFlash.position.set(2, 0, 0);
    scene.add(muzzleFlash);
    muzzleFlashRef.current = muzzleFlash;

    // Load FBX model
    const loader = new FBXLoader();
    loader.load(
      modelPath,
      (object) => {
        // Scale and center the model
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const modelScale = scale / maxDim;
        object.scale.setScalar(modelScale);

        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center.multiplyScalar(modelScale));
        object.position.y += offsetY;

        // 원래 텍스처/색상 유지 - 메탈릭 효과만 약간 추가
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            // 기존 머티리얼 유지하되 메탈릭 느낌 추가
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => {
                  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
                    mat.metalness = 0.3;
                    mat.roughness = 0.7;
                  }
                });
              } else if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhongMaterial) {
                mesh.material.metalness = 0.3;
                mesh.material.roughness = 0.7;
              }
            }
          }
        });

        // 배경화면을 바라보고 살짝 우측으로 틀어진 고정 각도
        object.rotation.x = 0;
        object.rotation.y = rotationY;
        object.rotation.z = 0;

        scene.add(object);
        modelRef.current = object;
        setIsLoaded(true);
      },
      undefined,
      (error) => {
        console.error('Error loading 3D model:', error);
      }
    );

    // Animation loop (회전 없이 렌더링만)
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else if (mesh.material) {
              mesh.material.dispose();
            }
          }
        });
        modelRef.current = null;
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      setIsLoaded(false);
    };
  }, [modelPath, canvasSize, scale, cameraZ, offsetY, rotationY]);

  // Muzzle flash effect
  useEffect(() => {
    if (showMuzzleFlash && muzzleFlashRef.current) {
      muzzleFlashRef.current.intensity = 3;
      setTimeout(() => {
        if (muzzleFlashRef.current) {
          muzzleFlashRef.current.intensity = 0;
        }
      }, 100);
    }
  }, [showMuzzleFlash]);

  // If no 3D model, show 2D icon (크로스헤어 제거, 오프셋 위치에 아이콘만 표시)
  if (!modelPath) {
    const icons: Record<string, string> = {
      gun1: '🔫',
      gun2: '💥',
      gun3: '🎯',
      knife: '🗡️',
      bat: '🏏',
      hammer: '🔨',
      bug: '🐛',
    };

    return (
      <div
        className="absolute pointer-events-none z-50"
        style={{
          left: `${position.x + screenOffsetX}px`,
          top: `${position.y + screenOffsetY}px`,
          transform: 'translate(-50%, -50%)',
          willChange: 'left, top',
        }}
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          <span className="text-4xl drop-shadow-[0_0_20px_rgba(0,255,65,1)]">
            {icons[weapon] || '⬤'}
          </span>
        </div>
      </div>
    );
  }

  // 3D 모델만 오프셋 위치에 렌더링 (크로스헤어는 GameCanvas에서 별도 렌더링)
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${position.x + screenOffsetX}px`,
        top: `${position.y + screenOffsetY}px`,
        transform: 'translate(-50%, -50%)',
        willChange: 'left, top',
      }}
    >
      {/* 3D Model */}
      <div
        ref={containerRef}
        style={{
          width: `${canvasSize}px`,
          height: `${canvasSize}px`,
          filter: isLoaded ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.5))' : 'none',
        }}
      />
    </div>
  );
}
