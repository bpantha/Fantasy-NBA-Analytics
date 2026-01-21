#!/usr/bin/env python3
"""
Export analytics data to JSON files
Runs the analytics script and saves results to JSON
"""

import sys
import json
from pathlib import Path
from datetime import datetime
import os

# Add parent directory to path to import league_analytics
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from espn_api.basketball import League

# Get credentials from environment or use defaults
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = int(os.getenv('YEAR', '2026'))
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

def get_team_display_name(team):
    """Get team name for display"""
    return team.team_name
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / 'data' / 'analytics'
DATA_DIR.mkdir(parents=True, exist_ok=True)

def export_week_analytics(league, matchup_period):
    """Export analytics for a specific week to JSON"""
    try:
        box_scores = league.box_scores(matchup_period=matchup_period)
        
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
        
        # Sort teams by total teams beaten
        sorted_teams = sorted(team_totals.items(), 
                            key=lambda x: (x[1]['total_teams_beaten'], x[1]['total_category_wins']), 
                            reverse=True)
        
        for team, stats in sorted_teams:
            team_name = get_team_display_name(team)
            minutes = team_minutes.get(team, 0)
            
            # Find opponent
            opponent_name = None
            opponent_minutes = None
            for (team1, team2), mins in matchup_minutes.items():
                if team1 == team:
                    opponent_name = get_team_display_name(team2)
                    opponent_minutes = mins
                    break
            
            teams_data.append({
                'name': team_name,
                'team_id': team.team_id,
                'total_teams_beaten': stats['total_teams_beaten'],
                'total_category_wins': stats['total_category_wins'],
                'minutes_played': minutes,
                'minutes_vs_opponent': opponent_minutes,
                'opponent_name': opponent_name,
                'minutes_vs_league_avg': minutes - league_avg_minutes,
                'league_avg_minutes': league_avg_minutes,
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
        
        teams_summary.append({
            'rank': i,
            'name': get_team_display_name(team),
            'team_id': team.team_id,
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

def export_players(league):
    """Export all player data"""
    players_data = []
    
    # Get players from all teams
    for team in league.teams:
        if hasattr(team, 'roster') and team.roster:
            for player in team.roster:
                players_data.append({
                    'name': player.name,
                    'player_id': player.playerId,
                    'position': player.position,
                    'team': get_team_display_name(team),
                    'pro_team': player.proTeam,
                    'injury_status': player.injuryStatus,
                    'stats': player.stats if hasattr(player, 'stats') else {}
                })
    
    # Also get free agents
    try:
        free_agents = league.free_agents(size=100)
        for player in free_agents:
            players_data.append({
                'name': player.name,
                'player_id': player.playerId,
                'position': player.position,
                'team': 'Free Agent',
                'pro_team': player.proTeam,
                'injury_status': player.injuryStatus,
                'stats': player.stats if hasattr(player, 'stats') else {}
            })
    except:
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
        json.dump(summary, f, indent=2)
    
    print("Exporting players...")
    players = export_players(league)
    with open(DATA_DIR / 'players.json', 'w') as f:
        json.dump(players, f, indent=2)
    
    # Export current week and last week
    current_period = league.currentMatchupPeriod
    last_period = current_period - 1
    
    if last_period >= 1:
        print(f"Exporting week {last_period}...")
        week_data = export_week_analytics(league, last_period)
        if week_data:
            with open(DATA_DIR / f'week{last_period}.json', 'w') as f:
                json.dump(week_data, f, indent=2)
    
    print(f"Exporting week {current_period}...")
    week_data = export_week_analytics(league, current_period)
    if week_data:
        with open(DATA_DIR / f'week{current_period}.json', 'w') as f:
            json.dump(week_data, f, indent=2)
    
    print("Export complete!")

if __name__ == '__main__':
    main()
