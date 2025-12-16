# Taskified

Taskified is a lightweight, personal productivity application built with Flask. It combines task management (To-Dos) with rich note-taking capabilities, allowing users to organize their thoughts and tasks in one place.

## Features

*   **User Authentication:** Secure email/password login and session management.
*   **To-Do Management:**
    *   Create, edit, and delete tasks.
    *   Set due dates.
    *   Mark tasks as complete.
    *   Organize tasks with custom tags.
*   **Rich Notes:**
    *   Create notes with Markdown support.
    *   **Image Uploads:** Attach images to your notes.
    *   **Color Coding:** Organize notes visually with different color themes.
    *   **Public Sharing:** Generate unique public links to share specific notes with others.
*   **Tagging System:** Unified tagging system for both Notes and To-Dos.
*   **Search:** Quickly find your content across the application.
*   **Profile Management:** Custom user avatars.

## Technology Stack

*   **Backend:** Python 3.10+
*   **Framework:** [Flask](https://flask.palletsprojects.com/)
*   **Database:** SQLite (Persistent local storage)
*   **ORM:** Flask-SQLAlchemy
*   **Markdown Rendering:** `markdown2`
*   **Sanitization:** `bleach` (for safe HTML handling)
*   **Security:** `werkzeug` (Password hashing)

## Project Structure

```
Taskified/
├── app/
│   ├── __init__.py      # App factory and DB initialization
│   ├── models.py        # Database models (User, Note, Todo, Tag)
│   ├── utils.py         # Helper functions
│   ├── static/          # CSS, JS, Images, User Uploads
│   ├── templates/       # HTML Jinja2 Templates
│   └── views/           # Route handlers (Blueprints)
│       ├── auth.py      # Authentication routes
│       └── main.py      # Core application logic
├── config.py            # Configuration settings
├── run.py               # Entry point script
├── requirements.txt     # Python dependencies
└── app.db               # SQLite Database (Created on first run)
```

## Setup & Installation

### Prerequisites
*   Python 3.10 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/ZaidK07/Taskified/
cd Taskified
```

### 2. Create a Virtual Environment
It is recommended to use a virtual environment to manage dependencies.

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python run.py
```

The application will start at `http://0.0.0.0:3109/`.

## License

This project is open-source and available for personal and educational use.
