/*
============================================================
HONEY PAY
MERCHANT PANEL
V4.0.0
FRONTEND / SESSION / PAYMENTS / BANK ACCOUNTS / LINKS
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
   DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);

const app = $("#app");
const loader = $("#appLoader");
const pageContent = $("#pageContent");
const toastContainer = $("#toastContainer");

const modalOverlay = $("#modalOverlay");
const modal = $("#modal");

/* =========================================================
   GENERIC HELPERS
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
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;

  return [];
}

function formatKz(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0
  }).format(number) + " Kz";
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function initials(value) {
  const text = String(value || "H");

  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase() || "H";
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
  if (!error) return fallback;

  return (
    error.message ||
    error.error ||
    error.data?.message ||
    error.data?.error ||
    fallback
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  if (["PAID", "SUCCEEDED", "SUCCESS", "ACTIVE"].includes(value)) {
    return "success";
  }

  if (["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(value)) {
    return "danger";
  }

  if (["PROCESSING", "PENDING"].includes(value)) {
    return "warning";
  }

  return "neutral";
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <div class="toast-content">
      <strong>${escapeHTML(
        type === "success"
          ? "Sucesso"
          : type === "error"
            ? "Erro"
            : "Honey Pay"
      )}</strong>

      <span>${escapeHTML(message)}</span>
    </div>

    <button type="button" class="toast-close" aria-label="Fechar">
      ×
    </button>
  `;

  toast.querySelector(".toast-close")?.addEventListener("click", () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/* =========================================================
   API
========================================================= */

/* =========================================================
   HONEY PAY — API CORE
   V5.0 — STABLE BOOT / TIMEOUT / SESSION
   ========================================================= */

const API_TIMEOUT = 12000;

function createTimeoutSignal(timeout = API_TIMEOUT) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer)
  };
}

async function request(path, options = {}, config = {}) {
  const {
    authRequired = true,
    redirectOn401 = true,
    timeout = API_TIMEOUT
  } = config;

  const finalOptions = {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body
        ? {
            "Content-Type": "application/json"
          }
        : {}),
      ...(options.headers || {})
    }
  };

  /*
   * IMPORTANTE:
   * Nunca permitir que um fetch bloqueie
   * o painel indefinidamente.
   */

  const timeoutControl =
    createTimeoutSignal(timeout);

  /*
   * Não substituir um signal fornecido
   * explicitamente pelo chamador.
   */

  if (!finalOptions.signal) {
    finalOptions.signal =
      timeoutControl.signal;
  }

  let response;

  try {
    response = await fetch(
      path.startsWith("http")
        ? path
        : `${API_BASE}${path}`,
      finalOptions
    );
  } catch (error) {
    if (error?.name === "AbortError") {
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

    throw new Error(
      "Não foi possível contactar o servidor. Verifica a ligação à Internet."
    );
  } finally {
    timeoutControl.cleanup();
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
      const text =
        await response.text();

      data =
        text || null;
    }
  } catch {
    data = null;
  }

  /*
   * 401 = sessão inválida/expirada.
   */

  if (response.status === 401) {
    if (
      authRequired &&
      redirectOn401
    ) {
      state.authenticated =
        false;

      redirectToLogin();
    }

    const error =
      new Error(
        data?.message ||
        data?.error ||
        "Sessão expirada."
      );

    error.status = 401;
    error.data = data;

    throw error;
  }

  /*
   * Outros erros HTTP.
   */

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


