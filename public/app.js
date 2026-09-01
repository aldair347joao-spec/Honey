/*
============================================================
HONEY PAY
MERCHANT PANEL
V1.0.0
============================================================
*/

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE = "/api";
const TOKEN_KEY = "honey_pay_token";

const state = {
  merchant: null,
  dashboard: null,
  payments: [],
  orders: [],
  products: [],
  customers: [],
  links: [],
  currentRoute: "dashboard",
  loading: false
};

const routeNames = {
  dashboard: ["Workspace", "Dashboard"],
  payments: ["Workspace", "Pagamentos"],
  orders: ["Workspace", "Pedidos"],
  products: ["Workspace", "Produtos"],
  customers: ["Workspace", "Clientes"],
  links: ["Workspace", "Links de pagamento"],
  reports: ["Gestão", "Relatórios"],
  settings: ["Gestão", "Definições"]
};

/* =========================================================
   DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);

const pageContent = $("#pageContent");
const app = $("#app");
const loader = $("#appLoader");
const modalOverlay = $("#modalOverlay");
const modal = $("#modal");
const toastContainer = $("#toastContainer");

/* =========================================================
   AUTH
========================================================= */

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);

  /*
   Compatibilidade com versões anteriores.
  */
  localStorage.removeItem("honey_token");
}

