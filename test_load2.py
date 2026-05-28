import os
import tensorflow as tf

print("TF version:", tf.__version__)
model_path = r'c:\Users\LENOVO\OneDrive\Desktop\facial\ml_service\model.h5'
try:
    model = tf.keras.models.load_model(model_path, compile=False)
    print("Model loaded successfully with compile=False")
except Exception as e:
    print("Error loading model with compile=False:", e)
