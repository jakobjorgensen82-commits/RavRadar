# Candidate-public fra normalt pakket privat input

**Dato:** 2026-10-20

**Status:** Lokal rettelse implementeret; kildekvalifikation og levering åbne.

## Efterfølgende præcis CI: rankingkontrakt

Den efterfølgende præcise GitHub-kontrol bestod native PostgreSQL, den normale
kildevalidering og prepare-målet. Den fulde stage stoppede derefter på
`Candidate G public five-day waders ranking is incomplete`. Det var auditorens
forældede krav om fem rækker pr. dag; `buildPublicNationalForecast` leverer
normalt Top20. Der blev ikke påvist en fejl i producentens rangering.

Efterfølgeren kræver datoakse, eksakt Candidate-model og hele hver dags resultat
fra den samme normale kanoniske projektion. Den erstatter ikke den gamle grænse
med en anden uafhængig rækkegrænse og svækker ikke de eksisterende hele startup-,
details- eller manifestkontroller. En kanonisk delvis fremtidig dag må fortsat
være tom; manglende rækker må ikke opfindes.

En kort strukturel normalprøve køres før den eksisterende dyre stage. Den prøver
Top20 og afviser fem-rækkersafkortning, manglende række, ændret score, duplikeret
zone, ændret dato, manglende dag/dato og forkert model. Den er ikke bevis for
hele den faktiske offentlige projektion; den eksisterende fulde stage og ny
samlet exact-head-CI skal fortsat bestå. Den almindelige vejrhentning ændres
ikke. De senere nationale og kapacitetsmæssige CI-trin blev ikke kørt i det
fejlede job og er stadig åbne.

## Tidligere reproduktion: normalt leveringsindeks

Den ene fulde lokale stage-prøve har faktisk genereret alle 118 Candidate-timefiler
og bestået zonebindinger, originalbevarelse og de tre inputafslag. Den stoppede
derefter i den normale reserveaudit: `writePublicDelivery` tilføjer
`manifest.detailDelivery`, mens auditoren sammenlignede med den statiske
`buildPublicManifest` alene. Startup og details havde bestået deres kanoniske
kontroller. Det er en selvstændig auditregression, ikke et grønt samlet mål.

Den afgrænsede efterfølger bevarer hele den gamle kanoniske manifestkontrol og
genopbygger alene det validerede leveringsindeks gennem den eksisterende normale
inventarvalidator, eksakte header-/descriptorfelter og zonemedlemskab. Den må
ikke blot ignorere indekset. Filindhold, hash, model og privatliv skal fortsat
bestå de normale artifact- og deploykontroller; indeksformat er ikke filbevis.
Fire nye mutationer bevarer afslag på ufuldstændig timeakse, ændret zone og ekstra
index-/descriptorfelter. De gamle prøver og deres afslag bevares.
Manifestmutationer skrives i producentens normale indrykkede JSON, mens startup
forbliver kompakt. Et forkert tekstformat må ikke skjule manglende semantiske
kontroller i hverken de nye eller gamle manifesttilfælde.

Ny præcis kildekontrol skal gennemføre hele det normale mål. Den 43 minutter
lange lokale generation gentages ikke alene for status. Testens eksisterende
automatiske oprydning fjernede dens midlertidige stage ved fejlen; fulde logs og
kontrolkvitteringer bevares privat. Et slettet testartifact må ikke påstås genbrugt.

**Omfang:** Det manuelle Candidate G-reserve-/vedligeholdelsesforløb, ikke den
almindelige integrerede vejrhentning uden Candidate-aktivering.

## Konkret kalderproblem

Den almindelige updater gemmer `conditions.json` med den eksisterende tabsfri
private timepakning og en markør til den originale integrerede offentlige
timepakke. Workflowets isolerede Candidate-stage udelader bevidst `.cache`.

