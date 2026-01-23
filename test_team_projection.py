#!/usr/bin/env python3
"""
Test script to break down projected PTS for a specific team
Shows current accumulated stats + projected additions from remaining games
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from espn_api.basketball import League
from backend.app import project_team_stats, get_current_week

# Configuration
LEAGUE_ID = int(os.getenv('LEAGUE_ID', '39944776'))
YEAR = int(os.getenv('YEAR', '2026'))
ESPN_S2 = os.getenv('ESPN_S2', '')
ESPN_SWID = os.getenv('ESPN_SWID', '')

TEAM_NAME = "Sugg(s) mah johnson"

def main():
    print("=" * 80)
    print(f"📊 PROJECTED PTS BREAKDOWN FOR: {TEAM_NAME}")
    print("=" * 80)
    print()
    
    # Initialize league
    print("🔗 Connecting to ESPN...")
    league = League(league_id=LEAGUE_ID, year=YEAR, espn_s2=ESPN_S2, swid=ESPN_SWID, fetch_league=True)
    
    current_week = league.currentMatchupPeriod
    current_scoring_period = league.current_week
    
    print(f"✅ Connected")
    print(f"   Current Matchup Period: {current_week}")
    print(f"   Current Scoring Period: {current_scoring_period}")
    print()
    
    # Get box scores
    print("📥 Fetching box scores...")
    league.fetch_league()  # Refresh to get latest
    current_scoring_period = league.current_week
    box_scores = league.box_scores(matchup_period=current_week, scoring_period=current_scoring_period, matchup_total=True)
    
    if not box_scores:
        print("❌ No box scores found")
        return
    
    print(f"✅ Found {len(box_scores)} matchups")
    print()
    
    # Find the team
    target_box_score = None
    is_home = None
    
    for box_score in box_scores:
        home_team = box_score.home_team
        away_team = box_score.away_team
        
        if isinstance(home_team, int):
            home_team = league.get_team_data(home_team)
        if isinstance(away_team, int):
            away_team = league.get_team_data(away_team)
        
        home_name = home_team.team_name if hasattr(home_team, 'team_name') else str(home_team)
        away_name = away_team.team_name if hasattr(away_team, 'team_name') else str(away_team)
        
        if TEAM_NAME.lower() in home_name.lower():
            target_box_score = box_score
            is_home = True
            opponent = away_team
            opponent_name = away_name
            break
        elif TEAM_NAME.lower() in away_name.lower():
            target_box_score = box_score
            is_home = False
            opponent = home_team
            opponent_name = home_name
            break
    
    if not target_box_score:
        print(f"❌ Team '{TEAM_NAME}' not found in current week matchups")
        return
    
    print(f"✅ Found team: {TEAM_NAME}")
    print(f"   Opponent: {opponent_name}")
    print(f"   Home/Away: {'Home' if is_home else 'Away'}")
    print()
    
    # Get current stats
    stats = target_box_score.home_stats if is_home else target_box_score.away_stats
    current_pts = 0.0
    
    if stats and 'PTS' in stats:
        current_pts = float(stats['PTS'].get('value', 0) or 0)
    
    print("=" * 80)
    print("📈 CURRENT ACCUMULATED STATS")
    print("=" * 80)
    print(f"   Current PTS: {current_pts:.1f}")
    print()
    
    # Build player lookup
    player_lookup = {}
    for team_obj in league.teams:
        for roster_player in team_obj.roster:
            player_id = getattr(roster_player, 'playerId', None)
            if player_id:
                player_lookup[player_id] = roster_player
    
    # Build pro team reverse map
    from espn_api.basketball.constant import PRO_TEAM_MAP
    pro_team_reverse_map = {v: k for k, v in PRO_TEAM_MAP.items()}
    
    # Get lineup
    lineup = target_box_score.home_lineup if is_home else target_box_score.away_lineup
    
    if not lineup:
        print("❌ No lineup found")
        return
    
    print(f"✅ Found {len(lineup)} players in lineup")
    print()
    
    # Get pro schedule
    pro_schedule = league.pro_schedule
    
    # Get remaining scoring periods using the same logic as project_team_stats
    from datetime import datetime
    matchup_scoring_periods = league.matchup_ids.get(current_week, [])
    scoring_periods = []
    for sp in matchup_scoring_periods:
        try:
            sp_int = int(sp)
            scoring_periods.append(sp_int)
        except (ValueError, TypeError):
            continue
    
    remaining_periods = [sp for sp in scoring_periods if sp >= current_scoring_period]
    
    # Use same fix as in project_team_stats - calculate days until Sunday
    if not remaining_periods:
        today = datetime.now()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0 and today.weekday() != 6:
            days_until_sunday = 7
        if today.weekday() == 6:
            days_until_sunday = 0
        
        days_remaining = min(days_until_sunday + 1, 3)  # Max 3 days (Fri/Sat/Sun)
        end_period = min(current_scoring_period + days_remaining - 1, league.finalScoringPeriod)
        remaining_periods = list(range(current_scoring_period, end_period + 1))
    
    print("=" * 80)
    print("📅 REMAINING SCORING PERIODS")
    print("=" * 80)
    print(f"   Current Scoring Period: {current_scoring_period}")
    print(f"   Remaining Periods: {remaining_periods}")
    print(f"   Total Remaining Days: {len(remaining_periods)}")
    print()
    
    # Track projections per player
    player_projections = {}
    
    # For each remaining scoring period
    for scoring_period in remaining_periods:
        scoring_period_str = str(scoring_period)
        
        # Check each player
        for player in lineup:
            # Check injury status
            injury_status = getattr(player, 'injuryStatus', None) or ''
            if injury_status and injury_status.upper() == 'OUT':
                continue
            
            # Get pro team
            pro_team_id = None
            try:
                pro_team_name = getattr(player, 'proTeam', None)
                if pro_team_name:
                    pro_team_id = pro_team_reverse_map.get(pro_team_name)
            except:
                continue
            
            if not pro_team_id:
                continue
            
            # Check if has game this period
            if pro_team_id not in pro_schedule:
                continue
            
            team_games = pro_schedule[pro_team_id]
            if scoring_period_str not in team_games:
                continue
            
            # Player has a game - get their average
            player_id = getattr(player, 'playerId', None)
            player_name = getattr(player, 'name', 'unknown')
            
            # Get average stats
            avg_stats = {}
            if hasattr(player, 'nine_cat_averages'):
                try:
                    avg_stats = player.nine_cat_averages
                except:
                    pass
            
            if not avg_stats:
                player_stats = getattr(player, 'stats', {})
                season_total_key = f'{league.year}_total'
                if season_total_key in player_stats:
                    avg_stats = player_stats[season_total_key].get('avg', {})
            
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
                pts_avg = float(avg_stats.get('PTS', 0) or 0)
                
                # Track this player's projection
                if player_name not in player_projections:
                    player_projections[player_name] = {
                        'games': 0,
                        'pts_per_game': pts_avg,
                        'total_pts': 0.0,
                        'pro_team': pro_team_name,
                        'injury': injury_status
                    }
                
                player_projections[player_name]['games'] += 1
                player_projections[player_name]['total_pts'] += pts_avg
    
    # Calculate total projected
    total_projected_pts = sum(p['total_pts'] for p in player_projections.values())
    final_projected_pts = current_pts + total_projected_pts
    
    print("=" * 80)
    print("👥 PLAYER BREAKDOWN")
    print("=" * 80)
    print(f"{'Player':<30} {'Team':<8} {'Games':<8} {'Avg PTS':<10} {'Total PTS':<12} {'Status':<10}")
    print("-" * 80)
    
    for player_name, proj in sorted(player_projections.items(), key=lambda x: x[1]['total_pts'], reverse=True):
        status = proj['injury'] if proj['injury'] else 'Healthy'
        print(f"{player_name:<30} {proj['pro_team']:<8} {proj['games']:<8} {proj['pts_per_game']:<10.1f} {proj['total_pts']:<12.1f} {status:<10}")
    
    print("-" * 80)
    print(f"{'TOTAL PROJECTED ADDITION':<30} {'':<8} {'':<8} {'':<10} {total_projected_pts:<12.1f}")
    print()
    
    print("=" * 80)
    print("📊 FINAL PROJECTION")
    print("=" * 80)
    print(f"   Current Accumulated PTS: {current_pts:.1f}")
    print(f"   Projected Addition:      {total_projected_pts:.1f}")
    print(f"   ─────────────────────────────")
    print(f"   TOTAL PROJECTED PTS:    {final_projected_pts:.1f}")
    print()
    
    # Also run the actual projection function to compare
    print("=" * 80)
    print("🔍 VERIFICATION: Using project_team_stats() function")
    print("=" * 80)
    team = target_box_score.home_team if is_home else target_box_score.away_team
    if isinstance(team, int):
        team = league.get_team_data(team)
    
    projected = project_team_stats(
        target_box_score, 
        team, 
        opponent, 
        is_home, 
        league, 
        current_week, 
        player_lookup, 
        pro_team_reverse_map
    )
    
    print(f"   Function Result PTS: {projected.get('PTS', 0):.1f}")
    print(f"   Manual Calculation:  {final_projected_pts:.1f}")
    print(f"   Difference:          {abs(projected.get('PTS', 0) - final_projected_pts):.1f}")
    print()
    
    if abs(projected.get('PTS', 0) - final_projected_pts) < 0.1:
        print("✅ Results match!")
    else:
        print("⚠️  Results differ - may need investigation")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
