import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const sections = [
  {
    id: 'ctde',
    title: 'Centralized Training, Decentralized Execution',
    content: (
      <div className="space-y-3">
        <p>All agents share a centralized critic with access to the global state vector <span className="font-mono text-foreground">s = [s₁, s₂, ..., sₙ]</span>. The critic evaluates joint actions enabling coordinated gradient updates across the agent population.</p>
        <p>At inference, each agent operates on its local observation <span className="font-mono text-foreground">oᵢ = f(sᵢ)</span> through a decentralized actor network, eliminating inter-agent communication overhead.</p>
      </div>
    ),
  },
  {
    id: 'ppo',
    title: 'PPO Objective Function',
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
    title: 'Reward Shaping',
    content: (
      <div className="space-y-3">
        <div className="font-mono text-xs bg-background/50 rounded-md p-3 text-foreground border border-border">
          R = Σ(Dᵢ × 10) − (Wₜ × 0.5) − (Cₜ × 50)
        </div>
        <p>Delivery completion <span className="font-mono text-foreground">Dᵢ</span> carries +10 reward. Collision penalty <span className="font-mono text-foreground">Cₜ</span> at −50 enforces spatial awareness. Idle wait cost <span className="font-mono text-foreground">Wₜ</span> at −0.5 promotes continuous task assignment.</p>
      </div>
    ),
  },
  {
    id: 'system',
    title: 'System Architecture',
    content: (
      <div className="space-y-3">
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
      <h3 className="text-sm font-medium text-foreground mb-4">Neural Architecture</h3>
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
