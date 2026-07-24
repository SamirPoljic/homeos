import { api } from '../../core/api/apiClient';

export const notesApi = {
  list: (householdId, scope = 'household') => api.get(`/households/${householdId}/notes?scope=${scope}`),
  create: (householdId, title, visibility = 'household') =>
    api.post(`/households/${householdId}/notes`, { title, visibility }),
  update: (householdId, noteId, fields) =>
    api.patch(`/households/${householdId}/notes/${noteId}`, fields),
  remove: (householdId, noteId) => api.delete(`/households/${householdId}/notes/${noteId}`),
};
