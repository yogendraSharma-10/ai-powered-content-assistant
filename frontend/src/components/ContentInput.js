```javascript
import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * A component for users to input text content for AI processing.
 * It includes a textarea and a submit button, with validation and loading states.
 *
 * @param {object} props - The component props.
 * @param {function} props.onSummarize - Callback function to execute when the form is submitted. It receives the input text as an argument.
 * @param {boolean} props.isLoading - Flag to indicate if an AI process is currently running, used to disable the form.
 */
const ContentInput = ({ onSummarize, isLoading }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // Define a minimum character count for a meaningful summary
  const MIN_TEXT_LENGTH = 50;

  /**
   * Handles changes in the textarea, updating the component's state.
   * @param {React.ChangeEvent<HTMLTextAreaElement>} event - The change event from the textarea.
   */
  const handleTextChange = (event) => {
    const newText = event.target.value;
    setText(newText);
    // Clear error message as user starts typing or corrects the input
    if (error && newText.trim().length >= MIN_TEXT_LENGTH) {
      setError('');
    }
  };

  /**
   * Handles the form submission.
   * Validates the input text and calls the onSummarize prop if valid.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError('Please enter some text to summarize.');
      return;
    }

    if (trimmedText.length < MIN_TEXT_LENGTH) {
      setError(`Please enter at least ${MIN_TEXT_LENGTH} characters for a better summary.`);
      return;
    }

    // Clear any previous errors and call the parent handler
    setError('');
    onSummarize(trimmedText);
  };

  return (
    <div className="content-input-container">
      <h2 className="content-input-title">Enter Your Content</h2>
      <p className="content-input-description">
        Paste your article, report, or any text below to get a concise summary.
      </p>
      <form onSubmit={handleSubmit} className="content-input-form" noValidate>
        <div className="textarea-wrapper">
          <label htmlFor="content-textarea" className="sr-only">
            Content to be summarized
          </label>
          <textarea
            id="content-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Paste your text here..."
            className={`content-textarea ${error ? 'is-invalid' : ''}`}
            rows="15"
            disabled={isLoading}
            aria-invalid={!!error}
            aria-describedby="content-error"
            required
          />
        </div>
        {error && (
          <p id="content-error" className="error-message" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="submit-button"
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? 'Summarizing...' : 'Summarize Text'}
        </button>
      </form>
    </div>
  );
};

// Prop-types validation for production-ready code
ContentInput.propTypes = {
  /**
   * Function to be called when the user submits the text.
   * It receives the text content as its only argument.
   */
  onSummarize: PropTypes.func.isRequired,
  /**
   * A boolean flag indicating whether the summarization process is in progress.
   * Used to disable the form controls and show a loading state.
   */
  isLoading: PropTypes.bool.isRequired,
};

export default ContentInput;
```