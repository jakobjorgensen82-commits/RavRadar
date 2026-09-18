# DEC-0201 – Offentligt vejr bindes til den præcise produktionstime

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.418, livebevis afventer
**Dato:** 2026-09-18

## Evidens

4.0.417 bestod exact-head `35356064367`, PR #361, main `0890ed0e` og
providerfri levering `35356645337`. Den efterfølgende almindelige weather-
kørsel `35357557315` gennemførte og gemte alle providerled, men stoppede før
publicering med `Public weather zone DK-B01-12 has a gap, duplicate or shifted
public RavScore hour`.

Sammenlægningen brugte `dmiForecast.generatedAt` som tidsgrænse. Hvis DMI-
cachen startede én time før den aktuelle produktionstime, kom den gamle time
med først, hvorefter den korrekte sidste +117-time blev skåret væk ved
normalisering til 118 rækker.

## Beslutning

- Den offentlige vejrakse er altid præcis `productionReferenceAt +0..+117`.
- Produktionsreferencen skal være en kanonisk, hel UTC-time. Den må ikke
  afrundes eller erstattes af en providers eller caches generationstid.
- DMI og fallback sammenlægges kun for eksakt samme tidsstempel på denne akse.
- Ny gyldig data vinder komponentvist. Mangler den nye komponent, bevares en
  gyldig fallbackkomponent for præcis samme sted og time.
- Mangler hele timen, materialiseres en eksplicit lokal `MISSING`-række på det
  korrekte tidsstempel. Et hul må aldrig flytte nabotimer eller hele horisonten.
- Alle 210 offentlige zoner får samme strukturelle 118-timersakse, så ét lokalt
  hul ikke gør resten af RavRadar ubrugelig.
- Producenternes gemte fremgang fra et mislykket publiceringsforsøg genbruges.
  Næste bevis er én almindelig weather-kørsel; der startes ingen oneoff.

## Afgrænsning

DMI-rotation, tidsbudgetter, providerordenen DMI → Copernicus → regional DMI →
Open-Meteo, RavScore-formel, modelstate, modelbundle, geometri og land-/
vandpunkter ændres ikke. DMI's tidsbegrænsede partialstatus overvåges over
almindelige kørsler og ændres kun ved konkret manglende fremgang.
