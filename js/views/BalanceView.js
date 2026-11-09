import View from "./View.js";

export default class BalanceView extends View {
  constructor() {
    super("#debts");
  }

  renderData({ members, net, debts, settlements }) {
    const names = new Map(
      members.map(member => [member.id, member.name])
    );

    const name = id => View.escape(names.get(id) || "Unknown");

    this.render(
      debts.length
        ? debts.map(debt => `
            <div class="entry settlement-entry">
              <div class="settlement-details">
                <strong>
                  ${name(debt.from)} owes ${name(debt.to)}
                </strong>

                <small>
                  Outstanding: ${View.peso(debt.amount)}
                </small>
              </div>

              <div class="settlement-controls">
                <label>
                  Amount to Pay (₱)
                  <input
                    class="settlement-amount"
                    type="number"
                    min="0.01"
                    max="${(debt.amount / 100).toFixed(2)}"
                    step="0.01"
                    placeholder="Enter repayment amount">
                </label>

                <button
                  type="button"
                  class="primary"
                  data-settle
                  data-from="${View.escape(debt.from)}"
                  data-to="${View.escape(debt.to)}"
                  data-max="${debt.amount}">
                  Record Payment
                </button>
              </div>
            </div>
          `).join("")
        : `
            <p class="empty">
              All balances are settled!
              No outstanding payments.
            </p>
          `
    );

    document.querySelector("#net").innerHTML =
      members.length
        ? members.map(member => {
            const value = net.get(member.id) || 0;

            const status =
              value < 0
                ? "Owes"
                : value > 0
                  ? "Gets back"
                  : "Settled";

            return `
              <div class="entry">
                <strong>${View.escape(member.name)}</strong>
                <span>
                  ${status} ${View.peso(Math.abs(value))}
                </span>
              </div>
            `;
          }).join("")
        : '<p class="empty">Add members first.</p>';

    document.querySelector("#settlements").innerHTML =
      settlements.length
        ? settlements.map(payment => `
            <div class="entry">
              <div>
                <strong>
                  ${name(payment.from)}
                  paid
                  ${name(payment.to)}
                </strong>

                <small>
                  ${View.peso(payment.amount)}
                </small>
              </div>

              <button
                type="button"
                class="secondary"
                data-undo="${View.escape(payment.id)}">
                Undo
              </button>
            </div>
          `).join("")
        : '<p class="empty">No repayments recorded yet.</p>';
  }

  onSettle(handler) {
    this.root.addEventListener("click", event => {
      const button = event.target.closest("[data-settle]");

      if (!button) return;

      const row = button.closest(".settlement-entry");
      const input = row.querySelector(".settlement-amount");

      handler({
        from: button.dataset.from,
        to: button.dataset.to,
        amount: input.value,
        max: Number(button.dataset.max)
      });
    });
  }

  onUndo(handler) {
    document.querySelector("#settlements")
      .addEventListener("click", event => {
        const button = event.target.closest("[data-undo]");

        if (button) {
          handler(button.dataset.undo);
        }
      });
  }
}