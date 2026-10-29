import api from './api.js';

const pendingRequests = new Map();

// Share in-flight AI requests across page mounts (including StrictMode).
// Each page ignores results after unmount; aborting here would cancel other readers.
export function getRecommendations({ jobId, fast = false, cvId } = {}) {
  let path = jobId !== undefined
    ? `/recommendations/${encodeURIComponent(jobId)}`
    : `/recommendations`;
    
  const queryParams = new URLSearchParams();
  if (fast) queryParams.set('mode', 'fast');
  if (cvId) queryParams.set('cvId', cvId);
  
  if (queryParams.toString()) {
    path += `?${queryParams.toString()}`;
  }
  
  const key = JSON.stringify([localStorage.getItem('token'), path]);
  if (pendingRequests.has(key)) return pendingRequests.get(key);

  const request = api.get(path).finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, request);
  return request;
}
