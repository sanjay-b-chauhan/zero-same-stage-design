/* The sample page itself, as the preview shows it and as the PDF prints it: the company, the deliverable as its title,
   her line, then Spotify's two answers and the price table, or Amazon's claims with their verdicts */
import type { ProjectMeta } from '../../types';
import type { Good } from './goodData';

export default function GoodDoc({ good, project }: { good: Good; project: ProjectMeta }) {
  return (
    <article className="ob-doc">
      <header className="ob-doc-h">
        <span className="ob-doc-co">
          <img src={project.logo} alt="" draggable={false} />
          {project.company}
        </span>
        <span className="ob-doc-tag">Sample</span>
      </header>
      <h3 className="ob-doc-t">{good.title}</h3>
      <p className="ob-doc-lead">{good.lead}</p>

      {good.answers.length > 0 && (
        <ol className="ob-doc-ans">
          {good.answers.map((a, i) => (
            <li key={a.id}>
              <span className="ob-doc-n">{i + 1}</span>
              <span className="ob-doc-q">{a.title}</span>
              <span className="ob-doc-a">{a.line}</span>
            </li>
          ))}
        </ol>
      )}

      {good.table && (
        <section className="ob-doc-sec">
          <h4 className="ob-doc-st">The numbers, market by market</h4>
          {good.why && <p className="ob-doc-p">{good.why}</p>}
          <table className="ob-doc-tb">
            <thead>
              <tr>
                <th scope="col">Market</th>
                {good.table.cols.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {good.table.rows.map((r) => (
                <tr key={r.market}>
                  <th scope="row">
                    <span className="ob-doc-mk">{r.market}</span>
                    {good.table?.names[r.market] ?? ''}
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {good.claims.length > 0 && (
        <ul className="ob-doc-cl">
          {good.claims.map((c) => (
            <li key={c.id}>
              <span>{c.name}</span>
              <span className="ob-doc-v" data-tone={c.tone}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="ob-doc-f">
        For {project.manager.full}, {project.company}
      </footer>
    </article>
  );
}
