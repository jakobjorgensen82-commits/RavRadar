# DEC-0078 – Eksakt native reference ved Candidate G-vinduesskift

**Status:** AKTIV – KANDIDAT 4.0.282

**Dato:** 2026-08-26

**Berører:** de otte ejerallowlistede `dkss_lf`-regionalproxyers Candidate G-state ved begyndelsen af et nyt beregningsvindue

**Ændrer ikke:** Candidate G's 20/50/30-vægte, scorekurver, 48-timersregler, vejrkilder, zoner, geometri, land-/vandpunkter, admin-data eller brugerdata

## Problem

Produktion `32907678721` stoppede korrekt før release og deploy, fordi kun 665 af 673 kyststrækninger havde eksakt verificeret strøm eller dokumenteret native-kadencetilstand. De otte resterende strækninger var de godkendte regionalproxyer med ægte tretimerskadence.

Kildehistorikken indeholdt den seneste eksakte verificerede måling. Ved et beregningsvindues begyndelse kunne målingen imidlertid ligge umiddelbart før den første række i vinduet og endnu ikke være skrevet ind i den kompakte Candidate G-fortsættelse. Den første mellemtime blev derfor fejlagtigt behandlet som en ukendt pause. Fejlen lå i overgangen mellem kildehistorik og kompakt state – ikke i den fysiske scoremodel eller i land-/vandpunkterne.

## Beslutning

1. Kun de otte allerede godkendte `dkss_lf`-regionalproxyer må bruge en reference fra umiddelbart før beregningsvinduet.
2. Referencen skal være en eksakt verificeret kilderække, ligge før vinduets første time og højst være tre timer gammel.
3. Referencen må kun videreføre transporttilstanden. Den må ikke skabe en ny måling, en ny pil, en ny bevægelsestime eller et nyt mobiliseringsbidrag.
4. Før referencen føres ind i Candidate G-state, reduceres den til de to dataminimerede felter `time` og kystrelativ `strength`. Rå U/V, koordinater, punkt-id og private kildepayloads må ikke indgå i statefortsættelsen eller offentliggøres.
5. Der opfindes ingen mellemtimer og foretages ingen interpolation. Er referencen ældre end tre timer, forkert placeret eller ikke verificeret, stopper den konkrete kystdel fortsat lokalt.
6. Næste ægte måling overtager på normal vis. Candidate G's 48-timershukommelse, +10/-8-forløb, 13-timersregel og samlede 20/50/30-score er uændrede.

## Kontrol

- State-pipelinetesten skal bevise et vindue, der begynder én time efter den seneste ægte tretimersmåling, og afvise en reference ældre end tre timer.
- Live-pilottesten skal bevise, at kun de fire tilladte, dataminimerede referencefelter forlader kildehjælperen, og at rå vektorer, koordinater og kilde-id ikke gør.
- Produktionskæden skal bevise 673/673 scoreklare kyststrækninger, bevaret Candidate G-state, eneste profil 20/50/30 samt grøn fuld validering og releasegate før deploy.
- Den offentlige efterkontrol skal bekræfte, at aktive strækninger ikke viser falsk **Mangler/Ukendt**, mens reelle huller fortsat er lokalt utilgængelige.

## Erstattede beskrivelser

Beskrivelsen af de otte strækninger som et nyt eller tabt datahul er erstattet. Målingen var til stede; den manglede kun som eksakt reference ved vinduets begyndelse. DEC-0074's forbud mod opdigtede mellemtimer og DEC-0077's krav om ærlig teknisk visning er fortsat bindende.
