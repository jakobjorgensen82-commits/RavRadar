# DEC-0143 – Strømaudit bruger produktionsvektor og integreret holdtilstand

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Ejer + implementeringsbevis
**Berører:** Rumlig strømaudit, DMI native→runtime-projektion, integreret `NATIVE_CADENCE_HOLD`, cutoverrapport
**Supplerer:** DEC-0142, DEC-0140, DEC-0132 og DEC-0131

## Kontekst

4.0.360 bestod exact-head-sourcegate `34795741830`, blev merged som main `cbb56fcb00b9ce654b51768b3df23d7add2e8904`, og handoff `34797345624` forseglede 79.414/79.414 currentpar uden provider eller oneoff.

Cutover `34798027472` gennemførte alle fem hovedkontroller og 272/272 underkontroller. Fire hovedkontroller var grønne. Fuld validering havde én fejl i `test-current-spatial-scientific-audit-4.0.76.mjs`: 654/673 kystdele blev genkendt. Ingen eksterne writes eller deploy blev udført.

Det samme build dokumenterede 673/673 scoreklare dele, og den særskilte integrerede public-runtime-audit bestod 210 zoner, 673 dele og 1.346 aktuelle modes. Derfor skulle forskellen afgrænses i audittens egen rekonstruktion.

Fem DMI-dele blev reproduceret fra den rå højpræcisionsvektor, selv om produktionen bruger de femdecimalers U/V-værdier fra `buildDmiForecastHourly`. Fjorten vektorfrie dele var gyldige `NATIVE_CADENCE_HOLD`, men auditten læste kun pensionerede Candidate G-felter og ikke den aktive integrerede `ravScoreModel`-form.

## Beslutning

1. En allerede verificeret native DMI-række skal fortsat projekteres gennem `buildDmiForecastHourly`.
2. Projektionen skal levere både runtimeproveniens og de eksakte U/V-værdier, som produktionsadapteren bruger efter femdecimalers komponentafrunding.
3. Vist hastighed og retning skal reproduceres fra disse produktionsværdier, ikke fra en tidligere rå repræsentation.
4. Den fælles holdkontrol skal foretrække den aktive integrerede form:
   - `runtimePart.ravScoreModel.currentTransition`
   - `currentReferenceAt`
   - `currentMemoryReady`
   - `currentMemoryStatus`
5. Den historiske Candidate G-form må kun accepteres som rollbackkompatibilitet.
6. Et hold består kun ved korrekt `NATIVE_CADENCE_HOLD`, tilladt memory-status, gyldig score-/referencetid, alder over nul og højst tre timer samt eksakt verificeret reference i den private closurehistorik.
7. En del, som ikke består projektion eller hold, skal rapporteres med sin konkrete grund. Et samlet dækningsantal må ikke skjule individuelle årsager.
8. Alle fem hovedkontroller og alle 272 underkontroller forbliver bindende. Ukendt eller materiel fejl stopper før eksterne writes.

## Konsekvenser

- 654/673 fra run `34798027472` klassificeres som auditmismatch, ikke som 19 manglende vejrpar.
- DMI-identitet, modelrun, collection, grid, gridpunkt, afstand, lag, valid time og hash kontrolleres fortsat før runtimeprojektion.
- Ingen tolerance, automatisk accept eller generel advisoryundtagelse indføres.
- Ingen score-, vejr-, rotations-, cache-, geometri-, migrations-, database- eller privacysemantik ændres.
- Integrated- og rollback-bundlerne forbliver byteuændrede.

## Beviskrav

- En regression skal krydse en reel femdecimalers retningsafrundingsgrænse og kun bestå med produktionens projicerede U/V.
- En regression skal bevise en integreret hold under `ravScoreModel` mod eksakt closurehistorik.
- Exact-head-sourcegate skal være grøn før merge.
- Nyt SHA-bundet cache-handoff og fuld cutover skal bevise rettelsen på de virkelige private data.
- Efter grøn cutover skal offentlig 210/673/118, begge modes og hjemmesiden kontrolleres, før normal weather genaktiveres.

## Ikke besluttet her

- Ingen ny oneoff.
- Ingen ændring af almindelig DMI-rotation eller providerbudget.
- Ingen empirisk påstand om scoremodellens fundpræcision; det kræver fortsat virkelige ture og kalibrering.
