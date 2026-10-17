import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

// Tiles and order match the live homepage (Brewmaster, Mistweaver, Windwalker).
const tiles = [
  {spec: 'Brewmaster', img: '/img/uploads/2018/02/6.png', to: '/tww/brewmaster/'},
  {spec: 'Mistweaver', img: '/img/uploads/2018/02/5.png', to: '/tww/mistweaver/pve-guide/'},
  {spec: 'Windwalker', img: '/img/uploads/2018/02/WW.png', to: '/tww/windwalker/'},
];

export default function Home() {
  return (
    <Layout title="For Monks, by Monks" description="World of Warcraft Monk guides for Brewmaster, Mistweaver and Windwalker">
      <main className="container margin-vert--lg">
        <img className={styles.banner} src="/img/uploads/2020/08/Jari-General.png" alt="Peak of Serenity" />
        <div className={styles.tiles}>
          {tiles.map(({spec, img, to}) => (
            <Link key={spec} to={to} className={styles.tile}>
              <img src={img} alt={spec} />
            </Link>
          ))}
        </div>
        <div className={styles.support}>
          <Link className="button button--lg button--pos" href="https://discord.gg/peakofserenity">Discord</Link>
          <Link className="button button--lg button--pos" href="https://www.patreon.com/peakofserenity">Patreon</Link>
          <Link className="button button--lg button--pos" href="https://www.paypal.me/peakofserenity">PayPal</Link>
          <Link className="button button--lg button--pos" to="/news/">Latest News</Link>
        </div>
      </main>
    </Layout>
  );
}
