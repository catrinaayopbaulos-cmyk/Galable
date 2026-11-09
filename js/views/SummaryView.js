
import View from "./View.js";

export default class SummaryView extends View {
  constructor() {
    super("#homeCards");
  }

  renderMemberNames(members) {
    document.querySelector("#memberList").innerHTML =
      members.length
        ? members.map(member => `
            <span class="chip">
              ${View.escape(member.name)}

              <button
                type="button"
                data-remove="${View.escape(member.id)}"
                title="Remove member">
                ×
              </button>
            </span>
          `).join("")
        : '<p class="empty">No members added yet.</p>';
  }

  renderData({ state, members, spent }) {
    const fmt = View.peso;

    const amount = value =>
      value === null ? "—" : fmt(value);

    document.querySelector("#homeBudget").textContent =
      amount(state.budget);

    document.querySelector("#homeSpent").textContent =
      state.expenses.length ? fmt(spent) : "—";

    document.querySelector("#homeRemaining").textContent =
      state.budget === null
        ? "—"
        : fmt(state.budget - spent);

    document.querySelector("#homeCount").textContent =
      state.count ?? "—";

    document.querySelector("#sideEach").textContent =
      state.budget === null || state.count === null
        ? "—"
        : fmt(Math.floor(state.budget / state.count));

    const cards = members.length
      ? members.map(member => {
          const percent = member.budget
            ? Math.round(
                member.spent / member.budget * 100
              )
            : 0;

          const over =
            member.remaining !== null &&
            member.remaining < 0;

          return `
            <article class="member-card">

              <div class="member-title">
                <span class="avatar">
                  ${View.escape(
                    member.name[0].toUpperCase()
                  )}
                </span>

                ${View.escape(member.name)}
              </div>

              <small>REMAINING BUDGET</small>

              <strong class="remaining ${over ? "over" : ""}">
                ${amount(member.remaining)}
              </strong>

              <div class="bar">
                <div
                  class="fill ${over ? "over" : ""}"
                  style="width:${Math.max(
                    0,
                    Math.min(100, percent)
                  )}%">
                </div>
              </div>

              <div class="detail">
                <span>Starting Budget</span>
                <strong>${amount(member.budget)}</strong>
              </div>

              <div class="detail">
                <span>Gastos</span>
                <strong>${fmt(member.spent)}</strong>
              </div>

              <div class="detail">
                <span>Budget Used</span>
                <strong>
                  ${
                    member.budget === null
                      ? "—"
                      : percent + "%"
                  }
                </strong>
              </div>

              ${
                over
                  ? '<p class="error">Over individual budget</p>'
                  : ""
              }

            </article>
          `;
        }).join("")
      : `
          <p class="empty">
            Add members to see their remaining budgets.
          </p>
        `;

    this.render(cards);

    document.querySelector("#groupCards").innerHTML =
      cards;

    document.querySelector("#balanceCards").innerHTML =
      cards;
  }
}
