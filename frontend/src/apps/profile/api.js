import { api } from '../../core/api/apiClient';

export const profileApi = {
  getEmailPreferences: () => api.get('/profiles/me/email-preferences'),
  updateEmailPreference: (category, enabled) =>
    api.patch('/profiles/me/email-preferences', { category, enabled }),
};
