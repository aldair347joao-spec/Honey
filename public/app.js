/*
============================================================
HONEY PAY
MERCHANT PANEL
STABLE VERSION
FRONTEND / SESSION / DASHBOARD / PAYMENTS
============================================================
*/

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE = "/api";
const API_TIMEOUT = 10000;
const BOOT_TIMEOUT = 15000;

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
  bankAccounts: [],

  currentRoute: "dashboard",

  booted: false,
  loading: false,
  refreshing: false,

  paymentRefreshTimer: null,
  dashboardRefreshTimer: null
};

/* =========================================================
   ROUTES
========================================================= */

const ROUTES = {
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

  "bank-accounts": {
    parent: "Workspace",
    title: "Contas bancárias"
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
   DOM HELPERS
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  return [];
}

function formatKz(value) {
  const number = Number(value || 0);

  return (
    new Intl.NumberFormat("pt-PT", {
      maximumFractionDigits: 0
    }).format(number) + " Kz"
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function initials(value) {
  const text = String(value || "H").trim();

  if (!text) {
    return "H";
  }

  return (
    text
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase() || "H"
  );
}

function getMerchantName() {
  return (
    state.merchant?.businessName ||
    state.merchant?.name ||
    state.merchant?.companyName ||
    state.user?.businessName ||
    state.user?.name ||
    state.user?.email ||
    "Meu negócio"
  );
}

function getErrorMessage(error, fallback = "Ocorreu um erro.") {
  if (!error) {
    return fallback;
  }

  return (
    error.message ||
    error.error ||
    error.data?.message ||
    error.data?.error ||
    fallback
  );
}

/* =========================================================
   STATUS
========================================================= */

function statusLabel(status) {
  const value = String(status || "").toUpperCase();

  const labels = {
    PENDING: "Pendente",
    PROCESSING: "Em processamento",
    PAID: "Pago",
    SUCCEEDED: "Concluído",
    SUCCESS: "Concluído",
    FAILED: "Falhou",
    EXPIRED: "Expirado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado",
    ACTIVE: "Ativo",
    INACTIVE: "Inativo"
  };

  return labels[value] || status || "—";
}

function statusClass(status) {
  const value = String(status || "").toUpperCase();

  if (
    [
      "PAID",
      "SUCCEEDED",
      "SUCCESS",
      "ACTIVE"
    ].includes(value)
  ) {
    return "success";
  }

  if (
    [
      "FAILED",
      "CANCELLED",
      "EXPIRED",
      "REFUNDED"
    ].includes(value)
  ) {
    return "danger";
  }

  if (
    [
      "PROCESSING",
      "PENDING"
    ].includes(value)
  ) {
    return "warning";
  }

  return "neutral";
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {
  const container = $("#toastContainer");

  if (!container) {
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <div class="toast-content">
      <strong>
        ${
          type === "success"
            ? "Sucesso"
            : type === "error"
              ? "Erro"
              : "Honey Pay"
        }
      </strong>

      <span>${escapeHTML(message)}</span>
    </div>

    <button
      type="button"
      class="toast-close"
      aria-label="Fechar"
    >
      ×
    </button>
  `;

  toast
    .querySelector(".toast-close")
    ?.addEventListener("click", () => {
      toast.remove();
    });

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 5000);
}

/* =========================================================
   REQUEST TIMEOUT
========================================================= */

function createTimeoutController(timeout = API_TIMEOUT) {
  const controller = new AbortController();

  const timer = window.setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    controller,
    cleanup() {
      window.clearTimeout(timer);
    }
  };
}

/* =========================================================
   API CORE
========================================================= */

async function request(
  path,
  options = {},
  config = {}
) {
  const {
    authRequired = true,
    redirectOn401 = true,
    timeout = API_TIMEOUT
  } = config;

  const timeoutControl =
    createTimeoutController(timeout);

  const headers = {
    Accept: "application/json",
    ...(options.body
      ? {
          "Content-Type": "application/json"
        }
      : {}),
    ...(options.headers || {})
  };

  const requestOptions = {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers
  };

  if (!requestOptions.signal) {
    requestOptions.signal =
      timeoutControl.controller.signal;
  }

  let response;

  try {
    response = await fetch(
      path.startsWith("http")
        ? path
        : `${API_BASE}${path}`,
      requestOptions
    );
  } catch (error) {
    timeoutControl.cleanup();

    if (error?.name === "AbortError") {
      const timeoutError = new Error(
        "O servidor demorou demasiado tempo a responder."
      );

      timeoutError.status = 408;
      timeoutError.code = "REQUEST_TIMEOUT";

      throw timeoutError;
    }

    throw new Error(
      "Não foi possível contactar o servidor."
    );
  }

  timeoutControl.cleanup();

  let data = null;

  const contentType =
    response.headers.get("content-type") || "";

  try {
    if (
      contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      data = await response.json();
    } else {
      const text = await response.text();

      data = text || null;
    }
  } catch {
    data = null;
  }

  if (response.status === 401) {
    state.authenticated = false;

    if (
      authRequired &&
      redirectOn401
    ) {
      redirectToLogin();
    }

    const error = new Error(
      data?.message ||
        data?.error ||
        "Sessão expirada."
    );

    error.status = 401;
    error.data = data;

    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        data?.details ||
        `Erro HTTP ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

async function get(path, config = {}) {
  return request(
    path,
    {
      method: "GET"
    },
    config
  );
}

async function post(
  path,
  body = {},
  config = {}
) {
  return request(
    path,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    config
  );
}

async function put(
  path,
  body = {},
  config = {}
) {
  return request(
    path,
    {
      method: "PUT",
      body: JSON.stringify(body)
    },
    config
  );
}

async function patch(
  path,
  body = {},
  config = {}
) {
  return request(
    path,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    config
  );
}

async function del(
  path,
  config = {}
) {
  return request(
    path,
    {
      method: "DELETE"
    },
    config
  );
}

/* =========================================================
   SESSION
========================================================= */

async function loadSession() {
  try {
    const data = await get(
      "/me",
      {
        authRequired: false,
        redirectOn401: false,
        timeout: 8000
      }
    );

    if (!data) {
      return false;
    }

    state.user =
      data.user ||
      data.data?.user ||
      null;

    state.merchant =
      data.merchant ||
      data.data?.merchant ||
      state.user?.merchant ||
      null;

    state.authenticated = true;

    updateMerchantUI();

    return true;
  } catch (error) {
    if (error?.status === 401) {
      state.authenticated = false;
      return false;
    }

    console.warn(
      "Honey Pay: não foi possível carregar /me.",
      error
    );

    return false;
  }
}

function redirectToLogin() {
  if (
    window.location.pathname === "/login"
  ) {
    return;
  }

  if (window.__honeyRedirecting) {
    return;
  }

  window.__honeyRedirecting = true;

  window.location.replace("/login");
}

/* =========================================================
   LOADER
========================================================= */

function getApp() {
  return document.getElementById("app");
}

function getLoader() {
  return document.getElementById("appLoader");
}

function revealApplication() {
  const app = getApp();
  const loader = getLoader();

  if (app) {
    app.classList.remove("hidden");
    app.removeAttribute("aria-hidden");
  }

  if (loader) {
    loader.classList.add("hide");

    loader.style.pointerEvents = "none";

    window.setTimeout(() => {
      loader.style.display = "none";
    }, 450);
  }
}

function forceHideLoader() {
  const loader = getLoader();

  if (!loader) {
    return;
  }

  loader.classList.add("hide");
  loader.style.display = "none";
  loader.style.visibility = "hidden";
  loader.style.opacity = "0";
  loader.style.pointerEvents = "none";
}

function showLoader() {
  const loader = getLoader();

  if (!loader) {
    return;
  }

  loader.style.display = "";
  loader.style.visibility = "";
  loader.style.opacity = "";
  loader.style.pointerEvents = "";

  loader.classList.remove("hide");
}

/* =========================================================
   MERCHANT UI
========================================================= */

function updateMerchantUI() {
  const name = getMerchantName();

  const email =
    state.merchant?.email ||
    state.user?.email ||
    "—";

  const avatar = initials(name);

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
    merchantName.textContent = name;
  }

  if (merchantEmail) {
    merchantEmail.textContent = email;
  }

  if (topMerchantName) {
    topMerchantName.textContent = name;
  }

  if (merchantAvatar) {
    merchantAvatar.textContent = avatar;
  }

  if (topAvatar) {
    topAvatar.textContent = avatar;
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function getCurrentRoute() {
  const hash = window.location.hash
    .replace("#", "")
    .trim();

  if (ROUTES[hash]) {
    return hash;
  }

  return "dashboard";
}

function updateNavigation(route) {
  document
    .querySelectorAll(".nav-item[data-route]")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.route === route
      );
    });

  const config =
    ROUTES[route] ||
    ROUTES.dashboard;

  const parent =
    $("#breadcrumbParent");

  const title =
    $("#pageTitle");

  if (parent) {
    parent.textContent =
      config.parent;
  }

  if (title) {
    title.textContent =
      config.title;
  }
}

function setupRouting() {
  window.addEventListener(
    "hashchange",
    async () => {
      if (!state.authenticated) {
        return;
      }

      const route =
        getCurrentRoute();

      state.currentRoute =
        route;

      updateNavigation(route);

      try {
        await renderRoute(route);
      } catch (error) {
        console.error(
          "Honey Pay route error:",
          error
        );

        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar esta página."
          )
        );
      }
    }
  );
}

function setupSidebar() {
  document
    .querySelectorAll(".nav-item[data-route]")
    .forEach(item => {
      item.addEventListener(
        "click",
        event => {
          const route =
            item.dataset.route;

          if (!ROUTES[route]) {
            return;
          }

          event.preventDefault();

          window.location.hash =
            route;
        }
      );
    });
}

/* =========================================================
   MODAL
========================================================= */

function setupModal() {
  const overlay =
    $("#modalOverlay");

  if (!overlay) {
    return;
  }

  overlay.addEventListener(
    "click",
    event => {
      if (
        event.target === overlay
      ) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
      ) {
        closeModal();
      }
    }
  );
}

function openModal(content) {
  const overlay =
    $("#modalOverlay");

  const modal =
    $("#modal");

  if (!overlay || !modal) {
    return;
  }

  modal.innerHTML = content;

  overlay.classList.remove("hidden");

  overlay.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeModal() {
  const overlay =
    $("#modalOverlay");

  if (!overlay) {
    return;
  }

  overlay.classList.add("hidden");

  overlay.setAttribute(
    "aria-hidden",
    "true"
  );
}

/* =========================================================
   REFRESH
========================================================= */

function setupRefreshButton() {
  const button =
    $("#refreshButton");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      if (state.refreshing) {
        return;
      }

      state.refreshing = true;

      button.disabled = true;

      try {
        await renderRoute(
          state.currentRoute ||
            getCurrentRoute(),
          true
        );

        showToast(
          "Dados atualizados.",
          "success"
        );
      } catch (error) {
        showToast(
          getErrorMessage(
            error,
            "Não foi possível atualizar."
          ),
          "error"
        );
      } finally {
        state.refreshing = false;
        button.disabled = false;
      }
    }
  );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
  const buttons =
    document.querySelectorAll(
      "[data-action='logout'], #logoutButton, #logoutBtn"
    );

  buttons.forEach(button => {
    button.addEventListener(
      "click",
      async event => {
        event.preventDefault();

        try {
          await post(
            "/auth/logout",
            {},
            {
              authRequired: false,
              redirectOn401: false,
              timeout: 5000
            }
          );
        } catch (error) {
          console.warn(
            "Logout:",
            error
          );
        }

        state.authenticated = false;

        window.location.replace(
          "/login"
        );
      }
    );
  });
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  const data = await get(
    "/dashboard",
    {
      timeout: 9000
    }
  );

  state.dashboard =
    data?.dashboard ||
    data?.data?.dashboard ||
    data?.data ||
    data ||
    null;

  return state.dashboard;
}

