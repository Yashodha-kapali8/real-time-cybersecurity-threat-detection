"""
XGBoost Network Intrusion Detection Training Script
===================================================

This script trains an XGBoost model on NSL-KDD dataset for real-time threat detection.

STEP-BY-STEP USAGE:
-------------------
1. Install required packages:
   pip install xgboost pandas numpy scikit-learn joblib

2. Download NSL-KDD dataset:
   - Training: KDDTrain+.txt
   - Testing: KDDTest+.txt
   From: https://www.unb.ca/cic/datasets/nsl.html

3. Update file paths below (lines 35-36)

4. Run the script:
   python training.py

5. The trained model will be saved as 'xgboost_threat_model.pkl'

6. Copy the model file to your React app's public folder for real-time use
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import joblib
import json
from datetime import datetime

# ================================
# STEP 2: Define dataset file paths
# ================================
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_FILE = os.path.join(BASE_DIR, "data", "KDDtrain.csv")
TEST_FILE  = os.path.join(BASE_DIR, "data", "KDDtest.csv")

print("Training file path:", TRAIN_FILE)
print("Testing file path:", TEST_FILE)
 # UPDATE THIS PATH (optional)

# NSL-KDD Column Names (41 features + 1 label)
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

print("=" * 70)
print("XGBoost Network Intrusion Detection System - Training Script")
print("=" * 70)
print()

# ============================================
# STEP 2: LOAD DATASET
# ============================================
print("STEP 2: Loading NSL-KDD Dataset...")
print("-" * 70)

try:
    # Load training data without forcing column names so we can detect malformed rows
    train_data = pd.read_csv(TRAIN_FILE, header=None, dtype=str)
    print(f"✓ Raw training data loaded: {train_data.shape[0]} rows, {train_data.shape[1]} raw columns")

    # Load test data if available
    try:
        test_data = pd.read_csv(TEST_FILE, header=None, dtype=str)
        print(f"✓ Raw test data loaded: {test_data.shape[0]} rows, {test_data.shape[1]} raw columns")
        use_separate_test = True
    except Exception:
        print("! Test file not found, will split training data")
        use_separate_test = False
        
except Exception as e:
    print(f"✗ ERROR: Could not load dataset files")
    print(f"  Make sure to update TRAIN_FILE and TEST_FILE paths (lines 35-36)")
    print(f"  Error details: {e}")
    exit(1)

# Helper: Some provided CSVs wrap entire rows in quotes which causes pandas
# to parse each row as a single string column. Detect that and split rows
# into the expected columns.

def _fix_quoted_rows(df, label):
    """Detect rows that were read as a single quoted string (or where only the
    first column contains data) and split them into the expected columns.
    """
    # If there is exactly one column, likely each row is a quoted CSV string
    if df.shape[1] == 1:
        print(f"! Detected single-string rows in {label}, attempting to split by comma...")
        s = df.iloc[:, 0].astype(str).str.strip()
        s = s.str.strip('"').str.strip("'")
        split = s.str.split(',', expand=True)
        if split.shape[1] != len(COLUMN_NAMES):
            print(f"✗ ERROR: Expected {len(COLUMN_NAMES)} columns after splitting, got {split.shape[1]}")
            raise ValueError("Unexpected number of columns after splitting quoted rows")
        split.columns = COLUMN_NAMES
        return split

    # If more than one column but only the first column has content and others are largely null,
    # that means pandas parsed the whole row into column 0 while still creating extra columns
    if df.shape[1] >= 2:
        # Check if all columns except the first are empty
        others_all_null = df.iloc[:, 1:].apply(lambda col: col.isnull() | (col.astype(str).str.strip() == '')).all().all()
        if others_all_null:
            print(f"! Detected rows where only first column contains data in {label}, attempting to split first column...")
            s = df.iloc[:, 0].astype(str).str.strip()
            s = s.str.strip('"').str.strip("'")
            split = s.str.split(',', expand=True)
            if split.shape[1] != len(COLUMN_NAMES):
                print(f"✗ ERROR: Expected {len(COLUMN_NAMES)} columns after splitting, got {split.shape[1]}")
                raise ValueError("Unexpected number of columns after splitting quoted rows")
            split.columns = COLUMN_NAMES
            return split

    # If data already looks like proper columns, but column count may differ, try to align
    if df.shape[1] == len(COLUMN_NAMES):
        df.columns = COLUMN_NAMES
        return df

    # Otherwise, return as-is (caller will likely fail later and print a useful error)
    return df

# Fix potential quoted-row problem for training and test data
train_data = _fix_quoted_rows(train_data, 'training file')
if 'test_data' in locals() and use_separate_test:
    test_data = _fix_quoted_rows(test_data, 'test file')

# Some cleaned CSVs include a header row like "col_0,col_1,..." that becomes
# a data row after splitting quoted rows. Detect and drop that header row if present.
def _drop_header_if_present(df, label):
    try:
        first_row = df.iloc[0].astype(str).str.lower()
        # If first row contains typical column placeholders or the word 'label', drop it
        if first_row.str.contains('col_0').any() or 'label' in first_row.values:
            print(f"! Detected header-like first row in {label}, dropping it")
            df = df.iloc[1:].reset_index(drop=True)
    except Exception:
        pass
    return df

train_data = _drop_header_if_present(train_data, 'training file')
if 'test_data' in locals() and use_separate_test:
    test_data = _drop_header_if_present(test_data, 'test file')

print()

# ============================================
# STEP 3: DATA PREPROCESSING
# ============================================
print("STEP 3: Preprocessing Data...")
print("-" * 70)

# Convert labels to binary (normal=0, attack=1)
train_data['label'] = train_data['label'].apply(lambda x: 0 if x == 'normal' else 1)
if use_separate_test:
    test_data['label'] = test_data['label'].apply(lambda x: 0 if x == 'normal' else 1)

print(f"✓ Label distribution in training set:")
print(f"  - Normal: {(train_data['label'] == 0).sum()}")
print(f"  - Attack: {(train_data['label'] == 1).sum()}")
print()

# Separate features and labels
X_train = train_data.drop(['label', 'difficulty'], axis=1)
y_train = train_data['label']

if use_separate_test:
    X_test = test_data.drop(['label', 'difficulty'], axis=1)
    y_test = test_data['label']

# Encode categorical features
categorical_columns = ['protocol_type', 'service', 'flag']
label_encoders = {}

print("✓ Encoding categorical features:")
for col in categorical_columns:
    le = LabelEncoder()
    X_train[col] = le.fit_transform(X_train[col])
    if use_separate_test:
        X_test[col] = le.transform(X_test[col])
    label_encoders[col] = le
    print(f"  - {col}: {len(le.classes_)} unique values")

print()

# Scale numerical features
print("✓ Scaling numerical features with StandardScaler...")
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
if use_separate_test:
    X_test = scaler.transform(X_test)

print()

# Split training data if no separate test set
if not use_separate_test:
    X_train, X_test, y_train, y_test = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
    )
    print(f"✓ Split training data: {len(X_train)} train, {len(X_test)} test")
    print()

# ============================================
# STEP 4: TRAIN XGBOOST MODEL
# ============================================
print("STEP 4: Training XGBoost Model...")
print("-" * 70)

# XGBoost hyperparameters optimized for network intrusion detection
xgb_params = {
    'max_depth': 10,
    'learning_rate': 0.1,
    'n_estimators': 200,
    'objective': 'binary:logistic',
    'booster': 'gbtree',
    'n_jobs': -1,
    'gamma': 0.1,
    'min_child_weight': 1,
    'max_delta_step': 0,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'reg_alpha': 0.1,
    'reg_lambda': 1,
    'scale_pos_weight': 1,
    'seed': 42,
    'eval_metric': ['error', 'logloss']
}

print("Training configuration:")
for key, value in xgb_params.items():
    print(f"  - {key}: {value}")
print()

print("Training in progress... (this may take several minutes)")
model = xgb.XGBClassifier(**xgb_params)
model.fit(X_train, y_train, verbose=True)

print()
print("✓ Training completed!")
print()

# ============================================
# STEP 5: EVALUATE MODEL
# ============================================
print("STEP 5: Evaluating Model Performance...")
print("-" * 70)

# Make predictions
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

# Calculate metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
conf_matrix = confusion_matrix(y_test, y_pred)

print("\n" + "=" * 70)
print("MODEL PERFORMANCE METRICS")
print("=" * 70)
print(f"Accuracy:  {accuracy * 100:.2f}%")
print(f"Precision: {precision * 100:.2f}%")
print(f"Recall:    {recall * 100:.2f}%")
print(f"F1-Score:  {f1 * 100:.2f}%")
print()

print("Confusion Matrix:")
print(f"  True Negatives:  {conf_matrix[0][0]}")
print(f"  False Positives: {conf_matrix[0][1]}")
print(f"  False Negatives: {conf_matrix[1][0]}")
print(f"  True Positives:  {conf_matrix[1][1]}")
print()

print("Detailed Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Normal', 'Attack']))
print()

# Feature importance
feature_importance = pd.DataFrame({
    'feature': COLUMN_NAMES[:-2],  # Exclude label and difficulty
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("Top 10 Most Important Features:")
for idx, row in feature_importance.head(10).iterrows():
    print(f"  {row['feature']:25s} {row['importance']:.4f}")
print()

# ============================================
# STEP 6: SAVE MODEL AND METADATA
# ============================================
print("STEP 6: Saving Model and Metadata...")
print("-" * 70)

# Save XGBoost model
models_dir = os.path.join(BASE_DIR, 'public', 'models')
os.makedirs(models_dir, exist_ok=True)

# Filenames inside public/models
model_filename = os.path.join(models_dir, 'xgboost_threat_model.pkl')
joblib.dump(model, model_filename)
print(f"✓ Model saved: {model_filename}")

# Save scaler
scaler_filename = os.path.join(models_dir, 'scaler.pkl')
joblib.dump(scaler, scaler_filename)
print(f"✓ Scaler saved: {scaler_filename}")

# Save label encoders
encoders_filename = os.path.join(models_dir, 'label_encoders.pkl')
joblib.dump(label_encoders, encoders_filename)
print(f"✓ Label encoders saved: {encoders_filename}")

# Save metadata
metadata = {
    'model_type': 'XGBoost',
    'training_date': datetime.now().isoformat(),
    'dataset': 'NSL-KDD',
    'training_samples': len(X_train),
    'test_samples': len(X_test),
    'metrics': {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1)
    },
    'hyperparameters': xgb_params,
    'feature_names': COLUMN_NAMES[:-2],
    'categorical_features': categorical_columns,
    'confusion_matrix': conf_matrix.tolist()
}

metadata_filename = 'model_metadata.json'
with open(metadata_filename, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✓ Metadata saved: {metadata_filename}")

print()
print("=" * 70)
print("TRAINING COMPLETED SUCCESSFULLY!")
print("=" * 70)
print()
print("Next Steps:")
print("1. Copy these files to your React app's public folder:")
print(f"   - {model_filename}")
print(f"   - {scaler_filename}")
print(f"   - {encoders_filename}")
print(f"   - {metadata_filename}")
print()
print("2. The React app will automatically load the model for real-time detection")
print()
print("3. All detected threats will be saved to Supabase database")
print()
print("Model is ready for deployment! 🚀")
print("=" * 70)
