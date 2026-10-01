# Technical Futurist Interface Style Guide

This document defines a visual language for creating user interfaces in the style of advanced technical systems, aerospace instrumentation, industrial control software, diagnostic tools, telemetry displays, and near-future operating interfaces.

The intended result should feel engineered, precise, functional, and believable.

The style should not look like generic science-fiction decoration. It should look like a real technical system that happens to come from a more advanced future.

---

# 0. Refinement and information discipline

This section takes precedence over later motif lists, density variants, sample terminology, and generation prompts. The default is a sleek, quiet functional interface. Technical character comes from alignment, proportion, material restraint, and precise interaction; it does not require a collection of instrumentation decorations.

Start with the actual task and one dominant workspace. Place the primary action where it naturally supports that task. Organize secondary controls into no more than a few tight, aligned groups. A sidebar is justified only by enough useful content to occupy it; otherwise use a compact toolbar or disclosure. Do not choose a 70/30 split simply because the document lists controlled asymmetry as an option. Avoid large mostly empty side panels with scattered controls.

Every permanent string must identify a control, identify content the user needs to distinguish, report actionable state, or provide an essential measurement. Remove decorative revision labels, style names, instruction slogans, synthetic-data captions, duplicate section names, arbitrary channel IDs, and fake telemetry from the designed surface. Keep demonstration provenance in the surrounding harness or documentation. A plausible-looking code is still inappropriate if it carries no real meaning. Empty space needs no explanatory caption.

Use at most a few text scales with clear roles: readable primary labels around 13–15 px at a compact 1140-pixel device width, secondary labels 11–12, and genuine measurement or version metadata 9–10. Avoid shrinking every label to microtext to make an interface look technical. Prefer single-word controls. Use one consistent sans-serif monospace or a coordinated technical sans-serif pair. Verify the actual fallback face rather than accepting a serif typewriter substitution.

Align groups to a small set of shared rails, standard control heights, and clear baselines. Keep values near their labels and related controls adjacent. Use a consistent 8/12/16/24 spacing rhythm, with optical adjustments for icons and clipped corners. Do not spread a few controls vertically through a tall panel. Buttons fit their content and interaction target; a full-column Export button is not justified by an otherwise empty column.

Maintain one continuous chassis and one dominant recessed workspace. Use tonal separation before adding outlines. A workspace should not need a surrounding box, separate header rule, another divider, corner brackets, and a repeated caption to explain that it is a workspace. Each functional boundary normally gets one treatment. Use near-black and warm charcoal with one restrained orange or red signal accent, or the monochrome treatment in section 0.1. Establish depth through fine frames and subtle tonal layers. Geometric filler is optional and the default is none.

At thumbnail size the workspace and primary action must read immediately. At full size check typography, optical centering, balanced gutters, and restrained border contrast. Remove anything that survives neither a functional justification nor a clear hierarchy benefit. Preserve the precision and craft of the instrument while reducing visual noise; sleek does not mean empty or unfinished.

# 0.1. Current reference direction and precedence

The four supplied references establish the current Technical Futurist direction. This section supersedes earlier hardware-inspired palette, metallic-inset, mandatory cut-corner and density prescriptions. Preserve section 0's information discipline and section 30's foreground clearance rules. Sift Hardware remains a separate style; do not blend its sage-green chassis, purple waves, beveled shoulders or lower-right button cuts into this default.

The shared visual grammar is a near-black field, generous uninterrupted negative space, exceptionally precise alignment, fine structural lines and isolated high-contrast signal elements. Most boundaries are hairlines; a small number of brighter strokes or solid accents establish importance. Fine detail belongs in a few purposeful clusters with quiet space between. The result should feel like printed technical markings on a dark instrument surface, with a clean, graphic silhouette rather than a collection of raised panels.

The first reference uses burnt orange on black, a broad sparse perimeter, balanced repetition of solid circular markers, registration crosses and short diagonal bars. Transfer the disciplined rhythm, warm color and fine registration geometry. Repetition must represent actual controls or information in a working UI. Do not copy its slogans, arbitrary numbers, logos or dot array as filler.

The second reference uses a narrow, centered crimson instrument against abundant black space. A large real measurement contrasts with small labels; thin enclosing lines and stronger interrupted brackets establish hierarchy. Transfer the strong value-to-label contrast and controlled line-weight hierarchy. Segmented indicators are appropriate only for genuinely discrete values. An audio amplitude trace or fader remains continuous. Never invent a percentage just to reproduce the graphic.

The third reference is the monochrome treatment: nearly black surfaces, white technical typography, fine neutral-gray construction lines and a sparse white identification plate. Its circles and angled leaders are tightly organized instrument diagrams. Transfer the precision, angular framing and mostly empty composition. Use circular instrumentation only for actual phase, orientation or other circular data; do not add targeting rings to an audio recorder. A tiny local texture can belong to a non-interactive identity plate, but never becomes a dotted workspace background.

The fourth reference uses a warm black field, an extremely subtle reddish-brown tint, fine orange outlines and a compact central information column. Solid orange tabs identify a small set of selected items; nearly all other surfaces stay dark. Transfer the clear contained grouping and generous margins. Do not import dense unreadable microtext, copy its layout regardless of the product, or stretch a few controls into a long column.

Choose one treatment per design. The default is black/charcoal with burnt orange: background #090909, working surface #0E0F10, subtle warm panel #17120F, structural line #3F3731, primary text #EEEAE5, secondary text #ADA49B and signal orange #E47745. Crimson uses #FF495E against #080808 with low-contrast #341619 backing. Monochrome uses #EFEFEA, #969692 and #383836 against #0A0A0A. These are approximate reconstruction targets, not sampled or verified source tokens. Avoid mixing orange, crimson, cyan and sage into one interface. Keep approximately 85–95% of the interface neutral gray and off-white in palette allocation, dominated by black/dark surfaces in actual coverage; accent fills occupy small meaningful regions.

At a 1140-unit device width, use 0.75–1-unit structural strokes, 1.5–2-unit active outlines or meaningful signal markers, and 2–3 units only for an exceptional focal bracket. Do not imitate thicker poster strokes uniformly across compact controls. Frames may be complete or selectively interrupted, with a few restrained corner ticks. Use mostly square corners or a 1–2-unit radius. A chamfer can identify a major frame or identity plate; repeating clipped control corners and metallic edge strips are not defaults. No glow, shiny chrome, heavy shadows or noisy surface texture.

Typography is crisp and technical: compact monospace for labels and values, with a restrained geometric technical heading only if a verified font is available. Avoid exotic font substitutions. Use roughly 13–15-unit main labels, 11–12-unit secondary labels and 9–10-unit real metadata at this reference size. Larger numerals are reserved for a real primary measurement. Let spacing and scale create the graphic hierarchy, not random character codes or unreadable microtext. Use uppercase concise labels where readable; wider letter spacing belongs to short headings, not all controls.

Apply this vocabulary to the actual product. For Sift, the waveform remains the dominant information surface, accompanied by one thin overview, a compact header and clearly separated recording/transport controls. Preserve equal channel space, meaningful timing markers and the actual state controls. Sparse reference graphics are not permission to shrink the usable workspace into a tiny central ornament. The shell, buttons, readouts and waveform must all belong to the chosen reference treatment.

