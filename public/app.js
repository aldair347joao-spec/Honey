/*
============================================================
HONEY PAY
MERCHANT PANEL
APP.JS — CLEAN STABLE VERSION
============================================================

OBJETIVOS DESTA VERSÃO

1. Um único boot.
2. Um único router.
3. Um único sistema de navegação.
4. Menu lateral funciona independentemente das APIs.
5. Nenhuma API pode impedir o menu de funcionar.
6. Nenhum fetch fica pendurado indefinidamente.
7. O conteúdo das páginas é carregado depois da navegação.
8. IDs existentes do index.html são preservados.
9. Delegação de eventos para elementos dinâmicos.
10. Nenhuma duplicação de constantes/funções.
============================================================
*/

"use strict";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const API_BASE = "/api";
const API_TIMEOUT = 12000;
const PAYMENT_REFRESH_INTERVAL = 15000;

/* =========================================================
   ESTADO GLOBAL
========================================================= */

const state = {
  booted: false,
  authenticated: false,
  loading: false,
  refreshing: false,

  user: null,
  merchant: null,

  currentRoute: "dashboard",

  dashboard: null,
  payments: [],
  orders: [],
  products: [],
  customers: [],
  links: [],
  bankAccounts: [],

  paymentRefreshTimer: null
};

/* =========================================================
   ROTAS
========================================================= */

const ROUTES = Object.freeze({
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
});

/* =========================================================
   DOM
========================================================= */

const $ = selector => document.querySelector(selector);

const app = $("#app");
const loader = $("#appLoader");
const pageContent = $("#pageContent");
const toastContainer = $("#toastContainer");

const sidebar = $("#sidebar");
const sidebarOverlay = $("#sidebarOverlay");
const menuButton = $("#menuButton");
const sidebarClose = $("#sidebarClose");

const modalOverlay = $("#modalOverlay");
const modal = $("#modal");

const refreshButton = $("#refreshButton");
const logoutButton = $("#logoutButton");

/* =========================================================
   HELPERS
========================================================= */

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

function getId(item) {
  return item?._id || item?.id || "";
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
  const text = String(value || "H")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!text.length) {
    return "H";
  }

  return text
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
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
    error.data?.details ||
    fallback
  );
}

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
    ["PAID", "SUCCEEDED", "SUCCESS", "ACTIVE"].includes(value)
  ) {
    return "success";
  }

  if (
    ["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(value)
  ) {
    return "danger";
  }

  if (
    ["PROCESSING", "PENDING"].includes(value)
  ) {
    return "warning";
  }

  return "neutral";
}

function dashboardValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return 0;
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {
  if (!toastContainer) {
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

  const close = toast.querySelector(".toast-close");

  close?.addEventListener("click", () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 5000);
}

/* =========================================================
   LOADER
========================================================= */

function showLoader() {
  if (!loader) {
    return;
  }

  loader.style.display = "";
  loader.classList.remove("hide");
}

function hideLoader() {
  if (!loader) {
    return;
  }

  loader.classList.add("hide");

  window.setTimeout(() => {
    if (loader) {
      loader.style.display = "none";
    }
  }, 450);
}

function revealApplication() {
  if (!app) {
    return;
  }

  app.classList.remove("hidden");
  app.removeAttribute("aria-hidden");

  hideLoader();
}

/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {
  if (sidebar) {
    sidebar.classList.add("open");
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.add("show");
    sidebarOverlay.classList.remove("hidden");
  }

  document.body.classList.add("sidebar-open");

  menuButton?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  if (sidebar) {
    sidebar.classList.remove("open");
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.remove("show");
  }

  document.body.classList.remove("sidebar-open");

  menuButton?.setAttribute("aria-expanded", "false");
}

function setupSidebar() {
  /*
   * IMPORTANTE:
   * Esta função só trata o menu.
   * Não depende de nenhuma API.
   */

  menuButton?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    openSidebar();
  });

  sidebarClose?.addEventListener("click", event => {
    event.preventDefault();

    closeSidebar();
  });

  sidebarOverlay?.addEventListener("click", () => {
    closeSidebar();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSidebar();
      closeModal();
    }
  });

  /*
   * Links do menu.
   *
   * Event delegation:
   * mesmo que algum elemento seja recriado,
   * a navegação continua funcionando.
   */

  document.addEventListener("click", event => {
    const routeElement = event.target.closest(
      "[data-route]"
    );

    if (!routeElement) {
      return;
    }

    const route = routeElement.dataset.route;

    if (!ROUTES[route]) {
      return;
    }

    event.preventDefault();

    closeSidebar();

    navigate(route);
  });
}

/* =========================================================
   ROUTER
========================================================= */

function getCurrentRoute() {
  const hash = window.location.hash
    .replace(/^#/, "")
    .trim();

  return ROUTES[hash]
    ? hash
    : "dashboard";
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

function navigate(route) {
  if (!ROUTES[route]) {
    route = "dashboard";
  }

  closeSidebar();

  const targetHash =
    `#${route}`;

  if (
    window.location.hash !==
    targetHash
  ) {
    window.location.hash =
      targetHash;

    return;
  }

  renderRoute(route);
}

function setupRouting() {
  window.addEventListener(
    "hashchange",
    () => {
      renderRoute(
        getCurrentRoute()
      );
    }
  );

  /*
   * O brand também usa data-route,
   * mas mantemos este fallback.
   */

  const brand =
    document.querySelector(".brand");

  brand?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      navigate("dashboard");
    }
  );
}

/* =========================================================
   API — TIMEOUT SEGURO
========================================================= */

function createAbortController(
  timeout = API_TIMEOUT
) {
  const controller =
    new AbortController();

  const timer =
    window.setTimeout(
      () => controller.abort(),
      timeout
    );

  return {
    signal:
      controller.signal,

    cleanup() {
      window.clearTimeout(
        timer
      );
    }
  };
}

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

  const controller =
    createAbortController(
      timeout
    );

  const headers = {
    Accept:
      "application/json",

    ...(options.body
      ? {
          "Content-Type":
            "application/json"
        }
      : {}),

    ...(options.headers || {})
  };

  const finalOptions = {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers
  };

  if (!finalOptions.signal) {
    finalOptions.signal =
      controller.signal;
  }

  let response;

  try {
    response =
      await fetch(
        path.startsWith("http")
          ? path
          : `${API_BASE}${path}`,
        finalOptions
      );
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      const timeoutError =
        new Error(
          "O servidor demorou demasiado tempo a responder."
        );

      timeoutError.code =
        "REQUEST_TIMEOUT";

      timeoutError.status =
        408;

      throw timeoutError;
    }

    const networkError =
      new Error(
        "Não foi possível contactar o servidor."
      );

    networkError.code =
      "NETWORK_ERROR";

    throw networkError;
  } finally {
    controller.cleanup();
  }

  let data = null;

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  try {
    if (
      contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      data =
        text || null;
    }
  } catch {
    data = null;
  }

  if (
    response.status === 401
  ) {
    state.authenticated =
      false;

    if (
      authRequired &&
      redirectOn401
    ) {
      redirectToLogin();
    }

    const error =
      new Error(
        data?.message ||
        data?.error ||
        "Sessão expirada."
      );

    error.status =
      401;

    error.data =
      data;

    throw error;
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
        data?.error ||
        data?.details ||
        `Erro HTTP ${response.status}`
      );

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}

