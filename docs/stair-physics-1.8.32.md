# Build 1.8.32: Treppenphysik und Anschlüsse

Basis: `main`, Build 1.8.31, Commit `63b4027f12bf0a58727a8e6236b93ec82f938f36`.

## Gefundene Ursachen

1. **Die erste Stufe wurde vor dem Rampenbeginn zur Wand.** Der Körperzylinder (Radius 0,38 m) berührte das Treppenende bereits, während `stairHeight()` nur die Spielermitte auf der eigentlichen Treppe erkannte. Die separat in `index.html` ergänzte Körperkollision verdrängte den Spieler deshalb vor der ersten Stufe. Die alten Bewegungstests starteten direkt auf der unteren Anschlussposition und erfassten diesen Anlauf nicht.
2. **Getrennte Körper- und Rampenregeln widersprachen sich.** Ein zusätzlicher Höhenaufschlag, eine feste Unterseitendicke von 30 cm und Ausnahmen mit 30/40-cm-Höhenfenstern hatten keinen einheitlichen geometrischen Bezug. Das verursachte auch Probleme am Übergang zweier Steiltreppen.
3. **Unterseiten wurden nur horizontal geprüft.** Ohne horizontale Bewegung wurde `resolveCollision()` nicht aufgerufen. Die vertikale Physik konnte deshalb durch die Unterseite springen. Die bisherige Kopfprüfung endete außerdem bereits auf Kamerahöhe.
4. **Geländekontakt hing von Bildrate und Geschwindigkeit ab.** Beim Hinunterlaufen auf leicht geneigtem Gelände behielt die horizontale Bewegung die alte Höhe. Bei kleinen Zeitschritten reichte die anschließende Fallbewegung nicht, um den neuen Boden zu erreichen. Dadurch verlor der Spieler den Zustand `grounded`, auf den der Rampeneinstieg angewiesen ist.
5. **Wandanschlüsse und Kandidatenwahl waren unvollständig.** Wandanschlüsse existierten nur für aufwärts führende Treppen; eine Fortsetzung oberhalb einer bestehenden Treppe fehlte. Abwärts gerichtete Fundamentkandidaten hatten an zwei Kanten nicht die nach außen gerichtete Orientierung. Kandidaten wurden nach dem versetzten oberen Treppenursprung ausgewählt, sodass ein weiter entfernter Anschluss einen nahen verdrängen konnte. Beim Drehen einer aufwärts führenden Treppe wurde der obere Ursprung festgehalten und der untere Anschluss verschoben.
6. **Wände blockierten unabhängig von der Spielerhöhe.** Selbst auf Höhe der Wandoberkante wirkte die bisherige horizontale Wandkollision weiter. Der verwendete Anschlusswert von 2,94 m lag zudem unter den höchsten Wandpfosten (2,95 m).

## Umsetzung

`src/stairs.js` enthält jetzt die Treppenmaße, lokale/globale Transformationen, Endpunkte, Rampenkontakt, den endlichen schrägen Treppenkörper, Seitenauflösung, vertikale Integration und Snap-Kandidaten. `index.html` koordiniert Bewegung und übrige Weltkollisionen und ruft diese gemeinsamen Regeln auf; der separate Treppenkörper-Algorithmus wurde entfernt.

