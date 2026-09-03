/*
 * ============================================================
 * HONEY PAY
 * MERCHANT PANEL
 * ============================================================
 *
 * FRONTEND ESTÁVEL
 *
 * PRINCÍPIOS:
 * - Um único boot()
 * - Nenhum try órfão
 * - Nenhum loop de loader
 * - API sempre com timeout
 * - Sessão através de cookie HttpOnly
 * - /api/auth/status para verificar sessão
 * - /api/me para carregar utilizador/comerciante
 * - Dashboard só é carregado depois da sessão
 * - Falhas de API aparecem na interface
 * - Bank Accounts respeita o contrato atual do server.js
 *
 * ============================================================
 */

"use strict";

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const API_BASE = "/api";
const API_TIMEOUT = 10000;
const BOOT_TIMEOUT = 15000;

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */

const state = {
  authenticated: false,

  user: null,
  merchant: null,

  dashboard: {},

  payments: [],
  orders: [],
  products: [],
  customers: [],
  links: [],
  bankAccounts: [],

  currentRoute: "dashboard",

  booted: false,
  rendering: false,
  refreshing: false,

  paymentTimer: null
};

/* ============================================================
   ROTAS
   ============================================================ */

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

/* ============================================================
   DOM
   ============================================================ */

const $ = selector => document.querySelector(selector);

const app = $("#app");
const loader = $("#appLoader");
const pageContent = $("#pageContent");

const modalOverlay = $("#modalOverlay");
const modal = $("#modal");

const toastContainer = $("#toastContainer");

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeArray(value, keys = []) {
  if (Array.isArray(value)) {
    return value;
  }

  for (const key of keys) {
    if (Array.isArray(value?.[key])) {
      return value[key];
    }
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
    state.user?.name ||
    state.user?.email ||
    "Meu negócio"
  );
}

function getErrorMessage(
  error,
  fallback = "Ocorreu um erro."
) {
  if (!error) {
    return fallback;
  }

  return String(
    error.message ||
      error.error ||
      error.data?.message ||
      error.data?.error ||
      fallback
  );
}

function createTimeoutError() {
  const error = new Error(
    "O servidor demorou demasiado tempo a responder."
  );

  error.status = 408;
  error.code = "REQUEST_TIMEOUT";

  return error;
}

/* ============================================================
   TOAST
   ============================================================ */

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

      <span>
        ${escapeHTML(message)}
      </span>
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

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/* ============================================================
   API CORE
   ============================================================ */

async function request(
  path,
  options = {},
  config = {}
) {
  const timeout = Number(
    config.timeout || API_TIMEOUT
  );

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const finalOptions = {
    credentials: "include",
    cache: "no-store",
    ...options,

    signal:
      options.signal ||
      controller.signal,

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
  };

  let response;

  try {
    response = await fetch(
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
      throw createTimeoutError();
    }

    const networkError =
      new Error(
        "Não foi possível contactar o servidor."
      );

    networkError.code =
      "NETWORK_ERROR";

    throw networkError;
  } finally {
    clearTimeout(timeoutId);
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
        .includes("application/json")
    ) {
      data =
        await response.json();
    } else {
      data =
        await response.text();
    }
  } catch {
    data = null;
  }

  /* 401 */

  if (response.status === 401) {
    const error =
      new Error(
        data?.message ||
          data?.error ||
          "Sessão expirada."
      );

    error.status = 401;
    error.data = data;

    if (
      config.redirectOn401 !== false
    ) {
      redirectToLogin();
    }

    throw error;
  }

  /* Outros erros HTTP */

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

    error.data = data;

    throw error;
  }

  return data;
}

/* ============================================================
   HTTP HELPERS
   ============================================================ */

function get(path, config = {}) {
  return request(
    path,
    {
      method: "GET"
    },
    config
  );
}

