import { supabase } from './supabaseClient.js';

// app_key -> { eventType: handlerFn }
const handlers = {};

export function registerHandler(appKey, eventType, fn) {
  handlers[appKey] = handlers[appKey] || {};
  handlers[appKey][eventType] = fn;
}

// emit() radi 2 stvari:
// 1. Upisuje event u 'events' tabelu (audit log, i da buduće app-ove mogu "pročitati historiju")
// 2. Pronalazi ko je pretplaćen (event_subscriptions) i poziva odgovarajući handler
export async function emit(householdId, eventType, payload = {}, meta = {}) {
  await supabase.from('events').insert({
    household_id: householdId,
    event_type: eventType,
    entity_type: meta.entityType ?? null,
    entity_id: meta.entityId ?? null,
    payload,
    emitted_by_app: meta.emittedByApp ?? 'core',
  });

  const domain = eventType.split('.')[0];

  const { data: subs, error } = await supabase
    .from('event_subscriptions')
    .select('app_key, event_type')
    .eq('active', true)
    .or(`event_type.eq.${eventType},event_type.eq.${domain}.*`);

  if (error) {
    console.error('eventBus: greška pri čitanju event_subscriptions:', error.message);
    return;
  }

  for (const sub of subs ?? []) {
    const handler = handlers[sub.app_key]?.[eventType] ?? handlers[sub.app_key]?.[`${domain}.*`];
    if (!handler) continue; // app registrovan, ali nema handler kod (npr. app nije "instaliran" u kodu)

    try {
      await handler({ householdId, eventType, payload });
    } catch (err) {
      console.error(`eventBus: handler ${sub.app_key} pao na ${eventType}:`, err.message);
    }
  }
}
