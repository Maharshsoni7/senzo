import config from '@senzo/config/eslint';

export default [...config, { ignores: ['src/generated/**'] }];
