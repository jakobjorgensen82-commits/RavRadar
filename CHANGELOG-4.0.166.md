# RavRadar 4.0.166

- Stopper den ineffektive #2167-kørsel, hvor 32 native HARMONIE-kandidater blev undersøgt for alle 774 dele og stadig arbejdede efter 54 minutter.
- Bevarer produktionens normale fire-cellesøgning som første trin for alle dele.
- Kører kun den udvidede 32-cellesøgning som målrettet retry for de dele, der faktisk mangler to komplette wind-U/V-trin.
- Samme-celle-, afstands-, provenance-, missing-, ingen-interpolation- og ingen-parentfallbackkrav er uændrede.
