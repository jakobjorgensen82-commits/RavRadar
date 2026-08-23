# RavScore-profilaktivering 4.0.261

## Kort beslutning

Candidate G bliver den gældende scoreprofil i den endnu ikke offentlige RavRadar-installation. Ejeren accepterer, at transporthukommelsen i de første timer er ufuldstændig, og at scorerne derfor kan rette sig ind, mens det rullende 48-timersvindue fyldes.

| Felt | 4.0.261 |
| --- | --- |
| Omskifter | `RAVSCORE-PROFILE-SWITCH-4.0.261` |
| Ønsket/aktiv profil | `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` |
| Vægte | `20/50/30` |
| Rollback | `RRS-CURRENT-B0-4.0.247` (`25/40/35`) |
| Automatisk aktivering | Forbudt |
| Opvarmningsstatus | `candidate-active-pre-public-warmup` indtil komplet memory |
| Central konfiguration | `ravscore-profile-selection` |

## To forskellige dækningskrav

Aktiveringen skelner mellem:

1. **Scoreprojektion:** Candidate G skal kunne beregnes med korrekt model-id for alle nødvendige kystdele, timer og begge jagtformer. Dette krav kan ikke fraviges. Mangler én projektion, vælges legacy for hele datasættet.
2. **Transporthukommelse:** `transportMemoryReady` fortæller, om det faste 48-timersvindue er komplet. Ejeren har accepteret, at dette krav ikke blokerer den første ikke-offentlige aktivering. Status og coverage bevares uændret i runtime.

Denne opdeling ændrer ikke strøm-, mobiliserings- eller jagtbarhedsmodellen. Den ændrer kun, hvornår den allerede beregnelige Candidate G må bruges som gældende score.

## Central promotion og rollback

Repositoryets 4.0.261-dokument indeholder en eksplicit, versionsbundet ejerautoritet. Under første hydrering bevares denne kun, hvis den er nyere end den centrale konfiguration. Produktionen skriver derefter dokumentet til Supabase og kræver identisk readback. Ved samme eller nyere central version vinder central sandhed, så en global rollback kan gennemføres uden kodeblanding.

Manglende, ukendt eller ugyldig konfiguration vælger altid legacy. `automaticActivationAllowed` er altid falsk.

## Leverancegates

- målrettede switch-, projektion-, shadow-, central-hydrering- og rollbacktests;
- RDKS-validering og samlet `validate:source` på PR'ens eksakte head;
- frisk post-merge-produktion med central write/readback, fuld `validate` og `release:gate`;
- aktiv dataminimeret 210/673-shadow, der kræver offentlig score lig Candidate G;
- fuld browserkontrol af zoner, kystdele, begge jagtformer, score, farver og bedste tidspunkt;
- direkte livekontrol af manifestets profil-id og fortsat eksakt rollback-id.

Den naturlige passage af 48 timer er efterfølgende driftsevidens, ikke endnu en udviklingstest eller en ny aktivering.

## Uændrede grænser

Ingen rå strømvektorer, koordinater eller private payloads publiceres. Ingen bund-, dybde-, rende-, revle-, adgangs-, stedegnetheds- eller sikkerhedsregel tilføjes. Geometri og land-/vandpunkter ændres ikke.
