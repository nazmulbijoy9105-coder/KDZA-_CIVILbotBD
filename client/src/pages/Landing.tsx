import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/chat");
    } else {
      // Trigger login
      window.location.href = "/api/oauth/login";
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navigation */}
      <nav className="border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-2xl font-black tracking-tighter">KDZA</div>
          <div className="text-sm font-bold tracking-wide">LEGAL LITERACY</div>
        </div>
      </nav>

      {/* Hero Section - Brutalist Typography */}
      <section className="border-b-8 border-black">
        <div className="max-w-7xl mx-auto px-4 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Massive Typography */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="text-8xl lg:text-9xl font-black leading-none tracking-tighter">
                CIVIL
              </div>
              <div className="text-8xl lg:text-9xl font-black leading-none tracking-tighter">
                DISPUTE
              </div>
              <div className="text-8xl lg:text-9xl font-black leading-none tracking-tighter">
                ENGINE
              </div>
            </div>

            <div className="border-l-8 border-black pl-8 space-y-4">
              <p className="text-lg font-bold leading-relaxed">
                Understand Bangladesh civil law through structured legal analysis. Get instant insights into your dispute's jurisdiction, applicable law, and potential outcomes.
              </p>
              <p className="text-sm font-mono tracking-wide">
                14-STAGE REASONING ENGINE
              </p>
            </div>
          </div>

          {/* Right: Visual Element */}
          <div className="hidden lg:block">
            <div className="space-y-4">
              <div className="border-4 border-black p-8 bg-white">
                <div className="text-5xl font-black mb-4">⚖️</div>
                <p className="text-sm font-bold tracking-wider mb-4">
                  JURISDICTION ANALYSIS
                </p>
                <p className="text-xs leading-relaxed">
                  Automatic court assignment based on claim amount and property location
                </p>
              </div>
              <div className="border-4 border-black p-8 bg-white">
                <div className="text-5xl font-black mb-4">📋</div>
                <p className="text-sm font-bold tracking-wider mb-4">
                  LEGAL CLASSIFICATION
                </p>
                <p className="text-xs leading-relaxed">
                  Identify relief sought and applicable legal frameworks
                </p>
              </div>
              <div className="border-4 border-black p-8 bg-white">
                <div className="text-5xl font-black mb-4">⏱️</div>
                <p className="text-sm font-bold tracking-wider mb-4">
                  LIMITATION ANALYSIS
                </p>
                <p className="text-xs leading-relaxed">
                  Check time-barred claims under relevant statutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b-8 border-black">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-6xl font-black mb-16 tracking-tighter">
            HOW IT WORKS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="border-4 border-black p-8 space-y-4">
              <div className="text-5xl font-black">01</div>
              <h3 className="text-2xl font-black tracking-tight">
                DESCRIBE YOUR DISPUTE
              </h3>
              <p className="text-sm leading-relaxed">
                Tell us about your civil dispute in plain language. Include details about the parties, property, documents, and relief sought.
              </p>
              <p className="text-xs font-mono tracking-wider text-gray-600">
                বিবাদের বিবরণ দিন
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border-4 border-black p-8 space-y-4">
              <div className="text-5xl font-black">02</div>
              <h3 className="text-2xl font-black tracking-tight">
                AI FACT EXTRACTION
              </h3>
              <p className="text-sm leading-relaxed">
                Our LLM-powered system extracts key facts and maps them to legal categories automatically.
              </p>
              <p className="text-xs font-mono tracking-wider text-gray-600">
                তথ্য নিষ্কাশন
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border-4 border-black p-8 space-y-4">
              <div className="text-5xl font-black">03</div>
              <h3 className="text-2xl font-black tracking-tight">
                14-STAGE ENGINE
              </h3>
              <p className="text-sm leading-relaxed">
                The dispute engine runs through 14 stages of legal analysis: jurisdiction, limitation, registration, substantive law, and relief determination.
              </p>
              <p className="text-xs font-mono tracking-wider text-gray-600">
                আইনি বিশ্লেষণ
              </p>
            </div>

            {/* Feature 4 */}
            <div className="border-4 border-black p-8 space-y-4">
              <div className="text-5xl font-black">04</div>
              <h3 className="text-2xl font-black tracking-tight">
                STRUCTURED OUTCOME
              </h3>
              <p className="text-sm leading-relaxed">
                Receive a detailed report with assigned court, case track, reasoning chain, and final decision.
              </p>
              <p className="text-xs font-mono tracking-wider text-gray-600">
                সিদ্ধান্ত প্রতিবেদন
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="border-b-8 border-black bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-5xl font-black mb-8 tracking-tighter">
            LEGAL DISCLAIMER
          </div>
          <div className="border-l-8 border-white pl-8 space-y-4 text-sm leading-relaxed">
            <p>
              <strong>This is for legal literacy only, not legal advice.</strong> KDZA provides educational analysis of Bangladesh civil law for general understanding purposes. It is not a substitute for professional legal advice.
            </p>
            <p>
              For actual legal advice, representation, or proceedings, you must consult with a lawyer enrolled with the Bangladesh Bar Council. Only a qualified advocate can provide legal advice tailored to your specific situation.
            </p>
            <p>
              The information provided is based on current law as of the date of analysis and may not reflect recent amendments. Use this tool at your own risk. KDZA and its creators are not liable for any consequences arising from reliance on this analysis.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b-8 border-black">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="text-6xl font-black tracking-tighter leading-tight">
                START YOUR LEGAL ANALYSIS
              </div>
              <p className="text-lg leading-relaxed">
                Begin by describing your civil dispute. Our AI-powered system will extract the facts and run them through the 14-stage Bangladesh Civil Dispute Engine.
              </p>
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-black text-white border-2 border-black text-lg font-bold px-8 py-6 hover:bg-white hover:text-black transition-colors"
              >
                GET STARTED →
              </Button>
            </div>

            <div className="border-4 border-black p-12 bg-gray-50 space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-mono tracking-wider text-gray-600">
                  SUPPORTED DISPUTE TYPES
                </div>
                <ul className="text-sm space-y-1 font-bold">
                  <li>• Property / Land Disputes</li>
                  <li>• Money & Contract Disputes</li>
                  <li>• Artha Rin (Certificate Suits)</li>
                  <li>• Revenue & Tenancy Matters</li>
                  <li>• Specific Relief Claims</li>
                </ul>
              </div>
              <div className="border-t-2 border-black pt-6">
                <div className="text-sm font-mono tracking-wider text-gray-600 mb-2">
                  BILINGUAL INTERFACE
                </div>
                <p className="text-xs">
                  English & Bengali labels for all legal terms
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <div className="font-black text-lg mb-4">KDZA</div>
              <p className="text-xs leading-relaxed">
                Bangladesh Civil Dispute Legal Literacy Engine
              </p>
            </div>
            <div>
              <div className="font-black mb-4">LEGAL</div>
              <p className="text-xs leading-relaxed">
                For legal advice, consult a Bangladesh Bar Council enrolled advocate.
              </p>
            </div>
            <div>
              <div className="font-black mb-4">CONTACT</div>
              <p className="text-xs leading-relaxed">
                For inquiries or feedback, reach out to our team.
              </p>
            </div>
          </div>
          <div className="border-t-2 border-black mt-8 pt-8 text-xs text-center text-gray-600">
            © 2026 KDZA Legal Literacy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
