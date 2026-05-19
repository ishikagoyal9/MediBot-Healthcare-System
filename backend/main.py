"""
MediBot - Complete Backend System
FastAPI server with all features integrated
"""

import os
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import chatbot
from chatbot.chatbot import healthcare_chat

# Import database functions
from database import (
    init_database, 
    save_contact, 
    get_all_contacts, 
    delete_contact, 
    update_contact_status
)
from user_database import (
    init_users_table, 
    register_user, 
    login_user, 
    get_user_by_email
)

# Import report handler
from report_handler import (
    save_and_process_report,
    delete_report,
    get_all_user_reports
)

# ============================================
# APP INITIALIZATION
# ============================================
app = FastAPI(
    title="MediBot API",
    description="AI-Powered Healthcare Assistant Backend",
    version="2.0.0"
)

logger = logging.getLogger("uvicorn.error")

# ============================================
# STARTUP EVENT
# ============================================
@app.on_event("startup")
async def startup_event():
    """Initialize databases on startup"""
    init_database()        # Contact form database
    init_users_table()     # User authentication database
    
    # Create uploads folder
    os.makedirs("uploaded_reports", exist_ok=True)
    
    logger.info("✅ Databases initialized!")
    logger.info("✅ Upload folder ready!")
    logger.info("🚀 MediBot Backend is running!")

# ============================================
# CORS MIDDLEWARE
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ============================================
# API HEALTH CHECK (moved to /api)
# ============================================
@app.get("/api")
async def root():
    """API Health Check"""
    return {
        "message": "MediBot Backend is running!",
        "status": "online",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api",
            "chat": "/anaser",
            "report_analysis": "/analyze-report",
            "report_upload": "/upload-report",
            "user_reports": "/user-reports/{email}",
            "register": "/register",
            "login": "/login",
            "user_profile": "/user/{email}",
            "contact": "/contact",
            "view_contacts": "/get-contacts",
            "delete_contact": "/contact/{id}",
            "update_status": "/contact/{id}/status"
        }
    }

# ============================================
# USER REGISTRATION
# ============================================
@app.post("/register")
async def register_endpoint(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        result = register_user(name, email, password)
        
        if result["success"]:
            logger.info(f"✅ New user registered: {email}")
            return {
                "status": "success",
                "message": result["message"],
                "user_id": result["user_id"]
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": result["message"]
                }
            )
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# USER LOGIN
# ============================================
@app.post("/login")
async def login_endpoint(
    email: str = Form(...),
    password: str = Form(...)
):
    try:
        result = login_user(email, password)
        
        if result["success"]:
            logger.info(f"✅ User logged in: {email}")
            return {
                "status": "success",
                "message": "Login successful!",
                "user": result["user"]
            }
        else:
            return JSONResponse(
                status_code=401,
                content={
                    "status": "error",
                    "message": result["message"]
                }
            )
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# GET USER PROFILE
# ============================================
@app.get("/user/{email}")
async def get_user_profile(email: str):
    try:
        user = get_user_by_email(email)
        
        if user:
            return {
                "status": "success",
                "user": user
            }
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "User not found"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# AI CHAT ENDPOINT
# ============================================
@app.post("/anaser")
async def receive_message(
    message: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)
):
    try:
        logger.info(f"💬 Chat request: {message[:50]}...")
        
        bot_response = healthcare_chat(message)
        
        received_files = [file.filename for file in files] if files else []
        
        logger.info(f"✅ Chat response generated")
        
        return {
            "response": bot_response,
            "received_files": received_files,
        }

    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        return {
            "response": f"⚠️ Error: {str(e)}\n\nPlease try again or contact support."
        }

# ============================================
# LEGACY REPORT ANALYSIS
# ============================================
@app.post("/analyze-report")
async def analyze_report(
    report_name: str = Form(...),
    report_type: str = Form(...),
    report_date: str = Form(...)
):
    try:
        logger.info(f"📊 Analyzing report: {report_name} (Type: {report_type})")
        
        analysis_prompt = f"""
        As a medical AI assistant, please analyze this medical report:
        
        📄 Report Details:
        - Name: {report_name}
        - Type: {report_type}
        - Upload Date: {report_date}
        
        Please provide a comprehensive analysis including:
        
        1. **Report Overview**: What this type of medical report typically contains
        2. **Key Health Indicators**: Important markers to watch for
        3. **General Interpretation Guide**: How to understand results
        4. **Recommended Actions**: 
           - When to follow up with healthcare provider
           - Lifestyle modifications
           - Questions to ask your doctor
        5. **Important Reminders**: Precautions specific to this report type
        
        Remember: This is general information. Professional medical consultation is essential.
        """
        
        analysis_result = healthcare_chat(analysis_prompt)
        
        logger.info(f"✅ Analysis completed for: {report_name}")
        
        return {
            "status": "success",
            "analysis": analysis_result,
            "report_info": {
                "name": report_name,
                "type": report_type,
                "date": report_date
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "analysis": f"❌ Error analyzing report: {str(e)}",
                "report_info": {
                    "name": report_name,
                    "type": report_type,
                    "date": report_date
                }
            }
        )

