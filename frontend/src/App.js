```javascript
import React, { useState, useCallback } from 'react';
import './App.css';
import ContentInput from './components/ContentInput';
import ResultDisplay from './components/ResultDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { summarizeText } from './services/apiClient';

/**
 * The main application component.
 * It orchestrates the state and interactions between the user input,
 * API calls, and the display of results.
 *
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  // State to manage the loading status of API requests.
  const [isLoading, setIsLoading] = useState(false);

  // State to store any error messages from the API or client-side validation.
  const [error, setError] = useState(null);

  // State to store the summarized text result from the AI service.
  const [summary, setSummary] = useState('');

  /**
   * Handles the text summarization request.
   * This function is passed as a prop to the ContentInput component.
   * It uses `useCallback` to memoize the function, preventing unnecessary
   * re-renders of child components.
   *
   * @param {string} text - The text content to be summarized.
   */
  const handleSummarize = useCallback(async (text) => {
    // 1. Reset state before making a new request
    setIsLoading(true);
    setError(null);
    setSummary('');

    try {
      // 2. Basic client-side validation
      if (!text || !text.trim()) {
        throw new Error('Input text cannot be empty.');
      }

      // 3. Call the API client to send the request
      const result = await summarizeText(text);

      // 4. Process the successful response
      if (result && result.summary) {
        setSummary(result.summary);
      } else {
        // Handle cases where the API response is successful but lacks the expected data
        throw new Error('Received an invalid response from the server.');
      }
    } catch (err) {
      // 5. Handle errors from validation or the API call
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      console.error('Summarization failed:', err);
    } finally {
      // 6. Ensure loading state is turned off regardless of outcome
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures the function is created only once.

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI-Powered Content Assistant</h1>
        <p>Instantly summarize your articles, papers, or documents.</p>
      </header>

      <main className="App-main">
        <div className="content-wrapper">
          <ContentInput onSummarize={handleSummarize} isLoading={isLoading} />

          <div className="results-section">
            {/* Conditional rendering based on the application's state */}
            {isLoading && <LoadingSpinner />}

            {error && (
              <div className="error-message" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            {summary && !isLoading && !error && (
              <ResultDisplay title="Generated Summary" content={summary} />
            )}
          </div>
        </div>
      </main>

      <footer className="App-footer">
        <p>&copy; {new Date().getFullYear()} AI Content Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
```