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
- fuld projektvalidering, releasegate og frisk produktionsworkflow,
- samt sikker fallback til DMI eller `missing`, hvis en supplerende kilde fejler.

Første autentificerede private bevis `#32129799346` ved 2026-08-18 11:00Z fandt 39 Baltic- og fire AMM15-par blandt de 51 DMI-huller; de sidste otte var præcis regionalproxyens allowlist. Det opfylder én timeprøve, men ikke kravet om flere modelruns. Derfor forbliver integrationen inaktiv, mens en privat timeplan opbygger højst syv døgns stabilitetshistorik.

## Konsekvens

Beslutningen fastholder kvaliteten af lokale data for resten af landet og giver en kontrolleret vej mod fuld geografisk dækning. Den påstår ikke, at en strøm 12 km væk er lige så lokal som en strøm 1 km væk. Forskellen bliver maskinlæsbar og kan derfor indgå ærligt i den kommende analyse af hele transportkæden.
