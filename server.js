/*
============================================================
HONEY PAY — V3.4.0
Backend integrado com BitPay Angola
============================================================
- Google OAuth + cookie HttpOnly
- MongoDB / Mongoose
- Produtos, clientes, pedidos
- Links Honey Pay
- Checkout público
- BitPay Payment Intents
- Multicaixa Express + Referência
- QR / Pay by Link BitPay opcional
- Webhooks assinados + idempotência
- 0,80% Honey Pay = 80 bps
============================================================
*/

'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'development';

const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${APP_BASE_URL}/api/auth/google/callback`;

const BITPAY_BASE_URL =
  (process.env.BITPAY_BASE_URL || 'https://api-sandbox.bitpay.ao/v1').replace(/\/$/, '');
const BITPAY_SECRET_KEY = process.env.BITPAY_SECRET_KEY || '';
const BITPAY_WEBHOOK_SECRET = process.env.BITPAY_WEBHOOK_SECRET || '';
const BITPAY_WEBHOOK_URL =
  process.env.BITPAY_WEBHOOK_URL ||
  `${APP_BASE_URL}/api/webhooks/bitpay`;
const HONEY_PAY_FEE_BPS = Number(process.env.HONEY_PAY_FEE_BPS || 80);
const HONEY_PAY_CURRENCY = process.env.HONEY_PAY_CURRENCY || 'AOA';
const BITPAY_MULTI_MERCHANT_ENABLED =
  String(process.env.BITPAY_MULTI_MERCHANT_ENABLED || 'false').toLowerCase() === 'true';

if (!MONGODB_URI) throw new Error('MONGODB_URI não configurado.');
if (!JWT_SECRET) throw new Error('JWT_SECRET não configurado.');

const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
const CHECKOUT_FILE = path.join(PUBLIC_DIR, 'checkout.html');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000,
  standardHeaders: true, legacyHeaders: false,
  message: { success:false, error:'Muitas requisições. Tente novamente mais tarde.' }
}));

app.use(express.json({
  limit:'2mb',
  verify(req, res, buf) {
    if (req.originalUrl === '/api/webhooks/bitpay') req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended:true, limit:'2mb' }));

mongoose.set('strictQuery', true);

const clean = (v, max=500) => String(v ?? '').trim().slice(0,max);
const email = v => clean(v,320).toLowerCase();
const oid = id => mongoose.Types.ObjectId.isValid(id);
const token = () => crypto.randomBytes(24).toString('hex');
const ref = () => `HP-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const fee = amount => Math.round(Number(amount) * HONEY_PAY_FEE_BPS / 10000);
const net = amount => Math.max(0, Math.round(Number(amount)) - fee(amount));
const ah = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

function cookies(req) {
  const out={};
  for (const p of String(req.headers.cookie||'').split(';')) {
    const i=p.indexOf('=');
    if(i<0) continue;
    try { out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); }
    catch { out[p.slice(0,i).trim()] = p.slice(i+1).trim(); }
  }
  return out;
}
function setCookie(res,name,value,maxAge) {
  res.setHeader('Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; ${NODE_ENV==='production'?'Secure; ':''}SameSite=Lax`);
}
function authToken(req) {
  const h=req.headers.authorization||'';
  if(h.startsWith('Bearer ')) return h.slice(7).trim();
  return cookies(req).honey_pay_token || null;
}
function authenticate(req,res,next) {
  try {
    const t=authToken(req);
    if(!t) return res.status(401).json({success:false,error:'Autenticação necessária.'});
    const p=jwt.verify(t,JWT_SECRET);
    if(!p?.sub) throw new Error('invalid');
    req.userId=String(p.sub); req.userEmail=p.email||''; req.userRole=p.role||'merchant';
    next();
  } catch { res.status(401).json({success:false,error:'Sessão inválida ou expirada.'}); }
}

function oauthState() {
  return jwt.sign({purpose:'google_oauth',nonce:crypto.randomBytes(16).toString('hex')},JWT_SECRET,{expiresIn:'10m'});
}
function validState(s) {
  try { const p=jwt.verify(s,JWT_SECRET); return p?.purpose==='google_oauth'; } catch { return false; }
}
function googleUrl() {
  const p=new URLSearchParams({
    client_id:GOOGLE_CLIENT_ID, redirect_uri:GOOGLE_CALLBACK_URL,
    response_type:'code', scope:'openid email profile',
    access_type:'offline', prompt:'select_account', state:oauthState()
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
async function googleToken(code) {
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      code,client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,
      redirect_uri:GOOGLE_CALLBACK_URL,grant_type:'authorization_code'
    })
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error_description||d.error||'Falha no Google.');
  return d;
}
async function googleUser(access) {
  const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
    headers:{Authorization:`Bearer ${access}`}
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Falha ao obter perfil Google.');
  return d;
}
function jwtFor(u) {
  return jwt.sign({sub:String(u._id),email:u.email,role:u.role||'merchant'},JWT_SECRET,{expiresIn:'30d'});
}

const User = mongoose.models.User || mongoose.model('User',new mongoose.Schema({
  name:{type:String,required:true,trim:true}, email:{type:String,required:true,unique:true,index:true},
  googleId:{type:String,default:'',index:true}, avatar:{type:String,default:''},
  authProvider:{type:String,default:'google'}, role:{type:String,enum:['merchant','admin'],default:'merchant'},
  active:{type:Boolean,default:true}, lastLoginAt:{type:Date,default:null}
},{timestamps:true}));

const Merchant = mongoose.models.Merchant || mongoose.model('Merchant',new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true,index:true},
  businessName:{type:String,default:''}, phone:{type:String,default:''}, nif:{type:String,default:''},
  address:{type:String,default:''}, city:{type:String,default:''}, country:{type:String,default:'AO'},
  currency:{type:String,default:'AOA'}, provider:{type:String,default:'bitpay'},
  providerAccountRef:{type:String,default:''}, providerSettlementReady:{type:Boolean,default:false},
  active:{type:Boolean,default:true}
},{timestamps:true}));

