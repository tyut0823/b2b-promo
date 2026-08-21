type Segment = { value: number; color: string };

export const SEGMENTS: Segment[] = [
  { value: 1, color: 'var(--color-primary)' },
  { value: 2, color: 'var(--color-status-warn)' },
  { value: 3, color: 'var(--color-status-danger)' },
];

// 각 값(1~3)이 뽑혔을 때, 화면 상단(고정된 포인터) 위치에 그 조각이 오도록 하는 회전각(mod 360).
export const TARGET_ROTATION_MOD: Record<number, number> = { 1: 300, 2: 180, 3: 60 };

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y} Z`;
}

type Props = { angle: number; size?: number };

function RouletteWheel({ angle, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <div className="roulette-wheel-wrap" style={{ width: size, height: size }}>
      <div className="roulette-wheel-pointer" />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${angle}deg)` }}>
        {SEGMENTS.map((seg, i) => {
          const startAngle = i * 120;
          const endAngle = startAngle + 120;
          const mid = (startAngle + endAngle) / 2;
          const labelPos = polarToCartesian(cx, cy, r * 0.6, mid);
          return (
            <g key={seg.value}>
              <path d={describeSlice(cx, cy, r, startAngle, endAngle)} fill={seg.color} stroke="#fff" strokeWidth={2} />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="#fff"
                fontSize={size * 0.14}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {seg.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default RouletteWheel;