- **Rampe und Körper:** Die Lauframpe verbindet unverändert die gespeicherten oberen und unteren Anschlüsse. Die sichtbaren Einzelstufen werden nicht zu Laufhindernissen. Der Körper ist eine endliche schräge Platte mit 2,50 m Breite. Seine Dicke folgt der Stufenhöhe bzw. der 16-cm-Brettdicke. Es gibt keine Extrusion bis zum Gelände.
- **Einstieg:** Längsseitiger Fußkontakt beginnt entsprechend dem Körperradius vor dem Endpunkt. Bei einer leicht freiliegenden ersten Stufe wird dieser Kontaktbereich kontinuierlich mit dem Gelände verbunden, begrenzt durch die tatsächliche Stufen-/Körperdicke. Ein größerer Höhenabstand bleibt ein reales Hindernis. Dies ist kein vergrößertes Höhenfangfenster; bestehender Kontakt muss bis auf Rechengenauigkeit übereinstimmen. Seitlicher Eintritt führt nicht zur Rampenaufnahme.
- **Treppenketten:** Ein Wechsel der Stützfläche wird nur zwischen geometrisch und vertikal gemeinsamen Endpunkten erlaubt. Am Anschluss wird die nächste wirkliche Rampenfläche statt einer ebenen Endpunktfläche der alten Treppe gewählt.
- **Körperhöhe:** Gemeinsame Definition: 0,38 m Radius, 1,70 m Augenhöhe und 0,15 m Kopfabschluss darüber. Seiten und Unterseite prüfen das komplette vertikale Körperintervall. Unter erhöhten Treppen kann man bei ausreichender Kopffreiheit hindurchgehen.
- **Vertikalbewegung:** Der Kopf wird gegen die Unterseite geprüft, auch bei stillstehendem Spieler. Ein Treffer beendet die Aufwärtsbewegung. Die analytische Schwerkraftintegration wird in höchstens 1/120-s-Abschnitte unterteilt. Landungen werden von oben geprüft; auch seitliche Randberührung kann den fallenden Körper auffangen. Die normale Animationsschleife verwendet denselben Aufruf wie die Regressionstests.
- **Bodenkontakt:** Bereits auf dem Gelände stehende Spieler folgen dessen kontinuierlicher Höhe auch zwischen horizontalen Teilschritten. Rampeneinstieg und -ausstieg benötigen keine Sprünge. Das vorhandene Auto-Hop-Verhalten für andere niedrige Fundamentzugänge wurde nicht als Treppenlösung verwendet.
- **Einrasten:** Kandidaten tragen den wirklichen Anschluss und die zu verbindende obere/untere Treppenspitze. Fundamentkanten, beide Richtungen an Wandoberkanten sowie Fortsetzungen nach oben und unten an vorhandenen Treppen werden erzeugt. Drehung erfolgt um den Anschluss; bei einem unteren Anschluss wird der obere Ursprung neu berechnet. Zuerst entscheidet die Nähe zum Anschluss, bei gleichem Anschluss die Nähe zur angepeilten Treppenmitte einschließlich Höhe. Belegte identische Treppen werden vor der Auswahl entfernt. Die Vorschau bleibt direkt an der Wandoberkante und nicht mitten in der Wand.
- **Wanddurchgang:** Eine angeschlossene Treppe öffnet nur ihren tatsächlichen Laufkorridor am oberen Wandende. Ansonsten bleibt die Wand massiv. Ihre Kollision berücksichtigt nun auch die wirkliche vertikale Ausdehnung.

## Spielstände

Das Speicherformat bleibt Version 4. Gebäudeursprünge, Typen, Drehungen, Gruppen, IDs und Elevationen werden weder migriert noch verschoben. Alte X/Z-Spielerpositionen werden weiterhin aus den geladenen Stützflächen rekonstruiert. Neue Spielstände ergänzen optional `playerY`, damit beim Laden zwischen einer Position **unter** und **auf** einer Treppe unterschieden werden kann. Ohne dieses Feld bleibt der alte Ladepfad erhalten. Die Tests verwenden die wirklichen `saveGame()`-/`loadGame()`-Funktionen und prüfen JSON-Rundläufe sowie unveränderte Gebäude.

## Ausführung und Ergebnisse

```sh
node test.mjs
node tests/stairs.test.mjs
node tests/stairs-volume.test.mjs
```

Alle Tests wurden am 12.11.2026 ausgeführt:

| Prüfung | Ergebnis |
| --- | --- |
| Bisherige Rotations-/Bewegungs-/Ladeprüfungen | 16/16 bestanden |
| Neue Volumen-, Eintritts-, Gelände-, Bildraten- und Bautests | 256/256 bestanden |
| Vorhandene Terrain-Tests | bestanden |
| Chromium mit echten Three.js-Meshes und Gelände | 1.348 Aussagen bestanden; keine JavaScript-Seitenfehler |
| JavaScript-Syntax aller Inline-Skripte, Quellmodule und Testdateien | bestanden |
| `git diff --check` | bestanden |

