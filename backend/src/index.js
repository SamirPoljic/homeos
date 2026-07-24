import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase } from './lib/supabaseClient.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// --- Health check (Faza 0 cilj: potvrditi da je deploy pipeline živ) ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Potvrda konekcije na Supabase (Faza 0 cilj) ---
app.get('/health/db', async (req, res) => {
  try {
    const { error } = await supabase.from('households').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- Rute (dodaju se modul po modul kroz sljedeće faze) ---
import authRoutes from './routes/auth.js';
import householdRoutes from './routes/households.js';
import taskRoutes from './routes/tasks.js';
import tagRoutes from './routes/tags.js';
import taskTemplateRoutes from './routes/taskTemplates.js';
import adminSeedRoutes from './routes/adminSeed.js';
import reminderRoutes from './routes/reminders.js';
import notificationRoutes from './routes/notifications.js';
import emailPreferenceRoutes from './routes/emailPreferences.js';
import noteRoutes from './routes/notes.js';
import financeRoutes from './routes/finance.js';
import lifeAdminRoutes from './routes/lifeAdmin.js';
import searchRoutes from './routes/search.js';
import sharesRoutes from './routes/shares.js';

// Registruj event listenere (core.* app-ovi)
import './handlers/notifications.js';
import './handlers/email.js';
import './handlers/finance.js';

app.use('/auth', authRoutes);
app.use('/households', householdRoutes);
app.use('/households/:householdId/tasks', taskRoutes);
app.use('/households/:householdId/tags', tagRoutes);
app.use('/households/:householdId/task-templates', taskTemplateRoutes);
app.use('/households/:householdId/reminders', reminderRoutes);
app.use('/households/:householdId/notes', noteRoutes);
app.use('/households/:householdId/finance', financeRoutes);
app.use('/households/:householdId/life-admin', lifeAdminRoutes);
app.use('/households/:householdId/search', searchRoutes);
app.use('/households/:householdId/shares', sharesRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profiles/me/email-preferences', emailPreferenceRoutes);
app.use('/admin', adminSeedRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Home OS backend listening on port ${PORT}`);
});
