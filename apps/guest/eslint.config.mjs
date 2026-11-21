import config from '@senzo/config/eslint';

export default [...config, { ignores: ['expo-env.d.ts', '.expo/**'] }];
