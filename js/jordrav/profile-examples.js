export const PROFILE_BINDING=Object.freeze({
  url:new URL('../../data/jordrav/context-20261006/profiles.json',import.meta.url),
  sha256:'bdfee755c5be9f0e80e0b4ecb2614ead6fd91980a5882250d01efdf563afe4a6',bytes:19372,version:'2026-10-06'
});
let cached;
export async function loadProfileExamples(){
  if(!cached)cached=(async()=>{
    const response=await fetch(PROFILE_BINDING.url,{credentials:'omit'});if(!response.ok)throw Error('Profiles unavailable');
    const bytes=await response.arrayBuffer();if(bytes.byteLength!==PROFILE_BINDING.bytes)throw Error('Profile byte binding');
    const digest=await crypto.subtle.digest('SHA-256',bytes),sha=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(sha!==PROFILE_BINDING.sha256)throw Error('Profile hash binding');
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(data.version!==PROFILE_BINDING.version||data.profiles.length!==16)throw Error('Profile version/count binding');
    return data.profiles;
  })().catch(error=>{cached=null;throw error;});
  return cached;
}
export function initialiseProfileExamples(map,checkbox,status,tr,leaflet,onSelect){
  const group=leaflet.layerGroup();let generation=0;
  async function sync(){
    const run=++generation;group.remove();status.hidden=!checkbox.checked;if(!checkbox.checked)return;
    status.classList.remove('jordrav-error');status.textContent=tr('profilesLoading');
    try{
      const profiles=await loadProfileExamples();if(run!==generation)return;group.clearLayers();
      for(const profile of profiles){const title=`${profile.region} · DGU ${profile.dgu} · ${tr('profilePoint')}`;
        const marker=leaflet.marker([profile.latitude,profile.longitude],{title,alt:title,keyboard:true,
          icon:leaflet.divIcon({className:'jordrav-profile-marker',html:'<span aria-hidden="true">≡</span>',iconSize:[24,24],iconAnchor:[12,12]})});
        marker.on('click',()=>onSelect(profile));group.addLayer(marker);}
      group.addTo(map);status.textContent=tr('profilesReady');
    }catch{if(run!==generation)return;status.textContent=tr('profilesFailed');status.classList.add('jordrav-error');}
  }
  checkbox.addEventListener('change',()=>{void sync();});void sync();return group;
}