Reject a green hardware chassis, bevel-heavy edge insets, repeated cut-corner buttons, generic dashboard cards, dense auxiliary panels, decorative telemetry, indiscriminate brackets, uniform accent outlines, full-surface grids, fake radar diagrams and glows. Verify both clean rendering and actual use at the final scale. Decorative strokes must clear foreground and focus indicators; purposeful background-layer overlaps require a local justification.

# 1. Core Visual Identity

The interface should feel:

- Technical
- Precise
- Industrial
- Analytical
- Modular
- Functional
- Sparse but information-rich
- Engineered rather than decorated
- Futuristic without appearing fantastical
- Serious rather than playful
- Flat rather than glossy
- Machine-oriented rather than consumer-oriented

The visual identity should suggest:

- Aerospace telemetry
- Laboratory instrumentation
- Signal-processing software
- Engineering diagnostics
- Embedded systems
- Mission-control interfaces
- Broadcast engineering tools
- Industrial control systems
- Advanced operating terminals
- Scientific visualization software

The interface should not resemble:

- Generic cyberpunk
- Neon gaming HUDs
- SaaS dashboards
- Mobile applications
- Glassmorphism
- Consumer productivity software
- Fantasy spaceship controls
- Highly cinematic holograms

The futuristic quality should come from precision, density, hierarchy, typography, geometry, and technical detail rather than visual effects.

---

# 2. Design Philosophy

## 2.1 Function Before Decoration

Foreground controls, data and labels should each have a clear purpose.

Optional geometric background filler is permitted under section 41.9 and must
be clearly decorative rather than imply a functional or measurable state.

Lines, markers, numbers, brackets, dots, grids, labels, borders, and diagrams should imply functions such as:

- Grouping
- Measurement
- Alignment
- Status
- Selection
- Navigation
- Direction
- Calibration
- Comparison
- Signal flow
- Position
- Progress
- Warning
- Connection

Decorative background motifs must remain distinct from functional instrumentation;
see section 41.9 for the allowed low-contrast geometric vocabulary.

Avoid adding arbitrary futuristic shapes simply because they look technical.

---

## 2.2 Information Through Geometry

Use geometry as part of the information hierarchy.

Prefer:

- Thin structural lines
- Partial borders
- Corner brackets
- Alignment rails
- Measurement ticks
- Coordinate markers
- Crosshairs
- Dividers
- Grids
- Baselines
- Connection paths
- Small geometric indicators

Do not place every piece of information inside a conventional card.

The interface should often feel like information has been positioned directly onto an engineered surface.

---

## 2.3 Controlled Information Density

The interface may contain many elements, but density should be deliberately controlled.

Dense technical areas should be balanced with significant negative space.

A screen may contain one large visualization surrounded by several compact clusters of metadata, leaving much of the surrounding surface nearly empty.

Avoid filling every available area.

Negative space is part of the visual language.

---

# 3. Color System

## 3.1 Background Colors

Use near-black rather than pure black for most surfaces.

Recommended neutral backgrounds:

- `#08090A`
- `#0B0C0D`
- `#0D0F10`
- `#101112`
- `#121314`

For warmer variants:

- `#0D0B09`
- `#12100D`
- `#17120F`

For blue-gray variants:

- `#11161A`
- `#161C21`
- `#20272D`
- `#272E34`

Avoid large flat areas of absolute black unless an especially severe or minimal presentation is desired.

Subtle variation between dark surfaces can be used to establish hierarchy without introducing visible shadows.

---

## 3.2 Primary Text Colors

Primary information should use off-white rather than pure white.

Recommended values:

- `#D5D8D6`
- `#E0E2DF`
- `#C8CDCA`

Secondary text should use muted gray:

- `#7B8180`
- `#868C8A`
- `#626866`

Low-priority annotations may use:

- `#3E4443`
- `#4C5250`

Pure white should be reserved for particularly important information such as:

- Active values
- Selected labels
- Critical measurements
- Main headings
- Current system state

---

## 3.3 Accent Colors

Use one dominant accent color for most interfaces.

Good accent families include:

### Orange

- Primary: `#E86938`
- Bright: `#FF7845`
- Muted: `#A94A2C`
- Dark: `#442018`

### Red

- Primary: `#E34B56`
- Bright: `#FF5964`
- Muted: `#92333B`
- Dark: `#351518`

### Cyan

- Primary: `#45CDD5`
- Bright: `#69E5EB`
- Muted: `#317C82`
- Dark: `#173A3D`

### Acid Yellow or Lime

- Primary: `#D7E742`
- Bright: `#EDF767`
- Muted: `#7D862A`
- Dark: `#303410`

### Blue

- Primary: `#497DAA`
- Bright: `#70A8D4`
- Muted: `#345A77`

Accent colors should primarily indicate:

- Active state
- Selection
- Important measurements
- Current position
- Progress
- Warning
- Live telemetry
- Focus
- Interaction

Do not spread accent color evenly across the entire screen.

---

## 3.4 Secondary Accent Colors

A second accent color may be used when the interface needs to differentiate multiple data classes.

Suitable combinations include:

- Cyan and red
- Blue and orange
- White and red
- Lime and white

Secondary accents should remain subordinate.

A useful overall color balance is approximately:

- 85–95% neutral colors
- 5–12% primary accent
- 0–5% secondary accent

---

# 4. Typography

Typography is one of the defining elements of this style.

Use:

- Monospaced typefaces
- Semi-monospaced typefaces
- Narrow technical sans-serif fonts
- Squared grotesks
- DIN-like typefaces
- OCR-inspired display fonts

Suitable characteristics include:

- Narrow proportions
- Clearly distinguishable numerals
- Mechanical geometry
- Strong uppercase forms
- Clean punctuation
- Moderate letter spacing
- Excellent alignment for numerical data

Suitable font families may resemble:

- IBM Plex Mono
- JetBrains Mono
- Space Mono
- Roboto Mono
- Source Code Pro
- DIN
- Rajdhani
- Share Tech Mono
- Eurostile-like technical fonts

Use one or two font families at most.

A strong interface can use one technical monospace family throughout.

---

# 5. Text Hierarchy

Use uppercase frequently for:

- Section labels
- Technical modes
- Parameter names
- System states
- Short navigation labels

Examples of appropriate language:

- SYSTEM STATUS
- INPUT SIGNAL
- PHASE OFFSET
- TRACKING
- ENGINE TEMPERATURE
- CHANNEL 06
- SIGNAL LOCK
- PROCESSING
- CALIBRATION

Long explanatory text may use normal capitalization for readability.

Avoid using title case everywhere.

---

# 6. Letter Spacing

Use moderate tracking for headings and technical labels.

Recommended ranges:

- Major technical labels: approximately `0.08em–0.22em`
- Small metadata: approximately `0.04em–0.12em`

Numerical values should usually use tighter spacing.

Wide letter spacing should communicate structure and precision rather than decoration.

---

# 7. Font Weight

Use mostly:

- Regular
- Medium

Avoid excessive bold typography.

Important values should generally become larger or brighter rather than significantly heavier.

Heavy bold text should be reserved for rare focal elements.

---

# 8. Type Scale

Typical ranges:

