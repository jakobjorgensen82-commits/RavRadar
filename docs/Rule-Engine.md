# Regelværksted og scoreændringer

## Gældende status

Det tidligere Regelværksted er pensioneret som aktiv administratorfunktion. Det kunne gemme og afprøve enkle betingelser i browseren, men det var ikke koblet til den offentlige Candidate G-score på en måde, der kunne garantere RavRadars samlede kontrakt.

Eksisterende centralt eller lokalt gemte regeludkast slettes ikke. De bevares som historiske arbejdsdata, men publiceres ikke og påvirker ikke RavScore.

## Hvorfor det ikke er et sikkert scoreværktøj

En sikker ændring af RavScore kræver mere end en enkelt betingelse og en pointvirkning. Den skal blandt andet kontrolleres mod:

- 20/50/30-vægtningen mellem søgeforhold, transport og mobilisering;
- op til 48 timers naturlig tilstandshistorik;
- den glidende reduktion ved kraftig fralandsstrøm;
- særreglen om, at transport 0 giver samlet score 0;
- waders-specifikke vindtrin og scoreloft;
- lokale datagab og fail-closed-adfærd;
- alle 673 kyststrækninger, 210 zoner og begge søgemåder;
- forklaringer, ranglister, deployment og versionsbundet rollback af kode.

Det gamle værksted testede kun et forenklet øjebliksbillede. En grøn test dér kunne derfor ikke bevise, at en regel var sikker i produktion.

## Gældende arbejdsgang

1. Eksperten gennemgår håndbogen og sender en faglig rettelse eller observation via reviewfunktionen.
2. Forslaget beskrives som en testbar hypotese med mekanisme, geografi, jagtform, tidsforløb, undtagelser og evidens.
3. Forslaget omsættes til versionsstyret Candidate G-kode og RDKS-beslutning.
4. Der køres målrettede tests af den berørte kontrakt samt de nødvendige kilde- og releasegates.
5. Ændringen gennemgås i en pull request og bliver først offentlig efter merge, deployment og produktionsverifikation.

Ingen ekspertkommentar, håndbogsrettelse, lokal browserpost eller central adminpost kan ændre den offentlige score direkte.

## Historisk kode

`js/core/rule-engine.js`, `js/services/rule-service.js` og de versionsstyrede JSON-filer under `rules/` kan fortsat anvendes i afgrænset forskning og historiske analyser i repositoryet. De kopieres ikke med i GitHub Pages-artifactet og er ikke en del af den offentlige Candidate G-scorekæde. Centralt gemte administratorregler er udtrykkeligt udelukket fra både publicering og scoreberegning.
