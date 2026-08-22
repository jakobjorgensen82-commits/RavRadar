# RavRadar 4.0.252

## Mere fair nationale toplister

- Bedste områder og 5-dages RavRadar tager nu højde for, at zoner med mange forskelligt vendte kyststrækninger ellers får flere chancer for en høj placering.
- En høj lokal score bevarer sin fulde placeringseffekt, når mindst halvdelen af zonens kystdele støtter resultatet.
- Den viste RavScore, lokale kystdelsresultater, pile, farver og forklaringer er uændrede.
- En kort tekst ved begge lister forklarer forskellen mellem RavScore og landsplacering.

## Kontrol

- Den fælles produktionsformel er låst til den samme retningsmatematik som den landsdækkende 210/673-analyse.
- Ufuldstændige eller uoverensstemmende kystdelsdata falder sikkert tilbage til den oprindelige rækkefølge.
- Ingen geometri eller land-/vandpunkter er ændret.

## Intern shadowgate-rettelse efter PR #59

- Den private Candidate G-shadow kan læse centralt gemte aktive ekspertregler med GET og bygge en midlertidig lokal regelfil.
- Testen skelner nu denne læsning fra centrale skrive-, roundtrip- og deployveje og indgår i `validate:source`.
- Offentlig RavScore 25/40/35, Candidate G-status, data, geometri og land-/vandpunkter er uændrede.
