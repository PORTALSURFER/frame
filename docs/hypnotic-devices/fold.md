# FOLD — sample percussion instrument
Read README.md here for shared controls, timing, persistence, style and validation.

## Audible goal
Turn one sound into a repeating percussion motif; move from ordered traversal to shuffled fragments and from tight chops to longer gestures. Input one mono/stereo WAV, maximum30 seconds. Stereo files are downmixed to mono for v1; output stereo by panning voices.

## Engine and mappings
Decode file off the audio thread; normalize once only if user opts in. Default no normalization. Detect candidate onsets using 5ms RMS windows, local rise above 1.8 times previous20ms mean plus a silence floor -55dB; require50ms spacing. Add start0. If fewer than4 candidates, use16 evenly spaced starts. Cap candidates64, retaining highest-strength onsets chronologically. Define slice end as next onset or file end.

For slot s, ordered slice index=floor(s*numberOfSlices/N) % numberOfSlices. Seeded alternate index=floor(uSlice*numberOfSlices). x is probability of choosing the alternate rather than ordered index: use uScatter<x. Keep gate mask fixed at 12 of16 slots in factory pattern; pattern length8/16/32 configurable with 75% occupied evenly distributed using Bresenham-style Euclidean distribution. MUTATE changes selected slice choices, velocity and pan on eligible slots. Occupancy can be evolved only in an optional future feature.

y sets maximum gate duration G=10*pow(40,y) ms (10–400ms) and playback speed R=pow(2,-y) (1 down to0.5). Play chosen slice from its onset at R with linear or cubic interpolation. Stop at min(G,remainingSliceDuration/R); do not cross the next slice or wrap. Attack1ms, release min(5ms, gateDuration/3); shorten attack for tiny clips. Thus y introduces slower lower-pitched and longer fragments; this is intentional repitching, not pitch-preserving stretch. Voice amplitude0.4+0.6*uVelocity, seeded constant-power pan +/-0.35. Max16 voices, quietest stealing with 5ms fade. Loading a new source stops existing voices with20ms fade and resets slice table.

Supporting controls: SOURCE (real file-load button with filename), PACE, LENGTH. The initial Frame SOURCE string is only a fixture; replace with an actual load action. Factory file: locally generate or include a licensed dry percussive hit; never depend on a nonexistent factory file. Factory XY .35/.55; seed3701.

## Visual encoding
Purple geometry represents source slice envelopes; coral represents currently played segments. Amber onset triangles mark real detected boundaries. Overview is the full source with highlighted slices and playback cursor; any cycle event rail must be clearly separate from source position. Use true audio waveform reduction with independent upper/lower extrema, not decorative sine traces. Current preview polygons are synthetic and must be replaced.

## Acceptance
x=0 traverses slices chronologically; x=1 follows seeded scattered choices. Increasing y lengthens and repitches fragments according to the formulas. Empty/silent/one-sample files never divide by zero or crash. Unsupported files show clear error. Loaded source survives embedded preset save or explicitly requests relink. Held slice sequence repeats, while XY remains editable.
