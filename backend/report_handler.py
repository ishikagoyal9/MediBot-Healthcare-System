"""
Report Handler Module for MediBot
Handles file uploads, text extraction, and report management
"""

import os
import shutil
from datetime import datetime
from fastapi import UploadFile
import PyPDF2
from PIL import Image
import pytesseract

# ============================================
# CONFIGURATION
# ============================================
UPLOAD_FOLDER = "uploaded_reports"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# ============================================
# FILE VALIDATION
# ============================================
def validate_file(file: UploadFile) -> dict:
    """
    Validate uploaded file type and extension
    
    Args:
        file: UploadFile object from FastAPI
        
    Returns:
        dict with validation result and file extension
    """
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        return {
            "valid": False,
            "error": f"Invalid file type '{file_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        }
    
    # File size is validated during upload by FastAPI
    return {
        "valid": True,
        "extension": file_ext
    }

# ============================================
# PDF TEXT EXTRACTION
# ============================================
def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from PDF file
    
    Args:
        file_path: Path to PDF file
        
    Returns:
        Extracted text as string
    """
    try:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Extract text from all pages
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {page_num + 1} ---\n"
                    text += page_text
        
        if not text.strip():
            return "⚠️ No text found in PDF. The PDF might be image-based or encrypted."
        
        return text.strip()
        
    except Exception as e:
        return f"❌ Error extracting PDF text: {str(e)}"

# ============================================
# IMAGE TEXT EXTRACTION (OCR)
# ============================================
def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from image using OCR (Tesseract)
    
    Args:
        file_path: Path to image file
        
    Returns:
        Extracted text as string
    """
    try:
        # Open image
        image = Image.open(file_path)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Extract text using Tesseract OCR
        text = pytesseract.image_to_string(image)
        
        if not text.strip():
            return "⚠️ No text found in image. The image might be too blurry or contain no text."
        
        return text.strip()
        
    except pytesseract.TesseractNotFoundError:
        return "❌ Tesseract OCR not installed. Please install Tesseract to extract text from images."
    except Exception as e:
        return f"❌ Error extracting image text: {str(e)}"

# ============================================
# SAVE AND PROCESS REPORT
# ============================================
async def save_and_process_report(file: UploadFile, user_email: str) -> dict:
    """
    Save uploaded report file and extract text
    
    Args:
        file: UploadFile object from FastAPI
        user_email: Email of user uploading report
        
    Returns:
        dict with success status, file info, and extracted text
    """
    # Validate file
    validation = validate_file(file)
    if not validation["valid"]:
        return {
            "success": False,
            "error": validation["error"]
        }
    
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Clean original filename
        original_name = file.filename.replace(" ", "_")
        # Remove special characters
        safe_original = "".join(c for c in original_name if c.isalnum() or c in "._-")
        
        # Create safe filename with user prefix
        user_prefix = user_email.split('@')[0]
        safe_name = f"{user_prefix}_{timestamp}_{safe_original}"
        file_path = os.path.join(UPLOAD_FOLDER, safe_name)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            os.remove(file_path)
            return {
                "success": False,
                "error": f"File too large ({file_size / (1024*1024):.2f}MB). Max size: {MAX_FILE_SIZE / (1024*1024)}MB"
            }
        
        # Extract text based on file type
        file_ext = validation["extension"]
        
        print(f"📄 Extracting text from {file_ext} file...")
        
        if file_ext == '.pdf':
            extracted_text = extract_text_from_pdf(file_path)
        else:  # Image file
            extracted_text = extract_text_from_image(file_path)
        
        # Calculate text statistics
        text_length = len(extracted_text)
        word_count = len(extracted_text.split())
        
        print(f"✅ Extracted {word_count} words ({text_length} characters)")
        
        # Return success with metadata
        return {
            "success": True,
            "file_path": file_path,
            "file_name": safe_name,
            "original_name": file.filename,
            "file_size": file_size,
            "file_type": file_ext,
            "extracted_text": extracted_text,
            "full_text_length": text_length,
            "word_count": word_count,
            "upload_date": timestamp
        }
        
    except Exception as e:
        # Clean up file if error occurred
        if 'file_path' in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        
        return {
            "success": False,
            "error": f"Error processing file: {str(e)}"
        }

# ============================================
# DELETE REPORT
# ============================================
def delete_report(file_path: str) -> bool:
    """
    Delete a report file from disk
    
    Args:
        file_path: Path to file to delete
        
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Deleted file: {file_path}")
            return True
        else:
            print(f"⚠️ File not found: {file_path}")
            return False
    except Exception as e:
        print(f"❌ Error deleting file: {e}")
        return False

# ============================================
# GET USER REPORTS
# ============================================
def get_all_user_reports(user_email: str) -> list:
    """
    Get all reports uploaded by a specific user
    
    Args:
        user_email: Email of user
        
    Returns:
        List of report metadata dictionaries
    """
    user_prefix = user_email.split('@')[0]
    reports = []
    
    try:
        # Check if upload folder exists
        if not os.path.exists(UPLOAD_FOLDER):
            return []
        
        # Find all files matching user prefix
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.startswith(user_prefix):
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                
                # Get file statistics
                file_stats = os.stat(file_path)
                
                reports.append({
                    "filename": filename,
                    "file_path": file_path,
                    "size": file_stats.st_size,
                    "upload_date": datetime.fromtimestamp(
                        file_stats.st_mtime
                    ).strftime("%Y-%m-%d %H:%M:%S")
                })
        
        # Sort by upload date (newest first)
        reports.sort(key=lambda x: x['upload_date'], reverse=True)
        
        print(f"📋 Found {len(reports)} reports for {user_email}")
        return reports
        
    except Exception as e:
        print(f"❌ Error getting user reports: {e}")
        return []

# ============================================
# UTILITY: GET REPORT TEXT
# ============================================
def get_report_text(file_path: str) -> str:
    """
    Get extracted text from an already uploaded report
    
    Args:
        file_path: Path to report file
        
    Returns:
        Extracted text
    """
    if not os.path.exists(file_path):
        return "❌ File not found"
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_ext in ['.jpg', '.jpeg', '.png']:
        return extract_text_from_image(file_path)
    else:
        return "❌ Unsupported file type"

# ============================================
# TESTING
# ============================================
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 REPORT HANDLER TEST")
    print("=" * 60)
    
    # Test folder creation
    print(f"\n✅ Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    
    # Test OCR availability
    try:
        import pytesseract
        print("✅ Tesseract OCR: Available")
    except ImportError:
        print("⚠️ Tesseract OCR: Not installed")
    
    print("\n" + "=" * 60)
    print("Ready to process reports!")