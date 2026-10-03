# Sift Hardware Interface Style Guide

## 1. Reference and scope

This guide describes only the visual language of the two supplied SIFT screenshots: an idle display and a populated stereo-waveform display. It is a reusable specification for generating other interfaces with the same character. It does not import rules from another Frame guide. The screenshots show the name SIFT, although the request called it Shift.

The observed appearance is the authority. Colors below are approximate reconstruction targets, not verified source tokens. Dimensions are recommended design units normalized to a 1140-pixel-wide device; scale them proportionally when reproducing the much larger screenshots. Hover, focus, pressed, loading, recording, and error behaviors cannot be established from still images. Their rules below are proposed extensions, explicitly separate from the two observed states. Do not claim those extensions reproduce demonstrated Sift behavior.

The guide contains prose and textual rules only. It requires no reference image, ASCII diagram, texture asset, or screenshot overlay in a generated interface.

## 2. Overall character

Build a quiet, serious audio instrument with the visual presence of a compact physical device. Its identity comes from a green-tinted graphite enclosure, dark inset working surfaces, thin gray-green outlines, compact monospaced lettering, restrained angled cuts, and small warm signal accents. Keep the device broad and low, with a large uninterrupted workspace and controls around its perimeter.

The surfaces feel smooth, matte, and lightly machined. Depth is shallow: an inset edge, a darker recess, or a low-contrast metallic lip establishes hierarchy. Most of the interface stays neutral. Purple and coral become substantial only where they represent actual waveform information. Empty areas remain useful quiet space.

## 3. Palette and semantic color roles

Use chassis graphite #272B28 for the main enclosure. Use display recess #1F2422 for the main workspace and overview. Raised inset #343C36 supplies the slightly lighter green-gray metal at the top and bottom edges. Control fill #2A302C stays close to the chassis; selected control fill #414E47 is more visibly sage but remains muted.

Use structural outline #49534C for display frames and normal button outlines. A selected outline can approach #8D9F94. Primary text #C8CDC9 is an understated off-white. Secondary text and icons #929B95 are subdued gray-green. Version metadata may be darker than normal secondary text, but essential interactive labels must remain legible.

Use coral #E96B50 for the device name, the inner waveform, and selected functional labels. The ARM label and its outlined circle use a paler warm tone, approximately #D6B0A3. Use waveform purple #7658AE for the larger waveform envelope and marker amber #BD8961 for small top-edge onset triangles. A cursor is a fine neutral line near #9BA39D. Background dots approach #3C4540; timing grid lines approach #49483F.

Keep these roles stable. Purple is a data color, not a general button accent. Coral does not fill the entire interface. Do not add cyan, lime, rainbow status colors, or another guide's accent family by default. When adapting the style to other content, preserve neutral chrome and give each data color a named meaning. The screenshots do not establish what signal statistic the purple and coral layers measure; do not label them peak, RMS, input, or output without product requirements.

## 4. Enclosure and material treatment

Draw one continuous graphite chassis with a visible fine outer boundary, dark contact seam, and a subtly lighter inner rim. The rounded bottom corners and intact perimeter are required at the full device scale; do not let the body fill bleed to the canvas edges without an enclosure outline. Its lower outside corners have a modest radius. The frame is not a floating stack of cards. Use a nearly flat body fill, allowing only very broad, subtle shading that remains within the same green-gray family.

A shallow metallic insert meets the top edge, and another meets the bottom edge. These edge-connected recesses must extend all the way to the window boundary: the top insert begins at y=0 and the bottom insert ends at the full window height. Do not leave a strip of chassis, an inner-rim gap, or a floating margin between the inset and its corresponding outer edge. Carry the recessed surface and contact seams into the perimeter; the outer boundary may remain as a fine line over the surface. Keep the shoulders and inward lip clear of foreground controls. These inserts must have softly eased shoulder transitions, not abrupt flat trapezoid silhouettes. Approximate the easing with sufficiently fine vector points if curves are unavailable. Keep a darker contact seam, a slightly brighter inner lip, and a restrained two- or three-stop vertical gradient within the green-gray palette. A single uniform polygon fill is insufficient to reproduce the finish. They span roughly the central two thirds of the device. Their long horizontal middle is flanked by gently sloping, cut ends. A thin darker seam separates the insert from the body, and a restrained lighter edge suggests a machined lip. Small diagonal glints near the ends are optional. Keep these details symmetrical and low contrast. They are enclosure details, not extra controls.

Avoid shiny chrome, deep bevels, heavy grain, leather, glass, neon bloom, and large drop shadows. Depth should be readable through adjacent surface values and one fine edge.