function post(
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

function put(
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

function patch(
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

function del(path, config = {}) {
  return request(
    path,
    {
      method: "DELETE"
    },
    config
  );
}

/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

async function checkSession() {
  try {
    const data =
      await get(
        "/auth/status",
        {
          timeout: 7000,
          redirectOn401: false
        }
      );

    const authenticated =
      Boolean(
        data?.authenticated
      );

    state.authenticated =
      authenticated;

    return authenticated;
  } catch (error) {
    console.warn(
      "Honey Pay: falha ao verificar sessão.",
      error
    );

    state.authenticated =
      false;

    return false;
  }
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

async function loadCurrentUser() {
  const data =
    await get(
      "/me",
      {
        timeout: 8000
      }
    );

  state.user =
    data?.user || null;

  state.merchant =
    data?.merchant || null;

  updateMerchantUI();

  return data;
}

/* ============================================================
   LOADER / APP VISIBILITY
   ============================================================ */

function showLoader() {
  if (!loader) {
    return;
  }

  loader.style.display = "";

  loader.classList.remove(
    "hide"
  );
}

function hideLoader() {
  if (!loader) {
    return;
  }

  loader.classList.add(
    "hide"
  );

  loader.style.pointerEvents =
    "none";

  setTimeout(() => {
    if (!loader) {
      return;
    }

    loader.style.display =
      "none";
  }, 350);
}

function revealApplication() {
  if (app) {
    app.classList.remove(
      "hidden"
    );

    app.removeAttribute(
      "aria-hidden"
    );
  }

  hideLoader();
}

function forceHideLoader() {
  if (!loader) {
    return;
  }

  loader.classList.add(
    "hide"
  );

  loader.style.display =
    "none";
}

/* ============================================================
   MERCHANT UI
   ============================================================ */

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

/* ============================================================
   ROUTING
   ============================================================ */

function getCurrentRoute() {
  const hash =
    window.location.hash
      .replace(/^#/, "")
      .trim();

  if (ROUTES[hash]) {
    return hash;
  }

  return "dashboard";
}

function updateNavigation(route) {
  document
    .querySelectorAll(
      ".nav-item[data-route]"
    )
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.route ===
          route
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

  const hash =
    `#${route}`;

  if (
    window.location.hash !==
    hash
  ) {
    window.location.hash =
      hash;
  } else {
    void renderRoute(
      route,
      true
    );
  }
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function setupSidebar() {
  const sidebar =
    $("#sidebar");

  const overlay =
    $("#sidebarOverlay");

  const menuButton =
    $("#menuButton");

  const closeButton =
    $("#sidebarClose");

  function openSidebar() {
    sidebar?.classList.add(
      "open"
    );

    overlay?.classList.add(
      "show"
    );

    document.body.classList.add(
      "sidebar-open"
    );
  }

  function closeSidebar() {
    sidebar?.classList.remove(
      "open"
    );

    overlay?.classList.remove(
      "show"
    );

    document.body.classList.remove(
      "sidebar-open"
    );
  }

  menuButton?.addEventListener(
    "click",
    openSidebar
  );

  closeButton?.addEventListener(
    "click",
    closeSidebar
  );

  overlay?.addEventListener(
    "click",
    closeSidebar
  );

  document.addEventListener(
    "click",
    event => {
      if (
        event.target.closest(
          ".nav-item,.brand"
        )
      ) {
        closeSidebar();
      }
    }
  );
}

/* ============================================================
   ROUTING EVENTS
   ============================================================ */

function setupRouting() {
  window.addEventListener(
    "hashchange",
    () => {
      if (
        state.authenticated
      ) {
        void renderRoute(
          getCurrentRoute()
        );
      }
    }
  );

  document
    .querySelectorAll(
      ".nav-item[data-route]"
    )
    .forEach(item => {
      item.addEventListener(
        "click",
        event => {
          event.preventDefault();

          navigate(
            item.dataset.route
          );
        }
      );
    });

  $(".brand")?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      navigate("dashboard");
    }
  );
}

/* ============================================================
   MODAL
   ============================================================ */

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

  document.addEventListener(
    "click",
    event => {
      if (
        event.target.closest(
          "[data-close-modal]"
        )
      ) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Escape"
      ) {
        closeModal();
      }
    }
  );
}

function openModal(
  title,
  content
) {
  if (
    !modalOverlay ||
    !modal
  ) {
    return;
  }

  modal.innerHTML = `
    <div class="modal-header">

      <div>
        <span class="eyebrow">
          Honey Pay
        </span>

        <h3>
          ${escapeHTML(title)}
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

  modalOverlay.setAttribute(
    "aria-hidden",
    "false"
  );
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

  modalOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  if (modal) {
    modal.innerHTML = "";
  }
}

/* ============================================================
   ERROS DE PÁGINA
   ============================================================ */

function renderPageError(
  title,
  message,
  retry
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
        ${escapeHTML(title)}
      </h2>

      <p>
        ${escapeHTML(message)}
      </p>

      <button
        id="pageRetry"
        class="btn primary"
        type="button"
      >
        Tentar novamente
      </button>

    </div>
  `;

  $("#pageRetry")?.addEventListener(
    "click",
    () => {
      void retry();
    }
  );
}

function renderBootError(error) {
  revealApplication();

  renderPageError(
    "O painel está disponível",
    getErrorMessage(
      error,
      "Não foi possível carregar os dados do painel."
    ),
    async () => {
      if (pageContent) {
        pageContent.innerHTML = "";
      }

      await boot(true);
    }
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function loadDashboard() {
  const data =
    await get(
      "/dashboard"
    );

  state.dashboard =
    data?.dashboard ||
    data?.data ||
    {};

  return state.dashboard;
}

function dashboardValue(
  ...values
) {
  for (
    const value of values
  ) {
    if (
      value !==
        undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return 0;
}

function renderSimpleChart() {
  const successful =
    state.payments
      .filter(payment =>
        [
          "PAID",
          "SUCCEEDED",
          "SUCCESS"
        ].includes(
          String(
            payment.status ||
              ""
          ).toUpperCase()
        )
      )
      .slice(0, 7)
      .reverse();

  if (
    !successful.length
  ) {
    return `
      <div class="empty-state">
        <strong>
          Ainda não existem vendas
        </strong>

        <span>
          Quando houver pagamentos concluídos,
          o gráfico aparecerá aqui.
        </span>
      </div>
    `;
  }

  const max =
    Math.max(
      ...successful.map(
        payment =>
          Number(
            payment.amount ||
              0
          )
      ),
      1
    );

  return `
    <div
      style="
        display:flex;
        align-items:flex-end;
        gap:8px;
        height:180px;
        padding:10px 0;
      "
    >
      ${successful
        .map(payment => {
          const amount =
            Number(
              payment.amount ||
                0
            );

          const height =
            Math.max(
              12,
              Math.round(
                (amount /
                  max) *
                  145
              )
            );

          return `
            <div
              title="${escapeHTML(
                formatKz(amount)
              )}"
              style="
                flex:1;
                height:${height}px;
                border-radius:
                  8px 8px 2px 2px;
                background:
                  currentColor;
                opacity:.75;
              "
            ></div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderRecentPayments() {
  const container =
    $("#recentPayments");

  if (!container) {
    return;
  }

  const payments =
    state.payments
      .slice(0, 6);

  if (!payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>
          Ainda não existem pagamentos
        </strong>

        <span>
          Os teus pagamentos aparecerão aqui.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML =
    payments
      .map(payment => {
        const customerName =
          payment.customer?.name ||
          payment.customerName ||
          payment.reference ||
          "Pagamento";

        return `
          <div class="recent-item">

            <div class="recent-icon">
              ${escapeHTML(
                initials(
                  customerName
                )
              )}
            </div>

            <div class="recent-main">

              <strong>
                ${escapeHTML(
                  customerName
                )}
              </strong>

              <span>
                ${formatDateTime(
                  payment.createdAt ||
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
                class="
                  status
                  ${statusClass(
                    payment.status
                  )}
                "
              >
                ${escapeHTML(
                  statusLabel(
                    payment.status
                  )
                )}
              </span>

            </div>

          </div>
        `;
      })
      .join("");
}

function renderDashboard() {
  const data =
    state.dashboard ||
    {};

  const revenue =
    dashboardValue(
      data.totalRevenue,
      data.revenue,
      data.totalSales
    );

  const transactions =
    dashboardValue(
      data.totalOrders,
      data.totalTransactions,
      state.payments.length
    );

  const fees =
    dashboardValue(
      data.totalFees,
      data.fees
    );

  const pending =
    dashboardValue(
      data.pendingOrders,
      data.pending,
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
      ).length
    );

  pageContent.innerHTML = `
    <div class="page-header">

      <div>

        <span class="eyebrow">
          Visão geral
        </span>

        <h2>
          Bom dia,
          ${escapeHTML(
            getMerchantName()
          )}
        </h2>

        <p>
          Acompanha o teu negócio
          e os pagamentos em tempo real.
        </p>

      </div>

      <div class="page-actions">

        <button
          class="btn primary"
          data-route-action="links"
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
          ${formatNumber(
            pending
          )}
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
            data-route-action="payments"
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
          class="sales-chart"
        >
          ${renderSimpleChart()}
        </div>

      </section>

    </div>
  `;

  renderRecentPayments();

  pageContent
    .querySelectorAll(
      "[data-route-action]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          navigate(
            button.dataset
              .routeAction
          );
        }
      );
    });
}

/* ============================================================
   STATUS
   ============================================================ */

function statusLabel(status) {
  const value =
    String(
      status || ""
    ).toUpperCase();

  const labels = {
    PENDING: "Pendente",
    PROCESSING:
      "Em processamento",
    PAID: "Pago",
    SUCCEEDED:
      "Concluído",
    SUCCESS:
      "Concluído",
    FAILED:
      "Falhou",
    EXPIRED:
      "Expirado",
    CANCELLED:
      "Cancelado",
    REFUNDED:
      "Reembolsado",
    ACTIVE:
      "Ativo",
    INACTIVE:
      "Inativo"
  };

  return (
    labels[value] ||
    status ||
    "—"
  );
}

function statusClass(status) {
  const value =
    String(
      status || ""
    ).toUpperCase();

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
      "PENDING",
      "PROCESSING"
    ].includes(value)
  ) {
    return "warning";
  }

  return "neutral";
}