function redirectLogin() {
  clearSession();
  window.location.href = "/login";
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    redirectLogin();
    throw new Error("Sessão expirada.");
  }

  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error?.message ||
      data?.error ||
      `Erro HTTP ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   UTILITIES
========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKz(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0
  }).format(amount) + " Kz";
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT").format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function initials(name) {
  const value = String(name || "Honey Pay").trim();

  if (!value) return "HP";

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getName(obj) {
  return (
    obj?.name ||
    obj?.fullName ||
    obj?.customerName ||
    obj?.merchantName ||
    obj?.email ||
    "Sem nome"
  );
}

function normalizeArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function statusLabel(status) {
  const map = {
    SUCCEEDED: "Pago",
    SUCCESS: "Pago",
    PAID: "Pago",

    PENDING: "Pendente",
    PROCESSING: "Processando",

    FAILED: "Falhou",
    EXPIRED: "Expirado",
    CANCELLED: "Cancelado",

    UNKNOWN: "Desconhecido",

    REFUNDED: "Reembolsado",
    PARTIALLY_REFUNDED: "Reembolso parcial",

    ACTIVE: "Ativo",
    INACTIVE: "Inativo"
  };

  return map[String(status || "").toUpperCase()] ||
    String(status || "Desconhecido");
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();

  if (
    ["SUCCEEDED", "SUCCESS", "PAID", "ACTIVE"].includes(normalized)
  ) {
    return "success";
  }

  if (
    ["PENDING", "PROCESSING"].includes(normalized)
  ) {
    return "pending";
  }

  if (
    ["FAILED", "EXPIRED", "CANCELLED", "INACTIVE"].includes(normalized)
  ) {
    return "failed";
  }

  if (
    ["REFUNDED", "PARTIALLY_REFUNDED"].includes(normalized)
  ) {
    return "refunded";
  }

  return "unknown";
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");

  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <strong>${type === "error" ? "!" : type === "warning" ? "!" : "✓"}</strong>
    <span>${escapeHTML(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/* =========================================================
   MODAL
========================================================= */

function openModal(content) {
  modal.innerHTML = content;
  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modal.innerHTML = "";
  document.body.style.overflow = "";
}

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

/* =========================================================
   NAVIGATION
========================================================= */

function setRoute(route) {
  if (!routeNames[route]) {
    route = "dashboard";
  }

  state.currentRoute = route;

  const [parent, title] = routeNames[route];

  $("#breadcrumbParent").textContent = parent;
  $("#pageTitle").textContent = title;

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.route === route
    );
  });

  closeSidebar();

  renderRoute(route);
}

function navigate() {
  const hash = window.location.hash.replace("#", "").trim();

  setRoute(hash || "dashboard");
}

window.addEventListener("hashchange", navigate);

/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("active");
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("active");
}

$("#menuButton").addEventListener("click", openSidebar);
$("#sidebarClose").addEventListener("click", closeSidebar);
$("#sidebarOverlay").addEventListener("click", closeSidebar);

/* =========================================================
   MERCHANT
========================================================= */

async function loadMerchant() {
  try {
    const data = await apiRequest("/me");

    state.merchant =
      data?.merchant ||
      data?.user ||
      data;

    updateMerchantUI();
  } catch (error) {
    console.error("Erro ao carregar comerciante:", error);

    /*
      Algumas versões do backend podem não ter /me.
      O painel continua carregando as páginas públicas.
    */
  }
}

function updateMerchantUI() {
  const merchant = state.merchant || {};

  const name =
    merchant.businessName ||
    merchant.companyName ||
    merchant.name ||
    merchant.fullName ||
    "Meu negócio";

  const email =
    merchant.email ||
    merchant.user?.email ||
    "Conta Honey Pay";

  const initialsValue = initials(name);

  $("#merchantName").textContent = name;
  $("#merchantEmail").textContent = email;

  $("#topMerchantName").textContent = name;

  $("#merchantAvatar").textContent = initialsValue;
  $("#topAvatar").textContent = initialsValue;
}

/* =========================================================
   DASHBOARD API
========================================================= */

async function loadDashboard() {
  try {
    const data = await apiRequest("/dashboard");

    state.dashboard = data?.dashboard || data;

    return state.dashboard;
  } catch (error) {
    /*
      Se /dashboard ainda não existir,
      calculamos a informação a partir dos recursos existentes.
    */

    console.warn("Dashboard endpoint indisponível:", error.message);

    return null;
  }
}

async function loadPayments() {
  try {
    const data = await apiRequest("/payments");

    state.payments = normalizeArray(
      data,
      ["payments", "data", "results"]
    );

    updatePendingBadge();

    return state.payments;
  } catch (error) {
    console.warn("Pagamentos:", error.message);

    state.payments = [];

    return [];
  }
}

async function loadOrders() {
  try {
    const data = await apiRequest("/orders");

    state.orders = normalizeArray(
      data,
      ["orders", "data", "results"]
    );

    return state.orders;
  } catch (error) {
    console.warn("Pedidos:", error.message);

    state.orders = [];

    return [];
  }
}

async function loadProducts() {
  try {
    const data = await apiRequest("/products");

    state.products = normalizeArray(
      data,
      ["products", "data", "results"]
    );

    return state.products;
  } catch (error) {
    console.warn("Produtos:", error.message);

    state.products = [];

    return [];
  }
}

async function loadCustomers() {
  try {
    const data = await apiRequest("/customers");

    state.customers = normalizeArray(
      data,
      ["customers", "data", "results"]
    );

    return state.customers;
  } catch (error) {
    console.warn("Clientes:", error.message);

    state.customers = [];

    return [];
  }
}

async function loadLinks() {
  try {
    const data = await apiRequest("/payment-links");

    state.links = normalizeArray(
      data,
      ["links", "paymentLinks", "data", "results"]
    );

    return state.links;
  } catch (error) {
    console.warn("Links:", error.message);

    state.links = [];

    return [];
  }
}

/* =========================================================
   DASHBOARD CALCULATIONS
========================================================= */

function successfulPayments() {
  return state.payments.filter((payment) => {
    const status = String(payment.status || "").toUpperCase();

    return [
      "SUCCEEDED",
      "SUCCESS",
      "PAID"
    ].includes(status);
  });
}

function pendingPayments() {
  return state.payments.filter((payment) => {
    const status = String(payment.status || "").toUpperCase();

    return [
      "PENDING",
      "PROCESSING",
      "UNKNOWN"
    ].includes(status);
  });
}

function calculatedRevenue() {
  return successfulPayments().reduce(
    (total, payment) =>
      total +
      Number(
        payment.amount ||
        payment.total ||
        0
      ),
    0
  );
}

function calculatedFees() {
  return successfulPayments().reduce(
    (total, payment) =>
      total +
      Number(
        payment.feeAmount ||
        payment.honeyPayFee ||
        0
      ),
    0
  );
}

function updatePendingBadge() {
  const count = pendingPayments().length;

  const badge = $("#pendingBadge");

  if (!count) {
    badge.classList.add("hidden");
    return;
  }

  badge.classList.remove("hidden");
  badge.textContent = count > 99 ? "99+" : count;
}

/* =========================================================
   DASHBOARD RENDER
========================================================= */

async function renderDashboard() {
  pageContent.innerHTML = `
    <div class="welcome">
      <div>
        <h2>Olá, ${escapeHTML(
          getName(state.merchant) === "Sem nome"
            ? "bem-vindo"
            : getName(state.merchant).split(" ")[0]
        )} 👋</h2>

        <p>
          Aqui está o resumo do seu negócio.
        </p>
      </div>

      <select id="dashboardPeriod" class="date-control">
        <option value="7">Últimos 7 dias</option>
        <option value="30" selected>Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
      </select>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-label">Volume recebido</span>
          <span class="stat-icon">Kz</span>
        </div>

        <div id="statRevenue" class="stat-value">
          — 
        </div>

        <div class="stat-footer trend-up">
          <span>↑</span>
          <span>Pagamentos confirmados</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-label">Transações</span>
          <span class="stat-icon">↔</span>
        </div>

        <div id="statTransactions" class="stat-value">
          —
        </div>

        <div class="stat-footer trend-neutral">
          <span>•</span>
          <span>Total registado</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-label">Taxas Honey Pay</span>
          <span class="stat-icon">%</span>
        </div>

        <div id="statFees" class="stat-value">
          —
        </div>

        <div class="stat-footer trend-neutral">
          <span>•</span>
          <span>0,80% por pagamento</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-label">Pendentes</span>
          <span class="stat-icon">◷</span>
        </div>

        <div id="statPending" class="stat-value">
          —
        </div>

        <div class="stat-footer trend-neutral">
          <span>•</span>
          <span>Aguardam confirmação</span>
        </div>
      </div>

    </div>

    <div class="dashboard-grid">

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Volume de vendas</h3>
            <span>Desempenho dos últimos 7 períodos</span>
          </div>

          <a href="#reports" class="panel-link">
            Ver relatório →
          </a>
        </div>

        <div class="chart-wrap">
          <div id="salesChart" class="chart"></div>
        </div>
      </div>

      <div class="panel">

        <div class="panel-header">
          <div>
            <h3>Ações rápidas</h3>
            <span>Operações frequentes</span>
          </div>
        </div>

        <div class="quick-actions">

          <button class="quick-action" data-action="create-order">
            <span class="quick-action-icon">＋</span>
            Novo pedido
          </button>

          <button class="quick-action" data-action="create-product">
            <span class="quick-action-icon">◇</span>
            Produto
          </button>

          <button class="quick-action" data-action="create-link">
            <span class="quick-action-icon">↗</span>
            Criar link
          </button>

          <button class="quick-action" data-action="payments">
            <span class="quick-action-icon">↔</span>
            Pagamentos
          </button>

          <button class="quick-action" data-action="customers">
            <span class="quick-action-icon">♙</span>
            Clientes
          </button>

          <button class="quick-action" data-action="reports">
            <span class="quick-action-icon">▥</span>
            Relatórios
          </button>

        </div>

      </div>

    </div>

    <div class="panel table-panel">

      <div class="panel-header">
        <div>
          <h3>Transações recentes</h3>
          <span>Últimos pagamentos recebidos</span>
        </div>

        <a href="#payments" class="panel-link">
          Ver todas →
        </a>
      </div>

      <div id="recentPayments">
        <div class="empty-state">
          <div class="empty-icon">↔</div>
          <h3>A carregar transações</h3>
          <p>Estamos a obter os seus pagamentos.</p>
        </div>
      </div>

    </div>
  `;

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", handleQuickAction);
  });

  await loadDashboard();
  await loadPayments();

  fillDashboardStats();
  renderSalesChart();
  renderRecentPayments();
}

function fillDashboardStats() {
  const dashboard = state.dashboard || {};

  const revenue =
    dashboard.revenue ??
    dashboard.totalRevenue ??
    dashboard.totalReceived ??
    calculatedRevenue();

  const transactions =
    dashboard.transactions ??
    dashboard.totalTransactions ??
    state.payments.length;

  const fees =
    dashboard.fees ??
    dashboard.totalFees ??
    calculatedFees();

  const pending =
    dashboard.pending ??
    dashboard.pendingPayments ??
    pendingPayments().length;

  $("#statRevenue").textContent = formatKz(revenue);
  $("#statTransactions").textContent = formatNumber(transactions);
  $("#statFees").textContent = formatKz(fees);
  $("#statPending").textContent = formatNumber(pending);
}

function renderSalesChart() {
  const container = $("#salesChart");

  if (!container) return;

  const values = getChartValues();

  const max = Math.max(...values, 1);

  const width = 700;
  const height = 220;

  const points = values.map((value, index) => {
    const x =
      (index / (values.length - 1)) *
      (width - 30) +
      15;

    const y =
      height -
      20 -
      (value / max) * (height - 50);

    return {
      x,
      y,
      value
    };
  });

  const line = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const area =
    `M ${points[0].x} ${height - 20} ` +
    points.map((point) => `L ${point.x} ${point.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${height - 20} Z`;

  container.innerHTML = `
    <svg
      class="chart-svg"
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
    >

      <line class="chart-grid-line"
        x1="0" y1="35"
        x2="${width}" y2="35"></line>

      <line class="chart-grid-line"
        x1="0" y1="90"
        x2="${width}" y2="90"></line>

      <line class="chart-grid-line"
        x1="0" y1="145"
        x2="${width}" y2="145"></line>

      <line class="chart-grid-line"
        x1="0" y1="${height - 20}"
        x2="${width}" y2="${height - 20}"></line>

      <path class="chart-area" d="${area}"></path>

      <path class="chart-line" d="${line}"></path>

      ${points.map(point => `
        <circle
          class="chart-point"
          cx="${point.x}"
          cy="${point.y}"
          r="4"
        ></circle>
      `).join("")}

    </svg>

    <div class="chart-labels">
      <span>Seg</span>
      <span>Ter</span>
      <span>Qua</span>
      <span>Qui</span>
      <span>Sex</span>
      <span>Sáb</span>
      <span>Dom</span>
    </div>
  `;
}

function getChartValues() {
  const dashboard = state.dashboard;

  if (
    dashboard?.chart &&
    Array.isArray(dashboard.chart)
  ) {
    return dashboard.chart.map(
      item =>
        Number(
          item.amount ??
          item.value ??
          0
        )
    );
  }

  /*
    Quando o backend não envia série histórica,
    mostramos os últimos 7 dias calculados
    a partir dos pagamentos reais disponíveis.
  */

  const days = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();

      date.setHours(0, 0, 0, 0);

      date.setDate(
        date.getDate() - (6 - index)
      );

      return date;
    }
  );

  return days.map((day) => {

    const next = new Date(day);

    next.setDate(next.getDate() + 1);

    return successfulPayments()
      .filter(payment => {
        const date = new Date(
          payment.createdAt ||
          payment.paidAt ||
          payment.updatedAt
        );

        return date >= day && date < next;
      })
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount ||
            payment.total ||
            0
          ),
        0
      );
  });
}

function renderRecentPayments() {
  const container = $("#recentPayments");

  if (!container) return;

  const payments = [...state.payments]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0)
    )
    .slice(0, 8);

  if (!payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">↔</div>
        <h3>Nenhuma transação ainda</h3>
        <p>
          Quando receber o primeiro pagamento,
          ele aparecerá aqui.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">

        <thead>
          <tr>
            <th>Cliente</th>
            <th>Referência</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${payments.map(paymentRow).join("")}
        </tbody>

      </table>
    </div>
  `;
}

