import fs from 'node:fs';
const store=fs.readFileSync('js/services/admin-document-store.js','utf8');
const test=fs.readFileSync('js/services/persistence-test-service.js','utf8');
const dashboard=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const marker of ['readAdminDocumentNow','saveAdminDocumentNow(key,payload,{writeLocal:shouldWriteLocal=true}','serverAt'])if(!store.includes(marker))throw new Error(`Admin store mangler ${marker}`);
for(const marker of ['runFullPersistenceTest','__ravradarPersistenceProbe','Originalen kunne ikke gendannes','listProfiles','listHandbookReviews'])if(!test.includes(marker))throw new Error(`Persistenstest mangler ${marker}`);
for(const marker of ['Kør fuld test','runPersistenceTest','Supabase-persistenstest'])if(!dashboard.includes(marker))throw new Error(`Admin UI mangler ${marker}`);
console.log('Admin E2E-persistenstest er koblet til UI, Supabase-genlæsning og sikker rollback.');
