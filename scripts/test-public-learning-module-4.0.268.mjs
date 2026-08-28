import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const index = read('index.html');
const learning = read('learn.html');
const learningCss = read('learn.css');
const serviceWorker = read('service-worker.js');
const infoPanel = read('js/ui/info-panel.js');
const assistant = read('js/services/rav-assistant.js');
const i18n = read('js/i18n.js');
const auth = read('js/services/auth-service.js');
const account = read('js/ui/account-panel.js');
const app = read('app.js');

assert.match(index, /href="\.\/learn\.html"/, 'Forsiden skal linke tydeligt til læringsmodulet');
assert.match(index, /Lær ravjagt fra havbund til fund/, 'Linket skal forklare, at modulet handler om ravjagt');
assert.match(serviceWorker, /\.\/learn\.html/, 'Læringsmodulet skal være en del af appens offlinepakke');
assert.match(serviceWorker, /learn\.css/, 'Læringsmodulets typografi skal være en del af offlinepakken');

for (const marker of [
  'Grundbog i ravjagt',
  'Et fund kræver en hel kæde',
  'Det meste rav synker',
  'Bølgehøjde er ikke nok',
  'Vandlag kan gå hver sin vej',
  'Kysten er en sorteringsmaskine',
  'Læs det, stranden viser dig',
  'Selve jagten: søg systematisk',
  'Stranden',
  'Vandkanten',
  'Waders',
  'UV-lys',
  'Hvordan undersøger jeg, om et fund kan være rav?',
  'Det gode tidspunkt er ofte en fase',
  'Sådan omsætter RavRadar forløbet til en vurdering',
  'Viden, stærke analogier og åbne spørgsmål',
  'Miniordbog'
]) assert.ok(learning.includes(marker), `Læringsmodulet mangler: ${marker}`);

