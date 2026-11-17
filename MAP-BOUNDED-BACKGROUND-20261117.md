# Geographic index background boundary fix

- Removed the redundant region helper line beneath the country index.
- In focused mode, the enlarged WebGL globe is absolutely positioned within the geographic-index section rather than fixed to the viewport.
- Its display is clipped at the end of the geographic section and cannot continue behind the institution list as the page scrolls.
- The institution list has an opaque white reading surface.
- Existing header, country index, active navigation effects, city panels, and zoom +/- controls are preserved.
- The normal/global view retains its left-column globe dimensions.

Static TS syntax transpilation passed. No browser visual test was performed.