/* ============================================================
   PAGAMENTOS
   ============================================================ */

async function loadPayments() {
  const data =
    await get(
      "/payments"
    );

  state.payments =
    normalizeArray(
      data,
      ["payments"]
    );

  updatePendingBadge();

  return state.payments;
}

function updatePendingBadge() {
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

  const badge =
    $("#pendingBadge");

  if (badge) {
    badge.textContent =
      String(pending);

    badge.classList.toggle(
      "hidden",
      pending === 0
    );
  }

  $("#notificationDot")
    ?.classList.toggle(
      "active",
      pending > 0
    );
}

function paymentMethodLabel(
  method
) {
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
          Acompanha os pagamentos recebidos
          pelo teu negócio.
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
      () => {
        void refreshPayments(
          true
        );
      }
    );
}

function renderPaymentsTable() {
  const body =
    $("#paymentsTableBody");

  if (!body) {
    return;
  }

  if (
    !state.payments.length
  ) {
    body.innerHTML = `
      <tr>

        <td colspan="6">

          <div class="empty-state">

            <strong>
              Ainda não existem pagamentos
            </strong>

            <span>
              Os pagamentos aparecerão aqui.
            </span>

          </div>

        </td>

      </tr>
    `;

    return;
  }

  body.innerHTML =
    state.payments
      .map(payment => {
        return `
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
                class="
                  status
                  ${statusClass(
                    payment.status
                  )}
                "
              >
                ${escapeHTML(
                  statusLabel(
                    payment.status
                  )
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
        `;
      })
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

/* ============================================================
   PEDIDOS
   ============================================================ */

async function loadOrders() {
  const data =
    await get(
      "/orders"
    );

  state.orders =
    normalizeArray(
      data,
      ["orders"]
    );

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
          Consulta os pedidos associados
          aos pagamentos.
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
                    .map(order => {
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
                            ${escapeHTML(
                              order.customerSnapshot?.name ||
                                order.customer?.name ||
                                order.customerName ||
                                "Cliente"
                            )}
                          </td>

                          <td>
                            <strong>
                              ${formatKz(
                                order.total ??
                                  order.amount
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              class="
                                status
                                ${statusClass(
                                  order.status
                                )}
                              "
                            >
                              ${escapeHTML(
                                statusLabel(
                                  order.status
                                )
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
                      `;
                    })
                    .join("")
                : `
                    <tr>

                      <td colspan="5">

                        <div class="empty-state">

                          <strong>
                            Ainda não existem pedidos
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

/* ============================================================
   PRODUTOS
   ============================================================ */

async function loadProducts() {
  const data =
    await get(
      "/products"
    );

  state.products =
    normalizeArray(
      data,
      ["products"]
    );

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
          Cria produtos e transforma-os
          em links de pagamento.
        </p>

      </div>

      <button
        id="newProductButton"
        class="btn primary"
        type="button"
      >
        Novo produto
      </button>

    </div>

    <section class="panel">

      <div
        id="resourceContent"
      ></div>

    </section>
  `;

  renderProductList();

  $("#newProductButton")
    ?.addEventListener(
      "click",
      openProductForm
    );
}

function renderProductList() {
  const container =
    $("#resourceContent");

  if (!container) {
    return;
  }

  if (!state.products.length) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Ainda não tens produtos
        </strong>

        <span>
          Cria o primeiro produto
          para começares a vender.
        </span>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Preço</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>Ações</th>
          </tr>

        </thead>

        <tbody>

          ${state.products
            .map(product => {
              const id =
                product._id ||
                product.id;

              return `
                <tr>

                  <td>

                    <strong>
                      ${escapeHTML(
                        product.name
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
                    ${
                      product.stock ==
                      null
                        ? "—"
                        : escapeHTML(
                            product.stock
                          )
                    }
                  </td>

                  <td>

                    <span
                      class="
                        status
                        ${
                          product.active ===
                          false
                            ? "neutral"
                            : "success"
                        }
                      "
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
                      data-product-link="${escapeHTML(
                        id
                      )}"
                      type="button"
                    >
                      Criar link
                    </button>

                    <button
                      class="btn small danger"
                      data-product-delete="${escapeHTML(
                        id
                      )}"
                      type="button"
                    >
                      Desativar
                    </button>

                  </td>

                </tr>
              `;
            })
            .join("")}

        </tbody>

      </table>

    </div>
  `;

  container
    .querySelectorAll(
      "[data-product-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const id =
            button.dataset
              .productLink;

          const product =
            state.products.find(
              item =>
                String(
                  item._id ||
                    item.id
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

  container
    .querySelectorAll(
      "[data-product-delete]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .productDelete;

          if (
            !window.confirm(
              "Queres desativar este produto?"
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

            await loadProducts();

            renderProducts();

            showToast(
              "Produto desativado.",
              "success"
            );
          } catch (error) {
            showToast(
              getErrorMessage(
                error
              ),
              "error"
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

          <span>
            Nome
          </span>

          <input
            name="name"
            required
            maxlength="150"
          >

        </label>

        <label>

          <span>
            Preço (Kz)
          </span>

          <input
            name="price"
            type="number"
            min="1"
            step="1"
            required
          >

        </label>

        <label>

          <span>
            SKU
          </span>

          <input
            name="sku"
            maxlength="80"
          >

        </label>

        <label>

          <span>
            Stock
          </span>

          <input
            name="stock"
            type="number"
            min="0"
            step="1"
          >

        </label>

        <label class="full">

          <span>
            Descrição
          </span>

          <textarea
            name="description"
            rows="4"
          ></textarea>

        </label>

        <label class="full">

          <span>
            Imagem
          </span>

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
          name: String(
            data.get("name") ||
              ""
          ).trim(),

          price: Number(
            data.get("price")
          ),

          sku:
            String(
              data.get("sku") ||
                ""
            ).trim() ||
            undefined,

          stock:
            data.get("stock") ===
            ""
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

          renderProducts();

          showToast(
            "Produto criado com sucesso.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(
              error
            ),
            "error"
          );
        }
      }
    );
}

/* ============================================================
   CLIENTES
   ============================================================ */

async function loadCustomers() {
  const data =
    await get(
      "/customers"
    );

  state.customers =
    normalizeArray(
      data,
      ["customers"]
    );

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
          Consulta os clientes associados
          às tuas vendas.
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
              <th>Última atividade</th>
            </tr>

          </thead>

          <tbody>

            ${
              state.customers.length
                ? state.customers
                    .map(customer => {
                      return `
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
                            ${formatDateTime(
                              customer.updatedAt ||
                                customer.createdAt
                            )}
                          </td>

                        </tr>
                      `;
                    })
                    .join("")
                : `
                    <tr>

                      <td colspan="4">

                        <div class="empty-state">

                          <strong>
                            Ainda não existem clientes
                          </strong>

                          <span>
                            Os clientes aparecerão aqui.
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

/* ============================================================
   LINKS DE PAGAMENTO
   ============================================================ */

async function loadLinks() {
  const data =
    await get(
      "/payment-links"
    );

  state.links =
    normalizeArray(
      data,
      ["links"]
    );

  return state.links;
}

function paymentLinkToken(
  link
) {
  return (
    link?.token ||
    link?.code ||
    ""
  );
}

function paymentLinkUrl(
  link
) {
  if (!link) {
    return "";
  }

  if (link.url) {
    return link.url;
  }

  if (link.honeyUrl) {
    return link.honeyUrl;
  }

  const token =
    paymentLinkToken(
      link
    );

  if (!token) {
    return "";
  }

  return `${window.location.origin}/pay/${encodeURIComponent(
    token
  )}`;
}

function renderLinks() {
  pageContent.innerHTML = `
    <div class="page-header">

      <div>

        <span class="eyebrow">
          Vendas
        </span>

        <h2>
          Links de pagamento
        </h2>

        <p>
          Cria links para partilhar
          no WhatsApp, Instagram,
          Facebook e outros canais.
        </p>

      </div>

      <button
        id="newPaymentLinkButton"
        class="btn primary"
        type="button"
      >
        Novo link
      </button>

    </div>

    <section class="panel">

      <div
        id="linksContent"
      ></div>

    </section>
  `;

  renderLinksList();

  $("#newPaymentLinkButton")
    ?.addEventListener(
      "click",
      () => {
        void loadBankAccounts()
          .then(() =>
            openPaymentLinkForm()
          )
          .catch(() =>
            openPaymentLinkForm()
          );
      }
    );
}

function renderLinksList() {
  const container =
    $("#linksContent");

  if (!container) {
    return;
  }

  if (!state.links.length) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Ainda não existem links
        </strong>

        <span>
          Cria um link e envia-o
          diretamente aos teus clientes.
        </span>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="data-table">

        <thead>

          <tr>
            <th>Link</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Criado</th>
            <th>Ações</th>
          </tr>

        </thead>

        <tbody>

          ${state.links
            .map(link => {
              const url =
                paymentLinkUrl(
                  link
                );

              const active =
                link.active !==
                false;

              return `
                <tr>

                  <td>

                    <strong>
                      ${escapeHTML(
                        link.title ||
                          link.name ||
                          "Link de pagamento"
                      )}
                    </strong>

                    <small>
                      ${escapeHTML(
                        url
                      )}
                    </small>

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
                      class="
                        status
                        ${
                          active
                            ? "success"
                            : "neutral"
                        }
                      "
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

                    <div
                      class="table-actions"
                    >

                      <button
                        class="btn small secondary"
                        data-copy-link="${escapeHTML(
                          url
                        )}"
                        type="button"
                      >
                        Copiar
                      </button>

                      <button
                        class="btn small secondary"
                        data-open-link="${escapeHTML(
                          url
                        )}"
                        type="button"
                      >
                        Abrir
                      </button>

                      ${
                        active
                          ? `
                              <button
                                class="btn small danger"
                                data-delete-link="${escapeHTML(
                                  link._id ||
                                    link.id
                                )}"
                                type="button"
                              >
                                Desativar
                              </button>
                            `
                          : ""
                      }

                    </div>

                  </td>

                </tr>
              `;
            })
            .join("")}

        </tbody>

      </table>

    </div>
  `;

  container
    .querySelectorAll(
      "[data-copy-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          void copyText(
            button.dataset
              .copyLink
          );
        }
      );
    });

  container
    .querySelectorAll(
      "[data-open-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const url =
            button.dataset
              .openLink;

          if (url) {
            window.open(
              url,
              "_blank",
              "noopener,noreferrer"
            );
          }
        }
      );
    });

  container
    .querySelectorAll(
      "[data-delete-link]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          void deletePaymentLink(
            button.dataset
              .deleteLink
          );
        }
      );
    });
}

