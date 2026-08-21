import { useNavigate } from 'react-router-dom';
import Card from '../../shared/components/Card';
import { useSampleList } from './useSampleQueries';
import { getStatusBadge } from './statusBadge';
import { resolveAssetUrl } from '../../shared/httpClient';

function SampleListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSampleList();

  if (isLoading) return <p>불러오는 중...</p>;
  if (isError) return <p>{(error as Error).message}</p>;

  return (
    <div className="sample-grid">
      {data?.map((s) => {
        const badge = getStatusBadge(s.status);
        return (
          <Card key={s.id} className="sample-card" onClick={() => navigate(`/samples/${s.id}`)}>
            <img src={resolveAssetUrl(s.image_url)} alt={s.name} />
            <div>
              <h2>{s.name}</h2>
              <p>
                {s.start_date} ~ {s.end_date}
              </p>
              <span className="badge" style={{ color: badge.color }}>
                <span aria-hidden="true">●</span> <span>{badge.label}</span>
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default SampleListPage;
