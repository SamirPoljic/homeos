import { api } from '../../core/api/apiClient';

export const searchApi = {
  search: (householdId, q) => api.get(`/households/${householdId}/search?q=${encodeURIComponent(q)}`),
};
