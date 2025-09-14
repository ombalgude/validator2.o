# ML Models Directory

This directory contains machine learning models and training scripts for the AI services.

## Structure

- `models/` - Saved model files (.pkl, .pth, .h5)
- `training/` - Training scripts and notebooks
- `preprocessing/` - Data preprocessing utilities
- `evaluation/` - Model evaluation scripts

## Models

### Certificate Tampering Detection
- **Model**: CNN-based tampering detector
- **File**: `tampering_detector.pth`
- **Purpose**: Detect digital tampering in certificate images

### Template Matching
- **Model**: Template matching algorithm
- **File**: `template_matcher.pkl`
- **Purpose**: Match certificates against known templates

### Anomaly Detection
- **Model**: Isolation Forest for anomaly detection
- **File**: `anomaly_detector.pkl`
- **Purpose**: Detect unusual patterns in certificate data

## Usage

Models are automatically loaded by the AI services when needed. No manual intervention required.

## Training

To retrain models:

```bash
cd ai-services/ml_models
python training/train_tampering_detector.py
python training/train_template_matcher.py
python training/train_anomaly_detector.py
```

## Notes

- Models are versioned and can be updated independently
- Always backup existing models before training new ones
- Monitor model performance and retrain as needed

