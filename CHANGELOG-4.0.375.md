# RavRadar 4.0.375 – komplet, streng migration af gemt modelmetadata

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only mangler.

## Produktionsbevis før rettelsen

4.0.374 bestod sourcegate `34933609573`, blev merged gennem PR #316 som main
`dd59bc511a2a98a8236d129aab113e91779c84bf`, og providerfri code-only
`34934257354` genbrugte det grønne sourcebevis. Runnet genbrugte central version
1 og migration 16/17, gendannede den eksakte forgænger-runtime og installerede
den migrerede private runtime atomisk uden provider eller oneoff.

Den offentlige genopbygning stoppede derefter før publicering, fordi den gamle
bundlehash stadig fandtes i scoreprofilen. Samme gamle hash findes også i
indlejrede delresultater, zone-timer, forklaringer og Candidate G-backup.

## Rettelse

Migrationen gennemgår nu hele den gemte `conditions.json`, inklusive arrays.
Den accepterer kun en eksakt 11-feltsbinding, en eksakt offentlig scoreprofil
eller et kompakt resultat med en eksakt indlejret binding. Kun feltet
`modelBundleSha256` må ændres. Den bevarede integrerede continuation state
opdateres fortsat særskilt og valideres før og efter for alle 673 dele.

Den dynamiske allowlist skal være identisk med den faktiske leaf-diff, og ingen
gammel integreret eller Candidate G-bundlehash må være tilbage. Ukendt eller
modstridende metadata stopper migrationen. Scores, vejrdata, målinger,
proveniens, Candidate G-state, geometri og de øvrige otte private filer er
uændrede. En forældet privat-runtime-testfixture indeholder nu det offentlige
manifest, som den virkelige preflight kræver. Se DEC-0156.

