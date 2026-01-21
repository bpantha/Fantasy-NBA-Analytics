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

@app.route('/api/league/stats', methods=['GET'])
def get_league_stats():
    """Get aggregated league statistics across all weeks"""
    from collections import defaultdict
    
    # Load all week data
    all_weeks_data = []
    weeks = []
    for file in sorted(DATA_DIR.glob('week*.json')):
        week_num = file.stem.replace('week', '')
        try:
            week_num = int(week_num)
            weeks.append(week_num)
            with open(file, 'r') as f:
                all_weeks_data.append(json.load(f))
        except:
            continue
    
    if not all_weeks_data:
        return jsonify({'error': 'No week data available'}), 404
    
    # Load league summary for overall wins
    summary_path = DATA_DIR / 'league_summary.json'
    league_summary = {}
    if summary_path.exists():
        with open(summary_path, 'r') as f:
            league_summary = json.load(f)
    
    # Aggregate data
    team_stats = defaultdict(lambda: {
        'total_teams_beaten': 0,
        'total_category_wins': 0,
        'total_minutes': 0,
        'weeks_played': 0,
        'weekly_teams_beaten': [],
        'category_wins': defaultdict(int),
        'category_wins_list': defaultdict(list),  # For std dev calculation
        'matchup_history': defaultdict(lambda: {'wins': 0, 'losses': 0, 'total': 0}),
        'best_week': {'week': 0, 'teams_beaten': 0},
        'scheduled_opponent_wins': [],  # Track wins vs scheduled opponent (5-4-0 or better)
        'scheduled_opponent_weeks': [],  # Track which weeks
        'current_streak': 0,
        'longest_streak': 0,
        'recent_performance': [],
        'opponent_matchups': defaultdict(list)  # Track best/worst matchups
    })
    
    # Get current week from league summary to exclude it from streaks
    current_week = league_summary.get('current_matchup_period', len(all_weeks_data))
    
    # Process each week
    for week_idx, week_data in enumerate(all_weeks_data):
        week_num = week_data.get('matchup_period', week_idx + 1)
        is_current_week = (week_num == current_week)
        
        for team in week_data.get('teams', []):
            team_name = team.get('name', '')
            if not team_name:
                continue
            
            stats = team_stats[team_name]
            stats['weeks_played'] += 1
            
            # Teams beaten this week (cross-matchup comparison)
            teams_beaten_this_week = 0
            for opponent, details in team.get('matchup_details', {}).items():
                if details.get('won', 0) >= 5:
                    teams_beaten_this_week += 1
                    stats['matchup_history'][opponent]['wins'] += 1
                    stats['matchup_history'][opponent]['total'] += 1
                else:
                    stats['matchup_history'][opponent]['total'] += 1
                    if details.get('lost', 0) >= 5:
                        stats['matchup_history'][opponent]['losses'] += 1
            
            stats['total_teams_beaten'] += teams_beaten_this_week
            stats['weekly_teams_beaten'].append(teams_beaten_this_week)
            
            # Track scheduled opponent win (5-4-0 or better) - exclude current week
            opponent_name = team.get('opponent_name', '')
            if opponent_name and not is_current_week:
                opponent_details = team.get('matchup_details', {}).get(opponent_name, {})
                if opponent_details.get('won', 0) >= 5:
                    stats['scheduled_opponent_wins'].append(1)
                    stats['scheduled_opponent_weeks'].append(week_num)
                else:
                    stats['scheduled_opponent_wins'].append(0)
                    stats['scheduled_opponent_weeks'].append(week_num)
                
                # Track opponent matchup record
                stats['opponent_matchups'][opponent_name].append({
                    'week': week_num,
                    'won': opponent_details.get('won', 0),
                    'lost': opponent_details.get('lost', 0),
                    'result': 'win' if opponent_details.get('won', 0) >= 5 else 'loss'
                })
            
            # Track best week
            if teams_beaten_this_week > stats['best_week']['teams_beaten']:
                stats['best_week'] = {'week': week_num, 'teams_beaten': teams_beaten_this_week}
            
            # Category wins (for counting and std dev)
            for opponent, details in team.get('matchup_details', {}).items():
                for cat in details.get('won_cats', []):
                    stats['category_wins'][cat] += 1
                    stats['category_wins_list'][cat].append(1)
                # Also track losses for std dev
                for cat in ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']:
                    if cat not in details.get('won_cats', []) and cat not in details.get('lost_cats', []):
                        # Tied or not compared
                        pass
                    elif cat in details.get('lost_cats', []):
                        stats['category_wins_list'][cat].append(0)
            
            # Minutes
            stats['total_minutes'] += team.get('minutes_played', 0)
            
            # Recent performance (last 4 weeks, excluding current)
            if week_idx >= len(all_weeks_data) - 4 and not is_current_week:
                stats['recent_performance'].append(teams_beaten_this_week)
    
    # Calculate streaks (based on scheduled opponent wins, excluding current week)
    for team_name, stats in team_stats.items():
        # Current streak (from most recent backwards, excluding current week)
        streak = 0
        for win in reversed(stats['scheduled_opponent_wins']):
            if win == 1:
                streak += 1
            else:
                break
        stats['current_streak'] = streak
        
        # Longest streak (all-time)
        max_streak = 0
        current_run = 0
        for win in stats['scheduled_opponent_wins']:
            if win == 1:
                current_run += 1
                max_streak = max(max_streak, current_run)
            else:
                current_run = 0
        stats['longest_streak'] = max_streak
    
    # Calculate averages and metrics
    teams_list = []
    for team_name, stats in team_stats.items():
        avg_teams_beaten = stats['total_teams_beaten'] / stats['weeks_played'] if stats['weeks_played'] > 0 else 0
        variance = 0
        if len(stats['weekly_teams_beaten']) > 1:
            mean = avg_teams_beaten
            variance = sum((x - mean) ** 2 for x in stats['weekly_teams_beaten']) / len(stats['weekly_teams_beaten'])
        
        # Get overall wins from league summary
        overall_wins = 0
        win_pct = 0
        for team_summary in league_summary.get('teams', []):
            if team_summary.get('name') == team_name:
                overall_wins = team_summary.get('wins', 0)
                win_pct = team_summary.get('win_percentage', 0)
                break
        
        # Get logo_url from league summary
        logo_url = ''
        for team_summary in league_summary.get('teams', []):
            if team_summary.get('name') == team_name:
                logo_url = team_summary.get('logo_url', '')
                break
        
        teams_list.append({
            'name': team_name,
            'total_wins': overall_wins,
            'win_percentage': win_pct,
            'avg_teams_beaten': round(avg_teams_beaten, 2),
            'variance': round(variance, 2),
            'total_teams_beaten': stats['total_teams_beaten'],
            'total_minutes': round(stats['total_minutes'], 1),
            'efficiency': round(overall_wins / stats['total_minutes'] * 1000, 3) if stats['total_minutes'] > 0 else 0,
            'logo_url': logo_url
        })
    
    # Sort and find leaders
    results = {
        'overall_performance': {
            'total_wins_leader': max(teams_list, key=lambda x: x['total_wins']) if teams_list else None,
            'win_pct_leader': max(teams_list, key=lambda x: x['win_percentage']) if teams_list else None,
            'most_dominant': max(teams_list, key=lambda x: x['avg_teams_beaten']) if teams_list else None,
            'most_consistent': min(teams_list, key=lambda x: x['variance']) if teams_list else None
        },
        'category_performance': {},
        'activity_metrics': {},
        'streaks_trends': {},
        'head_to_head': {},
        'weekly_performance': {}
    }
    
    # Category Performance
    category_leaders = {}
    for cat in ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']:
        best_team = None
        best_count = 0
        for team_name, stats in team_stats.items():
            if stats['category_wins'][cat] > best_count:
                best_count = stats['category_wins'][cat]
                best_team = team_name
        if best_team:
            category_leaders[cat] = {'team': best_team, 'wins': best_count}
    
    # Most balanced (using standard deviation - lower is more balanced)
    balanced_scores = {}
    for team_name, stats in team_stats.items():
        if stats['weeks_played'] > 0:
            # Calculate std dev of category wins
            category_win_counts = list(stats['category_wins'].values())
            if len(category_win_counts) > 1:
                mean = sum(category_win_counts) / len(category_win_counts)
                variance = sum((x - mean) ** 2 for x in category_win_counts) / len(category_win_counts)
                std_dev = variance ** 0.5
                balanced_scores[team_name] = std_dev
            else:
                balanced_scores[team_name] = 0
    
    results['category_performance'] = {
        'category_leaders': category_leaders,
        'most_balanced': min(balanced_scores.items(), key=lambda x: x[1])[0] if balanced_scores else None
    }
    
    # Activity Metrics
    results['activity_metrics'] = {
        'most_active': max(teams_list, key=lambda x: x['total_minutes']) if teams_list else None,
        'minutes_leader': max(teams_list, key=lambda x: x['total_minutes']) if teams_list else None,
        'efficiency_leader': max(teams_list, key=lambda x: x['efficiency']) if teams_list else None
    }
    
    # Streaks & Trends
    hot_teams = []
    cold_teams = []
    for team_name, stats in team_stats.items():
        if len(stats['recent_performance']) >= 3:
            recent_avg = sum(stats['recent_performance']) / len(stats['recent_performance'])
            hot_teams.append({'name': team_name, 'avg': recent_avg})
            cold_teams.append({'name': team_name, 'avg': recent_avg})
    
    results['streaks_trends'] = {
        'current_streak_leaders': sorted(
            [{'name': name, 'streak': s['current_streak']} for name, s in team_stats.items()],
            key=lambda x: x['streak'], reverse=True
        )[:5],
        'longest_streak_leaders': sorted(
            [{'name': name, 'streak': s['longest_streak']} for name, s in team_stats.items()],
            key=lambda x: x['streak'], reverse=True
        )[:5],
        'hot_teams': sorted(hot_teams, key=lambda x: x['avg'], reverse=True)[:3],
        'cold_teams': sorted(cold_teams, key=lambda x: x['avg'])[:3]
    }
    
    # Best/Worst Matchups
    best_matchups = []
    worst_matchups = []
    for team_name, stats in team_stats.items():
        for opponent, matchups in stats['opponent_matchups'].items():
            if len(matchups) >= 2:  # At least 2 matchups
                wins = sum(1 for m in matchups if m['result'] == 'win')
                total = len(matchups)
                win_rate = wins / total if total > 0 else 0
                
                if win_rate >= 0.8:  # Best matchup (80%+ win rate)
                    best_matchups.append({
                        'team': team_name,
                        'opponent': opponent,
                        'wins': wins,
                        'total': total,
                        'win_rate': round(win_rate * 100, 1)
                    })
                elif win_rate <= 0.2:  # Worst matchup (20% or less win rate)
                    worst_matchups.append({
                        'team': team_name,
                        'opponent': opponent,
                        'wins': wins,
                        'total': total,
                        'win_rate': round(win_rate * 100, 1)
                    })
    
    # Category Specialists (teams that dominate specific categories)
    category_specialists = {}
    for cat in ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']:
        # Find team with highest win rate in this category
        best_team = None
        best_rate = 0
        for team_name, stats in team_stats.items():
            if len(stats['category_wins_list'][cat]) > 0:
                wins = sum(stats['category_wins_list'][cat])
                total = len(stats['category_wins_list'][cat])
                rate = wins / total if total > 0 else 0
                if rate > best_rate:
                    best_rate = rate
                    best_team = team_name
        if best_team:
            category_specialists[cat] = {
                'team': best_team,
                'win_rate': round(best_rate * 100, 1)
            }
    
    # Weekly Variance (most/least consistent teams in weekly performance)
    weekly_variance_teams = []
    for team_name, stats in team_stats.items():
        if len(stats['weekly_teams_beaten']) > 1:
            mean = sum(stats['weekly_teams_beaten']) / len(stats['weekly_teams_beaten'])
            variance = sum((x - mean) ** 2 for x in stats['weekly_teams_beaten']) / len(stats['weekly_teams_beaten'])
            weekly_variance_teams.append({
                'name': team_name,
                'variance': round(variance, 2),
                'avg': round(mean, 2)
            })
    
    results['head_to_head'] = {
        'best_matchups': sorted(best_matchups, key=lambda x: x['win_rate'], reverse=True)[:5],
        'worst_matchups': sorted(worst_matchups, key=lambda x: x['win_rate'])[:5],
        'category_specialists': category_specialists,
        'most_consistent_weekly': sorted(weekly_variance_teams, key=lambda x: x['variance'])[:3],
        'least_consistent_weekly': sorted(weekly_variance_teams, key=lambda x: x['variance'], reverse=True)[:3]
    }
    
    # Weekly Performance
    results['weekly_performance'] = {
        'best_single_week': max(
            [{'name': name, 'week': s['best_week']['week'], 'teams_beaten': s['best_week']['teams_beaten']} 
             for name, s in team_stats.items()],
            key=lambda x: x['teams_beaten']
        ) if team_stats else None,
        'most_improved': None
    }
    
    # Most improved
    improved_teams = []
    for team_name, stats in team_stats.items():
        if len(stats['weekly_teams_beaten']) >= 8:
            early_avg = sum(stats['weekly_teams_beaten'][:4]) / 4
            recent_avg = sum(stats['weekly_teams_beaten'][-4:]) / 4
            improvement = recent_avg - early_avg
            improved_teams.append({
                'name': team_name,
                'improvement': round(improvement, 2),
                'early_avg': round(early_avg, 2),
                'recent_avg': round(recent_avg, 2)
            })
    
    if improved_teams:
        most_improved = max(improved_teams, key=lambda x: x['improvement'])
        results['weekly_performance']['most_improved'] = {
            **most_improved,
            'description': f"Improved from {most_improved['early_avg']} to {most_improved['recent_avg']} teams beaten per week (+{most_improved['improvement']} improvement)"
        }
    
    # Add teams_list to results
    results['teams_list'] = teams_list
    
    return jsonify(results)

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
