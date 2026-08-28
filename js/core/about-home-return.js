function canonicalHomePath(pathname) {
  return String(pathname || '').replace(/\/index\.html$/i, '/').replace(/\/+$/, '/');
}

export function cameFromPublicHome({referrer,homeHref,currentHref}) {
  if (!referrer) return false;
  try {
    const home=new URL(homeHref,currentHref);
    const source=new URL(referrer,currentHref);
    return source.origin===home.origin&&canonicalHomePath(source.pathname)===canonicalHomePath(home.pathname);
  } catch {
    return false;
  }
}

export function installAboutHomeReturn({link,historyObject,locationObject,documentObject}) {
  if (!link) return ()=>{};
  const handleClick=event=>{
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(!cameFromPublicHome({
      referrer:documentObject?.referrer,
      homeHref:link.href,
      currentHref:locationObject?.href,
    }))return;
    event.preventDefault();
    historyObject.back();
  };
  link.addEventListener('click',handleClick);
  return ()=>link.removeEventListener('click',handleClick);
}