function paymentRow(payment) {
  const customer =
    payment.customer?.name ||
    payment.customerName ||
    payment.customer?.mobile ||
    payment.mobile ||
    "Cliente";

  const reference =
    payment.merchantReference ||
    payment.reference ||
    payment.orderReference ||
    payment.providerPaymentId ||
    payment._id ||
    "—";

  const status = payment.status;

  return `
    <tr>

      <td>
        <div class="customer-cell">
          <div class="customer-mini-avatar">
            ${escapeHTML(initials(customer))}
          </div>

          <div>
            <strong>${escapeHTML(customer)}</strong>
            <span>
              ${escapeHTML(
                payment.customer?.mobile ||
                payment.mobile ||
                "Cliente"
              )}
            </span>
          </div>
        </div>
      </td>

      <td class="muted">
        ${escapeHTML(String(reference).slice(0, 24))}
      </td>

      <td class="amount-cell">
        ${formatKz(
          payment.amount ||
          payment.total ||
          0
        )}
      </td>

      <td>
        <span class="status ${statusClass(status)}">
          ${escapeHTML(statusLabel(status))}
        </span>
      </td>

      <td class="muted">
        ${formatDateTime(
          payment.createdAt ||
          payment.updatedAt
        )}
      </td>

      <td>
        <button
          class="small-action"
          data-payment-id="${escapeHTML(payment._id || payment.id || "")}"
          data-view-payment
        >
          Ver
        </button>
      </td>

    </tr>
  `;
}

/* =========================================================
   PAYMENTS
========================================================= */

