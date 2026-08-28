performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.298";
import { initialiseI18n } from "./js/i18n.js?v=4.0.298";
import { createPublicPageReturnWatchdog } from "./js/core/public-page-resume.js?v=4.0.298";

let appImported = false;
const handleEarlyPageShow=createPublicPageReturnWatchdog({
  isAppImported:()=>appImported,
  // På en smal mobilskærm er en ren genindlæsning sikrere end at stole på,
  // at Safari/Chrome genstarter alle suspenderede kort- og forecastopgaver.
  // Den kompakte startpakke gør samtidig denne fail-safe billig.
  shouldReloadImmediately:()=>globalThis.matchMedia?.('(max-width: 900px)').matches===true,
  markPending:()=>{document.documentElement.dataset.ravradarResume='pending';},
  isResumeHealthy:()=>document.documentElement.dataset.ravradarResume==='ready',
  reload:()=>location.reload()
});
addEventListener('pageshow',event=>{handleEarlyPageShow(event);});

initialiseI18n();
await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.298");
appImported = true;
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.298")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
