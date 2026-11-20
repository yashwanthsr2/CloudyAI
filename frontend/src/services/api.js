const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * PRIVACLOUD AI HTTP Request Client
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

  // Handle binary streams (e.g. file downloads)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}: Download failed`);
      err.status = response.status;
      throw err;
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Files & Quota
  uploadFile: (formData) => apiRequest('/upload', { method: 'POST', body: formData }),
  getFiles: () => apiRequest('/files'),
  getFile: (id) => apiRequest(`/files/${id}`),
  deleteFile: (id) => apiRequest(`/files/${id}`, { method: 'DELETE' }),

  // Scanning & Previews
  scanFile: (id) => apiRequest(`/scan/${id}`, { method: 'POST' }),
  getMaskedPreviewUrl: (id) => `${API_BASE_URL}/scan/${id}/masked`,
  getOriginalPreviewUrl: (id) => `${API_BASE_URL}/scan/${id}/original`,

  // Secure Sharing (Sender)
  createShare: (id, recipientEmail) => apiRequest(`/share/${id}`, {
    method: 'POST',
    body: { recipient_email: recipientEmail }
  }),
  getShares: () => apiRequest('/shares'),
  revokeShare: (id) => apiRequest(`/share/${id}/revoke`, { method: 'POST' }),

  // Security Activity & Analytics
  getAnalyticsSummary: (params = '') => apiRequest(`/analytics/summary${params ? `?${params}` : ''}`),

  // Public Transfer & Recipient Verification
  getTransferInfo: (token) => fetch(`${API_BASE_URL}/transfer/${token}`).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to inspect link');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  }),

  requestOtp: (token, email) => fetch(`${API_BASE_URL}/transfer/${token}/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to request OTP');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }),

  verifyOtp: (token, email, otp) => fetch(`${API_BASE_URL}/transfer/${token}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  }).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to verify OTP');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }),

  downloadMaskedFile: async (token, email) => {
    const res = await fetch(`${API_BASE_URL}/transfer/${token}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || 'Download failed or link expired');
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return res.blob();
  }
};