async function renderPayments() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Pagamentos</h2>
        <p>Controle todas as transações do seu negócio.</p>
      </div>
    </div>

    <div class="panel table-panel">

      <div class="filters">

        <div class="search-box">
          <span>⌕</span>
          <input
            id="paymentSearch"
            type="search"
            placeholder="Pesquisar por cliente ou referência..."
          >
        </div>

        <select id="paymentStatusFilter" class="filter-select">
          <option value="">Todos os estados</option>
          <option value="SUCCEEDED">Pagos</option>
          <option value="PENDING">Pendentes</option>
          <option value="PROCESSING">Processando</option>
          <option value="FAILED">Falhados</option>
          <option value="UNKNOWN">Desconhecidos</option>
          <option value="REFUNDED">Reembolsados</option>
        </select>

      </div>

      <div id="paymentsTable"></div>

    </div>
  `;

  await loadPayments();

  renderPaymentsTable();

  $("#paymentSearch").addEventListener(
    "input",
    renderPaymentsTable
  );

  $("#paymentStatusFilter").addEventListener(
    "change",
    renderPaymentsTable
  );
}

function renderPaymentsTable() {
  const container = $("#paymentsTable");

  if (!container) return;

  const query =
    ($("#paymentSearch")?.value || "")
      .toLowerCase()
      .trim();

  const statusFilter =
    $("#paymentStatusFilter")?.value || "";

  const payments = state.payments.filter(payment => {

    const text = [
      payment.customer?.name,
      payment.customerName,
      payment.customer?.mobile,
      payment.mobile,
      payment.reference,
      payment.merchantReference,
      payment.providerPaymentId,
      payment._id
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !query ||
      text.includes(query);

    const matchesStatus =
      !statusFilter ||
      String(payment.status || "").toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">↔</div>
        <h3>Nenhum pagamento encontrado</h3>
        <p>
          Não existem transações correspondentes aos filtros.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">

        <thead>
          <tr>
            <th>Cliente</th>
            <th>Referência</th>
            <th>Método</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${payments.map(payment => {

            const customer =
              payment.customer?.name ||
              payment.customerName ||
              "Cliente";

            return `
              <tr>

                <td>
                  <div class="customer-cell">

                    <div class="customer-mini-avatar">
                      ${escapeHTML(initials(customer))}
                    </div>

                    <div>
                      <strong>${escapeHTML(customer)}</strong>
                      <span>
                        ${escapeHTML(
                          payment.customer?.mobile ||
                          payment.mobile ||
                          "—"
                        )}
                      </span>
                    </div>

                  </div>
                </td>

                <td class="muted">
                  ${escapeHTML(
                    String(
                      payment.merchantReference ||
                      payment.reference ||
                      payment._id ||
                      "—"
                    ).slice(0, 22)
                  )}
                </td>

                <td class="muted">
                  ${escapeHTML(
                    payment.paymentMethod ||
                    payment.method ||
                    "—"
                  )}
                </td>

                <td class="amount-cell">
                  ${formatKz(
                    payment.amount ||
                    payment.total ||
                    0
                  )}
                </td>

                <td>
                  <span class="status ${statusClass(payment.status)}">
                    ${escapeHTML(
                      statusLabel(payment.status)
                    )}
                  </span>
                </td>

                <td class="muted">
                  ${formatDateTime(
                    payment.createdAt ||
                    payment.updatedAt
                  )}
                </td>

                <td>
                  <button
                    class="small-action"
                    data-payment-id="${escapeHTML(
                      payment._id ||
                      payment.id ||
                      ""
                    )}"
                    data-view-payment
                  >
                    Ver
                  </button>
                </td>

              </tr>
            `;
          }).join("")}

        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   PAYMENT DETAILS
========================================================= */

document.addEventListener("click", async (event) => {
  const button =
    event.target.closest("[data-view-payment]");

  if (!button) return;

  const id = button.dataset.paymentId;

  if (!id) return;

  try {
    const data =
      await apiRequest(`/payments/${encodeURIComponent(id)}`);

    const payment =
      data?.payment ||
      data;

    openPaymentModal(payment);

  } catch (error) {
    showToast(
      error.message ||
      "Não foi possível carregar o pagamento.",
      "error"
    );
  }
});

function openPaymentModal(payment) {
  const status = payment.status;

  const amount =
    payment.amount ||
    payment.total ||
    0;

  const fee =
    payment.feeAmount ||
    payment.honeyPayFee ||
    0;

  const net =
    payment.netAmount ??
    Math.max(
      Number(amount) - Number(fee),
      0
    );

  openModal(`
    <div class="modal-header">
      <div>
        <h3>Detalhes do pagamento</h3>
      </div>

      <button
        class="modal-close"
        data-close-modal
      >
        ×
      </button>
    </div>

    <div class="modal-body">

      <div class="entity-card">

        <div class="entity-card-top">
          <div class="entity-icon">Kz</div>

          <span class="status ${statusClass(status)}">
            ${escapeHTML(statusLabel(status))}
          </span>
        </div>

        <div class="entity-price">
          ${formatKz(amount)}
        </div>

        <p>
          Valor recebido
        </p>

      </div>

      <div style="height:15px"></div>

      <div class="form-grid">

        <div class="form-group">
          <label class="form-label">Cliente</label>
          <div class="form-input" style="padding-top:11px">
            ${escapeHTML(
              payment.customer?.name ||
              payment.customerName ||
              "—"
            )}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Telefone</label>
          <div class="form-input" style="padding-top:11px">
            ${escapeHTML(
              payment.customer?.mobile ||
              payment.mobile ||
              "—"
            )}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Referência</label>
          <div class="form-input" style="padding-top:11px">
            ${escapeHTML(
              payment.merchantReference ||
              payment.reference ||
              "—"
            )}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Método</label>
          <div class="form-input" style="padding-top:11px">
            ${escapeHTML(
              payment.paymentMethod ||
              payment.method ||
              "—"
            )}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Taxa Honey Pay</label>
          <div class="form-input" style="padding-top:11px">
            ${formatKz(fee)}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Valor líquido</label>
          <div class="form-input" style="padding-top:11px">
            ${formatKz(net)}
          </div>
        </div>

        <div class="form-group full">
          <label class="form-label">Data</label>
          <div class="form-input" style="padding-top:11px">
            ${formatDateTime(
              payment.createdAt ||
              payment.updatedAt
            )}
          </div>
        </div>

      </div>

    </div>

    <div class="modal-footer">

      ${
        ["SUCCEEDED", "SUCCESS", "PAID"].includes(
          String(status || "").toUpperCase()
        )
        ? `
          <button
            class="secondary-btn"
            data-refund-payment="${escapeHTML(
              payment._id ||
              payment.id ||
              ""
            )}"
          >
            Reembolsar
          </button>
        `
        : ""
      }

      <button
        class="primary-btn"
        data-close-modal
      >
        Fechar
      </button>

    </div>
  `);
}

document.addEventListener("click", (event) => {

  if (
    event.target.closest("[data-close-modal]")
  ) {
    closeModal();
  }

});

/* =========================================================
   REFUND
========================================================= */

document.addEventListener("click", async (event) => {

  const button =
    event.target.closest("[data-refund-payment]");

  if (!button) return;

  const id =
    button.dataset.refundPayment;

  if (!id) return;

  const confirmed =
    window.confirm(
      "Tem certeza que deseja solicitar o reembolso deste pagamento?"
    );

  if (!confirmed) return;

  try {

    await apiRequest(
      `/payments/${encodeURIComponent(id)}/refund`,
      {
        method: "POST"
      }
    );

    closeModal();

    showToast(
      "Pedido de reembolso enviado."
    );

    await loadPayments();

    if (state.currentRoute === "payments") {
      renderPaymentsTable();
    }

  } catch (error) {

    showToast(
      error.message ||
      "Não foi possível processar o reembolso.",
      "error"
    );

  }

});

/* =========================================================
   ORDERS
========================================================= */

async function renderOrders() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Pedidos</h2>
        <p>
          Crie e acompanhe os pedidos dos seus clientes.
        </p>
      </div>

      <button
        class="primary-btn"
        id="newOrderButton"
      >
        + Novo pedido
      </button>

    </div>

    <div class="panel table-panel">

      <div class="filters">

        <div class="search-box">
          <span>⌕</span>
          <input
            id="orderSearch"
            type="search"
            placeholder="Pesquisar pedido ou cliente..."
          >
        </div>

      </div>

      <div id="ordersTable"></div>

    </div>
  `;

  await loadOrders();

  renderOrdersTable();

  $("#orderSearch")
    .addEventListener(
      "input",
      renderOrdersTable
    );

  $("#newOrderButton")
    .addEventListener(
      "click",
      openCreateOrderModal
    );
}

