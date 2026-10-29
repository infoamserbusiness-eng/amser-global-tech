"use client";

import { useEffect, useRef } from "react";

// Globo interactivo del hero: órbitas animadas + nodos que pulsan. El globo sigue sutilmente al cursor.
export function Globe() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 24;
      const y = ((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 24;
      el.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${-y}deg)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const nodes = [
    [118, 142], [356, 118], [150, 300], [330, 292], [250, 70], [388, 210],
  ];

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[480px] transition-transform duration-200 ease-out" aria-hidden>
      <svg viewBox="0 0 500 500" className="h-full w-full" style={{ animation: "float 7s ease-in-out infinite" }}>
        <defs>
          <radialGradient id="g-sphere" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#2c8cff" stopOpacity=".95" />
            <stop offset=".55" stopColor="#0b3d8f" />
            <stop offset="1" stopColor="#06142e" />
          </radialGradient>
          <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#3ed16a" stopOpacity=".35" />
            <stop offset="1" stopColor="#3ed16a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="c-sphere"><circle cx="250" cy="250" r="150" /></clipPath>
        </defs>
        <circle cx="250" cy="250" r="235" fill="url(#g-glow)" />
        <circle cx="250" cy="250" r="150" fill="url(#g-sphere)" />
        {/* meridianos y paralelos */}
        <g clipPath="url(#c-sphere)" stroke="#7fb6ff" strokeOpacity=".28" fill="none">
          {[-90, -45, 0, 45, 90].map((o) => (
            <ellipse key={o} cx="250" cy="250" rx={Math.abs(150 * Math.cos((o * Math.PI) / 180)) + 4} ry="150" />
          ))}
          {[-100, -50, 0, 50, 100].map((y) => (
            <ellipse key={y} cx="250" cy={250 + y} rx={Math.sqrt(150 ** 2 - y ** 2)} ry="14" />
          ))}
          <path d="M165 215c20-30 55-34 72-10s-4 44-26 52-60-4-46-42Z M280 180c24-14 52 4 50 30s-30 30-48 16-14-34-2-46Z M255 300c20-6 46 8 40 30s-34 22-46 8-10-32 6-38Z" fill="#3ed16a" fillOpacity=".5" stroke="none" />
        </g>
        {/* órbitas */}
        <g style={{ transformOrigin: "250px 250px", animation: "orbit 22s linear infinite" }} fill="none" strokeWidth="2">
          <ellipse cx="250" cy="250" rx="215" ry="82" transform="rotate(-24 250 250)" stroke="#3ed16a" strokeOpacity=".85" />
          <ellipse cx="250" cy="250" rx="200" ry="104" transform="rotate(18 250 250)" stroke="#1f7ae0" strokeOpacity=".8" />
        </g>
        <g style={{ transformOrigin: "250px 250px", animation: "orbit 34s linear infinite reverse" }} fill="none" strokeWidth="1.4">
          <ellipse cx="250" cy="250" rx="228" ry="60" transform="rotate(48 250 250)" stroke="#9fd4ff" strokeOpacity=".6" />
        </g>
        {nodes.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="14" fill="#fff" fillOpacity=".12" />
            <circle cx={x} cy={y} r="5" fill="#fff" style={{ animation: `pulse-node ${2 + (i % 3) * 0.7}s ease-in-out ${i * 0.3}s infinite` }} />
          </g>
        ))}
        {/* escudo/libro */}
        <path d="M92 150v150c0 40 60 60 158 96 98-36 158-56 158-96V150" fill="none" stroke="#dfe8f6" strokeOpacity=".85" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
