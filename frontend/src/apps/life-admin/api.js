import { api } from '../../core/api/apiClient';

export const lifeAdminApi = {
  listDocuments: (householdId) => api.get(`/households/${householdId}/life-admin/documents`),
  createDocument: (householdId, fields) => api.post(`/households/${householdId}/life-admin/documents`, fields),
  removeDocument: (householdId, id) => api.delete(`/households/${householdId}/life-admin/documents/${id}`),

  listContacts: (householdId) => api.get(`/households/${householdId}/life-admin/contacts`),
  createContact: (householdId, fields) => api.post(`/households/${householdId}/life-admin/contacts`, fields),
  removeContact: (householdId, id) => api.delete(`/households/${householdId}/life-admin/contacts/${id}`),

  listShoppingLists: (householdId) => api.get(`/households/${householdId}/life-admin/shopping-lists`),
  createShoppingList: (householdId, name) =>
    api.post(`/households/${householdId}/life-admin/shopping-lists`, { name }),
  removeShoppingList: (householdId, id) => api.delete(`/households/${householdId}/life-admin/shopping-lists/${id}`),
  addShoppingItem: (householdId, listId, name, quantity) =>
    api.post(`/households/${householdId}/life-admin/shopping-lists/${listId}/items`, { name, quantity }),
  updateShoppingItem: (householdId, itemId, fields) =>
    api.patch(`/households/${householdId}/life-admin/shopping-items/${itemId}`, fields),
  removeShoppingItem: (householdId, itemId) =>
    api.delete(`/households/${householdId}/life-admin/shopping-items/${itemId}`),
};
