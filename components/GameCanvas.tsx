'use client';

import { useEffect, useRef, useState } from 'react';
import { WEAPONS, WeaponType } from './StressAnnihilator';
import WeaponSelector from './WeaponSelector';
import dynamic from 'next/dynamic';

const Weapon3DCursor = dynamic(() => import('./Weapon3DCursor'), { ssr: false });

interface GameCanvasProps {
  uploadedImage: HTMLImageElement;
  currentWeapon: WeaponType;
  onWeaponChange: (weapon: WeaponType) => void;
  onChangeImage: () => void;
  showWeaponSelector: boolean;
  setShowWeaponSelector: (show: boolean) => void;
}

interface Crack {
  x: number;
  y: number;
  size: number;
  weapon: WeaponType;
  seed: number; // 랜덤 시드로 일관된 파괴 흔적 유지
}

interface MuzzleFlash {
  x: number;
  y: number;
  id: number;
}

interface Bug {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  isDead: boolean;
  deathTime: number | null;
  opacity: number;
}

export default function GameCanvas({
  uploadedImage,
  currentWeapon,
  onWeaponChange,
  onChangeImage,
  showWeaponSelector,
  setShowWeaponSelector,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cracks, setCracks] = useState<Crack[]>([]);
  const [hitCount, setHitCount] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [muzzleFlashes, setMuzzleFlashes] = useState<MuzzleFlash[]>([]);
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false);
  const [sounds, setSounds] = useState<Record<WeaponType, HTMLAudioElement[]>>(
    {} as Record<WeaponType, HTMLAudioElement[]>
  );
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [bloodSplatters, setBloodSplatters] = useState<{ x: number; y: number; id: number; size: number }[]>([]);
  const bugsRef = useRef<Bug[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const bugSpawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rifleFireIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseDownRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastBugUpdateRef = useRef<number>(0);

  // 성능 최적화 상수
  const MAX_BUGS = 50; // 최대 벌레 수
  const MAX_BLOOD_SPLATTERS = 30; // 최대 피 튀김 수
  const BUG_UPDATE_INTERVAL = 16; // 벌레 업데이트 간격 (ms)

  // Load sounds
  useEffect(() => {
    const loadedSounds: Record<WeaponType, HTMLAudioElement[]> = {} as Record<
      WeaponType,
      HTMLAudioElement[]
    >;

    (Object.keys(WEAPONS) as WeaponType[]).forEach((weaponKey) => {
      const weapon = WEAPONS[weaponKey];
      if (weapon.sounds.length > 0) {
        loadedSounds[weaponKey] = weapon.sounds.map((src) => {
          const audio = new Audio(src);
          audio.preload = 'auto';
          return audio;
        });
      }
    });

    setSounds(loadedSounds);
  }, []);

  // Bug animation loop (최적화됨)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateBugs = (timestamp: number) => {
      // 업데이트 간격 체크 (16ms = ~60fps)
      if (timestamp - lastBugUpdateRef.current < BUG_UPDATE_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(updateBugs);
        return;
      }
      lastBugUpdateRef.current = timestamp;

      const now = Date.now();

      // ref에서 직접 업데이트 (React 상태 업데이트 최소화)
      const currentBugs = bugsRef.current;
      let needsStateUpdate = false;

      const updatedBugs = currentBugs.map(bug => {
        // 죽은 벌레는 페이드아웃 처리
        if (bug.isDead) {
          const timeSinceDeath = now - (bug.deathTime || now);
          // 1.5초 후부터 페이드아웃 시작
          if (timeSinceDeath >= 1500) {
            const fadeProgress = (timeSinceDeath - 1500) / 1000; // 1초 동안 페이드아웃
            const newOpacity = Math.max(0, 1 - fadeProgress);
            if (newOpacity !== bug.opacity) {
              needsStateUpdate = true;
              return { ...bug, opacity: newOpacity };
            }
          }
          return bug;
        }

        // 살아있는 벌레는 랜덤하게 움직임
        let newAngle = bug.angle;
        // 랜덤하게 방향 전환 (10% 확률)
        if (Math.random() < 0.1) {
          newAngle += (Math.random() - 0.5) * Math.PI / 2;
        }

        let newX = bug.x + Math.cos(newAngle) * bug.speed;
        let newY = bug.y + Math.sin(newAngle) * bug.speed;

        // 캔버스 경계 체크 및 반사
        if (newX < 20 || newX > canvas.width - 20) {
          newAngle = Math.PI - newAngle;
          newX = Math.max(20, Math.min(canvas.width - 20, newX));
        }
        if (newY < 20 || newY > canvas.height - 20) {
          newAngle = -newAngle;
          newY = Math.max(20, Math.min(canvas.height - 20, newY));
        }

        needsStateUpdate = true;
        return {
          ...bug,
          x: newX,
          y: newY,
          angle: newAngle,
        };
      }).filter(bug => bug.opacity > 0); // opacity가 0이면 제거

      bugsRef.current = updatedBugs;

      // 상태 업데이트가 필요한 경우에만 (살아있는 벌레가 있을 때만)
      if (needsStateUpdate || updatedBugs.length !== currentBugs.length) {
        setBugs(updatedBugs);
      }

      animationFrameRef.current = requestAnimationFrame(updateBugs);
    };

    animationFrameRef.current = requestAnimationFrame(updateBugs);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // 벌레 스폰 interval도 정리
      if (bugSpawnIntervalRef.current) {
        clearInterval(bugSpawnIntervalRef.current);
        bugSpawnIntervalRef.current = null;
      }
      // 라이플 발사 interval도 정리
      if (rifleFireIntervalRef.current) {
        clearInterval(rifleFireIntervalRef.current);
        rifleFireIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawAll();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [uploadedImage]);

  // Redraw when cracks change
  useEffect(() => {
    redrawAll();
  }, [cracks]);

  const drawImage = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas || !uploadedImage) return;

    const imgAspect = uploadedImage.width / uploadedImage.height;
    const canvasAspect = canvas.width / canvas.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(uploadedImage, offsetX, offsetY, drawWidth, drawHeight);
  };

  // 시드 기반 의사 난수 생성기 (일관된 랜덤값 생성)
  const seededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  // 권총 - 총알 구멍 효과 (작은 원형 구멍 + 균열)
  const drawPistolEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    const random = seededRandom(seed);
    ctx.save();

    // 총알 구멍 (검은 원)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, size / 3, 0, Math.PI * 2);
    ctx.fill();

    // 구멍 주변 균열
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    const numCracks = 5 + Math.floor(random() * 4);
    for (let i = 0; i < numCracks; i++) {
      const angle = (Math.PI * 2 / numCracks) * i + random() * 0.5;
      const length = size * 0.6 + random() * size * 0.4;

      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size / 3, y + Math.sin(angle) * size / 3);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    // 그을림 효과
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(50, 50, 50, 0.8)');
    gradient.addColorStop(0.5, 'rgba(80, 60, 40, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 샷건 - 넓은 산탄 패턴 (여러 개의 작은 구멍이 퍼짐)
  const drawShotgunEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    const random = seededRandom(seed);
    ctx.save();

    // 산탄 패턴 - 중앙에서 퍼지는 여러 개의 작은 구멍
    const pelletCount = 7 + Math.floor(random() * 4);
    const spreadRadius = size * 1.2;

    for (let i = 0; i < pelletCount; i++) {
      const angle = random() * Math.PI * 2;
      const distance = random() * spreadRadius;
      const pelletX = x + Math.cos(angle) * distance;
      const pelletY = y + Math.sin(angle) * distance;
      const pelletSize = 4 + random() * 8;

      // 각 산탄 구멍
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(pelletX, pelletY, pelletSize, 0, Math.PI * 2);
      ctx.fill();

      // 작은 균열
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      const miniCracks = 3 + Math.floor(random() * 3);
      for (let j = 0; j < miniCracks; j++) {
        const crackAngle = (Math.PI * 2 / miniCracks) * j + random() * 0.5;
        const crackLength = pelletSize * 1.5 + random() * pelletSize;
        ctx.beginPath();
        ctx.moveTo(pelletX + Math.cos(crackAngle) * pelletSize, pelletY + Math.sin(crackAngle) * pelletSize);
        ctx.lineTo(pelletX + Math.cos(crackAngle) * crackLength, pelletY + Math.sin(crackAngle) * crackLength);
        ctx.stroke();
      }
    }

    // 전체 영역 그을림 효과
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, spreadRadius * 1.3);
    gradient.addColorStop(0, 'rgba(60, 50, 40, 0.5)');
    gradient.addColorStop(0.6, 'rgba(40, 35, 30, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, spreadRadius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 라이플 - 정밀한 관통 효과 (랜덤 요소 없음)
  const drawRifleEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();

    // 깔끔한 관통 구멍
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, size / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 금속성 테두리
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size / 2.5 + 2, 0, Math.PI * 2);
    ctx.stroke();

    // 방사형 균열 (더 날카롭고 정밀하게)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    const numCracks = 6;
    for (let i = 0; i < numCracks; i++) {
      const angle = (Math.PI * 2 / numCracks) * i;
      const length = size * 0.8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size / 2.5, y + Math.sin(angle) * size / 2.5);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    // 열 그을림 (작은 범위, 강한 색)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.7);
    gradient.addColorStop(0, 'rgba(80, 60, 40, 0.7)');
    gradient.addColorStop(0.5, 'rgba(50, 40, 30, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 칼 - 베인 자국 효과 (직선 + 약간의 곡선)
  const drawKnifeEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    const random = seededRandom(seed);
    ctx.save();

    // 랜덤 각도의 베인 자국
    const angle = random() * Math.PI;
    const length = size * 1.5;

    // 메인 베인 자국
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * length / 2, y - Math.sin(angle) * length / 2);

    // 약간 곡선으로
    const midX = x + (random() - 0.5) * 10;
    const midY = y + (random() - 0.5) * 10;
    ctx.quadraticCurveTo(midX, midY, x + Math.cos(angle) * length / 2, y + Math.sin(angle) * length / 2);
    ctx.stroke();

    // 깊은 상처 라인
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * length / 2, y - Math.sin(angle) * length / 2);
    ctx.quadraticCurveTo(midX, midY, x + Math.cos(angle) * length / 2, y + Math.sin(angle) * length / 2);
    ctx.stroke();

    // 피 효과 (붉은 그라데이션)
    ctx.globalAlpha = 0.5;
    const bloodGradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    bloodGradient.addColorStop(0, 'rgba(139, 0, 0, 0.6)');
    bloodGradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
    ctx.fillStyle = bloodGradient;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 망치/방망이 - 균열 효과 (스파이더웹 패턴, 범위 축소)
  const drawHammerEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    const random = seededRandom(seed);
    ctx.save();

    // 범위 축소 (0.5배)
    const reducedSize = size * 0.5;

    // 중앙 충격점
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x, y, reducedSize / 4, 0, Math.PI * 2);
    ctx.fill();

    // 스파이더웹 균열
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    const numMainCracks = 6 + Math.floor(random() * 3);
    for (let i = 0; i < numMainCracks; i++) {
      const angle = (Math.PI * 2 / numMainCracks) * i + random() * 0.3;
      const length = reducedSize * 0.7 + random() * reducedSize * 0.3;

      ctx.beginPath();
      ctx.moveTo(x, y);

      // 지그재그 균열
      let currentX = x;
      let currentY = y;
      const segments = 3;

      for (let j = 0; j < segments; j++) {
        const segLen = length / segments;
        const offsetAngle = angle + (random() - 0.5) * 0.4;
        currentX += Math.cos(offsetAngle) * segLen;
        currentY += Math.sin(offsetAngle) * segLen;
        ctx.lineTo(currentX, currentY);

        // 분기 균열 (확률 낮춤)
        if (j > 1 && random() > 0.7) {
          ctx.moveTo(currentX, currentY);
          const branchAngle = offsetAngle + (random() - 0.5) * 1.5;
          const branchLen = segLen * 0.4;
          ctx.lineTo(
            currentX + Math.cos(branchAngle) * branchLen,
            currentY + Math.sin(branchAngle) * branchLen
          );
          ctx.moveTo(currentX, currentY);
        }
      }
      ctx.stroke();
    }

    // 동심원 균열 (1개만)
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, reducedSize * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 충격파 효과 (범위 축소)
    ctx.globalAlpha = 0.3;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, reducedSize * 0.8);
    gradient.addColorStop(0, 'rgba(100, 100, 100, 0.5)');
    gradient.addColorStop(0.5, 'rgba(50, 50, 50, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, reducedSize * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // 벌레 - 작은 점들과 얼룩
  const drawBugEffect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) => {
    const random = seededRandom(seed);
    ctx.save();

    // 여러 작은 점들
    ctx.globalAlpha = 0.8;
    const numDots = 5 + Math.floor(random() * 5);
    for (let i = 0; i < numDots; i++) {
      const dotX = x + (random() - 0.5) * size;
      const dotY = y + (random() - 0.5) * size;
      const dotSize = 2 + random() * 4;

      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 끈적한 얼룩
    ctx.globalAlpha = 0.4;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    gradient.addColorStop(0, 'rgba(50, 80, 50, 0.6)');
    gradient.addColorStop(1, 'rgba(30, 50, 30, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawCrack = (ctx: CanvasRenderingContext2D, crack: Crack) => {
    const { x, y, size, weapon, seed } = crack;

    if (weapon === 'gun1') {
      drawPistolEffect(ctx, x, y, size, seed);
    } else if (weapon === 'gun2') {
      drawShotgunEffect(ctx, x, y, size, seed);
    } else if (weapon === 'gun3') {
      drawRifleEffect(ctx, x, y, size);
    } else if (weapon === 'knife') {
      drawKnifeEffect(ctx, x, y, size, seed);
    } else if (weapon === 'hammer' || weapon === 'bat') {
      drawHammerEffect(ctx, x, y, size, seed);
    } else if (weapon === 'bug') {
      drawBugEffect(ctx, x, y, size, seed);
    }
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawImage(ctx);
    cracks.forEach((crack) => drawCrack(ctx, crack));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCursorPos({ x, y });

    // 벌레/라이플 무기로 마우스를 누르고 있는 상태에서 위치 업데이트
    if (isMouseDownRef.current && (currentWeapon === 'bug' || currentWeapon === 'gun3')) {
      lastMousePosRef.current = { x, y };
    }
  };

  // 벌레 스폰 함수 (최대 개수 제한)
  const spawnBug = (x: number, y: number) => {
    // 최대 개수 제한 체크
    if (bugsRef.current.length >= MAX_BUGS) {
      return; // 최대 개수 도달 시 스폰하지 않음
    }

    const newBug: Bug = {
      id: Date.now() + Math.random(),
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2,
      size: 25 + Math.random() * 15,
      isDead: false,
      deathTime: null,
      opacity: 1,
    };
    setBugs(prev => [...prev, newBug]);
    bugsRef.current = [...bugsRef.current, newBug];

    // 벌레 스폰 사운드 재생
    const weaponSounds = sounds['bug'];
    if (weaponSounds && weaponSounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * weaponSounds.length);
      const sound = weaponSounds[randomIndex].cloneNode() as HTMLAudioElement;
      sound.volume = 0.5;
      sound.play().catch((e) => console.log('Sound playback failed:', e));
    }
  };

  // 벌레 연속 스폰 시작
  const startBugSpawn = (x: number, y: number) => {
    isMouseDownRef.current = true;
    lastMousePosRef.current = { x, y };

    // 즉시 첫 번째 벌레 스폰
    spawnBug(x, y);

    // 100ms 간격으로 연속 스폰
    bugSpawnIntervalRef.current = setInterval(() => {
      if (isMouseDownRef.current) {
        const { x: lastX, y: lastY } = lastMousePosRef.current;
        // 약간의 랜덤 오프셋 추가
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        spawnBug(lastX + offsetX, lastY + offsetY);
      }
    }, 100);
  };

  // 벌레 연속 스폰 중지
  const stopBugSpawn = () => {
    isMouseDownRef.current = false;
    if (bugSpawnIntervalRef.current) {
      clearInterval(bugSpawnIntervalRef.current);
      bugSpawnIntervalRef.current = null;
    }
  };

  // 라이플 단일 발사 함수
  const fireRifle = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const weapon = WEAPONS['gun3'];
    let size: number;
    switch (weapon.crackSize) {
      case 'tiny':
        size = 15 + Math.random() * 10;
        break;
      case 'small':
        size = 30 + Math.random() * 20;
        break;
      case 'medium':
        size = 60 + Math.random() * 30;
        break;
      case 'large':
        size = 100 + Math.random() * 50;
        break;
    }

    // 벌레 공격 체크
    const hitBug = bugsRef.current.find(bug => {
      if (bug.isDead) return false;
      const distance = Math.sqrt(Math.pow(bug.x - x, 2) + Math.pow(bug.y - y, 2));
      return distance < bug.size + 20;
    });

    if (hitBug) {
      killBug(hitBug, x, y);
    } else {
      // 라이플 1발 발사
      const newCrack: Crack = {
        x,
        y,
        size,
        weapon: 'gun3',
        seed: Date.now()
      };
      setCracks((prev) => [...prev, newCrack]);
    }

    setHitCount((prev) => prev + 1);

    // 사운드 재생
    const weaponSounds = sounds['gun3'];
    if (weaponSounds && weaponSounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * weaponSounds.length);
      const sound = weaponSounds[randomIndex].cloneNode() as HTMLAudioElement;
      sound.volume = 0.7;
      sound.play().catch((e) => console.log('Sound playback failed:', e));
    }

    // 머즐 플래시
    setShowMuzzleFlash(true);
    const flashId = Date.now();
    setMuzzleFlashes((prev) => [...prev, { x, y, id: flashId }]);
    setTimeout(() => {
      setShowMuzzleFlash(false);
      setMuzzleFlashes((prev) => prev.filter((f) => f.id !== flashId));
    }, 150);

    // 플래시 효과
    if (canvas) {
      canvas.style.filter = 'brightness(1.3)';
      setTimeout(() => {
        canvas.style.filter = 'brightness(1)';
      }, 50);
    }
  };

  // 라이플 연속 발사 시작
  const startRifleFire = (x: number, y: number) => {
    isMouseDownRef.current = true;
    lastMousePosRef.current = { x, y };

    // 즉시 첫 발사
    fireRifle(x, y);

    // 80ms 간격으로 연속 발사
    rifleFireIntervalRef.current = setInterval(() => {
      if (isMouseDownRef.current) {
        const { x: lastX, y: lastY } = lastMousePosRef.current;
        // 약간의 반동 효과
        const recoilX = (Math.random() - 0.5) * 10;
        const recoilY = (Math.random() - 0.5) * 10;
        fireRifle(lastX + recoilX, lastY + recoilY);
      }
    }, 80);
  };

  // 라이플 연속 발사 중지
  const stopRifleFire = () => {
    isMouseDownRef.current = false;
    if (rifleFireIntervalRef.current) {
      clearInterval(rifleFireIntervalRef.current);
      rifleFireIntervalRef.current = null;
    }
  };

  // 캔버스 마우스 다운 핸들러
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 벌레 무기인 경우 연속 스폰 시작
    if (currentWeapon === 'bug') {
      startBugSpawn(x, y);
    }
    // 라이플인 경우 연속 발사 시작
    else if (currentWeapon === 'gun3') {
      startRifleFire(x, y);
    }
  };

  // 캔버스 마우스 업 핸들러
  const handleCanvasMouseUp = () => {
    if (currentWeapon === 'bug') {
      stopBugSpawn();
    } else if (currentWeapon === 'gun3') {
      stopRifleFire();
    }
  };

  // 캔버스 마우스 떠남 핸들러
  const handleCanvasMouseLeave = () => {
    if (currentWeapon === 'bug') {
      stopBugSpawn();
    } else if (currentWeapon === 'gun3') {
      stopRifleFire();
    }
  };

  // 벌레 죽이기 함수 (피 튀김 개수 제한)
  const killBug = (bug: Bug, hitX: number, hitY: number) => {
    // 피 효과 추가 (벌레 크기에 비례, 최대 개수 제한)
    const splatterId = Date.now() + Math.random();
    setBloodSplatters(prev => {
      const newSplatters = [...prev, { x: hitX, y: hitY, id: splatterId, size: bug.size }];
      // 최대 개수 초과 시 오래된 것부터 제거
      if (newSplatters.length > MAX_BLOOD_SPLATTERS) {
        return newSplatters.slice(-MAX_BLOOD_SPLATTERS);
      }
      return newSplatters;
    });

    // 2.5초 후 피 효과 제거 (벌레 페이드아웃보다 조금 늦게)
    setTimeout(() => {
      setBloodSplatters(prev => prev.filter(s => s.id !== splatterId));
    }, 2500);

    // 벌레 죽음 처리 (ref와 state 동시 업데이트)
    const updatedBugs = bugsRef.current.map(b =>
      b.id === bug.id
        ? { ...b, isDead: true, deathTime: Date.now() }
        : b
    );
    bugsRef.current = updatedBugs;
    setBugs(updatedBugs);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 벌레/라이플 무기인 경우 handleCanvasMouseDown에서 처리하므로 스킵
    if (currentWeapon === 'bug' || currentWeapon === 'gun3') {
      return;
    }

    // 다른 무기로 벌레 공격 체크
    const hitBug = bugsRef.current.find(bug => {
      if (bug.isDead) return false;
      const distance = Math.sqrt(Math.pow(bug.x - x, 2) + Math.pow(bug.y - y, 2));
      return distance < bug.size + 20; // 히트 판정 범위
    });

    if (hitBug) {
      killBug(hitBug, x, y);
      setHitCount((prev) => prev + 1);

      // Play sound
      const weaponSounds = sounds[currentWeapon];
      if (weaponSounds && weaponSounds.length > 0) {
        const randomIndex = Math.floor(Math.random() * weaponSounds.length);
        const sound = weaponSounds[randomIndex].cloneNode() as HTMLAudioElement;
        sound.volume = 0.7;
        sound.play().catch((e) => console.log('Sound playback failed:', e));
      }

      // Muzzle flash for guns
      if (currentWeapon.includes('gun')) {
        setShowMuzzleFlash(true);
        const flashId = Date.now();
        setMuzzleFlashes((prev) => [...prev, { x, y, id: flashId }]);
        setTimeout(() => {
          setShowMuzzleFlash(false);
          setMuzzleFlashes((prev) => prev.filter((f) => f.id !== flashId));
        }, 150);
      }

      // Flash effect
      if (canvas) {
        canvas.style.filter = 'brightness(1.3)';
        setTimeout(() => {
          canvas.style.filter = 'brightness(1)';
        }, 50);
      }
      return;
    }

    // 벌레가 없으면 기존 파괴 효과
    const weapon = WEAPONS[currentWeapon];
    let size: number;

    switch (weapon.crackSize) {
      case 'tiny':
        size = 15 + Math.random() * 10;
        break;
      case 'small':
        size = 30 + Math.random() * 20;
        break;
      case 'medium':
        size = 60 + Math.random() * 30;
        break;
      case 'large':
        size = 100 + Math.random() * 50;
        break;
    }

    // 라이플은 5발 연속 발사
    if (currentWeapon === 'gun3') {
      const newCracks: Crack[] = [];
      const baseSeed = Date.now();
      for (let i = 0; i < 5; i++) {
        // 수직 라인으로 5발 발사 (고정된 패턴)
        const offsetX = ((baseSeed + i * 1000) % 30) - 15;
        const offsetY = (i - 2) * 25 + ((baseSeed + i * 2000) % 10) - 5;
        newCracks.push({
          x: x + offsetX,
          y: y + offsetY,
          size: size * 0.7,
          weapon: currentWeapon,
          seed: baseSeed + i
        });
      }
      setCracks((prev) => [...prev, ...newCracks]);
      setHitCount((prev) => prev + 5);
    } else {
      const newCrack = { x, y, size, weapon: currentWeapon, seed: Date.now() };
      setCracks((prev) => [...prev, newCrack]);
      setHitCount((prev) => prev + 1);
    }

    // Play sound
    const weaponSounds = sounds[currentWeapon];
    if (weaponSounds && weaponSounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * weaponSounds.length);
      const sound = weaponSounds[randomIndex].cloneNode() as HTMLAudioElement;
      sound.volume = 0.7;
      sound.play().catch((e) => console.log('Sound playback failed:', e));
    }

    // Muzzle flash for guns
    if (currentWeapon.includes('gun')) {
      setShowMuzzleFlash(true);
      const flashId = Date.now();
      setMuzzleFlashes((prev) => [...prev, { x, y, id: flashId }]);
      setTimeout(() => {
        setShowMuzzleFlash(false);
        setMuzzleFlashes((prev) => prev.filter((f) => f.id !== flashId));
      }, 150);
    }

    // Flash effect
    if (canvas) {
      canvas.style.filter = 'brightness(1.3)';
      setTimeout(() => {
        canvas.style.filter = 'brightness(1)';
      }, 50);
    }
  };

  const handleReset = () => {
    setCracks([]);
    setHitCount(0);
    setBugs([]);
    bugsRef.current = [];
    setBloodSplatters([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawImage(ctx);
    }
  };

  return (
    <section className="bg-gray-100 border-2 border-gray-300 rounded p-8 shadow-md">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300">
        <span className="text-red-500 text-3xl font-black font-orbitron">
          03
        </span>
        <span className="text-gray-800 text-2xl font-bold tracking-[3px]">
          타겟 파괴
        </span>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6 p-5 bg-white border border-gray-300 rounded flex-wrap gap-5 shadow-sm">
        <div className="flex gap-8 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-gray-500 text-sm tracking-[2px]">활성 무기:</span>
            <span className="font-orbitron text-2xl font-bold text-blue-600">
              {WEAPONS[currentWeapon].code}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-gray-500 text-sm tracking-[2px]">공격 횟수:</span>
            <span className="font-orbitron text-2xl font-bold text-blue-600">
              {hitCount}
            </span>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setShowWeaponSelector(!showWeaponSelector)}
            className="relative bg-white text-blue-600 border-2 border-blue-500 rounded px-6 py-3 cursor-pointer font-rajdhani font-semibold tracking-[2px] transition-all duration-300 overflow-hidden group hover:bg-blue-500 hover:text-white hover:shadow-lg"
          >
            <span className="relative z-10">무기 변경</span>
          </button>

          <button
            onClick={handleReset}
            className="relative bg-white text-blue-600 border-2 border-blue-500 rounded px-6 py-3 cursor-pointer font-rajdhani font-semibold tracking-[2px] transition-all duration-300 overflow-hidden group hover:bg-blue-500 hover:text-white hover:shadow-lg"
          >
            <span className="relative z-10">화면 초기화</span>
          </button>

          <button
            onClick={onChangeImage}
            className="relative bg-white text-blue-600 border-2 border-blue-500 rounded px-6 py-3 cursor-pointer font-rajdhani font-semibold tracking-[2px] transition-all duration-300 overflow-hidden group hover:bg-blue-500 hover:text-white hover:shadow-lg"
          >
            <span className="relative z-10">새 타겟</span>
          </button>
        </div>
      </div>

      {/* Weapon Selector Overlay */}
      {showWeaponSelector && (
        <div className="mb-6">
          <WeaponSelector
            onWeaponSelect={(weapon) => onWeaponChange(weapon)}
            selectedWeapon={currentWeapon}
          />
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-[70vh] min-h-[500px] border-2 border-gray-300 rounded overflow-hidden bg-white shadow-lg cursor-none"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          className="w-full h-full block transition-all duration-[50ms]"
        />

        {/* Crosshair - 마우스 위치에 고정 (클릭 위치) */}
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)',
            willChange: 'left, top',
          }}
        >
          <div className="relative w-20 h-20">
            <div className="absolute w-full h-0.5 bg-red-500 opacity-80 top-1/2 -translate-y-1/2" />
            <div className="absolute h-full w-0.5 bg-red-500 opacity-80 left-1/2 -translate-x-1/2" />
            {/* 중앙 점 */}
            <div className="absolute w-2 h-2 bg-red-500 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 3D Weapon Cursor - 오프셋 위치에 무기 모형 */}
        <Weapon3DCursor
          weapon={currentWeapon}
          position={cursorPos}
          showMuzzleFlash={showMuzzleFlash}
        />

        {/* Muzzle Flash Effects */}
        {muzzleFlashes.map((flash) => (
          <div
            key={flash.id}
            className="absolute pointer-events-none z-40 animate-flash"
            style={{
              left: flash.x,
              top: flash.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-20 h-20 relative">
              <div className="absolute inset-0 bg-gradient-radial from-yellow-500 via-orange-500 to-transparent opacity-90 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-gradient-radial from-white via-yellow-300 to-transparent opacity-80 rounded-full" />
            </div>
          </div>
        ))}

        {/* Blood Splatter Effects (최적화됨 - 시드 기반 랜덤) */}
        {bloodSplatters.map((splatter) => {
          const splatSize = splatter.size * 2.5; // 벌레 크기에 비례
          const random = seededRandom(Math.floor(splatter.id)); // 시드 기반 랜덤
          return (
            <div
              key={splatter.id}
              className="absolute pointer-events-none z-30 animate-blood-splatter"
              style={{
                left: splatter.x,
                top: splatter.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 메인 피 얼룩 */}
              <div className="relative" style={{ width: `${splatSize}px`, height: `${splatSize}px` }}>
                <div className="absolute inset-0 bg-red-800 rounded-full blur-sm opacity-80"
                     style={{ clipPath: 'polygon(50% 0%, 80% 20%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 20%)' }} />
                <div className="absolute bg-red-600 rounded-full opacity-90"
                     style={{
                       inset: `${splatSize * 0.1}px`,
                       clipPath: 'polygon(50% 10%, 70% 30%, 90% 50%, 70% 70%, 50% 90%, 30% 70%, 10% 50%, 30% 30%)'
                     }} />
                {/* 피 튀김 (개수 줄임: 8 -> 4) */}
                {[...Array(4)].map((_, i) => {
                  const dropSize = (splatter.size / 25) * (8 + random() * 12);
                  const spreadDist = 30 + random() * 20;
                  return (
                    <div
                      key={i}
                      className="absolute bg-red-700 rounded-full"
                      style={{
                        width: `${dropSize}px`,
                        height: `${dropSize}px`,
                        left: `${50 + Math.cos(i * Math.PI / 2) * spreadDist}%`,
                        top: `${50 + Math.sin(i * Math.PI / 2) * spreadDist}%`,
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.7 + random() * 0.3,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bug Rendering (최적화됨 - transition 제거, will-change 추가) */}
        {bugs.map((bug) => (
          <div
            key={bug.id}
            className="absolute pointer-events-none z-20"
            style={{
              left: bug.x,
              top: bug.y,
              transform: `translate(-50%, -50%) rotate(${bug.angle + Math.PI / 2}rad)`,
              opacity: bug.opacity,
              willChange: 'left, top, transform, opacity',
            }}
          >
            {bug.isDead ? (
              // 죽은 벌레 (뒤집힌 모습)
              <div className="relative" style={{ transform: 'scaleY(-1)' }}>
                <span style={{ fontSize: `${bug.size}px`, filter: 'drop-shadow(0 0 5px rgba(139,0,0,0.8))' }}>
                  🪳
                </span>
                <div className="absolute inset-0 bg-red-900 rounded-full opacity-40 blur-sm" />
              </div>
            ) : (
              // 살아있는 벌레 (기어다니는 애니메이션)
              <span
                className="animate-wiggle"
                style={{ fontSize: `${bug.size}px`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              >
                🪳
              </span>
            )}
          </div>
        ))}

        {/* Targeting overlay corners */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-5 left-5 w-10 h-10 border-l-[3px] border-t-[3px] border-gray-400 opacity-60" />
          <div className="absolute top-5 right-5 w-10 h-10 border-r-[3px] border-t-[3px] border-gray-400 opacity-60" />
          <div className="absolute bottom-5 left-5 w-10 h-10 border-l-[3px] border-b-[3px] border-gray-400 opacity-60" />
          <div className="absolute bottom-5 right-5 w-10 h-10 border-r-[3px] border-b-[3px] border-gray-400 opacity-60" />
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        .font-orbitron {
          font-family: 'Orbitron', monospace;
        }

        .font-rajdhani {
          font-family: 'Rajdhani', sans-serif;
        }

        @keyframes flash {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.5);
          }
        }

        .animate-flash {
          animation: flash 150ms ease-out forwards;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(-5deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }

        .animate-wiggle {
          animation: wiggle 0.2s ease-in-out infinite;
        }

        @keyframes blood-splatter {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
        }

        .animate-blood-splatter {
          animation: blood-splatter 0.3s ease-out forwards;
        }
      `}</style>
    </section>
  );
}