function dashboardCard(
  label,
  value,
  icon = ""
) {
  return `
    <div class="stat-card">
      <div class="stat-card-icon">
        ${escapeHTML(icon)}
      </div>

      <div class="stat-card-content">
        <span class="stat-label">
          ${escapeHTML(label)}
        </span>

        <strong class="stat-value">
          ${escapeHTML(value)}
        </strong>
      </div>
    </div>
  `;
}

function renderDashboard(data) {
  const dashboard =
    data ||
    state.dashboard ||
    {};

  const totalOrders =
    Number(
      dashboard.totalOrders || 0
    );

  const paidOrders =
    Number(
      dashboard.paidOrders || 0
    );

  const pendingOrders =
    Number(
      dashboard.pendingOrders || 0
    );

  const customers =
    Number(
      dashboard.totalCustomers || 0
    );

  const products =
    Number(
      dashboard.totalProducts || 0
    );

  const links =
    Number(
      dashboard.totalLinks || 0
    );

  const revenue =
    Number(
      dashboard.totalRevenue || 0
    );

  const fees =
    Number(
      dashboard.totalFees || 0
    );

  const netRevenue =
    Number(
      dashboard.netRevenue ?? revenue - fees
    );

  const recentOrders =
    normalizeArray(
      dashboard.recentOrders
    );

  return `
    <div class="page-header">
      <div>
        <h1>Visão geral</h1>
        <p>
          Acompanhe o desempenho do seu negócio.
        </p>
      </div>
    </div>

    <div class="stats-grid">

      ${dashboardCard(
        "Receita total",
        formatKz(revenue),
        "₣"
      )}

      ${dashboardCard(
        "Receita líquida",
        formatKz(netRevenue),
        "↗"
      )}

      ${dashboardCard(
        "Pedidos",
        formatNumber(totalOrders),
        "▣"
      )}

      ${dashboardCard(
        "Pagamentos concluídos",
        formatNumber(paidOrders),
        "✓"
      )}

      ${dashboardCard(
        "Pendentes",
        formatNumber(pendingOrders),
        "◷"
      )}

      ${dashboardCard(
        "Clientes",
        formatNumber(customers),
        "◉"
      )}

      ${dashboardCard(
        "Produtos",
        formatNumber(products),
        "□"
      )}

      ${dashboardCard(
        "Links",
        formatNumber(links),
        "↗"
      )}

    </div>

    <div class="content-grid">

      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Pedidos recentes</h2>
            <p>
              Últimas movimentações da sua conta.
            </p>
          </div>

          <button
            type="button"
            class="btn secondary"
            data-route-link="orders"
          >
            Ver todos
          </button>
        </div>

        ${
          recentOrders.length
            ? `
              <div class="table-wrap">
                <table class="data-table">

                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Data</th>
                    </tr>
                  </thead>

                  <tbody>

                    ${recentOrders
                      .slice(0, 10)
                      .map(order => {
                        const id =
                          order._id ||
                          order.id ||
                          order.orderId ||
                          "—";

                        const customer =
                          order.customerName ||
                          order.customer?.name ||
                          order.name ||
                          order.customerEmail ||
                          "Cliente";

                        const amount =
                          order.amount ??
                          order.total ??
                          order.value ??
                          0;

                        const status =
                          order.status ||
                          "PENDING";

                        return `
                          <tr>

                            <td>
                              ${escapeHTML(
                                String(id).slice(-10)
                              )}
                            </td>

                            <td>
                              ${escapeHTML(
                                customer
                              )}
                            </td>

                            <td>
                              ${escapeHTML(
                                formatKz(amount)
                              )}
                            </td>

                            <td>
                              <span
                                class="status ${statusClass(
                                  status
                                )}"
                              >
                                ${escapeHTML(
                                  statusLabel(status)
                                )}
                              </span>
                            </td>

                            <td>
                              ${escapeHTML(
                                formatDateTime(
                                  order.createdAt ||
                                    order.date ||
                                    order.updatedAt
                                )
                              )}
                            </td>

                          </tr>
                        `;
                      })
                      .join("")}

                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty-state">
                <div class="empty-icon">◌</div>
                <h3>Ainda não existem pedidos</h3>
                <p>
                  Os pedidos dos seus clientes aparecerão aqui.
                </p>
              </div>
            `
        }

      </section>

      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Resumo financeiro</h2>
            <p>
              Estado atual da sua conta.
            </p>
          </div>
        </div>

        <div class="summary-list">

          <div class="summary-row">
            <span>Receita bruta</span>
            <strong>
              ${escapeHTML(
                formatKz(revenue)
              )}
            </strong>
          </div>

          <div class="summary-row">
            <span>Taxas Honey Pay</span>
            <strong>
              ${escapeHTML(
                formatKz(fees)
              )}
            </strong>
          </div>

          <div class="summary-row">
            <span>Receita líquida</span>
            <strong>
              ${escapeHTML(
                formatKz(netRevenue)
              )}
            </strong>
          </div>

          <div class="summary-row">
            <span>Taxa atual</span>
            <strong>
              ${escapeHTML(
                String(
                  dashboard.honeyPayFeePercent ??
                  "0.80"
                )
              )}%
            </strong>
          </div>

        </div>

      </section>

    </div>
  `;
}

