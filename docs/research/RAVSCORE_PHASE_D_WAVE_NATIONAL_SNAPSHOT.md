# RavScore fase D: nationalt øjebliksbillede for bølgekandidaten

Status: diagnostisk kontrol af offentlige data. Ingen produktionsscore eller geometri er ændret.

## Datagrundlag

Kontrollen brugte den offentlige `public-conditions.json`, genereret 20. august 2026 kl. 17:04:42 UTC.

Filen indeholdt:

- 210 zoneposter,
- metadata med 673 forventede og 673 beregnede kystdele,
- 225 offentliggjorte aktuelle kystdelsposter, fordelt på alle 210 zoner,
- lokal bølgehøjde, bølgeretning, strømretning og strømhastighed for alle 225 poster,
- samt bølgeperiode på zoneniveau for 209 af 210 zoner.

Den kompakte offentlige fil indeholder ikke en selvstændig bølgeperiode for hver kystdel. Audit­ten brugte derfor den tilhørende zones aktuelle bølgeperiode sammen med kystdelens lokale bølgehøjde og retning. Det er en tydelig diagnostisk begrænsning og må ikke beskrives som en fuld kontrol af alle 673 underliggende delberegninger.

## Resultat

Hver af de 225 offentliggjorte delposter blev beregnet for både strandsøgning og vadning, i alt 450 sammenligninger.

| Mål | Resultat |
|---|---:|
| Tilgængelige sammenligninger | 450 af 450 |
| Gennemsnit, tidligere proceskandidat | 40,776 |
| Gennemsnit, bølgekandidat | 40,818 |
| Gennemsnitlig ændring | +0,042 |
| Mindste ændring | -1 |
| Største ændring | +3 |
| Ændrede scorekategorier | 0 |

Det aktuelle snapshot havde forholdsvis lav bølgeaktivitet. Derfor påvirker kandidatens aktivitetsstyrede bølgedel kun scoren lidt. Det er forventet og viser, at bølgeinputtet ikke skaber unødig uro under rolige forhold.

## Retningsforhold

Tallene herunder tæller begge søgemåder og er derfor dobbelt så store som antallet af berørte kystdelsposter.

| Forhold mellem strøm og bølger | Sammenligninger | Gennemsnitlig ændring |
|---|---:|---:|
| Begge mod land | 172 | +0,006 |
| Strøm ud, bølger ind | 44 | +0,227 |
| Strøm ind, bølger ud | 92 | +0,043 |
| Blandet eller omtrent langs kysten | 140 | +0,029 |
| Manglende bølgeperiode | 2 | 0 |

Det er væsentligt, at strøm og bølger ofte ikke fortæller den samme historie. I 68 af de 225 offentliggjorte kystdelsposter var den ene tydeligt indadrettet og den anden tydeligt udadrettet. Det understøtter, at en fremtidig model ikke bør behandle den aktuelle strømpil som hele forklaringen på transport og levering.

## Manglende bølgeperiode

Én zone manglede bølgeperiode. Kandidaten opfandt ikke en erstatningsværdi, men bevarede den tidligere kandidats score og markerede den lavere datadækning. Begge søgemåder for den offentliggjorte kystdel kunne derfor stadig vises uden en falsk bølgeeffekt.

Audit-gaten accepterer højst én sådan tydeligt rapporteret mangel i dette kendte snapshot. Hvis dækningen bliver dårligere, fejler kontrollen.

## Hvad kontrollen beviser

- Den offentlige datakæde indeholder bølgehøjde og bølgeretning for alle offentliggjorte aktuelle kystdelsposter.
- Zonekæden indeholder næsten fuld dækning for bølgeperiode.
- Kandidaten kan sikkert falde tilbage ved manglende periode.
- Kandidaten giver kun små ændringer under dette rolige snapshot.
- Bølge- og strømretning er ofte uenige og bør vurderes separat.

## Hvad kontrollen ikke beviser

- Den tester kun ét tidspunkt og kan ikke validere stormforløb.
- Den tester 225 offentliggjorte poster, ikke alle 673 detaljerede kystdele.
- Zoneperioden kan afvige fra den lokale kystdels periode.
- Den kan ikke afgøre, om en scoreændring svarer til flere eller færre fund.
- Den kan ikke erstatte tidsserier, feltobservationer eller senere ture med nul-fund.

## Næste trin

1. Genbrug kontrollen på naturligt opståede produktionsartefakter med højere bølgeaktivitet; udløs ikke ekstra dyre browser- eller produktionskørsler kun for dette.
2. Sammenlign flere tidspunkter gennem et helt stormforløb, når egnede artefakter findes.
3. Undersøg om bølgeperiode sikkert kan bevares på kystdelsniveau i det diagnostiske datasæt uden at udvide den offentlige payload unødigt.
4. Hold kandidaten diagnostisk, indtil de største bølge-/strømuoverensstemmelser er fagligt vurderet.

## Reproducerbar lokal kontrol

Kontrollen tager en eksplicit sti og henter ikke selv data fra nettet:

```text
node scripts/audit-phase-d-wave-national-public.mjs <sti-til-public-conditions.json>
```
