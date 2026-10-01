# Zebra Modular Interface Style Guide

## 1. Reference and scope

This text-only guide derives from the supplied Zebra 3 synthesizer screenshot. It describes a compact modular workstation: tightly packed charcoal panels, shallow physical controls, understated sans-serif labels, and distinct colors for module families. It can be used to design other applications without the screenshot, its branding, or any image assets. Preserve the visual language rather than copying product names, parameter labels, or audio functions into an unrelated product.

Only one populated, stationary interface is shown. Colors are approximate reconstruction targets; dimensions below are normalized to a workspace approximately 1300 by 920 design units. The exact fonts, materials, parameter values, hover behavior, keyboard focus, disabled behavior, and animation cannot be established from the image. Interaction rules in section 12 are proposed extensions, not observed product behavior.

## 2. Overall character

Create an integrated, information-rich instrument panel. Compactness comes from consistent alignment and related controls sharing a surface, rather than from overlapping elements or making text illegibly small. The appearance is quiet and tactile: warm neutral charcoal, fine seams, softly rounded module corners, recessed control beds, and gentle highlights on knobs and sliders.

The interface has a continuous outer shell. Modules occupy most of its usable area, with narrow gutters and little redundant padding. A central routing surface is visibly deeper and darker than neighboring parameter panels. Colored module headings and a few active indicators provide orientation; large surfaces remain gray. Dense information is organized into repeated rows and columns, with clear local groupings. Avoid spacious dashboard cards, oversized headings, empty promotional regions, ornamental telemetry, or science-fiction brackets.

## 3. Palette and color roles

Use shell charcoal #262524 and deep workspace #181716. Use module body #393837, with restrained shading from upper surface #424140 to lower surface #302F2E. Use routing slots and empty beds #242322. Thin seams approach #171615; subtle upper edges approach #51504E. Knob bodies are neutral graphite near #414544, with highlights around #6B706E and recessed centers near #292D2C.

Primary text is muted off-white #D3D3CF. Secondary labels approach #A5A5A0; supporting metadata may be #84847F. Use #E8E8E2 sparingly for a prominent product title or essential selected text. Essential labels must remain readable; the screenshot's dim microtext is not a requirement to reproduce inadequate contrast.

Use lavender #B5A1E5 for oscillator-like or primary editing modules, cyan #55C3E4 for envelope-like or review modules, pale lime #BCD887 for filter-like or completed/accepted categories, turquoise #9EDDD7 for secondary processing families, yellow #EFC94F for sequence families, and magenta #C267D4 for mapping families. These colors represent stable categories, not a decorative palette to distribute randomly. An application may use only the categories it actually has. Map colors once and repeat that mapping in headings, tabs, small status marks, and data traces. Do not give every button its own color.

Most colored elements are text, a small glyph, a short label strip, or a narrow parameter arc. Avoid saturated full-panel fills. A selected routing label may use a desaturated color-tinted fill, approximately 15–25 percent accent mixed into its charcoal base. Do not treat lavender, cyan, and lime as interchangeable selection colors.

## 4. Composition and density

At the reference scale, the top navigation occupies approximately 40–45 units. The principal workspace extends for roughly 600–615 units beneath it. A narrow section tab rail separates it from a lower auxiliary workspace approximately 200 units tall, followed by a thin bottom assignment strip. The upper workspace divides into a left parameter column near 36 percent of width, a center routing column near 26 percent, and a right modulation column near 38 percent. These proportions describe this screenshot; they are not mandatory for another product.

Use a hierarchy of shell, working region, module, and control group. In a different application, derive regions from real tasks: editor, relationships or routing, contextual properties, and auxiliary tools. Keep the primary task dominant. Use a central matrix only when actual relationships justify it, and a lower strip only when secondary work needs one.

Modules align tightly to the shared grid with gutters around 6–10 units and local padding around 8–12. A module title belongs at its top-left edge rather than in a separate oversized header. Titles, local mode selectors, control labels, and values form a compact row structure. Keep control centers and text baselines aligned across neighboring groups. Do not manufacture empty space to equalize unequal module heights; preserve purposeful variation while keeping the outer grid coherent.

## 5. Surface and depth

Use shallow rounded rectangles with radii around 5–8 units. A subtle vertical gradient and a faint top highlight are sufficient to distinguish a module from the shell. Its lower edge has a low-contrast contact shadow; the effect should feel integrated rather than like a floating card. Do not stack several bright outlines around every panel.

Routing areas and inactive cells are darker. They may use a very faint fine-grained surface, but texture is optional and must remain imperceptible at normal viewing distance. Use a neutral gradient or tiny procedural texture rather than an external bitmap. Heavy grain, diagonal hatch, glowing outlines, reflective chrome, metallic scratches, and pronounced embossed lettering are outside this style.

