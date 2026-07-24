import { api } from '../../core/api/apiClient';

export const notesApi = {
  list: (householdId) => api.get(`/households/${householdId}/notes`),
  create: (householdId, title) => api.post(`/households/${householdId}/notes`, { title }),
  update: (householdId, noteId, fields) =>
    api.patch(`/households/${householdId}/notes/${noteId}`, fields),
  remove: (householdId, noteId) => api.delete(`/households/${householdId}/notes/${noteId}`),
};
