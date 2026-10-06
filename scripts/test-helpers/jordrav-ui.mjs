// Open native disclosure ancestors through real UI actions. No forced clicks
// or product DOM mutation: regression tests follow the same path as a visitor.
export async function jordravControl(page, selector) {
  const control=page.locator(selector);
  const ancestors=await control.evaluate(element=>{
    const closed=[];
    // The summary being tested must keep its own disclosure state: clicking it
    // is the action under test, whereas its outer ancestors must be accessible.
    for(let parent=element.tagName==='SUMMARY'?element.parentElement.parentElement:element.parentElement;parent;parent=parent.parentElement){
      if(parent.tagName==='DETAILS'&&!parent.open){
        closed.push(parent.id?`#${parent.id}`:`.${[...parent.classList].join('.')}`);
      }
    }
    return closed.reverse();
  });
  for(const ancestor of ancestors)await page.locator(`${ancestor}>summary`).click();
  return control;
}

export async function openJordravDetails(page, selector) {
  const details=await jordravControl(page,selector);
  if(await details.getAttribute('open')===null)await details.locator(':scope>summary').click();
  return details;
}

export async function closeJordravOptions(page) {
  if(await page.locator('#jordravMapOptions').getAttribute('open')!==null)await page.keyboard.press('Escape');
}
