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

## Exitkriterium

Permanente regressionsintervaller kræver flere forskellige model-run-id'er for den relevante komponent og overgangsretning. Gentagne artifacts fra samme run tæller som gentagelses-/driftsbevis, ikke som ny uafhængig forecastcyklus.
