import sqlite3
from datetime import datetime
import os

# Database file path
DB_PATH = "medibot.db"

def init_database():
    """Initialize SQLite database with contacts table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            status TEXT DEFAULT 'new'
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")

def save_contact(name, email, subject, message):
    """Save contact submission to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO contacts (name, email, subject, message, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, email, subject, message, timestamp, 'new'))
    
    contact_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return contact_id

def get_all_contacts():
    """Get all contact submissions"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM contacts ORDER BY id DESC')
    rows = cursor.fetchall()
    
    contacts = []
    for row in rows:
        contacts.append({
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "subject": row[3],
            "message": row[4],
            "timestamp": row[5],
            "status": row[6]
        })
    
    conn.close()
    return contacts

def delete_contact(contact_id):
    """Delete a contact submission"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM contacts WHERE id = ?', (contact_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    
    conn.close()
    return deleted

def update_contact_status(contact_id, status):
    """Update contact status (new/read/replied)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('UPDATE contacts SET status = ? WHERE id = ?', (status, contact_id))
    conn.commit()
    updated = cursor.rowcount > 0
    
    conn.close()
    return updated

# Initialize database when module is imported
if __name__ == "__main__":
    init_database()
    print("\n📊 Database created: medibot.db")
    print("✅ Ready to store contact submissions!")