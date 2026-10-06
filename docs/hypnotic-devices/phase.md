# PHASE — hypnotic bleep generator
Read README.md here for shared controls, timing, persistence, style and validation.

## Audible goal
From a locked, sparse tonal motif to drifting interlocked metallic bleeps. The field controls rhythmic disagreement horizontally and spectral complexity vertically. Input: none. Output: stereo audio. Optional MIDI root input is later scope.

## Engine and mappings
For each slot s in a 16-slot cycle, generate fixed random attributes uGate,uPitch,uTime,uVelocity,uPan in [0,1). Gate probability p=0.45+0.3*x. Lane A occupies all slots with uGate<p. Lane B occupies slots where a separately seeded gate <0.25, at 0.6 of lane A's amplitude. At x=0 lane B aligns exactly; at x>0 its offset is x*0.45*slotDuration*sin(2*pi*(s/N+cycle*0.07)), plus x*(uTime-0.5)*0.1*slotDuration. Schedule offsets relative to the next cycle using lookahead, including events just before the boundary. Keep offset magnitude below half a slot and clamp within the transport scheduling horizon. HOLD stores these realized offsets, suppressing cycle drift.

Pitch pool relative to ROOT: [0,3,7,10,12] semitones (minor pentatonic); index floor(uPitch*5). Root default MIDI38/D2, range MIDI24–84 in the drawer. Both lanes use this pool; lane B may use octave +12, selected once per slot from its seed.

Each event is two-operator sine FM: output sin(carrierPhase + I*sin(modPhase)); carrier at selected frequency, ratio r=1+2*y, I=0.05+5*y*y. At y=0 nearly pure sine; at y=1 complex metallic ratio3 with index5.05. Implement phase accumulators at sample rate and constrain pitch/modulation to minimize aliasing; use oversampling if needed at high notes. Attack 2ms, exponential decay TAIL (20–600ms, default120), terminate below -80dB. Velocity 0.4+0.6*uVelocity; constant-power pan within +/-0.25. Max32 voices, steal quietest with 5ms fade. Output compensation approximately 1/sqrt(active voices) with slow smoothing, then shared output chain.

Supporting controls: PACE, TAIL, ROOT. Factory XY .35/.55; seed1701.

## Visual encoding
Purple contours show the two lane phase trajectories; coral dots represent actual triggers. Main puck x/y controls the formulas above. Overview is one cycle of event onset positions; cursor tracks transport. Do not draw arbitrary movement and imply it schedules sound.

## Acceptance
At x=0 two lanes align to slots. Increasing x audibly shifts interlock without losing the repeating cycle. Increasing y increases metallic complexity at unchanged root/scale. Held note/timing table repeats across ten cycles; timbre remains editable. Mutate changes motif slots without changing root, tail or tempo.
