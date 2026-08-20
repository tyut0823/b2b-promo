import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from './useMyPageQueries';
import { useUpdateProfile, useChangePassword } from './useMyPageMutations';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';

function MyPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMe();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCompanyName(data.company_name ?? '');
    }
  }, [data]);

  if (isLoading) return <p className="container">불러오는 중...</p>;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ name, company_name: companyName || null });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changePasswordMutation.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
        },
      },
    );
  };

  return (
    <div className="container">
      <button onClick={() => navigate(-1)}>← 뒤로</button>
      <h1>마이페이지</h1>
      <div className="mypage-sections">
        <section>
          <h2>내 정보</h2>
          <form onSubmit={handleProfileSubmit}>
            <Input
              id="name"
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              id="companyName"
              label="소속 거래처명"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              내 정보 저장
            </Button>
            {updateProfileMutation.isError && (
              <p style={{ color: 'var(--color-status-danger)' }}>{updateProfileMutation.error.message}</p>
            )}
          </form>
        </section>
        <section>
          <h2>비밀번호 변경</h2>
          <form onSubmit={handlePasswordSubmit}>
            <Input
              id="currentPassword"
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              id="newPassword"
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              비밀번호 변경
            </Button>
            {changePasswordMutation.isError && (
              <p style={{ color: 'var(--color-status-danger)' }}>{changePasswordMutation.error.message}</p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

export default MyPage;
