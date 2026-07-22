// The Kuzana brand mark - three ascending arcs (Focus Blue, Coral,
// Gold), tallest to shortest left-to-right. Per the brand guidelines:
// "Acceleration. Compounding improvement. Sunrise on the Kenyan coast."
// Recreated as inline SVG (the guide only ships a rendered image, no
// vector file) so it repaints correctly in both light and dark theme
// without needing separate asset exports.
export default function KuzanaMark({ className }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 18 113 C 18 77 23 36 59 9 C 47 30 41 66 41 113 Z" fill="#4a6290" />
      <path d="M 37 113 C 37 84 45 53 76 33 C 65 49 58 78 58 113 Z" fill="#fe7272" />
      <path d="M 54 113 C 57 94 68 76 96 63 C 85 77 77 95 75 113 Z" fill="#fdc469" />
    </svg>
  );
}
