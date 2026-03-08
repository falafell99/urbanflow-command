import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MethodologyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground h-8 text-xs gap-1.5"
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Methodology</span>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="panel p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto terminal-scroll"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Policy Network Architecture</h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Network Architecture */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Architecture Overview</h3>
                  <div className="font-mono text-[11px] bg-background/50 rounded-md p-4 text-foreground border border-border space-y-1">
                    <div className="text-muted-foreground">{'// PPO Actor-Critic Network'}</div>
                    <div>&nbsp;</div>
                    <div><span className="text-primary">Input:</span> State Space [20×20 grid]</div>
                    <div className="text-muted-foreground pl-4">├── Agent position (x, y)</div>
                    <div className="text-muted-foreground pl-4">├── Nearby agents (8-neighborhood)</div>
                    <div className="text-muted-foreground pl-4">├── Delivery targets (distance, bearing)</div>
                    <div className="text-muted-foreground pl-4">└── Obstacle map (blocked cells)</div>
                    <div>&nbsp;</div>
                    <div><span className="text-warning">Hidden Layers:</span></div>
                    <div className="text-muted-foreground pl-4">├── FC(400, 256) → ReLU → Dropout(0.1)</div>
                    <div className="text-muted-foreground pl-4">├── FC(256, 128) → ReLU → LayerNorm</div>
                    <div className="text-muted-foreground pl-4">└── FC(128, 64) → ReLU</div>
                    <div>&nbsp;</div>
                    <div><span className="text-success">Output:</span> Action Space [5 actions]</div>
                    <div className="text-muted-foreground pl-4">├── Move North (Δy = -1)</div>
                    <div className="text-muted-foreground pl-4">├── Move South (Δy = +1)</div>
                    <div className="text-muted-foreground pl-4">├── Move East  (Δx = +1)</div>
                    <div className="text-muted-foreground pl-4">├── Move West  (Δx = -1)</div>
                    <div className="text-muted-foreground pl-4">└── Wait       (no-op)</div>
                  </div>
                </div>

                {/* Training Config */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Training Configuration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Optimizer', 'Adam (β₁=0.9, β₂=0.999)'],
                      ['Batch Size', '2048 transitions'],
                      ['Epochs per Update', '10'],
                      ['Clip Range (ε)', '0.2'],
                      ['GAE Lambda (λ)', '0.95'],
                      ['Entropy Coefficient', '0.01'],
                      ['Value Loss Coeff.', '0.5'],
                      ['Max Grad Norm', '0.5'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs border-b border-border/30 pb-1.5">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-mono text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objective */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Clipped Surrogate Objective</h3>
                  <div className="font-mono text-xs bg-background/50 rounded-md p-3 text-foreground border border-border">
                    L(θ) = E[min(rₜ(θ)Âₜ, clip(rₜ(θ), 1−ε, 1+ε)Âₜ)] + c₁·H(πθ) − c₂·L_VF(φ)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Where rₜ(θ) is the importance sampling ratio, Âₜ is the GAE advantage estimate,
                    H(πθ) is the entropy bonus, and L_VF is the value function loss.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
