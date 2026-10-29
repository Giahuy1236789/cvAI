export const isJobicyJob = (job) => String(job?.source || '').trim().toLowerCase() === 'jobicy';
export const isMockVnJob = (job) => String(job?.source || '').trim().toLowerCase() === 'mockvn';

// Only open the original listing on Jobicy, never an arbitrary URL from a feed.
export const getJobicySourceUrl = (job) => {
  if (!isJobicyJob(job)) return '';
  try {
    const url = new URL(job.sourceUrl);
    if (url.protocol !== 'https:' || !['jobicy.com', 'www.jobicy.com'].includes(url.hostname)
      || url.username || url.password || url.port || !/^\/jobs\/[^/]+\/?$/.test(url.pathname)) return '';
    url.hostname = 'jobicy.com';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
};

export const getSourceUrl = (job) => {
  if (isJobicyJob(job)) return getJobicySourceUrl(job);
  if (isMockVnJob(job)) {
    try {
      const url = new URL(job.sourceUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {
      return '';
    }
  }
  return job?.sourceUrl || '';
};

const salaryPeriods = {
  year: 'năm', yearly: 'năm', annual: 'năm', annually: 'năm',
  month: 'tháng', monthly: 'tháng',
  week: 'tuần', weekly: 'tuần',
  day: 'ngày', daily: 'ngày',
  hour: 'giờ', hourly: 'giờ',
};

export const formatSalary = (job) => {
  const imported = isJobicyJob(job) || isMockVnJob(job);
  const currency = String(job.salaryCurrency || (imported ? '' : 'VND')).trim().toUpperCase();
  const period = salaryPeriods[String(job.salaryPeriod || (imported ? '' : 'month')).trim().toLowerCase()];
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;
  if (!hasMin && !hasMax) return imported ? 'Xem tại nguồn' : 'Lương thỏa thuận';
  if (!/^[A-Z]{3}$/.test(currency) || !period || (hasMin && hasMax && min > max)) return 'Xem tại nguồn';

  const amount = (value) => (currency === 'VND' ? value / 1000000 : value)
    .toLocaleString('vi-VN', { maximumFractionDigits: currency === 'VND' ? 1 : 2 });
  const unit = currency === 'VND' ? 'triệu VNĐ' : currency;
  const range = hasMin && hasMax ? (min === max ? amount(min) : `${amount(min)} – ${amount(max)}`)
    : hasMin ? `Từ ${amount(min)}` : `Đến ${amount(max)}`;
  return `${range} ${unit} / ${period}`;
};

export const formatDeadline = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

export const formatSyncedAt = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN');
};
