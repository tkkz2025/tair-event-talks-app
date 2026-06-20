import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # Namespaces
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            entry_id = entry.find('atom:id', ns)
            updated = entry.find('atom:updated', ns)
            
            # Find the link with rel="alternate" or just the first link
            link = ""
            for l in entry.findall('atom:link', ns):
                if l.attrib.get('rel') == 'alternate' or not link:
                    link = l.attrib.get('href', '')
            
            content = entry.find('atom:content', ns)
            
            entries.append({
                'id': entry_id.text if entry_id is not None else '',
                'title': title.text if title is not None else '',
                'updated': updated.text if updated is not None else '',
                'link': link,
                'content': content.text if content is not None else ''
            })
            
        return jsonify({
            'status': 'success',
            'entries': entries
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
