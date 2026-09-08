# DEC-0120 – vedvarende WAM-cache og sen completeness-gate

- **Status:** Ejerbesluttet, lokalt implementeret og måltestet i 4.0.335; exact-head, runtime og produktion åbne
- **Besluttet:** 2026-09-08
- **Ejer:** RavRadar
- **Supplerer:** DEC-0114, DEC-0118 og DEC-0119
- **Supersederer snævert:** krav om én samlet WAM-modelkørsel for eksakte vedligeholdelsesrækker, hel-cache-reset ved én ugyldig bølgerække og tidlig WAM-stop før uafhængig currentfallback

## Bindende beslutning

1. Den persistente cache er den brugbare base. Et nyt leverandørskifte er vedligeholdelse, ikke tilladelse til at nulstille hele vinduet.
2. En eksisterende tuple bevares, indtil en ny komplet tuple har gyldige bølgefelter, retning, native kildeproveniens og fysisk celle. Udskiftning sker atomisk pr. kystdel/time.
3. En lokalt ugyldig bølgerække salvages alene som bølgekomponent. Alle uafhængigt gyldige bølge-, vind-, strøm- og historikrækker bevares. Ugyldig registry/control plane forbliver fatal.
4. Eksakte operationelle WAM-rækker må komme fra flere verificerede modelkørsler og celler. En interpoleret time må fortsat kun have to native endepunkter i samme collection, modelkørsel, gitter og fysiske celle og må højst spænde over fire timer.
5. Et WAM-checkpoint kan kun springe en fil over, hvis processing-signatur og modelkørsel matcher, den valgte officielle assetidentitet matcher eksakt, og den faktiske cache igen beviser alle krævede native mål for filen. En markør alene er aldrig bevis.
6. Feggesunds tre dele håndteres af den eksisterende godkendte wave-only direct/proxy-kontrakt. De er ikke native WAM-mål, men registryen forbliver præcis 673 dele, og slutproof kræver fortsat tre dele × 118 timer.
7. Tidlig WAM-readiness er vejledende for progression. Uafhængig currentfallback må køre og gemme sine cacher. Før freshness, closure, runtime, artifact eller deploy kræves en separat fail-closed WAM-slutgate.
8. Parser-, dækning- og cachefejl skal klassificeres hver for sig med aggregerede, privacy-sikre koder. En ufuldstændig fil er ikke automatisk en parserfejl og må ikke starte falsk langtids-cooldown.
9. Normale, eksternt cron-startede kørsler vedligeholder efter cutover den samme persistente cache. Oneoff er kun accelerator. Tunge cachewriters forbliver serialiserede.

## Bevisgrænse

De målrettede lokale tests beviser kodekontrakten, ikke provideradfærd eller produktion. 4.0.335 må først kaldes runtimeverificeret efter exact-head CI, merge og et main-oneoff, og den nye model må først kaldes online efter komplette data, fulde gates, deploy og offentlig kontrol.