const Customer = mongoose.models.Customer || mongoose.model('Customer',new mongoose.Schema({
  merchantId:{type:mongoose.Schema.Types.ObjectId,ref:'Merchant',required:true,index:true},
  name:{type:String,required:true,trim:true}, email:{type:String,default:''}, phone:{type:String,default:''},
  notes:{type:String,default:''}, totalOrders:{type:Number,default:0}, totalSpent:{type:Number,default:0},
  lastOrderAt:{type:Date,default:null}
},{timestamps:true}));

const Product = mongoose.models.Product || mongoose.model('Product',new mongoose.Schema({
  merchantId:{type:mongoose.Schema.Types.ObjectId,ref:'Merchant',required:true,index:true},
  name:{type:String,required:true,trim:true}, description:{type:String,default:''}, sku:{type:String,default:''},
  price:{type:Number,required:true,min:1}, currency:{type:String,default:'AOA'}, image:{type:String,default:''},
  active:{type:Boolean,default:true}, stock:{type:Number,default:null}
},{timestamps:true}));

const Order = mongoose.models.Order || mongoose.model('Order',new mongoose.Schema({
  merchantId:{type:mongoose.Schema.Types.ObjectId,ref:'Merchant',required:true,index:true},
  customerId:{type:mongoose.Schema.Types.ObjectId,ref:'Customer',default:null},
  reference:{type:String,unique:true,index:true},
  linkId:{type:mongoose.Schema.Types.ObjectId,ref:'PaymentLink',default:null},
  items:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',default:null},name:String,quantity:Number,unitPrice:Number,total:Number}],
  subtotal:{type:Number,required:true,min:0}, total:{type:Number,required:true,min:1}, currency:{type:String,default:'AOA'},
  status:{type:String,enum:['PENDING','PAYMENT_PROCESSING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED'],default:'PENDING',index:true},
  customerSnapshot:{name:String,email:String,phone:String}, paidAt:{type:Date,default:null}
},{timestamps:true}));

const Payment = mongoose.models.Payment || mongoose.model('Payment',new mongoose.Schema({
  merchantId:{type:mongoose.Schema.Types.ObjectId,ref:'Merchant',required:true,index:true},
  orderId:{type:mongoose.Schema.Types.ObjectId,ref:'Order',required:true,index:true},
  customerId:{type:mongoose.Schema.Types.ObjectId,ref:'Customer',default:null},
  reference:{type:String,required:true,index:true}, provider:{type:String,default:'bitpay'},
  providerPaymentId:{type:String,default:'',index:true}, paymentMethod:{type:String,default:'multicaixa_express'},
  amount:{type:Number,required:true,min:1}, feeAmount:{type:Number,default:0}, netAmount:{type:Number,default:0},
  currency:{type:String,default:'AOA'}, status:{type:String,enum:['PENDING','PROCESSING','PAID','FAILED','CANCELLED','REFUNDED'],default:'PENDING',index:true},
  providerRawStatus:{type:String,default:''}, providerRaw:{type:mongoose.Schema.Types.Mixed,default:null},
  paidAt:{type:Date,default:null}
},{timestamps:true}));

