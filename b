<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RoomSync – Choose Role</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d1a;
      min-height:100vh;display:flex;align-items:center;justify-content:center;
      position:relative;overflow:hidden;}
    body::before{content:'';position:fixed;top:-20%;left:-10%;width:50%;height:70%;
      background:radial-gradient(ellipse,rgba(120,0,30,.55) 0%,transparent 70%);pointer-events:none;}
    body::after{content:'';position:fixed;bottom:-20%;right:-10%;width:50%;height:70%;
      background:radial-gradient(ellipse,rgba(10,20,80,.6) 0%,transparent 70%);pointer-events:none;}

    .wrap{position:relative;z-index:10;text-align:center;padding:20px;width:100%;max-width:500px;}

    .logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;}
    .logo-row svg{animation:float 4s ease-in-out infinite;}
    @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
    h1{font-size:42px;font-weight:900;
      background:linear-gradient(135deg,#FF4444,#FF8C00);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .sub{color:#8888aa;font-size:14px;margin-bottom:32px;}

    .card{background:rgba(22,22,40,.9);border:1px solid rgba(255,255,255,.07);
      border-radius:22px;padding:38px 40px;backdrop-filter:blur(12px);
      box-shadow:0 20px 60px rgba(0,0,0,.5);}

    .role-label{color:#8888aa;font-size:12px;font-weight:600;letter-spacing:2px;
      text-transform:uppercase;margin-bottom:24px;}

    .role-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;}

    .btn-role{
      padding:16px 44px;border:none;border-radius:50px;
      font-size:16px;font-weight:700;cursor:pointer;
      transition:transform .2s,box-shadow .2s,opacity .2s;
      min-width:140px;
    }
    .btn-customer{
      background:linear-gradient(135deg,#FF4444,#E53E3E);
      color:#fff;
      box-shadow:0 6px 24px rgba(255,68,68,.45);
    }
    .btn-seller{
      background:linear-gradient(135deg,#FF8C00,#F97316);
      color:#fff;
      box-shadow:0 6px 24px rgba(255,140,0,.45);
    }
    .btn-role:hover{transform:translateY(-3px) scale(1.04);}
    .btn-role:active{transform:scale(.97);}
    .btn-role:disabled{opacity:.5;cursor:not-allowed;transform:none;}

    .msg{padding:10px 14px;border-radius:8px;font-size:13px;
      margin-bottom:16px;
      background:rgba(255,68,68,.15);color:#ff6b6b;border:1px solid rgba(255,68,68,.3);}

    .greeting{color:#ccc;font-size:14px;margin-bottom:4px;}

    .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px;}
    @keyframes spin{to{transform:rotate(360deg);}}

    .dot{animation:blink 2s ease-in-out infinite;}
    .dot:nth-child(1){animation-delay:0s;}.dot:nth-child(2){animation-delay:.4s;}
    .dot:nth-child(3){animation-delay:.8s;}.dot:nth-child(4){animation-delay:1.2s;}
    .dot:nth-child(5){animation-delay:1.6s;}
    @keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="logo-row">
    <svg width="60" height="44" viewBox="0 0 160 110" fill="none">
      <line x1="80" y1="55" x2="30"  y2="25"  stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <line x1="80" y1="55" x2="135" y2="20"  stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <line x1="80" y1="55" x2="145" y2="70"  stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <line x1="80" y1="55" x2="50"  y2="85"  stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <line x1="80" y1="55" x2="15"  y2="65"  stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <circle cx="80"  cy="55" r="8" fill="rgba(255,80,80,.3)"/>
      <circle cx="80"  cy="55" r="6" fill="#FF4444"/>
      <circle class="dot" cx="30"  cy="25" r="5" fill="#FFD700"/>
      <circle class="dot" cx="135" cy="20" r="4" fill="#A78BFA"/>
      <circle class="dot" cx="145" cy="70" r="5" fill="#60A5FA"/>
      <circle class="dot" cx="50"  cy="85" r="4" fill="#34D399"/>
      <circle class="dot" cx="15"  cy="65" r="4" fill="#F472B6"/>
    </svg>
    <h1>RoomSync</h1>
  </div>
  <p class="sub">Sync your room with your Buddy!</p>

  <div class="card">
    <p class="greeting" id="greeting"></p>
    <p class="role-label" style="margin-top:8px">Choose Your Role</p>
    <div id="alertBox"></div>
    <div class="role-btns">
      <button class="btn-role btn-customer" id="btnCustomer" onclick="selectRole('customer')">Customer</button>
      <button class="btn-role btn-seller"   id="btnSeller"   onclick="selectRole('seller')">Seller</button>
    </div>
  </div>
</div>

<script>
  const API = 'http://localhost:3000/api';

  // Guard – must be logged in
  const token = localStorage.getItem('rs_token');
  const user  = JSON.parse(localStorage.getItem('rs_user') || 'null');
  if(!token || !user){ window.location.href = 'signin.html'; }

  // Greet user
  document.getElementById('greeting').textContent = `Welcome, ${user.fullName}! 👋`;

  async function selectRole(role){
    const btn = role === 'customer'
      ? document.getElementById('btnCustomer')
      : document.getElementById('btnSeller');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Setting up…`;

    try{
      const r = await fetch(`${API}/auth/set-role`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({userId: user.id, role})
      });
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);

      // Update local storage
      user.role = role;
      localStorage.setItem('rs_user', JSON.stringify(user));

      window.location.href = role === 'seller' ? 'seller.html' : 'customer.html';
    }catch(e){
      document.getElementById('alertBox').innerHTML =
        `<div class="msg">${e.message}</div>`;
      btn.disabled = false;
      btn.textContent = role === 'customer' ? 'Customer' : 'Seller';
    }
  }
</script>
</body>
</html>