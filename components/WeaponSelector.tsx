'use client';

import { WEAPONS, WeaponType } from './StressAnnihilator';

interface WeaponSelectorProps {
  onWeaponSelect: (weapon: WeaponType) => void;
  selectedWeapon?: WeaponType | null;
}

const weaponIcons: Record<WeaponType, string> = {
  gun1: '🔫',
  gun2: '💥',
  gun3: '🎯',
  knife: '🗡️',
  bat: '🏏',
  hammer: '🔨',
  bug: '🐛',
};

export default function WeaponSelector({
  onWeaponSelect,
  selectedWeapon,
}: WeaponSelectorProps) {
  return (
    <section className="bg-gray-100 border-2 border-gray-300 rounded p-8 mb-8 shadow-md">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300">
        <span className="text-red-500 text-3xl font-black font-orbitron">
          02
        </span>
        <span className="text-gray-800 text-2xl font-bold tracking-[3px]">
          무기 선택
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
        {(Object.keys(WEAPONS) as WeaponType[]).map((weaponKey) => {
          const weapon = WEAPONS[weaponKey];
          const isSelected = selectedWeapon === weaponKey;

          return (
            <button
              key={weaponKey}
              onClick={() => onWeaponSelect(weaponKey)}
              className={`relative bg-white border-2 ${
                isSelected
                  ? 'border-red-500 shadow-lg'
                  : 'border-gray-300'
              } rounded p-8 cursor-pointer transition-all duration-300 flex flex-col items-center gap-4 overflow-hidden group hover:border-blue-500 hover:bg-blue-50 hover:-translate-y-1 hover:shadow-lg`}
            >
              {/* Corner frames */}
              <div className="absolute top-2.5 left-2.5 w-5 h-5 border-l-2 border-t-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-2.5 right-2.5 w-5 h-5 border-r-2 border-t-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-l-2 border-b-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-r-2 border-b-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              {isSelected && (
                <>
                  <div className="absolute top-2.5 left-2.5 w-5 h-5 border-l-2 border-t-2 border-red-500" />
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 border-r-2 border-t-2 border-red-500" />
                  <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-l-2 border-b-2 border-red-500" />
                  <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-r-2 border-b-2 border-red-500" />
                </>
              )}

              <span className="text-5xl">
                {weaponIcons[weaponKey]}
              </span>

              <span className="font-bold text-lg tracking-[2px] text-gray-800">
                {weapon.name}
              </span>

              <span className="font-mono text-sm text-gray-500 tracking-wider">
                {weapon.code}
              </span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap');

        .font-orbitron {
          font-family: 'Orbitron', monospace;
        }
      `}</style>
    </section>
  );
}
