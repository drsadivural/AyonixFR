#!/usr/bin/env python3
"""
Face Recognition Service with MediaPipe Face Mesh and Image Preprocessing
Provides high-accuracy face detection, 3D landmarks, and embedding extraction
"""

import cv2
import numpy as np
import mediapipe as mp
from typing import List, Dict, Tuple, Optional
import base64
import json

# Initialize MediaPipe Face Mesh for 3D landmarks
mp_face_mesh = mp.solutions.face_mesh
mp_face_detection = mp.solutions.face_detection

class FaceRecognitionService:
    def __init__(self):
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=10,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.face_detection = mp_face_detection.FaceDetection(
            model_selection=1,  # 1 for full range, 0 for short range
            min_detection_confidence=0.5
        )
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Apply image preprocessing for optimal face recognition accuracy:
        - Noise reduction
        - Lighting optimization
        - Contrast enhancement
        """
        # Convert to grayscale for processing
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # 1. Noise reduction using bilateral filter
        # Preserves edges while reducing noise
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 2. Histogram equalization for lighting optimization
        equalized = cv2.equalizeHist(denoised)
        
        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # Better than regular histogram equalization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(equalized)
        
        # Convert back to BGR for MediaPipe
        if len(image.shape) == 3:
            enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
        else:
            enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
        
        return enhanced_bgr
    
    def detect_faces(self, image_base64: str) -> Dict:
        """
        Detect faces with bounding boxes and confidence scores
        """
        try:
            # Decode base64 image
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            image_bytes = base64.b64decode(image_base64)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Failed to decode image"}
            
            # Preprocess image
            preprocessed = self.preprocess_image(image)
            
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(preprocessed, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            results = self.face_detection.process(rgb_image)
            
            faces = []
            if results.detections:
                h, w, _ = image.shape
                for detection in results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    faces.append({
                        "bbox": {
                            "x": int(bbox.xmin * w),
                            "y": int(bbox.ymin * h),
                            "width": int(bbox.width * w),
                            "height": int(bbox.height * h)
                        },
                        "confidence": detection.score[0]
                    })
            
            return {
                "faces": faces,
                "count": len(faces)
            }
        
        except Exception as e:
            return {"error": str(e)}
    
    def extract_landmarks_and_embedding(self, image_base64: str) -> Dict:
        """
        Extract 3D facial landmarks (468 points) and generate face embedding
        """
        try:
            # Decode base64 image
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            image_bytes = base64.b64decode(image_base64)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Failed to decode image"}
            
            # Preprocess image
            preprocessed = self.preprocess_image(image)
            
            # Convert BGR to RGB for MediaPipe
            rgb_image = cv2.cvtColor(preprocessed, cv2.COLOR_BGR2RGB)
            
            # Process with Face Mesh
            results = self.face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                return {"error": "No face detected"}
            
            all_faces = []
            h, w, _ = image.shape
            
            for face_landmarks in results.multi_face_landmarks:
                # Extract 3D landmarks (468 points)
                landmarks_3d = []
                for landmark in face_landmarks.landmark:
                    landmarks_3d.append({
                        "x": landmark.x * w,
                        "y": landmark.y * h,
                        "z": landmark.z * w  # Depth information
                    })
                
                # Generate face embedding from landmarks
                # Use key facial features for embedding generation
                embedding = self._generate_embedding_from_landmarks(face_landmarks, w, h)
                
                all_faces.append({
                    "landmarks": landmarks_3d,
                    "embedding": embedding.tolist(),
                    "landmark_count": len(landmarks_3d)
                })
            
            return {
                "faces": all_faces,
                "count": len(all_faces)
            }
        
        except Exception as e:
            return {"error": str(e)}
    
    def _generate_embedding_from_landmarks(self, face_landmarks, width: int, height: int) -> np.ndarray:
        """
        Generate a 128-dimensional face embedding from facial landmarks
        Uses geometric features and distances between key facial points
        """
        # Extract key facial points
        landmarks_array = np.array([[lm.x * width, lm.y * height, lm.z * width] 
                                    for lm in face_landmarks.landmark])
        
        # Key facial feature indices (MediaPipe Face Mesh)
        # Eyes, nose, mouth, face contour
        key_indices = [
            # Left eye
            33, 133, 160, 159, 158, 157, 173,
            # Right eye
            263, 362, 387, 386, 385, 384, 398,
            # Nose
            1, 2, 98, 327,
            # Mouth
            61, 291, 0, 17, 
            # Face contour
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            # Eyebrows
            70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
            # Cheeks
            205, 425, 206, 426
        ]
        
        # Extract key points
        key_points = landmarks_array[key_indices]
        
        # Calculate geometric features
        features = []
        
        # 1. Distances between key points
        for i in range(len(key_points)):
            for j in range(i + 1, min(i + 5, len(key_points))):  # Limit pairs to avoid explosion
                dist = np.linalg.norm(key_points[i] - key_points[j])
                features.append(dist)
        
        # 2. Angles between facial features
        # Eye-nose-mouth triangle
        left_eye = landmarks_array[33]
        right_eye = landmarks_array[263]
        nose_tip = landmarks_array[1]
        mouth_center = landmarks_array[13]
        
        # Calculate angles
        vec1 = right_eye - left_eye
        vec2 = nose_tip - left_eye
        vec3 = mouth_center - nose_tip
        
        angle1 = np.arccos(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2) + 1e-6))
        angle2 = np.arccos(np.dot(vec2, vec3) / (np.linalg.norm(vec2) * np.linalg.norm(vec3) + 1e-6))
        
        features.extend([angle1, angle2])
        
        # 3. Facial proportions
        face_width = np.linalg.norm(landmarks_array[234] - landmarks_array[454])
        face_height = np.linalg.norm(landmarks_array[10] - landmarks_array[152])
        eye_distance = np.linalg.norm(left_eye - right_eye)
        
        features.extend([face_width, face_height, eye_distance, face_width / (face_height + 1e-6)])
        
        # Normalize and pad/truncate to 128 dimensions
        features_array = np.array(features)
        
        # Normalize to [-1, 1] range
        if len(features_array) > 0:
            features_array = (features_array - np.mean(features_array)) / (np.std(features_array) + 1e-6)
        
        # Pad or truncate to exactly 128 dimensions
        if len(features_array) < 128:
            embedding = np.pad(features_array, (0, 128 - len(features_array)), mode='constant')
        else:
            embedding = features_array[:128]
        
        return embedding

def main():
    """
    Command-line interface for testing
    """
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python face_service.py <command> <image_base64>")
        print("Commands: detect, extract")
        sys.exit(1)
    
    command = sys.argv[1]
    image_base64 = sys.argv[2]
    
    service = FaceRecognitionService()
    
    if command == "detect":
        result = service.detect_faces(image_base64)
    elif command == "extract":
        result = service.extract_landmarks_and_embedding(image_base64)
    else:
        result = {"error": "Unknown command"}
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
