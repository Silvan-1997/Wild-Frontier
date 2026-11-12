# Build 1.8.34: Treppenübergänge über die gesamte Breite

Basis: Build 1.8.33, `c58fcd6a9018e5be109dfa7139704a7784c409aa`.

## Ursache

Der gemeinsame Anschluss zweier Treppenelemente wurde für die Körperkollision als **Punkt in der Mitte** behandelt. Die Freigabe galt nur, wenn die Spielermitte höchstens einen Körperradius (0,38 m) von diesem Punkt entfernt war. Die tatsächliche Anschlusskante ist jedoch 2,50 m breit. Außerhalb der Mitte blockierte deshalb die Stirnseite der nächsten Treppe bereits vor dem Rampenwechsel. Die Körperauflösung konnte die Figur zurückschieben oder seitlich verdrängen.

Die bisherigen Kettentests liefen auf der Mittellinie. Die Randtests aus 1.8.33 betrafen einzelne Treppen, nicht den Übergang zwischen zwei Elementen. Die neue Breitenmatrix reproduziert den Bericht: Von 224 Laufwegfällen bestehen im Ausgangsstand nur die 32 Fälle auf der Mittellinie; alle 192 seitlich versetzten Fälle scheitern.

Zusätzlich prüfte der Wechsel der Stützfläche den vorherigen Kontakt ohne Fußradius, obwohl das reguläre Laufen teilweisen Fußüberhang unterstützt. Das konnte am Rand einen gültigen Kontakt beim Elementwechsel verlieren.

## Korrektur

- `footTouchesEndEdge()` bestimmt den Abstand des Fußzylinders zur **endlichen Stirnkante** in lokalen Treppenkoordinaten. Die Kantenbreite stammt aus `stairDimensions()`.
- Für die Übergangsfreigabe muss der Fuß beide zusammengehörigen Endkanten berühren und auf der gültigen Rampenhöhe stehen. Ein gemeinsamer Endpunkt einschließlich passender Höhe bleibt Voraussetzung.
- Die vorherige Stützfläche wird beim Übergang über dieselbe `walkingHeight()`-Prüfung wie beim normalen Laufen ermittelt, einschließlich Fußradius.
- Körperradius, Höhenvergleich, Rampenneigung, Stufenmaße, Einrasten und Gebäudeursprünge bleiben unverändert. Es wird kein Höhenfangfenster vergrößert und kein Bauteil verschoben.
- Build-Anzeige: 1.8.34. Speicherformat und bestehende Spielstände bleiben unverändert.

## Regressionstests

```sh
node test.mjs
node tests/stairs.test.mjs
node tests/stairs-volume.test.mjs
node tests/flat-stair-edge.test.mjs
node tests/stair-joint-width.test.mjs
node tests/stairs.browser.cjs
```

Die neue Datei `tests/stair-joint-width.test.mjs` enthält 288 Fälle:

- 224 Laufwegfälle: flach/flach, steil/steil und beide gemischten Kombinationen; 0°/90°/180°/270°; seitliche Abstände −1,50 / −1,24 / −0,75 / 0 / +0,75 / +1,24 / +1,50 m; Aufstieg und Abstieg.
- Jeder dieser Fälle läuft bei 15/30/60/144 fps mit 6 und 9 m/s. Geprüft werden exakter horizontaler Fortschritt, kein seitliches Herausschieben, korrekte Höhe, erhaltener Bodenkontakt und ausbleibende Sprünge.
- Dieselben Wege werden nach einem JSON-Speicher-/Ladezyklus mit umgekehrter Gebäudereihenfolge erneut geprüft. Die äußeren Laufwege prüfen auch den gültigen teilweisen Fußüberhang.
- 32 diagonale Überquerungen der Verbindungsstelle.
- 16 Schutzfälle gegen seitliches Eindringen und Springen von unten, jeweils auch neben der Mitte.
- 16 Fälle mit abweichenden Anschluss-Elevationen: Eine geometrisch nicht passende Verbindung darf keine Freigabe erhalten.

Der Playwright-Test ergänzt 224 Überquerungen mit echten Three.js-Treppenmeshes, erneut geladenen Gebäuden und allen sieben seitlichen Positionen. Position und Höhe werden bei jedem Schritt über den Übergang geprüft.

## Ergebnisse

Ausgeführt am 12.11.2026:

| Prüfung | Ergebnis |
| --- | --- |
| Neue Übergangstests gegen unveränderten Build 1.8.33 | 72 bestanden, 216 fehlgeschlagen |
| Neue Übergangstests nach Korrektur | 288/288 bestanden |
| Bisherige Treppenregressionen | 324/324 bestanden |
| Terrain-Tests | bestanden |
| Playwright/Chromium mit echten Meshes | 14.356 Aussagen bestanden; keine JavaScript-Seitenfehler |
| Syntax aller Inline-Skripte, Quellmodule und Testdateien | bestanden |
| `git diff --check` | bestanden |

Baseline ohne Wechsel des Checkouts:

```sh
git show c58fcd6:index.html > /tmp/joint-before.html
git show c58fcd6:src/stairs.js > /tmp/joint-before.mjs
STAIR_GAME_HTML=/tmp/joint-before.html STAIR_PHYSICS_MODULE=/tmp/joint-before.mjs node tests/stair-joint-width.test.mjs
```

Für den Browser gelten weiterhin `CHROMIUM_PATH` und optional `THREE_MODULE_PATH` für Three.js 0.160.0. Authentifizierung wird simuliert; keine Cloud-Schreibzugriffe. Kein manueller Test auf einem physischen Smartphone. Alle automatisierten Fälle wurden ausgeführt, keiner wurde übersprungen.