Light direction is consistent: upper edges and the upper-left side of rounded controls are slightly lighter, while lower-right contact edges are darker. Depth is local and shallow. Knobs, fader beds, and recessed matrices use different surface values instead of large drop shadows.

## 6. Typography

Use a compact, plainly readable sans-serif throughout ordinary controls. Start with Helvetica Neue, Arial, or a comparable neutral interface sans-serif, and inspect the rendered fallback. The screenshot does not establish an exact font. Avoid serif lettering, typewriter faces, wide futuristic display fonts, and monospace for the entire interface.

At the normalized scale, module headings are around 17–20 units, ordinary control labels and values around 11–13, tabs around 12–14, and secondary metadata around 8–10. Product identity may be around 32–38 and heavier, but that is one isolated anchor, not a repeated heading treatment. Adapt identity size to the host header without enlarging it.

Module headings use a regular or medium weight and their family color. Ordinary labels use muted gray; selected values are brighter. Keep tracking near normal, using only modest spacing for short labels. Title case and compact abbreviations coexist; do not make everything uppercase. Tabular digits are useful for numeric readouts, while short identifiers can use monospace if their meaning requires it.

Do not inherit typography from a previous futurist style. Explicitly set font family, weight, and size on native controls. Long revision names or values need enough measured width, a shorter truthful display label, or an accessible expanded presentation. Never crop the part that distinguishes one revision from another.

## 7. Knobs and compact parameter controls

The main rotary controls are small, approximately 32–38 units in diameter, with secondary knobs around 24–28. Build them from a dark circular control bed, a thin restrained edge, a subtly lit graphite face, and one short light pointer. Pointer direction communicates value. Do not replace the face with a large flat colored disk or exaggerated chrome knob.

A label sits above the control; a value or assignment can sit below. The control is centered within its own column. A colored arc is an occasional functional modulation or value indication, not mandatory ornament on every knob. A small nearby modulation glyph or amount control is appropriate only when the product supports that relationship.

For interfaces without rotary parameters, translate this treatment into compact recessed selectors, toggles, or sliders with neutral surfaces and an unambiguous selected value. Do not add fake audio knobs to navigation, export actions, or feedback tools simply to resemble a synthesizer.

## 8. Faders, selectors, and buttons

Envelope-like faders form an evenly spaced bank of narrow vertical slots. Their dark recessed tracks are approximately 7–12 units wide, with a broader surrounding bed. Small gray horizontal caps read as physical handles. Labels sit above each slot; subdued tick marks connect the bank visually without obscuring handle position. Reproduce this construction only for actual continuous values.

Compact text selectors use quiet fills or nearly transparent beds, with a fine bottom edge and a brighter centered value. Their labels are muted and sit above or immediately beside them. Give text and chevrons separate space: at least 8 units between them and 8–10 at the trailing edge. Visible popup menus need a coherent charcoal surface, legible options, and a clear selected item.

Use rectangular action buttons with modest corners and shallow shading. Ordinary actions stay neutral. Active tabs can be darker with a bright label; selected tools can use a faint family-colored tint and a small border or indicator. Avoid solid saturated buttons across the whole toolbar. Small vector glyphs use simple strokes at a consistent optical weight. Do not use text symbols with unpredictable font rendering for essential icons.

## 9. Routing, matrices, and analytical content

A routing matrix uses repeated dark cells on a shared surface. Thin neutral lines connect actual modules and terminate at compact circular ports or labeled endpoints. Connections should remain readable without becoming the brightest feature. A selected module's short label uses its category color, coordinating with its source panel.

The screenshot's central region shows four lanes with repeated endpoint, output label, pan control, assignment, and level-control groups. Reuse this repeatable lane grammar for real channel or relationship data, not as decorative filler. In a non-audio application, a relationships view can use aligned columns and understated connectors only when it represents genuine dependencies.

Small graphs sit inside the relevant module, not in unrelated floating callouts. A trace may use the module's family color against a darker inset. Keep grid marks subdued and place mode names and discrete options close to the graph. Render real representative data; do not add waveforms where the application has none.

## 10. Tabs, navigation, and auxiliary work

Keep navigation close to its content. The top bar combines product identity, a few primary sections, a current resource name, and small utilities. The lower section rail is thin, continuous, and packed with actual module shortcuts. Selected tabs use a dark bed and brighter label. Category-colored shortcut text or a small glyph can identify the owning family.