- Micro annotation: 8–10 px
- Secondary label: 10–12 px
- Primary label: 11–14 px
- Panel title: 14–18 px
- Major value: 22–36 px
- Hero value: 40–80 px

Large typography should mostly be used for data rather than marketing-style headings.

---

# 9. Numeric Language

Numbers should play an important role in the visual system.

Use formats such as:

- `07`
- `004`
- `04.81`
- `0027`
- `49%`
- `16:39:22`
- `SYS-026`
- `R04`
- `X2`
- `CH-04`
- `A-017`

Leading zeroes are encouraged where appropriate.

This gives values a more machine-oriented and structured appearance.

Use decimal alignment when displaying lists of measurements.

Technical IDs should be concise and systematic.

---

# 10. Grid System

The interface should appear to follow a strict underlying grid.

Use a base spacing system such as:

- 2 px
- 4 px
- 8 px
- 12 px
- 16 px
- 24 px
- 32 px
- 48 px
- 64 px

Use 8 px as the primary design grid.

Use 2 px or 4 px increments for fine instrumentation details.

Major visual elements should share clear alignment anchors.

---

# 11. Background Grid

A subtle background grid may be used.

Characteristics:

- Very low contrast
- Fine line weight
- Approximately 24–64 px spacing
- Occasional stronger divisions
- Small functional crosses at measurement intersections; no dotted background pattern
- Low opacity, generally around 2–8%

The background grid must remain subordinate to actual content.

It should be barely noticeable at first glance.

---

# 12. Structural Lines

Thin lines are one of the main structural elements.

Preferred line weights:

- 1 px for most lines
- 2 px for emphasis
- 3 px only in rare focal areas

Lines may be:

- Solid
- Dashed
- Segmented
- Interrupted
- Offset
- Partially visible

Continuous rectangular outlines should not dominate the interface.

Interrupted or incomplete lines create a more engineered appearance.

---

# 13. Partial Frames

Use partial frames instead of fully enclosed cards where possible.

A region may be indicated using:

- Only corner brackets
- A top line and one side
- Bottom rails
- Two opposite corners
- A short header line
- An interrupted rectangular outline

Partial framing makes the screen feel like technical instrumentation rather than conventional software UI.

---

# 14. Corner Treatment

Prefer:

- Square corners
- 1–3 px radius
- Chamfered corners
- Small diagonal cuts

Avoid soft, large-radius shapes.

Cut corners may be used for:

- Active controls
- Selected modules
- Key panels
- Important system states

Use them sparingly.

---

# 15. Panels and Containers

Panels should behave like functional zones rather than floating cards.

Prefer:

- Transparent backgrounds
- Slightly differentiated charcoal surfaces
- Thin borders
- Partial borders
- Integrated headers
- Direct placement onto the main surface

Avoid:

- Heavy shadows
- Floating card elevation
- Large rounded corners
- Translucent glass effects
- Bright border boxes around every section

Panels should feel physically integrated into the system.

---

# 16. Buttons

Buttons should resemble machine or instrumentation controls.

Characteristics:

- Rectangular
- Compact
- Low height
- Hard or lightly chamfered corners
- Thin borders
- Uppercase labels
- Small arrows or technical markers
- Strong active/inactive contrast

Primary actions may use a solid accent fill.

Secondary controls should remain dark with thin outlines.

Tertiary controls may be text-only.

Avoid:

- Large rounded pills
- Floating buttons
- Glossy highlights
- Soft consumer-style button design

---

# 17. Button Hierarchy

Primary action:

- Accent-colored fill
- Dark text or very high-contrast label
- Clearly dominant

Secondary action:

- Transparent or dark surface
- Thin border
- Off-white text

Tertiary action:

- Label only
- Possibly accompanied by a tiny marker or line

Danger or critical action:

- Restrained red accent
- Never oversized unless genuinely critical

---

# 18. Selection States

Selection should be obvious but restrained.

Useful selection indicators include:

- Accent underline
- Thin accent border
- Small filled square
- Accent side rail
- Accent text
- Highlighted row
- Corner marker
- Small arrow
- Short bar

Avoid large glowing halos around selected elements.

---

# 19. Charts and Data Visualization

Charts should look like instrumentation rather than business analytics.

Preferred forms:

- Signal traces
- Waveforms
- Oscilloscope-style displays
- Line plots
- Sparse bar charts
- Scatter plots
- Matrix grids
- Timeline tracks
- Node diagrams
- Orbital visualizations
- Polar plots
- Circular phase displays
- Frequency plots
- Calibration graphs
- Coordinate maps

Avoid generic dashboard graphics.

---

# 20. Chart Styling

Charts should use:

- Transparent or near-black backgrounds
- Very faint grid lines
- Tiny monospace labels
- Thin graph lines
- Neutral gray secondary traces
- Accent color for the important trace
- Sparse axis markings
- Minimal legends

Graphs should be visually integrated into the interface rather than sitting inside separate card components.

---

# 21. Circular Instruments

Circular elements work well when representing genuinely circular or directional values such as:

- Phase
- Orientation
- Heading
- Position
- Orbit
- Radar
- Rotation
- Balance
- Modulation

Do not use circular gauges simply because they appear futuristic.

The shape should match the data.

---

# 22. Meters and Progress Displays

Meters should use simple geometry.

Suitable forms include:

- Segmented horizontal bars
- Vertical level strips
- Thin fill bars
- Stacked cells
- Linear tracks
- Percentage readouts paired with simple bars

Important values should often be displayed numerically beside the meter.

Avoid highly rounded progress bars.

---

# 23. Status Indicators

Status indicators should be small and precise.

Suitable forms include:

- Small circles
- Small squares
- Diamonds
- Triangles
- Short bars
- Tiny accent markers

Typical state logic:

- White or gray: neutral
- Accent color: active
- Red: warning or fault
- Dark gray: inactive

Use indicators at approximately 4–8 px where possible.

Avoid large traffic-light indicators unless necessary.

---

# 24. Micro-Annotations

Small technical annotations are optional and permitted only when they convey genuine information required by the task. They are never a default stylistic ingredient.

Examples of suitable metadata:

- R04
- X2
- 0047
- SYS_A
- AUX
- CH.06
- IN
- OUT
- OSC
- L-027
- 32:04
- PROC_7

Place them near:

- Panel edges
- Chart corners
- Structural lines
- Divider intersections
- Controls
- Headers
- Status rails

These annotations must identify a real system, channel, object, or state. They must not merely imply technical complexity.

Do not fill the interface with random meaningless codes.

Use accurate terminology tied to the actual product. Plausibility alone is insufficient.

---

# 25. Technical Markers

Small geometric symbols may be used throughout the interface.

Useful forms include:

- Plus symbols
- Crosses
- Dots
- Small filled squares
- Empty squares
- Diamonds
- Triangles
- Directional arrows
- Chevrons
- Double chevrons
- Short diagonal marks
- Small bracket-like indicators

These should remain visually secondary.

---

# 26. Crosshairs and Calibration Markers

Crosshairs work especially well for:

- Selected objects
- Tracking targets
- Calibration
- Coordinate locations
- Active visualization points
- Sensor focus
- Spatial interfaces

They should use fine lines and minimal visual weight.

Do not place crosshairs everywhere.

