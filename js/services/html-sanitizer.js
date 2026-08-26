const ALLOWED_TAGS=new Set([
  'A','B','BLOCKQUOTE','BR','CODE','DETAILS','DIV','EM','H1','H2','H3','H4','H5','H6','HR','I','LI','OL','P','PRE','SPAN','STRONG','SUMMARY','TABLE','TBODY','TD','TH','THEAD','TR','UL'
]);
const DROP_WITH_CONTENT=new Set(['EMBED','IFRAME','OBJECT','SCRIPT','STYLE','TEMPLATE']);
const GLOBAL_ATTRIBUTES=new Set(['aria-label','class','role']);

function safeHref(value){
  const href=String(value||'').trim();
  if(!href)return null;
  if(href.startsWith('#')||href.startsWith('./')||href.startsWith('../'))return href;
  if(href.startsWith('/')&&!href.startsWith('//')&&!href.startsWith('/\\'))return href;
  try{
    const url=new URL(href,location.origin);
    return ['http:','https:','mailto:'].includes(url.protocol)?href:null;
  }catch{return null;}
}

function cleanElement(element){
  const tag=String(element.localName||element.tagName||'').toUpperCase();
  if(DROP_WITH_CONTENT.has(tag)){
    element.remove();
    return;
  }
  if(!ALLOWED_TAGS.has(tag)){
    element.replaceWith(...element.childNodes);
    return;
  }
  for(const attribute of [...element.attributes]){
    const name=attribute.name.toLowerCase();
    const allowed=GLOBAL_ATTRIBUTES.has(name)||(tag==='A'&&['href','rel','target'].includes(name));
    if(!allowed)element.removeAttribute(attribute.name);
  }
  if(tag==='A'){
    const href=safeHref(element.getAttribute('href'));
    if(href)element.setAttribute('href',href);else element.removeAttribute('href');
    if(element.getAttribute('target')==='_blank')element.setAttribute('rel','noopener noreferrer');
    else element.removeAttribute('target');
  }
}

export function sanitizeTrustedHtml(value){
  const parsed=new DOMParser().parseFromString(`<body>${String(value??'')}</body>`,'text/html');
  const body=parsed.body;
  for(const element of [...body.querySelectorAll('*')].reverse())cleanElement(element);
  return body.innerHTML;
}