`prepare-candidate-g-operational-rollback.mjs` læser hidtil det pakkede input uden
hydrering, kloner det og erstatter `coastalParts` med den validerede Candidate
runtime. Den nye kopi beholder både `privateZoneHourly` og den integrerede
`publicHourDelivery`. Dermed blandes gammel pakket zonetilstand med nye inline
Candidate-zonetimer. Den normale efterfølgende hydrator afviser blandingen.
Desuden er den gamle markørs nationale ranking og timepakke bundet til en anden
model; de må ikke bruges eller ommærkes som Candidate-resultater.

## Afgrænset normal rettelsesvej

Den eksisterende tabsfri hydrator skal behandle input før Candidate-kopien
oprettes. En eksisterende offentlig timepakkemarkør skal først bestå sin normale
markørkontrol; invalidering må ikke skjule et format- eller hashafslag. Denne
kontrol er ikke i sig selv bevis for pakkens bytes. Kun den nye kopis afledte
offentlige timepakkemarkør invalideres før
forsegling, fordi dens kyst-runtime er udskiftet. Normal publicgenerering skal
derefter bygge Candidate-ranking og timefiler fra de faktiske Candidate-rækker.
Input, original integreret pakke, beskyttet B/S og offentliggjorte scorer må ikke
ændres. Ingen null-pack-omgåelse, håndlavet verifikation eller genbinding af
integrerede scoreværdier til Candidate er tilladt.

Forberedelses-/installationsværktøjerne ligger uden for de to numeriske
modelbundles. Rettelsen skal ikke ændre modelkilde, SQL, C/I-binding, scoreformel,
kildeprioritet, administratorpunkter eller geometri.

## Den nødvendige regression

Udvid den eksisterende normale public-stage-prøve med den normale pakkebygger,
udtrykkeligt syntetiske integrerede timefiler og kompakt/pakket input. De
integrerede scorer kommer fra normal evaluator/presenter; de syntetiske
pakkeinput er ikke bevis for en fuld integreret publicering. Kør normal prepare,
stageinstallation
uden gammel cache, publicgenerering og Candidate-audit. Kontroller originalernes
uændrede bytes, præcis 118 Candidate-zonetimer og korrekte indre/ydre bindinger.
Beskadiget privat pakning, ugyldig gammel markør og afkortet Candidate-prognose
skal stadig afvises ved deres normale grænser.
Lokale prøver er ikke sikker levering eller en faktisk produktionsaktivering.

Den målrettede prøve har faktisk reproduceret
`PRIVATE_CONDITIONS_HOURLY_ZONE_INVALID` i normal publicgenerering før
produktrettelsen. Prøven efter rettelsen skal afsluttes og vurderes, før den
kaldes bestået. De konkrete kørselskvitteringer føres i det private checkpoint
og den præcise kildekontrol, ikke som løbende status i denne forklaring.
Et tidligere forsøg med en unødvendig ekstra integreret publicbygning blev
kontrolleret afbrudt; det er hverken en rød eller en grøn prøve.

Begge eksisterende Candidate-mål føjes præcis én gang til PR-workflowets normale
kildetrin efter den eksisterende kildekontrol. De importeres ikke fra den
almindelige public-kontraktprøve, fordi den brede historiske releasegate allerede
kører dem særskilt. Den aktuelle workflowkontrol inverterer kun den præcise nye
kommandolinje før den uændrede hele historiske workflowhash. Gamle kildepins,
negativprøver og jobgrænser bevares.

## Selvstændig grænse: zoner er ikke samtlige fremtidige PART-rækker

Den normale Candidate-producent bevarer zoneprognosens beregnede timer, men kun
hver kystdels aktuelle række. En afledt cacheinvalidering skaber ikke manglende
fremtidige kystdelsrækker. Offentlig projektion skal fortsat vise deres fravær
ærligt; hverken H0-rækken eller en zones vinderdelsvejr må genbruges som fremtidig
lokal evidens. Et særskilt krav om alle fremtidige Candidate-PART-rækker kræver
et særskilt normalt producent-/kapacitetsbevis og er ikke lukket her.

Den isolerede SOURCE-revisions initialiseringsprofil forbliver inaktiv og UNRUN.
En ny fixture eller et før-CAS-afslag alene løser ikke denne normale kalderfejl.