/* =========================================================
   HTTP HELPERS
========================================================= */

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
   AUTH
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

    /*
     * Timeout/erro de rede não deve
     * bloquear o browser para sempre.
     */

    console.warn(
      "Honey Pay: falha ao verificar sessão.",
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


/* =========================================================
   LOGIN REDIRECT
========================================================= */

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
   LOADER
========================================================= */

function showApp() {

  if (!app) {
    return;
  }

  app.classList.remove(
    "hidden"
  );

  app.removeAttribute(
    "aria-hidden"
  );
}


function hideLoader() {

  if (!loader) {
    return;
  }

  loader.classList.add(
    "hide"
  );

  /*
   * Garantir que o loader desapareça
   * mesmo que a animação CSS não exista.
   */

  setTimeout(() => {

    if (!loader) {
      return;
    }

    loader.style.display =
      "none";

  }, 450);
}


function showLoader() {

  if (!loader) {
    return;
  }

  loader.style.display =
    "";

  loader.classList.remove(
    "hide"
  );
}


/*
 * NOVO:
 * A aplicação passa a ficar visível
 * independentemente do carregamento
 * dos dados.
 */

function revealApplication() {

  showApp();

  requestAnimationFrame(() => {

    hideLoader();

  });
}


/* =========================================================
   SAFE BOOT ERROR
========================================================= */

function renderBootError(
  error
) {

  if (!pageContent) {
    return;
  }

  const message =
    getErrorMessage(
      error,
      "Não foi possível carregar os dados do painel."
    );

  pageContent.innerHTML = `
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
          id="bootRetry"
          class="btn primary"
          type="button"
        >
          Tentar novamente
        </button>

        <button
          id="bootRefresh"
          class="btn secondary"
          type="button"
        >
          Atualizar página
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
          button.disabled =
            true;

          button.textContent =
            "A tentar...";
        }

        try {

          await initialiseDashboard(
            true
          );

        } catch (retryError) {

          console.error(
            "Honey Pay retry:",
            retryError
          );

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
   SAFE DASHBOARD INITIALISATION
========================================================= */

async function initialiseDashboard(
  retry = false
) {

  /*
   * O painel já está visível.
   * Nenhuma API pode escondê-lo.
   */

  revealApplication();

  /*
   * Sessão.
   */

  const authenticated =
    await checkSession();

  if (!authenticated) {

    redirectToLogin();

    return false;
  }

  state.authenticated =
    true;

  /*
   * Configuração da interface.
   * Nenhuma destas operações deve impedir
   * a abertura visual do painel.
   */

  ensureBankAccountsNavigation();

  setupSidebar();
  setupModal();
  setupRefreshButton();
  setupLogout();
  setupRouting();

  /*
   * Utilizador.
   *
   * Se falhar, mostramos erro controlado,
   * mas não deixamos o loader preso.
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
   * Rota inicial.
   */

  const route =
    getCurrentRoute();

  /*
   * Agora carregamos o conteúdo.
   * O loader já desapareceu.
   */

  try {

    await renderRoute(
      route
    );

  } catch (error) {

    console.error(
      "Honey Pay route:",
      error
    );

    renderBootError(
      error
    );
  }

  /*
   * Atualização automática.
   */

  startPaymentRefresh();

  return true;
}


/* =========================================================
   BOOT DEFINITIVO
========================================================= */

async function boot() {

  if (
    state.booted
  ) {
    return;
  }

  state.booted =
    true;

  state.loading =
    true;

  showLoader();

  /*
   * FAIL-SAFE:
   *
   * Mesmo que alguma promessa fique
   * bloqueada por uma condição inesperada,
   * o painel nunca poderá permanecer
   * no loader indefinidamente.
   */

  const emergencyTimer =
    setTimeout(() => {

      console.warn(
        "Honey Pay: boot excedeu o tempo máximo."
      );

      revealApplication();

      if (
        pageContent &&
        !pageContent.innerHTML.trim()
      ) {

        renderBootError(
          new Error(
            "O servidor demorou demasiado tempo a responder."
          )
        );
      }

    }, 15000);

  try {

    await initialiseDashboard();

  } catch (error) {

    console.error(
      "Honey Pay boot error:",
      error
    );

    /*
     * Nunca deixar o utilizador preso
     * no loader.
     */

    revealApplication();

    if (
      error?.status === 401
    ) {

      state.authenticated =
        false;

      redirectToLogin();

      return;
    }

    renderBootError(
      error
    );

  } finally {

    clearTimeout(
      emergencyTimer
    );

    /*
     * GARANTIA ABSOLUTA:
     * o loader nunca permanece aberto
     * depois do boot.
     */

    revealApplication();

    state.loading =
      false;
  }
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

  const merchantName = $("#merchantName");
  const merchantEmail = $("#merchantEmail");
  const topMerchantName = $("#topMerchantName");

  const merchantAvatar = $("#merchantAvatar");
  const topAvatar = $("#topAvatar");

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
  const hash = window.location.hash.replace("#", "").trim();

  if (ROUTES[hash]) {
    return hash;
  }

  return "dashboard";
}

function updateNavigation(route) {
  document.querySelectorAll(".nav-item[data-route]").forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.route === route
    );
  });

  const config = ROUTES[route] || ROUTES.dashboard;

  const parent = $("#breadcrumbParent");
  const title = $("#pageTitle");

  if (parent) {
    parent.textContent = config.parent;
  }

  if (title) {
    title.textContent = config.title;
  }
}

function navigate(route) {
  if (!ROUTES[route]) {
    route = "dashboard";
  }

  if (window.location.hash !== `#${route}`) {
    window.location.hash = route;
  } else {
    renderRoute(route);
  }
}

/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");
  const menuButton = $("#menuButton");
  const closeButton = $("#sidebarClose");

  function openSidebar() {
    sidebar?.classList.add("open");
    overlay?.classList.add("show");
    document.body.classList.add("sidebar-open");
  }

  function closeSidebar() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("show");
    document.body.classList.remove("sidebar-open");
  }

  menuButton?.addEventListener("click", openSidebar);
  closeButton?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  document.addEventListener("click", event => {
    const routeLink = event.target.closest(
      ".nav-item, .brand"
    );

    if (routeLink) {
      closeSidebar();
    }
  });
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  const data = await get("/dashboard");

  state.dashboard =
    data?.dashboard ||
    data?.data ||
    data ||
    {};

  return state.dashboard;
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

