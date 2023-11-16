```python
import os
import logging
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch

# Configure logging to provide informative output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Configuration ---
# Use environment variables to configure the model, allowing for flexibility
# in different environments (e.g., 't5-small' for dev, 't5-base' for prod).
DEFAULT_MODEL = "t5-small"
MODEL_NAME = os.getenv("SUMMARIZATION_MODEL", DEFAULT_MODEL)

# Determine the device to run the model on (GPU if available, otherwise CPU)
# This is crucial for performance in a production environment.
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {DEVICE}")


class SummarizationService:
    """
    A service class for text summarization using a pre-trained T5 model.

    This class encapsulates the logic for loading the model and tokenizer,
    and performing the summarization task. It loads the model upon instantiation
    to ensure it's ready for requests and to fail fast if the model can't be loaded.
    """

    def __init__(self, model_name: str):
        """
        Initializes the SummarizationService and loads the ML model.

        Args:
            model_name (str): The name of the pre-trained model to use from
                              the Hugging Face Hub (e.g., 't5-small').
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        """
        Loads the T5 model and tokenizer from Hugging Face.
        This method is called during initialization to ensure the model is
        loaded and ready before the service starts accepting requests.
        """
        logger.info(f"Loading summarization model: {self.model_name}...")
        try:
            # Load the tokenizer and model from the specified pretrained model
            self.tokenizer = T5Tokenizer.from_pretrained(self.model_name)
            self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)

            # Move the model to the selected device (GPU/CPU)
            self.model.to(DEVICE)

            # Set the model to evaluation mode, which disables dropout and other
            # training-specific layers. This is essential for inference.
            self.model.eval()
            logger.info(f"Model '{self.model_name}' loaded successfully on {DEVICE}.")
        except Exception as e:
            logger.error(f"Failed to load model '{self.model_name}': {e}", exc_info=True)
            # This is a critical failure. The service cannot function without the model.
            raise RuntimeError(f"Could not load summarization model: {self.model_name}") from e

    def summarize(self, text: str, min_length: int = 30, max_length: int = 150) -> str:
        """
        Generates a summary for the given text.

        Args:
            text (str): The input text to be summarized.
            min_length (int): The minimum length of the generated summary in tokens.
            max_length (int): The maximum length of the generated summary in tokens.

        Returns:
            str: The generated summary.

        Raises:
            ValueError: If the input text is empty or not a string.
            RuntimeError: If the summarization process fails for any reason.
        """
        if not text or not isinstance(text, str):
            logger.warning("Summarization called with invalid input.")
            raise ValueError("Input text must be a non-empty string.")

        if self.model is None or self.tokenizer is None:
            # This is a safeguard. In practice, the constructor would have failed.
            logger.error("Summarization attempted but model is not loaded.")
            raise RuntimeError("Summarization model is not available.")

        try:
            # T5 models are conditioned on a prefix for different tasks.
            # For summarization, the standard prefix is "summarize: ".
            prefixed_text = f"summarize: {text}"

            # Tokenize the input text, ensuring it's truncated to the model's max length.
            # The tensors are moved to the same device as the model.
            inputs = self.tokenizer.encode(
                prefixed_text,
                return_tensors="pt",
                max_length=512,  # Standard max sequence length for T5
                truncation=True
            ).to(DEVICE)

            # Perform inference within a torch.no_grad() context to disable gradient
            # calculations, which saves memory and speeds up computation.
            with torch.no_grad():
                summary_ids = self.model.generate(
                    inputs,
                    max_length=max_length,
                    min_length=min_length,
                    length_penalty=2.0,  # Encourages model to not generate sequences that are too short.
                    num_beams=4,         # Beam search for higher quality output.
                    early_stopping=True  # Stop generation when all beams finish.
                )

            # Decode the generated token IDs back to a human-readable string.
            # skip_special_tokens=True removes tokens like <pad>, </s>, etc.
            summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)

            logger.info(f"Successfully generated summary for text of length {len(text)}.")
            return summary

        except Exception as e:
            logger.error(f"An error occurred during summarization: {e}", exc_info=True)
            # Re-raise as a generic RuntimeError to avoid leaking implementation details.
            raise RuntimeError("Failed to generate summary due to an internal error.") from e


# --- Singleton Instance ---
# Create a single, module-level instance of the service.
# This ensures that the expensive model loading process happens only once when the
# application starts, making the service efficient. The Flask/FastAPI app will
# import and use this instance.
try:
    summarization_service = SummarizationService(model_name=MODEL_NAME)
except RuntimeError as e:
    logger.critical(f"Could not initialize SummarizationService: {e}. The application may not function correctly.")
    # Set to None so that any attempt to use it will fail clearly.
    summarization_service = None
```