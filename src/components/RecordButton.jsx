export function RecordButton({ isRecording, isProcessing, onClick, disabled }) {
  const label = isProcessing ? 'Processing…' : isRecording ? 'Stop recording' : 'Start recording';
  return (
    <button
      type="button"
      className={`record-btn ${isRecording ? 'is-recording' : ''}`}
      onClick={onClick}
      disabled={disabled || isProcessing}
    >
      {isProcessing ? <span className="spinner" /> : null}
      {label}
    </button>
  );
}
