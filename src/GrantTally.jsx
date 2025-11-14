import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  Calendar,
  Zap,
  LogOut,
  Upload,
  Target,
  UserCheck,
  X,
} from "lucide-react";

/**
 * GrantTally (single-file demo)
 * - TailwindCSS UI
 * - Supabase Auth (email/password)
 * - Opportunities fetched from Supabase (fallback to mock)
 * - "Guided Apply" writes to Supabase applications table (idempotent)
 * - Persistent session; basic error handling
 *
 * To run:
 * 1) Ensure TailwindCSS is set up in your app.
 * 2) Add env vars:
 *    VITE_SUPABASE_URL=...  VITE_SUPABASE_ANON_KEY=...
 * 3) Create the tables using the SQL in the comment near the bottom.
 */

// --------------------------------------------
// Supabase client (vite-style envs). If not present, component falls back to mock data only.
// --------------------------------------------
import { createClient } from "@supabase/supabase-js";
   
   const url = import.meta?.env?.VITE_SUPABASE_URL;
   const key = import.meta?.env?.VITE_SUPABASE_ANON_KEY;
   let supabase = null;
   if (url && key) {
     supabase = createClient(url, key);
   }

const MOCK_USER = {
  id: "demo-user-1",
  email: "demo@granttally.com",
  name: "Demo User",
  plan: "professional",
  businessName: "Demo Business LLC",
  city: "Philadelphia",
  state: "PA",
};

const MOCK_OPPS = [
  {
    id: 1,
    title: "Philadelphia Business Expansion Grant",
    type: "grant",
    category: "business",
    amount: "$10,000 - $100,000",
    provider: "City of Philadelphia",
    deadline: "March 31, 2026",
    location: "Philadelphia, PA",
    scope: "local",
    description:
      "Grants for businesses expanding operations within Philadelphia city limits.",
    approvalRate: "45%",
    processingTime: "45-60 days",
    matchScore: 94,
  },
  {
    id: 2,
    title: "SBA 7(a) Loan Program",
    type: "loan",
    category: "business",
    amount: "Up to $5,000,000",
    provider: "U.S. Small Business Administration",
    deadline: "Ongoing",
    location: "Nationwide",
    scope: "national",
    description:
      "SBA's primary loan program for working capital, equipment, and real estate.",
    approvalRate: "58%",
    processingTime: "30-90 days",
    matchScore: 88,
  },
  {
    id: 3,
    title: "Google CS Scholarship",
    type: "scholarship",
    category: "individual",
    amount: "$10,000",
    provider: "Google",
    deadline: "December 1, 2025",
    location: "Nationwide",
    scope: "national",
    description: "Scholarship for students pursuing computer science degrees.",
    approvalRate: "15%",
    processingTime: "60 days",
    matchScore: 76,
  },
];

