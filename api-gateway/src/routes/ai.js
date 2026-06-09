/**
 * @fileoverview AI Service routes for the API Gateway.
 *
 * This file defines the Express router for all endpoints related to the AI service.
 * It acts as a proxy, validating incoming requests from the client and forwarding
 * them to the downstream Python AI microservice. This decouples the frontend from
 * the AI backend, allowing for independent scaling, updates, and security policies.
 *
 * @requires express - The Express framework for creating the router.
 * @requires axios - A promise-based HTTP client for making requests to the AI service.
 * @requires express-validator - Middleware for request body validation.
 */

const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// The base URL for the downstream AI service.
// This should be configured in environment variables for production.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:5000';

/**
 * A helper function to create a standardized error response.
 * @param {object} error - The error object, typically from an Axios catch block.
 * @param {object} res - The Express response object.
 * @param {string} serviceName - The name of the service that was called (e.g., "Summarization").
 */
const handleAxiosError = (error, res, serviceName) => {
  console.error(`Error calling ${serviceName} service:`, error.message);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx.
    return res.status(error.response.status).json({
      message: `Error from ${serviceName} service.`,
      details: error.response.data,
    });
  } else if (error.request) {
    // The request was made but no response was received.
    // This usually means the service is down or unreachable.
    return res.status(503).json({
      message: `${serviceName} service is unavailable. Please try again later.`,
    });
  } else {
    // Something happened in setting up the request that triggered an Error.
    return res.status(500).json({
      message: 'An unexpected error occurred in the API Gateway.',
    });
  }
};

/**
 * @route   POST /api/ai/summarize
 * @desc    Receives text from the client, forwards it to the AI service for
 *          summarization, and returns the summary.
 * @access  Public
 * @body    { text: string, minLength?: number, maxLength?: number }
 */
router.post(
  '/summarize',
  [
    body('text', 'Text is required and must be a non-empty string.').isString().notEmpty().trim(),
    body('minLength', 'minLength must be a positive integer.').optional().isInt({ min: 10 }),
    body('maxLength', 'maxLength must be an integer greater than minLength.').optional().isInt({ min: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { text, minLength, maxLength } = req.body;

      // Prepare the payload for the Python service (snake_case)
      const payload = {
        text,
        min_length: minLength,
        max_length: maxLength,
      };

      console.log(`Forwarding summarization request to: ${AI_SERVICE_URL}/summarize`);

      const aiServiceResponse = await axios.post(`${AI_SERVICE_URL}/summarize`, payload, {
        timeout: 15000, // 15-second timeout for AI processing
      });

      res.status(200).json(aiServiceResponse.data);
    } catch (error) {
      handleAxiosError(error, res, 'Summarization');
    }
  }
);

/**
 * @route   POST /api/ai/keywords
 * @desc    Receives text from the client, forwards it to the AI service for
 *          keyword extraction, and returns the keywords.
 * @access  Public
 * @body    { text: string, top_n?: number }
 */
router.post(
  '/keywords',
  [
    body('text', 'Text is required and must be a non-empty string.').isString().notEmpty().trim(),
    body('top_n', 'top_n must be a positive integer.').optional().isInt({ min: 1, max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { text, top_n } = req.body;

      console.log(`Forwarding keyword extraction request to: ${AI_SERVICE_URL}/keywords`);

      const aiServiceResponse = await axios.post(`${AI_SERVICE_URL}/keywords`, { text, top_n }, {
        timeout: 10000, // 10-second timeout
      });

      res.status(200).json(aiServiceResponse.data);
    } catch (error) {
      handleAxiosError(error, res, 'Keyword Extraction');
    }
  }
);

module.exports = router;