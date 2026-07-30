const LOCAL_KEY = "ravradar-public-config-v1";
function localConfig(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||"null")||{}}catch{return{}}}
const fallback={supabaseUrl:"",supabasePublishableKey:""};
export const PUBLIC_CONFIG=Object.freeze({...fallback,...localConfig()});
export function saveLocalPublicConfig(config){localStorage.setItem(LOCAL_KEY,JSON.stringify({supabaseUrl:String(config.supabaseUrl||'').replace(/\/$/,''),supabasePublishableKey:String(config.supabasePublishableKey||'').trim()}));}
export function clearLocalPublicConfig(){localStorage.removeItem(LOCAL_KEY);}
