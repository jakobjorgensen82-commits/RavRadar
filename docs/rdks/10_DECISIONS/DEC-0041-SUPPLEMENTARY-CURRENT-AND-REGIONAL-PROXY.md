# DEC-0041 – Supplerende 3D-strøm og afgrænset regional Limfjordsproxy

- **Status:** Aktiv beslutning, privat pilot før produktionsaktivering
- **Besluttet:** 2026-08-18
- **Ejerbeslutning:** Ja

## Baggrund

Efter ejerens manuelle rettelse af alle land-/vandpunkter og vandstandsroutinger gav den friske centrale kørsel 622/673 lokale kystdele med verificeret fælles DMI-U/V inden for 5 km. Alle 51 mangler blev eftermålt. En officiel kildetest fandt, at Copernicus Baltic kunne levere eksakte fælles U/V-par inden for 5 km til 39 af de 51, og at AMM15 kunne levere fire yderligere vestkystpar; to af de fire AMM15-celler havde kun overfladelaget som dybeste tilgængelige lag. Resultatet er et kildepotentiale, ikke endnu en produktionsverificeret dækningsgaranti.

Otte resterende modelhuller ligger i den vestlige Limfjord. Deres nærmeste observerede eksakte DMI-`dkss_lf`-kolonner lå 5,416–12,110 km fra de centralt godkendte vandpunkter. Ejeren besluttede, at netop disse dele hellere skal bruge det nærmeste tilgængelige strømpar end stå uden strøm.

## Beslutning

1. Den almindelige lokale strømregel forbliver 0–3 km foretrukket og højst 5 km. Der indføres ingen global ubegrænset afstandsregel.
2. Den planlagte kildeorden er: verificeret DMI inden for 5 km → Copernicus Baltic inden for 5 km → AMM15 inden for 5 km → afgrænset DMI-regionalproxy for de otte navngivne Limfjordsdele.
3. Copernicus-kilderne starter i en separat privat 168-timers pilot med `scoreImpact=false` og `publicRuntime=false`. U/V skal have samme produkt, forecasttid, gittercelle og dybdelag; interpolation og krydsmerge er forbudt. Kun nærmeste gyldige vandkolonne vælges, derefter dybeste fælles lag i samme kolonne.
4. Regionalproxyen må kun gælde de otte poster i `data/current-regional-proxy-policy.json`, kun fra `dkss_lf`, kun i Limfjorden og kun op til 15 km. Det aktuelle yderpunkt på 12,110 km er dermed dækket uden at åbne en fremtidig vilkårlig afstand.
5. Et ændret centralt samplingpunkt invaliderer den pågældende godkendelse. Ingen del kan tilføjes automatisk; ny del eller afstand over 15 km kræver en ny ejerbeslutning.
6. Regionalproxyen skal mærkes som regional og må aldrig beskrives som lokal måling. Pilen står på den faktiske modelcelle. Proveniens bevarer samplingpunkt, gridpunkt, afstand, collection, run, tid, lag og kvalitetsklasse.
7. Når de fulde aktiveringsgates er bestået, må regionalproxyen levere den ellers manglende strøm til pil og eksisterende scoreinput. Der indføres ikke en udokumenteret afstandsvægt i denne ændring; proxyklassen bevares, så den senere DEC-0029-analyse kan måle og eventuelt vægte kvaliteten.
8. De to AMM15-celler, hvor 0 m er dybeste tilgængelige lag, tælles særskilt som `surface-only` i pilotbeviset. De må ikke skjules som bundnære og kræver eksplicit synlig kvalitetsproveniens ved en senere aktivering.

## Aktiveringsgate

Privat kode og data må ikke nå offentlig runtime, pile eller score, før følgende er dokumenteret på friske centrale punkter:

