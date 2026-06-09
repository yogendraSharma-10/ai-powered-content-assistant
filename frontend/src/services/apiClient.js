```javascript
import axios from 'axios';

/**
 * ============================================================================
 * API Client Configuration
 * ============================================================================
 *
 * This section configures a reusable Axios instance for making API requests.
 * Using a centralized instance is a best practice that allows us to easily
 * manage base URLs, headers, and timeouts across the entire application.
 */

// Determine the base URL for the API gateway.
// It uses a React environment variable (REACT_APP_API_GATEWAY_URL) for flexibility
// across different environments (development, staging, production).
// It falls back to a default localhost URL for local development.
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Set a reasonable timeout (15 seconds) for API requests.
  // This prevents the application from hanging indefinitely on a slow request.
  timeout: 15000,
});

/**
 * ============================================================================
 * Centralized Error Handler
 * ============================================================================
 *
 * This function processes errors from Axios requests to provide consistent,
 * user-friendly error messages. It differentiates between server response
 * errors, network errors, and request setup errors.
 *
 * @param {Error} error - The error object caught from an Axios request.
 * @returns {string} A user-friendly error message.
 */
const handleError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls outside the range of 2xx.
    console.error('API Error Response:', error.response.data);
    // Prefer the server-provided error message if it exists.
    return error.response.data.message || `Request failed with status code ${error.response.status}`;
  } else if (error.request) {
    // The request was made but no response was received. This typically
    // indicates a network issue or that the server is down.
    console.error('API No Response:', error.request);
    return 'The server is not responding. Please check your network connection and try again.';
  } else {
    // Something happened in setting up the request that triggered an Error.
    console.error('API Request Setup Error:', error.message);
    return 'An unexpected error occurred while sending the request.';
  }
};

/**
 * ============================================================================
 * API Service Functions
 * ============================================================================
 *
 * These async functions encapsulate the logic for specific API endpoints.
 * They use the configured `apiClient` and the `handleError` utility to
 * provide a clean and robust interface for the rest of the application.
 */

/**
 * Sends text to the AI service for summarization.
 *
 * @param {string} text - The text content to be summarized.
 * @param {object} [options={}] - Optional parameters for the summarization model
 *   (e.g., { min_length: 50, max_length: 150 }).
 * @returns {Promise<object>} A promise that resolves to the API response data,
 *   which is expected to contain the summary (e.g., { summary: '...' }).
 * @throws {Error} Throws an error with a user-friendly message if the request fails.
 */
export const summarizeText = async (text, options = {}) => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Input text cannot be empty.');
  }

  try {
    const response = await apiClient.post('/ai/summarize', { text, ...options });
    return response.data;
  } catch (error) {
    throw new Error(handleError(error));
  }
};

/**
 * Sends text to the AI service for keyword extraction.
 *
 * @param {string} text - The text content from which to extract keywords.
 * @param {object} [options={}] - Optional parameters for the keyword extraction model
 *   (e.g., { top_n: 5 }).
 * @returns {Promise<object>} A promise that resolves to the API response data,
 *   which is expected to contain the keywords (e.g., { keywords: ['ai', 'content'] }).
 * @throws {Error} Throws an error with a user-friendly message if the request fails.
 */
export const extractKeywords = async (text, options = {}) => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('Input text cannot be empty.');
  }

  try {
    const response = await apiClient.post('/ai/keywords', { text, ...options });
    return response.data;
  } catch (error) {
    throw new Error(handleError(error));
  }
};
```