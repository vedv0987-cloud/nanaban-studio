import { useState, useEffect } from "react";

const GOOGLE_CLIENT_ID = "253401165308-q00hl4ungj7gsf5nt1iklh0mvs4v73a8.apps.googleusercontent.com";

const SIZES = [
  { label:"1:1",  w:1024, h:1024, use:"Instagram Square", api:"1:1"  },
  { label:"4:5",  w:896,  h:1120, use:"Instagram Feed",   api:"4:5"  },
  { label:"9:16", w:768,  h:1344, use:"Stories / Reels",  api:"9:16" },
  { label:"16:9", w:1344, h:768,  use:"YouTube/LinkedIn", api:"16:9" },
  { label:"3:4",  w:864,  h:1152, use:"Portrait Print",   api:"3:4"  },
  { label:"4:3",  w:1152, h:864,  use:"Presentation",     api:"4:3"  },
];

const STYLES = ["Cinematic","Photorealistic","Luxury Editorial","Architectural Viz","Lifestyle","Product Shot","Golden Hour","Minimal Clean"];

function parseToken() {
  const p = new URLSearchParams(window.location.hash.substring(1));
  return p.get("access_token") || null;
}
async function fetchProfile(token) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo",
    { headers:{ Authorization:`Bearer ${token}` } });
  return r.json();
}
function doGoogleRedirect() {
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin + window.location.pathname,
    response_type:"token", scope:"email profile openid", prompt:"select_account",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// ── Calls the Vercel proxy → Imagen 3 Fast ─────────────────
async function generateImage(apiKey, prompt, style, negPrompt, aspectRatio) {
  const fullPrompt = `${style} photography style. ${prompt}. High quality, detailed, professional.`;
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      negPrompt,
      aspectRatio,
      apiKey,          // forwarded to proxy; proxy uses GEMINI_API_KEY env var as fallback
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error || "Generation failed";
    if (msg.includes("quota") || msg.includes("QUOTA")) throw new Error("Quota exceeded — wait 1 min (free: 15/min, 1500/day)");
    if (msg.includes("API_KEY") || msg.includes("key not valid")) throw new Error("Invalid API key — check aistudio.google.com");
    if (msg.includes("billing")) throw new Error("Billing required for this model — switch to free tier Imagen 3 Fast");
    throw new Error(msg);
  }
  return data.image;
}