async function get(
  path,
  config = {}
) {
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
      body:
        JSON.stringify(body)
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
      body:
        JSON.stringify(body)
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
      body:
        JSON.stringify(body)
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
   AUTENTICAÇÃO
========================================================= */

async function checkSession() {
  try {
    const data =
      await get(
        "/auth/status",
        {
          authRequired: false,
          redirectOn401: false,
          timeout: 8000
        }
      );

    const authenticated =
      Boolean(
        data?.authenticated
      ) ||
      Boolean(
        data?.loggedIn
      ) ||
      Boolean(
        data?.user
      ) ||
      Boolean(
        data?.data?.authenticated
      );

    state.authenticated =
      authenticated;

    return authenticated;
  } catch (error) {
    console.warn(
      "Honey Pay: sessão não pôde ser verificada.",
      error
    );

    state.authenticated =
      false;

    return false;
  }
}

async function loadCurrentUser() {
  const data =
    await get(
      "/me",
      {
        authRequired: true,
        redirectOn401: true,
        timeout: 10000
      }
    );

  state.user =
    data?.user ||
    data?.data?.user ||
    data?.data ||
    data ||
    null;

  state.merchant =
    data?.merchant ||
    data?.data?.merchant ||
    state.user?.merchant ||
    null;

  updateMerchantUI();

  return data;
}

function redirectToLogin() {
  if (
    window.location.pathname ===
    "/login"
  ) {
    return;
  }

  if (
    window.__honeyRedirecting
  ) {
    return;
  }

  window.__honeyRedirecting =
    true;

  window.location.replace(
    "/login"
  );
}

/* =========================================================
   MERCHANT UI
========================================================= */

function updateMerchantUI() {
  const name =
    getMerchantName();

  const email =
    state.merchant?.email ||
    state.user?.email ||
    "—";

  const avatar =
    initials(name);

  const merchantName =
    $("#merchantName");

  const merchantEmail =
    $("#merchantEmail");

  const merchantAvatar =
    $("#merchantAvatar");

  const topMerchantName =
    $("#topMerchantName");

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

  if (merchantAvatar) {
    merchantAvatar.textContent =
      avatar;
  }

  if (topMerchantName) {
    topMerchantName.textContent =
      name;
  }

  if (topAvatar) {
    topAvatar.textContent =
      avatar;
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  const data =
    await get(
      "/dashboard",
      {
        timeout: 10000
      }
    );

  state.dashboard =
    data?.dashboard ||
    data?.data ||
    data ||
    {};

  return state.dashboard;
}

function renderDashboard() {
  if (!pageContent) {
    return;
  }

  const data =
    state.dashboard || {};

  const revenue =
    dashboardValue(
      data.revenue,
      data.totalRevenue,
      data.sales,
      data.totalSales
    );

  const transactions =
    dashboardValue(
      data.transactions,
      data.totalTransactions,
      data.transactionCount,
      state.payments.length
    );

  const fees =
    dashboardValue(
      data.fees,
      data.totalFees,
      data.feeAmount
    );

  const pending =
    state.payments.filter(
      payment =>
        [
          "PENDING",
          "PROCESSING"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    ).length;

  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Visão geral
        </span>

        <h2>
          Bom dia, ${escapeHTML(
            getMerchantName()
          )}
        </h2>

        <p>
          Acompanha o teu negócio e os pagamentos em tempo real.
        </p>
      </div>

      <div class="page-actions">

        <button
          class="btn primary"
          data-route="links"
          type="button"
        >
          Criar link de pagamento
        </button>

      </div>

    </div>

    <div class="stats-grid">

      <article class="stat-card">
        <span class="stat-label">
          Receita
        </span>

        <strong id="statRevenue">
          ${formatKz(revenue)}
        </strong>

        <span class="stat-meta">
          Total recebido
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Transações
        </span>

        <strong id="statTransactions">
          ${formatNumber(
            transactions
          )}
        </strong>

        <span class="stat-meta">
          Pagamentos registados
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Taxas
        </span>

        <strong id="statFees">
          ${formatKz(fees)}
        </strong>

        <span class="stat-meta">
          Taxas processadas
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Pendentes
        </span>

        <strong id="statPending">
          ${formatNumber(pending)}
        </strong>

        <span class="stat-meta">
          A aguardar confirmação
        </span>
      </article>

    </div>

    <div class="dashboard-grid">

      <section class="panel">

        <div class="panel-header">

          <div>
            <h3>
              Atividade de pagamentos
            </h3>

            <p>
              Estado atual das últimas transações.
            </p>
          </div>

          <button
            class="btn secondary"
            data-route="payments"
            type="button"
          >
            Ver pagamentos
          </button>

        </div>

        <div
          id="recentPayments"
          class="recent-list"
        ></div>

      </section>

      <section class="panel">

        <div class="panel-header">

          <div>
            <h3>
              Vendas
            </h3>

            <p>
              Resumo visual das vendas.
            </p>
          </div>

        </div>

        <div
          id="salesChart"
          class="simple-chart"
        ></div>

      </section>

    </div>
  `;

  renderRecentPayments();

  const chart =
    $("#salesChart");

  if (chart) {
    chart.innerHTML =
      renderSimpleChart();
  }
}

function renderRecentPayments() {
  const container =
    $("#recentPayments");

  if (!container) {
    return;
  }

  const payments =
    state.payments
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b.createdAt ||
            b.updatedAt ||
            0
          ) -
          new Date(
            a.createdAt ||
            a.updatedAt ||
            0
          )
      )
      .slice(0, 6);

  if (!payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>
          Nenhum pagamento ainda
        </strong>

        <span>
          Os pagamentos aparecerão aqui quando forem registados.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML =
    payments
      .map(
        payment => `
          <div class="recent-item">

            <div class="recent-icon">
              ${escapeHTML(
                initials(
                  payment.customer?.name ||
                  payment.customerName ||
                  payment.reference ||
                  "P"
                )
              )}
            </div>

            <div class="recent-main">

              <strong>
                ${escapeHTML(
                  payment.customer?.name ||
                  payment.customerName ||
                  payment.reference ||
                  "Pagamento"
                )}
              </strong>

              <span>
                ${formatDateTime(
                  payment.createdAt ||
                  payment.date ||
                  payment.updatedAt
                )}
              </span>

            </div>

            <div class="recent-side">

              <strong>
                ${formatKz(
                  payment.amount
                )}
              </strong>

              <span
                class="status ${statusClass(
                  payment.status
                )}"
              >
                ${statusLabel(
                  payment.status
                )}
              </span>

            </div>

          </div>
        `
      )
      .join("");
}

function renderSimpleChart() {
  const payments =
    state.payments || [];

  const successful =
    payments.filter(
      payment =>
        [
          "PAID",
          "SUCCEEDED",
          "SUCCESS"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    );

  if (!successful.length) {
    return `
      <div class="empty-state">
        <strong>
          Ainda não existem vendas concluídas.
        </strong>

        <span>
          O gráfico aparecerá quando houver pagamentos.
        </span>
      </div>
    `;
  }

  const grouped = {};

  successful.forEach(
    payment => {
      const date =
        formatDate(
          payment.createdAt ||
          payment.updatedAt
        );

      grouped[date] =
        (grouped[date] || 0) +
        Number(
          payment.amount || 0
        );
    }
  );

  const values =
    Object.entries(grouped)
      .slice(-7);

  const max =
    Math.max(
      ...values.map(
        ([, value]) =>
          value
      ),
      1
    );

  return `
    <div
      style="
        display:flex;
        align-items:flex-end;
        gap:10px;
        min-height:180px;
        padding:20px;
      "
    >
      ${values
        .map(
          ([date, value]) => {
            const height =
              Math.max(
                8,
                Math.round(
                  (value /
                    max) *
                    140
                )
              );

            return `
              <div
                style="
                  flex:1;
                  display:flex;
                  flex-direction:column;
                  justify-content:flex-end;
                  align-items:center;
                  gap:8px;
                  min-width:0;
                "
                title="${escapeHTML(
                  date
                )}: ${escapeHTML(
                  formatKz(
                    value
                  )
                )}"
              >

                <div
                  style="
                    width:100%;
                    max-width:42px;
                    height:${height}px;
                    border-radius:8px 8px 2px 2px;
                    background:currentColor;
                    opacity:.75;
                  "
                ></div>

                <small>
                  ${escapeHTML(
                    date.slice(
                      0,
                      5
                    )
                  )}
                </small>

              </div>
            `;
          }
        )
        .join("")}
    </div>
  `;
}

/* =========================================================
   PAGAMENTOS
========================================================= */

async function loadPayments() {
  const data =
    await get(
      "/payments",
      {
        timeout: 10000
      }
    );

  state.payments =
    normalizeArray(data);

  updatePendingBadge();

  return state.payments;
}

function updatePendingBadge() {
  const badge =
    $("#pendingBadge");

  const dot =
    $("#notificationDot");

  const pending =
    state.payments.filter(
      payment =>
        [
          "PENDING",
          "PROCESSING"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    ).length;

  if (badge) {
    badge.textContent =
      String(pending);

    badge.classList.toggle(
      "hidden",
      pending === 0
    );
  }

  if (dot) {
    dot.classList.toggle(
      "active",
      pending > 0
    );
  }
}

function paymentMethodLabel(method) {
  const value =
    String(
      method || ""
    ).toLowerCase();

  const labels = {
    multicaixa_express:
      "Multicaixa Express",

    multicaixa_reference:
      "Referência",

    multicaixa:
      "Multicaixa",

    bank_transfer:
      "Transferência",

    transfer:
      "Transferência"
  };

  return (
    labels[value] ||
    method ||
    "—"
  );
}

function renderPayments() {
  if (!pageContent) {
    return;
  }

  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Financeiro
        </span>

        <h2>
          Pagamentos
        </h2>

        <p>
          Acompanha os pagamentos recebidos pelo teu negócio.
        </p>
      </div>

      <div class="page-actions">

        <button
          id="paymentsRefresh"
          class="btn secondary"
          type="button"
        >
          Atualizar
        </button>

      </div>

    </div>

    <section class="panel">

      <div class="table-wrap">

        <table class="data-table">

          <thead>
            <tr>
              <th>Referência</th>
              <th>Cliente</th>
              <th>Método</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Data</th>
            </tr>
          </thead>

          <tbody
            id="paymentsTableBody"
          ></tbody>

        </table>

      </div>

    </section>
  `;

  renderPaymentsTable();

  $("#paymentsRefresh")
    ?.addEventListener(
      "click",
      () =>
        refreshPayments(true)
    );
}

function renderPaymentsTable() {
  const body =
    $("#paymentsTableBody");

  if (!body) {
    return;
  }

  if (!state.payments.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6">

          <div class="empty-state">

            <strong>
              Nenhum pagamento encontrado
            </strong>

            <span>
              Quando houver pagamentos, eles aparecerão aqui.
            </span>

          </div>

        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    state.payments
      .map(
        payment => `
          <tr>

            <td>
              <strong>
                ${escapeHTML(
                  payment.reference ||
                  payment.providerPaymentId ||
                  payment._id ||
                  "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(
                payment.customer?.name ||
                payment.customerName ||
                payment.customer?.email ||
                "Cliente"
              )}
            </td>

            <td>
              ${escapeHTML(
                paymentMethodLabel(
                  payment.paymentMethod
                )
              )}
            </td>

            <td>
              <strong>
                ${formatKz(
                  payment.amount
                )}
              </strong>
            </td>

            <td>
              <span
                class="status ${statusClass(
                  payment.status
                )}"
              >
                ${statusLabel(
                  payment.status
                )}
              </span>
            </td>

            <td>
              ${formatDateTime(
                payment.createdAt ||
                payment.updatedAt
              )}
            </td>

          </tr>
        `
      )
      .join("");
}

async function refreshPayments(
  showMessage = true
) {
  if (state.refreshing) {
    return;
  }

  state.refreshing =
    true;

  try {
    await loadPayments();

    if (
      state.currentRoute ===
      "payments"
    ) {
      renderPaymentsTable();
    }

    if (
      state.currentRoute ===
      "dashboard"
    ) {
      renderRecentPayments();

      const pending =
        state.payments.filter(
          payment =>
            [
              "PENDING",
              "PROCESSING"
            ].includes(
              String(
                payment.status ||
                ""
              ).toUpperCase()
            )
        ).length;

      const pendingElement =
        $("#statPending");

      if (pendingElement) {
        pendingElement.textContent =
          formatNumber(
            pending
          );
      }

      const chart =
        $("#salesChart");

      if (chart) {
        chart.innerHTML =
          renderSimpleChart();
      }
    }

    if (showMessage) {
      showToast(
        "Pagamentos atualizados.",
        "success"
      );
    }
  } catch (error) {
    if (showMessage) {
      showToast(
        getErrorMessage(error),
        "error"
      );
    }
  } finally {
    state.refreshing =
      false;
  }
}

/* =========================================================
   PEDIDOS
========================================================= */

async function loadOrders() {
  const data =
    await get(
      "/orders",
      {
        timeout: 10000
      }
    );

  state.orders =
    normalizeArray(data);

  return state.orders;
}

function renderOrders() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Operações
        </span>

        <h2>
          Pedidos
        </h2>

        <p>
          Consulta os pedidos associados aos pagamentos.
        </p>
      </div>

    </div>

    <section class="panel">

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

            ${
              state.orders.length
                ? state.orders
                    .map(
                      order => `
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
                            ${escapeHTML(
                              order.customer?.name ||
                              order.customerName ||
                              "Cliente"
                            )}
                          </td>

                          <td>
                            <strong>
                              ${formatKz(
                                order.amount
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              class="status ${statusClass(
                                order.status
                              )}"
                            >
                              ${statusLabel(
                                order.status
                              )}
                            </span>
                          </td>

                          <td>
                            ${formatDateTime(
                              order.createdAt ||
                              order.updatedAt
                            )}
                          </td>

                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="5">

                      <div class="empty-state">
                        <strong>
                          Nenhum pedido encontrado
                        </strong>

                        <span>
                          Os pedidos aparecerão aqui.
                        </span>
                      </div>

                    </td>
                  </tr>
                `
            }

          </tbody>

        </table>

      </div>

    </section>
  `;
}

/* =========================================================
   PRODUTOS
========================================================= */

async function loadProducts() {
  const data =
    await get(
      "/products",
      {
        timeout: 10000
      }
    );

  state.products =
    normalizeArray(data);

  return state.products;
}

function renderProducts() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Catálogo
        </span>

        <h2>
          Produtos
        </h2>

        <p>
          Gere os produtos e serviços do teu negócio.
        </p>
      </div>

      <div class="page-actions">

        <button
          id="newProductButton"
          class="btn primary"
          type="button"
        >
          Novo produto
        </button>

      </div>

    </div>

    <section class="panel">

      <div class="table-wrap">

        <table class="data-table">

          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th>Preço</th>
              <th>Stock</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            ${
              state.products.length
                ? state.products
                    .map(
                      product => `
                        <tr>

                          <td>

                            <strong>
                              ${escapeHTML(
                                product.name ||
                                "Produto"
                              )}
                            </strong>

                            ${
                              product.description
                                ? `
                                  <small>
                                    ${escapeHTML(
                                      product.description
                                    )}
                                  </small>
                                `
                                : ""
                            }

                          </td>

                          <td>
                            ${escapeHTML(
                              product.sku ||
                              "—"
                            )}
                          </td>

                          <td>
                            <strong>
                              ${formatKz(
                                product.price
                              )}
                            </strong>
                          </td>

                          <td>
                            ${escapeHTML(
                              product.stock ===
                              undefined
                                ? "—"
                                : String(
                                    product.stock
                                  )
                            )}
                          </td>

                          <td>

                            <span
                              class="status ${
                                product.active ===
                                false
                                  ? "neutral"
                                  : "success"
                              }"
                            >
                              ${
                                product.active ===
                                false
                                  ? "Inativo"
                                  : "Ativo"
                              }
                            </span>

                          </td>

                          <td>

                            <button
                              class="btn small secondary"
                              type="button"
                              data-product-link="${escapeHTML(
                                getId(
                                  product
                                )
                              )}"
                            >
                              Criar link
                            </button>

                          </td>

                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="6">

                      <div class="empty-state">

                        <strong>
                          Nenhum produto encontrado
                        </strong>

                        <span>
                          Cria o teu primeiro produto.
                        </span>

                      </div>

                    </td>
                  </tr>
                `
            }

          </tbody>

        </table>

      </div>

    </section>
  `;

  $("#newProductButton")
    ?.addEventListener(
      "click",
      openProductForm
    );

  document
    .querySelectorAll(
      "[data-product-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const id =
            button.dataset.productLink;

          const product =
            state.products.find(
              item =>
                String(
                  getId(item)
                ) ===
                String(id)
            );

          if (product) {
            openPaymentLinkForm(
              product
            );
          }
        }
      );
    });
}

