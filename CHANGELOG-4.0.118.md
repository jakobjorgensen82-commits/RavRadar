# RavRadar 4.0.118

## DMI-first vindkæde
- HARMONIE forbliver primær vindkilde gennem sin valide native horisont.
- DKSS 10-meter U/V udtrækkes som en separat DMI-vindhale mod fem døgn.
- HARMONIE vinder i overlap, og interpolation krydser ikke modelgrænsen.
- DKSS-vindvektorer kræver samme fysiske gitterpunkt for U og V.
- Open-Meteo fallback hentes og lagres med entydige UTC-tider.

## Sikkerhed og status
- Ingen RavScore-vægte eller transportregler er ændret.
- Manglende data forbliver manglende; der gentages ingen sidste værdi og indsættes intet falsk nul.
- Målrettede parser-, forecaststore- og integrationsregressioner består lokalt.
- Fuld produktionsdækning og deploy er endnu ikke verificeret.
