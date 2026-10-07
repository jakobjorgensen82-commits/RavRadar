// Public source registry for deterministic RavRadar knowledge.
// Keep this list free of private data, coordinates and model-internal diagnostics.
export const RAV_ASSISTANT_SOURCES = Object.freeze({
  'usgs-resuspension-advection': source('USGS OFR 2005-1250: Predicting sediment transport caused by northeast storms',
    'https://pubs.usgs.gov/of/2005/1250/html/chapt6.html',
    'official-authority','official-guidance','Primary indexed excerpt distinguishes wave-driven sediment resuspension from net transport by currents. Direct page read returned 403; no full-report review claimed. Massachusetts Bay sediment thresholds, rates and directions are not transferred to Danish amber or RavScore.','2026-10-07'),
  'noaa-longshore-transport': source('NOAA Ocean Service: Longshore Currents',
    'https://oceanservice.noaa.gov/education/tutorial_currents/03coastal2.html',
    'official-authority','official-guidance','Read the coastal-current tutorial: transport can run along the shoreline and carry sediment offshore. General coastal analogy, not an observed amber route or a shoreward-delivery guarantee.','2026-10-07'),
  'metoffice-ensemble-method': source('Met Office: What is an ensemble forecast?',
    'https://www.metoffice.gov.uk/research/weather/ensemble-forecasting/what-is-an-ensemble-forecast',
    'official-authority','official-guidance','Multiple forecast members and sensitivity to initial conditions; no imported members, local probability or RavScore interval interpretation.','2026-10-06'),
  'metoffice-assimilation-method': source('Met Office: Data assimilation methods',
    'https://www.metoffice.gov.uk/research/weather/satellite-and-surface-assimilation/data-assimilation-methods',
    'official-authority','official-guidance','Observations and previous forecasts inform the initial state. No claim that RavRadar operates assimilation or has an observation at every sea point.','2026-10-06'),
  'metoffice-numerical-grids': source('Met Office: Numerical weather prediction models',
    'https://www.metoffice.gov.uk/research/approach/modelling-systems/unified-model/weather-forecasting',
    'official-authority','official-guidance','Grid resolution, regional boundaries and deterministic/ensemble distinction only. Foreign model configurations, times and numerical resolutions are not RavRadar specifications.','2026-10-06'),
  'ecmwf-reanalysis-method': source('ECMWF: Fact sheet – Reanalysis',
    'https://www.ecmwf.int/en/about/media-centre/focus/2023/fact-sheet-reanalysis',
    'official-authority','official-guidance','Reanalysis combines past observations with rerun models. It is not an originally issued forecast, an observation-only record or a newly installed RavRadar source.','2026-10-06'),
  'metoffice-nowcasting-method': source('Met Office: Nowcasting',
    'https://www.metoffice.gov.uk/research/weather/space-applications-and-nowcasting/nowcasting',
    'official-authority','official-guidance','Very short-range local forecasting definition; no promise of a separate RavRadar nowcast, radar field or faster refresh.','2026-10-06'),
  'nist-measurement-terminology': source('NIST TN1297: Appendix D1 – Terminology',
    'https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-d1-terminology',
    'official-authority','official-guidance','Accuracy, precision, repeatability, reproducibility, measurand and error terminology. No measured calibration, find likelihood or certification of RavRadar.','2026-10-06'),
  'nist-uncertainty-classification': source('NIST TN1297: Classification of components of uncertainty',
    'https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-2-classification-components-uncertainty',
    'official-authority','official-guidance','Uncertainty components and evaluation classes, not the size or statistical interpretation of a RavRadar score range.','2026-10-06'),
  'nist-type-a-evaluation': source('NIST TN1297: Type A evaluation of standard uncertainty',
    'https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-3-type-evaluation-standard-uncertainty',
    'official-authority','official-guidance','Statistical evaluation and the independence requirement in the example of a mean. No automatic conversion of hourly forecasts into independent samples.','2026-10-06'),
  'nist-type-b-evaluation': source('NIST TN1297: Type B evaluation of standard uncertainty',
    'https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-4-type-b-evaluation-standard-uncertainty',
    'official-authority','official-guidance','Evaluation from prior information, specifications and reference information; not an arbitrary guessed margin.','2026-10-06'),
  'nist-uncertainty-reporting': source('NIST TN1297: Reporting uncertainty',
    'https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-7-reporting-uncertainty',
    'official-authority','official-guidance','Report method, components and coverage factor where applicable. No automatic 95-percent interpretation of a score interval.','2026-10-06'),
  'nist-location-statistics': source('NIST Engineering Statistics Handbook: Measures of location',
    'https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm',
    'official-authority','official-guidance','Mean and median and sensitivity to extremes; no replacement of the actual product ranking or original values.','2026-10-06'),
  'nist-spread-statistics': source('NIST Engineering Statistics Handbook: Measures of scale',
    'https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm',
    'official-authority','official-guidance','Standard deviation, variance and interquartile spread, not a confidence level, guaranteed range or new scoring method.','2026-10-06'),
  'nist-outlier-analysis': source('NIST Engineering Statistics Handbook: Detection of outliers',
    'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm',
    'official-authority','official-guidance','Unusual observations require investigation; they may be errors or real events. No automatic deletion, clipping or private-history modification.','2026-10-06'),
  'nist-autocorrelation': source('NIST Engineering Statistics Handbook: Autocorrelation',
    'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm',
    'official-authority','official-guidance','Association within a time series at a time lag; does not certify independent hourly evidence or establish causation.','2026-10-06'),
  'noaa-upwelling-method': source('NOAA Ocean Service: What is upwelling?',
    'https://oceanservice.noaa.gov/facts/upwelling.html',
    'official-authority','official-guidance','Upward replacement of displaced surface water and the reverse process. Foreign examples and fishing productivity are not amber-delivery evidence.','2026-10-06'),
  'noaa-coriolis-method': source('NOAA Currents Tutorial: The Coriolis Effect',
    'https://oceanservice.noaa.gov/education/tutorial_currents/04currents1.html',
    'official-authority','official-guidance','Rotation-related deflection in large-scale circulation; no fixed turning rule for every Danish surf-zone current or amber piece.','2026-10-06'),
  'noaa-ekman-method': source('NOAA Currents Tutorial: The Ekman Spiral',
    'https://oceanservice.noaa.gov/education/tutorial_currents/04currents4.html',
    'official-authority','official-guidance','Idealised wind, friction and rotation explanation of depth-dependent flow. No imported depth, angle or local coastal correction.','2026-10-06'),
  'noaa-windage-method': source('NOAA GNOME: Frequently asked questions – windage',
    'https://gnome.orr.noaa.gov/doc/faq.html',
    'official-authority','official-guidance','Direct wind action on floating objects; foreign oil/debris coefficients and persistence settings are not transferred to submerged amber.','2026-10-06'),
  'usgs-discharge-method': source('USGS Water Science School: How streamflow is measured',
    'https://www.usgs.gov/water-science-school/science/how-streamflow-measured',
    'official-authority','official-guidance','Discharge versus velocity and site-specific stage-discharge relations. No imported river values, sampling schedules or inference from a Danish sea level.','2026-10-06'),
  'usgs-conductivity': source('USGS Water Science School: Conductivity and water',
    'https://www.usgs.gov/water-science-school/science/conductivity-electrical-conductance-and-water',
    'official-authority','official-guidance','Dissolved ions affect electrical conductivity; not water-flow speed, amber identification or a safe electrical experiment.','2026-10-06'),
  'usgs-turbidity': source('USGS Water Science School: Turbidity and water',
    'https://www.usgs.gov/water-science-school/science/turbidity-and-water',
    'official-authority','official-guidance','Optical scattering and water clarity, not a universal conversion to sediment mass, water safety or amber inventory.','2026-10-06'),
  'usgs-suspended-sediment': source('USGS Water Science School: Sediment and suspended sediment',
    'https://www.usgs.gov/water-science-school/science/sediment-and-suspended-sediment',
    'official-authority','official-guidance','Suspended material, settling, concentration and transported mass. River examples do not establish sea-point measurements or a calibrated amber transport rate.','2026-10-06'),
  'usgs-sediment-budget': source('USGS OF03-337: Sediment budget',
    'https://pubs.usgs.gov/of/2003/of03-337/budget.html',
    'official-authority','official-guidance','Balance of sediment sources and sinks and erosion/accretion, not an observed amber budget. Source text was available in the indexed primary-source excerpt; no claim of a full inaccessible report review.','2026-10-06'),
  'usgs-wave-runup-schematic': source('USGS: Schematic depiction of coastal wave runup',
    'https://www.usgs.gov/media/images/schematic-depiction-coastal-wave-runup',
    'official-authority','official-guidance','Wave runup relative to still water includes mean setup and time-varying swash. No local runup calculation, safety threshold or extra term added to existing model sea level.','2026-10-06'),
  'usgs-setup-swash-runup': source('USGS: Empirical parameterization of setup, swash, and runup',
    'https://www.usgs.gov/publications/empirical-parameterization-setup-swash-and-runup',
    'official-authority','peer-reviewed-research','Read the primary 2006 publication abstract: setup, swash and dependence on wave/beach characteristics. No full-paper claim, transferred coefficients, two-percent threshold or RavScore formula.','2026-10-06'),
  'usgs-storm-impact-regimes': source('USGS: How storm-impact regimes affect beach complexes',
    'https://www.usgs.gov/centers/spcmsc/science/how-storm-impact-regimes-affect-beach-complexes-coastal-hazards',
    'official-authority','official-guidance','Distinguishes wave collision at the dune toe, intermittent overwash and sustained inundation. Local morphology matters; US risk labels and recovery times are not applied to Danish beaches.','2026-10-06'),
  'usgs-storm-impact-scale': source('USGS: Storm impact scale for barrier islands',
    'https://www.usgs.gov/publications/storm-impact-scale-barrier-islands',
    'official-authority','peer-reviewed-research','Read the primary 2000 publication abstract: dune-toe/crest distinctions and landward sediment transport associated with overwash. Not a Danish hazard model or amber-transport observation.','2026-10-06'),
  'usgs-sediment-management': source('USGS/FWS: Impacts of sediment management on barrier islands',
    'https://www.usgs.gov/news/national-news-release/usgs-fws-report-highlights-impacts-sediment-management-barrier-islands',
    'official-authority','official-guidance','Read the 2021 official report summary: low narrow barrier islands and managed sand placement with context-dependent effects. No full-report claim, US regulatory advice, local project judgement or assumption that placed sand contains amber.','2026-10-06'),
  'noaa-surface-drifter': source('NOAA Currents Tutorial: Shallow water drifter',
    'https://oceanservice.noaa.gov/education/tutorial_currents/06measure3.html',
    'official-authority','official-guidance','Purpose-built drifters follow a particular near-surface layer. No claim that improvised floating litter measures bottom flow or that RavRadar operates drifters.','2026-10-06'),
  'noaa-current-profiler': source('NOAA Currents Tutorial: Current profiler',
    'https://oceanservice.noaa.gov/education/tutorial_currents/06measure5.html',
    'official-authority','official-guidance','Acoustic Doppler measurements of flow; not amber detection or a claim that the product current arrow is a local profiler reading.','2026-10-06'),
  'noaa-hf-current-radar': source('NOAA Currents Tutorial: Shore-based current meters',
    'https://oceanservice.noaa.gov/education/tutorial_currents/06measure6.html',
    'official-authority','official-guidance','Land-based HF radar measures surface-current fields; no claim of a RavRadar radar installation, bottom observation or amber detection.','2026-10-06'),
  "metoffice-precipitation-probability": source(
    "Met Office: What does this forecast mean? – Chance of precipitation",
    "https://weather.metoffice.gov.uk/guides/what-does-this-forecast-mean",
    'official-authority', 'official-guidance',
    "Chance of precipitation in a stated place/period, distinct from duration and amount. Met Office thresholds, UK forecast fields and warning criteria are not copied into RavRadar.", '2026-10-06'
  ),
  "dmi-rainfall-millimetres": source(
    "DMI: Følg et regnvejr med DMI – nedbør i millimeter",
    "https://www.dmi.dk/nyheder/generiske-nyheder/folg-et-regnvejr-med-dmi/",
    'official-authority', 'official-guidance',
    "Only the rain-depth unit: 1 mm equals 1 litre per square metre. Historical UI directions and warning criteria are not imported; not sea level or safe wading depth.", '2026-10-06'
  ),
  "bom-rainfall-intensity": source(
    "Bureau of Meteorology: IFD FAQ – depth, duration and rainfall intensity",
    "https://www.bom.gov.au/water/designRainfalls/ifd-arr87/ifdFAQ.shtml",
    'official-authority', 'official-guidance',
    "Rate versus accumulation and duration; arithmetic example is explicitly hypothetical. Australian design rainfall statistics, return periods and flood thresholds are not imported.", '2026-10-06'
  ),
  "metoffice-rain-showers": source(
    "Met Office: Rain – convective rain and showers",
    "https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/rain",
    'official-authority', 'official-guidance',
    "Local intermittent shower patterns, not arrival time at a Danish beach, foreign climate frequency or amber yield.", '2026-10-06'
  ),
  "metoffice-cloud-amount": source(
    "Met Office: How we measure cloud – cloud amount",
    "https://weather.metoffice.gov.uk/guides/observations/how-we-measure-cloud",
    'official-authority', 'official-guidance',
    "Sky fraction and clear/overcast okta endpoints, not rain probability, water clarity, local cloud readings or a new RavRadar weather field.", '2026-10-06'
  ),
  "nws-weather-front": source(
    "NOAA NWS Glossary: Front",
    "https://forecast.weather.gov/glossary.php?word=front",
    'official-authority', 'official-guidance',
    "Air-mass transition definition only, not ocean current, exact Danish beach arrival or an amber transport route.", '2026-10-06'
  ),
  "nws-cold-front": source(
    "NOAA NWS Glossary: Cold Front",
    "https://forecast.weather.gov/glossary.php?word=cold%20front",
    'official-authority', 'official-guidance',
    "Advancing colder denser air replacing warmer air. US regional fronts, storm thresholds and local current/yield predictions are excluded.", '2026-10-06'
  ),
  "nws-warm-front": source(
    "NOAA NWS Glossary: Warm Front",
    "https://forecast.weather.gov/glossary.php?word=warm%20front",
    'official-authority', 'official-guidance',
    "Advancing warmer air replacing colder air, not immediate seawater temperature, local wave conditions or amber guarantee.", '2026-10-06'
  ),
  "nws-occluded-front": source(
    "NOAA NWS Glossary: Occluded Front",
    "https://forecast.weather.gov/glossary.php?word=occluded%20front",
    'official-authority', 'official-guidance',
    "Cold front overtaking a warm or quasi-stationary front; not a forecast data gap, local event diagnosis or missing-value substitute.", '2026-10-06'
  ),
  "noaa-climate-normal-weather": source(
    "NOAA JetStream: Climate vs. Weather",
    "https://www.noaa.gov/jetstream/global/climate-vs-weather",
    'official-authority', 'official-guidance',
    "Time-scale distinction and normally 30-year climate averages only. No foreign climate values, exact Danish season prediction or amber-yield statistic.", '2026-10-06'
  ),
  "dmi-wind-observation-definition": source(
    "DMI: Sådan måles data – middelvind og vindstød",
    "https://www.dmi.dk/friedata/guides-til-frie-data/sadan-males-data/",
    'official-authority', 'official-guidance',
    "DMI observation definitions distinguish ten-minute mean wind from the highest three-second gust. These observation conventions do not establish the averaging interval, gusts or quality of a RavRadar model forecast.",
    '2026-10-06'
  ),
  "nws-wind-squall": source(
    "NOAA NWS Glossary: Squall",
    "https://forecast.weather.gov/glossary.php?word=squall",
    'official-authority', 'official-guidance',
    "Sudden sustained wind increase versus a brief gust; no US warning threshold, local squall arrival time, storm classification or RavRadar warning service is adopted.",
    '2026-10-06'
  ),
  "metoffice-beaufort-scale": source(
    "Met Office: Beaufort wind force scale",
    "https://weather.metoffice.gov.uk/guides/coast-and-sea/beaufort-scale",
    'official-authority', 'official-guidance',
    "Wind force categories and explicit open-sea wave-table limitations. No wave-height conversion at a Danish beach, new score rule or safe-wading threshold.",
    '2026-10-06'
  ),
  "nws-sea-breeze": source(
    "NOAA NWS Glossary: Sea Breeze",
    "https://forecast.weather.gov/glossary.php?word=sea%20breeze",
    'official-authority', 'official-guidance',
    "Thermal daytime coastal circulation from sea towards warmer land, not a fixed local time, model correction, amber guarantee or water-current direction.",
    '2026-10-06'
  ),
  "nws-land-breeze": source(
    "NOAA NWS Glossary: Land Breeze",
    "https://forecast.weather.gov/glossary.php?word=land%20breeze",
    'official-authority', 'official-guidance',
    "Thermal nighttime coastal circulation from land towards sea. Not every offshore wind is a land breeze; no specific beach prediction or universal sea-level change is inferred.",
    '2026-10-06'
  ),
  "noaa-pressure-gradient-isobar": source(
    "NOAA JetStream: Origin of Wind",
    "https://www.noaa.gov/jetstream/synoptic/origin-of-wind",
    'official-authority', 'official-guidance',
    "Equal-pressure contours, spatial pressure changes and the roles of pressure-gradient force, rotation and surface friction. No local wind speed, amber route or independent water-level correction is calculated.",
    '2026-10-06'
  ),
  "nws-barometer": source(
    "NOAA NWS Glossary: Barometer",
    "https://forecast.weather.gov/glossary.php?word=barometer",
    'official-authority', 'official-guidance',
    "Atmospheric-pressure instrument, not a sea-level gauge, current observation, amber locator or proof of safe conditions.",
    '2026-10-06'
  ),
  "metoffice-humidity-dewpoint": source(
    "Met Office: Understanding humidity",
    "https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/humidity",
    'official-authority', 'official-guidance',
    "Relative humidity and dew-point definitions only. No physiology claims, rain probability, local humidity/temperature values, fog forecast or new RavRadar weather field is imported.",
    '2026-10-06'
  ),
  "nws-fog-definition": source(
    "NOAA NWS Glossary: Fog",
    "https://forecast.weather.gov/glossary.php?word=fog",
    'official-authority', 'official-guidance',
    "Suspended near-surface droplets and reduced atmospheric visibility, not underwater clarity, US advisory limits or a measured visibility field in RavRadar.",
    '2026-10-06'
  ),
  'noaa-bathymetry': source(
    'NOAA Ocean Service: What is bathymetry?',
    'https://oceanservice.noaa.gov/facts/bathymetry.html',
    'official-authority', 'official-guidance',
    'Underwater depth and terrain mapping, not current water level, amber inventory, safe wading depth or an updated bathymetric layer in RavRadar.',
    '2026-10-06'
  ),
  'noaa-estuary': source(
    'NOAA Ocean Service: What is an estuary?',
    'https://oceanservice.noaa.gov/facts/estuary.html',
    'official-authority', 'official-guidance',
    'Coastal estuaries and brackish water; explicitly preserves the existence of freshwater estuaries. No classification or salinity measurement for a RavRadar zone.',
    '2026-10-06'
  ),
  'noaa-estuary-circulation': source(
    'NOAA Ocean Service: Classifying Estuaries by Water Circulation',
    'https://oceanservice.noaa.gov/education/tutorial_estuaries/est05_circulation.html',
    'official-authority', 'official-guidance',
    'Mixing varies with winds, tides, basin form and freshwater inflow. Not proof of actual Limfjord circulation, water-source selection, layer current or amber transport.',
    '2026-10-06'
  ),
  'noaa-thermocline': source(
    'NOAA Ocean Service: What is a thermocline?',
    'https://oceanservice.noaa.gov/facts/thermocline.html',
    'official-authority', 'official-guidance',
    'Temperature transition with depth and varying depth/strength, without adopting open-ocean depths or seasonal rules for a Danish beach.',
    '2026-10-06'
  ),
  'pmel-vertical-structure': source(
    'Sprintall and Cronin: Upper Ocean Vertical Structure (2001), NOAA PMEL',
    'https://www.pmel.noaa.gov/people/cronin/encycl/ms0149.pdf',
    'research-synthesis', 'coastal-analogue',
    'Halocline, density pycnocline, mixed layer and density stratification as general physical concepts. No open-ocean numerical criterion, local layer depth, safety limit or actual RavRadar layer diagnosis is inferred.',
    '2026-10-06'
  ),
  'nws-wave-definitions': source(
    "NOAA NWS: Wave crest, trough, wavelength and steepness",
    "https://forecast.weather.gov/glossary.php?word=wave",
    'official-authority', 'official-guidance',
    "Definitions of crest/trough, spatial wavelength versus temporal period, and height-to-wavelength steepness; no universal breaking ratio, local arrival, safety limit or forecast-model cadence is adopted.",
    '2026-10-06'
  ),
  'hko-wave-properties': source(
    "Hong Kong Observatory: Understanding Ocean Waves",
    "https://www.weather.gov.hk/en/education/aviation-and-marine/marine/00737-Understanding-Ocean-Waves-Properties-Formation-and-Classification.html",
    'official-authority', 'official-guidance',
    "Qualitative wave properties and the idealised amplitude/height distinction; not a measured next-wave amplitude, local safety threshold, significant-period binding or RavRadar forecast value.",
    '2026-10-06'
  ),
  'noaa-wave-propagation': source(
    "NOAA JetStream: Waves and swell propagation",
    "https://www.noaa.gov/jetstream/ocean/waves",
    'official-authority', 'official-guidance',
    "Grouped swell and deep-water length-dependent propagation, not a seventh-wave rule, amber particle transport speed, exact beach arrival, local height multiplier or rogue-wave probability.",
    '2026-10-06'
  ),
  'rr-current-product': Object.freeze({
    title:'RavRadar current public UI and deterministic forecast contracts',
    url:'docs/RavRadar-System-Specification.md', kind:'ravradar-product',
    evidenceClass:'verified-product-behaviour', checked:'2026-10-06',
    scope:'Public UI, ranking, score availability, calendar, optional account, generic trip-log/reporting help and read-only assistant callers; verified against normal UI, auth/report contracts and handbook. No private account access, email-delivery proof or live operational measurements.'
  }),
  'rr-systematic-review': source(
    'RavRadar systematic amber transport review',
    'docs/research/RAV_AMBER_TRANSPORT_SYSTEMATIC_REVIEW.md',
    'ravradar-research',
    'mixed',
    'RavRadar synthesis of direct amber research, coastal analogues, official data documentation and practical evidence.'
  ),
  'rr-user-spec': source(
    'RavRadar explanation and validation specification',
    'docs/research/RAV_AMBER_USER_EXPLANATION_AND_VALIDATION_SPEC.md',
    'ravradar-research',
    'mixed',
    'Defines the causal chain, uncertainty language and separation of physical opportunity, searchability and safety.'
  ),
  'rr-learning-design': source(
    'RavRadar user learning design',
    'docs/research/RAV_AMBER_USER_LEARNING_DESIGN.md',
    'ravradar-research',
    'mixed',
    'Public learning language derived from the larger evidence base.'
  ),
  'ross-age-2026': source(
    'A critical review of the age of Baltic amber from the Samland Peninsula',
    'https://doi.org/10.1017/S1755691025100960',
    'peer-reviewed',
    'direct-amber',
    'Late-Eocene age, source horizons, redeposition and the limits of dating a loose beach find.'
  ),
  'seyfullah-resin-2018': source(
    'Production and preservation of resins – past and present',
    'https://doi.org/10.1111/brv.12414',
    'peer-reviewed',
    'direct-amber',
    'Resin production, polymerisation, burial, maturation and the distinction between resin, copal and amber.'
  ),
  'wolfe-origin-2009': source(
    'A new proposal concerning the botanical origin of Baltic amber',
    'https://doi.org/10.1098/rspb.2009.0806',
    'peer-reviewed',
    'direct-amber',
    'FTIR-based botanical-origin hypothesis and its uncertainty.'
  ),
  'lofty-transport-2023': source(
    'Microplastic and natural sediment in bed load saltation: material does not dictate the fate',
    'https://doi.org/10.1016/j.watres.2023.120329',
    'peer-reviewed',
    'direct-amber-experiment',
    'Controlled transport measurements using 5 mm amber particles, including density, settling velocity and saltation.'
  ),
  'guler-surf-2022': source(
    'Transport and accumulation of sinking particles across a barred beach profile',
    'https://open.metu.edu.tr/bitstream/handle/11511/109330/1-s2.0-S0025326X22005847-main.pdf',
    'peer-reviewed',
    'coastal-analogy',
    'Controlled irregular-wave experiments with low-density sinking particles, live bed, bar, surf and berm.'
  ),
  'amber-spectroscopy-2025': source(
    'Spectroscopic Studies of Baltic Amber—Critical Analysis',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC12196071/',
    'peer-reviewed',
    'direct-amber',
    'Optical, FTIR, Raman and fluorescence variation in natural and heat-modified Baltic amber.'
  ),
  'amber-conservation-2021': source(
    'Conservation, preparation and imaging of diverse ambers and their inclusions',
    'https://www.sciencedirect.com/science/article/pii/S0012825221001549',
    'peer-reviewed',
    'direct-amber',
    'Preventive conservation, light and climate control, and documented damage from liquids and treatments.'
  ),
  'gia-amber': source(
    'GIA Amber Gem Overview',
    'https://www.gia.edu/amber',
    'official-gemology',
    'official-guidance',
    'Organic gem properties, hardness, specific gravity, colours, inclusions, treatments and imitations.'
  ),
  'gia-amorphous-materials': source(
    'GIA Gem Identification: Classifying and Naming Gems',
    'https://elearning-samples.gia.edu/Gem_Identification/Page3.html',
    'official-gemology',
    'official-guidance',
    'Amber is an organic amorphous material, lacking the regular repeating internal structure of a crystal.',
    '2026-10-05'
  ),
  'gia-amber-quality': source(
    'GIA: Amber Quality Factors',
    'https://www.gia.edu/amber-quality-factor',
    'official-gemology', 'official-guidance',
    'Amber cutting styles: freeform, beads, cabochons and uncommon faceting. No price quotation, home-treatment procedure or universal seawater-buoyancy rule.',
    '2026-10-05'
  ),
  'gia-gem-cut-terms': source(
    'GIA: Gem Cutting Styles – Definitions',
    'https://www.gia.edu/gia-news-research-value-factors-gem-cutting-styles-definitions',
    'official-gemology', 'official-guidance',
    'Simple and double non-faceted cabochon definitions only; unrelated gem machining and optical-effect instructions are not transferred to amber.',
    '2026-10-05'
  ),
  'gia-metric-carat': source(
    'GIA: Understanding Carat Weight',
    'https://4cs.gia.edu/en-us/blog/gia-diamond-grading-reports-understanding-carat-weight/',
    'official-gemology', 'official-guidance',
    'Metric gem mass: one carat is 200 milligrams. Diamond value, visual size and purity rules are not transferred to amber.',
    '2026-10-05'
  ),
  'gia-root-amber': source(
    'Identification of Natural, Reconstructed, and Imitation Root Amber',
    'https://www.gia.edu/gems-gemology/winter-2022-gemnews-identification-of-natural-reconstructed-and-imitation-root-amber0',
    'official-gemology',
    'direct-analysis',
    'Measured differences among natural, reconstructed and plastic imitation material.'
  ),
  'gia-composite': source(
    'Composite and filled amber case studies',
    'https://www.gia.edu/gems-gemology/wn13-gni-composite-amber',
    'official-gemology',
    'direct-analysis',
    'Documents composite amber and why appearance alone can be misleading.'
  ),
  'gia-fake-inclusion': source(
    'Amber with an insect-bearing filling',
    'https://my.gia.edu/gems-gemology/fa13-gni-amber-insect-bearing-filling',
    'official-gemology',
    'direct-analysis',
    'Documents an artificial inclusion/filling and the need for expert analysis.'
  ),
  'gia-heat-treatment': source(
    'Experimental Studies on the Heat Treatment of Baltic Amber',
    'https://www.gia.edu/gems-gemology/summer-2014-wang-heat-treatment-of-baltic-amber',
    'peer-reviewed-gemology',
    'direct-experiment',
    'Shows how heat and pressure can alter colour, clarity, bubbles and appearance.'
  ),
  'gia-amber-cleaning': source(
    'GIA: Amber Care and Cleaning Guide',
    'https://www.gia.edu/amber-care-cleaning',
    'official-gemology', 'official-guidance',
    'Amber-specific hardness, poor toughness, heat sensitivity and mild warm-water cleaning; not a restoration procedure.',
    '2026-10-05'
  ),
  'gia-ultrasonic-care': source(
    'GIA: Tips on Caring for Jewelry',
    'https://www.gia.edu/gia-news-research-tips-caring-jewelry',
    'official-gemology', 'official-guidance',
    'Explicitly excludes amber and other organic gems from ultrasonic cleaning; unrelated gem instructions are not transferred to amber.',
    '2026-10-05'
  ),
  'gia-amber-darkening': source(
    'GIA: My amber is darker than it used to be. Does that mean it is not real?',
    'https://my.gia.edu/FAQ/gia-faq-my-amber-darker',
    'official-gemology', 'official-guidance',
    'Polished amber can oxidise and darken; artificial heating can also darken it. Colour change alone is not an authenticity test.',
    '2026-10-05'
  ),
  'nhm-amber-dna': source(
    'Natural History Museum: Can we bring back dinosaurs?',
    'https://www.nhm.ac.uk/discover/could-scientists-bring-dinosaurs-back.html',
    'official-natural-history', 'expert-scientific-explanation',
    'Museum researcher explains why external preservation in amber does not establish preserved soft tissue, blood or usable dinosaur DNA.',
    '2026-10-05'
  ),
  'geus-fanoe': source(
    'GEUS: Fanø – geologi og rav',
    'https://www.geus.dk/media/8348/fanoe.pdf',
    'official-geology',
    'official-guidance',
    'Danish geology, Eocene amber and repeated transport/redeposition.'
  ),
  'kyst-rip': source(
    'Kystdirektoratet: Revlehuller',
    'https://kyst.dk/klimatilpasning/kystdynamik/revlehuller',
    'official-authority',
    'official-guidance',
    'Danish bar-gap currents, recognition and safety guidance.'
  ),
  'kyst-sediment': source(
    'Kystdirektoratet: Bølger og strøm flytter sand',
    'https://kyst.dk/klimatilpasning/kystdynamik/sedimenttransport/boelger-og-stroem-flytter-sand',
    'official-authority',
    'official-guidance',
    'Wave transformation, swash/backwash sorting and alongshore transport.'
  ),
  'kyst-methods-2024': source(
    'Kystdirektoratet: Vejledning om kystbeskyttelsesmetoder',
    'https://kyst.dk/media/yrtda5kp/vejledning_om_kystbeskyttelsesmetoder_11_06_2024_doede_links_rettet.pdf',
    'official-authority',
    'official-guidance',
    'Surf-zone currents, bars, rip channels and effects of coastal structures.'
  ),
  'noaa-waves': source(
    'NOAA Ocean Service: Waves and coastal currents',
    'https://oceanservice.noaa.gov/education/tutorial_currents/03coastal1.html',
    'official-authority',
    'official-guidance',
    'Wind speed, duration and fetch; shoaling and breaking waves.'
  ),
  'ndbc-wave-quantities': source(
    'NOAA NDBC: Significant height and dominant versus average wave period',
    'https://www.ndbc.noaa.gov/faq/wavecalc.shtml',
    'official-authority', 'official-data-documentation',
    'Definitions of spectral significant height and peak period, not a local RavRadar observation or a safe maximum wave.',
    '2026-10-05'
  ),
  'dmi-wave-height': source(
    'DMI: Bølger på havet',
    'https://www.dmi.dk/hav-og-is/temaforside-monsterbolger/bolger-pa-havet',
    'official-authority', 'official-guidance',
    'Significant height represents the highest third; individual waves can exceed it. Historical examples are not a local probability or maximum.',
    '2026-10-05'
  ),
  'nws-wave-systems': source(
    'NOAA National Weather Service: Marine definitions, swell and wind waves',
    'https://www.weather.gov/hfo/marinedef',
    'official-authority', 'official-guidance',
    'Swell leaves its generating area; wind waves are locally generated. Foreign warning thresholds are not Danish wading limits.',
    '2026-10-05'
  ),
  'noaa-tides-currents': source(
    'NOAA Ocean Service: What is the difference between a tide and a current?',
    'https://oceanservice.noaa.gov/facts/tidescurrents.html',
    'official-authority', 'official-guidance',
    'Distinct water-level and water-movement concepts; tidal, wind and density drivers, not a local safety or amber-path forecast.',
    '2026-10-05'
  ),
  'noaa-tidal-range': source(
    "NOAA Ocean Service: What are tides?",
    "https://oceanservice.noaa.gov/facts/tides.html",
    'official-authority', 'official-scientific-explanation',
    "Vertical high-to-low tidal range, not depth, current or a Danish local prediction.", '2026-10-06'
  ),
  'noaa-spring-neap': source(
    "NOAA Ocean Service: What are spring and neap tides?",
    "https://oceanservice.noaa.gov/facts/springtide.html",
    'official-authority', 'official-scientific-explanation',
    "Moon-phase tidal-range changes, not local times, weather, safety or amber yield.", '2026-10-06'
  ),
  'noaa-perigean-tide': source(
    "NOAA Ocean Service: What is a perigean spring tide?",
    "https://oceanservice.noaa.gov/facts/perigean-spring-tide.html",
    'official-authority', 'official-scientific-explanation',
    "Near-Earth new/full moon can increase range; effects are local and flooding is not automatic. No foreign numeric examples transferred.", '2026-10-06'
  ),
  'noaa-lunar-day': source(
    "NOAA Ocean Service: Frequency of Tides – The Lunar Day",
    "https://oceanservice.noaa.gov/education/tutorial_tides/tides05_lunarday.html",
    'official-authority', 'official-scientific-explanation',
    "Approximate lunar-day rhythm, not an exact local clock offset or forecast.", '2026-10-06'
  ),
  'noaa-tidal-cycles': source(
    "NOAA Ocean Service: Types and Causes of Tidal Cycles",
    "https://oceanservice.noaa.gov/education/tutorial_tides/tides07_cycles.html",
    'official-authority', 'official-scientific-explanation',
    "Diurnal, semidiurnal and mixed cycles. Foreign coast classifications are not assigned to Danish zones.", '2026-10-06'
  ),
  'noaa-local-tide-effects': source(
    "NOAA Ocean Service: What Else Affects Tides?",
    "https://oceanservice.noaa.gov/education/tutorial_tides/tides08_othereffects.html",
    'official-authority', 'official-scientific-explanation',
    "Bay shape, inlets, wind and pressure affect level. No universal pressure conversion, geometry change or guaranteed local retreat.", '2026-10-06'
  ),
  'noaa-flood-ebb': source(
    "NOAA Ocean Service: Tidal Currents 1",
    "https://oceanservice.noaa.gov/education/tutorial_currents/02tidal1.html",
    'official-authority', 'official-scientific-explanation',
    "Flood and ebb are horizontal tidal flow, distinct from vertical high/low level and measured current.", '2026-10-06'
  ),
  'noaa-surge-total': source(
    "NOAA Ocean Service: What is storm surge?",
    "https://oceanservice.noaa.gov/facts/stormsurge-stormtide.html",
    'official-authority', 'official-scientific-explanation',
    "Storm-related excess above astronomical tide versus total storm level. No hurricane thresholds or double addition to a combined forecast.", '2026-10-06'
  ),
  'noaa-seiche': source(
    "NOAA Ocean Service: What is a seiche?",
    "https://oceanservice.noaa.gov/facts/seiche.html",
    'official-authority', 'official-scientific-explanation',
    "Standing basin oscillation can outlast forcing. No measured Limfjord period, current event diagnosis or foreign event magnitude inferred.", '2026-10-06'
  ),
  'dmi-dkss-documentation': source(
    'DMI: Forecast data – storm surge model DKSS',
    'https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss',
    'official-authority', 'official-data-documentation',
    'Atmospheric forcing, three-dimensional layers, encoded surface duplication and layer-mean currents; not proof of a RavRadar live input.',
    '2026-10-05'
  ),
  'dmi-storm-model': source(
    'DMI: Stormflodsmodel',
    'https://www.dmi.dk/hav-og-is/temaforside-stormflod/stormflodsmodel',
    'official-authority', 'official-guidance',
    'Qualitative distinction between astronomical tide and weather-driven water level; historical numerical model counts and cadence are not used.',
    '2026-10-05'
  ),
  'nws-cold-water': source(
    'US National Weather Service: Cold Water Hazards and Safety',
    'https://www.weather.gov/safety/coldwater',
    'official-authority',
    'official-safety',
    'Cold shock, physical incapacitation, flotation and dressing for water temperature.'
  ),
  'natur-access': source(
    'Naturstyrelsen: Hvor må jeg færdes?',
    'https://naturstyrelsen.dk/om-naturstyrelsen/kontakt/faq/hvor-maa-jeg-faerdes-paa-naturstyrelsens-arealer',
    'official-authority',
    'official-current-rule',
    'General Danish beach-access guidance; rules can change and local restrictions still apply.'
  ),
  'natur-collection': source(
    'Naturstyrelsen: Hvad må jeg samle til privat brug?',
    'https://naturstyrelsen.dk/regler-og-tilladelser/hvad-maa-jeg-samle-til-privat-brug-i-naturen',
    'official-authority',
    'official-current-rule',
    'Collection guidance for state-owned natural areas; scope and rules must not be generalised to every site.'
  ),
  'natur-cold-water': source(
    'Naturstyrelsen: Efterår – rav og koldt saltvand',
    'https://naturstyrelsen.dk/aktiviteter-i-naturen/aaret-rundt/efteraar',
    'official-authority',
    'official-practical-guidance',
    'Danish practical explanation that colder salt water increases buoyancy and can make amber easier to mobilise.'
  ),
  'natmus-danefae': source(
    'Nationalmuseet: Hvad kan være danefæ?',
    'https://natmus.dk/salg-og-ydelser/museumsfaglige-ydelser/danefae/hvad-kan-vaere-danefae/',
    'official-authority',
    'official-current-rule',
    'Unusual or archaeological amber objects can be danefæ; current museum guidance controls.'
  ),
  'forsvaret-phosphorus': source(
    'Forsvaret: Pas på fosfor i naturen',
    'https://www.forsvaret.dk/da/nyheder/2007/pas-pa-fosfor-i-naturen/',
    'official-authority',
    'official-safety',
    'White phosphorus can resemble amber, self-ignite after drying and must be left in place and reported.'
  ),
  'rav-jagt-video': source(
    'Rav Jagt: practical explanation of cold water and amber',
    'https://youtu.be/TiR96bdTRr0?is=W-cXDa-m4sUaZzXF',
    'named-practitioner',
    'practical-experience',
    'Owner-supplied practical expert source; kept distinct from peer-reviewed and official evidence.'
  )
});

function source(title, url, kind, evidenceClass, scope, checked='2026-08-29') {
  return Object.freeze({ title, url, kind, evidenceClass, scope, checked });
}

export function ravAssistantSource(id) {
  return RAV_ASSISTANT_SOURCES[id] || null;
}

export function validateRavAssistantSourceIds(ids = []) {
  return Array.isArray(ids) && ids.length > 0 && ids.every(id => Boolean(RAV_ASSISTANT_SOURCES[id]));
}
