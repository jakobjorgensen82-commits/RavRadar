# Changelog – RavRadar 4.0.273

## Ændret

- Candidate G med vægtningen 20/50/30 er nu den eneste offentlige RavScore-model.
- Den gamle 25/40/35-model kan ikke længere vælges som offentlig reserve, rollback eller automatisk fallback.
- Manglende Candidate G-data gør kun den konkrete zone, søgemåde og time utilgængelig. Andre zoner fortsætter normalt på Candidate G.
- En utilgængelig score erstattes ikke med en score fra en gammel model, en moderzone, en nabozone eller en anden time.
- Aktuelle og femdøgns-ranglister udelader utilgængelige lokale scorer.
- Adminforsiden viser, om alle zoners Candidate G-scorer er aktive. Hvis ikke, vises berørte zoner, søgemåder og forståelige årsager.

## Bevidst uændret

- Candidate G's faglige regler og vægtning 20/50/30.
- Vejrkilder, rå vejrværdier, state-hukommelse og produktionskravet om verificerede data.
- Zoner, kystgeometri og land-/vandpunkter.
- Geodatafilerne har kun fået versionsfeltet 4.0.273.

## Kontrol

- Målrettede profil-, pipeline-, lands-, UI-, state- og shadowtests er grønne.
- RDKS og begge håndbøger beskriver den samme Candidate G-only-kontrakt i DEC-0072.
- Endelig produktionsverifikation registreres efter exact-head, merge og frisk offentlig kørsel.
