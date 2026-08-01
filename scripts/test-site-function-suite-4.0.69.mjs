import fs from 'node:fs';
const files=['js/services/site-function-test-service.js','js/services/persistence-test-service.js','js/services/handbook-review-store.js','js/ui/admin-dashboard.js'];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Mangler ${f}`);
const dash=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
for(const marker of ['Kør samlet sitetest','Kontrollerer…','runFullSiteFunctionTest','Test Supabase-lagring'])if(!dash.includes(marker))throw new Error(`Mangler UI-markør: ${marker}`);
const store=fs.readFileSync('js/services/handbook-review-store.js','utf8');
for(const marker of ['createHandbookReviewProbe','method:\'DELETE\'','status:\'testing\''])if(!store.includes(marker))throw new Error(`Håndbogsreview-test mangler ${marker}`);
console.log('OK: samlet sitetest, repareret lagerkontrol og håndbogsreview-readback er koblet i admin.');
