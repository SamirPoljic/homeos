import { api } from '../../core/api/apiClient';

export const mealPlannerApi = {
  listPlans: (householdId, from, to) =>
    api.get(`/households/${householdId}/meal-planner/plans?from=${from}&to=${to}`),
  createPlan: (householdId, fields) => api.post(`/households/${householdId}/meal-planner/plans`, fields),
  removePlan: (householdId, planId) => api.delete(`/households/${householdId}/meal-planner/plans/${planId}`),
  addToShoppingList: (householdId, planId) =>
    api.post(`/households/${householdId}/meal-planner/plans/${planId}/add-to-shopping-list`),
};
