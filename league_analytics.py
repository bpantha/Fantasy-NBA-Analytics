#!/usr/bin/env python3
"""
Fantasy Basketball League Analytics
Shows matchup wins, head-to-head records, and category breakdowns

Usage:
    python3 league_analytics.py                    # Shows last week and current week
    python3 league_analytics.py --week 13          # Shows specific matchup period
    python3 league_analytics.py --last-week        # Shows only last week
    python3 league_analytics.py --current-week      # Shows only current week
"""

from espn_api.basketball import League
from collections import defaultdict
import os
import sys
import argparse

# League information
LEAGUE_ID = 39944776
YEAR = 2026

# Authentication cookies
ESPN_S2 = os.getenv('ESPN_S2', 'AEAwWV%2BaozyTIHV5vRNdeXJ1aSx4lqN5nfk77vBKuinqXNGPpl61Tr5HTZYF65Zkw0sNf8Ou74yyVnm87nQtTYRzr1cwox34dhiO5iPJI6OQ9dgPk181YScoAy8VTxgAA6enRIl%2Fxv8JEtv9SdRQ7z8%2Fm0TwKtXoROkpWK4j6%2Fjv1SymLiWZ6ny26HtNuzECTCLQ%2FPEkzenPbr4NIPe%2BZIMbHzc%2BrkCWOcSHR4zLDxEUUfmXNgRy3KGCPGpckgwMQw6X%2FNNNMVuaC3HLG7Za2mRy%2FZMFBowLEFd9c02qDj6Vrg%3D%3D')
ESPN_SWID = os.getenv('ESPN_SWID', '{589899C8-709A-42B5-99E3-BF73799A3D36}')

# Category emojis
CATEGORY_EMOJIS = {
    'PTS': '🏀', 'REB': '📊', 'AST': '🎯', 'STL': '⚡', 'BLK': '🛡️',
    'FG%': '🎨', 'FT%': '💯', '3PM': '🔥', 'TO': '❌'
}

def get_team_display_name(team):
    """Get team name for display"""
    return team.team_name

def analyze_week(league, matchup_period, week_label=""):
    """Analyze a specific week's matchups"""
    if matchup_period < 1:
        print(f"No matchup period {matchup_period} available.")
        return False
    
    # Get matchups for this period
    matchups = league.scoreboard(matchup_period)
    
    if not matchups:
        print(f"No matchups found for matchup period {matchup_period}.")
        return False
    
    # Check if it's a category league
    scoring_type = league.settings.scoring_type if hasattr(league.settings, 'scoring_type') else None
    is_category_league = scoring_type in ['H2H_CATEGORY', 'H2H_MOST_CATEGORIES']
    
    if is_category_league:
        analyze_category_wins_ranking(league, matchup_period, week_label)
        analyze_minutes_played(league, matchup_period)
    else:
        # For points leagues, just show matchup wins
        analyze_matchup_wins_simple(league, matchups)
        analyze_minutes_played(league, matchup_period)
    
    return True

