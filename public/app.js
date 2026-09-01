'use strict';

const TOKEN_KEY =
  'honey_pay_token';

const $ =
  (selector) =>
    document.querySelector(
      selector
    );

function getToken() {
  return localStorage.getItem(
    TOKEN_KEY
  );
}

function setToken(token) {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );
}

function clearToken() {
  localStorage.removeItem(
    TOKEN_KEY
  );
}

async function api(
  url,
  options = {}
) {
  const token =
    getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (
    options.body &&
    !(
      options.body instanceof
      FormData
    )
  ) {
    headers[
      'Content-Type'
    ] =
      'application/json';
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      url,
      {
        ...options,
        headers
      }
    );

  const data =
    await response.json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      'Erro na operação'
    );
  }

  return data;
}

/* =========================================================
   UI
========================================================= */

function showLogin() {
  $('#loginSection')
    .classList.remove(
      'hidden'
    );

  $('#dashboardSection')
    .classList.add(
      'hidden'
    );
}

function showDashboard() {
  $('#loginSection')
    .classList.add(
      'hidden'
    );

  $('#dashboardSection')
    .classList.remove(
      'hidden'
    );
}

/* =========================================================
   LOGIN
========================================================= */

$('#loginForm')
  .addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      $('#loginMessage')
        .textContent =
        'A entrar...';

      try {
        const data =
          await api(
            '/api/auth/login',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  email:
                    $('#loginEmail')
                      .value,

                  password:
                    $('#loginPassword')
                      .value
                })
            }
          );

        setToken(
          data.token
        );

        await initialize();

      } catch (error) {
        $('#loginMessage')
          .textContent =
          error.message;

        $('#loginMessage')
          .className =
          'error';
      }
    }
  );

/* =========================================================
   REGISTER
========================================================= */

$('#registerForm')
  .addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      $('#registerMessage')
        .textContent =
        'A criar conta...';

      try {
        const data =
          await api(
            '/api/auth/register',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  name:
                    $('#registerName')
                      .value,

                  businessName:
                    $('#registerBusiness')
                      .value,

                  email:
                    $('#registerEmail')
                      .value,

                  password:
                    $('#registerPassword')
                      .value,

                  phone:
                    $('#registerPhone')
                      .value
                })
            }
          );

        setToken(
          data.token
        );

        await initialize();

      } catch (error) {
        $('#registerMessage')
          .textContent =
          error.message;

        $('#registerMessage')
          .className =
          'error';
      }
    }
  );

/* =========================================================
   LOGOUT
========================================================= */

$('#logoutButton')
  .addEventListener(
    'click',
    () => {
      clearToken();
      showLogin();
    }
  );

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  const data =
    await api(
      '/api/dashboard'
    );

  const stats =
    data.stats;

  $('#totalPayments')
    .textContent =
    stats.totalPayments;

  $('#successfulPayments')
    .textContent =
    stats.successfulPayments;

  $('#grossVolume')
    .textContent =
    `${formatMoney(
      stats.grossVolume
    )} Kz`;

  $('#fees')
    .textContent =
    `${formatMoney(
      stats.honeyPayFees
    )} Kz`;

  const container =
    $('#payments');

  container.innerHTML =
    '';

  if (
    !data.recentPayments.length
  ) {
    container.innerHTML =
      '<p>Nenhum pagamento ainda.</p>';

    return;
  }

  data.recentPayments
    .forEach(
      (payment) => {
        const div =
          document.createElement(
            'div'
          );

        div.style.padding =
          '12px 0';

        div.style.borderBottom =
          '1px solid #eee';

        div.innerHTML = `
          <strong>
            ${formatMoney(
              payment.amount
            )} Kz
          </strong>

          <br>

          Método:
          ${payment.paymentMethod}

          <br>

          Estado:
          <strong>
            ${payment.status}
          </strong>

          <br>

          Taxa:
          ${formatMoney(
            payment.feeAmount
          )} Kz
        `;

        container.appendChild(
          div
        );
      }
    );
}

/* =========================================================
   CREATE LINK
========================================================= */

$('#linkForm')
  .addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      $('#linkMessage')
        .textContent =
        'A criar...';

      try {
        const data =
          await api(
            '/api/payment-links',
            {
              method: 'POST',

              body:
                JSON.stringify({
                  title:
                    $('#linkTitle')
                      .value,

                  description:
                    $('#linkDescription')
                      .value,

                  amount:
                    Number(
                      $('#linkAmount')
                        .value
                    )
                })
            }
          );

        $('#linkMessage')
          .className =
          'success';

        $('#linkMessage')
          .innerHTML = `
            Link criado:
            <br>
            <a
              href="${data.url}"
              target="_blank"
            >
              ${data.url}
            </a>
          `;

      } catch (error) {
        $('#linkMessage')
          .className =
          'error';

        $('#linkMessage')
          .textContent =
          error.message;
      }
    }
  );

/* =========================================================
   INIT
========================================================= */

async function initialize() {
  if (!getToken()) {
    showLogin();
    return;
  }

  try {
    const me =
      await api(
        '/api/auth/me'
      );

    $('#merchantName')
      .textContent =
      me.merchant.businessName ||
      me.merchant.name;

    showDashboard();

    await loadDashboard();

  } catch {
    clearToken();
    showLogin();
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat(
    'pt-AO',
    {
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

initialize();
