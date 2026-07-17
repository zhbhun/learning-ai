import { useEffect, useState } from 'react'

const Arrow = ({ diagonal = false }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d={diagonal ? 'M7 17 17 7M8 7h9v9' : 'M5 12h14M14 7l5 5-5 5'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Spark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M12 2c.5 5.6 4.4 9.5 10 10-5.6.5-9.5 4.4-10 10-.5-5.6-4.4-9.5-10-10 5.6-.5 9.5-4.4 10-10Z" fill="currentColor" />
  </svg>
)

const Check = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
    <path d="m5 10 3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Noda home">
      <span className="logo-mark"><i /><i /><i /></span>
      <span>noda</span>
    </a>
  )
}

function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  return (
    <header className="site-header">
      <Logo />
      <nav className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
        <a href="#product" onClick={() => setOpen(false)}>Product</a>
        <a href="#workflow" onClick={() => setOpen(false)}>How it works</a>
        <a href="#stories" onClick={() => setOpen(false)}>Stories</a>
        <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
        <a href="#footer" onClick={() => setOpen(false)}>Resources</a>
      </nav>
      <div className="header-actions">
        <a className="login" href="#footer">Log in</a>
        <a className="button button-dark button-small" href="#cta">Start for free <Arrow /></a>
      </div>
      <button className={open ? 'menu-button active' : 'menu-button'} onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
        <span /><span />
      </button>
    </header>
  )
}

function TinyAvatar({ color, initials }) {
  return <span className="tiny-avatar" style={{ '--avatar': color }}>{initials}</span>
}

function ProductCanvas() {
  return (
    <div className="product-canvas" aria-label="Noda workspace preview">
      <div className="canvas-bar">
        <div className="canvas-brand"><span className="mini-logo">N</span> Acme Studio <span className="chevron">⌄</span></div>
        <div className="canvas-search">⌕&nbsp;&nbsp; Search anything <kbd>⌘ K</kbd></div>
        <div className="canvas-people"><TinyAvatar color="#25251f" initials="AD" /><TinyAvatar color="#e57953" initials="JM" /><TinyAvatar color="#675bff" initials="KL" /></div>
      </div>
      <div className="canvas-body">
        <aside className="canvas-sidebar">
          <p className="sidebar-label">Workspace</p>
          <a className="active"><span>⌂</span> Overview</a>
          <a><span>◫</span> Projects <b>8</b></a>
          <a><span>✓</span> My tasks <b>12</b></a>
          <a><span>◌</span> Inbox <i>3</i></a>
          <p className="sidebar-label teams-label">Teams <button>+</button></p>
          <a><em className="team-dot purple" /> Product</a>
          <a><em className="team-dot orange" /> Marketing</a>
          <a><em className="team-dot green" /> Operations</a>
          <div className="sidebar-user"><TinyAvatar color="#d7ff63" initials="AM" /><span>Alex Morgan<small>Product lead</small></span><b>···</b></div>
        </aside>
        <main className="canvas-main">
          <div className="workspace-heading">
            <div><span className="eyebrow">MONDAY, MAY 19</span><h2>Good morning, Alex.</h2><p>Here’s what needs your attention today.</p></div>
            <button>+ New task</button>
          </div>
          <div className="workspace-grid">
            <section className="focus-card">
              <div className="card-title"><div><span className="focus-icon">◎</span><span>Today’s focus<small>3 tasks · 1 completed</small></span></div><b>•••</b></div>
              <Task checked title="Review homepage direction" tag="Website refresh" color="purple" time="9:30" people={[['#e57953', 'JM']]} />
              <Task title="Finalize launch messaging" tag="Q3 launch" color="orange" time="11:00" people={[['#675bff', 'KL'], ['#25251f', 'AD']]} />
              <Task title="Prep weekly product sync" tag="Product ops" color="green" time="2:30" people={[['#d7ff63', 'AM']]} />
              <button className="add-task">+ Add a task</button>
            </section>
            <div className="side-stack">
              <section className="momentum-card">
                <div className="card-title"><span>Weekly momentum</span><small>May 12 – 18</small></div>
                <div className="momentum-value"><strong>82%</strong><span className="up-pill">↗ 12%</span></div>
                <div className="chart-bars">
                  {[36, 52, 46, 70, 62, 85, 78].map((height, i) => <span key={i} style={{ height: `${height}%` }} className={i === 5 ? 'peak' : ''} />)}
                </div>
                <div className="chart-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
              </section>
              <section className="ai-card">
                <div className="ai-icon"><Spark /></div>
                <div><b>Noda has a suggestion</b><p>Move the product sync to 3:00? Everyone’s available.</p><button>Review suggestion <Arrow /></button></div>
              </section>
            </div>
          </div>
          <section className="recent-card">
            <div className="card-title"><span>Recent projects</span><a href="#product">View all <Arrow /></a></div>
            <div className="project-row"><span className="project-icon purple-bg">✦</span><div><b>Website refresh</b><small>Marketing · Updated 12 min ago</small></div><div className="progress"><span><i style={{ width: '72%' }} /></span><b>72%</b></div><div className="row-avatars"><TinyAvatar color="#e57953" initials="JM" /><TinyAvatar color="#675bff" initials="KL" /></div><b>•••</b></div>
            <div className="project-row"><span className="project-icon orange-bg">↗</span><div><b>Q3 product launch</b><small>Product · Updated 1 hr ago</small></div><div className="progress"><span><i style={{ width: '46%' }} /></span><b>46%</b></div><div className="row-avatars"><TinyAvatar color="#25251f" initials="AD" /><TinyAvatar color="#d7ff63" initials="AM" /></div><b>•••</b></div>
          </section>
        </main>
      </div>
    </div>
  )
}

