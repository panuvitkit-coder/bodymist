/* ==========================================================
   Body Scent — script.js (shared by every page)
   Each block runs only when its page elements exist:
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

(function () {
  "use strict";

  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbz_IxaL3phYDBCWzk7Te4-7_lZ0oQLybpAHHCIsHqX0EKLQXrHY8ciKxjX0gpUo-VQ3/exec";

  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZrBAYAmOAIXkdXTdOCpdTHeMbwmZU3R3u-nBHvtoKlu_O1y7jvtn2Us27nlZFmto3Iex1Dys9B1JU/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- helpers ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(n) {
    return Number(n).toLocaleString("th-TH");
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  /* ==========================================================
     1) product.html — product cards + mood filter
     ========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById("filter-bar");
    var list = document.getElementById("product-list");
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = "all";

    function validMood(key) {
      return MOODS.some(function (m) { return m.key === key; });
    }

    function buildFilterBar() {
      filterBar.textContent = "";
      MOODS.forEach(function (m) {
        var btn = el("button", "filter");
        btn.type = "button";
        btn.dataset.mood = m.key;
        if (m.key !== "all") {
          btn.classList.add("mood-" + m.key);
          btn.appendChild(el("span", "mood-dot"));
        }
        btn.appendChild(document.createTextNode(m.label));
        btn.addEventListener("click", function () { setMood(m.key); });
        filterBar.appendChild(btn);
      });
    }

    function buildCard(p) {
      var itemName = p.size ? p.name + " " + p.size : p.name;
      var orderUrl =
        "order.html?item=" + encodeURIComponent(itemName) +
        "&price=" + encodeURIComponent(p.price);

      var card = el("article", "product mood-" + p.mood);

      var media = el("div", "product__media");
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = itemName;
      img.loading = "lazy";
      media.appendChild(img);

      var body = el("div", "product__body");

      var meta = el("div", "product__meta");
      meta.appendChild(el("span", "mood-dot"));
      meta.appendChild(el("span", "", moodLabel(p.mood)));

      var name = el("h3", "product__name", p.name);
      body.appendChild(meta);
      body.appendChild(name);
      if (p.size) body.appendChild(el("p", "product__desc", p.size));

      var foot = el("div", "product__foot");
      var price = el("span", "price", formatPrice(p.price));
      price.appendChild(el("small", "", "บาท"));
      var buy = el("a", "btn btn--sm", "สั่งซื้อ");
      buy.href = orderUrl;
      foot.appendChild(price);
      foot.appendChild(buy);
      body.appendChild(foot);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render() {
      list.textContent = "";
      var shown = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });
      if (!shown.length) {
        list.appendChild(el("p", "muted", "ไม่พบสินค้าในหมวดนี้"));
        return;
      }
      shown.forEach(function (p) { list.appendChild(buildCard(p)); });
    }

    function setMood(key) {
      currentMood = validMood(key) ? key : "all";
      Array.prototype.forEach.call(filterBar.querySelectorAll(".filter"), function (b) {
        var active = b.dataset.mood === currentMood;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      render();
    }

    buildFilterBar();

    var initial = new URLSearchParams(window.location.search).get("mood");
    initial = initial ? initial.toLowerCase() : "all";

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        setMood(initial);
      })
      .catch(function (err) {
        console.error(err);
        list.textContent = "";
        list.appendChild(el("p", "muted", "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
      });
  }

  /* ==========================================================
     2) order.html — auto-fill from URL + submit to Apps Script
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");

    var itemsField = document.getElementById("items");
    var totalField = document.getElementById("total");
    if (itemsField && item !== null) itemsField.value = item;
    if (totalField && price !== null) totalField.value = price;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var payload = {
        customerName: document.getElementById("customerName").value.trim(),
        contact: document.getElementById("contact").value.trim(),
        items: document.getElementById("items").value.trim(),
        total: document.getElementById("total").value.trim(),
        note: document.getElementById("note").value.trim()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ==========================================================
     3) admin.html — load CSV, parse it ourselves, show table
     ========================================================== */

  // CSV parser: handles quoted fields, "" escapes, commas and line breaks inside quotes
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }

    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ""; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    function showMessage(msg) {
      tbody.textContent = "";
      var tr = document.createElement("tr");
      var td = el("td", "muted", msg);
      td.colSpan = 6;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage("กำลังโหลดข้อมูล...");

    fetch(ORDERS_CSV_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // header row

        if (!rows.length) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // Rows are appended to the sheet in time order, so reverse = newest first
        rows.reverse();

        tbody.textContent = "";
        rows.forEach(function (r) {
          var tr = document.createElement("tr");
          // columns: timestamp, customerName, contact, items, total, note
          for (var i = 0; i < 6; i++) {
            tr.appendChild(el("td", "", r[i] !== undefined ? r[i] : ""));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error(err);
        showMessage("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- init ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
