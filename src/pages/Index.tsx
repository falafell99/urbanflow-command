import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimulationViewport from '@/components/SimulationViewport';
import RewardChart from '@/components/RewardChart';
import EfficiencyGauge from '@/components/EfficiencyGauge';
import AgentLogs from '@/components/AgentLogs';
import HyperparamPanel from '@/components/HyperparamPanel';
import TechArchitecture from '@/components/TechArchitecture';
import StatsBar from '@/components/StatsBar';
import { createInitialState, stepSimulation, type Hyperparams, type SimState } from '@/lib/marl-engine';

export default function Index() {
  const [state, setState] = useState<SimState>(createInitialState);
  const [running, setRunning] = useState(false);
  const [params, setParams] = useState<Hyperparams>({
    learningRate: 0.003,
    discountFactor: 0.99,
    explorationRate: 0.15,
  });
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const step = useCallback(() => {
    setState(prev => stepSimulation(prev, paramsRef.current));
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, 200);
    return () => clearInterval(id);
  }, [running, step]);

  const reset = () => {
    setRunning(false);
    setState(createInitialState());
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="neon-text-cyan">UrbanFlow</span>{' '}
            <span className="text-foreground/60">AI</span>
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">
            Multi-Agent Reinforcement Learning Simulator
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            className="border-border/50 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setRunning(!running)}
            className={running
              ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30'
              : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30'
            }
          >
            {running ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
            {running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </motion.header>

      {/* Stats Bar */}
      <div className="mb-4">
        <StatsBar state={state} />
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Simulation Viewport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-7"
        >
          <SimulationViewport state={state} />
        </motion.div>

        {/* Right Panel */}
        <div className="lg:col-span-5 grid grid-rows-[1fr_1fr] gap-4" style={{ minHeight: 0 }}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RewardChart state={state} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AgentLogs logs={state.logs} />
          </motion.div>
        </div>

        {/* Bottom Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3"
        >
          <EfficiencyGauge state={state} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-4"
        >
          <HyperparamPanel params={params} onChange={setParams} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-5"
        >
          <TechArchitecture />
        </motion.div>
      </div>
    </div>
  );
}
