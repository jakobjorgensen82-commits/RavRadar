// Public source registry for deterministic RavRadar knowledge.
// Keep this list free of private data, coordinates and model-internal diagnostics.
export const RAV_ASSISTANT_SOURCES = Object.freeze({
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

function source(title, url, kind, evidenceClass, scope) {
  return Object.freeze({ title, url, kind, evidenceClass, scope, checked:'2026-08-29' });
}

export function ravAssistantSource(id) {
  return RAV_ASSISTANT_SOURCES[id] || null;
}

export function validateRavAssistantSourceIds(ids = []) {
  return Array.isArray(ids) && ids.length > 0 && ids.every(id => Boolean(RAV_ASSISTANT_SOURCES[id]));
}
