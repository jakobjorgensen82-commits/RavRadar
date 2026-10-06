// The surface dataset describes geology below cultivated topsoil. Its
// accessibility labels are not verified exposure or plough-reach evidence.
export const SURFACE_HUNTABILITY = 'unknown';
export const ACCESS_COLOURS = Object.freeze({unknown:'#778c99',deep:'#6c3b91'});

// Selected public Jupiter observations already checked in the research branch.
// These are point observations, not amber finds, formation extents or buffers.
// Do not apply the surface-map code legend to Jupiter borehole codes.
export const DEEP_LAYER_EXAMPLES = [
  {
    id:'asted-deep-sand', name:'Åsted Vest', dgu:'10.934',
    longitude:10.374907, latitude:57.432965,
    drilledOn:'2005-07-01', observedAt:'2026-10-04T16:51:37Z',
    intervals:[{top_m:82,bottom_m:89,code:'qs'}],
    source:'https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=10.934'
  },
  {
    id:'aalbaek-deep-sand', name:'Ålbæk Lyngshede', dgu:'6.30',
    longitude:10.357506, latitude:57.566727,
    drilledOn:'1945-06-16', observedAt:'2026-10-04T16:51:37Z',
    intervals:[{top_m:80,bottom_m:90.5,code:'qs'},{top_m:107,bottom_m:112,code:'qs'}],
    source:'https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=6.30'
  }
];
