# RavRadar 4.0.391 – gyldige gamle data før lokalt MISSING

## Bindende driftsregel

1. Nye gyldige data erstatter gamle data.
2. Ved et hul beholdes gamle data for præcis samme sted og tidspunkt, så
   længe de stadig er gyldige.
3. Først når både nye data mangler og den gamle værdi er udløbet, bliver
   feltet `MISSING`.
4. Et lokalt `MISSING` må ikke gøre resten af RavRadar ubrugelig.

## Præcisering

- Reglen gælder alle vejrkilder og alle vejrkørsler.
- En gammel værdi genbruges kun med fuldt gyldig identitet, validTime,
  proveniens, enhed og fysik.
- Kildeordenen DMI → Baltic → AMM15 → regional DMI → Open-Meteo består.
- Alle 79.414 identiteter skal repræsenteres af værdi eller eksplicit
  `MISSING`. Kun nul `MISSING` må kaldes komplet.
- Et ærligt lokalt hul rammer kun den berørte kystdel, søgemåde og time.
  Strukturel korruption og kontraktbrud forbliver globale stopfejl.
- En zone med mindst én gyldig kystdel beholder en tydeligt markeret delvis
  score; antallet af medregnede dele vises, kalibrering låses, og en ukendt
  kystdel kan ikke skjules som en sikker zonevinder.

## Driftsevidens

4.0.390-bootstrap `35081537023` gennemførte alle providerled og gemte
fremgang. De sidste 84 par var forsøgt og provider-negative; Open-Meteo havde
ikke ramt sit tidsbudget. Den gamle globale nul-missing-gate stoppede derfor
hele buildet. 4.0.391 retter denne uoverensstemmelse mellem datagaten og
RavRadars lokale availability-kontrakt. Se DEC-0173.

Model- og continuationbindingerne er ført frem gennem det reproducerbare,
append-only led `20260916120000_valid_data_before_local_missing_binding.sql`.
Den integrerede bundle er `8727feba…`, continuation er `3b9b0fd5…`, og den
private Candidate G-rollbackbundle er `65d26045…`.