function openProductForm() {
  openModal(
    "Novo produto",
    `
      <form
        id="productForm"
        class="form-grid"
      >

        <label>
          <span>Nome</span>

          <input
            name="name"
            required
            maxlength="150"
          >
        </label>

        <label>
          <span>Preço (Kz)</span>

          <input
            name="price"
            type="number"
            min="0"
            step="1"
            required
          >
        </label>

        <label>
          <span>SKU</span>

          <input
            name="sku"
            maxlength="80"
          >
        </label>

        <label>
          <span>Stock</span>

          <input
            name="stock"
            type="number"
            min="0"
            step="1"
          >
        </label>

        <label class="full">
          <span>Descrição</span>

          <textarea
            name="description"
            rows="4"
          ></textarea>
        </label>

        <label class="full">
          <span>Imagem</span>

          <input
            name="image"
            type="url"
            placeholder="https://..."
          >
        </label>

        <div class="form-actions full">

          <button
            type="button"
            class="btn secondary"
            data-close-modal
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
    `
  );

  $("#productForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const data =
          new FormData(form);

        const body = {
          name:
            String(
              data.get("name") ||
              ""
            ).trim(),

          price:
            Number(
              data.get("price")
            ),

          sku:
            String(
              data.get("sku") ||
              ""
            ).trim() ||
            undefined,

          stock:
            data.get("stock") === ""
              ? undefined
              : Number(
                  data.get(
                    "stock"
                  )
                ),

          description:
            String(
              data.get(
                "description"
              ) || ""
            ).trim() ||
            undefined,

          image:
            String(
              data.get("image") ||
              ""
            ).trim() ||
            undefined
        };

        try {
          await post(
            "/products",
            body
          );

          closeModal();

          await loadProducts();

          if (
            state.currentRoute ===
            "products"
          ) {
            renderProducts();
          }

          showToast(
            "Produto criado com sucesso.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(error),
            "error"
          );
        }
      }
    );
}

