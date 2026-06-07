import { type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
}

type SpxWindow = Window & {
  play?: () => void;
  stop?: () => void;
  next?: () => void;
  update?: (data: string) => void;
};

/** Simulate SPX playout: call play()/stop()/update()/next() on the live preview. */
export default function PlayoutSimulator({ iframeRef }: Props) {
  const sampleData = useTemplateStore((s) => s.sampleData);

  const win = (): SpxWindow | null => (iframeRef.current?.contentWindow as SpxWindow) ?? null;

  const call = (fn: 'play' | 'stop' | 'next') => {
    const w = win();
    if (w && typeof w[fn] === 'function') w[fn]!();
  };

  const sendUpdate = () => {
    const w = win();
    if (w && typeof w.update === 'function') w.update(JSON.stringify(sampleData));
  };

  // A typical broadcast sequence: push the latest data, then animate in.
  const playWithData = () => {
    sendUpdate();
    call('play');
  };

  return (
    <div className="simulator">
      <button className="primary" onClick={playWithData} title="Update data + play in">
        ▶ Play
      </button>
      <button onClick={() => call('stop')} title="Animate out">
        ■ Stop
      </button>
      <button onClick={sendUpdate} title="Send current sample data to update()">
        ⟳ Update
      </button>
      <button onClick={() => call('next')} title="Advance multi-step templates">
        » Next
      </button>
    </div>
  );
}
