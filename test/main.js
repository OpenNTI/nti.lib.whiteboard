// require all `src/components/**/index.js`
const allfiles = require.context('../lib/', true, /\.js$/);

allfiles.keys().forEach(allfiles);
