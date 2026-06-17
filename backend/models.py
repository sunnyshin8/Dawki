import lightgbm as lgb

severity_clf = lgb.Booster(
    model_file="outputs/severity_clf_model.txt"
)

severity_reg = lgb.Booster(
    model_file="outputs/severity_reg_model.txt"
)

risk_model = lgb.Booster(
    model_file="outputs/risk_model.txt"
)