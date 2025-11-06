import { usePrivy } from "@privy-io/react-auth";

export function LandingPage() {
  const { login } = usePrivy();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-8 sm:space-y-12">
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight">
            Hold My Yield
          </h1>
          <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
            Automatically move your assets between Morpho and Aave to earn the
            best yields. No babysitting required.
          </p>
        </div>

        <button
          onClick={login}
          className="w-full sm:w-auto px-5 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
