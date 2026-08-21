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

## 12. Modelvalg, kvalitet og kvote
Codex vælger ikke automatisk den stærkeste model til alt. Før hvert væsentligt arbejdsafsnit vurderes ræsonneringsdybde, nødvendig forståelse af kodebasen, fejlkonsekvens og om arbejdet berører RavScore, fysik/faglig model, DMI/fallback, dataintegritet, arkitektur eller produktion.

GPT-5.6 Sol anbefales til forskning, den store videnskabelige RavRadar-analyse, RavScore og transportmekanismer, ukendte rodårsager, komplekse regressioner, arkitektur, kritisk DMI-/forecast-/cache-/fallbacklogik og endelig teknisk/faglig validering. Ved reel tvivl beholdes Sol.

Når en billigere tilgængelig model realistisk kan levere samme nødvendige kvalitet, stopper Codex før hovedarbejdet, anbefaler den konkrete model og begrunder det kort. Codex skal også opdage grænsen for den billigere models arbejde og bede Jakob skifte tilbage til Sol før næste kritiske del. Mekanisk dokumentation, formatering, oprydning, simple klart definerede ændringer og ukomplicerede tests er typiske kandidater til en billigere model.

Kvoteudløb må aldrig føre til overfladisk analyse eller udeladte tests. Ved pause gemmes et permanent checkpoint med undersøgelse, evidens, konklusioner, afviste og åbne hypoteser, ændringer, tests, mangler, næste trin og anbefalet model. Den videnskabelige hovedanalyse må gerne pauses til næste nulstilling, men dens centrale syntese og vurdering udføres som udgangspunkt med Sol. Se DEC-0031.

## 13. PR- og mergeautoritet
Codex må oprette og opdatere korte, datasikre PR'er fra egne push-branches og må selv merge dem til `main`, når den fulde relevante systemkontrol er bestået. Det kræver passende lokale tests, release-gates, regressionstest, dataintegritet, produktionskontrakter og nødvendig RDKS-/håndbogs-/changelogopdatering. Secrets, credentials, private produktionsdata, komplette diagnostikpayloads og U/V-værdier må aldrig indgå i PR-tekst eller utilsigtet eksponeres.

En grøn GitHub-status kan ikke tilsidesætte konkret fejlevidens. Ved reel fejl eller væsentlig usikkerhed stoppes merge, og forholdet undersøges eller rettes. Efter en sikker merge følger Codex deployet, verificerer commit og relevante produktionsresultater og fortsætter direkte til næste ikke-blokerede roadmap-punkt. Irreversible, destruktive, usædvanligt risikable eller ikke-godkendte beslutninger kræver fortsat ejerens udtrykkelige godkendelse.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Under udvikling køres målrettede tests. Den fulde validate:source skal bestå på PR'ens eksakte head i GitHub og køres kun også lokalt ved bred/tværgående risiko, manglende CI eller konkret fejlevidens.
- Push og manuelle produktionsbyg beholder den tidlige kildekodegate. Planlagte vejropdateringer på samme allerede kontrollerede main-kode må springe netop denne gentagelse over.
- validate:source erstatter aldrig den fulde npm run validate og npm run release:gate efter central hydrering og frisk vejr. De fulde gates forbliver obligatoriske før hvert nyt deploybart artifact.
- Fuld 210/673-browserkontrol køres ugentligt eller ved ændret UI, score eller offentlig datakontrakt; ellers bruges målrettet kontrol. Se DEC-0045.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
