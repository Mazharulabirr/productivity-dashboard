import { useApp } from '../../context/AppContext';
import { fmtMs } from '../../utils';
import { IconPlay, IconPause } from './Icons';

export default function TimerWidget({ id, type, name }) {
  const { timers } = useApp();
  const { timerToggle, getDisplay, isRunning } = timers;
  const running = isRunning(id);
  const display = getDisplay(id);

  return (
    <span className="timer-group">
      <span className={`timer-display${running ? ' timer-live-text' : ''}`}>{display}</span>
      <button
        className={`btn-icon timer-btn${running ? ' timer-running' : ''}`}
        onClick={() => timerToggle(id, type, name)}
        title={running ? 'Stop timer' : 'Start timer'}
      >
        {running ? <IconPause /> : <IconPlay />}
      </button>
    </span>
  );
}
