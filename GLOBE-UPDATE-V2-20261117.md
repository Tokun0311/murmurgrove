# Globe refinement v2

- Replaced CPU per-pixel globe with GPU WebGL shader.
- Rendered source vector paths at 4080 × 1768 pixels for sharper zoom.
- Removed the square map frame and grey panel; globe sits on white.
- Limited zoom so the sphere remains entirely on screen.
- Preserved region hover/click, institution details, filter buttons, drag, wheel, keyboard controls.
- WebGL required; browser will show a message if unavailable.