---

# 27. Connection Lines

Connection lines should be thin and structured.

Suitable patterns include:

- Horizontal and vertical routing
- Orthogonal connections
- Controlled diagonal connections
- Short leader lines from labels to values
- Thin signal-flow paths
- Branching system diagrams

Curved lines should generally be reserved for data that genuinely benefits from curves, such as trajectories or signal relationships.

---

# 28. Node Diagrams

Node diagrams should use compact technical modules.

Nodes should contain only essential information such as:

- Module name
- ID
- State
- Value
- Short metadata

Nodes should remain relatively small.

Connections should not visually overpower the nodes.

Leave generous negative space between clusters.

---

# 29. Layout Principles

Several composition strategies work especially well.

## 29.1 Large Main Visualization

Use one dominant visualization surrounded by smaller instrumentation areas.

Examples include:

- A map
- A waveform
- A graph
- A network
- A spatial diagram
- A central technical object

Supporting information should remain compact.

---

## 29.2 Sparse Focal Composition

Place one important technical element in a large field of negative space.

Surround it with:

- Small labels
- A few metadata clusters
- Coordinate markers
- Thin framing elements

This works especially well for high-end futuristic interfaces.

---

## 29.3 Instrument Board

Divide the screen into functional regions such as:

- Status
- Main visualization
- Control
- Log
- Telemetry
- Diagnostics

Use shared structural rails rather than isolated cards.

---

## 29.4 Technical Matrix

Organize multiple modules around a central process or system.

Use alignment and connection lines to establish relationships.

Keep the modules compact.

---

## 29.5 Visualization With Sidebar

Use a large primary work area and a narrow technical sidebar containing:

- Status
- Modes
- Metrics
- System IDs
- Secondary controls

The sidebar should not become a stack of large cards.

---

# 30. Layering

Create a dimensional composition with clearly separated background, middle ground
and foreground. Crisp, restrained surfaces can still have depth: do not arrange
everything as a single flat layer of neatly isolated boxes.

- **Background:** broad, subdued tonal gradients and sparse geometric textures,
  such as diagonal bands, partial rectangles or local line grids. These sit behind
  the whole composition and never compete with values or imply an interactive state.
- **Middle ground:** recessed instrument beds, structural rails, partial frames,
  metallic insets and offset backing plates. Let these cross or mask background
  motifs so the surfaces have a clear spatial relationship.
- **Foreground:** readable values, labels, solid meters, input fields, buttons and
  functional handles. Give these the strongest local contrast and unobstructed
  interaction areas. Reserve coral and exceptional mint accents for meaning.

Use overlap sparingly and only for an explicit depth relationship between
non-interactive background layers. A recessed display may hide a background
stripe, or a backing plate may occlude a subdued decorative rail. Foreground
controls may sit within their intended display bed or enclosure, but decorative
edges must not intersect or crowd controls, labels, data, meter scales, handles,
hit areas or focus indicators. Shorten or move decoration before compressing
functional groups. Keep at least 6 design units of clear space after strokes,
preferably 12–16 around prominent inset shoulders, at the 1140-unit reference
width. Reserve an unobstructed 6-unit focus halo. Measure dropdown text and leave
at least 8 units before the chevron and after it; protect clipped corners. Check
all interface states at the actual viewing scale. Declare each intentional
background overlap locally in Frame documents; a blanket exemption or merely
placing an intersecting plate behind a button does not establish intent.

Prefer a few well-composed intersections, fine edge highlights, darker contact
edges and restrained material gradients over heavy drop shadows. Keep quiet areas
between detail clusters. Background decoration remains static, non-interactive
and excluded from accessibility announcements. No dotted or stippled textures.

Design review must confirm a visible hierarchy of depth as well as size: the
background recedes, structure occupies the middle ground, and controls read first.

---

# 31. Texture

A small amount of texture may be used.

Suitable effects include:

- Very faint grain
- Low-opacity noise
- Extremely subtle scanning texture
- Minor dithering
- Soft vignette

Keep these effects extremely restrained.

The UI should remain crisp.

Avoid:

- Heavy film grain
- Strong scanlines
- Distortion
- Constant glitch effects
- Heavy chromatic aberration

---

# 32. Glow

Glow should generally be avoided.

If used, restrict it to small active elements such as:

- Selected target
- Alert indicator
- Active sensor
- Current position marker

Glow should have:

- Low opacity
- Small radius
- Limited spread

Do not apply glow to all typography, lines, and borders.

The futuristic character should survive even if all glow is removed.

---

# 33. Shadows

Avoid conventional UI drop shadows.

Use instead:

- Surface contrast
- Thin outlines
- Overlapping geometry
- Offset structural lines
- Slight tonal differences

If shadows are necessary, keep them extremely subtle and dark.

---

# 34. Icons

Icons should be:

- Geometric
- Simple
- Line-based
- Consistent
- Technical
- Low-detail

Suitable icon subjects include:

- Target
- Crosshair
- Signal
- Waveform
- Orbit
- Connection
- Node
- Sensor
- Play
- Stop
- Expand
- Direction
- Plus
- Minus

Avoid overly friendly, rounded, consumer-oriented icon sets.

---

# 35. Tables

Tables should resemble technical logs or terminal output.

Use:

- Monospaced values
- Compact row height
- Strong numeric alignment
- Minimal borders
- Sparse separators
- Highlighted active rows
- Clear column alignment

Avoid large padding and decorative row backgrounds.

Zebra striping should only be used if extremely subtle.

---

# 36. Input Fields

Input fields should be simple and restrained.

Use:

- Thin outlines
- Underlines
- Dark flat backgrounds
- Technical labels
- Monospaced input values
- Accent border for focus

Avoid:

- Large rounded fields
- Heavy shadows
- Floating labels with consumer-app styling

---

# 37. Sliders

Sliders should resemble calibration controls.

Use:

- Thin linear tracks
- Small rectangular or line-based handles
- Filled measurement sections
- Ticks
- Numerical values

Avoid large circular handles.

The slider should feel like part of an instrument.

---

# 38. Toggles

Avoid mobile-style toggle switches.

Prefer:

- Small checkbox-like states
- ON and OFF labels
- Small filled square indicators
- Binary mode selectors
- Numeric state indicators

Controls should feel mechanical and explicit.

---

# 39. Scrollbars

If custom scrollbars are used, make them:

- Very thin
- Rectangular
- Low contrast
- Technically styled

Avoid rounded floating scroll thumbs.

---

# 40. Navigation

Navigation should resemble system modes rather than web navigation.

Suitable labels include:

- OVERVIEW
- SIGNAL
- ROUTING
- SYSTEM
- LOG
- CALIBRATE
- ANALYZE
- OUTPUT

Navigation items may include:

- Numerical IDs
- Short codes
- Underlines
- Accent rails
- Small state markers

Selected navigation should use subtle accent emphasis.

---

# 41. Headers

Headers may combine:

- Module ID
- Main section title
- Status
- Small metadata
- Horizontal structural line
- Version number
- Channel identifier

Headers should be compact.

Do not use large marketing-style page titles.

---

## 41.1 Required device branding and version