def analyze_category_wins_ranking(league, matchup_period, week_label=""):
    """Analyze which teams beat the most teams in each category"""
    label_text = f" - {week_label}" if week_label else ""
    print(f"\n📊 CATEGORY WINS RANKING{label_text}:")
    print("=" * 80)
    print(f"📅 MATCHUP PERIOD: {matchup_period}")
    print("=" * 80)
    
    try:
        box_scores = league.box_scores(matchup_period=matchup_period)
        
        if not box_scores:
            print("No box scores available for current matchup period.")
            return
        
        # First, collect all team category totals for the week
        # team -> category -> value
        team_category_totals = defaultdict(lambda: defaultdict(float))
        standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
        all_teams = set()
        
        # Collect category totals for each team from their matchups
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            all_teams.add(home_team)
            all_teams.add(away_team)
            
            # Only process if matchup is finalized
            if box_score.winner != 'UNDECIDED' and hasattr(box_score, 'home_stats') and hasattr(box_score, 'away_stats'):
                # Get category values for each team
                for category in box_score.home_stats.keys():
                    if category not in standard_cats:
                        continue
                    
                    home_value = box_score.home_stats[category].get('value', 0)
                    away_value = box_score.away_stats[category].get('value', 0)
                    
                    team_category_totals[home_team][category] = home_value
                    team_category_totals[away_team][category] = away_value
        
        # Now compare each team against ALL other teams
        # Track: team -> category -> set of teams they beat in that category
        team_category_wins = defaultdict(lambda: defaultdict(set))
        # Track: team -> category -> set of teams they lost to in that category
        team_category_losses = defaultdict(lambda: defaultdict(set))
        # Track: team -> opponent -> (categories_won, categories_lost, categories_tied, won_cats, lost_cats)
        team_matchup_details = defaultdict(lambda: defaultdict(lambda: {'won': 0, 'lost': 0, 'tied': 0, 'won_cats': [], 'lost_cats': []}))
        # Track: team -> set of teams they beat (5+ categories)
        teams_beaten = defaultdict(set)
        
        # Compare every team against every other team
        for team1 in all_teams:
            for team2 in all_teams:
                if team1 == team2:
                    continue
                
                # Count how many categories team1 beats team2 in
                categories_won = 0
                categories_lost = 0
                categories_tied = 0
                won_cats = []
                lost_cats = []
                
                for category in standard_cats:
                    team1_value = team_category_totals[team1].get(category, 0)
                    team2_value = team_category_totals[team2].get(category, 0)
                    
                    # For percentage categories, higher is better
                    # For TO (turnovers), lower is better
                    if category == 'TO':
                        if team1_value < team2_value:
                            team_category_wins[team1][category].add(team2)
                            team_category_losses[team2][category].add(team1)
                            categories_won += 1
                            won_cats.append(category)
                        elif team1_value > team2_value:
                            team_category_losses[team1][category].add(team2)
                            team_category_wins[team2][category].add(team1)
                            categories_lost += 1
                            lost_cats.append(category)
                        else:
                            categories_tied += 1
                    else:
                        if team1_value > team2_value:
                            team_category_wins[team1][category].add(team2)
                            team_category_losses[team2][category].add(team1)
                            categories_won += 1
                            won_cats.append(category)
                        elif team1_value < team2_value:
                            team_category_losses[team1][category].add(team2)
                            team_category_wins[team2][category].add(team1)
                            categories_lost += 1
                            lost_cats.append(category)
                        else:
                            categories_tied += 1
                
                # Store matchup details
                team_matchup_details[team1][team2] = {
                    'won': categories_won,
                    'lost': categories_lost,
                    'tied': categories_tied,
                    'won_cats': won_cats,
                    'lost_cats': lost_cats
                }
                
                # If team1 won 5+ categories against team2, count it as a "win"
                if categories_won >= 5:
                    teams_beaten[team1].add(team2)
        
        # Calculate totals for each team
        team_totals = {}
        for team in all_teams:
            beaten_teams = teams_beaten.get(team, set())
            category_wins = team_category_wins.get(team, {})
            matchup_details = team_matchup_details.get(team, {})
            
            # Count total category wins (across all teams beaten)
            total_category_wins = sum(len(beaten_teams_in_cat) for beaten_teams_in_cat in category_wins.values())
            
            team_totals[team] = {
                'total_teams_beaten': len(beaten_teams),
                'category_wins': category_wins,
                'total_category_wins': total_category_wins,
                'beaten_teams': beaten_teams,
                'matchup_details': matchup_details
            }
        
        # Sort by total teams beaten, then by total category wins
        sorted_teams = sorted(team_totals.items(), 
                            key=lambda x: (x[1]['total_teams_beaten'], x[1]['total_category_wins']), 
                            reverse=True)
        
        print("\nRanked by total teams beaten, then category wins:")
        print("=" * 80)
        
        for rank, (team, stats) in enumerate(sorted_teams, 1):
            team_name = get_team_display_name(team)
            total_beaten = stats['total_teams_beaten']
            total_cat_wins = stats['total_category_wins']
            
            print(f"\n{rank}. {team_name}")
            print(f"   Teams Beaten: {total_beaten} | Total Category Wins: {total_cat_wins}")
            
            # Show breakdown by teams beaten (5+ categories)
            beaten_teams_list = list(stats.get('beaten_teams', set()))
            matchup_details = stats.get('matchup_details', {})
            
            if beaten_teams_list:
                for beaten_team in sorted(beaten_teams_list, key=lambda t: get_team_display_name(t)):
                    beaten_name = get_team_display_name(beaten_team)
                    
                    # Get matchup details
                    matchup = matchup_details.get(beaten_team, {})
                    won_cats = matchup.get('won_cats', [])
                    lost_cats = matchup.get('lost_cats', [])
                    won_count = matchup.get('won', 0)
                    lost_count = matchup.get('lost', 0)
                    tied_count = matchup.get('tied', 0)
                    
                    # Format categories won
                    won_cats_formatted = []
                    for category in won_cats:
                        emoji = CATEGORY_EMOJIS.get(category, '📈')
                        won_cats_formatted.append(f"{emoji} {category}")
                    
                    # Format categories lost
                    lost_cats_formatted = []
                    for category in lost_cats:
                        emoji = CATEGORY_EMOJIS.get(category, '📈')
                        lost_cats_formatted.append(f"{emoji} {category}")
                    
                    # Show the matchup result
                    result_str = f"{won_count}-{lost_count}"
                    if tied_count > 0:
                        result_str += f"-{tied_count}"
                    
                    print(f"   Beat {beaten_name} ({result_str}):")
                    if won_cats_formatted:
                        print(f"      Won: {', '.join(won_cats_formatted)}")
                    if lost_cats_formatted:
                        print(f"      Lost: {', '.join(lost_cats_formatted)}")
            else:
                print("   Beat no teams (didn't win 5+ categories against any team)")
        
        # Show teams not in any matchups or with no wins
        all_teams_in_matchups = set()
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            all_teams_in_matchups.add(home_team)
            all_teams_in_matchups.add(away_team)
        
        teams_with_wins = set(team_totals.keys())
        teams_without_wins = all_teams_in_matchups - teams_with_wins
        
        if teams_without_wins:
            print(f"\nTeams that beat no one:")
            for team in sorted(teams_without_wins, key=lambda t: get_team_display_name(t)):
                team_name = get_team_display_name(team)
                print(f"   {team_name}")
    
    except Exception as e:
        print(f"Error analyzing category wins: {e}")
        import traceback
        traceback.print_exc()

