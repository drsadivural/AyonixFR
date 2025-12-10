#!/usr/bin/env python3
import cv2
import numpy as np
import base64
import json
import sys

def decode_base64_image(base64_string):
    """Decode base64 image to numpy array"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def assess_sharpness(image):
    """Assess image sharpness using Laplacian variance"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Normalize score (0-100)
    # Typical values: < 100 = blurry, 100-500 = acceptable, > 500 = sharp
    if laplacian_var < 100:
        score = (laplacian_var / 100) * 50  # 0-50
        quality = 'poor'
    elif laplacian_var < 500:
        score = 50 + ((laplacian_var - 100) / 400) * 30  # 50-80
        quality = 'acceptable'
    else:
        score = min(80 + ((laplacian_var - 500) / 500) * 20, 100)  # 80-100
        quality = 'good'
    
    return {
        'score': round(score, 2),
        'quality': quality,
        'raw_value': round(laplacian_var, 2)
    }

def assess_lighting(image):
    """Assess lighting quality"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    std_brightness = np.std(gray)
    
    # Ideal brightness: 100-150, ideal std: 40-80
    brightness_score = 100 - abs(mean_brightness - 125) / 125 * 100
    contrast_score = 100 - abs(std_brightness - 60) / 60 * 100
    
    brightness_score = max(0, min(100, brightness_score))
    contrast_score = max(0, min(100, contrast_score))
    
    overall_score = (brightness_score * 0.6 + contrast_score * 0.4)
    
    if overall_score < 50:
        quality = 'poor'
    elif overall_score < 75:
        quality = 'acceptable'
    else:
        quality = 'good'
    
    return {
        'score': round(overall_score, 2),
        'quality': quality,
        'brightness': round(mean_brightness, 2),
        'contrast': round(std_brightness, 2)
    }

def assess_face_angle(image):
    """Assess face angle (frontal vs profile)"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Use Haar cascade for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        return {
            'score': 0,
            'quality': 'poor',
            'angle_estimate': 'no_face_detected'
        }
    
    # Get the largest face
    (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])
    face_roi = gray[y:y+h, x:x+w]
    
    # Detect eyes
    eyes = eye_cascade.detectMultiScale(face_roi)
    
    # Score based on face detection confidence and eye detection
    if len(eyes) >= 2:
        score = 100
        quality = 'good'
        angle = 'frontal'
    elif len(eyes) == 1:
        score = 60
        quality = 'acceptable'
        angle = 'slight_angle'
    else:
        score = 30
        quality = 'poor'
        angle = 'profile'
    
    return {
        'score': score,
        'quality': quality,
        'angle_estimate': angle,
        'eyes_detected': len(eyes)
    }

def assess_image_quality(base64_image):
    """Comprehensive image quality assessment"""
    try:
        image = decode_base64_image(base64_image)
        
        if image is None:
            return {
                'error': 'Failed to decode image'
            }
        
        sharpness = assess_sharpness(image)
        lighting = assess_lighting(image)
        angle = assess_face_angle(image)
        
        # Overall score (weighted average)
        overall_score = (
            sharpness['score'] * 0.35 +
            lighting['score'] * 0.35 +
            angle['score'] * 0.30
        )
        
        # Overall quality
        if overall_score < 50:
            overall_quality = 'poor'
            recommendation = 'Image quality is too low. Please ensure good lighting, hold camera steady, and face the camera directly.'
        elif overall_score < 75:
            overall_quality = 'acceptable'
            recommendation = 'Image quality is acceptable but could be improved. Consider better lighting or a more frontal angle.'
        else:
            overall_quality = 'good'
            recommendation = 'Image quality is good for enrollment.'
        
        return {
            'overall_score': round(overall_score, 2),
            'overall_quality': overall_quality,
            'recommendation': recommendation,
            'sharpness': sharpness,
            'lighting': lighting,
            'angle': angle
        }
        
    except Exception as e:
        return {
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No image data provided'}))
        sys.exit(1)
    
    base64_image = sys.argv[1]
    result = assess_image_quality(base64_image)
    print(json.dumps(result))
