import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://nbzkjbrkzkotecxistsq.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_KEY) { console.error('Missing key'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Fetching filiales...');
  const { data: filiales } = await supabase.from('filiales').select('id, code');
  const filialeById = new Map(filiales.map(f => [f.id, f.code]));
  console.log(`  ${filiales.length} filiales`);

  console.log('Fetching all paiements...');
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('paiements')
      .select('id, filiale_id, date_paiement')
      .order('date_paiement', { ascending: true })
      .range(offset, offset + 999);
    if (error) { console.error(error); process.exit(1); }
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  ${all.length} paiements`);

  // Step 1: clear all codes to unique temp values
  console.log('\nStep 1: Clearing existing codes...');
  for (let i = 0; i < all.length; i += 100) {
    const batch = all.slice(i, i + 100);
    await Promise.all(batch.map(p =>
      supabase.from('paiements').update({ code_paiement: `TEMP-${p.id.slice(0,8)}` }).eq('id', p.id)
    ));
  }
  console.log('  All codes cleared.');

  // Step 2: group by filiale+year, sort by date
  const groups = new Map();
  for (const p of all) {
    if (!p.filiale_id || !p.date_paiement) continue;
    const code = filialeById.get(p.filiale_id);
    if (!code) continue;
    const year = new Date(p.date_paiement).getFullYear();
    const key = `${code}-${year}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  // Step 3: assign real codes one by one
  console.log('\nStep 2: Assigning real codes...');
  let updated = 0;
  for (const [key, items] of groups) {
    const [filialeCode, year] = key.split('-');
    items.sort((a, b) => a.date_paiement.localeCompare(b.date_paiement));
    for (let i = 0; i < items.length; i++) {
      const seq = (i + 1).toString().padStart(4, '0');
      const newCode = `PAI-${filialeCode}-${year}-${seq}`;
      const { error } = await supabase.from('paiements').update({ code_paiement: newCode }).eq('id', items[i].id);
      if (error) console.error(`  Error ${items[i].id}: ${error.message}`);
      else updated++;
    }
    console.log(`  ${filialeCode}-${year}: ${items.length} paiements → PAI-${filialeCode}-${year}-0001..${items.length.toString().padStart(4, '0')}`);
  }

  console.log(`\nDone! Updated: ${updated}/${all.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
