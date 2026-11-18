/**
 * MURMURGROVE / BECOMING II — aperiodic sonic ecology.
 *
 * Sound is an evolving condition of the existing archive, NEVER a note per
 * record, a pulse per new entry, a melody, or a sampled natural recording.
 * The visual ecology supplies normalized motion and relationship measurements.
 * Those measurements change a persistent timbral state; they do not trigger
 * sounds on a fixed clock. This is a creative mapping, not biological audio.
 *
 * Versioned: sonic-becoming-ii-v1. History snapshots are interpreted using
 * this current algorithm; the result is NOT an archival recording.
 */
import type { SonicGraph } from './murmurgrove-sonic-structure';
export type PulseMetrics = {
  coherence:number;
  tension:number;
  transformation:number;
  persistence:number;
  differentiation?:number;
  integration?:number;
  emergence?:number;
};

const clamp=(n:number,min=0,max=1)=>Math.min(max,Math.max(min,Number.isFinite(n)?n:min));
const blend=(a:number,b:number,t:number)=>a+(b-a)*t;
const neutral:Required<PulseMetrics>={
  coherence:.5,tension:.34,transformation:.12,persistence:.35,
  differentiation:.38,integration:.34,emergence:.12
};

type Strand = {
  source:AudioBufferSourceNode;
  filter:BiquadFilterNode;
  tone:BiquadFilterNode;
  envelope:GainNode;
  pan:StereoPannerNode;
};

export class MurmurgrovePulse {
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  private strands:Strand[]=[];
  private enabled=false;
  private paused=false;
  private timer:number|null=null;
  private lastTime=0;
  private yaw=0;
  private metrics:Required<PulseMetrics>={...neutral};
  private state:Required<PulseMetrics>={...neutral};
  private lineage=[.3,.54,.28];
  private archiveKey='';
  private archiveMemory=.4;
  // Graph topology is not reduced to record count. Stable within one archive version.
  private topology:Pick<SonicGraph,'connectivity'|'integration'|'crossing'|'reinforcement'|'heterogeneity'>={connectivity:0,integration:0,crossing:0,reinforcement:0,heterogeneity:0};
  private initialised=false;
  private seed=0x19f6a171;

  get isEnabled(){return this.enabled;}

  /** Call only from a user's sound button gesture, per mobile autoplay policy. */
  async enable():Promise<boolean>{
    const w=window as Window&{webkitAudioContext?:typeof AudioContext};
    const AudioCtor=window.AudioContext||w.webkitAudioContext;
    if(!AudioCtor)return false;
    try{
      if(!this.ctx)this.build(AudioCtor);
      if(!this.ctx||!this.master)return false;
      await this.ctx.resume();
      if(this.ctx.state!=='running')return false;
      this.enabled=true;this.paused=false;
      const t=this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(.72,t,2.2);
      this.lastTime=performance.now();
      this.start();return true;
    }catch{return false;}
  }

