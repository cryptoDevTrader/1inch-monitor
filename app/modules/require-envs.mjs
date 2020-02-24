'use strict';

import log from './logger';

const requireEnvs = (...envs) => {
    const missingEnv = envs.some((env) => {
        if (process.env[env] === undefined) {
            log.error('Missing required env variable: %s', env);
            return true;
        }
    });

    if (missingEnv) {
        process.exit();
    }
};

export default requireEnvs;