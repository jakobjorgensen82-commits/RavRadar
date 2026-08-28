import './learn-i18n-de.js?v=4.0.299';
import './learn-i18n-en.js?v=4.0.299';
import { initialiseI18n, registerI18nMessages } from '../i18n.js?v=4.0.299';

registerI18nMessages({ da:{
  'static.back':'Tilbage til RavRadar', 'learn.meta.title':'Lær ravjagt – RavRadar',
  'learn.meta.description':'RavRadars grundbog i ravjagt: ravets oprindelse, mobilisering, strøm, vind, bølger, kystformer, felttegn, strandjagt og wadersjagt.',
  'learn.header':'Grundbog i ravjagt', 'learn.illustration.aria':'Bølger løsner materiale, strøm fører det langs bunden, og kysten samler noget af det i et opskyl',
  'learn.svg.waves1':'Bølger kan løsne', 'learn.svg.waves2':'rav og let materiale', 'learn.svg.current':'Strømmen transporterer',
  'learn.svg.coast1':'Kysten kan', 'learn.svg.coast2':'samle materialet', 'learn.nav.aria':'Emner i grundbogen',
  'learn.footer':'Grundbogen samler RavRadars aktuelle faglige viden. Den skelner mellem dokumenteret viden, fysiske analogier og regler, som fortsat skal læres af ture.',
} });

initialiseI18n();