export default function App() {
  const [user,       setUser]       = useState(null);
  const [appReady,   setAppReady]   = useState(false);
  const [signingIn,  setSigningIn]  = useState(false);
  const [apiKey,     setApiKey]     = useState(() => { try { return localStorage.getItem("nb_gemini_key")||""; } catch { return ""; } });
  const [showKey,    setShowKey]    = useState(false);
  const [size,       setSize]       = useState("1:1");
  const [style,      setStyle]      = useState("Cinematic");
  const [prompt,     setPrompt]     = useState("");
  const [negPrompt,  setNegPrompt]  = useState("AI artifacts, plastic skin, oversaturation, watermark, blurry");
  const [generating, setGenerating] = useState(false);
  const [imgSrc,     setImgSrc]     = useState(null);
  const [error,      setError]      = useState(null);
  const [tab,        setTab]        = useState("generate");
  const [history,    setHistory]    = useState([]);

  useEffect(() => {
    const token = parseToken();
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchProfile(token)
        .then(p => {
          setUser({ name:p.name, email:p.email, picture:p.picture,
            initials:(p.name||"U").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() });
          setAppReady(true);
        }).catch(()=>setAppReady(true));
    } else { setAppReady(true); }
  }, []);

  const saveKey = k => { setApiKey(k); try { localStorage.setItem("nb_gemini_key",k); } catch {} };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!apiKey.trim()) { setError("Paste your free Gemini API key — aistudio.google.com/app/apikey"); return; }
    setGenerating(true); setError(null); setImgSrc(null);
    const cs = SIZES.find(s=>s.label===size);
    try {
      const src = await generateImage(apiKey, prompt, style, negPrompt, cs.api);
      setImgSrc(src);
      setHistory(prev=>[{ id:Date.now(), prompt:prompt.slice(0,60)+(prompt.length>60?"...":""), size, style, src, time:new Date().toLocaleTimeString() }, ...prev.slice(0,15)]);
    } catch(e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const handleDownload = () => {
    if (!imgSrc) return;
    const a = document.createElement("a"); a.href=imgSrc; a.download=`nanaban-${Date.now()}.png`; a.click();
  };

  const cs = SIZES.find(s=>s.label===size);
  const maxD=460, sc=Math.min(maxD/cs.w,maxD/cs.h);
  const dw=Math.round(cs.w*sc), dh=Math.round(cs.h*sc);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.08) translate(10px,-10px)}}
    @keyframes cardIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes imgIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    @keyframes progbar{from{width:0%}to{width:88%}}
    .orb{position:absolute;border-radius:50%;pointer-events:none;}
    .card{position:relative;z-index:10;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:46px 42px;width:440px;backdrop-filter:blur(20px);box-shadow:0 28px 72px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);animation:cardIn .7s cubic-bezier(.16,1,.3,1) both;font-family:'DM Sans',sans-serif;}
    .gbtn{width:100%;padding:14px;background:#fff;border:none;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:11px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(0,0,0,.3);}
    .gbtn:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(0,0,0,.4);}
    .gbtn:disabled{opacity:.55;cursor:not-allowed;transform:none;}
    .gspin{width:18px;height:18px;border:2.5px solid rgba(26,26,26,.15);border-top-color:#1a1a1a;border-radius:50%;animation:spin .7s linear infinite;}
    .navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,8,10,.94);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;}
    .logo-mark{width:32px;height:32px;background:linear-gradient(135deg,#F9AB00,#E37400);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 10px rgba(249,171,0,.28);}
    .ntabs{display:flex;gap:3px;background:rgba(255,255,255,.04);padding:3px;border-radius:9px;border:1px solid rgba(255,255,255,.06);}
    .ntab{padding:5px 14px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.35);border:none;background:transparent;font-family:'DM Sans',sans-serif;}
    .ntab.on{background:rgba(255,255,255,.1);color:#fff;}
    .pill{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:40px;padding:4px 12px 4px 4px;}
    .av{width:28px;height:28px;border-radius:50%;object-fit:cover;}
    .av-txt{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#34A853);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;}
    .signout{padding:4px 9px;border-radius:6px;font-size:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-left:5px;}
    .signout:hover{color:rgba(255,255,255,.6);}
    .lpanel{width:355px;min-width:355px;background:rgba(255,255,255,.015);border-right:1px solid rgba(255,255,255,.05);overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:16px;}
    .slbl{font-size:10px;font-weight:600;color:rgba(255,255,255,.28);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px;}
    .key-wrap{background:rgba(66,133,244,.06);border:1px solid rgba(66,133,244,.14);border-radius:12px;padding:12px;}
    .key-row{display:flex;gap:7px;margin-top:8px;}
    .keyinput{flex:1;background:rgba(0,0,0,.3);border:1.5px solid rgba(255,255,255,.08);border-radius:9px;padding:9px 11px;color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;outline:none;transition:border-color .2s;}
    .keyinput::placeholder{color:rgba(255,255,255,.2);}
    .keyinput:focus{border-color:rgba(66,133,244,.4);}
    .tog{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.4);border-radius:7px;padding:6px 10px;cursor:pointer;font-size:11px;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .2s;}
    .tog:hover{color:rgba(255,255,255,.7);}
    .szgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
    .szbtn{border-radius:10px;padding:8px 4px;cursor:pointer;transition:all .18s;border:1.5px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;}
    .szbtn:hover{border-color:rgba(255,255,255,.11);}
    .szbtn.on{border-color:#F9AB00;background:rgba(249,171,0,.07);}
    .schips{display:flex;flex-wrap:wrap;gap:6px;}
    .schip{padding:5px 11px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;transition:all .18s;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);color:rgba(255,255,255,.4);}
    .schip:hover{color:rgba(255,255,255,.75);}
    .schip.on{background:rgba(249,171,0,.09);border-color:rgba(249,171,0,.28);color:#F9AB00;}
    .ptxt{width:100%;background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.07);border-radius:11px;padding:11px;color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;resize:none;outline:none;transition:border-color .2s;line-height:1.6;}
    .ptxt::placeholder{color:rgba(255,255,255,.2);}
    .ptxt:focus{border-color:rgba(249,171,0,.35);}
    .ebox{background:rgba(234,67,53,.07);border:1px solid rgba(234,67,53,.22);border-radius:10px;padding:11px 13px;font-size:12px;color:#f28b82;font-family:'DM Sans',sans-serif;line-height:1.5;animation:fadeUp .3s ease;}
    .ibox{background:rgba(66,133,244,.07);border:1px solid rgba(66,133,244,.18);border-radius:10px;padding:10px 13px;font-size:12px;color:rgba(66,133,244,.9);font-family:'DM Sans',sans-serif;line-height:1.5;}
    .ilink{color:#4285F4;text-decoration:none;border-bottom:1px solid rgba(66,133,244,.3);}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;}
    .genbtn{width:100%;padding:14px;border-radius:13px;border:none;cursor:pointer;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;transition:all .22s;display:flex;align-items:center;justify-content:center;gap:9px;}
    .genbtn.idle{background:linear-gradient(135deg,#F9AB00,#E37400);color:#000;box-shadow:0 7px 22px rgba(249,171,0,.24);}
    .genbtn.idle:hover{transform:translateY(-2px);box-shadow:0 11px 30px rgba(249,171,0,.36);}
    .genbtn.busy{background:rgba(249,171,0,.08);color:#F9AB00;border:1.5px solid rgba(249,171,0,.2);box-shadow:none;cursor:not-allowed;}
    .genbtn:disabled{opacity:.4;cursor:not-allowed;transform:none;}
    .spin{width:18px;height:18px;border:2px solid rgba(249,171,0,.18);border-top-color:#F9AB00;border-radius:50%;animation:spin .7s linear infinite;}
    .canvas{flex:1;display:flex;align-items:center;justify-content:center;padding:32px;}
    .imgbox{border-radius:16px;overflow:hidden;position:relative;background:rgba(255,255,255,.02);border:1.5px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;transition:all .3s;}
    .genimg{width:100%;height:100%;object-fit:contain;display:block;animation:imgIn .5s ease;}
    .overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(7,8,10,.78);backdrop-filter:blur(6px);border-radius:16px;}
    .big-spin{width:44px;height:44px;border:3px solid rgba(249,171,0,.15);border-top-color:#F9AB00;border-radius:50%;animation:spin .85s linear infinite;}
    .prog{width:140px;height:3px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;margin-top:16px;}
    .prog-bar{height:100%;background:linear-gradient(90deg,#F9AB00,#34A853);border-radius:99px;animation:progbar 20s ease-out forwards;}
    .metabar{padding:12px 22px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
    .mkey{font-size:9px;color:rgba(255,255,255,.24);letter-spacing:.5px;text-transform:uppercase;}
    .mval{font-size:12px;color:rgba(255,255,255,.58);font-weight:500;margin-top:2px;}
    .abtn{padding:7px 13px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;}
    .abtn.p{background:rgba(249,171,0,.12);border:1px solid rgba(249,171,0,.25);color:#F9AB00;}
    .abtn.s{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.45);}
    .abtn:hover{opacity:.78;transform:translateY(-1px);}
    .hpanel{flex:1;padding:22px 26px;overflow-y:auto;}
    .hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;}
    .hcard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;transition:all .2s;cursor:pointer;}
    .hcard:hover{border-color:rgba(255,255,255,.13);transform:translateY(-2px);}
    .hcard img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}
    .hcard-body{padding:9px;}
  `;

  if (!appReady) return (
    <div style={{minHeight:"100vh",background:"#060608",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center"}}><div style={{fontSize:38,marginBottom:14}}>🍌</div><div className="spin" style={{margin:"0 auto"}}/></div>
    </div>
  );

  if (!user) return (
    <div style={{minHeight:"100vh",background:"#060608",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      <div className="orb" style={{width:580,height:580,top:-180,left:-180,background:"radial-gradient(circle,rgba(249,171,0,.11) 0%,transparent 70%)",animation:"pulse 6s ease-in-out infinite"}}/>
      <div className="orb" style={{width:480,height:480,bottom:-140,right:-140,background:"radial-gradient(circle,rgba(52,168,83,.09) 0%,transparent 70%)",animation:"pulse 8s ease-in-out infinite reverse"}}/>
      <div className="card">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <div className="logo-mark">🍌</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#fff",letterSpacing:"-0.5px"}}>NanaBan Studio</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.33)",marginTop:1}}>Powered by Google Imagen 3 Fast</div>
          </div>
        </div>
        <div style={{display:"flex",gap:7,marginBottom:22,flexWrap:"wrap"}}>
          <span className="badge" style={{background:"rgba(52,168,83,.1)",color:"#34A853",border:"1px solid rgba(52,168,83,.2)"}}>✓ Free tier</span>
          <span className="badge" style={{background:"rgba(249,171,0,.1)",color:"#F9AB00",border:"1px solid rgba(249,171,0,.2)"}}>15 req/min</span>
          <span className="badge" style={{background:"rgba(66,133,244,.1)",color:"#4285F4",border:"1px solid rgba(66,133,244,.2)"}}>1500/day</span>
          <span className="badge" style={{background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.5)",border:"1px solid rgba(255,255,255,.08)"}}>No billing required</span>
        </div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:25,fontWeight:800,color:"#fff",lineHeight:1.22,marginBottom:10,letterSpacing:"-0.6px"}}>Real images. Zero cost.</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,.38)",marginBottom:28,lineHeight:1.65}}>Sign in with Google, then add your free Gemini API key. Imagen 3 Fast runs via a secure server proxy — no CORS, no billing required.</div>
        <button className="gbtn" onClick={()=>{setSigningIn(true);doGoogleRedirect();}} disabled={signingIn}>
          {signingIn?(<><div className="gspin"/>Redirecting...</>):(
            <><svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>Continue with Google</>
          )}
        </button>
        <div className="ibox" style={{marginTop:16}}>
          <strong>Step 2 after login:</strong> Get free Gemini API key →{" "}
          <a className="ilink" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com/app/apikey</a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#07080A",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      <nav className="navbar">
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="logo-mark">🍌</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff",letterSpacing:"-0.3px"}}>NanaBan Studio</div>
          <span className="badge" style={{background:"rgba(52,168,83,.1)",color:"#34A853",border:"1px solid rgba(52,168,83,.18)",marginLeft:4}}>Imagen 3 Fast</span>
        </div>
        <div className="ntabs">
          {[["generate","✦ Generate"],["history","◌ History"]].map(([id,lbl])=>(
            <button key={id} className={`ntab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center"}}>
          <div className="pill">
            {user.picture?<img className="av" src={user.picture} alt="" referrerPolicy="no-referrer"/>:<div className="av-txt">{user.initials}</div>}
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#fff",lineHeight:1.2}}>{user.name?.split(" ")[0]}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.32)"}}>{user.email}</div>
            </div>
          </div>
          <button className="signout" onClick={()=>setUser(null)}>Sign out</button>
        </div>
      </nav>

      {tab==="history"?(
        <div className="hpanel">
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff",letterSpacing:"-0.4px"}}>Generation History</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.28)",marginTop:4}}>{history.length} images this session</div>
          </div>
          {history.length===0?(
            <div style={{textAlign:"center",padding:"72px 40px",color:"rgba(255,255,255,.22)"}}>
              <div style={{fontSize:40,marginBottom:14,opacity:.35}}>🍌</div>
              <div style={{fontSize:14}}>No generations yet</div>
            </div>
          ):(
            <div className="hgrid">
              {history.map(h=>(
                <div key={h.id} className="hcard" onClick={()=>{setTab("generate");setPrompt(h.prompt);}}>
                  <img src={h.src} alt={h.prompt}/>
                  <div className="hcard-body">
                    <div style={{fontSize:11,color:"rgba(255,255,255,.55)",marginBottom:4,lineHeight:1.4}}>{h.prompt}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.26)"}}>{h.size} · {h.style} · {h.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ):(
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div className="lpanel">
            <div className="key-wrap">
              <div className="slbl" style={{marginBottom:4}}>Gemini API Key</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.38)",lineHeight:1.5}}>
                {apiKey
                  ?<span style={{color:"#34A853"}}>✓ Key saved — Imagen 3 Fast ready</span>
                  :<>Free key → <a className="ilink" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com/app/apikey</a></>}
              </div>
              <div className="key-row">
                <input className="keyinput" type={showKey?"text":"password"} placeholder="AIzaSy..." value={apiKey} onChange={e=>saveKey(e.target.value)}/>
                <button className="tog" onClick={()=>setShowKey(!showKey)}>{showKey?"Hide":"Show"}</button>
              </div>
            </div>

            <div>
              <div className="slbl">Aspect Ratio</div>
              <div className="szgrid">
                {SIZES.map(s=>(
                  <div key={s.label} className={`szbtn ${size===s.label?"on":""}`} onClick={()=>setSize(s.label)}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,color:"#fff"}}>{s.label}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.3)",lineHeight:1.2,textAlign:"center"}}>{s.use}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="slbl">Style Preset</div>
              <div className="schips">
                {STYLES.map(s=><div key={s} className={`schip ${style===s?"on":""}`} onClick={()=>setStyle(s)}>{s}</div>)}
              </div>
            </div>

            <div>
              <div className="slbl">Prompt</div>
              <textarea className="ptxt" rows={5} placeholder="Describe your image — scene, lighting, mood, subjects, location..." value={prompt} onChange={e=>setPrompt(e.target.value)}/>
            </div>
            <div>
              <div className="slbl">Negative Prompt</div>
              <textarea className="ptxt" rows={2} value={negPrompt} onChange={e=>setNegPrompt(e.target.value)}/>
            </div>

            {error&&<div className="ebox">⚠ {error}</div>}

            <button className={`genbtn ${generating?"busy":"idle"}`} onClick={handleGenerate} disabled={generating||!prompt.trim()}>
              {generating?<><div className="spin"/>Generating via Imagen 3...</>:<>✦ Generate Image</>}
            </button>
          </div>

          <div style={{flex:1,display:"flex",flexDirection:"column"}}>
            <div className="canvas">
              <div className="imgbox" style={{width:dw,height:dh}}>
                {imgSrc&&<img className="genimg" src={imgSrc} alt="Generated"/>}
                {generating&&(
                  <div className="overlay">
                    <div className="big-spin"/>
                    <div className="prog"><div className="prog-bar"/></div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:10,fontFamily:"'DM Sans',sans-serif"}}>Imagen 3 Fast generating...</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.22)",marginTop:4,fontFamily:"'DM Sans',sans-serif"}}>~10–15 seconds</div>
                  </div>
                )}
                {!imgSrc&&!generating&&(
                  <div style={{textAlign:"center",padding:32}}>
                    <div style={{fontSize:40,opacity:.2,marginBottom:12}}>🍌</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"rgba(255,255,255,.22)",marginBottom:7}}>{size} · {cs.w}×{cs.h}px</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.18)",lineHeight:1.7}}>
                      {apiKey?"Enter a prompt and hit Generate":"Add your Gemini API key to start"}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="metabar">
              <div style={{display:"flex",gap:20}}>
                {[["Model","Imagen 3 Fast"],["Size",`${cs.label} · ${cs.w}×${cs.h}`],["Style",style],["API",apiKey?"Connected ✓":"Not set ✗"]].map(([k,v])=>(
                  <div key={k}>
                    <div className="mkey">{k}</div>
                    <div className="mval" style={{color:k==="API"?(apiKey?"#34A853":"#EA4335"):undefined}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:7}}>
                {imgSrc&&<button className="abtn p" onClick={handleDownload}>⬇ Download</button>}
                {imgSrc&&<button className="abtn s" onClick={()=>{setImgSrc(null);setError(null);setPrompt("");}}>+ New</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
