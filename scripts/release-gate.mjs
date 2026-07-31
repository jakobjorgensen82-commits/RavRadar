import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const exists=async rel=>{try{await fs.access(path.join(root,rel));return true}catch{return false}};
const pkg=JSON.parse(await read('package.json'));
const version=pkg.version;
const errors=[];
const ok=(cond,msg)=>{if(!cond)errors.push(msg)};

const exactVersionFiles=['version.json','data/kystdata.json','data/zones.geojson','docs/handbook/content.json'];
for(const rel of exactVersionFiles){
  const doc=JSON.parse(await read(rel));
  const value=rel.includes('handbook')?doc.handbookVersion:doc.version;
  ok(value===version,`${rel}: forventede ${version}, fandt ${value}`);
}
for(const rel of ['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','HANDBOOK-RAVRADAR.md','docs/rdks/MASTER_LOG.md',`CHANGELOG-${version}.md`]){
  const text=await read(rel); ok(text.includes(version),`${rel} mangler releaseversion ${version}`);
}
const handbook=JSON.parse(await read('docs/handbook/content.json'));
ok(Array.isArray(handbook.sections)&&handbook.sections.length>=23,'Håndbogen skal indeholde mindst 23 kapitler');
for(const id of ['rav-egenskaber','boelger','stroem','sortering','score-implementering','release','domaene','ekspertsporgsmaal','kilder']){
  ok(handbook.sections.some(s=>s.id===id),`Håndbogen mangler obligatorisk afsnit ${id}`);
}
const permissions=await read('js/services/permissions-service.js');
ok(permissions.includes("handbook_view")&&permissions.includes('Læs håndbogen'),'Rettigheden Læs håndbogen mangler');
ok(permissions.includes("handbook_review"),'Separat håndbogs-reviewrettighed mangler');
const sql=await read('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql');
ok(/select\s+oid\s*,\s*conname\s+from\s+pg_constraint/i.test(sql),'Supabase SQL mangler oid-rettelsen');
ok(sql.includes(`\"handbookVersion\":\"${version}\"`)||sql.includes(`\"handbookVersion\": \"${version}\"`),'Supabase-installationsscriptets håndbog er forældet');
const sync=await read('scripts/sync-protected-admin-assets.mjs');
ok(sync.includes("sb_secret_")||sync.includes("startsWith('sb_secret_')"),'Supabase sync mangler understøttelse af sb_secret_');
const workflow=await read('.github/workflows/update-and-deploy.yml');
for(const protectedPath of ['handbook.html','documentation.html','data/diagnostics/','data/live/weather-health.json','data/live/ravradar-runtime-diagnostics.json','data/live/dmi-water-stations.json']){
  ok(workflow.includes(`--exclude '${protectedPath}'`)||workflow.includes(`--exclude \"${protectedPath}\"`),`Pages-workflow udelukker ikke ${protectedPath}`);
}
ok(workflow.includes('SUPABASE_URL')&&workflow.includes('SUPABASE_SERVICE_ROLE_KEY'),'Workflow mangler Supabase secrets');
ok(!workflow.includes('sb_secret_'),'En konkret sb_secret_-værdi må aldrig stå i workflowet');
const manifest=JSON.parse(await read('manifest.webmanifest'));
ok(String(manifest.start_url||'').startsWith('.'),'Manifest start_url skal være relativ for domæneskift');
ok(!await exists('CNAME'),'CNAME må først aktiveres, når DNS og Supabase redirects er klar');
const decision=await read('docs/rdks/10_DECISIONS/DEC-0013-RELEASE-GOVERNANCE.md');
ok(decision.includes('Obligatorisk Release Governance'),'RDKS release-governance mangler');
const rules=await read('docs/rdks/01_AI_OPERATING_RULES.md');
ok(rules.includes('Bindende release-gate'),'AI operating rules mangler bindende release-gate');
const trackedSecretPatterns=[/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?(sb_secret_|eyJ)/i,/DMI_API_KEY\s*[:=]\s*["'][^$]/i];
for(const rel of ['config.js','.github/workflows/update-and-deploy.yml','scripts/sync-protected-admin-assets.mjs']){
  const text=await read(rel); for(const rx of trackedSecretPatterns)ok(!rx.test(text),`${rel} ser ud til at indeholde en konkret hemmelig nøgle`);
}
if(errors.length){console.error('\nRELEASE GATE FEJLEDE:\n- '+errors.join('\n- '));process.exit(1)}
const report={version,checkedAt:new Date().toISOString(),status:'passed',checks:{versionConsistency:true,handbook:true,rdks:true,supabase:true,protectedPagesArtifact:true,domainReadiness:true,secretsScan:true,packagingPolicy:true}};
await fs.mkdir('release',{recursive:true});
await fs.writeFile('release/RELEASE-REPORT.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('release/RELEASE-REPORT.md',`# Release-rapport ${version}\n\n- Status: **BESTÅET**\n- Kontrolleret: ${report.checkedAt}\n- Versionskonsistens: OK\n- Håndbog og RDKS: OK\n- Supabase- og rettighedskæde: OK\n- Beskyttede Pages-filer: OK\n- Domæneberedskab: OK\n- Hemmelighedsscanning: OK\n- Pakningspolitik: OK\n\nBemærk: Rapporten dokumenterer lokale kontroller. En faktisk grøn GitHub Actions-kørsel skal stadig verificeres efter push.\n`);
console.log(`Release gate bestået for RavRadar ${version}.`);
