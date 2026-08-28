# DEC-0103 – Samlede ejerrettelser til UI, Grundbog og Spørg RavRadar

- **Status:** Implementeret i 4.0.306-kandidaten; afventer exact-head og produktion
- **Dato:** 2026-08-28
- **Modelpåvirkning:** Ingen

## Beslutning

1. Om-siden bruger **vejrforløb**, ikke *vejforløb*.
2. Grundbogen bruger ejerens/ekspertens praktiske UV-angivelse **395 nm**. Tidligere aktiv tekst om 365 nm er erstattet. Spørg RavRadar og håndbøger følger samme faktum.
3. Koldt vands betydning beskrives tydeligere: større vandtæthed og opdrift kan gøre rav lettere at mobilisere, men gør ikke i sig selv det meste rav flydende og giver ingen fundgaranti. Rav Jagts video linkes som praktisk uddybning.
4. Rav Jagts syv skitser samles i ét responsivt, krediteret og fagligt afgrænset kysttværsnit med seks ordnede positioner fra havbund til strand.
5. Den lokale assistentviden udvides med ravlygte, farver, behandling af fund, årstider, geologiske sekundærlagre og valg mellem strand/vand. Åbne ravfaglige specialspørgsmål må fortsat bruge den dataminimerede Edge-vej; sikkerheds-, privatlivs- og emnegrænser bevares.
6. Synlige tyske og engelske tekster kalder produktets score henholdsvis **BernsteinScore** og **AmberScore**. Interne model-id'er, feltnavne og kontrakter forbliver `RavScore`.
7. Afsluttet tur og manuel indberetning får delstrengssøgning i zonenavne uden at fjerne rullemenuen.
8. Kortsignaturen forklarer strøm- og vindpile. Strømpilen gøres mørkere. Mobilknappen **Spørg RavRadar** må bryde over to linjer.
9. Grundbogens Kyst B har lodret kystlinje og opadgående pil for strøm langs kysten.

## Fast grænse

Candidate G, 20/50/30, scorekurver, transport-, bølge-, mobiliserings- og leveringssemantik, DMI/Copernicus-input, state/cache/recovery, modelprofil, geometri samt land-/vandpunkter ændres ikke. Temperaturteksten er faglig formidling og aktiverer ikke et nyt scoreinput.
