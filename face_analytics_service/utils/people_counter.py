"""
People Counter using YOLO
Detects and counts people in images
"""

import numpy as np
from ultralytics import YOLO

class PeopleCounter:
    def __init__(self):
        """Initialize YOLO model for person detection"""
        # Use YOLOv8n (nano) for fast inference
        self.model = YOLO('yolov8n.pt')
        
    def count(self, image):
        """
        Count people in image
        Returns: count and detection bounding boxes
        """
        # Run inference
        results = self.model(image, classes=[0], verbose=False)  # class 0 = person
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                
                detections.append({
                    'bbox': [x1, y1, x2, y2],
                    'confidence': confidence
                })
        
        return {
            'count': len(detections),
            'detections': detections
        }
