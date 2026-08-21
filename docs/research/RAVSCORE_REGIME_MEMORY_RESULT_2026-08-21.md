# RavScore: historisk stroem- og vindhukommelse 2026-08-21

## Status

Dette er privat, score-neutral forskning. Den aktive RavScore, brugerfladen, DMI-first, geometri og alle land-/vandpunkter er uændrede.

Analysen bruger de eksisterende 12 historiske 96-timersforloeb og udskriver kun summer. Raa vejrvaerdier, U/V, koordinater og credentials gemmes ikke i rapporten.

## Spoergsmaalet

En retningsvending boer ikke automatisk give en stor scoreaendring. Det afgoerende er:

- hvor kraftig den nye stroem eller vind er;
- hvor laenge den varer;
- hvor stabil den tidligere retning var;
- hvor meget paalands- eller fralandspaavirkning der allerede er bygget op;
- hvor hurtigt den tidligere paavirkning med rimelighed skal aftage.

Maalet med denne delanalyse er ikke at uddele point, men at finde en hukommelsesform, hvor en svag, kort vending betyder lidt, mens en kraftig og vedvarende vending betyder mere.

## Metode

For hvert tidspunkt beregnes et fortegnet paavirkningssignal:

- stroem: hastighed gange paalands-/fralandsretning;
- boelger: `Hs^2 * periode` gange paalands-/fralandsretning;
- vind, lineart kontrolspor: vindhastighed gange retning;
- vind, stresskontrolspor: vindhastighed i anden gange retning.

Signalerne foeres gennem en eksponentiel hukommelse med halveringstid paa 6, 12, 24 eller 48 timer. En halveringstid paa 24 timer betyder, at en tidligere paavirkning har halv vaegt efter et doegn og en fjerdedel efter to doegn.

Vindens stressspor er kun et maal for atmosfaerisk paavirkning. Det er ikke en paastand om, at rav transporteres direkte proportionalt med vindhastigheden i anden.

## Syntetisk vendingstest

Udgangspunktet er 48 timer med stabil paalandspaavirkning. Derefter vendes retningen i forskellig styrke og varighed.

| Hukommelse | En svag modtime | En lige staerk modtime | En dobbelt staerk modtime | Dobbelt staerk modretning foer nettofortegnet vender |
|---|---:|---:|---:|---:|
| 6 timer | -13,648 % | -21,863 % | -32,816 % | 4 timer |
| 12 timer | -7,109 % | -11,599 % | -17,586 % | 7 timer |
| 24 timer | -3,796 % | -6,643 % | -10,438 % | 12 timer |
| 48 timer | -2,151 % | -4,301 % | -7,168 % | 16 timer |

6 timer reagerer sandsynligvis for hurtigt til at beskrive flere dages transportforloeb. 48 timer beskytter den tidligere tilstand mest, men kan blive for langsom som eneste signal. 24 timer ligger mellem de to og reagerer stadig tydeligt paa en kraftig, vedvarende vending.

## Observerede stroemvendinger

Efter 12 timers opvarmning indgaar 828 historiske stromtimer.

| Hukommelse | Modsat-rettede timer | Faktiske hukommelsesvendinger | Svage vendinger: median aendring | Svage vendinger: 90-percentil | Staerke vendinger: median aendring |
|---|---:|---:|---:|---:|---:|
| 12 timer | 170 | 22 | 7,277 % | 10,964 % | 43,170 % |
| 24 timer | 181 | 14 | 3,695 % | 5,309 % | 20,365 % |
| 48 timer | 188 | 10 | 1,794 % | 2,090 % | 10,433 % |

Ingen observeret svag stroemvending vendte hukommelsens fortegn ved 12, 24 eller 48 timer.

Stroemvendingerne samlede sig i 36 episoder ved 24-timerssporet. Episoderne varede typisk seks timer, og 90 procent varede hoejst cirka 20 timer. 14 episoder vendte nettotilstanden. De tre episoder, der forblev svage i forhold til den opbyggede tilstand, vendte den aldrig.

