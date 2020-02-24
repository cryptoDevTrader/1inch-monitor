'use strict';

import { get } from 'https';
import { stringify } from 'querystring';
import log from './logger';

class APIRequest {
	constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    buildUrl(path, params) {
        const query = stringify(params);
        return `${this.baseUrl}/${path}${query == '' ? '' : '?' + query}`;
    }

    get(path, params, cb) {
        const url = this.buildUrl(path, params);

        log.http(url);

        get(url, (res) => {
            const chunks = [];
    
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });
    
            res.on("end", () => {
                const body = Buffer.concat(chunks);

                let e;

                if (res.statusCode >= 400) {
                    e = res.statusMessage;
                }
    
                if (cb) {
                    cb(JSON.parse(body), e);
                } else if (e) {
                    log.error(e);
                }
            });
        }).on('error', (e) => {
            if (cb) {
                cb(null, e);
            } else if (e) {
                log.error(e);
            }
        });
    }
}

export default APIRequest;