# ============================================
# REPORT UPLOAD ENDPOINT
# ============================================
@app.post("/upload-report")
async def upload_medical_report(
    file: UploadFile = File(...),
    user_email: str = Form(...)
):
    try:
        logger.info(f"📤 Receiving report upload from: {user_email}")
        logger.info(f"   File: {file.filename} ({file.content_type})")
        
        result = await save_and_process_report(file, user_email)
        
        if not result["success"]:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": result["error"]
                }
            )
        
        logger.info(f"✅ Report saved: {result['file_name']}")
        
        return {
            "status": "success",
            "message": "Report uploaded successfully!",
            "report": {
                "file_name": result["file_name"],
                "original_name": result["original_name"],
                "file_size": f"{result['file_size'] / 1024:.2f} KB",
                "file_type": result["file_type"],
                "upload_date": result["upload_date"],
                "text_preview": result["extracted_text"][:200] + "..." if len(result["extracted_text"]) > 200 else result["extracted_text"]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Report upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Upload failed: {str(e)}"
            }
        )

# ============================================
# GET USER'S REPORTS
# ============================================
@app.get("/user-reports/{user_email}")
async def get_user_reports(user_email: str):
    try:
        reports = get_all_user_reports(user_email)
        logger.info(f"📋 Retrieved {len(reports)} reports for {user_email}")
        return {
            "status": "success",
            "total_reports": len(reports),
            "reports": reports
        }
    except Exception as e:
        logger.error(f"❌ Error fetching reports: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# DELETE REPORT
# ============================================
@app.delete("/report/{file_name}")
async def delete_report_endpoint(file_name: str):
    try:
        file_path = f"uploaded_reports/{file_name}"
        
        if delete_report(file_path):
            logger.info(f"🗑️ Deleted report: {file_name}")
            return {"status": "success", "message": "Report deleted successfully"}
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Report not found"}
            )
    except Exception as e:
        logger.error(f"❌ Delete error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# ANALYZE REPORT WITH EXTRACTED TEXT
# ============================================
@app.post("/analyze-report-with-text")
async def analyze_report_with_text(
    file_name: str = Form(...),
    extracted_text: str = Form(...)
):
    try:
        logger.info(f"🔍 Analyzing report: {file_name}")
        
        analysis_prompt = f"""
        As a medical AI assistant, analyze this medical report text:
        
        📄 Report: {file_name}
        
        📝 Extracted Text:
        {extracted_text[:2000]}
        
        Please provide a comprehensive analysis:
        
        1. **Document Type**: What kind of medical report is this?
        2. **Key Findings**: What are the most important values or observations?
        3. **Notable Values**: Any values that stand out (high, low, or abnormal)?
        4. **Health Indicators**: What does this report tell us about the patient's health?
        5. **Recommendations**: 
           - Should they consult a doctor urgently?
           - Any lifestyle changes suggested?
           - Follow-up tests needed?
        6. **Important Notes**: Any urgent concerns or critical findings?
        7. **Next Steps**: What should the patient do with these results?
        
        Remember: This is for informational purposes only. Always consult healthcare professionals for medical advice.
        """
        
        analysis_result = healthcare_chat(analysis_prompt)
        logger.info(f"✅ Analysis completed for: {file_name}")
        
        return {
            "status": "success",
            "analysis": analysis_result,
            "report_name": file_name,
            "analyzed_text_length": len(extracted_text)
        }
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Analysis failed: {str(e)}"}
        )

# ============================================
# CONTACT FORM SUBMISSION
# ============================================
@app.post("/contact")
async def submit_contact_form(
    name: str = Form(...),
    email: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...)
):
    try:
        contact_id = save_contact(name, email, subject, message)
        logger.info(f"📧 New contact form submission from {name} ({email})")
        
        return {
            "status": "success",
            "message": "Thank you for contacting us! We'll respond within 24 hours.",
            "submission_id": contact_id
        }
    except Exception as e:
        logger.error(f"❌ Contact form error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to submit form. Error: {str(e)}"}
        )

# ============================================
# GET ALL CONTACT SUBMISSIONS
# ============================================
@app.get("/get-contacts")
async def get_all_contacts_endpoint():
    try:
        contacts = get_all_contacts()
        logger.info(f"📊 Retrieved {len(contacts)} contact submissions")
        return {
            "status": "success",
            "total_submissions": len(contacts),
            "submissions": contacts
        }
    except Exception as e:
        logger.error(f"❌ Error fetching contacts: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# DELETE CONTACT SUBMISSION
# ============================================
@app.delete("/contact/{submission_id}")
async def delete_contact_endpoint(submission_id: int):
    try:
        deleted = delete_contact(submission_id)
        
        if deleted:
            logger.info(f"🗑️ Deleted contact submission #{submission_id}")
            return {"status": "success", "message": f"Submission #{submission_id} deleted"}
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Submission #{submission_id} not found"}
            )
    except Exception as e:
        logger.error(f"❌ Error deleting contact: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# UPDATE CONTACT STATUS
# ============================================
@app.patch("/contact/{submission_id}/status")
async def update_status(submission_id: int, status: str = Form(...)):
    try:
        updated = update_contact_status(submission_id, status)
        
        if updated:
            logger.info(f"✏️ Updated contact #{submission_id} status to: {status}")
            return {"status": "success", "message": f"Status updated to '{status}'"}
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": f"Submission #{submission_id} not found"}
            )
    except Exception as e:
        logger.error(f"❌ Error updating status: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# ============================================
# HEALTH CHECK
# ============================================
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "ai_chatbot": "online",
            "file_upload": "ready"
        }
    }

# ============================================
# SERVE FRONTEND - MOUNT STATIC FILES
# ============================================

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

# ============================================
# RUN SERVER
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
