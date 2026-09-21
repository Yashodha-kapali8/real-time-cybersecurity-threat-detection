import pandas as pd

# Read the CSV file with proper path escaping
df = pd.read_csv(r"E:\network-watchdog-ai-main (1)\network-watchdog-ai-main\data\KDDtest_cleaned.csv")

# Display CSV features and statistics
print("Dataset shape:", df.shape)
print("\nColumn names:")
print(df.columns.tolist())
print("\nFirst few rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)
print("\nStatistical summary:")
print(df.describe())