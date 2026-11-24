---
name: paradise-os-ui
description: Build, change or wire in a vaporwave UI control from Paradise OS UI (ordinary controls built out of photographed 1995 parts, drawn on a canvas with spring physics, a shared bus and synthesized sound). Use when asked to add one of the paradise-* components to an app, to change how one reacts, or to make a new control in the same style. Covers the core every control is built on, the rules the set follows, and the frame-by-frame look that has to happen before calling it done.
---

# Paradise OS UI

A Paradise control is an ordinary control (a slider, a switch, tabs) built out of photographed parts from a 1995 that never quite happened: a holographic CD on a marble platter, a pink-tiled pool with a checkerboard floor, beige CRT monitors, a marble bust. Each part is a real photograph cut out on transparency (a "plate"); the control draws its plates on a canvas and moves them with springs, so it reacts like an object and not like a picture. Under the drawing is a real control (a `<button>`, a role and its keys), so it still works with a keyboard and a form.

This skill is the workflow the set was made by. It comes with three things:

- `core.js`: the shared core with the sound engine. One clock for every control on the page, `Spring`, `Base` (a custom-element base class), the bus the controls talk over, the plates, the drawing helpers and the two fonts. It sets `window.ParadiseOS` and `window.ParadiseSound`.
- `starter.html`: the smallest whole example, a bevelled button on the core with a spring, a sound and the reality switch. Copy it to start a new one.
- `look.mjs`: stops the clock, steps an interaction to chosen moments and saves the frames side by side, so you can read them.

If the job is only to put an existing component into an app, skip to **Wire it in** and **Check it**.

## 1. Decide three things first

1. **The control.** It must still be that control with the pictures taken away: a real `<button>`, or an element with the right role (`slider`, `switch`, `tablist`) and its keys.
2. **The 1995 object that already does the control's job.** The control is that object working: a jukebox is a CD you turn, a level is water in a pool, tabs are monitors you switch between, an alert is an error dialog. If the mapping needs explaining, pick again.
3. **Its plates.** Which parts are photographed (the hero object, a texture like pool water) and which are drawn on top in code (labels, glow, particles, the moving pieces). Photograph the parts on a flat plain background, front-on, and cut them out; everything that moves is drawn.

## 2. The core

Load `core.js` and everything is on `window.ParadiseOS`:

- **`Base`.** Extend it with `static css`, `render()` (the shadow root's HTML: the real control with a `<canvas>` inside), `setup()` (listeners, springs) and `frame(dt, t)`, which the core calls every frame while anything is moving. Set `this.dirty = true` and call `start()` when something changes. `this.$()`, `this.$$()` query the shadow root; `this.emit(type, detail)` fires a bubbling, composed event; with `static formAssociated = true` you get `this.internals` for `setFormValue`.
- **`Spring(x, k, d)`.** Set `.to`, call `.step(dt)` each frame, read `.x`; `.idle` says when it has settled. Everything that moves is a spring.
- **`fit(canvas)`** sizes a canvas to its box at the device's pixel ratio and returns `[g, w, h]`.
- **Plates.** `addPlates({ name: dataURI })` registers pictures; `PLATES.name` is the image, `ready(PLATES.name)` says it has loaded. The core redraws every control when one arrives.
- **The bus.** `bus.emit(name, payload)` and `bus.on(name, fn)`; `bus.state.paradise` is false while the dream toggle has the page in reality, and every control should go grey wireframe then.
- **Drawing helpers.** `drawBevelBox` (raised or sunken 95-era bevels), `drawRealPoolWater`, `drawCheckerboard`, `drawTintedPlate`, `drawContactShadow`, `drawMicroBadge`, `roundRectPath`, `renderStatue3D` (the WebGL bust).
- **The clock.** `ParadiseOS.paused = true` stops it; `ParadiseOS.advance(1 / 60)` steps every control by hand.
- **The sound.** `ParadiseSound` is synthesized Web Audio: `keyTap`, `detentPing`, `chargeTick`, `winToggle`, `winCascade`, `crtSwitch`, `degauss`, `cdTick`, `cdScratch`, `poolSettle`, `dolphinSplash` and more, plus the five-track player (`playTrack`, `pauseTrack`, `loadTracks`). `ParadiseSound.muted = true` silences the page.

## 3. The rules

These are the corrections and lessons that came up while the set was built.

- **The parts are photographs; the motion is code.** A plate never moves as a flat sticker: it turns, tilts, squashes or is cut into slabs on a spring. Glow, water, particles and labels are drawn.
- **One object, one job.** Each control is one object doing what the control does. Do not perch props on a control for decoration.
- **It reacts to the hand.** Drag tension before a snap, a detent click at each step, an overshoot when it lands, a hover that turns the part toward the pointer.
- **It works for real.** The CD dial plays real songs, and changing track changes the song the moment it lands. A control that only pretends (a player with no sound) reads as a picture.
- **Reality is the off switch.** When `bus.state.paradise` is false the control drains to grey wireframe, and floods back when it comes on.
- **No focus ring under the pointer.** Show the focus ring for the keyboard only: mark pointer focus (`data-pointer`) and style `:focus-visible:not([data-pointer])`. A ring circling a dial while you turn it looks like a bug.
- **Pointer maths divides by scale.** Convert `clientX - rect.left` back to the control's own pixels with `rect.width / el.offsetWidth`, so CSS `zoom` and transforms work.
- **No brand names.** No real OS, monitor, synth or card-game names in labels, titles or aria-labels. The world is 95-era, not a product.
- **Respect reduced motion** (`ParadiseOS.reducedMotion`): tone down ghosts, glitches and particles; keep the springs.

## 4. Look before you say it is done

A control that runs without errors has told you nothing about how it moves. Stop the clock and look at the frames:

```sh
node look.mjs http://localhost:8000/cd-dial/ paradise-cd-dial out.png "0:el.togglePlay(); 0.4:el.selectTrack(2)" "0,0.2,0.4,0.6,1,1.6"
```

Read the sheet for: the part never sliding as a flat picture, the detent and overshoot, nothing cut off at the canvas edge, text that reads, and the reality look (`ParadiseOS.bus.emit('reality', { paradise: false })`).

## 5. Wire it in

Each component is one file. Load it with a plain script tag (not a module) and use the element; read its README for every attribute, property and event. Do not rewrite or split the file: its plates and fonts are inside it. The CD dial's songs are separate files; point its `tracks` attribute at a folder holding `trk-01.mp3` … `trk-05.mp3`.

## 6. Check it

- Drive it with real pointer, touch and key events, not by setting properties.
- At 390 pixels wide nothing scrolls sideways; zoom a wide control down to fit.
- With a `name`, the value controls (slider, toggle, dial) are in the form's `FormData`.
- No script errors in the console, and the frames from `look.mjs` read.
