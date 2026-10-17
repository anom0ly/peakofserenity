import React from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import guideTypes, {getPath, headingId} from '@site/src/guideTypes';
import Field from './Field';
import styles from './styles.module.css';

// The guide layout: banner, intro, then each tab group (heading, intro, tabs) from front matter.
export default function GuideTabs({frontMatter}) {
  const type = guideTypes[frontMatter.guide_type];
  if (!type) return null;
  return (
    <div className={styles.guide}>
      {type.banner && <img className={styles.banner} src={type.banner} alt="" />}
      <div className={styles.intro}>
        <Field value={frontMatter.intro} />
      </div>
      {type.groups.map((group) => {
        const data = getPath(frontMatter, group.key) || {};
        const heading = data.heading || group.heading;
        const tabs = group.tabs.filter(([name]) => data[name]);
        return (
          <section key={group.key}>
            <Heading as="h2" id={headingId(heading)}>
              {heading}
            </Heading>
            <Field value={data.intro} />
            {tabs.length > 0 && (
              <Tabs groupId={`${frontMatter.guide_type}-${group.key}`} className={styles.tabs}>
                {tabs.map(([name, label]) => (
                  <TabItem key={name} value={name} label={label}>
                    <Field value={data[name]} />
                  </TabItem>
                ))}
              </Tabs>
            )}
          </section>
        );
      })}
    </div>
  );
}
