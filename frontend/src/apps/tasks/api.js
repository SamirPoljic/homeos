import { api } from '../../core/api/apiClient';

export const tasksApi = {
  list: (householdId, filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/households/${householdId}/tasks${params ? `?${params}` : ''}`);
  },
  create: (householdId, fields) => api.post(`/households/${householdId}/tasks`, fields),
  update: (householdId, taskId, fields) =>
    api.patch(`/households/${householdId}/tasks/${taskId}`, fields),
  setComplete: (householdId, taskId, completed) =>
    api.patch(`/households/${householdId}/tasks/${taskId}/complete`, { completed }),
  updateStatus: (householdId, taskId, status) =>
    api.patch(`/households/${householdId}/tasks/${taskId}/status`, { status }),
  remove: (householdId, taskId) => api.delete(`/households/${householdId}/tasks/${taskId}`),

  addSubtask: (householdId, taskId, title) =>
    api.post(`/households/${householdId}/tasks/${taskId}/subtasks`, { title }),
  updateSubtask: (householdId, subtaskId, fields) =>
    api.patch(`/households/${householdId}/subtasks/${subtaskId}`, fields),
  removeSubtask: (householdId, subtaskId) =>
    api.delete(`/households/${householdId}/subtasks/${subtaskId}`),

  listTags: (householdId) => api.get(`/households/${householdId}/tags`),
  createTag: (householdId, name, color) =>
    api.post(`/households/${householdId}/tags`, { name, color }),

  listTemplates: (householdId) => api.get(`/households/${householdId}/task-templates`),
  createTemplate: (householdId, title, defaultPriority) =>
    api.post(`/households/${householdId}/task-templates`, { title, default_priority: defaultPriority }),
  updateTemplate: (householdId, templateId, fields) =>
    api.patch(`/households/${householdId}/task-templates/${templateId}`, fields),
  removeTemplate: (householdId, templateId) =>
    api.delete(`/households/${householdId}/task-templates/${templateId}`),
};
