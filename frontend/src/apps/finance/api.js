import { api } from '../../core/api/apiClient';

export const financeApi = {
  listCategories: (householdId) => api.get(`/households/${householdId}/finance/categories`),
  createCategory: (householdId, name) =>
    api.post(`/households/${householdId}/finance/categories`, { name }),
  removeCategory: (householdId, categoryId) =>
    api.delete(`/households/${householdId}/finance/categories/${categoryId}`),

  listTransactions: (householdId, scope) =>
    api.get(`/households/${householdId}/finance/transactions?scope=${scope}`),
  createTransaction: (householdId, fields) =>
    api.post(`/households/${householdId}/finance/transactions`, fields),
  removeTransaction: (householdId, transactionId) =>
    api.delete(`/households/${householdId}/finance/transactions/${transactionId}`),

  getSummary: (householdId, month) =>
    api.get(`/households/${householdId}/finance/summary${month ? `?month=${month}` : ''}`),
};
