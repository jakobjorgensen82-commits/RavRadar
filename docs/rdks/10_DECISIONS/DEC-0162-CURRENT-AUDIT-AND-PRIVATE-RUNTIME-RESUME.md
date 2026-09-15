# DEC-0162 – Audit og privat runtime fortsætter fra faktisk current

**Status:** Aktiv; implementeret lokalt i 4.0.380, produktionsbevis afventer
**Dato:** 2026-09-15

## Evidens

4.0.379 bestod exact-head sourcegate `34959283992`, blev merged gennem PR
#321 som main `0cc4a867`, og providerfri code-only `34959875107` kom gennem
central læsning, migration, privat restore/installation, offentlig genopbygning,
210/673-audit, Pages-privacy, privat publicering, anonym-afvisning samt eksakt
assistent- og readinessdeploy. Ingen vejrprovider kørte.

Kørslen stoppede før Pages-begin på teksten `Integrated public audit lacks an
exact current-history summary`. Producenten skrev korrekt fire felter:
fuld historik, ufuldstændig historik, utilgængelig og det samlede boolske
resultat. Den fælles forbruger tillod fejlagtigt kun de første tre. Det reelle
measured-only-resultat havde 420 utilgængelige modes og var derfor et gyldigt,
ikke-kalibreringsegnet koldstartsresultat.

Helikoptergennemgangen fandt desuden, at en efterfølgende kodeversion ville
forsøge at migrere fra den oprindelige `fa418f43`, selv om 4.0.379 allerede var
private-runtime-pointerens current. Same-reference-værnet ville korrekt afvise
det gamle migrationsbevis mod den nye current.

## Beslutning

- Auditforbrugeren kræver alle fire historikfelter, ikke tre. De tre antal skal
  være ikke-negative heltal og tilsammen præcis 420. Boolfeltet skal svare til
  420 fulde, nul ufuldstændige og nul utilgængelige modes.
- `UNAVAILABLE` gør `calibrationEligible=false`; det er ikke i sig selv et
  ugyldigt auditdokument eller tilladelse til at opfinde en score.
- Ved en ny kode-only-modelbinding beskrives den beskyttede pointers faktiske
  current-generation uden private payloads. Dens source-head skal være en
  eksakt forfader til ny main, og netop denne source, manifest og runtime skal
  være migrationens forgænger.
- Migrationen må fortsat kun ændre kendte `modelBundleSha256`-felter. Målinger,
  scorer, Candidate G-state og de øvrige otte private filer skal være uændrede.
- Beskrivelsen må ikke indeholde Storage-stier, objekter eller privat payload.
  Midlertidige restorefejl får højst tre forsøg.

## Drift

Den forseglede kildepakke fra `34877443841` findes fortsat og er ikke udløbet.
4.0.380 kræver én exact-head sourcegate, merge og derefter providerfri
code-only. Ingen normal weather eller oneoff før Pages, central completion og
offentlig model er verificeret. Derefter bruges normal tidsbegrænset weather
til at bevise numeriske scorer, rotation og cachevedligeholdelse.
