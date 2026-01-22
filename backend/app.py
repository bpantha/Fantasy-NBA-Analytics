@app.route('/api/debug/team-stats/<team_name>', methods=['GET'])
def debug_team_stats(team_name):
    """Debug endpoint to get raw ESPN API stats for a specific team"""
    try:
        league = get_league_instance()
        if not league:
            return jsonify({'error': 'League API unavailable'}), 503
        
        current_week = league.currentMatchupPeriod
        box_scores = league.box_scores(matchup_period=current_week, matchup_total=True)
        
        if not box_scores:
            return jsonify({'error': 'No box scores found'}), 404
        
        # Find the team
        for box_score in box_scores:
            home_team = box_score.home_team
            away_team = box_score.away_team
            
            if isinstance(home_team, int):
                home_team = league.get_team_data(home_team)
            if isinstance(away_team, int):
                away_team = league.get_team_data(away_team)
            
            home_name = home_team.team_name if hasattr(home_team, 'team_name') else str(home_team)
            away_name = away_team.team_name if hasattr(away_team, 'team_name') else str(away_team)
            
            if team_name.lower() in home_name.lower():
                stats = box_score.home_stats
                team_obj = home_team
                break
            elif team_name.lower() in away_name.lower():
                stats = box_score.away_stats
                team_obj = away_team
                break
        else:
            return jsonify({'error': f'Team {team_name} not found'}), 404
        
        # Format response
        result = {
            'team_name': team_obj.team_name if hasattr(team_obj, 'team_name') else str(team_obj),
            'current_matchup_period': current_week,
            'current_scoring_period': league.current_week,
            'stats': {}
        }
        
        if stats:
            standard_cats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', 'FT%', '3PM', 'TO']
            for cat in standard_cats:
                if cat in stats:
                    value = stats[cat].get('value', 0)
                    result['stats'][cat] = value
                else:
                    result['stats'][cat] = None
        
        result['raw_stats'] = stats
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
