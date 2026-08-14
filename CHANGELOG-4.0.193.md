# RavRadar 4.0.193

- Retter en systemfejl, hvor DMI-recovery målte dækning på hovedzoner, men ikke på de 651 aktive lokale kystdele.
- Kræver lokal strømretning og -hastighed før en kystdel må få lokal score og tilføjer en landsdækkende gate for mindst 95 % verificeret lokal U/V-dækning.
- Bevarer den fulde faglige forklaring og det lokale vejr-/retningsgrundlag gennem runtime og debug.
- Forhindrer, at én enkelt beregnet kystdel præsenteres som dokumentation for ens forhold i hele zonen.
- Bruger den eksisterende hovedzonescore som sikker midlertidig fallback, når en komplet lokal sammenligning endnu ikke findes; der vises i så fald ingen falsk lokal konklusion.
- Starter den autoriserede landsdækkende revision af meningsfuld kystdelsopdeling, land-/havpunkter, admin, offentlig UI, ydelse og datakæde. Produktionsverifikation afventer friske progressive GitHub-kørsler og de fulde gates.
- Tilføjer en reproducerbar landsaudit af kystreference, lokal tangent og land-/vandpunkt. Den aktive pakke har 13 dokumenterede afvigelser; den private reparationskandidat har 0.
- Tilføjer en konservativ privat orienteringskandidat for hovedzoner, der hidtil kun havde én kystdel trods vedvarende retningsskift. 10 zoner foreslås opdelt, herunder Helgenæs i vest-, syd- og østkyst; kandidaten har 673 dele mod 651 og 0 punktgeometrifejl.
- Rejsby og Ribe Vesterå er bevidst ikke automatisk opdelt, fordi land-siden ikke kan udledes sikkert for alle foreslåede delstykker.
- **AFVENTER CI/PRODUKTION:** De 45 nye eller flyttede vandpunkter skal have frisk native DMI-gridvalidering, før den private geometri må samles eller aktiveres.
- Tilføjer et isoleret, manuelt GitHub-job, som reproducerer kandidaten på Linux, genkører punktgeometriauditen og validerer alle 45 ændrede vandpunkter mod DMI's native grid. Jobbet har kun læseadgang og kan hverken aktivere geometri eller deploye Pages.
