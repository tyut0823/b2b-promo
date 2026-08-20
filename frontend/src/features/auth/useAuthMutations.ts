import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { signup, login } from './authApi';
import { useAuthStore } from '../../stores/authStore';

export function useSignup() {
  return useMutation({ mutationFn: signup });
}

export function useLogin() {
  const loginToStore = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      loginToStore({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      const role = useAuthStore.getState().user?.role;
      navigate(role === 'ADMIN' ? '/admin/samples' : '/samples', { replace: true });
    },
  });
}
