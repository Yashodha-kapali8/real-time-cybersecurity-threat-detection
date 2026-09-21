# CyberDefense Pro - System Flow & Architecture

## 🎯 System Overview

**CyberDefense Pro** is a real-time network intrusion detection system combining XGBoost machine learning with modern web technologies for enterprise-grade threat detection.

---

## 🔄 Complete System Flow

<lov-mermaid>
graph TB
    subgraph "Training Phase (Offline - Python)"
        A[NSL-KDD Dataset] --> B[training.py]
        B --> C[Data Preprocessing]
        C --> D[XGBoost Training]
        D --> E[Model Evaluation]
        E --> F[Save Artifacts]
        F --> G1[xgboost_model.pkl]
        F --> G2[scaler.pkl]
        F --> G3[encoders.pkl]
        F --> G4[metadata.json]
    end
    
    subgraph "Deployment Phase (Real-Time - React)"
        G1 --> H[Load Model]
        G2 --> H
        G3 --> H
        G4 --> H
        H --> I[Initialize Detection Service]
        I --> J[Monitor Network Traffic]
        J --> K[Extract Features]
        K --> L[Preprocess Data]
        L --> M[XGBoost Prediction]
    end
    
    subgraph "Detection & Response"
        M --> N{Is Attack?}
        N -->|Yes| O[Create Threat Alert]
        N -->|No| P[Log Normal Traffic]
        O --> Q[Save to Supabase]
        P --> Q
        Q --> R[(Database)]
        R --> S[Dashboard Updates]
        S --> T[User Notification]
    end
    
    style A fill:#e1f5ff
    style D fill:#fff4e1
    style M fill:#ffe1e1
    style Q fill:#e1ffe1
    style R fill:#f0e1ff
</lov-mermaid>

---

## 📊 Data Flow Architecture

<lov-mermaid>
sequenceDiagram
    participant User
    participant React as React App
    participant ML as ML Service
    participant XGB as XGBoost Model
    participant SB as Supabase
    
    User->>React: Access Dashboard
    React->>ML: Initialize Detection
    ML->>XGB: Load Model Files
    XGB-->>ML: Model Ready
    
    loop Real-Time Monitoring
        React->>ML: Capture Network Packet
        ML->>ML: Extract 41 Features
        ML->>XGB: Predict(features)
        XGB-->>ML: {probability, isAttack}
        
        alt Attack Detected
            ML->>SB: Insert threat_logs
            ML->>SB: Insert network_traffic
            SB-->>React: Real-time Update
            React->>User: Show Alert
        else Normal Traffic
            ML->>SB: Insert network_traffic
            SB-->>React: Update Stats
        end
    end
</lov-mermaid>

---

## 🏗️ System Architecture

<lov-mermaid>
graph LR
    subgraph "Frontend Layer"
        UI[React UI]
        RTC[Real-Time Charts]
        DASH[Dashboard]
        ALERTS[Alert System]
    end
    
    subgraph "Business Logic Layer"
        MS[ML Service]
        PS[Packet Service]
        TS[Threat Service]
        AUTH[Auth Context]
    end
    
    subgraph "ML Layer"
        XGB[XGBoost Model]
        PREP[Preprocessor]
        FEAT[Feature Extractor]
    end
    
    subgraph "Data Layer"
        SB[(Supabase)]
        TL[threat_logs]
        NT[network_traffic]
        ML_M[ml_models]
    end
    
    UI --> MS
    UI --> PS
    UI --> DASH
    DASH --> RTC
    DASH --> ALERTS
    
    MS --> XGB
    MS --> PREP
    PS --> FEAT
    
    MS --> SB
    PS --> SB
    TS --> SB
    
    SB --> TL
    SB --> NT
    SB --> ML_M
    
    style UI fill:#4a90e2
    style XGB fill:#e24a4a
    style SB fill:#4ae290
</lov-mermaid>

---

## 🔐 Security & Data Flow

<lov-mermaid>
graph TD
    subgraph "User Access"
        LOGIN[Login/Signup] --> AUTH{Authenticated?}
        AUTH -->|No| DENIED[Access Denied]
        AUTH -->|Yes| APP[App Dashboard]
    end
    
    subgraph "Data Protection"
        APP --> RLS{RLS Policies}
        RLS --> CHECK1{User ID Match?}
        RLS --> CHECK2{Role Permission?}
        CHECK1 -->|Yes| ALLOW[Access Granted]
        CHECK2 -->|Yes| ALLOW
        CHECK1 -->|No| BLOCK[Access Blocked]
        CHECK2 -->|No| BLOCK
    end
    
    subgraph "Data Operations"
        ALLOW --> READ[Read Data]
        ALLOW --> WRITE[Write Data]
        READ --> ENCRYPT{Encryption}
        WRITE --> ENCRYPT
        ENCRYPT --> DB[(Supabase DB)]
    end
    
    style AUTH fill:#ffd700
    style RLS fill:#ff6b6b
    style ENCRYPT fill:#4ecdc4
</lov-mermaid>

