import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

function LogoutButton() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <button type="button" className="nav-logout" onClick={handleLogout}>
      로그아웃
    </button>
  );
}

export default LogoutButton;
