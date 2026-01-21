'use client'

import { useState, useEffect } from 'react'
import TeamComparison from '../components/TeamComparison'
import LeagueRankings from '../components/LeagueRankings'
import Chatbot from '../components/Chatbot'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'compare' | 'rankings'>('compare')
  const [chatbotOpen, setChatbotOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🏀 Fantasy Basketball Analytics</h1>
          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            {chatbotOpen ? 'Close' : 'Open'} Chatbot
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 pb-20">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 ${activeTab === 'compare' ? 'border-b-2 border-blue-500' : ''}`}
          >
            Team vs Team
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 ${activeTab === 'rankings' ? 'border-b-2 border-blue-500' : ''}`}
          >
            Team vs League
          </button>
        </div>

        {/* Content */}
        {activeTab === 'compare' && <TeamComparison apiBase={API_BASE} />}
        {activeTab === 'rankings' && <LeagueRankings apiBase={API_BASE} />}
      </main>

      {/* Chatbot Sidebar */}
      {chatbotOpen && <Chatbot apiBase={API_BASE} onClose={() => setChatbotOpen(false)} />}
    </div>
  )
}
