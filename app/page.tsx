"use client";
import { usePrivy } from "@privy-io/react-auth";
import { LandingPage } from "@/components/LandingPage";
import { MainApp } from "@/components/MainApp";

export default function Home() {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authenticated) {
    return <MainApp />;
  }

  return <LandingPage />;
}
