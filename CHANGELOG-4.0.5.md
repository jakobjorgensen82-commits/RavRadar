# RavRadar 4.0.5 – diagnostikstart og vedvarende DMI-status

- Retter årsagen til, at 4.0.4-diagnostikken kunne blive stående som en tom førstegangs-placeholder.
- En frisk DMI bulk-cache regenererer nu stadig ocean-diagnostikken i stedet for at afslutte uden rapport.
- Preflight tvinger en tung kørsel, når ocean-diagnostikken mangler eller stadig venter på første 4.0.4/4.0.5-kørsel.
- Hydrering omfatter nu både den maskinlæsbare ocean-diagnostik og tekstresuméet, så diagnostisk status bevares mellem GitHub Actions-kørsler.
- GitHub Actions-resuméet viser ocean-dækning, også når en frisk bulk-cache genbruges.
