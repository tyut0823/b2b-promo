import { Link, useLocation, useParams } from 'react-router-dom';
import { useSampleApplications } from './useApplicationQueries';

function ApplicationStatusPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const sampleName = (location.state as { sampleName?: string } | null)?.sampleName;
  const { data, isLoading, isError, error } = useSampleApplications(id);

  return (
    <div>
      <Link to="/admin/samples">← 목록으로</Link>
      <h1>{sampleName ? `${sampleName} - 신청 현황` : '신청 현황'}</h1>
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p>{(error as Error).message}</p>}
      {data && (
        <div className="admin-table">
          <div className="admin-table-head">
            <span className="admin-table-cell">거래처명</span>
            <span className="admin-table-cell">담당자명</span>
            <span className="admin-table-cell">상태</span>
          </div>
          {data.map((item) => (
            <div className="admin-table-row" key={item.id}>
              <span className="admin-table-cell">{item.user.company_name}</span>
              <span className="admin-table-cell">{item.user.name}</span>
              <span className="admin-table-cell">{item.status === 'APPLIED' ? '신청' : '취소'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApplicationStatusPage;
