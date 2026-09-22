# Real-Time Cybersecurity Threat Detection

A full-stack cybersecurity monitoring and threat detection application that combines real-time network monitoring, machine-learning-based threat classification, security event visualization, and Supabase authentication into a single web dashboard.

The project demonstrates how machine learning can be integrated into a modern cybersecurity monitoring workflow to identify and analyze potentially malicious network activity.

![React](https://img.shields.io/badge/React-TypeScript-blue)
![Vite](https://img.shields.io/badge/Vite-Frontend-purple)
![Supabase](https://img.shields.io/badge/Supabase-Authentication-green)
![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange)
![ESLint](https://img.shields.io/badge/Code%20Quality-ESLint-4B32C3)

---

## Overview

Real-Time Cybersecurity Threat Detection provides a web-based security dashboard for monitoring network activity and identifying potential cyber threats.

The application combines:

- Real-time network traffic monitoring
- Machine-learning-based threat detection
- XGBoost classification
- NSL-KDD dataset processing
- Threat injection and testing
- Security log exploration
- Network packet analysis
- Interactive dashboards and charts
- Supabase authentication
- Model performance monitoring
- CSV data export

The goal is to provide a practical demonstration of an ML-assisted Security Operations Center (SOC)-style monitoring interface.

---

## Key Features

### Threat Detection

The application uses an XGBoost machine-learning model to classify network activity and identify potential threats.

Current model metrics:

| Metric | Result |
|---|---:|
| Accuracy | 80.57% |
| Precision | 96.85% |
| Recall | 68.08% |
| F1 Score | 79.96% |

> These metrics are based on the currently bundled model and should not be interpreted as production-grade security performance.

---

### Real-Time Network Monitoring

Monitor simulated or application-generated network traffic and observe security-related events through the dashboard.

Features include:

- Network traffic visualization
- Packet monitoring
- Throughput information
- Threat activity monitoring
- Real-time dashboard updates
- Monitoring controls

---

### Machine Learning

The project integrates an XGBoost threat classification model with the frontend application.

Model-related functionality includes:

- Model loading
- Feature preprocessing
- Feature scaling
- Threat prediction
- Prediction confidence
- Model metadata
- Attack-pattern analysis

The application includes the required model artifacts under:

```text
public/models/
├── label_encoders.pkl
├── model_metadata.json
├── scaler.pkl
└── xgboost_threat_model.pkl

### NSL-KDD Dataset Processing

The project includes functionality for working with the NSL-KDD intrusion-detection dataset.

The processing workflow is:

CSV Dataset
    ↓
Data Parsing
    ↓
Feature Processing
    ↓
Encoding / Scaling
    ↓
Model Input
    ↓
Threat Classification
    ↓
Dashboard Visualization

Large raw dataset files are intentionally excluded from GitHub through .gitignore.

### Packet Analysis

The packet analysis interface provides a way to inspect network packet information and analyze suspicious activity.

The application can display information such as:

Source IP
Destination IP
Protocol
Ports
Packet characteristics
Threat classification
Confidence information

### Security Dashboard

The dashboard provides an interactive view of security activity.

It includes visualizations for:

Network traffic
Threat distribution
Threat trends
Model metrics
Security events
Monitoring statistics

### Logs Explorer

The Logs Explorer provides an interface for reviewing security-related events and threat logs.

It supports:

Log browsing
Threat details
Event information
Security event analysis

### Threat Injection

A dedicated threat-injection interface is included for testing the detection workflow.

This allows simulated threat data to be introduced into the application so that the monitoring and classification workflow can be demonstrated without relying entirely on live network traffic.

### Authentication

User authentication is implemented using Supabase.

The application supports:

User registration
Email confirmation
Login
Session persistence
Logout
Protected application access

Supabase credentials are loaded through environment variables and are not committed to the repository.

## Technology Stack

Frontend
React
TypeScript
Vite
React Router
Tailwind CSS
shadcn/ui
Radix UI
Recharts

### Machine Learning
XGBoost
NSL-KDD dataset
Feature encoding
Feature scaling
Model serialization

### Backend and Services
Supabase
Supabase Authentication
Supabase Edge Functions

### Development Tools
Node.js
npm
ESLint
Git
GitHub

## Architecture

High-level application architecture:

                    ┌──────────────────────┐
                    │      React App       │
                    │   TypeScript + Vite  │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │  Dashboard  │   │   Network   │   │    Logs     │
      │             │   │  Monitoring │   │   Explorer   │
      └─────────────┘   └──────┬──────┘   └─────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │ ML Threat Model  │
                     │     XGBoost      │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Threat Prediction│
                     │ + Confidence     │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Security Events  │
                     │ & Visualization  │
                     └──────────────────┘

                       ┌───────────────┐
                       │   Supabase    │
                       │ Authentication│
                       └───────────────┘
## Project Structure
real-time-cybersecurity-threat-detection/
│
├── public/
│   └── models/
│       ├── label_encoders.pkl
│       ├── model_metadata.json
│       ├── scaler.pkl
│       └── xgboost_threat_model.pkl
│
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── EnhancedDashboard.tsx
│   │   ├── NetworkMonitor.tsx
│   │   ├── PacketAnalyzer.tsx
│   │   ├── RealTimeMonitor.tsx
│   │   ├── ThreatDetection.tsx
│   │   ├── ThreatInjection.tsx
│   │   ├── LogsExplorer.tsx
│   │   └── ...
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── MonitoringContext.tsx
│   │
│   ├── hooks/
│   │   └── useSound.ts
│   │
│   ├── integrations/
│   │   └── supabase/
│   │
│   ├── pages/
│   │   └── Auth.tsx
│   │
│   ├── services/
│   │   ├── mlService.ts
│   │   ├── newPacketCapture.ts
│   │   ├── nslKddProcessor.ts
│   │   ├── packetCapture.ts
│   │   └── xgboostModelLoader.ts
│   │
│   └── utils/
│       └── export.ts
│
├── supabase/
│   └── functions/
│       └── send-threat-alert/
│
├── data/
│   └── ...
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md

## Getting Started
Prerequisites

Make sure you have the following installed:

Node.js 18 or later
npm
Git

Check your versions:

node --version
npm --version
git --version

### Installation

Clone the repository:

git clone https://github.com/Yashodha-kapali8/real-time-cybersecurity-threat-detection.git

Navigate into the project:

cd real-time-cybersecurity-threat-detection

Install dependencies:

npm install

### Environment Variables

Create a local environment file:

.env

Use .env.example as the template.

Example:

VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
Important

Never commit .env to GitHub.

The project is configured to ignore environment files containing local credentials.

### Run the Application

Start the development server:

npm run dev

Vite will display the local URL in the terminal, typically:

http://localhost:8080

If that port is already in use, Vite will automatically select another available port.

### Production Build

Create a production build:

npm run build

Preview the production build:

npm run preview

### Code Quality

Run ESLint:

npm run lint

The project currently passes ESLint with:

0 errors
0 warnings

### Machine Learning Model

The application uses an XGBoost-based threat classification model trained for network intrusion detection.

Model artifacts included in the project:

public/models/
├── xgboost_threat_model.pkl
├── scaler.pkl
├── label_encoders.pkl
└── model_metadata.json

The application loads these artifacts and uses processed network features to generate threat predictions.

### Current Model Metrics
Accuracy:  80.57%
Precision: 96.85%
Recall:    68.08%
F1 Score:  79.96%

Training metadata currently associated with the model:

Training Date:
2025-10-14T12:27:08.562138
### Dataset

The project uses the NSL-KDD intrusion-detection dataset for network-security experimentation and model processing.

The large CSV dataset files are intentionally excluded from the Git repository to keep the repository lightweight.

The .gitignore includes:

data/*.csv

If you need the dataset for model training or experimentation, obtain it separately and place the required files inside:

data/
## Security Considerations

This project is intended primarily for educational, research, demonstration, and cybersecurity experimentation.

It should not be considered a complete production SOC or intrusion-prevention system.

Important considerations include:

ML predictions can produce false positives and false negatives.
Model performance depends on the training and evaluation data.
Network traffic simulation does not represent every real-world environment.
Authentication credentials must remain outside source control.
Production deployments should use secure secret management.
Additional validation and monitoring should be implemented before using similar systems in production.

## Git and Sensitive Files

The repository intentionally excludes sensitive and unnecessary files such as:

.env
.env.local
.venv/
data/*.csv

The trained model artifacts required by the application are included under:

public/models/

## Future Improvements

Potential future development areas include:

Live packet capture using a dedicated network capture service
More advanced intrusion-detection models
Model retraining pipelines
Explainable AI for threat predictions
Additional cybersecurity datasets
Role-based access control
Advanced alerting
Email and notification workflows
SIEM integration
Docker deployment
Cloud deployment
Model performance monitoring
Threat-intelligence integration
Automated security incident workflows

## Disclaimer

This project is developed for educational and research purposes.

The threat-detection results are generated by a machine-learning model and should not be treated as definitive security judgments. Always validate security alerts using appropriate security tools, logs, network telemetry, and human analysis.

## Author

**Yashodha Kapali**
