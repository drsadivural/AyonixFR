"""
Face Analytics Service
Provides InsightFace face detection, ArcFace recognition, and YOLO people counting
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import numpy as np
from PIL import Image
import io
import cv2

from utils.face_analyzer import FaceAnalyzer
from utils.people_counter import PeopleCounter

app = Flask(__name__)
CORS(app)

# Initialize services
face_analyzer = FaceAnalyzer()
people_counter = PeopleCounter()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'face_analytics'})

@app.route('/analyze_face', methods=['POST'])
def analyze_face():
    """
    Analyze faces in image using InsightFace
    Returns: face detection, recognition, age, gender, expression, race
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        if 'base64,' in image_base64:
            image_base64 = image_base64.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        # Analyze faces
        results = face_analyzer.analyze(image_np)
        
        return jsonify({
            'success': True,
            'faces': results
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/count_people', methods=['POST'])
def count_people():
    """
    Count people in image using YOLO
    Returns: person count and bounding boxes
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        if 'base64,' in image_base64:
            image_base64 = image_base64.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        # Count people
        results = people_counter.count(image_np)
        
        return jsonify({
            'success': True,
            'count': results['count'],
            'detections': results['detections']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/extract_embedding', methods=['POST'])
def extract_embedding():
    """
    Extract ArcFace embedding from face image
    Used for enrollment
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        if 'base64,' in image_base64:
            image_base64 = image_base64.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        # Extract embedding
        embedding = face_analyzer.extract_embedding(image_np)
        
        if embedding is None:
            return jsonify({'error': 'No face detected'}), 400
        
        return jsonify({
            'success': True,
            'embedding': embedding.tolist()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
