import { api } from '../../core/api/apiClient';

export const kanbanApi = {
  listBoards: (householdId) => api.get(`/households/${householdId}/boards`),
  createBoard: (householdId, name) => api.post(`/households/${householdId}/boards`, { name }),
  updateGroupBy: (householdId, boardId, groupBy) =>
    api.patch(`/households/${householdId}/boards/${boardId}`, { group_by: groupBy }),

  createColumn: (householdId, boardId, name) =>
    api.post(`/households/${householdId}/boards/${boardId}/columns`, { name }),
  updateColumn: (householdId, boardId, columnId, fields) =>
    api.patch(`/households/${householdId}/boards/${boardId}/columns/${columnId}`, fields),

  createCard: (householdId, boardId, columnId, fields) =>
    api.post(`/households/${householdId}/boards/${boardId}/columns/${columnId}/cards`, fields),
  moveCard: (householdId, boardId, cardId, columnId, position) =>
    api.patch(`/households/${householdId}/boards/${boardId}/cards/${cardId}/move`, {
      column_id: columnId,
      position,
    }),
  removeCard: (householdId, boardId, cardId) =>
    api.delete(`/households/${householdId}/boards/${boardId}/cards/${cardId}`),
};
