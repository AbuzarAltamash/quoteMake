if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("SW registered"))
      .catch((err) => console.error("SW registration failed:", err));
  });
}

let items = [];
const MAX_ROWS = 16;

const itemsBody = document.getElementById("itemsBody");
const subtotalEl = document.getElementById("subtotal");
const grandtotalEl = document.getElementById("grandtotal");
const dlLink = document.getElementById("dlLink");

const custName = document.getElementById("custName");
const refNo = document.getElementById("refNo");
const qDate = document.getElementById("qDate");

function addItem(pos = items.length) {
  if (items.length >= MAX_ROWS) return alert("Max 16 items supported.");
  items.splice(pos, 0, { name: "", qty: "", price: "", amount: 0 });
  render();
}
function removeItem(i) {
  items.splice(i, 1);
  render();
}
function compute() {
  let sub = 0;
  items.forEach((it) => {
    const amt = (Number(it.qty) || 0) * (Number(it.price) || 0);
    it.amount = amt;
    sub += amt;
  });
  subtotalEl.textContent = sub.toFixed(2);
  grandtotalEl.textContent = sub.toFixed(2);
}
function render() {
  itemsBody.innerHTML = "";

  items.forEach((it, i) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-700";

    // index
    const tdIdx = document.createElement("td");
    tdIdx.className = "p-2";
    tdIdx.textContent = i + 1;
    tr.appendChild(tdIdx);

    // name
    const nameIn = document.createElement("input");
    nameIn.value = it.name;
    nameIn.placeholder = "Item name";
    nameIn.className =
      "min-w-20 w-full p-1 rounded bg-gray-900 border border-gray-700";
    nameIn.addEventListener("input", (e) => {
      items[i].name = e.target.value;
    });

    const tdName = document.createElement("td");
    tdName.className = "p-2";
    tdName.appendChild(nameIn);
    tr.appendChild(tdName);

    // qty
    const qtyIn = document.createElement("input");
    qtyIn.type = "number";
    qtyIn.value = it.qty;
    qtyIn.placeholder = "0";
    qtyIn.className = "w-14 p-1 rounded bg-gray-900 border border-gray-700";
    qtyIn.addEventListener("input", (e) => {
      items[i].qty = e.target.value;
      compute(); // only recalc
      tdAmt.textContent = items[i].amount; // update amount cell only
    });

    const tdQty = document.createElement("td");
    tdQty.className = "p-2";
    tdQty.appendChild(qtyIn);
    tr.appendChild(tdQty);

    // price
    const priceIn = document.createElement("input");
    priceIn.type = "number";
    priceIn.value = it.price;
    priceIn.placeholder = "0";
    priceIn.className = "w-20 p-1 rounded bg-gray-900 border border-gray-700";
    priceIn.addEventListener("input", (e) => {
      items[i].price = e.target.value;
      compute();
      tdAmt.textContent = items[i].amount;
    });

    const tdPrice = document.createElement("td");
    tdPrice.className = "p-2";
    tdPrice.appendChild(priceIn);
    tr.appendChild(tdPrice);

    // amount
    const tdAmt = document.createElement("td");
    tdAmt.className = "p-2 text-right";
    tdAmt.textContent = it.amount || 0;
    tr.appendChild(tdAmt);

    // actions
    const tdAct = document.createElement("td");
    tdAct.className = "p-2 flex gap-1";
    tdAct.innerHTML = `
      <button onclick="removeItem(${i})" class="bg-red-500 flex items-center justify-center h-6 w-6 hover:bg-red-600 text-white px-2 rounded leading-1">×</button>
    `;
    tr.appendChild(tdAct);

    itemsBody.appendChild(tr);
  });

  compute();
}

// Global keyboard navigation
itemsBody.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Tab") {
    const allInputs = Array.from(itemsBody.querySelectorAll("input"));
    const currentIndex = allInputs.indexOf(e.target);

    if (currentIndex >= 0) {
      e.preventDefault(); // stop browser’s default tabbing

      if (e.shiftKey) {
        // Shift+Tab → go backwards
        const prevIndex = Math.max(0, currentIndex - 1);
        allInputs[prevIndex].focus();
      } else {
        // Normal Tab/Enter → go forward
        if (currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1].focus();
        } else {
          // Last field → add new row and focus its name
          addItem();
          setTimeout(() => {
            const newInputs = Array.from(itemsBody.querySelectorAll("input"));
            newInputs[newInputs.length - 3].focus(); // focus new row's Name
          }, 50);
        }
      }
    }
  }
});

document.getElementById("addBtn").onclick = () => addItem();
document.getElementById("clearBtn").onclick = () => {
  items = [];
  render();
};
addItem();

async function generatePDF() {
  const template = await fetch("QuotationTemplate.pdf").then((r) =>
    r.arrayBuffer()
  );
  const pdfDoc = await PDFLib.PDFDocument.load(template);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

  const custNameVal = custName.value;
  const refNoVal = refNo.value;
  const qDateVal = qDate.value;

  page.drawText(String(custNameVal), { x: 80, y: 637, size: 12, font });
  page.drawText(String(refNoVal), { x: 80, y: 673, size: 12, font });
  page.drawText(String(qDateVal), { x: 460, y: 673, size: 12, font });

  let y = 575;
  items.forEach((it, i) => {
    // page.drawText(String(i + 1), { x: 60, y, size: 10, font });
    page.drawText(it.name || "", { x: 80, y, size: 10, font });
    page.drawText(it.qty || "", { x: 350, y, size: 10, font });
    page.drawText(it.price || "", { x: 420, y, size: 10, font });
    page.drawText(String(it.amount || 0), { x: 500, y, size: 10, font });
    y -= 28;
  });

  const total = items.reduce((s, it) => s + (it.amount || 0), 0);
  const totalQty = items.reduce(
    (s, it) => parseInt(s) + (parseInt(it.qty) || 0),
    0
  );
  page.drawText(String(totalQty), { x: 340, y: 132, size: 12, font });
  page.drawText(String(total), { x: 500, y: 132, size: 12, font });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  dlLink.href = URL.createObjectURL(blob);
  dlLink.classList.remove("hidden");
  dlLink.click();
}
document.getElementById("genBtn").onclick = generatePDF;

///////// INSTALLATION

// --- PWA Install Hint Handling ---

// Catch install event
let deferredPrompt;
const installHint = document.getElementById("installHint");

window.addEventListener("beforeinstallprompt", (e) => {
  // Stop automatic banner
  e.preventDefault();
  deferredPrompt = e;

  // Show an install button / hint
  installHint.textContent = "📲 Install App";
  installHint.classList.remove("text-gray-400");
  installHint.classList.add("text-green-400", "font-bold", "cursor-pointer");

  // When user clicks the hint
  installHint.onclick = async () => {
    installHint.textContent = "Installing...";
    deferredPrompt.prompt(); // <- Show the real install banner

    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      installHint.textContent = "✅ Installed";
    } else {
      installHint.textContent = "❌ Install dismissed";
    }
    deferredPrompt = null;
  };
});

window.addEventListener("appinstalled", () => {
  installHint.textContent = "✅ App Installed";
  installHint.classList.remove("text-green-400");
  installHint.classList.add("text-blue-400");
});
