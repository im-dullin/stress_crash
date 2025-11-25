'use client';

import dynamic from 'next/dynamic';

const StressAnnihilator = dynamic(() => import('@/components/StressAnnihilator'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center">
      <div className="text-[#00ff41] text-2xl font-mono">LOADING SYSTEM...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <StressAnnihilator />
    </main>
  );
}
