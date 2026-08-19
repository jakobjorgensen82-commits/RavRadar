# RavRadar 4.0.235

## Én lokal visningskontekst

- Den aktuelle zonevisning bruger nu den lokale vinderdels eksakte tidspunkt og vejrpost sammen med samme RavScore, forklaring og debug.
- En lokal score uden lokal vejrpost låner ikke hovedzonens felter. Ved ufuldstændig fælles lokal række vises i stedet en tydeligt mærket, samlet hovedzonefallback.
- National prognose og zonepanelets femdøgnsfaner bruger samme `selectLocalBestForDay`, så del, tidspunkt, score, forklaring og vejr ikke kan vælges ad forskellige veje.
- Runtime bevarer den vindende dels kompakte scorekomponenter, årsager, transportforklaring og viste vejrmetrikker for hver fælles time. Det fulde aktuelle debuggrundlag bevares fortsat på den eksakte del.

## Landsdækkende regression

- En ny regression dækker 210 zoner, 673 kystdele, begge jagtformer og 2.100 femdøgnsvisninger gennem den offentlige startup-/detailfletning.
- Testen kræver identisk vinder, tidspunkt, score, strøm-/vindretning, vandtemperatur, komponentårsager og transportforklaring mellem den valgte lokale post og det grundlag, UI'et får.
- Eksisterende lokale score-, forklarings-, kort-, null-safety-, progressive payload- og versionsregressioner bevares.

## Uændret

- Ingen centralt gemte land-/vandpunkter, kystlinjer eller retningsankre flyttes eller overskrives.
- Ingen U/V-værdier, pilceller, dybdelag, kildeorden, afstandsgrænser, scorevægte, rollback eller retention ændres.
- Produktionsgaten kræver fortsat præcis 673/673. Fælles aktuel timedækning rapporteres særskilt og må ikke skjules af artifactets samlede proveniensdækning.

## Verifikation

- Lokalt: RDKS og den nye landsdækkende regression består på 4.0.235. Den fulde lokale `validate` når den kendte fail-closed kontrol af repositoryets forældede 209/211-vejrsnapshot; frisk data skal som hidtil hydreres og bygges centralt.
- Afventer: fuld central validering, releasegate, præcis 673/673, Supabase, Pages, artifactmatch og direkte livebrowser.
