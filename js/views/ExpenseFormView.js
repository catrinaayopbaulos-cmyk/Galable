
import View from "./View.js";

export default class ExpenseFormView extends View {
  constructor() {
    super("#participants");

    this.form = document.querySelector("#expenseForm");
    this.editId = null;
  }

  renderMembers(members) {
    const payer = document.querySelector("#payer");
    const previousPayer = payer.value;

    const selected = new Set(
      [...this.root.querySelectorAll("input:checked")]
        .map(input => input.value)
    );

    payer.innerHTML =
      '<option value="">Select a member</option>' +
      members.map(member => `
        <option value="${View.escape(member.id)}">
          ${View.escape(member.name)}
        </option>
      `).join("");

    if (
      members.some(
        member => member.id === previousPayer
      )
    ) {
      payer.value = previousPayer;
    }

    this.render(
      members.length
        ? members.map(member => `
            <label>
              <input
                type="checkbox"
                value="${View.escape(member.id)}"
                ${
                  selected.has(member.id)
                    ? "checked"
                    : ""
                }>

              ${View.escape(member.name)}
            </label>
          `).join("")
        : `
            <p class="empty">
              Add members first.
            </p>
          `
    );
  }

  values() {
    return {
      id: this.editId,

      title:
        document.querySelector("#expenseName").value,

      amount:
        document.querySelector("#expenseAmount").value,

      category:
        document.querySelector("#category").value,

      payer:
        document.querySelector("#payer").value,

      participants: [
        ...this.root.querySelectorAll("input:checked")
      ].map(input => input.value)
    };
  }

  edit(expense) {
    this.editId = expense.id;

    document.querySelector("#expenseName").value =
      expense.title;

    document.querySelector("#expenseAmount").value =
      (expense.amount / 100).toFixed(2);

    document.querySelector("#category").value =
      expense.category;

    document.querySelector("#payer").value =
      expense.payer;

    this.root.querySelectorAll("input").forEach(input => {
      input.checked =
        expense.participants.includes(input.value);
    });

    document.querySelector("#formTitle").textContent =
      "Edit Expense";

    document.querySelector("#expenseSubmit").textContent =
      "Save Changes";

    document.querySelector("#cancelEdit").hidden =
      false;
  }

  clear(members) {
    this.editId = null;
    this.form.reset();

    this.root.querySelectorAll("input").forEach(input => {
      input.checked = false;
    });

    this.renderMembers(members);

    document.querySelector("#formTitle").textContent =
      "Add Expense";

    document.querySelector("#expenseSubmit").textContent =
      "+ Add Expense";

    document.querySelector("#cancelEdit").hidden =
      true;

    View.error("#expenseError");
  }

  onSave(handler) {
    this.form.addEventListener("submit", event => {
      event.preventDefault();
      handler(this.values());
    });
  }

  onCancel(handler) {
    document.querySelector("#cancelEdit")
      .addEventListener("click", handler);
  }
}
