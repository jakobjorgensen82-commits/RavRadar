// Public display copy deliberately outside the sealed scientific model closure.
import { registerI18nMessages } from '../i18n.js?v=4.0.592';
registerI18nMessages({
  da: {
    'map.timeline.title': 'Kortets tidspunkt', 'map.timeline.now': 'Nu',
    'map.timeline.previous': 'En time tilbage', 'map.timeline.next': 'En time frem',
    'map.timeline.shown': 'Kortet viser: {time}', 'map.timeline.requested': 'Valgt: {time}',
    'map.timeline.loading': 'Indlæser valgt tidspunkt. Kortet viser stadig tidspunktet ovenfor.',
    'map.timeline.error': 'Tidspunktet kunne ikke hentes. Den senest indlæste kortvisning er bevaret. Prøv igen eller vælg Nu.',
    'map.timeline.unavailable': 'Kortets tidsvalg er ikke tilgængeligt lige nu.',
    'map.timeline.scope': 'Tidsvalget gælder kortet og den åbne zone. Aktuelt-listen viser fortsat forholdene nu.',
    'map.timeline.zoneScope': 'Du ser én valgt prognosetime. Vælg Nu ved kortet for at se hele zoneprognosen igen.',
    'map.timeline.clock': '{date} · kl. {time}',
  },
  de: {
    'map.timeline.title': 'Kartenzeit', 'map.timeline.now': 'Jetzt',
    'map.timeline.previous': 'Eine Stunde zurück', 'map.timeline.next': 'Eine Stunde vor',
    'map.timeline.shown': 'Die Karte zeigt: {time}', 'map.timeline.requested': 'Ausgewählt: {time}',
    'map.timeline.loading': 'Die gewählte Zeit wird geladen. Die Karte zeigt weiterhin die oben angegebene Zeit.',
    'map.timeline.error': 'Die Zeit konnte nicht geladen werden. Die zuletzt geladene Kartenansicht bleibt erhalten. Erneut versuchen oder Jetzt wählen.',
    'map.timeline.unavailable': 'Die Zeitauswahl ist momentan nicht verfügbar.',
    'map.timeline.scope': 'Die Zeitauswahl gilt für Karte und geöffnetes Gebiet. Die aktuelle Rangliste zeigt weiterhin die jetzigen Bedingungen.',
    'map.timeline.zoneScope': 'Dies ist eine einzelne gewählte Prognosestunde. Wählen Sie Jetzt an der Karte, um wieder die gesamte Gebietsprognose zu sehen.',
    'map.timeline.clock': '{date} · {time} Uhr',
  },
  en: {
    'map.timeline.title': 'Map time', 'map.timeline.now': 'Now',
    'map.timeline.previous': 'One hour back', 'map.timeline.next': 'One hour forward',
    'map.timeline.shown': 'Map showing: {time}', 'map.timeline.requested': 'Selected: {time}',
    'map.timeline.loading': 'Loading the selected time. The map still shows the time above.',
    'map.timeline.error': 'The selected time could not be loaded. The last loaded map is preserved. Try again or choose Now.',
    'map.timeline.unavailable': 'Map time selection is currently unavailable.',
    'map.timeline.scope': 'Time selection applies to the map and open area. The current ranking still shows conditions now.',
    'map.timeline.zoneScope': 'This is one selected forecast hour. Choose Now by the map to see the full area forecast again.',
    'map.timeline.clock': '{date} · {time}',
  },
});