def analyze_matchup_wins_simple(league, matchups):
    """Simple matchup wins for points leagues"""
    weekly_wins = defaultdict(list)
    
    for matchup in matchups:
        home_team = matchup.home_team
        away_team = matchup.away_team
        
        if isinstance(home_team, int):
            home_team = league.get_team_data(home_team)
        if isinstance(away_team, int):
            away_team = league.get_team_data(away_team)
        
        if matchup.winner == 'HOME':
            weekly_wins[home_team].append(away_team)
        elif matchup.winner == 'AWAY':
            weekly_wins[away_team].append(home_team)
    
    sorted_wins = sorted(weekly_wins.items(), key=lambda x: len(x[1]), reverse=True)
    
    print("\n📊 MOST MATCHUP WINS THIS WEEK:")
    print("-" * 80)
    
    for team, beaten_teams in sorted_wins:
        team_name = get_team_display_name(team)
        beaten_names = [get_team_display_name(t) for t in beaten_teams]
        print(f"{team_name} (beat {', '.join(beaten_names)})")

def analyze_head_to_head(league):
    """Build head-to-head record matrix"""
    print("\n" + "=" * 80)
    print("📈 HEAD-TO-HEAD RECORDS")
    print("=" * 80)
    
    # Build H2H matrix
    h2h_records = defaultdict(lambda: defaultdict(lambda: {'wins': 0, 'losses': 0, 'ties': 0}))
    
    # Go through all completed matchups
    for team in league.teams:
        for matchup in team.schedule:
            if not hasattr(matchup, 'home_team') or not hasattr(matchup, 'away_team'):
                continue
            
            home_team = matchup.home_team
            away_team = matchup.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            # Skip if matchup not completed
            if matchup.winner == 'UNDECIDED':
                continue
            
            # Update H2H records
            if matchup.winner == 'HOME':
                h2h_records[home_team][away_team]['wins'] += 1
                h2h_records[away_team][home_team]['losses'] += 1
            elif matchup.winner == 'AWAY':
                h2h_records[away_team][home_team]['wins'] += 1
                h2h_records[home_team][away_team]['losses'] += 1
            else:
                h2h_records[home_team][away_team]['ties'] += 1
                h2h_records[away_team][home_team]['ties'] += 1
    
    # Display H2H matrix
    teams = sorted(league.teams, key=lambda t: t.team_name)
    
    print("\nH2H Record Matrix (W-L-T):")
    print("-" * 80)
    
    # Header row - use team names or abbrevs
    header = f"{'Team':<20}"
    abbrevs = []
    for team in teams:
        team_name = get_team_display_name(team)
        abbrev = team.team_abbrev if hasattr(team, 'team_abbrev') and team.team_abbrev else team_name[:6]
        abbrevs.append(abbrev)
        header += f"{abbrev:>10}"
    print(header)
    print("-" * 80)
    
    # Data rows
    for i, team1 in enumerate(teams):
        team_name = get_team_display_name(team1)
        row = f"{team_name[:19]:<20}"
        for j, team2 in enumerate(teams):
            if team1 == team2:
                row += "    --    "
            else:
                record = h2h_records[team1][team2]
                w, l, t = record['wins'], record['losses'], record['ties']
                if w + l + t > 0:
                    row += f"  {w}-{l}-{t:<3}"
                else:
                    row += "    --    "
        print(row)