  disable(){
    this.enabled=false;this.stop();
    if(this.ctx&&this.master){
      const t=this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0,t,.17);
      // A muted page should not keep its Web Audio graph running.
      window.setTimeout(()=>{if(!this.enabled&&this.ctx?.state==='running')void this.ctx.suspend().catch(()=>{});},900);
    }
  }

  async suspendWhenHidden(){
    this.paused=true;this.stop();
    if(this.ctx?.state==='running'){
      this.master?.gain.setTargetAtTime(0,this.ctx.currentTime,.08);
      try{await this.ctx.suspend();}catch{/* iOS interruption */}
    }
  }
  async resumeWhenVisible(){
    if(!this.enabled||!this.ctx)return;
    try{
      await this.ctx.resume();
      if(this.ctx.state==='running'){
        this.paused=false;this.lastTime=performance.now();
        this.master?.gain.setTargetAtTime(.72,this.ctx.currentTime,1.7);
        this.start();
      }
    }catch{/* a new gesture may be required on iOS */}
  }

  /** Called on initial render and when a saved archive state is selected. */
  setTopology(graph:SonicGraph){
    this.topology={connectivity:graph.connectivity,integration:graph.integration,
      crossing:graph.crossing,reinforcement:graph.reinforcement,heterogeneity:graph.heterogeneity};
  }

  /** Motion uses world-space coordinates, not view rotation. */
  update(metrics:PulseMetrics,observerYaw:number){
    this.metrics={
      coherence:clamp(metrics.coherence),tension:clamp(metrics.tension),
      transformation:clamp(metrics.transformation),persistence:clamp(metrics.persistence),
      differentiation:clamp(metrics.differentiation??1-metrics.coherence),
      integration:clamp(metrics.integration??metrics.persistence),
      emergence:clamp(metrics.emergence??metrics.transformation)
    };
    this.yaw=observerYaw;
    if(!this.initialised){this.state={...this.metrics};this.initialised=true;}
  }

  /**
   * Switching a saved archive state changes sound through real graph summaries.
   * key is only used to avoid duplicate updates: it never becomes a pitch seed.
   */
  enterArchive(key:string,structuralDifference=0,reinforcement=.4,sharedRatio=.15){
    if(this.archiveKey===key)return;
    this.archiveKey=key;
    const d=clamp(structuralDifference);
    const r=clamp(reinforcement),s=clamp(sharedRatio);
    // Only graph-derived characteristics influence the baseline timbre.
    this.archiveMemory=clamp(blend(this.archiveMemory,.18+.62*r,.16+.19*d));
    this.lineage[0]=clamp(blend(this.lineage[0],.18+.65*s,.10+.12*d));
    this.lineage[1]=clamp(blend(this.lineage[1],.2+.58*r,.11+.12*d));
    this.lineage[2]=clamp(blend(this.lineage[2],.18+.56*d,.09+.09*d));
  }
  private random(){this.seed^=this.seed<<13;this.seed^=this.seed>>>17;this.seed^=this.seed<<5;return(this.seed>>>0)/4294967296;}

  private noiseBuffer(ctx:AudioContext,seconds:number):AudioBuffer{
    const length=Math.floor(ctx.sampleRate*seconds);
    const b=ctx.createBuffer(1,length,ctx.sampleRate),arr=b.getChannelData(0);
    let drift=0,old=0;
    for(let i=0;i<length;i++){
      const white=this.random()*2-1;
      drift=.965*drift+.035*white;
      old=.9992*old+.0008*drift;
      arr[i]=clamp((drift-old)*.65,-1,1);
    }
    // Soft fade at loop seam, with different incommensurate loop lengths.
    const fade=Math.min(Math.floor(ctx.sampleRate*.18),Math.floor(length/8));
    for(let i=0;i<fade;i++){
      const w=i/fade;
      const a=arr[i],z=arr[length-fade+i];
      arr[i]=a*w+z*(1-w);
      arr[length-fade+i]=z*w+a*(1-w);
    }
    return b;
  }

  private build(AudioCtor:typeof AudioContext){
    const ctx=new AudioCtor({latencyHint:'playback'});this.ctx=ctx;
    const master=ctx.createGain();master.gain.value=0;this.master=master;
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-26;limiter.knee.value=13;limiter.ratio.value=5;
    limiter.attack.value=.015;limiter.release.value=.36;
    master.connect(limiter);limiter.connect(ctx.destination);
    // Three continuous, non-tonal, non-synchronous material strands.
    // Each voice is a filtered noise *field*, never an oscillator/note.
    const lengths=[11.37,13.91,17.23];
    lengths.forEach((duration,i)=>{
      const source=ctx.createBufferSource();source.buffer=this.noiseBuffer(ctx,duration);source.loop=true;
      const filter=ctx.createBiquadFilter();filter.type=i===1?'highpass':'lowpass';filter.Q.value=.48;
      const tone=ctx.createBiquadFilter();tone.type=i===2?'highpass':'lowpass';tone.Q.value=.4;
      const envelope=ctx.createGain();envelope.gain.value=0;
      const pan=ctx.createStereoPanner();pan.pan.value=0;
      source.connect(filter);filter.connect(tone);tone.connect(envelope);envelope.connect(pan);pan.connect(master);
      source.start();this.strands.push({source,filter,tone,envelope,pan});
    });
  }

  private start(){if(this.timer===null)this.timer=window.setInterval(()=>this.step(),160);}
  private stop(){if(this.timer!==null){clearInterval(this.timer);this.timer=null;}}

  private step(){
    if(!this.enabled||this.paused||this.ctx?.state!=='running')return;
    const now=performance.now(),dt=clamp((now-this.lastTime)/1000,0,.4);this.lastTime=now;
    const m=this.metrics,s=this.state;
    // Slow, unequal integration constants. No thresholds, sequencer or events.
    const speeds:[keyof PulseMetrics,number][]=[
      ['coherence',3.5],['tension',6.7],['transformation',2.1],
      ['persistence',13.3],['differentiation',5.1],['integration',9.4],['emergence',17.8]
    ];
    for(const [key,tau] of speeds){
      const k=key as keyof Required<PulseMetrics>;
      s[k]=blend(s[k],m[k],1-Math.exp(-dt/tau));
    }
    // Persistent lineage: a changed relationship field alters later timbre.
    // Does not reset once a passage becomes quiet.
    const divergence=clamp(.55*s.differentiation+.25*s.tension+.2*s.emergence);
    const joining=clamp(.55*s.integration+.45*s.persistence);
    this.lineage[0]=clamp(this.lineage[0]+dt*(divergence-this.lineage[0])*.012);
    this.lineage[1]=clamp(this.lineage[1]+dt*(joining-this.lineage[1])*.009);
    this.lineage[2]=clamp(this.lineage[2]+dt*(s.transformation-this.lineage[2])*.017);

    // Relational change alters the spectral profile, overlap, and relative
    // pressure. The shared metrics, not record count, control every parameter.
    const graph=this.topology;
    // Topological organization alters the possible relationship between strands.
    // Two graphs with the same node/edge totals but different topology can differ.
    const breath=clamp(.13+.35*s.emergence+.3*s.transformation-.15*s.coherence+.2*graph.heterogeneity);
    const density=clamp(.13+.44*s.differentiation+.26*s.tension-.23*s.integration+.16*graph.crossing);
    const cohesion=clamp(.16+.35*s.integration+.23*s.persistence+.25*graph.integration);
    const fold=clamp(.2+.47*graph.connectivity+.28*graph.reinforcement);
    const weave=[
      {level:.009+.024*cohesion,low:105+300*this.lineage[0]+370*graph.integration,high:28+80*s.tension,pan:-.42},
      {level:.005+.023*breath,low:110+340*this.lineage[1]+290*fold,high:45+360*density,pan:.26},
      {level:.003+.018*density,low:310+600*this.lineage[2]+320*graph.heterogeneity,high:150+510*s.differentiation,pan:.48}
    ];
    const t=this.ctx.currentTime;
    this.strands.forEach((strand,i)=>{
      const w=weave[i];
      const level=clamp(w.level*(.64+.36*this.archiveMemory)*9,0,.35);
      strand.envelope.gain.setTargetAtTime(level,t,1.4+i*.85);
      strand.filter.frequency.setTargetAtTime(Math.max(35,w.low),t,1.1+i*.4);
      strand.tone.frequency.setTargetAtTime(Math.max(25,w.high),t,1.8+i*.7);
      // Rotation changes listening perspective, never the underlying ecology.
      strand.pan.pan.setTargetAtTime(clamp(w.pan*Math.cos(this.yaw)+.18*Math.sin(this.yaw),-.8,.8),t,.28);
    });
  }
}