Die neue 256-Fälle-Suite mit denselben Testfällen gegen die unveränderten Funktionen von Build 1.8.31 ergibt **18 bestanden / 238 fehlgeschlagen**. Die bisherige 16-Fälle-Suite ergibt dort 8 bestanden / 8 fehlgeschlagen. Das bestätigt insbesondere die fehlende Anlaufabdeckung und die verbleibenden Ketten-/Anschlussfehler im Ausgangsstand.

Baseline reproduzieren, ohne den Checkout umzuschalten:

```sh
git show 63b4027:index.html > /tmp/stairs-1831.html
git show 63b4027:src/stairs.js > /tmp/stairs-1831.mjs
STAIR_GAME_HTML=/tmp/stairs-1831.html STAIR_PHYSICS_MODULE=/tmp/stairs-1831.mjs node tests/stairs-volume.test.mjs
```

Der gemeinsame VM-Harness extrahiert die tatsächlichen Spiel-Funktionen. Rendering, UI und Gelände sind dort gezielte Test-Doubles; Bewegung, Platzierung und Speicherlogik sind keine nachgebauten Testalgorithmen. Der Harness kann auch die ursprüngliche vertikale Physik von 1.8.31 laden.

Browser-Test mit installiertem Playwright und Chromium:

```sh
node tests/stairs.browser.cjs
```

Optional: `CHROMIUM_PATH` für einen vorhandenen Browser und `THREE_MODULE_PATH` für die lokale, unveränderte Three.js-Version 0.160.0. Ohne lokale Three.js-Datei wird das vom Spiel verwendete CDN geladen. Der Browser-Test prüft reale Three.js-Matrizen, Stufenmeshes, Höhen auf echtem Gelände, Auf-/Abstieg, Ketten, erhöhte Fundamente, Seiten-/Unterseitentreffer, Unterquerung und Wandvorschauen. Die Animationsschleife wird für reproduzierbare Schritte angehalten; die wirkliche vertikale Integration wird explizit aufgerufen. Die Authentifizierung ist simuliert. Es erfolgen keine Cloud-Schreibzugriffe.

### Abdeckung der geforderten Fälle

| Anforderung | Automatisierte Abdeckung |
| --- | --- |
| 1. Beide Typen, vier Drehungen | bisherige Suite plus neue Bewegungs-/Volumenfälle; Browser |
| 2. Erste Stufe ohne Springen | Anlauf ab 60 cm vor dem Ende; Höhe, Fortschritt und Geschwindigkeit geprüft |
| 3. Hinunterlaufen | Rückwege sämtlicher Bewegungsmatrizen; Browser auch auf echtem Gelände |
| 4. Zwei steile Treppen | vollständiger Hin-/Rückweg mit Rampenwechsel und Schwerkraft |
| 5. Fundamentübergang | erhöhte Decks, exakte Höhen und Korridor; beide Fundamenttypen beim Einrasten |
| 6. Seitliche Kollision | gehender und springender Körper bei allen Drehungen und beiden Typen |
| 7. Sprung von unten | stillstehender Sprung bei vier Bildraten; Kopfgrenze und Fallbewegung |
| 8./9. Kopffreiheit | Unterquerung mit ausreichendem Platz sowie Blockierung knapp unter Körperhöhe |
| 10. Alle Fundamentkanten | vier Kanten, normale/erhöhte Fundamente, aufwärts/abwärts, Anschluss bleibt beim Drehen fest |
| 11. Wandoberkante | obere/untere Treppenspitze an der tatsächlichen Wandkrone, beide Typen und vier Drehungen |
| 12. Weiterbau nach oben | obere Spitze einer vorhandenen Treppe als neuer unterer Anschluss; Laufweg über Wandkrone |
| 13. Speichern/Laden | alte Version-4-Gebäude, unveränderte Transformationsdaten; Unterquerung mit optionalem `playerY` |
| 14. Bildraten/Geschwindigkeiten | 15/30/60/144 fps und 2/6/9 m/s, einschließlich Ketten und geneigter Geländeanschlüsse |

Nicht ausgeführt: manueller Test auf einem physischen Smartphone sowie Integration mit einem echten Supabase-Konto. Alle angeforderten automatisierten Fälle wurden ausgeführt; es bestehen keine übersprungenen oder fehlgeschlagenen Fälle in der fertigen Fassung.