async function deletePaymentLink(
  id
) {
  if (!id) {
    return;
  }

  if (
    !window.confirm(
      "Queres realmente desativar este link de pagamento?"
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

    await loadLinks();

    renderLinks();

    showToast(
      "Link desativado.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(
        error
      ),
      "error"
    );
  }
}

function openPaymentLinkForm(
  product = null
) {
  const accounts =
    state.bankAccounts.filter(
      account =>
        account.active !==
        false
    );

  const options =
    accounts
      .map(account => {
        const id =
          account._id ||
          account.id;

        const label =
          account.alias ||
          account.bankName ||
          "Conta bancária";

        return `
          <option
            value="${escapeHTML(
              id
            )}"
          >
            ${escapeHTML(
              label
            )}
            ${
              account.isDefault
                ? " — principal"
                : ""
            }
          </option>
        `;
      })
      .join("");

  openModal(
    "Novo link de pagamento",
    `
      <form
        id="paymentLinkForm"
        class="form-grid"
      >

        <label class="full">

          <span>
            Título
          </span>

          <input
            name="title"
            required
            maxlength="150"
            value="${escapeHTML(
              product?.name ||
                ""
            )}"
          >

        </label>

        <label class="full">

          <span>
            Descrição
          </span>

          <textarea
            name="description"
            rows="3"
          >${escapeHTML(
            product?.description ||
              ""
          )}</textarea>

        </label>

        <label>

          <span>
            Valor (Kz)
          </span>

          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            value="${
              product
                ? escapeHTML(
                    product.price
                  )
                : ""
            }"
          >

        </label>

        <label>

          <span>
            Conta bancária
          </span>

          <select
            name="bankAccountId"
          >

            <option value="">
              Selecionar conta
            </option>

            ${options}

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

        const data =
          new FormData(form);

        const body = {
          title: String(
            data.get("title") ||
              ""
          ).trim(),

          description:
            String(
              data.get(
                "description"
              ) || ""
            ).trim(),

          amount: Number(
            data.get("amount")
          ),

          bankAccountId:
            String(
              data.get(
                "bankAccountId"
              ) || ""
            ).trim() ||
            undefined
        };

        if (product) {
          body.productId =
            product._id ||
            product.id;
        }

        try {
          const result =
            await post(
              "/payment-links",
              body
            );

          await loadLinks();

          closeModal();

          showCreatedLink(
            result?.link ||
              result
          );

          showToast(
            "Link criado com sucesso.",
            "success"
          );
        } catch (error) {
          showToast(
            getErrorMessage(
              error
            ),
            "error"
          );
        }
      }
    );
}

function showCreatedLink(
  link
) {
  const url =
    link?.url ||
    link?.honeyUrl ||
    paymentLinkUrl(
      link
    );

  const qr =
    link?.qrSvg ||
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
          Envia este link ao cliente
          para ele efetuar o pagamento.
        </p>

        <div
          class="generated-link-box"
        >

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
          qr
            ? `
                <div
                  class="qr-preview"
                >
                  ${
                    String(qr)
                      .trim()
                      .startsWith(
                        "<svg"
                      )
                      ? qr
                      : `
                          <img
                            src="${escapeHTML(
                              qr
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
      () => {
        void copyText(
          url
        );
      }
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
      () => {
        closeModal();
        navigate("links");
      }
    );
}

/* ============================================================
   CONTAS BANCÁRIAS
   ============================================================ */

async function loadBankAccounts() {
  const data =
    await get(
      "/bank-accounts"
    );

  state.bankAccounts =
    normalizeArray(
      data,
      [
        "accounts",
        "bankAccounts"
      ]
    );

  return state.bankAccounts;
}

function bankAccountId(
  account
) {
  return (
    account?._id ||
    account?.id ||
    ""
  );
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
          Configura as contas que os teus
          clientes poderão utilizar para
          efetuar pagamentos.
        </p>

      </div>

      <button
        id="newBankAccountButton"
        class="btn primary"
        type="button"
      >
        Adicionar conta
      </button>

    </div>

    <section class="panel">

      <div class="panel-header">

        <div>

          <h3>
            As minhas contas
          </h3>

          <p>
            Mantém os dados bancários atualizados.
          </p>

        </div>

      </div>

      <div
        id="bankAccountsContent"
      ></div>

    </section>
  `;

  renderBankAccountList();

  $("#newBankAccountButton")
    ?.addEventListener(
      "click",
      () => {
        openBankAccountForm();
      }
    );
}

function renderBankAccountList() {
  const container =
    $("#bankAccountsContent");

  if (!container) {
    return;
  }

  if (
    !state.bankAccounts.length
  ) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>
          Nenhuma conta bancária configurada
        </strong>

        <span>
          Adiciona uma conta para começares
          a receber pagamentos.
        </span>

        <button
          id="emptyAddBankAccount"
          class="btn primary"
          type="button"
        >
          Adicionar conta
        </button>

      </div>
    `;

    $("#emptyAddBankAccount")
      ?.addEventListener(
        "click",
        () => {
          openBankAccountForm();
        }
      );

    return;
  }

  container.innerHTML = `
    <div class="bank-account-grid">

      ${state.bankAccounts
        .map(account => {
          const id =
            bankAccountId(
              account
            );

          const active =
            account.active !==
            false;

          return `
            <article
              class="bank-account-card"
            >

              <div
                class="bank-account-head"
              >

                <div>

                  <span class="eyebrow">
                    ${escapeHTML(
                      account.alias ||
                        "Conta bancária"
                    )}
                  </span>

                  <h3>
                    ${escapeHTML(
                      account.bankName ||
                        account.bank ||
                        "Banco"
                    )}
                  </h3>

                </div>

                <span
                  class="
                    status
                    ${
                      active
                        ? "success"
                        : "neutral"
                    }
                  "
                >
                  ${
                    active
                      ? "Ativa"
                      : "Inativa"
                  }
                </span>

              </div>

              <div
                class="bank-account-details"
              >

                <div>

                  <span>
                    Titular
                  </span>

                  <strong>
                    ${escapeHTML(
                      account.accountHolder ||
                        "—"
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Número
                  </span>

                  <strong>
                    ${escapeHTML(
                      account.accountNumber ||
                        "—"
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    IBAN
                  </span>

                  <strong>
                    ${escapeHTML(
                      account.iban ||
                        "—"
                    )}
                  </strong>

                </div>

                ${
                  account.isDefault
                    ? `
                        <div>

                          <span>
                            Principal
                          </span>

                          <strong>
                            Sim
                          </strong>

                        </div>
                      `
                    : ""
                }

              </div>

              <div
                class="table-actions"
              >

                <button
                  class="btn small secondary"
                  data-edit-bank="${escapeHTML(
                    id
                  )}"
                  type="button"
                >
                  Editar
                </button>

                ${
                  active
                    ? `
                        <button
                          class="btn small danger"
                          data-delete-bank="${escapeHTML(
                            id
                          )}"
                          type="button"
                        >
                          Desativar
                        </button>
                      `
                    : ""
                }

              </div>

            </article>
          `;
        })
        .join("")}

    </div>
  `;

  container
    .querySelectorAll(
      "[data-edit-bank]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const id =
            button.dataset
              .editBank;

          const account =
            state.bankAccounts.find(
              item =>
                String(
                  bankAccountId(
                    item
                  )
                ) ===
                String(id)
            );

          if (account) {
            openBankAccountForm(
              account
            );
          }
        }
      );
    });

  container
    .querySelectorAll(
      "[data-delete-bank]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          void deleteBankAccount(
            button.dataset
              .deleteBank
          );
        }
      );
    });
}

/*
 * IMPORTANTE:
 *
 * O server.js atual utiliza:
 *
 * POST /api/bank-accounts
 *
 * PUT /api/bank-accounts/:id
 *
 * DELETE /api/bank-accounts/:id
 *
 * Campos:
 *
 * bankName
 * accountNumber
 * iban
 * accountHolder
 * alias
 * isDefault
 *
 * Portanto este formulário usa exatamente
 * esse contrato.
 */

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

          <span>
            Banco
          </span>

          <input
            name="bankName"
            required
            maxlength="120"
            value="${escapeHTML(
              account?.bankName ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            Número da conta
          </span>

          <input
            name="accountNumber"
            maxlength="80"
            value="${escapeHTML(
              account?.accountNumber ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            IBAN
          </span>

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

          <span>
            Titular
          </span>

          <input
            name="accountHolder"
            required
            maxlength="160"
            value="${escapeHTML(
              account?.accountHolder ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            Nome apresentado
          </span>

          <input
            name="alias"
            maxlength="120"
            value="${escapeHTML(
              account?.alias ||
                account?.displayName ||
                ""
            )}"
            placeholder="Ex.: BFA principal"
          >

        </label>

        <label>

          <span>
            Conta principal
          </span>

          <select
            name="isDefault"
          >

            <option
              value="false"
              ${
                account?.isDefault
                  ? ""
                  : "selected"
              }
            >
              Não
            </option>

            <option
              value="true"
              ${
                account?.isDefault
                  ? "selected"
                  : ""
              }
            >
              Sim
            </option>

          </select>

        </label>

        <div
          class="form-actions full"
        >

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

        const data =
          new FormData(form);

        const body = {
          bankName:
            String(
              data.get(
                "bankName"
              ) || ""
            ).trim(),

          accountNumber:
            String(
              data.get(
                "accountNumber"
              ) || ""
            ).trim(),

          iban:
            String(
              data.get(
                "iban"
              ) || ""
            ).trim(),

          accountHolder:
            String(
              data.get(
                "accountHolder"
              ) || ""
            ).trim(),

          alias:
            String(
              data.get(
                "alias"
              ) || ""
            ).trim(),

          isDefault:
            data.get(
              "isDefault"
            ) === "true"
        };

        if (
          !body.bankName ||
          !body.accountHolder ||
          (
            !body.accountNumber &&
            !body.iban
          )
        ) {
          showToast(
            "Banco, titular e número da conta ou IBAN são obrigatórios.",
            "error"
          );

          return;
        }

        try {
          if (editing) {
            const id =
              bankAccountId(
                account
              );

            if (!id) {
              throw new Error(
                "ID da conta bancária não encontrado."
              );
            }

            /*
             * CORRETO:
             *
             * PUT /api/bank-accounts/:id
             *
             * Não usar PATCH.
             */

            await put(
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

          renderBankAccounts();

          showToast(
            editing
              ? "Conta bancária atualizada."
              : "Conta bancária adicionada.",
            "success"
          );
        } catch (error) {
          console.error(
            "Honey Pay bank account:",
            error
          );

          showToast(
            getErrorMessage(
              error
            ),
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

  if (
    !window.confirm(
      "Queres realmente remover esta conta bancária?"
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

    await loadBankAccounts();

    renderBankAccounts();

    showToast(
      "Conta bancária desativada.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(
        error
      ),
      "error"
    );
  }
}

/* ============================================================
   RELATÓRIOS
   ============================================================ */

async function renderReports() {
  if (
    !state.payments.length
  ) {
    try {
      await loadPayments();
    } catch {
      /* relatório pode continuar vazio */
    }
  }

  const successful =
    state.payments.filter(
      payment =>
        [
          "PAID",
          "SUCCEEDED",
          "SUCCESS"
        ].includes(
          String(
            payment.status ||
              ""
          ).toUpperCase()
        )
    );

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
    );

  const failed =
    state.payments.filter(
      payment =>
        [
          "FAILED",
          "CANCELLED",
          "EXPIRED"
        ].includes(
          String(
            payment.status ||
              ""
          ).toUpperCase()
        )
    );

  const revenue =
    successful.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount ||
            0
        ),
      0
    );

  const average =
    successful.length
      ? revenue /
        successful.length
      : 0;

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
          Resumo do desempenho financeiro
          da tua conta.
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
          Em processamento
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
          Não concluídos
        </span>

      </article>

    </div>

    <section class="panel">

      <div class="panel-header">

        <div>

          <h3>
            Indicadores
          </h3>

        </div>

      </div>

      <div
        class="settings-list"
      >

        <div>

          <span>
            Taxa de sucesso
          </span>

          <strong>
            ${
              state.payments.length
                ? Math.round(
                    (successful.length /
                      state.payments
                        .length) *
                      100
                  )
                : 0
            }%
          </strong>

        </div>

        <div>

          <span>
            Total de transações
          </span>

          <strong>
            ${formatNumber(
              state.payments.length
            )}
          </strong>

        </div>

        <div>

          <span>
            Ticket médio
          </span>

          <strong>
            ${formatKz(
              average
            )}
          </strong>

        </div>

      </div>

    </section>
  `;
}