def analyze_minutes_played(league, matchup_period):
    """Analyze total minutes played by each team against opponent and league"""
    print("\n" + "=" * 80)
    print("⏱️  MINUTES PLAYED ANALYSIS")
    print("=" * 80)
    print(f"📅 MATCHUP PERIOD: {matchup_period}")
    print("=" * 80)
    
    try:
        box_scores = league.box_scores(matchup_period=matchup_period)
        
        if not box_scores:
            print("No box scores available for this matchup period.")
            return
        
        # Track minutes per team
        team_minutes = defaultdict(float)  # team -> total minutes
        matchup_minutes = {}  # (team1, team2) -> minutes for team1
        
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            # Get lineups and calculate minutes
            if hasattr(box_score, 'home_lineup') and hasattr(box_score, 'away_lineup'):
                home_minutes = 0
                away_minutes = 0
                
                # Calculate home team minutes
                for player in box_score.home_lineup:
                    if hasattr(player, 'points_breakdown') and player.points_breakdown:
                        # MIN is available as 'MIN' in the breakdown
                        min_value = player.points_breakdown.get('MIN', 0)
                        if isinstance(min_value, (int, float)) and min_value > 0:
                            home_minutes += min_value
                
                # Calculate away team minutes
                for player in box_score.away_lineup:
                    if hasattr(player, 'points_breakdown') and player.points_breakdown:
                        min_value = player.points_breakdown.get('MIN', 0)
                        if isinstance(min_value, (int, float)) and min_value > 0:
                            away_minutes += min_value
                
                team_minutes[home_team] += home_minutes
                team_minutes[away_team] += away_minutes
                matchup_minutes[(home_team, away_team)] = home_minutes
                matchup_minutes[(away_team, home_team)] = away_minutes
        
        # Calculate league average
        if team_minutes:
            league_avg_minutes = sum(team_minutes.values()) / len(team_minutes)
        else:
            league_avg_minutes = 0
        
        # Sort teams by total minutes
        sorted_teams = sorted(team_minutes.items(), key=lambda x: x[1], reverse=True)
        
        print("\nTotal Minutes Played (vs Opponent | vs League Average):")
        print("-" * 80)
        
        for team, total_minutes in sorted_teams:
            team_name = get_team_display_name(team)
            
            # Find opponent minutes for this team
            opponent_minutes = None
            for (team1, team2), minutes in matchup_minutes.items():
                if team1 == team:
                    opponent_minutes = minutes
                    opponent_team = team2
                    break
            
            if opponent_minutes is not None:
                opponent_name = get_team_display_name(opponent_team)
                vs_opponent = f"{total_minutes:.1f} min vs {opponent_name}"
            else:
                vs_opponent = f"{total_minutes:.1f} min (no opponent data)"
            
            vs_league = f"{total_minutes - league_avg_minutes:+.1f} min vs league avg ({league_avg_minutes:.1f})"
            
            print(f"{team_name:<30} {vs_opponent:<40} {vs_league}")
        
        print(f"\nLeague Average: {league_avg_minutes:.1f} minutes")
        
    except Exception as e:
        print(f"Error analyzing minutes: {e}")
        import traceback
        traceback.print_exc()