## 5. Composition and proportions

Use a wide device proportion near 2.25 to 1. Divide the height into a header around 14–16 percent, a main display around 60 percent, a small separating gap, an overview strip around 7–8 percent, and a bottom control band around 13–14 percent. Treat these as visual targets rather than rigid pixel claims.

At a normalized width of 1140, start with outer content gutters around 12–18 units and a main display around 305 units high. The main display and overview share the same left and right edges. Keep approximately 14–16 units between them. Header and footer controls use optically inset alignment rather than one universal left edge: at 1140 width, the main display begins about 18 units from the edge, branding about 32 units, and ARM about 29 units. The brand baseline sits near 52 units from the top; the utilities occupy roughly y=29–59; the main display starts near y=73. The footer controls are vertically centered around y=468 in a roughly 505-unit-high shell. Preserve these small but deliberate offsets.

Put brand identification at the upper left and utility controls at the upper right. Place the primary ARM action at the lower left. Keep transport and timing controls together at the lower right. The large unoccupied space between footer groups is intentional. Do not center controls simply to fill it.

For another application, map the large display to its principal workspace, the overview to a secondary context strip, and the footer to its primary action and related controls. Preserve that hierarchy without inventing audio controls for a product that has none.

## 6. Typography

Use one compact monospaced family throughout: a readable technical face with simple letterforms, tabular digits, and a normal-to-medium weight. Suitable reconstruction choices include IBM Plex Mono, JetBrains Mono, or an explicitly chosen sans-serif monospace such as Menlo. Do not rely on an unspecified platform monospace fallback; verify rendered letterforms and avoid a serif or typewriter appearance. The exact font cannot be identified confidently from the screenshots.

Use uppercase for branding and compact control labels. Give the brand and device name modest breathing room between letters; avoid extreme tracking. At the normalized device scale, branding is approximately 14–16 units, main action text 13–14, ordinary controls 11–12, and time/version text 9–10. Icons can be optically larger than adjacent text without changing control height.

Align numerical readouts consistently. Time labels sit in the lower corners of the workspace, with the unit suffix directly following the number. Version metadata is small and quiet at the extreme upper right, above the toolbar. Use a real version only when supplied; otherwise omit it. Do not manufacture a build identifier as decoration.

## 7. Brand and header

The observed brand line reads PORTALSURFER, then a spaced neutral slash, then SIFT in coral. Reproduce this relationship when recreating the reference. For another product, substitute the actual brand and device name while retaining the neutral brand, neutral separator, and coral product-name roles.

The right toolbar is a single horizontal row of outlined controls. It includes a compact grid/arrow icon, a wider TAKES dropdown, an outward arrow, a gear, and a question mark. Preserve consistent control height and small regular gaps. Icons and labels use secondary gray; the toolbar remains subordinate to the display. Adapt the actual functions to the target product rather than copying unrelated commands.

## 8. Button geometry

The signature control has a thin outline, a dark fill, gently rounded top corners, and a clipped lower-right corner. The cut removes a small diagonal wedge; it does not turn the whole button into a hexagon. A reference control height near 30–32 normalized units works well, with a 2–4 unit corner radius and a 7–10 unit lower-right cut.

Small icon controls are nearly square. Text controls widen only enough to fit their labels and padding. Dropdown controls place a small chevron at the right with clear space between it and the label. The ARM control is wider and taller, approximately 84 by 38 normalized units (about 1.3 times the utility-control height), with a more prominent sage outline and fill. Its left-side outlined circle is small and balanced against the text.

Not every rectangle is chamfered. Display frames use only tiny radii; the overview is substantially rectangular. Separators are simple vertical strokes. Preserve this variation so the clipped corner reads as a control signature rather than a repeated background motif.

## 9. Icons and control grouping

Draw icons as actual geometric vector paths, not Unicode glyphs, emoji, or text-font substitutes. Their silhouette, stroke, and optical centering must be designed independently from text. Target an icon extent of 14–18 units inside a 30–32 unit control; do not reuse the 11–12 unit text size as the icon size. Use consistent medium strokes around 1.5–2 units: a filled triangular play icon, a simple circular arrow, three vertical level bars, a diagonal outward arrow, a small gear, and a straightforward question mark. Keep them centered optically, with ample clearance from the frame. They should look drawn for instrumentation rather than decorative illustrations.

In the footer, group the level-bars control, play, loop, and SYNC closely. Place a thin vertical divider before SNAP and its fractional-value dropdown. Distinguish the action family through spacing and the divider, not a second large panel or unrelated typography.