function renderDashboard() {
  const data = state.dashboard || {};

  const revenue = dashboardValue(
    data.revenue,
    data.totalRevenue,
    data.sales,
    data.totalSales
  );

  const transactions = dashboardValue(
    data.transactions,
    data.totalTransactions,
    data.transactionCount,
    state.payments.length
  );

  const fees = dashboardValue(
    data.fees,
    data.totalFees,
    data.feeAmount
  );

  const pending = dashboardValue(
    data.pending,
    data.pendingPayments,
    state.payments.filter(
      payment =>
        ["PENDING", "PROCESSING"].includes(
          String(payment.status || "").toUpperCase()
        )
    ).length
  );

  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Visão geral</span>
        <h2>Bom dia, ${escapeHTML(getMerchantName())}</h2>
        <p>Acompanha o teu negócio e os pagamentos em tempo real.</p>
      </div>

      <div class="page-actions">
        <button class="btn primary" data-route-action="links">
          Criar link de pagamento
        </button>
      </div>
    </div>

    <div class="stats-grid">

      <article class="stat-card">
        <span class="stat-label">Receita</span>
        <strong id="statRevenue">${formatKz(revenue)}</strong>
        <span class="stat-meta">Total recebido</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Transações</span>
        <strong id="statTransactions">${formatNumber(transactions)}</strong>
        <span class="stat-meta">Pagamentos registados</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Taxas</span>
        <strong id="statFees">${formatKz(fees)}</strong>
        <span class="stat-meta">Taxas processadas</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Pendentes</span>
        <strong id="statPending">${formatNumber(pending)}</strong>
        <span class="stat-meta">A aguardar confirmação</span>
      </article>

    </div>

    <div class="dashboard-grid">

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Atividade de pagamentos</h3>
            <p>Estado atual das últimas transações.</p>
          </div>

          <button class="btn secondary" data-route-action="payments">
            Ver pagamentos
          </button>
        </div>

        <div id="recentPayments" class="recent-list"></div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Vendas</h3>
            <p>Resumo visual das vendas.</p>
          </div>
        </div>

        <div id="salesChart" class="sales-chart">
          ${renderSimpleChart()}
        </div>
      </section>

    </div>
  `;

  renderRecentPayments();

  document
    .querySelectorAll("[data-route-action]")
    .forEach(button => {
      button.addEventListener("click", () => {
        navigate(button.dataset.routeAction);
      });
    });
}

function renderSimpleChart() {
  const payments = state.payments
    .filter(payment =>
      ["PAID", "SUCCEEDED", "SUCCESS"].includes(
        String(payment.status || "").toUpperCase()
      )
    )
    .slice(-7);

  if (!payments.length) {
    return `
      <div class="empty-state compact">
        <strong>Sem vendas suficientes</strong>
        <span>Os dados aparecerão aqui quando existirem pagamentos.</span>
      </div>
    `;
  }

  const max = Math.max(
    ...payments.map(payment =>
      Number(payment.amount || 0)
    ),
    1
  );

  return `
    <div style="
      display:flex;
      align-items:flex-end;
      gap:10px;
      height:180px;
      padding:20px 0;
    ">
      ${payments.map(payment => {
        const amount = Number(payment.amount || 0);
        const height = Math.max(
          10,
          Math.round((amount / max) * 130)
        );

        return `
          <div
            title="${escapeHTML(formatKz(amount))}"
            style="
              flex:1;
              height:${height}px;
              border-radius:8px 8px 2px 2px;
              background:currentColor;
              opacity:.75;
            "
          ></div>
        `;
      }).join("")}
    </div>
  `;
}

function renderRecentPayments() {
  const container = $("#recentPayments");

  if (!container) return;

  const payments = state.payments.slice(0, 6);

  if (!payments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Ainda não existem pagamentos</strong>
        <span>Os teus pagamentos aparecerão aqui.</span>
      </div>
    `;

    return;
  }

  container.innerHTML = payments.map(payment => `
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
        <strong>${formatKz(payment.amount)}</strong>

        <span class="status ${statusClass(payment.status)}">
          ${statusLabel(payment.status)}
        </span>
      </div>

    </div>
  `).join("");
}

/* =========================================================
   PAYMENTS
========================================================= */

async function loadPayments() {
  const data = await get("/payments");

  state.payments = normalizeArray(data);

  updatePendingBadge();

  return state.payments;
}

function updatePendingBadge() {
  const badge = $("#pendingBadge");

  if (!badge) return;

  const pending = state.payments.filter(payment =>
    ["PENDING", "PROCESSING"].includes(
      String(payment.status || "").toUpperCase()
    )
  ).length;

  badge.textContent = String(pending);
  badge.classList.toggle("hidden", pending === 0);

  const notificationDot = $("#notificationDot");

  if (notificationDot) {
    notificationDot.classList.toggle(
      "active",
      pending > 0
    );
  }
}

function renderPayments() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Financeiro</span>
        <h2>Pagamentos</h2>
        <p>Acompanha os pagamentos recebidos pelo teu negócio.</p>
      </div>

      <div class="page-actions">
        <button id="paymentsRefresh" class="btn secondary">
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

          <tbody id="paymentsTableBody"></tbody>

        </table>
      </div>
    </section>
  `;

  renderPaymentsTable();

  $("#paymentsRefresh")?.addEventListener(
    "click",
    refreshPayments
  );
}

function paymentMethodLabel(method) {
  const value = String(method || "").toLowerCase();

  const labels = {
    multicaixa_express: "Multicaixa Express",
    multicaixa_reference: "Referência",
    multicaixa: "Multicaixa",
    bank_transfer: "Transferência",
    transfer: "Transferência"
  };

  return labels[value] || method || "—";
}

function renderPaymentsTable() {
  const body = $("#paymentsTableBody");

  if (!body) return;

  if (!state.payments.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <strong>Nenhum pagamento encontrado</strong>
            <span>Quando houver pagamentos, eles aparecerão aqui.</span>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = state.payments.map(payment => `
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
          paymentMethodLabel(payment.paymentMethod)
        )}
      </td>

      <td>
        <strong>${formatKz(payment.amount)}</strong>
      </td>

      <td>
        <span class="status ${statusClass(payment.status)}">
          ${statusLabel(payment.status)}
        </span>
      </td>

      <td>
        ${formatDateTime(
          payment.createdAt ||
          payment.updatedAt
        )}
      </td>

    </tr>
  `).join("");
}

async function refreshPayments(showMessage = true) {
  if (state.refreshing) return;

  state.refreshing = true;

  try {
    await loadPayments();

    if (state.currentRoute === "payments") {
      renderPaymentsTable();
    }

    if (state.currentRoute === "dashboard") {
      renderRecentPayments();

      const pending = state.payments.filter(payment =>
        ["PENDING", "PROCESSING"].includes(
          String(payment.status || "").toUpperCase()
        )
      ).length;

      const pendingElement = $("#statPending");

      if (pendingElement) {
        pendingElement.textContent = formatNumber(pending);
      }

      const chart = $("#salesChart");

      if (chart) {
        chart.innerHTML = renderSimpleChart();
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
    state.refreshing = false;
  }
}

/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {
  const data = await get("/orders");

  state.orders = normalizeArray(data);

  return state.orders;
}

function renderOrders() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Operações</span>
        <h2>Pedidos</h2>
        <p>Consulta os pedidos associados aos pagamentos.</p>
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
                ? state.orders.map(order => `
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
                      <strong>${formatKz(order.amount)}</strong>
                    </td>

                    <td>
                      <span class="status ${statusClass(order.status)}">
                        ${statusLabel(order.status)}
                      </span>
                    </td>

                    <td>
                      ${formatDateTime(
                        order.createdAt
                      )}
                    </td>
                  </tr>
                `).join("")
                : `
                  <tr>
                    <td colspan="5">
                      <div class="empty-state">
                        <strong>Nenhum pedido</strong>
                        <span>Os teus pedidos aparecerão aqui.</span>
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
   PRODUCTS
