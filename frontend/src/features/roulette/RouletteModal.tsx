import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useRouletteStore } from '../../stores/rouletteStore';
import Button from '../../shared/components/Button';

function RouletteModal() {
  const user = useAuthStore((s) => s.user);
  const hasRolledToday = useRouletteStore((s) => s.hasRolledToday);
  const roll = useRouletteStore((s) => s.roll);

  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState(1);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    if (user && !hasRolledToday(user.id)) {
      setOpen(true);
      setSpinning(true);
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!spinning || !user) return;
    let ticks = 0;
    const interval = setInterval(() => {
      setDisplay((prev) => (prev % 3) + 1);
      ticks += 1;
      if (ticks > 12) {
        clearInterval(interval);
        const value = roll(user.id);
        setDisplay(value);
        setResult(value);
        setSpinning(false);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [spinning, user, roll]);

  if (!open) return null;

  return (
    <div className="roulette-overlay">
      <div className="roulette-modal">
        <h2>오늘의 신청 가능 개수</h2>
        <div className={`roulette-card ${spinning ? 'roulette-spinning' : ''}`}>{display}</div>
        {result !== null && (
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
