import { api } from '../../core/api/apiClient';

export const remindersApi = {
  list: (householdId, status = 'pending') =>
    api.get(`/households/${householdId}/reminders?status=${status}`),
  create: (householdId, targetProfileId, title) =>
    api.post(`/households/${householdId}/reminders`, { target_profile_id: targetProfileId, title }),
  dismiss: (householdId, reminderId) =>
    api.patch(`/households/${householdId}/reminders/${reminderId}/dismiss`),
};
