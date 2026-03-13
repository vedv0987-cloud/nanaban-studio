import { useState, useEffect } from "react";

const GOOGLE_CLIENT_ID = "253401165308-q00hl4ungj7gsf5nt1iklh0mvs4v73a8.apps.googleusercontent.com";

const MODELS = [
  { id:"nbp1", name:"Nano Banana Pro",   tag:"v1", desc:"Fast, versatile generation for social & marketing",   speed:"~8s",  quality:"High",  color:"#F9AB00" },
  { id:"nbp2", name:"Nano Banana Pro 2", tag:"v2", desc:"Ultra-detail cinematic renders, complex scenes",       speed:"~14s", quality:"Ultra", color:"#34A853" },
];

const SIZES = [
  { label:"1:1",  w:1024, h:1024, use:"Instagram Square" },
  { label:"4:5",  w:896,  h:1120, use:"Instagram Feed"   },
  { label:"9:16", w:768,  h:1344, use:"Stories / Reels"  },
  { label:"16:9", w:1344, h:768,  use:"YouTube / LinkedIn"},
  { label:"4:3",  w:1152, h:864,  use:"Presentation"     },
  { label:"21:9", w:1536, h:660,  use:"Cinematic Wide"   },
  { label:"3:4",  w:864,  h:1152, use:"Portrait Print"   },
  { label:"2:3",  w:832,  h:1248, use:"Pinterest Pin"    },
];

const STYLES = ["Cinematic","Photorealistic","Luxury Editorial","Architectural Viz","Lifestyle","Product Shot","Golden Hour","Minimal Clean"];

function parseToken() {
  const p = new URLSearchParams(window.location.hash.substring(1));
  return p.get("access_token") || null;
}

async function fetchProfile(token) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers:{ Authorization:`Bearer ${token}` } });
  return r.json();
}

