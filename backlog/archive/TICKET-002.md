# TICKET-002: Map question — pin answer on an interactive map

**Status:** Done
**Created:** 2026-05-18
**Completed:** 2026-05-18
**Priority:** Medium

## Description
Replaced the lat/lng text inputs for MAP questions with an interactive Leaflet map. The creator clicks to drop a pin; the coordinates are derived automatically from the pin position.

## Acceptance Criteria
- [x] MAP question form shows an interactive map instead of lat/lng text inputs
- [x] Clicking the map drops a pin at that location
- [x] Dragging the pin updates the position
- [x] Lat/lng are read from the pin and sent to the API (payload shape unchanged)
- [x] Radius (km) field remains as a number input alongside the map
- [x] If an existing MAP question is opened for editing, the pin is pre-placed at the saved coordinates

## Notes
- Used `leaflet` + `react-leaflet` (already in package.json)
- Leaflet CSS imported in `main.tsx`
- Vite icon bundling fix applied in `QuizEditor.tsx` (points default icons at unpkg)
- `ClickHandler` is an inner component using `useMapEvents` (must be a child of `MapContainer`)
- Marker is draggable; `dragend` event updates lat/lng via `getLatLng()`
- `MapContainer` key forces remount when switching to a question with different saved coordinates

## Files modified
- `client/src/main.tsx` — added `import 'leaflet/dist/leaflet.css'`
- `client/src/pages/QuizEditor.tsx` — added `MapPicker` + `ClickHandler` components, replaced lat/lng grid
