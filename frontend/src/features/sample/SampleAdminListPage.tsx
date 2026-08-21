import { useNavigate } from 'react-router-dom';
import Button from '../../shared/components/Button';
import { useSampleList } from './useSampleQueries';
import { formatDate } from '../../shared/formatDate';

function SampleAdminListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSampleList();

  if (isLoading) return <p>불러오는 중...</p>;
  if (isError) return <p>{(error as Error).message}</p>;

  return (
    <div>
      <h1>
        샘플 관리 <Button onClick={() => navigate('/admin/samples/new')}>+ 샘플 등록</Button>
      </h1>
      <div className="admin-table">
        <div className="admin-table-head">
          <span className="admin-table-cell">샘플명</span>
          <span className="admin-table-cell">신청기간</span>
          <span className="admin-table-cell">액션</span>
        </div>
        {data?.map((s) => (
          <div className="admin-table-row" key={s.id}>
            <span className="admin-table-cell">{s.name}</span>
            <span className="admin-table-cell">
              {formatDate(s.start_date)} ~ {formatDate(s.end_date)}
            </span>
            <span className="admin-table-cell">
              <div className="admin-table-actions">
                <Button variant="secondary" onClick={() => navigate(`/admin/samples/${s.id}/edit`)}>
                  수정
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/admin/samples/${s.id}/applications`, { state: { sampleName: s.name } })}
                >
                  신청현황
                </Button>
              </div>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SampleAdminListPage;
