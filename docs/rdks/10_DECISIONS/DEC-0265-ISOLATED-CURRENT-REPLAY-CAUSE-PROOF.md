# DEC-0265 – Indholdsfrit årsagsbevis for havstrømskonflikt i recovery

**Status:** Aktiv diagnostisk beslutning; lokal 4.0.518-kandidat, ikke produktionsbevist.
**Dato:** 2026-09-30

## Faktisk udgangspunkt

PR #485/4.0.517 bestod exact-head source-CI `36676610928` og blev
merged som main `31d7ce8b`. Kort normalrun `36677551077` gendannede
præcis `36667807638-1` og beskyttet produktion. DMI, Copernicus og
Open-Meteo gennemførte. Den tidligere bølgekonflikt blev passeret,
men central cache stoppede på `RAVSCORE_RECOVERY_REPLAY_CONFLICT`
for **havstrøm** før slutpakke, artifactgate, Supabase-CAS, R2 og
Pages. Ny krypteret fremdrift `36677551077-1` er gemt. Offentlig
4.0.510/370.007 af 397.070 femfeltspar er fortsat sidste bevis.

Det er ikke påvist, at DMI's rå data er forkerte. RavRadar omsætter
native modeltidspunkter til timeværdier og sammenligner både U/V og
kildebevis i den efterfølgende historik. Konflikten kan derfor ligge
i vores projektion, valg eller proveniens; det faktiske kildepar og
årsagsklasse er endnu ukendt.

## Beslutning

1. Bevar den uændrede, fail-closed RavScore-replayvalidator og
   DEC-0264's snævre bevarelsesregel. Ingen vejrkomponent, score,
   kildeprioritet, modelbundle eller publicering ændres af diagnosen.
2. Kun når central cache faktisk stopper på en havstrømskonflikt,
   klassificeres mulige overlap fra den allerede projicerede private
   historik efter faste kategorier: samme/anden kildepost,
   leverandørpar, modelkørselsrelation, ens/forskellige fysiske
   værdier og, for same-run-DMI, sammenlignelighed af collection,
   gitter, lag, prøvepunkt, native trin og officiel revision.
3. Højst 96 kandidatpar prøves isoleret mod den **uændrede**
   replayvalidator. Diagnosen stopper ved første isoleret bekræftede
   strømkonflikt. Den rapporterer tydeligt antal par, prøvet antal
   og om grænsen blev nået. Et isoleret bekræftet par er ikke
   nødvendigvis den fulde replays første fejlpar.
4. Kun faste klasser og aggregerede tal må logges. Ingen kystdel,
   klokkeslæt, koordinat, U/V, kilde-id, hash, privat række,
   payload eller rå undtagelsestekst må logges. Kandidatoptællingen
   er ikke i sig selv bevis for en vinder eller en årsagsrettelse.
5. Før en adfærdsændring kræves en konkret klasse fra den gemte
   fremdrift og en tværgående kontrol af native input, timeprojektion,
   kildevalg, bevaring, replay, no-loss og publicering. Ekstern
   cron-job.org `8348098` forbliver pauset; ingen blind lang kørsel
   eller oneoff.

## Kontrol og rest

Syntetiske regressioner skal vise forskellig U/V, ens U/V med
forskelligt gyldigt native tidsgrundlag, andet gitter, andet
leverandørpar, dublet inden for én kilde, uændrede input og ingen
privat output. Den låste modelbundle skal være uændret. Efter
RDKS/version, exact-head source-CI og sikker merge må højst én
kort normal bekræftelse bruge præcis `36677551077-1` og den
beskyttede baseline. Et nyt diagnostisk resultat er ikke
produktionssucces; fuld artifactgate, no-loss, CAS, R2, Pages,
offentlig prognose og gentagen stabil drift mangler fortsat.
