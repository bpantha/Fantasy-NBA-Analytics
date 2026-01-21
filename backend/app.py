"""
Flask backend API for Fantasy Basketball Analytics
Serves analytics data and handles chatbot queries
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Path to analytics data
DATA_DIR = Path(__file__).parent.parent / 'data' / 'analytics'
DATA_DIR.mkdir(parents=True, exist_ok=True)

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/weeks', methods=['GET'])
def get_available_weeks():
    """Get list of available matchup periods"""
    weeks = []
    for file in DATA_DIR.glob('week*.json'):
        week_num = file.stem.replace('week', '')
        try:
            week_num = int(week_num)
            weeks.append(week_num)
        except:
            continue
    return jsonify({'weeks': sorted(weeks)})

@app.route('/api/week/<int:week>', methods=['GET'])
def get_week_data(week):
    """Get analytics data for a specific week"""
    file_path = DATA_DIR / f'week{week}.json'
    if not file_path.exists():
        return jsonify({'error': f'Week {week} data not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/league/summary', methods=['GET'])
def get_league_summary():
    """Get league summary data"""
    file_path = DATA_DIR / 'league_summary.json'
    if not file_path.exists():
        return jsonify({'error': 'League summary not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all player data"""
    file_path = DATA_DIR / 'players.json'
    if not file_path.exists():
        return jsonify({'error': 'Player data not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Get all teams data"""
    file_path = DATA_DIR / 'teams.json'
    if not file_path.exists():
        return jsonify({'error': 'Teams data not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/compare/<team1>/<team2>', methods=['GET'])
def compare_teams(team1, team2):
    """Compare two teams - returns data for both teams"""
    # Get latest week data
    weeks = []
    for file in DATA_DIR.glob('week*.json'):
        try:
            week_num = int(file.stem.replace('week', ''))
            weeks.append(week_num)
        except:
            continue
    
    if not weeks:
        return jsonify({'error': 'No week data available'}), 404
    
    latest_week = max(weeks)
    file_path = DATA_DIR / f'week{latest_week}.json'
    
    with open(file_path, 'r') as f:
        week_data = json.load(f)
    
    # Find teams in data
    team1_data = None
    team2_data = None
    
    for team in week_data.get('teams', []):
        if team.get('name', '').lower() == team1.lower():
            team1_data = team
        if team.get('name', '').lower() == team2.lower():
            team2_data = team
    
    if not team1_data or not team2_data:
        return jsonify({'error': 'One or both teams not found'}), 404
    
    return jsonify({
        'team1': team1_data,
        'team2': team2_data,
        'week': latest_week
    })

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    """Handle chatbot queries using Hugging Face LLM"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        
        # Load all available data
        all_data = {}
        
        # Load league summary
        summary_path = DATA_DIR / 'league_summary.json'
        if summary_path.exists():
            with open(summary_path, 'r') as f:
                all_data['league_summary'] = json.load(f)
        
        # Load latest week
        weeks = []
        for file in DATA_DIR.glob('week*.json'):
            try:
                week_num = int(file.stem.replace('week', ''))
                weeks.append(week_num)
            except:
                continue
        
        if weeks:
            latest_week = max(weeks)
            week_path = DATA_DIR / f'week{latest_week}.json'
            with open(week_path, 'r') as f:
                all_data['latest_week'] = json.load(f)
        
        # Load players
        players_path = DATA_DIR / 'players.json'
        if players_path.exists():
            with open(players_path, 'r') as f:
                all_data['players'] = json.load(f)
        
        # Use Hugging Face Inference API
        response = query_huggingface_llm(query, all_data)
        
        return jsonify({'response': response})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def query_huggingface_llm(query, context_data):
    """Query Hugging Face LLM with context"""
    import requests
    
    # Use a free Hugging Face model - try multiple models as fallback
    # Using smaller, more reliable models for free tier
    API_URLS = [
        "https://api-inference.huggingface.co/models/google/flan-t5-base",
        "https://api-inference.huggingface.co/models/gpt2",
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-small"
    ]
    headers = {"Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_KEY', '')}"}
    
    # Format context as text
    context_text = json.dumps(context_data, indent=2)
    
    # Create prompt
    prompt = f"""You are a fantasy basketball analytics assistant. Answer questions based on the following data:

{context_text}

User question: {query}

Provide a clear, concise answer based only on the data provided above. If the data doesn't contain the answer, say so."""

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 500,
            "temperature": 0.7,
            "return_full_text": False
        }
    }
    
    # Try each API URL as fallback
    for api_url in API_URLS:
        try:
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                # Handle different response formats
                if isinstance(result, list) and len(result) > 0:
                    text = result[0].get('generated_text', '')
                    if text:
                        return text
                elif isinstance(result, dict):
                    text = result.get('generated_text', '') or result.get('text', '')
                    if text:
                        return text
                elif isinstance(result, str):
                    return result
        except requests.exceptions.RequestException as e:
            continue  # Try next URL
        except Exception as e:
            continue
    
    # If all fail, provide a helpful response based on the query
    query_lower = query.lower()
    if 'team' in query_lower or 'beat' in query_lower or 'win' in query_lower:
        return "Check out the leaderboard above to see which teams are dominating! 💪"
    elif 'player' in query_lower:
        return "Player stats are coming soon! For now, check out the team performance metrics."
    else:
        return "I'm having trouble with that question right now. Try asking about teams, wins, or matchups! 🏀"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
