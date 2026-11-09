
import View from "./View.js";

export default class ExpenseListView extends View {
  constructor() {
    super("#expenseList");
  }

  renderData(expenses, members, query = "") {
    const names = new Map(
      members.map(member => [
        member.id,
        member.name
      ])
    );

    const filtered = expenses.filter(expense =>
      expense.title
        .toLowerCase()
        .includes(query.toLowerCase())
    );

    this.render(
      filtered.length
        ? filtered.map(expense => `
            <div class="entry">

              <div>
                <strong>
                  ${View.escape(expense.title)}
                </strong>

                <small>
                  ${View.escape(expense.category)}
                  · Paid by
                  ${View.escape(
                    names.get(expense.payer) || "Unknown"
                  )}
                </small>

                <small>
                  Split with:
                  ${View.escape(
                    expense.participants
                      .map(id => names.get(id))
                      .filter(Boolean)
                      .join(", ")
                  )}
                </small>
              </div>

              <strong>
                ${View.peso(expense.amount)}
              </strong>

              <div class="actions">

                <button
                  class="secondary"
                  data-edit="${View.escape(expense.id)}">
                  Edit
                </button>

                <button
                  class="danger"
                  data-delete="${View.escape(expense.id)}">
                  Delete
                </button>

              </div>

            </div>
          `).join("")
        : `
            <p class="empty">
              No expenses recorded yet.
            </p>
          `
    );
  }

  onAction(handler) {
    this.root.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit]");
      const remove = event.target.closest("[data-delete]");

      if (edit) {
        handler("edit", edit.dataset.edit);
      }

      if (remove) {
        handler("delete", remove.dataset.delete);
      }
    });
  }
}
