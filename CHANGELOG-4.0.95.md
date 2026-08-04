# RavRadar 4.0.95 – sikkert stationsoverride i admin

## Afgrænsning
Denne version ændrer kun administratorens visning og styring af vandstandsstationer. DMI-hentning, prognosecache, vandstandsbehandling, offentlig prognose og RavScore er ikke ændret.

## Rettelser
- Manglende stationslivscyklusfelter vises som **ikke dokumenteret** i stedet for fejlagtigt at blive vist som “Har aldrig leveret” eller “Utilgængelig”.
- Udfasede/historiske stationer bestemmes af DMI-registerstatus og vises med særskilt grå, stiplet markering.
- Automatisk valg, administratorvalg og stationer valgt af begge systemer beholder hver sin markørfarve.
- Ved to administratorvalgte stationer viser admin de beregnede inverse afstandsvægte i procent.
- Primær/sekundær-roller normaliseres efter tilføjelse og fjernelse, så gemt routing ikke får en sekundær station stående som eneste “sekundære” valg.
- Udfasede eller eksplicit utilgængelige stationer kræver fortsat bekræftelse, men ukendt livscyklusstatus gør ikke.

## Produktionskæde
Den eksisterende, centrale `water-level-station-routing`-lagring og `manualStationInterpolation` i vejrmotoren er bevaret. Når override er aktivt, anvendes de valgte stationer før automatisk routing. Ved metoden `inverse-distance` beregner produktionen vægte ud fra afstanden mellem zonens datapunkt og hver station.
