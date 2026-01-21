'use client'

import { useState } from 'react'
import LeagueOverview from '../components/LeagueOverview'
import TeamVsLeague from '../components/TeamVsLeague'
import Chatbot from '../components/Chatbot'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview')
  const [chatbotOpen, setChatbotOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-2 md:p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
          <h1 className="text-xl md:text-2xl font-bold">🏀 Las Puntas Dynasty League</h1>
          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base w-full md:w-auto"
          >
            {chatbotOpen ? 'Close' : 'Open'} Trash Talk AI
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 md:px-6 md:py-3 text-sm md:text-base transition-colors ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              League Overview
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 md:px-6 md:py-3 text-sm md:text-base transition-colors ${
                activeTab === 'team' 
                  ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Team vs League
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto p-2 md:p-4 pb-20">
        {activeTab === 'overview' && <LeagueOverview apiBase={API_BASE} />}
        {activeTab === 'team' && <TeamVsLeague apiBase={API_BASE} />}
      </main>

      {/* Chatbot Sidebar */}
      {chatbotOpen && <Chatbot apiBase={API_BASE} onClose={() => setChatbotOpen(false)} />}
    </div>
  )
}
