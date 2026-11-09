
// BASE VIEW — shared rendering utilities

export default class View {
  constructor(root) {
    this.root = document.querySelector(root);
  }

  static escape(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
    );
  }

  static peso(cents) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(cents / 100);
  }

  static error(selector, message = "") {
    document.querySelector(selector).textContent = message;
  }

  render(html) {
    this.root.innerHTML = html;
  }
}