========================================================= */

async function loadProducts() {
  const data = await get("/products");

  state.products = normalizeArray(data);

  return state.products;
}

function renderProducts() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Catálogo</span>
        <h2>Produtos</h2>
        <p>Cria produtos e transforma-os em links de pagamento.</p>
      </div>

      <button id="newProductButton" class="btn primary">
        Novo produto
      </button>
    </div>

    <section class="panel">
      <div id="resourceContent"></div>
    </section>
  `;

  renderProductList();

  $("#newProductButton")?.addEventListener(
    "click",
    openProductForm
  );
}

function renderProductList() {
  const container = $("#resourceContent");

  if (!container) return;

  if (!state.products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Ainda não tens produtos</strong>
        <span>
          Cria o primeiro produto para começares a vender.
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
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${state.products.map(product => `
            <tr>

              <td>
                <strong>${escapeHTML(product.name)}</strong>
                ${
                  product.description
                    ? `<small>${escapeHTML(product.description)}</small>`
                    : ""
                }
              </td>

              <td>
                ${escapeHTML(product.sku || "—")}
              </td>

              <td>
                <strong>${formatKz(product.price)}</strong>
              </td>

              <td>
                ${escapeHTML(
                  product.stock === undefined
                    ? "—"
                    : String(product.stock)
                )}
              </td>

              <td>
                <span class="status ${
                  product.active === false
                    ? "neutral"
                    : "success"
                }">
                  ${product.active === false ? "Inativo" : "Ativo"}
                </span>
              </td>

              <td>
                <button
                  class="btn small secondary"
                  data-product-link="${escapeHTML(
                    product._id || product.id
                  )}"
                >
                  Criar link
                </button>
              </td>

            </tr>
          `).join("")}
        </tbody>

      </table>
    </div>
  `;

  document
    .querySelectorAll("[data-product-link]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.productLink;

        const product = state.products.find(
          item =>
            String(item._id || item.id) === String(id)
        );

        if (product) {
          openPaymentLinkForm(product);
        }
      });
    });
}

function openProductForm() {
  openModal(
    "Novo produto",
    `
      <form id="productForm" class="form-grid">

        <label>
          <span>Nome</span>
          <input name="name" required maxlength="150">
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
          <input name="sku" maxlength="80">
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
          <textarea name="description" rows="4"></textarea>
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

  $("#productForm")?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);

      const body = {
        name: formData.get("name"),
        price: Number(formData.get("price")),
        sku: formData.get("sku") || undefined,
        stock:
          formData.get("stock") === ""
            ? undefined
            : Number(formData.get("stock")),
        description:
          formData.get("description") || undefined,
        image:
          formData.get("image") || undefined
      };

      try {
        await post("/products", body);

        closeModal();

        await loadProducts();
        renderProducts();

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
   CUSTOMERS
========================================================= */

async function loadCustomers() {
  const data = await get("/customers");

  state.customers = normalizeArray(data);

  return state.customers;
}

function renderCustomers() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Clientes</span>
        <h2>Clientes</h2>
        <p>Consulta os clientes associados às tuas vendas.</p>
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
                ? state.customers.map(customer => `
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
                        customer.email || "—"
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        customer.mobile ||
                        customer.phone ||
                        customer.phoneNumber ||
                        "—"
                      )}
                    </td>

                    <td>
                      ${formatDateTime(
                        customer.updatedAt ||
                        customer.lastPaymentAt ||
                        customer.createdAt
                      )}
                    </td>

                  </tr>
                `).join("")
                : `
                  <tr>
                    <td colspan="4">
                      <div class="empty-state">
                        <strong>Nenhum cliente</strong>
                        <span>
                          Os clientes aparecerão depois das primeiras vendas.
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
   PAYMENT LINKS
========================================================= */

async function loadLinks() {
  const data = await get("/payment-links");

  state.links = normalizeArray(data);

  return state.links;
}

function paymentLinkToken(link) {
  return (
    link.token ||
    link.publicToken ||
    link.slug ||
    ""
  );
}

function paymentLinkUrl(link) {
  const token = paymentLinkToken(link);

  if (!token) return "";

  return `${window.location.origin}/pay/${encodeURIComponent(token)}`;
}

