# RavScore: fast national scenarieprotokol

Status: Aktiv forsknings- og regressionsmetode. Den ændrer ikke den offentlige RavScore.

## Hvorfor den findes

RavRadar skal ikke vente på, at bestemte vejrsituationer opstår. Aktuelle DMI-kørsler er nødvendige for at kontrollere den praktiske datakæde, men de er et langsomt og tilfældigt grundlag for udvikling af scoremodellen.

Den faste scenarieprotokol genafspiller derfor de samme fagligt navngivne situationer på alle 673 aktive kystdele. Vind, bølger og strøm roteres i forhold til hver kystdels eksisterende hav-til-land-retning. Ingen koordinater flyttes eller gemmes i rapporten.

## Tre forskellige kontroller

| Kontrol | Formål | Hvornår |
| --- | --- | --- |
| Følsomhedsgitter | Finder spring, ekstreme virkninger og skjult dobbeltvægtning i mange kombinationer | Under udvikling af regler |
| Faste nationale scenarier | Kontrollerer forståelige fysiske hændelser på alle 673 kystdele | Efter en samlet regelændring |
| DMI-/historisk skyggekørsel | Kontrollerer virkelige datakilder, tidsmæssig sammenhæng og geografisk dækning | Ved en milepæl, ikke efter hver lille ændring |

Browserens 210/673-kontrol bruges først, når en ændring påvirker offentlig score, pil, forklaring, UI eller datakontrakt.

## De 15 faste scenarier

1. Roligt og omtrent neutralt vejr.
2. Tiltagende hændelse med transport mod kysten.
3. Kraftig storm på toppen.
4. Tidlig aftagende fase med fortsat transport mod kysten.
5. Frisk efter-storm-levering mod kysten.
6. Efter-storm-passage langs kysten i den ene retning.
7. Samme passage langs kysten i den modsatte retning.
8. Efter-storm-transport væk fra kysten.
9. Strøm mod kysten, men bølger væk fra kysten.
10. Bølger mod kysten, men strøm væk fra kysten.
11. Gammel hændelse med svagt tilbageværende signal.
12. Gunstig strøm, men næsten ingen mobilisering.
13. Lokal genmobilisering uden en stor tidligere storm.
14. Efter-storm-situation med stigende vand.
15. Samme situation med faldende vand.

Scenarierne er fysiske arbejdshypoteser. De er ikke påstande om en bestemt fundprocent eller om, hvor ofte situationerne forekommer.

## Bindende fortolkning

- En kandidat skal reagere bedre på levering mod kysten end på transport væk fra kysten.
- En frisk relevant hændelse skal reagere stærkere end en ellers tilsvarende gammel hændelse.
- Venstre og højre passage langs kysten skal være symmetrisk, medmindre en dokumenteret lokal egenskab begrunder andet.
- Kandidat C bevares som historisk reference og må kun reducere kandidat B.
- Kandidat E må kun reducere kandidat D og må kun bruge den fysiske kæde, ikke jagtbarhed, som flaskehals.
- Store ændringer skal forklares på hændelsesniveau, ikke skjules i et nationalt gennemsnit.
- Resultaterne kan afvise en dårlig regel, men kan ikke alene bevise en fundchance.

## Hurtig lokal kørsel

```text
npm run test:ravscore-canonical-scenarios
```

En detaljeret, dataminimeret rapport kan dannes med:

```text
npm run audit:ravscore-canonical-scenarios
```

Rapporten indeholder kun summeringer. Den indeholder ikke koordinater, rå vejrserier eller komplette kystdelspayloads.

## Arbejdsgang fremover

1. Forskningen omsættes til en afgrænset regelændring.
2. Den målrettede enhedstest og det hurtige scenarieaudit køres lokalt.
3. Følsomhedsgitteret bruges, når kurver, vægte eller tærskler ændres.
4. Flere beslægtede forskningsændringer samles i én branch og én release.
5. En national DMI- eller historisk skyggekørsel bruges først, når kandidaten er samlet.
6. Fuld release- og browserkontrol bruges én gang ved en reel offentlig scoreændring.
