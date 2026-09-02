(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={user:null,merchant:null,dashboard:null,payments:[],orders:[],products:[],customers:[],links:[],route:'dashboard'};
const labels={dashboard:'Dashboard',payments:'Pagamentos',orders:'Pedidos',products:'Produtos',customers:'Clientes',links:'Links de pagamento',reports:'Relatórios',settings:'Definições'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kz=v=>new Intl.NumberFormat('pt-AO',{maximumFractionDigits:0}).format(Number(v)||0)+' Kz';
const dt=v=>v?new Date(v).toLocaleString('pt-AO'):'—';
const status=s=>({PAID:'Pago',SUCCEEDED:'Pago',PENDING:'Pendente',PROCESSING:'Em processamento',PAYMENT_PROCESSING:'Em processamento',FAILED:'Falhou',CANCELLED:'Cancelado',REFUNDED:'Reembolsado'}[String(s||'').toUpperCase()]||s||'—');
const cls=s=>['PAID','SUCCEEDED'].includes(String(s||'').toUpperCase())?'ok':['FAILED','CANCELLED'].includes(String(s||'').toUpperCase())?'bad':'wait';

function toast(msg,error=false){const d=document.createElement('div');d.className='toast '+(error?'error':'');d.textContent=msg;$('#toastContainer').appendChild(d);setTimeout(()=>d.remove(),3500)}
async function api(path,opt={}){const r=await fetch('/api'+path,{credentials:'include',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(r.status===401){location.href='/login';throw new Error('Sessão expirada.')}if(!r.ok)throw new Error(d.error||'Pedido falhou.');return d}

async function boot(){
 try{const d=await api('/me');state.user=d.user;state.merchant=d.merchant;$('#merchantName').textContent=d.merchant.businessName||d.user.name;$('#merchantEmail').textContent=d.user.email;$('#merchantAvatar').textContent=(d.merchant.businessName||d.user.name||'H')[0].toUpperCase();$('#app').classList.remove('hidden');document.body.classList.add('app-ready');route(location.hash.slice(1)||'dashboard')}
 catch(e){location.href='/login'}
}
async function loadAll(){const [d,p,o,c,pr,l]=await Promise.all([api('/dashboard'),api('/payments'),api('/orders'),api('/customers'),api('/products'),api('/payment-links')]);state.dashboard=d.dashboard;state.payments=p.payments;state.orders=o.orders;state.customers=c.customers;state.products=pr.products;state.links=l.links}

function shell(title,sub=''){return `<div class="page-header"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div>`}
function renderDashboard(){const d=state.dashboard||{};return shell('Dashboard','Visão geral do seu negócio')+`<div class="stats"><div class="stat"><small>Volume recebido</small><strong>${kz(d.totalRevenue)}</strong></div><div class="stat"><small>Transações</small><strong>${state.payments.length}</strong></div><div class="stat"><small>Taxas Honey Pay</small><strong>${kz(d.totalFees)}</strong></div><div class="stat"><small>Pendentes</small><strong>${d.pendingOrders||0}</strong></div></div><div class="panel"><h3>Pagamentos recentes</h3>${table(state.payments.slice(0,8),['reference','amount','status','createdAt'])}</div>`}

function table(items,cols){if(!items?.length)return `<div class="empty">Ainda não existem registos.</div>`;return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${items.map(x=>`<tr>${cols.map(c=>`<td>${c==='amount'||c==='price'||c==='total'?kz(x[c]):c==='status'?`<span class="badge ${cls(x[c])}">${esc(status(x[c]))}</span>`:c==='createdAt'?dt(x[c]):esc(x[c]||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}

function products(){return shell('Produtos','Crie e gere os produtos que serão usados nas cobranças')+`<div class="panel"><form id="productForm" class="form"><div class="grid"><div><label>Nome</label><input name="name" required></div><div><label>Preço (Kz)</label><input name="price" type="number" min="1" required></div></div><div><label>Descrição</label><textarea name="description"></textarea></div><button class="primary">Criar produto</button></form></div><div class="panel">${table(state.products,['name','price','active','createdAt'])}</div>`}
function customers(){return shell('Clientes','Clientes associados às cobranças')+`<div class="panel"><form id="customerForm" class="form"><div class="grid"><div><label>Nome</label><input name="name" required></div><div><label>Telefone</label><input name="phone"></div></div><div><label>Email</label><input name="email" type="email"></div><button class="primary">Adicionar cliente</button></form></div><div class="panel">${table(state.customers,['name','phone','email','totalSpent'])}</div>`}
function links(){return shell('Links de pagamento','Crie links para WhatsApp, Facebook, Instagram, eventos e lojas online')+`<div class="panel"><form id="linkForm" class="form"><div class="grid"><div><label>Título</label><input name="title" placeholder="Ex.: Convite VIP" required></div><div><label>Produto</label><select name="productId"><option value="">Valor personalizado</option>${state.products.filter(p=>p.active).map(p=>`<option value="${p._id}">${esc(p.name)} — ${kz(p.price)}</option>`).join('')}</select></div></div><div class="grid"><div><label>Quantidade</label><input name="quantity" type="number" min="1" value="1"></div><div><label>Valor (Kz, se não escolher produto)</label><input name="amount" type="number" min="1"></div></div><div><label>Descrição</label><textarea name="description"></textarea></div><button class="primary">Criar link</button></form></div><div class="panel">${state.links.length?state.links.map(l=>`<div style="padding:14px 0;border-bottom:1px solid #eee"><strong>${esc(l.title)}</strong><div class="muted">${kz(l.amount)}</div><div class="link-box"><input readonly value="${location.origin}/pay/${esc(l.token)}"><button class="secondary copy" data-copy="${location.origin}/pay/${esc(l.token)}">Copiar</button></div></div>`).join(''):`<div class="empty">Ainda não criou nenhum link.</div>`}</div>`}
function reports(){const d=state.dashboard||{};return shell('Relatórios','Resumo financeiro')+`<div class="stats"><div class="stat"><small>Recebido</small><strong>${kz(d.totalRevenue)}</strong></div><div class="stat"><small>Taxas</small><strong>${kz(d.totalFees)}</strong></div><div class="stat"><small>Líquido contabilístico</small><strong>${kz(d.netRevenue)}</strong></div><div class="stat"><small>Taxa Honey Pay</small><strong>0,80%</strong></div></div><div class="panel">${table(state.payments,['reference','amount','status','paymentMethod','createdAt'])}</div>`}
function settings(){return shell('Definições','Perfil do comerciante')+`<div class="panel"><form id="settingsForm" class="form"><label>Nome do negócio</label><input name="businessName" value="${esc(state.merchant?.businessName||'')}"><label>Telefone</label><input name="phone" value="${esc(state.merchant?.phone||'')}"><label>NIF</label><input name="nif" value="${esc(state.merchant?.nif||'')}"><label>Email Google</label><input disabled value="${esc(state.user?.email||'')}"><button class="primary">Guardar</button></form></div>`}
function collection(title,arr,cols,sub){return shell(title,sub)+`<div class="panel">${table(arr,cols)}</div>`}

async function render(r){
 state.route=labels[r]?r:'dashboard';$('#pageTitle').textContent=labels[state.route];
 try{await loadAll();let html='';if(state.route==='dashboard')html=renderDashboard();else if(state.route==='products')html=products();else if(state.route==='customers')html=customers();else if(state.route==='links')html=links();else if(state.route==='payments')html=collection('Pagamentos',state.payments,['reference','amount','status','paymentMethod','createdAt'],'Transações processadas pela Honey Pay / BitPay');else if(state.route==='orders')html=collection('Pedidos',state.orders,['reference','total','status','createdAt'],'Pedidos criados pelos clientes');else if(state.route==='reports')html=reports();else html=settings();$('#pageContent').innerHTML=html;bindForms()}
 catch(e){$('#pageContent').innerHTML=`<div class="panel"><div class="empty"><h3>Não foi possível carregar</h3><p>${esc(e.message)}</p><button class="primary" id="retry">Tentar novamente</button></div></div>`;$('#retry')?.addEventListener('click',()=>render(state.route))}
}
function bindForms(){
 $('#productForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/products',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});toast('Produto criado.');render('products')}catch(x){toast(x.message,true)}});
 $('#customerForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/customers',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});toast('Cliente criado.');render('customers')}catch(x){toast(x.message,true)}});
 $('#linkForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(!f.productId&&!f.amount)return toast('Informe um produto ou um valor.',true);try{const d=await api('/payment-links',{method:'POST',body:JSON.stringify(f)});await navigator.clipboard?.writeText(d.url).catch(()=>{});toast('Link criado e copiado.');render('links')}catch(x){toast(x.message,true)}});
 $('#settingsForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{const d=await api('/merchant',{method:'PATCH',body:JSON.stringify(f)});state.merchant=d.merchant;toast('Definições guardadas.');render('settings')}catch(x){toast(x.message,true)}});
 $$('.copy').forEach(b=>b.addEventListener('click',async()=>{await navigator.clipboard.writeText(b.dataset.copy);toast('Link copiado.')}))
}
function route(r){render(r);$$('nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===r))}
window.addEventListener('hashchange',()=>route(location.hash.slice(1)||'dashboard'));
$$('nav a').forEach(a=>a.addEventListener('click',()=>$('#sidebar').classList.remove('open')));
$('#menuButton')?.addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#refreshButton')?.addEventListener('click',()=>render(state.route));
$('#logoutButton')?.addEventListener('click',async()=>{if(confirm('Terminar sessão?')){await api('/auth/logout',{method:'POST'}).catch(()=>{});location.href='/login'}});
boot();
})();
