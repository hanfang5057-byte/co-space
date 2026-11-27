/**
 * The CoSpace brand mark as a host-style line glyph.
 *
 * The shell draws its own 16px monochrome line icons, so the plugin's small
 * icons keep the same stroke treatment and only borrow the artwork's content:
 * the open "C" ring interlocking with the offset "O" ring. The geometry is
 * traced from `assets/cospace-icon.svg` (128-unit grid): the rings' center
 * distance, relative radii, and the 267° C opening stay intact, then the pair
 * is centered on the host's 16-unit grid.
 */
export function SpaceIcon({ size = 16, className } = {}) {
  return <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path vectorEffect="non-scaling-stroke" d="M8.58 4.955a4.205 4.205 0 1 0 0 6.09"/>
    <circle vectorEffect="non-scaling-stroke" cx="11.19" cy="8" r="3.335"/>
  </svg>;
}
