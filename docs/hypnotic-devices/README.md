# Hypnotic devices: local agent handoff

Four exploratory audio devices with original abstract interfaces, styled using Frame's [Sift Hardware guide](../../styleguides/sift-hardware.md). PHASE creates bleeps, DUST creates shakers, FOLD makes sample percussion, DRIFT mutates incoming audio.

## Delivered and outstanding

Delivered: four editable Frame documents registered by examples/hypnotic-devices.js; header/footer controls; default, held, mutated and bypassed visual states; synthetic abstract visual fixtures; engine specifications and local implementation instructions.

Not implemented: DSP, pointer XY dragging, input-to-puck coupling, live meters, actual sample loading, live visual telemetry, transport or audio export. Frame buttons demonstrate named states; editable inputs preserve strings only. MUTATE's fixture changes a label and puck outline, not a pattern. HOLD's fixture does not implement a toggle. These are tasks for the prototype agent.

The earlier generated image is an exploratory board superseded by the Sift designs. Do not use its mint, amber or lilac chrome.

## Get the files and review

Branch: design/hypnotic-devices-20261006 in PORTALSURFER/frame.

```sh
git clone https://github.com/PORTALSURFER/frame.git
cd frame
git switch design/hypnotic-devices-20261006
python3 -m http.server 8765
```

For an existing checkout, fetch then switch this branch; preserve your local work. Open http://127.0.0.1:8765. Select PHASE, DUST, FOLD or DRIFT in Design, and select Sift Hardware in Styleguide. Use Design size (1140×505), then Fit. These fixtures are fixed-size, not responsive phone designs. Use Interact to try controls, State to compare fixtures, Pen/Note for feedback. Use Download project for each portable JSON and Download PNG for each image.

## Local agent instructions

Give an agent this README, the selected device spec, docs/agent-api.md, and styleguides/sift-hardware.md. Suggested prompt:

> Build the selected device as a standalone local browser audio prototype using its spec. First inspect this repository's instructions and Frame APIs. Treat the Frame document as an editable visual starting point, not a finished engine. Use the Sift Hardware guide as the visual authority. Implement a real draggable XY field with live telemetry, the specified audio engine, deterministic pattern generation, HOLD/MUTATE/undo, and state save/load. Use TypeScript and Web Audio with an AudioWorklet; keep the sound engine independent from Canvas and Frame. Add a runnable local prototype under prototypes/<device>/ without rewriting Frame's core. Include setup, a known-good sound preset, WAV export, and focused validation. Refine the Frame design and export PNG/project/review artifacts. Report actual checks and unverified items. Follow this handoff's scope and acceptance criteria; do not claim the existing fixtures produce audio.

Recommended sequence: first implement one device end to end (DUST is the smallest), then reuse only transport/state/output/UI infrastructure for the others. Audio engines remain separate modules. A local agent may use subagents if you explicitly request them; none are required.

## Common product behavior

- One main XY puck; normalized x/y are in [0,1], x increases right and y increases upward. Click sets position; dragging captures the pointer. Clamp outside the field. Release leaves the puck there. Double-click returns to the factory XY. Touch uses the same behavior.
- Provide two keyboard-focusable axis controls synchronized with the puck. Arrows change 0.01, Shift+arrows 0.001; announce values and axis meanings. Numeric edits validate and clamp. Smooth continuous DSP values with a 20 ms one-pole filter; discrete changes take effect at the next pattern boundary.
- Three visible supporting controls per device as specified. Tempo, transport, output, seed, scale, preset management, mutation amount and export can live in a compact utility drawer. Show tooltips describing audible effects. Keep DSP details in docs or an optional advanced drawer.
- Default tempo 130 BPM, 4/4. PACE is the interval between slots: 1/8, 1/16, 1/32 or 1/16T (one sixth of a quarter). Default 1/16. Pattern defaults to 16 slots; configurable 8/16/32 in the drawer. Scheduler belongs to the audio clock, not the render loop.
- Generate slot attributes deterministically: unsigned 32-bit seed, explicit seeded PRNG (Mulberry32 is suitable), stable order by slot then attribute. Generate the complete next cycle ahead of scheduling. Save seeds and generated event tables. Continuous sound parameter changes do not consume PRNG values. Rewind/restart resets the transport; identical seed, parameters and start position must produce identical events.
- HOLD captures the current realized cycle (timing, gates, pitches, slice choices, noise seeds and event modulation) and repeats it without additional evolution. XY and timbre controls remain playable. Unhold resumes evolution from saved cycle counter. HOLD is about repeatability, not stopping sound or holding audio feedback indefinitely.
- MUTATE changes only the pattern seed/event attributes, never sample, root, scale, PACE, feedback, MIX, output or XY. Apply at the next cycle boundary. Default strength 20%: select 20% of slots using a deterministic shuffled list, rounded up, and regenerate those slots' attributes. If held, replace the held table at the boundary. Retain a 20-step undo history for mutations/presets; dragging is one undo entry per gesture.
- For DRIFT, pattern slots index echo modulation rather than note events; HOLD captures this modulation cycle. MUTATE changes that table.
- Bypass fades over 10 ms. Instruments fade their generated output to silence; DRIFT passes dry input. Preserve engine state and finish internal scheduling. When stopped, no new events; allow tails to decay, plus a separate panic action.
- Save schema version, device id, seed/PRNG version, cycle counter, event table, hold state, XY, controls, tempo, preset name and source identity. WAV imports need embedded audio or a re-linkable asset; filenames alone are insufficient. DRIFT delay-buffer contents need not persist; state reload clears its buffer.
- Output defaults -12 dB. Use a DC blocker, finite-value guard and soft clipping for overload; export with at least 1 dB peak headroom. High event densities need energy compensation. Never perform allocations, DOM calls or file operations on the audio thread.
- Frame project export contains design/feedback, not a complete audio preset. Provide a separate JSON audio-preset download and WAV render.