/* =========================================================
   PAYMENTS
========================================================= */

async function loadPayments() {
  const data = await get(
    "/payments",
    {
      timeout: 9000
    }
  );

  state.payments =
    normalizeArray(
      data?.payments ??
      data?.data?.payments ??
      data?.data ??
      data
    );

  return state.payments;
}

function renderPayments() {
  const payments =
    state.payments || [];

  return `
    <div class="page-header">
      <div>
        <h1>Pagamentos</h1>
        <p>
          Consulte os pagamentos recebidos.
        </p>
      </div>
    </div>

    <section class="panel">

      ${
        payments.length
          ? `
            <div class="table-wrap">

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

                  ${payments
                    .map(payment => {
                      const id =
                        payment._id ||
                        payment.id ||
                        payment.reference ||
                        "—";

                      const customer =
                        payment.customerName ||
                        payment.customer?.name ||
                        payment.customerEmail ||
                        "Cliente";

                      const amount =
                        payment.amount ||
                        payment.total ||
                        0;

                      const status =
                        payment.status ||
                        "PENDING";

                      return `
                        <tr>

                          <td>
                            ${escapeHTML(
                              String(id).slice(-12)
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              customer
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              formatKz(amount)
                            )}
                          </td>

                          <td>
                            <span
                              class="status ${statusClass(
                                status
                              )}"
                            >
                              ${escapeHTML(
                                statusLabel(status)
                              )}
                            </span>
                          </td>

                          <td>
                            ${escapeHTML(
                              formatDateTime(
                                payment.createdAt ||
                                  payment.date
                              )
                            )}
                          </td>

                        </tr>
                      `;
                    })
                    .join("")}

                </tbody>

              </table>

            </div>
          `
          : `
            <div class="empty-state">
              <div class="empty-icon">◌</div>
              <h3>Nenhum pagamento</h3>
              <p>
                Ainda não existem pagamentos registados.
              </p>
            </div>
          `
      }

    </section>
  `;
}

/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {
  const data = await get(
    "/orders",
    {
      timeout: 9000
    }
  );

  state.orders =
    normalizeArray(
      data?.orders ??
      data?.data?.orders ??
      data?.data ??
      data
    );

  return state.orders;
}

function renderOrders() {
  const orders =
    state.orders || [];

  return `
    <div class="page-header">
      <div>
        <h1>Pedidos</h1>
        <p>
          Todos os pedidos recebidos através do Honey Pay.
        </p>
      </div>
    </div>

    <section class="panel">

      ${
        orders.length
          ? `
            <div class="table-wrap">

              <table class="data-table">

                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Data</th>
                  </tr>
                </thead>

                <tbody>

                  ${orders
                    .map(order => {
                      const id =
                        order._id ||
                        order.id ||
                        order.orderId ||
                        "—";

                      const customer =
                        order.customerName ||
                        order.customer?.name ||
                        order.customerEmail ||
                        "Cliente";

                      const amount =
                        order.amount ??
                        order.total ??
                        0;

                      const status =
                        order.status ||
                        "PENDING";

                      return `
                        <tr>

                          <td>
                            ${escapeHTML(
                              String(id).slice(-12)
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              customer
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              formatKz(amount)
                            )}
                          </td>

                          <td>
                            <span
                              class="status ${statusClass(
                                status
                              )}"
                            >
                              ${escapeHTML(
                                statusLabel(status)
                              )}
                            </span>
                          </td>

                          <td>
                            ${escapeHTML(
                              formatDateTime(
                                order.createdAt ||
                                  order.date
                              )
                            )}
                          </td>

                        </tr>
                      `;
                    })
                    .join("")}

                </tbody>

              </table>

            </div>
          `
          : `
            <div class="empty-state">
              <div class="empty-icon">◌</div>
              <h3>Nenhum pedido</h3>
              <p>
                Os pedidos dos seus clientes aparecerão aqui.
              </p>
            </div>
          `
      }

    </section>
  `;
}

/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {
  const data = await get(
    "/products",
    {
      timeout: 9000
    }
  );

  state.products =
    normalizeArray(
      data?.products ??
      data?.data?.products ??
      data?.data ??
      data
    );

  return state.products;
}

function renderProducts() {
  const products =
    state.products || [];

  return `
    <div class="page-header">

      <div>
        <h1>Produtos</h1>
        <p>
          Gerencie os produtos e serviços vendidos.
        </p>
      </div>

      <button
        type="button"
        class="btn primary"
        id="newProductButton"
      >
        + Novo produto
      </button>

    </div>

    <section class="panel">

      ${
        products.length
          ? `
            <div class="cards-grid">

              ${products
                .map(product => {
                  const id =
                    product._id ||
                    product.id;

                  return `
                    <article class="product-card">

                      <div class="product-card-body">

                        <h3>
                          ${escapeHTML(
                            product.name ||
                            "Produto"
                          )}
                        </h3>

                        <p>
                          ${escapeHTML(
                            product.description ||
                            "Sem descrição."
                          )}
                        </p>

                        <strong>
                          ${escapeHTML(
                            formatKz(
                              product.price ||
                              product.amount ||
                              0
                            )
                          )}
                        </strong>

                      </div>

                      <div class="product-card-actions">

                        <button
                          type="button"
                          class="btn danger"
                          data-delete-product="${escapeHTML(
                            id
                          )}"
                        >
                          Eliminar
                        </button>

                      </div>

                    </article>
                  `;
                })
                .join("")}

            </div>
          `
          : `
            <div class="empty-state">
              <div class="empty-icon">□</div>
              <h3>Nenhum produto</h3>
              <p>
                Crie o seu primeiro produto.
              </p>
            </div>
          `
      }

    </section>
  `;
}

