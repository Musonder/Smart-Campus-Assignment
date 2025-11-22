@echo off
echo =============================================
echo   ARGOS - Installing All Dependencies
echo =============================================
echo.

echo [1/3] Installing ML packages (PyTorch Lightning, Stable-Baselines3)...
echo.
pip install pytorch-lightning stable-baselines3
echo.

echo [2/3] Installing explainability packages (LIME, SHAP)...
echo.
pip install gym lime shap
echo.

echo [3/3] Installing OR-Tools (Scheduler - optional for Python 3.14)...
echo.
pip install ortools 2>nul || echo   OR-Tools not available for Python 3.14 - Scheduler service will use fallback
echo.

echo Verifying core installations...
echo.
python -c "import pytorch_lightning; import stable_baselines3; import gym; import lime; import shap; print('✓ All core packages installed successfully!')"
echo.

echo =============================================
echo   Installation Complete!
echo =============================================
echo.
echo You can now run START_ALL.bat to start the application.
echo.
pause