/* ============================================================
   DEFINIÇÕES
   ============================================================ */

function renderSettings() {
  const merchant =
    state.merchant ||
    {};

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

      <div class="panel-header">

        <div>

          <h3>
            Dados do negócio
          </h3>

          <p>
            Estas informações podem aparecer
            no checkout.
          </p>

        </div>

      </div>

      <form
        id="settingsForm"
        class="form-grid"
      >

        <label class="full">

          <span>
            Nome do negócio
          </span>

          <input
            name="businessName"
            required
            value="${escapeHTML(
              merchant.businessName ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            Email
          </span>

          <input
            value="${escapeHTML(
              state.user?.email ||
                ""
            )}"
            disabled
          >

        </label>

        <label>

          <span>
            Telefone
          </span>

          <input
            name="phone"
            value="${escapeHTML(
              merchant.phone ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            NIF
          </span>

          <input
            name="nif"
            value="${escapeHTML(
              merchant.nif ||
                ""
            )}"
          >

        </label>

        <label>

          <span>
            Cidade
          </span>

          <input
            name="city"
            value="${escapeHTML(
              merchant.city ||
                ""
            )}"
          >

        </label>

        <label class="full">

          <span>
            Morada
          </span>

          <input
            name="address"
            value="${escapeHTML(
              merchant.address ||
                ""
            )}"
          >

        </label>

        <div
          class="form-actions full"
        >

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

  const data =
    new FormData(form);

  const body = {
    businessName:
      String(
        data.get(
          "businessName"
        ) || ""
      ).trim(),

    phone:
      String(
        data.get(
          "phone"
        ) || ""
      ).trim(),

    nif:
      String(
        data.get(
          "nif"
        ) || ""
      ).trim(),

    city:
      String(
        data.get(
          "city"
        ) || ""
      ).trim(),

    address:
      String(
        data.get(
          "address"
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
      state.merchant;

    updateMerchantUI();

    showToast(
      "Definições guardadas.",
      "success"
    );
  } catch (error) {
    showToast(
      getErrorMessage(
        error
      ),
      "error"
    );
  }
}

/* ============================================================
   LOGOUT
   ============================================================ */

function setupLogout() {
  $("#logoutButton")
    ?.addEventListener(
      "click",
      async () => {
        if (
          !window.confirm(
            "Queres terminar a sessão?"
          )
        ) {
          return;
        }

        try {
          await post(
            "/auth/logout",
            {}
          );
        } catch {
          /*
           * Mesmo que a API falhe,
           * o frontend termina a sessão.
           */
        }

        state.authenticated =
          false;

        stopPaymentRefresh();

        forceHideLoader();

        window.location.replace(
          "/login"
        );
      }
    );
}

/* ============================================================
   REFRESH BUTTON
   ============================================================ */

function setupRefreshButton() {
  $("#refreshButton")
    ?.addEventListener(
      "click",
      async () => {
        const button =
          $("#refreshButton");

        button?.classList.add(
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
            getErrorMessage(
              error
            ),
            "error"
          );
        } finally {
          button?.classList.remove(
            "loading"
          );
        }
      }
    );
}

