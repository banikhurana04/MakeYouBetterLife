import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Generate random features
    sleep_hours = np.random.uniform(3, 10, num_samples)
    water_intake = np.random.uniform(0.5, 4.0, num_samples) # in liters
    exercise_minutes = np.random.uniform(0, 120, num_samples)
    
    # Calculate a simple "score" to determine labels
    score = (sleep_hours / 10) * 0.4 + (water_intake / 4.0) * 0.3 + (exercise_minutes / 120) * 0.3
    
    # Assign energy level based on score
    energy_level = []
    mood = []
    
    for s in score:
        if s > 0.7:
            energy_level.append("High")
            mood.append("Good")
        elif s > 0.4:
            energy_level.append("Medium")
            mood.append("Average")
        else:
            energy_level.append("Low")
            mood.append("Poor")
            
    df = pd.DataFrame({
        'sleep_hours': sleep_hours,
        'water_intake': water_intake,
        'exercise_minutes': exercise_minutes,
        'energy_level': energy_level,
        'mood': mood
    })
    
    return df

def train_and_save_model():
    print("Generating synthetic data...")
    df = generate_synthetic_data()
    
    X = df[['sleep_hours', 'water_intake', 'exercise_minutes']]
    y = df[['energy_level', 'mood']]
    
    # Convert labels to tuples to train a MultiOutput classifier or just train two separate RF models
    # Since Random Forest can handle multi-output in scikit-learn:
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model trained with accuracy: {score:.2f}")
    
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"Model saved to {model_path}")

if __name__ == '__main__':
    train_and_save_model()