function setupProductActions() {
  $("#newProductButton")
    ?.addEventListener(
      "click",
      () => {
        openProductModal();
      }
    );

  document
    .querySelectorAll(
      "[data-delete-product]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset.deleteProduct;

          if (!id) {
            return;
          }

          if (
            !window.confirm(
              "Eliminar este produto?"
            )
          ) {
            return;
          }

          try {
            await del(
              `/products/${encodeURIComponent(
                id
              )}`
            );

            showToast(
              "Produto eliminado.",
              "success"
            );

            await loadProducts();

            renderPage(
              renderProducts()
            );

            setupProductActions();
          } catch (error) {
            showToast(
              getErrorMessage(
                error,
                "Não foi possível eliminar o produto."
              ),
              "error"
            );
          }
        }
      );
    });
}

function openProductModal() {
  openModal(`
    <div class="modal-header">
      <div>
        <h2>Novo produto</h2>
        <p>
          Adicione um produto ou serviço.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeProductModal"
      >
        ×
      </button>
    </div>

    <form id="productForm">

      <div class="form-group">
        <label for="productName">
          Nome
        </label>

        <input
          id="productName"
          name="name"
          required
          maxlength="120"
        />
      </div>

      <div class="form-group">
        <label for="productDescription">
          Descrição
        </label>

        <textarea
          id="productDescription"
          name="description"
          maxlength="500"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="productPrice">
          Preço
        </label>

        <input
          id="productPrice"
          name="price"
          type="number"
          min="0"
          step="1"
          required
        />
      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn secondary"
          id="cancelProduct"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="btn primary"
        >
          Criar produto
        </button>

      </div>

    </form>
  `);

  $("#closeProductModal")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#cancelProduct")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#productForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const formData =
          new FormData(form);

        const name =
          String(
            formData.get("name") || ""
          ).trim();

        const description =
          String(
            formData.get("description") ||
              ""
          ).trim();

        const price =
          Number(
            formData.get("price") || 0
          );

        if (!name) {
          showToast(
            "Informe o nome do produto.",
            "error"
          );
          return;
        }

        if (price < 0) {
          showToast(
            "O preço não pode ser negativo.",
            "error"
          );
          return;
        }

        const submit =
          form.querySelector(
            "[type='submit']"
          );

        if (submit) {
          submit.disabled = true;
        }

        try {
          await post(
            "/products",
            {
              name,
              description,
              price
            }
          );

          closeModal();

          showToast(
            "Produto criado com sucesso.",
            "success"
          );

          await loadProducts();

          renderPage(
            renderProducts()
          );

          setupProductActions();
        } catch (error) {
          showToast(
            getErrorMessage(
              error,
              "Não foi possível criar o produto."
            ),
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
          }
        }
      }
    );
}

/* =========================================================
   CUSTOMERS
========================================================= */

async function loadCustomers() {
  const data = await get(
    "/customers",
    {
      timeout: 9000
    }
  );

  state.customers =
    normalizeArray(
      data?.customers ??
      data?.data?.customers ??
      data?.data ??
      data
    );

  return state.customers;
}

function renderCustomers() {
  const customers =
    state.customers || [];

  return `
    <div class="page-header">

      <div>
        <h1>Clientes</h1>
        <p>
          Clientes associados às suas vendas.
        </p>
      </div>

      <button
        type="button"
        class="btn primary"
        id="newCustomerButton"
      >
        + Novo cliente
      </button>

    </div>

    <section class="panel">

      ${
        customers.length
          ? `
            <div class="table-wrap">

              <table class="data-table">

                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Data</th>
                  </tr>
                </thead>

                <tbody>

                  ${customers
                    .map(customer => {
                      return `
                        <tr>

                          <td>
                            ${escapeHTML(
                              customer.name ||
                              customer.fullName ||
                              "—"
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              customer.email ||
                              "—"
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              customer.phone ||
                              "—"
                            )}
                          </td>

                          <td>
                            ${escapeHTML(
                              formatDate(
                                customer.createdAt
                              )
                            )}
                          </td>

                        </tr>
                      `;
                    })
                    .join("")}

                </tbody>

              </table>

            </div>
          `
          : `
            <div class="empty-state">
              <div class="empty-icon">◉</div>
              <h3>Nenhum cliente</h3>
              <p>
                Os clientes aparecerão aqui.
              </p>
            </div>
          `
      }

    </section>
  `;
}

function setupCustomerActions() {
  $("#newCustomerButton")
    ?.addEventListener(
      "click",
      openCustomerModal
    );
}

function openCustomerModal() {
  openModal(`
    <div class="modal-header">

      <div>
        <h2>Novo cliente</h2>
        <p>
          Adicione os dados do cliente.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeCustomerModal"
      >
        ×
      </button>

    </div>

    <form id="customerForm">

      <div class="form-group">

        <label for="customerName">
          Nome
        </label>

        <input
          id="customerName"
          name="name"
          required
          maxlength="120"
        />

      </div>

      <div class="form-group">

        <label for="customerEmail">
          Email
        </label>

        <input
          id="customerEmail"
          name="email"
          type="email"
          maxlength="180"
        />

      </div>

      <div class="form-group">

        <label for="customerPhone">
          Telefone
        </label>

        <input
          id="customerPhone"
          name="phone"
          maxlength="40"
        />

      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn secondary"
          id="cancelCustomer"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="btn primary"
        >
          Criar cliente
        </button>

      </div>

    </form>
  `);

  $("#closeCustomerModal")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#cancelCustomer")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#customerForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const data =
          new FormData(form);

        const name =
          String(
            data.get("name") || ""
          ).trim();

        const email =
          String(
            data.get("email") || ""
          ).trim();

        const phone =
          String(
            data.get("phone") || ""
          ).trim();

        if (!name) {
          showToast(
            "Informe o nome do cliente.",
            "error"
          );
          return;
        }

        const submit =
          form.querySelector(
            "[type='submit']"
          );

        if (submit) {
          submit.disabled = true;
        }

        try {
          await post(
            "/customers",
            {
              name,
              email,
              phone
            }
          );

          closeModal();

          showToast(
            "Cliente criado com sucesso.",
            "success"
          );

          await loadCustomers();

          renderPage(
            renderCustomers()
          );

          setupCustomerActions();
        } catch (error) {
          showToast(
            getErrorMessage(
              error,
              "Não foi possível criar o cliente."
            ),
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
          }
        }
      }
    );
}

/* =========================================================
   PAYMENT LINKS
========================================================= */

async function loadLinks() {
  const data = await get(
    "/payment-links",
    {
      timeout: 9000
    }
  );

  state.links =
    normalizeArray(
      data?.links ??
      data?.data?.links ??
      data?.data ??
      data
    );

  return state.links;
}

