# RavRadar 4.0.294

## Naturlige formuleringer om ravets dannelse

- Den første offentlige 4.0.293-kontrol fandt, at **Hvordan opstod rav?** blev afvist, selv om oprindelsesemnet allerede fandtes.
- Oprindelses-intentet genkender nu almindelige dannelsesformuleringer på dansk, tysk og engelsk, herunder **Hvordan opstod/dannes rav?**, **Wie entsteht Bernstein?** og **How is amber formed?**.
- Tre særskilte formuleringcases supplerer de eksisterende 51 balancerede lokale cases og beviser lokal routing og nul netværkskald.

## Efterfølgende driftslukning – Cloudflare-credential

- Workers AI-tokenet er roteret med mindst-mulig Read + Edit på den eksakte konto. Kun den eksisterende Supabase Edge-secret blev erstattet gennem den godkendte dashboardkanal; ingen værdi blev vist eller skrevet i repositoryet, og intet redeploy var nødvendigt.
- Den nye vej bestod ægte DA/DE/EN-fjernsvar, fast lokal rouladeafvisning, tilladt CORS, fremmed Origin `403`, seks `200` og `429` på syvende minutkald samt lokal browserfallback.
- Fire gamle generisk navngivne tokens blev tilbagekaldt efter særskilt ejerbekræftelse. Første post-revoke-probe blev fail-closed af en transient `503 RATE_LIMIT_UNAVAILABLE` før provider; ét afgrænset retry bestod `200` med gyldigt GPT-OSS-svar.
- Målrettede RDKS-, håndbogs-, privacy-, Edge-, assistent- og fallbacktests samt fuld lokal `validate:source` og releasegate er grønne på Sol/Ekstra høj.
- Dette er en ren driftsrotation uden ny version, kodeændring, Edge-deploy eller produktionsartifact.

## Isolation

- Rettelsen ændrer kun den lokale tekstklassifikation. Svartekst, GPT-OSS-model, Edge-kontrakt, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.
- De beskyttede geodatafiler ændrer kun deres tilladte topversionsfelt.

## Verifikation

- Den målrettede DA/DE/EN-formuleringsregression, den eksisterende offentlige i18n-/routingkontrakt samt fuld lokal sourcegate/releasegate er grønne.
- PR #195 bestod exact-head `33131976433` på `80866ba8`, blev merged som `a3eb4ac5` og gennemførte produktion `33132053882`, build `98723615102` samt Pages `98725082313`. Det samtidige private shadowrun `33132055561` var også grønt.
- Offentlig 4.0.294 viste farvet kort, fem **Bedste områder**, fem prognosedage og den korrekte lokale oprindelsesforklaring for **Hvordan opstod rav?**, **Wie entsteht Bernstein?** og **How is amber formed?**. Kvoteteksten er korrekt på alle tre sprog, og den afgrænser fortsat AI fra kort, prognoser, RavScore og øvrige funktioner.
- Den versionsstyrede Edge-kilde med 23 evidens-ID'er blev deployet og livekontrolleret på DA/DE/EN. Fast rouladeafvisning, fremmed-origin-afvisning, tilladt CORS og den virkelige 6/minut-grænse med lokal browserfallback er grønne.
- 4.0.294 er dermed produktionsverificeret. Candidate G viser fortsat den senest komplette prognose som tydeligt markeret nøddrift, mens en ny sammenhængende 48-timersstate modnes; dette er uafhængigt af assistentrettelsen.
