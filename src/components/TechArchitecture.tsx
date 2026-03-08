import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const sections = [
  {
    id: 'ctde',
    title: 'Centralized Training, Decentralized Execution (CTDE)',
    content: (
      <div className="space-y-3">
        <p>All agents share a centralized critic with access to the global state vector <span className="font-mono text-foreground">s = [s₁, s₂, ..., sₙ]</span>. The critic evaluates joint actions enabling coordinated gradient updates across the agent population.</p>
        <p>At inference, each agent operates on its local observation <span className="font-mono text-foreground">oᵢ = f(sᵢ)</span> through a decentralized actor network, eliminating inter-agent communication overhead.</p>
      </div>
    ),
  },
  {
    id: 'ppo',
    title: 'Proximal Policy Optimization (PPO)',
    content: (
      <div className="space-y-3">
        <p>The clipped surrogate objective constrains policy updates to a trust region:</p>
        <div className="font-mono text-xs bg-background/50 rounded-md p-3 text-foreground border border-border">
          L(θ) = E[min(rₜ(θ)Âₜ, clip(rₜ(θ), 1−ε, 1+ε)Âₜ)]
        </div>
        <p>Where <span className="font-mono text-foreground">rₜ(θ) = πθ(aₜ|sₜ) / πθ_old(aₜ|sₜ)</span> is the probability ratio. Combined with GAE (λ=0.95) for advantage estimation and an entropy bonus <span className="font-mono text-foreground">H(π)</span> to encourage exploration.</p>
      </div>
    ),
  },
  {
    id: 'reward',
    title: 'Reward Function',
    content: (
      <div className="space-y-3">
        <p>The composite reward signal balances task completion against operational costs:</p>
        <div className="font-mono text-xs bg-background/50 rounded-md p-3 text-foreground border border-border">
          Reward = Σ (Deliveries_completed × 10) − (Collision_penalty × 50) − (Step_cost × 0.1)
        </div>
        <p>Delivery completion carries <span className="font-mono text-foreground">+10</span> reward. Collision penalty at <span className="font-mono text-foreground">−50</span> enforces spatial awareness. Step cost at <span className="font-mono text-foreground">−0.1</span> promotes efficient routing and discourages unnecessary movement.</p>
      </div>
    ),
  },
  {
    id: 'flow',
    title: 'System Flow — Congestion Avoidance',
    content: (
      <div className="space-y-3">
        <p>Agents use PPO to learn congestion-avoidance policies through iterative environment interaction:</p>
        <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
          <li><span className="text-foreground">Observation</span> — Each agent observes local state: position, nearby agents, delivery targets, and obstacle proximity.</li>
          <li><span className="text-foreground">Policy Inference</span> — The actor network <span className="font-mono text-foreground">π_θ</span> outputs action probabilities (move N/S/E/W or wait).</li>
          <li><span className="text-foreground">Action Execution</span> — Selected action is applied to the environment; reward is collected.</li>
          <li><span className="text-foreground">Centralized Critique</span> — The shared critic <span className="font-mono text-foreground">V_φ(s)</span> evaluates the joint state for advantage estimation.</li>
          <li><span className="text-foreground">Policy Update</span> — PPO clipped objective constrains gradient steps: <span className="font-mono text-foreground">θ ← θ + α∇L(θ)</span>.</li>
          <li><span className="text-foreground">Congestion Signal</span> — Collision penalties propagate through GAE, teaching agents to preemptively avoid high-density zones.</li>
        </ol>
        <div className="font-mono text-xs bg-background/50 rounded-md p-3 text-foreground border border-border space-y-1">
          <div>┌─────────────────────────────────────┐</div>
          <div>│  Observation Layer (Local State)     │</div>
          <div>│  ↓                                   │</div>
          <div>│  Actor Network (π_θ) → Action        │</div>
          <div>│  ↓                                   │</div>
          <div>│  Environment Step → Reward            │</div>
          <div>│  ↓                                   │</div>
          <div>│  Centralized Critic (V_φ)            │</div>
          <div>│  ↓                                   │</div>
          <div>│  PPO Update (θ ← θ + α∇L)           │</div>
          <div>└─────────────────────────────────────┘</div>
        </div>
      </div>
    ),
  },
];

export default function TechArchitecture() {
  return (
    <div className="panel p-5">
      <h3 className="text-sm font-medium text-foreground mb-1">Technical Specifications</h3>
      <p className="text-xs text-muted-foreground mb-4">MARL architecture documentation — Centralized Training, Decentralized Execution</p>
      <Accordion type="multiple" className="space-y-1">
        {sections.map(s => (
          <AccordionItem key={s.id} value={s.id} className="border-border/50">
            <AccordionTrigger className="text-sm text-foreground/80 hover:text-primary transition-colors py-3 hover:no-underline">
              {s.title}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
              {s.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