## Observerede vindvendinger

24-timerssporet gav samme kvalitative billede for begge vindmaal:

- lineart vindspor: 42 svage modtimer, nul fortegnsvendinger og median aendring 3,770 procent;
- vindstressspor: 77 svage modtimer, nul fortegnsvendinger og median aendring 3,295 procent;
- staerke modtimer gav median aendring paa henholdsvis 20,196 og 15,760 procent;
- de observerede vindepisoder varede typisk ti timer, mens de laengste fortsatte betydeligt laengere.

Dette stoetter styrke- og varighedsprincippet, men afgoer ikke hvor stor en selvstaendig direkte vindandel RavScore skal have.

## Boelger

Boelgeenergien skifter mindre hyppigt end den oejeblikkelige stroem. Ved 24 timer fandtes 129 modtimer, men kun fire hukommelsesvendinger. Svage boelgevendinger aendrede typisk tilstanden 3,094 procent og vendte den aldrig.

Boelge-, stroem- og vindserierne er fysisk forbundne. Tallene maa derfor ikke laegges sammen som tre uafhaengige pointkilder.

## Foreloebig konklusion

Den mest lovende naeste arbejdshypotese er to tidsspor, ikke et enkelt oejebliksbillede:

1. Et cirka 24-timers aktivt regimespor, som reagerer paa nye kraftige og vedvarende forhold.
2. Et cirka 48-timers baggrundsspor, som bevarer noget af det opbyggede transportforloeb over flere dage.

Der er endnu ikke valgt en blandingsandel mellem sporene. En saadan andel skal testes score-neutralt mod 24-timer alene, 48-timer alene og andre foelsomheder. Den maa ikke vaelges efter mavefornemmelse.

Hukommelsen beskriver paavirkning og transportpotentiale. Den er ikke i sig selv et direkte maal for et ukendt ravlager eller sikker aflejring paa stranden.

## Kandidat G's naeste eksperiment

1. Beregn 24- og 48-timersspor ved hvert historisk evalueringstidspunkt uden kig frem i tiden.
2. Sammenlign 24 alene, 48 alene og en lille matrix af dobbelte spor.
3. Ablatér stroem, boelger, lineart vindspor og vindstressspor hver for sig.
4. Undgaa dobbeltregning ved at lade direkte vind vaere konservativ og adskilt fra boelge-/stroemvirkning.
5. Foer de bedste score-neutrale varianter ind i kandidat G's historiske replay og parrede retningstest.
6. Kontrollér derefter national matrix, shadow, ekspertregler, jagtbarhed, vadesikkerhed samt sammenhaeng mellem pile, score og forklaring.

For prognoser maa hvert tidspunkt kun bruge observationer og prognoseforloeb frem til det paagaeldende tidspunkt. Fremtidige observationer maa aldrig laekke bagud i beregningen.

## Begraensninger

- Kun 12 historiske forloeb og fire omraader indgaar.
- Forloebene er udvalgte vejrsituationer og er ikke et tilfaeldigt repraesentativt udsnit af alle danske forhold.
- DMI-vind er stationsbaseret og kan afvige fra lokal kystvind.
- Stroem, boelger og vind er korrelerede; denne analyse er ikke en kausal effektmaaling.
- Der findes endnu ikke komplette nok tur-/nul-funddata til endelig kalibrering.
- 24/48 timer er en forskningsshortlist, ikke produktionskoefficienter.

## Reproducerbarhed

- `js/core/ravscore-regime-memory.js`
- `scripts/test-ravscore-regime-memory.mjs`
- `scripts/analyze-ravscore-regime-memory.mjs`
- privat input: eksisterende `ravscore-historical-forcing-features.json` og `ravscore-historical-wind-features.json`
- privat aggregeret output: `ravscore-regime-memory-analysis.json`