function Task({ checked, title, tag, color, time, people }) {
  return (
    <div className={checked ? 'task done' : 'task'}>
      <span className="task-check">{checked && <Check />}</span>
      <div className="task-copy"><b>{title}</b><span><i className={`tag-dot ${color}`} />{tag}</span></div>
      <span className="task-time">{time}</span>
      <span className="task-people">{people.map(([c, t]) => <TinyAvatar color={c} initials={t} key={t} />)}</span>
    </div>
  )
}

const features = [
  { number: '01', title: 'Clarity, instantly.', copy: 'Turn scattered tasks and conversations into one clear view of what matters now.', icon: 'clarity' },
  { number: '02', title: 'Flow, not friction.', copy: 'Automate the busywork, connect your tools, and keep every project moving forward.', icon: 'flow' },
  { number: '03', title: 'Built-in intelligence.', copy: 'Noda quietly spots blockers, sets priorities, and suggests the smartest next move.', icon: 'intelligence' },
]

function FeatureVisual({ type }) {
  if (type === 'clarity') return (
    <div className="feature-visual clarity-visual">
      <span className="orbit orbit-one" /><span className="orbit orbit-two" />
      <div className="center-orb"><Spark /></div>
      <div className="floating-note note-one"><span className="note-check"><Check /></span><div><b>Launch campaign</b><small>Due today</small></div></div>
      <div className="floating-note note-two"><TinyAvatar color="#e57953" initials="JM" /><div><b>Feedback added</b><small>2 minutes ago</small></div></div>
    </div>
  )
  if (type === 'flow') return (
    <div className="feature-visual flow-visual">
      <svg className="flow-lines" viewBox="0 0 500 320"><path d="M45 85C145 85 133 160 245 160S345 235 455 235"/><path d="M45 235c102 0 92-75 200-75s112-75 210-75"/></svg>
      <div className="integration i-one"><span>G</span></div><div className="integration i-two"><span>S</span></div><div className="integration i-three"><span>N</span></div><div className="integration i-four"><span>⌁</span></div><div className="integration i-five"><Spark /></div>
    </div>
  )
  return (
    <div className="feature-visual intelligence-visual">
      <div className="signal signal-one" /><div className="signal signal-two" /><div className="signal signal-three" />
      <div className="insight-card"><div className="insight-top"><span><Spark /></span><b>Project insight</b><em>Just now</em></div><p>Homepage review is at risk. Moving one task clears the bottleneck.</p><div className="insight-actions"><button>Apply suggestion</button><button>Dismiss</button></div></div>
    </div>
  )
}

