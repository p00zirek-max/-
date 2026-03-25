const BASE_URL = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('kinotabel-auth-token');
}

async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, { headers });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const exportApi = {
  downloadXlsx(projectId: string): Promise<void> {
    return downloadFile(`/export/xlsx?project_id=${projectId}`, 'kinotabel-report.xlsx');
  },

  downloadPdf(projectId: string): Promise<void> {
    return downloadFile(`/export/pdf?project_id=${projectId}`, 'kinotabel-report.pdf');
  },

  downloadCsv(projectId: string): Promise<void> {
    return downloadFile(`/export/csv?project_id=${projectId}`, 'kinotabel-report.csv');
  },
};
