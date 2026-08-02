# RavRadar 4.0.83

## Browser-cache og permanent indlæsningsfejl

- Hele den offentlige ES-modul-kæde versionsmærkes med `?v=4.0.83`, så en eksisterende service worker ikke kan blande nye HTML-filer med gamle JavaScript-moduler.
- Service worker bruger network-first for JavaScript og CSS i stedet for stale-while-revalidate.
- Rangliste og 5-dages prognose renderes fortsat før dekorative vind- og strømpile.
- Version 4.0.80 bør ikke deployes, fordi dens cachebeskyttelse ikke var tilstrækkelig.
