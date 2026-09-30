# DEC-0263 – Isoleret bevis for konflikter i gemt bølgehistorik

**Status:** Aktiv diagnostisk beslutning; lokal 4.0.516-kandidat, endnu ikke livebevist
**Dato:** 2026-09-30

## Evidens

Kort normalrun `36659094103` på main 4.0.515 gendannede præcis
`36650098594-1` og den beskyttede produktionsbaseline. DMI,
Copernicus og Open-Meteo bestod. Central cache stoppede igen ved
`RAVSCORE_RECOVERY_REPLAY_CONFLICT` for bølger. Den sikre diagnose
fandt ni **mulige** DMI/DMI-par fra samme modelkørsel. To havde
forskellige bølgeværdier: ét par havde forskelligt antal native
tidstrin, og ét par havde forskellige native tidspunkter. Syv par
havde samme fysiske værdier og samme officielle assetbevis. Det
afgør ikke, hvilket par den fulde replay først afviste.

Ny krypteret fremdrift er gemt som `36659094103-1`. Ingen færdig
pakke, fuld artifactgate, Supabase-CAS, R2 eller Pages blev
udgivet; offentlig version 4.0.510 står fortsat. Ekstern cron
forbliver pauset.

## Beslutning

1. Bevar DEC-0192/DEC-0229/DEC-0262's eksisterende hårde stop.
   Ingen kilde, bølge eller score ændres af denne diagnose.
2. På **fejlstien alene** må højst 16 små par af allerede
   projektionskontrollerede kilder prøves enkeltvis med den
   eksisterende, uændrede RavScore-replayvalidator. Alle andre
   bølger og strømkomponenter skjules kun i den midlertidige
   prøvekopi; oprindelige kilder muteres aldrig.
3. En prøve tælles kun som bekræftet, hvis den uændrede validator
   selv afviser netop bølgeparret med den eksisterende strenge
   konfliktkode. Det beviser afvisning i isolation, **ikke**
   hvilket par der blev afvist først i den fulde produktionskørsel.
4. Fejlrapporten må kun indeholde antal og faste klasser for
   leverandørpar, modelkørselsrelation, ens/forskellige fysiske
   værdier og allerede godkendte DMI-revisionshindringer. Ingen
   kystdel, klokkeslæt, koordinat, bølgeværdi, kilde-id, rå
   proveniens, private rækker eller rå undtagelser logges.
   Over 16 mulige par returneres kun en fast grænsekode.
5. Den låste RavScore-modelpakke og replay-koden ændres ikke.
   Et forsøg på at føre rækkeindeks gennem replay blev forkastet,
   fordi selv diagnostisk redigering af den bundne modelkode
   ændrer dens hash og dermed risikerer eksisterende state.

## Verifikation og næste trin

Syntetiske måltests skal bevise, at samme validator fortsat afviser
to gyldige DMI-bølger med henholdsvis forskelligt native-antal og
forskellige native-tider, at identiske komponenter ikke kaldes
konflikt, at input ikke ændres, og at rapporten er indholdsfri.
Modelbundle og binding skal være byte-/hashuændrede. Efter
RDKS/version, én grøn exact-head source-CI og sikker merge må
højst én kort normal bekræftelse bruge præcis `36659094103-1` og
den beskyttede baseline. Resultatet kan begrunde en **særskilt**
beslutning om årsagsrettelse, men ikke automatisk kildevalg eller
genåbning af cron. Ingen blind lang vejrkørsel eller oneoff.
