# Næste chat – obligatorisk projektindlæsning

Denne fil er den praktiske overlevering mellem chats. Den skal læses umiddelbart efter `00_READ_FIRST.md` og før der foreslås eller ændres kode.

## Første handlinger i en ny chat
1. Udpak den seneste projekt-ZIP. Brug ikke tidligere arbejdsmapper som sandhed.
2. Læs i rækkefølge:
   - `AGENTS.md`
   - `docs/rdks/00_READ_FIRST.md`
   - `docs/rdks/05_NEXT_CHAT_HANDOFF.md`
   - `docs/rdks/90_INDEX/CURRENT_TRUTH.md`
   - `docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md`
   - `docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md`
   - `docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md`
   - seneste changelog
   - relevante håndbogskapitler og aktuel kode
3. Bekræft den faktiske version i `package.json`, `version.json`, browserimports og service worker.
4. Kør eller gennemgå de relevante tests, før der drages konklusioner.
5. Skeln mellem: implementeret lokalt, verificeret af CI, og verificeret i produktion.

## Aktuel arbejdsbaseline
- Baseline før denne release var 4.0.111.
- Den historiske tilstandsmodel er i **score-neutral skyggetilstand**. Den forklarer tilstand, men må endnu ikke ændre RavScore.
- Offentlig opstart er senest målt omkring 3,45 sekunder. Performance må ikke forringes væsentligt.
- Vandstationsadminens røde markører, administratoroverride og `Fjern` er produktionsbekræftet efter localStorage-rettelsen i 4.0.106.
- Sitetesten har én kendt falsk negativ: knappen til samlet sitetest kan kontrolleres før dashboardet er endeligt renderet. Næste patch skal vente på dashboardets aktive DOM og kontrollere en reel klikbar knap.
- GitHub/DMI-jobbet kan tage omkring 14 minutter og overlapper derfor et 10-minutters interval. Optimér først på grundlag af målinger; skjul ikke manglende marine data og sænk ikke auditkrav.

## Tilstandsmodel – besluttet retning
RavRadar skal være en tidslig tilstandsmodel, ikke kun et øjebliksbillede. Den eksisterende scoremotor bevares og udvides lagvist.

Aktive næste mekanismer:
1. Automatisk referencezonerapport i skyggetilstand.
2. Faglig validering af akkumuleret ind-/udtransport uden nye manuelle billedserier.
3. Første scoreændring: et glidende transportbidrag, der vokser med dokumenteret varighed, styrke og stabilitet af indadgående strøm. Der må ikke bruges en universel 3–5-timers kontakt.
4. Senere: gradvis efterstormopbygning over omtrent 10 timer og vedvarende nærkystpotentiale, der kun nedbrydes ved dokumenteret udtransport/tid.
5. Én mekanisme pr. release efter skyggevalidering og regressionstest.

## Bindende faglige og tekniske afgrænsninger
- DMI's faktiske marine u/v-data er autoritative. Generelle strømbånd må ikke bruges i score eller fallback.
- Eksisterende dokumenteret morfologi (fx rev, ålegræs og lavt vand) bevares i scoren. Manglende morfologi er neutralt; ejeren skal ikke manuelt kortlægge hele Danmark.
- Als Odde og Helberskov er en åben kystzone nord for Mariager Fjord, ikke en fjordzone.
- Zonegeometri kan være administratoroverstyret. Referenceanalyse skal bruge aktiv produktionsgeometri, ikke antage at statiske grundfelter altid er de gældende.
- Brugerfund skal kræve valgt jagtzone. GPS er plausibilitetskontrol, fordi rapporten kan indsendes hjemmefra.
- Rå historik og tunge beregninger skal blive i pipeline. Offentlig runtime får kun kompakte afledte felter.
- Projektet må ingen steder nævne de to forbudte eksterne analysekilder. Kildeneutralitet gælder UI, kode, kommentarer, dokumentation, RDKS, håndbog, AI, tests og artefakter.

## Referencezoner
De nuværende referencezoner er:
- `DK-B01-01` Agger og Krik Vig – kompleks/åben vestkyst.
- `DK-B02-07` Asaa og Melholt – nordjysk østkyst.
- `DK-B02-13` Als Odde og Helberskov – åben kyst ved fjordmundingens nordside, ikke fjord.
- `DK-B03-13` Blåvand og Hvidbjerg – højenergi og flere lokale kystretninger.

Brug automatiske rapporter fremover. Bed kun om nye screenshots i yderste nødstilfælde, når kode, ZIP, sitetest, log og diagnostik ikke kan afgøre spørgsmålet.

## Fast udviklingsmetode
Tænk ændringen til ende før implementering. Følg hele kæden:
input → scheduler/tidsbudget → cache → datagenerering → proveniens → state/score → offentlig runtime → UI/admin → tests → artifact → deploy → browser.

Søg efter gamle tests og antagelser, som ændringen gør forældede. Simulér både frisk opdatering, cachegenbrug og fejlgrene. En ZIP må kun leveres efter fuld validering på det præcise pakkede indhold.

## 4.0.113 – næste produktionskontrol
- Fem komplette kørsler 6. august 2026 viste 12–15 minutters varighed og gentagen `marine-warmup-pending`.
- Rodårsagen var GitHubs uforanderlige cache: samme ugentlige primærnøgle blev ramt hver gang, hvorefter cache-action undlod at gemme den nye GRIB-fremdrift.
- 4.0.113 bruger unik save-nøgle pr. kørsel og gendanner seneste kompatible cache.
- Næste analyse skal kontrollere, at cachefremdrift faktisk bæres mellem kørsler, at warmup ophører, og at jobtiden falder eller stabiliseres.
- Cron forbliver foreløbig 10 minutter. Intervallet må først ændres efter nye målinger uden cachefejlen.
- Workflowloggen skriver nu `RAVRADAR_STATE_REFERENCE` med datasæt og de fire zoners kompakte skyggefelter. Sammenlign mindst tre friske produktionstimer.

## 4.0.114 – produktionskontrol
- Workflowet er opdelt i `build-and-prepare` og `deploy-pages`.
- Kontrollér at kun deployjobbet viser environment `github-pages`.
- Hvis deployjobbet fejler, brug `Re-run failed jobs`; build/DMI-jobbet må ikke køre igen.
- Kontrollér at der kun findes ét `github-pages`-artifact i runnet.
- Efter grøn deploy køres sitetest. Først derefter fortsættes den historiske tilstandsplan.
