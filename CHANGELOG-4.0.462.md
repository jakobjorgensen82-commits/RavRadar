# 4.0.462 – stor runtime-sammenligning uden V8-strengoverløb

Code-only-run `35743282510` kom forbi den tidligere predecessor-/target-
binding. Den stoppede derefter i selve private runtime-migrationen med
`RangeError: Invalid string length`, fordi Candidate G's store 673-dels state
blev sammenlignet ved først at bygge én samlet canonical tekststreng.

Det er samme underliggende V8-grænse som den tidligere 4.0.436-fejl, men i en
anden sti: dengang fejlede skrivningen af hele `conditions.json`; nu fejlede
kun migratorens lighedskontrol. 4.0.462 sammenligner derfor JSON-strukturen
direkte med en iterativ, nøglesorteret strukturkontrol. Den opdager fortsat
enhver ændring i vejr, state eller målinger, men laver ikke en ubegrænset
mellemstreng. En regression med 673 dele × 118 timer er tilføjet.

Ingen vejrdata, scoreformel, geometri, providerprioritet eller fallbackregel
ændres. Binding-inventaret og det additive registerdesign består: et senere
fund skal kunne tilføjes som én klassificeret post med producent, consumers og
validator; det er ikke en tilladelse til at fjerne eksisterende kontroller.

Næste trin er målrettede tests, RDKS-/versionskontrol, exact-head sourcegate,
PR/merge og én ny providerfri code-only-kørsel. Vejrleverandører må først
startes, når denne kodekæde er grøn.
