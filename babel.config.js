module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Må være sist — sikrer worklets / jevnere animasjoner (nyttig på 120 Hz-skjermer).
      'react-native-reanimated/plugin',
    ],
  };
};
