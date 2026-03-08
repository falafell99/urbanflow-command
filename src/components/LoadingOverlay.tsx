import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

export default function LoadingOverlay() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing neural network...');

  useEffect(() => {
    const stages = [
      { at: 15, text: 'Loading PPO policy weights...' },
      { at: 35, text: 'Calibrating CTDE framework...' },
      { at: 55, text: 'Spawning agent fleet...' },
      { at: 75, text: 'Establishing telemetry channels...' },
      { at: 90, text: 'System ready.' },
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(100, prev + 1.5 + Math.random() * 2);
        const s = stages.find(s => prev < s.at && next >= s.at);
        if (s) setStage(s.text);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setVisible(false), 400);
        }
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-80 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h1 className="text-sm font-semibold tracking-tight text-foreground">
                UrbanFlow AI
              </h1>
            </div>

            <div className="space-y-3">
              <Progress value={progress} className="h-1 bg-secondary" />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground">{stage}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              {['Neural cores', 'Agent pool', 'Telemetry bus'].map((item, i) => (
                <div key={item} className="flex items-center gap-2 font-mono text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${progress > (i + 1) * 25 ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                  <span className={progress > (i + 1) * 25 ? 'text-foreground/70' : 'text-muted-foreground/40'}>{item}</span>
                  <span className={`ml-auto ${progress > (i + 1) * 25 ? 'text-success' : 'text-muted-foreground/30'}`}>
                    {progress > (i + 1) * 25 ? 'online' : 'pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
