import fs from 'node:fs/promises';

const handbookFile = 'docs/handbook/content.json';
const installFile = 'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';

const handbook = JSON.parse(await fs.readFile(handbookFile, 'utf8'));
let installSql = await fs.readFile(installFile, 'utf8');

const sqlPayload = JSON.stringify(handbook).replace(/'/g, "''");
const marker = "insert into public.admin_documents(document_key,payload,updated_by) values('handbook','";
const start = installSql.indexOf(marker);
const payloadStart = start + marker.length;
const payloadEnd = installSql.indexOf("'::jsonb,null)", payloadStart);

if (start < 0 || payloadEnd < 0) {
  throw new Error('Supabase-installationsfilens håndbogspayload kunne ikke findes.');
}

installSql = `${installSql.slice(0, payloadStart)}${sqlPayload}${installSql.slice(payloadEnd)}`;
await fs.writeFile(installFile, installSql);

console.log('Håndbogens statiske Supabase-installationskopi er synkroniseret.');
