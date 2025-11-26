import React, { useState, useEffect, useRef } from 'react';
import sdk from '@farcaster/frame-sdk'; 
import { Sparkles, Send, RefreshCw, Image as ImageIcon, Edit3, CheckCircle2, XCircle, Share2, Loader2, Camera, Link as LinkIcon, Upload, Wand2, Briefcase, Smile, Zap, Share, Trophy } from 'lucide-react';

// --- Configuration ---

const apiKey = "AIzaSyCAVA0hN1rllMq8PP8-CxnF6I9DWDALIRE"; 

// --- API Helpers ---

const generateContentPlan = async (topic, style = 'unhinged') => {
  let styleInstruction = "";
  if (style === 'professional') {
    styleInstruction = "STYLE: Professional, crisp, engaging, proper grammar. Aim for a tech-thought-leader vibe. No slang.";
  } else if (style === 'funny') {
    styleInstruction = "STYLE: Witty, clever, and humorous. Make a joke related to the topic. Casual tone.";
  } else { 
    styleInstruction = "STYLE: Casual, human, maybe all lowercase, witty, slightly self-deprecating or absurd. Use internet slang. Chaos mode.";
  }

  const systemPrompt = `
    You are a legendary Farcaster user.
    CRITICAL: You MUST write about the specific "Topic" provided by the user.
    1. Write a draft post (max 280 chars).
       - ${styleInstruction}
       - AVOID: Hashtags (unless ironic), corporate speak, "AI language".
    2. Create 3 distinct SEARCH KEYWORDS for images.
    
    Return ONLY valid JSON:
    {
      "postText": "The actual post content...",
      "searchTerms": ["term 1", "term 2", "term 3"]
    }
  `;

  try {
    // 🔴 CHANGED MODEL TO GEMINI 1.5 FLASH (STABLE)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Topic: ${topic}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to generate plan");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // 🔴 ADDED JSON CLEANING (Fixes "AI Tripped" error)
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Text Gen Error:", error);
    throw error;
  }
};

const regenerateText = async (topic, style) => {
  let stylePrompt = "";
  if (style === 'professional') stylePrompt = "Professional, crisp, engaging.";
  else if (style === 'funny') stylePrompt = "Witty, clever, humorous.";
  else stylePrompt = "Chaotic, lowercase, 'shitpost' style.";

  const systemPrompt = `Topic: ${topic}. Task: Write a single social media post (max 280 chars). Style: ${stylePrompt}. Return ONLY plain text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Topic: ${topic}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      }
    );
    if (!response.ok) throw new Error("Error");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text.trim();
  } catch (error) {
    return null;
  }
};

// 🔴 NEW IMAGE SYSTEM: Uses "LoremFlickr" for Real Stock Photos (Free & No Key)
const fetchImage = async (searchTerm) => {
  // Use a simple term like "tech", "nature", "cat" if the specific term fails
  const safeSearchTerm = searchTerm || "technology";
  
  // Random number to "lock" the image so it doesn't change between preview and post
  const lockId = Math.floor(Math.random() * 100000);
  
  // LoremFlickr URL: width/height/keywords
  // We use 800x600 for a good social card size
  const imageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(safeSearchTerm)}?lock=${lockId}`;

  return {
    preview: imageUrl,
    full: imageUrl
  };
};

// --- Components ---

const LoadingStep = ({ status }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-6 animate-in fade-in duration-500">
    <div className="relative">
      <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
      <Loader2 className="w-12 h-12 text-purple-400 animate-spin relative z-10" />
    </div>
    <p className="text-slate-400 text-sm font-medium tracking-wide animate-pulse">{status}</p>
  </div>
);

