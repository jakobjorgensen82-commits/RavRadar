# RavScore: kandidat D og E

Status: Score-neutrale forskningskandidater. Ingen offentlig score, pil eller forklaring ændres.

## Fejlen, som scenariematrixen fandt

Kandidat B gav cirka 67 point ved en frisk efter-storm-situation, hvor både bølger og strøm førte væk fra kysten. Modellen skelnede godt relativt: den tilsvarende pålandssituation var cirka 25 point bedre. Det absolutte fralandsniveau var stadig for højt.

Årsagen var leveringsformlen. God hændelsestiming og aftagende bølgeenergi kunne tilsammen give 65 af 100 leveringspoint, selv når den aktuelle retningsstøtte var nul. Timing beskrev altså et godt tidspunkt, men blev behandlet som om den også skabte en transportvej.

Den aktive A/B/C-skyggekørsel brugte desuden ikke det eksisterende diagnostiske modul for bølgeretning og bølgeperiode. Derfor kunne A-C ikke undersøge konflikter mellem bølger og strøm fuldt ud.

## Kandidat D

Kandidat D bevarer vægtene 25/40/35 og A-C som historisk reference.

Den ændrer leveringsdelen sådan:

1. Strøm-/historiktransport kombineres forsigtigt med bølgeretning, periode og relativ bølgeenergi.
2. Den kombinerede retningsvej er grundlaget for levering.
3. Hændelsestiming og aftagende energi kan forbedre en eksisterende vej, men kan ikke skabe levering alene.
4. Grove statiske felter for rev, lavt vand og ålegræs giver ingen fastholdelsesbonus.
5. Manglende lokal fastholdelse vises som modelbegrænsning.

Formlen for levering bruger foreløbigt mellem 55 og 100 procent af den dokumenterede retningsvej afhængigt af hændelsesfasen. Hvis retningsvejen er nul, er levering derfor også nul.

## Kandidat E

E er D med en smallere fysisk flaskehals:

- kun mobilisering og samlet transport/levering kan udløse reduktionen,
- jagtbarhed indgår ikke i gaten,
- der er fuld score, når det svageste fysiske led er mindst 35,
- og reduktionen vokser glat til højst 15 procent ved et fysisk led på nul.

Det erstatter ikke sikkerhedsregler og er ikke en naturlov. Formålet er at forhindre, at høj jagtbarhed eller høj mobilisering alene skjuler en næsten manglende fysisk vej til kysten.

## Hvorfor A-C bevares

Model-id'er må ikke skifte betydning efter en kørsel. A, B og C forbliver derfor uændrede, så resultaterne fra 4.0.251 fortsat kan reproduceres. D og E får nye id'er og skal vurderes separat på den faste scenariematrix, historiske forløb og en senere aktiv skyggekørsel.

## Stopregel

D eller E må ikke aktiveres, før:

- de faste nationale scenarier er grønne,
- store ændringer er forståelige på almindeligt dansk,
- historiske hændelser ikke viser systematiske fysiske paradokser,
- den aktive nationale skygge har sammenhængende bølge- og strømdata,
- og score, pil og forklaring er samlet i én kanonisk offentlig beregningsvej.
