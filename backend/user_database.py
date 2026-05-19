"""
User Authentication Database System
Add this to your project for real login/signup
"""

import sqlite3
import hashlib
import secrets
from datetime import datetime

DB_PATH = "medibot.db"

def init_users_table():
    """Create users table in database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Users table created!")

def hash_password(password):
    """Hash password using SHA256"""
    salt = "medibot_secure_salt_2024"  # Change this in production!
    return hashlib.sha256((password + salt).encode()).hexdigest()

def register_user(name, email, password):
    """Register new user"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        ''', (name, email, password_hash, created_at))
        
        conn.commit()
        user_id = cursor.lastrowid
        
        print(f"✅ User registered: {email}")
        return {"success": True, "user_id": user_id, "message": "Registration successful!"}
        
    except sqlite3.IntegrityError:
        return {"success": False, "message": "Email already exists!"}
    
    except Exception as e:
        return {"success": False, "message": str(e)}
    
    finally:
        conn.close()

def login_user(email, password):
    """Login user"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    password_hash = hash_password(password)
    
    cursor.execute('''
        SELECT id, name, email FROM users 
        WHERE email = ? AND password_hash = ?
    ''', (email, password_hash))
    
    user = cursor.fetchone()
    
    if user:
        # Update last login
        cursor.execute('''
            UPDATE users SET last_login = ? WHERE id = ?
        ''', (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user[0]))
        conn.commit()
        
        print(f"✅ User logged in: {email}")
        
        conn.close()
        return {
            "success": True,
            "user": {
                "id": user[0],
                "name": user[1],
                "email": user[2]
            }
        }
    
    conn.close()
    return {"success": False, "message": "Invalid email or password!"}

def get_user_by_email(email):
    """Get user information"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, name, email, created_at, last_login FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "created_at": user[3],
            "last_login": user[4]
        }
    return None

def get_all_users():
    """Get all users (admin only)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, name, email, created_at, last_login FROM users')
    users = cursor.fetchall()
    
    conn.close()
    
    return [{
        "id": u[0],
        "name": u[1],
        "email": u[2],
        "created_at": u[3],
        "last_login": u[4]
    } for u in users]

# Initialize on import
if __name__ == "__main__":
    init_users_table()
    
    # Test registration
    result = register_user("Test User", "test@example.com", "password123")
    print(result)
    
    # Test login
    login_result = login_user("test@example.com", "password123")
    print(login_result)