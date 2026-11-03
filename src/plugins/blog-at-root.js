// The built-in blog plugin, mounted at "/" so posts keep their WordPress /YYYY/MM/DD/slug/ URLs.
// Its list page would also land on "/" and collide with the homepage, so that one route moves to /news/.
// It also shares the authors list with guide pages, which the docs plugin can't read on its own.
const blogPlugin = require('@docusaurus/plugin-content-blog');

const createBlogPlugin = blogPlugin.default || blogPlugin;

async function blogAtRoot(context, options) {
  const plugin = await createBlogPlugin(context, options);
  return {
    ...plugin,
    async contentLoaded(args) {
      const addRoute = (route) =>
        args.actions.addRoute(route.path === '/' ? {...route, path: '/news/'} : route);
      await plugin.contentLoaded({...args, actions: {...args.actions, addRoute}});
      // Guide pages show their authors' names and page links from the same authors.yml (src/components/GuideAuthors).
      const authors = {};
      for (const [key, a] of Object.entries(args.content.authorsMap ?? {})) {
        authors[key] = {key, name: a.name ?? key, permalink: a.page?.permalink ?? null};
      }
      args.actions.setGlobalData({authors});
    },
  };
}

blogAtRoot.validateOptions = blogPlugin.validateOptions;
module.exports = blogAtRoot;
