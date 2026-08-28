# DEC-0104 – Candidate G genoprettes før 4.0.306-produktion

- **Status:** Produktionsverificeret og offentligt lukket i 4.0.306
- **Dato:** 2026-08-28
- **Modelpåvirkning:** Den for tidligt mergede næste model fjernes fra `main`; Candidate G forbliver eneste offentlige model
- **Geodata/private data:** Ingen ændring eller læsning; kun de allerede godkendte topversionsfelter følger 4.0.306

## Hændelse

PR #215 blev merged som `cfb9142062218a3ac8afc58a3de95560017450b2`, før DEC-0102's forsknings-, replay-, plug-and-play- og slutvalideringsrækkefølge var gennemført. Pushproduktion `33206467775` byggede frisk runtime, men stoppede før auditresultat, fulde slutgates og deploy, fordi auditrapportens forældermappe ikke fandtes. Den fejlede kørsel gemte først et nyere kompakt schema-3-checkpoint. Næste pushproduktion `33208713861` stoppede derfor endnu tidligere, da checkpointrestore krævede samme modelkontekst som den fortsat deployede Candidate G/schema 2. Ingen af kørslerne deployede.

Den offentlige kontrol viste fortsat 4.0.305/Candidate G med 210 zoner og 673 kystdele. Primærpakken `rr-20260828173039-210` var komplet og gyldig til 2026-09-02T12:00:00Z; den auditerede Candidate G-recovery var aktiv og gyldig til 2026-08-31T21:00:00Z. Der var derfor ikke et aktuelt dækningshul, men nye vejropdateringer var blokeret.

## Beslutning

1. 4.0.306-kildetræet føres tilbage til den rene ejercommit `c53f5060e2c4dde73f20444b2345f3e322ac7628`, som bygger direkte på den godkendte 4.0.305/Candidate G-baseline og indeholder PR #216's UI-, lærings- og assistentrettelser.
2. Candidate G, 20/50/30, schema 2, den centrale profil, generatoren, payloads, recovery og offentlig scoreadfærd bevares. Den næste model forbliver udviklingsarbejde under DEC-0102 og må ikke deployes, før hele rækkefølgen er gentaget og dokumenteret.
3. Den private checkpointrestore må genkende præcis den ene afbrudte overgang fra `RRS-COASTAL-CAUSAL-CHAIN-1`/schema 3 til den deployede Candidate G-kontekst, men kun når alle identitetsfelter og `stateKey` matcher den kendte kontrakt. Kun den hashkontrollerede signerede 48-timers strømevidens og den uændrede 4/48-mobilisering genbruges. Candidate G's transportpotentiale og effektive udtransporttimer rekonstrueres straks fra evidensen med dens uændrede +10/-8-/13-timersprofil; schema 3's glatte potentiale og counter kopieres ikke.
4. Et ukendt eller blandet model-id, schema, variant, profil eller `stateKey` må ikke ændre måldokumentet. Det samme gælder, hvis én kystdels state eller transportreference går baglæns i tid. Restoren returnerer en kontrolleret årsagskode, hvorefter produktionen fortsætter fra den verificerede deployede Candidate G-state; integritetsfejl forbliver fatale.
5. Adapteren må ikke kopiere vejr, scores, rå U/V, koordinater, geometri, land-/vandpunkter, credentials eller private payloads.
6. GitHub-genopretningen er først færdig, når PR'ens eksakte head er grøn, merge er sket, frisk produktion har bestået fuld `validate` og `release:gate`, Pages er deployet, og offentlig desktop/mobil samt 210/673 er verificeret.

## Produktionsbevis og lukning

- PR #217 bestod exact-head-kildegaten `33212348031` på `91dffaa35dded3644aa95bdd5235983e966a9085` og blev merged som `8ebbd4e7aaafee2a4a840749f35398355fe3fb03`.
- Pushproduktion `33212435923` kørte på præcis mergecommittet. Den krydsmodelbundne checkpointrestore passerede, frisk DMI/Copernicus/proveniens blev bygget, den faktiske Candidate G-runtimeaudit, fuld `npm run validate`, `npm run release:gate`, Pages-artifact og deploy bestod. GitHub Pages-deployment `6148930627` er `success` på samme commit.
- Offentlig 4.0.306 viser det friske primærdatasæt `rr-20260828213450-210`, produktionstime 2026-08-28T21:00:00Z, komplet manifest og 210 zoner/673 kystdele. Den friske primærstate er årsagstro `0/673 READY` og `673/673 WINDOW_INCOMPLETE`; den atomiske, tydeligt markerede recovery `rr-20260827013448-210` er derfor aktiv med bestået 210/673-audit, 673 memory-ready kystdele, 1.346 modeevalueringer og nul rekonstruktionsafvigelser. Det er den eksisterende godkendte hel-datasætspolitik og ikke et dækningshul.
- Offentlig desktop ved 1440 x 900 og mobil ved 390 x 844 viser farvet kort, fem aktuelle områder, fem resultater på hver af fem prognosedage, fungerende zonedetalje, version 4.0.306 og den korrekte recoverybesked. Mobilvisningen har ingen vandret overflow, og begge kontroller har nul konsolfejl.
- Broen bevarede den eksisterende sammenhængende evidenssuffix. Ved produktionstimen var den cirka 36 af krævede 48 timer gammel efter det dokumenterede gab 27. august; tidligste naturlige `673/673 READY` er derfor cirka 2026-08-29T09:00:00Z, hvis der ikke kommer et nyt gab over tre timer. Recoveryens operative aldersgrænse er den tidligste af prognosehorisonten og 72 timer efter `generatedAt`, her cirka 2026-08-30T01:34:48Z, altså cirka 16,5 timers margin efter forventet modning. Progressionen overvåges i de planlagte produktioner; dette er driftsovervågning, ikke en genåbning af den nu afsluttede GitHub-genopretning.

## Aktiveringsblokeringer for næste model

Den fornyede Sol/Ultra-audit har allerede fundet selvstændige blokeringer: den hårde `sqrt(supply × mobilisation)`-gate kan forveksle ukendt sekundærlager med fysisk fravær; manglende bølger kan bevare næsten maksimal mobilisering som READY; og replay fra rand 0 kan give et brat supplyfald ved 48-timersgrænsen uden ny udgående evidens. Den kanoniske evidensbase og realistiske historiske/offentlige replays var heller ikke afsluttet før PR #215. Disse fund skal løses i modelsporet og må ikke patches ind i driftsgenopretningen.

## Rollback

Hotfixet er selv rollbacken til Candidate G. Hvis den præcise checkpointadapter fejler exact-head eller frisk produktion, må den ikke omgås; produktionen forbliver på den seneste verificerede offentlige pakke, mens adapteren rettes. Den afbrudte schema-3-cache må aldrig tvinges ind med generisk identitetsomskrivning.

Den deterministiske regression bruger et reelt 48-timers/49-punkts READY-vindue, bevarer hele den afledte evidens og mobilisering, rekonstruerer Candidate G-oraklet før filskrivning og fortsætter derefter gennem Candidate G-pipelinen med `initialStateAccepted=true` og fortsat READY. Den låser desuden 12/13/14-timersgrænsen, indgående reset, neutral og ufuldstændig memory samt byteuændret mål ved ukendt/blandet kontekst, tidsregression og metadata, der modsiger oraklet.
