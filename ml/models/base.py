"""
Base ML Model Abstract Class

Defines common interface for all ML models with train(), predict(), and explain() methods.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from pathlib import Path

import torch
import structlog

logger = structlog.get_logger(__name__)


class BaseMLModel(ABC):
    """
    Abstract base class for all ML models.
    
    Provides common interface for training, prediction, and explainability.
    All ML models in Argos inherit from this class.
    """

    def __init__(self, model_name: str, version: str = "1.0.0"):
        """
        Initialize ML model.
        
        Args:
            model_name: Model identifier
            version: Model version
        """
        self.model_name = model_name
        self.version = version
        self.model: Optional[Any] = None
        self.is_trained = False

    @abstractmethod
    async def train(self, training_data: Any, validation_data: Optional[Any] = None, **kwargs) -> dict[str, Any]:
        """
        Train the model on provided data.
        
        Args:
            training_data: Training dataset
            validation_data: Validation dataset (optional)
            **kwargs: Additional training parameters
            
        Returns:
            dict: Training metrics and results
        """
        pass

    @abstractmethod
    async def predict(self, input_data: Any) -> Any:
        """
        Make predictions on input data.
        
        Args:
            input_data: Input features
            
        Returns:
            Model predictions
        """
        pass

    @abstractmethod
    async def explain(self, input_data: Any, prediction: Any) -> dict[str, Any]:
        """
        Explain a prediction (explainable AI).
        
        Provides feature importance, attention weights, or other
        interpretability information for the prediction.
        
        Args:
            input_data: Input that was predicted
            prediction: Model's prediction
            
        Returns:
            dict: Explanation data (feature importance, visualizations, etc.)
        """
        pass

    async def save(self, path: Path) -> None:
        """
        Save model to disk.
        
        Args:
            path: Path to save model
        """
        if self.model is None:
            raise ValueError("No model to save")

        path.parent.mkdir(parents=True, exist_ok=True)

        # Save PyTorch model
        if isinstance(self.model, torch.nn.Module):
            torch.save({
                'model_state_dict': self.model.state_dict(),
                'model_name': self.model_name,
                'version': self.version,
                'is_trained': self.is_trained,
            }, path)

            logger.info("Model saved", model_name=self.model_name, path=str(path))

    async def load(self, path: Path) -> None:
        """
        Load model from disk.
        
        Args:
            path: Path to saved model
        """
        if not path.exists():
            raise FileNotFoundError(f"Model file not found: {path}")

        # Load PyTorch model
        checkpoint = torch.load(path)

        if self.model is not None and isinstance(self.model, torch.nn.Module):
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.is_trained = checkpoint.get('is_trained', True)

            logger.info("Model loaded", model_name=self.model_name, path=str(path))

    def set_deterministic(self, seed: int = 42) -> None:
        """
        Set deterministic behavior for reproducible results (testing).
        
        Args:
            seed: Random seed
        """
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)

        logger.info("Deterministic mode enabled", seed=seed)

