import { useMyApplications } from './useApplicationQueries';
import { useApply, useCancelApply } from './useApplicationMutations';
import Button from '../../shared/components/Button';
import Card from '../../shared/components/Card';

function MyApplicationsPage() {
  const { data, isLoading, isError, error } = useMyApplications();
  const applyMutation = useApply();
  const cancelMutation = useCancelApply();

  if (isLoading) return <p>불러오는 중...</p>;
  if (isError) return <p>{error.message}</p>;

  return (
    <div className="sample-grid">
      {data!.map((item) => (
        <Card key={item.id} className="sample-card">
          <div>
            <h2>{item.sample.name}</h2>
            <p>
              {item.sample.start_date} ~ {item.sample.end_date}
            </p>
            <p>상태: {item.status === 'APPLIED' ? '신청' : '취소'}</p>
            {item.status === 'APPLIED' && (
              <Button variant="danger" onClick={() => cancelMutation.mutate(item.id)} disabled={cancelMutation.isPending}>
                취소
              </Button>
            )}
            {item.status === 'CANCELLED' && (
              <Button
                onClick={() => applyMutation.mutate(item.sample.id)}
                disabled={applyMutation.isPending || item.sample.status === 'ENDED'}
              >
                재신청
              </Button>
            )}
          </div>
        </Card>
      ))}
      {applyMutation.isError && <p style={{ color: 'var(--color-status-danger)' }}>{applyMutation.error.message}</p>}
      {cancelMutation.isError && <p style={{ color: 'var(--color-status-danger)' }}>{cancelMutation.error.message}</p>}
    </div>
  );
}

export default MyApplicationsPage;
