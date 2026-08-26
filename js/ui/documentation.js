const output=document.querySelector('#docContent');
const title=document.querySelector('#docTitle');

document.querySelectorAll('.doc-source').forEach(button=>button.addEventListener('click',async()=>{
  const source=button.dataset.source;
  title.textContent=button.querySelector('h2').textContent;
  output.textContent='Henter…';
  try{
    const response=await fetch(source,{cache:'no-store'});
    if(!response.ok)throw new Error(String(response.status));
    output.textContent=await response.text();
  }catch(error){
    output.textContent=`Dokumentet kunne ikke hentes: ${error.message}`;
  }
}));