function App() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('in-view'))
    }, { threshold: 0.12 })
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div id="top">
      <div className="announcement">Noda 2.0 is here — meet your new AI workspace <a href="#product">Explore what’s new <Arrow /></a></div>
      <Header />

      <main>
        <section className="hero">
          <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
          <div className="hero-copy" data-reveal>
            <div className="kicker"><Spark /> The intelligent workspace for modern teams</div>
            <h1>Work flows<br /><em>better</em> here.</h1>
            <p>Noda brings your work, people, and priorities into one beautifully simple space—so your team can focus on moving forward.</p>
            <div className="hero-actions">
              <a className="button button-dark" href="#cta">Start for free <Arrow /></a>
              <a className="text-link" href="#product">See how it works <span className="play">▶</span></a>
            </div>
            <span className="no-card">Free for teams up to 10 · No credit card needed</span>
          </div>
          <div className="trusted" data-reveal>
            <p>Trusted by forward-thinking teams at</p>
            <div className="logo-row"><span><i>◈</i> NORTHSTAR</span><span><i>≋</i> everlane</span><span><i>◒</i> arc</span><span><i>✣</i> Vercelabs</span><span><i>△</i> CRAFT</span></div>
          </div>
          <div className="product-wrap" id="product" data-reveal><ProductCanvas /></div>
        </section>

        <section className="manifesto" id="workflow">
          <div className="section-kicker"><span>01</span> A better way to work</div>
          <h2 data-reveal>Less noise. More momentum.<br /><em>Everything</em> your team needs to do its best work.</h2>
          <p data-reveal>Most tools add more to manage. Noda gives you back the space to think, create, and make progress together.</p>
        </section>

        <section className="features">
          {features.map((feature, index) => (
            <article className="feature" key={feature.title} data-reveal>
              <div className="feature-copy">
                <span className="feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <a href="#cta">Learn more <Arrow /></a>
              </div>
              <FeatureVisual type={feature.icon} />
            </article>
          ))}
        </section>

        <section className="outcomes" id="stories">
          <div className="outcomes-inner">
            <div className="outcome-head" data-reveal>
              <div className="section-kicker light"><span>02</span> Real teams, real momentum</div>
              <h2>The difference is<br />in the <em>doing.</em></h2>
            </div>
            <blockquote data-reveal>
              <div className="quote-mark">“</div>
              <p>Noda didn’t just replace three tools. It changed the way our team thinks about work. We’re calmer, more focused, and somehow moving twice as fast.</p>
              <footer><TinyAvatar color="#d7ff63" initials="EO" /><span><b>Elena Ortiz</b><small>VP of Product, Northstar</small></span></footer>
            </blockquote>
            <div className="stats" data-reveal>
              <div><strong>2.4×</strong><span>faster project delivery</span></div>
              <div><strong>8.2h</strong><span>saved per person, weekly</span></div>
              <div><strong>94%</strong><span>team adoption in 30 days</span></div>
              <div><strong>4.9/5</strong><span>average customer rating</span></div>
            </div>
          </div>
        </section>

        <section className="pricing" id="pricing">
          <div className="pricing-intro" data-reveal>
            <div className="section-kicker"><span>03</span> Simple pricing</div>
            <h2>Start small.<br /><em>Grow</em> without limits.</h2>
            <p>One simple plan with everything your team needs. No confusing tiers. No hidden fees.</p>
          </div>
          <div className="price-card" data-reveal>
            <span className="popular">MOST POPULAR</span>
            <div className="price-top"><div><span>Noda Pro</span><p>For teams ready to do their best work.</p></div><div className="price"><strong>$12</strong><span>per user<br />per month</span></div></div>
            <div className="price-features">
              {['Unlimited projects & tasks', 'Noda AI assistant', 'Advanced workflows', 'All integrations', 'Unlimited guests', 'Priority support'].map(item => <span key={item}><i><Check /></i>{item}</span>)}
            </div>
            <a className="button button-lime" href="#cta">Start 14-day free trial <Arrow /></a>
            <small>No credit card required · Cancel anytime</small>
          </div>
        </section>

        <section className="cta" id="cta" data-reveal>
          <div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" />
          <div className="cta-mark"><Spark /></div>
          <div className="section-kicker"><span>04</span> Make space for better work</div>
          <h2>Your best work is<br />waiting to <em>flow.</em></h2>
          <p>Join more than 12,000 teams already working with more clarity, calm, and momentum.</p>
          <a className="button button-dark" href="mailto:hello@noda.team">Start working better <Arrow /></a>
          <span className="no-card">Free for teams up to 10 · Set up in two minutes</span>
        </section>
      </main>

      <footer className="footer" id="footer">
        <div className="footer-main">
          <div className="footer-brand"><Logo /><p>The intelligent workspace<br />for modern teams.</p><div className="socials"><a href="#footer" aria-label="LinkedIn">in</a><a href="#footer" aria-label="X">𝕏</a><a href="#footer" aria-label="Instagram">◎</a></div></div>
          <div className="footer-links"><div><b>Product</b><a href="#product">Overview</a><a href="#workflow">Features</a><a href="#pricing">Pricing</a><a href="#footer">Integrations</a><a href="#footer">Changelog</a></div><div><b>Resources</b><a href="#footer">Help center</a><a href="#stories">Customer stories</a><a href="#footer">Guides</a><a href="#footer">API docs</a><a href="#footer">Community</a></div><div><b>Company</b><a href="#footer">About</a><a href="#footer">Careers <i>4</i></a><a href="#footer">Contact</a><a href="#footer">Partners</a></div></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Noda, Inc.</span><div><a href="#footer">Privacy</a><a href="#footer">Terms</a><a href="#footer">Security</a></div><span className="status"><i /> All systems operational</span></div>
      </footer>
    </div>
  )
}

export default App