/* ============================================================
   BACKGROUND REFRESH
   ============================================================ */

function startPaymentRefresh() {
  stopPaymentRefresh();

  state.paymentTimer =
    setInterval(
      () => {
        if (
          !state.authenticated
        ) {
          return;
        }

        void refreshPayments(
          false
        );
      },
      15000
    );
}

function stopPaymentRefresh() {
  if (
    state.paymentTimer
  ) {
    clearInterval(
      state.paymentTimer
    );
  }

  state.paymentTimer =
    null;
}

/* ============================================================
   COPY
   ============================================================ */

async function copyText(
  text
) {
  if (!text) {
    return;
  }

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        text
      );

      showToast(
        "Copiado para a área de transferência.",
        "success"
      );

      return;
    }

    throw new Error(
      "Clipboard API indisponível."
    );
  } catch {
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

    try {
      document.execCommand(
        "copy"
      );

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

    textarea.remove();
  }
}

/* ============================================================
   BANK ACCOUNT NAVIGATION
   ============================================================ */

function ensureBankAccountsNavigation() {
  const existing =
    document.querySelector(
      '.nav-item[data-route="bank-accounts"]'
    );

  if (existing) {
    return;
  }

  const nav =
    document.querySelector(
      ".nav"
    );

  if (!nav) {
    return;
  }

  const section =
    nav.querySelector(
      ".nav-section"
    ) || nav;

  const link =
    document.createElement(
      "a"
    );

  link.href =
    "#bank-accounts";

  link.className =
    "nav-item";

  link.dataset.route =
    "bank-accounts";

  link.innerHTML = `
    <span class="nav-icon">
      ▤
    </span>

    <span>
      Contas bancárias
    </span>
  `;

  link.addEventListener(
    "click",
    event => {
      event.preventDefault();

      navigate(
        "bank-accounts"
      );
    }
  );

  section.appendChild(
    link
  );
}

