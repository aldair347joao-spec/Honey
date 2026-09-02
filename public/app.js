/*
============================================================
HONEY PAY
MERCHANT PANEL
V3.2.0
STABLE SESSION / BOOT
============================================================
*/

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE = "/api";

const state = {
  authenticated: false,
  merchant: null,
  user: null,
  dashboard: null,
  payments: [],
  orders: [],
  products: [],
  customers: [],
  links: [],
  currentRoute: "dashboard",
  booted: false,
  loading: false
};

const routes = {
  dashboard: {
    parent: "Workspace",
    title: "Dashboard"
  },

  payments: {
    parent: "Workspace",
    title: "Pagamentos"
  },

  orders: {
    parent: "Workspace",
    title: "Pedidos"
  },

  products: {
    parent: "Workspace",
    title: "Produtos"
  },

  customers: {
    parent: "Workspace",
    title: "Clientes"
  },

  links: {
    parent: "Workspace",
    title: "Links de pagamento"
  },

  reports: {
    parent: "Gestão",
    title: "Relatórios"
  },

  settings: {
    parent: "Gestão",
    title: "Definições"
  }
};

/* =========================================================
   DOM
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const app = $("#app");
const loader = $("#appLoader");
const pageContent = $("#pageContent");
const toastContainer = $("#toastContainer");
const modalOverlay = $("#modalOverlay");
const modal = $("#modal");

/* =========================================================
   SESSION
========================================================= */

/*
   A sessão principal da Honey Pay é o cookie HttpOnly
   criado pelo server.js depois do Google OAuth.

   NÃO usamos localStorage como requisito para abrir
   o painel.
*/

let redirecting = false;

function redirectToLogin() {
  if (redirecting) return;

  redirecting = true;

  if (
    window.location.pathname === "/login"
  ) {
    hideLoader();
    showApp();
    return;
  }

  window.location.replace("/login");
}

async function request(
  path,
  options = {},
  config = {}
) {
  const {
    authRequired = true,
    redirectOn401 = true
  } = config;

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,

        credentials: "include",

        headers: {
          Accept: "application/json",

          ...(options.body
            ? {
                "Content-Type":
                  "application/json"
              }
            : {}),

          ...(options.headers || {})
        }
      }
    );
  } catch (error) {
    console.error(
      "Honey Pay network error:",
      error
    );

    throw new Error(
      "Não foi possível contactar o servidor."
    );
  }

  if (
    response.status === 401 &&
    authRequired
  ) {
    if (redirectOn401) {
      redirectToLogin();
    }

    throw new Error(
      "Sessão não autenticada."
    );
  }

  const text =
    await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: text
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Erro HTTP ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   SESSION CHECK
========================================================= */

async function checkSession() {
  /*
     Primeiro usamos /auth/status.

     Este endpoint NÃO redireciona.
     Ele apenas diz se existe sessão.
  */

  const status =
    await request(
      "/auth/status",
      {},
      {
        authRequired: false,
        redirectOn401: false
      }
    );

  if (
    !status ||
    status.authenticated !== true
  ) {
    return false;
  }

  if (status.user) {
    state.user = status.user;
  }

  return true;
}

async function loadCurrentUser() {
  const data =
    await request("/me");

  state.user =
    data?.user ||
    null;

  state.merchant =
    data?.merchant ||
    null;

  if (!state.user) {
    throw new Error(
      "Utilizador da sessão não encontrado."
    );
  }

  updateMerchantUI();

  return data;
}

/* =========================================================
   APP VISIBILITY
========================================================= */

function showApp() {
  if (!app) return;

  app.classList.remove("hidden");
}

function hideLoader() {
  if (!loader) return;

  loader.classList.add("hide");
}

function showLoader() {
  if (!loader) return;

  loader.classList.remove("hide");
}

/*
   IMPORTANTE:

   O painel é revelado antes de carregar dashboard,
   pagamentos, produtos, etc.

   Nenhuma dessas APIs pode bloquear a abertura
   visual da aplicação.
*/

function revealApplication() {
  showApp();

  requestAnimationFrame(() => {
    hideLoader();
  });
}

/* =========================================================
   UTILITIES
========================================================= */

