"use client";
import { usePrivy } from "@privy-io/react-auth";
import { LandingPage } from "@/components/LandingPage";
import { MainApp } from "@/components/MainApp";

export default function Home() {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (authenticated) {
    return <MainApp />;
  }

  return <LandingPage />;
}
