# RavRadar 4.0.232

## Privat regional DMI-opsamling

- De otte ejer-godkendte Limfjordsdele oprettes nu som særskilte private forskningsmål på hver DMI-kørsel. Kun `dkss_lf`, det uændrede centralt godkendte samplingpunkt, Limfjord-zoneklasse og en eksakt fælles U/V-celle højst 15 km væk accepteres.
- Deres faktiske U/V-profiler gemmes i den eksisterende private 168-timers cache. Alle almindelige kystdele og 0/5/15-km-forskningsmål beholder 5-km-værdigrænsen.
- En regional-only cache-replay behandler kun Limfjordsmodellen. Den kan derfor supplere de otte mål uden at åbne IDW/NSBS som skjulte regionale kilder og uden at gøre privat forskning vigtigere end den offentlige vejrbygning.
- En ny support-only rapport viser del, samplingpunkt, modelkørsel, forecasttid, gittercelle, afstand og lag. Den indeholder ingen rå U/V-værdier; råcachen og hele diagnostikmappen er fortsat udelukket fra Pages.

## Sikkerhed og tests

- Regressionen beviser uændret 5-km-afvisning for almindelige mål, accepteret allowlistprøve inden for 15 km, afvisning over 15 km, afvisning af forkert collection, ændret centralt punkt og forkert zoneklasse samt råvektorfri supportoutput.
- Eksisterende DMI-download-, cachemigration-, forecast-, scheduler- og workflowrækkefølgetests består lokalt. Policybyggeren består desuden mod #3079-artifactets friske centralt hydrerede 673 kystdele.
- RDKS, håndbog, releaseversion, browsermoduler og lokal releasegate består. Fuld lokal `validate` gennemfører geometri-v2-kæden og stopper derefter som dokumenteret på repositoryets forældede 31. juli-vejrsnapshot; central adminhydrering og frisk vejrbygning er fortsat det eneste gyldige slutbevis.
- Central kørsel `#32134021410`/artifact `#3094` bekræfter private prøver til alle otte allowlistdele: 32 prøver ved fire forecasttider fra `dkss_lf`, afstande 5,416–12,110 km og både overflade- og dybere lag. Supportrapporten har ingen `uMps`/`vMps`, og hverken råcache eller diagnostik blev ført til Pages.
- Samme kørsel stoppede sikkert før Supabase og Pages, fordi DMI-workflowtesten stadig havde den historiske User-Agent-version `4.0.229` skrevet fast. Testen følger nu `package.json`-versionen og består sammen med DMI-cache-, tværmodel- og workflowregressionerne.

## Bevidst uændret og åbent

- Offentlig runtime, RavScore, pile, kildeorden, geografisk coveragegate og deployadfærd er uændret og fortsat DMI-only med 5-km-grænse. Regionalproxyen er ikke aktiveret.
- Syvdøgnspruning mangler fortsat et naturligt syv-døgnsvindue, og Copernicus-piloten mangler flere forskellige tider/modelruns. Først derefter kan aktiv kildefletning designes og gennemgå alle releasegates.
