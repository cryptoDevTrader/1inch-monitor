'use strict';

import { request } from 'https';
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

    _next() {
        if (this.inFlight >= this.maxInFlight) {
            return;
        }

        if (this.queue.length == 0) {
            return;
        }

        this.inFlight++;

        const _self = this;
        const req = this.queue.shift();
        const url = this.buildUrl(req.path, req.method === 'GET' ? req.params : null);
        const options = {
            method: req.method
        };

        const query = stringify(req.params);

        if (req.method === 'POST') {
            options.headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(query)
            };
        }

        log.http(`${options.method} ${url}`);
        log.debug(`Requests: inFlight[${this.inFlight}] queue[${this.queue.length}]`);

        const inflight = request(url, options, (res) => {
            const chunks = [];
    
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });
    
            res.on("end", () => {
                _self.inFlight--;
                _self._next();

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
            _self._next();

            if (req.cb) {
                req.cb(null, e);
            } else if (e) {
                log.error(e);
            }
        });

        if (req.method === 'POST') {
            inflight.write(query);
        }

        inflight.end();
    }

    get(path, params, cb) {
        this.queue.push({
            method: 'GET',
            path: path,
            params: params,
            cb: cb
        });

        this._next();
    }

    post(path, params, cb) {
        this.queue.push({
            method: 'POST',
            path: path,
            params: params,
            cb: cb
        });

        this._next();
    }
}

export default APIRequest;