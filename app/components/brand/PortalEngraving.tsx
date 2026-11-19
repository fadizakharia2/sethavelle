/**
 * An original line engraving: two Egyptian pylons flanking a gothic lancet
 * arch, a sun disk caught in the arch, fluted pilasters and a stepped
 * threshold. Generated from a few rules so the line work stays consistent.
 */
export function PortalEngraving({ className = "" }: { className?: string }) {
  const W = 1200;
  const H = 900;
  const cx = W / 2;
  const paths: string[] = [];

  // Concentric lancet arches (pointed): each arc pair meets at the apex.
  for (let i = 0; i < 7; i++) {
    const half = 150 + i * 26;
    const spring = 430 + i * 6;
    const apex = 150 - i * 22;
    const r = half * 1.65;
    paths.push(
      `M${cx - half} ${H - 60} V${spring} A${r} ${r} 0 0 1 ${cx} ${apex} A${r} ${r} 0 0 1 ${cx + half} ${spring} V${H - 60}`,
    );
  }

  // Pylons: battered (sloped) towers with horizontal coursing.
  for (const side of [-1, 1]) {
    const inner = cx + side * 360;
    const outer = cx + side * 560;
    const topOuter = cx + side * 528;
    paths.push(`M${inner} ${H - 60} L${inner} 120 L${topOuter} 120 L${outer} ${H - 60}`);
    paths.push(`M${inner} 150 L${topOuter + side * -2} 150`);
    for (let y = 200; y < H - 60; y += 46) {
      const t = (y - 120) / (H - 180);
      const x2 = topOuter + side * (t * 32);
      paths.push(`M${inner} ${y} L${x2} ${y}`);
    }
    // Torus moulding and cornice
    paths.push(
      `M${inner - side * 4} 112 L${topOuter + side * 12} 112 L${topOuter + side * 16} 96 L${inner - side * 8} 96`,
    );
    // Fluted pilaster beside the arch
    for (let f = 0; f < 5; f++) {
      const x = cx + side * (196 + f * 7);
      paths.push(`M${x} ${H - 60} V470`);
    }
  }

  // Sun disk with rays inside the arch.
  const sunY = 330;
  const rays: string[] = [];
  for (let a = 0; a < 48; a++) {
    const angle = (a / 48) * Math.PI * 2;
    const r1 = 64;
    const r2 = a % 2 === 0 ? 118 : 92;
    rays.push(
      `M${cx + Math.cos(angle) * r1} ${sunY + Math.sin(angle) * r1} L${cx + Math.cos(angle) * r2} ${sunY + Math.sin(angle) * r2}`,
    );
  }

  // Stepped threshold.
  for (let s = 0; s < 4; s++) {
    const w = 640 + s * 120;
    const y = H - 60 + s * 14;
    paths.push(`M${cx - w / 2} ${y} H${cx + w / 2}`);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={0.8}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
      <circle cx={cx} cy={sunY} r={56} />
      <circle cx={cx} cy={sunY} r={46} strokeOpacity={0.6} />
      <path d={rays.join(" ")} strokeOpacity={0.55} />
      <path d={`M${cx} 60 V${H - 60}`} strokeOpacity={0.25} strokeDasharray="2 10" />
    </svg>
  );
}
