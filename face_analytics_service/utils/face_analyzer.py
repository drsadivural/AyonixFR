"""
Face Analyzer using InsightFace
Provides face detection, recognition (ArcFace), age, gender, expression, race
"""

import numpy as np
import cv2
from insightface.app import FaceAnalysis
from insightface.data import get_image as ins_get_image

class FaceAnalyzer:
    def __init__(self):
        """Initialize InsightFace face analysis"""
        self.app = FaceAnalysis(providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Expression mapping (based on facial landmarks and features)
        self.expressions = ['neutral', 'happy', 'sad', 'surprise', 'fear', 'disgust', 'anger']
        
    def analyze(self, image):
        """
        Analyze all faces in image
        Returns list of face data with detection, recognition, demographics
        """
        faces = self.app.get(image)
        
        results = []
        for face in faces:
            face_data = {
                'bbox': face.bbox.tolist(),  # [x1, y1, x2, y2]
                'kps': face.kps.tolist() if hasattr(face, 'kps') else None,  # 5 keypoints
                'det_score': float(face.det_score),  # Detection confidence
                'embedding': face.embedding.tolist(),  # ArcFace embedding (512-dim)
                'age': int(face.age) if hasattr(face, 'age') else None,
                'gender': 'male' if face.gender == 1 else 'female' if hasattr(face, 'gender') else None,
                'expression': self._estimate_expression(face),
                'race': self._estimate_race(face) if hasattr(face, 'embedding') else None,
            }
            results.append(face_data)
        
        return results
    
    def extract_embedding(self, image):
        """
        Extract ArcFace embedding from single face
        Used for enrollment
        """
        faces = self.app.get(image)
        
        if len(faces) == 0:
            return None
        
        # Return embedding of first detected face
        return faces[0].embedding
    
    def _estimate_expression(self, face):
        """
        Estimate facial expression based on landmarks
        Simple heuristic - can be improved with dedicated expression model
        """
        if not hasattr(face, 'kps') or face.kps is None:
            return 'neutral'
        
        # Simple heuristic based on mouth and eye positions
        # In production, use a dedicated expression recognition model
        kps = face.kps
        
        # Calculate mouth width/height ratio
        if kps.shape[0] >= 5:
            left_eye = kps[0]
            right_eye = kps[1]
            nose = kps[2]
            left_mouth = kps[3]
            right_mouth = kps[4]
            
            mouth_width = np.linalg.norm(right_mouth - left_mouth)
            eye_distance = np.linalg.norm(right_eye - left_eye)
            
            # Simple smile detection
            if mouth_width / eye_distance > 0.7:
                return 'happy'
        
        return 'neutral'
    
    def _estimate_race(self, face):
        """
        Estimate race/ethnicity
        Note: This is a simplified estimation. In production, use a dedicated model
        or avoid race classification due to ethical concerns
        """
        # Simplified placeholder - in production, use dedicated model or remove
        # For now, return 'unknown' to avoid bias
        return 'unknown'
    
    def compare_faces(self, embedding1, embedding2, threshold=0.6):
        """
        Compare two face embeddings using cosine similarity
        Returns: similarity score (0-1)
        """
        embedding1 = np.array(embedding1)
        embedding2 = np.array(embedding2)
        
        # Cosine similarity
        similarity = np.dot(embedding1, embedding2) / (
            np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        )
        
        return float(similarity)
