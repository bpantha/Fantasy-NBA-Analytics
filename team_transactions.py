#!/usr/bin/env python3
"""
Show transaction impact for a specific team
"""

from espn_api.basketball import League
import os
from collections import defaultdict

LEAGUE_ID = 39944776
YEAR = 2026
ESPN_S2 = os.getenv('ESPN_S2', 'AEAwWV%2BaozyTIHV5vRNdeXJ1aSx4lqN5nfk77vBKuinqXNGPpl61Tr5HTZYF65Zkw0sNf8Ou74yyVnm87nQtTYRzr1cwox34dhiO5iPJI6OQ9dgPk181YScoAy8VTxgAA6enRIl%2Fxv8JEtv9SdRQ7z8%2Fm0TwKtXoROkpWK4j6%2Fjv1SymLiWZ6ny26HtNuzECTCLQ%2FPEkzenPbr4NIPe%2BZIMbHzc%2BrkCWOcSHR4zLDxEUUfmXNgRy3KGCPGpckgwMQw6X%2FNNNMVuaC3HLG7Za2mRy%2FZMFBowLEFd9c02qDj6Vrg%3D%3D')
ESPN_SWID = os.getenv('ESPN_SWID', '{589899C8-709A-42B5-99E3-BF73799A3D36}')

def get_team_display_name(team):
    return team.team_name

def main():
    team_name_filter = "Sugg(s) mah Johnson"
    
    league = League(
        league_id=LEAGUE_ID,
        year=YEAR,
        espn_s2=ESPN_S2,
        swid=ESPN_SWID,
        debug=False
    )
    
    print("=" * 80)
    print(f"📊 TRANSACTION IMPACT - {team_name_filter}")
    print(f"Week: {league.current_week} (Matchup Period: {league.currentMatchupPeriod})")
    print("=" * 80)
    
    # Find the team
    target_team = None
    for team in league.teams:
        if team_name_filter.lower() in team.team_name.lower() or team.team_name.lower() in team_name_filter.lower():
            target_team = team
            break
    
    if not target_team:
        print(f"Team '{team_name_filter}' not found.")
        return
    
    print(f"\nTeam: {target_team.team_name}")
    print(f"Record: {target_team.wins}-{target_team.losses}-{target_team.ties}")
    print("=" * 80)
    
    # Get transactions for current week
    try:
        transactions = league.transactions()
        
        team_transactions = []
        for transaction in transactions:
            if hasattr(transaction, 'team') and transaction.team.team_id == target_team.team_id:
                team_transactions.append(transaction)
        
        print(f"\n📋 Transactions This Week ({len(team_transactions)} total):")
        print("-" * 80)
        
        if not team_transactions:
            print("   No transactions this week.")
        else:
            adds = []
            drops = []
            
            for transaction in team_transactions:
                trans_type = transaction.type if hasattr(transaction, 'type') else "Unknown"
                period = transaction.scoring_period if hasattr(transaction, 'scoring_period') else "?"
                date = transaction.date if hasattr(transaction, 'date') else None
                
                if hasattr(transaction, 'items'):
                    for item in transaction.items:
                        if hasattr(item, 'type') and hasattr(item, 'player'):
                            if item.type == 'ADD' or item.type == 'ADDED':
                                adds.append((str(item.player), date, period))
                            elif item.type == 'DROP' or item.type == 'DROPPED':
                                drops.append((str(item.player), date, period))
            
            if adds:
                print(f"\n📥 Players Added ({len(adds)}):")
                for player, date, period in adds:
                    print(f"   • {player} (Week {period})")
            
            if drops:
                print(f"\n📤 Players Dropped ({len(drops)}):")
                for player, date, period in drops:
                    print(f"   • {player} (Week {period})")
            
            if not adds and not drops:
                print("   Transaction details not available in expected format.")
    
    except Exception as e:
        print(f"Error getting transactions: {e}")
        import traceback
        traceback.print_exc()
    
    # Get recent activity
    try:
        activities = league.recent_activity(size=50)
        
        print(f"\n📈 Recent Activity (Last 2 weeks):")
        print("-" * 80)
        
        team_activities = []
        for activity in activities:
            if hasattr(activity, 'actions'):
                for action_tuple in activity.actions:
                    if len(action_tuple) >= 1:
                        team = action_tuple[0]
                        if hasattr(team, 'team_id') and team.team_id == target_team.team_id:
                            team_activities.append(activity)
                            break
        
        if team_activities:
            adds_activity = []
            drops_activity = []
            
            for activity in team_activities[:20]:
                if hasattr(activity, 'actions'):
                    for action_tuple in activity.actions:
                        if len(action_tuple) >= 3:
                            team, action, player = action_tuple[0], action_tuple[1], action_tuple[2]
                            if action == 'FA ADDED' or action == 'WAIVER ADDED':
                                adds_activity.append(player)
                            elif action == 'DROPPED':
                                drops_activity.append(player)
            
            if adds_activity:
                print(f"\n📥 Recent Adds ({len(adds_activity)}):")
                for player in adds_activity:
                    print(f"   • {player}")
            
            if drops_activity:
                print(f"\n📤 Recent Drops ({len(drops_activity)}):")
                for player in drops_activity:
                    print(f"   • {player}")
        else:
            print("   No recent activity found.")
    
    except Exception as e:
        print(f"Error getting activity: {e}")
    
    # Show current week performance
    try:
        box_scores = league.box_scores(matchup_period=league.currentMatchupPeriod)
        
        print(f"\n📊 Current Week Performance:")
        print("-" * 80)
        
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            if home_team.team_id == target_team.team_id or away_team.team_id == target_team.team_id:
                opponent = away_team if home_team.team_id == target_team.team_id else home_team
                
                if hasattr(box_score, 'home_wins') and hasattr(box_score, 'away_wins'):
                    if home_team.team_id == target_team.team_id:
                        wins = box_score.home_wins
                        losses = box_score.home_losses
                        opponent_wins = box_score.away_wins
                    else:
                        wins = box_score.away_wins
                        losses = box_score.away_losses
                        opponent_wins = box_score.home_wins
                    
                    print(f"   vs {get_team_display_name(opponent)}: {wins}-{losses}")
                    print(f"   (Opponent: {opponent_wins} category wins)")
                break
    
    except Exception as e:
        pass

if __name__ == "__main__":
    main()
