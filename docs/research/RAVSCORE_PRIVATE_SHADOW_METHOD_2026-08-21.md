# Metode for privat RavScore-kandidat-shadow

## Formål

Metoden undersøger A, B og C på rigtige nationale marine- og vindserier uden at ændre RavRadar for brugerne. Den skal især vise, om kandidat B belønner faktisk levering mod stranden eller blot transport forbi stranden.

## Input og historik

- Hver lokal kystdel beholder sin egen serie og sin egen retning mod kysten.
- Vind, bølge og strøm læses kun fra de allerede kortlivede private shadow-input.
- Hændelseshistorikken ser 24 timer tilbage.
- Strømforløbet ser højst 72 timer tilbage.
- Høj energi følger den aktive definition: mindst 9 m/s vind eller 1,2 meter bølge.
- En stærk hændelse følger den aktive definition: mindst 14 m/s vind eller 1,5 meter bølge.
- Hændelsesvarigheden tilpasses kildens faktiske tidsafstand, så tretimersdata ikke fejlagtigt behandles som timeværdier.
- `hoursSinceStrongEventEnd` beregnes fra hændelsens reelle sluttid.

## Modeller

- Aktiv: `RRS-CURRENT-B0-4.0.247`.
- A: glatte regler og hændelseshukommelse.
- B: A plus levering og fastholdelse.
- C: B plus en mild gate på det svageste nødvendige fysiske led, mobilisering eller levering.

De stabile id'er kommer direkte fra det fælles modelregister i kode. Shadow-validatoren må ikke oprette egne modelnavne.

## Retningskontrol af kandidat B

Strømmens retning sammenlignes med den lokale retning mod kysten:

- `onshore-delivery`: tydelig komponent mod kysten.
- `alongshore-passage`: overvejende langs kysten.
- `offshore-removal`: tydelig komponent væk fra kysten.
- `unknown`: retningen kan ikke vurderes sikkert.

Rapporten viser B minus A for hver gruppe. Et positivt gennemsnit er ikke automatisk godt. Leveringsløft skal være fysisk forståeligt og må ikke systematisk være størst ved passage eller udtransport.

Den nuværende nationale kontrakt indeholder ikke komplette lokale features for rev, ålegræs og lavt vand. Rapporten markerer derfor fastholdelsesdækningen særskilt. Første nationale kørsel kan give stærk evidens om levering og retning, men ikke alene validere hele fastholdelsesleddet i kandidat B.

## Rapport og dataminimering

Den private rapport indeholder:

- antal vurderede contexts,
- forskelle mellem aktiv, A, B og C for waders og strand,
- B minus A opdelt efter retningstype,
- fem største scoreafvigelser,
- kystdels-id, tidspunkt og mode til målrettet fejlsøgning,
- ingen rå vejrvektorer.

De transiente input slettes efter beregningen. Rapporten er et analyseartefakt og må ikke projiceres til den offentlige side.

## Beslutningsregel

Første virkelige nationale rapport bruges til at udvælge enkelte delregler til videre shadow, ikke til automatisk aktivering. Hvis B løfter passage eller udtransport urimeligt, justeres leveringsreglen. Hvis A fortsat er for volatil, justeres kurver og hændelseshenfald. C beholdes kun, hvis data viser gentagne fysisk misvisende høje scorer.
