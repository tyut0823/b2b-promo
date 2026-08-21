import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useRouletteStore } from '../../stores/rouletteStore';
import Button from '../../shared/components/Button';
import RouletteWheel, { TARGET_ROTATION_MOD } from './RouletteWheel';

type Phase = 'idle' | 'spinning' | 'stopping' | 'done';

const SPIN_SPEED_DEG_PER_SEC = 480;
const STOP_DURATION_MS = 2200;
const EXTRA_SPINS = 4;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function RouletteModal() {
  const user = useAuthStore((s) => s.user);
  const hasRolledToday = useRouletteStore((s) => s.hasRolledToday);
  const roll = useRouletteStore((s) => s.roll);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const angleRef = useRef(0);
  const spinRafRef = useRef<number | null>(null);
  const stopRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (user && !hasRolledToday(user.id)) {
      setOpen(true);
      setPhase('spinning');
      phaseRef.current = 'spinning';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (phase !== 'spinning') return;
    let lastTime: number | null = null;

    function tick(now: number) {
      if (lastTime !== null) {
        angleRef.current += ((now - lastTime) / 1000) * SPIN_SPEED_DEG_PER_SEC;
        setAngle(angleRef.current);
      }
      lastTime = now;
      if (phaseRef.current === 'spinning') {
        spinRafRef.current = requestAnimationFrame(tick);
      }
    }
    spinRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
    };
  }, [phase]);

  useEffect(
    () => () => {
      if (spinRafRef.current !== null) cancelAnimationFrame(spinRafRef.current);
      if (stopRafRef.current !== null) cancelAnimationFrame(stopRafRef.current);
    },
    []
  );

  function handleStop() {
    if (!user) return;
    phaseRef.current = 'stopping';
    setPhase('stopping');

    const value = roll(user.id);
    const startAngle = angleRef.current;
    const targetMod = TARGET_ROTATION_MOD[value];
    const delta = (((targetMod - startAngle) % 360) + 360) % 360;
    const finalAngle = startAngle + EXTRA_SPINS * 360 + delta;
    let startTime: number | null = null;

    function tick(now: number) {
      if (startTime === null) startTime = now;
      const t = Math.min((now - startTime) / STOP_DURATION_MS, 1);
      angleRef.current = startAngle + (finalAngle - startAngle) * easeOutCubic(t);
      setAngle(angleRef.current);
      if (t < 1) {
        stopRafRef.current = requestAnimationFrame(tick);
      } else {
        setPhase('done');
        phaseRef.current = 'done';
        setResult(value);
      }
    }
    stopRafRef.current = requestAnimationFrame(tick);
  }

  if (!open) return null;

  return (
    <div className="roulette-overlay">
      <div className="roulette-modal">
        <h2>오늘의 신청 가능 개수</h2>
        <RouletteWheel angle={angle} />
        {phase === 'spinning' && <Button onClick={handleStop}>STOP</Button>}
        {phase === 'done' && result !== null && (
          <>
            <p>오늘은 샘플을 최대 {result}개까지 신청할 수 있어요!</p>
            <Button onClick={() => setOpen(false)}>확인</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default RouletteModal;
