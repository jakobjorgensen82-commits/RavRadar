# RavRadar 4.0.20 – gennemsigtige stationsvalg og ekstra vandstandsværn

## Administration
- Viser RavRadars automatiske primære og sekundære DMI-station for hver zone.
- Viser afstand, beregnet vægt, metode og de fem nærmeste kandidater.
- Skelner på kortet mellem øvrige stationer, automatisk valgte stationer, administratorvalg og stationer valgt af begge.
- Administratorens override er tydeligt adskilt fra standardautomatikken.
- Automatisk valg kan kopieres som udgangspunkt og derefter redigeres.

## Vandstand
- Rydder gamle reparationsfelter fra cachede forecast-rækker før serien bygges igen.
- Registrerer og isolerer meget stejle DMI-segmenter, som typisk skyldes grid- eller modelrun-sømme.
- Bruger kun en sammenhængende, biasjusteret fallback-form til det mistænkelige segment; DMI på begge sider forbliver anker.
- Falder tilbage til en konservativ hældningsgrænse, hvis ingen sammenhængende fallback findes.
- Gyldige DMI-vandstande ændres aldrig alene på grund af store timeudsving; store DMI-spring registreres kun diagnostisk.
- Diagnostikken markerer autoritative DMI-spring som `accepted-without-modification`, så tidevandsdynamik ikke fejlagtigt udglattes.
- Trend beregnes fortsat først efter alle kontinuitetsreparationer.

## Drift
- Bevarer 118 timer som godkendt fuld horisont.
- Bevarer den nye ugentlige, begrænsede GRIB-cache. Seneste kørsel viste cirka 190 MB cache og 180 gyldige DMI-stationer.
