import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';
import { useSampleDetail } from './useSampleQueries';
import { useCreateSample, useUpdateSample, useUploadSampleImage } from './useSampleMutations';
import { resolveAssetUrl } from '../../shared/httpClient';

function SampleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useSampleDetail(id);
  const createMutation = useCreateSample();
  const updateMutation = useUpdateSample();
  const uploadMutation = useUploadSampleImage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? '');
      setImageUrl(data.image_url ?? '');
      setStartDate(data.start_date.slice(0, 10));
      setEndDate(data.end_date.slice(0, 10));
    }
  }, [data]);

  const mutation = id ? updateMutation : createMutation;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file, { onSuccess: (result) => setImageUrl(result.url) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name,
      description: description || null,
      image_url: imageUrl || null,
      start_date: startDate,
      end_date: endDate,
    };
    if (id) {
      updateMutation.mutate({ id, body }, { onSuccess: () => navigate('/admin/samples') });
    } else {
      createMutation.mutate(body, { onSuccess: () => navigate('/admin/samples') });
    }
  }

  return (
    <div>
      <Link to="/admin/samples">← 목록으로</Link>
      <h1>{id ? '샘플 수정' : '샘플 등록'}</h1>
      <form onSubmit={handleSubmit}>
        <Input
          id="sample-name"
          label="샘플명"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="field">
          <label htmlFor="sample-description">설명</label>
          <textarea
            id="sample-description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="sample-form-row">
          <div className="field">
            <label htmlFor="sample-image-file">이미지</label>
            <input id="sample-image-file" type="file" accept="image/*" onChange={handleFileChange} />
            {uploadMutation.isPending && <p>업로드 중...</p>}
            {uploadMutation.isError && (
              <p style={{ color: 'var(--color-status-danger)' }}>{uploadMutation.error.message}</p>
            )}
            {imageUrl && <img src={resolveAssetUrl(imageUrl)} alt="미리보기" style={{ width: 96, height: 96, objectFit: 'cover' }} />}
          </div>
          <Input
            id="sample-start-date"
            label="신청 시작일"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            id="sample-end-date"
            label="신청 종료일"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || uploadMutation.isPending}>
          저장하기
        </Button>
        {mutation.isError && <p style={{ color: 'var(--color-status-danger)' }}>{mutation.error.message}</p>}
      </form>
    </div>
  );
}

export default SampleFormPage;