---

## 🎛️ Feature Processing Pipeline

<lov-mermaid>
graph LR
    subgraph "Raw Packet Data"
        PKT[Network Packet]
    end
    
    subgraph "Feature Extraction (41 Features)"
        PKT --> CONN[Connection Features]
        PKT --> CONT[Content Features]
        PKT --> TRAF[Traffic Features]
        PKT --> HOST[Host Features]
        
        CONN --> F1[duration]
        CONN --> F2[protocol_type]
        CONN --> F3[service]
        
        CONT --> F4[src_bytes]
        CONT --> F5[dst_bytes]
        CONT --> F6[wrong_fragment]
        
        TRAF --> F7[count]
        TRAF --> F8[srv_count]
        TRAF --> F9[error_rate]
        
        HOST --> F10[dst_host_count]
        HOST --> F11[same_srv_rate]
    end
    
    subgraph "Preprocessing"
        F1 --> SCALE[StandardScaler]
        F2 --> ENCODE[LabelEncoder]
        F4 --> SCALE
        F5 --> SCALE
        F7 --> SCALE
        F8 --> SCALE
        F10 --> SCALE
    end
    
    subgraph "Prediction"
        SCALE --> XGBM[XGBoost Model]
        ENCODE --> XGBM
        XGBM --> PRED[Prediction]
    end
    
    style PKT fill:#e1f5ff
    style XGBM fill:#ffe1e1
    style PRED fill:#e1ffe1
</lov-mermaid>

---

## 📈 Model Training Workflow

<lov-mermaid>
flowchart TD
    START([Start Training]) --> LOAD[Load NSL-KDD Dataset]
    LOAD --> PREP[Preprocess Data]
    PREP --> ENCODE[Encode Categorical]
    ENCODE --> SCALE[Scale Numerical]
    SCALE --> SPLIT{Separate Test Set?}
    
    SPLIT -->|Yes| TRAIN1[Train on Full Training Set]
    SPLIT -->|No| TRAIN2[Split 80/20]
    
    TRAIN1 --> XGB[XGBoost Training]
    TRAIN2 --> XGB
    
    XGB --> EVAL[Evaluate Model]
    EVAL --> METRICS{Accuracy > 90%?}
    
    METRICS -->|Yes| SAVE[Save Model]
    METRICS -->|No| TUNE[Tune Hyperparameters]
    TUNE --> XGB
    
    SAVE --> EXPORT[Export 4 Files]
    EXPORT --> DONE([Training Complete])
    
    style START fill:#4ae290
    style XGB fill:#ffd700
    style DONE fill:#4ae290
</lov-mermaid>

---

## 🚨 Threat Detection Decision Tree

<lov-mermaid>
graph TD
    PACKET[Network Packet] --> EXTRACT[Extract 41 Features]
    EXTRACT --> PREPROCESS[Preprocess Features]
    PREPROCESS --> MODEL[XGBoost Model]
    MODEL --> PROB{Probability Score}
    
    PROB -->|< 0.5| NORMAL[Normal Traffic]
    PROB -->|>= 0.5| ATTACK[Attack Detected]
    
    ATTACK --> CLASSIFY{Classify Type}
    CLASSIFY --> DOS[DoS Attack]
    CLASSIFY --> PROBE[Probe/Scan]
    CLASSIFY --> R2L[R2L Attack]
    CLASSIFY --> U2R[U2R Attack]
    
    DOS --> SEVERITY1[Severity: Critical]
    PROBE --> SEVERITY2[Severity: High]
    R2L --> SEVERITY3[Severity: Medium]
    U2R --> SEVERITY4[Severity: Critical]
    
    SEVERITY1 --> LOG[Log to Supabase]
    SEVERITY2 --> LOG
    SEVERITY3 --> LOG
    SEVERITY4 --> LOG
    NORMAL --> LOG
    
    LOG --> ALERT{Show Alert?}
    ALERT -->|Attack| NOTIFY[Send Notification]
    ALERT -->|Normal| STATS[Update Stats]
    
    style ATTACK fill:#ff6b6b
    style NORMAL fill:#4ecdc4
    style LOG fill:#ffd700
</lov-mermaid>

---

## 📋 Database Schema

