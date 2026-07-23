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

app.use('/auth', authRoutes);
app.use('/households', householdRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Home OS backend listening on port ${PORT}`);
});