def analyze_category_performance(league):
    """Analyze category performance if it's a category league"""
    print("\n" + "=" * 80)
    print("📊 CATEGORY PERFORMANCE")
    print("=" * 80)
    
    # Check if it's a category league
    scoring_type = league.settings.scoring_type if hasattr(league.settings, 'scoring_type') else None
    
    if scoring_type != 'H2H_CATEGORY' and scoring_type != 'H2H_MOST_CATEGORIES':
        print("This league uses points scoring, not categories.")
        return
    
    # Get box scores for current matchup period
    try:
        box_scores = league.box_scores(matchup_period=league.currentMatchupPeriod)
        
        if not box_scores:
            print("No box scores available for current matchup period.")
            return
        
        # Aggregate category wins/losses per team
        team_categories = defaultdict(lambda: defaultdict(lambda: {'wins': 0, 'losses': 0, 'ties': 0}))
        
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            if hasattr(box_score, 'home_stats') and hasattr(box_score, 'away_stats'):
                # Compare categories
                for category in box_score.home_stats.keys():
                    home_result = box_score.home_stats[category]['result']
                    away_result = box_score.away_stats[category]['result']
                    
                    if home_result == 'WIN':
                        team_categories[home_team][category]['wins'] += 1
                        team_categories[away_team][category]['losses'] += 1
                    elif home_result == 'LOSS':
                        team_categories[home_team][category]['losses'] += 1
                        team_categories[away_team][category]['wins'] += 1
                    else:  # TIE
                        team_categories[home_team][category]['ties'] += 1
                        team_categories[away_team][category]['ties'] += 1
        
        # Display category performance
        print("\nCategory Records This Week:")
        print("-" * 80)
        
        for team in sorted(league.teams, key=lambda t: t.team_name):
            team_name = get_team_display_name(team)
            print(f"\n👤 {team_name}")
            
            if team in team_categories:
                total_wins = sum(cat['wins'] for cat in team_categories[team].values())
                total_losses = sum(cat['losses'] for cat in team_categories[team].values())
                total_ties = sum(cat['ties'] for cat in team_categories[team].values())
                
                print(f"   Overall: {total_wins}-{total_losses}-{total_ties}")
                print("   Categories:")
                
                # Only show standard 9-category stats (filter out FGA, FGM, FTA, FTM)
                standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
                for category in standard_cats:
                    if category in team_categories[team]:
                        record = team_categories[team][category]
                        emoji = CATEGORY_EMOJIS.get(category, '📈')
                        w, l, t = record['wins'], record['losses'], record['ties']
                        result_emoji = '🟢' if w > l else '🔴' if l > w else '🟡'
                        print(f"      {emoji} {category}: {w}-{l}-{t} {result_emoji}")
            else:
                print("   No category data available")
    
    except Exception as e:
        print(f"Could not fetch category data: {e}")