function doGoogleRedirect() {
  // ✅ FIXED: guard checks for placeholder string, not the real Client ID
  if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
    alert("⚠️ Paste your Google OAuth Client ID in the GOOGLE_CLIENT_ID constant at the top of the file.\n\nGet it free from: https://console.cloud.google.com/apis/credentials");
    return;
  }
  const p = new URLSearchParams({
    client_id:    GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin + window.location.pathname,
    response_type:"token",
    scope:        "email profile openid",
    prompt:       "select_account",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export default function App() {
  const [user,         setUser]         = useState(null);
  const [appReady,     setAppReady]     = useState(false);
  const [signingIn,    setSigningIn]    = useState(false);
  const [model,        setModel]        = useState("nbp2");
  const [size,         setSize]         = useState("4:5");
  const [style,        setStyle]        = useState("Cinematic");
  const [prompt,       setPrompt]       = useState("");
  const [negPrompt,    setNegPrompt]    = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [generated,    setGenerated]    = useState(false);
  const [guidance,     setGuidance]     = useState(7.5);
  const [steps,        setSteps]        = useState(40);
  const [seed,         setSeed]         = useState(Math.floor(Math.random()*99999));
  const [showAdv,      setShowAdv]      = useState(false);
  const [tab,          setTab]          = useState("generate");
  const [history,      setHistory]      = useState([]);
  const [showGuide,    setShowGuide]    = useState(false);

  useEffect(() => {
    const token = parseToken();
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchProfile(token).then(p => {
        setUser({
          name:     p.name,
          email:    p.email,
          picture:  p.picture,
          initials: (p.name||"U").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),
        });
        setAppReady(true);
      }).catch(() => setAppReady(true));
    } else {
      setAppReady(true);
    }
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true); setGenerated(false);
    setTimeout(() => {
      setGenerating(false); setGenerated(true);
      const m = MODELS.find(x=>x.id===model);
      setHistory(prev => [{ id:Date.now(), prompt:prompt.slice(0,55)+(prompt.length>55?"...":""), model:m.name, size, style, seed, time:new Date().toLocaleTimeString() }, ...prev.slice(0,7)]);
    }, model==="nbp2" ? 4000 : 2600);
  };

  const cm = MODELS.find(x=>x.id===model);
  const cs = SIZES.find(x=>x.label===size);
  const maxD = 460, sc = Math.min(maxD/cs.w, maxD/cs.h);
  const dw = Math.round(cs.w*sc), dh = Math.round(cs.h*sc);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.08) translate(12px,-12px);opacity:1}}
    @keyframes cardIn{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes growBar{from{width:0}to{width:100%}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .orb{position:absolute;border-radius:50%;pointer-events:none;}
    .card{position:relative;z-index:10;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:48px 44px;width:430px;backdrop-filter:blur(20px);box-shadow:0 28px 72px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);animation:cardIn .75s cubic-bezier(.16,1,.3,1) both;font-family:'DM Sans',sans-serif;}
    .gbtn{width:100%;padding:14px 20px;background:#fff;border:none;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:11px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(0,0,0,.3);}
    .gbtn:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(0,0,0,.4);}
    .gbtn:active{transform:none;}
    .gbtn:disabled{opacity:.6;cursor:not-allowed;transform:none;}
    .gs{width:18px;height:18px;border:2.5px solid rgba(26,26,26,.12);border-top-color:#1a1a1a;border-radius:50%;animation:spin .7s linear infinite;}
    .guide-toggle{width:100%;padding:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;color:rgba(255,255,255,.4);font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-top:10px;text-align:center;}
    .guide-toggle:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.65);}
    .guide-box{background:rgba(66,133,244,.07);border:1px solid rgba(66,133,244,.18);border-radius:13px;padding:18px;margin-top:12px;animation:fadeUp .3s ease;}
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;}
    .snum{min-width:20px;height:20px;border-radius:50%;background:rgba(66,133,244,.25);border:1px solid rgba(66,133,244,.35);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#4285F4;font-family:'DM Sans',sans-serif;}
    .stxt{font-size:12px;color:rgba(255,255,255,.5);line-height:1.5;font-family:'DM Sans',sans-serif;}
    .sl{color:#4285F4;text-decoration:none;border-bottom:1px solid rgba(66,133,244,.25);}
    .sc{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-size:10px;font-family:monospace;}
    .navbar{display:flex;align-items:center;justify-content:space-between;padding:13px 26px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,8,10,.93);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;}
    .logo-mark{width:33px;height:33px;background:linear-gradient(135deg,#F9AB00,#E37400);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 11px rgba(249,171,0,.28);}
    .ntabs{display:flex;gap:3px;background:rgba(255,255,255,.04);padding:3px;border-radius:9px;border:1px solid rgba(255,255,255,.06);}
    .ntab{padding:5px 15px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.38);border:none;background:transparent;font-family:'DM Sans',sans-serif;}
    .ntab.on{background:rgba(255,255,255,.1);color:#fff;}
    .pill{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:40px;padding:4px 13px 4px 4px;}
    .av{width:29px;height:29px;border-radius:50%;}
    .av-txt{width:29px;height:29px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#34A853);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;}
    .signout{padding:4px 9px;border-radius:6px;font-size:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.32);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-left:6px;}
    .signout:hover{color:rgba(255,255,255,.65);background:rgba(255,255,255,.08);}
    .lpanel{width:355px;min-width:355px;background:rgba(255,255,255,.02);border-right:1px solid rgba(255,255,255,.05);overflow-y:auto;padding:20px 17px;display:flex;flex-direction:column;gap:17px;}
    .slbl{font-size:10px;font-weight:600;color:rgba(255,255,255,.28);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;}
    .mcard{border-radius:13px;padding:12px 14px;cursor:pointer;transition:all .2s;border:1.5px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);display:flex;align-items:center;gap:12px;margin-bottom:7px;}
    .mcard:hover{border-color:rgba(255,255,255,.11);}
    .mcard.sel{border-color:var(--mc);}
    .szgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
    .szbtn{border-radius:10px;padding:9px 5px;cursor:pointer;transition:all .18s;border:1.5px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;}
    .szbtn:hover{border-color:rgba(255,255,255,.11);}
    .szbtn.on{border-color:#F9AB00;background:rgba(249,171,0,.07);}
    .schips{display:flex;flex-wrap:wrap;gap:6px;}
    .schip{padding:5px 11px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;transition:all .18s;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03);color:rgba(255,255,255,.42);}
    .schip:hover{color:rgba(255,255,255,.75);}
    .schip.on{background:rgba(249,171,0,.09);border-color:rgba(249,171,0,.28);color:#F9AB00;}
    .ptxt{width:100%;background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;resize:none;outline:none;transition:border-color .2s;line-height:1.6;}
    .ptxt::placeholder{color:rgba(255,255,255,.2);}
    .ptxt:focus{border-color:rgba(249,171,0,.38);}
    .genbtn{width:100%;padding:14px;border-radius:13px;border:none;cursor:pointer;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,#F9AB00,#E37400);color:#000;box-shadow:0 7px 22px rgba(249,171,0,.24);}
    .genbtn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 11px 30px rgba(249,171,0,.34);}
    .genbtn:disabled{opacity:.4;cursor:not-allowed;transform:none;}
    .genbtn.loading{background:rgba(249,171,0,.1);color:#F9AB00;border:1.5px solid rgba(249,171,0,.22);box-shadow:none;}
    .canvas{flex:1;display:flex;align-items:center;justify-content:center;padding:34px;}
    .imgbox{border-radius:17px;overflow:hidden;position:relative;background:rgba(255,255,255,.025);border:1.5px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;transition:all .3s;}
    .lbar{position:absolute;bottom:0;left:0;height:3px;background:linear-gradient(90deg,#F9AB00,#34A853,#4285F4,#EA4335);background-size:200% 100%;animation:shimmer 1.4s linear infinite,growBar 3.8s ease-out forwards;}
    .gover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(249,171,0,.05),rgba(52,168,83,.05));border-radius:17px;animation:fadeUp .5s ease;}
    .metabar{padding:13px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
    .mkey{font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.5px;text-transform:uppercase;}
    .mval{font-size:12px;color:rgba(255,255,255,.6);font-weight:500;margin-top:2px;}
    .abtn{padding:7px 13px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;}
    .abtn.p{background:rgba(249,171,0,.13);border:1px solid rgba(249,171,0,.26);color:#F9AB00;}
    .abtn.s{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.5);}
    .abtn:hover{opacity:.8;transform:translateY(-1px);}
    .aslider{width:100%;accent-color:#F9AB00;cursor:pointer;}
    .hpanel{flex:1;padding:22px 26px;overflow-y:auto;}
    .hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:10px;}
    .hcard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:11px;padding:12px;transition:all .2s;cursor:pointer;}
    .hcard:hover{background:rgba(255,255,255,.05);}
    .spinner{width:20px;height:20px;border:2px solid rgba(249,171,0,.18);border-top-color:#F9AB00;border-radius:50%;animation:spin .7s linear infinite;}
  `;

  if (!appReady) return (
    <div style={{ minHeight:"100vh", background:"#060608", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{CSS}</style>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:38,marginBottom:14 }}>🍌</div><div className="spinner" style={{ margin:"0 auto" }} /></div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", background:"#060608", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{CSS}</style>
      <div className="orb" style={{ width:580,height:580,top:-180,left:-180,background:"radial-gradient(circle,rgba(249,171,0,.11) 0%,transparent 70%)",animation:"pulse 6s ease-in-out infinite" }} />
      <div className="orb" style={{ width:480,height:480,bottom:-140,right:-140,background:"radial-gradient(circle,rgba(52,168,83,.09) 0%,transparent 70%)",animation:"pulse 8s ease-in-out infinite reverse" }} />
      <div style={{ position:"absolute",top:72,right:72,background:"rgba(52,168,83,.09)",border:"1px solid rgba(52,168,83,.2)",borderRadius:12,padding:"10px 15px",zIndex:5,fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ fontSize:11,color:"#34A853",fontWeight:600 }}>✦ Nano Banana Pro 2</div>
        <div style={{ fontSize:10,color:"rgba(255,255,255,.33)",marginTop:2 }}>Ultra Quality · Unlimited</div>
      </div>
      <div style={{ position:"absolute",bottom:100,left:72,background:"rgba(249,171,0,.09)",border:"1px solid rgba(249,171,0,.2)",borderRadius:12,padding:"10px 15px",zIndex:5,fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ fontSize:11,color:"#F9AB00",fontWeight:600 }}>✦ Nano Banana Pro</div>
        <div style={{ fontSize:10,color:"rgba(255,255,255,.33)",marginTop:2 }}>High Quality · 8 Sizes</div>
      </div>
      <div className="card">
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:36 }}>
          <div className="logo-mark">🍌</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#fff",letterSpacing:"-0.5px" }}>NanaBan Studio</div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,.33)",marginTop:1 }}>Powered by Google Labs</div>
          </div>
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:27,fontWeight:800,color:"#fff",lineHeight:1.2,marginBottom:9,letterSpacing:"-0.7px" }}>Create without limits</div>
        <div style={{ fontSize:14,color:"rgba(255,255,255,.38)",marginBottom:30,lineHeight:1.6 }}>Sign in with your Google Pro account to access Nano Banana Pro image generation.</div>
        <button className="gbtn" onClick={() => { setSigningIn(true); doGoogleRedirect(); }} disabled={signingIn}>
          {signingIn ? (<><div className="gs" />Redirecting to Google...</>) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
        <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginTop:22 }}>
          {["Nano Banana Pro","Nano Banana Pro 2","8 Aspect Ratios","Unlimited Gen","Style Presets"].map(c => (
            <span key={c} style={{ padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:500,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",color:"rgba(255,255,255,.37)" }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize:11,color:"rgba(255,255,255,.2)",textAlign:"center",marginTop:20,lineHeight:1.5 }}>
          By continuing you agree to Google's Terms of Service.<br/>Your Google Pro plan grants unlimited generation access.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#07080A",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column" }}>
      <style>{CSS}</style>
      <nav className="navbar">
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <div className="logo-mark">🍌</div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff",letterSpacing:"-0.3px" }}>NanaBan Studio</div>
        </div>
        <div className="ntabs">
          {[["generate","✦ Generate"],["history","◌ History"]].map(([id,lbl]) => (
            <button key={id} className={`ntab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center" }}>
          <div className="pill">
            {user.picture
              ? <img className="av" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
              : <div className="av-txt">{user.initials}</div>
            }
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:"#fff",lineHeight:1.2 }}>{user.name?.split(" ")[0]}</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,.33)" }}>{user.email}</div>
            </div>
          </div>
          <button className="signout" onClick={()=>setUser(null)}>Sign out</button>
        </div>
      </nav>
      {tab==="history" ? (
        <div className="hpanel">
          <div style={{ marginBottom:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:21,color:"#fff",letterSpacing:"-0.4px" }}>Generation History</div>
            <div style={{ fontSize:13,color:"rgba(255,255,255,.28)",marginTop:4 }}>{history.length} images this session</div>
          </div>
          {history.length===0 ? (
            <div style={{ textAlign:"center",padding:"72px 40px",color:"rgba(255,255,255,.22)" }}>
              <div style={{ fontSize:42,marginBottom:14,opacity:.4 }}>🍌</div>
              <div style={{ fontSize:14 }}>No generations yet</div>
            </div>
          ) : (
            <div className="hgrid">
              {history.map(h => (
                <div key={h.id} className="hcard" onClick={()=>{setTab("generate");setPrompt(h.prompt);}}>
                  <div style={{ height:88,background:"linear-gradient(135deg,rgba(249,171,0,.08),rgba(52,168,83,.08))",borderRadius:8,marginBottom:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>🖼️</div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,.58)",marginBottom:5,lineHeight:1.4 }}>{h.prompt}</div>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,.28)" }}>{h.model} · {h.size} · {h.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display:"flex",flex:1,overflow:"hidden" }}>
          <div className="lpanel">
            <div>
              <div className="slbl">Model</div>
              {MODELS.map(m => (
                <div key={m.id} className={`mcard ${model===m.id?"sel":""}`} style={{ "--mc":m.color }} onClick={()=>setModel(m.id)}>
                  <div style={{ width:9,height:9,borderRadius:"50%",background:m.color,boxShadow:`0 0 6px ${m.color}`,flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:"#fff" }}>{m.name}</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,.36)",marginTop:1 }}>{m.desc}</div>
                    <div style={{ display:"flex",gap:6,marginTop:6 }}>
                      <span style={{ fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,background:`${m.color}16`,color:m.color,border:`1px solid ${m.color}26` }}>{m.speed}</span>
                      <span style={{ fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:500,background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.36)",border:"1px solid rgba(255,255,255,.07)" }}>{m.quality}</span>
                    </div>
                  </div>
                  {model===m.id && <div style={{ width:17,height:17,borderRadius:"50%",background:m.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><span style={{ color:"#000",fontSize:9,fontWeight:800 }}>✓</span></div>}
                </div>
              ))}
            </div>
            <div>
              <div className="slbl">Aspect Ratio</div>
              <div className="szgrid">
                {SIZES.map(s => (
                  <div key={s.label} className={`szbtn ${size===s.label?"on":""}`} onClick={()=>setSize(s.label)}>
                    <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,color:"#fff" }}>{s.label}</div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,.3)",lineHeight:1.2 }}>{s.use}</div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,.18)" }}>{s.w}×{s.h}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="slbl">Style Preset</div>
              <div className="schips">
                {STYLES.map(s => <div key={s} className={`schip ${style===s?"on":""}`} onClick={()=>setStyle(s)}>{s}</div>)}
              </div>
            </div>
            <div>
              <div className="slbl">Prompt</div>
              <textarea className="ptxt" rows={5} placeholder="Describe your image — scene, lighting, mood, cultural context, camera angle..." value={prompt} onChange={e=>setPrompt(e.target.value)} />
            </div>
            <div>
              <div className="slbl">Negative Prompt</div>
              <textarea className="ptxt" rows={2} placeholder="No AI artifacts, no plastic skin, no Western defaults..." value={negPrompt} onChange={e=>setNegPrompt(e.target.value)} />
            </div>
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }} onClick={()=>setShowAdv(!showAdv)}>
                <div className="slbl" style={{ marginBottom:0 }}>Advanced</div>
                <span style={{ color:"rgba(255,255,255,.28)",fontSize:11 }}>{showAdv?"▲":"▼"}</span>
              </div>
              {showAdv && (
                <div style={{ marginTop:13,display:"flex",flexDirection:"column",gap:11 }}>
                  {[{lbl:"Guidance Scale",val:guidance,min:1,max:20,step:0.5,set:setGuidance},{lbl:"Steps",val:steps,min:20,max:60,step:5,set:setSteps}].map(r=>(
                    <div key={r.lbl}>
                      <label style={{ fontSize:11,color:"rgba(255,255,255,.36)",marginBottom:5,display:"flex",justifyContent:"space-between" }}>{r.lbl}<span style={{ color:"#F9AB00",fontWeight:600 }}>{r.val}</span></label>
                      <input type="range" className="aslider" min={r.min} max={r.max} step={r.step} value={r.val} onChange={e=>r.set(parseFloat(e.target.value))} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:11,color:"rgba(255,255,255,.36)",marginBottom:5,display:"flex",justifyContent:"space-between" }}>Seed<span style={{ color:"#F9AB00",fontWeight:600 }}>{seed}</span></label>
                    <div style={{ display:"flex",gap:7,alignItems:"center" }}>
                      <input type="range" className="aslider" min={0} max={99999} value={seed} onChange={e=>setSeed(parseInt(e.target.value))} />
                      <button onClick={()=>setSeed(Math.floor(Math.random()*99999))} style={{ background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(255,255,255,.45)",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif" }}>🎲</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button className={`genbtn ${generating?"loading":""}`} onClick={handleGenerate} disabled={generating||!prompt.trim()}>
              {generating ? <><div className="spinner" />Generating with {cm.name}...</> : <>✦ Generate Image</>}
            </button>
          </div>
          <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
            <div className="canvas">
              <div className="imgbox" style={{ width:dw,height:dh }}>
                {generating && <div className="lbar" />}
                {generated&&!generating ? (
                  <div className="gover">
                    <div style={{ fontSize:44,marginBottom:11 }}>✦</div>
                    <div style={{ fontSize:14,color:"rgba(255,255,255,.78)",fontWeight:500 }}>Image Generated</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.36)",marginTop:4 }}>{cs.label} · {cs.w}×{cs.h}px</div>
                    <div style={{ display:"flex",gap:8,marginTop:17 }}>
                      <button className="abtn p" onClick={()=>{setGenerated(false);setPrompt("");}}>+ New</button>
                      <button className="abtn s">⬇ Download</button>
                    </div>
                  </div>
                ) : !generating ? (
                  <div style={{ textAlign:"center",padding:34 }}>
                    <div style={{ fontSize:40,opacity:.25,marginBottom:13 }}>🍌</div>
                    <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"rgba(255,255,255,.26)",marginBottom:7 }}>{size} · {cs.w}×{cs.h}px</div>
                    <div style={{ fontSize:13,color:"rgba(255,255,255,.2)",lineHeight:1.6 }}>Enter a prompt and hit Generate</div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13,color:"rgba(255,255,255,.36)",marginTop:11 }}>{cm.name} is generating...</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,.2)",marginTop:4 }}>est. {cm.speed}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="metabar">
              <div style={{ display:"flex",gap:18 }}>
                {[["Model",cm.name],["Size",`${cs.label} · ${cs.w}×${cs.h}`],["Style",style],["Seed",seed]].map(([k,v])=>(
                  <div key={k}><div className="mkey">{k}</div><div className="mval">{v}</div></div>
                ))}
              </div>
              <div style={{ display:"flex",gap:7 }}>
                <button className="abtn s" onClick={()=>setSeed(Math.floor(Math.random()*99999))}>🎲 Reseed</button>
                {generated&&<button className="abtn p">⬇ Download</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