function renderLinks() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Vendas</span>
        <h2>Links de pagamento</h2>
        <p>
          Cria links para enviar aos teus clientes pelo WhatsApp,
          Facebook, Instagram ou loja online.
        </p>
      </div>

      <button id="newPaymentLink" class="btn primary">
        Novo link
      </button>
    </div>

    <section class="panel">
      <div id="resourceContent"></div>
    </section>
  `;

  renderLinksList();

  $("#newPaymentLink")?.addEventListener(
    "click",
    openManualPaymentLinkForm
  );
}

function renderLinksList() {
  const container = $("#resourceContent");

  if (!container) return;

  if (!state.links.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Ainda não tens links de pagamento</strong>
        <span>
          Cria um link e envia-o diretamente ao teu cliente.
        </span>

        <button
          id="emptyCreateLink"
          class="btn primary"
        >
          Criar primeiro link
        </button>
      </div>
    `;

    $("#emptyCreateLink")?.addEventListener(
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
            <th>Link</th>
            <th>Valor</th>
            <th>Estado</th>
            <th>Criado</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${state.links.map(link => {
            const url = paymentLinkUrl(link);
            const active = link.active !== false;

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
                    ${escapeHTML(url)}
                  </small>
                </td>

                <td>
                  <strong>${formatKz(link.amount)}</strong>
                </td>

                <td>
                  <span class="status ${
                    active ? "success" : "neutral"
                  }">
                    ${active ? "Ativo" : "Inativo"}
                  </span>
                </td>

                <td>
                  ${formatDateTime(link.createdAt)}
                </td>

                <td>
                  <div class="table-actions">

                    <button
                      class="btn small secondary"
                      data-copy-link="${escapeHTML(url)}"
                    >
                      Copiar
                    </button>

                    <button
                      class="btn small secondary"
                      data-open-link="${escapeHTML(url)}"
                    >
                      Abrir
                    </button>

                    <button
                      class="btn small danger"
                      data-delete-link="${
                        escapeHTML(
                          link._id ||
                          link.id
                        )
                      }"
                    >
                      ${active ? "Desativar" : "Eliminar"}
                    </button>

                  </div>
                </td>

              </tr>
            `;
          }).join("")}
        </tbody>

      </table>
    </div>
  `;

  document
    .querySelectorAll("[data-copy-link]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        await copyText(
          button.dataset.copyLink
        );
      });
    });

  document
    .querySelectorAll("[data-open-link]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const url = button.dataset.openLink;

        if (url) {
          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );
        }
      });
    });

  document
    .querySelectorAll("[data-delete-link]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        await deletePaymentLink(
          button.dataset.deleteLink
        );
      });
    });
}