def analyze_overall_wins(league):
    """Show overall season matchup wins"""
    print("\n" + "=" * 80)
    print("🏆 OVERALL SEASON MATCHUP WINS")
    print("=" * 80)
    
    standings = league.standings()
    
    # Sort by wins (descending)
    sorted_by_wins = sorted(standings, key=lambda t: (t.wins, -t.losses), reverse=True)
    
    print("\nTeams ranked by total matchup wins:")
    print("-" * 80)
    
    for i, team in enumerate(sorted_by_wins, 1):
        team_name = get_team_display_name(team)
        win_pct = (team.wins / (team.wins + team.losses + team.ties) * 100) if (team.wins + team.losses + team.ties) > 0 else 0
        print(f"{i:2}. {team_name:<30} {team.wins:3} wins ({team.wins}-{team.losses}-{team.ties}) - {win_pct:.1f}%")
    
    # Show top winner(s)
    top_wins = sorted_by_wins[0].wins
    top_teams = [t for t in sorted_by_wins if t.wins == top_wins]
    
    print("\n" + "-" * 80)
    if len(top_teams) == 1:
        team_name = get_team_display_name(top_teams[0])
        print(f"🥇 Most Matchup Wins: {team_name} with {top_wins} wins!")
    else:
        team_names = [get_team_display_name(t) for t in top_teams]
        print(f"🥇 Most Matchup Wins (Tied): {', '.join(team_names)} with {top_wins} wins each!")

