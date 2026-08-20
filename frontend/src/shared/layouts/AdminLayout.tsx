import { Link, NavLink, Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/admin/samples" className="nav-logo">b2b-promo</Link>
          <nav className="nav-links">
            <NavLink to="/admin/samples" className={({ isActive }) => (isActive ? 'nav-active' : '')}>샘플 관리</NavLink>
            <NavLink to="/mypage" className={({ isActive }) => (isActive ? 'nav-active' : '')}>마이페이지</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export default AdminLayout;
