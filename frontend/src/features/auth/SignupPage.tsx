import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from './useAuthMutations';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
};

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const mutation = useSignup();
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { email, password, name, company_name: companyName },
      { onSuccess: () => navigate('/login') }
    );
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
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>회원가입</h1>

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 4 }}>
            이름
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="company_name" style={{ display: 'block', marginBottom: 4 }}>
            소속 거래처명
          </label>
          <input
            id="company_name"
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={inputStyle}
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
            background: 'var(--color-primary)',
            color: 'var(--color-white)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          가입하기
        </button>

        <Link to="/login" style={{ color: 'var(--color-text)', textAlign: 'center' }}>
          로그인 화면으로
        </Link>
      </form>
    </div>
  );
}

export default SignupPage;
