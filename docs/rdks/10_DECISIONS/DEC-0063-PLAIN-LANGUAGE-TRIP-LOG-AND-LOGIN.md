# DEC-0063: Enkel turregistrering, privat turlog og forståeligt login

**Status:** Gældende ejerbeslutning
**Dato:** 2026-08-23

## Beslutning

Den aktive turregistrering er v2-kontrakten fra DEC-0042. Brugeren registrerer én afsluttet søgetur med start, slut, søgetid, jagtform, faktisk zone og kystdel, søgegrundighed samt fund eller intet fund. Den aktive rejse indsamler ikke GPS-spor, rute eller præcis position.

En bruger, der er logget ind ved indsendelsen, kan under sin konto åbne **Mine ture og fund**. Oversigten læser de samme eksisterende rækker i Supabase-tabellen `observations`, som allerede bruges til turdata. Der må ikke oprettes en ekstra tabel, en ekstra række eller en særskilt kopi i Supabase for at vise loggen.

`user_id` er en snæver præcisering af DEC-0042's identitetsforbud. Feltet må kun knytte den allerede eksisterende turpost til den indloggede ejer, så Supabase Row Level Security kan vise ejeren egne ture. Mailadresse, navn og anden direkte identitet må ikke skrives i turposten. Analyse, eksport og senere modeltræning må ikke bruge eller udlevere `user_id`.

Ture indsendt uden login forbliver anonyme og må ikke bagefter knyttes til en konto ved gæt eller fælles enhed. En lokal, midlertidig outbox er kun leveringssikring på den aktuelle enhed; serverloggen fjerner dubletter via turens eksisterende klient-id.

Oversigten indlæses først, når brugeren åbner den. Den viser højst de seneste 100 ture med et lille, fast feltudvalg. Det begrænser Supabase-egress på free-planen. En tur kan vises som afventende, mens den ligger i den lokale outbox, men den må ikke sendes som en ekstra serverrække.

Login er valgfrit. Brugerfladen skal forklare, at et magic link er et engangslink sendt til mailen, så brugeren kan logge ind uden adgangskode. Efter login skal callbacken hente den faktiske brugeridentitet fra Supabase, før en tur eller privat log behandles som kontoejet.

Offentlige tekster om RavScore, turregistrering, login og fund skal bruge almindelige, forståelige danske ord. Faglige internnavne må fortsat findes i kode og revisionsspor, men skal forklares eller oversættes i brugerfladen.

## Forhold til tidligere beslutninger

- DEC-0042's komplette tur som kalibreringsenhed, prognosesnapshot og forbud mod central GPS/rute består.
- DEC-0042's forbud mod direkte brugeridentitet gælder fortsat for kalibreringsdata og analyse. Den eneste præcisering er det tekniske `user_id`, som bruges til ejerens private RLS-læsning af samme række.
- Der ændres ingen RavScore-regel, vægt, profil, vejrdata, geometri eller land-/vandpunkt.

## Kontrolkrav

- RLS skal tillade en indlogget bruger at læse egne observationer og ikke andres.
- Kontrol skal låse, at loggen læser `observations` og ikke opretter ny tabel eller ekstra post.
- Både gamle og nye egne observationer skal kunne vises uden at gøre gamle observationer fit-klare til modeltræning.
- Adgangskodelogin, magic-link-callback, udlogning, turlog og indsendelse som henholdsvis indlogget og anonym skal browserkontrolleres.
- Produktionsredirect til magic link skal verificeres mod Supabases godkendte redirect-URL'er, før en rigtig mail sendes.

## Produktionskorrektion i 4.0.266

Den første virkelige mail-/kontoprøve viste, at dette kontrolkrav ikke var gennemført i 4.0.264: den centrale Site URL stod til localhost, og den aktive database manglede både et felt i turloggens SELECT og ejerens SELECT-policy. DEC-0065 retter og erstatter derfor den tidligere antagelse om, at live redirect- og RLS-kontrakten allerede var bevist. Selve beslutningen om én privat `observations`-række uden dobbeltlagring består.