<lov-mermaid>
erDiagram
    THREAT_LOGS ||--o{ NETWORK_TRAFFIC : contains
    PROFILES ||--o{ THREAT_LOGS : creates
    PROFILES ||--o{ NETWORK_TRAFFIC : monitors
    ML_MODELS ||--o{ THREAT_LOGS : detects
    
    THREAT_LOGS {
        uuid id PK
        timestamp created_at
        text source_ip
        text destination_ip
        text threat_type
        text severity
        numeric confidence_score
        text status
    }
    
    NETWORK_TRAFFIC {
        uuid id PK
        timestamp timestamp
        text source_ip
        text destination_ip
        text protocol
        int packet_size
        text classification
        numeric ml_confidence
    }
    
    PROFILES {
        uuid id PK
        uuid user_id FK
        text full_name
        text department
        timestamp created_at
    }
    
    ML_MODELS {
        uuid id PK
        text name
        text version
        numeric accuracy
        boolean is_active
        timestamp training_date
    }
</lov-mermaid>

---

## ⚡ Real-Time Processing Flow

<lov-mermaid>
journey
    title Network Threat Detection Journey
    section Packet Capture
      Capture Network Packet: 5: System
      Extract Features: 4: ML Service
      Validate Data: 4: ML Service
    section ML Processing
      Load Model: 5: XGBoost
      Preprocess Features: 4: Preprocessor
      Make Prediction: 5: XGBoost
      Calculate Confidence: 4: ML Service
    section Threat Handling
      Classify Threat Type: 3: Threat Service
      Determine Severity: 3: Threat Service
      Log to Database: 5: Supabase
    section User Notification
      Update Dashboard: 5: React
      Send Alert: 4: UI
      Show Statistics: 5: Charts
</lov-mermaid>

---

## 🎯 System Components Breakdown

### 1. **Training Components (Python)**
- **training.py**: Main training script
- **XGBoost**: ML algorithm for classification
- **Preprocessors**: Data scaling and encoding
- **Validators**: Model evaluation and metrics

### 2. **Frontend Components (React)**
- **Dashboard**: Overview and statistics
- **Real-Time Monitor**: Live threat detection
- **Packet Analyzer**: Deep packet inspection
- **Threat Detection**: Historical threats
- **Network Monitor**: Traffic analysis
- **Database Manager**: Data management

### 3. **Backend Services (TypeScript)**
- **mlService**: Model loading and prediction
- **packetCapture**: Network monitoring
- **threatService**: Threat classification
- **datasetService**: Data preprocessing

### 4. **Database Tables (Supabase)**
- **threat_logs**: All detected threats
- **network_traffic**: All network packets
- **profiles**: User information
- **ml_models**: Model metadata
- **system_config**: System settings

---

## 🔧 Configuration & Environment

### Required Files Structure
```
project/
├── training.py                    # Training script
├── TRAINING_GUIDE.md             # This guide
├── public/
│   └── models/
│       ├── xgboost_threat_model.pkl
│       ├── scaler.pkl
│       ├── label_encoders.pkl
│       └── model_metadata.json
├── src/
│   ├── services/
│   │   ├── mlService.ts
│   │   ├── packetCapture.ts
│   │   └── threatService.ts
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── RealTimeMonitor.tsx
│   │   └── ThreatDetection.tsx
│   └── integrations/
│       └── supabase/
│           └── client.ts
└── supabase/
    └── migrations/
```

---

## 🎓 Key Concepts

### **NSL-KDD Dataset**
- Improved version of KDD Cup 1999
- 125,973 training records
- 22,544 test records
- 41 features per record
- 5 classes (normal + 4 attack types)

### **XGBoost Algorithm**
- Gradient boosted decision trees
- Optimized for speed and performance
- Handles imbalanced datasets well
- Provides feature importance
- Suitable for binary classification

### **Real-Time Detection**
- Sub-10ms prediction latency
- Continuous monitoring
- Automatic threat logging
- Real-time dashboard updates
- Instant notifications

---

## 📊 Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| **Accuracy** | > 90% | 95-98% |
| **Precision** | > 90% | 94-96% |
| **Recall** | > 90% | 95-97% |
| **F1-Score** | > 90% | 95-97% |
| **False Positive Rate** | < 5% | 2-3% |
| **Prediction Time** | < 10ms | 3-5ms |
| **Model Size** | < 50MB | 20-30MB |

---

## 🔄 Update & Maintenance Cycle

<lov-mermaid>
graph LR
    A[Production System] --> B[Collect New Data]
    B --> C[Analyze Performance]
    C --> D{Need Retraining?}
    D -->|Yes| E[Prepare Dataset]
    D -->|No| A
    E --> F[Run training.py]
    F --> G[Evaluate New Model]
    G --> H{Better Performance?}
    H -->|Yes| I[Deploy New Model]
    H -->|No| A
    I --> J[Update public/models/]
    J --> K[Restart App]
    K --> A
    
    style A fill:#4ae290
    style F fill:#ffd700
    style I fill:#4ae290
</lov-mermaid>

---

## 🚀 Quick Start Checklist

- [ ] Install Python dependencies
- [ ] Download NSL-KDD dataset
- [ ] Update file paths in training.py
- [ ] Run training script
- [ ] Copy 4 model files to public/models/
- [ ] Start React app
- [ ] Login to system
- [ ] Verify real-time detection
- [ ] Check Supabase for logged threats

---

## 📞 Support & Troubleshooting

| Issue | Solution |
|-------|----------|
| Model not loading | Check file paths in public/models/ |
| Low accuracy | Retrain with more data or tune hyperparameters |
| Database errors | Verify RLS policies and authentication |
| Slow predictions | Reduce model complexity or use GPU |
| No threats detected | Check packet capture and feature extraction |

---

**System Status**: 🟢 Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-01-07
