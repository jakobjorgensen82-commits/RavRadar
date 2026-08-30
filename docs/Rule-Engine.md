# Regelværksted og scoreændringer

## Gældende status

Det tidligere Regelværksted er pensioneret som aktiv administratorfunktion. Det kunne gemme og afprøve enkle betingelser i browseren, men det var ikke koblet til den offentlige score på en måde, der kunne garantere RavRadars samlede kontrakt. Candidate G er fortsat den produktionsverificerede offentlige model gennem 4.0.308; efter det samlede cutover er den integrerede model eneste offentlige scoreejer.

Eksisterende centralt eller lokalt gemte regeludkast slettes ikke. De bevares som historiske arbejdsdata, men publiceres ikke og påvirker ikke RavScore.

## Hvorfor det ikke er et sikkert scoreværktøj

En sikker ændring af RavScore kræver mere end en enkelt betingelse og en pointvirkning. Den skal blandt andet kontrolleres mod:

- 20/50/30-vægtningen mellem søgeforhold, transport og mobilisering;
- gridstrømmens fulde vægt i 24 timer og cosinusfade til nul ved 48 timer;
- +10/-8-forløbet efter 0,03/0,15 m/s samt adskillelsen mellem gridstrøm og lokale surfzoneprocesser;
- at transport 0 ikke nulstiller mobilisering, jagtbarhed eller hele RavScore;
- bølgemobiliseringens særskilte `Hs² × T`-forløb med cirka 4/48 timer;
- waders-specifikke vindtrin og scoreloft;
- lokale datagab og fail-closed-adfærd;
- alle 673 kyststrækninger, 210 zoner og begge søgemåder;
- forklaringer, ranglister, deployment og versionsbundet rollback af kode.

Det gamle værksted testede kun et forenklet øjebliksbillede. En grøn test dér kunne derfor ikke bevise, at en regel var sikker i produktion.

## Gældende arbejdsgang

1. Eksperten gennemgår håndbogen og sender en faglig rettelse eller observation via reviewfunktionen.
2. Forslaget beskrives som en testbar hypotese med mekanisme, geografi, jagtform, tidsforløb, undtagelser og evidens.
3. Forslaget omsættes til versionsstyret kode under den gældende integrerede modelbinding og en RDKS-beslutning.
4. Der køres målrettede tests af den berørte kontrakt samt de nødvendige kilde- og releasegates.
5. Ændringen gennemgås i en pull request og bliver først offentlig efter merge, deployment og produktionsverifikation.

Ingen ekspertkommentar, håndbogsrettelse, lokal browserpost eller central adminpost kan ændre den offentlige score direkte. Det gælder også rollback: Candidate G kan kun gøres offentlig gennem den særskilte manuelle, versions-CAS-styrede controller og et fuldt verificeret 210/673-Pages-deploy; hverken Regelværkstedet, en scheduler eller en ekspertpost kan starte skiftet. Assistentens integrerede Edge rulles ikke tilbage til Candidate G, men svarer `409`, så klientens deterministiske lokale DA/DE/EN-svar bruges.

## Historisk kode

`js/core/rule-engine.js`, `js/services/rule-service.js` og de versionsstyrede JSON-filer under `rules/` kan fortsat anvendes i afgrænset forskning og historiske analyser i repositoryet. De kopieres ikke med i GitHub Pages-artifactet og er hverken del af Candidate G's offentlige 4.0.308-score eller den integrerede scorekæde efter cutover. Centralt gemte administratorregler er udtrykkeligt udelukket fra både publicering og scoreberegning.
