// The built-in blog plugin, mounted at "/" so posts keep their WordPress /YYYY/MM/DD/slug/ URLs.
// Its list page would also land on "/" and collide with the homepage, so that one route moves to /news/.
const blogPlugin = require('@docusaurus/plugin-content-blog');

const createBlogPlugin = blogPlugin.default || blogPlugin;

async function blogAtRoot(context, options) {
  const plugin = await createBlogPlugin(context, options);
  return {
    ...plugin,
    async contentLoaded(args) {
      const addRoute = (route) =>
        args.actions.addRoute(route.path === '/' ? {...route, path: '/news/'} : route);
      return plugin.contentLoaded({...args, actions: {...args.actions, addRoute}});
    },
  };
}

blogAtRoot.validateOptions = blogPlugin.validateOptions;
module.exports = blogAtRoot;