export default function GrantTally() {
  // Auth
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const isLoggedIn = !!user;

  // UI Views
  const [view, setView] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Data
  const [opps, setOpps] = useState(MOCK_OPPS);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [error, setError] = useState(null);

  // Search/filter
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  // Property & Financing (NEW)
  const [propertyAddress, setPropertyAddress] = useState("");
  const [ozResult, setOzResult] = useState(null);
  const [showFinancingOptions, setShowFinancingOptions] = useState(false);
  const [selectedFinancingType, setSelectedFinancingType] = useState(null);
  const [loanOfficerDocs, setLoanOfficerDocs] = useState([]);
  const [showLoanOfficerPortal, setShowLoanOfficerPortal] = useState(false);

  const filtered = useMemo(() => {
    return opps.filter((o) => {
      const s = q.trim().toLowerCase();
      const matchesQ = !s
        ? true
        : o.title.toLowerCase().includes(s) ||
          o.description.toLowerCase().includes(s) ||
          o.provider.toLowerCase().includes(s) ||
          o.location.toLowerCase().includes(s);
      const matchesType = type === "all" ? true : o.type === type;
      return matchesQ && matchesType;
    });
  }, [opps, q, type]);

  // --------------------------------------------
  // Supabase session bootstrap
  // --------------------------------------------
  useEffect(() => {
    if (!supabase) return; // offline/mock mode

    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ? mapUser(data.session.user) : null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ? mapUser(sess.user) : null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // --------------------------------------------
  // Fetch opportunities from Supabase if available
  // --------------------------------------------
  useEffect(() => {
    (async () => {
      if (!supabase) return; // stay in mock mode silently
      try {
        setLoadingOpps(true);
        setError(null);
        const { data, error } = await supabase
          .from("opportunities")
          .select("id,title,type,category,amount,provider,deadline,location,scope,description,approval_rate,processing_time,match_score")
          .order("match_score", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
          setOpps(
            data.map((r) => ({
              id: r.id,
              title: r.title,
              type: r.type,
              category: r.category,
              amount: r.amount,
              provider: r.provider,
              deadline: r.deadline,
              location: r.location,
              scope: r.scope,
              description: r.description,
              approvalRate: r.approval_rate,
              processingTime: r.processing_time,
              matchScore: r.match_score,
            }))
          );
        }
      } catch (e) {
        setError(e.message || "Failed to load opportunities");
      } finally {
        setLoadingOpps(false);
      }
    })();
  }, []);

  // --------------------------------------------
  // Actions
  // --------------------------------------------
  const signIn = async (email, password) => {
    if (!supabase) {
      // mock login
      setUser(MOCK_USER);
      setView("dashboard");
      setShowLogin(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    setUser(mapUser(data.user));
    setView("dashboard");
    setShowLogin(false);
  };

  const signUp = async (name, email, password) => {
    if (!supabase) {
      setUser({ ...MOCK_USER, name, email });
      setView("dashboard");
      setShowSignup(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    setSession(data.session);
    setUser(mapUser(data.user));
    setView("dashboard");
    setShowSignup(false);
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setView("home");
  };

  const startGuidedApply = async (opp) => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (!supabase) {
      alert(
        `Mock apply for: ${opp.title}\n\nThis would open a wizard, pre-fill forms, upload docs, then submit.`
      );
      return;
    }
    // upsert into applications { user_id, opportunity_id, status }
    const { error } = await supabase
      .from("applications")
      .upsert(
        {
          user_id: session.user.id,
          opportunity_id: opp.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
        },
        { onConflict: "user_id,opportunity_id" }
      );
    if (error) {
      alert(`Could not start application: ${error.message}`);
    } else {
      alert("Starting guided application… (demo)");
    }
  };

  // Property Financing Options Data
  const financingOptions = [
    {
      type: "FHA",
      name: "FHA Loan",
      downPayment: "3.5%",
      minCreditScore: 580,
      maxLoanAmount: "$498,257 - $1,149,825",
      interestRate: "6.5% - 7.5%",
      terms: "15 or 30 years",
      pros: ["Low down payment", "Easier credit requirements", "Gift funds allowed"],
      cons: ["Mortgage insurance required", "Property must be primary residence", "Loan limits apply"],
      bestFor: "First-time buyers or those with lower credit scores",
    },
    {
      type: "SBA",
      name: "SBA 504 Loan",
      downPayment: "10%",
      minCreditScore: 680,
      maxLoanAmount: "Up to $5,500,000",
      interestRate: "5.5% - 6.5%",
      terms: "10, 20, or 25 years",
      pros: ["Low down payment for commercial", "Fixed rates", "Long-term financing"],
      cons: ["Lengthy approval process", "Job creation requirements", "Owner-occupied only"],
      bestFor: "Business owners buying commercial real estate",
    },
    {
      type: "Conventional",
      name: "Conventional Loan",
      downPayment: "3% - 20%",
      minCreditScore: 620,
      maxLoanAmount: "$806,500+",
      interestRate: "6.0% - 7.0%",
      terms: "10, 15, 20, or 30 years",
      pros: ["No upfront mortgage insurance if 20% down", "Flexible property types", "Competitive rates"],
      cons: ["Stricter credit requirements", "PMI if less than 20% down", "Higher down payment typically"],
      bestFor: "Buyers with good credit and stable income",
    },
    {
      type: "USDA",
      name: "USDA Rural Development Loan",
      downPayment: "0%",
      minCreditScore: 640,
      maxLoanAmount: "Varies by location",
      interestRate: "6.0% - 7.0%",
      terms: "30 years",
      pros: ["No down payment required", "Low interest rates", "Flexible credit"],
      cons: ["Property must be in eligible rural area", "Income limits apply", "Funding fee required"],
      bestFor: "Rural property buyers with moderate income",
    },
    {
      type: "Bank",
      name: "Commercial Bank Loan",
      downPayment: "20% - 30%",
      minCreditScore: 700,
      maxLoanAmount: "Varies by bank",
      interestRate: "7.0% - 9.0%",
      terms: "5 to 25 years",
      pros: ["Flexible terms", "Relationship banking benefits", "Potentially faster approval"],
      cons: ["Higher down payment", "Stricter requirements", "May have balloon payments"],
      bestFor: "Established businesses with strong financials",
    },
  ];

  // Opportunity Zone Checker Function
  const checkOpportunityZone = (address) => {
    // In production, this would call a real API (IRS Opportunity Zone API or geocoding service)
    // For now, using mock data based on Philadelphia zip codes that are OZs
    const ozZipCodes = ["19122", "19124", "19132", "19133", "19134", "19140", "19141", "19143", "19145", "19146"];
    const zipMatch = address.match(/\b\d{5}\b/);

    if (zipMatch && ozZipCodes.includes(zipMatch[0])) {
      setOzResult({
        isOpportunityZone: true,
        address: address,
        benefits: [
          "Capital gains tax deferral until 2026",
          "10% step-up in basis if held for 5 years",
          "15% step-up in basis if held for 7 years",
          "Permanent exclusion of gains if held for 10 years",
          "Local property tax abatements (varies by municipality)",
          "State tax credits for development",
          "Priority for city development grants",
        ],
        programs: [
          {
            name: "Philadelphia OZ Investment Program",
            amount: "$50,000 - $500,000",
            type: "Tax Credits",
          },
          {
            name: "Pennsylvania OZ Tax Credit",
            amount: "Up to 25% of investment",
            type: "State Tax Credit",
          },
        ],
        stats: {
          medianIncome: "$32,500",
          povertyRate: "28%",
          population: "4,200",
        },
      });
    } else {
      setOzResult({
        isOpportunityZone: false,
        address: address,
        nearestOZ: "0.8 miles away in ZIP 19122",
        suggestion: "Consider properties in these nearby Opportunity Zones for tax benefits",
      });
    }
    setShowFinancingOptions(true);
  };

// Fetch real grants from Grants.gov API v2
  const fetchFederalGrants = async () => {
    try {
      setLoadingOpps(true);
      setError(null);
      
      console.log('🔍 Fetching real grants from Grants.gov...');
      
      // Grants.gov API v2 - NO API KEY NEEDED!
      const response = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: 'business',
          sortBy: 'openDate|desc',
          rows: 20,
          oppStatuses: 'forecasted|posted'
        })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Raw API response:', data);
      
      // Parse Grants.gov response
      if (data && data.opportunitiesList) {
        const newGrants = data.opportunitiesList.map((grant, index) => ({
          id: `grants-gov-${grant.opportunityID || Date.now() + index}`,
          title: grant.opportunityTitle || 'Federal Grant Opportunity',
          type: 'grant',
          category: 'business',
          amount: grant.awardCeiling ? `Up to $${parseInt(grant.awardCeiling).toLocaleString()}` : 'Amount varies',
          provider: grant.agencyName || grant.agencyCode || 'Federal Agency',
          deadline: grant.closeDate ? new Date(grant.closeDate).toLocaleDateString() : 'Check official site',
          location: 'Nationwide',
          scope: 'national',
          description: grant.description || grant.opportunityTitle || 'Federal grant opportunity',
          approvalRate: 'Varies',
          processingTime: '60-120 days',
          matchScore: 85
        }));
        
        console.log('✅ Parsed', newGrants.length, 'grants');
        
        // Add to existing grants
        setOpps(prev => [...prev, ...newGrants]);
        
        alert(`✅ Loaded ${newGrants.length} REAL federal grants from Grants.gov!`);
      } else {
        throw new Error('No grants found in response');
      }
      
    } catch (error) {
      console.error('❌ Error fetching from Grants.gov:', error);
      
      // Fallback to mock data if API fails
      console.log('⚠️ Using fallback grants...');
      
      const fallbackGrants = [
        {
          id: `fallback-${Date.now()}-1`,
          title: "SBA Small Business Innovation Research (SBIR)",
          type: "grant",
          category: "business",
          amount: "$50,000 - $1,500,000",
          provider: "U.S. Small Business Administration",
          deadline: "Rolling",
          location: "Nationwide",
          scope: "national",
          description: "Federal funding for small businesses conducting R&D with commercial potential.",
          approvalRate: "25%",
          processingTime: "90 days",
          matchScore: 90
        },
        {
          id: `fallback-${Date.now()}-2`,
          title: "Department of Energy Clean Energy Grant",
          type: "grant",
          category: "business",
          amount: "$100,000 - $500,000",
          provider: "U.S. Department of Energy",
          deadline: "June 30, 2026",
          location: "Nationwide",
          scope: "national",
          description: "Grants for businesses developing clean energy solutions.",
          approvalRate: "32%",
          processingTime: "90-120 days",
          matchScore: 85
        },
        {
          id: `fallback-${Date.now()}-3`,
          title: "USDA Rural Business Grant",
          type: "grant",
          category: "business",
          amount: "$10,000 - $500,000",
          provider: "U.S. Department of Agriculture",
          deadline: "March 15, 2026",
          location: "Rural Areas",
          scope: "national",
          description: "Grants for businesses in rural areas.",
          approvalRate: "45%",
          processingTime: "60-90 days",
          matchScore: 78
        }
      ];
      
      setOpps(prev => [...prev, ...fallbackGrants]);
      alert(`⚠️ Using sample grants. API error: ${error.message}`);
    } finally {
      setLoadingOpps(false);
    }
  };
  // --------------------------------------------
  // Views
  // --------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={isLoggedIn} user={user} onNav={setView} onPricing={() => setShowPricing(true)} onLogin={() => setShowLogin(true)} onLogout={logout} />

      {view === "home" && (
        <Home onCta={() => setView(isLoggedIn ? "search" : "home")} onSignup={() => setShowSignup(true)} onPricing={() => setShowPricing(true)} isLoggedIn={isLoggedIn} />
      )}

      {view === "search" && (
        <SearchView
          isLoggedIn={isLoggedIn}
          user={user || MOCK_USER}
          items={filtered}
          q={q}
          setQ={setQ}
          type={type}
          setType={setType}
          loading={loadingOpps}
          error={error}
          onApply={startGuidedApply}
          onLoadGrants={fetchFederalGrants} 
        />
      )}

      {view === "property" && (
        <PropertyView
          propertyAddress={propertyAddress}
          setPropertyAddress={setPropertyAddress}
          ozResult={ozResult}
          showFinancingOptions={showFinancingOptions}
          checkOpportunityZone={checkOpportunityZone}
          financingOptions={financingOptions}
          selectedFinancingType={selectedFinancingType}
          setSelectedFinancingType={setSelectedFinancingType}
          showLoanOfficerPortal={showLoanOfficerPortal}
          setShowLoanOfficerPortal={setShowLoanOfficerPortal}
          loanOfficerDocs={loanOfficerDocs}
          setLoanOfficerDocs={setLoanOfficerDocs}
        />
      )}

      {view === "dashboard" && isLoggedIn && <Dashboard user={user || MOCK_USER} onFind={() => setView("search")} />}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSubmit={signIn} onSwitch={() => { setShowLogin(false); setShowSignup(true); }} />
      )}
      {showSignup && (
        <SignupModal onClose={() => setShowSignup(false)} onSubmit={signUp} onSwitch={() => { setShowSignup(false); setShowLogin(true); }} />
      )}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

      <Footer />

      {/* --- SQL (run in Supabase) ---
      create table if not exists opportunities (
        id bigserial primary key,
        title text not null,
        type text check (type in ('grant','loan','scholarship')) not null,
        category text,
        amount text,
        provider text,
        deadline text,
        location text,
        scope text,
        description text,
        approval_rate text,
        processing_time text,
        match_score int
      );

      create table if not exists applications (
        id bigserial primary key,
        user_id uuid not null references auth.users(id) on delete cascade,
        opportunity_id bigint not null references opportunities(id) on delete cascade,
        status text default 'in_progress',
        started_at timestamptz default now(),
        unique (user_id, opportunity_id)
      );

      -- RLS policies
      alter table applications enable row level security;
      create policy "user owns applications" on applications
        for select using (auth.uid() = user_id);
      create policy "user inserts own applications" on applications
        for insert with check (auth.uid() = user_id);
      create policy "user updates own applications" on applications
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
      */}
    </div>
  );
}

