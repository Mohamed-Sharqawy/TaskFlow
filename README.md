# Comfort Zone

## Overview
Comfort Zone is a lightweight, card-based productivity application designed to help users manage their workflow efficiently. It combines task management, time tracking, and note-taking into a single, cohesive dashboard, ensuring you stay focused and organized without the clutter of complex tools.

## Features
- **Task Cards**: Create, edit, and organize tasks into distinct cards for better categorization.
- **Pomodoro Timer**: Stay focused with a built-in Pomodoro timer and synchronized video player.
- **Notes Editor**: A rich-text note management system to create, search, edit, and safely store notes.

## Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: Vanilla JS, HTML/CSS
- **Styling**: Bootstrap
- **Storage**: JSON storage (file-based persistence)

## Screenshots
<img width="1920" height="986" alt="image" src="https://github.com/user-attachments/assets/6527b859-d433-488e-b1b1-9de4e1425c72" />
<img width="1920" height="985" alt="image" src="https://github.com/user-attachments/assets/a536c076-af27-46ad-8874-609aede6ab60" />
<img width="1920" height="985" alt="image" src="https://github.com/user-attachments/assets/10c237de-2e79-4fba-803a-0623b99ad790" />
<img width="1904" height="992" alt="image" src="https://github.com/user-attachments/assets/fdec76c6-5f0c-410c-bd8b-dd53f2ce1942" />
<img width="1920" height="995" alt="image" src="https://github.com/user-attachments/assets/99e7f382-9784-4995-a4b1-1fa9bc7412d9" />






## How to Run
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Comfort Zone"
   ```
2. **Install requirements**
   Ensure you have Python installed, then install the dependencies:
   ```bash
   pip install flask
   ```
3. **Run the app**
   ```bash
   python app.py
   ```
   The application will be accessible at `http://127.0.0.1:5000`.

## Project Structure
- `app.py`: Main Flask application and routing layer.
- `data/`: JSON files used for local data storage (`users.json`, `notes.json`).
- `models/`: Business logic managers (e.g., `card_manager.py`, `note_manager.py`).
- `services/`: Core service integrations (e.g., `auth_service.py`, `json_storage.py`).
- `static/`: Frontend assets including CSS and modular Vanilla JS files.
- `templates/`: HTML templates for the dashboard, login, and features.
- `utils/`: Utility functions and validators.

## API Overview
The application exposes a lightweight RESTful API for client-server communication:
- **Auth**: `/api/login`, `/api/register` (POST)
- **Cards**: `/api/cards` (GET, POST, PUT, DELETE, bulk actions)
- **Tasks**: `/api/cards/<id>/tasks` (POST, PUT, DELETE, bulk actions)
- **Notes**: `/api/notes` (GET, POST, PUT, DELETE) & `/api/notes/search` (GET)

## Future Improvements
- Migration from JSON file storage to a relational database (e.g., SQLite/PostgreSQL).
- User profile customization and advanced theming.
- Drag-and-drop support for reordering tasks and cards.
- Comprehensive unit and integration test coverage.

## Author
Mohammed Ahmmed Sharqawy

