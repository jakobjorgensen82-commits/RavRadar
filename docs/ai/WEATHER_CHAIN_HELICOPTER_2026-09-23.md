# Samlet gennemgang af vejrkæden – 2026-09-23

Dette er en arbejdsstatus, ikke et bevis for fulde vejrdata. Tallene nedenfor
er sikre aggregater fra sidste fuldførte normale kørsel `35823773587` og
efterfølgende providerfri leveringer. De gælder ikke automatisk næste
reference eller andre vejrtyper.

| Led | Faktisk bevis | Åben risiko / næste måling |
| --- | --- | --- |
| Target og cacheindgang | 673 kystdele × 118 timer = 79.414 **havstrøms**par. Før DMI viste safe plan ingen installerede providerbanker for præcis ny target. Kode-only genbrugte derimod den aktuelle private pakke. | Forskellige targets kan ikke sammenlignes som samme restmængde. Næste normalrun skal registrere både indgangsgeneration, target og faktisk backfill, ikke blot et grønt cachetrin. |
| DMI | 25.793 direkte og 424 regionalt accepterede havstrømspar. Efter DMI var 53.197 reelle huller. DKSS-samlingerne nåede 1/43/51 trin, mens HARMONIE-vind kun nåede H0 trods 23 tilgængelige trin. | DMI-andelen er for lav som stabil DMI-first-drift. Den afgrænsede 4.0.469-vindtur er endnu ikke livebevist. Mål planlagte/behandlede assets, gyldige par og budget pr. vejrkomponent. |
| Copernicus | Sidste normalrun gav **0 anvendte havstrømspar**, selv om det var næste fallbackled. Nogle segmenter var hentet, men ingen nåede anvendt source-stage i samme run. | Find ved næste run præcis hvor gyldige segmenter går tabt: kvittering, konsolidering, stage, gyldighed, målskift eller kildeprioritet. Nul kan ikke bortforklares som ønsket DMI-first. |
| Open-Meteo | 47.996 havstrømspar blev anvendt. Rest: 5.201 par i 57 kystdele. Safe rapport havde 8.284 null speed/direction, 24 gitterafstandafvisninger og 7 transport-genforsøg; global runtimegrænse blev ikke nået. | Mere køretid alene er ikke en dokumenteret løsning. Kortlæg provider-null, afstand, opdeling og gyldighed pr. resttype. Open-Meteo må fylde huller, ikke skubbe friske DMI-værdier væk. |
| Andre vejrtyper | Sidste offentlige pakke viste bølger på alle 673 dele, men fremtidig lokal vind manglede mange steder og T+117-havstrøm manglede på 57 dele. | Ingen samlet 5.201-opgørelse for vind, bølger, vandstand eller temperatur. Hvert felt skal måles særskilt for alle timer. Vandstand har kun DMI som godkendt kilde. |
| Valg og bevaring | Komponentvalget er DMI-først med snæver aldersundtagelse; eksisterende gyldige værdier backfilles, når ny provider ikke leverer. | Bevis på virkelig data, at ny gyldig DMI overstyrer fallback, at fallback kun udfylder huller/autoriseret udløbskant, og at tom nyere værdi ikke sletter gyldig ældre værdi. |
| Scorehistorik og beskyttet gemning | Kode-only `35858910881` genbrugte aktuel cache og byggede 673-dels checkpoint, men SQL-CAS afviste `INPUT_INVALID`. Formdiagnosen viste ingen tomme eller for tidlige sidste integrerede evidensrækker. | 4.0.472-hypotesen var ikke den udløsende fejl. 4.0.473 måler præcis SQL-regel uden at ændre accept, score eller privat payload. Ingen ny vejrhentning før leveringen kan fortsætte. |
| Publicering og autonom drift | Sidste normale run publicerede et artifact; senere kode-only-runs stoppede før Pages. Cron er pauset. | Bevis først checkpoint, private writes, Pages, synlig prognose/rangliste og cacheidentitet. Kør derefter flere normale vedligeholdelser uden Codex. Én grøn workflowstatus eller én fuld snapshotpakke er ikke stabilitetsbevis. |

Rækkefølge: (1) få eksakt SQL-afvisning fra den samme gemte pakke; (2) ret
den dokumenterede kontraktfejl samlet og lever providerfrit; (3) kør én
normal vejrhentning, mål alle felter og leverandører før/efter; (4) ret
rodårsager i grupper, bevar data og gentag normal drift; (5) genaktivér
først automatisering, når vedligeholdelse, fuldgyldig data og deploy er
bevist gentagne gange. Ukendte huller er ikke "okay"; siden skal blot
fortsat være brugbar, mens de lukkes.

Kilder i repositoryet: `docs/rdks/40_KNOWN_ISSUES/PROVIDER-PRIORITY-AND-RESIDUAL-4.0.469.md`,
`.tmp-audit-358237/weather-acquisition-plan-before-dmi.json`,
`.tmp-audit-358237/weather-acquisition-plan-before-copernicus.json`,
`.tmp-audit-358237/open-meteo-current-fetch.json`, DEC-0243/0244 og
GitHub-runs `35823773587`, `35858302147`, `35858910881`. Private
`.tmp-*`-filer er ikke releaseindhold og må ikke stages.

## Udvidet fejlmønster efter run 35866710973

Den providerfri 4.0.474-kørsel genbrugte igen `rr-20260923063008-210`,
byggede 673 tilstande og stoppede ved samme `INPUT_INVALID` før Pages.
Databasens skrivefri diagnose blev kaldt, men klienten kasserede dens
årsagskort som `RESPONSE_REASON_SHAPE`. Dette er en fejl i vores eget
diagnoseled; hverken en ny leverandørfejl eller bevis for ødelagt cache.
Den konkrete SQL-afvisning er fortsat ukendt. 4.0.475 lader derfor et
skrivefrit fuldpakkekald vise den faktiske payloadregel, og falder ved
ufuldstændigt svar tilbage til 32-delsklassifikation. Kun kendte faste
regelkoder og begrænsede antal logges; alt uventet bliver et anonymt
afvigelsesantal. CAS-kravene ændres ikke.

På tværs af nyere normale kørsler lå fejlene ikke ét sted: `35506992220`,
`35513058150`, `35530859518`, `35668407035`, `35677283276` og
`35695267017` stoppede i afsluttende central cache; `35703630226`
stoppede ved backend-klarhed; `35778530384` blev rød efter Pages i
kontrollen af eksakt deploy; `35823773587` gennemførte, men med for lav
DMI/Copernicus-andel og resthuller. Flere tidligere runs blev annulleret
og må ikke tælles som succes. Dette er et systemisk driftsproblem i
acquisition → konsolidering → gemning → scorehistorik → publicering,
ikke blot et spørgsmål om at give DMI flere minutter.

Forenkling, som skal vurderes efter den konkrete stopårsag: én eksakt
generation/manifest gennem alle led, én deterministisk komponentvælger,
holdbar leverandørfremgang adskilt fra deploy og kun datatab, korrupt
artifact, reel scorefejl eller sikkerhed som hårde stop. Rapportering og
diagnose må ikke selv blive nye datagates. Ingen af disse større ændringer
er implementeret i 4.0.475, og cron må ikke genaktiveres på et løfte om dem.