function escapeHTML(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKz(value) {
  return (
    new Intl.NumberFormat(
      "pt-PT",
      {
        maximumFractionDigits: 0
      }
    ).format(
      Number(value || 0)
    ) +
    " Kz"
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    "pt-PT"
  ).format(
    Number(value || 0)
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-PT",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function initials(name) {
  const value =
    String(
      name || "Honey Pay"
    ).trim();

  if (!value) return "HP";

  const parts =
    value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getMerchantName() {
  return (
    state.merchant?.businessName ||
    state.user?.name ||
    "Meu negócio"
  );
}

function normalizeArray(
  data,
  keys = []
) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        data?.[key]
      )
    ) {
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
    REFUNDED: "Reembolsado",
    UNKNOWN: "Desconhecido"
  };

  return (
    map[
      String(
        status || ""
      ).toUpperCase()
    ] ||
    String(
      status || "Desconhecido"
    )
  );
}

function statusClass(status) {
  const value =
    String(
      status || ""
    ).toUpperCase();

  if (
    [
      "SUCCEEDED",
      "SUCCESS",
      "PAID"
    ].includes(value)
  ) {
    return "success";
  }

  if (
    [
      "PENDING",
      "PROCESSING"
    ].includes(value)
  ) {
    return "pending";
  }

  if (
    [
      "FAILED",
      "EXPIRED",
      "CANCELLED"
    ].includes(value)
  ) {
    return "failed";
  }

  if (
    [
      "REFUNDED",
      "PARTIALLY_REFUNDED"
    ].includes(value)
  ) {
    return "refunded";
  }

  return "unknown";
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  type = "success"
) {
  if (!toastContainer) return;

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    `toast ${type}`;

  toast.innerHTML = `
    <strong>
      ${
        type === "error"
          ? "!"
          : type === "warning"
          ? "!"
          : "✓"
      }
    </strong>

    <span>
      ${escapeHTML(message)}
    </span>
  `;

  toastContainer.appendChild(
    toast
  );

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

/* =========================================================
   MERCHANT UI
========================================================= */

function updateMerchantUI() {
  const name =
    getMerchantName();

  const email =
    state.user?.email ||
    "Conta Honey Pay";

  const avatar =
    initials(name);

  const merchantName =
    $("#merchantName");

  const merchantEmail =
    $("#merchantEmail");

  const topMerchantName =
    $("#topMerchantName");

  const merchantAvatar =
    $("#merchantAvatar");

  const topAvatar =
    $("#topAvatar");

  if (merchantName) {
    merchantName.textContent =
      name;
  }

  if (merchantEmail) {
    merchantEmail.textContent =
      email;
  }

  if (topMerchantName) {
    topMerchantName.textContent =
      name;
  }

  if (merchantAvatar) {
    merchantAvatar.textContent =
      avatar;
  }

  if (topAvatar) {
    topAvatar.textContent =
      avatar;
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function currentRoute() {
  const hash =
    window.location.hash
      .replace(/^#/, "")
      .trim();

  if (
    routes[hash]
  ) {
    return hash;
  }

  return "dashboard";
}

function updateNavigation(
  route
) {
  const config =
    routes[route] ||
    routes.dashboard;

  const breadcrumb =
    $("#breadcrumbParent");

  const title =
    $("#pageTitle");

  if (breadcrumb) {
    breadcrumb.textContent =
      config.parent;
  }

  if (title) {
    title.textContent =
      config.title;
  }

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.route ===
          route
      );
    });
}

async function navigate() {
  const route =
    currentRoute();

  state.currentRoute =
    route;

  updateNavigation(
    route
  );

  await renderRoute(
    route
  );
}

window.addEventListener(
  "hashchange",
  () => {
    navigate().catch(
      console.error
    );
  }
);

/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {
  $("#sidebar")
    ?.classList.add(
      "open"
    );

  $("#sidebarOverlay")
    ?.classList.add(
      "active"
    );
}

function closeSidebar() {
  $("#sidebar")
    ?.classList.remove(
      "open"
    );

  $("#sidebarOverlay")
    ?.classList.remove(
      "active"
    );
}

$("#menuButton")
  ?.addEventListener(
    "click",
    openSidebar
  );

$("#sidebarClose")
  ?.addEventListener(
    "click",
    closeSidebar
  );

$("#sidebarOverlay")
  ?.addEventListener(
    "click",
    closeSidebar
  );

/* =========================================================
   DATA LOADERS
========================================================= */

async function loadDashboard() {
  try {
    const data =
      await request(
        "/dashboard"
      );

    state.dashboard =
      data?.dashboard ||
      data;

    return state.dashboard;
  } catch (error) {
    console.warn(
      "Dashboard:",
      error.message
    );

    return null;
  }
}

async function loadPayments() {
  try {
    const data =
      await request(
        "/payments"
      );

    state.payments =
      normalizeArray(
        data,
        [
          "payments",
          "data",
          "results"
        ]
      );

    return state.payments;
  } catch (error) {
    console.warn(
      "Payments:",
      error.message
    );

    state.payments = [];

    return [];
  }
}

async function loadOrders() {
  try {
    const data =
      await request(
        "/orders"
      );

    state.orders =
      normalizeArray(
        data,
        [
          "orders",
          "data",
          "results"
        ]
      );

    return state.orders;
  } catch (error) {
    console.warn(
      "Orders:",
      error.message
    );

    state.orders = [];

    return [];
  }
}

async function loadProducts() {
  try {
    const data =
      await request(
        "/products"
      );

    state.products =
      normalizeArray(
        data,
        [
          "products",
          "data",
          "results"
        ]
      );

    return state.products;
  } catch (error) {
    console.warn(
      "Products:",
      error.message
    );

    state.products = [];

    return [];
  }
}

async function loadCustomers() {
  try {
    const data =
      await request(
        "/customers"
      );

    state.customers =
      normalizeArray(
        data,
        [
          "customers",
          "data",
          "results"
        ]
      );

    return state.customers;
  } catch (error) {
    console.warn(
      "Customers:",
      error.message
    );

    state.customers = [];

    return [];
  }
}

async function loadLinks() {
  try {
    const data =
      await request(
        "/payment-links"
      );

    state.links =
      normalizeArray(
        data,
        [
          "links",
          "paymentLinks",
          "data",
          "results"
        ]
      );

    return state.links;
  } catch (error) {
    console.warn(
      "Payment links:",
      error.message
    );

    state.links = [];

    return [];
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

async function renderDashboard() {
  pageContent.innerHTML = `
    <div class="welcome">
      <div>
        <h2>
          Olá,
          ${escapeHTML(
            getMerchantName()
              .split(" ")[0]
          )}
          👋
        </h2>

        <p>
          Aqui está o resumo do seu negócio.
        </p>
      </div>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span class="stat-label">
          Volume recebido
        </span>

        <div
          id="statRevenue"
          class="stat-value"
        >
          —
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Transações
        </span>

        <div
          id="statTransactions"
          class="stat-value"
        >
          —
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Taxas Honey Pay
        </span>

        <div
          id="statFees"
          class="stat-value"
        >
          —
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-label">
          Pendentes
        </span>

        <div
          id="statPending"
          class="stat-value"
        >
          —
        </div>
      </div>

    </div>

    <div class="dashboard-grid">

      <div class="panel">

        <div class="panel-header">
          <div>
            <h3>
              Volume de vendas
            </h3>

            <span>
              Últimos pagamentos
            </span>
          </div>
        </div>

        <div
          id="salesChart"
          class="chart"
        ></div>

      </div>

      <div class="panel">

        <div class="panel-header">
          <div>
            <h3>
              Ações rápidas
            </h3>
          </div>
        </div>

        <div class="quick-actions">

          <button
            class="quick-action"
            data-route-action="orders"
          >
            ＋ Novo pedido
          </button>

          <button
            class="quick-action"
            data-route-action="products"
          >
            ◇ Produtos
          </button>

          <button
            class="quick-action"
            data-route-action="links"
          >
            ↗ Criar link
          </button>

          <button
            class="quick-action"
            data-route-action="payments"
          >
            ↔ Pagamentos
          </button>

        </div>

      </div>

    </div>

    <div class="panel table-panel">

      <div class="panel-header">

        <div>
          <h3>
            Transações recentes
          </h3>

          <span>
            Últimos pagamentos
          </span>
        </div>

        <a
          href="#payments"
          class="panel-link"
        >
          Ver todas →
        </a>

      </div>

      <div id="recentPayments">
        <div class="empty-state">
          <h3>
            A carregar...
          </h3>
        </div>
      </div>

    </div>
  `;

  document
    .querySelectorAll(
      "[data-route-action]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          window.location.hash =
            button.dataset.routeAction;
        }
      );
    });

  /*
     O dashboard pode falhar sem impedir
     a página de abrir.
  */

  await Promise.allSettled([
    loadDashboard(),
    loadPayments()
  ]);

  fillDashboard();

  renderRecentPayments();
}

