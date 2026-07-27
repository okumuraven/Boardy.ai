// Set the saved theme before first paint - avoids a flash of the light
// default for a returning visitor who chose dark (ThemeToggle sets the
// same attribute/key going forward). Kept as an external file (not
// inline in index.html) so it's covered by CSP's script-src 'self'
// without needing a content hash.
(function () {
  var saved = localStorage.getItem("kuzana-theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
})();
