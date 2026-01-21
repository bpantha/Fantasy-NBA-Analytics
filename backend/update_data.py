#!/usr/bin/env python3
"""
Daily update script - runs analytics and exports to JSON
This can be run by GitHub Actions or Render scheduled jobs
"""

import sys
from pathlib import Path

def main():
    """Run analytics export"""
    repo_root = Path(__file__).parent.parent
    
    # Import and run export
    try:
        from export_analytics import main as export_main
        export_main()
        print("✅ Analytics export completed successfully")
        return 0
    except Exception as e:
        print(f"❌ Error running export: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