function renderLinks() {
  const links =
    state.links || [];

  return `
    <div class="page-header">

      <div>
        <h1>Links de pagamento</h1>
        <p>
          Crie links para receber pagamentos através das redes sociais.
        </p>
      </div>

      <button
        type="button"
        class="btn primary"
        id="newLinkButton"
      >
        + Criar link
      </button>

    </div>

    <section class="panel">

      ${
        links.length
          ? `
            <div class="cards-grid">

              ${links
                .map(link => {
                  const id =
                    link._id ||
                    link.id ||
                    "";

                  const url =
                    link.url ||
                    link.honeyUrl ||
                    link.checkoutUrl ||
                    "";

                  return `
                    <article class="link-card">

                      <div class="link-card-body">

                        <div class="link-status">
                          <span
                            class="status ${statusClass(
                              link.status ||
                              (link.active === false
                                ? "INACTIVE"
                                : "ACTIVE")
                            )}"
                          >
                            ${escapeHTML(
                              statusLabel(
                                link.status ||
                                (link.active === false
                                  ? "INACTIVE"
                                  : "ACTIVE")
                              )
                            )}
                          </span>
                        </div>

                        <h3>
                          ${escapeHTML(
                            link.title ||
                            "Link de pagamento"
                          )}
                        </h3>

                        <p>
                          ${escapeHTML(
                            link.description ||
                            "Sem descrição."
                          )}
                        </p>

                        <strong>
                          ${escapeHTML(
                            formatKz(
                              link.amount || 0
                            )
                          )}
                        </strong>

                        ${
                          url
                            ? `
                              <div class="link-url">
                                ${escapeHTML(url)}
                              </div>
                            `
                            : ""
                        }

                      </div>

                      <div class="link-card-actions">

                        ${
                          url
                            ? `
                              <button
                                type="button"
                                class="btn secondary"
                                data-copy-link="${escapeHTML(
                                  url
                                )}"
                              >
                                Copiar
                              </button>
                            `
                            : ""
                        }

                        <button
                          type="button"
                          class="btn danger"
                          data-delete-link="${escapeHTML(
                            id
                          )}"
                        >
                          Desativar
                        </button>

                      </div>

                    </article>
                  `;
                })
                .join("")}

            </div>
          `
          : `
            <div class="empty-state">

              <div class="empty-icon">
                ↗
              </div>

              <h3>
                Nenhum link de pagamento
              </h3>

              <p>
                Crie um link e envie-o aos seus clientes pelo WhatsApp, Instagram ou Facebook.
              </p>

            </div>
          `
      }

    </section>
  `;
}

function setupLinkActions() {
  $("#newLinkButton")
    ?.addEventListener(
      "click",
      openLinkModal
    );

  document
    .querySelectorAll(
      "[data-copy-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const url =
            button.dataset.copyLink;

          if (!url) {
            return;
          }

          try {
            await navigator.clipboard.writeText(
              url
            );

            showToast(
              "Link copiado.",
              "success"
            );
          } catch {
            showToast(
              "Não foi possível copiar automaticamente.",
              "error"
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      "[data-delete-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset.deleteLink;

          if (!id) {
            return;
          }

          if (
            !window.confirm(
              "Desativar este link?"
            )
          ) {
            return;
          }

          try {
            await del(
              `/payment-links/${encodeURIComponent(
                id
              )}`
            );

            showToast(
              "Link desativado.",
              "success"
            );

            await loadLinks();

            renderPage(
              renderLinks()
            );

            setupLinkActions();
          } catch (error) {
            showToast(
              getErrorMessage(
                error,
                "Não foi possível desativar o link."
              ),
              "error"
            );
          }
        }
      );
    });
}

function openLinkModal() {
  openModal(`
    <div class="modal-header">

      <div>
        <h2>Criar link de pagamento</h2>
        <p>
          Crie um link público para o seu cliente pagar.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeLinkModal"
      >
        ×
      </button>

    </div>

    <form id="linkForm">

      <div class="form-group">

        <label for="linkTitle">
          Título
        </label>

        <input
          id="linkTitle"
          name="title"
          required
          maxlength="160"
          placeholder="Ex.: Venda de produto"
        />

      </div>

      <div class="form-group">

        <label for="linkDescription">
          Descrição
        </label>

        <textarea
          id="linkDescription"
          name="description"
          maxlength="500"
          placeholder="Descrição opcional"
        ></textarea>

      </div>

      <div class="form-group">

        <label for="linkAmount">
          Valor
        </label>

        <input
          id="linkAmount"
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          placeholder="0"
        />

      </div>

      <div class="form-group">

        <label for="linkBankAccount">
          Conta bancária
        </label>

        <select
          id="linkBankAccount"
          name="bankAccountId"
        >

          <option value="">
            Selecionar conta
          </option>

          ${state.bankAccounts
            .map(account => {
              const id =
                account._id ||
                account.id;

              return `
                <option value="${escapeHTML(id)}">
                  ${escapeHTML(
                    account.alias ||
                    account.bankName ||
                    "Conta bancária"
                  )}
                </option>
              `;
            })
            .join("")}

        </select>

      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn secondary"
          id="cancelLink"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="btn primary"
        >
          Criar link
        </button>

      </div>

    </form>
  `);

  $("#closeLinkModal")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#cancelLink")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#linkForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const formData =
          new FormData(form);

        const title =
          String(
            formData.get("title") ||
              ""
          ).trim();

        const description =
          String(
            formData.get(
              "description"
            ) || ""
          ).trim();

        const amount =
          Number(
            formData.get("amount") ||
              0
          );

        const bankAccountId =
          String(
            formData.get(
              "bankAccountId"
            ) || ""
          ).trim();

        if (!title) {
          showToast(
            "Informe o título.",
            "error"
          );
          return;
        }

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          showToast(
            "Informe um valor válido.",
            "error"
          );
          return;
        }

        const submit =
          form.querySelector(
            "[type='submit']"
          );

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "A criar...";
        }

        try {
          const payload = {
            title,
            description,
            amount
          };

          if (bankAccountId) {
            payload.bankAccountId =
              bankAccountId;
          }

          const result =
            await post(
              "/payment-links",
              payload
            );

          closeModal();

          await loadLinks();

          renderPage(
            renderLinks()
          );

          setupLinkActions();

          showToast(
            result?.message ||
              "Link criado com sucesso.",
            "success"
          );

          if (
            result?.url ||
            result?.honeyUrl
          ) {
            openLinkResultModal(
              result
            );
          }
        } catch (error) {
          showToast(
            getErrorMessage(
              error,
              "Não foi possível criar o link."
            ),
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent =
              "Criar link";
          }
        }
      }
    );
}

function openLinkResultModal(result) {
  const url =
    result?.url ||
    result?.honeyUrl ||
    "";

  if (!url) {
    return;
  }

  openModal(`
    <div class="modal-header">

      <div>
        <h2>Link criado</h2>
        <p>
          O seu link está pronto para partilhar.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeLinkResult"
      >
        ×
      </button>

    </div>

    <div class="form-group">

      <label>
        Link público
      </label>

      <input
        value="${escapeHTML(url)}"
        readonly
        id="createdLinkUrl"
      />

    </div>

    <div class="modal-actions">

      <button
        type="button"
        class="btn secondary"
        id="copyCreatedLink"
      >
        Copiar link
      </button>

      <button
        type="button"
        class="btn primary"
        id="openCreatedLink"
      >
        Abrir link
      </button>

    </div>
  `);

  $("#closeLinkResult")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#copyCreatedLink")
    ?.addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(
            url
          );

          showToast(
            "Link copiado.",
            "success"
          );
        } catch {
          showToast(
            "Não foi possível copiar.",
            "error"
          );
        }
      }
    );

  $("#openCreatedLink")
    ?.addEventListener(
      "click",
      () => {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      }
    );
}

/* =========================================================
   BANK ACCOUNTS
========================================================= */

async function loadBankAccounts() {
  const data = await get(
    "/bank-accounts",
    {
      timeout: 9000
    }
  );

  state.bankAccounts =
    normalizeArray(
      data?.accounts ??
      data?.data?.accounts ??
      data?.data ??
      data
    );

  return state.bankAccounts;
}

