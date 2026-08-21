import { useRouletteStore } from '../../stores/rouletteStore';
import Button from '../../shared/components/Button';
import RouletteWheel, { TARGET_ROTATION_MOD } from './RouletteWheel';

type Props = { onClose: () => void };

function RouletteResultModal({ onClose }: Props) {
  const total = useRouletteStore((s) => s.total);
  const remaining = useRouletteStore((s) => s.remaining);
  const angle = TARGET_ROTATION_MOD[total] ?? 0;

  return (
    <div className="roulette-overlay">
      <div className="roulette-modal">
        <h2>오늘의 룰렛 결과</h2>
        <RouletteWheel angle={angle} />
        <p>
          오늘 뽑은 개수: {total}개 (남은 개수: {remaining}개)
        </p>
        <Button onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}

export default RouletteResultModal;
