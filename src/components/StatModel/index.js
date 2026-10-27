import React, {useState} from 'react';
import styles from './styles.module.css';

// The "small world" stat model from "What Stats Should I Use?" (rebuilt from the original post's script).
// Damage = base × (1 + each stat %), drawn as blocks whose widths follow their values.
const BASE_DAMAGE = 11700;
const MIN_DAMAGE = 19890; // 70% Vers only: the first example, which the light blue bonus is measured against
const SCALE = 25000; // widest damage bar
const TOTAL_RATING = 14400;
const RATING_PER_PCT = {mastery: 180, crit: 180, vers: 205, haste: 170};
const MAX_PCT = TOTAL_RATING / RATING_PER_PCT.haste; // the most % any split can give: all Haste
const LABELS = {mastery: 'Mastery', crit: 'Crit', vers: 'Vers', haste: 'Haste'};
const SLIDER_LABELS = {mastery: 'Mastery', crit: 'Critical Strike', vers: 'Versatility', haste: 'Haste'};
const STATS = Object.keys(RATING_PER_PCT);

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);
const grow = (value) => ({flexGrow: Math.max(0, value)});

function Equation({pcts, showZero}) {
  const damage = Math.round(STATS.reduce((d, s) => d * (1 + (pcts[s] || 0) / 100), BASE_DAMAGE));
  const total = STATS.reduce((t, s) => t + (pcts[s] || 0), 0);
  const bonus = Math.max(0, damage - MIN_DAMAGE);
  const shown = STATS.filter((s) => pcts[s] !== undefined && (showZero || pcts[s] > 0));
  return (
    <div className={styles.equation} role="img" aria-label={`${fmt(BASE_DAMAGE)} × ${shown.map((s) => `${Math.round(pcts[s])}% ${LABELS[s]}`).join(', ')} = ${fmt(damage)}`}>
      <div className={styles.damageRow}>
        <div style={grow(SCALE - BASE_DAMAGE)} />
        <div className={`${styles.block} ${styles.damage} ${styles.small}`} style={grow(BASE_DAMAGE)}>{fmt(BASE_DAMAGE)}</div>
      </div>
      <span className={styles.op}>×</span>
      <div className={styles.statRow}>
        {shown.map((s) => (
          <div key={s} className={`${styles.block} ${styles[s]}`} style={grow(pcts[s])}>
            {Math.round(pcts[s])}% {LABELS[s]}
          </div>
        ))}
        <div className={`${styles.block} ${styles.none}`} style={grow(MAX_PCT - total)} />
      </div>
      <span className={styles.op}>=</span>
      <div className={styles.damageRow}>
        <div className={`${styles.block} ${styles.damage}`} style={grow(damage)}>
          {fmt(damage)}
          {bonus > 0 && <span className={styles.bonus} style={{width: `${(100 * bonus) / damage}%`}} />}
        </div>
        <div style={grow(SCALE - damage)} />
      </div>
    </div>
  );
}

// A fixed example, e.g. <StatEquation mastery={40} vers={35} />
export function StatEquation(props) {
  const pcts = Object.fromEntries(STATS.filter((s) => props[s] !== undefined).map((s) => [s, Number(props[s])]));
  return <Equation pcts={pcts} />;
}

// Four sliders that share 100% of the secondary rating between the stats.
export function StatSliders() {
  const [split, setSplit] = useState({mastery: 25, crit: 25, vers: 50, haste: 0});

  function move(stat, value) {
    const current = split[stat];
    const delta = current - value;
    if (Math.abs(delta) < 1) return;
    // Keep the four shares adding up to 100: the others give or take in proportion to their share.
    const next = {...split, [stat]: value};
    for (const other of STATS) {
      if (other === stat) continue;
      const change = current >= 100 ? delta / 3 : (split[other] / (100 - current)) * delta;
      next[other] = Math.max(0, Math.min(100, split[other] + change));
    }
    setSplit(next);
  }

  const pcts = Object.fromEntries(STATS.map((s) => [s, (TOTAL_RATING * split[s]) / 100 / RATING_PER_PCT[s]]));
  return (
    <div className={styles.sliders}>
      {STATS.map((s) => (
        <label key={s} className={styles.slider}>
          <input type="range" min="0" max="100" value={split[s]} onChange={(e) => move(s, Number(e.target.value))} />
          <span>{SLIDER_LABELS[s]}</span>
        </label>
      ))}
      <Equation pcts={pcts} showZero />
    </div>
  );
}
