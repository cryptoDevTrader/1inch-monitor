'use strict';

import { request } from 'https';
import { stringify } from 'querystring';
import log from './logger';

class APIRequest {
	constructor(baseUrl, maxInFlight, ttlCache) {
        this.counter = 0;
        this.baseUrl = baseUrl;
        this.maxInFlight = maxInFlight || 100;
        this.ttlCache = ttlCache || 100;
        this.queue = [];
        this.inFlight = [];
        this.cache = [];
    }

    buildUrl(path, params) {
        const query = stringify(params);
        return `${this.baseUrl}/${path}${query == '' ? '' : '?' + query}`;
    }

    _inFlight(url, options) {
        this.inFlight.push({
            url: url,
            options: options
        });
    }

    _getInFlight(url, options) {
        return this.inFlight.find((i) => {
            return i.url === url && JSON.stringify(i.options) === JSON.stringify(options);
        });
    }

    _removeInFlight(url, options) {
        this.inFlight = this.inFlight.filter((i) => {
            return !(i.url === url && JSON.stringify(i.options) === JSON.stringify(options));
        });
    }

    _cache(url, options, response) {
        this.cache.push({
            url: url,
            options: options,
            response: response,
            timestamp: Date.now()
        });
    }

    _getCached(url, options) {
        // Remove old cached items
        this.cache = this.cache.filter((i) => Date.now() - i.timestamp < this.ttlCache);

        return this.cache.find((i) => {
            return i.url === url && JSON.stringify(i.options) === JSON.stringify(options);
        });
    }

    _next() {
        if (this.queue.length == 0) {
            return;
        }

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

        const cache = this._getCached(url, options);

        if (cache && cache.response) {
            log.debug('Returning from cache');

            if (req.cb) {
                req.cb(JSON.parse(cache.response), null);
            }

            _self._next();
            return;
        }

        if (this.inFlight.length >= this.maxInFlight) {
            return;
        }

        if (this._getInFlight(url, options)) {
            this.queue.unshift(req);
            return;
        }

        this._inFlight(url, options);

        log.http(`${options.method} ${url}`);
        log.debug(`Requests: count[${req.count}] inFlight[${this.inFlight.length}] queue[${this.queue.length}]`);

        const inFlight = request(url, options, (res) => {
            const chunks = [];
    
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });
    
            res.on("end", () => {
                const body = Buffer.concat(chunks);

                let obj,
                    error;

                if (res.statusCode >= 400) {
                    error = res.statusMessage;
                }

                if (!error) {
                    try {
                        obj = JSON.parse(body);
                    } catch (e) {
                        error = e;
                    }
                }

                if (!error && body) {
                    _self._cache(url, options, body);
                }

                _self._removeInFlight(url, options);
                _self._next();

                if (req.cb) {
                    req.cb(obj, error);
                } else if (error) {
                    log.error(error);
                }
            });
        }).on('error', (e) => {
            _self._removeInFlight(url, options);
            _self._next();

            if (req.cb) {
                req.cb(null, e);
            } else if (e) {
                log.error(e);
            }
        });

        if (req.method === 'POST') {
            inFlight.write(query);
        }

        inFlight.end();
    }

    get(path, params, cb) {
        this.queue.push({
            method: 'GET',
            path: path,
            params: params,
            cb: cb,
            count: this.counter
        });

        this.counter++;
        this._next();
    }

    post(path, params, cb) {
        this.queue.push({
            method: 'POST',
            path: path,
            params: params,
            cb: cb,
            count: this.counter
        });

        this.counter++;
        this._next();
    }
}

export default APIRequest;