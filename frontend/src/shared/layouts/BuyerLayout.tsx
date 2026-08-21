import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import RouletteModal from '../../features/roulette/RouletteModal';
import RouletteResultModal from '../../features/roulette/RouletteResultModal';
import { useRouletteStore } from '../../stores/rouletteStore';

function BuyerLayout() {
  const remaining = useRouletteStore((s) => s.remaining);
  const [showRouletteResult, setShowRouletteResult] = useState(false);

  return (
    <>
      <RouletteModal />
      {showRouletteResult && <RouletteResultModal onClose={() => setShowRouletteResult(false)} />}
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/samples" className="nav-logo">b2b-promo</Link>
          <nav className="nav-links">
            <NavLink to="/samples" className={({ isActive }) => (isActive ? 'nav-active' : '')}>샘플 목록</NavLink>
            <NavLink to="/applications/me" className={({ isActive }) => (isActive ? 'nav-active' : '')}>내 신청 내역</NavLink>
            <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'nav-active' : '')}>마이페이지</NavLink>
            <button type="button" className="nav-roulette-count" onClick={() => setShowRouletteResult(true)}>
              오늘 신청 가능한 샘플 개수 : {remaining}개
            </button>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export default BuyerLayout;
