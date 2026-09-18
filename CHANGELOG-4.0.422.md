# Changelog 4.0.422

Providerfri 4.0.421-kørsel `35383989821` gennemførte hele byggejobbet. Den
genbrugte den grønne kildekontrol, hentede ingen vejrdata, matchede den
kendte audit eksakt, publicerede privat runtime og Edge-readiness og byggede
et privacy-sikkert Pages-artifact.

Pages-jobbet stoppede før deploy, fordi handoff-kontrollen stadig antog, at
enhver kendt public-source-repair skulle være
`integrated-historical-maintenance`. Den aktuelle centrale model og binding
er allerede aktiv og klassificeres derfor korrekt som almindelig
`integrated`.

4.0.422 tillader de to gyldige integrerede tilstande for den eksakte
source-repair. Når tilstanden allerede er `integrated`, observerer den stadig
det offentlige manifest, gendanner det forseglede source-artifact, verificerer
den fastlåste 79/79-kilde og uploader source-evidens før deploy. Det nye mål
verificeres fortsat uden repair-undtagelse, og central status genforsegles
først efter et verificeret Pages-deploy.

Der hentes ikke vejr, og caches, scorer, model, geometri, providerprioritet
og DMI-rotation ændres ikke. Se DEC-0205.
