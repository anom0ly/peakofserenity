import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

// Spec landing page (/tww/windwalker/ etc.): Jari banner plus big buttons, like the old Divi hub pages.
export default function SpecHub({title, spec, banner, links}) {
  return (
    <Layout title={title}>
      <main className={`container margin-vert--lg spec-${spec}`}>
        <img className={styles.banner} src={banner} alt={title} />
        <div className={styles.buttons}>
          {links.map(({label, to}) => (
            <Link key={to} className={`button button--lg button--pos ${styles.button}`} to={to}>
              {label}
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
