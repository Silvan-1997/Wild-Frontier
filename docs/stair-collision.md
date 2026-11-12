# Treppenkollision: Analyse und Regressionstests

Ausgangsstand: Build 1.8.29, Commit `648ba0d40b10d2620beda6c63ca8cd3ef3c00fa6`.

## Ursachen und Änderungen

- Three.js dreht lokale X/Z-Koordinaten mit `worldX = localX*cos(r) + localZ*sin(r)` und `worldZ = -localX*sin(r) + localZ*cos(r)`. Die bisherige Kollisionsprüfung wandte dieselbe Drehung nochmals an. Die inverse Transformation muss `localX = dx*cos(r) - dz*sin(r)` und `localZ = dx*sin(r) + dz*cos(r)` verwenden. `src/stairs.js` stellt diese gemeinsame Umrechnung auch für Fundament-, Wand- und Türprüfungen bereit.
- Die bisherige Rampe hatte einen Höhenaufschlag von 8 cm sowie 22 cm lange Fortsetzungen über beide Anschlüsse hinaus. Zwei eingerastete steile Treppen haben aber exakt 2,10 m Länge und 1,44 m Höhenunterschied. Die Kollisionsrampe verbindet jetzt genau die gespeicherten Anschlusspositionen: `upperY - drop * localZ / length`. Das Fundament verwendet seine tatsächliche 3×3-m-Grundfläche, sodass keine künstliche Rampenverlängerung zum Überbrücken des bisherigen 3-cm-Rands nötig ist.
- `movePlayer()` änderte die Spielerhöhe, während die vorher erzeugte Kollisionsposition noch die alte Höhe enthielt. Jetzt wird zuerst die Zielhöhe berechnet, dann dieselbe Position geprüft und die Unterstützung nach seitlicher Korrektur erneut ermittelt. Rampenkontakt erfordert Kontakt zur vorherigen Rampenhöhe und einen Eintritt durch ein Treppenende. Die frühere Höhenaufnahme durch eine seitlich versetzte Rampe entfällt.
- Die Fundamentöffnung gilt nur für eine räumlich und vertikal angeschlossene, nach außen gerichtete Treppe mit tatsächlichem Rampenkontakt. Die pauschalen Höhenfenster von 65/75 cm entfallen. Die vertikale Physik akzeptiert Landungen von oben oder bestehenden Bodenkontakt statt der früheren 70/85-cm-Fangzone.
- Version 4 speichert die Spielerposition nur als X/Z. Nach dem Aufbau aller gespeicherten Gebäude wird deshalb zunächst die passende Bodenhöhe rekonstruiert und erst danach die Seitenkollision geprüft. Das verhindert das Zurücksetzen auf Geländehöhe und Herausdrücken am Fundament.

Das Speicherformat bleibt Version 4. Gebäude-IDs, Gruppen, Positionen, Drehungen und Elevationen werden nicht migriert oder umgeschrieben. Einrastpositionen, Treppenmaße, sichtbare Meshes und manuelle Drehsteuerung bleiben erhalten.

## Reproduzieren

Ohne zusätzliche Pakete (Node.js):

```sh
node tests/stairs.test.mjs
node test.mjs
```

Die 16 Node-Tests prüfen pro Rotation 0°, 90°, 180° und 270°:

1. Flache Treppe: Rampenachse, Seitenabgrenzung, vollständiger Auf-/Abstieg.
2. Steile Treppe: dieselben Prüfungen.
3. Unveränderte Einrastfunktion: obere Fundamentkante, unteres Treppenende, Gruppen, Drehung und Anschluss-Elevation einer zweiten steilen Treppe.
4. Zwei steile Treppen: durchgehender Auf-/Abstieg zum erhöhten Fundament, einschließlich Schwerkraft/Bodenkontakt; 45-cm-Bewegung pro Aufruf (Sprint bei 50-ms-Frame) und 1-cm-Schritte nach einem JSON-Speicher-/Ladezyklus; Wiederherstellung auf der oberen Treppe; Fundament bleibt außerhalb des Zugangs massiv.

Der Test lädt die tatsächlichen Funktionen aus `index.html` in einen isolierten VM-Kontext. Rendering, UI und Gelände sind dort kontrollierte Test-Doubles; Bewegungs-, Platzierungs-, Lade- und vertikale Physiklogik stammen aus dem Spiel.

Optionaler Browser-Test mit installiertem Playwright und Chromium:

```sh
node tests/stairs.browser.cjs
```

`CHROMIUM_PATH` kann einen vorhandenen Chromium-Pfad angeben. `THREE_MODULE_PATH` kann eine lokale Kopie der im Spiel verwendeten `three@0.160.0/build/three.module.js` angeben; andernfalls lädt der Browser diese Version vom Spiel-CDN. Der Test startet die HTML-Seite mit echten Meshes/WebGL und prüft 36 Aussagen zu den vier Drehungen, Three.js-Weltmatrizen, zwei verbundenen steilen Treppen, Fundamentübergang und Wiederladen. Authentifizierung wird lokal simuliert; es erfolgen keine Cloud-Schreibzugriffe. Die Animationsschleife ist angehalten, damit direkte Bewegungsprüfungen reproduzierbar sind; Schwerkraft wird im Node-Test geprüft. Dies ersetzt keinen manuellen Smartphone-Test.

## Ausgeführte Ergebnisse (2026-11-12)

| Prüfung | Build 1.8.29 | Korrektur |
| --- | --- | --- |
| Node-Regressionsfälle | 4 bestanden, 12 fehlgeschlagen | 16 bestanden |
| Einrasten in allen vier Drehungen | 4 bestanden | 4 bestanden (in obigen 16 enthalten) |
| Browser, echte Three.js-Meshes | nicht ausgeführt | 36 Aussagen bestanden; keine JavaScript-Seitenfehler |
| Vorhandene Terrain-Tests | unverändert | bestanden |
| Syntax: drei Inline-Skripte, neues Modul und Tests | — | bestanden |

Den Ausgangsstand kann man ohne Änderung des Checkouts vergleichen:

```sh
git show 648ba0d:index.html > /tmp/stairs-before.html
STAIR_GAME_HTML=/tmp/stairs-before.html node tests/stairs.test.mjs
```
