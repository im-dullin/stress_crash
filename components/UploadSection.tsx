'use client';

import { useRef, useState } from 'react';

interface UploadSectionProps {
  onImageUpload: (img: HTMLImageElement) => void;
}

export default function UploadSection({ onImageUpload }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          onImageUpload(img);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  return (
    <section className="bg-gray-100 border-2 border-gray-300 rounded p-8 mb-8 shadow-md">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300">
        <span className="text-red-500 text-3xl font-black font-orbitron">
          01
        </span>
        <span className="text-gray-800 text-2xl font-bold tracking-[3px]">
          타겟 지정
        </span>
      </div>

      <div
        className={`border-2 border-dashed ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
        } rounded p-16 text-center cursor-pointer transition-all duration-300 bg-white relative overflow-hidden group hover:border-blue-500 hover:shadow-lg`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[600ms]" />

        <div className="relative pointer-events-none">
          {/* Crosshair */}
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute w-full h-0.5 bg-blue-500 top-1/2 -translate-y-1/2" />
            <div className="absolute h-full w-0.5 bg-blue-500 left-1/2 -translate-x-1/2" />
          </div>

          <h2 className="text-gray-800 mb-4 text-3xl tracking-[3px] font-bold">
            타겟 이미지 업로드
          </h2>
          <p className="text-gray-500 text-lg tracking-[2px] mb-5">
            클릭 또는 드래그하여 타겟 지정
          </p>

          <div className="inline-block mt-5 px-5 py-2.5 bg-blue-50 border border-blue-500 rounded-sm font-mono text-sm tracking-[2px] text-blue-600 animate-blink">
            대기 중...
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <style jsx>{`
        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0.5;
          }
        }

        .animate-blink {
          animation: blink 2s infinite;
        }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap');

        .font-orbitron {
          font-family: 'Orbitron', monospace;
        }
      `}</style>
    </section>
  );
}
