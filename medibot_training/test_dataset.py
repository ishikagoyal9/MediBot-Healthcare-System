import pandas as pd

# Test loading the CSV
csv_path = r'C:\Users\Asus\OneDrive\Desktop\HEALTHCARE_CHATBOT_SYSTEM\PROJECT_HEALTH\medibot_training\medquad.csv'

print("📂 Loading dataset...")
df = pd.read_csv(csv_path)

print(f"✅ Success! Loaded {len(df)} rows")
print(f"\n📋 Columns: {df.columns.tolist()}")
print(f"\n📝 First 3 rows:")
print(df.head(3))