function renderBankAccounts() {
  const accounts =
    state.bankAccounts || [];

  return `
    <div class="page-header">

      <div>
        <h1>Contas bancárias</h1>
        <p>
          Configure as contas onde os seus clientes irão efectuar transferências.
        </p>
      </div>

      <button
        type="button"
        class="btn primary"
        id="newBankAccountButton"
      >
        + Adicionar conta
      </button>

    </div>

    <section class="panel">

      ${
        accounts.length
          ? `
            <div class="cards-grid">

              ${accounts
                .map(account => {
                  const id =
                    account._id ||
                    account.id ||
                    "";

                  const defaultAccount =
                    Boolean(
                      account.isDefault
                    );

                  return `
                    <article class="bank-card">

                      <div class="bank-card-header">

                        <div>
                          <h3>
                            ${escapeHTML(
                              account.alias ||
                              account.bankName ||
                              "Conta bancária"
                            )}
                          </h3>

                          ${
                            defaultAccount
                              ? `
                                <span class="status success">
                                  Principal
                                </span>
                              `
                              : ""
                          }

                        </div>

                      </div>

                      <div class="bank-card-body">

                        <div>
                          <span>Banco</span>
                          <strong>
                            ${escapeHTML(
                              account.bankName ||
                              "—"
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Titular</span>
                          <strong>
                            ${escapeHTML(
                              account.accountHolder ||
                              "—"
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Conta</span>
                          <strong>
                            ${escapeHTML(
                              account.accountNumber ||
                              account.iban ||
                              "—"
                            )}
                          </strong>
                        </div>

                      </div>

                      <div class="bank-card-actions">

                        <button
                          type="button"
                          class="btn secondary"
                          data-edit-bank="${escapeHTML(
                            id
                          )}"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          class="btn danger"
                          data-delete-bank="${escapeHTML(
                            id
                          )}"
                        >
                          Remover
                        </button>

                      </div>

                    </article>
                  `;
                })
                .join("")}

            </div>
          `
          : `
            <div class="empty-state">

              <div class="empty-icon">
                $
              </div>

              <h3>
                Nenhuma conta bancária
              </h3>

              <p>
                Adicione pelo menos uma conta para começar a receber pagamentos.
              </p>

              <button
                type="button"
                class="btn primary"
                id="emptyAddBank"
              >
                Adicionar conta
              </button>

            </div>
          `
      }

    </section>
  `;
}

function setupBankAccountActions() {
  $("#newBankAccountButton")
    ?.addEventListener(
      "click",
      () => openBankAccountModal()
    );

  $("#emptyAddBank")
    ?.addEventListener(
      "click",
      () => openBankAccountModal()
    );

  document
    .querySelectorAll(
      "[data-edit-bank]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const id =
            button.dataset.editBank;

          const account =
            state.bankAccounts.find(
              item =>
                String(
                  item._id ||
                  item.id
                ) === String(id)
            );

          if (account) {
            openBankAccountModal(
              account
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      "[data-delete-bank]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset.deleteBank;

          if (!id) {
            return;
          }

          if (
            !window.confirm(
              "Remover esta conta bancária?"
            )
          ) {
            return;
          }

          try {
            await del(
              `/bank-accounts/${encodeURIComponent(
                id
              )}`
            );

            showToast(
              "Conta removida.",
              "success"
            );

            await loadBankAccounts();

            renderPage(
              renderBankAccounts()
            );

            setupBankAccountActions();
          } catch (error) {
            showToast(
              getErrorMessage(
                error,
                "Não foi possível remover a conta."
              ),
              "error"
            );
          }
        }
      );
    });
}

function openBankAccountModal(
  account = null
) {
  const editing = Boolean(account);

  const id =
    account?._id ||
    account?.id ||
    "";

  openModal(`
    <div class="modal-header">

      <div>
        <h2>
          ${
            editing
              ? "Editar conta bancária"
              : "Adicionar conta bancária"
          }
        </h2>

        <p>
          Estes dados serão apresentados ao cliente no checkout.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeBankModal"
      >
        ×
      </button>

    </div>

    <form id="bankAccountForm">

      <div class="form-group">

        <label for="bankName">
          Banco
        </label>

        <input
          id="bankName"
          name="bankName"
          required
          maxlength="120"
          value="${escapeHTML(
            account?.bankName || ""
          )}"
          placeholder="Ex.: BFA"
        />

      </div>

      <div class="form-group">

        <label for="bankAccountNumber">
          Número da conta
        </label>

        <input
          id="bankAccountNumber"
          name="accountNumber"
          maxlength="80"
          value="${escapeHTML(
            account?.accountNumber || ""
          )}"
        />

      </div>

      <div class="form-group">

        <label for="bankIban">
          IBAN
        </label>

        <input
          id="bankIban"
          name="iban"
          maxlength="80"
          value="${escapeHTML(
            account?.iban || ""
          )}"
        />

      </div>

      <div class="form-group">

        <label for="bankHolder">
          Titular da conta
        </label>

        <input
          id="bankHolder"
          name="accountHolder"
          required
          maxlength="160"
          value="${escapeHTML(
            account?.accountHolder || ""
          )}"
        />

      </div>

      <div class="form-group">

        <label for="bankAlias">
          Nome da conta
        </label>

        <input
          id="bankAlias"
          name="alias"
          maxlength="100"
          value="${escapeHTML(
            account?.alias || ""
          )}"
          placeholder="Ex.: Conta principal"
        />

      </div>

      <label class="checkbox-row">

        <input
          type="checkbox"
          name="isDefault"
          ${
            account?.isDefault
              ? "checked"
              : ""
          }
        />

        <span>
          Definir como conta principal
        </span>

      </label>

      <div class="modal-actions">

        <button
          type="button"
          class="btn secondary"
          id="cancelBank"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="btn primary"
        >
          ${
            editing
              ? "Guardar alterações"
              : "Adicionar conta"
          }
        </button>

      </div>

    </form>
  `);

  $("#closeBankModal")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#cancelBank")
    ?.addEventListener(
      "click",
      closeModal
    );

  $("#bankAccountForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const formData =
          new FormData(form);

        const bankName =
          String(
            formData.get(
              "bankName"
            ) || ""
          ).trim();

        const accountNumber =
          String(
            formData.get(
              "accountNumber"
            ) || ""
          ).trim();

        const iban =
          String(
            formData.get("iban") ||
              ""
          ).trim();

        const accountHolder =
          String(
            formData.get(
              "accountHolder"
            ) || ""
          ).trim();

        const alias =
          String(
            formData.get("alias") ||
              ""
          ).trim();

        const isDefault =
          formData.get(
            "isDefault"
          ) === "on";

        if (!bankName) {
          showToast(
            "Informe o banco.",
            "error"
          );
          return;
        }

        if (
          !accountNumber &&
          !iban
        ) {
          showToast(
            "Informe o número da conta ou IBAN.",
            "error"
          );
          return;
        }

        if (!accountHolder) {
          showToast(
            "Informe o titular da conta.",
            "error"
          );
          return;
        }

        const submit =
          form.querySelector(
            "[type='submit']"
          );

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "A guardar...";
        }

        try {
          const payload = {
            bankName,
            accountNumber,
            iban,
            accountHolder,
            alias,
            isDefault
          };

          if (editing) {
            await put(
              `/bank-accounts/${encodeURIComponent(
                id
              )}`,
              payload
            );
          } else {
            await post(
              "/bank-accounts",
              payload
            );
          }

          closeModal();

          showToast(
            editing
              ? "Conta actualizada."
              : "Conta adicionada.",
            "success"
          );

          await loadBankAccounts();

          renderPage(
            renderBankAccounts()
          );

          setupBankAccountActions();
        } catch (error) {
          showToast(
            getErrorMessage(
              error,
              "Não foi possível guardar a conta."
            ),
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
          }
        }
      }
    );
}

/* =========================================================
   REPORTS
========================================================= */

async function loadReports() {
  return get(
    "/reports",
    {
      timeout: 9000
    }
  );
}

