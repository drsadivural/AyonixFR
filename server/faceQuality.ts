import { spawn } from 'child_process';
import path from 'path';

export interface FaceQualityResult {
  overall_score: number;
  overall_quality: 'poor' | 'acceptable' | 'good';
  recommendation: string;
  sharpness: {
    score: number;
    quality: string;
    raw_value: number;
  };
  lighting: {
    score: number;
    quality: string;
    brightness: number;
    contrast: number;
  };
  angle: {
    score: number;
    quality: string;
    angle_estimate: string;
    eyes_detected: number;
  };
}

export async function assessFaceQuality(imageBase64: string): Promise<FaceQualityResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python_service', 'face_quality.py');
    // Remove PYTHONHOME to prevent conflicts with system Python
    const env = { ...process.env };
    delete env.PYTHONHOME;
    delete env.PYTHONPATH;
    env.PATH = '/usr/local/bin:/usr/bin:/bin';
    
    const pythonProcess = spawn('/usr/bin/python3.11', [scriptPath, imageBase64], {
      cwd: process.cwd(),
      env,
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Face quality assessment failed: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(new Error(`Failed to parse quality assessment result: ${error}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}
