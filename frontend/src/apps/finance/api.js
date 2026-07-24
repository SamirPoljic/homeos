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

  listBudgets: (householdId) => api.get(`/households/${householdId}/finance/budgets`),
  createBudget: (householdId, categoryId, monthlyLimit) =>
    api.post(`/households/${householdId}/finance/budgets`, { category_id: categoryId, monthly_limit: monthlyLimit }),
  removeBudget: (householdId, budgetId) => api.delete(`/households/${householdId}/finance/budgets/${budgetId}`),

  listSubscriptions: (householdId) => api.get(`/households/${householdId}/finance/subscriptions`),
  createSubscription: (householdId, fields) => api.post(`/households/${householdId}/finance/subscriptions`, fields),
  updateSubscription: (householdId, id, fields) =>
    api.patch(`/households/${householdId}/finance/subscriptions/${id}`, fields),
  removeSubscription: (householdId, id) => api.delete(`/households/${householdId}/finance/subscriptions/${id}`),

  getWhoOwes: (householdId, month) =>
    api.get(`/households/${householdId}/finance/who-owes${month ? `?month=${month}` : ''}`),
};
