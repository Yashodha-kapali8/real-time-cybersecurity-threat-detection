import pandas as pd
import joblib
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
models_dir = os.path.join(BASE_DIR, 'public', 'models')
train_file = os.path.join(BASE_DIR, 'data', 'KDDtrain.csv')

# Load artifacts
model = joblib.load(os.path.join(models_dir, 'xgboost_threat_model.pkl'))
scaler = joblib.load(os.path.join(models_dir, 'scaler.pkl'))
encoders = joblib.load(os.path.join(models_dir, 'label_encoders.pkl'))

# Column names from training script
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

# Read first row raw and handle quoted-row format
raw = pd.read_csv(train_file, header=None, dtype=str, nrows=1)
if raw.shape[1] == 1:
    s = raw.iloc[0,0].strip().strip('"').strip("'")
    split = s.split(',')
    df = pd.DataFrame([split], columns=COLUMN_NAMES)
else:
    df = raw
    df.columns = COLUMN_NAMES

# Prepare features
X = df.drop(['label','difficulty'], axis=1)
# encode categorical
for col, le in encoders.items():
    if col in X.columns:
        X[col] = le.transform(X[col])
# scale
X_scaled = scaler.transform(X)

pred = model.predict(X_scaled)
proba = model.predict_proba(X_scaled)[:,1]
print('Prediction (0=normal,1=attack):', int(pred[0]))
print('Attack probability:', float(proba[0]))
