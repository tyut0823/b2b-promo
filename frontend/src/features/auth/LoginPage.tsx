import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from './useAuthMutations';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--color-primary)',
          borderRadius: 8,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h1 style={{ color: 'var(--color-white)', fontSize: 24, marginBottom: 8 }}>b2b-promo</h1>

        <div>
          <label htmlFor="email" style={{ color: 'var(--color-white)', display: 'block', marginBottom: 4 }}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              padding: '0 12px',
              borderRadius: 4,
              border: '1px solid var(--color-white)',
              background: 'transparent',
              color: 'var(--color-white)',
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ color: 'var(--color-white)', display: 'block', marginBottom: 4 }}>
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              padding: '0 12px',
              borderRadius: 4,
              border: '1px solid var(--color-white)',
              background: 'transparent',
              color: 'var(--color-white)',
            }}
          />
        </div>

        {mutation.isError && (
          <p style={{ color: 'var(--color-status-danger)' }}>{mutation.error.message}</p>
        )}

        <button
          type="submit"
          style={{
            height: 44,
            borderRadius: 6,
            border: 'none',
            background: 'var(--color-white)',
            color: 'var(--color-primary)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          로그인
        </button>

        <Link to="/signup" style={{ color: 'var(--color-white)', textAlign: 'center' }}>
          회원가입하기
        </Link>
      </form>
    </div>
  );
}

export default LoginPage;
