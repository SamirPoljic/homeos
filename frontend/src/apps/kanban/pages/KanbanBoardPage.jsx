import { useEffect, useState } from 'react';
import { useHousehold } from '../../../core/household/HouseholdContext';
import { kanbanApi } from '../api';
import { tasksApi } from '../../tasks/api';
import { householdsApi } from '../../households/api';

export default function KanbanBoardPage() {
  const { household } = useHousehold();
  const [boards, setBoards] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState({});
  const [draggedCard, setDraggedCard] = useState(null);
  const [creatingBoard, setCreatingBoard] = useState(false);

  async function load() {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [boardsRes, membersRes] = await Promise.all([
        kanbanApi.listBoards(household.id),
        householdsApi.listMembers(household.id),
      ]);
      setBoards(boardsRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (household) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  async function handleCreateBoard() {
    setCreatingBoard(true);
    try {
      await kanbanApi.createBoard(household.id, 'Domaćinstvo');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingBoard(false);
    }
  }

  async function handleGroupByChange(board, groupBy) {
    try {
      await kanbanApi.updateGroupBy(household.id, board.id, groupBy);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Oporavak: ako je board ostao bez kolona (npr. insert pao prije nego je is_done kolona postojala)
  async function handleRepairColumns(boardId) {
    try {
      await kanbanApi.createColumn(household.id, boardId, 'To do');
      await kanbanApi.createColumn(household.id, boardId, 'Doing');
      const doneRes = await kanbanApi.createColumn(household.id, boardId, 'Done');
      await kanbanApi.updateColumn(household.id, boardId, doneRes.data.id, { is_done: true });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Sinhronizuje taskove kreirane prije nego je auto-kartica postojala (ili sa druge stranice)
  async function handleSync(boardId) {
    try {
      const res = await kanbanApi.syncTasks(household.id, boardId);
      await load();
      if (res.data.added === 0) {
        alert('Sve je već sinhronizovano.');
      }
    } catch (err) {
      setError(err.message);
    }
  }

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

  async function handleDropOnColumn(boardId, targetColumnId) {
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

  async function handleDropOnMember(taskId, profileId) {
    try {
      await tasksApi.update(household.id, taskId, { assigned_to: profileId });
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

      {boards.length === 0 && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h3 style={{ marginBottom: 8 }}>Nema board-a još</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            Napravi board da počneš organizovati taskove po kolonama.
          </p>
          <button className="btn btn-primary" disabled={creatingBoard} onClick={handleCreateBoard}>
            {creatingBoard ? 'Kreiranje...' : 'Napravi board'}
          </button>
        </div>
      )}

      {boards.map((board) => (
        <div key={board.id} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3>{board.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Grupiši po:</span>
              <select
                className="input"
                style={{ width: 140 }}
                value={board.group_by}
                onChange={(e) => handleGroupByChange(board, e.target.value)}
              >
                <option value="status">Status</option>
                <option value="member">Osoba</option>
              </select>
              <button className="btn btn-secondary" onClick={() => handleSync(board.id)}>
                Sinhronizuj taskove
              </button>
            </div>
          </div>

          {board.group_by === 'status' ? (
            board.board_columns.length === 0 ? (
              <div className="card" style={{ maxWidth: 420 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Ovaj board nema kolone (vjerovatno je nastalo prije neke izmjene). Dodaj standardne kolone da ga popraviš.
                </p>
                <button className="btn btn-primary" onClick={() => handleRepairColumns(board.id)}>
                  Dodaj standardne kolone
                </button>
              </div>
            ) : (
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
              {board.board_columns.map((col) => (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnColumn(board.id, col.id)}
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
                        onDragStart={() => setDraggedCard({ id: card.id })}
                        className="card"
                        style={{ padding: '10px 12px', cursor: 'grab', opacity: card.tasks?.completed ? 0.5 : 1, boxShadow: 'var(--shadow-sm)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 13, textDecoration: card.tasks?.completed ? 'line-through' : 'none' }}>
                            {card.tasks?.title}
                          </span>
                          <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => handleRemoveCard(board.id, card.id)}>
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
            )
          ) : (
            <MemberGroupedView
              board={board}
              members={members}
              draggedCard={draggedCard}
              setDraggedCard={setDraggedCard}
              onDropOnMember={handleDropOnMember}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Grupisanje po osobi - povlači sve taskove domaćinstva i grupiše ih po assigned_to
// (ne koristi board_columns/board_cards - "kolona" ovdje je zapravo osoba)
function MemberGroupedView({ board, members, draggedCard, setDraggedCard, onDropOnMember }) {
  const { household } = useHousehold();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await tasksApi.list(household.id, { completed: 'false' });
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // Reload nakon svakog drop-a (parent poziva onDropOnMember pa mi ovdje osvježimo lokalno)
  useEffect(() => {
    if (draggedCard === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedCard]);

  const columns = [
    { id: 'unassigned', label: 'Nedodijeljeno', profileId: null },
    ...members.map((m) => ({ id: m.profiles.id, label: m.profiles.full_name || m.profiles.email, profileId: m.profiles.id })),
  ];

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Učitavanje...</p>;

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => (t.assigned_to ?? null) === col.profileId);
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropOnMember(draggedCard?.taskId, col.profileId)}
            style={{
              minWidth: 240,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{col.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggedCard({ taskId: task.id })}
                  className="card"
                  style={{ padding: '10px 12px', cursor: 'grab', boxShadow: 'var(--shadow-sm)' }}
                >
                  <span style={{ fontSize: 13 }}>{task.title}</span>
                </div>
              ))}
              {colTasks.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nema taskova.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
