import { Link, useParams } from 'react-router-dom';
import { useSampleDetail } from './useSampleQueries';
import { getStatusBadge } from './statusBadge';
import { useMyApplications } from '../application/useApplicationQueries';
import { useApply, useCancelApply } from '../application/useApplicationMutations';
import Button from '../../shared/components/Button';
import { resolveAssetUrl } from '../../shared/httpClient';
import { formatDate } from '../../shared/formatDate';

function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useSampleDetail(id);
  const { data: applications } = useMyApplications();
  const myApplication = applications?.find((a) => a.sample_id === id && a.status === 'APPLIED');
  const applyMutation = useApply();
  const cancelMutation = useCancelApply();

  return (
    <div>
      <Link to="/samples">← 목록으로</Link>
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p>샘플을 찾을 수 없습니다.</p>}
      {data && (
        <div className="sample-detail">
          <img src={resolveAssetUrl(data.image_url)} alt={data.name} />
          <div>
            <h1>{data.name}</h1>
            <p>{data.description ?? ''}</p>
            <p>
              {formatDate(data.start_date)} ~ {formatDate(data.end_date)}
            </p>
            <span className="badge" style={{ color: getStatusBadge(data.status).color }}>
              <span aria-hidden="true">●</span> <span>{getStatusBadge(data.status).label}</span>
            </span>
            {data.status === 'ONGOING' &&
              (myApplication ? (
                <Button
                  variant="danger"
                  onClick={() => cancelMutation.mutate(myApplication.id)}
                  disabled={cancelMutation.isPending}
                >
                  신청 취소
                </Button>
              ) : (
                <Button onClick={() => applyMutation.mutate(id!)} disabled={applyMutation.isPending}>
                  신청하기
                </Button>
              ))}
            {applyMutation.isError && <p style={{ color: 'var(--color-status-danger)' }}>{applyMutation.error.message}</p>}
            {cancelMutation.isError && <p style={{ color: 'var(--color-status-danger)' }}>{cancelMutation.error.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SampleDetailPage;
