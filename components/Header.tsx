'use client';

import { useEffect, useState } from 'react';

export default function Header() {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    const updateTimestamp = () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}.${String(now.getDate()).padStart(2, '0')}`;
      setTimestamp(`${date} | ${time}`);
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="text-center mb-10 p-8 bg-gray-100 border-2 border-gray-300 rounded relative overflow-hidden shadow-lg">
      {/* Scan line animation */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan" />

      <div className="flex justify-between items-center mb-5 text-sm tracking-[2px] text-blue-600">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse-dot" />
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="font-mono font-medium text-gray-600">{timestamp}</div>
      </div>

      <h1 className="text-5xl md:text-6xl font-black mb-4 text-gray-800 tracking-[8px] font-orbitron relative">
        스트레스 파괴자
      </h1>

      <div className="text-lg tracking-[4px] text-gray-600 font-medium">
        <span className="text-red-500 font-bold">[</span>
        <span className="mx-2">Made by. 김동엽</span>
        <span className="text-red-500 font-bold">]</span>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .animate-scan {
          animation: scan 3s infinite;
        }

        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .animate-pulse-dot {
          animation: pulse-dot 2s infinite;
        }

        .shadow-glow {
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.5),
            0 0 20px rgba(0, 255, 65, 0.5), 0 0 30px rgba(0, 255, 65, 0.5);
        }

        .glitch::before,
        .glitch::after {
          content: '스트레스 파괴자';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .glitch::before {
          animation: glitch-1 2.5s infinite;
          color: #00d4ff;
          z-index: -1;
        }

        .glitch::after {
          animation: glitch-2 2s infinite;
          color: #ff0051;
          z-index: -2;
        }

        @keyframes glitch-1 {
          0%,
          100% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
        }

        @keyframes glitch-2 {
          0%,
          100% {
            transform: translate(0);
          }
          25% {
            transform: translate(2px, -2px);
          }
          50% {
            transform: translate(-2px, 2px);
          }
          75% {
            transform: translate(2px, 2px);
          }
        }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        .font-orbitron {
          font-family: 'Orbitron', monospace;
        }
      `}</style>
    </header>
  );
}