/* ============================================================
   ROUTER PRINCIPAL
   ============================================================ */

async function renderRoute(
  route,
  forceReload = false
) {
  if (!ROUTES[route]) {
    route = "dashboard";
  }

  if (
    state.rendering &&
    !forceReload
  ) {
    return;
  }

  state.currentRoute =
    route;

  updateNavigation(
    route
  );

  if (!pageContent) {
    return;
  }

  state.rendering =
    true;

  pageContent.classList.add(
    "is-loading"
  );

  try {
    switch (route) {
      case "dashboard":
        await Promise.all([
          loadDashboard(),
          loadPayments()
        ]);

        renderDashboard();

        break;

      case "payments":
        await loadPayments();

        renderPayments();

        break;

      case "orders":
        await loadOrders();

        renderOrders();

        break;

      case "products":
        await loadProducts();

        renderProducts();

        break;

      case "customers":
        await loadCustomers();

        renderCustomers();

        break;

      case "links":
        await Promise.all([
          loadLinks(),
          loadBankAccounts()
        ]);

        renderLinks();

        break;

      case "bank-accounts":
        await loadBankAccounts();

        renderBankAccounts();

        break;

      case "reports":
        await renderReports();

        break;

      case "settings":
        renderSettings();

        break;

      default:
        await loadDashboard();
        await loadPayments();

        renderDashboard();
    }
  } catch (error) {
    console.error(
      "Honey Pay route error:",
      error
    );

    if (
      error?.status === 401
    ) {
      return;
    }

    renderPageError(
      "Não foi possível carregar esta página",
      getErrorMessage(
        error
      ),
      () =>
        renderRoute(
          state.currentRoute,
          true
        )
    );
  } finally {
    pageContent.classList.remove(
      "is-loading"
    );

    state.rendering =
      false;
  }
}

