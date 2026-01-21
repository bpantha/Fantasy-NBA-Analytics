'use client'

import { useState, useEffect } from 'react'
import TeamVsLeague from '../components/TeamVsLeague'
import Chatbot from '../components/Chatbot'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function Home() {
  const [chatbotOpen, setChatbotOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🏀 Las Puntas Dynasty League</h1>
          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            {chatbotOpen ? 'Close' : 'Open'} Trash Talk AI
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 pb-20">
        <TeamVsLeague apiBase={API_BASE} />
      </main>

      {/* Chatbot Sidebar */}
      {chatbotOpen && <Chatbot apiBase={API_BASE} onClose={() => setChatbotOpen(false)} />}
    </div>
  )
}
