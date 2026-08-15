# P1 – uafhængige modelcyklusser

**Grundlag:** artifacts #2764, #2771 og #2777 samt den udvidede read-only komponentaudit i 4.0.222

## Hvorfor dette er nødvendigt

Tre forskellige grønne GitHub-kørsler er ikke nødvendigvis tre forskellige vejrsituationer. De kan genbruge samme DMI-modelkørsel. Overgangstal må derfor ikke tælles som uafhængig evidens alene ud fra artifact- eller dataset-id.

## Faktisk fund

Artifacts #2764, #2771 og #2777 indeholder samme aktive cachekørsler:

- HARMONIE: 15. august kl. 03 UTC.
- WAM DW og WAM NSB: 15. august kl. 00 UTC.
- DKSS IDW, NSBS og LF: 15. august kl. 06 UTC.

De tre artifacts dokumenterer drift og historikvækst, men giver ikke tre uafhængige forecastcyklusser til fastsættelse af permanente overgangsgrænser.

## 4.0.222-audit

Komponentrapporten viser nu for hver komponent:

- antal DMI-timer pr. collection,
- antal DMI-timer pr. modelkørsel,
- collection og modelkørsel samlet,
- native, interpoleret og nærmeste kant,
- samt DMI-timer uden collection eller modelkørsel.

På #2777 har vind, bølger, strøm og vandtemperatur fuld collection-/modelrun-proveniens. Vandstand har 210 routede timer uden modelrunfelterne, som nu fremgår eksplicit; de skjules ikke som dokumenterede. Det er et provenancefund til videre analyse, ikke tilladelse til at ændre vandstandskæden.

## Produktionsresultat for 4.0.222

GitHub Actions-kørsel #31890898143 bestod central adminhydrering og tombstones, frisk DMI-bygning, fuld validering, releasegate, Supabase-synkronisering, Pages-artifact og deploy på commit `d5b49b32`.

Artifact #2782 indeholder datasæt `rr-20260815145011-210`. Den udvidede audit viser fuld collection- og modelrun-proveniens for alle DMI-timer i vind, bølger, strøm, vandstand og vandtemperatur. De 210 udokumenterede vandstandstimer i #2777 var derfor et ældre artifactfund, ikke en vedvarende mangel i den friske 4.0.222-kæde.

Den aktive modelcyklus er fortsat HARMONIE 03 UTC, WAM 00 UTC og DKSS 06 UTC. #2782 er derfor endnu et driftsbevis fra samme aktive cyklus, ikke en ny uafhængig forecastcyklus.

Samme artifact har 158 rå historikprøver over 38,760 timer i alle 210 zoner. Verificeret spænd er 3,040 timer i 75 zoner, 20,580 timer i 125 zoner og 38,760 timer i 10 zoner. Historikken vokser fremadrettet, men ingen zone har endnu 72 verificerede timer.

## Exitkriterium

Permanente regressionsintervaller kræver flere forskellige model-run-id'er for den relevante komponent og overgangsretning. Gentagne artifacts fra samme run tæller som gentagelses-/driftsbevis, ikke som ny uafhængig forecastcyklus.
