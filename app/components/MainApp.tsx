"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

export default function MainApp() {
  const { user, logout } = usePrivy();
  const [activeTab, setActiveTab] = useState<"dashboard" | "portfolio" | "settings">("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                Hold My Yield
              </span>
            </div>

            {/* User section */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user?.email?.address || user?.wallet?.address?.slice(0, 6) + "..." + user?.wallet?.address?.slice(-4)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connected</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "dashboard"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "portfolio"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "settings"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Balance</h3>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💰</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">$0.00</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">+0.00% this week</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Current APY</h3>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📈</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">0.00%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Optimized rate</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Earned</h3>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-xl">✨</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">$0.00</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">All time</p>
              </div>
            </div>

            {/* Action Card */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-2">Start Earning Today</h2>
              <p className="text-purple-100 mb-6">
                Deposit your assets and let us automatically optimize your yields across Morpho and Aave.
              </p>
              <button className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-lg">
                Deposit Assets
              </button>
            </div>

            {/* Protocol Status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Protocol Rates</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center font-bold text-purple-600 dark:text-purple-400">
                      M
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Morpho</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">USDC Pool</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">5.24%</p>
                    <p className="text-sm text-green-600 dark:text-green-400">APY</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                      A
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Aave</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">USDC Pool</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">4.87%</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">APY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Content */}
        {activeTab === "portfolio" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Your Portfolio</h2>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">No assets deposited yet</p>
              <button className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                Deposit Your First Asset
              </button>
            </div>
          </div>
        )}

        {/* Settings Content */}
        {activeTab === "settings" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account</h3>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-900 dark:text-white font-mono break-all">
                    {user?.email?.address || user?.wallet?.address || "Not connected"}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Auto-Optimization</h3>
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                  <span className="text-slate-900 dark:text-white">Enable automatic yield optimization</span>
                  <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" defaultChecked />
                </label>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notifications</h3>
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                  <span className="text-slate-900 dark:text-white">Email notifications</span>
                  <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