/* =========================================================
   CLIENTES
========================================================= */

async function loadCustomers() {
  const data =
    await get(
      "/customers",
      {
        timeout: 10000
      }
    );

  state.customers =
    normalizeArray(data);

  return state.customers;
}

function renderCustomers() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Clientes
        </span>

        <h2>
          Clientes
        </h2>

        <p>
          Consulta os clientes associados às tuas vendas.
        </p>
      </div>

    </div>

    <section class="panel">

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

            ${
              state.customers.length
                ? state.customers
                    .map(
                      customer => `
                        <tr>

                          <td>
                            <strong>
                              ${escapeHTML(
                                customer.name ||
                                customer.fullName ||
                                "Cliente"
                              )}
                            </strong>
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
                              customer.mobile ||
                              "—"
                            )}
                          </td>

                          <td>
                            ${formatDate(
                              customer.createdAt
                            )}
                          </td>

                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="4">

                      <div class="empty-state">

                        <strong>
                          Nenhum cliente encontrado
                        </strong>

                        <span>
                          Os clientes aparecerão aqui quando realizarem pagamentos.
                        </span>

                      </div>

                    </td>
                  </tr>
                `
            }

          </tbody>

        </table>

      </div>

    </section>
  `;
}

/* =========================================================
   LINKS DE PAGAMENTO
========================================================= */

async function loadLinks() {
  const data =
    await get(
      "/payment-links",
      {
        timeout: 10000
      }
    );

  state.links =
    normalizeArray(data);

  return state.links;
}

function paymentLinkToken(link) {
  return (
    link?.token ||
    link?.publicToken ||
    link?.slug ||
    ""
  );
}

function paymentLinkUrl(link) {
  return (
    link?.url ||
    link?.paymentUrl ||
    link?.checkoutUrl ||
    ""
  );
}

function paymentLinkPublicUrl(link) {
  const existing =
    paymentLinkUrl(link);

  if (existing) {
    return existing;
  }

  const token =
    paymentLinkToken(link);

  if (!token) {
    return "";
  }

  return (
    `${window.location.origin}/pay/` +
    encodeURIComponent(
      token
    )
  );
}

function renderLinks() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Recebimentos
        </span>

        <h2>
          Links de pagamento
        </h2>

        <p>
          Cria links para partilhar com os teus clientes.
        </p>
      </div>

      <div class="page-actions">

        <button
          id="newPaymentLinkButton"
          class="btn primary"
          type="button"
        >
          Novo link
        </button>

      </div>

    </div>

    <section class="panel">

      <div
        id="linksList"
      ></div>

    </section>
  `;

  renderLinksList();

  $("#newPaymentLinkButton")
    ?.addEventListener(
      "click",
      openManualPaymentLinkForm
    );
}

