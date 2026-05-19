"""
MediBot Model Training Script
Train a custom medical chatbot using Kaggle datasets
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    Trainer, 
    TrainingArguments,
    DataCollatorForSeq2Seq
)
from datasets import Dataset
import torch


def load_medical_qa_data():

    df = pd.read_csv(r'C:\Users\Asus\OneDrive\Desktop\HEALTHCARE_CHATBOT_SYSTEM\PROJECT_HEALTH\medibot_training\medquad.csv')
    
    df = df.dropna(subset=['question', 'answer'])
    df['question'] = df['question'].str.strip()
    df['answer'] = df['answer'].str.strip()
    
    df = df.drop_duplicates(subset=['question'])
    
    print(f"✅ Loaded {len(df)} medical Q&A pairs")
    return df


def prepare_training_data(df):
    """Convert dataframe to training format"""
    
 
    df['input_text'] = "medical question: " + df['question']
    df['target_text'] = df['answer']
    
    train_df, val_df = train_test_split(
        df, 
        test_size=0.1, 
        random_state=42
    )
    
    print(f"📊 Training samples: {len(train_df)}")
    print(f"📊 Validation samples: {len(val_df)}")
    
    return train_df, val_df


def create_dataset(df, tokenizer, max_length=512):
    
    
    def tokenize_function(examples):
        model_inputs = tokenizer(
            examples['input_text'],
            max_length=max_length,
            truncation=True,
            padding='max_length'
        )
        
        labels = tokenizer(
            examples['target_text'],
            max_length=max_length,
            truncation=True,
            padding='max_length'
        )
        
        model_inputs['labels'] = labels['input_ids']
        return model_inputs
    
    # Convert to HF Dataset
    dataset = Dataset.from_pandas(df[['input_text', 'target_text']])
    
    # Tokenize
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=['input_text', 'target_text']
    )
    
    return tokenized_dataset


def initialize_model():
    """Load pre-trained model for fine-tuning"""
    
    model_name = "google/flan-t5-base"  # Good for medical tasks
    
    print(f"🔄 Loading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    
    print(f"✅ Model loaded: {model.num_parameters():,} parameters")
    return tokenizer, model

def get_training_args():
   
    
    training_args = TrainingArguments(
        output_dir="./medibot_model",
        evaluation_strategy="epoch",
        learning_rate=3e-4,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
        save_strategy="epoch",
        save_total_limit=2,
        logging_dir="./logs",
        logging_steps=100,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        warmup_steps=500,
        fp16=torch.cuda.is_available(),  
        report_to="none"
    )
    
    return training_args


def train_model(train_dataset, val_dataset, model, tokenizer):
    """Fine-tune the model"""
    
    training_args = get_training_args()
    
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer
    )
    
    print("\n🚀 Starting training...")
    trainer.train()
    
    print("✅ Training completed!")
    return trainer


def save_model(trainer, tokenizer, output_path="./medibot_final"):
    """Save trained model"""
    
    trainer.save_model(output_path)
    tokenizer.save_pretrained(output_path)
    
    print(f"💾 Model saved to: {output_path}")

# ============================================
# STEP 8: Test Model
# ============================================
def test_model(model_path="./medibot_final"):
    """Test the trained model"""
    
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
    
    test_questions = [
        "What are the symptoms of diabetes?",
        "How to treat high blood pressure?",
        "What causes fever?"
    ]
    
    print("\n🧪 Testing model...\n")
    
    for question in test_questions:
        input_text = f"medical question: {question}"
        inputs = tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True)
        
        outputs = model.generate(
            inputs.input_ids,
            max_length=200,
            num_beams=4,
            early_stopping=True
        )
        
        answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"❓ Q: {question}")
        print(f"💡 A: {answer}\n")

# ============================================
# MAIN EXECUTION
# ============================================
if __name__ == "__main__":
    
    print("=" * 60)
    print("🏥 MEDIBOT MODEL TRAINING")
    print("=" * 60)
    
    # Step 1: Load data
    df = load_medical_qa_data()
    
    # Step 2: Prepare data
    train_df, val_df = prepare_training_data(df)
    
    # Step 3: Initialize model
    tokenizer, model = initialize_model()
    
    # Step 4: Create datasets
    train_dataset = create_dataset(train_df, tokenizer)
    val_dataset = create_dataset(val_df, tokenizer)
    
    # Step 5: Train model
    trainer = train_model(train_dataset, val_dataset, model, tokenizer)
    
    # Step 6: Save model
    save_model(trainer, tokenizer)
    
    # Step 7: Test model
    test_model()
    
    print("\n✅ ALL DONE! Model is ready to use.")
    print("📁 Model location: ./medibot_final")