function fillDashboard() {
  const dashboard =
    state.dashboard || {};

  const revenue =
    dashboard.revenue ??
    dashboard.totalRevenue ??
    dashboard.totalReceived ??
    state.payments
      .filter((payment) =>
        [
          "SUCCEEDED",
          "SUCCESS",
          "PAID"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
      )
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

  const fees =
    dashboard.fees ??
    dashboard.totalFees ??
    0;

  const pending =
    state.payments.filter(
      (payment) =>
        [
          "PENDING",
          "PROCESSING"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    ).length;

  $("#statRevenue").textContent =
    formatKz(revenue);

  $("#statTransactions").textContent =
    formatNumber(
      state.payments.length
    );

  $("#statFees").textContent =
    formatKz(fees);

  $("#statPending").textContent =
    formatNumber(pending);
}

function renderRecentPayments() {
  const container =
    $("#recentPayments");

  if (!container) return;

  if (
    !state.payments.length
  ) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>
          Nenhuma transação ainda
        </h3>

        <p>
          Os pagamentos aparecerão aqui.
        </p>
      </div>
    `;

    return;
  }

  const payments =
    state.payments
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b.createdAt || 0
          ) -
          new Date(
            a.createdAt || 0
          )
      )
      .slice(0, 8);

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
          </tr>
        </thead>

        <tbody>

          ${payments
            .map(
              (payment) => `
                <tr>

                  <td>
                    ${
                      escapeHTML(
                        payment.customer?.name ||
                        payment.customerName ||
                        "Cliente"
                      )
                    }
                  </td>

                  <td class="muted">
                    ${
                      escapeHTML(
                        payment.reference ||
                        payment.merchantReference ||
                        "—"
                      )
                    }
                  </td>

                  <td class="amount-cell">
                    ${formatKz(
                      payment.amount ||
                      payment.total ||
                      0
                    )}
                  </td>

                  <td>
                    <span
                      class="status ${statusClass(
                        payment.status
                      )}"
                    >
                      ${escapeHTML(
                        statusLabel(
                          payment.status
                        )
                      )}
                    </span>
                  </td>

                  <td class="muted">
                    ${formatDateTime(
                      payment.createdAt
                    )}
                  </td>

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* =========================================================
   GENERIC RESOURCE PAGES
========================================================= */

async function renderPayments() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Pagamentos</h2>
        <p>
          Todas as transações do seu negócio.
        </p>
      </div>
    </div>

    <div
      id="resourceContent"
      class="panel"
    >
      <div class="empty-state">
        <h3>
          A carregar pagamentos...
        </h3>
      </div>
    </div>
  `;

  await loadPayments();

  const container =
    $("#resourceContent");

  if (!container) return;

  if (!state.payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>
          Nenhum pagamento
        </h3>

        <p>
          Ainda não existem pagamentos.
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
            <th>Referência</th>
            <th>Cliente</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
          </tr>
        </thead>

        <tbody>

          ${state.payments
            .map(
              (payment) => `
                <tr>

                  <td>
                    ${escapeHTML(
                      payment.reference ||
                      payment.merchantReference ||
                      "—"
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      payment.customer?.name ||
                      payment.customerName ||
                      "Cliente"
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
                    <span
                      class="status ${statusClass(
                        payment.status
                      )}"
                    >
                      ${escapeHTML(
                        statusLabel(
                          payment.status
                        )
                      )}
                    </span>
                  </td>

                  <td class="muted">
                    ${formatDateTime(
                      payment.createdAt
                    )}
                  </td>

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

async function renderOrders() {
  await renderSimpleCollection(
    "orders",
    "Pedidos",
    "orders",
    "order"
  );
}

async function renderProducts() {
  await renderSimpleCollection(
    "products",
    "Produtos",
    "products",
    "product"
  );
}

async function renderCustomers() {
  await renderSimpleCollection(
    "customers",
    "Clientes",
    "customers",
    "customer"
  );
}

async function renderLinks() {
  await renderSimpleCollection(
    "links",
    "Links de pagamento",
    "links",
    "link"
  );
}

async function renderSimpleCollection(
  route,
  title,
  property,
  singular
) {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <h2>
          ${escapeHTML(title)}
        </h2>

        <p>
          Gestão de ${escapeHTML(
            title.toLowerCase()
          )}.
        </p>
      </div>

    </div>

    <div
      id="resourceContent"
      class="panel"
    >
      <div class="empty-state">
        <h3>
          A carregar...
        </h3>
      </div>
    </div>
  `;

  const loaders = {
    orders: loadOrders,
    products: loadProducts,
    customers: loadCustomers,
    links: loadLinks
  };

  const loaderFn =
    loaders[property];

  if (loaderFn) {
    await loaderFn();
  }

  const items =
    state[property] || [];

  const container =
    $("#resourceContent");

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>
          Nenhum ${escapeHTML(
            singular
          )} encontrado
        </h3>

        <p>
          Ainda não existem registos.
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
            <th>Nome / Referência</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
          </tr>
        </thead>

        <tbody>

          ${items
            .map(
              (item) => `
                <tr>

                  <td>
                    <strong>
                      ${escapeHTML(
                        item.name ||
                        item.title ||
                        item.reference ||
                        item.orderNumber ||
                        item.customerName ||
                        "Registo"
                      )}
                    </strong>
                  </td>

                  <td class="amount-cell">
                    ${formatKz(
                      item.amount ||
                      item.total ||
                      item.price ||
                      0
                    )}
                  </td>

                  <td>
                    ${
                      item.status
                        ? `
                          <span
                            class="status ${statusClass(
                              item.status
                            )}"
                          >
                            ${escapeHTML(
                              statusLabel(
                                item.status
                              )
                            )}
                          </span>
                        `
                        : "—"
                    }
                  </td>

                  <td class="muted">
                    ${formatDateTime(
                      item.createdAt
                    )}
                  </td>

                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* =========================================================
   REPORTS
========================================================= */

async function renderReports() {
  await loadPayments();

  const revenue =
    state.payments
      .filter((payment) =>
        [
          "SUCCEEDED",
          "SUCCESS",
          "PAID"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
      )
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

  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Relatórios</h2>

        <p>
          Resumo financeiro da sua conta.
        </p>
      </div>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <span class="stat-label">
          Volume recebido
        </span>

        <div class="stat-value">
          ${formatKz(revenue)}
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

    </div>
  `;
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
          Configuração da conta.
        </p>
      </div>
    </div>

    <div class="panel">

      <div class="panel-header">
        <div>
          <h3>
            Perfil
          </h3>

          <span>
            Dados da conta Honey Pay
          </span>
        </div>
      </div>

      <form
        id="settingsForm"
        style="padding:20px"
      >

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
                state.user?.name ||
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
              value="${escapeHTML(
                state.user?.email ||
                ""
              )}"
              disabled
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
                ""
              )}"
            >

          </div>

        </div>

        <div style="margin-top:20px">

          <button
            type="submit"
            class="primary-btn"
          >
            Guardar
          </button>

        </div>

      </form>

    </div>
  `;

  $("#settingsForm")
    ?.addEventListener(
      "submit",
      saveSettings
    );
}

async function saveSettings(
  event
) {
  event.preventDefault();

  const form =
    new FormData(
      event.target
    );

  try {
    const data =
      await request(
        "/merchant",
        {
          method: "PATCH",

          body:
            JSON.stringify({
              businessName:
                form.get(
                  "businessName"
                ),

              phone:
                form.get(
                  "phone"
                )
            })
        }
      );

    state.merchant =
      data?.merchant ||
      state.merchant;

    updateMerchantUI();

    showToast(
      "Definições guardadas."
    );
  } catch (error) {
    showToast(
      error.message,
      "error"
    );
  }
}

/* =========================================================
   ROUTER
========================================================= */

async function renderRoute(
  route
) {
  if (!pageContent) {
    return;
  }

  /*
     A rota nunca pode bloquear o boot.
  */

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
        break;
    }
  } catch (error) {
    console.error(
      "Route error:",
      error
    );

    pageContent.innerHTML = `
      <div class="panel">

        <div class="empty-state">

          <h3>
            A página não conseguiu carregar
          </h3>

          <p>
            ${escapeHTML(
              error.message ||
              "Erro desconhecido."
            )}
          </p>

          <button
            class="primary-btn"
            id="retryButton"
          >
            Tentar novamente
          </button>

        </div>

      </div>
    `;

    $("#retryButton")
      ?.addEventListener(
        "click",
        () =>
          renderRoute(
            state.currentRoute
          )
      );
  }
}

/* =========================================================
   LOGOUT
========================================================= */

$("#logoutButton")
  ?.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "Tem certeza que deseja terminar a sessão?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await request(
          "/auth/logout",
          {
            method: "POST"
          },
          {
            authRequired: false,
            redirectOn401: false
          }
        );
      } catch (error) {
        console.warn(
          "Logout:",
          error.message
        );
      }

      redirectToLogin();
    }
  );

