import { api } from '../../core/api/apiClient';

export const sharesApi = {
  list: (householdId, entityType, entityId) =>
    api.get(`/households/${householdId}/shares?entity_type=${entityType}&entity_id=${entityId}`),
  add: (householdId, entityType, entityId, profileId) =>
    api.post(`/households/${householdId}/shares`, {
      entity_type: entityType,
      entity_id: entityId,
      shared_with_profile_id: profileId,
    }),
  remove: (householdId, shareId) => api.delete(`/households/${householdId}/shares/${shareId}`),
};
