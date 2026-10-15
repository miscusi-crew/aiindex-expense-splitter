"use strict";
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: works until reload */ }
}

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s) => { const n = Number(String(s).replace(/[\s,]/g, "")); return Number.isFinite(n) && n >= 0 ? n : 0; };

const $ = (id) => document.getElementById(id);
let data = load("splitter", null) ?? {
  people: ["Ana", "Ben", "Chloe"],
  expenses: [{ what: "Cabin", amount: 360, payer: "Ana" }, { what: "Groceries", amount: 96.5, payer: "Ben" }, { what: "Fuel", amount: 54, payer: "Chloe" }],
};

/** Greedy settle: biggest debtor pays biggest creditor, which keeps the number of payments small. */
function settle(bal) {
  const debt = Object.entries(bal).filter(([, v]) => v < -0.005).map(([p, v]) => [p, -v]).sort((a, b) => b[1] - a[1]);
  const cred = Object.entries(bal).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i][1], cred[j][1]);
    out.push([debt[i][0], cred[j][0], amt]);
    debt[i][1] -= amt;
    cred[j][1] -= amt;
    if (debt[i][1] < 0.005) i++;
    if (cred[j][1] < 0.005) j++;
  }
  return out;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function render() {
  save("splitter", data);
  $("people").innerHTML = data.people.map((p, i) => `<span class="chip">${esc(p)}<button data-p="${i}" aria-label="Remove ${esc(p)}">✕</button></span>`).join("");
  $("payer").innerHTML = data.people.map((p) => `<option>${esc(p)}</option>`).join("");
  $("exps").innerHTML = data.expenses.map((e, i) => `<tr><td>${esc(e.what)}</td><td>${esc(e.payer)}</td><td class="n">${money.format(e.amount)}</td><td><button class="del" data-e="${i}" aria-label="Remove">✕</button></td></tr>`).join("") || '<tr><td colspan="4">No expenses yet.</td></tr>';
  const total = data.expenses.reduce((s, e) => s + e.amount, 0);
  const share = data.people.length ? total / data.people.length : 0;
  const bal = Object.fromEntries(data.people.map((p) => [p, -share]));
  for (const e of data.expenses) if (e.payer in bal) bal[e.payer] += e.amount;
  $("balances").innerHTML = data.people.map((p) => `<tr><td>${esc(p)}</td><td class="n ${bal[p] >= 0 ? "pos" : "neg"}">${bal[p] >= 0 ? "+" : "−"}${money.format(Math.abs(bal[p]))}</td></tr>`).join("") + `<tr><td><b>Total</b> (${money.format(share)} each)</td><td class="n"><b>${money.format(total)}</b></td></tr>`;
  const moves = settle(bal);
  $("settle").innerHTML = moves.length ? moves.map(([from, to, amt]) => `<li><b>${esc(from)}</b> pays <b>${esc(to)}</b> ${money.format(amt)}</li>`).join("") : "<li>Everyone is square.</li>";
}

$("add-person").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = $("person").value.trim();
  if (n && !data.people.includes(n)) data.people.push(n);
  $("person").value = "";
  render();
});
$("add-exp").addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = num($("amount").value);
  if (!amount || !$("payer").value) return;
  data.expenses.push({ what: $("what").value.trim() || "Expense", amount, payer: $("payer").value });
  $("what").value = $("amount").value = "";
  render();
});
$("people").addEventListener("click", (e) => {
  const b = e.target.closest("[data-p]");
  if (!b) return;
  const p = data.people[b.dataset.p];
  data.people.splice(b.dataset.p, 1);
  data.expenses = data.expenses.filter((x) => x.payer !== p);
  render();
});
$("exps").addEventListener("click", (e) => {
  const b = e.target.closest("[data-e]");
  if (b) { data.expenses.splice(b.dataset.e, 1); render(); }
});
$("reset").addEventListener("click", () => { if (confirm("Clear all people and expenses?")) { data = { people: [], expenses: [] }; render(); } });
render();
