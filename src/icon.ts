export const SKILLFLOW_ICON_ID = "skillflow";

// Bolt (a Skill firing) flowing into a menu list (one-click menu items).
// Obsidian's addIcon() fixes custom icons to a 100 x 100 viewBox and sets no
// default fill/stroke, so the original 24 x 24 design is scaled by 100/24
// and each shape carries its own fill/stroke.
export const SKILLFLOW_ICON_SVG = `
  <path d="M29.17 12.5L8.33 55H27.08L25 83.33L45.83 40.83H27.08Z" fill="currentColor"/>
  <g stroke="currentColor" stroke-width="8.33" stroke-linecap="round">
    <line x1="54.17" y1="29.17" x2="87.5" y2="29.17"/>
    <line x1="54.17" y1="50" x2="87.5" y2="50"/>
    <line x1="54.17" y1="70.83" x2="87.5" y2="70.83"/>
  </g>
`;