async function renderReports() {
  let data = null;

  try {
    data =
      await loadReports();
  } catch (error) {
    console.warn(
      "Reports:",
      error
    );

    data = {};
  }

  const report =
    data?.reports ||
    data?.data?.reports ||
    data?.data ||
    data ||
    {};

  return `
    <div class="page-header">

      <div>
        <h1>Relatórios</h1>
        <p>
          Visão financeira e operacional do seu negócio.
        </p>
      </div>

    </div>

    <div class="stats-grid">

      ${dashboardCard(
        "Receita",
        formatKz(
          report.totalRevenue ??
          state.dashboard?.totalRevenue ??
          0
        ),
        "₣"
      )}

      ${dashboardCard(
        "Pedidos",
        formatNumber(
          report.totalOrders ??
          state.dashboard?.totalOrders ??
          0
        ),
        "▣"
      )}

      ${dashboardCard(
        "Clientes",
        formatNumber(
          report.totalCustomers ??
          state.dashboard?.totalCustomers ??
          0
        ),
        "◉"
      )}

      ${dashboardCard(
        "Produtos",
        formatNumber(
          report.totalProducts ??
          state.dashboard?.totalProducts ??
          0
        ),
        "□"
      )}

    </div>

    <section class="panel">

      <div class="panel-header">

        <div>
          <h2>
            Resumo
          </h2>

          <p>
            Dados disponíveis no período actual.
          </p>
        </div>

      </div>

      <div class="summary-list">

        <div class="summary-row">
          <span>Receita bruta</span>
          <strong>
            ${escapeHTML(
              formatKz(
                report.totalRevenue ??
                state.dashboard?.totalRevenue ??
                0
              )
            )}
          </strong>
        </div>

        <div class="summary-row">
          <span>Taxas</span>
          <strong>
            ${escapeHTML(
              formatKz(
                report.totalFees ??
                state.dashboard?.totalFees ??
                0
              )
            )}
          </strong>
        </div>

        <div class="summary-row">
          <span>Receita líquida</span>
          <strong>
            ${escapeHTML(
              formatKz(
                report.netRevenue ??
                state.dashboard?.netRevenue ??
                0
              )
            )}
          </strong>
        </div>

      </div>

    </section>
  `;
}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  const merchant =
    state.merchant || {};

  return `
    <div class="page-header">

      <div>
        <h1>Definições</h1>
        <p>
          Configure os dados do seu negócio.
        </p>
      </div>

    </div>

    <section class="panel">

      <div class="panel-header">

        <div>
          <h2>
            Dados do negócio
          </h2>

          <p>
            Estas informações podem ser apresentadas aos seus clientes.
          </p>
        </div>

      </div>

      <form id="settingsForm">

        <div class="form-grid">

          <div class="form-group">

            <label for="settingsBusinessName">
              Nome do negócio
            </label>

            <input
              id="settingsBusinessName"
              name="businessName"
              value="${escapeHTML(
                merchant.businessName ||
                merchant.name ||
                ""
              )}"
            />

          </div>

          <div class="form-group">

            <label for="settingsPhone">
              Telefone
            </label>

            <input
              id="settingsPhone"
              name="phone"
              value="${escapeHTML(
                merchant.phone ||
                ""
              )}"
            />

          </div>

          <div class="form-group">

            <label for="settingsNif">
              NIF
            </label>

            <input
              id="settingsNif"
              name="nif"
              value="${escapeHTML(
                merchant.nif ||
                ""
              )}"
            />

          </div>

          <div class="form-group">

            <label for="settingsCity">
              Cidade
            </label>

            <input
              id="settingsCity"
              name="city"
              value="${escapeHTML(
                merchant.city ||
                ""
              )}"
            />

          </div>

          <div class="form-group full">

            <label for="settingsAddress">
              Morada
            </label>

            <input
              id="settingsAddress"
              name="address"
              value="${escapeHTML(
                merchant.address ||
                ""
              )}"
            />

          </div>

        </div>

        <div class="modal-actions">

          <button
            type="submit"
            class="btn primary"
          >
            Guardar alterações
          </button>

        </div>

      </form>

    </section>
  `;
}

function setupSettingsActions() {
  $("#settingsForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const data =
          new FormData(form);

        const payload = {
          businessName:
            String(
              data.get(
                "businessName"
              ) || ""
            ).trim(),

          phone:
            String(
              data.get("phone") ||
                ""
            ).trim(),

          nif:
            String(
              data.get("nif") ||
                ""
            ).trim(),

          city:
            String(
              data.get("city") ||
                ""
            ).trim(),

          address:
            String(
              data.get("address") ||
                ""
            ).trim()
        };

        const submit =
          form.querySelector(
            "[type='submit']"
          );

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "A guardar...";
        }

        try {
          const result =
            await patch(
              "/merchant",
              payload
            );

          state.merchant =
            result?.merchant ||
            result?.data?.merchant ||
            {
              ...state.merchant,
              ...payload
            };

          updateMerchantUI();

          showToast(
            "Definições actualizadas.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(
              error,
              "Não foi possível guardar as definições."
            ),
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent =
              "Guardar alterações";
          }
        }
      }
    );
}

/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(html) {
  const content =
    $("#pageContent");

  if (!content) {
    return;
  }

  content.innerHTML =
    html;
}

function renderLoading() {
  renderPage(`
    <div class="loading-state">
      <div class="spinner"></div>
      <p>
        A carregar...
      </p>
    </div>
  `);
}

function renderError(message) {
  renderPage(`
    <div class="error-state">

      <div class="error-icon">
        !
      </div>

      <h2>
        Não foi possível carregar esta página
      </h2>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        type="button"
        class="btn primary"
        id="retryPage"
      >
        Tentar novamente
      </button>

    </div>
  `);

  $("#retryPage")
    ?.addEventListener(
      "click",
      () => {
        renderRoute(
          state.currentRoute,
          true
        );
      }
    );
}

/* =========================================================
   ROUTE LOADER
========================================================= */

async function renderRoute(
  route,
  force = false
) {
  const target =
    ROUTES[route]
      ? route
      : "dashboard";

  state.currentRoute =
    target;

  updateNavigation(target);

  if (!force) {
    renderLoading();
  }

  switch (target) {
    case "dashboard": {
      try {
        const dashboard =
          await loadDashboard();

        renderPage(
          renderDashboard(
            dashboard
          )
        );
      } catch (error) {
        console.error(
          "Dashboard:",
          error
        );

        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar o dashboard."
          )
        );
      }

      break;
    }

    case "payments": {
      try {
        await loadPayments();

        renderPage(
          renderPayments()
        );
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os pagamentos."
          )
        );
      }

      break;
    }

    case "orders": {
      try {
        await loadOrders();

        renderPage(
          renderOrders()
        );
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os pedidos."
          )
        );
      }

      break;
    }

    case "products": {
      try {
        await loadProducts();

        renderPage(
          renderProducts()
        );

        setupProductActions();
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os produtos."
          )
        );
      }

      break;
    }

    case "customers": {
      try {
        await loadCustomers();

        renderPage(
          renderCustomers()
        );

        setupCustomerActions();
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os clientes."
          )
        );
      }

      break;
    }

    case "links": {
      try {
        await Promise.all([
          loadLinks(),
          loadBankAccounts()
        ]);

        renderPage(
          renderLinks()
        );

        setupLinkActions();
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os links."
          )
        );
      }

      break;
    }

    case "bank-accounts": {
      try {
        await loadBankAccounts();

        renderPage(
          renderBankAccounts()
        );

        setupBankAccountActions();
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar as contas bancárias."
          )
        );
      }

      break;
    }

    case "reports": {
      try {
        const html =
          await renderReports();

        renderPage(html);
      } catch (error) {
        renderError(
          getErrorMessage(
            error,
            "Não foi possível carregar os relatórios."
          )
        );
      }

      break;
    }

    case "settings": {
      renderPage(
        renderSettings()
      );

      setupSettingsActions();

      break;
    }

    default: {
      renderPage(
        renderDashboard(
          state.dashboard
        )
      );
    }
  }
}

