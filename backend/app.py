"""
Flask backend API for Fantasy Basketball Analytics
Serves analytics data and handles chatbot queries
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for espn_api imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, use system env vars

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

@app.after_request
def add_cache_control(response):
    """Set Cache-Control on API JSON responses. Live/fresh endpoints: 60s. Historical/static: 5 min."""
    if response.status_code != 200 or not request.path.startswith('/api/'):
        return response
    live = request.args.get('live', 'false').lower() == 'true'
    if request.path == '/api/health':
        response.headers['Cache-Control'] = 'no-store'
    elif request.path in ('/api/weeks', '/api/league/summary') or request.path.startswith('/api/players') or request.path.startswith('/api/teams') or request.path.startswith('/api/compare/'):
        response.headers['Cache-Control'] = 'public, max-age=300'
    elif request.path.startswith('/api/week/'):
        response.headers['Cache-Control'] = 'no-store' if live else 'public, max-age=300'
    elif request.path in ('/api/league/roster-totals', '/api/league/upcoming-matchups'):
        response.headers['Cache-Control'] = 'private, max-age=300'
    elif request.path == '/api/league/stats':
        response.headers['Cache-Control'] = 'private, max-age=60' if live else 'public, max-age=300'
    elif request.path in ('/api/predictions', '/api/predictions/matchups'):
        response.headers['Cache-Control'] = 'private, max-age=60'
    return response

# Path to analytics data
DATA_DIR = Path(__file__).parent.parent / 'data' / 'analytics'
DATA_DIR.mkdir(parents=True, exist_ok=True)

# League configuration
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = int(os.getenv('YEAR', '2026'))
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

_league_cache = None
_league_cache_ts = 0.0
_LEAGUE_CACHE_TTL = 60  # seconds

def get_league_instance(use_cache=True):
    """Get initialized ESPN League instance. Uses in-memory cache (60s TTL) when use_cache=True to speed up repeated live requests."""
    global _league_cache, _league_cache_ts
    import time
    from espn_api.basketball import League
    if not (ESPN_S2 and ESPN_SWID):
        return None
    if use_cache and _league_cache is not None and (time.time() - _league_cache_ts) < _LEAGUE_CACHE_TTL:
        return _league_cache
    league = League(league_id=LEAGUE_ID, year=YEAR, espn_s2=ESPN_S2, swid=ESPN_SWID, fetch_league=True)
    if use_cache:
        _league_cache = league
        _league_cache_ts = time.time()
    return league

def get_current_week(fetch_live=False):
    """Get current matchup period - only fetches live if fetch_live=True"""
    if fetch_live:
        # Get from live API to ensure we have the most current week
        league = get_league_instance()
        if league:
            return league.currentMatchupPeriod
    
    # Use cached data from league summary
    summary_path = DATA_DIR / 'league_summary.json'
    if summary_path.exists():
        with open(summary_path, 'r') as f:
            summary = json.load(f)
            return summary.get('current_matchup_period', 1)
    return 1

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
    """Get analytics data for a specific week - only fetches live data when live=true parameter is provided"""
    fetch_live = request.args.get('live', 'false').lower() == 'true'

    # Live path: create League once and reuse (avoids get_current_week + second get_league_instance)
    if fetch_live:
        league = get_league_instance()
        if league and week == league.currentMatchupPeriod:
            try:
                league.fetch_league()  # Refresh from ESPN so current-week stats are up to date
            except Exception as e:
                print(f"fetch_league before export failed: {e}")
            try:
                import importlib.util
                export_path = Path(__file__).parent / 'export_analytics.py'
                spec = importlib.util.spec_from_file_location("export_analytics", export_path)
                export_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(export_module)
                live_data = export_module.export_week_analytics(league, week)
                if live_data:
                    return jsonify(live_data)
            except Exception as e:
                print(f"Error fetching live data for week {week}: {e}")
                import traceback
                traceback.print_exc()
            file_path = DATA_DIR / f'week{week}.json'
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return jsonify(json.load(f))
            return jsonify({'error': f'Week {week} data not found'}), 404
        if not league:
            file_path = DATA_DIR / f'week{week}.json'
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return jsonify(json.load(f))
            return jsonify({'error': f'Week {week} data not found and API unavailable'}), 404
        # league exists but week != current_week: fall through to file

    # Historical weeks or fallback: use exported JSON files
    file_path = DATA_DIR / f'week{week}.json'
    if not file_path.exists():
        return jsonify({'error': f'Week {week} data not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/league/summary', methods=['GET'])
def get_league_summary():
    """Get league summary data. current_matchup_period is live from ESPN when API is available."""
    file_path = DATA_DIR / 'league_summary.json'
    if not file_path.exists():
        return jsonify({'error': 'League summary not found'}), 404
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    try:
        league = get_league_instance(use_cache=True)
        if league:
            data['current_matchup_period'] = league.currentMatchupPeriod
    except Exception:
        pass
    return jsonify(data)

STANDARD_CATS = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']

def _player_season_avg(stat_block):
    """Get per-game averages from stat block: prefer 'avg'; if missing, derive from total/GP."""
    if not stat_block:
        return {}
    avg = stat_block.get('avg')
    if avg and isinstance(avg, dict):
        return avg
    total = stat_block.get('total') or {}
    gp = total.get('GP') or 0
    if not gp:
        return {}
    keys = ['PTS', 'REB', 'AST', 'STL', 'BLK', '3PM', 'TO', 'FGM', 'FGA', 'FTM', 'FTA']
    return {k: (total.get(k) or 0) / gp for k in keys}

def _aggregate_roster_totals(players_with_avgs):
    """Sum each player's season average. Counting: PTS, REB, AST, STL, BLK, 3PM, TO.
    FG% = FGM / FGA (field goals made / attempted). FT% = FTM / FTA (free throws made / attempted).
    We sum each player's FGM,FGA,FTM,FTA then: FG% = sum(FGM)/sum(FGA), FT% = sum(FTM)/sum(FTA)."""
    totals = {c: 0.0 for c in STANDARD_CATS}
    fgm = fga = ftm = fta = 0.0
    for a in players_with_avgs:
        for c in ['PTS', 'REB', 'AST', 'STL', 'BLK', '3PM', 'TO']:
            totals[c] += a.get(c, 0) or 0
        fgm += a.get('FGM', 0) or 0
        fga += a.get('FGA', 0) or 0
        ftm += a.get('FTM', 0) or 0
        fta += a.get('FTA', 0) or 0
    # FG% = field goals made / field goals attempted; FT% = free throws made / free throws attempted
    totals['FG%'] = (fgm / fga) if (fga and fga > 0) else 0.0
    totals['FT%'] = (ftm / fta) if (fta and fta > 0) else 0.0
    return totals