for (const marker of [
  'Kystnær tilførsel',
  'Rav i bevægelse',
  'Nærkyststøtte',
  'Søgeforhold',
  'Vind under 6 m/s',
  'ved 15 m/s',
  'ingen fast 13-timers nulregel',
  'Faldende vand kan samtidig flytte og koncentrere rav i render eller bag revler',
  'påstår ikke empirisk højere fundpræcision',
]) {
  assert.ok(learning.includes(marker), `Den aktive model forklares ikke korrekt: ${marker}`);
}
assert.doesNotMatch(learning, /25\s*\/\s*40\s*\/\s*35/, 'Den gamle vægtning må ikke stå i det offentlige læringsmodul');
assert.doesNotMatch(learning, /20\s*%[\s\S]*50\s*%[\s\S]*30\s*%/, 'Candidate G-vægtningen må ikke stå som aktiv model i læringsmodulet');
assert.doesNotMatch(learning, /går i nul efter 13 timer/, 'Den pensionerede 13-timers nul-gate må ikke forklares som aktiv');
assert.match(learning, /Strømmen transporterer/, 'Strøm og bølger skal have forskellige roller');
assert.match(learning, /Bølgerne mobiliserer/, 'Mobilisering skal forklares i almindeligt dansk');
assert.match(learning, /Der findes ikke én dansk vind- eller strømretning, som altid er bedst/, 'Modulet må ikke lære en falsk universel retning');
assert.match(learning, /UV-lys omkring 395 nm/, 'UV-afsnittet skal angive ekspertens praktiske bølgelængde');
assert.match(learning, /ikke offentligt oplyste bølgelængder/, 'Praktisk erfaring med andre speciallygter skal forklares uden at opfinde et tal');
assert.match(learning, /se rav gennem alger/, 'Erfaringen med speciallygter i vand skal være med');
assert.match(learning, /flow-arrow">←<\/span><small>Strøm mod kysten/, 'Pilen skal pege ind mod Kyst A');
assert.match(learning, /Kyst B[\s\S]*flow-arrow">↑<\/span><small>Strøm langs kysten/, 'Kyst B skal have lodret kyst og opadgående pil');
assert.match(learning, /Koldt vand kan gøre rav lettere at mobilisere/, 'Koldt vands betydning for mobilisering skal forklares');
assert.match(learning, /TiR96bdTRr0[\s\S]*Rav Jagt/, 'Temperaturforklaringen skal kreditere og linke til Rav Jagts video');
assert.match(learning, /rav-jagt-where-is-amber\.svg/, 'Rav Jagts kysttværsnit skal indgå i læringskæden');
assert.match(learning, /På havbunden[\s\S]*I vandsøjlen uden for revlerne[\s\S]*På ydersiden af revlerne[\s\S]*Mellem revler og strand[\s\S]*I vandkanten[\s\S]*På stranden/, 'Rav Jagts seks positioner skal stå i faglig rækkefølge');
assert.match(learning, /RavRadar koncentrerer sig derfor om en bundnær repræsentation af strømmen/, 'RavRadars bundnære fokus skal forklares');
assert.match(learning, /vestvendt kyst[\s\S]*østvendt kyst/, 'Retning skal forklares med konkrete kysteksempler');
assert.match(learning, /selve revlehullet[\s\S]*bagsiden af revlen/, 'De praktiske samlesteder ved revlehuller skal forklares');
assert.match(learning, /lige foran og bag linjen/, 'Der skal også søges bag en frisk tanglinje');
assert.match(learning, /Vinden fortæller ikke i sig selv, hvilken vej den bundnære strøm går/, 'Vind og bundnær strøm må ikke blandes sammen');
assert.doesNotMatch(learning, /\bgrus\b/i, 'Grus må ikke stå som et almindeligt ravtegn');
assert.doesNotMatch(learning, /Fem enkle påstande/, 'Den overflødige myteboks skal være fjernet');
assert.match(learning, /Undgå varme nåle, ild og andre ødelæggende hjemmetests/, 'Modulet skal fraråde ødelæggende ægthedstests');
assert.match(learning, /<svg[\s\S]*Strømmen transporterer/, 'Modulet skal have en tilgængelig illustration af processen');
assert.match(learningCss, /@media\(max-width:640px\)/, 'Modulet skal have en målrettet mobilopsætning');
for (const cssClass of ['process-chain', 'role-grid', 'sign-grid', 'method-grid', 'case-grid', 'glossary']) {
  assert.match(learningCss, new RegExp(`\\.${cssClass}\\b`), `Grundbogens layout mangler: ${cssClass}`);
}
const sectionIds = new Set([...learning.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
for (const target of [...learning.matchAll(/href="#([^"]+)"/g)].map(match => match[1])) {
  assert.ok(sectionIds.has(target), `Grundbogens link peger på et manglende afsnit: ${target}`);
}
assert.ok(learning.indexOf('Selve jagten: søg systematisk') < learning.indexOf('Sådan omsætter RavRadar forløbet til en vurdering'), 'Ravjagten skal læres før appens scoremodel forklares');

for (const internalTerm of ['lokal score uden blandede vejrdata', 'fælles komplet scorepost', 'Supabase-session']) {
  assert.ok(!index.toLowerCase().includes(internalTerm), `Forsiden viser internt sprog: ${internalTerm}`);
  assert.ok(!infoPanel.toLowerCase().includes(internalTerm), `Zonepanelet viser internt sprog: ${internalTerm}`);
  assert.ok(!auth.toLowerCase().includes(internalTerm), `Login viser internt sprog: ${internalTerm}`);
}
assert.ok(!infoPanel.includes('RavScore vurderer ravmuligheden, ikke om turen er sikker.'), 'Zonepanelet skal forklare søgeforhold uden gentagne sikkerhedsadvarsler');
assert.ok(!assistant.includes("'Er forholdene sikre?'"), 'En sikkerhedsadvarsel må ikke være et fremhævet standardspørgsmål');
assert.match(assistant, /t\('assistant\.local\.safety'/, 'Et direkte sikkerhedsspørgsmål skal bruge den stabile sikkerhedsnøgle');
for (const safetyText of [
  'RavScore er en vurdering af ravforholdene, ikke en sikkerhedsvurdering',
  'Der RavScore bewertet Bernsteinbedingungen, nicht die Sicherheit',
  'RavScore assesses amber conditions, not safety',
]) assert.ok(i18n.includes(safetyText), `Sikkerhedssvaret mangler i det offentlige sprogkatalog: ${safetyText}`);
assert.doesNotMatch(index, />Fallback-data/, 'Kildeafsnittet skal forklare reservekilder uden internt fagsprog');
assert.doesNotMatch(app, /Seneste datasæt/, 'Den offentlige status skal sige, hvornår siden er opdateret, ikke omtale et datasæt');
assert.doesNotMatch(auth, /new Error\(['"]Supabase|message:['"]Supabase/, 'Loginfejl må ikke vise leverandørnavnet til brugeren');
assert.match(auth, /E-mail eller adgangskode er forkert/, 'En almindelig loginfejl skal oversættes til forståeligt dansk');
assert.doesNotMatch(account, /RavRadars database/, 'Kontoen skal forklare lagring uden unødigt teknisk sprog');
assert.match(account, /t\('account\.coastMissing'\)/, 'Kontoen skal bruge den stabile nøgle for manglende kyststrækning');
for (const coastMissingText of ['Kyststrækning ikke angivet', 'Küstenabschnitt nicht angegeben', 'Coastal section not provided']) {
  assert.ok(i18n.includes(coastMissingText), `Kontoens tekst for manglende kyststrækning mangler: ${coastMissingText}`);
}

console.log('Offentligt læringsmodul og almindeligt brugersprog valideret.');
