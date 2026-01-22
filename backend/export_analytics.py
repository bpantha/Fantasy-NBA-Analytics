#!/usr/bin/env python3
"""
Export analytics data to JSON files
Runs the analytics script and saves results to JSON
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, date
from collections import defaultdict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from espn_api.basketball import League

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# Get credentials from environment or use defaults
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = int(os.getenv('YEAR', '2026'))
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

def get_team_display_name(team):
    """Get team name for display"""
    return team.team_name

DATA_DIR = Path(__file__).parent.parent / 'data' / 'analytics'
DATA_DIR.mkdir(parents=True, exist_ok=True)

def export_week_analytics(league, matchup_period):
    """Export analytics for a specific week to JSON"""
    try:
        # For current week, ensure we use the latest scoring period to get most up-to-date data
        # Use matchup_total=True to get cumulative stats for the entire matchup period
        # This is especially important for the current week to get all accumulated stats
        if matchup_period == league.currentMatchupPeriod:
            # For current week, explicitly use current scoring period to ensure fresh data
            box_scores = league.box_scores(matchup_period=matchup_period, scoring_period=league.current_week, matchup_total=True)
        else:
            # For historical weeks, use default behavior
            box_scores = league.box_scores(matchup_period=matchup_period, matchup_total=True)
        
        if not box_scores:
            return None
        
        # Get category wins ranking data
        standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
        team_category_totals = defaultdict(lambda: defaultdict(float))
        all_teams = set()
        
        # Collect category totals
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            all_teams.add(home_team)
            all_teams.add(away_team)
            
            if hasattr(box_score, 'home_stats') and hasattr(box_score, 'away_stats'):
                for category in box_score.home_stats.keys():
                    if category not in standard_cats:
                        continue
                    home_value = box_score.home_stats[category].get('value', 0)
                    away_value = box_score.away_stats[category].get('value', 0)
                    team_category_totals[home_team][category] = home_value
                    team_category_totals[away_team][category] = away_value
        
        # Compare teams and build analytics
        team_category_wins = defaultdict(lambda: defaultdict(set))
        team_category_losses = defaultdict(lambda: defaultdict(set))
        team_matchup_details = defaultdict(lambda: defaultdict(lambda: {'won': 0, 'lost': 0, 'tied': 0, 'won_cats': [], 'lost_cats': []}))
        teams_beaten = defaultdict(set)
        
        for team1 in all_teams:
            for team2 in all_teams:
                if team1 == team2:
                    continue
                
                categories_won = 0
                categories_lost = 0
                won_cats = []
                lost_cats = []
                
                for category in standard_cats:
                    team1_value = team_category_totals[team1].get(category, 0)
                    team2_value = team_category_totals[team2].get(category, 0)
                    
                    if category == 'TO':
                        if team1_value < team2_value:
                            team_category_wins[team1][category].add(team2)
                            categories_won += 1
                            won_cats.append(category)
                        elif team1_value > team2_value:
                            categories_lost += 1
                            lost_cats.append(category)
                    else:
                        if team1_value > team2_value:
                            team_category_wins[team1][category].add(team2)
                            categories_won += 1
                            won_cats.append(category)
                        elif team1_value < team2_value:
                            categories_lost += 1
                            lost_cats.append(category)
                
                team_matchup_details[team1][team2] = {
                    'won': categories_won,
                    'lost': categories_lost,
                    'tied': 0,
                    'won_cats': won_cats,
                    'lost_cats': lost_cats
                }
                
                if categories_won >= 5:
                    teams_beaten[team1].add(team2)
        
        # Calculate minutes played
        team_minutes = defaultdict(float)
        matchup_minutes = {}
        
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            if hasattr(box_score, 'home_lineup') and hasattr(box_score, 'away_lineup'):
                home_minutes = 0
                away_minutes = 0
                
                for player in box_score.home_lineup:
                    if hasattr(player, 'points_breakdown') and player.points_breakdown:
                        min_value = player.points_breakdown.get('MIN', 0)
                        if isinstance(min_value, (int, float)) and min_value > 0:
                            home_minutes += min_value
                
                for player in box_score.away_lineup:
                    if hasattr(player, 'points_breakdown') and player.points_breakdown:
                        min_value = player.points_breakdown.get('MIN', 0)
                        if isinstance(min_value, (int, float)) and min_value > 0:
                            away_minutes += min_value
                
                team_minutes[home_team] += home_minutes
                team_minutes[away_team] += away_minutes
                matchup_minutes[(home_team, away_team)] = home_minutes
                matchup_minutes[(away_team, home_team)] = away_minutes
        
        league_avg_minutes = sum(team_minutes.values()) / len(team_minutes) if team_minutes else 0
        
        # Build team data structure
        teams_data = []
        team_totals = {}
        
        for team in all_teams:
            beaten_teams = teams_beaten.get(team, set())
            category_wins = team_category_wins.get(team, {})
            total_category_wins = sum(len(beaten_teams_in_cat) for beaten_teams_in_cat in category_wins.values())
            
            team_totals[team] = {
                'total_teams_beaten': len(beaten_teams),
                'total_category_wins': total_category_wins,
                'beaten_teams': list(beaten_teams),
                'matchup_details': {}
            }
            
            # Convert matchup details to serializable format
            for opponent, details in team_matchup_details.get(team, {}).items():
                team_totals[team]['matchup_details'][get_team_display_name(opponent)] = {
                    'won': details['won'],
                    'lost': details['lost'],
                    'tied': details['tied'],
                    'won_cats': details['won_cats'],
                    'lost_cats': details['lost_cats']
                }
        
        # Create a mapping from team_id to team object from league.teams (which has logo data)
        team_id_to_league_team = {}
        for league_team in league.teams:
            team_id_to_league_team[league_team.team_id] = league_team
        
        # Sort teams by total teams beaten
        sorted_teams = sorted(team_totals.items(), 
                            key=lambda x: (x[1]['total_teams_beaten'], x[1]['total_category_wins']), 
                            reverse=True)
        
        for team, stats in sorted_teams:
            team_name = get_team_display_name(team)
            minutes = team_minutes.get(team, 0)
            
            # Get category totals for this team
            category_totals = {}
            for cat in standard_cats:
                category_totals[cat] = team_category_totals[team].get(cat, 0)
            
            # Find opponent
            opponent_name = None
            opponent_minutes = None
            for (team1, team2), mins in matchup_minutes.items():
                if team1 == team:
                    opponent_name = get_team_display_name(team2)
                    opponent_minutes = mins
                    break
            
            # Get logo URL from league.teams (which has full team data including logos)
            logo_url = ''
            league_team = team_id_to_league_team.get(team.team_id)
            if league_team:
                # Check if logo_url exists and has a value
                if hasattr(league_team, 'logo_url') and league_team.logo_url:
                    raw_logo = league_team.logo_url
                    if raw_logo.startswith('http'):
                        logo_url = raw_logo
                    elif raw_logo.startswith('//'):
                        logo_url = f'https:{raw_logo}'
                    elif raw_logo.startswith('/'):
                        logo_url = f'https://a.espncdn.com{raw_logo}'
                    else:
                        logo_url = f'https://a.espncdn.com/i/teamlogos/nba/500/{raw_logo}'
            
            # ESPN doesn't provide fantasy team logos via API
            # If logo_url is empty, leave it empty (frontend will handle with placeholder)
            # Note: Custom logos are user-uploaded and not available via API
            
            teams_data.append({
                'name': team_name,
                'team_id': team.team_id,
                'logo_url': logo_url,
                'total_teams_beaten': stats['total_teams_beaten'],
                'total_category_wins': stats['total_category_wins'],
                'minutes_played': minutes,
                'minutes_vs_opponent': opponent_minutes,
                'opponent_name': opponent_name,
                'minutes_vs_league_avg': minutes - league_avg_minutes,
                'league_avg_minutes': league_avg_minutes,
                'category_totals': category_totals,  # Add category totals
                'beaten_teams': [get_team_display_name(t) for t in stats['beaten_teams']],
                'matchup_details': stats['matchup_details']
            })
        
        return {
            'matchup_period': matchup_period,
            'export_date': datetime.now().isoformat(),
            'league_avg_minutes': league_avg_minutes,
            'teams': teams_data
        }
    
    except Exception as e:
        print(f"Error exporting week {matchup_period}: {e}")
        import traceback
        traceback.print_exc()
        return None

def export_league_summary(league):
    """Export league summary data"""
    standings = league.standings()
    
    teams_summary = []
    for i, team in enumerate(standings, 1):
        total_games = team.wins + team.losses + team.ties
        win_pct = (team.wins / total_games * 100) if total_games > 0 else 0
        
        # Fix logo URL - ESPN returns relative URLs, need to make them absolute
        logo_url = ''
        if hasattr(team, 'logo_url') and team.logo_url:
            raw_logo = team.logo_url
            if raw_logo.startswith('http'):
                logo_url = raw_logo
            elif raw_logo.startswith('//'):
                logo_url = f'https:{raw_logo}'
            elif raw_logo.startswith('/'):
                logo_url = f'https://a.espncdn.com{raw_logo}'
            else:
                logo_url = f'https://a.espncdn.com/i/teamlogos/nba/500/{raw_logo}'
        
        # ESPN doesn't provide fantasy team logos via API
        # If logo_url is empty, leave it empty (frontend will handle with placeholder)
        # Note: Custom logos are user-uploaded and not available via API
        
        teams_summary.append({
            'rank': i,
            'name': get_team_display_name(team),
            'team_id': team.team_id,
            'logo_url': logo_url,
            'wins': team.wins,
            'losses': team.losses,
            'ties': team.ties,
            'win_percentage': round(win_pct, 1),
            'playoff_seed': team.standing,
            'points_for': team.points_for if hasattr(team, 'points_for') else 0,
            'points_against': team.points_against if hasattr(team, 'points_against') else 0
        })
    
    return {
        'export_date': datetime.now().isoformat(),
        'current_week': league.current_week,
        'current_matchup_period': league.currentMatchupPeriod,
        'league_name': league.settings.name if hasattr(league.settings, 'name') else 'N/A',
        'season': YEAR,
        'teams': teams_summary
    }

def clean_stats(stats):
    """Recursively clean stats dictionary to make it JSON serializable"""
    if stats is None:
        return {}
    
    cleaned = {}
    for key, value in stats.items():
        if isinstance(value, (datetime, date)):
            cleaned[key] = value.isoformat()
        elif isinstance(value, dict):
            cleaned[key] = clean_stats(value)
        elif isinstance(value, (list, tuple)):
            cleaned[key] = [clean_stats(item) if isinstance(item, dict) else 
                           (item.isoformat() if isinstance(item, (datetime, date)) else item)
                           for item in value]
        else:
            # Try to keep the value as-is, but skip if it's not JSON serializable
            try:
                json.dumps(value)
                cleaned[key] = value
            except (TypeError, ValueError):
                cleaned[key] = str(value)  # Convert to string as fallback
    return cleaned

def export_players(league):
    """Export all player data"""
    players_data = []
    
    # Get players from all teams
    for team in league.teams:
        if hasattr(team, 'roster') and team.roster:
            for player in team.roster:
                player_stats = {}
                if hasattr(player, 'stats') and player.stats:
                    player_stats = clean_stats(player.stats)
                
                players_data.append({
                    'name': player.name,
                    'player_id': player.playerId,
                    'position': player.position,
                    'team': get_team_display_name(team),
                    'pro_team': player.proTeam,
                    'injury_status': player.injuryStatus,
                    'stats': player_stats
                })
    
    # Also get free agents
    try:
        free_agents = league.free_agents(size=100)
        for player in free_agents:
            player_stats = {}
            if hasattr(player, 'stats') and player.stats:
                player_stats = clean_stats(player.stats)
            
            players_data.append({
                'name': player.name,
                'player_id': player.playerId,
                'position': player.position,
                'team': 'Free Agent',
                'pro_team': player.proTeam,
                'injury_status': player.injuryStatus,
                'stats': player_stats
            })
    except Exception as e:
        print(f"Error fetching free agents: {e}")
        pass
    
    return {
        'export_date': datetime.now().isoformat(),
        'players': players_data
    }

def main():
    """Main export function"""
    print("Initializing league...")
    league = League(
        league_id=LEAGUE_ID,
        year=YEAR,
        espn_s2=ESPN_S2,
        swid=ESPN_SWID,
        debug=False
    )
    
    print("Exporting league summary...")
    summary = export_league_summary(league)
    with open(DATA_DIR / 'league_summary.json', 'w') as f:
        json.dump(summary, f, indent=2, default=json_serial)
    
    print("Exporting players...")
    players = export_players(league)
    with open(DATA_DIR / 'players.json', 'w') as f:
        json.dump(players, f, indent=2, default=json_serial)
    
    # Export all historical weeks (up to but not including current week)
    # Current week will be fetched live by the API
    current_period = league.currentMatchupPeriod
    
    print(f"Exporting historical weeks (1 through {current_period - 1})...")
    exported_count = 0
    for week in range(1, current_period):  # Exclude current week
        try:
            print(f"Exporting week {week}...")
            week_data = export_week_analytics(league, week)
            if week_data:
                with open(DATA_DIR / f'week{week}.json', 'w') as f:
                    json.dump(week_data, f, indent=2, default=json_serial)
                exported_count += 1
            else:
                print(f"  No data for week {week}, skipping...")
        except Exception as e:
            print(f"  Error exporting week {week}: {e}")
            continue
    
    # Also export current week for initial setup/fallback
    print(f"Exporting current week {current_period} (for fallback)...")
    try:
        week_data = export_week_analytics(league, current_period)
        if week_data:
            with open(DATA_DIR / f'week{current_period}.json', 'w') as f:
                json.dump(week_data, f, indent=2, default=json_serial)
            exported_count += 1
    except Exception as e:
        print(f"  Error exporting current week: {e}")
    
    print(f"Export complete! Exported {exported_count} weeks.")
    print(f"Note: Week {current_period} will be fetched live by the API when requested.")

if __name__ == '__main__':
    main()
