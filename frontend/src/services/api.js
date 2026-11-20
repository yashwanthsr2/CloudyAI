const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * PRIVACLOUD AI API Client
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('privacloud_token');
  const demoUserId = localStorage.getItem('privacloud_demo_user');

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (demoUserId) {
    headers['x-demo-user-id'] = demoUserId;
  }

  // Handle FormData vs JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// API Methods
export const api = {
  // Files
  uploadFile: (formData) => apiRequest('/files/upload', { method: 'POST', body: formData }),
  getFiles: () => apiRequest('/files'),
  deleteFile: (fileId) => apiRequest(`/files/${fileId}`, { method: 'DELETE' }),

  // Scanner & Masking
  scanFile: (fileId) => apiRequest(`/scan/${fileId}`, { method: 'POST' }),
  getMaskedPreviewUrl: (fileId) => `${API_BASE_URL}/scan/${fileId}/preview`,

  // Sharing
  createShareLink: (fileId) => apiRequest(`/share/${fileId}`, { method: 'POST' }),
  getShares: () => apiRequest('/share'),

  // Transfer (Public)
  getTransferInfo: (token) => fetch(`${API_BASE_URL}/transfer/${token}`).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to retrieve transfer file');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }),
  getTransferViewUrl: (token) => `${API_BASE_URL}/transfer/${token}/view`,
  getTransferDownloadUrl: (token) => `${API_BASE_URL}/transfer/${token}/download`,

  // Analytics
  getAnalytics: () => apiRequest('/analytics'),
};