function renderLinksList() {
  const container =
    $("#linksList");

  if (!container) {
    return;
  }

  if (!state.links.length) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Ainda não tens links de pagamento
        </strong>

        <span>
          Cria um link e envia-o pelo WhatsApp, Instagram ou Facebook.
        </span>

        <button
          id="emptyCreateLink"
          class="btn primary"
          type="button"
        >
          Criar link
        </button>

      </div>
    `;

    $("#emptyCreateLink")
      ?.addEventListener(
        "click",
        openManualPaymentLinkForm
      );

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="data-table">

        <thead>
          <tr>
            <th>Título</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${state.links
            .map(
              link => {
                const url =
                  paymentLinkPublicUrl(
                    link
                  );

                const active =
                  link.active !==
                    false &&
                  String(
                    link.status ||
                    ""
                  ).toUpperCase() !==
                    "INACTIVE";

                return `
                  <tr>

                    <td>
                      <strong>
                        ${escapeHTML(
                          link.title ||
                          link.name ||
                          "Link"
                        )}
                      </strong>

                      ${
                        link.description
                          ? `
                            <small>
                              ${escapeHTML(
                                link.description
                              )}
                            </small>
                          `
                          : ""
                      }
                    </td>

                    <td>
                      <strong>
                        ${formatKz(
                          link.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        class="status ${
                          active
                            ? "success"
                            : "neutral"
                        }"
                      >
                        ${
                          active
                            ? "Ativo"
                            : "Inativo"
                        }
                      </span>
                    </td>

                    <td>
                      ${formatDateTime(
                        link.createdAt
                      )}
                    </td>

                    <td>

                      <div class="table-actions">

                        <button
                          class="btn small secondary"
                          type="button"
                          data-copy-link="${escapeHTML(
                            url
                          )}"
                        >
                          Copiar
                        </button>

                        <button
                          class="btn small secondary"
                          type="button"
                          data-open-link="${escapeHTML(
                            url
                          )}"
                        >
                          Abrir
                        </button>

                        <button
                          class="btn small danger"
                          type="button"
                          data-delete-link="${escapeHTML(
                            getId(
                              link
                            )
                          )}"
                        >
                          ${
                            active
                              ? "Desativar"
                              : "Eliminar"
                          }
                        </button>

                      </div>

                    </td>

                  </tr>
                `;
              }
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;

  document
    .querySelectorAll(
      "[data-copy-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          copyText(
            button.dataset.copyLink
          )
      );
    });

  document
    .querySelectorAll(
      "[data-open-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const url =
            button.dataset.openLink;

          if (!url) {
            return;
          }

          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );
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
        () =>
          deletePaymentLink(
            button.dataset.deleteLink
          )
      );
    });
}

async function deletePaymentLink(
  id
) {
  if (!id) {
    return;
  }

  const confirmed =
    window.confirm(
      "Queres realmente desativar/eliminar este link de pagamento?"
    );

  if (!confirmed) {
    return;
  }

  try {
    await del(
      `/payment-links/${encodeURIComponent(
        id
      )}`
    );

    await loadLinks();

    renderLinksList();

    showToast(
      "Link de pagamento removido.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(error),
      "error"
    );
  }
}

async function openManualPaymentLinkForm() {
  let accounts =
    state.bankAccounts;

  if (!accounts.length) {
    try {
      await loadBankAccounts();
      accounts =
        state.bankAccounts;
    } catch {
      accounts = [];
    }
  }

  openModal(
    "Novo link de pagamento",
    `
      <form
        id="manualPaymentLinkForm"
        class="form-grid"
      >

        <label class="full">
          <span>Título</span>

          <input
            name="title"
            required
            maxlength="160"
            placeholder="Ex.: T-shirt preta"
          >
        </label>

        <label class="full">
          <span>Descrição</span>

          <textarea
            name="description"
            rows="3"
            placeholder="Descrição do produto ou serviço"
          ></textarea>
        </label>

        <label>
          <span>Valor (Kz)</span>

          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
          >
        </label>

        <label>
          <span>Validade</span>

          <input
            name="expiresAt"
            type="datetime-local"
          >
        </label>

        <label class="full">
          <span>
            Conta bancária para transferência
          </span>

          <select
            name="bankAccountId"
          >

            <option value="">
              Sem conta bancária específica
            </option>

            ${accounts
              .filter(
                account =>
                  account.active !==
                  false
              )
              .map(
                account => `
                  <option
                    value="${escapeHTML(
                      getId(
                        account
                      )
                    )}"
                  >
                    ${escapeHTML(
                      account.displayName ||
                      account.bankName ||
                      account.bank ||
                      "Conta bancária"
                    )}
                    —
                    ${escapeHTML(
                      account.accountNumber ||
                      account.iban ||
                      account.number ||
                      ""
                    )}
                  </option>
                `
              )
              .join("")}

          </select>
        </label>

        <div class="form-actions full">

          <button
            type="button"
            class="btn secondary"
            data-close-modal
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
    `
  );

  $("#manualPaymentLinkForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const formData =
          new FormData(form);

        const expiresAtValue =
          formData.get(
            "expiresAt"
          );

        const body = {
          title:
            String(
              formData.get(
                "title"
              ) || ""
            ).trim(),

          description:
            String(
              formData.get(
                "description"
              ) || ""
            ).trim() ||
            undefined,

          amount:
            Number(
              formData.get(
                "amount"
              )
            ),

          bankAccountId:
            formData.get(
              "bankAccountId"
            ) ||
            undefined,

          expiresAt:
            expiresAtValue
              ? new Date(
                  expiresAtValue
                ).toISOString()
              : undefined
        };

        try {
          const data =
            await post(
              "/payment-links",
              body
            );

          closeModal();

          await loadLinks();

          showCreatedLink(
            data?.paymentLink ||
            data?.data ||
            data
          );

          showToast(
            "Link criado com sucesso.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(error),
            "error"
          );
        }
      }
    );
}

async function openPaymentLinkForm(
  product
) {
  let accounts =
    state.bankAccounts;

  if (!accounts.length) {
    try {
      await loadBankAccounts();
      accounts =
        state.bankAccounts;
    } catch {
      accounts = [];
    }
  }

  openModal(
    "Criar link de pagamento",
    `
      <form
        id="paymentLinkForm"
        class="form-grid"
      >

        <label class="full">
          <span>Produto</span>

          <input
            value="${escapeHTML(
              product.name
            )}"
            disabled
          >
        </label>

        <label class="full">
          <span>Título do link</span>

          <input
            name="title"
            value="${escapeHTML(
              product.name
            )}"
            required
          >
        </label>

        <label class="full">
          <span>Descrição</span>

          <textarea
            name="description"
            rows="3"
          >${escapeHTML(
            product.description ||
            ""
          )}</textarea>
        </label>

        <label>
          <span>Valor (Kz)</span>

          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            value="${escapeHTML(
              product.price ||
              ""
            )}"
            required
          >
        </label>

        <label>
          <span>Validade</span>

          <input
            name="expiresAt"
            type="datetime-local"
          >
        </label>

        <label class="full">
          <span>
            Conta bancária para transferência
          </span>

          <select
            name="bankAccountId"
          >

            <option value="">
              Sem conta bancária específica
            </option>

            ${accounts
              .filter(
                account =>
                  account.active !==
                  false
              )
              .map(
                account => `
                  <option
                    value="${escapeHTML(
                      getId(
                        account
                      )
                    )}"
                  >
                    ${escapeHTML(
                      account.displayName ||
                      account.bankName ||
                      account.bank ||
                      "Conta bancária"
                    )}
                  </option>
                `
              )
              .join("")}

          </select>
        </label>

        <div class="form-actions full">

          <button
            type="button"
            class="btn secondary"
            data-close-modal
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
    `
  );

  $("#paymentLinkForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form =
          event.currentTarget;

        const formData =
          new FormData(form);

        const expiresAt =
          formData.get(
            "expiresAt"
          );

        const body = {
          title:
            String(
              formData.get(
                "title"
              ) || ""
            ).trim(),

          description:
            String(
              formData.get(
                "description"
              ) || ""
            ).trim() ||
            undefined,

          amount:
            Number(
              formData.get(
                "amount"
              )
            ),

          bankAccountId:
            formData.get(
              "bankAccountId"
            ) ||
            undefined,

          expiresAt:
            expiresAt
              ? new Date(
                  expiresAt
                ).toISOString()
              : undefined
        };

        try {
          const data =
            await post(
              "/payment-links",
              body
            );

          closeModal();

          await loadLinks();

          showCreatedLink(
            data?.paymentLink ||
            data?.data ||
            data
          );

          showToast(
            "Link criado com sucesso.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(error),
            "error"
          );
        }
      }
    );
}

function showCreatedLink(
  data
) {
  const token =
    paymentLinkToken(data);

  const url =
    paymentLinkUrl(data) ||
    (
      token
        ? `${window.location.origin}/pay/${encodeURIComponent(
            token
          )}`
        : ""
    );

  const qrSource =
    data?.qrSvg ||
    data?.qrCode ||
    data?.qr ||
    "";

  openModal(
    "Link criado",
    `
      <div class="success-result">

        <div class="success-icon">
          ✓
        </div>

        <h3>
          O teu link está pronto
        </h3>

        <p>
          Envia este link ao cliente para ele efetuar o pagamento.
        </p>

        <div class="generated-link-box">

          <input
            id="generatedPaymentUrl"
            value="${escapeHTML(
              url
            )}"
            readonly
          >

          <button
            id="copyPaymentUrl"
            class="btn secondary"
            type="button"
          >
            Copiar
          </button>

        </div>

        ${
          qrSource
            ? `
              <div class="qr-preview">

                ${
                  String(
                    qrSource
                  )
                    .trim()
                    .startsWith(
                      "<svg"
                    )
                    ? qrSource
                    : `
                      <img
                        id="dashboardQr"
                        src="${escapeHTML(
                          qrSource
                        )}"
                        alt="QR Code"
                      >
                    `
                }

              </div>
            `
            : ""
        }

        <div class="result-actions">

          <button
            id="openCreatedCheckout"
            class="btn primary"
            type="button"
          >
            Abrir checkout
          </button>

          <button
            id="backLinks"
            class="btn secondary"
            type="button"
          >
            Voltar aos links
          </button>

        </div>

      </div>
    `
  );

  $("#copyPaymentUrl")
    ?.addEventListener(
      "click",
      () =>
        copyText(url)
    );

  $("#openCreatedCheckout")
    ?.addEventListener(
      "click",
      () => {
        if (!url) {
          return;
        }

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      }
    );

  $("#backLinks")
    ?.addEventListener(
      "click",
      async () => {
        closeModal();

        navigate("links");
      }
    );
}

/* =========================================================
   CONTAS BANCÁRIAS
========================================================= */

async function loadBankAccounts() {
  const data =
    await get(
      "/bank-accounts",
      {
        timeout: 10000
      }
    );

  state.bankAccounts =
    normalizeArray(data);

  return state.bankAccounts;
}

function bankAccountId(
  account
) {
  return getId(account);
}

function renderBankAccounts() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Recebimentos
        </span>

        <h2>
          Contas bancárias
        </h2>

        <p>
          Gere as contas onde os teus clientes podem fazer transferências.
        </p>
      </div>

      <div class="page-actions">

        <button
          id="addBankAccount"
          class="btn primary"
          type="button"
        >
          Adicionar conta
        </button>

      </div>

    </div>

    ${
      state.bankAccounts.length
        ? `
          <div class="bank-accounts-grid">

            ${state.bankAccounts
              .map(
                account => {
                  const id =
                    bankAccountId(
                      account
                    );

                  const bankName =
                    account.bankName ||
                    account.bank ||
                    account.name ||
                    "Banco";

                  const accountNumber =
                    account.accountNumber ||
                    account.iban ||
                    account.number ||
                    "—";

                  const holder =
                    account.accountHolder ||
                    account.holderName ||
                    account.owner ||
                    "—";

                  const active =
                    account.active !==
                    false;

                  return `
                    <article
                      class="bank-account-card"
                    >

                      <div
                        class="bank-account-top"
                      >

                        <div class="bank-logo">
                          ${escapeHTML(
                            initials(
                              bankName
                            )
                          )}
                        </div>

                        <span
                          class="status ${
                            active
                              ? "success"
                              : "neutral"
                          }"
                        >
                          ${
                            active
                              ? "Ativa"
                              : "Inativa"
                          }
                        </span>

                      </div>

                      <div
                        class="bank-account-main"
                      >

                        <span
                          class="bank-account-label"
                        >
                          Banco
                        </span>

                        <strong>
                          ${escapeHTML(
                            bankName
                          )}
                        </strong>

                        <span
                          class="bank-account-label"
                        >
                          Titular
                        </span>

                        <strong>
                          ${escapeHTML(
                            holder
                          )}
                        </strong>

                        <span
                          class="bank-account-label"
                        >
                          Conta / IBAN
                        </span>

                        <strong
                          class="bank-account-number"
                        >
                          ${escapeHTML(
                            accountNumber
                          )}
                        </strong>

                      </div>

                      <div
                        class="bank-account-actions"
                      >

                        <button
                          class="btn small secondary"
                          type="button"
                          data-edit-bank="${escapeHTML(
                            id
                          )}"
                        >
                          Editar
                        </button>

                        <button
                          class="btn small danger"
                          type="button"
                          data-delete-bank="${escapeHTML(
                            id
                          )}"
                        >
                          Remover
                        </button>

                      </div>

                    </article>
                  `;
                }
              )
              .join("")}

          </div>
        `
        : `
          <section class="panel">

            <div class="empty-state">

              <strong>
                Nenhuma conta bancária
              </strong>

              <span>
                Adiciona uma conta para começares a receber pagamentos através dos teus links.
              </span>

              <button
                id="emptyAddBankAccount"
                class="btn primary"
                type="button"
              >
                Adicionar conta
              </button>

            </div>

          </section>
        `
    }
  `;

  $("#addBankAccount")
    ?.addEventListener(
      "click",
      () =>
        openBankAccountForm()
    );

  $("#emptyAddBankAccount")
    ?.addEventListener(
      "click",
      () =>
        openBankAccountForm()
    );

  document
    .querySelectorAll(
      "[data-edit-bank]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const account =
            state.bankAccounts.find(
              item =>
                String(
                  bankAccountId(
                    item
                  )
                ) ===
                String(
                  button.dataset
                    .editBank
                )
            );

          if (account) {
            openBankAccountForm(
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
        () =>
          deleteBankAccount(
            button.dataset
              .deleteBank
          )
      );
    });
}

