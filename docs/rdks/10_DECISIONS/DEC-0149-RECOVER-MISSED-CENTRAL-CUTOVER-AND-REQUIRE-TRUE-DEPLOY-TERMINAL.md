# DEC-0149 – Genskab den manglende centrale cutover og kræv en sand deployslutning

**Status:** Aktiv
**Dato:** 2026-09-15
**Besluttet af:** Ejeren på baggrund af den faktiske produktionsfejl
**Berører:** RavScore-aktivering, code-only-deploy, Pages-terminal og fejlsamling
**Supplerer:** DEC-0110, DEC-0144 og DEC-0148

## Kontekst

Cutover-run `34877443841` publicerede det integrerede Pages-artifact fra main
`fa418f43bbd070c446ed19b6587541b93af89599`. Workflowet fortsatte imidlertid
efter en fejlet privacyaudit og en manglende integreret plan. Derfor blev
handoffet ufuldstændigt, den atomiske centrale begin/complete-overgang blev
aldrig udført, og den centrale profil blev stående på legacy Candidate G uden
et operationelt dokument.

Det sidste trin kontrollerede kun, at Pages-deploy og offentlig readback var
grønne. Fordi cutovertrinnene havde `continue-on-error`, blev kørslen fejlagtigt
mærket grøn, selv om installationens centrale sluttilstand manglede. Den
offentlige model var derfor lagt ud, men cutoveren var ikke fuldført.

## Beslutning

1. 4.0.367 må udføre én snæver recovery, men kun når det operationelle dokument
   stadig mangler, den centrale profil stadig er den eksakte legacyprofil, og
   den offentlige manifesthash er præcis targethashen fra run `34877443841`.
2. Recoveryen er låst til repository, run, attempt, head, deployment-id,
   artifact-id, artifactdigest, størrelse samt kanoniske hashes for legacykilde,
   attestation, verification, targetmanifest, audit, readiness, modelbinding og
   Pages-seal. Enhver afvigelse stopper uden write.
3. Det historiske privacy-sikre recoveryartifact downloades fra det oprindelige
   run. Den aktuelle offentlige side verificeres frisk mod dets forseglede
   contract, bundle og implementation closure umiddelbart før write.
4. Efter en ny exact-main-kontrol skrives den allerede offentlige historiske
   integrerede tilstand atomisk som central version 1 sammen med dens forseglede
   profil. Recoveryen er ikke en ny deploy og henter ingen vejrdata.
5. Det eksisterende code-only-forløb læser derefter central tilstand igen og
   fortsætter gennem den almindelige historisk-til-aktuel bindingsvedligeholdelse
   til 4.0.367. Ingen gennemførte provider-, oneoff- eller gamle cutovertrin
   gentages.
6. Den genbrugelige Pages-terminal skal altid kontrollere den konkrete handlings
   begin/complete-resultat, checkpoint, Pages-deploy og offentlig verification.
   `continue-on-error` må samle cutoverfejl, men må aldrig igen gøre et
   ufuldstændigt forløb grønt. En vellykket, eksplicit reconciliation kan
   erstatte et fejlet completion-led.
7. Kode-only-deployet genbruger PR-headens ene grønne sourcegate og kører den
   ikke igen. Normal tidsbegrænset vejrdrift følger først efter offentlig
   4.0.367-verifikation.

## Konsekvenser

- Den centrale sandhed bringes i overensstemmelse med det artifact, der allerede
  faktisk er offentligt, uden at opfinde data eller genstarte first cutover.
- Recoveryen kan ikke bruges som en generel omgåelse; den er bundet til én kendt
  historisk hændelse og bliver automatisk irrelevant, når central version 1
  findes.
- En grøn Pages-kørsel betyder fremover også, at det nødvendige centrale
  slutpunkt er nået.
- Numeriske scorer, normal rotation og cachevedligeholdelse er fortsat åbne
  driftsbeviser og må ikke udledes af strukturel 210/673-komplethed.
