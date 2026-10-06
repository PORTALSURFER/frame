# DRIFT — mutation delay effect
Read README.md here for shared controls, timing, persistence, style and validation.

## Audible goal
Repeats evolve into resonant, blurred metallic echoes while the initial rhythm remains recognizable. Input stereo audio; local prototype uses a looping WAV source. Output stereo. True pitch shifting and granular delay are future scope.

## Engine and mappings
Signal path: dry -> stereo fractional-delay read -> modulation allpass -> tone shaping -> saturator -> feedback write; processed delay output also feeds wet output. One circular delay buffer per channel, max4 seconds. Linear interpolation minimum, cubic preferred. TIME fractions 1/16,1/8,3/16,1/4,3/8 of a whole note; default3/16 equals0.75 quarters. At130 BPM default baseDelay=346.15ms. Changes in TIME use 30ms crossfade between read taps, never abrupt jumps.

x controls mutation depth. Generate one seeded signed modulation value m_s in [-1,1] per slot, plus an evolution offset changing every cycle; HOLD captures realized m_s. Smooth m_s over one slot. Fractional read time=baseDelay*(1+0.025*x*m_s). This creates bounded tape-like pitch motion, explicitly not fixed semitone transposition. Tone shaping uses lowpass cutoff8000*pow(0.3,x) Hz and highpass80Hz; clamp cutoffs below0.4*sampleRate. Saturator z=tanh((1+2*x)*input)/tanh(1+2*x). Keep gain bounded.

y controls diffusion and tail potential: cascade three first-order allpasses with delays [7,13,23]ms, feedback coefficient a=0.15+0.55*y, interpolate dry delayed signal versus allpass output by y. Allpasses have unity gain in ideal operation. Effective feedback F=clamp(knob*(0.6+0.4*y),0,0.85). FEEDBACK knob range0–0.85 default0.45. Thus y=0 provides a shorter, cleaner tail; y=1 more diffusion and full selected feedback. Explain that vertical 'SHORT/LONG' refers to echo persistence, not base delay time.

MIX M in [0,1], default0.35; output=cos(M*pi/2)*dry + sin(M*pi/2)*wet. Apply finite guards/DC blocking inside feedback and shared output conditioning; limiter outside feedback. Stop feeding input if panic; clear buffers safely. Silence must eventually decay; HOLD never raises feedback or freezes buffer energy.

Supporting controls: TIME, FEEDBACK, MIX. Factory XY .35/.55; seed4701. Factory input is a licensed or locally synthesized16-step drum loop. No live microphone permission required.

## Visual encoding
Purple contours represent stored echo energy (derived from delay telemetry); coral follows new echoes/input contributions. Contour spacing reflects read-time movement, blur reflects diffusion. Overview shows recent wet energy/time context. Do not display a hypothetical number of future repeats as measured audio.

## Acceptance
x=0 has no read-time pitch motion; x=1 stays within +/-2.5% delay modulation. y increases diffusion/persistence while TIME stays fixed. Feedback is always <=0.85. After one impulse and no further input the tail decays without runaway. Automation and bypass are click-free. HOLD repeats modulation without freezing audio or stopping new input. Mutate changes modulation table while leaving feedback, time and mix fixed.