const ImageOption = ({ imgData, label, selected, onClick, loading, isCustom, onUpload }) => {
  if (isCustom && !imgData) {
    return (
      <button onClick={onUpload} className={`relative group overflow-hidden rounded-xl aspect-square border-2 border-dashed border-slate-700 hover:border-purple-500 hover:bg-slate-800/50 transition-all duration-300 w-full flex flex-col items-center justify-center gap-2 ${selected ? 'border-purple-500 bg-slate-800' : ''}`}>
        <Upload className="w-6 h-6 text-slate-400 group-hover:text-purple-400" />
        <span className="text-xs text-slate-400 font-medium">Upload Own</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={loading} className={`relative group overflow-hidden rounded-xl aspect-square border-2 transition-all duration-300 w-full ${selected ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.02]' : 'border-slate-800 hover:border-slate-600'}`}>
      {loading ? (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-600 animate-spin" /></div>
      ) : imgData ? (
        <>
          <img src={isCustom ? imgData : imgData.preview} alt={label} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
          {selected && <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-[2px]"><CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" /></div>}
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-500"><XCircle className="w-8 h-8 mb-2 opacity-50" /><span className="text-xs">Failed</span></div>
      )}
    </button>
  );
};

const StyleButton = ({ active, onClick, icon: Icon, label, colorClass, borderColorClass }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-300 ${active ? `${borderColorClass} bg-slate-800 shadow-lg scale-105` : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400'}`}>
    <Icon className={`w-5 h-5 ${active ? colorClass : 'text-slate-500'}`} />
    <span className={`text-xs font-bold ${active ? 'text-white' : ''}`}>{label}</span>
  </button>
);

export default function App() {
  const [topic, setTopic] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("unhinged");
  const [step, setStep] = useState("input");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [postText, setPostText] = useState("");
  const [searchTerms, setSearchTerms] = useState([]);
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([null, null, null]);
  const [customImage, setCustomImage] = useState(null); 
  const [selectedImgIndex, setSelectedImgIndex] = useState(0); 
  const [error, setError] = useState("");
  const [points, setPoints] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (sdk && sdk.actions) { await sdk.actions.ready(); }
      } catch (e) { console.warn("SDK Error", e); }
    };
    
    const savedPoints = localStorage.getItem('castgen_points');
    if (savedPoints) setPoints(parseInt(savedPoints));

    if (!isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setStep("generating"); setError(""); setLoadingStatus("Brewing magic...");
    try {
      const plan = await generateContentPlan(topic, selectedStyle);
      setPostText(plan.postText);
      setSearchTerms(plan.searchTerms || ["random", "abstract", "digital"]); 
      setLoadingStatus("Developing photos...");
      const termsToFetch = plan.searchTerms.slice(0, 3);
      const imagePromises = termsToFetch.map(term => fetchImage(term));
      const images = await Promise.all(imagePromises);
      setGeneratedImages(images); setStep("preview"); setSelectedImgIndex(0); 
    } catch (err) {
      console.error(err); setError("The AI tripped. Try again."); setStep("input");
    }
  };

  const handleRegenerateText = async (style) => {
    if (!topic || isRegeneratingText) return;
    setIsRegeneratingText(true); setSelectedStyle(style); 
    try {
      const newText = await regenerateText(topic, style);
      if (newText) setPostText(newText);
    } catch (err) { console.error(err); } finally { setIsRegeneratingText(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCustomImage(reader.result); setSelectedImgIndex(3); };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => { fileInputRef.current?.click(); };

  const handlePost = () => { 
      setStep("posting"); 
      const newPoints = points + 10;
      setPoints(newPoints);
      localStorage.setItem('castgen_points', newPoints.toString());
      setTimeout(() => { setStep("success"); }, 1500); 
  };

  const openWarpcastComposer = () => {
    const encodedText = encodeURIComponent(postText);
    let composeUrl = `https://warpcast.com/~/compose?text=${encodedText}`;

    if (selectedImgIndex !== 3) {
        const imgData = generatedImages[selectedImgIndex];
        if (imgData && imgData.full) {
            composeUrl += `&embeds[]=${encodeURIComponent(imgData.full)}`;
        }
    } else {
        alert("For custom photos, please attach them from your gallery manually in the next step!");
    }

    if (sdk && sdk.actions && sdk.actions.openUrl) {
        sdk.actions.openUrl(composeUrl);
    } else {
        window.open(composeUrl, '_blank');
    }
  };

  const copyTextToClipboard = () => { navigator.clipboard.writeText(postText); alert("Text copied!"); };

  const copyImageLink = () => {
    if (selectedImgIndex === 3) { alert("This is your local file! Attach it from your gallery."); return; }
    const imgData = generatedImages[selectedImgIndex];
    if (imgData && imgData.full) { navigator.clipboard.writeText(imgData.full); alert("Image URL copied!"); }
  };

  const handleShareApp = async () => {
    const shareText = `I just made a post with CastGen AI! I have ${points} points! 🪄`;
    const shareUrl = window.location.href; 
    
    if (sdk && sdk.actions && sdk.actions.openUrl) {
       const encodedShare = encodeURIComponent(shareText);
       const encodedUrl = encodeURIComponent(shareUrl);
       sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodedShare}&embeds[]=${encodedUrl}`);
    } else if (navigator.share) {
      try { await navigator.share({ title: 'CastGen AI', text: shareText, url: shareUrl }); } catch (err) { console.log('Error sharing:', err); }
    } else {
      navigator.clipboard.writeText(shareUrl); alert("App link copied!");
    }
  };

  const reset = () => { setTopic(""); setPostText(""); setGeneratedImages([null, null, null]); setCustomImage(null); setStep("input"); };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans selection:bg-purple-500/30">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-[#15171e] shadow-2xl overflow-hidden">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#15171e]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <h1 className="font-bold text-lg tracking-tight">CastGen AI</h1>
          </div>
          <div className="flex gap-2 items-center">
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 mr-1">
                <Trophy className="w-3.5 h-3.5" /> {points}
            </div>
            {step === 'input' && <button onClick={handleShareApp} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><Share className="w-4 h-4 text-slate-400" /></button>}
            {step !== 'input' && <button onClick={reset} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><RefreshCw className="w-4 h-4 text-slate-400" /></button>}
          </div>
        </header>
        <main className="flex-1 p-6 flex flex-col relative">
          {step === 'input' && (
            <div className="flex flex-col h-full justify-center animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 text-center space-y-2"><h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Let's get weird.</h2><p className="text-slate-400">Give me a topic, I'll find the perfect vibe.</p></div>
              <div className="relative group mb-6">
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., why my code is broken, crypto twitter drama..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none placeholder:text-slate-600 shadow-inner" />
                <div className="absolute bottom-4 right-4 text-xs text-slate-500">{topic.length}/100</div>
              </div>
              <div className="mb-6"><p className="text-sm text-slate-500 mb-3 ml-1 font-medium">Select Tone:</p><div className="flex gap-3"><StyleButton active={selectedStyle === 'professional'} onClick={() => setSelectedStyle('professional')} icon={Briefcase} label="Pro" colorClass="text-blue-400" borderColorClass="border-blue-500" /><StyleButton active={selectedStyle === 'funny'} onClick={() => setSelectedStyle('funny')} icon={Smile} label="Funny" colorClass="text-yellow-400" borderColorClass="border-yellow-500" /><StyleButton active={selectedStyle === 'unhinged'} onClick={() => setSelectedStyle('unhinged')} icon={Zap} label="Unhinged" colorClass="text-purple-400" borderColorClass="border-purple-500" /></div></div>
              {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">{error}</div>}
              <button onClick={handleGenerate} disabled={!topic.trim()} className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />Cook Something Up</button>
            </div>
          )}
          {step === 'generating' && <LoadingStep status={loadingStatus} />}
          {step === 'preview' && (
            <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="space-y-2"><div className="flex items-center justify-between text-sm text-slate-400 px-1"><span className="flex items-center gap-1"><Edit3 className="w-3 h-3" /> Remix Caption</span><span>{postText.length}/320</span></div><div className="relative"><textarea value={postText} onChange={(e) => setPostText(e.target.value)} disabled={isRegeneratingText} className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-base focus:outline-none focus:border-purple-500 transition-colors resize-none h-28 ${isRegeneratingText ? 'opacity-50' : ''}`} />{isRegeneratingText && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>}</div><div className="flex gap-2"><button onClick={() => handleRegenerateText('professional')} disabled={isRegeneratingText} className={`flex-1 text-xs py-2 rounded-lg transition-colors border ${selectedStyle === 'professional' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>👔 Pro</button><button onClick={() => handleRegenerateText('funny')} disabled={isRegeneratingText} className={`flex-1 text-xs py-2 rounded-lg transition-colors border ${selectedStyle === 'funny' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>😂 Funny</button><button onClick={() => handleRegenerateText('unhinged')} disabled={isRegeneratingText} className={`flex-1 text-xs py-2 rounded-lg transition-colors border ${selectedStyle === 'unhinged' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>🤪 Unhinged</button></div></div>
              <div className="space-y-3"><div className="flex items-center gap-2 text-sm text-slate-400 px-1"><Camera className="w-3 h-3" /><span>Select a Vibe (or upload own)</span></div><div className="grid grid-cols-2 gap-3">{generatedImages.map((imgData, idx) => (<ImageOption key={idx} imgData={imgData} label={searchTerms[idx]} selected={selectedImgIndex === idx} onClick={() => setSelectedImgIndex(idx)} loading={!imgData && generatedImages.length === 0} isCustom={false} />))}<ImageOption key="custom" imgData={customImage} label="My Photo" selected={selectedImgIndex === 3} onClick={() => customImage ? setSelectedImgIndex(3) : triggerFileUpload()} onUpload={triggerFileUpload} loading={false} isCustom={true} /></div></div>
              <div className="pt-4 space-y-3 mt-auto"><button onClick={handlePost} className="w-full bg-[#855DCD] hover:bg-[#734eb5] text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2"><Send className="w-5 h-5" />Ship It</button><button onClick={reset} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" />Start Over</button></div>
            </div>
          )}
          {(step === 'posting' || step === 'success') && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in duration-300">
              {step === 'posting' ? <Loader2 className="w-16 h-16 text-purple-500 animate-spin" /> : <><div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2"><CheckCircle2 className="w-10 h-10 text-green-500" /></div><h3 className="text-2xl font-bold text-white">Banger Secured!</h3><p className="text-slate-400 max-w-xs">Content ready. Open Warpcast to unleash it.</p><div className="flex flex-col w-full gap-3 mt-8"><button onClick={openWarpcastComposer} className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200"><Share2 className="w-4 h-4" />Open in Warpcast</button><div className="grid grid-cols-2 gap-3"><button onClick={copyTextToClipboard} className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 text-sm">Copy Text</button><button onClick={copyImageLink} className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 text-sm flex items-center justify-center gap-2"><LinkIcon className="w-3 h-3" />{selectedImgIndex === 3 ? "Local File" : "Copy HD Image"}</button></div><button onClick={reset} className="text-slate-500 text-sm mt-4 hover:text-slate-300">Make Another One</button></div></>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}