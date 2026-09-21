"""Scoring runtime wrapper

Provides:
- load_artifacts(models_dir): loads model/scaler/encoders/metadata
- preprocess_record(record, encoders, scaler): converts a dict or list/tuple into model-ready array
  - handles unseen categorical values by mapping them to -1
- score_record(record): returns {'prediction':0/1, 'probability':float}

CLI usage:
  python tools/scoring_runtime.py --test

Example programmatic usage:
  from tools.scoring_runtime import load_artifacts, score_record
  model, scaler, encoders, feature_names = load_artifacts('public/models')
  rec = { 'duration': 0, 'protocol_type': 'tcp', ... }
  out = score_record(rec)
"""

import os
import joblib
import pandas as pd
import numpy as np
import argparse
from typing import Dict, Any, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODELS_DIR = os.path.join(BASE_DIR, 'public', 'models')
COLUMN_NAMES = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
    'land', 'wrong_fragment', 'urgent', 'hot', 'num_failed_logins', 'logged_in',
    'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login',
    'is_guest_login', 'count', 'srv_count', 'serror_rate', 'srv_serror_rate',
    'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate',
    'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count',
    'dst_host_same_srv_rate', 'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
    'dst_host_srv_diff_host_rate', 'dst_host_serror_rate', 'dst_host_srv_serror_rate',
    'dst_host_rerror_rate', 'dst_host_srv_rerror_rate', 'label', 'difficulty'
]

categorical_columns = ['protocol_type', 'service', 'flag']

_artifacts = None  # cache


def load_artifacts(models_dir: str = None):
    """Load model, scaler, encoders and metadata from models_dir. Returns tuple:
    (model, scaler, encoders, feature_names, metadata)
    """
    global _artifacts
    if _artifacts is not None:
        return _artifacts
    if models_dir is None:
        models_dir = DEFAULT_MODELS_DIR
    model_path = os.path.join(models_dir, 'xgboost_threat_model.pkl')
    scaler_path = os.path.join(models_dir, 'scaler.pkl')
    encoders_path = os.path.join(models_dir, 'label_encoders.pkl')
    metadata_path = os.path.join(models_dir, 'model_metadata.json')

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    encoders = joblib.load(encoders_path)
    import json
    metadata = None
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

    feature_names = metadata.get('feature_names') if metadata else COLUMN_NAMES[:-2]
    _artifacts = (model, scaler, encoders, feature_names, metadata)
    return _artifacts


def _record_to_df(record: Any, feature_names) -> pd.DataFrame:
    """Convert input record into a single-row DataFrame with expected columns.
    Input may be:
      - dict mapping feature->value
      - list/tuple of values in the same order as feature_names
      - pandas Series / DataFrame row
    """
    if isinstance(record, dict):
        df = pd.DataFrame([record], columns=feature_names)
    elif isinstance(record, (list, tuple)):
        if len(record) != len(feature_names):
            raise ValueError('Record length does not match feature count')
        df = pd.DataFrame([record], columns=feature_names)
    elif isinstance(record, pd.Series):
        df = pd.DataFrame([record.values], columns=feature_names)
    elif isinstance(record, pd.DataFrame):
        if record.shape[0] != 1:
            raise ValueError('Only single-row DataFrame supported')
        df = record.copy()
        df.columns = feature_names
    else:
        raise TypeError('Unsupported record type')
    return df


def preprocess_record(record: Any, encoders: Dict[str, Any], scaler, feature_names=None):
    """Preprocess a single record and return 2D numpy array ready for model.predict.
    Unseen categorical values are mapped to -1.
    """
    model, sc, encs, f_names, metadata = load_artifacts()
    if feature_names is None:
        feature_names = f_names
    df = _record_to_df(record, feature_names)

    # Ensure categorical columns exist
    for col in categorical_columns:
        if col not in df.columns:
            raise ValueError(f'Missing categorical feature: {col}')

    # Fill missing numeric values with 0 (or could use median from metadata if provided)
    df = df.copy()
    # Encode categorical features with unseen handling
    for col, le in encoders.items():
        if col in df.columns:
            vals = df[col].astype(str).values
            mapped = []
            classes = set(le.classes_.tolist())
            for v in vals:
                if v in classes:
                    mapped.append(int(le.transform([v])[0]))
                else:
                    # unseen category -> map to -1
                    mapped.append(-1)
            df[col] = mapped

    # Drop label/difficulty if present
    for drop_col in ['label', 'difficulty']:
        if drop_col in df.columns:
            df = df.drop(columns=[drop_col])

    # Convert columns to numeric where possible, coerce errors
    df = df.apply(pd.to_numeric, errors='coerce')
    # Fill NaNs produced by coercion or missing values with 0
    df = df.fillna(0)

    # Ensure column order matches feature_names without label/difficulty
    final_features = [c for c in feature_names if c not in ('label', 'difficulty')]
    df = df[final_features]

    X = scaler.transform(df.values)
    return X


def score_record(record: Any, models_dir: str = None) -> Dict[str, Any]:
    """Load artifacts (cached), preprocess record, and return prediction + probability.
    Returns: {'prediction': int, 'probability': float}
    """
    model, scaler, encoders, feature_names, metadata = load_artifacts(models_dir)
    X = preprocess_record(record, encoders, scaler, feature_names)
    pred = model.predict(X)[0]
    proba = float(model.predict_proba(X)[0, 1])
    return {'prediction': int(pred), 'probability': proba}


def _cli_test():
    # load first row from train file and test scoring
    train_file = os.path.join(BASE_DIR, 'data', 'KDDtrain.csv')
    raw = pd.read_csv(train_file, header=None, dtype=str, nrows=1)
    if raw.shape[1] == 1:
        s = raw.iloc[0,0].strip().strip('"').strip("'")
        split = s.split(',')
        row = {k: v for k, v in zip(COLUMN_NAMES, split)}
    else:
        row = {k: raw.iloc[0,i] for i,k in enumerate(COLUMN_NAMES)}
    out = score_record(row)
    print('CLI test result:', out)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true', help='Run self-test using first training row')
    args = parser.parse_args()
    if args.test:
        _cli_test()
    else:
        print('Import functions and call score_record(record) programmatically.')
