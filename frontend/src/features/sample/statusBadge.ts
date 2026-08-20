import type { SampleStatus } from '../../shared/types';

const STATUS_BADGE: Record<SampleStatus, { color: string; label: string }> = {
  SCHEDULED: { color: 'var(--color-status-warn)', label: '신청 예정' },
  ONGOING: { color: 'var(--color-status-ok)', label: '신청 가능' },
  ENDED: { color: 'var(--color-status-danger)', label: '신청 종료' },
};

export function getStatusBadge(status: SampleStatus) {
  return STATUS_BADGE[status];
}
