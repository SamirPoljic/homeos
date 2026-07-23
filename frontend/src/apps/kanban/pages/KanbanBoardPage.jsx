import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { kanbanApi } from '../api';

export default function KanbanBoardPage() {
  const { household } = useHousehold();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState({}); // { [columnId]: title }
  const [draggedCard, setDraggedCard] = useState(null); // { id, columnId }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await kanbanApi.listBoards(household.id);
      setBoards(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleAddCard(boardId, columnId) {
    const title = (newCardTitle[columnId] ?? '').trim();
    if (!title) return;
    try {
      await kanbanApi.createCard(household.id, boardId, columnId, { title });
      setNewCardTitle((prev) => ({ ...prev, [columnId]: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDrop(boardId, targetColumnId) {
    if (!draggedCard) return;
    try {
      await kanbanApi.moveCard(household.id, boardId, draggedCard.id, targetColumnId, 0);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDraggedCard(null);
    }
  }

  async function handleRemoveCard(boardId, cardId) {
    try {
      await kanbanApi.removeCard(household.id, boardId, cardId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Kanban</h1>
      {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

      {boards.map((board) => (
        <div key={board.id} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 12 }}>{board.name}</h3>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
            {board.board_columns.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(board.id, col.id)}
                style={{
                  minWidth: 260,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{col.name}</span>
                  {col.is_done && <span className="badge badge-admin">done</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                  {col.board_cards.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDraggedCard({ id: card.id, columnId: col.id })}
                      className="card"
                      style={{
                        padding: '10px 12px',
                        cursor: 'grab',
                        opacity: card.tasks?.completed ? 0.5 : 1,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 13, textDecoration: card.tasks?.completed ? 'line-through' : 'none' }}>
                          {card.tasks?.title}
                        </span>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={() => handleRemoveCard(board.id, card.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <input
                    className="input"
                    style={{ fontSize: 12, padding: '6px 10px' }}
                    placeholder="Nova karta..."
                    value={newCardTitle[col.id] ?? ''}
                    onChange={(e) => setNewCardTitle((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCard(board.id, col.id)}
                  />
                  <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleAddCard(board.id, col.id)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {boards.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nema board-a još.</p>}
    </div>
  );
}