function openBankAccountForm(
  account = null
) {
  const editing =
    Boolean(account);

  openModal(
    editing
      ? "Editar conta bancária"
      : "Adicionar conta bancária",
    `
      <form
        id="bankAccountForm"
        class="form-grid"
      >

        <label>
          <span>Banco</span>

          <input
            name="bankName"
            required
            maxlength="120"
            value="${escapeHTML(
              account?.bankName ||
              account?.bank ||
              ""
            )}"
            placeholder="Ex.: Banco de Fomento Angola"
          >
        </label>

        <label>
          <span>Número da conta</span>

          <input
            name="accountNumber"
            maxlength="80"
            value="${escapeHTML(
              account?.accountNumber ||
              account?.number ||
              ""
            )}"
          >
        </label>

        <label>
          <span>IBAN</span>

          <input
            name="iban"
            maxlength="80"
            value="${escapeHTML(
              account?.iban ||
              ""
            )}"
            placeholder="AO06..."
          >
        </label>

        <label>
          <span>Titular</span>

          <input
            name="accountHolder"
            required
            maxlength="160"
            value="${escapeHTML(
              account?.accountHolder ||
              account?.holderName ||
              account?.owner ||
              ""
            )}"
          >
        </label>

        <label>
          <span>Número de telefone</span>

          <input
            name="phone"
            maxlength="40"
            value="${escapeHTML(
              account?.phone ||
              account?.mobile ||
              ""
            )}"
            placeholder="Opcional"
          >
        </label>

        <label>
          <span>Estado</span>

          <select name="active">

            <option
              value="true"
              ${
                account?.active !==
                false
                  ? "selected"
                  : ""
              }
            >
              Ativa
            </option>

            <option
              value="false"
              ${
                account?.active ===
                false
                  ? "selected"
                  : ""
              }
            >
              Inativa
            </option>

          </select>

        </label>

        <label class="full">

          <span>
            Nome apresentado ao cliente
          </span>

          <input
            name="displayName"
            maxlength="160"
            value="${escapeHTML(
              account?.displayName ||
              ""
            )}"
            placeholder="Ex.: Conta BFA principal"
          >

        </label>

        <div class="form-actions full">

          <button
            type="button"
            class="btn secondary"
            data-close-modal
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
    `
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

        const body = {
          bankName:
            String(
              formData.get(
                "bankName"
              ) || ""
            ).trim(),

          accountNumber:
            String(
              formData.get(
                "accountNumber"
              ) || ""
            ).trim(),

          iban:
            String(
              formData.get(
                "iban"
              ) || ""
            ).trim(),

          accountHolder:
            String(
              formData.get(
                "accountHolder"
              ) || ""
            ).trim(),

          phone:
            String(
              formData.get(
                "phone"
              ) || ""
            ).trim(),

          active:
            String(
              formData.get(
                "active"
              )
            ) === "true",

          displayName:
            String(
              formData.get(
                "displayName"
              ) || ""
            ).trim()
        };

        try {
          const id =
            bankAccountId(
              account
            );

          if (editing && id) {
            await patch(
              `/bank-accounts/${encodeURIComponent(
                id
              )}`,
              body
            );
          } else {
            await post(
              "/bank-accounts",
              body
            );
          }

          closeModal();

          await loadBankAccounts();

          if (
            state.currentRoute ===
            "bank-accounts"
          ) {
            renderBankAccounts();
          }

          showToast(
            editing
              ? "Conta bancária atualizada."
              : "Conta bancária adicionada.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(error),
            "error"
          );
        }
      }
    );
}

