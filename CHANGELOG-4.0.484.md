# RavRadar 4.0.484 – sikker årsagsstatus for vejrhuller

- Den offentlige 4.0.483-side er kontrolleret efter vellykket
  kode-only-deploy `35967586655`. Den bruger fortsat vejrpakken fra
  normalrun `35954069186`, uden nye leverandørkald.
- Sidste normalrun gemte cache og deployede, men Copernicus'
  særskilte bølge-/temperaturled tilføjede nul valgte værdier. Den
  eksisterende log viste ikke, om det skyldtes leverandørforsøg,
  manglende bevis eller tidsgrænsen.
- Den sikre normalrun-log viser nu Copernicus' samlede status, forsøg,
  godkendte kandidater, rester og transportfejl samt Open-Meteos
  samlede anmodninger, udsat arbejde og fejlantal. Ingen rå vejrdata,
  lokale ID'er, private fejlposter eller cacheindhold skrives ud.
- Ændringen ændrer ikke vejrdata, model, score, kildeprioritet,
  datagyldighed, cacheformat eller leverandørbudgetter. En normalrun
  efter levering er nødvendig for at finde den konkrete årsag.
