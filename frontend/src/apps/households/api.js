import { api } from '../../core/api/apiClient';

export const householdsApi = {
  list: () => api.get('/households'),
  create: (name) => api.post('/households', { name }),
  get: (householdId) => api.get(`/households/${householdId}`),
  updateName: (householdId, name) => api.patch(`/households/${householdId}`, { name }),

  listMembers: (householdId) => api.get(`/households/${householdId}/members`),
  inviteMember: (householdId, email) =>
    api.post(`/households/${householdId}/members`, { email }),
  changeRole: (householdId, memberId, role) =>
    api.patch(`/households/${householdId}/members/${memberId}`, { role }),
  removeMember: (householdId, memberId) =>
    api.delete(`/households/${householdId}/members/${memberId}`),

  getPermissions: (householdId) => api.get(`/households/${householdId}/permissions`),
  updatePermission: (householdId, profileId, scope, granted) =>
    api.patch(`/households/${householdId}/permissions`, { profile_id: profileId, scope, granted }),
};
