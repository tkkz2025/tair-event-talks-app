# BigQuery Release Notes Viewer & Tweeter

A modern, fast, and responsive web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches Google Cloud's official BigQuery release notes XML feed, parses it, and displays them as individual, interactive cards. Users can filter updates by categories (Features, Announcements, Changes, Deprecated, Resolved), search through terms, and select specific updates to tweet directly to Twitter/X with a single click.

---

## Features
*   **Dynamic XML/HTML Parsing**: Fetches the official GCP Atom RSS feed and dissects multi-item daily posts into separate, selectable update cards in the frontend.
*   **Rich Dark Theme**: Stunning slate-based interface using modern typography, glowing borders, custom scrollbars, and fluid micro-interactions.
*   **Instant Refresh**: Header refresh button with visual spin state to query live updates.
*   **Category Filters & Text Search**: Real-time searching across dates and descriptions, with category filter chips (Features, Announcements, Changes, Deprecated, Resolved).
*   **Selected Tweet Composer**: Select cards to open a bottom draft drawer that pre-compiles a tweet draft containing links and tags, keeping it within X's 280-character limit.

---

## Directory Structure
```text
bq-release-notes/
├── app.py                 # Flask server & XML parsing engine
├── templates/
│   └── index.html         # Main dashboard markup
├── static/
│   ├── css/
│   │   └── style.css      # Custom styling, dark theme, and keyframes
│   └── js/
│       └── app.js         # DOM interaction, HTML parser, and Twitter integration
├── .gitignore             # Git exclusion rules
└── README.md              # Documentation
```

---

## Getting Started

### Prerequisites
*   Python 3.9 or higher installed.

### 1. Installation
Clone the repository (or go to the project directory) and set up the virtual environment:

```bash
cd bq-release-notes
python3 -m venv .venv
source .venv/bin/activate
pip install flask requests
```

### 2. Run the Development Server
Launch the server using:

```bash
python app.py
```
*Note: The server runs on port `8080` by default to avoid macOS AirPlay Port conflicts.*

### 3. Open in Browser
Open your browser and navigate to:
[http://localhost:8080/](http://localhost:8080/)

---

## How It Works
1.  **Backend Proxy**: The Flask server in `app.py` makes an HTTP request to GCP's feed, reads the Atom XML schema, and extracts title, content, updated timestamp, and links, serializing it into JSON to bypass browser CORS limitations.
2.  **Frontend Sub-Parsing**: The JS file `static/js/app.js` runs a `DOMParser` over the raw HTML body. It splits the entry text using the `<h3>` headers to create independent, selectable cards for every sub-feature listed.
3.  **Twitter Web Intent**: When a user selects a card, the JS helper checks character availability, truncates text safely if it exceeds the limit, prepends the source url/hashtags, and links directly to Twitter's web intent editor.
