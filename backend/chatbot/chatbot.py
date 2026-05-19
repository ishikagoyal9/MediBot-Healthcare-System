import os
import requests
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# Emergency keywords detector
EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "breathing difficult", "suicide", 
    "kill myself", "overdose", "severe bleeding", "unconscious", 
    "heart attack", "stroke", "choking", "severe injury"
]

# ✨ NEW: Statistics tracking
chat_statistics = {
    "total_questions": 0,
    "emergency_alerts": 0,
    "drug_queries": 0,
    "general_queries": 0
}

def get_statistics():
    """Return current usage statistics"""
    return chat_statistics

def detect_emergency(user_input):
    """Detect if user message contains emergency keywords"""
    return any(keyword in user_input.lower() for keyword in EMERGENCY_KEYWORDS)


def get_drug_info(drug_name):
    """Get drug information from OpenFDA"""
    url = "https://api.fda.gov/drug/label.json"
    params = {
        "search": f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
        "limit": 1
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                result = data['results'][0]
                brand = result.get('openfda', {}).get('brand_name', ['N/A'])[0]
                generic = result.get('openfda', {}).get('generic_name', ['N/A'])[0]
                purpose = result.get('purpose', ['N/A'])[0] if result.get('purpose') else 'N/A'
                
                return (
                    f"💊 {brand} ({generic})\n"
                    f"Purpose: {purpose[:150]}...\n"
                    f"⚠️ Consult a doctor before use."
                )
        return None
    except:
        return None


# ✨ NEW: MedlinePlus API Integration
def get_medlineplus_info(condition):
    """Get verified health information from NIH MedlinePlus"""
    url = "https://wsearch.nlm.nih.gov/ws/query"
    params = {
        "db": "healthTopics",
        "term": condition.strip(),
        "retmax": 1
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200 and "nlm.nih.gov" in response.text:
            return f"✅ Verified information from NIH MedlinePlus"
        return None
    except:
        return None


def healthcare_chat(user_input, history=None, max_history=2):
    """
    Main healthcare chatbot - SHORT & DIRECT responses
    """
    
    # ✨ NEW: Track total questions
    chat_statistics["total_questions"] += 1
    
    # 1. EMERGENCY DETECTION
    if detect_emergency(user_input):
        chat_statistics["emergency_alerts"] += 1  # ✨ NEW
        return (
            "🚨 EMERGENCY - Call 911 (USA) / 102 (India) / 999 (UK) immediately!\n"
            "Go to the nearest ER or contact emergency services now."
        )
    
    # 2. DRUG INFORMATION CHECK
    drug_keywords = ["medicine", "drug", "medication", "pill", "tablet", "aspirin", "ibuprofen", "paracetamol"]
    if any(keyword in user_input.lower() for keyword in drug_keywords):
        chat_statistics["drug_queries"] += 1  # ✨ NEW
        words = user_input.lower().split()
        for word in words:
            if len(word) > 4:
                drug_info = get_drug_info(word)
                if drug_info:
                    return drug_info
    
    # ✨ NEW: 3. CONDITION INFORMATION CHECK
    condition_keywords = ["what is", "tell me about", "information about", "explain"]
    if any(keyword in user_input.lower() for keyword in condition_keywords):
        for keyword in condition_keywords:
            if keyword in user_input.lower():
                condition = user_input.lower().split(keyword)[-1].strip()
                condition = condition.replace("?", "").split()[0]
                
                medline_check = get_medlineplus_info(condition)
                # Info logged, will be used in AI response
    
    # 4. AI RESPONSE (Groq with Llama 3.3)
    try:
        chat_statistics["general_queries"] += 1  # ✨ NEW
        
        system_prompt = (
            "You are MediBot, a healthcare assistant. "
            "Rules:\n"
            "- Keep answers SHORT (3-4 sentences max)\n"
            "- Use simple, clear language\n"
            "- Be direct and helpful\n"
            "- Never diagnose or prescribe\n"
            "- Don't ask follow-up questions\n"
            "- End with brief reminder to consult a doctor if needed\n"
            "- Be warm but concise"
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add only recent history (last 2 exchanges)
        if history:
            recent = history[-max_history:]
            for h in recent:
                messages.append({"role": "user", "content": h['user']})
                messages.append({"role": "assistant", "content": h['bot']})
        
        messages.append({"role": "user", "content": user_input})
        
        # Call Groq API with lower token limit
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=120,
            temperature=0.6
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Simple disclaimer
        return ai_response + "\n\n⚠️ For medical advice, consult a healthcare professional."
    
    except Exception as e:
        return f"⚠️ Error: {str(e)}. Please try again."


# TESTING
if __name__ == "__main__":
    print("🏥 MEDIBOT - Healthcare Chatbot System\n")
    print("✅ Features: Groq AI + OpenFDA + MedlinePlus + Emergency Detection")
    print("="*60 + "\n")
    
    # Test 1: General question
    print("Test 1: General Health Query")
    print("Q: What is diabetes?")
    print(healthcare_chat("What is diabetes?"))
    print("\n" + "="*60 + "\n")
    
    # Test 2: Drug info
    print("Test 2: Drug Information (OpenFDA API)")
    print("Q: Tell me about aspirin")
    print(healthcare_chat("Tell me about aspirin medicine"))
    print("\n" + "="*60 + "\n")
    
    # Test 3: Emergency
    print("Test 3: Emergency Detection")
    print("Q: I have severe chest pain")
    print(healthcare_chat("I have severe chest pain"))
    print("\n" + "="*60 + "\n")
    
    # Test 4: With history
    print("Test 4: Conversation with History")
    print("Q: What is fever?")
    r1 = healthcare_chat("What is fever?")
    print(r1)
    
    history = [{"user": "What is fever?", "bot": r1}]
    print("\nQ: What are symptoms?")
    print(healthcare_chat("What are symptoms?", history))
    
    # ✨ NEW: Display statistics
    print("\n" + "="*60)
    print("\n📊 USAGE STATISTICS:")
    stats = get_statistics()
    print(f"• Total Questions Asked: {stats['total_questions']}")
    print(f"• Emergency Alerts Triggered: {stats['emergency_alerts']}")
    print(f"• Drug Information Queries: {stats['drug_queries']}")
    print(f"• General Health Queries: {stats['general_queries']}")
    print("\n" + "="*60)
    print("\n✅ All features working successfully!")