def _build_roster_teams_from_league(league):
    """Build teams list with roster_totals from a League instance."""
    teams_list = []
    for team in (getattr(league, 'teams', None) or []):
        players_with_avgs = []
        for p in getattr(team, 'roster', []) or []:
            st = getattr(p, 'stats', None) or {}
            stat_block = st.get(f'{league.year}_total', {}) or {}
            a = _player_season_avg(stat_block)
            if a:
                players_with_avgs.append(a)
        roster_totals = _aggregate_roster_totals(players_with_avgs)
        logo_url = getattr(team, 'logo_url', '') or ''
        if logo_url:
            if logo_url.startswith('//'):
                logo_url = f'https:{logo_url}'
            elif logo_url.startswith('/'):
                logo_url = f'https://a.espncdn.com{logo_url}'
        teams_list.append({
            'name': getattr(team, 'team_name', str(getattr(team, 'team_id', ''))),
            'team_id': getattr(team, 'team_id', 0),
            'logo_url': logo_url or None,
            'roster_totals': roster_totals,
        })
    return teams_list


@app.route('/api/league/roster-totals', methods=['GET'])
def get_roster_totals():
    """Roster category totals per team: sum of each player's season average (e.g. 20 ppg + 21 ppg = 41 PTS)."""
    try:
        league = get_league_instance()
        year = YEAR
        teams_list = []
        if league and league.teams:
            teams_list = _build_roster_teams_from_league(league)
            return jsonify({'teams': teams_list, 'season': league.year})
        # Fallback: aggregate from players.json
        players_path = DATA_DIR / 'players.json'
        summary_path = DATA_DIR / 'league_summary.json'
        if not players_path.exists() or not summary_path.exists():
            return jsonify({'error': 'Roster totals require league API or players.json + league_summary.json'}), 503
        with open(players_path, 'r') as f:
            players_data = json.load(f)
        with open(summary_path, 'r') as f:
            summary = json.load(f)
        year = summary.get('season', YEAR)
        team_id_map = {t['name']: {'team_id': t['team_id'], 'logo_url': t.get('logo_url')} for t in summary.get('teams', [])}
        by_team = {}
        for p in players_data.get('players', []):
            team_name = p.get('team') or ''
            if not team_name:
                continue
            st = p.get('stats', {}) or {}
            stat_block = st.get(f'{year}_total', {}) or {}
            a = _player_season_avg(stat_block)
            if not a:
                continue
            by_team.setdefault(team_name, []).append(a)
        for team_name, lst in by_team.items():
            info = team_id_map.get(team_name, {})
            teams_list.append({
                'name': team_name,
                'team_id': info.get('team_id', 0),
                'logo_url': info.get('logo_url'),
                'roster_totals': _aggregate_roster_totals(lst),
            })
        return jsonify({'teams': teams_list, 'season': year})
    except Exception as e:
        print(f"Error in /api/league/roster-totals: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/upcoming-matchups', methods=['GET'])
def get_upcoming_matchups():
    """Next week (current + 1) matchups with category-by-category preview (favored by roster totals)."""
    try:
        league = get_league_instance()
        if not league:
            return jsonify({'error': 'League API unavailable'}), 503
        roster_teams = _build_roster_teams_from_league(league)
        by_name = {t['name']: t.get('roster_totals', {}) for t in roster_teams}

        league.fetch_league()
        next_period = league.currentMatchupPeriod + 1
        # scoreboard(matchupPeriod) uses mMatchup and filters schedule by matchupPeriodId;
        # it supports future periods. box_scores only uses our period when it's in the past.
        matchups_raw = league.scoreboard(matchupPeriod=next_period)
        if not matchups_raw:
            return jsonify({'matchups': [], 'matchup_period': next_period})

        matchups = []
        for m in matchups_raw:
            ht, at = m.home_team, m.away_team
            if isinstance(ht, int):
                ht = league.get_team_data(ht)
            if isinstance(at, int):
                at = league.get_team_data(at)
            t1 = ht.team_name if (ht and hasattr(ht, 'team_name')) else str(ht or '')
            t2 = at.team_name if (at and hasattr(at, 'team_name')) else str(at or '')
            r1, r2 = by_name.get(t1, {}), by_name.get(t2, {})

            cats = []
            for c in STANDARD_CATS:
                v1 = r1.get(c, 0) or 0
                v2 = r2.get(c, 0) or 0
                if c == 'TO':
                    favored = 'team1' if v1 < v2 else ('team2' if v2 < v1 else 'toss')
                else:
                    favored = 'team1' if v1 > v2 else ('team2' if v2 > v1 else 'toss')
                cats.append({'category': c, 'team1_value': v1, 'team2_value': v2, 'favored': favored})
            matchups.append({'team1': t1, 'team2': t2, 'categories': cats})

        return jsonify({'matchups': matchups, 'matchup_period': next_period})
    except Exception as e:
        print(f"Error in /api/league/upcoming-matchups: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


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
    """Get aggregated league statistics across all weeks - only uses live data if live=true parameter provided"""
    from collections import defaultdict
    
    # Check if live data is explicitly requested
    fetch_live = request.args.get('live', 'false').lower() == 'true'
    current_week = get_current_week(fetch_live=fetch_live)
    
    # Load all week data files (historical weeks)
    all_weeks_data = []
    weeks = []
    for file in sorted(DATA_DIR.glob('week*.json')):
        week_num = file.stem.replace('week', '')
        try:
            week_num = int(week_num)
            # Skip current week - we'll fetch it live
            if week_num == current_week:
                continue
            weeks.append(week_num)
            with open(file, 'r') as f:
                all_weeks_data.append(json.load(f))
        except:
            continue
    
    # Only fetch live data for current week if explicitly requested
    if fetch_live:
        try:
            # Import here to avoid circular imports
            import importlib.util
            export_path = Path(__file__).parent / 'export_analytics.py'
            spec = importlib.util.spec_from_file_location("export_analytics", export_path)
            export_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(export_module)
            
            league = get_league_instance()
            if league:
                live_current_week = export_module.export_week_analytics(league, current_week)
                if live_current_week:
                    all_weeks_data.append(live_current_week)
                    weeks.append(current_week)
        except Exception as e:
            print(f"Error fetching live current week data: {e}")
            import traceback
            traceback.print_exc()
    
    # If not fetching live, or if live fetch failed, try to load current week from file
    if current_week not in weeks:
        current_week_file = DATA_DIR / f'week{current_week}.json'
        if current_week_file.exists():
            with open(current_week_file, 'r') as f:
                all_weeks_data.append(json.load(f))
                weeks.append(current_week)
    
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
        'category_wins_by_week': defaultdict(lambda: defaultdict(int)),  # category -> week -> count
        'category_wins_list': defaultdict(list),  # For std dev calculation
        'matchup_history': defaultdict(lambda: {'wins': 0, 'losses': 0, 'total': 0}),
        'best_week': {'week': 0, 'teams_beaten': 0},
        'scheduled_opponent_wins': [],  # Track wins vs scheduled opponent (5-4-0 or better)
        'scheduled_opponent_weeks': [],  # Track which weeks
        'current_streak': 0,
        'longest_streak': 0,
        'recent_performance': [],
        'opponent_matchups': defaultdict(list),  # Track best/worst matchups
        'close_wins': 0, 'close_losses': 0, 'blowout_wins': 0, 'blowout_losses': 0  # Clutch/close vs blowouts
    })
    
    # Get current week from league summary to exclude it from streaks
    current_week = league_summary.get('current_matchup_period', len(all_weeks_data))
    
    # Sort weeks by matchup_period to ensure correct order
    sorted_weeks = sorted(all_weeks_data, key=lambda x: x.get('matchup_period', 0))
    
    # Process each week
    for week_idx, week_data in enumerate(sorted_weeks):
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
                won = opponent_details.get('won', 0)
                lost = opponent_details.get('lost', 0)
                if won >= 5:
                    stats['scheduled_opponent_wins'].append(1)
                    stats['scheduled_opponent_weeks'].append(week_num)
                else:
                    stats['scheduled_opponent_wins'].append(0)
                    stats['scheduled_opponent_weeks'].append(week_num)
                
                # Clutch/close (5-4, 6-3, 4-5, 3-6) vs blowouts (7+ or 0-2)
                if (won, lost) in ((5, 4), (6, 3)):
                    stats['close_wins'] += 1
                elif (won, lost) in ((4, 5), (3, 6)):
                    stats['close_losses'] += 1
                elif won >= 7:
                    stats['blowout_wins'] += 1
                elif lost >= 7:
                    stats['blowout_losses'] += 1
                
                # Track opponent matchup record
                stats['opponent_matchups'][opponent_name].append({
                    'week': week_num,
                    'won': won,
                    'lost': lost,
                    'result': 'win' if won >= 5 else 'loss'
                })
            
            # Track best week
            if teams_beaten_this_week > stats['best_week']['teams_beaten']:
                stats['best_week'] = {'week': week_num, 'teams_beaten': teams_beaten_this_week}
            
            # Category wins (for counting and std dev)
            for opponent, details in team.get('matchup_details', {}).items():
                for cat in details.get('won_cats', []):
                    stats['category_wins'][cat] += 1
                    stats['category_wins_by_week'][cat][week_num] = stats['category_wins_by_week'][cat].get(week_num, 0) + 1
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
        
        # Get logo_url from league summary, or construct from team_id if missing
        logo_url = ''
        team_id_for_logo = None
        for team_summary in league_summary.get('teams', []):
            if team_summary.get('name') == team_name:
                logo_url = team_summary.get('logo_url', '')
                team_id_for_logo = team_summary.get('team_id')
                break
        
        # ESPN doesn't provide fantasy team logos via API
        # If logo_url is empty, leave it empty (frontend will handle with placeholder)
        
        teams_list.append({
            'name': team_name,
            'total_wins': overall_wins,
            'win_percentage': win_pct,
            'avg_teams_beaten': round(avg_teams_beaten, 2),
            'variance': round(variance, 2),
            'total_teams_beaten': stats['total_teams_beaten'],
            'total_minutes': round(stats['total_minutes'], 1),
            'efficiency': round(overall_wins / stats['total_minutes'] * 1000, 3) if stats['total_minutes'] > 0 else 0,
            'logo_url': logo_url,
            'close_wins': stats['close_wins'],
            'close_losses': stats['close_losses'],
            'blowout_wins': stats['blowout_wins'],
            'blowout_losses': stats['blowout_losses'],
        })
    
    # Close matchups / clutch: leaders
    close_win_leaders = sorted([t for t in teams_list if t['close_wins'] > 0], key=lambda x: x['close_wins'], reverse=True)[:5]
    close_loss_most = sorted([t for t in teams_list if t['close_losses'] > 0], key=lambda x: x['close_losses'], reverse=True)[:5]
    blowout_win_most = sorted([t for t in teams_list if t['blowout_wins'] > 0], key=lambda x: x['blowout_wins'], reverse=True)[:5]
    blowout_loss_most = sorted([t for t in teams_list if t['blowout_losses'] > 0], key=lambda x: x['blowout_losses'], reverse=True)[:5]
    
    # Sort and find leaders
    results = {
        'overall_performance': {
            'total_wins_leader': max(teams_list, key=lambda x: x['total_wins']) if teams_list else None,
            'win_pct_leader': max(teams_list, key=lambda x: x['win_percentage']) if teams_list else None,
            'most_dominant': max(teams_list, key=lambda x: x['avg_teams_beaten']) if teams_list else None,
            # Most consistent: combine low variance with decent avg teams beaten (coefficient of variation)
            'most_consistent': min(
                teams_list, 
                key=lambda x: x['variance'] / max(x['avg_teams_beaten'], 0.1) if x['avg_teams_beaten'] > 0 else float('inf')
            ) if teams_list else None
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
    
    # Activity Metrics - most active is average minutes per week
    for team_data in teams_list:
        team_name = team_data['name']
        team_stat = team_stats.get(team_name, {})
        weeks_played = team_stat.get('weeks_played', 1)
        team_data['avg_minutes_per_week'] = team_data['total_minutes'] / weeks_played if weeks_played > 0 else 0
    
    results['activity_metrics'] = {
        'most_active': max(teams_list, key=lambda x: x['avg_minutes_per_week']) if teams_list else None,
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
        ),  # Show all teams
        'longest_streak_leaders': sorted(
            [{'name': name, 'streak': s['longest_streak']} for name, s in team_stats.items()],
            key=lambda x: x['streak'], reverse=True
        ),  # Show all teams
        'hot_teams': sorted(hot_teams, key=lambda x: x['avg'], reverse=True),  # Show all teams
        'cold_teams': sorted(cold_teams, key=lambda x: x['avg'])  # Show all teams
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
    
    # Weekly Performance - best single week shows the team, not the week
    best_week_team = None
    best_week_count = 0
    for name, s in team_stats.items():
        if s['best_week']['teams_beaten'] > best_week_count:
            best_week_count = s['best_week']['teams_beaten']
            best_week_team = {
                'name': name,
                'week': s['best_week']['week'],
                'teams_beaten': s['best_week']['teams_beaten']
            }
    
    results['weekly_performance'] = {
        'best_single_week': best_week_team,
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
        # Add all improved teams for comparison modal
        results['weekly_performance']['improved_teams'] = sorted(improved_teams, key=lambda x: x['improvement'], reverse=True)
    else:
        results['weekly_performance']['improved_teams'] = []
    
    # Add teams_list to results
    results['teams_list'] = teams_list
    results['close_matchups'] = {
        'close_win_leaders': close_win_leaders,
        'close_loss_most': close_loss_most,
        'blowout_win_most': blowout_win_most,
        'blowout_loss_most': blowout_loss_most,
    }
    
    # Add category wins by team for comparison modal
    category_wins_by_team = {}
    for team_name, stats in team_stats.items():
        category_wins_by_team[team_name] = dict(stats['category_wins'])
    results['category_wins_by_team'] = category_wins_by_team
    
    return jsonify(results)

@app.route('/api/predictions/matchups', methods=['GET'])
def get_matchup_list():
    """Get list of current week matchups (team names only, no prediction data)"""
    try:
        league = get_league_instance()
        if not league:
            return jsonify({'error': 'League API unavailable'}), 503
        
        current_week = get_current_week(fetch_live=False)  # Don't fetch live, use cached
        
        # Get box scores to find matchups
        league.fetch_league()
        current_scoring_period = league.current_week
        box_scores = league.box_scores(matchup_period=current_week, scoring_period=current_scoring_period, matchup_total=True)
        
        if not box_scores:
            return jsonify({'matchups': []})
        
        matchups = []
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            home_name = home_team.team_name if hasattr(home_team, 'team_name') else str(home_team)
            away_name = away_team.team_name if hasattr(away_team, 'team_name') else str(away_team)
            
            matchups.append({
                'team1': home_name,
                'team2': away_name
            })
        
        return jsonify({'matchups': matchups})
    
    except Exception as e:
        print(f"Error getting matchup list: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    """Get live matchup predictions for current week - only fetches live data when live=true parameter is provided"""
    # Check if live data is explicitly requested
    fetch_live = request.args.get('live', 'false').lower() == 'true'
    
    # Optional: filter by specific matchup
    team1 = request.args.get('team1', '')
    team2 = request.args.get('team2', '')
    
    if not fetch_live:
        return jsonify({'error': 'Live predictions require live=true parameter'}), 400
    
    try:
        league = get_league_instance()
        if not league:
            return jsonify({'error': 'League API unavailable'}), 503
        
        current_week = get_current_week(fetch_live=True)
        
        # For current week, ensure we get the absolute latest data (same logic as export_week_analytics)
        # Refresh league to get latest scoring period
        league.fetch_league()
        # Explicitly use current_week as scoring_period to ensure we get the latest data
        # matchup_total=True ensures we get cumulative stats for the entire matchup
        current_scoring_period = league.current_week
        box_scores = league.box_scores(matchup_period=current_week, scoring_period=current_scoring_period, matchup_total=True)
        if not box_scores:
            return jsonify({'predictions': []})
        
        # OPTIMIZATION: Build player lookup dictionary once (player_id -> player with stats)
        # This avoids nested loops through all teams for each player lookup
        player_lookup = {}
        for team in league.teams:
            for roster_player in team.roster:
                player_id = getattr(roster_player, 'playerId', None)
                if player_id:
                    player_lookup[player_id] = roster_player
        
        # OPTIMIZATION: Cache PRO_TEAM_MAP reverse lookup (only create once)
        from espn_api.basketball.constant import PRO_TEAM_MAP
        pro_team_reverse_map = {v: k for k, v in PRO_TEAM_MAP.items()}
        
        standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
        predictions = []
        
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            home_name = home_team.team_name if hasattr(home_team, 'team_name') else str(home_team)
            away_name = away_team.team_name if hasattr(away_team, 'team_name') else str(away_team)
            
            # Get lineups and project stats (pass optimized lookups)
            home_projected = project_team_stats(box_score, home_team, away_team, True, league, current_week, player_lookup, pro_team_reverse_map)
            away_projected = project_team_stats(box_score, away_team, home_team, False, league, current_week, player_lookup, pro_team_reverse_map)
            
            # Compare categories
            categories = []
            home_wins = 0
            away_wins = 0
            
            for cat in standard_cats:
                home_val = home_projected.get(cat, 0)
                away_val = away_projected.get(cat, 0)
                
                if cat == 'TO':
                    # Lower is better for TO
                    if home_val < away_val:
                        winner = home_name
                        home_wins += 1
                    elif away_val < home_val:
                        winner = away_name
                        away_wins += 1
                    else:
                        winner = 'Tie'
                else:
                    # Higher is better
                    if home_val > away_val:
                        winner = home_name
                        home_wins += 1
                    elif away_val > home_val:
                        winner = away_name
                        away_wins += 1
                    else:
                        winner = 'Tie'
                
                categories.append({
                    'category': cat,
                    'team1_value': home_val,
                    'team2_value': away_val,
                    'winner': winner,
                    'team1_projected': home_val,
                    'team2_projected': away_val
                })
            
            # Calculate projected score
            projected_score = f"{home_wins}-{away_wins}-{9 - home_wins - away_wins}"
            
            # Simple confidence based on margin
            total_diff = sum(abs(cat['team1_projected'] - cat['team2_projected']) for cat in categories)
            confidence = min(95, max(50, int(50 + (total_diff / 100) * 45)))
            
            # Only include this prediction if no filter specified, or if it matches the filter
            # Match must be exact: (team1=home AND team2=away) OR (team1=away AND team2=home)
            if (not team1 and not team2) or \
               ((team1.lower() == home_name.lower() and team2.lower() == away_name.lower()) or
                (team1.lower() == away_name.lower() and team2.lower() == home_name.lower())):
                predictions.append({
                    'team1': home_name,
                    'team2': away_name,
                    'categories': categories,
                    'projected_score': projected_score,
                    'confidence': confidence
                })
        
        return jsonify({'predictions': predictions})
    
    except Exception as e:
        print(f"Error generating predictions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def project_team_stats(box_score, team, opponent, is_home, league, current_week, player_lookup=None, pro_team_reverse_map=None):
    """Project team stats based on current accumulated stats + remaining games through Sunday"""
    standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
    projected = {cat: 0.0 for cat in standard_cats}
    
    # For percentage categories, we need to track numerator and denominator
    fg_made = 0.0
    fg_attempted = 0.0
    ft_made = 0.0
    ft_attempted = 0.0
    
    # OPTIMIZATION: Build lookups if not provided (for backward compatibility)
    if player_lookup is None:
        player_lookup = {}
        for team_obj in league.teams:
            for roster_player in team_obj.roster:
                player_id = getattr(roster_player, 'playerId', None)
                if player_id:
                    player_lookup[player_id] = roster_player
    
    if pro_team_reverse_map is None:
        from espn_api.basketball.constant import PRO_TEAM_MAP
        pro_team_reverse_map = {v: k for k, v in PRO_TEAM_MAP.items()}
    
    try:
        lineup = box_score.home_lineup if is_home else box_score.away_lineup
        
        if not lineup:
            return projected
        
        # Get current accumulated stats from box score (what's already happened this week)
        stats = box_score.home_stats if is_home else box_score.away_stats
        
        if stats:
            # Get current totals (what's already accumulated)
            for cat in standard_cats:
                if cat in stats:
                    value = stats[cat].get('value', 0)
                    projected[cat] = float(value) if value else 0.0
            
            # Get FG and FT data for percentage calculations
            if 'FGM' in stats:
                fg_made = float(stats['FGM'].get('value', 0))
            if 'FGA' in stats:
                fg_attempted = float(stats['FGA'].get('value', 0))
            if 'FTM' in stats:
                ft_made = float(stats['FTM'].get('value', 0))
            if 'FTA' in stats:
                ft_attempted = float(stats['FTA'].get('value', 0))
        
        # Get pro team schedule (pro_team_id -> scoring_period -> game_data)
        pro_schedule = league.pro_schedule
        
        # Find which scoring periods are in the current matchup period
        # current_week is a matchup_period (1, 2, 3, etc.)
        # league.matchup_ids maps matchup_period -> list of scoring_period strings
        matchup_scoring_periods = league.matchup_ids.get(current_week, [])
        current_scoring_period = league.current_week  # This is the current scoring period ID (large number like 114)
        
        # Convert matchup_scoring_periods (list of strings) to integers
        scoring_periods = []
        for sp in matchup_scoring_periods:
            try:
                sp_int = int(sp)
                scoring_periods.append(sp_int)
            except (ValueError, TypeError):
                continue
        
        # Find remaining scoring periods (from current through end of matchup)
        # Only include scoring periods that are >= current
        remaining_periods = [sp for sp in scoring_periods if sp >= current_scoring_period]
        
        # If no remaining periods found, calculate based on matchup end date
        # Matchups typically run Monday-Sunday, so we need to find when this matchup ends
        if not remaining_periods:
            from datetime import datetime, timedelta
            
            # Calculate days until Sunday (matchups typically end Sunday)
            today = datetime.now()
            days_until_sunday = (6 - today.weekday()) % 7  # 0 = Monday, 6 = Sunday
            if days_until_sunday == 0 and today.weekday() != 6:
                days_until_sunday = 7  # If today is Sunday, count it; otherwise next Sunday
            
            # If today is Sunday, include today (0 days)
            if today.weekday() == 6:
                days_until_sunday = 0
            
            # Limit to maximum 3 days (Friday->Sunday = 2 days, Saturday->Sunday = 1 day, Sunday = 0 days)
            # This prevents counting too many days if matchup_ids is wrong
            days_remaining = min(days_until_sunday + 1, 3)  # +1 to include today
            
            # Only count periods from current through the calculated end
            # Each scoring period typically represents one day
            end_period = min(current_scoring_period + days_remaining - 1, league.finalScoringPeriod)
            remaining_periods = list(range(current_scoring_period, end_period + 1))
            
            # If we have matchup scoring periods but they're all less than current, 
            # the matchup might have already ended - don't project future games
            if scoring_periods and all(sp < current_scoring_period for sp in scoring_periods):
                # Matchup appears to have ended, but we're still in it - use calculated days
                # This handles edge cases where matchup_ids data is stale
                pass
        
        # For each remaining scoring period, check which players have games
        for scoring_period in remaining_periods:
            scoring_period_str = str(scoring_period)
            
            # Check each player in lineup
            for player in lineup:
                # Check injury status - only include healthy or DTD players
                injury_status = getattr(player, 'injuryStatus', None) or ''
                if injury_status and injury_status.upper() == 'OUT':
                    continue
                
                # Get player's pro team ID (using cached reverse map)
                pro_team_id = None
                try:
                    pro_team_name = getattr(player, 'proTeam', None)
                    if pro_team_name:
                        pro_team_id = pro_team_reverse_map.get(pro_team_name)
                except Exception as e:
                    continue
                
                if not pro_team_id:
                    continue
                
                # Check if this pro team has a game in this scoring period
                if pro_team_id not in pro_schedule:
                    continue
                
                team_games = pro_schedule[pro_team_id]
                if scoring_period_str not in team_games:
                    continue
                
                player_name = getattr(player, 'name', 'unknown')
                
                # Player has a game in this scoring period - add their season averages
                # OPTIMIZATION: Use pre-built player_lookup instead of nested loops
                try:
                    avg_stats = {}
                    player_id = getattr(player, 'playerId', None)
                    
                    # First, try to get stats from BoxPlayer itself (fastest)
                    if hasattr(player, 'nine_cat_averages'):
                        try:
                            avg_stats = player.nine_cat_averages
                        except:
                            pass
                    
                    # If that didn't work, try stats dict from BoxPlayer
                    if not avg_stats:
                        player_stats = getattr(player, 'stats', {})
                        season_total_key = f'{league.year}_total'
                        if season_total_key in player_stats:
                            avg_stats = player_stats[season_total_key].get('avg', {})
                    
                    # OPTIMIZATION: Use player_lookup dict instead of nested loops
                    if not avg_stats and player_id and player_id in player_lookup:
                        roster_player = player_lookup[player_id]
                        if hasattr(roster_player, 'nine_cat_averages'):
                            try:
                                avg_stats = roster_player.nine_cat_averages
                            except:
                                pass
                        if not avg_stats:
                            roster_player_stats = getattr(roster_player, 'stats', {})
                            season_total_key = f'{league.year}_total'
                            if season_total_key in roster_player_stats:
                                avg_stats = roster_player_stats[season_total_key].get('avg', {})
                    
                    if avg_stats:
                        # Track what we're adding for this player
                        player_additions = {}
                        
                        # Add projected stats for this game
                        pts_add = float(avg_stats.get('PTS', 0) or 0)
                        reb_add = float(avg_stats.get('REB', 0) or 0)
                        ast_add = float(avg_stats.get('AST', 0) or 0)
                        stl_add = float(avg_stats.get('STL', 0) or 0)
                        blk_add = float(avg_stats.get('BLK', 0) or 0)
                        threepm_add = float(avg_stats.get('3PM', 0) or 0)
                        to_add = float(avg_stats.get('TO', 0) or 0)
                        
                        # Add stats regardless - even if 0, we want to track it
                        # (players might contribute in categories other than PTS/REB/AST)
                        projected['PTS'] += pts_add
                        projected['REB'] += reb_add
                        projected['AST'] += ast_add
                        projected['STL'] += stl_add
                        projected['BLK'] += blk_add
                        projected['3PM'] += threepm_add
                        projected['TO'] += to_add
                        
                        # Track FG and FT for percentages - need to get from stats dict
                        # OPTIMIZATION: Use player_lookup instead of nested loops
                        fg_ft_stats = {}
                        if player_id and player_id in player_lookup:
                            roster_player = player_lookup[player_id]
                            roster_player_stats = getattr(roster_player, 'stats', {})
                            season_total_key = f'{league.year}_total'
                            if season_total_key in roster_player_stats:
                                fg_ft_stats = roster_player_stats[season_total_key].get('avg', {})
                        
                        # Fallback to BoxPlayer stats if we didn't find full player
                        if not fg_ft_stats:
                            player_stats = getattr(player, 'stats', {})
                            season_total_key = f'{league.year}_total'
                            if season_total_key in player_stats:
                                fg_ft_stats = player_stats[season_total_key].get('avg', {})
                        
                        if fg_ft_stats:
                            fgm_val = fg_ft_stats.get('FGM', 0) or 0
                            fga_val = fg_ft_stats.get('FGA', 0) or 0
                            ftm_val = fg_ft_stats.get('FTM', 0) or 0
                            fta_val = fg_ft_stats.get('FTA', 0) or 0
                            fg_made += float(fgm_val)
                            fg_attempted += float(fga_val)
                            ft_made += float(ftm_val)
                            ft_attempted += float(fta_val)
                except Exception as e:
                    # Silently continue if we can't get stats for a player
                    continue
        
        # Recalculate percentages based on new totals
        if fg_attempted > 0:
            projected['FG%'] = fg_made / fg_attempted
        if ft_attempted > 0:
            projected['FT%'] = ft_made / ft_attempted
        
        
    except Exception as e:
        # Return projected with current stats if projection fails
        pass
    
    return projected

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
