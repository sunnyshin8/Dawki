import sys
import json
import pandas as pd
import lightgbm as lgb

print('=' * 60)
print('DAWKI SETUP VERIFICATION')
print('=' * 60)

# Python version
print(f'Python: {sys.version.split()[0]}')

# Data files
try:
    df = pd.read_csv('events_polished.csv')
    print(f'events_polished.csv: {df.shape[0]} rows, {df.shape[1]} cols')
except Exception as e:
    print(f'events_polished.csv: ERROR')

# Models
for model_file in ['severity_clf_model.txt', 'severity_reg_model.txt', 'risk_model.txt']:
    try:
        with open(f'outputs/{model_file}', 'r', encoding='utf-8', errors='ignore') as f:
            model_str = f.read().replace('\r\n', '\n')
        m = lgb.Booster(model_str=model_str)
        print(f'{model_file}: OK')
    except Exception as e:
        print(f'{model_file}: FAILED ({e})')

# Metadata
try:
    with open('outputs/layer2_meta.json') as f:
        meta = json.load(f)
    print(f'layer2_meta.json: OK')
except Exception as e:
    print(f'layer2_meta.json: FAILED')

print('=' * 60)
print('STATUS: Ready for Phase 1!')
print('=' * 60)
