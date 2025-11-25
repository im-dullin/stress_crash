'use client';

import { useState } from 'react';
import GameCanvas from './GameCanvas';
import Header from './Header';
import UploadSection from './UploadSection';
import WeaponSelector from './WeaponSelector';

export type WeaponType = 'gun1' | 'gun2' | 'gun3' | 'knife' | 'bat' | 'hammer' | 'bug';

export interface Weapon {
  name: string;
  code: string;
  crackSize: 'tiny' | 'small' | 'medium' | 'large';
  modelPath: string | null;
  sounds: string[];
}

export const WEAPONS: Record<WeaponType, Weapon> = {
  gun1: {
    name: '권총 01',
    code: 'WPN-001',
    crackSize: 'small',
    modelPath: '/3dmodel/tt_pistol/tt_pistol.fbx',
    sounds: ['/sound/gunshot01.mp3'],
  },
  gun2: {
    name: '샷건',
    code: 'WPN-002',
    crackSize: 'medium',
    modelPath: '/3dmodel/shotgun/shotgun.fbx',
    sounds: ['/sound/gunshot02.mp3'],
  },
  gun3: {
    name: '라이플',
    code: 'WPN-003',
    crackSize: 'small',
    modelPath: '/3dmodel/Colt.fbx',
    sounds: ['/sound/silencer_gunshot.mp3'],
  },
  knife: {
    name: '칼',
    code: 'WPN-004',
    crackSize: 'medium',
    modelPath: null,
    sounds: ['/sound/knife.mp3'],
  },
  hammer: {
    name: '망치',
    code: 'WPN-006',
    crackSize: 'large',
    modelPath: '/3dmodel/Sledge hammer/Sledge hammer.fbx',
    sounds: ['/sound/hammer.mp3'],
  },
  bug: {
    name: '벌레',
    code: 'WPN-007',
    crackSize: 'tiny',
    modelPath: null,
    sounds: [],
  },
};

export default function StressAnnihilator() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'weapon' | 'game'>('upload');
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType | null>(null);
  const [showWeaponSelector, setShowWeaponSelector] = useState(false);

  const handleImageUpload = (img: HTMLImageElement) => {
    setUploadedImage(img);
    setCurrentStep('weapon');
  };

  const handleWeaponSelect = (weapon: WeaponType) => {
    setCurrentWeapon(weapon);
    setCurrentStep('game');
    setShowWeaponSelector(false);
  };

  const handleWeaponChange = (weapon: WeaponType) => {
    setCurrentWeapon(weapon);
    setShowWeaponSelector(false);
  };

  const handleChangeImage = () => {
    setUploadedImage(null);
    setCurrentWeapon(null);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen bg-white text-[#333333] relative overflow-x-hidden">
      <div className="container mx-auto px-5 py-5 relative z-10 max-w-[1600px]">
        <Header />

        {currentStep === 'upload' && (
          <UploadSection onImageUpload={handleImageUpload} />
        )}

        {currentStep === 'weapon' && (
          <WeaponSelector onWeaponSelect={handleWeaponSelect} />
        )}

        {currentStep === 'game' && uploadedImage && currentWeapon && (
          <GameCanvas
            uploadedImage={uploadedImage}
            currentWeapon={currentWeapon}
            onWeaponChange={handleWeaponChange}
            onChangeImage={handleChangeImage}
            showWeaponSelector={showWeaponSelector}
            setShowWeaponSelector={setShowWeaponSelector}
          />
        )}
      </div>

      <style jsx>{`
        .container {
          font-family: 'Rajdhani', 'Orbitron', monospace;
        }
      `}</style>
    </div>
  );
}
