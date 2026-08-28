# RavRadar 4.0.293

## Klogere lokale svar på tre sprog

- Spørg RavRadar dækker 17 almindelige emner på dansk, tysk og engelsk: oprindelse, massefylde, tilgængelige ravlagre, vind, bølger, strøm, vandstand, kystfælder, felttegn, identifikation/UV, waders, vejrforløb, Candidate G, manglende data, modelbegrænsninger, teknik og udstyr.
- Svarene bygger på den offentlige grundbog, bruger stabile centrale sprognøgler og fungerer uden netværk eller AI-kvote.
- Bedste sted, bedste tidspunkt og konkret RavScore forbliver deterministiske Candidate G-svar med de eksisterende offentlige data.

## Bredere evidens til GPT-OSS

- Den versionsbundne offentlige videnspakke vokser fra 10 til 23 evidens-ID'er om ravfysik, kystsortering, felttegn, identifikation, søgeteknik og vejrforløb.
- Åbne relevante specialspørgsmål kan fortsat gå til Cloudflare GPT-OSS. Fast emneafvisning, server-only credential, dataminimering, CORS, 6/minut, 40/time, 300/dag, syv sekunders timeout, eksakt JSON-/evidensvalidering og lokal fallback er uændrede.
- Cloudflare Workers Free og `ravAssistantRemoteEnabled=false` som øjeblikkelig rollback er uændrede.

## Reproducerbar kontrol og isolation

- 51 lokale cases dækker alle 17 emner på hvert af de tre sprog og beviser nul netværkskald.
- Den samlede provider-eval har 66 balancerede cases, 22 pr. sprog, og dækker de nye evidensfamilier.
- Assistenten er read-only og kan ikke ændre kort, prognoser, RavScore, vejr, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter.
- De beskyttede geodatafiler ændrer kun deres topversionsfelt. Se DEC-0091.

## Verifikation

- Målrettede lokale, i18n-, Edge-, dataminimerings- og Candidate G-kontrakter er grønne.
- Fuld lokal sourcegate og releasegate er grøn. Exact-head, produktion og offentlig DA/DE/EN-browserkontrol afventer, før versionen kan kaldes produktionsverificeret.