/* =========================================================
   BANK ACCOUNT NAVIGATION
========================================================= */

function ensureBankAccountsNavigation() {
  const existing =
    document.querySelector(
      ".nav-item[data-route='bank-accounts']"
    );

  if (existing) {
    return;
  }

  const nav =
    document.querySelector(
      ".sidebar-nav, .nav-list, nav"
    );

  if (!nav) {
    return;
  }

  const item =
    document.createElement("a");

  item.href =
    "#bank-accounts";

  item.className =
    "nav-item";

  item.dataset.route =
    "bank-accounts";

  item.innerHTML = `
    <span class="nav-icon">
      $
    </span>

    <span>
      Contas bancárias
    </span>
  `;

  item.addEventListener(
    "click",
    event => {
      event.preventDefault();

      window.location.hash =
        "bank-accounts";
    }
  );

  nav.appendChild(item);
}

/* =========================================================
   BACKGROUND REFRESH
========================================================= */

function startPaymentRefresh() {
  if (
    state.paymentRefreshTimer
  ) {
    return;
  }

  state.paymentRefreshTimer =
    window.setInterval(
      async () => {
        if (
          !state.authenticated ||
          document.hidden
        ) {
          return;
        }

        try {
          await loadPayments();

          if (
            state.currentRoute ===
            "payments"
          ) {
            renderPage(
              renderPayments()
            );
          }
        } catch (error) {
          console.warn(
            "Background payment refresh:",
            error
          );
        }
      },
      30000
    );
}

function stopPaymentRefresh() {
  if (
    state.paymentRefreshTimer
  ) {
    window.clearInterval(
      state.paymentRefreshTimer
    );

    state.paymentRefreshTimer =
      null;
  }
}

/* =========================================================
   BOOT ERROR
========================================================= */

function renderBootError(error) {
  const content =
    $("#pageContent");

  if (!content) {
    return;
  }

  const message =
    getErrorMessage(
      error,
      "Não foi possível carregar os dados do painel."
    );

  content.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        !
      </div>

      <h2>
        O painel está disponível
      </h2>

      <p>
        ${escapeHTML(message)}
      </p>

      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:center;
          margin-top:18px;
        "
      >

        <button
          type="button"
          class="btn primary"
          id="bootRetry"
        >
          Tentar novamente
        </button>

        <button
          type="button"
          class="btn secondary"
          id="bootRefresh"
        >
          Actualizar página
        </button>

      </div>

    </div>
  `;

  $("#bootRetry")
    ?.addEventListener(
      "click",
      async () => {
        const button =
          $("#bootRetry");

        if (button) {
          button.disabled = true;
          button.textContent =
            "A tentar...";
        }

        try {
          await boot(true);
        } catch (retryError) {
          renderBootError(
            retryError
          );
        }
      }
    );

  $("#bootRefresh")
    ?.addEventListener(
      "click",
      () => {
        window.location.reload();
      }
    );
}

/* =========================================================
   DEFINITIVE BOOT
========================================================= */

let bootPromise = null;

async function boot(force = false) {
  if (
    state.booted &&
    !force
  ) {
    return;
  }

  if (
    bootPromise &&
    !force
  ) {
    return bootPromise;
  }

  bootPromise =
    (async () => {
      state.loading = true;

      /*
       * PRIMEIRA GARANTIA:
       * o painel é revelado imediatamente.
       *
       * Nenhuma API pode controlar o loader.
       */
      revealApplication();

      /*
       * SEGUNDA GARANTIA:
       * mesmo se alguma operação ficar presa,
       * o loader desaparece no máximo em 15 segundos.
       */
      const emergencyTimer =
        window.setTimeout(
          () => {
            console.warn(
              "Honey Pay: emergency boot timeout."
            );

            revealApplication();

            const content =
              $("#pageContent");

            if (
              content &&
              !content.innerHTML.trim()
            ) {
              renderBootError(
                new Error(
                  "O servidor demorou demasiado tempo a responder."
                )
              );
            }
          },
          BOOT_TIMEOUT
        );

      try {
        /*
         * Sessão.
         *
         * Usamos /me como fonte principal.
         */
        const authenticated =
          await loadSession();

        if (!authenticated) {
          forceHideLoader();

          redirectToLogin();

          return false;
        }

        state.authenticated =
          true;

        /*
         * A interface fica configurada
         * antes de qualquer carregamento pesado.
         */
        ensureBankAccountsNavigation();

        setupSidebar();
        setupModal();
        setupRefreshButton();
        setupLogout();
        setupRouting();

        /*
         * Garantimos que o loader desapareça
         * antes do carregamento do conteúdo.
         */
        revealApplication();

        /*
         * Carregamos apenas a rota actual.
         */
        const route =
          getCurrentRoute();

        state.currentRoute =
          route;

        await renderRoute(
          route,
          false
        );

        /*
         * Actualização periódica.
         */
        startPaymentRefresh();

        state.booted = true;

        return true;
      } catch (error) {
        console.error(
          "Honey Pay boot error:",
          error
        );

        /*
         * Nunca deixar o loader preso.
         */
        revealApplication();

        renderBootError(
          error
        );

        return false;
      } finally {
        window.clearTimeout(
          emergencyTimer
        );

        /*
         * GARANTIA FINAL.
         */
        revealApplication();

        state.loading = false;
      }
    })();

  try {
    return await bootPromise;
  } finally {
    bootPromise = null;
  }
}

/* =========================================================
   SYNCHRONOUS FAILSAFE
========================================================= */

/*
 * Esta parte executa imediatamente quando o ficheiro JS
 * começa a ser interpretado.
 *
 * Assim, mesmo que uma chamada à API demore,
 * o HTML principal não fica escondido.
 */

(function immediateFailsafe() {
  try {
    const app =
      document.getElementById(
        "app"
      );

    const loader =
      document.getElementById(
        "appLoader"
      );

    if (app) {
      app.classList.remove(
        "hidden"
      );

      app.removeAttribute(
        "aria-hidden"
      );
    }

    if (loader) {
      loader.classList.add(
        "hide"
      );

      loader.style.pointerEvents =
        "none";
    }

    window.__HONEY_JS_STARTED__ =
      true;
  } catch (error) {
    console.error(
      "Honey Pay immediate failsafe:",
      error
    );
  }
})();

/* =========================================================
   START
========================================================= */

function startHoneyPay() {
  /*
   * Não iniciar duas vezes.
   */
  if (
    window.__HONEY_PAY_STARTED__
  ) {
    return;
  }

  window.__HONEY_PAY_STARTED__ =
    true;

  boot().catch(error => {
    console.error(
      "Honey Pay fatal boot:",
      error
    );

    /*
     * Última barreira contra loader infinito.
     */
    revealApplication();

    renderBootError(
      error
    );
  });
}

/*
 * O script está com defer no index.html,
 * mas também suportamos execução directa.
 */
if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startHoneyPay,
    {
      once: true
    }
  );
} else {
  startHoneyPay();
}

/* =========================================================
   GLOBAL ERROR SAFETY NET
========================================================= */

window.addEventListener(
  "error",
  event => {
    console.error(
      "Honey Pay global error:",
      event.error ||
        event.message
    );

    /*
     * Um erro JavaScript em qualquer outro
     * módulo não deve voltar a esconder o painel.
     */
    revealApplication();
  }
);

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Honey Pay unhandled rejection:",
      event.reason
    );

    revealApplication();
  }
);

/* =========================================================
   END
========================================================= */
