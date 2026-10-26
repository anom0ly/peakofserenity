import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

// Tiles and order match the live homepage (Brewmaster, Mistweaver, Windwalker).
const tiles = [
  {spec: 'Brewmaster', img: '/img/uploads/2018/02/6.png', to: '/tww/brewmaster/'},
  {spec: 'Mistweaver', img: '/img/uploads/2018/02/5.png', to: '/tww/mistweaver/pve-guide/'},
  {spec: 'Windwalker', img: '/img/uploads/2018/02/WW.png', to: '/tww/windwalker/'},
];

// Migration mode (see docusaurus.config.js): the notice plus the three spec guides.
const guides = [
  {title: 'Brewmaster Tank Guide', note: 'Midnight Season 2 (12.1.0)', img: '/img/uploads/2018/02/6.png', to: '/tww/brewmaster/pve-guide/'},
  {title: 'Mistweaver PvE Quick Guide', note: 'Healing in raids and Mythic+', img: '/img/uploads/2018/02/5.png', to: '/tww/mistweaver/pve-guide/'},
  {title: 'Windwalker PvE Guide', note: 'Damage in raids and Mythic+', img: '/img/uploads/2018/02/WW.png', to: '/tww/windwalker/pve-guide/'},
];

function SupportButtons({news}) {
  return (
    <div className={styles.support}>
      <Link className="button button--lg button--pos" href="https://discord.gg/peakofserenity">Discord</Link>
      <Link className="button button--lg button--pos" href="https://www.patreon.com/peakofserenity">Patreon</Link>
      <Link className="button button--lg button--pos" href="https://www.paypal.me/peakofserenity">PayPal</Link>
      {news && <Link className="button button--lg button--pos" to="/news/">Latest News</Link>}
    </div>
  );
}

function MigrationHome() {
  return (
    <Layout title="For Monks, by Monks" description="World of Warcraft Monk guides for Brewmaster, Mistweaver and Windwalker">
      <main className="container margin-vert--lg">
        <img className={styles.banner} src="/img/uploads/2020/08/Jari-General.png" alt="Peak of Serenity" />
        <section className={styles.notice}>
          <p className={styles.eyebrow}>Site update</p>
          <h1>We're moving to a new home</h1>
          <p>
            Peak of Serenity is in the middle of a migration. While we finish moving everything over, only our three
            spec guides are available. News, articles and the podcast archive will be back soon.
          </p>
          <p>
            Questions, or something missing you need? Ask us on <Link href="https://discord.gg/peakofserenity">Discord</Link>.
          </p>
        </section>
        <section>
          <Heading as="h2" id="guides">Spec guides</Heading>
          <div className={styles.tiles}>
            {guides.map(({title, note, img, to}) => (
              <Link key={title} to={to} className={styles.guide}>
                <img src={img} alt="" />
                <span className={styles.guideTitle}>{title}</span>
                <span className={styles.guideNote}>{note}</span>
              </Link>
            ))}
          </div>
        </section>
        <SupportButtons />
      </main>
    </Layout>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  if (siteConfig.customFields.migrationMode) {
    return <MigrationHome />;
  }
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
        <SupportButtons news />
      </main>
    </Layout>
  );
}
