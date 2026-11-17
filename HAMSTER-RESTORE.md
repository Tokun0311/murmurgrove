# Hamster cursor: temporarily hidden

The ZiCang hamster PNG files are preserved in `public/cursors/` and the original CSS example remains in `src/styles/cursor-snippet.css`. Neither image is used by the active stylesheet.

The desktop cursor is intentionally invisible; the canvas light trail in `src/layouts/Base.astro` is the only visual pointer feedback. A small light tip indicates the last pointer location briefly. Touch devices and reduced-motion devices retain the default system cursor/interaction behavior.

To restore ZiCang in the future, remove the `cursor:none` override in `src/styles/global.css` and paste the hamster cursor rules from `src/styles/cursor-snippet.css` into `global.css`. Optionally remove/disable the trail script if you no longer want it.
