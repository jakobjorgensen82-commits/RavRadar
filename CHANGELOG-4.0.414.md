# Changelog 4.0.414

4.0.413 blev merged som `50216cd6`. Recovery `35344230599` verificerede de
fastlåste source-/target-artifacts og live 4.0.410, men stoppede før CAS,
fordi same-binding-source fejlagtigt skulle have transitionnavnet fra første
cutover. Source-run `35331109332` beviser, at central version 23 i stedet blev
oprettet af den almindelige integrerede vedligeholdelse.

4.0.414 validerer source direkte gennem central version, aktiv status, head,
dataset/reference, manifests, implementation closures, deployments, tre
modelbindinger, readiness, audit, profil, kalibrering, fejlfelt og den
genberegnede normale maintenance-seal. Alle afvigelser samles som faste
feltkoder før skrivning. Targetets artifact-, Pages-, audit-, profil-,
binding- og CAS-beviser er uændrede. Formel, vægte, vejrsampling, geometri og
providerprioritet ændres ikke.
