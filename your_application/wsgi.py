import sys
import os

# Add the parent directory to the path so it can find app.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as application

if __name__ == "__main__":
    application.run()
