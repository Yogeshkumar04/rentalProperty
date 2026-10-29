const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export async function request(path = '', options?: RequestInit) {
  const response = await fetch(`${api}${path}`, { ...options, credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Request failed');
  return data;
}