/* =========================================================
   REFRESH
========================================================= */

$("#refreshButton")
  ?.addEventListener(
    "click",
    async () => {
      const button =
        $("#refreshButton");

      if (button) {
        button.disabled = true;
      }

      try {
        await renderRoute(
          state.currentRoute
        );

        showToast(
          "Painel atualizado."
        );
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    }
  );

/* =========================================================
   BOOT
========================================================= */

let bootPromise = null;

async function boot() {
  if (bootPromise) {
    return bootPromise;
  }

  bootPromise =
    (async () => {
      state.loading = true;

      showLoader();

      /*
       =====================================================
       PASSO 1
       =====================================================

       Verificar sessão.

       NÃO usar localStorage.
       NÃO carregar dashboard ainda.
       NÃO redirecionar por erro de dashboard.
      */

      let authenticated = false;

      try {
        authenticated =
          await checkSession();
      } catch (error) {
        console.error(
          "Session check failed:",
          error
        );

        /*
           Se o servidor estiver temporariamente
           indisponível, mostramos uma mensagem em vez
           de criar um redirect infinito.
        */

        revealApplication();

        pageContent.innerHTML = `
          <div class="panel">

            <div class="empty-state">

              <h3>
                Não foi possível verificar a sessão
              </h3>

              <p>
                O servidor Honey Pay não respondeu.
              </p>

              <button
                class="primary-btn"
                onclick="location.reload()"
              >
                Tentar novamente
              </button>

            </div>

          </div>
        `;

        return;
      }

      /*
       =====================================================
       NÃO AUTENTICADO
       =====================================================
      */

      if (!authenticated) {
        redirectToLogin();
        return;
      }

      /*
       =====================================================
       PASSO 2
       =====================================================

       Sessão confirmada.

       Mostramos imediatamente a aplicação.
      */

      state.authenticated =
        true;

      revealApplication();

      /*
       =====================================================
       PASSO 3
       =====================================================

       Carregar /api/me.

       Se falhar por problema secundário,
       não escondemos novamente a aplicação.
      */

      try {
        await loadCurrentUser();
      } catch (error) {
        console.error(
          "Profile loading failed:",
          error
        );
      }

      /*
       =====================================================
       PASSO 4
       =====================================================

       Abrir dashboard.

       O dashboard é secundário.
       A sessão já foi validada.
      */

      try {
        await navigate();
      } catch (error) {
        console.error(
          "Initial route failed:",
          error
        );
      }

      state.booted =
        true;

      state.loading =
        false;
    })();

  return bootPromise;
}

/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    {
      once: true
    }
  );
} else {
  boot();
}

/* =========================================================
   DEBUG
========================================================= */

window.HoneyPay =
  window.HoneyPay || {};

window.HoneyPay.state =
  state;

window.HoneyPay.boot =
  boot;

window.HoneyPay.session =
  checkSession;
