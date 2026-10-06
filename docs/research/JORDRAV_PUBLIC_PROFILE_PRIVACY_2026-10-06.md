# Jordravs offentlige profilkoordinater og artifactkontrol

Første 4.0.544 kode-only kørsel, 37428389866, stoppede ved den samlede
prewritekontrol. Kildebevis, eksakt genbrug af gemt runtime, private bundle
og Pages-prebuild bestod. Privacykontrollen afviste to feltnavne:
`longitude` og `latitude` i `data/jordrav/context-20261006/profiles.json`.
Pages-deploy blev sprunget over. Det er et faktisk leveringsproblem,
ikke en automatisk godkendelsesafvisning eller en grund til at omgå gaten.

Koordinaterne stammer fra de originale offentlige Jupiter-profiler.
De 16 punkter, kilde-URL'er, originalhash, observationstid og 126 geologiske
rækker er allerede kontrolleret og publiceringsbestilt. Der er ingen GPS,
privat prøvetagningsgeometri eller private produktionsværdier i filen.
Kildebevis: `jordrav/public-context-sources-2026-10-06.json`.

Rettelsen godkender kun de to direkte koordinatblade under filens 16
`profiles`-poster. Før godkendelsen skal den præcise filplacering og
browserens eksisterende byte-/SHA-binding bestå:
19.372 bytes og `bdfee755c5be9f0e80e0b4ecb2614ead6fd91980a5882250d01efdf563afe4a6`.
En anden fil, ændret indhold eller et andet koordinatsted får ingen undtagelse.
Den rekursive kontrol af private felter, stier, rå vektorer, private
fingerprints og runtimebindinger kører fortsat også gennem denne fil.

Målprøverne bruger den faktiske, uændrede offentlige profilfil og kræver
positiv gennemgang af hele synthetic Pages-fixturet. De afviser særskilt
ændrede punktkoordinater, samme bytes ved anden filplacering og en privat
payload tilføjet på den godkendte sti. Eksisterende angrebsprøver bevares.
Kode-only runtime- og tracked-privacy-kontrakter kontrolleres særskilt.

Ingen Jordravproduktfil, profilbyte, geologisk model, kystgeodata,
RavScore-formel, modelbinding, scheduler eller providerbudget ændres.
Version 4.0.544 er endnu ikke leveret og beholdes til denne samme release.
Fuld exact-head CI, sikker merge og en ny faktisk kode-only leveringskørsel
kræves. Først den nye kørsel og den offentlige browserkontrol kan lukke
JORDRAV-006/-016. Ekstra høj indsats anbefales til slutkontrollen.
