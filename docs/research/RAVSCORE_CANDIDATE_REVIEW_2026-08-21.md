# RavScore-kandidatgennemgang 2026-08-21

## Formaal

Denne gennemgang sammenligner den gamle vaegtning, den aktive model og tre forskningskandidater. Den aendrer ikke den offentlige RavScore. Formaalet er at finde de dele, der er sikre og fagligt lovende nok til senere skyggekoersel.

## Beslutning

- Behold den aktive vaegtning 25 procent jagtbarhed, 40 procent transport og 35 procent mobilisering.
- Aktiver ikke kandidat A, B eller C samlet nu.
- Foer kun udvalgte delregler videre som skjulte sammenligninger uden indflydelse paa brugernes score.
- Vurder igen efter intern skyggekoersel og faglig kontrol af de stoerste afvigelser.

## Hvad de virkelige data viser

- Sammenligningen omfatter 43.432 zone-/tidspunkter, 420 aktuelle zonevindere og 1.346 aktuelle kystdele fra det offentlige datasnapshot `rr-20260821094303-210`.
- Den gamle vaegtning gav i gennemsnit 3,93 point hoejere score paa alle zone-/tidspunkter, 4,66 point hoejere paa zonevinderne og 5,91 point hoejere paa kystdelene.
- Skiftet til 25/40/35 var derfor en reel og fagligt meningsfuld nedvaegtning af let soegning. Det var ikke en kosmetisk aendring.
- Kun 3 af 1.346 kystdele havde mindst middel samlet score samtidig med et tydeligt svagt fysisk led. Den aktive model har derfor ikke et akut problem, hvor komfort alene skaber mange gode anbefalinger.
- 760 kystdele var lette at soege paa trods af en svag fysisk kaede, men naesten alle blev stadig korrekt holdt under middel samlet score.

## Hvad kandidaterne viser

- Kandidat A indfoerer glattere regler og haendelseshukommelse, men reagerer for voldsomt i de syntetiske yderpunkter: fra 28 point op til 44 point ned. Den saenker ogsaa staerke, balancerede situationer for meget. A skal justeres, foer den kan bruges.
- Kandidat B tilfoejer levering og fastholdelse. Gennemsnittet ligger naer den aktive model, men 31-38 procent skifter scorebaand. Gennemsnittet skjuler derfor en stor omfordeling. B kan desuden loefte en situation med svag transport med op til 13 point, saa vi skal bevise, at reglen maaler levering til stranden og ikke blot passage langs kysten.
- Kandidat C bruger kun mobilisering og levering som noedvendige fysiske led. Jagtbarhed indgaar ikke i gaten. Den stoerste reduktion er 12 point ved svag mobilisering. Det er fagligt mere rimeligt end den foerste version, men gaten er ikke noedvendig som akut rettelse, fordi den aktive model kun har tre tydelige hoej-score-paradokser.

## De fem automatisk valgte yderpunkter

1. A stoerste stigning: waders, score 47 til 75 ved en nylig kraftig haendelse.
2. A stoerste fald: waders, score 73 til 29 ved hoej aktuel boelge men svagere tidligere boelge.
3. B stoerste loeft: waders, score 47 til 60 ved lokale faelder og lav tvaergaaende stroem.
4. B stoerste fald: waders, score 70 til 63 ved gammel og svag tidligere haendelse uden lokale faelder.
5. C stoerste reduktion: waders, score 60 til 48 ved meget svag mobilisering.

## Naeste sikre trin

1. Koer A, B og C som interne skygger i den fulde datagenerering, hvor raeventhistorik og retningsdata er tilgaengelige.
2. Lav en maalrettet kontrol af B, som skelner mellem levering mod stranden, passage langs kysten og transport vaek fra stranden.
3. Juster A's glatte kurver og haendelseshenfald, saa balancerede staerke situationer ikke straffes urimeligt.
4. Behold C som mulig mild sikkerhedsgate, men aktiver den kun, hvis skyggekoerslen viser gentagne fysisk umulige eller misvisende anbefalinger.
5. Aendr foerst offentlig score, naar retning, yderpunkter, scoreforklaring og scorebaand er vurderet samlet og de relevante release-gates er groenne.

## Evidens

- Maskinelt genereret ejeroversigt: `docs/research/RAVSCORE_OWNER_COMPARISON_2026-08-21.md`
- Modelregister: `docs/research/RAVSCORE_MODEL_REGISTRY_2026-08-21.md`
- Syntetisk analyse: 86.400 scenarier fordelt paa waders og strand.
- Virkelig analyse: det offentlige, dataminimerede snapshot ovenfor. Raapayloaden er ikke gemt i repositoryet.
