# AI Working Rules – RavRadar

## 1. Systemisk fejlretning
RavRadar fejlrettes som et system. Start med den konkrete observation og følg runtimekæden både bagud til input/kilde og fremad til score, UI, test og deployment. En rød test er et symptom, indtil årsagen er bevist.

## 2. Fem faste faser
1. Analyse uden kodeændring: reproducer, hent log/evidens, tegn runtimekæden og find sidste fungerende reference.
2. Rodårsag: vis præcis hvor data/tilstand ændrer sig forkert, og hvorfor.
3. Minimal implementering: ret årsagen og undgå uvedkommende ændringer.
4. Validering: målrettede regressioner + hele relevante kæde + releasegate.
5. Hukommelse: opdater RDKS, håndbog, changelog, tests og eventuelt roadmap/issues, så dokumentation beskriver den faktiske implementering.

## 3. Evidenshierarki
Frisk produktionslog og faktisk runtimeadfærd vejer højere end en ældre supportfil. Aktuel kode vejer højere end en historisk chat. En lokal test må ikke bruges som bevis for GitHub- eller produktionssucces. Hvis to kilder er uenige, registreres konflikten og den nyere, verificerede kilde undersøges.

## 4. Dataintegritet
- DMI er autoritativ.
- `null`/manglende betyder ukendt, ikke 0.
- Strøm-U/V og andre vektorkomponenter må kun kombineres efter deres videnskabelige identitet. For DKSS-current betyder det mindst samme forecasttid, samme fysiske gitterpunkt og samme vertikallag.
- Forecastserier holdes separat for strøm, vandstand, temperatur, bølger og vind.
- UTC er kanonisk tidsbasis. Filtrering sker før interpolation.
- Generelle strømbånd er ikke scoredata eller fallback.
- Stale data må ikke genindføres for at skjule datamangler.

## 5. Administratoren er en del af runtime
Zonenavn, kystlinje, land-/havpunkt, retningsankre, `onshoreDirectionDeg`, stationsrouting og andre godkendte adminfelter er dynamiske data. Tests må beskytte integritet, ikke historiske værdier. Når en adminændring er gemt centralt, skal den propagere gennem produktionen uden efterfølgende kodeændring.

## 6. Regressioner
Når en regression rammer kort, data, score eller admin, sammenlignes med sidste version hvor funktionen faktisk virkede. Find introducerende commit/ændring og kontroller alle afhængige led. Undgå en kæde af små symptom-hotfixes.

## 7. Performance
Public startup skal forblive let. Historik/state og andre tunge beregninger udføres i pipeline, og browseren får kompakte afledte felter. Enhver ændring i startupkæden vurderes mod den historiske ca. 2–3,5 sekunders baseline og må ikke ukritisk flytte tungt arbejde til klienten.

## 8. Release og stabilitet
En kodepakke er ikke stabil bare fordi `npm run validate` er grøn lokalt. For ændringer der afhænger af DMI/Supabase/pipeline kræves frisk CI/produktionsverifikation. Ved release dokumenteres præcist hvad der er lokalt grønt, CI-grønt og produktionsverificeret.

## 9. Dokumentationspligt
Ingen væsentlig arkitektur-, data-, score-, admin- eller driftsændring afsluttes uden at opdatere RDKS og relevante håndbogsafsnit. Historiske chats bevares, men nye sandheder skrives ind i de autoritative dokumenter.

## 10. Arbejdsdisciplin i Codex
Arbejd i det lokale Git-repository. Vis/inspektér diff før commit. Lav små, forklarlige commits med tests. Push først når lokal validering er passende grøn. Brug GitHub Actions som ekstern verifikation, og gennemgå produktionsresultatet for ændringer i eksterne datakæder.

## 11. Deployment-gates må aldrig være falsk grønne
Et GitHub Actions-run er ikke releasebevis, hvis `npm run validate` eller `npm run release:gate` er `skipped`. Codex skal kontrollere **step status**, ikke kun runets grønne topstatus. Et workflow må ikke kunne bygge og deploye et nyt produktionsartifact efter frisk dataopbygning, mens de bindende releasegates springes over. Den kendte 4.0.117-overgangsfejl skal være første Codex-rettelse.