async function deletePaymentLink(id) {
  if (!id) return;

  const confirmed = window.confirm(
    "Queres realmente desativar/eliminar este link de pagamento?"
  );

  if (!confirmed) return;

  try {
    await del(`/payment-links/${encodeURIComponent(id)}`);

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

function openManualPaymentLinkForm() {
  openModal(
    "Novo link de pagamento",
    `
      <form id="manualPaymentLinkForm" class="form-grid">

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

  $("#manualPaymentLinkForm")?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);

      const expiresAtValue =
        formData.get("expiresAt");

      const body = {
        title: String(formData.get("title") || "").trim(),
        description:
          String(
            formData.get("description") || ""
          ).trim() || undefined,
        amount: Number(
          formData.get("amount")
        ),
         bankAccountId:
  formData.get(
    "bankAccountId"
  ) || undefined,
        expiresAt:
          expiresAtValue
            ? new Date(
                expiresAtValue
              ).toISOString()
            : undefined
      };

      try {
        const data = await post(
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

function openPaymentLinkForm(product) {
  openModal(
    "Criar link de pagamento",
    `
      <form id="paymentLinkForm" class="form-grid">

        <label class="full">
          <span>Produto</span>
          <input
            value="${escapeHTML(product.name)}"
            disabled
          >
        </label>

        <label class="full">
          <span>Título do link</span>
          <input
            name="title"
            value="${escapeHTML(product.name)}"
            required
          >
        </label>

        <label class="full">
          <span>Descrição</span>
          <textarea
            name="description"
            rows="3"
          >${escapeHTML(product.description || "")}</textarea>
        </label>

        <label>
          <span>Valor (Kz)</span>
          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            value="${escapeHTML(product.price || "")}"
            required
          >
        </label>
<label class="full">
  <span>Conta bancária para transferência</span>

  <select
    name="bankAccountId"
  >

    <option value="">
      Sem conta bancária específica
    </option>

    ${
      (state.bankAccounts || [])
        .filter(
          account =>
            account.active !== false
        )
        .map(
          account => {

            const id =
              bankAccountId(
                account
              );

            const name =
              account.bankName ||
              account.bank ||
              "Banco";

            const number =
              account.accountNumber ||
              account.iban ||
              account.number ||
              "";

            const selected =
              account.isDefault
                ? "selected"
                : "";

            return `
              <option
                value="${escapeHTML(id)}"
                ${selected}
              >
                ${escapeHTML(name)}
                ${
                  number
                    ? ` — ${escapeHTML(number)}`
                    : ""
                }
              </option>
            `;
          }
        )
        .join("")
    }

  </select>

  <small>
    Esta conta será apresentada para transferências bancárias diretas.
    A liquidação dos pagamentos BitPay continua dependente da configuração
    do comerciante na BitPay.
  </small>
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

  $("#paymentLinkForm")?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);

      const body = {
        title: formData.get("title"),
        description: formData.get("description"),
        amount: Number(formData.get("amount")),
        productId:
          product._id ||
          product.id
      };

      try {
        const data = await post(
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

function showCreatedLink(data) {
  const token = paymentLinkToken(data);

  const url =
    paymentLinkUrl(data) ||
    (
      token
        ? `${window.location.origin}/pay/${encodeURIComponent(token)}`
        : data?.url || data?.paymentUrl || ""
    );

  const qrSource =
  data?.qrSvg ||
  "";

  openModal(
    "Link criado",
    `
      <div class="success-result">

        <div class="success-icon">✓</div>

        <h3>O teu link está pronto</h3>

        <p>
          Envia este link ao cliente para ele efetuar o pagamento.
        </p>

        <div class="generated-link-box">

          <input
            id="generatedPaymentUrl"
            value="${escapeHTML(url)}"
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
                  String(qrSource).trim().startsWith("<svg")
                    ? qrSource
                    : `
                      <img
                        id="dashboardQr"
                        src="${escapeHTML(qrSource)}"
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

  $("#copyPaymentUrl")?.addEventListener(
    "click",
    () => copyText(url)
  );

  $("#openCreatedCheckout")?.addEventListener(
    "click",
    () => {
      if (!url) return;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );

  $("#backLinks")?.addEventListener(
    "click",
    async () => {
      closeModal();
      navigate("links");
    }
  );
}

/* =========================================================
   BANK ACCOUNTS
========================================================= */

async function loadBankAccounts() {
  const data = await get("/bank-accounts");

  state.bankAccounts = normalizeArray(data);

  return state.bankAccounts;
}

function renderBankAccounts() {
  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Recebimentos</span>
        <h2>Contas bancárias</h2>
        <p>
          Configura as contas que os teus clientes poderão utilizar
          para efetuar pagamentos.
        </p>
      </div>

      <button
        id="newBankAccountButton"
        class="btn primary"
      >
        Adicionar conta
      </button>
    </div>

    <section class="panel">

      <div class="panel-header">
        <div>
          <h3>As minhas contas</h3>
          <p>
            Mantém os dados bancários atualizados para evitar erros
            nos pagamentos.
          </p>
        </div>
      </div>

      <div id="bankAccountsContent"></div>

    </section>
  `;

  renderBankAccountList();

  $("#newBankAccountButton")?.addEventListener(
    "click",
    openBankAccountForm
  );
}

function bankAccountId(account) {
  return account._id || account.id || "";
}

function renderBankAccountList() {
  const container = $("#bankAccountsContent");

  if (!container) return;

  if (!state.bankAccounts.length) {
    container.innerHTML = `
      <div class="empty-state">

        <strong>Nenhuma conta bancária configurada</strong>

        <span>
          Adiciona uma conta para começares a receber pagamentos
          através dos teus links.
        </span>

        <button
          id="emptyAddBankAccount"
          class="btn primary"
        >
          Adicionar conta
        </button>

      </div>
    `;

    $("#emptyAddBankAccount")?.addEventListener(
      "click",
      openBankAccountForm
    );

    return;
  }

  container.innerHTML = `
    <div class="bank-account-grid">

      ${state.bankAccounts.map(account => {

        const id = bankAccountId(account);

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
          account.name ||
          "—";

        const active =
          account.active !== false;

        return `
          <article class="bank-account-card">

            <div class="bank-account-top">

              <div class="bank-logo">
                ${escapeHTML(
                  initials(bankName)
                )}
              </div>

              <span class="status ${
                active
                  ? "success"
                  : "neutral"
              }">
                ${active ? "Ativa" : "Inativa"}
              </span>

            </div>

            <div class="bank-account-main">

              <span class="bank-account-label">
                Banco
              </span>

              <strong>
                ${escapeHTML(bankName)}
              </strong>

              <span class="bank-account-label">
                Titular
              </span>

              <strong>
                ${escapeHTML(holder)}
              </strong>

              <span class="bank-account-label">
                Conta / IBAN
              </span>

              <strong class="bank-account-number">
                ${escapeHTML(accountNumber)}
              </strong>

            </div>

            <div class="bank-account-actions">

              <button
                class="btn small secondary"
                data-edit-bank="${escapeHTML(id)}"
              >
                Editar
              </button>

              <button
                class="btn small danger"
                data-delete-bank="${escapeHTML(id)}"
              >
                Remover
              </button>

            </div>

          </article>
        `;
      }).join("")}

    </div>
  `;

  document
    .querySelectorAll("[data-edit-bank]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const account =
          state.bankAccounts.find(
            item =>
              String(bankAccountId(item)) ===
              String(button.dataset.editBank)
          );

        if (account) {
          openBankAccountForm(account);
        }
      });
    });

  document
    .querySelectorAll("[data-delete-bank]")
    .forEach(button => {
      button.addEventListener("click", async () => {
        await deleteBankAccount(
          button.dataset.deleteBank
        );
      });
    });
}

function openBankAccountForm(account = null) {
  const editing = Boolean(account);

  openModal(
    editing
      ? "Editar conta bancária"
      : "Adicionar conta bancária",

    `
      <form id="bankAccountForm" class="form-grid">

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
                account?.active !== false
                  ? "selected"
                  : ""
              }
            >
              Ativa
            </option>

            <option
              value="false"
              ${
                account?.active === false
                  ? "selected"
                  : ""
              }
            >
              Inativa
            </option>

          </select>
        </label>

        <label class="full">
          <span>Nome apresentado ao cliente</span>

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

  $("#bankAccountForm")?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);

      const body = {
        bankName:
          String(
            formData.get("bankName") || ""
          ).trim(),

        accountNumber:
          String(
            formData.get("accountNumber") || ""
          ).trim(),

        iban:
          String(
            formData.get("iban") || ""
          ).trim(),

        accountHolder:
          String(
            formData.get("accountHolder") || ""
          ).trim(),

        phone:
          String(
            formData.get("phone") || ""
          ).trim(),

        displayName:
          String(
            formData.get("displayName") || ""
          ).trim(),

        active:
          formData.get("active") === "true"
      };

      try {
        try {
try {
  if (editing) {
    const id = bankAccountId(account);

    if (!id) {
      throw new Error(
        "ID da conta bancária não encontrado."
      );
    }

    await patch(
      `/bank-accounts/${encodeURIComponent(id)}`,
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
  showToast(
    getErrorMessage(error),
    "error"
  );
}
  
    }
  );
}

async function deleteBankAccount(id) {
  if (!id) return;

  const confirmed = window.confirm(
    "Queres realmente remover esta conta bancária?"
  );

  if (!confirmed) return;

  try {
    await del(
      `/bank-accounts/${encodeURIComponent(id)}`
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
   REPORTS
========================================================= */

async function renderReports() {
  let payments = state.payments;

  if (!payments.length) {
    try {
      await loadPayments();
      payments = state.payments;
    } catch {}
  }

  const successful = payments.filter(payment =>
    ["PAID", "SUCCEEDED", "SUCCESS"].includes(
      String(payment.status || "").toUpperCase()
    )
  );

  const pending = payments.filter(payment =>
    ["PENDING", "PROCESSING"].includes(
      String(payment.status || "").toUpperCase()
    )
  );

  const failed = payments.filter(payment =>
    ["FAILED", "CANCELLED", "EXPIRED"].includes(
      String(payment.status || "").toUpperCase()
    )
  );

  const revenue = successful.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Gestão</span>
        <h2>Relatórios</h2>
        <p>Resumo do desempenho financeiro da tua conta.</p>
      </div>
    </div>

    <div class="stats-grid">

      <article class="stat-card">
        <span class="stat-label">Receita</span>
        <strong>${formatKz(revenue)}</strong>
        <span class="stat-meta">Pagamentos concluídos</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Concluídos</span>
        <strong>${formatNumber(successful.length)}</strong>
        <span class="stat-meta">Transações pagas</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Pendentes</span>
        <strong>${formatNumber(pending.length)}</strong>
        <span class="stat-meta">Aguardam processamento</span>
      </article>

      <article class="stat-card">
        <span class="stat-label">Falhados</span>
        <strong>${formatNumber(failed.length)}</strong>
        <span class="stat-meta">Não concluídos</span>
      </article>

    </div>

    <section class="panel">

      <div class="panel-header">
        <div>
          <h3>Resumo das transações</h3>
          <p>Dados disponíveis no teu painel.</p>
        </div>
      </div>

      <div class="report-summary">

        <div>
          <span>Taxa de sucesso</span>
          <strong>
            ${
              payments.length
                ? Math.round(
                    (
                      successful.length /
                      payments.length
                    ) * 100
                  )
                : 0
            }%
          </strong>
        </div>

        <div>
          <span>Total de transações</span>
          <strong>${formatNumber(payments.length)}</strong>
        </div>

        <div>
          <span>Ticket médio</span>
          <strong>
            ${
              successful.length
                ? formatKz(
                    revenue /
                    successful.length
                  )
                : formatKz(0)
            }
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
  const merchant = state.merchant || {};

  pageContent.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Conta</span>
        <h2>Definições</h2>
        <p>Atualiza os dados do teu negócio.</p>
      </div>
    </div>

    <section class="panel">

      <div class="panel-header">
        <div>
          <h3>Dados do negócio</h3>
          <p>Estas informações podem aparecer no checkout.</p>
        </div>
      </div>

      <form id="settingsForm" class="form-grid">

        <label class="full">
          <span>Nome do negócio</span>
          <input
            name="businessName"
            value="${escapeHTML(
              merchant.businessName ||
              merchant.name ||
              ""
            )}"
            required
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

  $("#settingsForm")?.addEventListener(
    "submit",
    saveSettings
  );
}

async function saveSettings(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const body = {
    businessName:
      String(
        formData.get("businessName") || ""
      ).trim(),

    phone:
      String(
        formData.get("phone") || ""
      ).trim()
  };

  try {
    const data = await patch(
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

function openModal(title, content) {
  if (!modalOverlay || !modal) {
    return;
  }

  modal.innerHTML = `
    <div class="modal-header">

      <div>
        <span class="eyebrow">Honey Pay</span>
        <h3>${escapeHTML(title)}</h3>
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

  modalOverlay.classList.remove("hidden");
  modalOverlay.classList.add("show");

  document.body.classList.add("modal-open");

  modal
    .querySelectorAll("[data-close-modal]")
    .forEach(button => {
      button.addEventListener(
        "click",
        closeModal
      );
    });
}

function closeModal() {
  if (!modalOverlay || !modal) return;

  modalOverlay.classList.remove("show");
  modalOverlay.classList.add("hidden");

  document.body.classList.remove("modal-open");

  modal.innerHTML = "";
}

function setupModal() {
  modalOverlay?.addEventListener(
    "click",
    event => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        modalOverlay?.classList.contains("show")
      ) {
        closeModal();
      }
    }
  );
}

/* =========================================================
   CLIPBOARD
========================================================= */

async function copyText(text) {
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
      await navigator.clipboard.writeText(text);
    } else {
      const textarea =
        document.createElement("textarea");

      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      document.execCommand("copy");

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
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {
  $("#refreshButton")?.addEventListener(
    "click",
    async () => {
      const button = $("#refreshButton");

      button?.classList.add("loading");

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
        button?.classList.remove("loading");
      }
    }
  );
}

/* =========================================================
   BACKGROUND PAYMENT REFRESH
========================================================= */

function startPaymentRefresh() {
  stopPaymentRefresh();

  state.paymentRefreshTimer =
    setInterval(async () => {
      if (!state.authenticated) return;

      try {
        await loadPayments();

        if (
          state.currentRoute === "payments"
        ) {
          renderPaymentsTable();
        }

        if (
          state.currentRoute === "dashboard"
        ) {
          renderRecentPayments();

          const pending =
            state.payments.filter(payment =>
              ["PENDING", "PROCESSING"].includes(
                String(
                  payment.status || ""
                ).toUpperCase()
              )
            ).length;

          const pendingElement =
            $("#statPending");

          if (pendingElement) {
            pendingElement.textContent =
              formatNumber(pending);
          }
        }
      } catch {
        // Atualização em segundo plano.
      }
    }, 15000);
}

function stopPaymentRefresh() {
  if (state.paymentRefreshTimer) {
    clearInterval(
      state.paymentRefreshTimer
    );

    state.paymentRefreshTimer = null;
  }
}

/* =========================================================
   ROUTER
========================================================= */

async function renderRoute(route, forceReload = false) {
  if (!ROUTES[route]) {
    route = "dashboard";
  }

  state.currentRoute = route;

  updateNavigation(route);

  if (!pageContent) return;

  pageContent.classList.add("is-loading");

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
        await loadLinks();
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
        navigate("dashboard");
        return;
    }

    pageContent
      .querySelectorAll("[data-route]")
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

  } catch (error) {
    renderRouteError(error);
  } finally {
    pageContent.classList.remove(
      "is-loading"
    );
  }
}

function renderRouteError(error) {
  if (!pageContent) return;

  pageContent.innerHTML = `
    <div class="error-state">

      <div class="error-icon">!</div>

      <h2>Não foi possível carregar esta página</h2>

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
      >
        Tentar novamente
      </button>

    </div>
  `;

  $("#retryButton")?.addEventListener(
    "click",
    () => renderRoute(
      state.currentRoute,
      true
    )
  );
}

/* =========================================================
   HASH EVENTS
========================================================= */

function setupRouting() {
  window.addEventListener(
    "hashchange",
    () => {
      renderRoute(
        getCurrentRoute()
      );
    }
  );

  document
    .querySelectorAll(".nav-item[data-route]")
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

  document
    .querySelector(".brand")
    ?.addEventListener(
      "click",
      event => {
        event.preventDefault();

        navigate("dashboard");
      }
    );
}

/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {
  $("#logoutButton")?.addEventListener(
    "click",
    async () => {

      const confirmed = window.confirm(
        "Queres terminar a sessão?"
      );

      if (!confirmed) return;

      try {
        await post(
          "/auth/logout",
          {}
        );
      } catch {
        // Mesmo que a API falhe,
        // não devemos manter o painel aberto.
      } finally {
        state.authenticated = false;

        stopPaymentRefresh();

        window.location.replace(
          "/login"
        );
      }
    }
  );
}

/* =========================================================
   CREATE BANK ACCOUNT NAV
========================================================= */

function ensureBankAccountsNavigation() {
  const nav = document.querySelector(".nav");

  if (!nav) return;

  if (
    document.querySelector(
      '.nav-item[data-route="bank-accounts"]'
    )
  ) {
    return;
  }

  const sections =
    nav.querySelectorAll(".nav-section");

  const workspace =
    sections[0] || nav;

  const link = document.createElement("a");

  link.href = "#bank-accounts";
  link.className = "nav-item";
  link.dataset.route = "bank-accounts";

  link.innerHTML = `
    <span class="nav-icon">▤</span>
    <span>Contas bancárias</span>
  `;

  link.addEventListener(
    "click",
    event => {
      event.preventDefault();

      navigate("bank-accounts");
    }
  );

  workspace.appendChild(link);
}

/* =========================================================
   BOOT
========================================================= */

async function boot() {
  if (state.booted) return;

  state.booted = true;

  showLoader();

  try {
    const authenticated =
      await checkSession();

    if (!authenticated) {
      redirectToLogin();
      return;
    }

    state.authenticated = true;

    revealApplication();

    ensureBankAccountsNavigation();

    await loadCurrentUser();

    setupSidebar();
    setupModal();
    setupRefreshButton();
    setupLogout();
    setupRouting();

    const route =
      getCurrentRoute();

    await renderRoute(route);

    startPaymentRefresh();

  } catch (error) {
    console.error(
      "Honey Pay boot error:",
      error
    );

    if (
      error?.status === 401
    ) {
      redirectToLogin();
      return;
    }

    revealApplication();

    if (pageContent) {
      pageContent.innerHTML = `
        <div class="error-state">

          <div class="error-icon">!</div>

          <h2>Não foi possível iniciar o painel</h2>

          <p>
            ${escapeHTML(
              getErrorMessage(
                error,
                "Ocorreu um erro ao iniciar o Honey Pay."
              )
            )}
          </p>

          <button
            id="bootRetry"
            class="btn primary"
          >
            Tentar novamente
          </button>

        </div>
      `;

      $("#bootRetry")?.addEventListener(
        "click",
        () => {
          window.location.reload();
        }
      );
    }
  }
}

/* =========================================================
   GLOBAL API
========================================================= */

window.HoneyPay = {
  state,

  boot,

  session: checkSession,

  navigate,

  refreshPayments,

  loadBankAccounts,

  loadLinks
};

/* =========================================================
   START
========================================================= */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    { once: true }
  );
} else {
  boot();
}