async function deleteBankAccount(
  id
) {
  if (!id) {
    return;
  }

  const confirmed =
    window.confirm(
      "Queres realmente remover esta conta bancária?"
    );

  if (!confirmed) {
    return;
  }

  try {
    await del(
      `/bank-accounts/${encodeURIComponent(
        id
      )}`
    );

    await loadBankAccounts();

    renderBankAccounts();

    showToast(
      "Conta bancária removida.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(error),
      "error"
    );
  }
}

/* =========================================================
   RELATÓRIOS
========================================================= */

async function renderReports() {
  if (!state.payments.length) {
    try {
      await loadPayments();
    } catch {
      /*
       * O relatório ainda pode ser mostrado
       * mesmo que a API falhe.
       */
    }
  }

  const payments =
    state.payments;

  const successful =
    payments.filter(
      payment =>
        [
          "PAID",
          "SUCCEEDED",
          "SUCCESS"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    );

  const pending =
    payments.filter(
      payment =>
        [
          "PENDING",
          "PROCESSING"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    );

  const failed =
    payments.filter(
      payment =>
        [
          "FAILED",
          "CANCELLED",
          "EXPIRED"
        ].includes(
          String(
            payment.status || ""
          ).toUpperCase()
        )
    );

  const revenue =
    successful.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Gestão
        </span>

        <h2>
          Relatórios
        </h2>

        <p>
          Resumo do desempenho financeiro da tua conta.
        </p>
      </div>

    </div>

    <div class="stats-grid">

      <article class="stat-card">
        <span class="stat-label">
          Receita
        </span>

        <strong>
          ${formatKz(
            revenue
          )}
        </strong>

        <span class="stat-meta">
          Pagamentos concluídos
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Concluídos
        </span>

        <strong>
          ${formatNumber(
            successful.length
          )}
        </strong>

        <span class="stat-meta">
          Transações pagas
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Pendentes
        </span>

        <strong>
          ${formatNumber(
            pending.length
          )}
        </strong>

        <span class="stat-meta">
          A aguardar confirmação
        </span>
      </article>

      <article class="stat-card">
        <span class="stat-label">
          Falhados
        </span>

        <strong>
          ${formatNumber(
            failed.length
          )}
        </strong>

        <span class="stat-meta">
          Pagamentos não concluídos
        </span>
      </article>

    </div>

    <section class="panel">

      <div class="panel-header">

        <div>
          <h3>
            Distribuição de pagamentos
          </h3>

          <p>
            Resumo dos estados das transações.
          </p>
        </div>

      </div>

      <div class="recent-list">

        <div class="recent-item">

          <div class="recent-main">
            <strong>
              Concluídos
            </strong>
          </div>

          <div class="recent-side">
            <strong>
              ${formatNumber(
                successful.length
              )}
            </strong>
          </div>

        </div>

        <div class="recent-item">

          <div class="recent-main">
            <strong>
              Pendentes
            </strong>
          </div>

          <div class="recent-side">
            <strong>
              ${formatNumber(
                pending.length
              )}
            </strong>
          </div>

        </div>

        <div class="recent-item">

          <div class="recent-main">
            <strong>
              Falhados
            </strong>
          </div>

          <div class="recent-side">
            <strong>
              ${formatNumber(
                failed.length
              )}
            </strong>
          </div>

        </div>

      </div>

    </section>
  `;
}

/* =========================================================
   DEFINIÇÕES
========================================================= */

function renderSettings() {
  const merchant =
    state.merchant || {};

  pageContent.innerHTML = `
    <div class="page-header">

      <div>
        <span class="eyebrow">
          Conta
        </span>

        <h2>
          Definições
        </h2>

        <p>
          Atualiza os dados do teu negócio.
        </p>
      </div>

    </div>

    <section class="panel">

      <form
        id="settingsForm"
        class="form-grid"
      >

        <label>
          <span>
            Nome do negócio
          </span>

          <input
            name="businessName"
            value="${escapeHTML(
              merchant.businessName ||
              merchant.name ||
              merchant.companyName ||
              ""
            )}"
            required
            maxlength="160"
          >
        </label>

        <label>
          <span>Email</span>

          <input
            name="email"
            type="email"
            value="${escapeHTML(
              merchant.email ||
              state.user?.email ||
              ""
            )}"
            disabled
          >
        </label>

        <label>
          <span>Telefone</span>

          <input
            name="phone"
            value="${escapeHTML(
              merchant.phone ||
              merchant.mobile ||
              ""
            )}"
            maxlength="40"
          >
        </label>

        <div class="form-actions full">

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
    event.currentTarget;

  const formData =
    new FormData(form);

  const body = {
    businessName:
      String(
        formData.get(
          "businessName"
        ) || ""
      ).trim(),

    phone:
      String(
        formData.get(
          "phone"
        ) || ""
      ).trim()
  };

  try {
    const data =
      await patch(
        "/merchant",
        body
      );

    state.merchant =
      data?.merchant ||
      data?.data ||
      data ||
      state.merchant;

    updateMerchantUI();

    showToast(
      "Definições guardadas.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(error),
      "error"
    );
  }
}

/* =========================================================
   MODAL
========================================================= */

function openModal(
  title,
  content
) {
  if (!modalOverlay || !modal) {
    return;
  }

  modal.innerHTML = `
    <div class="modal-header">

      <div>

        <span class="eyebrow">
          Honey Pay
        </span>

        <h3>
          ${escapeHTML(
            title
          )}
        </h3>

      </div>

      <button
        type="button"
        class="modal-close"
        data-close-modal
        aria-label="Fechar"
      >
        ×
      </button>

    </div>

    <div class="modal-body">
      ${content}
    </div>
  `;

  modalOverlay.classList.remove(
    "hidden"
  );

  modalOverlay.classList.add(
    "show"
  );

  document.body.classList.add(
    "modal-open"
  );

  modal
    .querySelectorAll(
      "[data-close-modal]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        closeModal
      );
    });
}

function closeModal() {
  if (!modalOverlay) {
    return;
  }

  modalOverlay.classList.remove(
    "show"
  );

  modalOverlay.classList.add(
    "hidden"
  );

  document.body.classList.remove(
    "modal-open"
  );

  if (modal) {
    modal.innerHTML = "";
  }
}

function setupModal() {
  modalOverlay?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        modalOverlay
      ) {
        closeModal();
      }
    }
  );
}

/* =========================================================
   CLIPBOARD
========================================================= */

async function copyText(
  text
) {
  if (!text) {
    showToast(
      "Não existe nenhum link para copiar.",
      "error"
    );

    return;
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard
        .writeText(text);
    } else {
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        text;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.focus();
      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();
    }

    showToast(
      "Copiado para a área de transferência.",
      "success"
    );
  } catch {
    showToast(
      "Não foi possível copiar automaticamente.",
      "error"
    );
  }
}

/* =========================================================
   REFRESH
========================================================= */

function setupRefreshButton() {
  refreshButton?.addEventListener(
    "click",
    async () => {
      if (
        state.refreshing
      ) {
        return;
      }

      refreshButton.classList.add(
        "loading"
      );

      try {
        await renderRoute(
          state.currentRoute,
          true
        );

        showToast(
          "Painel atualizado.",
          "success"
        );
      } catch (error) {
        showToast(
          getErrorMessage(error),
          "error"
        );
      } finally {
        refreshButton.classList.remove(
          "loading"
        );
      }
    }
  );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
  logoutButton?.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "Queres terminar a sessão?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await post(
          "/auth/logout",
          {},
          {
            authRequired: false,
            redirectOn401: false,
            timeout: 8000
          }
        );
      } catch {
        /*
         * Mesmo que a API falhe,
         * encerramos a sessão local.
         */
      } finally {
        state.authenticated =
          false;

        stopPaymentRefresh();

        window.location.replace(
          "/login"
        );
      }
    }
  );
}

