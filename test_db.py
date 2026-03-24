import json
with open('test_backup.json') as f:
    print(list(json.load(f).keys()))
