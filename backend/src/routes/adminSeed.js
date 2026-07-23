import { Router } from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

const TEST_PASSWORD = 'Test1234!';

const TEST_USERS = [
  { email: 'ana@homeos.test', full_name: 'Ana' },
  { email: 'marko@homeos.test', full_name: 'Marko' },
  { email: 'iva@homeos.test', full_name: 'Iva' },
];

const TASK_TEMPLATES = [
  { title: 'Iznesi smeće', default_priority: 'medium' },
  { title: 'Operi sudove', default_priority: 'low' },
  { title: 'Usisaj stan', default_priority: 'medium' },
  { title: 'Plati struju', default_priority: 'high' },
  { title: 'Plati internet', default_priority: 'high' },
  { title: 'Kupi namirnice', default_priority: 'medium' },
  { title: 'Operi veš', default_priority: 'low' },
  { title: 'Očisti kupatilo', default_priority: 'medium' },
  { title: 'Zalij cvijeće', default_priority: 'low' },
  { title: 'Prošetaj psa', default_priority: 'medium' },
];

// GET /admin/seed?secret=...
// Privremen dev-only endpoint - kreira test korisnike i puni registar taskova
// za PRVO domaćinstvo pronađeno u bazi. Ukloni ovu rutu (ili rotiraj ADMIN_SEED_SECRET) nakon upotrebe.
router.get('/seed', async (req, res) => {
  if (!process.env.ADMIN_SEED_SECRET || req.query.secret !== process.env.ADMIN_SEED_SECRET) {
    return res.status(403).json({ error: 'Nevažeći ili nedostajući secret' });
  }

  const log = [];

  const { data: household, error: hError } = await supabase
    .from('households')
    .select('id, name, created_by')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (hError || !household) {
    return res.status(400).json({ error: 'Nije pronađeno nijedno domaćinstvo. Napravi ga prvo u appu.' });
  }

  log.push(`Koristim domaćinstvo: "${household.name}" (${household.id})`);

  for (const user of TEST_USERS) {
    let userId;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (createError) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === user.email);
      userId = existing?.id;
      log.push(`${user.email}: već postoji, koristim postojeći nalog`);
    } else {
      userId = created.user.id;
      log.push(`${user.email}: kreiran novi nalog`);
    }

    if (!userId) {
      log.push(`${user.email}: preskačem (nije pronađen ni kreiran)`);
      continue;
    }

    await supabase.from('profiles').upsert({ id: userId, email: user.email, full_name: user.full_name });

    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle();

    if (!existingMember) {
      await supabase
        .from('household_members')
        .insert({ household_id: household.id, profile_id: userId, role: 'member' });
      log.push(`${user.email}: dodan u domaćinstvo kao member`);
    } else {
      log.push(`${user.email}: već je član nekog domaćinstva, preskačem dodavanje`);
    }
  }

  for (const t of TASK_TEMPLATES) {
    const { error } = await supabase
      .from('task_templates')
      .upsert(
        { household_id: household.id, title: t.title, default_priority: t.default_priority, created_by: household.created_by },
        { onConflict: 'household_id,title' }
      );
    log.push(error ? `Registar "${t.title}": greška - ${error.message}` : `Registar "${t.title}": ok`);
  }

  res.json({
    data: {
      household: household.name,
      testUsers: TEST_USERS.map((u) => u.email),
      testPassword: TEST_PASSWORD,
      log,
    },
  });
});

export default router;