Every device must use the reference wordmark format: `PORTALSURFER / DEVICE NAME`.
Always place this branding at the top left of the device surface. Use uppercase, regular-weight monospaced text on one baseline.
Keep `PORTALSURFER` light neutral gray, the slash subdued gray, and the device
name in the device accent color. Leave clear space on either side of the slash.
Match the supplied `PORTALSURFER / SIFT` reference; substitute only the actual
device name. Do not center the branding, move it to another corner, stack the
names, or replace the line with a standalone device title. Scale its typography
and spacing to fit compact devices while preserving the single-line format.

The actual device version must always sit at the extreme top-right of the device
surface, aligned to the right edge with a minimal inset. Render it as tiny,
subtle, low-contrast monospaced metadata (typically 6–8 px, muted gray such as
`#4C5250`). It should be barely noticeable and must not compete with the brand,
controls, or measured values. This low-contrast treatment applies specifically
to version metadata; essential labels and values must remain readable. Use the
real version (for example `v0.1.3`), not an invented build identifier.

---

## 41.2 Reference-led audio device treatment

Use the black-field graphic instrumentation in section 0.1 for audio devices. A dominant signal area, compact controls, thin warm-neutral frames and restrained orange data form the default. Keep top-left product branding and add version metadata only when an actual product version is supplied. The Sift Hardware guide remains independent; metal shoulders, green chassis fills and clipped utility buttons are not required here.

Use genuine audio data and preserve task proportions. A waveform recorder needs a broad waveform, a thin overview and usable transport, not a poster-shaped center column. Keep idle, populated, recording and focus states consistent. Depth comes from tonal separation and fine registration edges, with all decoration clear of controls.

---

## 41.3 Warm orange reference treatment

Use near-black #090909, working surface #0E0F10, optional subtle warm panel #17120F, fine structural line #3F3731 and signal orange #E47745. Neutral text remains readable. A subdued warm field is optional and must remain close to black; no large luminous gradient or simulated metal strip is required. Place solid orange in a few meaningful active controls or signal regions.

---

## 41.4 Crimson and monochrome reference treatments

Crimson uses #FF495E with #080808 and restrained #341619 backing. Favor a strong real measurement and sparse fine frames; do not use saturation on every boundary. Monochrome uses #EFEFEA, #969692 and #383836 on #0A0A0A, with at most one high-contrast identity or selected-state plate. Choose either treatment deliberately rather than mixing their accents with orange. Both retain the hierarchy, usable type, quiet margins and collision constraints of section 0.1.

---

## 41.5 Rare cyan, green and mint contrast accent

Use the supplied mint/cyan reference as a selective contrast to the dominant
red/orange palette. Preferred hues are pale mint (`#8CDDD0`), mint cyan
(`#76D5D8`) or muted green-cyan (`#68C6B2`). Choose one for a device, rather
than adding all three. Use it only in special cases.

Appropriate uses include keyboard focus, a deliberately selected key item,
a focused editable value, or one exceptional secondary signal that must be
distinguished from the warm main signal. Focus color must track real focus
and disappear when focus moves. Keep routine controls, branding and main
measurements red/orange or neutral. Do not make mint a default second theme.

Mint should occupy at most roughly 1–3 percent of the visible device and
normally appear in only one or two small regions at a time. Use a fine outline,
short indicator or small value highlight; avoid broad mint fills, glow, or
coloring whole panels. Preserve readable contrast and the warm charcoal,
smooth surfaces, sparse fine frames and restrained contrast of the main style.

---

## 41.6 Control geometry

Default to square or minimally rounded thin outlines, dark fills and centered vector icons. Related controls share dimensions, baselines and stroke weights. Use an accent outline or restrained solid fill for a meaningful primary/active action. A chamfer is optional for a major plate; repeating a clipped corner on every small control pulls the interface toward Sift Hardware. Preserve content-sized dropdowns and protected focus space as specified in section 30.

---

## 41.7 Default reference palette and signal rules

The orange/near-black treatment in section 0.1 is the default. Crimson and monochrome are distinct variants. Earlier green-gray R7 treatment is historical and must not override this reference direction. Keep backgrounds smooth; detail is sparse, geometric and deliberate. Audio meters, faders and waveforms remain continuous unless actual discrete data calls for segmentation. Accent color represents signal, action, state or focus rather than decoration.

---

## 41.8 Label economy and descriptive information

Use concise descriptive labels only where they clarify a specific control or measurement. Do not repeat names, units or explanations across nearby elements, add inflated technical copy, or fill empty space with microtext. State shared units once and let alignment/grouping carry context.

Every visible label must help identify a control, explain its effect, distinguish
a measurement, or report actual state. Omit decorative technical metadata,
ambitious-sounding copy, redundant subtitles and speculative system information.
Whitespace is useful; do not fill it merely because space is available.

For example, label Peak and RMS once each beside their measurement/mode control,
rather than repeating both names in a selector and again over nearby readouts.
Show a shared dBFS unit once for a clearly grouped output/target area instead of
repeating it at every value and label. Keep Target and Manual gain labels when
they distinguish editable values. Use a separate dB unit for gain when necessary.

Use grouping, alignment and hierarchy to carry shared context. Repeat a label
only when elements are sufficiently separated or independently presented that
omitting it would make their meaning unclear. Put longer descriptions in an
appropriate tooltip or help surface, not permanently around every control.
Essential units, names and actionable state must remain unambiguous.

---

## 41.9 Clearly decorative geometric background filler

Optional background detail may use hard rectangles, squares, partial frames, small line grids, plus marks, diagonal hatch patches and PCB-like paths with straight runs and angled bends. Keep it low-contrast, static and clearly decorative; cluster details with quiet space between, without fake data or filler text.

Use the supplied sci-fi panel and circuit references for compositional detail.
The allowed vocabulary includes solid or outlined rectangles and squares,
partial frames, clipped rect shapes, small local line-grid patches, sparse plus
marks, paired straight lines and diagonal hatches resembling caution-striping.
PCB-like paths may use horizontal/vertical runs, 45-degree bends, short branches
and parallel traces. Keep a consistent angle and stroke vocabulary. Broad
edge bands may use extremely faint diagonal striping.

Small line grids are local geometric patches, not a full-surface texture.
Dotted, stippled and perforated backgrounds remain excluded. Hatch patterns
are decorative and must not mimic a live warning; actual warning states need
a separate, clearly meaningful treatment. Circuit-style filler must not imply
real audio routing or connection status.

Use detail at secondary/tertiary scales: a few small groups around quiet chassis
areas or edges, varied in size and separated by generous blank space. Preserve
the main meter/control hierarchy. Do not reproduce the references' extreme
density, fake technical labels, arbitrary numbers or decorative dashboards.

These motifs are explicitly visual filler, not instrumentation. They do not
represent audio level, signal activity, loading, calibration, warnings or
clickable actions. Keep them static, neutral graphite/gray, typically about
3–8 percent contrast/opacity on the chassis, with thin strokes. Avoid primary
orange/red or rare mint focus coloring, which is reserved for meaningful UI.

Place filler behind or around quiet areas. Keep it clear of text, editable
fields, meter tracks, target markers and interactive controls. Do not add
numbers, labels or invented technical metadata to explain it. Never use it to
replace useful grouping or readable information. It must be easy to ignore.

