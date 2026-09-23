# DEC-0246 – En dokumenteret fastholdelse må bevare en senere tom time

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.476; produktionsbevis afventer

## Bevis

Providerfri main-run `35871154038` genbrugte præcis
`rr-20260923063008-210`, byggede 673 integrerede tilstande og fik
igen `INPUT_INVALID` fra beskyttet checkpoint-CAS. Den skrivefri
diagnose gennemgik alle 673 og viste `P02`, herunder otte `I04`.
Den viste også en anomaliform i Candidate G-diagnosekortet; den
er ikke årsag til `P02` og undersøges særskilt hvis den bliver
en faktisk acceptbarriere.

`I04` er den gamle SQL-regel, der forbød enhver evidenstime efter
`currentReferenceAt`. Modellen kan ved en nøjagtigt autoriseret
regional DMI-fastholdelse bevare en senere time med `strength: null`:
det er eksplicit et hul, ikke en ny måling. Den lokale modelreplay
accepterer dette og markerer historikken ufuldstændig. SQL-reglen
var derfor strengere end producentens gyldige tilstand. Otte
afvisninger og de tidligere otte regionale fastholdelser er en
stærk sammenhæng, men de private kystdel-ID'er logges ikke.

Ejerens tretimersregel er kontrolleret særskilt på tværs af regional
producent, closure, live-adapter, scorehukommelse og checkpoint:
kun otte eksplicit godkendte `dkss_lf`-dele må bruge et ægte
kildesample som reference i højst tre timer. Hver afledt time
har egen kildebundet holdmarkør, men ingen ny vektor, pil eller
transportkredit. Næste virkelige sample overtager normalt. Den
nye SQL-regel fjerner ingen af disse muligheder eller grænser.
Den regionale måltest er grøn efter rettelse af et ældre test-input,
som manglede det krævede `sha256:`-præfiks; produktionskoden var
uændret.

## Beslutning

- En senere evidenstime må ligge efter den fastholdte målings
  `currentReferenceAt` **kun hvis styrken er null** og timen ikke
  ligger efter tilstandens egen tid. Den eksisterende kontrol af
  eksakt regional autorisation og seneste talmåling består.
- Enhver senere numerisk styrke forbliver afvist: fastholdelse må
  aldrig opfinde transport. Null tæller ikke som komplet vejrdata
  og må ikke give en falsk READY-historik.
- Ret både den aktive SQL-validator og den skrivefri regelårsag i
  append-only `20260923140000`; de allerede anvendte migrationer
  forbliver uændrede. Readback-kontrakten skal beregnes af den
  faktiske seneste validator og de øvrige uændrede funktioner.
- Saml årsagen i én version med måltest af modelens null-evidens og
  afvisning af opdigtet numerisk evidens. Ingen DMI/CP/OM-kald,
  kildeprioritet, geometri, scoreformel eller offentlig data ændres.

Dette løser alene leveringsblokkeringen, hvis live-CAS bekræfter det.
De 5.201 manglende havstrømspar og vindhalens huller kræver stadig
normal vejrhentning og feltvis bevis. Cron forbliver pauset.
