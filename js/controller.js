
// CONTROLLER — connects Model and Views

import * as model from "./model.js";

import View from "./views/View.js";
import SummaryView from "./views/SummaryView.js";
import ExpenseFormView from "./views/ExpenseFormView.js";
import ExpenseListView from "./views/ExpenseListView.js";
import BalanceView from "./views/BalanceView.js";

const $ = selector => document.querySelector(selector);

const summary = new SummaryView();
const form = new ExpenseFormView();
const list = new ExpenseListView();
const balance = new BalanceView();

// NOTIFICATION

function notify(message) {
  const element = $("#toast");

  element.textContent = message;
  element.hidden = false;

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}

// RUN ACTION WITH VALIDATION

function run(action, errorSelector) {
  try {
    action();
    View.error(errorSelector);
    refresh();
  } catch (error) {
    View.error(errorSelector, error.message);
  }
}

// PAGE NAVIGATION

function page(name) {
  document.querySelectorAll(".page").forEach(element => {
    element.classList.toggle(
      "active",
      element.id === name
    );
  });

  document.querySelectorAll("[data-page]").forEach(element => {
    element.classList.toggle(
      "active",
      element.dataset.page === name
    );
  });

  window.scrollTo(0, 0);
}

// REFRESH ALL DISPLAYS

function refresh() {
  const state = model.state;

  summary.renderData({
    state,
    members: model.memberBudgets(),
    spent: model.totalSpent()
  });

  summary.renderMemberNames(state.members);

  const full =
    state.count === null ||
    state.members.length >= state.count;

  $("#memberName").disabled = full;
  $("#memberForm button").disabled = full;

  if (!form.editId) {
    form.renderMembers(state.members);
  }

  list.renderData(
    state.expenses,
    state.members,
    $("#search").value
  );

  balance.renderData({
    members: state.members,
    ...model.balances(),
    settlements: state.settlements
  });
}

// GROUP SETTINGS

function settingsValues() {
  return {
    tripName: $("#tripName").value,
    budget: $("#budget").value,
    count: $("#count").value
  };
}

$("#settingsForm").addEventListener("submit", event => {
  event.preventDefault();

  run(() => {
    model.saveSettings(settingsValues());
    notify("Trip settings saved!");
  }, "#settingsError");
});

// ADD MEMBER

$("#memberForm").addEventListener("submit", event => {
  event.preventDefault();

  run(() => {
    model.addMember($("#memberName").value);

    $("#memberName").value = "";

    notify("Member added!");
  }, "#memberError");
});

// REMOVE MEMBER

$("#memberList").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");

  if (
    button &&
    confirm("Remove this member?")
  ) {
    run(() => {
      model.removeMember(button.dataset.remove);

      notify("Member removed!");
    }, "#memberError");
  }
});

// ADD OR EDIT EXPENSE

form.onSave(values => {
  run(() => {
    model.saveExpense(values);

    form.clear(model.state.members);

    notify("Expense saved. Budgets updated!");
  }, "#expenseError");
});

// CANCEL EDIT

form.onCancel(() => {
  form.clear(model.state.members);
});

// EDIT OR DELETE EXPENSE

list.onAction((action, id) => {
  if (action === "edit") {
    const expense = model.state.expenses.find(
      item => item.id === id
    );

    if (expense) {
      form.edit(expense);

      page("expenses");

      $("#expenseForm").scrollIntoView({
        behavior: "smooth"
      });
    }

  } else if (
    confirm("Delete this expense?")
  ) {
    run(() => {
      model.deleteExpense(id);

      if (form.editId === id) {
        form.clear(model.state.members);
      }

      notify("Expense deleted.");
    }, "#expenseError");
  }
});

// SEARCH EXPENSES

$("#search").addEventListener("input", () => {
  list.renderData(
    model.state.expenses,
    model.state.members,
    $("#search").value
  );
});

// SETTLE DEBTS

// RECORD FULL OR PARTIAL SETTLEMENT

balance.onSettle(({ from, to, amount, max }) => {
  const payment = Number(amount);

  if (
    String(amount).trim() === "" ||
    !Number.isFinite(payment) ||
    payment <= 0
  ) {
    notify("Please enter a repayment amount.");
    return;
  }

  if (Math.round(payment * 100) > max) {
    notify("Payment exceeds the outstanding balance.");
    return;
  }

  try {
    model.settle(from, to, amount);

    refresh();

    notify("Payment recorded successfully!");
  } catch (error) {
    notify(error.message);
  }
});


// UNDO SETTLEMENT

balance.onUndo(id => {
  if (confirm("Undo this repayment?")) {
    model.undoSettlement(id);

    refresh();

    notify("Repayment undone.");
  }
});

// START A NEW TRIP

$("#newTrip").addEventListener("click", () => {
  const confirmed = confirm(
    "Delete all saved trip information and start blank?"
  );

  if (!confirmed) {
    return;
  }

  model.resetTrip();

  form.clear([]);

  $("#settingsForm").reset();
  $("#memberForm").reset();

  $("#search").value = "";

  View.error("#settingsError");
  View.error("#memberError");
  View.error("#expenseError");

  refresh();

  page("group");

  notify("New blank trip ready.");
});

// NAVIGATION BUTTONS

document.querySelectorAll(
  "[data-page], [data-go]"
).forEach(button => {
  button.addEventListener("click", () => {
    page(
      button.dataset.page ||
      button.dataset.go
    );
  });
});

// EXPORT CSV

$("#export").addEventListener("click", () => {
  if (!model.state.expenses.length) {
    notify("No expenses to export.");
    return;
  }

  const names = new Map(
    model.state.members.map(member => [
      member.id,
      member.name
    ])
  );

  const rows = [
    [
      "Expense",
      "Category",
      "Amount",
      "Paid By",
      "Split With"
    ],

    ...model.state.expenses.map(expense => [
      expense.title,
      expense.category,
      (expense.amount / 100).toFixed(2),
      names.get(expense.payer),
      expense.participants
        .map(id => names.get(id))
        .join("; ")
    ]),

    [],

    [
      "Member",
      "Starting Budget",
      "Gastos",
      "Remaining Budget"
    ],

    ...model.memberBudgets().map(member => [
      member.name,

      member.budget === null
        ? ""
        : (member.budget / 100).toFixed(2),

      (member.spent / 100).toFixed(2),

      member.remaining === null
        ? ""
        : (member.remaining / 100).toFixed(2)
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => {
      let text = String(value ?? "");

      if (/^\s*[=+@-]/.test(text)) {
        text = "'" + text;
      }

      return '"' +
        text.replace(/"/g, '""') +
        '"';
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\ufeff", csv],
    {
      type: "text/csv;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "ambagala-expenses.csv";

  document.body.appendChild(link);

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
});

// LOAD SAVED TRIP

$("#tripName").value = model.state.tripName;

$("#budget").value =
  model.state.budget === null
    ? ""
    : (model.state.budget / 100).toFixed(2);

$("#count").value =
  model.state.count ?? "";

refresh();
page("home");
