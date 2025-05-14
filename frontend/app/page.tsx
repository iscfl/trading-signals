import TradingDashboard from "@/components/trading-dashboard"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Trading Signal Dashboard</h1>
        <TradingDashboard />
      </div>
    </main>
  )
}
