import { api } from '../../core/api/apiClient';

export const appsManagerApi = {
  list: (householdId) => api.get(`/households/${householdId}/apps`),
  toggle: (householdId, appKey, enabled) =>
    api.patch(`/households/${householdId}/apps/${appKey}`, { enabled }),
};
