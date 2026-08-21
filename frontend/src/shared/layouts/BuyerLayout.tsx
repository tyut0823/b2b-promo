import { Link, NavLink, Outlet } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import RouletteModal from '../../features/roulette/RouletteModal';

function BuyerLayout() {
  return (
    <>
      <RouletteModal />
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/samples" className="nav-logo">b2b-promo</Link>
          <nav className="nav-links">
            <NavLink to="/samples" className={({ isActive }) => (isActive ? 'nav-active' : '')}>샘플 목록</NavLink>
            <NavLink to="/applications/me" className={({ isActive }) => (isActive ? 'nav-active' : '')}>내 신청 내역</NavLink>
            <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'nav-active' : '')}>마이페이지</NavLink>
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
