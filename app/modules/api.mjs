'use strict';

import { get } from 'https';
import { stringify } from 'querystring';
import log from './logger';

class APIRequest {
	constructor(baseUrl, maxInFlight) {
        this.baseUrl = baseUrl;
        this.maxInFlight = maxInFlight || 100;
        this.inFlight = 0;
        this.queue = [];
    }

    buildUrl(path, params) {
        const query = stringify(params);
        return `${this.baseUrl}/${path}${query == '' ? '' : '?' + query}`;
    }

    _getNext() {
        if (this.inFlight >= this.maxInFlight) {
            return;
        }

        if (this.queue.length == 0) {
            return;
        }

        this.inFlight++;

        const _self = this;
        const req = this.queue.shift();
        const url = this.buildUrl(req.path, req.params);

        log.http(`GET ${url}`);
        log.debug(`Requests: inFlight[${this.inFlight}] queue[${this.queue.length}]`);

        get(url, (res) => {
            const chunks = [];
    
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });
    
            res.on("end", () => {
                _self.inFlight--;
                _self._getNext();

                const body = Buffer.concat(chunks);

                let e;

                if (res.statusCode >= 400) {
                    e = res.statusMessage;
                }
    
                if (req.cb) {
                    let obj;
                    let error = e;

                    try {
                        obj = JSON.parse(body);
                    } catch (e) {
                        error = e;
                    } finally {
                        req.cb(obj, error);
                    }
                } else if (e) {
                    log.error(e);
                }
            });
        }).on('error', (e) => {
            _self.inFlight--;
            _self._getNext();

            if (req.cb) {
                req.cb(null, e);
            } else if (e) {
                log.error(e);
            }
        });
    }

    get(path, params, cb) {
        this.queue.push({
            path: path,
            params: params,
            cb: cb
        });

        this._getNext();
    }
}

export default APIRequest;