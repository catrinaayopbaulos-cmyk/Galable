
// MODEL — data, validation, calculations and storage

const KEY = "ambagala-week5-v1";

const blank = () => ({
  tripName: "",
  budget: null,
  count: null,
  members: [],
  expenses: [],
  settlements: []
});

function restore() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));

    if (!x || typeof x !== "object") {
      return blank();
    }

    return {
      tripName:
        typeof x.tripName === "string" ? x.tripName : "",

      budget:
        Number.isSafeInteger(x.budget) && x.budget > 50000
          ? x.budget
          : null,

      count:
        Number.isInteger(x.count) &&
        x.count >= 1 &&
        x.count <= 20
          ? x.count
          : null,

      members:
        Array.isArray(x.members) ? x.members : [],

      expenses:
        Array.isArray(x.expenses) ? x.expenses : [],

      settlements:
        Array.isArray(x.settlements) ? x.settlements : []
    };
  } catch {
    return blank();
  }
}

export const state = restore();

const persist = () => {
  localStorage.setItem(KEY, JSON.stringify(state));
};

const id = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random()}`;

const validAmount = value => {
  const n = Number(value);

  return (
    String(value).trim() !== "" &&
    Number.isFinite(n) &&
    n > 0 &&
    n <= 100000000 &&
    Math.abs(n * 100 - Math.round(n * 100)) < 1e-7
  );
};

const cents = value => Math.round(Number(value) * 100);

// SAVE GROUP SETTINGS

export function saveSettings({ tripName, budget, count }) {
  if (!validAmount(budget) || Number(budget) <= 500) {
    throw Error("Group budget must be more than ₱500.");
  }

  if (
    String(count).trim() === "" ||
    !Number.isInteger(Number(count)) ||
    Number(count) < 1 ||
    Number(count) > 20
  ) {
    throw Error("Number of members must be between 1 and 20.");
  }

  if (Number(count) < state.members.length) {
    throw Error(
      "Remove extra members before reducing the member count."
    );
  }

  state.tripName = String(tripName).trim();
  state.budget = cents(budget);
  state.count = Number(count);

  persist();
}

// ADD MEMBER

export function addMember(name) {
  name = String(name).trim();

  if (state.count === null) {
    throw Error("Save your trip settings first.");
  }

  if (!name || name.length > 70) {
    throw Error("Enter a valid member name.");
  }

  if (state.members.length >= state.count) {
    throw Error("All member slots are filled.");
  }

  const duplicate = state.members.some(
    member => member.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    throw Error("That name is already added.");
  }

  state.members.push({
    id: id(),
    name
  });

  persist();
}

// REMOVE MEMBER

export function removeMember(memberId) {
  const used = state.expenses.some(
    expense =>
      expense.payer === memberId ||
      expense.participants.includes(memberId)
  );

  const settled = state.settlements.some(
    payment =>
      payment.from === memberId ||
      payment.to === memberId
  );

  if (used || settled) {
    throw Error(
      "Delete this member's expenses and undo their settlements first."
    );
  }

  state.members = state.members.filter(
    member => member.id !== memberId
  );

  persist();
}

// CALCULATE EXPENSE SHARES

export function shares(expense) {
  const people = [...new Set(expense.participants)]
    .filter(memberId =>
      state.members.some(member => member.id === memberId)
    );

  if (!people.length) {
    return [];
  }

  const base = Math.floor(
    expense.amount / people.length
  );

  const extra = expense.amount % people.length;

  return people.map((memberId, index) => ({
    id: memberId,
    amount: base + (index < extra ? 1 : 0)
  }));
}

// CALCULATE EACH MEMBER'S BUDGET

export function memberBudgets() {
  const used = new Map(
    state.members.map(member => [member.id, 0])
  );

  state.expenses.forEach(expense => {
    shares(expense).forEach(share => {
      used.set(
        share.id,
        used.get(share.id) + share.amount
      );
    });
  });

  const base =
    state.budget === null || state.count === null
      ? null
      : Math.floor(state.budget / state.count);

  const extra =
    base === null ? 0 : state.budget % state.count;

  return state.members.map((member, index) => {
    const budget =
      base === null
        ? null
        : base + (index < extra ? 1 : 0);

    const spent = used.get(member.id);

    return {
      ...member,
      budget,
      spent,
      remaining:
        budget === null ? null : budget - spent
    };
  });
}

// TOTAL SPENT

export function totalSpent() {
  return state.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
}

// ADD OR EDIT EXPENSE

export function saveExpense({
  id: expenseId,
  title,
  amount,
  category,
  payer,
  participants
}) {
  title = String(title).trim();

  if (
    state.budget === null ||
    state.count === null ||
    state.members.length !== state.count
  ) {
    throw Error(
      "Complete the group settings and all member names first."
    );
  }

  if (!title || title.length > 90) {
    throw Error("Enter an expense name.");
  }

  if (!validAmount(amount)) {
    throw Error("Enter a valid positive expense amount.");
  }

  if (!state.members.some(member => member.id === payer)) {
    throw Error("Choose who paid.");
  }

  participants = [...new Set(participants)]
    .filter(memberId =>
      state.members.some(member => member.id === memberId)
    );

  if (!participants.length) {
    throw Error(
      "Check at least one member under Split With."
    );
  }

  const fields = {
    title,
    amount: cents(amount),
    category,
    payer,
    participants
  };

  if (expenseId) {
    const found = state.expenses.find(
      expense => expense.id === expenseId
    );

    if (!found) {
      throw Error("Expense not found.");
    }

    Object.assign(found, fields);
  } else {
    state.expenses.unshift({
      id: id(),
      ...fields
    });
  }

  persist();
}

// DELETE EXPENSE

export function deleteExpense(expenseId) {
  state.expenses = state.expenses.filter(
    expense => expense.id !== expenseId
  );

  persist();
}

// CALCULATE BALANCES

export function balances() {
  const net = new Map(
    state.members.map(member => [member.id, 0])
  );

  state.expenses.forEach(expense => {
    if (!net.has(expense.payer)) {
      return;
    }

    net.set(
      expense.payer,
      net.get(expense.payer) + expense.amount
    );

    shares(expense).forEach(share => {
      net.set(
        share.id,
        net.get(share.id) - share.amount
      );
    });
  });

  state.settlements.forEach(payment => {
    if (
      !net.has(payment.from) ||
      !net.has(payment.to)
    ) {
      return;
    }

    net.set(
      payment.from,
      net.get(payment.from) + payment.amount
    );

    net.set(
      payment.to,
      net.get(payment.to) - payment.amount
    );
  });

  const debtors = state.members
    .filter(member => net.get(member.id) < 0)
    .map(member => ({
      id: member.id,
      left: -net.get(member.id)
    }));

  const creditors = state.members
    .filter(member => net.get(member.id) > 0)
    .map(member => ({
      id: member.id,
      left: net.get(member.id)
    }));

  const debts = [];

  let i = 0;
  let j = 0;

  while (
    i < debtors.length &&
    j < creditors.length
  ) {
    const amount = Math.min(
      debtors[i].left,
      creditors[j].left
    );

    debts.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount
    });

    debtors[i].left -= amount;
    creditors[j].left -= amount;

    if (!debtors[i].left) {
      i++;
    }

    if (!creditors[j].left) {
      j++;
    }
  }

  return { net, debts };
}

// RECORD PAYMENT


export function settle(from, to, amount) {
  if (!validAmount(amount)) {
    throw Error("Enter a valid repayment amount.");
  }

  const paymentCents = cents(amount);

  const debt = balances().debts.find(
    item => item.from === from && item.to === to
  );

  if (!debt) {
    throw Error(
      "This debt is already settled or has changed."
    );
  }

  if (paymentCents > debt.amount) {
    throw Error(
      `Payment cannot exceed ${(
        debt.amount / 100
      ).toFixed(2)} pesos.`
    );
  }

  state.settlements.unshift({
    id: id(),
    from,
    to,
    amount: paymentCents
  });

  persist();
}


// UNDO PAYMENT

export function undoSettlement(settlementId) {
  state.settlements = state.settlements.filter(
    payment => payment.id !== settlementId
  );

  persist();
}

// START NEW TRIP

export function resetTrip() {
  Object.assign(state, blank());
  localStorage.removeItem(KEY);
}
