const STORAGE_KEY = "trades.v1";

const form = document.getElementById("trade-form");
const rows = document.getElementById("trade-rows");
const statsBox = document.getElementById("stats");
const clearBtn = document.getElementById("clear-btn");
const exportBtn = document.getElementById("export-btn");

function readTrades() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function writeTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function calcPnl(trade) {
  const gross =
    trade.side === "long"
      ? (trade.exit - trade.entry) * trade.qty
      : (trade.entry - trade.exit) * trade.qty;
  return gross - trade.fees;
}

function renderStats(trades) {
  const pnlList = trades.map(calcPnl);
  const total = pnlList.reduce((a, b) => a + b, 0);
  const wins = pnlList.filter((x) => x > 0);
  const losses = pnlList.filter((x) => x < 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const profitFactor = losses.length
    ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0))
    : 0;

  const cards = [
    ["Total Trades", trades.length],
    ["Net P/L", `$${total.toFixed(2)}`],
    ["Win Rate", `${winRate.toFixed(1)}%`],
    ["Avg Win", `$${avgWin.toFixed(2)}`],
    ["Avg Loss", `$${avgLoss.toFixed(2)}`],
    ["Profit Factor", profitFactor.toFixed(2)],
  ];

  statsBox.innerHTML = cards
    .map(
      ([label, value]) => `<article class="card"><small>${label}</small><div>${value}</div></article>`
    )
    .join("");
}

function renderTable(trades) {
  rows.innerHTML = trades
    .map((trade, index) => {
      const pnl = calcPnl(trade);
      return `
        <tr>
          <td>${trade.date}</td>
          <td>${trade.symbol}</td>
          <td>${trade.side}</td>
          <td>${trade.entry}</td>
          <td>${trade.exit}</td>
          <td>${trade.qty}</td>
          <td>${trade.fees}</td>
          <td>${trade.tag || "-"}</td>
          <td class="${pnl >= 0 ? "good" : "bad"}">$${pnl.toFixed(2)}</td>
          <td><button data-delete="${index}">Delete</button></td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const trades = readTrades();
  renderStats(trades);
  renderTable(trades);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const trade = {
    date: document.getElementById("date").value,
    symbol: document.getElementById("symbol").value.trim().toUpperCase(),
    side: document.getElementById("side").value,
    entry: Number(document.getElementById("entry").value),
    exit: Number(document.getElementById("exit").value),
    qty: Number(document.getElementById("qty").value),
    fees: Number(document.getElementById("fees").value || 0),
    tag: document.getElementById("tag").value.trim(),
    notes: document.getElementById("notes").value.trim(),
  };

  const trades = readTrades();
  trades.unshift(trade);
  writeTrades(trades);
  form.reset();
  render();
});

rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-delete]");
  if (!button) {
    return;
  }
  const index = Number(button.dataset.delete);
  const trades = readTrades();
  trades.splice(index, 1);
  writeTrades(trades);
  render();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Delete all trades? This cannot be undone.")) {
    return;
  }
  writeTrades([]);
  render();
});

exportBtn.addEventListener("click", () => {
  const trades = readTrades();
  if (!trades.length) {
    alert("No trades to export yet.");
    return;
  }

  const header = ["date", "symbol", "side", "entry", "exit", "qty", "fees", "tag", "notes", "pnl"];
  const lines = trades.map((trade) =>
    [
      trade.date,
      trade.symbol,
      trade.side,
      trade.entry,
      trade.exit,
      trade.qty,
      trade.fees,
      trade.tag,
      trade.notes,
      calcPnl(trade).toFixed(2),
    ]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trade-journal-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

render();
