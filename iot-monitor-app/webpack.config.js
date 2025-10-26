const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add alias so react-native-paper can resolve the material-design-icons module
  config.resolve = config.resolve || {};
  config.resolve.alias = Object.assign({}, config.resolve.alias || {}, {
    '@react-native-vector-icons/material-design-icons': '@expo/vector-icons/MaterialCommunityIcons'
  });

  return config;
};