def analyze_matchup_predictions(league):
    """Predict category wins for upcoming matchups based on season averages"""
    print("\n" + "=" * 80)
    print("🔮 MATCHUP PREDICTIONS (Next Week)")
    print("=" * 80)
    
    current_period = league.currentMatchupPeriod
    next_period = current_period + 1
    
    # Get next week's matchups
    try:
        matchups = league.scoreboard(next_period)
        if not matchups:
            print("No upcoming matchups found for next week.")
            return
    except Exception as e:
        print(f"Could not fetch upcoming matchups: {e}")
        return
    
    # Calculate season averages for each team in each category from recent weeks
    standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
    team_category_averages = defaultdict(lambda: defaultdict(list))
    
    # Calculate from recent weeks (last 4 weeks for better accuracy)
    for week_offset in range(min(4, current_period)):
        matchup_period = current_period - week_offset
        if matchup_period < 1:
            continue
        
        try:
            box_scores = league.box_scores(matchup_period=matchup_period)
            for box_score in box_scores:
                home_team = box_score.home_team
                away_team = box_score.away_team
                
                if isinstance(home_team, int):
                    home_team = league.get_team_data(home_team)
                if isinstance(away_team, int):
                    away_team = league.get_team_data(away_team)
                
                if hasattr(box_score, 'home_stats') and hasattr(box_score, 'away_stats'):
                    for category in standard_cats:
                        if category in box_score.home_stats:
                            home_value = box_score.home_stats[category].get('value', 0)
                            away_value = box_score.away_stats[category].get('value', 0)
                            
                            team_category_averages[home_team][category].append(home_value)
                            team_category_averages[away_team][category].append(away_value)
        except:
            continue
    
    # Convert lists to averages
    team_avg_final = {}
    for team in team_category_averages:
        team_avg_final[team] = {}
        for category in standard_cats:
            values = team_category_averages[team].get(category, [])
            team_avg_final[team][category] = sum(values) / len(values) if values else 0
    
    # Predict matchups
    print("\nPredicted Category Wins:")
    print("-" * 80)
    
    for matchup in matchups:
        home_team = matchup.home_team
        away_team = matchup.away_team
        
        if isinstance(home_team, int):
            home_team = league.get_team_data(home_team)
        if isinstance(away_team, int):
            away_team = league.get_team_data(away_team)
        
        home_name = get_team_display_name(home_team)
        away_name = get_team_display_name(away_team)
        
        home_wins = 0
        away_wins = 0
        
        predicted_cats = []
        for category in standard_cats:
            home_avg = team_avg_final.get(home_team, {}).get(category, 0)
            away_avg = team_avg_final.get(away_team, {}).get(category, 0)
            
            if category == 'TO':
                # Lower is better for TO
                if home_avg < away_avg:
                    home_wins += 1
                    predicted_cats.append(f"{CATEGORY_EMOJIS.get(category, '📈')} {category}: {home_name} 🟢")
                elif away_avg < home_avg:
                    away_wins += 1
                    predicted_cats.append(f"{CATEGORY_EMOJIS.get(category, '📈')} {category}: {away_name} 🟢")
            else:
                # Higher is better
                if home_avg > away_avg:
                    home_wins += 1
                    predicted_cats.append(f"{CATEGORY_EMOJIS.get(category, '📈')} {category}: {home_name} 🟢")
                elif away_avg > home_avg:
                    away_wins += 1
                    predicted_cats.append(f"{CATEGORY_EMOJIS.get(category, '📈')} {category}: {away_name} 🟢")
        
        print(f"\n{away_name} @ {home_name}")
        print(f"   Predicted: {away_name} {away_wins}-{home_wins} {home_name}")
        if predicted_cats:
            print("   Categories:")
            for cat in predicted_cats[:5]:  # Show first 5
                print(f"      {cat}")
            if len(predicted_cats) > 5:
                print(f"      ... and {len(predicted_cats) - 5} more")

def analyze_schedule_difficulty(league):
    """Analyze strength of schedule for playoff prep"""
    print("\n" + "=" * 80)
    print("📅 SCHEDULE DIFFICULTY ANALYSIS")
    print("=" * 80)
    
    current_period = league.currentMatchupPeriod
    remaining_periods = []
    
    # Get remaining matchup periods
    if hasattr(league, 'finalScoringPeriod'):
        for period in range(current_period + 1, league.finalScoringPeriod + 1):
            remaining_periods.append(period)
    else:
        # Estimate - assume season goes to period 20-22
        for period in range(current_period + 1, min(current_period + 8, 22)):
            remaining_periods.append(period)
    
    if not remaining_periods:
        print("No remaining matchups in regular season.")
        return
    
    # Calculate team strength (win percentage)
    team_strength = {}
    for team in league.teams:
        total_games = team.wins + team.losses + team.ties
        if total_games > 0:
            win_pct = team.wins / total_games
        else:
            win_pct = 0.5
        team_strength[team] = win_pct
    
    # Calculate schedule difficulty for each team
    print("\nRemaining Schedule Difficulty:")
    print("-" * 80)
    
    schedule_difficulty = {}
    for team in league.teams:
        # Get remaining opponents
        remaining_opponents = []
        for matchup in team.schedule:
            if isinstance(matchup, int):
                opponent = league.get_team_data(matchup)
            else:
                opponent = matchup.away_team if matchup.home_team == team else matchup.home_team
                if isinstance(opponent, int):
                    opponent = league.get_team_data(opponent)
            
            # Check if this matchup is in remaining periods
            # For now, just calculate average opponent strength
            if opponent and opponent != team:
                remaining_opponents.append(opponent)
        
        if remaining_opponents:
            avg_opponent_strength = sum(team_strength.get(opp, 0.5) for opp in remaining_opponents) / len(remaining_opponents)
        else:
            avg_opponent_strength = 0.5
        
        schedule_difficulty[team] = avg_opponent_strength
    
    # Sort by difficulty (hardest first)
    sorted_teams = sorted(schedule_difficulty.items(), key=lambda x: x[1], reverse=True)
    
    for team, difficulty in sorted_teams:
        team_name = get_team_display_name(team)
        difficulty_pct = difficulty * 100
        difficulty_label = "🔴 Very Hard" if difficulty > 0.6 else "🟡 Medium" if difficulty > 0.45 else "🟢 Easy"
        print(f"{team_name:<30} Avg Opponent Win %: {difficulty_pct:.1f}% {difficulty_label}")

