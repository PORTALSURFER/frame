# DUST — shaker generator
Read README.md here for shared controls, timing, persistence, style and validation.

## Audible goal
Soft sparse grains become dense crisp shaker gestures; synchronized accents support hypnotic techno. Input none; stereo output.

## Engine and mappings
Each slot emits a seeded cluster. x sets collision count C=round(1+23*x*x). Use stratified offsets t_j=(j+u_j)/C *0.8*slotDuration so a cluster is spread through most of a slot, not all stacked on one sample. Swing delays odd slots by swing*0.5*slotDuration (swing range0–0.6, default0.12). Generate and sort the full cycle; HOLD stores collision offsets, gains and noise seeds.

Each collision synthesizes independent seeded white noise through a bandpass. Center f=1200*pow(7,y) Hz (1.2–8.4kHz), Q=0.7+3*y. Clamp f to 0.4*sampleRate. Attack0.3ms, exponential decay TAIL (5–120ms, default40). Add a sine tick at 2200+5800*y Hz, amplitude0.12*y*y, decay4ms. Peak event gain (0.35+0.65*uVelocity)/sqrt(C); accents on slots0,4,8,12 multiply1.3. Stereo pan seeded within +/-0.5. Max96 grain voices, quietest steal with 2ms fade. Use seeded noise per voice to ensure repeatable offline audio.

Supporting controls: PACE, TAIL, SWING. Factory XY .35/.55; seed2701.

## Visual encoding
Purple dots show scheduled grain positions in the current cycle; coral dots flash only on actual collisions. Particle trail duration follows TAIL, vertical distribution reflects brightness. Overview compresses collision timing. Graphic dot count may be capped independently of actual audio voices; report real counts in telemetry.

## Acceptance
x=0 yields one grain per occupied slot; x=1 yields24. y sweeps from soft to crisp without changing event times. Swing displaces odd slots by the specified amount. Dense setting stays bounded. Held playback repeats noise and event timing, not just count. Mutate varies collision placement and strength while preserving density, brightness and swing.