function renderOrdersTable() {
  const container = $("#ordersTable");

  if (!container) return;

  const query =
    ($("#orderSearch")?.value || "")
      .toLowerCase()
      .trim();

  const orders =
    state.orders.filter(order => {

      if (!query) return true;

      const text = [
        order.reference,
        order.orderNumber,
        order.customer?.name,
        order.customerName,
        order._id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });

  if (!orders.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▣</div>
        <h3>Nenhum pedido encontrado</h3>
        <p>
          Crie o seu primeiro pedido para começar a vender.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-scroll">

      <table class="data-table">

        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Data</th>
          </tr>
        </thead>

        <tbody>

          ${orders.map(order => {

            const customer =
              order.customer?.name ||
              order.customerName ||
              "Cliente";

            return `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(
                      order.reference ||
                      order.orderNumber ||
                      order._id ||
                      "—"
                    )}
                  </strong>
                </td>

                <td>
                  <div class="customer-cell">

                    <div class="customer-mini-avatar">
                      ${escapeHTML(initials(customer))}
                    </div>

                    <div>
                      <strong>
                        ${escapeHTML(customer)}
                      </strong>
                    </div>

                  </div>
                </td>

                <td class="amount-cell">
                  ${formatKz(
                    order.total ||
                    order.amount ||
                    0
                  )}
                </td>

                <td>
                  <span class="status ${statusClass(order.status)}">
                    ${escapeHTML(
                      statusLabel(order.status)
                    )}
                  </span>
                </td>

                <td class="muted">
                  ${formatDateTime(
                    order.createdAt
                  )}
                </td>

              </tr>
            `;
          }).join("")}

        </tbody>

      </table>

    </div>
  `;
}

function openCreateOrderModal() {
  openModal(`
    <div class="modal-header">

      <h3>Novo pedido</h3>

      <button
        class="modal-close"
        data-close-modal
      >
        ×
      </button>

    </div>

    <form id="createOrderForm">

      <div class="modal-body">

        <div class="form-grid">

          <div class="form-group">
            <label class="form-label">
              Nome do cliente
            </label>

            <input
              name="customerName"
              class="form-input"
              required
              placeholder="Ex.: João Manuel"
            >
          </div>

          <div class="form-group">
            <label class="form-label">
              Telefone
            </label>

            <input
              name="customerMobile"
              class="form-input"
              required
              placeholder="923000000"
            >
          </div>

          <div class="form-group">
            <label class="form-label">
              Valor
            </label>

            <input
              name="amount"
              class="form-input"
              type="number"
              min="1"
              step="1"
              required
              placeholder="25000"
            >
          </div>

          <div class="form-group">
            <label class="form-label">
              Referência
            </label>

            <input
              name="reference"
              class="form-input"
              placeholder="Opcional"
            >
          </div>

          <div class="form-group full">
            <label class="form-label">
              Descrição
            </label>

            <textarea
              name="description"
              class="form-textarea"
              placeholder="Descrição do pedido"
            ></textarea>
          </div>

        </div>

      </div>

      <div class="modal-footer">

        <button
          type="button"
          class="secondary-btn"
          data-close-modal
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="primary-btn"
        >
          Criar pedido
        </button>

      </div>

    </form>
  `);

  $("#createOrderForm")
    .addEventListener(
      "submit",
      submitCreateOrder
    );
}

async function submitCreateOrder(event) {
  event.preventDefault();

  const form =
    new FormData(event.target);

  const amount =
    Number(form.get("amount"));

  if (!Number.isInteger(amount) || amount <= 0) {
    showToast(
      "O valor deve ser um número inteiro positivo.",
      "error"
    );

    return;
  }

  try {

    await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName:
          form.get("customerName"),

        customerMobile:
          form.get("customerMobile"),

        amount,

        reference:
          form.get("reference") || undefined,

        description:
          form.get("description") || undefined
      })
    });

    closeModal();

    showToast("Pedido criado com sucesso.");

    await loadOrders();

    renderOrdersTable();

  } catch (error) {

    showToast(
      error.message ||
      "Não foi possível criar o pedido.",
      "error"
    );

  }
}

/* =========================================================
   PRODUCTS
========================================================= */

async function renderProducts() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Produtos</h2>
        <p>
          Organize aquilo que vende e acompanhe os preços.
        </p>
      </div>

      <button
        id="newProductButton"
        class="primary-btn"
      >
        + Novo produto
      </button>

    </div>

    <div id="productsGrid" class="cards-grid"></div>
  `;

  await loadProducts();

  renderProductsGrid();

  $("#newProductButton")
    .addEventListener(
      "click",
      openCreateProductModal
    );
}

function renderProductsGrid() {
  const container = $("#productsGrid");

  if (!container) return;

  if (!state.products.length) {

    container.innerHTML = `
      <div class="panel" style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-icon">◇</div>
          <h3>Nenhum produto</h3>
          <p>
            Crie produtos para acelerar a criação dos seus pedidos.
          </p>
        </div>
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.products.map(product => `

      <div class="entity-card">

        <div class="entity-card-top">

          <div class="entity-icon">
            ◇
          </div>

          <span class="status ${
            product.active === false
              ? "failed"
              : "success"
          }">
            ${
              product.active === false
                ? "Inativo"
                : "Ativo"
            }
          </span>

        </div>

        <h3>
          ${escapeHTML(
            product.name ||
            product.title ||
            "Produto"
          )}
        </h3>

        <p>
          ${escapeHTML(
            product.description ||
            "Sem descrição."
          )}
        </p>

        <div class="entity-price">
          ${formatKz(
            product.price ||
            product.amount ||
            0
          )}
        </div>

      </div>

    `).join("");
}

function openCreateProductModal() {
  openModal(`
    <div class="modal-header">

      <h3>Novo produto</h3>

      <button
        class="modal-close"
        data-close-modal
      >
        ×
      </button>

    </div>

    <form id="createProductForm">

      <div class="modal-body">

        <div class="form-grid">

          <div class="form-group full">

            <label class="form-label">
              Nome do produto
            </label>

            <input
              name="name"
              class="form-input"
              required
              placeholder="Ex.: Camisola Premium"
            >

          </div>

          <div class="form-group">

            <label class="form-label">
              Preço
            </label>

            <input
              name="price"
              class="form-input"
              type="number"
              min="1"
              step="1"
              required
              placeholder="15000"
            >

          </div>

          <div class="form-group">

            <label class="form-label">
              Stock
            </label>

            <input
              name="stock"
              class="form-input"
              type="number"
              min="0"
              step="1"
              value="0"
            >

          </div>

          <div class="form-group full">

            <label class="form-label">
              Descrição
            </label>

            <textarea
              name="description"
              class="form-textarea"
              placeholder="Descrição do produto"
            ></textarea>

          </div>

        </div>

      </div>

      <div class="modal-footer">

        <button
          type="button"
          class="secondary-btn"
          data-close-modal
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="primary-btn"
        >
          Criar produto
        </button>

      </div>

    </form>
  `);

  $("#createProductForm")
    .addEventListener(
      "submit",
      submitCreateProduct
    );
}

async function submitCreateProduct(event) {
  event.preventDefault();

  const form =
    new FormData(event.target);

  const price =
    Number(form.get("price"));

  const stock =
    Number(form.get("stock") || 0);

  if (!Number.isInteger(price) || price <= 0) {

    showToast(
      "O preço deve ser um número inteiro positivo.",
      "error"
    );

    return;
  }

  try {

    await apiRequest("/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        price,
        stock,
        description:
          form.get("description") || undefined
      })
    });

    closeModal();

    showToast(
      "Produto criado com sucesso."
    );

    await loadProducts();

    renderProductsGrid();

  } catch (error) {

    showToast(
      error.message ||
      "Não foi possível criar o produto.",
      "error"
    );

  }
}

/* =========================================================
   CUSTOMERS
========================================================= */

async function renderCustomers() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Clientes</h2>
        <p>
          Consulte os seus clientes e o histórico de compras.
        </p>
      </div>

    </div>

    <div class="panel table-panel">

      <div class="filters">

        <div class="search-box">

          <span>⌕</span>

          <input
            id="customerSearch"
            type="search"
            placeholder="Pesquisar cliente..."
          >

        </div>

      </div>

      <div id="customersTable"></div>

    </div>
  `;

  await loadCustomers();

  renderCustomersTable();

  $("#customerSearch")
    .addEventListener(
      "input",
      renderCustomersTable
    );
}

function renderCustomersTable() {

  const container =
    $("#customersTable");

  if (!container) return;

  const query =
    ($("#customerSearch")?.value || "")
      .toLowerCase()
      .trim();

  const customers =
    state.customers.filter(customer => {

      if (!query) return true;

      const text = [
        customer.name,
        customer.fullName,
        customer.email,
        customer.mobile,
        customer.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });

  if (!customers.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ♙
        </div>

        <h3>Nenhum cliente encontrado</h3>

        <p>
          Os clientes aparecerão aqui depois das primeiras vendas.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-scroll">

      <table class="data-table">

        <thead>
          <tr>
            <th>Cliente</th>
            <th>Telefone</th>
            <th>Email</th>
            <th>Total gasto</th>
            <th>Registado</th>
          </tr>
        </thead>

        <tbody>

          ${customers.map(customer => `

            <tr>

              <td>

                <div class="customer-cell">

                  <div class="customer-mini-avatar">
                    ${escapeHTML(
                      initials(
                        customer.name ||
                        customer.fullName
                      )
                    )}
                  </div>

                  <div>

                    <strong>
                      ${escapeHTML(
                        customer.name ||
                        customer.fullName ||
                        "Cliente"
                      )}
                    </strong>

                  </div>

                </div>

              </td>

              <td class="muted">
                ${escapeHTML(
                  customer.mobile ||
                  customer.phone ||
                  "—"
                )}
              </td>

              <td class="muted">
                ${escapeHTML(
                  customer.email ||
                  "—"
                )}
              </td>

              <td class="amount-cell">
                ${formatKz(
                  customer.totalSpent ||
                  customer.totalPurchases ||
                  0
                )}
              </td>

              <td class="muted">
                ${formatDate(
                  customer.createdAt
                )}
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* =========================================================
   PAYMENT LINKS
========================================================= */

async function renderLinks() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Links de pagamento</h2>

        <p>
          Venda através de WhatsApp, Instagram, Facebook ou qualquer canal.
        </p>

      </div>

      <button
        id="newLinkButton"
        class="primary-btn"
      >
        + Criar link
      </button>

    </div>

    <div id="linksGrid" class="cards-grid"></div>
  `;

  await loadLinks();

  renderLinksGrid();

  $("#newLinkButton")
    .addEventListener(
      "click",
      openCreateLinkModal
    );
}

function renderLinksGrid() {

  const container =
    $("#linksGrid");

  if (!container) return;

  if (!state.links.length) {

    container.innerHTML = `
      <div
        class="panel"
        style="grid-column:1/-1"
      >

        <div class="empty-state">

          <div class="empty-icon">
            ↗
          </div>

          <h3>Nenhum link de pagamento</h3>

          <p>
            Crie um link e envie diretamente para os seus clientes.
          </p>

        </div>

      </div>
    `;

    return;
  }

  container.innerHTML =
    state.links.map(link => {

      const token =
        link.token ||
        link.code ||
        link.shortCode ||
        "";

      const url =
        link.url ||
        `${window.location.origin}/pay/${token}`;

      return `
        <div class="entity-card">

          <div class="entity-card-top">

            <div class="entity-icon">
              ↗
            </div>

            <span class="status ${
              link.active === false
                ? "failed"
                : "success"
            }">
              ${
                link.active === false
                  ? "Inativo"
                  : "Ativo"
              }
            </span>

          </div>

          <h3>
            ${escapeHTML(
              link.name ||
              link.title ||
              "Link de pagamento"
            )}
          </h3>

          <p>
            ${escapeHTML(
              link.description ||
              "Link Honey Pay"
            )}
          </p>

          <div class="entity-price">
            ${formatKz(
              link.amount ||
              link.price ||
              0
            )}
          </div>

          <div style="margin-top:14px;display:flex;gap:7px">

            <button
              class="secondary-btn"
              style="flex:1"
              data-copy-link="${escapeHTML(url)}"
            >
              Copiar
            </button>

            <a
              class="primary-btn"
              style="display:grid;place-items:center"
              href="${escapeHTML(url)}"
              target="_blank"
              rel="noopener"
            >
              Abrir
            </a>

          </div>

        </div>
      `;
    }).join("");
}

document.addEventListener("click", async event => {

  const button =
    event.target.closest("[data-copy-link]");

  if (!button) return;

  const url =
    button.dataset.copyLink;

  try {

    await navigator.clipboard.writeText(url);

    showToast(
      "Link copiado para a área de transferência."
    );

  } catch {

    showToast(
      "Não foi possível copiar o link.",
      "error"
    );

  }

});

function openCreateLinkModal() {

  openModal(`

    <div class="modal-header">

      <h3>Criar link de pagamento</h3>

      <button
        class="modal-close"
        data-close-modal
      >
        ×
      </button>

    </div>

    <form id="createLinkForm">

      <div class="modal-body">

        <div class="form-grid">

          <div class="form-group full">

            <label class="form-label">
              Nome
            </label>

            <input
              name="name"
              class="form-input"
              required
              placeholder="Ex.: Venda de ténis"
            >

          </div>

          <div class="form-group">

            <label class="form-label">
              Valor
            </label>

            <input
              name="amount"
              class="form-input"
              type="number"
              min="1"
              step="1"
              required
              placeholder="35000"
            >

          </div>

          <div class="form-group">

            <label class="form-label">
              Expiração
            </label>

            <input
              name="expiresAt"
              class="form-input"
              type="datetime-local"
            >

          </div>

          <div class="form-group full">

            <label class="form-label">
              Descrição
            </label>

            <textarea
              name="description"
              class="form-textarea"
              placeholder="Descrição que o cliente verá no checkout"
            ></textarea>

          </div>

        </div>

      </div>

      <div class="modal-footer">

        <button
          type="button"
          class="secondary-btn"
          data-close-modal
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="primary-btn"
        >
          Criar link
        </button>

      </div>

    </form>

  `);

  $("#createLinkForm")
    .addEventListener(
      "submit",
      submitCreateLink
    );
}

async function submitCreateLink(event) {

  event.preventDefault();

  const form =
    new FormData(event.target);

  const amount =
    Number(form.get("amount"));

  if (!Number.isInteger(amount) || amount <= 0) {

    showToast(
      "O valor deve ser um número inteiro positivo.",
      "error"
    );

    return;
  }

  try {

    await apiRequest(
      "/payment-links",
      {
        method: "POST",

        body: JSON.stringify({
          name: form.get("name"),
          amount,

          description:
            form.get("description") ||
            undefined,

          expiresAt:
            form.get("expiresAt") ||
            undefined
        })
      }
    );

    closeModal();

    showToast(
      "Link criado com sucesso."
    );

    await loadLinks();

    renderLinksGrid();

  } catch (error) {

    showToast(
      error.message ||
      "Não foi possível criar o link.",
      "error"
    );

  }
}

/* =========================================================
   REPORTS
========================================================= */

async function renderReports() {

  pageContent.innerHTML = `
    <div class="page-header">

      <div>

        <h2>Relatórios</h2>

        <p>
          Analise vendas, pagamentos e taxas Honey Pay.
        </p>

      </div>

      <button
        id="exportCsvButton"
        class="primary-btn"
      >
        Exportar CSV
      </button>

    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span class="stat-label">
          Volume recebido
        </span>

        <div class="stat-value">
          ${formatKz(
            calculatedRevenue()
          )}
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Pagamentos
        </span>

        <div class="stat-value">
          ${formatNumber(
            state.payments.length
          )}
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Taxas Honey Pay
        </span>

        <div class="stat-value">
          ${formatKz(
            calculatedFees()
          )}
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Líquido estimado
        </span>

        <div class="stat-value">
          ${formatKz(
            calculatedRevenue() -
            calculatedFees()
          )}
        </div>
      </div>

    </div>

    <div class="panel table-panel">

      <div class="panel-header">

        <div>

          <h3>Resumo das transações</h3>

          <span>
            Dados disponíveis no painel
          </span>

        </div>

      </div>

      <div id="reportTable"></div>

    </div>
  `;

  await loadPayments();

  renderReportTable();

  $("#exportCsvButton")
    .addEventListener(
      "click",
      exportPaymentsCSV
    );
}

function renderReportTable() {

  const container =
    $("#reportTable");

  if (!container) return;

  if (!state.payments.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ▥
        </div>

        <h3>Sem dados</h3>

        <p>
          Ainda não existem pagamentos para gerar o relatório.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `

    <div class="table-scroll">

      <table class="data-table">

        <thead>

          <tr>
            <th>Data</th>
            <th>Referência</th>
            <th>Valor</th>
            <th>Taxa</th>
            <th>Líquido</th>
            <th>Estado</th>
          </tr>

        </thead>

        <tbody>

          ${state.payments.map(payment => {

            const amount =
              Number(
                payment.amount ||
                payment.total ||
                0
              );

            const fee =
              Number(
                payment.feeAmount ||
                payment.honeyPayFee ||
                0
              );

            return `

              <tr>

                <td class="muted">
                  ${formatDateTime(
                    payment.createdAt
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    payment.reference ||
                    payment.merchantReference ||
                    "—"
                  )}
                </td>

                <td class="amount-cell">
                  ${formatKz(amount)}
                </td>

                <td>
                  ${formatKz(fee)}
                </td>

                <td class="amount-cell">
                  ${formatKz(
                    Math.max(
                      amount - fee,
                      0
                    )
                  )}
                </td>

                <td>

                  <span class="status ${statusClass(payment.status)}">
                    ${escapeHTML(
                      statusLabel(payment.status)
                    )}
                  </span>

                </td>

              </tr>

            `;
          }).join("")}

        </tbody>

      </table>

    </div>
  `;
}

function exportPaymentsCSV() {

  if (!state.payments.length) {

    showToast(
      "Não existem pagamentos para exportar.",
      "warning"
    );

    return;
  }

  const rows = [
    [
      "Data",
      "Referência",
      "Cliente",
      "Valor",
      "Taxa Honey Pay",
      "Líquido",
      "Estado"
    ]
  ];

  state.payments.forEach(payment => {

    const amount =
      Number(
        payment.amount ||
        payment.total ||
        0
      );

    const fee =
      Number(
        payment.feeAmount ||
        payment.honeyPayFee ||
        0
      );

    rows.push([
      formatDateTime(
        payment.createdAt
      ),

      payment.reference ||
      payment.merchantReference ||
      "",

      payment.customer?.name ||
      payment.customerName ||
      "",

      amount,

      fee,

      Math.max(
        amount - fee,
        0
      ),

      statusLabel(
        payment.status
      )
    ]);
  });

  const csv =
    rows.map(row =>
      row.map(value =>
        `"${String(value ?? "").replaceAll('"', '""')}"`
      ).join(",")
    ).join("\n");

  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    `honey-pay-pagamentos-${new Date().toISOString().slice(0,10)}.csv`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    "Relatório CSV exportado."
  );
}

/* =========================================================
   SETTINGS
========================================================= */

async function renderSettings() {

  const merchant =
    state.merchant || {};

  pageContent.innerHTML = `

    <div class="page-header">

      <div>

        <h2>Definições</h2>

        <p>
          Configure a sua conta e o seu negócio.
        </p>

      </div>

    </div>

    <div class="panel">

      <div class="panel-header">

        <div>

          <h3>Perfil do negócio</h3>

          <span>
            Informação da sua conta Honey Pay
          </span>

        </div>

      </div>

      <form id="settingsForm">

        <div style="padding:19px">

          <div class="form-grid">

            <div class="form-group">

              <label class="form-label">
                Nome do negócio
              </label>

              <input
                class="form-input"
                name="businessName"
                value="${escapeHTML(
                  merchant.businessName ||
                  merchant.companyName ||
                  merchant.name ||
                  ""
                )}"
              >

            </div>

            <div class="form-group">

              <label class="form-label">
                Email
              </label>

              <input
                class="form-input"
                name="email"
                type="email"
                value="${escapeHTML(
                  merchant.email ||
                  ""
                )}"
              >

            </div>

            <div class="form-group">

              <label class="form-label">
                Telefone
              </label>

              <input
                class="form-input"
                name="phone"
                value="${escapeHTML(
                  merchant.phone ||
                  merchant.mobile ||
                  ""
                )}"
              >

            </div>

            <div class="form-group">

              <label class="form-label">
                Moeda
              </label>

              <input
                class="form-input"
                value="AOA — Kwanza"
                disabled
              >

            </div>

          </div>

        </div>

        <div class="modal-footer">

          <button
            type="submit"
            class="primary-btn"
          >
            Guardar alterações
          </button>

        </div>

      </form>

    </div>

    <div style="height:18px"></div>

    <div class="panel">

      <div class="panel-header">

        <div>

          <h3>Taxa Honey Pay</h3>

          <span>
            Modelo de cobrança atual
          </span>

        </div>

        <strong style="font-size:14px">
          0,80%
        </strong>

      </div>

      <div style="padding:19px;color:#6b7280;font-size:11px;line-height:1.7">
        A Honey Pay aplica uma taxa de 0,80% sobre o valor das transações
        elegíveis, de acordo com as regras configuradas no backend.
      </div>

    </div>

  `;

  $("#settingsForm")
    .addEventListener(
      "submit",
      saveSettings
    );
}

async function saveSettings(event) {

  event.preventDefault();

  const form =
    new FormData(event.target);

  const payload = {
    businessName:
      form.get("businessName"),

    email:
      form.get("email"),

    phone:
      form.get("phone")
  };

  try {

    /*
      Endpoint opcional de perfil.
      Se o backend já possuir PUT /me,
      a atualização será persistida.
    */

    await apiRequest("/me", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    state.merchant = {
      ...state.merchant,
      ...payload
    };

    updateMerchantUI();

    showToast(
      "Definições guardadas."
    );

  } catch (error) {

    showToast(
      error.message ||
      "Não foi possível guardar as alterações.",
      "error"
    );

  }
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

function handleQuickAction(event) {

  const action =
    event.currentTarget.dataset.action;

  switch (action) {

    case "create-order":
      openCreateOrderModal();
      break;

    case "create-product":
      openCreateProductModal();
      break;

    case "create-link":
      openCreateLinkModal();
      break;

    case "payments":
      window.location.hash = "payments";
      break;

    case "customers":
      window.location.hash = "customers";
      break;

    case "reports":
      window.location.hash = "reports";
      break;

  }
}

/* =========================================================
   ROUTER
========================================================= */

async function renderRoute(route) {

  pageContent.innerHTML = `
    <div class="panel">
      <div class="empty-state">
        <div
          class="skeleton loading-block"
          style="width:100%;max-width:600px;margin:auto"
        ></div>
      </div>
    </div>
  `;

  try {

    switch (route) {

      case "dashboard":
        await renderDashboard();
        break;

      case "payments":
        await renderPayments();
        break;

      case "orders":
        await renderOrders();
        break;

      case "products":
        await renderProducts();
        break;

      case "customers":
        await renderCustomers();
        break;

      case "links":
        await renderLinks();
        break;

      case "reports":
        await renderReports();
        break;

      case "settings":
        await renderSettings();
        break;

      default:
        await renderDashboard();

    }

  } catch (error) {

    console.error(error);

    pageContent.innerHTML = `
      <div class="panel">

        <div class="empty-state">

          <div class="empty-icon">
            !
          </div>

          <h3>Não foi possível carregar esta página</h3>

          <p>
            ${escapeHTML(
              error.message ||
              "Ocorreu um erro inesperado."
            )}
          </p>

          <div style="margin-top:15px">

            <button
              class="primary-btn"
              onclick="location.reload()"
            >
              Tentar novamente
            </button>

          </div>

        </div>

      </div>
    `;

  }
}

/* =========================================================
   LOGOUT
========================================================= */

$("#logoutButton")
  .addEventListener(
    "click",
    () => {

      const confirmed =
        window.confirm(
          "Tem certeza que deseja terminar a sessão?"
        );

      if (!confirmed) return;

      redirectLogin();
    }
  );

/* =========================================================
   REFRESH
========================================================= */

$("#refreshButton")
  .addEventListener(
    "click",
    async () => {

      const button =
        $("#refreshButton");

      button.disabled = true;
      button.style.transform = "rotate(180deg)";

      try {

        await renderRoute(
          state.currentRoute
        );

        showToast(
          "Painel atualizado."
        );

      } finally {

        setTimeout(() => {
          button.disabled = false;
          button.style.transform = "";
        }, 300);

      }
    }
  );

/* =========================================================
   STARTUP
========================================================= */

async function boot() {

  /*
    Não permitir painel privado sem autenticação.
  */

  if (!getToken()) {
    redirectLogin();
    return;
  }

  try {

    await loadMerchant();

    app.classList.remove("hidden");

    setTimeout(() => {
      loader.classList.add("hide");
    }, 250);

    navigate();

  } catch (error) {

    console.error(
      "Falha ao iniciar Honey Pay:",
      error
    );

    loader.classList.add("hide");

    app.classList.remove("hidden");

    navigate();
  }
}

document.addEventListener(
  "DOMContentLoaded",
  boot
);