Decorative elements must not receive pointer events, keyboard focus, accessible
names or screen-reader announcements; use an explicitly decorative layer and
hide it from accessibility when represented in the DOM. This is an intentional
exception to the foreground function-before-decoration rule, not permission to
make fake controls or misleading data. Dotted/stippled and perforated background
patterns remain excluded; small local line-grid motifs are permitted as geometric filler.

---

## 41.10 Strong preference for single-word labels

Heavily prefer single-word visible labels: Mode, Gain, Target, Peak, RMS, Match. Use multiple words only when a single word would lose essential meaning; keep fuller explanations in tooltips, help and accessibility descriptions rather than the permanent layout.

For example, use `GAIN` instead of `MANUAL GAIN` when the device context makes
its role clear, and `MODE` instead of `MATCH BY`. Do not force obscure
abbreviations, invented terms or omissions that make a control ambiguous.
This rule applies to visible UI labels, not proper names, branding, units,
accessible names or explanations that legitimately need more detail.

---

## 41.11 Decisive inset symmetry and asymmetry

Insets must read as either precisely centered and symmetrical or clearly intentional asymmetry. Centered insets need equal margins and mirrored geometry. Asymmetric insets should use visibly unequal spacing, such as a 20/80 division of available side space; avoid almost-centered placement that looks accidental.

A symmetric bottom inset should sit exactly on the device centerline, with
equal left/right margins, mirrored end cuts and balanced highlights. Its fill,
outline and bevel geometry must agree on that same centerline.

An asymmetric top inset should make its offset obvious at a glance. Use a
clear unequal division of side spacing, roughly 20/80 where appropriate, or
an edge-anchored composition. End cuts may reinforce the directional balance.
The 20/80 proportion is a composition guide, not a compulsory ratio for every
inset. Preserve clearance around the tiny top-right version and top-left brand.

Do not place an inset just slightly off-center with nearly symmetrical ends:
that reads as a centering mistake. Choose one of the two intentions and make
it visible, including at compact device sizes.

---

## 41.12 Primary, secondary and tertiary composition

