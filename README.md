# WILD FRONTIER 1.6.0 — modularer Unterbau

## Was sich geändert hat
- `src/terrain.js`: Geländehöhe, Flussverlauf und Ressourcenpositionierung als unabhängige, deterministische Funktionen.
- `src/graphics.js`: Grafikprofile und Renderer-Konfiguration von der Spielsimulation getrennt.
- Die Schattenkartenauflösung wird beim Wechsel des Grafikprofils tatsächlich angepasst.
- Bestehende Spielmechaniken, Welt-Seed und Speicherschlüssel `wild_frontier_save_v04` bleiben erhalten.
- Version 1.6.0 in der Startanzeige.

## Starten
**Wichtig:** Nicht per Doppelklick als `file://` öffnen. ES-Module müssen über einen lokalen HTTP-Server oder Cloudflare Pages geladen werden.

Im Projektordner auf Windows mit installiertem Python:
`python -m http.server 8000`
Dann `http://localhost:8000` im Browser öffnen.

## Tests
`node --check src/terrain.js`
`node --check src/graphics.js`
`node --check` für das extrahierte Hauptmodul.
Zusätzlich: deterministische Terrain-Funktionen getestet. Browser-/Android-End-to-End-Test noch offen.

## Grenzen dieser Version
Das grosse Hauptmodul enthält weiterhin Inventar, Bau-, Ressourcen-, Steuerungs- und Spielschleifenlogik. Diese werden in späteren Versionen schrittweise getrennt, damit wir bestehende Spielstände nicht gefährden.
Keine GitHub-/Cloudflare-Veröffentlichung erfolgt.
