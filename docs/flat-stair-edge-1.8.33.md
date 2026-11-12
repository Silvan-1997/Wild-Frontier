# Build 1.8.33: flache Treppe am Rand

Basis: Build 1.8.32, `bac20ff6c001c6ee97ade9ef18454575e46b732e`.

## Reproduzierbare Ursache

Die sichtbare Stufe und der Treppenkörper hatten 1,25 m halbe Breite, die Lauffläche und die Prüfung des vorherigen Rampenkontakts jedoch nur 1,20 m. Wer etwa 1,21–1,24 m neben der Mittellinie lief, verlor deshalb trotz einer Position auf der sichtbaren Stufe seinen Rampenkontakt. Der Treppenkörper behandelte die Figur dann als seitlich eingedrungen und schob sie nach außen. Nahe dem oberen Ende war die nächste Austrittsfläche die Stirnseite: Die Korrektur konnte die Figur zusätzlich nach vorne versetzen.

Auch bei einer Landung mit teilweise überhängendem Fuß waren zwei verschiedene Höhen aktiv: Die vertikale Physik setzte die Figur auf den höchsten Punkt unter ihrem Zylinder, während das Weiterlaufen die mittige Rampenebene voraussetzte. Der erste Schritt nach der Landung konnte deshalb erneut den Stützkontakt verlieren. Dasselbe konservative Höhenmaximum konnte einen noch oberhalb der eigentlichen Rampe fallenden Spieler seitlich verdrängen.

## Korrektur

- Eine gemeinsame, kreisförmige Fußabdruckprüfung verwendet die tatsächliche Stufenbreite und den bestehenden Körperradius. Es gibt keinen ungestützten Streifen innerhalb der sichtbaren Stufen mehr.
- Solange der Fußzylinder die Fläche überlappt, kann bestehender Rampenkontakt erhalten bleiben. Von außerhalb des Körperkontakts wird die Figur nicht seitlich auf die Rampe gezogen.
- Landen und Laufen verwenden dieselbe Rampenebene, auch beim teilweisen Überhang an einer Kante.
- Die seitliche Körperprüfung verdrängt eine Figur nicht mehr, wenn ihre Füße bereits oberhalb dieser gemeinsamen Ebene liegen. Unterseite und Seiten unterhalb der Oberseite bleiben solide.
- Keine Änderung an Gebäudeursprüngen, Drehungen, Anschlusspositionen oder Speicherformat. Keine größeren Höhenfangfenster. Build-Anzeige auf 1.8.33 erhöht.

## Tests und Ergebnisse

```sh
node test.mjs
node tests/stairs.test.mjs
node tests/stairs-volume.test.mjs
node tests/flat-stair-edge.test.mjs
node tests/stairs.browser.cjs
```

Die neue Suite prüft bei allen vier Drehungen:

- Auf-/Abstieg mit seitlichen Abständen −1,24 / −1,21 / 0 / 1,21 / 1,24 m.
- Jeden horizontalen Schritt auf exakt die angeforderte Strecke: keine zusätzliche Vorwärts- oder Seitwärtskorrektur.
- Den Übergang am oberen Rand auf ein erhöhtes Fundament.
- Landen mit teilweisem Fußüberhang und anschließendes Hinunterlaufen.
- Bewegung während des Fallens oberhalb der Rampe ohne vorzeitiges Herausschieben.

| Prüfung | Ergebnis |
| --- | --- |
| Neue Randtests gegen Build 1.8.32 | 8 bestanden, 44 fehlgeschlagen |
| Neue Randtests nach Korrektur | 52/52 bestanden |
| Bisherige Treppenregressionen | 16/16 bestanden |
| Volumen-, Gelände-, Speicher- und Bautests | 256/256 bestanden |
| Terrain-Tests | bestanden |
| Playwright/Chromium mit echten Meshes | 4.948 Aussagen bestanden, keine JavaScript-Seitenfehler |
| JavaScript-Syntax und `git diff --check` | bestanden |

Der Browser-Test enthält zusätzlich 40 Randbewegungen mit echten Three.js-Meshes und prüft dabei Position und Höhe nach jedem Schritt. Authentifizierung ist simuliert; keine Cloud-Schreibzugriffe. `CHROMIUM_PATH` und `THREE_MODULE_PATH` funktionieren wie in der bisherigen Testdokumentation. Ein manueller Smartphone-Test wurde nicht ausgeführt.

Baseline ohne Wechsel des Checkouts:

```sh
git show bac20ff:index.html > /tmp/flat-before.html
git show bac20ff:src/stairs.js > /tmp/flat-before.mjs
STAIR_GAME_HTML=/tmp/flat-before.html STAIR_PHYSICS_MODULE=/tmp/flat-before.mjs node tests/flat-stair-edge.test.mjs
```