/* ============================================================
   ÚNICO BOOT
   ============================================================
 *
 * ATENÇÃO:
 *
 * NÃO EXISTE OUTRO boot() NESTE ARQUIVO.
 *
 * ============================================================
 */

let bootPromise = null;

async function boot(
  force = false
) {
  if (
    bootPromise &&
    !force
  ) {
    return bootPromise;
  }

  if (
    state.booted &&
    !force
  ) {
    return;
  }

  if (force) {
    state.booted =
      false;
  }

  state.booted =
    true;

  showLoader();

  const emergencyTimer =
    setTimeout(
      () => {
        console.error(
          "Honey Pay: boot excedeu o tempo máximo."
        );

        /*
         * GARANTIA ABSOLUTA:
         * nunca deixar o loader preso.
         */
        revealApplication();

        if (
          pageContent &&
          !pageContent.innerHTML.trim()
        ) {
          renderPageError(
            "O painel demorou demasiado tempo",
            "O servidor não respondeu dentro do tempo esperado.",
            () =>
              boot(true)
          );
        }
      },
      BOOT_TIMEOUT
    );

  bootPromise =
    (async () => {
      try {
        /*
         * ==================================================
         * 1. SESSÃO
         * ==================================================
         */

        const authenticated =
          await checkSession();

        if (!authenticated) {
          forceHideLoader();

          redirectToLogin();

          return false;
        }

        state.authenticated =
          true;

        /*
         * ==================================================
         * 2. MOSTRAR O PAINEL
         * ==================================================
         *
         * MUITO IMPORTANTE:
         *
         * O painel é mostrado ANTES de carregar
         * dados do MongoDB.
         *
         * Portanto:
         *
         * MongoDB lento
         * API lenta
         * Dashboard com erro
         *
         * NÃO CONSEGUEM PRENDER O LOADER.
         *
         * ==================================================
         */

        revealApplication();

        /*
         * ==================================================
         * 3. CONFIGURAÇÃO DA INTERFACE
         * ==================================================
         */

        ensureBankAccountsNavigation();

        setupSidebar();

        setupModal();

        setupRefreshButton();

        setupLogout();

        setupRouting();

        /*
         * ==================================================
         * 4. UTILIZADOR / MERCHANT
         * ==================================================
         */

        try {
          await loadCurrentUser();
        } catch (error) {
          console.error(
            "Honey Pay /me:",
            error
          );

          if (
            error?.status === 401
          ) {
            state.authenticated =
              false;

            redirectToLogin();

            return false;
          }

          renderBootError(
            error
          );

          return false;
        }

        /*
         * ==================================================
         * 5. ROTA INICIAL
         * ==================================================
         */

        const route =
          getCurrentRoute();

        /*
         * ==================================================
         * 6. CONTEÚDO
         * ==================================================
         */

        await renderRoute(
          route,
          true
        );

        /*
         * ==================================================
         * 7. ATUALIZAÇÃO AUTOMÁTICA
         * ==================================================
         */

        startPaymentRefresh();

        return true;
      } catch (error) {
        console.error(
          "Honey Pay boot error:",
          error
        );

        /*
         * GARANTIA:
         * qualquer erro passa pelo loader.
         */

        revealApplication();

        if (
          error?.status === 401
        ) {
          state.authenticated =
            false;

          redirectToLogin();

          return false;
        }

        renderBootError(
          error
        );

        return false;
      } finally {
        clearTimeout(
          emergencyTimer
        );

        /*
         * SEGURANÇA FINAL.
         *
         * Não importa onde o boot terminou:
         * o loader nunca fica permanentemente
         * no ecrã.
         */

        revealApplication();
      }
    })();

  try {
    return await bootPromise;
  } finally {
    bootPromise =
      null;
  }
}

/* ============================================================
   API GLOBAL
   ============================================================ */

window.HoneyPay = {
  state,

  boot,

  session:
    checkSession,

  navigate,

  refreshPayments,

  loadDashboard,

  loadBankAccounts,

  loadLinks
};

/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void boot();
    },
    {
      once: true
    }
  );
} else {
  void boot();
}