const PaymentLink = mongoose.models.PaymentLink || mongoose.model('PaymentLink',new mongoose.Schema({
  merchantId:{type:mongoose.Schema.Types.ObjectId,ref:'Merchant',required:true,index:true},
  token:{type:String,unique:true,index:true}, title:{type:String,required:true}, description:{type:String,default:''},
  productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',default:null}, quantity:{type:Number,default:1,min:1},
  amount:{type:Number,required:true,min:1}, currency:{type:String,default:'AOA'}, active:{type:Boolean,default:true},
  expiresAt:{type:Date,default:null}, bitpayLinkId:{type:String,default:''}, bitpayUrl:{type:String,default:''}
},{timestamps:true}));

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent',new mongoose.Schema({
  eventId:{type:String,unique:true,index:true}, type:String, status:{type:String,default:'RECEIVED'},
  payload:{type:mongoose.Schema.Types.Mixed,default:null}, error:{type:String,default:''},
  receivedAt:{type:Date,default:Date.now}, processedAt:{type:Date,default:null}
},{timestamps:true}));

async function merchant(req,res,next) {
  const m=await Merchant.findOne({userId:req.userId,active:true}).lean();
  if(!m) return res.status(403).json({success:false,error:'Conta de comerciante não encontrada.'});
  req.merchant=m; req.merchantId=m._id; next();
}

