# RavRadar 4.0.247

## Arbejdsgang
- Planlagte vejropdateringer gentager ikke længere den fulde kildekodegate på den allerede kontrollerede main-kode.
- Push og manuelle produktionsbyg beholder den tidlige kildekodegate.
- Den fulde validering og releasegate efter frisk vejr/proveniens er fortsat obligatorisk før hvert nyt artifact og deploy.

## Dokumentation
- DEC-0045 og begge håndbøger beskriver den permanente cost/benefit-testmatrix.
- Fuld 210/673-browserkontrol forbliver ugentlig eller hændelsesstyret ved UI-, score- og offentlig datakontraktændring.

## Uændret
- RavScore, DMI-first, Copernicus-afgrænsning, regionale proxyer, geometri og alle land-/vandpunkter er uændrede.

## Produktionsbevis
- PR #37 er merged som 3dc331ca.
- Produktion 32468752244 bestod frisk data, fuld validering, releasegate, Supabase og Pages.
- Live datasæt rr-20260821094303-210 viser 4.0.247, 210 zoner og 673 kystdele.
