import fs from 'node:fs';
const book=JSON.parse(fs.readFileSync('docs/handbook/content.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(book.handbookVersion!==pkg.version)throw new Error(`Forkert håndbogsversion: ${book.handbookVersion} mod ${pkg.version}`);
const matrix=book.sections.find(x=>x.id==='ekspertmatrix');
if(!matrix||!matrix.title.includes('arbejdsplan'))throw new Error('Ekspertmatrixen er ikke omskrevet');
for(const marker of ['Hvad gør RavRadar i dag?','Hvorfor kan det være for simpelt?','Det vil vi gerne have din hjælp til:','E-22'])if(!matrix.body.includes(marker))throw new Error(`Mangler ${marker}`);
for(const marker of ['0,03 m/s er dødzone','fuld styrke','transport 0 efter 13 timers fuld udtransport','48 timers strømhukommelse','RavScore vurderer søgeeffektivitet, ikke sikkerhed'])if(!matrix.body.includes(marker))throw new Error(`Ekspertens arbejdsplan mangler den aktive Candidate G-kontrakt: ${marker}`);
const withoutGuide=book.sections.filter(x=>x.id!=='ekspertmatrix'&&!x.body.includes('reader-guide'));
if(withoutGuide.length)throw new Error(`${withoutGuide.length} kapitler mangler læsehjælp`);
for(const forbidden of ['Størrelsesafhængige transportregimer','Geologisk/geomorfologisk lagerkort','Faseafhængig offshorelogik','0,15–0,65 m/s som et foreløbigt gunstigt interval','RavRadar giver i dag en bonus 3–18 timer','RavRadar bruger generelle sikkerhedsgrænser'])if(matrix.body.includes(forbidden))throw new Error(`Forældet eller uforklaret tekst står stadig i arbejdsplanen: ${forbidden}`);
const markdown=fs.readFileSync('HANDBOOK-RAVRADAR.md','utf8');
for(const forbidden of ['Ved stærk offshore-strøm sættes transportloft 28','E-04 | Strøm | 0,15–0,65 m/s gunstigt','E-12 | Persistens | 3–18 timer bonus','E-14 | Sikkerhed | Generelle grænser'])if(markdown.includes(forbidden))throw new Error(`Markdown-håndbogen beskriver stadig en erstattet aktiv regel: ${forbidden}`);
const scoreImplementation=book.sections.find(x=>x.id==='score-implementering');
const hypotheses=book.sections.find(x=>x.id==='hypoteseregister');
for(const marker of ['Den aktive Candidate G-kode','grundscore = søgeforhold × 0,20','transportpotentiale 0 sættes hele RavScore til 0'])if(!`${scoreImplementation?.title||''}${scoreImplementation?.body||''}`.includes(marker))throw new Error(`Det aktive kodekapitel mangler: ${marker}`);
for(const marker of ['H-09','Ingen Candidate G-point fra rev, lavt vand, tang eller ålegræs','Et komplet 48-timers strømvindue'])if(!hypotheses?.body.includes(marker))throw new Error(`Hypoteseregisteret mangler: ${marker}`);
for(const forbidden of ['Transport starter på 34','Frigivelse starter på 22','0,15–0,65 m/s bonus','3–18 timer efter høj energi','Separat nearshore-remobilisation-spor'])if(book.sections.some(section=>section.body.includes(forbidden)))throw new Error(`Webhåndbogen beskriver stadig en erstattet aktiv regel: ${forbidden}`);
const allBookText=book.sections.map(section=>`${section.title}\n${section.body}`).join('\n');
for(const marker of ['20/50/30','Regelværkstedet er taget ud af aktiv administration','25/40/35 kan ikke længere vælges offentligt','Kalibreringssiden er skrivebeskyttet','Den kan ikke ændre Candidate G'])if(!allBookText.includes(marker))throw new Error(`Helhedshåndbogen mangler den aktuelle produktions- og admin-kontrakt: ${marker}`);
for(const forbidden of ['nuværende maksimumsregel','rollback-kriterium','Model-forslag er lokale browsermodeller'])if(allBookText.includes(forbidden))throw new Error(`Helhedshåndbogen indeholder stadig en erstattet eller misvisende formulering: ${forbidden}`);
for(const historicalId of ['production-shadow-validation-4-0-113','verified-current-history-readiness-4-0-220']){
  const section=book.sections.find(item=>item.id===historicalId);
  if(!`${section?.title||''} ${section?.summary||''} ${section?.body||''}`.toLowerCase().includes('historisk'))throw new Error(`${historicalId} er ikke tydeligt markeret som historisk evidens`);
}
const installSql=fs.readFileSync('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql','utf8');
const sqlPayload=JSON.stringify(book).replaceAll("'","''");
if(!installSql.includes(`values('handbook','${sqlPayload}'::jsonb,null)`))throw new Error('Supabase-installationsfilens håndbog er ikke identisk med den aktuelle webhåndbog');
console.log(`OK: ${book.sections.length} kapitler har læsehjælp, og ekspertens arbejdsplan er omskrevet i almindeligt dansk.`);
