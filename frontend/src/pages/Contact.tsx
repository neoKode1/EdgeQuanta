export default function Contact() {
  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Contact</div>
        <h1>Start with the infrastructure conversation</h1>
        <p>
          The first serious customers for EdgeQuanta are operators, labs, and enterprise teams that
          need reliable access to real quantum systems. This page frames those entry points.
        </p>
        <div className="watermark">ENGAGE</div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="card">
            <h3>For hardware operators</h3>
            <p>Package your backend into a product surface with dashboards, access controls, and premium scheduling.</p>
          </article>
          <article className="card">
            <h3>For research groups</h3>
            <p>Run repeatable, calibration-aware experiments on hardware that is easier to observe and manage.</p>
          </article>
          <article className="card">
            <h3>For enterprise R&amp;D</h3>
            <p>Access quantum systems through a cleaner, more governable interface than the raw backend protocol alone.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <article className="card">
            <h3>Suggested next artifacts</h3>
            <ul>
              <li>MVP specification</li>
              <li>API wrapper design</li>
              <li>Operator dashboard map</li>
              <li>Go-to-market narrative</li>
            </ul>
          </article>
          <article className="card">
            <h3>Current call to action</h3>
            <p>This workspace now has a landing page and supporting pages. The next best step is to define the MVP flows and turn them into product requirements.</p>
          </article>
        </div>
      </section>
    </>
  );
}

