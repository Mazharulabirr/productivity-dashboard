import { useApp } from '../../context/AppContext';
import { fmtMs } from '../../utils';
import { IconClock } from '../shared/Icons';

const TYPE_COLOR = { task: 'badge-orange', skill: 'badge-purple', client: 'badge-blue' };
const TYPE_LABEL = { task: 'Task', skill: 'Skill', client: 'Project' };

export default function TimerLog() {
  const { timers } = useApp();
  const entries = timers.getTimerLog();

  return (
    <div className="card mb-20">
      <div className="card-title">
        <IconClock />
        Today's Time Log
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 11 }}
          onClick={timers.timerStopAll}
          title="Stop all running timers"
        >
          Stop All
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="text-muted text-sm" style={{ padding: '6px 0' }}>
          No timer sessions yet — press ▶ on any task, skill or project to start tracking.
        </div>
      ) : (
        <div>
          {entries.map(e => (
            <div key={e.id} className="timer-log-row">
              <span className={`badge ${TYPE_COLOR[e.type] || 'badge-muted'}`} style={{ minWidth: 54, justifyContent: 'center' }}>
                {TYPE_LABEL[e.type] || e.type}
              </span>
              <span className="timer-log-name">{e.name}</span>
              <span className={`timer-log-time${e.live ? ' timer-live-text' : ''}`}>{fmtMs(e.elapsed)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
