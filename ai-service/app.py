```python
# ai-service/app.py

# --- Standard Library Imports ---
import os
import logging
from logging.config import dictConfig

# --- Third-Party Imports ---
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.exceptions import BadRequest, InternalServerError, NotFound

# --- Application-Specific Imports ---
from services.summarization_service import summarize_text, SummarizationError

# --- Initial Configuration ---
# Load environment variables from a .env file for local development
load_dotenv()

# --- Advanced Logging Configuration ---
# In production, it's better to use a dictionary-based configuration for logging
# to control formatters, handlers (e.g., console, file), and log levels precisely.
dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': os.getenv('LOG_LEVEL', 'INFO').upper(),
        'handlers': ['wsgi']
    }
})

# --- Flask App Initialization ---
app = Flask(__name__)
logger = app.logger

# --- CORS (Cross-Origin Resource Sharing) Configuration ---
# This is essential for a microservices architecture where the API gateway
# (or frontend during development) is on a different origin.
# For production, restrict this to the specific origin of your API gateway.
CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGIN", "*")}})
logger.info("CORS configured for origins: %s", os.getenv("CORS_ORIGIN", "*"))


# --- Global Error Handlers ---
# These handlers ensure that the API returns consistent JSON-formatted errors.

@app.errorhandler(BadRequest)
def handle_bad_request(e):
    """Handles 400 Bad Request errors, typically for malformed requests or validation failures."""
    logger.warning("Bad Request: %s", e.description)
    return jsonify(error=e.description, status_code=400), 400

@app.errorhandler(NotFound)
def handle_not_found(e):
    """Handles 404 Not Found errors for requests to non-existent endpoints."""
    logger.warning("Resource not found at path: %s", request.path)
    return jsonify(error="The requested resource was not found.", status_code=404), 404

@app.errorhandler(InternalServerError)
def handle_internal_server_error(e):
    """Handles 500 Internal Server Error, catching unexpected exceptions."""
    # The original exception is available as e.original_exception
    logger.error("Internal Server Error: %s", e.original_exception or e, exc_info=True)
    return jsonify(error="An unexpected internal error occurred. Please try again later.", status_code=500), 500

@app.errorhandler(Exception)
def handle_generic_exception(e):
    """A fallback handler for any unhandled exceptions."""
    logger.error("Unhandled exception: %s", e, exc_info=True)
    return jsonify(error="An unexpected error occurred.", status_code=500), 500


# --- API Routes ---

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    Crucial for container orchestration systems (like Docker, Kubernetes) to verify
    that the service is running and healthy.
    """
    logger.debug("Health check endpoint was triggered.")
    return jsonify({"status": "healthy", "service": "ai-service"}), 200


@app.route('/api/v1/summarize', methods=['POST'])
def summarize_endpoint():
    """
    API endpoint to perform text summarization.
    It expects a JSON payload with a "text" key and optional "min_length"
    and "max_length" parameters.
    """
    logger.info("Received request for summarization.")

    # 1. Input Validation
    if not request.is_json:
        raise BadRequest("Invalid content type: payload must be application/json.")

    data = request.get_json()
    if not data:
        raise BadRequest("Invalid JSON: no data received.")

    text_to_summarize = data.get('text')
    min_length = data.get('min_length', 30)
    max_length = data.get('max_length', 150)

    if not text_to_summarize or not isinstance(text_to_summarize, str) or not text_to_summarize.strip():
        raise BadRequest("Missing or invalid 'text' field in request body. It must be a non-empty string.")

    try:
        min_length = int(min_length)
        max_length = int(max_length)
        if not (0 < min_length < max_length):
            raise ValueError()
    except (ValueError, TypeError):
        raise BadRequest("Invalid 'min_length' or 'max_length' parameters. They must be integers with min_length < max_length.")

    logger.info(f"Processing summarization for text of length {len(text_to_summarize)} characters.")

    # 2. Call the Business Logic (Service Layer)
    try:
        summary = summarize_text(
            text=text_to_summarize,
            min_length=min_length,
            max_length=max_length
        )
        logger.info("Successfully generated summary.")

        # 3. Format and Return the Response
        response_data = {
            "original_text_length": len(text_to_summarize),
            "summary": summary,
            "summary_length": len(summary)
        }
        return jsonify(response_data), 200

    except SummarizationError as e:
        # Handle specific, known errors from the summarization service
        logger.error("A summarization service error occurred: %s", e)
        # This is an internal error because the service itself failed, not the user's request.
        raise InternalServerError(f"Failed to generate summary due to a model error: {e}")
    except Exception as e:
        # Catch any other unexpected errors from the service layer
        logger.error("An unexpected exception occurred during summarization: %s", e, exc_info=True)
        raise InternalServerError("An unexpected error occurred while processing the text.")


# --- Main Execution Block ---
if __name__ == '__main__':
    # Get host, port, and debug mode from environment variables with sensible defaults.
    # Gunicorn is the recommended server for production, not the Flask dev server.
    # This block is primarily for local development.
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5001))
    debug_mode = os.getenv('FLASK_ENV', 'production') == 'development'

    logger.info(f"Starting AI Service in {'DEBUG' if debug_mode else 'PRODUCTION'} mode.")
    logger.info(f"Service will be available at http://{host}:{port}")

    # Note: In a production setup using Gunicorn/uWSGI, this app.run() command is not used.
    # The WSGI server will import the 'app' object from this file.
    app.run(host=host, port=port, debug=debug_mode)
```