## Prototype platform

Standalone browser first; VST/AU/CLAP and host automation are later work. Explicit user Start unlocks the AudioContext. Support the current context sample rate; worklet calculations use sample frames. Generators can run without MIDI. DRIFT accepts an uploaded looping WAV by default, with microphone optional. FOLD accepts mono/stereo WAV up to 30 seconds, downmixing for its initial percussion engine. No pitch-preserving time stretch, neural synthesis, file database or cloud service is required.

Split interfaces: engine.setParameters(), engine.setPattern(), engine.transport(), engine.serialize(), engine.getTelemetry(). Telemetry is bounded at 30 Hz and reports audio-derived events; render at up to 60 Hz. Changing graphics quality must not change the sound. Provide offline render using the same engine or equivalent shared deterministic DSP code.

## Sift visual direction

Read the entire referenced guide before refinements. Keep 1140×505 broad low chassis, graphite #272B28, recess #1F2422, sage outlines #49534C, primary text #C8CDC9, secondary #929B95. Menlo / IBM Plex Mono, compact labels, thin strokes, 3 px upper radii and 8 px lower-right cuts on controls. Neutral chrome; coral #E96B50 identifies the device and current sounding events; purple #7658AE shows latent/event distributions. These are explicit adaptations, not claims about SIFT's original signal statistics.

Main field near x18/y73, width1104/height292. Overview x18/y381, height38; it shows one cycle of event context and a cursor synced to sound. HOLD and MUTATE occupy the footer left, the three supporting controls the footer right, center remains empty. Top/bottom edge-connected insets use gently eased shoulders and restrained gradients. Preserve 6 px focus clearance and at least 8–12 px between controls. Shorten decorative metal first if it collides with anything functional.

No glow, rainbow accents, animal metaphors, floating cards, fake meters, decorative technical text or imported screenshots. Synthetic preview provenance belongs in documentation. Existing shapes are deterministic fixtures; replace with meaningful audio telemetry. Idle is a quiet varying dot field and one actual start/load instruction, overview empty. Loading/error/held/bypassed/focus states keep chrome geometry stable. Responsive adaptation is a separate implementation task; prioritize desktop 1140×505 and readable 900 px width.

## Validation and artifacts

Preparation checks already performed: loaded the repository's actual FrameDocument module and validated all four documents; resolved every declared state at the intended viewport. Browser rendering, font fidelity, visual review and repository CI were not run here.

Local UI agent must run npm run ci as required by Frame README before submitting changes (Node20+, installs Playwright Chromium). Run model validation and render all four designs in default/idle/held/mutated/bypassed/error/focus states. Current fixture provides only default/held/mutated/bypassed; add the missing states.

Use Frame.agent.selectDesign(id), setViewport(id,{width:1140,height:505}), setState(id,state), renderReady(), then Frame.review.check(id). In Interact mode run Frame.review.checkAccessibility(). Review checks are evidence, not a full accessibility certificate. Inspect every reported collision; only deliberately overlapping background/data layers may have targeted exceptions. Do not waive all overlaps. Inspect font, clipped corner, text fit, focus halo and inset clearance at full size. Export through Frame.agent.exportImage and Frame.project.export.

Audio verification: deterministic event snapshot, 30-second offline render at 44.1/48 kHz, no NaN/Infinity, no scheduler drift or audible clicks on automation/bypass, HOLD repeats exactly, MUTATE respects protected parameters, preset round-trip, loaded-source identity, dense setting output bounds. Test latency and CPU on the local machine and report measured values rather than invent a threshold result.

Deliver per device: source; runnable setup; engine tests; factory preset JSON; a 30-second WAV; 1140×505 and 900px screenshots; portable Frame project JSON; feedback JSON; review report listing passed/failed/unverified checks. A prototype is complete when dragging the field produces the promised audible change, visuals follow actual sound, and repeatable discoveries survive save/reload.
