# Face Analytics Service

Python Flask service providing:
- **InsightFace** face detection and analysis
- **ArcFace** face recognition (512-dimensional embeddings)
- **YOLO v8** people counting
- Age, gender, expression, race estimation

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python app.py
```

Service will be available at `http://localhost:5001`

### Docker

```bash
# Build image
docker build -t ayonix-face-analytics .

# Run container
docker run -p 5001:5001 ayonix-face-analytics
```

## API Endpoints

See main DEPLOYMENT.md for full API documentation.

## Models

- **InsightFace**: buffalo_l (face detection + recognition)
- **YOLO**: YOLOv8n (nano, fast inference)

Models are automatically downloaded on first run.

## Performance

- Face detection: ~100ms per image (CPU)
- People counting: ~150ms per image (CPU)
- Recommended: Use GPU instance for production (10x faster)

## Configuration

Edit `app.py` to configure:
- Model selection
- Detection thresholds
- Image preprocessing