// --------------------------------------------
// Subcomponents
// --------------------------------------------
function Header({ isLoggedIn, user, onNav, onPricing, onLogin, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px_4 md:px-4 px-3 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNav("home")}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GrantTally</h1>
              <p className="text-xs text-gray-600">Apply in Minutes, Not Months</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <button onClick={() => onNav("search")} className="text-gray-700 hover:text-blue-600 font-medium">Find Funding</button>
            <button onClick={() => onNav("property")} className="text-gray-700 hover:text-blue-600 font-medium">Property Financing</button>
            {isLoggedIn && (
              <button onClick={() => onNav("dashboard")} className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</button>
            )}
            <button onClick={onPricing} className="text-gray-700 hover:text-blue-600 font-medium">Pricing</button>
          </nav>
          <div className="flex items-center space-x-3">
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-gray-500">Current Plan</div>
                  <div className="text-sm font-semibold text-blue-600 capitalize">{user?.plan || "starter"}</div>
                </div>
                <button onClick={onLogout} className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
                  <LogOut className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-700 hidden sm:block">Logout</span>
                </button>
              </div>
            ) : (
              <button onClick={onLogin} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Sign In</button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Home({ onCta, onSignup, onPricing, isLoggedIn }) {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 mr-2" />
            <span className="text-sm font-semibold">Apply in Minutes, Not Months</span>
          </div>
          <div className="inline-flex items-center bg-yellow-400 text-gray-900 rounded-full px-4 py-2 mb-4 font-semibold">
     🚧 Beta Version - We're Improving Daily!
   </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Stop Wasting Time on<br/>Grant Applications</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            GrantTally automates the entire application process. Upload your documents once, apply to unlimited grants and loans with guided assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={isLoggedIn ? onCta : onSignup} className="bg-white text-blue-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition shadow-lg">Start Free Trial</button>
            <button onClick={onPricing} className="bg-blue-500 text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-400 transition">View Pricing</button>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <Stat label="Funding Secured" value="$2.1M+" />
            <Stat label="Businesses Funded" value="500+" />
            <Stat label="Avg. Apply Time" value="15 min" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">How GrantTally Works</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">Get funded faster with our intelligent application system</p>
        <div className="grid md:grid-cols-4 gap-8">
          <Step idx={1} title="Upload Once" desc="Upload your business documents. Our AI extracts data and generates financial statements automatically." icon={<Upload className="w-10 h-10 text-white" />} bg="from-blue-500 to-blue-600" badge="text-blue-600 bg-blue-50" />
          <Step idx={2} title="Find Matches" desc="Browse thousands of grants and loans. Filter by location, industry, and amount. See approval odds." icon={<Target className="w-10 h-10 text-white" />} bg="from-green-500 to-green-600" badge="text-green-600 bg-green-50" />
          <Step idx={3} title="Auto-Complete" desc="We pre-fill applications with your data, generate required statements, and organize documents." icon={<Upload className="w-10 h-10 text-white" />} bg="from-purple-500 to-purple-600" badge="text-purple-600 bg-purple-50" />
          <Step idx={4} title="Guided Apply" desc="Follow our step-by-step guidance. We auto-fill forms and guide you through submission." icon={<Zap className="w-10 h-10 text-white" />} bg="from-orange-500 to-orange-600" badge="text-orange-600 bg-orange-50" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-4">Ready to Get Funded?</h3>
          <p className="text-xl text-blue-100 mb-8">Join hundreds of businesses saving 20+ hours per application</p>
          <button onClick={isLoggedIn ? onCta : onSignup} className="bg-white text-blue-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition shadow-lg">Start Your Free Trial</button>
          <p className="text-sm text-blue-200 mt-4">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}

function SearchView({ isLoggedIn, user, items, q, setQ, type, setType, loading, error, onApply, onLoadGrants }) {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Find Your Perfect Match</h2>
          <p className="text-xl text-blue-100 mb-8">{isLoggedIn ? `Showing opportunities for ${user.city || ""}${user.state ? ", " + user.state : ""} and nationwide` : "Sign in to see personalized matches"}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search grants, loans, scholarships…" className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-6 py-4 rounded-lg text-gray-900">
              <option value="all">All Types</option>
              <option value="grant">Grants</option>
              <option value="loan">Loans</option>
              <option value="scholarship">Scholarships</option>
            </select>
            <button
            onClick={onLoadGrants}
            className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg"
          >
            🔄 Load Federal Grants
          </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{loading ? "Loading…" : `${items.length} Opportunities Found`}</h3>
          {error ? <p className="text-red-600 mt-1">{error}</p> : <p className="text-gray-600">Sorted by best match for your profile</p>}
        </div>
        <div className="space-y-6">
          {items.map((opp) => (
            <OppCard key={opp.id} opp={opp} isLoggedIn={isLoggedIn} onApply={() => onApply(opp)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertyView({
  propertyAddress,
  setPropertyAddress,
  ozResult,
  showFinancingOptions,
  checkOpportunityZone,
  financingOptions,
  selectedFinancingType,
  setSelectedFinancingType,
  showLoanOfficerPortal,
  setShowLoanOfficerPortal,
  loanOfficerDocs,
  setLoanOfficerDocs,
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Financing & Opportunity Zones</h1>
        <p className="text-gray-600">Check if your property is in an Opportunity Zone and explore financing options</p>
      </div>

      {/* Opportunity Zone Checker */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-start space-x-4 mb-6">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Opportunity Zone Checker</h2>
            <p className="text-gray-600">Enter a property address to check if it's in a federally designated Opportunity Zone and see available tax benefits</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Address</label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="e.g., 1234 Market St, Philadelphia, PA 19122"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => checkOpportunityZone(propertyAddress)}
                disabled={!propertyAddress}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Check Zone
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">💡 Tip: Philadelphia OZ zip codes include 19122, 19124, 19132, 19133, 19134, 19140, 19141, 19143, 19145, 19146</p>
          </div>

          {ozResult && (
            <div className={`border-2 ${ozResult.isOpportunityZone ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"} rounded-lg p-6 mt-6`}>
              {ozResult.isOpportunityZone ? (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="text-xl font-bold text-green-900">✓ Opportunity Zone Property!</h3>
                      <p className="text-sm text-green-700">{ozResult.address}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                        <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                        Tax Benefits Available
                      </h4>
                      <ul className="space-y-2">
                        {ozResult.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                        <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                        Available Programs
                      </h4>
                      <div className="space-y-3">
                        {ozResult.programs.map((program, idx) => (
                          <div key={idx} className="border-l-4 border-green-500 pl-4">
                            <h5 className="font-semibold text-sm">{program.name}</h5>
                            <p className="text-xs text-gray-600">{program.type}</p>
                            <p className="text-sm font-bold text-green-700">{program.amount}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-bold text-blue-900 mb-2">Zone Demographics</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Median Income</div>
                        <div className="font-bold text-blue-900">{ozResult.stats.medianIncome}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Poverty Rate</div>
                        <div className="font-bold text-blue-900">{ozResult.stats.povertyRate}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Population</div>
                        <div className="font-bold text-blue-900">{ozResult.stats.population}</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <X className="w-8 h-8 text-yellow-600" />
                    <div>
                      <h3 className="text-xl font-bold text-yellow-900">Not in an Opportunity Zone</h3>
                      <p className="text-sm text-yellow-700">{ozResult.address}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{ozResult.suggestion}</p>
                  <p className="text-sm text-gray-600">Nearest Opportunity Zone: {ozResult.nearestOZ}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financing Options */}
      {showFinancingOptions && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Property Financing Options</h2>
              <p className="text-gray-600">Compare different financing options for your property purchase</p>
            </div>
          </div>

          <div className="grid gap-6">
            {financingOptions.map((option) => (
              <div
                key={option.type}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer"
                onClick={() => setSelectedFinancingType(option)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{option.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{option.bestFor}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Down Payment</div>
                        <div className="font-semibold text-green-700">{option.downPayment}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Credit Score</div>
                        <div className="font-semibold">{option.minCreditScore}+</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Interest Rate</div>
                        <div className="font-semibold">{option.interestRate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Loan Terms</div>
                        <div className="font-semibold">{option.terms}</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-semibold text-green-700 mb-1">✓ Pros:</div>
                        <ul className="space-y-1 text-gray-600">
                          {option.pros.map((pro, idx) => (
                            <li key={idx}>• {pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-red-700 mb-1">✗ Cons:</div>
                        <ul className="space-y-1 text-gray-600">
                          {option.cons.map((con, idx) => (
                            <li key={idx}>• {con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mt-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to Apply?</h3>
                <p className="text-gray-700 mb-4">Connect with a loan officer who can help you get approved faster</p>
                <button
                  onClick={() => setShowLoanOfficerPortal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Connect with Loan Officer
                </button>
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">78%</div>
                  <div className="text-sm text-gray-600">Approval Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Officer Portal Modal */}
      {showLoanOfficerPortal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowLoanOfficerPortal(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Connect with Loan Officer</h2>
                  <p className="text-gray-600">Upload your documents and we'll match you with an experienced loan officer</p>
                </div>
                <button onClick={() => setShowLoanOfficerPortal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <UserCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Your information is secure</h4>
                    <p className="text-sm text-blue-800">All documents are encrypted and only shared with licensed loan officers</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-3">Required Documents</h3>
                  <div className="space-y-2">
                    {["Driver's License or State ID", "Last 2 Years Tax Returns", "Last 3 Months Bank Statements", "Last 2 Pay Stubs", "Proof of Down Payment"].map(
                      (doc, idx) => (
                        <div key={idx} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium">{doc}</span>
                          </div>
                          <button
                            onClick={() => {
                              setLoanOfficerDocs([...loanOfficerDocs, doc]);
                              alert(`✅ ${doc} uploaded successfully!`);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center space-x-1"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {loanOfficerDocs.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-green-900 mb-2">Uploaded Documents ({loanOfficerDocs.length})</h4>
                    <div className="space-y-1">
                      {loanOfficerDocs.map((doc, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information (Optional)</label>
                  <textarea
                    placeholder="Tell us about your property purchase plans, timeline, or any questions..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowLoanOfficerPortal(false);
                    alert("🎉 Documents Submitted!\n\nA licensed loan officer will review your documents and contact you within 24 hours.");
                  }}
                  disabled={loanOfficerDocs.length === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit to Loan Officer
                </button>

                <p className="text-xs text-center text-gray-500">By submitting, you agree to be contacted by licensed loan officers in our network</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financing Type Detail Modal */}
      {selectedFinancingType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedFinancingType(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedFinancingType.name}</h2>
                <button onClick={() => setSelectedFinancingType(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-2">Overview</h3>
                  <p className="text-gray-700">{selectedFinancingType.bestFor}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Down Payment</div>
                    <div className="text-xl font-bold text-green-700">{selectedFinancingType.downPayment}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Min Credit Score</div>
                    <div className="text-xl font-bold">{selectedFinancingType.minCreditScore}+</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Interest Rate</div>
                    <div className="text-xl font-bold">{selectedFinancingType.interestRate}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Max Loan Amount</div>
                    <div className="text-xl font-bold">{selectedFinancingType.maxLoanAmount}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2 text-green-700">Advantages</h3>
                  <ul className="space-y-2">
                    {selectedFinancingType.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-2 text-red-700">Disadvantages</h3>
                  <ul className="space-y-2">
                    {selectedFinancingType.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start">
                        <X className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Ready to explore this option?</h4>
                  <p className="text-sm text-blue-800 mb-3">Connect with a loan officer who specializes in {selectedFinancingType.name}s</p>
                  <button
                    onClick={() => {
                      setSelectedFinancingType(null);
                      setShowLoanOfficerPortal(true);
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ user, onFind }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">Welcome back, {user?.name || "User"}!</h2>
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Tile title="Applications" value="12" sub="+3 this month" icon={<span className="inline-flex"><Clock className="w-5 h-5 text-blue-600" /></span>} />
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-green-100 text-sm font-medium">Approved</h3>
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold">5</div>
          <div className="text-sm text-green-100 mt-1">42% success rate</div>
        </div>
        <Tile title="Total Funded" value="$185K" sub="of $450K requested" icon={<span className="inline-flex"><DollarSign className="w-5 h-5 text-green-600" /></span>} />
        <Tile title="Time Saved" value="336" sub="hours total" icon={<span className="inline-flex"><Clock className="w-5 h-5 text-purple-600" /></span>} />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <ActionCard onClick={onFind} title="Find Opportunities" desc="Search 5,000+ grants, loans, and scholarships" icon={<Search className="w-12 h-12 text-blue-600 mb-4" />} borderHover="hover:border-blue-500" />
        <ActionCard onClick={() => alert("Opening document vault… (demo)")} title="Upload Documents" desc="Add more documents to your vault" icon={<Upload className="w-12 h-12 text-green-600 mb-4" />} borderHover="hover:border-green-500" />
        <ActionCard onClick={() => alert("Checking for new matches… (demo)")} title="New Matches" desc="3 new opportunities match your profile" icon={<Target className="w-12 h-12 text-purple-600 mb-4" />} borderHover="hover:border-purple-500" />
      </div>
    </div>
  );
}

function LoginModal({ onClose, onSubmit, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setErr("");
    try {
      await onSubmit(email, password);
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center mb-6">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600">Sign in to access your account</p>
      </div>
      <div className="space-y-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button onClick={submit} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60">{submitting ? "Signing in…" : "Sign In"}</button>
        <button onClick={onSwitch} className="w-full text-blue-600 py-2 hover:underline">Create Account</button>
      </div>
    </Modal>
  );
}

function SignupModal({ onClose, onSubmit, onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setErr("");
    try {
      await onSubmit(name, email, password);
    } catch (e) {
      setErr(e.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center mb-6">
        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Start Your Free Trial</h2>
        <p className="text-gray-600">No credit card required</p>
      </div>
      <div className="space-y-4">
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button onClick={submit} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60">{submitting ? "Creating…" : "Create Account"}</button>
        <button onClick={onSwitch} className="w-full text-blue-600 py-2 hover:underline text-sm">Already have an account? Sign in</button>
      </div>
    </Modal>
  );
}

function PricingModal({ onClose }) {
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Choose Your Plan</h2>
          <p className="text-gray-600">Select the plan that best fits your needs</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
      </div>
      <div className="grid md:grid-cols-4 gap-6">
        <Plan title="Free" price="$0/mo" perks={["1 application/month","5 documents","Basic search"]} cta="Current Plan" kind="neutral" />
        <Plan title="Starter" price="$49/mo" perks={["5 applications/month","Unlimited documents","Auto financials","Email reminders"]} cta="Upgrade Now" highlight="POPULAR" border="border-blue-500" button="bg-blue-600 hover:bg-blue-700 text-white" />
        <Plan title="Professional" price="$149/mo" perks={["Unlimited applications","Priority support","1 expert review/mo","Business plan generator"]} cta="Upgrade Now" highlight="BEST VALUE" border="border-purple-500" bg="from-purple-50 to-blue-50" button="bg-purple-600 hover:bg-purple-700 text-white" />
        <Plan title="Enterprise" price="Custom" perks={["Multiple users","Account manager","Custom integrations","Unlimited reviews"]} cta="Contact Sales" button="bg-gray-800 hover:bg-gray-900 text-white" />
      </div>
      <div className="mt-8 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
          <p className="text-green-800 font-semibold">💰 90-Day Money-Back Guarantee</p>
          <p className="text-sm text-green-700">Get funded or get your money back. No questions asked.</p>
        </div>
      </div>
    </Modal>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="w-6 h-6" />
              <span className="text-xl font-bold">GrantTally</span>
            </div>
            <p className="text-gray-400 text-sm">Apply to grants and loans in minutes with AI-powered automation.</p>
          </div>
          <FooterCol title="Product" links={["How It Works","Pricing","Features"]} />
          <FooterCol title="Resources" links={["Blog","Help Center","Contact"]} />
          <FooterCol title="Legal" links={["Privacy Policy","Terms of Service"]} />
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} GrantTally. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// --- UI Bits ---
function Stat({ label, value }) {
  return (
    <div>
      <div className="text-4xl font-bold mb-2">{value}</div>
      <div className="text-blue-100 text-sm">{label}</div>
    </div>
  );
}

function Step({ idx, title, desc, icon, bg, badge }) {
  return (
    <div className="text-center">
      <div className={`bg-gradient-to-br ${bg} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>{icon}</div>
      <div className={`rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 font-bold ${badge}`}>{idx}</div>
      <h4 className="font-bold text-xl mb-3">{title}</h4>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}

function Tile({ title, value, sub, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{sub}</div>
    </div>
  );
}

function ActionCard({ onClick, title, desc, icon, borderHover }) {
  return (
    <button onClick={onClick} className={`bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition border-2 border-transparent ${borderHover}`}>
      {icon}
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </button>
  );
}

function OppCard({ opp, isLoggedIn, onApply }) {
  const pillType = opp.type === "grant" ? "bg-green-100 text-green-700" : opp.type === "loan" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";
  const pillScope = opp.scope === "local" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pillType}`}>
              {opp.type === "grant" ? "🎁 Grant" : opp.type === "loan" ? "💰 Loan" : "🎓 Scholarship"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pillScope}`}>
              {opp.scope === "local" ? "📍 Local" : "🌎 National"}
            </span>
            {typeof opp.matchScore === "number" && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{opp.matchScore}% Match</span>
            )}
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">{opp.title}</h4>
          <p className="text-sm text-gray-600 mb-4">{opp.description}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Meta icon={<DollarSign className="w-4 h-4 mr-2 text-green-600" />} label={opp.amount} />
            <Meta icon={<Clock className="w-4 h-4 mr-2 text-blue-600" />} label={opp.processingTime} />
            <Meta icon={<CheckCircle className="w-4 h-4 mr-2 text-green-600" />} label={opp.approvalRate} sub="Approval" />
            <Meta icon={<Calendar className="w-4 h-4 mr-2 text-purple-600" />} label={opp.deadline} />
          </div>
        </div>
        <div className="lg:w-64 flex flex-col gap-3">
          {isLoggedIn ? (
            <>
              <button onClick={onApply} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Start Guided Apply
              </button>
              <button onClick={() => alert("Expert review checkout… (demo)")} className="w-full border-2 border-purple-600 text-purple-600 py-2 rounded-lg font-semibold hover:bg-purple-50 transition text-sm flex items-center justify-center gap-2">
                <UserCheck className="w-4 h-4" />
                Expert Review ($99)
              </button>
            </>
          ) : (
            <button onClick={() => alert("Please sign in to apply.")} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Sign In to Apply</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, label, sub }) {
  return (
    <div className="flex items-center text-sm">
      {icon}
      <div>
        <div className="font-semibold text-gray-900">{label}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
    </div>
  );
}

function FooterCol({ title, links = [] }) {
  return (
    <div>
      <h4 className="font-semibold mb-4">{title}</h4>
      <ul className="space-y-2 text-gray-400 text-sm">
        {links.map((l) => (
          <li key={l}><a href="#" className="hover:text-white transition">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={`bg-white rounded-xl ${wide ? "max-w-6xl" : "max-w-md"} w-full p-8`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Plan({ title, price, perks, cta, highlight, border = "border-gray-200", bg = "", button = "bg-gray-100 text-gray-700" }) {
  return (
    <div className={`border-2 ${border} rounded-xl p-6 relative ${bg ? `bg-gradient-to-br ${bg}` : ""}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold">
          {highlight}
        </div>
      )}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <div className="text-3xl font-bold mb-4">{price}</div>
      <ul className="space-y-2 text-sm mb-6">
        {perks.map((p) => (
          <li key={p} className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />{p}</li>
        ))}
      </ul>
      <button className={`w-full py-2 rounded-lg font-semibold ${button}`}>{cta}</button>
    </div>
  );
}

// Small helpers
function mapUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || u.email?.split("@")[0],
    plan: "professional",
    businessName: u.user_metadata?.businessName || "",
    city: u.user_metadata?.city || "Philadelphia",
    state: u.user_metadata?.state || "PA",
  };
}
