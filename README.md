

This file explains, in very simple words, what this project does, the technologies used, how the pieces fit together, and step-by-step instructions to run and train the model. Follow the steps one by one.

---

## 1) What this project does (one sentence)

It captures or simulates network traffic, runs a machine learning model to detect if traffic looks like an attack, logs threats, and provides a web UI to inject test traffic and analyze CSV datasets.

## 2) Tech stack (short & simple)

- Frontend: React + TypeScript, Vite as the dev server and build tool.
- UI: Tailwind and shadcn/ui components (prebuilt React UI primitives).
- Backend services (in project): small TypeScript services to integrate with Supabase, a simulated packet capture service, and client-side logic to call the trained model metadata.
- Machine learning: Python + XGBoost. Training and preprocessing scripts are in `training.py`.
- Storage for model artifacts: saved into `public/models/` for the web app to load.
- Database (optional): Supabase integration is wired in to save detected threats.

## 3) High-level architecture (easy)

1. The Python training script (`training.py`) trains an XGBoost model using NSL-KDD data (CSV files in `data/`). It produces:
   - `xgboost_threat_model.pkl` (model)
   - `scaler.pkl` (feature scaler)
   - `label_encoders.pkl` (encoders for categorical columns)
   - `model_metadata.json` (accuracy, precision, etc.)

2. The frontend React app (src/) can:
   - Load `model_metadata.json` from `public/models/` to know the model exists.
   - Use a light-weight JS rule-based prediction (via service) or display model metadata.
   - Let you upload KDD CSVs and analyze rows in the UI (we parse and map labels to attack types).

3. When a threat is detected in the UI it can be stored using Supabase functions (if configured) and optionally send email alerts.

## 4) Important files and folders (where to look)

- `src/` — React app source code.
  - `src/components/ThreatInjection.tsx` — UI to inject a packet or upload KDD CSV and analyze.
  - `src/services/xgboostModelLoader.ts` — front-end loader that reads `public/models/model_metadata.json`.
  - `src/services/packetCapture.ts` — simulated packet capture / detection service used by UI.
- `training.py` — Python script to train the model. It expects CSV files in `data/`.
- `data/` — contains `KDDtrain.csv`, `KDDtest.csv`, and cleaned variants.
- `public/models/` — where the trained artifacts must live for the frontend to load them.

## 5) Quick setup and run (step-by-step)

Prerequisites:
- Node.js and npm installed (for the frontend)
- Python 3.8+ with pip (for training)

Steps to run the dev UI:

1. Install JS dependencies:

```powershell
cd "E:/network-watchdog-ai-main (1)/network-watchdog-ai-main"
npm install
```

2. Start the dev server (Vite):

```powershell
npm run dev
# open http://localhost:8081/ (Vite may pick 8081 if 8080 is busy)
```

3. Open the app in your browser and go to the Threat Injection page.

Steps to train the model (Python):

1. Install Python packages (run in a Python environment):

```powershell
# inside a virtualenv (recommended) or system python
pip install -r requirements.txt
# If requirements.txt doesn't exist, install these:
pip install xgboost pandas numpy scikit-learn joblib
```

2. Prepare your CSV files in `data/`.
   - The training script expects `data/KDDtrain.csv` and optionally `data/KDDtest.csv`.
   - If your cleaned file is `KDDtrain_cleaned.csv`, copy it to `data/KDDtrain.csv`.

3. Run the training script:

```powershell
python training.py
```

4. After training, files saved:
   - `public/models/xgboost_threat_model.pkl`
   - `public/models/scaler.pkl`
   - `public/models/label_encoders.pkl`
   - `model_metadata.json` (script saves a copy in project root and prints it)

Note: `training.py` contains logic to detect quoted lines and header-like rows; if you see errors about 'col_0' the script will try to drop the header row.

## 6) How to use the Threat Injection page (simple)

1. Open Threat Injection in the browser.
2. To test a single packet, fill the form fields (source/destination IP, protocol, ports, packet size, flags) and click "Inject & Analyze".
   - The UI will call a detection function that may use the trained model metadata and a local rule-based predictor.
3. To analyze a KDD CSV dataset, use the file input under the form and upload the CSV.
   - The UI will parse up to a safety cap of rows (configurable). It will try to detect the correct label column: if the last column is numeric (difficulty), it uses the second-last column as the attack label.
   - The analysis will show counts of Critical/High/Medium/Normal and a sample table.
4. You can export per-row analysis (CSV) from the UI.

## 7) Why sometimes the UI showed 'Normal' for everything

The KDD CSV format usually has `...,label,difficulty`. Earlier the parser assumed the last column is the label. That caused the parser to read a numeric difficulty (like `21`) as a label and map it to Normal. I updated the parser to use the second-last column if the last column is numeric — that fixes the wrong 'Normal' results.

If you still see everything as Normal or NaN confidence, try these checks:
- Reload the page (to ensure new frontend code is picked up).
- Re-upload the CSV file.
- Verify `public/models/model_metadata.json` exists — this tells the frontend the model is trained.

## 8) Common errors and simple fixes

- "Expression expected" overlay in the browser
  - This came from a TypeScript syntax issue in `src/services/packetCapture.ts`. I fixed duplicate declarations and stray braces. If you see it again, open the browser overlay and note the file/line to fix.

- Training script error: `ValueError: could not convert string to float: 'col_0'`
  - Your CSV had a header row embedded in quoted content; I added logic to `training.py` to drop header-like first rows after splitting. If your CSV has different headers, open the file and remove any leading header row.

- CSV parser shows NaN confidence for model predictions
  - The UI tries to extract a few feature columns heuristically to call `xgboostModel.predictThreatLevel`. If your CSV layout is different, supply a sample row and I can adjust the parser to map exact columns.

## 9) Where to change behavior (if you want to customize)

- To change which features the model uses or how the training works: edit `training.py`.
- To change mapping from KDD labels to attack types or severity rules: edit `src/components/ThreatInjection.tsx` (there are sets and regex patterns near the top of the file).
- To change the simulated packet capture behavior: edit `src/services/packetCapture.ts`.

## 10) Next improvements (ideas you can ask me to add)

- Add a server-side scoring endpoint to run model predictions on large CSVs without client CPU limits.
- Improve the feature extractor in the UI to use exact columns (no heuristics), so model predictions never fail.
- Add unit tests for the CSV parser and for the model-loader interfaces.
- Improve the model (hyperparameter tuning or class weighting) to increase recall.

---

If you want, I can now:
- Walk you through a short demo (I’ll upload your `KDDtest.csv` and paste the analysis result), or
- Add a server endpoint that runs per-row scoring using the saved `xgboost_threat_model.pkl` (recommended for big datasets), or
- Tweak how severity is derived from model confidence.

Tell me which of these you want next and I’ll implement it step-by-step.

---

Simple contact: open `src/components/ThreatInjection.tsx` and `training.py` if you want to change mappings or training details.

Good luck — you can run the steps above and tell me any error messages and I’ll fix them with exact edits.
