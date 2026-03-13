export default function Docs() {
  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Docs</div>
        <h1>Source material and capability map</h1>
        <p>
          This page connects the current EdgeQuanta framing to the translated protocol and internal
          product notes already in the repository.
        </p>
        <div className="watermark">DOCS</div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="card">
            <h3>bitquanta.md</h3>
            <p>Translated communication protocol for the superconducting quantum chip measurement and control system.</p>
            <div className="list-links"><a href="/bitquanta.md" target="_blank" rel="noreferrer">Open protocol document</a></div>
          </article>
          <article className="card">
            <h3>README.md</h3>
            <p>Project framing for EdgeQuanta and the initial product thesis around access and observability.</p>
            <div className="list-links"><a href="/README.md" target="_blank" rel="noreferrer">Open README</a></div>
          </article>
          <article className="card">
            <h3>ROOT.md</h3>
            <p>Short internal root brief describing the current workspace and recommended next deliverables.</p>
            <div className="list-links"><a href="/ROOT.md" target="_blank" rel="noreferrer">Open root brief</a></div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <article className="card">
            <h3>Protocol capabilities</h3>
            <ul>
              <li>Submit and track quantum tasks</li>
              <li>Retrieve and replay results</li>
              <li>Read calibration and RB data</li>
              <li>Subscribe to task and chip events</li>
            </ul>
          </article>
          <article className="card">
            <h3>EdgeQuanta interpretation</h3>
            <p>The protocol is the hardware-facing contract. EdgeQuanta is the product and infrastructure layer built above it.</p>
          </article>
        </div>
      </section>
    </>
  );
}