/* =========================================================
   AUTO REFRESH DE PAGAMENTOS
========================================================= */

function startPaymentRefresh() {
  stopPaymentRefresh();

  state.paymentRefreshTimer =
    window.setInterval(
      async () => {
        if (
          !state.authenticated
        ) {
          return;
        }

        try {
          await loadPayments();

          if (
            state.currentRoute ===
            "payments"
          ) {
            renderPaymentsTable();
          }

          if (
            state.currentRoute ===
            "dashboard"
          ) {
            renderRecentPayments();

            const pending =
              state.payments.filter(
                payment =>
                  [
                    "PENDING",
                    "PROCESSING"
                  ].includes(
                    String(
                      payment.status ||
                      ""
                    ).toUpperCase()
                  )
              ).length;

            const pendingElement =
              $("#statPending");

            if (
              pendingElement
            ) {
              pendingElement.textContent =
                formatNumber(
                  pending
                );
            }

            const chart =
              $("#salesChart");

            if (chart) {
              chart.innerHTML =
                renderSimpleChart();
            }
          }
        } catch {
          /*
           * Atualização em segundo plano.
           * Nunca interfere na navegação.
           */
        }
      },
      PAYMENT_REFRESH_INTERVAL
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
   RENDER ROUTE
========================================================= */

async function renderRoute(
  route,
  forceReload = false
) {
  if (!ROUTES[route]) {
    route =
      "dashboard";
  }

  state.currentRoute =
    route;

  updateNavigation(
    route
  );

  closeSidebar();

  if (!pageContent) {
    return;
  }

  /*
   * A navegação já aconteceu.
   * A API não pode impedir o clique.
   */

  pageContent.classList.add(
    "is-loading"
  );

  try {
    switch (route) {
      case "dashboard": {
        /*
         * Dashboard não fica bloqueado
         * por uma API individual.
         */

        try {
          await loadDashboard();
        } catch (error) {
          console.warn(
            "Dashboard API:",
            error
          );

          state.dashboard =
            {};
        }

        try {
          await loadPayments();
        } catch (error) {
          console.warn(
            "Payments API:",
            error
          );

          state.payments =
            [];
        }

        renderDashboard();

        break;
      }

      case "payments": {
        try {
          await loadPayments();
        } catch (error) {
          console.warn(
            "Payments API:",
            error
          );

          state.payments =
            [];
        }

        renderPayments();

        break;
      }

      case "orders": {
        try {
          await loadOrders();
        } catch (error) {
          console.warn(
            "Orders API:",
            error
          );

          state.orders =
            [];
        }

        renderOrders();

        break;
      }

      case "products": {
        try {
          await loadProducts();
        } catch (error) {
          console.warn(
            "Products API:",
            error
          );

          state.products =
            [];
        }

        renderProducts();

        break;
      }

      case "customers": {
        try {
          await loadCustomers();
        } catch (error) {
          console.warn(
            "Customers API:",
            error
          );

          state.customers =
            [];
        }

        renderCustomers();

        break;
      }

      case "links": {
        try {
          await loadLinks();
        } catch (error) {
          console.warn(
            "Payment links API:",
            error
          );

          state.links =
            [];
        }

        renderLinks();

        break;
      }

      case "bank-accounts": {
        try {
          await loadBankAccounts();
        } catch (error) {
          console.warn(
            "Bank accounts API:",
            error
          );

          state.bankAccounts =
            [];
        }

        renderBankAccounts();

        break;
      }

      case "reports": {
        await renderReports();

        break;
      }

      case "settings": {
        renderSettings();

        break;
      }

      default: {
        navigate(
          "dashboard"
        );

        return;
      }
    }

    /*
     * Elementos dinâmicos que possuem
     * data-route continuam navegáveis.
     */

    bindDynamicRouteButtons();

  } catch (error) {
    console.error(
      "Honey Pay render route:",
      error
    );

    renderRouteError(
      error
    );
  } finally {
    pageContent.classList.remove(
      "is-loading"
    );
  }
}

function bindDynamicRouteButtons() {
  document
    .querySelectorAll(
      "[data-route]"
    )
    .forEach(element => {
      /*
       * Não adicionamos listeners aqui.
       *
       * A navegação principal utiliza
       * event delegation.
       *
       * Esta função existe apenas para
       * garantir que elementos inválidos
       * não sejam tratados como rotas.
       */
      if (
        !ROUTES[
          element.dataset.route
        ]
      ) {
        element.removeAttribute(
          "data-route"
        );
      }
    });
}

function renderRouteError(
  error
) {
  if (!pageContent) {
    return;
  }

  pageContent.innerHTML = `
    <div class="error-state">

      <div class="error-icon">
        !
      </div>

      <h2>
        Não foi possível carregar esta página
      </h2>

      <p>
        ${escapeHTML(
          getErrorMessage(
            error,
            "Ocorreu um erro inesperado."
          )
        )}
      </p>

      <button
        id="retryButton"
        class="btn primary"
        type="button"
      >
        Tentar novamente
      </button>

    </div>
  `;

  $("#retryButton")
    ?.addEventListener(
      "click",
      () =>
        renderRoute(
          state.currentRoute,
          true
        )
    );
}

/* =========================================================
   BOOT — ÚNICO
========================================================= */

async function boot() {
  /*
   * GARANTIA:
   * boot só pode ser executado uma vez.
   */

  if (state.booted) {
    return;
  }

  state.booted =
    true;

  state.loading =
    true;

  showLoader();

  /*
   * PRIMEIRO:
   * tornar a aplicação visível.
   *
   * Não esperamos MongoDB,
   * dashboard ou pagamentos.
   */

  revealApplication();

  /*
   * SEGUNDO:
   * configurar imediatamente
   * toda a interface.
   *
   * Isto é deliberadamente feito
   * ANTES das APIs.
   */

  setupSidebar();
  setupRouting();
  setupModal();
  setupRefreshButton();
  setupLogout();

  /*
   * TERCEIRO:
   * sessão.
   */

  let authenticated =
    false;

  try {
    authenticated =
      await checkSession();
  } catch {
    authenticated =
      false;
  }

  if (!authenticated) {
    state.loading =
      false;

    hideLoader();

    redirectToLogin();

    return;
  }

  state.authenticated =
    true;

  /*
   * QUARTO:
   * dados do utilizador.
   *
   * Falha aqui NÃO mata o menu.
   */

  try {
    await loadCurrentUser();
  } catch (error) {
    console.warn(
      "Honey Pay /me:",
      error
    );

    /*
     * Só redirecionar se for realmente
     * uma sessão inválida.
     */

    if (
      error?.status ===
      401
    ) {
      state.authenticated =
        false;

      redirectToLogin();

      return;
    }
  }

  /*
   * QUINTO:
   * rota atual.
   */

  const route =
    getCurrentRoute();

  try {
    await renderRoute(
      route
    );
  } catch (error) {
    console.error(
      "Honey Pay route boot:",
      error
    );

    renderRouteError(
      error
    );
  }

  /*
   * SEXTO:
   * atualização automática.
   */

  startPaymentRefresh();

  state.loading =
    false;

  hideLoader();
}

/* =========================================================
   API GLOBAL
========================================================= */

window.HoneyPay = {
  state,

  boot,

  navigate,

  session:
    checkSession,

  refreshPayments,

  loadBankAccounts,

  loadLinks,

  openSidebar,

  closeSidebar,

  openModal,

  closeModal
};

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