- gyldig autentificeret Copernicus-download uden credentiallæk,
- flere modelruns med stabil kilde-, tids-, celle- og lagidentitet,
- højst 5 km for alle Copernicus-par og højst 15 km for de otte eksplicitte DMI-proxyer,
- korrekt placering af pile på den faktiske kildecelle,
- fuld verificeret strømdækning af alle aktive kystdele, aktuelt 673/673; den tidligere 95 %-indfasningsgate er erstattet,
- fuld projektvalidering, releasegate og frisk produktionsworkflow,
- samt sikker fallback til DMI eller `missing`, hvis en supplerende kilde fejler.

Første autentificerede private bevis `#32129799346` ved 2026-08-18 11:00Z fandt 39 Baltic- og fire AMM15-par blandt de 51 DMI-huller; de sidste otte var præcis regionalproxyens allowlist. Det opfylder én timeprøve, men ikke kravet om flere modelruns. Derfor forbliver integrationen inaktiv, mens en privat timeplan opbygger højst syv døgns stabilitetshistorik.

Første cron `#32134686185` hentede 12:00Z, men afslørede LRU-fortrængning af 11:00Z under cirka 10,2 GB fælles Actions-cache. En rå artifactløsning blev forkastet, fordi repositoryet er offentligt. Restore-only keepalive `#32136328681`, kontrolleret backfill `#32136391556` og efterkontrol `#32136642330` beviser nu to tider/1.258 records i samme private cache uden gitter-/lagskift eller rå/credentiallæk i supportoutput. Det er flertidslagringsbevis, men endnu ikke syv døgn eller flere modelruns og giver ingen aktiveringstilladelse.

Retentionkontrakten er derefter ført ind i normal releasevalidering. Den bevarer grænseposten ved præcis 168 timer, beskærer ældre, fremtidige og strukturelt ugyldige restoreposter, deduplikerer eksakt og stopper ved nye poster uden lokalt samme-tid/celle/lag-U/V-bevis. Dette er kodebevis; det naturlige fulde syvdøgnsvindue og flere modelruns kræves fortsat før aktiveringsdesign.

GitHubs native schedule viste sig efterfølgende ikke driftssikkert: workflowet var aktivt og manuel dispatch virkede, men kun ét forsinket schedule-event blev leveret. Piloten beholder native schedule som reserve, mens den normale opsamling kobles til `requested`-eventet fra det eksisterende eksternt startede produktionsworkflow. Keepalive må kun gendanne og kontrollere privat cache read-only. Mangler aktuel UTC-time, må et særskilt minimalt job med `actions: write` dispatch'e den eksisterende private pilot på `main`; det må ikke skrive cache, uploade rådata, ændre produktionsworkflow eller deploye. Denne driftsrettelse ændrer ingen aktiveringsgate.

4.0.232-kandidaten implementerer den private DMI-del af beslutningen. Alle otte allowlistmål bygges på hver kørsel fra den aktuelt centralt hydrerede kystdelsregistrering. Kun `dkss_lf` kan levere dem, almindelige mål bevarer 5-km-grænsen, og en ændret godkendt koordinat eller afstand over 15 km stopper lukket. Rå U/V opbevares kun i den private 168-timers cache; den artifactegnede supportreport indeholder kun tid, run, gitter, lag og afstand. Dette er indsamling, ikke offentlig aktivering.

## Konsekvens

Beslutningen fastholder kvaliteten af lokale data for resten af landet og giver en kontrolleret vej mod fuld geografisk dækning. Den påstår ikke, at en strøm 12 km væk er lige så lokal som en strøm 1 km væk. Forskellen bliver maskinlæsbar og kan derfor indgå ærligt i den kommende analyse af hele transportkæden.

Ejerens efterfølgende præcisering om at bevare 100 % dækning er implementeret fail-closed i 4.0.232: produktionsaudittens krævede antal er altid lig det aktuelle antal aktive kystdele. Det ændrer ikke pilotdata eller kildeorden; det forhindrer blot release ved 672 eller færre verificerede dele.