async function bitpayRequest(endpoint,{method='GET',body,headers={}}={}) {
  if(!BITPAY_SECRET_KEY) throw Object.assign(new Error('BITPAY_SECRET_KEY não configurado.'),{status:503});
  const r=await fetch(`${BITPAY_BASE_URL}${endpoint}`,{
    method, headers:{Authorization:`Bearer ${BITPAY_SECRET_KEY}`,'content-type':'application/json',...headers},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await r.text(); let d={}; try{d=text?JSON.parse(text):{}}catch{d={raw:text}}
  if(!r.ok) {
    const e=new Error(d?.error?.message||d?.message||d?.error||`BitPay HTTP ${r.status}`);
    e.status=r.status; e.bitpay=d; throw e;
  }
  return d;
}

function verifyBitPay(raw, header) {
  if(!raw || !header || !BITPAY_WEBHOOK_SECRET) return false;
  const m=String(header).match(/t=(\d+),v1=([0-9a-fA-F]+)/);
  if(!m) return false;
  const ts=Number(m[1]);
  if(!Number.isFinite(ts) || Math.abs(Date.now()/1000-ts)>600) return false;
  const expected=crypto.createHmac('sha256',BITPAY_WEBHOOK_SECRET).update(`${m[1]}.${raw}`).digest('hex');
  const a=Buffer.from(expected,'hex'), b=Buffer.from(m[2],'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

function providerObject(body) {
  return body?.data || body?.payment || body?.object || body;
}
function providerStatus(obj) {
  return String(obj?.status||obj?.payment_status||'').toUpperCase();
}
async function finalizePayment(p, obj) {
  if(!p) return;
  const status=providerStatus(obj);
  if(status==='SUCCEEDED') {
    if(p.status==='PAID') return;
    p.status='PAID'; p.providerRawStatus=status; p.providerRaw=obj; p.paidAt=new Date(); await p.save();
    const o=await Order.findById(p.orderId);
    if(o && o.status!=='PAID') {
      o.status='PAID'; o.paidAt=new Date(); await o.save();
      if(o.customerId) await Customer.findByIdAndUpdate(o.customerId,{$inc:{totalOrders:1,totalSpent:o.total},$set:{lastOrderAt:new Date()}});
    }
  } else if(['FAILED','EXPIRED','CANCELLED'].includes(status) && p.status!=='PAID') {
    p.status=status==='CANCELLED'?'CANCELLED':'FAILED'; p.providerRawStatus=status; p.providerRaw=obj; await p.save();
    await Order.findByIdAndUpdate(p.orderId,{$set:{status:p.status}});
  } else if(status==='PROCESSING' && p.status!=='PAID') {
    p.status='PROCESSING'; p.providerRawStatus=status; p.providerRaw=obj; await p.save();
    await Order.findByIdAndUpdate(p.orderId,{$set:{status:'PAYMENT_PROCESSING'}});
  }
}

app.get('/api/health',(req,res)=>res.json({
  success:true,service:'Honey Pay',version:'3.4.0',
  status:'ok',database:mongoose.connection.readyState===1?'connected':'disconnected',
  bitpayConfigured:Boolean(BITPAY_SECRET_KEY),webhookConfigured:Boolean(BITPAY_WEBHOOK_SECRET),
  feeBps:HONEY_PAY_FEE_BPS,feePercent:HONEY_PAY_FEE_BPS/100
}));

/* Webhook must be before frontend fallback; raw body is preserved above. */
app.post('/api/webhooks/bitpay',ah(async(req,res)=>{
  if(!BITPAY_WEBHOOK_SECRET) return res.status(503).json({success:false,error:'Webhook secret não configurado.'});
  if(!verifyBitPay(req.rawBody,req.headers['bitpay-signature'])) return res.status(401).json({success:false,error:'Assinatura BitPay inválida.'});

  const body=req.body||{}; const eventId=clean(body.event_id||body.id||body.data?.event_id||body.data?.id,200);
  const type=clean(body.type||body.event_type||body.data?.type,100);
  if(!eventId) return res.status(400).json({success:false,error:'event_id ausente.'});

  const existing=await WebhookEvent.findOne({eventId});
  if(existing) return res.json({success:true,duplicate:true});

  await WebhookEvent.create({eventId,type,payload:body,status:'RECEIVED'});
  try {
    const obj=providerObject(body);
    const providerId=clean(obj?.id||obj?.payment_intent||obj?.payment_intent_id||obj?.payment?.id,200);
    const reference=clean(obj?.merchant_reference||obj?.reference||obj?.metadata?.order_reference,200);
    let p=providerId?await Payment.findOne({providerPaymentId:providerId}):null;
    if(!p && reference) p=await Payment.findOne({reference});
    if(p) await finalizePayment(p,obj);
    await WebhookEvent.updateOne({eventId},{$set:{status:'PROCESSED',processedAt:new Date()}});
    return res.json({success:true,processed:Boolean(p),eventId});
  } catch(e) {
    await WebhookEvent.updateOne({eventId},{$set:{status:'FAILED',error:e.message}});
    throw e;
  }
}));

app.get('/api/auth/google',(req,res)=>{
  if(!GOOGLE_CLIENT_ID||!GOOGLE_CLIENT_SECRET) return res.status(503).send('Google OAuth não está configurado.');
  res.redirect(googleUrl());
});
app.get('/api/auth/google/callback',ah(async(req,res)=>{
  if(req.query.error) return res.redirect('/login?error=google_cancelled');
  if(!req.query.code) return res.redirect('/login?error=missing_code');
  if(!validState(req.query.state)) return res.redirect('/login?error=invalid_state');
  try {
    const t=await googleToken(req.query.code); const g=await googleUser(t.access_token);
    const em=email(g.email); if(!em || g.email_verified===false) throw new Error('Conta Google sem email verificado.');
    let u=await User.findOne({$or:[{googleId:g.sub},{email:em}]});
    if(!u) u=await User.create({name:clean(g.name||em.split('@')[0],150),email:em,googleId:g.sub,avatar:g.picture||'',lastLoginAt:new Date()});
    else {u.name=clean(g.name||u.name,150);u.email=em;u.googleId=g.sub;u.avatar=g.picture||u.avatar||'';u.lastLoginAt=new Date();await u.save();}
    if(!u.active) return res.redirect('/login?error=account_disabled');
    let m=await Merchant.findOne({userId:u._id});
    if(!m) await Merchant.create({userId:u._id,businessName:clean(g.name||em.split('@')[0],150),country:'AO',currency:'AOA',provider:'bitpay'});
    setCookie(res,'honey_pay_token',jwtFor(u),30*24*60*60); res.redirect('/');
  } catch(e) { console.error('Google OAuth:',e); res.redirect('/login?error=google_auth_failed'); }
}));
app.get('/api/auth/status',ah(async(req,res)=>{
  try { const t=authToken(req); if(!t) return res.json({success:true,authenticated:false});
    const p=jwt.verify(t,JWT_SECRET),u=await User.findById(p.sub).lean();
    if(!u?.active) return res.json({success:true,authenticated:false});
    res.json({success:true,authenticated:true,user:{id:String(u._id),name:u.name,email:u.email,avatar:u.avatar||'',role:u.role}});
  } catch { res.json({success:true,authenticated:false}); }
}));
app.post('/api/auth/logout',(req,res)=>{setCookie(res,'honey_pay_token','',0);res.json({success:true});});
app.get('/api/me',authenticate,ah(async(req,res)=>{
  const u=await User.findById(req.userId).lean(),m=await Merchant.findOne({userId:req.userId}).lean();
  if(!u?.active||!m) return res.status(401).json({success:false,error:'Conta inválida.'});
  res.json({success:true,user:{id:String(u._id),name:u.name,email:u.email,avatar:u.avatar||'',role:u.role},
    merchant:{id:String(m._id),businessName:m.businessName,phone:m.phone,nif:m.nif,address:m.address,city:m.city,country:m.country,currency:m.currency,provider:m.provider,active:m.active}});
}));

app.get('/api/dashboard',authenticate,merchant,ah(async(req,res)=>{
  const m=req.merchantId;
  const [orders,paid,pending,customers,products,links]=await Promise.all([
    Order.countDocuments({merchantId:m}),Order.countDocuments({merchantId:m,status:'PAID'}),
    Order.countDocuments({merchantId:m,status:'PENDING'}),Customer.countDocuments({merchantId:m}),
    Product.countDocuments({merchantId:m,active:true}),PaymentLink.countDocuments({merchantId:m,active:true})
  ]);
  const [x]=await Payment.aggregate([{$match:{merchantId:m,status:'PAID'}},{$group:{_id:null,total:{$sum:'$amount'},fees:{$sum:'$feeAmount'},net:{$sum:'$netAmount'}}}]);
  res.json({success:true,dashboard:{totalOrders:orders,paidOrders:paid,pendingOrders:pending,totalCustomers:customers,totalProducts:products,totalLinks:links,totalRevenue:x?.total||0,totalFees:x?.fees||0,netRevenue:x?.net||0,currency:'AOA'}});
}));
app.patch('/api/merchant',authenticate,merchant,ah(async(req,res)=>{
  const update={}; for(const k of ['businessName','phone','nif','address','city']) if(req.body[k]!==undefined) update[k]=clean(req.body[k]);
  const m=await Merchant.findByIdAndUpdate(req.merchantId,{$set:update},{new:true}).lean(); res.json({success:true,merchant:m});
}));

app.get('/api/products',authenticate,merchant,ah(async(req,res)=>res.json({success:true,products:await Product.find({merchantId:req.merchantId}).sort({createdAt:-1}).lean()})));
app.post('/api/products',authenticate,merchant,ah(async(req,res)=>{
  const name=clean(req.body.name,150), price=Math.round(Number(req.body.price));
  if(!name||!Number.isFinite(price)||price<=0) return res.status(400).json({success:false,error:'Nome e preço válidos são obrigatórios.'});
  const stock=req.body.stock===''||req.body.stock===undefined||req.body.stock===null?null:Number(req.body.stock);
  const p=await Product.create({merchantId:req.merchantId,name,description:clean(req.body.description,2000),sku:clean(req.body.sku,100),price,currency:'AOA',image:clean(req.body.image,1000),stock:Number.isFinite(stock)?stock:null});
  res.status(201).json({success:true,product:p});
}));
app.patch('/api/products/:id',authenticate,merchant,ah(async(req,res)=>{
  if(!oid(req.params.id)) return res.status(400).json({success:false,error:'Produto inválido.'});
  const u={}; for(const k of ['name','description','sku','image','active']) if(req.body[k]!==undefined) u[k]=k==='active'?Boolean(req.body[k]):clean(req.body[k],2000);
  if(req.body.price!==undefined) u.price=Math.round(Number(req.body.price));
  if(req.body.stock!==undefined) u.stock=req.body.stock===''||req.body.stock===null?null:Number(req.body.stock);
  const p=await Product.findOneAndUpdate({_id:req.params.id,merchantId:req.merchantId},{$set:u},{new:true}).lean();
  if(!p) return res.status(404).json({success:false,error:'Produto não encontrado.'}); res.json({success:true,product:p});
}));
app.delete('/api/products/:id',authenticate,merchant,ah(async(req,res)=>{
  if(!oid(req.params.id)) return res.status(400).json({success:false,error:'Produto inválido.'});
  const p=await Product.findOneAndUpdate({_id:req.params.id,merchantId:req.merchantId},{$set:{active:false}},{new:true});
  if(!p) return res.status(404).json({success:false,error:'Produto não encontrado.'}); res.json({success:true});
}));

app.get('/api/customers',authenticate,merchant,ah(async(req,res)=>res.json({success:true,customers:await Customer.find({merchantId:req.merchantId}).sort({createdAt:-1}).lean()})));
app.post('/api/customers',authenticate,merchant,ah(async(req,res)=>{
  const n=clean(req.body.name,150); if(!n) return res.status(400).json({success:false,error:'Nome do cliente é obrigatório.'});
  const c=await Customer.create({merchantId:req.merchantId,name:n,email:email(req.body.email),phone:clean(req.body.phone,40),notes:clean(req.body.notes,1000)});
  res.status(201).json({success:true,customer:c});
}));

app.get('/api/orders',authenticate,merchant,ah(async(req,res)=>res.json({success:true,orders:await Order.find({merchantId:req.merchantId}).sort({createdAt:-1}).limit(500).lean()})));
app.get('/api/payments',authenticate,merchant,ah(async(req,res)=>res.json({success:true,payments:await Payment.find({merchantId:req.merchantId}).sort({createdAt:-1}).limit(500).lean()})));

app.get('/api/payment-links',authenticate,merchant,ah(async(req,res)=>res.json({success:true,links:await PaymentLink.find({merchantId:req.merchantId}).sort({createdAt:-1}).lean()})));
app.post('/api/payment-links',authenticate,merchant,ah(async(req,res)=>{
  let amount=Math.round(Number(req.body.amount)); let productId=null; let quantity=Math.max(1,Math.floor(Number(req.body.quantity||1)));
  if(req.body.productId && oid(req.body.productId)) {
    const p=await Product.findOne({_id:req.body.productId,merchantId:req.merchantId,active:true});
    if(!p) return res.status(404).json({success:false,error:'Produto não encontrado.'});
    productId=p._id; amount=p.price*quantity;
  }
  const title=clean(req.body.title,150);
  if(!title||!Number.isFinite(amount)||amount<=0) return res.status(400).json({success:false,error:'Título e valor válidos são obrigatórios.'});
  const l=await PaymentLink.create({merchantId:req.merchantId,token:token(),title,description:clean(req.body.description,2000),productId,quantity,amount,currency:'AOA'});
  res.status(201).json({success:true,link:l,url:`${APP_BASE_URL}/pay/${l.token}`});
}));
app.patch('/api/payment-links/:id',authenticate,merchant,ah(async(req,res)=>{
  if(!oid(req.params.id)) return res.status(400).json({success:false,error:'Link inválido.'});
  const u={}; for(const k of ['title','description','active']) if(req.body[k]!==undefined) u[k]=k==='active'?Boolean(req.body[k]):clean(req.body[k],2000);
  const l=await PaymentLink.findOneAndUpdate({_id:req.params.id,merchantId:req.merchantId},{$set:u},{new:true}).lean();
  if(!l) return res.status(404).json({success:false,error:'Link não encontrado.'}); res.json({success:true,link:l,url:`${APP_BASE_URL}/pay/${l.token}`});
}));
app.delete('/api/payment-links/:id',authenticate,merchant,ah(async(req,res)=>{
  if(!oid(req.params.id)) return res.status(400).json({success:false,error:'Link inválido.'});
  const l=await PaymentLink.findOneAndUpdate({_id:req.params.id,merchantId:req.merchantId},{$set:{active:false}},{new:true});
  if(!l) return res.status(404).json({success:false,error:'Link não encontrado.'}); res.json({success:true});
}));

async function createPaymentForOrder({order,paymentMethod,mobile}) {
  const existing=await Payment.findOne({orderId:order._id,status:{$in:['PENDING','PROCESSING']}}); if(existing) return existing;
  if(paymentMethod==='multicaixa_express' && !/^\d{9}$/.test(String(mobile||''))) {
    const e=new Error('Para Multicaixa Express, informe um número de telemóvel com 9 dígitos.'); e.status=400; throw e;
  }
  const reference=order.reference||ref(); order.reference=reference; order.status='PAYMENT_PROCESSING'; await order.save();
  const payload={amount:Math.round(order.total),currency:'AOA',payment_method:paymentMethod,
    merchant_reference:reference,metadata:{honey_pay:'true',order_id:String(order._id),order_reference:reference,merchant_id:String(order.merchantId)}};
  if(paymentMethod==='multicaixa_express') payload.customer={mobile:String(mobile)};
  const bp=await bitpayRequest('/payment_intents',{method:'POST',headers:{'Idempotency-Key':reference},body:payload});
  const id=bp.id||bp.payment_intent||'';
  if(!id) throw new Error('BitPay não devolveu o ID do pagamento.');
  return Payment.create({merchantId:order.merchantId,orderId:order._id,customerId:order.customerId,reference,provider:'bitpay',
    providerPaymentId:id,paymentMethod,amount:order.total,feeAmount:fee(order.total),netAmount:net(order.total),currency:'AOA',
    status:['SUCCEEDED','PAID'].includes(String(bp.status||'').toUpperCase())?'PAID':'PENDING',providerRawStatus:bp.status||'PENDING',providerRaw:bp});
}

app.post('/api/payments/create',authenticate,merchant,ah(async(req,res)=>{
  const orderId=clean(req.body.orderId,100); if(!oid(orderId)) return res.status(400).json({success:false,error:'Pedido inválido.'});
  const o=await Order.findOne({_id:orderId,merchantId:req.merchantId}); if(!o) return res.status(404).json({success:false,error:'Pedido não encontrado.'});
  if(o.status==='PAID') return res.status(409).json({success:false,error:'Este pedido já foi pago.'});
  const p=await createPaymentForOrder({order:o,paymentMethod:clean(req.body.paymentMethod||'multicaixa_express',50),mobile:clean(req.body.mobile,20)});
  res.status(201).json({success:true,payment:p,honeyPayFee:{bps:HONEY_PAY_FEE_BPS,percent:HONEY_PAY_FEE_BPS/100,amount:p.feeAmount},bitpay:p.providerRaw});
}));

app.post('/api/public/payment-links/:token/pay',ah(async(req,res)=>{
  const l=await PaymentLink.findOne({token:req.params.token,active:true}); if(!l) return res.status(404).json({success:false,error:'Link de pagamento não encontrado.'});
  if(l.expiresAt && new Date(l.expiresAt).getTime()<Date.now()) return res.status(410).json({success:false,error:'Este link expirou.'});
  const method=clean(req.body.paymentMethod||'multicaixa_express',50);
  if(!['multicaixa_express','multicaixa_reference'].includes(method)) return res.status(400).json({success:false,error:'Método de pagamento inválido.'});
  const customerName=clean(req.body.customerName,150), customerEmail=email(req.body.customerEmail), customerMobile=clean(req.body.customerMobile,20);
  if(!customerName) return res.status(400).json({success:false,error:'Nome do cliente é obrigatório.'});
  let c=null;
  if(customerEmail||customerMobile) c=await Customer.findOneAndUpdate({merchantId:l.merchantId,$or:[...(customerEmail?[{email:customerEmail}]:[]),...(customerMobile?[{phone:customerMobile}]:[])]},
    {$set:{name:customerName,email:customerEmail,phone:customerMobile}},{upsert:false,new:true});
  if(!c) c=await Customer.create({merchantId:l.merchantId,name:customerName,email:customerEmail,phone:customerMobile});
  const item={productId:l.productId||null,name:l.title,quantity:l.quantity||1,unitPrice:Math.round(l.amount/(l.quantity||1)),total:l.amount};
  const o=await Order.create({merchantId:l.merchantId,customerId:c._id,linkId:l._id,reference:ref(),items:[item],subtotal:l.amount,total:l.amount,currency:'AOA',
    status:'PENDING',customerSnapshot:{name:customerName,email:customerEmail,phone:customerMobile}});
  try {
    const p=await createPaymentForOrder({order:o,paymentMethod:method,mobile:customerMobile});
    res.status(201).json({success:true,payment:{id:String(p._id),providerPaymentId:p.providerPaymentId,reference:p.reference,amount:p.amount,currency:p.currency,status:p.status,paymentMethod:p.paymentMethod,feeAmount:p.feeAmount,netAmount:p.netAmount,provider:p.provider},bitpay:p.providerRaw});
  } catch(e) {
    await Order.findByIdAndUpdate(o._id,{$set:{status:'FAILED'}}); throw e;
  }
}));

app.get('/api/public/payments/:id',ah(async(req,res)=>{
  const p=await Payment.findOne({_id:req.params.id}).lean();
  if(!p) return res.status(404).json({success:false,error:'Pagamento não encontrado.'});
  res.json({success:true,payment:{id:String(p._id),providerPaymentId:p.providerPaymentId,reference:p.reference,amount:p.amount,currency:p.currency,status:p.status,paymentMethod:p.paymentMethod,paidAt:p.paidAt}});
}));

/* Optional native BitPay Pay by Link / QR endpoints. */
app.post('/api/payment-links/:id/bitpay-link',authenticate,merchant,ah(async(req,res)=>{
  const l=await PaymentLink.findOne({_id:req.params.id,merchantId:req.merchantId,active:true}); if(!l) return res.status(404).json({success:false,error:'Link não encontrado.'});
  const bp=await bitpayRequest('/payment_links',{method:'POST',body:{amount:l.amount,description:l.title}});
  l.bitpayLinkId=bp.id||bp.code||''; l.bitpayUrl=bp.url||''; await l.save();
  res.json({success:true,bitpay:bp,link:l});
}));
app.get('/api/payment-links/:id/qr',authenticate,merchant,ah(async(req,res)=>{
  const l=await PaymentLink.findOne({_id:req.params.id,merchantId:req.merchantId,active:true}); if(!l) return res.status(404).send('Link não encontrado.');
  if(!l.bitpayLinkId) return res.status(409).json({success:false,error:'Crie primeiro o Pay by Link BitPay.'});
  if(!BITPAY_SECRET_KEY) return res.status(503).json({success:false,error:'BitPay não configurado.'});
  const r=await fetch(`${BITPAY_BASE_URL}/payment_links/${encodeURIComponent(l.bitpayLinkId)}/qr`,{headers:{Authorization:`Bearer ${BITPAY_SECRET_KEY}`}});
  if(!r.ok) return res.status(r.status).send(await r.text());
  res.set('Content-Type',r.headers.get('content-type')||'image/svg+xml'); res.send(Buffer.from(await r.arrayBuffer()));
}));

app.get('/api/reports',authenticate,merchant,ah(async(req,res)=>{
  const [payments,orders]=await Promise.all([
    Payment.aggregate([{$match:{merchantId:req.merchantId}},{$group:{_id:'$status',count:{$sum:1},amount:{$sum:'$amount'},fees:{$sum:'$feeAmount'},net:{$sum:'$netAmount'}}}]),
    Order.aggregate([{$match:{merchantId:req.merchantId}},{$group:{_id:'$status',count:{$sum:1},amount:{$sum:'$total'}}}])
  ]);
  res.json({success:true,reports:{payments,orders,currency:'AOA',honeyPayFeeBps:HONEY_PAY_FEE_BPS,honeyPayFeePercent:HONEY_PAY_FEE_BPS/100}});
}));
app.get('/api/bitpay/status',authenticate,merchant,(req,res)=>res.json({success:true,configured:Boolean(BITPAY_SECRET_KEY),webhookConfigured:Boolean(BITPAY_WEBHOOK_SECRET),baseUrl:BITPAY_BASE_URL,webhookUrl:BITPAY_WEBHOOK_URL,feeBps:HONEY_PAY_FEE_BPS,feePercent:HONEY_PAY_FEE_BPS/100,multiMerchant:BITPAY_MULTI_MERCHANT_ENABLED}));

app.get('/api/public/payment-links/:token',ah(async(req,res)=>{
  const l=await PaymentLink.findOne({token:req.params.token,active:true}).lean();
  if(!l) return res.status(404).json({success:false,error:'Link de pagamento não encontrado.'});
  if(l.expiresAt && new Date(l.expiresAt).getTime()<Date.now()) return res.status(410).json({success:false,error:'Este link expirou.'});
  const m=await Merchant.findById(l.merchantId).lean();
  res.json({success:true,link:{id:String(l._id),token:l.token,title:l.title,description:l.description,amount:l.amount,currency:l.currency,quantity:l.quantity||1,productId:l.productId?String(l.productId):null},merchant:m?{id:String(m._id),businessName:m.businessName,phone:m.phone,currency:m.currency}:null});
}));

app.get('/pay/:token',(req,res)=>{
  if(fs.existsSync(CHECKOUT_FILE)) return res.sendFile(CHECKOUT_FILE);
  res.status(404).send('Checkout não configurado.');
});

app.use(express.static(PUBLIC_DIR,{index:false,maxAge:NODE_ENV==='production'?'1h':0}));

app.get('/login',(req,res)=>{
  const e=clean(req.query.error,50);
  const messages={google_cancelled:'O login Google foi cancelado.',google_auth_failed:'Não foi possível concluir o login Google.',invalid_state:'A sessão de autenticação expirou. Tente novamente.',account_disabled:'Esta conta está desativada.',missing_code:'Código Google em falta.'};
  res.type('html').send(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Honey Pay — Entrar</title>
  <style>body{margin:0;background:#080808;color:#fff;font-family:Inter,system-ui;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:430px;width:100%;padding:36px;border:1px solid #292929;border-radius:24px;background:#111}h1{margin:0 0 10px}.muted{color:#999;line-height:1.6}.btn{display:block;text-align:center;background:#fff;color:#111;padding:15px;border-radius:14px;text-decoration:none;font-weight:800;margin-top:24px}.err{padding:12px;border-radius:12px;background:#351818;color:#ffb0b0;margin:18px 0}</style></head><body><main class="card"><div style="font-size:30px;font-weight:900;background:#f5c542;color:#111;width:52px;height:52px;border-radius:15px;display:grid;place-items:center">H</div><h1>Bem-vindo ao Honey Pay</h1><p class="muted">Crie cobranças, links e receba pagamentos através da infraestrutura BitPay Angola.</p>${e?`<div class="err">${messages[e]||'Não foi possível iniciar sessão.'}</div>`:''}<a class="btn" href="/api/auth/google">Continuar com Google</a></main></body></html>`);
});

for(const r of ['/','/dashboard','/merchant','/payments','/orders','/customers','/products','/payment-links','/reports','/settings'])
  app.get(r,(req,res)=>res.sendFile(INDEX_FILE));

app.use('/api',(req,res)=>res.status(404).json({success:false,error:'API_ROUTE_NOT_FOUND',path:req.originalUrl}));
app.use((req,res)=>res.status(404).send('Página não encontrada.'));
app.use((err,req,res,next)=>{console.error('SERVER ERROR:',err);if(res.headersSent)return next(err);res.status(err.status||500).json({success:false,error:NODE_ENV==='production'?'Erro interno do servidor.':err.message});});

mongoose.connect(MONGODB_URI).then(()=>app.listen(PORT,()=>{
  console.log('============================================================');
  console.log('HONEY PAY V3.4.0');
  console.log('============================================================');
  console.log(`Servidor: ${APP_BASE_URL}`);
  console.log(`Google Callback: ${GOOGLE_CALLBACK_URL}`);
  console.log(`BitPay: ${BITPAY_BASE_URL}`);
  console.log(`BitPay Webhook: ${BITPAY_WEBHOOK_URL}`);
  console.log(`Honey Pay fee: ${HONEY_PAY_FEE_BPS} bps (${HONEY_PAY_FEE_BPS/100}%)`);
  console.log(`Multi-merchant BitPay: ${BITPAY_MULTI_MERCHANT_ENABLED?'ENABLED':'DISABLED'}`);
  console.log(`Webhook secret: ${BITPAY_WEBHOOK_SECRET?'CONFIGURED':'NOT CONFIGURED'}`);
})).catch(e=>{console.error('Falha MongoDB:',e);process.exit(1);});

module.exports=app;
