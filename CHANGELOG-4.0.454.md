# RavRadar 4.0.454

## Rettet

- På pc strækkes kortområdet nu ned langs ranglisten “Bedste områder”, så
  den ledige højde ikke ender som et stort tomt felt under kortet.
- Rettelsen gælder kun ved mindst 881 px skærmbredde. Mobil- og tabletlayout,
  kortkontroller, data, score og ranglisteindhold er uændret.

## Målrettet verifikation

- Kontrolleret de eksisterende desktop- og mobilbreakpoints i `style.css`.
- Kontrolleret at ændringen er afgrænset til `.dashboard`/`.map-column` på
  pc og ikke overskriver mobilreglerne.
- `git diff --check` og release-/RDKS-kontroller køres på den endelige head.
