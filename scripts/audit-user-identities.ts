#!/usr/bin/env tsx
/**
 * AUDIT: User Identities & Account Merging
 *
 * Inspecciona las identidades (auth.identities) de un usuario en Supabase Auth
 * para verificar si hay account linking (varios providers → mismo user_id).
 *
 * Uso:
 *   npx tsx scripts/audit-user-identities.ts <USER_ID>
 *   npx tsx scripts/audit-user-identities.ts   # lista usuarios y pide ID
 *
 * USER_ID = Supabase Auth UUID (auth.users.id), no el CUID de public.users.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listUsersForPick(): Promise<void> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 });
  if (error) {
    console.error('❌ Error listando usuarios:', error.message);
    process.exit(1);
  }
  console.log('\n📋 Usuarios en Supabase Auth (primeros 50):\n');
  for (const u of data.users) {
    const emails = u.identities?.map((i) => (i.identity_data as { email?: string })?.email ?? '-').join(', ') ?? '-';
    console.log(`   ${u.id}`);
    console.log(`      email: ${u.email ?? 'N/A'}`);
    console.log(`      identities (emails): ${emails}`);
    console.log('');
  }
  console.log('Ejecuta de nuevo con: npx tsx scripts/audit-user-identities.ts <USER_ID>\n');
}

async function auditUser(userId: string): Promise<void> {
  console.log('\n🔍 Audit: User Identities & Account Merging\n');
  console.log('USER_ID (Supabase Auth):', userId);
  console.log('');

  const { data: getData, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    console.error('❌ Error obteniendo usuario:', error.message);
    process.exit(1);
  }

  let user = getData?.user;
  if (!user) {
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    user = listData?.users?.find((u) => u.id === userId) ?? null;
  }

  if (!user) {
    console.error('❌ No se encontró usuario con ese ID');
    process.exit(1);
  }

  // identities puede venir en getUserById o solo en listUsers según versión del cliente
  const identities = user.identities ?? [];
  const dump = {
    auth_user_id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    identities_count: identities.length,
    identities: identities.map((i) => ({
      id: i.id,
      provider: i.provider,
      provider_id: i.provider_id,
      identity_data: i.identity_data,
      email_from_identity: (i.identity_data as { email?: string })?.email,
    })),
    raw_user_identities: identities,
  };

  // JSON dump
  console.log('--- JSON dump (identities + user summary) ---\n');
  console.log(JSON.stringify(dump, null, 2));
  console.log('\n--- Diagnostic ---\n');

  if (identities.length === 0) {
    console.log('⚠️  Este usuario no tiene identidades en auth.identities (raro).');
    return;
  }

  if (identities.length === 1) {
    console.log('✅ Un solo proveedor vinculado:', identities[0].provider);
    console.log('   Email en identity:', (identities[0].identity_data as { email?: string })?.email ?? 'N/A');
    return;
  }

  const emails = identities.map((i) => (i.identity_data as { email?: string })?.email ?? null).filter(Boolean);
  const providers = identities.map((i) => i.provider);
  const allSameEmail = emails.length > 0 && new Set(emails).size === 1;

  console.log(`✅ Múltiples identidades (${identities.length}): ${providers.join(', ')}`);
  console.log('   Emails en identities:', emails.join(', ') || 'N/A');
  console.log('');

  if (allSameEmail) {
    console.log('✅ Los emails en todas las identidades COINCIDEN → Auto-link por mismo email (comportamiento esperado).');
  } else {
    console.log('⚠️  Los emails en las identidades NO coinciden o hay mezcla → Revisar si el linking fue intencional.');
  }

  const hasGoogle = identities.some((i) => i.provider === 'google');
  console.log(hasGoogle ? '   Incluye provider_id de Google: sí' : '   Incluye Google: no');
  console.log('');
}

const userId = process.argv[2]?.trim();

if (!userId) {
  await listUsersForPick();
  process.exit(0);
}

await auditUser(userId);