Adapted from [Neil Blevins: Primary, Secondary, and Tertiary Shapes](https://artofsoulburn.com/art_lessons/composition_primary_secondary_and_tertiary_shapes/composition_primary_secondary_and_tertiary_shapes.htm).

Establish large, medium and small shape scales. Vary sizes within each scale.
Consider unequal subdivisions such as 70/30 rather than automatically splitting
a mass equally. Distribute fine detail in clusters with quiet areas between
instead of covering the surface uniformly. These are composition heuristics,
not compulsory ratios.

For device UIs, our application is: establish the main display/device silhouette
first, supporting control groups second, and ticks, bevels or sparse filler
last. Check that the hierarchy survives squinting or viewing a thumbnail.
Keep equivalent controls consistent, measurement scales accurate and pointer
targets usable. Do not add tiny text or decorations merely to complete three
scales. Keep functional indicators distinct from background filler.

---

## 41.13 Tight, centered single-line inputs

Single-line text and numeric fields must closely fit their text height. Use the
font line height plus only a small amount of vertical padding; avoid tall boxes
with empty space above and below the value. Width must fit the longest expected signed numeric value plus minimal editing
padding; do not stretch numeric fields to fill their column. Center the input text horizontally and
vertically, including decibel values. Keep labels outside the field and avoid
repeating units already established by the surrounding control. Multiline
editors may use a taller, purpose-built layout.

For GainSnap, target and gain fields use compact 60 × 22 and 54 × 20 pixel boxes
respectively, with monospaced values centered on both axes. Center the painted
glyph bounds as well as the editable text, rather than relying on top padding. The meter retains two distinct
triangular handles: left for target, right for actual device gain.

---

## 41.14 Rectangular outer frame with articulated inner chassis

Keep the actual window and its continuous outer frame rectangular. Within that
rectangle, break up the inner chassis with a small number of purposeful edge
recesses: shallow side insets, stepped shoulders, chamfered notches or
offset edge rails. Extend the top/bottom inset vocabulary to the sides when
it improves the composition. Use darker colors to suggest holes, cutouts or cavities inside the frame, while
retaining the full rectangular footprint and a continuous perimeter. The inner
chassis may read as a shaped enclosure without cutting away the window itself.

Use horizontal, vertical and diagonal straight segments only for these chassis
features. No organic contours, waves, blobs or arbitrary curves. Keep cuts shallow
and leave controls, labels, scales and interaction areas clear. This chassis rule
does not remove the previously approved small radii on selected buttons.

Give a notch a dark recess and a restrained metallic contact edge to establish
depth. Use exact symmetry for paired centered features, or clearly offset side
features for intentional asymmetry; avoid almost-aligned positions. Preserve
quiet stretches of perimeter and compact device dimensions. A few strong shape
changes should define the inner chassis; do not serrate every edge or add random cuts.

Distinguish an **edge recess** from an **offset rail**. An edge recess meets the
inner face of the continuous perimeter border: keep the border itself intact,
but do not leave an extra moat or draw a second parallel outline along the
opening. Its wider opening faces the nearest outer edge; its chamfers narrow
into the chassis. Mirror left/right recesses at matching heights and depths,
and mirror top/bottom tapers toward their respective edges. Use a subdued bevel
on the inner contact edges, with consistent lighting and a dark cavity. At
compact sizes, a depth of roughly 3–5 px is usually sufficient.

A detached rail is also permitted when it serves the layered composition.
Give it an obviously intentional, consistent separation from the perimeter and
a clear alignment with the display or another structural rail. Avoid a tiny,
accidental-looking gap that makes a closed floating shape read ambiguously as
an edge cutout. Neither treatment may obscure content or break the rectangular
window footprint. Prefer a few quiet, well-aligned features over extra outlines.


---

# 42. Sidebars

Sidebars should be narrow and information-dense.

Suitable content includes:

- Mode selectors
- Status values
- Tiny charts
- Technical IDs
- Navigation
- Indicators
- Secondary settings

Use vertical rails, subtle borders, and tight spacing.

Avoid large stacked cards.

---

# 43. Borders

Do not use fully enclosed borders around every object.

Prefer:

- Partial outlines
- Interrupted lines
- Corner markers
- One-sided borders
- Short horizontal rails
- Local separators

Borders should help explain structure rather than merely decorate it.

---

# 44. Negative Space

Large areas of empty surface are desirable.

Depending on the interface, approximately 20–50% of the visible area may remain visually quiet.

Use empty space around:

- Central visualizations
- Hero instruments
- Technical diagrams
- Calibration controls
- Navigation systems

Do not automatically populate empty areas with decoration.

---

# 45. Information Hierarchy

Use three visual levels.

## Primary Information

Primary information should be:

- Large
- Bright
- Clearly separated
- Immediately readable

Examples:

- Current system state
- Main percentage
- Current position
- Major measurement
- Timecode
- Active mode

## Secondary Information

Secondary information should be:

- Smaller
- Moderately bright
- Clearly grouped

Examples:

- Parameter labels
- Secondary measurements
- Channel names
- State descriptions

## Tertiary Information

Tertiary information should be:

- Small
- Low contrast
- Peripheral

Examples:

- System IDs
- Calibration references
- Index numbers
- Internal codes
- Auxiliary metadata

Do not give all content equal visual weight.

---

# 46. Motion

Animations should be restrained and mechanical.

Suitable motion includes:

- Lines drawing into place
- Incremental progress
- Numbers updating
- Signal traces moving
- Tiny status indicators blinking
- Panels revealing
- Scanner lines
- Data pulses
- Controlled rail movement

Recommended timing:

- Interaction feedback: 120–250 ms
- Panel transition: 300–600 ms
- Ambient instrumentation: 1–4 seconds

Avoid:

- Bouncy motion
- Spring effects
- Playful overshoot
- Large glowing transitions
- Constant visual activity

---

# 47. Hover States

Hover states should remain subtle.

Good hover changes include:

- Slightly brighter border
- Gray label becoming white
- Small accent marker appearing
- Short line extending
- Background becoming slightly lighter

Avoid scale-up animations.

---

# 48. Active States

Active controls may use:

- Accent fill
- Accent border
- Brighter text
- Accent rail
- Status dot
- Small animated marker

Active elements should clearly stand apart from inactive ones without dominating the whole screen.

---

# 49. Warning and Error States

Warnings should look technical rather than dramatic.

Use:

- Small warning symbol
- Red or orange accent
- Error code
- Short descriptive label
- Localized highlighting

Examples of suitable language:

- SIGNAL LOSS
- SYNC ERROR
- TRACKER 02
- ERR 0041
- INPUT TIMEOUT
- CALIBRATION REQUIRED

Avoid turning the entire screen red except in truly critical states.

---

# 50. Screen Edge Instrumentation

Technical details may be placed near the edges of the screen.

Useful elements include:

- Corner brackets
- Vertical rulers
- Short edge ticks
- Coordinates
- System IDs
- Tiny labels
- Alignment markers
- Reference numbers

These can visually frame the interface without requiring a conventional border.

---

# 51. Peripheral Detail

Some visual information may intentionally remain small and peripheral.

This creates the feeling of a larger technical system.

Examples include:

- IDs
- Channel labels
- Small process codes
- Status abbreviations
- Small numeric sequences
- Measurement references

Essential controls and important data must remain readable.

Peripheral detail should never hide necessary information.

---

# 52. Alignment

Alignment should be exceptionally disciplined.

Use common anchors for:

- Labels
- Values
- Charts
- Buttons
- Modules
- Dividers
- Tables
- Indicators

Numerical lists should align decimal positions where possible.

Repeated modules should use consistent:

- Width
- Padding
- Label positions
- Baselines
- Spacing

Precision is a core visual characteristic.

---

# 53. Asymmetry

The overall interface may use controlled asymmetry.

For example:

- Dense information cluster on one side
- Large visualization in the center
- Small status region on the opposite side

Do not center every element automatically.

Asymmetric layouts often make the interface feel more like a real instrument system.

---

# 54. Screen Formats

This style works especially well on:

- 16:9 desktop interfaces
- 21:9 ultra-wide displays
- Square plugin interfaces
- Portrait instrumentation screens
- Embedded monitor layouts

For wide interfaces, favor a main visualization with peripheral control clusters.

For portrait interfaces, favor a strong central vertical instrument surrounded by large margins.

---

# 55. Component Vocabulary

Prefer components such as:

- Data readouts
- Signal graphs
- Status rails
- Coordinate displays
- Segmented meters
- Technical tables
- Calibration grids
- Crosshairs
- Matrices
- Waveforms
- Node networks
- Timelines
- Technical legends
- System logs
- Parameter lists
- Mode selectors
- Progress tracks
- Module IDs
- Axis markers
- Compact control arrays

Avoid relying primarily on:

- Cards
- Pills
- Floating panels
- Bubble elements
- Large badges
- Oversized icons
- Illustration blocks

---

# 56. Reusable Visual Motifs

Useful recurring motifs include:

- A short line preceding a label
- A line ending in a numerical value
- Corner brackets around important regions
- Three-dot status markers
- Parallel horizontal rails
- Double-chevron indicators
- Small section numbers
- Crosshair target markers
- Segmented progress strips
- Tiny vertical rulers
- Short diagonal warning stripes
- Small square state indicators

Use these consistently rather than randomly.

---

# 57. Spacing

Recommended spacing scale:

- 4 px for micro-spacing
- 8 px for closely related items
- 12 px for compact groups
- 16 px for standard groups
- 24 px between sections
- 32–48 px between major interface regions

Technical interfaces may use tighter internal spacing than modern consumer interfaces.

Avoid excessive padding.

---

# 58. Density and Readability

A visually complex interface should still remain cognitively clear.

Keep functional information clear and remove atmospheric technical text. Geometry alone can supply quiet peripheral character when justified.

Functional information should use:

- Higher contrast
- Larger typography
- Stronger hierarchy
- Clear alignment

Optional ambient detail should use low-contrast secondary geometry in a few peripheral areas. It must not introduce tiny filler text, compete with controls, or turn neutral space into a decorative dashboard. The default is no ambient detail.

---

# 59. Anti-Patterns

Do not create generic science-fiction UI.

Avoid:

- Neon outlines everywhere
- Glowing cyan on every component
- Hexagons used without purpose
- Random radial HUD elements
- Excessive circular gauges

Do not create cyberpunk UI.

Avoid:

- Purple and pink gradients
- Constant glitches
- RGB separation
- Heavy bloom
- Chaotic visual noise

Do not create standard SaaS UI.

Avoid:

- Large rounded cards
- Soft drop shadows
- Friendly pastel colors
- Large padding
- Floating panels

Do not create gamer UI.

Avoid:

- Aggressive beveled panels
- Oversized ornamental shapes
- Large decorative borders
- Fantasy symbols

Do not fake technical complexity.

Avoid:

- Meaningless formulas
- Random binary
- Fake code everywhere
- Arbitrary arrows
- Decorative numbers with no context

Technical detail should feel plausible.

---

# 60. Material Character

The interface should evoke materials and systems such as:

- Military electronics
- Industrial instrumentation
- Oscilloscopes
- Radar displays
- Embedded controllers
- Laboratory equipment
- Broadcast engineering equipment
- Aerospace telemetry systems
- Technical terminals

It should not evoke:

- Glass
- Luxury materials
- Chrome
- Soft plastic
- Consumer hardware

---

# 61. Visual Balance

Use a dominant functional workspace, legible compact typography, and restrained secondary controls. There is no quota for micro-detail, telemetry, or atmospheric texture. Optional decorative detail can be zero.

The futuristic identity should come primarily from structure and information design.

---

# 62. Language and Terminology

Use concise technical language.

Good words include:

- SYSTEM
- MODULE
- SIGNAL
- INPUT
- OUTPUT
- TRACK
- PROCESS
- CHANNEL
- ROUTE
- STATE
- PHASE
- POSITION
- OFFSET
- LEVEL
- LOAD
- SYNC
- SOURCE
- TARGET
- ACTIVE
- READY
- LOCKED
- ERROR
- ANALYSIS
- MATRIX
- VECTOR
- CALIBRATION
- STREAM
- NODE
- SENSOR
- FILTER
- ROUTING

Avoid conversational or overly friendly labels.

---

# 63. AI Prompt Vocabulary

When describing this style to another AI, use terms such as:

- Technical instrumentation UI
- Near-future systems interface
- Precision telemetry display
- Industrial command interface
- Engineering workstation
- Diagnostic terminal
- Aerospace control interface
- Signal-analysis console
- Technical data visualization
- Modular control system
- Monochrome engineering graphics
- Restrained science-fiction interface
- Functional futuristic interface
- Advanced industrial software

If using the term "sci-fi", qualify it with:

- Restrained
- Functional
- Industrial
- Minimal
- Engineering-oriented
- Near-future
- Believable

---

# 64. Terms to Avoid in AI Prompts

Avoid terms such as:

- Epic futuristic
- Cyberpunk
- Neon
- Holographic
- Glowing sci-fi
- Tron-like
- Futuristic glass
- Gaming interface
- Ultra futuristic

These terms often cause models to generate overly decorative results.

---

# 65. General AI Design Prompt

Design a restrained near-future technical systems interface inspired by aerospace telemetry, industrial instrumentation, signal-analysis software, scientific visualization, and advanced engineering terminals.

Use an almost-black or charcoal background with subtle tonal variation. Use compact readable typography, a small number of shared alignment rails, and one dominant functional workspace. Add only the structural boundaries and genuine data visualization required by the task. Grids, calibration marks, crosshairs, and annotations are optional tools, never a checklist to populate.

Use one restrained accent color such as muted orange, cyan, red, blue, or acid yellow. Most of the interface should remain neutral gray and off-white.

The interface should feel functional and believable rather than decorative.

Use strong alignment, generous negative space, thin one-pixel strokes, clear information hierarchy, and disciplined density.

Avoid generic sci-fi HUD elements, excessive glow, glassmorphism, rounded SaaS cards, glossy surfaces, colorful gradients, oversized typography, thick borders, and unnecessary ornamentation.

Every visual element should appear to serve a technical purpose.

---

# 66. Minimal Variant Prompt

Create an extremely sparse technical interface with large areas of near-black negative space.

Use thin gray boundaries, readable monospaced labels, genuine measurements where needed, and one restrained accent color. Keep related controls together and omit metadata clusters, coordinate marks, and crosshairs unless function requires them.

The interface should resemble aerospace instrumentation, experimental scientific software, or an advanced industrial control system.

Avoid glow, gradients, rounded cards, decorative sci-fi elements, and unnecessary visual density.

---

# 67. Dense Variant Prompt

Use the dense variant only when the actual task contains many essential controls or measurements. It is not the default. Do not invent modules or data to achieve density.

Use an almost-black canvas with a faint underlying grid.

Organize data using thin rails, partial borders, corner brackets, micro-labels, telemetry readouts, waveform displays, tables, status indicators, node connections, progress tracks, and system identifiers.

Maintain strict alignment and strong information hierarchy so the interface remains readable despite its density.

Use off-white and muted gray for most information and only one accent color for important states.

Keep geometry precise, with deliberate background, middle-ground and foreground layers.

---

# 68. Orange Variant Prompt

Design a precision technical interface using a nearly black warm-charcoal background and restrained burnt-orange instrumentation.

Use orange only for:

- Active states
- Selected values
- Calibration lines
- Important measurements
- Warnings
- Interaction focus

Use gray and off-white for everything else.

Typography should be narrow, technical, and mostly monospaced.

Use partial borders, segmented lines, short ticks, crosshairs, compact rectangular modules, and large areas of negative space.

The result should feel like experimental control equipment rather than a cinematic HUD.

---

# 69. Cyan Variant Prompt

Design a dark diagnostic workstation interface with restrained cyan instrumentation on charcoal-black surfaces.

Use cyan selectively for active measurements and system state.

Keep white and gray dominant.

Include signal displays, numerical telemetry, calibration scales, compact buttons, thin structural rails, partial frames, and small technical labels.

Keep the interface crisp and highly precise, with restrained layering and clear depth.

Use little or no glow.

---

# 70. Component Generation Rules

Whenever designing a component in this style:

1. Determine the component's actual function.
2. Identify the most important information.
3. Establish a strict alignment system.
4. Add labels and numerical values.
5. Add only the structural lines necessary to explain grouping.
6. Add appropriate status indicators.
7. Apply accent color only to the active or important state.
8. Add metadata only if the user needs it to distinguish content or take action; otherwise omit it.
9. Remove elements that do not improve function, hierarchy, or technical credibility.

The final removal step is essential.

---

# 71. Quality Checklist

Before considering a screen complete, verify the following:

- The interface still looks strong without glow.
- The interface still feels technical without the background grid.
- The hierarchy remains clear in grayscale.
- Accent color is used sparingly.
- Important values are more prominent than decorative elements.
- Most structural lines are approximately one pixel thick.
- There is intentional negative space.
- Labels and values are precisely aligned.
- Technical annotations feel plausible.
- Components are designed around function.
- Large rounded consumer-style cards are absent.
- Excessive gradients are absent.
- Visual effects are subordinate to information.
- The interface could plausibly belong to a real specialist tool or machine.

---

# 72. Compact Master Specification

Follow sections 0 and 0.1 first. Create a sleek functional interface in the supplied references' black-field technical graphic language: abundant negative space, precise alignment, fine registration geometry and a few high-contrast signals. Use the actual product task to choose proportions. For Sift, retain a broad stereo waveform, a thin overview and compact useful header/transport controls. Do not reproduce poster layouts, targeting rings, random codes, slogans or fake readings.

Default to background #090909, working surface #0E0F10, optional warm panel #17120F, fine structural line #3F3731, primary text #EEEAE5, secondary text #ADA49B and burnt-orange signal #E47745. Crimson on black and neutral monochrome are separate deliberate variants. Keep approximately 85–95% of the interface neutral gray and off-white in palette allocation, with actual coverage dominated by black/dark surfaces. Use a few meaningful accent fills; avoid uniformly colored frames, green chassis, purple traces and inherited Sift Hardware metal strips.

Use 0.75–1-unit structural strokes at a 1140-unit width, 1.5–2-unit active outlines and rare focal brackets. Prefer square or 1–2-unit corners; use occasional angular identity plates rather than clipping every button. Place precise geometric detail in a few clusters separated by quiet space. Circular instruments and segmented gauges require real corresponding data. Waveforms and audio faders remain continuous.

Use crisp verified monospace labels, restrained technical headings, short useful text, readable 13–15-unit main labels and 11–12-unit secondary labels. Larger numerals must report a real important measurement. Put PORTALSURFER / DEVICE NAME at the top left for PORTALSURFER devices; use version metadata only when supplied. Keep study provenance outside the device.

Size controls from content, including dropdown padding and an 8-unit text-to-chevron gap. Protect foreground, hit areas and focus indicators from decorative edges. Keep at least 6 units clear after strokes, preferably 12–16 around prominent detail. Only locally justified background-layer overlaps are allowed. Shorten decoration before compressing controls. Check every UI state at the final viewing scale.

Reject bevel-heavy hardware, dense panels, generic cards, random technical text, excessive microannotations, duplicated boundaries, glows and decoration without a clear compositional purpose. Preserve useful controls, readable data and coherent state transitions. The result should feel graphic, precise and refined, with the reference character visible even without text or accent color.
