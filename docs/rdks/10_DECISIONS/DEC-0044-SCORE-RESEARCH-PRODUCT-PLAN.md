# DEC-0044 – Samlet RavScore-, produkt- og læringsplan

Status: Aktiv
Dato: 2026-08-21

## Formål

RavRadar skal bruge den store faglige analyse til at forbedre regler, vægtning, ravvinduer, hændelsesforløb, forklaringer og undervisning. Arbejdet skal være fagligt grundigt, let at forstå for ejeren og sikkert at afprøve uden at ændre produktionen for tidligt.

## Beslutning

- Der bygges ikke en særskilt offentlig visning af scoresikkerhed.
- Der bygges ikke en funktion, som forklarer forskellen fra gårsdagens score.
- Der skal bygges ravvinduer, som forklarer om brugeren bør tage afsted nu, vente eller vælge et senere tidsrum.
- Der skal bygges en hændelsesbaseret model, som skelner mellem mobilisering, transport, aflejring og efterfølgende jagtbarhed over tid.
- Den aktuelle forklaring skal være kort og let at forstå med mulighed for at åbne en mere detaljeret forklaring. Den behøver ikke sammenligne med gårsdagen.
- Den eksisterende automatiske kontrol af score, farve, pil og forklaring bevares og udvides ved relevante modelændringer. Der bygges ikke et parallelt kontrolsystem.
- Gemte områder og varsler udskydes mindst cirka et halvt år eller til en senere samlet sektion for brugerens egne data.
- Der skal bygges et omfattende offentligt læringsmodul for begyndere og mere erfarne ravjægere.
- Der skal indføres et internt forsknings- og regelregister for ejer, Codex og relevante eksperter. Det er ikke almindeligt brugerindhold.
- Gammel og ny scoremodel skal sammenlignes automatisk på de samme data. RavRadar udfører beregningerne lokalt, og ejer og Codex korrigerer kandidaten gennem almindelig samtale.
- Sammenligningen skal kun vise de vigtigste konsekvenser, årsager og anbefalinger. Ejeren skal ikke analysere rå tabeller i timevis.
- Ingen OpenAI API eller skjult AI-model bygges ind i den offentlige RavRadar-app. Arbejdsformen skal kunne bruges med ejerens almindelige Codex-adgang ved at lade lokale scripts udføre hovedberegningerne.
- Ingen kandidatscore må automatisk overføres til produktion. Normal RDKS-, test-, PR-, release- og produktionskontrol gælder altid.

## Faglig scoregate

- Den store analyse skal dække ravets egenskaber, mobilisering, transport, aflejring, jagtbarhed, bølger, vind, strøm, vandstand, kysttype og tidslige forløb.
- Direkte ravforskning suppleres med relevante studier af sedimenttransport, drivende plastik, biologisk materiale og andre fysisk sammenlignelige transportprocesser.
- Evidensens styrke, geografiske overførbarhed, usikkerhed og betydning for hver regel registreres.
- De aktive 25/40/35-vægte er en foreløbig produktionsprior. De må forbedres før mange ture er indberettet, hvis den samlede analyse og den automatiske gammel-mod-ny-kontrol giver et klart bedre og sikkert grundlag.
- Senere komplette ture bruges til efterkalibrering. Enkeltfund er ikke kalibreringsenheden.

## DMI og Copernicus

- DMI forbliver førstevalg og produktionsgrundlag.
- Den normale Copernicus-pilot skal begrænses til de få eksplicit godkendte DMI-huller, som faktisk kræver supplement.
- En landsdækkende Copernicus-kontrol af alle 673 kystdele er kun en sjælden eller manuel forskningskontrol, ikke en normal gentagen produktionsopgave.
- Copernicus forbliver score-neutral, indtil en særskilt faglig og systemisk beslutning eventuelt ændrer dette.

## Arbejdsrækkefølge

1. Luk og dokumentér v4.0.243 som produktions- og browserverificeret.
2. Begræns den normale Copernicus-pilot uden at ændre DMI-først, score eller punkter.
3. Gennemfør og syntetisér den store faglige analyse i det interne evidensregister.
4. Beskriv nye kandidatregler, tærskler og foreløbig vægtning uden produktionspåvirkning.
5. Kør automatisk gammel-mod-ny-sammenligning på historiske, aktuelle og konstruerede grænsetilfælde.
6. Lad ejer og Codex gennemgå de få vigtigste afvigelser og rette kandidaten i almindeligt sprog.
7. Implementér godkendt hændelsesmodel, ravvinduer og lagdelte forklaringer som et afgrænset releaseforløb.
8. Byg læringsmodulet på den kvalitetssikrede faglige viden.
9. Afslut med fulde regressioner, produktionsgates og relevant 210/673-browserkontrol.

## Sikkerhedsgrænser

- Flyt ingen land-/vandpunkter som del af dette roadmap.
- Bevar dataminimering og tur-GPS lokalt.
- Bevar score-, pil- og forklaringssammenhæng.
- Bevar mulighed for at afvise eller rulle en kandidat tilbage.
- Offentliggør ikke credentials, private observationer, rå strømvektorer eller komplette diagnostikpayloads.