def analyze_team_details(league):
    """Show detailed team information"""
    print("\n" + "=" * 80)
    print("👥 TEAM DETAILS")
    print("=" * 80)
    
    standings = league.standings()
    
    for i, team in enumerate(standings, 1):
        team_name = get_team_display_name(team)
        print(f"\n{i}. {team_name}")
        print(f"   Record: {team.wins}-{team.losses}-{team.ties}")
        print(f"   Playoff Seed: {team.standing}")
        if hasattr(team, 'points_for'):
            print(f"   Points For: {team.points_for:.2f}")
            print(f"   Points Against: {team.points_against:.2f}")

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Fantasy Basketball League Analytics')
    parser.add_argument('--week', type=int, help='Specific matchup period to analyze')
    parser.add_argument('--last-week', action='store_true', help='Show only last week')
    parser.add_argument('--current-week', action='store_true', help='Show only current week')
    args = parser.parse_args()
    
    try:
        # Initialize league
        league = League(
            league_id=LEAGUE_ID,
            year=YEAR,
            espn_s2=ESPN_S2,
            swid=ESPN_SWID,
            debug=False
        )
        
        # Print header
        print("=" * 80)
        print("🏀 FANTASY BASKETBALL ANALYTICS")
        print(f"League: {league.settings.name if hasattr(league.settings, 'name') else 'N/A'}")
        print(f"Season: {YEAR} | Current Week: {league.current_week} | Current Matchup Period: {league.currentMatchupPeriod}")
        print("=" * 80)
        
        # Determine which weeks to analyze
        current_period = league.currentMatchupPeriod
        last_period = current_period - 1
        
        if args.week is not None:
            # Analyze specific week
            if args.week < 1:
                print(f"Error: Matchup period must be 1 or greater. You specified: {args.week}")
                sys.exit(1)
            if args.week > current_period:
                print(f"Warning: Matchup period {args.week} is in the future. Current period is {current_period}.")
            analyze_week(league, args.week, f"Matchup Period {args.week}")
        elif args.last_week:
            # Only last week
            if last_period >= 1:
                analyze_week(league, last_period, "Last Week")
            else:
                print("No previous matchup period available.")
        elif args.current_week:
            # Only current week
            analyze_week(league, current_period, "Current Week")
        else:
            # Default: Show both last week and current week side by side
            if last_period >= 1:
                print("\n" + "=" * 80)
                print("📅 LAST WEEK ANALYSIS")
                print("=" * 80)
                analyze_week(league, last_period, "Last Week")
            
            print("\n" + "=" * 80)
            print("📅 CURRENT WEEK ANALYSIS")
            print("=" * 80)
            analyze_week(league, current_period, "Current Week")
        
        # Always show overall stats
        analyze_overall_wins(league)
        analyze_head_to_head(league)
        analyze_category_performance(league)
        
        # New analytics features
        analyze_matchup_predictions(league)
        analyze_schedule_difficulty(league)
        
        analyze_team_details(league)
        
        print("\n" + "=" * 80)
        print("✅ Analytics complete!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