## 10. Main display frame

Inset the workspace into the chassis with a darker fill and a single thin sage border. The frame is continuous and unobtrusive. Use a small corner radius; do not add a thick bezel, title tab, decorative corner brackets, or internal cards.

Place time readouts inside the lower left and right corners with small consistent padding. Keep the functional content clear of their text. A slim neutral horizontal viewport indicator can run along the bottom inside edge. It stays much thinner than a button and avoids covering useful waveform detail.

## 11. Observed idle state

In idle mode, the main recess contains a sparse regular dot field. Dots are small, round, low contrast, and vary gently in prominence across the field. Most are extremely faint; occasional dots are slightly larger or brighter. At 1140 width, use approximately 29-unit spacing and radii ranging roughly from 0.4 to 2 units, with slow deterministic changes in prominence across both axes. A uniform array of identical tiny pinholes loses the intended texture. Use a deterministic pattern rather than flickering random noise. The field should suggest quiet technical depth without reading as a starfield or animated signal.

Place one brief instruction near the upper left, inset from the display edge: ARM TO RECORD · OR DROP AUDIO. Its muted monospaced text sits on a subtly darker rectangular backing. Keep the line compact and secondary. For other products, use an equally short instruction describing a real initial action.

Both time labels show zero in this screenshot. The overview remains empty and dark with its outline intact. ARM retains its pale warm text and sage emphasis. SYNC and SNAP labels are gray in the idle reference; transport icons remain neutral. Do not make all controls invisible or assume they are disabled merely because their labels are subdued.

## 12. Observed populated waveform state

Replace the dot field and idle instruction with waveform content. The main display contains two vertically stacked channels of equal height. Each signal is filled above and below its own horizontal baseline, using independent upper and lower excursions rather than an exactly mirrored silhouette. The shape follows irregular peaks and decays with fine jagged detail, not evenly repeated pillars, rounded capsules, a synthetic sine wave, or an equalizer-bar motif.

Draw the wider envelope in muted purple. Draw a narrower coral waveform inside it, sharing the same baseline and horizontal alignment. Let the purple remain visible above and below the coral, especially at transients. Keep the fills opaque-looking and matte, with no glow or shadow. Filled waveform polygons have no outline stroke. A bright full-width coral centerline must not compete with the filled signal; quiet tails narrow naturally, with only a subdued purple baseline where the signal vanishes. Do not draw the closing edge of a polygon as a bright horizontal line. Channel content must retain genuine differences while the frame, timing alignment, and data-color meanings remain shared. When using synthetic preview data, vary attack shape, decay duration, local roughness, strength, and upper/lower channel energy independently; label synthetic provenance outside the designed device. Do not use repeated copies of one damped sawtooth envelope. For a reference-scale populated preview, strong peaks can occupy about 70–85 percent of each channel half-height while quiet passages stay fine; avoid uniformly small waves inside an oversized empty panel. Never normalize real playback continuously just to obtain this appearance.

Use sparse thin vertical timing lines in low-contrast warm gray. The reference has no numbered ruler across the top. Small amber downward triangles at the top border indicate a few onset positions. A neutral vertical cursor crosses the display. Marker lines and the cursor remain thin, so colored signal shapes carry the dominant contrast.

In this state, SYNC and SNAP appear coral while other transport controls remain neutral. This is an observed visual difference, not proof of the underlying state machine. ARM appears with a somewhat lighter sage fill than in idle mode; a still image cannot establish whether that is selection, hover, or recording. Preserve its hierarchy without inventing a pulsing record indicator.

## 13. Overview strip

Place a shallow overview directly below the main display. Use the same dark recess and a finer rectangular border. In the populated state, compress the full content into this strip using the same purple outer envelope and coral inner signal. Keep it low in amplitude and visually quieter than the main display. The overview must read as one compact composite trace centered in the strip, not two squeezed stereo traces. It preserves the main signal colors and event alignment, with sufficient peak height to remain recognizable. A viewport rail along the bottom and a thin cursor are required in the populated reference-scale treatment; coordinate them with the main display rather than omitting them as decoration.

A fine vertical cursor and narrow bottom viewport rail describe position and extent. Keep overview and main-display position indicators coordinated in a working implementation. In idle mode, leave this strip empty instead of duplicating the dot field or idle message.

## 14. State hierarchy and proposed interactions

Observed idle and populated modes preserve the same enclosure, header, display bounds, overview bounds, and footer locations. Change content and limited functional accents without reorganizing the interface. A recording or loading state should likewise retain geometry; the specific behavior must come from the target product.

