# DEC-0043: Komplette ture som RavScore-evidens v2

Status: Aktiv releasekandidat
Dato: 2026-08-21
Version: 4.0.243

## Beslutning

RavRadars nye læringsenhed er en komplet søgetur, ikke et enkelt ravfund. Turen skal have faktisk start og slut, søgemetode, faktisk zone og kystdel, søgegrundighed samt fund eller intet fund. Gram er frivillig sekundær information.

Ved turstart fastholdes datasæt-id, udstedelses-/gyldighedstid og et lille tilladt sæt modelinput og delscorer. Startsted og faktisk afsøgt sted gemmes hver for sig. Hvis de ikke matcher, bevares turen som dækningsdata, men den må ikke bruges til automatisk kalibrering.

Den repræsentative observationstid er turens midtpunkt. Sen besvarelse må aldrig flytte turen til middag eller besvarelsestidspunktet.

## Privatliv og integritet

- Fjernpayloaden må ikke indeholde GPS, rute, spor, koordinater eller præcis position.
- Den lokale v2-kø skriver den komplette tur før den aktive post fjernes.
- Upload bruger den eksisterende public.observations-tabel, UUID trip_id og hunt_mode.
- Historiske rækker bevares som schema_version 1 og må kun bruges som dækningsdata.
- Nye v2-rækker bruger schema_version 2 og valideres af database- og JSON-kontrakt.
- Ingen land-/vandpunkter eller kystgeometri ændres.

## RavScore

Den aktive 25/40/35-vægtning og alle scoreregler er uændrede. V2-kontrakten gør fremtidig kalibrering mulig, men giver ikke i sig selv tilladelse til en vægt- eller regelændring.

## Releasekrav

Migrationen 20260821_trip_evidence_contract.sql skal være anvendt og verificeret i Supabase før merge. Derefter kræves fuld kilde-/release-gate, målrettet mobil turkontrol, PR-gates, exact-commit deploy og fuld 210/673-browserkontrol, fordi brugerflade og datakontrakt ændres.
## Produktionsafstemning 2026-08-21

Den aktive `public.observations`-tabel har en historisk numerisk identity-nøgle og numerisk legacy-zone-reference. DEC-0043 implementeres derfor med en separat unik `client_observation_id` samt tekstfelterne `actual_zone_id` og `actual_coastal_part_id`. Dette bevarer legacy-skemaet, undgår typecasts og giver idempotente genforsøg uden at gemme præcis position.
