"""
LIME Explainability Wrapper

Provides local interpretable model-agnostic explanations using LIME.
"""

from typing import Any, Callable
import numpy as np
import torch
from lime.lime_tabular import LimeTabularExplainer
import structlog

logger = structlog.get_logger(__name__)


class LIMEExplainer:
    """
    LIME-based explainability for ML models.
    
    Provides local explanations by approximating the model
    locally with an interpretable model.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        training_data: np.ndarray,
        feature_names: list[str],
        class_names: list[str] = ['Retained', 'Dropout'],
    ):
        """
        Initialize LIME explainer.
        
        Args:
            model: Trained PyTorch model
            training_data: Training data for generating perturbations
            feature_names: List of feature names
            class_names: Class labels
        """
        self.model = model
        self.model.eval()
        self.feature_names = feature_names
        self.class_names = class_names
        
        # Create LIME explainer
        self.explainer = LimeTabularExplainer(
            training_data=training_data,
            feature_names=feature_names,
            class_names=class_names,
            mode='classification',
            verbose=False,
        )
        
        # Create predict function
        self.predict_fn = self._create_predict_function()
        
        logger.info("LIME explainer initialized", num_features=len(feature_names))
    
    def _create_predict_function(self) -> Callable:
        """Create prediction function for LIME."""
        def predict_proba(x: np.ndarray) -> np.ndarray:
            """
            Predict class probabilities.
            
            Args:
                x: Input features [n_samples, n_features]
                
            Returns:
                Class probabilities [n_samples, n_classes]
            """
            self.model.eval()
            
            with torch.no_grad():
                x_tensor = torch.FloatTensor(x)
                predictions = self.model(x_tensor).squeeze()
                
                # Convert to class probabilities
                if predictions.dim() == 0:
                    predictions = predictions.unsqueeze(0)
                
                # [P(retained), P(dropout)]
                probs = torch.stack([1 - predictions, predictions], dim=1)
                
                return probs.numpy()
        
        return predict_proba
    
    def explain_instance(
        self,
        instance: np.ndarray,
        num_features: int = 10,
        num_samples: int = 5000,
    ) -> dict[str, Any]:
        """
        Explain a single prediction using LIME.
        
        Args:
            instance: Input instance to explain
            num_features: Number of features to include in explanation
            num_samples: Number of samples for local approximation
            
        Returns:
            dict: LIME explanation with feature weights
        """
        logger.info("Generating LIME explanation", num_samples=num_samples)
        
        # Generate LIME explanation
        explanation = self.explainer.explain_instance(
            data_row=instance,
            predict_fn=self.predict_fn,
            num_features=num_features,
            num_samples=num_samples,
        )
        
        # Extract feature importance from LIME
        lime_features = explanation.as_list()
        
        # Parse and structure the explanation
        feature_importance = []
        for feature_desc, weight in lime_features:
            # Parse feature description (e.g., "GPA > 3.0")
            feature_name = feature_desc.split()[0] if ' ' in feature_desc else feature_desc
            
            feature_importance.append({
                'feature': feature_name,
                'weight': float(weight),
                'description': feature_desc,
                'impact': 'increases_dropout' if weight > 0 else 'decreases_dropout',
            })
        
        # Get prediction probabilities
        pred_probs = self.predict_fn(instance.reshape(1, -1))[0]
        
        return {
            'feature_importance': feature_importance,
            'predicted_class': self.class_names[np.argmax(pred_probs)],
            'class_probabilities': {
                self.class_names[0]: float(pred_probs[0]),
                self.class_names[1]: float(pred_probs[1]),
            },
            'explanation_method': 'LIME (Local Interpretable Model-agnostic Explanations)',
            'local_fidelity': float(explanation.score),
            'num_features_used': len(lime_features),
        }
    
    def get_text_explanation(
        self,
        instance: np.ndarray,
        prediction_proba: float,
    ) -> str:
        """
        Generate human-readable text explanation.
        
        Args:
            instance: Input instance
            prediction_proba: Predicted dropout probability
            
        Returns:
            str: Text explanation
        """
        explanation_data = self.explain_instance(instance, num_features=5)
        
        top_features = explanation_data['feature_importance'][:3]
        
        text = f"Dropout probability: {prediction_proba:.1%}. "
        text += "Main factors: "
        
        factors = []
        for feat in top_features:
            impact = "increases" if feat['impact'] == 'increases_dropout' else "decreases"
            factors.append(f"{feat['feature']} ({impact} risk)")
        
        text += ", ".join(factors) + "."
        
        return text