The lower workspace shows a routing block, a compact effect module, and a broad unused area. Empty space remains dark and quiet when no module occupies it. Do not fill every unused region with explanatory text, fake metrics, or decoration. Bottom assignment strips contain short real mappings; omit them in products without that function.

## 11. Spacing, boundaries, and overlap prevention

Compact does not mean crowded. Reserve each control's full geometry, label, value, pointer travel, focus indicator, and interaction target before placing a neighbor. Aim for 6–10 units between visible neighboring controls, 8–12 at module edges, and at least 6 between text and unrelated foreground geometry. A focus ring must have room to remain visible or be drawn clearly within its own control.

Keep decoration inside the owning panel's background layer. Connectors may deliberately cross an empty routing surface; they must not cross labels, obscure a fader cap, invade a button's hit area, or imply a false relationship. Decorative depth never excuses functional overlap.

At smaller widths, reorganize module columns, wrap aligned control rows, or provide scrolling within a bounded working region. Do not shrink the entire application until labels become unreadable. Preserve sensible hit targets; 32–38-unit visual knobs can have larger nonoverlapping targets. Touch interfaces need approximately 44-unit targets and greater spacing. Check menus, selected states, long text, and dense data separately.

## 12. Interaction states: proposed extensions

Resting controls use graphite surfaces and muted labels. Hover adds a subtle lightening or edge highlight without moving layout. A pressed control darkens its bed or lowers the face's contrast; use minimal travel if any. Selected controls brighten their label and use a restrained tint or small family-colored indicator. A keyboard focus ring is visible and distinct from both selection and category color.

Disabled controls keep their shape and readable relationship to the panel, but reduce emphasis and stop responding. Avoid reducing essential explanatory text to the point that it disappears. Validation errors use a localized warning label or icon, with actual corrective text; do not turn an entire module red. Loading states belong in the affected region and preserve layout. Reduced-motion users receive stable feedback without decorative movement.

For feedback or issue workflows, combine status text with a small marker rather than relying on color alone. Selection must remain distinguishable from resolved status. Keep undo, persistence, and export behavior independent of presentation. These rules describe a compatible implementation, not behavior demonstrated by the screenshot.

## 13. Applying the guide to Frame

Keep Frame's functional workspace: compact design/revision/guide selection, review and view controls, tool rail, canvas, feedback panel, and status footer. Change its visual system to neutral charcoal, shallow rounded panel surfaces, compact sans-serif typography, and modest module accents. The content canvas keeps the selected design's own styling; do not recolor exported designs when styling the host.

Use lavender for editing/tool selection, cyan for the feedback or review family, and pale lime for resolved status. Keep unrelated actions neutral. Express selection through a subtle tint and brighter edge, not a large orange fill. Replace the angular white identity plate with a simple strong Frame wordmark integrated into the top bar. Preserve the full revision identity and automatic revision loading. Do not introduce rotary controls, envelope sliders, routing wires, or synthesizer parameter names into Frame unless an actual new feature requires them.

## 14. Generation and acceptance rules

Describe real content and actions first, then construct the compact grid and module groupings. Choose explicit sans-serif typography and a neutral material palette before adding colored headings. Build tactile control detail at the intended viewing scale. Use vector or code-native shapes and subtle gradients; never use the reference screenshot as a background.

A successful result is densely organized, readable, predominantly charcoal, subtly dimensional, and easy to scan by module family. Inspect every visible state for foreground overlaps, clipped distinguishing text, uneven control alignment, unreadable small labels, excessive color, and fabricated technical detail. Check both a populated workspace and an empty one. For an implemented product, verify keyboard use, selection, filtering, dialogs, undo, saved state, and exports after the visual changes.

## 15. Compact AI prompt

Design a compact modular workstation using the Zebra Modular style. Use warm neutral charcoal, tightly aligned module panels with shallow 5–8-unit corners, restrained vertical gradients and contact seams, compact neutral sans-serif labels, muted off-white values, and stable family-colored headings. Keep most surfaces gray. Use small tactile graphite knobs or faders only for real continuous parameters, recessed understated selectors for discrete values, thin genuine routing lines only where relationships require them, and dark selected tabs with bright labels. Preserve real task hierarchy, measured label and chevron clearance, distinct keyboard focus, nonoverlapping hit targets, and readable type at the intended scale. Reflow dense modules at narrow widths. Avoid neon, orange HUD framing, broad promotional whitespace, heavy bevels, arbitrary telemetry, duplicated controls, and copying Zebra branding or audio functions into unrelated products. Implement inferred states explicitly as extensions; do not claim they were visible in the reference. For Frame, restyle its existing functional workspace with lavender editing, cyan feedback/review, and lime resolved status while preserving each canvas design's independent appearance and all review behavior.
