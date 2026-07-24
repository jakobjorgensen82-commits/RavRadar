# RavRadar 2.9.0

## Weather Engine 2.8 færdiggjort
- DMI er autoritativ kilde.
- 120-timers DMI Forecast Store og DMI-vandstandsinterpolation bevares som primær datavej.
- Open-Meteo og MET Norway anvendes først, når både live-DMI og gyldig DMI-cache mangler.

## Brugerfeedback
- Tursvar forklarer formålet med dataindsamlingen.
- Brugeren vælger dato og zone eksplicit.
- Fund, gram, dato, zone, RavScore og vejrsnapshot gemmes sammen.

## Versionssikker opdatering
- Nyt `version.json` kontrolleres uden browsercache ved opstart, tilbagevenden til appen og hvert 30. minut.
- Service worker opdaterer HTML og app-assets network-first og rydder gamle versionscacher.
- Versionsnummeret er synkroniseret til 2.9.0.

## Forklarlig RavScore
- Hver delscore viser vægt og faktisk pointbidrag til den samlede score.
- Score-resultatet indeholder formel, basis-score, regeljustering og slutscore.

## Selvlærende analyse
- Lokal, anonym observationsanalyse finder forskelle i vandstand, vind og bølger mellem fund og ingen fund.
- Analysen kræver minimum otte observationer og producerer kun forslag; den ændrer aldrig produktionsregler automatisk.