For unobserved hover states, slightly lift the control fill or brighten its outline. For pressed states, slightly darken the fill and reduce any edge highlight. For selection, use a restrained sage fill or a coral label according to the control's meaning. For keyboard focus, add a clearly visible neutral or pale sage outline that is distinct from ordinary hover. These are proposed rules, not captured reference states.

Disabled controls should be visibly subdued and semantically disabled, with accessible explanations when necessary. Errors should use concise readable text and a restrained warm indication in the relevant region; do not add a new neon palette. Announce state and errors accessibly. Color alone must not communicate recording, selection, or failure. Use labels, icons, and actual accessible state attributes as well.

## 15. Spacing and density

Use a 4-unit working grid with 2-unit adjustments for fine borders and optical alignment. Typical adjacent control gaps are 6–8 units; display separation is about 14–16; major gutters are 12–18. Give larger groups visibly more separation than controls within a group.

Density belongs in the signal display. The chrome is sparse. Keep labels short, avoid redundant units, and move explanations into help or tooltips when appropriate. Do not scatter microtext, serial numbers, fake measurements, or decorative warning strings around the enclosure.

## 16. Resizing and adaptation

At smaller sizes, preserve readable type and minimum practical pointer targets. Reduce decorative metal inserts and optional metadata before shrinking essential control labels. Allow a toolbar to wrap into deliberate groups if necessary. Keep the primary action easy to find and the workspace large enough to be useful.

At larger sizes, expand the working display rather than scaling every icon and label into oversized controls. Maintain thin outlines and modest typography. A narrow adaptation can rearrange groups, but should retain the same material, palette roles, control geometry, and clear main-workspace hierarchy. These responsive rules are proposed adaptations; only the wide reference is observed.

## 17. Rules for AI generation

Start with the shell and hierarchy, then the recessed workspace and overview, then the perimeter controls. Apply the neutral palette before adding coral and purple. Establish consistent thin strokes, small radii, and selective lower-right cuts. Add the restrained top/bottom metallic inserts last so decoration never dictates layout.

When generating idle content, use the subdued dot field and one short useful instruction. When generating populated content, remove that field and instruction, and render the actual data with the reference's layered waveform treatment when audio data is appropriate. Other kinds of data should use truthful visual encodings while retaining the same restrained surfaces and hierarchy.

Do not reproduce the host application's title bar, window controls, screenshot crop, or border artifacts as device styling. Do not embed either screenshot in the generated interface. Build the visual language as real UI geometry, text, and data rendering.

## 18. Acceptance criteria

A matching design reads as a broad graphite-green instrument with a dark inset workspace. Brand and utility controls occupy the header; a thin overview supports the main display; the primary action and grouped transport sit at opposite footer ends. Thin sage frames, understated monospace text, selective clipped control corners, and shallow metal edge inserts establish the hardware character.

An idle rendering has a faint dot field, compact instruction, zero-time readouts where appropriate, and an empty overview. A populated audio rendering has two aligned irregular waveform channels, purple outer and coral inner signal layers, sparse timing lines, tiny onset triangles, and a compressed overview. The chrome remains stable between states.

Reject bright general-purpose accent floods, thick borders, large card grids, pill-button systems, capsule/bar waveforms, sci-fi ornament, glass effects, heavy shadows, noisy stippling outside the idle display, and fake technical data. Review keyboard focus and contrast independently: screenshot-faithful low-contrast metadata is not permission to make essential controls unreadable.

## 18.1. Fidelity priorities and rejection checks

Preserve the following hierarchy when making generation tradeoffs: enclosure and shallow material depth first; display/control proportions and readable type second; waveform presence third; icon craft and control grouping fourth; small decorative accents last. A correct palette alone is not a match. Treat this hierarchy as a constraint, not a request to add more decorations.

The footer between ARM and transport is quiet empty chassis. Put design-study names, revision labels, synthetic-data captions, and explanatory sentences in the surrounding Frame UI or accompanying documentation, not in that empty space. Do not add an IDLE button, remove necessary utility controls, or replace vector icons with text merely to simplify generation. State selection belongs to the prototype harness unless a real product control requires it.

At thumbnail size, the dominant shapes should still be a finished enclosure, a strong display, one compressed overview, a distinctly larger ARM action, and compact right-side controls. At full size, inspect the softly rounded control shoulders, outlined ARM circle, consistent icon strokes, visible contact edges, and balanced margins. Reject a bare flat rectangle, harsh trapezoid edge inserts, undersized icon glyphs, identical mirrored waveform envelopes, conspicuous bright baseline strokes, an almost-invisible overview, and a footer filled with incidental text.

