import joblib
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from keras.models import load_model
import numpy as np
import os

app = Flask(__name__)
CORS(app)
MODEL_FILE = 'lstm_weather_model.h5'
SCALER_FILE = 'minmax_scaler.pkl'
DATA_FILE = 'forecast_data.csv'

try:
    LOADED_MODEL = load_model(MODEL_FILE)
    LOADED_SCALER = joblib.load(SCALER_FILE)
    DATA = pd.read_csv(DATA_FILE) 
    DATA = DATA[['time_epoch', 'temp_c']]
    DATA = DATA.set_index(pd.to_datetime(DATA['time_epoch'], unit='s'))
    DATA = DATA.fillna(method='ffill')
    print("Backend: Model Loaded Successfully!")
except Exception as e:
    print(f"Backend Load Error: {e}")
    LOADED_MODEL = None

def predict_next_step(model, scaler, historical_temps, look_back=60):
    if len(historical_temps) < look_back:
        return 0
    input_data = historical_temps[-look_back:].values.reshape(-1, 1)
    scaled_input = scaler.transform(input_data)
    input_data_3d = scaled_input.reshape(1, look_back, 1)
    predicted_scaled = model.predict(input_data_3d, verbose=0)
    predicted_temp = scaler.inverse_transform(predicted_scaled)
    return float(predicted_temp[0][0])

@app.route('/api/predict_next', methods=['GET'])
def get_prediction():
    if LOADED_MODEL is None:
        return jsonify({'error': 'Model not loaded on server'}), 500
    try:
        historical_temps = DATA['temp_c'] 
        next_temp = predict_next_step(LOADED_MODEL, LOADED_SCALER, historical_temps)
        return jsonify({
            'status': 'success',
            'predicted_temp_c': round(next_temp, 2),
            'units': 'C',
        })
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)