These checks address the first generated study's specific failures. Some were underspecified in this guide; others violated rules already present. A future generation must satisfy both the prose and these checks. A revised guide alone does not prove a new rendering matches the reference.

## 18.2. Clearance, sizing and deliberate overlap

Treat controls, labels, data and focus indicators as protected foreground. Metal insets and their lips must stay in quiet chassis areas. Do not let a decorative shoulder enter a control row or approach a button so closely that the two read as one shape. Shorten or reposition the inset before compressing a functional control group. Material depth is subordinate to readability and comfortable spacing.

At the normalized 1140×505 scale, allow at least 6 units of clear space between the visible edges of decoration and foreground, including strokes. Prefer 12–16 units around a prominent inset shoulder or utility row. Leave approximately 12 units between neighboring utility buttons; a tighter group still needs at least 8 units and clear separation at the final display scale. Account for the full outlined silhouette and focus ring, not just the fill. Reserve an unobstructed 6-unit halo for focus indicators. If the available area is too small, simplify or reduce decoration rather than overlap or shrink controls.

Size a dropdown from its longest supported value: measured text width plus left padding, at least 8 units between text and chevron, chevron width, and at least 8 units of right padding. Protect the clipped corner as well as the rectangular bounds. At this scale, a four-character fractional value in 11-unit monospace needs about 64 units of width; use a wider field for longer values. Do not force text into a 40-unit field by removing padding or reducing type. Icons need at least 5–6 units of internal clearance from the outline and diagonal cut.

Allow overlap only when a documented visual purpose establishes depth between non-interactive background layers. A broad underlying enclosure or display bed can contain foreground; that expected containment is not a collision. A decorative plate may occlude another decorative layer. Neither decorative edges nor independent controls may cross foreground content, hit areas or focus indicators. Merely drawing decoration behind a button does not justify an accidental intersection or cramped spacing. Keep layering exceptions local and explicit; never waive collision checks for an entire interface.

Before accepting a generated design, inspect the header, footer and every dropdown at full size and at the intended viewing scale in populated, idle, recording and focus states. Check pairs of neighboring foreground bounds, inset silhouettes and their expanded focus areas. Reject touching outlines, insufficient text-to-chevron gaps, crowded cuts, clipped glyphs and a decorative lip passing through a control. Check the rendering as well as geometry: bounds alone cannot establish comfortable optical spacing.

## 19. Compact AI prompt

Generate a refined Sift Hardware interface from this written specification. Preserve a visible continuous graphite enclosure with softened lower corners, a contact seam and inner rim. Use #272B28 chassis, #1F2422 recess, thin #49534C sage frames, #C8CDC9 text, #929B95 secondary text, #E96B50 coral and #7658AE waveform purple. Give top/bottom metal insets softly eased shoulders, a subtle vertical gradient and a quiet contact lip; reject flat hard trapezoids. At a normalized 1140×505 size, place the display near x18/y73, branding near x32 with a baseline near y52, a 30–32 unit utility row at upper right, a 38-unit-tall ARM action at lower left, and grouped transport at lower right. Use a verified sans-serif monospace; draw 14–18 unit geometric icons as vector paths rather than font glyphs. Keep the footer center empty; put study labels and synthetic provenance outside the device. In idle mode, use a gently varying faint dot field and one compact upper-left instruction, with an empty overview. For populated audio, use two equal-height channels with independent irregular upper/lower excursions, a substantial purple outer envelope and narrower coral interior. Strong preview peaks may occupy 70–85 percent of channel half-height. Use filled paths without outline strokes; never draw a bright full-width coral closing edge. Vary synthetic attack/decay shapes and channel energy rather than repeating damped sawtooths. Render one compact composite overview trace, a fine coordinated cursor and bottom viewport rail. Preserve actual functions, timing alignment and stable chrome across states. Avoid generic HUD decoration, neon, pills, noisy chrome, extra labels, ASCII art and screenshot overlays. Distinguish inferred interactions from observed states. Keep decorative insets clear of controls: minimum 6 units after strokes, preferably 12–16 near shoulders; use roughly 12-unit control gaps. Size dropdowns from measured text plus padding, an 8-unit text-to-chevron gap and protected clipped corners. Shorten decorative insets before compressing controls. Permit only explicitly purposeful background-layer overlaps; protect all foreground, hit areas and focus indicators. Reject collisions in every state and at the intended viewing scale.
